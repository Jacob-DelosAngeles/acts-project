/* ! events/upload.js | Project ACTS | github.com/project-acts */

document.addEventListener('DOMContentLoaded', () => {
    openUploadInputDialogOnUploadButtonClick();
    openFileInputWindowOnFileButtonClick();

    showUploadInputDialogOnFreshStart();

    uploadInputFileOnSubmit_2();
});

function openUploadInputDialogOnUploadButtonClick() {
    // Show upload dialog when upload input buttin is clicked
    ACTS.ui.uploadInputButton.on('click', () => {
        ACTS.ui.mdc.uploadInputDialog.open();
    });
}

function openFileInputWindowOnFileButtonClick() {
    // Show upload dialog when upload input buttin is clicked
    ACTS.ui.inputFileButton.on('click', () => {
        window.open(ACTS.pages.INPUTS_PAGE_FILE);
    });
}

function showUploadInputDialogOnFreshStart() {
    // Try to retrieve the previous input file
    // force an upload if there's no input file yet
    const inputFile = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
    if (inputFile == null) {
        ACTS.ui.mdc.uploadInputDialog.open();
    } else {
        ACTS.ui.inputFileButtonLabel.text(inputFile);
        ACTS.ui.inputFileButton.removeClass("hidden");
        ACTS.ui.animationCard.removeClass('hidden');
        ACTS.ui.runModelButton.removeClass("hidden");

        // window.open(ACTS.pages.INPUTS_PAGE_FILE);
    }
}


function toJson(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            complete(results) {
                resolve(results.data);
            },
            error(err) {
                reject(err);
            }
        });
    });
}

function removeButtons() {
    // ACTS.ui.inputFileButton.addClass("hidden");
    // ACTS.ui.animationCard.addClass('hidden');
    // ACTS.ui.runModelButton.addClass("hidden");
    document.getElementById("acts-animation-stop").click()
}

//todo add csv header validation
function uploadInputFileOnSubmit() {
    ACTS.ui.uploadInputForm.upload = async () => {
        // Don't proceed with the upload if it has no files
        if (ACTS.ui.uploadInputFile.prop('files').length <= 0 && ACTS.ui.uploadInputODFile.prop('files').length <= 0) {
            removeButtons()
            return;
        }
        document.getElementById("acts-animation-stop").click()
        tempHeatmap = ''
        $("#cbk-heatmap").prop('checked', false)

        // Create the upload form data
        let file = ACTS.ui.uploadInputFile.prop('files')[0]
        let file_OD = ACTS.ui.uploadInputODFile.prop('files')[0]
        let file_choice = ACTS.ui.uploadInputChoiceFile.prop('files')[0]


        // Only allow certain types
        if (file === null || file === undefined) {
            ACTS.ui.statusSnackbar.labelText = `Please upload Survey Input file!`;
            ACTS.ui.statusSnackbar.open();
            removeButtons()
            return;
        } else if (file_OD === null || file_OD === undefined) {
            ACTS.ui.statusSnackbar.labelText = `Please upload Origin and Destination Matrix file!`;
            ACTS.ui.statusSnackbar.open();
            removeButtons()
            return;
        }else if (file_choice === null || file_choice === undefined){
            ACTS.ui.statusSnackbar.labelText = `Please upload Data Choice Set file!`;
            ACTS.ui.statusSnackbar.open();
        }

        const odHeaders = ['NAME_O', 'ORIGX', 'ORIGY', 'NAME_D', 'DSTNX', 'DSTNY']
        const surveyHeaders = ['MODEFM', 'DESTFM', 'ACT', 'TRVFREQ', 'AGEB', 'MEMB', 'OVEHB', 'NVEHB', 'GEN', 'POS', 'TRAVEL', 'MARB', 'EDUCB', 'NCHILDB', 'NSENIORB', 'NDISABLEB', 'TVEHB', 'HOUSEB', 'YEARSB', 'OCCUB', 'OSETUPB', 'MINCOMEB', 'TIMEFM', 'EXPENSEFM', 'TRAVTIMEFM', 'TIMELM', 'ORIGLM', 'MODELM', 'EXPENSELM', 'TRAVTIMELM', 'ALERTL1Q1', 'ALERTL1Q2', 'ALERTL1Q3', 'ALERTL1Q4', 'ALERTL2Q1', 'ALERTL2Q2', 'ALERTL2Q3', 'ALERTL2Q4', 'ALERTL3Q1', 'ALERTL3Q2', 'ALERTL3Q3', 'ALERTL3Q4', 'ALERTL4Q1', 'ALERTL4Q2', 'ALERTL4Q3', 'ALERTL4Q4', 'ALERTL5Q1', 'ALERTL5Q2', 'ALERTL5Q3', 'ALERTL5Q4', 'VACC', 'VACCSTAT', 'NTVACCQ1', 'NTVACCQ2', 'NTVACCQ3', 'NTVACCQ4', 'PARTVACCQ1', 'PARTVACCQ2', 'PARTVACCQ3', 'PARTVACCQ4', 'FULLVACCQ1', 'FULLVACCQ2', 'FULLVACCQ3', 'FULLVACCQ4', 'BOOSTERQ1', 'BOOSTERQ2', 'BOOSTERQ3', 'BOOSTERQ4', 'PLQ1B', 'PLQ2B', 'PLQ3B', 'PLQ4B', 'PLQ5B', 'PLQ6B', 'PLQ7B', 'PLQ1D', 'PLQ2D', 'PLQ3D', 'PLQ4D', 'PLQ5D', 'PLQ6D', 'PLQ7D']
        let isSurveyHeaders = false
        let isOdHeaders = false
        await toJson(file).then((res) => {
            if (res.length) {
                const filesurveyHeaders = Object.keys(res[0])
                if (JSON.stringify(surveyHeaders) !== JSON.stringify(filesurveyHeaders)) {
                    // ACTS.ui.statusSnackbar.labelText = `Invalid upload Survey Input file!`;
                    // ACTS.ui.statusSnackbar.open();
                    removeButtons();
                    // isSurveyHeaders = true
                }
            } else {
                ACTS.ui.statusSnackbar.labelText = `Empty upload Survey Input data!`;
                ACTS.ui.statusSnackbar.open();
                // isSurveyHeaders = true
            }
        })

        if (isSurveyHeaders) {
            return false
        }

        await toJson(file_OD).then((res) => {
            if (res.length) {
                const fileOdHeaders = Object.keys(res[0])
                if (JSON.stringify(fileOdHeaders) !== JSON.stringify(odHeaders)) {
                    ACTS.ui.statusSnackbar.labelText = `Invalid upload OD Input file!`;
                    ACTS.ui.statusSnackbar.open();
                    isOdHeaders = true
                    removeButtons()
                }
            } else {
                ACTS.ui.statusSnackbar.labelText = `Empty upload OD Input data!`;
                ACTS.ui.statusSnackbar.open();
                isOdHeaders = true
            }

        })

        if (isOdHeaders) {
            return false
        }


        // Complete the API URL given the current users ID
        let apiURL = ACTS.apis.UPLOAD_INPUTS_ENDPOINT + encodeURIComponent(
            ACTS.user + "/" + file.name
        )

        // then just send it as a body with post request
        // console.log(file)
        // console.log(file_OD.path)
        console.log('Uploading input file ...');

        fetch(apiURL, { method: 'PUT', body: file })
            .then((response) => {
                console.success('Uploading input file ... done!');
                // console.log('API Response:', response);

                // console.log(ACTS.store.INPUT_FILE_KEY,file.name)
                localStorage.setItem(ACTS.store.INPUT_FILE_KEY, file.name);
                localStorage.setItem(ACTS.store.OD_FILE_KEY, file_OD.path);
                localStorage.setItem(ACTS.store.CHOICE_FILE_KEY, file_choice.path)
                getData(file_OD.path)

                localStorage.removeItem(ACTS.store.LOCAL_FILE_KEY);

                ACTS.ui.inputFileButtonLabel.text(file.name);
                ACTS.ui.inputFileButton.removeClass("hidden");
                ACTS.ui.animationCard.removeClass('hidden');
                ACTS.ui.runModelButton.removeClass("hidden");

                ACTS.ui.statusSnackbar.labelText = `Uploaded "${file.name}"`;
                ACTS.ui.statusSnackbar.open();

                // window.open(ACTS.pages.INPUTS_PAGE_FILE);

                updateChoiceSetFilters();
            })
            .catch((error) => {
                console.error('Uploading input file ... failed!');
                console.log('API Response:', error);
            });
    };

    ACTS.ui.mdc.uploadInputDialog.listen('MDCDialog:closing', (event) => {
        if (event.detail.action == "upload") {
            ACTS.ui.uploadInputForm.upload();
        }
    });
}

function uploadInputFileOnSubmit_2() {
  ACTS.ui.uploadInputForm.upload = () => {
    const file        = ACTS.ui.uploadInputFile.prop('files')[0];        // Survey Input
    const file_OD     = ACTS.ui.uploadInputODFile.prop('files')[0];      // OD
    const file_choice = ACTS.ui.uploadInputChoiceFile.prop('files')[0];  // Choice Set

    // --- Basic validation ---
    if (!file || !file_OD || !file_choice) {
      ACTS.ui.statusSnackbar.labelText =
        'Please upload Survey Input, Origin-Destination, and Data Choice Set files.';
      ACTS.ui.statusSnackbar.open();
      document.getElementById("acts-animation-stop").click();
      return;
    }

    // Stop any running animation + reset heatmap
    document.getElementById("acts-animation-stop").click();
    tempHeatmap = '';
    $("#cbk-heatmap").prop('checked', false);

    // --- Blob URLs for local animation ---
    const surveyBlobUrl = URL.createObjectURL(file);
    const odBlobUrl     = URL.createObjectURL(file_OD);

    localStorage.setItem('SURVEY_FILE_URL', surveyBlobUrl);   // for ACTS.map.animate()
    localStorage.setItem('OD_FILE_URL', odBlobUrl);           // for ACTS.map.animate()

    // --- Keep filenames for label / legacy ---
    localStorage.setItem(ACTS.store.INPUT_FILE_KEY, file.name);
    localStorage.setItem(ACTS.store.OD_FILE_KEY, file_OD.name);
    localStorage.setItem(ACTS.store.CHOICE_FILE_KEY, file_choice.name);

    // --- UI updates ---
    ACTS.ui.inputFileButtonLabel.text(file.name);
    ACTS.ui.inputFileButton.removeClass('hidden');
    ACTS.ui.animationCard.removeClass('hidden');
    ACTS.ui.runModelButton.removeClass('hidden');

    ACTS.ui.statusSnackbar.labelText = 'Files selected. Building filters and animation data...';
    ACTS.ui.statusSnackbar.open();

    // --- 1) Parse Survey for headers → build filters with choice set ---
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: function (surveyResult) {
        const metaFields = (surveyResult.meta && surveyResult.meta.fields) || [];
        const surveyHeaders = metaFields
          .map(h => (h || '').trim())
          .filter(h => h !== '');

        updateChoiceSetFilters_2(file_choice, surveyHeaders);
      },
      error: function (err) {
        console.error('Error parsing Survey Input file:', err);
        ACTS.ui.statusSnackbar.labelText = 'Error reading Survey Input file.';
        ACTS.ui.statusSnackbar.open();
      }
    });

    // --- 2) Build animation data (if you still use getData) ---
    const odObjectUrl = odBlobUrl;  // reuse the same blob URL
    getData(odObjectUrl);

    // --- 3) Upload Survey file to backend (model run pipeline) ---
    const apiURL = ACTS.apis.UPLOAD_INPUTS_ENDPOINT + encodeURIComponent(
      ACTS.user + "/" + file.name
    );

    console.log('Uploading input file to backend ...');
    fetch(apiURL, { method: 'PUT', body: file })
      .then((response) => {
        console.success('Uploading input file ... done!');
        localStorage.removeItem(ACTS.store.LOCAL_FILE_KEY);

        // Optional: keep your "Uploaded" snackbar
        ACTS.ui.statusSnackbar.labelText = `Uploaded "${file.name}"`;
        ACTS.ui.statusSnackbar.open();
      })
      .catch((error) => {
        console.error('Uploading input file ... failed!');
        console.log('API Response:', error);
        // Animation will still work locally even if this fails
      });
  };

  ACTS.ui.mdc.uploadInputDialog.listen('MDCDialog:closing', (event) => {
    if (event.detail.action === "upload") {
      ACTS.ui.uploadInputForm.upload();
    }
  });
}


function updateChoiceSetFilters() {
    let choiceURL = localStorage.getItem(ACTS.store.CHOICE_FILE_KEY);

    Papa.parse(choiceURL, {
        header: true,
        download: true,
        complete: function (choice_set) {
            choice_set_data = choice_set.data;

            let element_id = '';
            let var_code = '';
            let suboption_ctr = 0;

            for(data of choice_set_data){
                // set variable
                if (data['Category'] == ''){
                    if (data['Variable Code'] == 'Socio-Demographic & Household Characteristics'){
                        element_id = 'socio-checkbox-container';
                    }
                    else if (data['Variable Code'] == 'Travel Characteristics'){
                        element_id = 'travel-checkbox-container';
    
                    }
                    else if (data['Variable Code'] == 'Scenarios'){
                        element_id = 'scenario-checkbox-container';
                    }

                }

                else {
                    if (data['Variable Code'] !== ''){
                        // set variable code
                        var_code = data['Variable Code'];
                        
                        let element = document.getElementById(element_id);
                        let ul_main = document.createElement('ul');
                        ul_main.classList.add('checkbox-main');
                        element.appendChild(ul_main);
                        let li_main = document.createElement('li');
                        ul_main.appendChild(li_main);
                        let label_main = document.createElement('label');
                        label_main.classList.add('checkbox-main');
                        label_main.innerText = var_code;
                        li_main.appendChild(label_main);
                        var ul_sub = document.createElement('ul');
                        ul_sub.classList.add('checkbox-sub');
                        li_main.appendChild(ul_sub);

                        suboption_ctr = 0;
                    }

                    let li_sub = document.createElement('li');
                    ul_sub.appendChild(li_sub);
                    let input = document.createElement('input');
                    input.type = 'checkbox';
                    input.classList.add('subOption');
                    var_code = var_code.replace(' ', '');
                    var_code = var_code.replace('(', '');
                    var_code = var_code.replace(')', '');
                    input.name = var_code + '-' + suboption_ctr;
                    li_sub.appendChild(input);
                    let label_sub = document.createElement('label');
                    label_sub.innerText = ' ' + data['Category'];
                    li_sub.appendChild(label_sub);

                    suboption_ctr++;
                }
            }

            updateCheckboxes();
        }
    })
}

function updateChoiceSetFilters_2(choiceFile, surveyHeaders) {
  // Make lookup for faster checks
  const surveyHeaderSet = new Set(
    (surveyHeaders || []).map(h => (h || '').trim())
  );

  Papa.parse(choiceFile, {
    header: true,
    complete: function (choice_set) {
      const choice_set_data = choice_set.data || [];

      // Containers in the Animation card
      const socioContainer    = document.getElementById('socio-checkbox-container');
      const travelContainer   = document.getElementById('travel-checkbox-container');
      const scenarioContainer = document.getElementById('scenario-checkbox-container');

      // Clear previous filters
      socioContainer.innerHTML    = '';
      travelContainer.innerHTML   = '';
      scenarioContainer.innerHTML = '';

      let element_id = '';      // which main container we are currently writing into
      let var_code = '';        // current variable code
      let suboption_ctr = 0;    // suboption index
      let ul_sub = null;        // current <ul> for suboptions
      let includeCurrentVar = false; // whether this var_code is present in Survey headers

      for (const row of choice_set_data) {
        const category = (row['Category'] || '').trim();
        const variableCode = (row['Variable Code'] || '').trim();

        // ---- Section rows: Category == '' & special Variable Code ----
        if (category === '') {
          if (variableCode === 'Socio-Demographic & Household Characteristics') {
            element_id = 'socio-checkbox-container';
          } else if (variableCode === 'Travel Characteristics') {
            element_id = 'travel-checkbox-container';
          } else if (variableCode === 'Scenarios') {
            element_id = 'scenario-checkbox-container';
          }
          continue;
        }

        // ---- Variable rows: Category != '' ----
        if (variableCode !== '') {
          // New variable group
          var_code = variableCode;
          // Only include this variable if it exists in the Survey headers
          includeCurrentVar = surveyHeaderSet.has(var_code);

          if (!includeCurrentVar) {
            ul_sub = null; // don't attach its choices
            continue;
          }

          const container =
            element_id === 'travel-checkbox-container'    ? travelContainer :
            element_id === 'scenario-checkbox-container'  ? scenarioContainer :
                                                             socioContainer;  // default

          const ul_main = document.createElement('ul');
          ul_main.classList.add('checkbox-main');
          container.appendChild(ul_main);

          const li_main = document.createElement('li');
          ul_main.appendChild(li_main);

          const label_main = document.createElement('label');
          label_main.classList.add('checkbox-main');
          label_main.innerText = var_code;
          li_main.appendChild(label_main);

          ul_sub = document.createElement('ul');
          ul_sub.classList.add('checkbox-sub');
          li_main.appendChild(ul_sub);

          suboption_ctr = 0;
        }

        // If this variable is not in the survey, skip its choices
        if (!includeCurrentVar || !ul_sub) {
          continue;
        }

        // ---- Choice row for current variable ----
        const li_sub = document.createElement('li');
        ul_sub.appendChild(li_sub);

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.classList.add('subOption');

        const cleanedVar = var_code.replace(/[\s()]/g, '');
        input.name = cleanedVar + '-' + suboption_ctr;
        li_sub.appendChild(input);

        const label_sub = document.createElement('label');
        label_sub.innerText = ' ' + category;
        li_sub.appendChild(label_sub);

        suboption_ctr++;
      }

      if (typeof updateCheckboxes === 'function') {
        updateCheckboxes();
      }

      console.log('Animation filters updated for variables present in Survey:', surveyHeaders);
    },

    error: function (err) {
      console.error('Error parsing Choice Set file:', err);
      ACTS.ui.statusSnackbar.labelText = 'Error reading Data Choice Set file.';
      ACTS.ui.statusSnackbar.open();
    }
  });
}
