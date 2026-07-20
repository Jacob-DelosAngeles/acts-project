/* ! engine.js | Project ACTS | github.com/project-acts */

const {ipcMain, app} = require('electron');
const {execFile} = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// The engine is a PyInstaller --onedir bundle: a launcher plus its
// dependencies in one folder. Packaged builds receive it as an extraResource;
// in development it is read straight out of core/'s build output.
const ENGINE_DIR_NAME = 'acts-engine';
const ENGINE_BINARY = process.platform === 'win32' ?
    'acts-engine.exe' : 'acts-engine';

// Fitting four models takes ~20s on a typical laptop; allow generous headroom
// for slower machines before treating the run as hung.
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

// The engine writes a large JSON results file; the default 1MB execFile
// buffer is only for its console output, but keep it roomy for the
// statsmodels optimizer log it prints.
const MAX_OUTPUT_BUFFER = 32 * 1024 * 1024;

/**
 * Returns the path to the bundled engine executable, or null if absent.
 * @return {string|null} Absolute path to the engine binary.
 */
function resolveEnginePath() {
  const candidates = [
    // Packaged: forge copies the folder into the app's resources directory.
    path.join(process.resourcesPath || '', ENGINE_DIR_NAME, ENGINE_BINARY),
    // Development: PyInstaller's output inside the core/ component.
    path.join(
        app.getAppPath(), '..', 'core', 'engine-dist',
        ENGINE_DIR_NAME, ENGINE_BINARY),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Runs the engine over a survey CSV and returns its parsed results.
 *
 * The CSV is written to a temp file and the engine writes its JSON to
 * another: statsmodels prints its optimizer log to stdout, so piping
 * results through stdout would corrupt them.
 *
 * @param {string} csvText - The survey CSV contents.
 * @return {Promise<Object>} The engine's results payload.
 */
function runModels(csvText) {
  return new Promise((resolve, reject) => {
    const enginePath = resolveEnginePath();
    if (!enginePath) {
      reject(new Error('No local model engine is bundled with this build.'));
      return;
    }

    const token = crypto.randomBytes(8).toString('hex');
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `acts-${token}-`));
    const csvPath = path.join(workDir, 'survey.csv');
    const jsonPath = path.join(workDir, 'results.json');

    const cleanup = () => {
      try {
        fs.rmSync(workDir, {recursive: true, force: true});
      } catch (err) {
        console.error('Could not clean up engine temp dir:', err);
      }
    };

    try {
      fs.writeFileSync(csvPath, csvText, 'utf8');
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }

    execFile(
        enginePath,
        [csvPath, '-o', jsonPath],
        {timeout: RUN_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BUFFER},
        (error) => {
          // A non-zero exit still may have written a JSON error payload, so
          // prefer the file's contents over the raw process error.
          let payload = null;
          try {
            if (fs.existsSync(jsonPath)) {
              payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            }
          } catch (parseError) {
            cleanup();
            reject(parseError);
            return;
          }

          cleanup();

          if (payload) {
            resolve(payload);
          } else {
            reject(error || new Error('The model engine produced no output.'));
          }
        },
    );
  });
}

/** Registers the engine IPC handlers with the main process. */
exports.register = function() {
  ipcMain.handle('acts:engine-available', () => resolveEnginePath() !== null);
  ipcMain.handle('acts:run-models', (event, csvText) => runModels(csvText));
};

exports.resolveEnginePath = resolveEnginePath;
