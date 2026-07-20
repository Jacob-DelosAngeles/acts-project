/* ! index.js | Project ACTS | github.com/project-acts */

ACTS.ui.saveButton = $('#x-spreadsheet-save-btn');
let xspr;

document.addEventListener('DOMContentLoaded', () => {
  // Attach loading indicator
  // by default, the loading indicator is open when attached
  ACTS.ui.loadingIndicator = MDCLinearProgress.attachTo(
      document.querySelector('#acts-loading-indicator'),
  );

  tippy('#x-spreadsheet-save-btn', {
    duration: 0,
    delay: 0,
    offset: [0, 2],
    placement: 'bottom',
    theme: 'xspreadsheet',
    content: 'Save',
  });

  // Status / State snackbar
  ACTS.ui.statusSnackbar = MDCSnackbar.attachTo(
      document.querySelector('#acts-status-snackbar'));

  // Render the survey CSV straight from the local copy the map page stored.
  // There is no server round-trip: the file never leaves the machine.
  const filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
  const surveyUrl = localStorage.getItem('SURVEY_FILE_URL');

  if (!surveyUrl) {
    ACTS.ui.loadingIndicator.close();
    ACTS.ui.statusSnackbar.labelText =
        'No input file loaded yet. Upload a Survey Input file first.';
    ACTS.ui.statusSnackbar.open();
    return;
  }

  readCsvAsSheetRows(surveyUrl)
      .then((rows) => {
        ACTS.ui.loadingIndicator.close();
        xspr = x_spreadsheet('#xspreadsheet').loadData([
          {
            name: filename || 'Survey Input',
            rows: convertToSpreadsheetObject(rows),
          },
        ]);

        ACTS.ui.saveButton.removeClass('hidden');
      })
      .catch((error) => {
        // Always close the indicator — leaving it spinning was why this
        // page appeared to hang forever when the fetch failed.
        console.error('Could not read the input file:', error);
        ACTS.ui.loadingIndicator.close();

        ACTS.ui.statusSnackbar.labelText = 'Unable to show the uploaded ' +
            'input file. Please re-upload it from the map page.';
        ACTS.ui.statusSnackbar.open();
      });
});

/**
 * Parses a CSV into the row/cell shape convertToSpreadsheetObject expects.
 * @param {string} fileURL - URL (blob:) of the CSV to read.
 * @return {Promise<Object>} Rows keyed by index, each {cells: {col: value}}.
 */
function readCsvAsSheetRows(fileURL) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileURL, {
      download: true,
      skipEmptyLines: true,
      complete: function(results) {
        try {
          const rows = {};
          results.data.forEach((cols, r) => {
            const rowKey = String(r);
            rows[rowKey] = {cells: {}};
            cols.forEach((value, c) => {
              rows[rowKey]['cells'][String(c)] = value;
            });
          });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      },
      // Without this the promise would never settle on a failed read.
      error: function(err) {
        reject(err);
      },
    });
  });
}


// Called from onclick="exportXlsx()" in inputs.html; ESLint's single-file
// analysis can't see that cross-file usage in this non-module codebase.
/** Exports the current input spreadsheet as input.xlsx. */
function exportXlsx() { // eslint-disable-line no-unused-vars
  XLSX.writeFile(xtos(xspr.getData()), 'input.xlsx', {});
}
