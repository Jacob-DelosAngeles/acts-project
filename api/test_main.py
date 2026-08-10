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
        assert response.json["error"] == "No file uploaded."

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

    def test__upload__success(self, mocker, monkeypatch):
        monkeypatch.delenv(
            "GOOGLE_APPLICATION_CREDENTIALS_JSON", raising=False
        )
        mocker.patch.object(main, "CLOUD_STORAGE_INPUT_FILES", "test-bucket")

        mock_blob = mocker.MagicMock()
        mock_bucket = mocker.MagicMock()
        mock_bucket.blob.return_value = mock_blob

        mock_client = mocker.MagicMock()
        mock_client.bucket.return_value = mock_bucket

        mocker.patch("main.storage.Client", return_value=mock_client)

        response = self.client.post(
            "/inputs/upload",
            data={"file": (io.BytesIO(b"a,b\n1,2\n"), "survey.csv")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 200

        # The caller's filename is never reused as the object name: doing
        # so let anyone overwrite an existing survey, or escape the prefix.
        blob_name = mock_bucket.blob.call_args[0][0]
        assert blob_name.startswith("inputs/")
        assert blob_name.endswith(".csv")
        assert "survey" not in blob_name
        assert response.json["id"] == blob_name

        # Content type is pinned, not echoed back from the caller.
        _, kwargs = mock_blob.upload_from_string.call_args
        assert kwargs["content_type"] == "text/csv"

        # These are respondent records — publishing them made every upload
        # world-readable.
        mock_blob.make_public.assert_not_called()

    def test__upload__rejects_non_csv(self, mocker):
        mocker.patch.object(main, "CLOUD_STORAGE_INPUT_FILES", "test-bucket")

        response = self.client.post(
            "/inputs/upload",
            data={"file": (io.BytesIO(b"<html>x</html>"), "evil.html")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 400
        assert "csv" in response.json["error"].lower()

    def test__upload__traversal_filename_is_discarded(self):
        name = main._safe_blob_name("../../../evil.csv")

        assert name.startswith("inputs/")
        assert ".." not in name

    def test__upload__names_are_unique(self):
        assert main._safe_blob_name("a.csv") != main._safe_blob_name("a.csv")


def _mock_bucket_csv(mocker, monkeypatch, payload=b"a,b\n1,2\n3,4\n"):
    """Point _read_csv_from_reference at an in-memory blob."""
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS_JSON", raising=False)
    mocker.patch.object(main, "CLOUD_STORAGE_INPUT_FILES", "test-bucket")

    mock_blob = mocker.MagicMock()
    mock_blob.exists.return_value = True
    mock_blob.download_as_bytes.return_value = payload

    mock_bucket = mocker.MagicMock()
    mock_bucket.blob.return_value = mock_blob

    mock_client = mocker.MagicMock()
    mock_client.bucket.return_value = mock_bucket

    mocker.patch("main.storage.Client", return_value=mock_client)
    return mock_blob


UNTRUSTED_SOURCES = [
    ({"fileurl": "file:///etc/passwd"}, "local-file-url"),
    (
        {"fileurl": "http://169.254.169.254/latest/meta-data/"},
        "cloud-metadata",
    ),
    ({"fileurl": "http://127.0.0.1:8080/admin"}, "internal-host"),
    (
        {"fileurl": "https://storage.googleapis.com/evil/inputs/x.csv"},
        "other-bucket",
    ),
    ({"fileurl": "/tmp/local.csv"}, "bare-local-path"),
    ({"fileid": "inputs/../../../etc/passwd"}, "traversal-fileid"),
    ({"fileid": "secrets/key.csv"}, "outside-prefix-fileid"),
]


class TestLoad:
    client = main.app.test_client()

    def test__load__no_source__returns_400(self):
        response = self.client.post("/inputs/load", json={})

        assert response.status_code == 400
        assert response.json["status"]["code"] == 400

    def test__load__success_by_fileid(self, mocker, monkeypatch):
        _mock_bucket_csv(mocker, monkeypatch)

        response = self.client.post(
            "/inputs/load", json={"fileid": "inputs/abc123.csv"}
        )

        assert response.status_code == 200
        assert response.json["columns"] == ["a", "b"]
        assert response.json["data"] == [[1, 2], [3, 4]]
        assert response.json["status"] == {"code": 200, "message": "OK"}

    @pytest.mark.parametrize(
        "payload",
        [case[0] for case in UNTRUSTED_SOURCES],
        ids=[case[1] for case in UNTRUSTED_SOURCES],
    )
    def test__load__rejects_untrusted_sources(
        self, mocker, monkeypatch, payload
    ):
        # pandas.read_csv opens file:// paths, internal hostnames and the
        # cloud metadata service as readily as a public URL, and this
        # endpoint hands back what it read — so anything outside our own
        # bucket is both an SSRF and a local file read.
        _mock_bucket_csv(mocker, monkeypatch)

        response = self.client.post("/inputs/load", json=payload)

        assert response.status_code == 400


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


def _stub_models(mocker, only=None):
    """Replace the runner's model functions with no-result stubs.

    The runner holds direct references in MODEL_FUNCTIONS, so patching
    acts.model attributes wouldn't take effect — patch the table itself.
    Pass `only` to stub a subset and let the rest fit for real.
    """
    mock_result = mocker.MagicMock()
    mock_result.summary.return_value = None

    names = only if only is not None else list(main.runner.MODEL_FUNCTIONS)
    stubs = {
        name: mocker.MagicMock(return_value=(mock_result, None))
        for name in names
    }
    mocker.patch.dict(main.runner.MODEL_FUNCTIONS, stubs, clear=False)


class TestRunModels:
    client = main.app.test_client()

    def test__run_models__returns_all_four_model_names(
        self, mocker, monkeypatch
    ):
        # Storage-backed path: a "fileid" issued by /inputs/upload, which is
        # resolved against our own bucket rather than fetched blindly.
        _mock_bucket_csv(mocker, monkeypatch, b"a,b\n1,2\n")
        _stub_models(mocker)

        response = self.client.post(
            "/models/run", json={"fileid": "inputs/abc123.csv"}
        )

        assert response.status_code == 200
        assert response.json["status"] == {"code": 200, "message": "OK"}
        assert set(response.json["results"].keys()) == {
            "travel", "activity", "dest", "mode",
        }
        for entry in response.json["results"].values():
            assert entry == {"overview": [], "analysis": [], "correlation": []}

    def test__run_models__accepts_multipart_upload(self, mocker):
        # The desktop app posts the CSV directly (no cloud storage) — verify
        # the multipart "file" path is taken and returns all four models.
        _stub_models(mocker)

        response = self.client.post(
            "/models/run",
            data={"file": (io.BytesIO(b"a,b\n1,2\n"), "survey.csv")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 200
        assert set(response.json["results"].keys()) == {
            "travel", "activity", "dest", "mode",
        }

    def test__run_models__no_input__returns_400(self):
        response = self.client.post("/models/run", json={})

        assert response.status_code == 400

    def test__run_models__real_fit_serializes_summary_tables(self, mocker):
        # Only the activity-choice model runs for real here (against core/'s
        # own bundled sample data) to prove runner.summarize() correctly
        # turns a genuine statsmodels summary into JSON. "act" is binary in
        # this dataset (0/1) so the fit is guaranteed rather than short-
        # circuiting to NoneResult like "travel" does (it's constant here).
        # The other three are stubbed so this test isn't tied to their fits
        # converging too — fast and focused.
        _stub_models(mocker, only=["travel", "dest", "mode"])

        with open(CORE_BASE_INPUT_CSV, "rb") as fp:
            payload = fp.read()

        response = self.client.post(
            "/models/run",
            data={"file": (io.BytesIO(payload), "survey.csv")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 200
        activity = response.json["results"]["activity"]
        assert len(activity["overview"]) > 0
        assert len(activity["analysis"]) > 0
        assert all("P>|z|" in row for row in activity["analysis"])

    @pytest.mark.parametrize(
        "payload",
        [case[0] for case in UNTRUSTED_SOURCES],
        ids=[case[1] for case in UNTRUSTED_SOURCES],
    )
    def test__run_models__rejects_untrusted_sources(
        self, mocker, monkeypatch, payload
    ):
        _mock_bucket_csv(mocker, monkeypatch)

        response = self.client.post("/models/run", json=payload)

        assert response.status_code == 400


class TestAPIKeyGate:
    client = main.app.test_client()

    GATED = ["/inputs/upload", "/inputs/load", "/models/run"]

    @pytest.mark.parametrize("path", GATED)
    def test__no_key_configured__endpoint_stays_open(self, mocker, path):
        # Unset is a no-op so an existing deploy keeps serving while the key
        # is rolled out. Anything but 401 means the gate let it through to
        # the view, which then rejects the empty body on its own terms.
        mocker.patch.object(main, "ACTS_API_KEY", None)

        response = self.client.post(path, json={})

        assert response.status_code != 401

    @pytest.mark.parametrize("path", GATED)
    def test__key_configured__rejects_missing_key(self, mocker, path):
        mocker.patch.object(main, "ACTS_API_KEY", "s3cret")

        response = self.client.post(path, json={})

        assert response.status_code == 401

    def test__key_configured__rejects_wrong_key(self, mocker):
        mocker.patch.object(main, "ACTS_API_KEY", "s3cret")

        response = self.client.post(
            "/inputs/load", json={}, headers={"X-API-Key": "wrong"}
        )

        assert response.status_code == 401

    def test__key_configured__accepts_correct_key(self, mocker):
        mocker.patch.object(main, "ACTS_API_KEY", "s3cret")

        response = self.client.post(
            "/inputs/load", json={}, headers={"X-API-Key": "s3cret"}
        )

        assert response.status_code == 400  # reached the view

    def test__health_stays_public(self, mocker):
        mocker.patch.object(main, "ACTS_API_KEY", "s3cret")

        assert self.client.get("/").status_code == 200


class TestBodySizeCap:
    client = main.app.test_client()

    def test__oversized_upload__returns_413(self, mocker):
        mocker.patch.dict(main.app.config, {"MAX_CONTENT_LENGTH": 1024})

        response = self.client.post(
            "/inputs/upload",
            data={"file": (io.BytesIO(b"x" * 20000), "big.csv")},
            content_type="multipart/form-data",
        )

        assert response.status_code == 413
