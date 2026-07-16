/* ! constants.js | Project ACTS | github.com/project-acts */

/* eslint no-unused-vars: off */

// Create namespace for ACTS
var ACTS = {
  store: {},
  pages: {},
  apis: {},
  map: {},
  ui: {
    mdc: {},
  },
}

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

// Backend API endpoints
ACTS.apis.UPLOAD_INPUTS_ENDPOINT = 'https://45q5yrqtvd.execute-api.ap-southeast-1.amazonaws.com/dev/inputs/';
ACTS.apis.GET_OUTPUTS_ENDPOINT = 'https://45q5yrqtvd.execute-api.ap-southeast-1.amazonaws.com/dev/outputs/';
ACTS.apis.PUBLIC_S3_URL = 'https://acts-input-files.s3.ap-southeast-1.amazonaws.com/';

// Set locally (do not commit a real value) — a Mapbox token used to be
// hardcoded in map.js and got caught by GitHub push protection. Rotate the
// old token on Mapbox's dashboard before using this project again.
ACTS.apis.MAPBOX_TOKEN = '';