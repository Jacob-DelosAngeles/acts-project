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

  // Complete the API URL given the current users ID
  const filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
  const apiURL = ACTS.apis.UPLOAD_INPUTS_ENDPOINT + encodeURIComponent(
      ACTS.user + '/' + filename,
  );

  const localData = localStorage.getItem(ACTS.store.LOCAL_FILE_KEY);

  if (localData == null) {
    console.log('Fetching input file data ...');
    fetch(apiURL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
        .then((response) => {
          console.success('Fetching input file data ... done!');
          return response.json();
        })
        .then((data) => {
          localStorage.setItem(
              ACTS.store.LOCAL_FILE_KEY, JSON.stringify(data),
          );

          ACTS.ui.loadingIndicator.close();
          xspr = x_spreadsheet('#xspreadsheet')
              .loadData(
                  [
                    {
                      name: filename,
                      rows: convertToSpreadsheetObject(data),
                    },
                  ],
              ); // load data

          ACTS.ui.saveButton.removeClass('hidden');
        })
        .catch((error) => {
          console.error('Uploading input file ... failed!');
          console.log('API Response:', error);

          ACTS.ui.statusSnackbar.labelText = `Unable to show the uploaded ` +
              `input file! Please verify the input data and re-upload`;
          ACTS.ui.statusSnackbar.open();
        });
  } else {
    ACTS.ui.loadingIndicator.close();
    xspr = x_spreadsheet('#xspreadsheet')
        .loadData(
            [
              {
                name: filename,
                rows: convertToSpreadsheetObject(JSON.parse(localData)),
              },
            ],
        ); // load data

    ACTS.ui.saveButton.removeClass('hidden');
  }
});


// Called from onclick="exportXlsx()" in inputs.html; ESLint's single-file
// analysis can't see that cross-file usage in this non-module codebase.
/** Exports the current input spreadsheet as input.xlsx. */
function exportXlsx() { // eslint-disable-line no-unused-vars
  XLSX.writeFile(xtos(xspr.getData()), 'input.xlsx', {});
}
