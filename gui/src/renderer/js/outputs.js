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

  // Model results are computed on the map page (Run Model) and stashed in
  // localStorage — this page just renders them, no server round-trip.
  const raw = localStorage.getItem(ACTS.store.MODEL_RESULTS_KEY);
  if (!raw) {
    ACTS.ui.loadingIndicator.close();
    ACTS.ui.statusSnackbar.labelText =
        'No model results yet. Run a model from the map page first.';
    ACTS.ui.statusSnackbar.open();
    return;
  }

  buildOutputSheets(JSON.parse(raw)).then((sheets) => {
    ACTS.ui.loadingIndicator.close();
    xspr = x_spreadsheet('#xspreadsheet').loadData(sheets);
    ACTS.ui.saveButton.removeClass('hidden');
  }).catch((err) => {
    // Never leave the page sitting on the loading indicator with no
    // explanation if the results can't be turned into sheets.
    console.error('Could not render model results:', err);
    ACTS.ui.loadingIndicator.close();
    ACTS.ui.statusSnackbar.labelText =
        'Could not display the model results. Please run the model again.';
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
  return new Promise((resolve, reject) => {
    const summary = {};

    Papa.parse(fileURL, {
      header: true,
      download: true,
      complete: function(results) {
        // Guard the whole body: a throw inside a Papa callback would other-
        // wise escape the promise and leave it forever pending.
        try {
          const resultData = results.data;
          resultData.pop();

          if (!resultData.length) {
            resolve(summary);
            return;
          }

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
        } catch (err) {
          reject(err);
        }
      },
      // Required: without an error handler a failed fetch (e.g. a stale
      // blob: URL left over from a previous session) never settles this
      // promise, which would hang the Outputs page with nothing rendered.
      error: function(err) {
        reject(err);
      },
    });
  });
}

/**
 * Converts a list of record objects (one per table row) into the row/cell
 * shape convertToSpreadsheetObject expects, using the object keys as a
 * header row.
 * @param {Object[]} records - Rows as {column: value} objects.
 * @return {Object} Rows keyed by index, each {cells: {col: value}}.
 */
function recordsToSheetRows(records) {
  const rows = {};
  if (!records || records.length === 0) {
    return rows;
  }

  const headers = Object.keys(records[0]);
  rows['0'] = {cells: {}};
  headers.forEach((header, col) => {
    rows['0']['cells'][String(col)] = header;
  });

  records.forEach((record, index) => {
    const rowKey = String(index + 1);
    rows[rowKey] = {cells: {}};
    headers.forEach((header, col) => {
      rows[rowKey]['cells'][String(col)] = record[header];
    });
  });

  return rows;
}

/**
 * Builds the Outputs spreadsheet: a value-count summary of the uploaded
 * survey plus one sheet per non-empty model table (overview/analysis/
 * correlation for each of the four models).
 * @param {Object} results - The /models/run "results" object.
 * @return {Promise<Object[]>} Resolves with x-spreadsheet sheet definitions.
 */
async function buildOutputSheets(results) {
  const sheets = [];

  // Data summary straight from the locally-uploaded survey CSV.
  const surveyUrl = localStorage.getItem('SURVEY_FILE_URL');
  if (surveyUrl) {
    try {
      const summary = await readFile(surveyUrl);
      sheets.push(
          {name: 'Data Summary', rows: convertToSpreadsheetObject(summary)});
    } catch (err) {
      console.error('Could not build data summary:', err);
    }
  }

  const modelLabels = {
    travel: 'Travel',
    activity: 'Activity',
    dest: 'Destination',
    mode: 'Mode',
  };
  const tableLabels = {
    overview: 'Overview',
    analysis: 'Analysis',
    correlation: 'Correlation',
  };

  for (const [modelKey, modelLabel] of Object.entries(modelLabels)) {
    const model = results[modelKey];
    if (!model) {
      continue;
    }
    for (const [tableKey, tableLabel] of Object.entries(tableLabels)) {
      const records = model[tableKey];
      if (!records || records.length === 0) {
        continue;
      }
      sheets.push({
        name: `${modelLabel} - ${tableLabel}`,
        rows: convertToSpreadsheetObject(recordsToSheetRows(records)),
      });
    }
  }

  if (sheets.length === 0) {
    sheets.push({
      name: 'Results',
      rows: convertToSpreadsheetObject(recordsToSheetRows(
          [{message: 'No significant model results for this dataset.'}])),
    });
  }

  return sheets;
}
