"""ACTS API

ACTS API is a GCP-deployed Backend API for Project ACTS.
It contains all the internal API endpoints that the application uses.
"""

from __future__ import annotations

import os

from flask import Flask
from flask import request
from google.cloud import storage
import pandas as pd
import urllib

from acts.core import logging
import acts.core as acts


# Configure this environment variable via app.yaml
CLOUD_STORAGE_INPUT_FILES = os.environ["CLOUD_STORAGE_INPUT_FILES"]


logger = logging.get_logger(__name__)

# If `entrypoint` is not defined in app.yaml, App Engine
# will look for an app called `app` in `main.py`.
app = Flask(__name__)


@app.route("/osm/ways", methods=["GET"])
def osm_ways() -> dict:
    """Return set of longitudes and latitudes."""
    query = request.args.get("q")
    if not query:
        return {}

    try:
        ways = acts.dataset.load(query)
    except FileNotFoundError as error:
        logger.error(str(error))
        return {}

    output = {way: [] for way in ways.way}

    for row in zip(*ways.to_dict("list").values()):
        way, lon, lat = row
        output[way] += [[lon, lat]]

    return output


@app.route("/inputs/upload", methods=["POST"])
def upload() -> str:
    """Process the uploaded file and upload it to Google Cloud Storage."""
    uploaded_file = request.files.get("file")

    if not uploaded_file:
        return "No file uploaded.", 400

    # Create a Cloud Storage client and
    # Get the bucket that the file will be uploaded to
    gcs = storage.Client()
    bucket = gcs.get_bucket(CLOUD_STORAGE_INPUT_FILES)

    # Create a new blob and upload the file's content
    blob = bucket.blob(uploaded_file.filename)

    blob.upload_from_string(
        uploaded_file.read(),
        content_type=uploaded_file.content_type
    )

    # Make the blob public. This is not necessary
    # if the entire bucket is public.
    # https://cloud.google.com/storage/docs/access-control/making-data-public
    blob.make_public()

    # The public URL can be used to directly access the uploaded file via HTTP.
    return blob.public_url


@app.route("/inputs/load", methods=["POST"])
def load() -> dict:
    file_url = request.get_json(force=True).get("fileurl")
    df = pd.read_csv(file_url)

    return {
        "columns": list(df.columns),
        "data": df.values.tolist(),
        "status": {
            "code": 200,
            "message": "OK",
        },
    }


@app.errorhandler(500)
def server_error(e: Union[Exception, int]) -> str:
    logging.exception("An error occurred during a request.")
    return """
    An internal error occurred: <pre>{}</pre>
    See logs for full stacktrace.
    """.format(e), 500


if __name__ == "__main__":
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. You
    # can configure startup instructions by adding `entrypoint` to app.yaml.
    app.run(host="127.0.0.1", port=8080, debug=True)
