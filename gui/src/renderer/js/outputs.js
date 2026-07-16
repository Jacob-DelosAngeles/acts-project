/* ! index.js | Project ACTS | github.com/project-acts */

ACTS.ui.saveButton = $('#x-spreadsheet-save-btn');
var xspr;

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
  ACTS.ui.statusSnackbar = MDCSnackbar.attachTo(document.querySelector('#acts-status-snackbar'));

  // Complete the API URL given the current users ID
  let filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
  let apiURL = ACTS.apis.GET_OUTPUTS_ENDPOINT + encodeURIComponent(
    ACTS.user + "/" + filename
  )

  console.log('Fetching model output data ...');
  fetch(apiURL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })
      .then((response) => {
        console.success('Fetching model output data ... done!');
        return response.json();
      })
      .then(data => {
        let processedData = [];
        
        // let summary = get_stats_summary();
        get_stats_summary().then(x=> {
          processedData.push({name: 'Summary', rows: convertToSpreadsheetObject(x)});
          for (var key in data) {
            if (data.hasOwnProperty(key)) {
              let subData = data[key];
              // console.log(subData);
              if (subData && Object.keys(subData).length !== 0) {
                processedData.push(
                  {
                    name: key,
                    rows: convertToSpreadsheetObject(subData)
                  }
                )
              }
            }
          }
  
          // console.log(processedData);
          ACTS.ui.loadingIndicator.close();
          xspr = x_spreadsheet('#xspreadsheet')
            .loadData(processedData) // load data
  
          ACTS.ui.saveButton.removeClass("hidden");

        });
      })
      .catch((error) => {
        console.error('Fetching model output data ... failed!');
        console.log('API Response:', error);

        ACTS.ui.statusSnackbar.labelText = `Unable to show the model output! Please verify the input data and re-upload`;
        ACTS.ui.statusSnackbar.open();
      });
});


function export_xlsx() {
  XLSX.writeFile(xtos(xspr.getData()), 'output.xlsx', {});
}

function count_stats(key_, data){
  const res_ = data.reduce((acc, item) => {
      const key = item[key_];
      if (!acc.hasOwnProperty(key)) {
          acc[key] = 0;
      }
      acc[key] += 1;
      return acc;
      }, {})

  return Object.entries(res_).map(([key, value])=> ({ [key]: value }))
}

function read_file(fileURL){
  return new Promise(resolve => {
    let summary = {};

    Papa.parse(fileURL, {
        header: true,
        download: true,
        complete: function (results) {
          let result_data = results.data;
          result_data.pop();
          // console.log(result_data);

          summary['0'] = {};
          summary['0']['cells'] = {};

          let row = 1
          let keys = Object.keys(result_data[0]);
          for(let key of keys){
            summary[row.toString()] = {};
            summary[row.toString()]['cells'] = {};
            summary[row.toString()]['cells']['0'] = key;

            let counts = count_stats(key, result_data);
            let column = 1;
            for (let ctr=0; ctr<counts.length; ctr++){
              summary[row.toString()]['cells'][column.toString()] = JSON.stringify(counts[ctr][ctr]);
              summary['0']['cells'][column.toString()] = (column-1).toString();
              column ++;
            }
            row ++;
          }
          resolve(summary);
        } 
    });
  })
}

async function get_stats_summary(){
  let filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
  let fileURL = ACTS.apis.PUBLIC_S3_URL + encodeURIComponent(
      ACTS.user + "/" + filename
  )

  const res = await read_file(fileURL);
  return res;
}
