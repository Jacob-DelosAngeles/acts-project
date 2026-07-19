/* ! constants.js | Project ACTS | github.com/project-acts */

/* eslint no-unused-vars: off */

// Create namespace for ACTS
const ACTS = {
  store: {},
  pages: {},
  apis: {},
  map: {},
  ui: {
    mdc: {},
  },
};

ACTS.pages.HOME_PAGE_FILE = 'index.html';
ACTS.pages.INPUTS_PAGE_FILE = 'inputs.html';
ACTS.pages.OUTPUTS_PAGE_FILE = 'outputs.html';
ACTS.pages.START_PAGE_FILE = 'get_start.html';

ACTS.store.INPUT_FILE_KEY = 'input-file';
ACTS.store.LOCAL_FILE_KEY = 'input-data';
ACTS.store.OD_FILE_KEY = 'od-data';
ACTS.store.CHOICE_FILE_KEY = 'choice-data';

// Unique ID for each user
ACTS.user = generateUserID();

// Backend API base — the deployed ACTS API (Flask, main.py). Override this
// one line to point the app at a different deployment (local dev, staging).
ACTS.apis.API_BASE = 'https://acts-api-d65l.onrender.com';

ACTS.apis.UPLOAD_INPUTS_ENDPOINT = ACTS.apis.API_BASE + '/inputs/upload';
ACTS.apis.LOAD_INPUTS_ENDPOINT = ACTS.apis.API_BASE + '/inputs/load';
ACTS.apis.RUN_MODELS_ENDPOINT = ACTS.apis.API_BASE + '/models/run';

// Legacy outputs pipeline: the Inputs/Outputs spreadsheet pages still expect
// the old "upload to storage, fetch results back" contract (parquet in S3).
// Repointed off the retired AWS/S3 hosts so they degrade against the live
// API instead of a dead domain; the pages themselves are not yet rebuilt on
// the new /models/run endpoint.
ACTS.apis.GET_OUTPUTS_ENDPOINT = ACTS.apis.API_BASE + '/outputs/';
ACTS.apis.PUBLIC_S3_URL = ACTS.apis.API_BASE + '/files/';

// Onboarding backend (the Laravel backend/). Empty until it's deployed —
// when empty, the get-started form proceeds without calling it.
ACTS.apis.GET_STARTED_ENDPOINT = '';

// Set locally (do not commit a real value) — a Mapbox token used to be
// hardcoded in map.js and got caught by GitHub push protection. Rotate the
// old token on Mapbox's dashboard before using this project again.
ACTS.apis.MAPBOX_TOKEN = '';
