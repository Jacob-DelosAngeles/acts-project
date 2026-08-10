"""ACTS API

ACTS API is a Backend API for Project ACTS. It contains all the internal
API endpoints that the application uses.
"""

from __future__ import annotations

import functools
import hmac
import io
import json
import os
import uuid
from typing import Union

from flask import Flask
from flask import request
from flask_cors import CORS
from google.cloud import storage
from google.oauth2 import service_account
import pandas as pd

import acts.core as acts
from acts import runner
from acts.core import logging


# Configure this via app.yaml (GAE) or your host's env var settings (Render,
# etc). Read lazily (not a hard os.environ[...] at import) so the app still
# boots when storage isn't wired up yet — e.g. a fresh Render deploy before
# the bucket exists. upload() checks for it at call time and returns a clear
# 503 instead of crashing the whole process. Every other endpoint
# (/osm/ways, /inputs/load, /models/run) works without storage at all.
CLOUD_STORAGE_INPUT_FILES = os.environ.get("CLOUD_STORAGE_INPUT_FILES")

# Optional shared secret. When set, the endpoints that write to storage or
# burn CPU require an X-API-Key header matching it. Left unset they stay
# open, so an already-deployed instance keeps serving while the key is
# rolled out to clients.
ACTS_API_KEY = os.environ.get("ACTS_API_KEY")

# Hard cap on request bodies. The bundled sample survey is ~100 KB, so this
# is generous for real datasets while stopping a single POST from
# exhausting memory on a small instance.
MAX_UPLOAD_BYTES = int(
    os.environ.get("ACTS_MAX_UPLOAD_BYTES", 25 * 1024 * 1024)
)

# Only CSVs are ever modelled, and uploads live under one prefix so a
# bucket policy can be scoped to it.
ALLOWED_UPLOAD_SUFFIXES = (".csv",)
UPLOAD_PREFIX = "inputs/"


logger = logging.get_logger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES


class SourceRejected(Exception):
    """A caller-supplied CSV location the server refuses to fetch."""

# The Electron desktop app calls this API from a file:// origin (cross-origin),
# so responses need CORS headers or the browser blocks them. No cookies or
# browser credentials are involved — the optional API key travels in an
# X-API-Key header — so allowing all origins is safe here. CORS is not an
# access control for non-browser callers; ACTS_API_KEY is.
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


def require_api_key(view):
    """Gate a view behind ACTS_API_KEY when one is configured.

    A no-op until the key is set, so rolling it out doesn't take the
    deployment down between the server and its clients being updated.
    """

    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        supplied = request.headers.get("X-API-Key", "")
        if ACTS_API_KEY and not hmac.compare_digest(supplied, ACTS_API_KEY):
            return {
                "error": "Missing or invalid API key.",
                "status": {"code": 401, "message": "Unauthorized"},
            }, 401
        return view(*args, **kwargs)

    return wrapper


def _safe_blob_name(filename: str) -> str:
    """Return an unguessable, caller-independent name for an upload.

    The caller's filename is never used as the object name. Doing so let
    anyone overwrite an existing survey by reusing its name, or escape the
    prefix entirely with path separators. Only the suffix is honoured, and
    only when it is a CSV. Returns "" if the file isn't acceptable.
    """
    suffix = os.path.splitext(filename or "")[1].lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        return ""

    return "{}{}{}".format(UPLOAD_PREFIX, uuid.uuid4().hex, suffix)


def _read_csv_from_reference(payload: dict) -> pd.DataFrame:
    """Load a CSV named by a JSON body, without trusting the location.

    pandas.read_csv will open file:// paths, internal hostnames and the
    cloud metadata service just as readily as a public URL, and these
    endpoints hand back what it read — so an unrestricted value here is
    both a server-side request forgery and a local file read. Only two
    forms are accepted: an opaque id issued by /inputs/upload, or a URL
    literally inside this deployment's own bucket.
    """
    if not CLOUD_STORAGE_INPUT_FILES:
        raise SourceRejected(
            "Cloud storage is not configured on this server."
        )

    file_id = payload.get("fileid") or ""
    if file_id:
        if not file_id.startswith(UPLOAD_PREFIX) or ".." in file_id:
            raise SourceRejected("Unknown file id.")

        gcs = _gcs_client()
        blob = gcs.bucket(CLOUD_STORAGE_INPUT_FILES).blob(file_id)
        if not blob.exists():
            raise SourceRejected("Unknown file id.")

        return pd.read_csv(io.BytesIO(blob.download_as_bytes()))

    file_url = payload.get("fileurl") or ""
    prefix = "https://storage.googleapis.com/{}/{}".format(
        CLOUD_STORAGE_INPUT_FILES, UPLOAD_PREFIX
    )
    if not file_url.startswith(prefix) or ".." in file_url:
        raise SourceRejected(
            "fileurl must point inside this deployment's input bucket."
        )

    return pd.read_csv(file_url)


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
@require_api_key
def upload() -> dict:
    """Store an uploaded survey CSV in Google Cloud Storage."""
    uploaded_file = request.files.get("file")

    if not uploaded_file:
        return {
            "error": "No file uploaded.",
            "status": {"code": 400, "message": "Bad Request"},
        }, 400

    if not CLOUD_STORAGE_INPUT_FILES:
        return {
            "error": "Cloud storage is not configured on this server.",
            "status": {"code": 503, "message": "Service Unavailable"},
        }, 503

    blob_name = _safe_blob_name(uploaded_file.filename)
    if not blob_name:
        return {
            "error": "Only .csv uploads are accepted.",
            "status": {"code": 400, "message": "Bad Request"},
        }, 400

    gcs = _gcs_client()
    bucket = gcs.bucket(CLOUD_STORAGE_INPUT_FILES)
    blob = bucket.blob(blob_name)

    # The content type is pinned rather than echoed back from the caller.
    # A caller-chosen type is what turns a storage bucket into a host for
    # someone else's HTML.
    blob.upload_from_string(uploaded_file.read(), content_type="text/csv")

    # Deliberately not blob.make_public(): these are respondent survey
    # records, and publishing them made every upload world-readable.
    # Callers get an opaque id and read it back through /inputs/load.
    return {
        "id": blob_name,
        "status": {"code": 200, "message": "OK"},
    }


@app.route("/inputs/load", methods=["POST"])
@require_api_key
def load() -> dict:
    payload = request.get_json(silent=True) or {}

    try:
        df = _read_csv_from_reference(payload)
    except SourceRejected as error:
        return {
            "error": str(error),
            "status": {"code": 400, "message": "Bad Request"},
        }, 400

    return {
        "columns": list(df.columns),
        "data": df.values.tolist(),
        "status": {
            "code": 200,
            "message": "OK",
        },
    }


@app.route("/models/run", methods=["POST"])
@require_api_key
def run_models() -> dict:
    """Run the four discrete-choice models against a survey CSV.

    Replaces core/'s lambda.py (AWS Lambda + S3, run async per-file) with a
    synchronous endpoint that fits all four models and returns their
    summaries directly in the response.

    The CSV can arrive two ways:
      * as a multipart upload (field "file") — the desktop app sends it this
        way, so no cloud storage is needed at all; or
      * as a "fileid" (or bucket "fileurl") in a JSON body — the
        storage-backed path, kept for compatibility. Both are resolved
        through _read_csv_from_reference, never fetched blindly.
    """
    uploaded_file = request.files.get("file")
    if uploaded_file is not None:
        df = pd.read_csv(uploaded_file)
    else:
        payload = request.get_json(silent=True) or {}
        if not (payload.get("fileid") or payload.get("fileurl")):
            return {
                "error": (
                    "Provide a CSV as multipart 'file', or a 'fileid' "
                    "returned by /inputs/upload."
                ),
                "status": {"code": 400, "message": "Bad Request"},
            }, 400

        try:
            df = _read_csv_from_reference(payload)
        except SourceRejected as error:
            return {
                "error": str(error),
                "status": {"code": 400, "message": "Bad Request"},
            }, 400

    return {
        # Shared with the bundled desktop engine (core/acts_engine.py) so
        # local and hosted runs return identical results.
        "results": runner.run_all(df),
        "status": {
            "code": 200,
            "message": "OK",
        },
    }


@app.errorhandler(413)
def payload_too_large(e: Union[Exception, int]) -> dict:
    """MAX_CONTENT_LENGTH rejected the body before the view ran."""
    return {
        "error": "Upload exceeds the {} MB limit.".format(
            MAX_UPLOAD_BYTES // (1024 * 1024)
        ),
        "status": {"code": 413, "message": "Payload Too Large"},
    }, 413


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
