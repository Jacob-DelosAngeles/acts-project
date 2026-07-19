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
  const apiURL = ACTS.apis.GET_OUTPUTS_ENDPOINT + encodeURIComponent(
      ACTS.user + '/' + filename,
  );

  console.log('Fetching model output data ...');
  fetch(apiURL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })
      .then((response) => {
        console.success('Fetching model output data ... done!');
        return response.json();
      })
      .then((data) => {
        const processedData = [];

        // let summary = getStatsSummary();
        getStatsSummary().then((x)=> {
          processedData.push(
              {name: 'Summary', rows: convertToSpreadsheetObject(x)});
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              const subData = data[key];
              // console.log(subData);
              if (subData && Object.keys(subData).length !== 0) {
                processedData.push(
                    {
                      name: key,
                      rows: convertToSpreadsheetObject(subData),
                    },
                );
              }
            }
          }

          // console.log(processedData);
          ACTS.ui.loadingIndicator.close();
          xspr = x_spreadsheet('#xspreadsheet')
              .loadData(processedData); // load data

          ACTS.ui.saveButton.removeClass('hidden');
        });
      })
      .catch((error) => {
        console.error('Fetching model output data ... failed!');
        console.log('API Response:', error);

        ACTS.ui.statusSnackbar.labelText = `Unable to show the model ` +
            `output! Please verify the input data and re-upload`;
        ACTS.ui.statusSnackbar.open();
      });
});


// Called from onclick="exportXlsx()" in outputs.html; ESLint's single-file
// analysis can't see that cross-file usage in this non-module codebase.
/** Exports the current output spreadsheet as output.xlsx. */
function exportXlsx() { // eslint-disable-line no-unused-vars
  XLSX.writeFile(xtos(xspr.getData()), 'output.xlsx', {});
}

/**
 * Counts occurrences of each distinct value for a given column.
 * @param {string} key_ - The column name to tally.
 * @param {Object[]} data - The parsed rows to tally.
 * @return {Object[]} One `{value: count}` entry per distinct value.
 */
function countStats(key_, data) {
  const res_ = data.reduce((acc, item) => {
    const key = item[key_];
    if (!acc.hasOwnProperty(key)) {
      acc[key] = 0;
    }
    acc[key] += 1;
    return acc;
  }, {});

  return Object.entries(res_).map(([key, value])=> ({[key]: value}));
}

/**
 * Builds a per-column value-count summary from the Survey Input file.
 * @param {string} fileURL - URL of the Survey Input file.
 * @return {Promise<Object>} Resolves with the summary spreadsheet data.
 */
function readFile(fileURL) {
  return new Promise((resolve) => {
    const summary = {};

    Papa.parse(fileURL, {
      header: true,
      download: true,
      complete: function(results) {
        const resultData = results.data;
        resultData.pop();
        // console.log(resultData);

        summary['0'] = {};
        summary['0']['cells'] = {};

        let row = 1;
        const keys = Object.keys(resultData[0]);
        for (const key of keys) {
          summary[row.toString()] = {};
          summary[row.toString()]['cells'] = {};
          summary[row.toString()]['cells']['0'] = key;

          const counts = countStats(key, resultData);
          let column = 1;
          for (let ctr=0; ctr<counts.length; ctr++) {
            summary[row.toString()]['cells'][column.toString()] =
                JSON.stringify(counts[ctr][ctr]);
            summary['0']['cells'][column.toString()] = (column-1).toString();
            column ++;
          }
          row ++;
        }
        resolve(summary);
      },
    });
  });
}

/**
 * Builds the full stats summary for the Outputs page spreadsheet.
 * @return {Promise<Object>} Resolves with the summary spreadsheet data.
 */
async function getStatsSummary() {
  const filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
  const fileURL = ACTS.apis.PUBLIC_S3_URL + encodeURIComponent(
      ACTS.user + '/' + filename,
  );

  const res = await readFile(fileURL);
  return res;
}
