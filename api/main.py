"""ACTS API

ACTS API is a Backend API for Project ACTS. It contains all the internal
API endpoints that the application uses.
"""

from __future__ import annotations

import json
import os
from typing import Union

from flask import Flask
from flask import request
from flask_cors import CORS
from google.cloud import storage
from google.oauth2 import service_account
import pandas as pd

import acts.core as acts
import acts.model as model
from acts.core import logging


# Configure this via app.yaml (GAE) or your host's env var settings (Render,
# etc). Read lazily (not a hard os.environ[...] at import) so the app still
# boots when storage isn't wired up yet — e.g. a fresh Render deploy before
# the bucket exists. upload() checks for it at call time and returns a clear
# 503 instead of crashing the whole process. Every other endpoint
# (/osm/ways, /inputs/load, /models/run) works without storage at all.
CLOUD_STORAGE_INPUT_FILES = os.environ.get("CLOUD_STORAGE_INPUT_FILES")


logger = logging.get_logger(__name__)

app = Flask(__name__)

# The Electron desktop app calls this API from a file:// origin (cross-origin),
# so responses need CORS headers or the browser blocks them. No cookies/auth
# are involved, so allowing all origins is safe here.
CORS(app)


@app.route("/", methods=["GET"])
def health() -> dict:
    """Health check — lets you verify the deploy is live in a browser."""
    return {
        "status": "ok",
        "service": "acts-api",
        "storage_configured": bool(CLOUD_STORAGE_INPUT_FILES),
    }


def _gcs_client() -> storage.Client:
    """Build a Storage client from whichever credential source is set.

    On GCP infra (GAE, GCE, Cloud Run) the metadata server provides
    credentials automatically. Locally, GOOGLE_APPLICATION_CREDENTIALS
    points at a key file. On hosts that can't easily hand you a file
    (Render, etc), GOOGLE_APPLICATION_CREDENTIALS_JSON carries the same
    service-account key as a raw JSON string in an env var instead.
    """
    raw_credentials = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not raw_credentials:
        return storage.Client()

    info = json.loads(raw_credentials)
    credentials = service_account.Credentials.from_service_account_info(info)
    return storage.Client(credentials=credentials, project=info["project_id"])


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

    if not CLOUD_STORAGE_INPUT_FILES:
        return "Cloud storage is not configured on this server.", 503

    # Create a Cloud Storage client and
    # Get the bucket that the file will be uploaded to
    gcs = _gcs_client()
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


@app.route("/models/run", methods=["POST"])
def run_models() -> dict:
    """Run the four discrete-choice models against a survey CSV.

    Replaces core/'s lambda.py (AWS Lambda + S3, run async per-file) with a
    synchronous endpoint that fits all four models and returns their
    summaries directly in the response.

    The CSV can arrive two ways:
      * as a multipart upload (field "file") — the desktop app sends it this
        way, so no cloud storage is needed at all; or
      * as a "fileurl" in a JSON body — the storage-backed path (a URL the
        server can read), kept for compatibility.
    """
    uploaded_file = request.files.get("file")
    if uploaded_file is not None:
        df = pd.read_csv(uploaded_file)
    else:
        file_url = (request.get_json(silent=True) or {}).get("fileurl")
        if not file_url:
            return {
                "error": "Provide a CSV as multipart 'file' or JSON 'fileurl'.",
                "status": {"code": 400, "message": "Bad Request"},
            }, 400
        df = pd.read_csv(file_url)

    model_fns = {
        "travel": model.TravelDecisionMLogit,
        "activity": model.ActivityChoiceMLogit,
        "dest": model.DestinationChoiceMLogit,
        "mode": model.ModeChoiceMLogit,
    }

    results = {}
    for name, fit in model_fns.items():
        mlogit, correlation = fit(df, output_correlation=True)
        results[name] = _summarize(mlogit, correlation)

    return {
        "results": results,
        "status": {
            "code": 200,
            "message": "OK",
        },
    }


def _summarize(mlogit, correlation: pd.DataFrame | None) -> dict:
    """Convert a fitted model's summary tables into JSON-serializable data."""
    summary = mlogit.summary()
    if summary is None:
        return {"overview": [], "analysis": [], "correlation": []}

    overview = pd.read_html(summary.tables[0].as_html(), header=0, index_col=0)[0]
    analysis = pd.read_html(summary.tables[1].as_html(), header=0, index_col=0)[0]

    return {
        "overview": overview.reset_index().to_dict(orient="records"),
        "analysis": analysis.reset_index().to_dict(orient="records"),
        "correlation": (
            correlation.reset_index().to_dict(orient="records")
            if correlation is not None else []
        ),
    }


@app.errorhandler(500)
def server_error(e: Union[Exception, int]) -> str:
    logging.exception("An error occurred during a request.")
    return """
    An internal error occurred: <pre>{}</pre>
    See logs for full stacktrace.
    """.format(e), 500


if __name__ == "__main__":
    # This is used when running locally only. In deployment, a WSGI server
    # (gunicorn) serves the app instead — see the Render start command / GAE
    # app.yaml entrypoint.
    app.run(host="127.0.0.1", port=8080, debug=True)
