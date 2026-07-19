"""Tests for ACTS API."""

import io
import json
import os

import pytest

import main


main.app.testing = True

CORE_BASE_INPUT_CSV = os.path.join(
    os.path.dirname(__file__), "..", "core", "base input.csv"
)


class TestHealth:
    client = main.app.test_client()

    def test__health__ok(self):
        response = self.client.get("/")

        assert response.status_code == 200
        assert response.json["status"] == "ok"
        assert response.json["service"] == "acts-api"
        assert "storage_configured" in response.json


class TestMain:
    client = main.app.test_client()

    def test__osm_ways__no_query(self):
        response = self.client.get("/osm/ways")

        assert response.status_code == 200
        assert len(response.json) == 0
        assert isinstance(response.json, dict)

    def test__osm_ways__datasets_missing(self):
        response = self.client.get("/osm/ways?q=unknown")

        assert response.status_code == 200
        assert len(response.json) == 0
        assert isinstance(response.json, dict)

    def test__osm_ways__quezon_city(self):
        response = self.client.get("/osm/ways?q=quezon+city")

        assert response.status_code == 200
        assert len(response.json) == 24760
        assert isinstance(response.json, dict)

        assert response.json["1052579105"] == [
            [14.6123437, 121.0610677],
            [14.6124351, 121.0610197],
            [14.6143017, 121.0601599],
            [14.616023, 121.0593611],
        ]

        assert response.json["1053790779"] == [
            [14.695562, 121.0597742],
            [14.6955607, 121.059871],
        ]


class TestUpload:
    client = main.app.test_client()

    def test__upload__no_file(self):
        response = self.client.post("/inputs/upload", data={})

        assert response.status_code == 400
        assert response.data == b"No file uploaded."

    def test__upload__storage_not_configured(self, mocker):
        # A fresh deploy before the bucket is wired up: the endpoint should
        # degrade to a clear 503, not crash the process at import.
        mocker.patch.object(main, "CLOUD_STORAGE_INPUT_FILES", None)

        response = self.client.post(
            "/inputs/upload",
            data={"file": (io.BytesIO(b"a,b\n1,2\n"), "test.csv")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 503

    def test__upload__success(self, mocker):
        mocker.patch.object(main, "CLOUD_STORAGE_INPUT_FILES", "test-bucket")

        mock_blob = mocker.MagicMock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/test.csv"

        mock_bucket = mocker.MagicMock()
        mock_bucket.blob.return_value = mock_blob

        mock_client = mocker.MagicMock()
        mock_client.get_bucket.return_value = mock_bucket

        mocker.patch("main.storage.Client", return_value=mock_client)

        response = self.client.post(
            "/inputs/upload",
            data={"file": (io.BytesIO(b"a,b\n1,2\n"), "test.csv")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 200
        assert response.data.decode() == mock_blob.public_url

        mock_bucket.blob.assert_called_once_with("test.csv")
        mock_blob.upload_from_string.assert_called_once()
        mock_blob.make_public.assert_called_once()


class TestLoad:
    client = main.app.test_client()

    def test__load__missing_fileurl(self):
        # main.py's load() calls pd.read_csv(None) with no guard around a
        # missing "fileurl" key — this raises rather than returning a
        # friendly 400. Documented here, not silently fixed, since main.py
        # itself wasn't part of this pass.
        with pytest.raises(Exception):
            self.client.post("/inputs/load", json={})

    def test__load__success(self, tmp_path):
        csv_path = tmp_path / "sample.csv"
        csv_path.write_text("a,b\n1,2\n3,4\n")

        response = self.client.post(
            "/inputs/load", json={"fileurl": str(csv_path)}
        )

        assert response.status_code == 200
        assert response.json["columns"] == ["a", "b"]
        assert response.json["data"] == [[1, 2], [3, 4]]
        assert response.json["status"] == {"code": 200, "message": "OK"}


class TestGCSClient:
    """_gcs_client() picks the credential source Render vs GCP infra need."""

    def test__gcs_client__no_json_env_var__uses_default_credentials(
        self, mocker, monkeypatch
    ):
        monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS_JSON", raising=False)
        mock_storage_client = mocker.patch("main.storage.Client")

        main._gcs_client()

        mock_storage_client.assert_called_once_with()

    def test__gcs_client__json_env_var__builds_credentials_from_it(
        self, mocker, monkeypatch
    ):
        fake_key = {
            "type": "service_account",
            "project_id": "acts-project-test",
            "client_email": "test@acts-project-test.iam.gserviceaccount.com",
        }
        monkeypatch.setenv(
            "GOOGLE_APPLICATION_CREDENTIALS_JSON", json.dumps(fake_key)
        )

        mock_credentials = mocker.MagicMock()
        mock_from_info = mocker.patch(
            "main.service_account.Credentials.from_service_account_info",
            return_value=mock_credentials,
        )
        mock_storage_client = mocker.patch("main.storage.Client")

        main._gcs_client()

        mock_from_info.assert_called_once_with(fake_key)
        mock_storage_client.assert_called_once_with(
            credentials=mock_credentials, project="acts-project-test"
        )


class TestRunModels:
    client = main.app.test_client()

    def test__run_models__returns_all_four_model_names(self, mocker, tmp_path):
        csv_path = tmp_path / "survey.csv"
        csv_path.write_text("a,b\n1,2\n")  # content unused, model fns mocked below

        mock_result = mocker.MagicMock()
        mock_result.summary.return_value = None

        for fn_name in (
            "TravelDecisionMLogit",
            "ActivityChoiceMLogit",
            "DestinationChoiceMLogit",
            "ModeChoiceMLogit",
        ):
            mocker.patch(
                f"main.model.{fn_name}", return_value=(mock_result, None)
            )

        response = self.client.post(
            "/models/run", json={"fileurl": str(csv_path)}
        )

        assert response.status_code == 200
        assert response.json["status"] == {"code": 200, "message": "OK"}
        assert set(response.json["results"].keys()) == {
            "travel", "activity", "dest", "mode",
        }
        for entry in response.json["results"].values():
            assert entry == {"overview": [], "analysis": [], "correlation": []}

    def test__run_models__real_fit_serializes_summary_tables(self, mocker):
        # Only the activity-choice model runs for real here (against core/'s
        # own bundled sample data) to prove _summarize() correctly turns a
        # genuine statsmodels summary into JSON. "act" is binary in this
        # dataset (0/1) so the fit is guaranteed rather than short-circuiting
        # to NoneResult like "travel" does (it's constant in this sample).
        # The other three are mocked to the None-result shape so this test
        # isn't tied to their fits converging too — fast and focused.
        mock_result = mocker.MagicMock()
        mock_result.summary.return_value = None
        for fn_name in (
            "TravelDecisionMLogit", "DestinationChoiceMLogit", "ModeChoiceMLogit",
        ):
            mocker.patch(
                f"main.model.{fn_name}", return_value=(mock_result, None)
            )

        response = self.client.post(
            "/models/run", json={"fileurl": CORE_BASE_INPUT_CSV}
        )

        assert response.status_code == 200
        activity = response.json["results"]["activity"]
        assert len(activity["overview"]) > 0
        assert len(activity["analysis"]) > 0
        assert all("P>|z|" in row for row in activity["analysis"])
