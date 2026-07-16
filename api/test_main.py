"""Tests for ACTS API."""

import io

import pytest

import main


main.app.testing = True


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

    def test__upload__success(self, mocker):
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
