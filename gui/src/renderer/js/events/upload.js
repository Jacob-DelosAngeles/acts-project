/* ! events/upload.js | Project ACTS | github.com/project-acts */

document.addEventListener('DOMContentLoaded', () => {
  openUploadInputDialogOnUploadButtonClick();
  openFileInputWindowOnFileButtonClick();

  showUploadInputDialogOnFreshStart();

  uploadInputFileOnSubmit2();
});

/** Opens the upload dialog when the upload-input button is clicked. */
function openUploadInputDialogOnUploadButtonClick() {
  // Show upload dialog when upload input buttin is clicked
  ACTS.ui.uploadInputButton.on('click', () => {
    ACTS.ui.mdc.uploadInputDialog.open();
  });
}

/** Opens the Inputs page when the file-input button is clicked. */
function openFileInputWindowOnFileButtonClick() {
  // Show upload dialog when upload input buttin is clicked
  ACTS.ui.inputFileButton.on('click', () => {
    window.open(ACTS.pages.INPUTS_PAGE_FILE);
  });
}

/** Shows the upload dialog on first launch, or restores the last file's UI. */
function showUploadInputDialogOnFreshStart() {
  // Try to retrieve the previous input file
  // force an upload if there's no input file yet
  const inputFile = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
  if (inputFile == null) {
    ACTS.ui.mdc.uploadInputDialog.open();
  } else {
    ACTS.ui.inputFileButtonLabel.text(inputFile);
    ACTS.ui.inputFileButton.removeClass('hidden');
    ACTS.ui.animationCard.removeClass('hidden');
    ACTS.ui.runModelButton.removeClass('hidden');

    // window.open(ACTS.pages.INPUTS_PAGE_FILE);
  }
}


/** Wires the survey/OD/choice-set upload form's submit handler. */
function uploadInputFileOnSubmit2() {
  ACTS.ui.uploadInputForm.upload = () => {
    const file = ACTS.ui.uploadInputFile.prop('files')[0]; // Survey Input
    const fileOd = ACTS.ui.uploadInputODFile.prop('files')[0]; // OD
    // Choice Set
    const fileChoice = ACTS.ui.uploadInputChoiceFile.prop('files')[0];

    // --- Basic validation ---
    if (!file || !fileOd || !fileChoice) {
      ACTS.ui.statusSnackbar.labelText = 'Please upload Survey Input, ' +
        'Origin-Destination, and Data Choice Set files.';
      ACTS.ui.statusSnackbar.open();
      document.getElementById('acts-animation-stop').click();
      return;
    }

    // Stop any running animation + reset heatmap
    document.getElementById('acts-animation-stop').click();
    tempHeatmap = '';
    $('#cbk-heatmap').prop('checked', false);

    // --- Blob URLs for local animation ---
    const surveyBlobUrl = URL.createObjectURL(file);
    const odBlobUrl = URL.createObjectURL(fileOd);

    // for ACTS.map.animate()
    localStorage.setItem('SURVEY_FILE_URL', surveyBlobUrl);
    localStorage.setItem('OD_FILE_URL', odBlobUrl);

    // --- Keep filenames for label / legacy ---
    localStorage.setItem(ACTS.store.INPUT_FILE_KEY, file.name);
    localStorage.setItem(ACTS.store.OD_FILE_KEY, fileOd.name);
    localStorage.setItem(ACTS.store.CHOICE_FILE_KEY, fileChoice.name);

    // --- UI updates ---
    ACTS.ui.inputFileButtonLabel.text(file.name);
    ACTS.ui.inputFileButton.removeClass('hidden');
    ACTS.ui.animationCard.removeClass('hidden');
    ACTS.ui.runModelButton.removeClass('hidden');

    ACTS.ui.statusSnackbar.labelText =
        'Files selected. Building filters and animation data...';
    ACTS.ui.statusSnackbar.open();

    // --- 1) Parse Survey for headers → build filters with choice set ---
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: function(surveyResult) {
        const metaFields =
            (surveyResult.meta && surveyResult.meta.fields) || [];
        const surveyHeaders = metaFields
            .map((h) => (h || '').trim())
            .filter((h) => h !== '');

        updateChoiceSetFilters2(fileChoice, surveyHeaders);
      },
      error: function(err) {
        console.error('Error parsing Survey Input file:', err);
        ACTS.ui.statusSnackbar.labelText = 'Error reading Survey Input file.';
        ACTS.ui.statusSnackbar.open();
      },
    });

    // --- 2) Build animation data (if you still use getData) ---
    const odObjectUrl = odBlobUrl; // reuse the same blob URL
    getData(odObjectUrl);

    // --- 3) Upload Survey file to backend (model run pipeline) ---
    // POST multipart/form-data to Flask's /inputs/upload (field name "file").
    // Best-effort: the map animation above already works from local blobs, so
    // a failure here (e.g. storage not yet configured) must not block the UI.
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading input file to backend ...');
    fetch(ACTS.apis.UPLOAD_INPUTS_ENDPOINT, {method: 'POST', body: formData})
        .then((response) => {
          console.log('Uploading input file ... done!');
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
    if (event.detail.action === 'upload') {
      ACTS.ui.uploadInputForm.upload();
    }
  });
}


/**
 * Builds the socio-demographic/travel/scenario filter checkboxes from the
 * Data Choice Set file, limited to variables present in the Survey headers.
 * @param {File} choiceFile - The uploaded Data Choice Set file.
 * @param {string[]} surveyHeaders - Column headers from the Survey Input file.
 */
function updateChoiceSetFilters2(choiceFile, surveyHeaders) {
  // Make lookup for faster checks
  const surveyHeaderSet = new Set(
      (surveyHeaders || []).map((h) => (h || '').trim()),
  );

  Papa.parse(choiceFile, {
    header: true,
    complete: function(choiceSet) {
      const choiceSetData = choiceSet.data || [];

      // Containers in the Animation card
      const socioContainer =
          document.getElementById('socio-checkbox-container');
      const travelContainer =
          document.getElementById('travel-checkbox-container');
      const scenarioContainer =
          document.getElementById('scenario-checkbox-container');

      // Clear previous filters
      socioContainer.innerHTML = '';
      travelContainer.innerHTML = '';
      scenarioContainer.innerHTML = '';

      let elementId = ''; // which main container we are currently writing into
      let varCode = ''; // current variable code
      let suboptionCtr = 0; // suboption index
      let ulSub = null; // current <ul> for suboptions
      // whether this varCode is present in Survey headers
      let includeCurrentVar = false;

      for (const row of choiceSetData) {
        const category = (row['Category'] || '').trim();
        const variableCode = (row['Variable Code'] || '').trim();

        // ---- Section rows: Category == '' & special Variable Code ----
        if (category === '') {
          if (variableCode ===
              'Socio-Demographic & Household Characteristics') {
            elementId = 'socio-checkbox-container';
          } else if (variableCode === 'Travel Characteristics') {
            elementId = 'travel-checkbox-container';
          } else if (variableCode === 'Scenarios') {
            elementId = 'scenario-checkbox-container';
          }
          continue;
        }

        // ---- Variable rows: Category != '' ----
        if (variableCode !== '') {
          // New variable group
          varCode = variableCode;
          // Only include this variable if it exists in the Survey headers
          includeCurrentVar = surveyHeaderSet.has(varCode);

          if (!includeCurrentVar) {
            ulSub = null; // don't attach its choices
            continue;
          }

          // default
          const container =
            elementId === 'travel-checkbox-container' ? travelContainer :
            elementId === 'scenario-checkbox-container' ? scenarioContainer :
                                                             socioContainer;

          const ulMain = document.createElement('ul');
          ulMain.classList.add('checkbox-main');
          container.appendChild(ulMain);

          const liMain = document.createElement('li');
          ulMain.appendChild(liMain);

          const labelMain = document.createElement('label');
          labelMain.classList.add('checkbox-main');
          labelMain.innerText = varCode;
          liMain.appendChild(labelMain);

          ulSub = document.createElement('ul');
          ulSub.classList.add('checkbox-sub');
          liMain.appendChild(ulSub);

          suboptionCtr = 0;
        }

        // If this variable is not in the survey, skip its choices
        if (!includeCurrentVar || !ulSub) {
          continue;
        }

        // ---- Choice row for current variable ----
        const liSub = document.createElement('li');
        ulSub.appendChild(liSub);

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.classList.add('subOption');

        const cleanedVar = varCode.replace(/[\s()]/g, '');
        input.name = cleanedVar + '-' + suboptionCtr;
        liSub.appendChild(input);

        const labelSub = document.createElement('label');
        labelSub.innerText = ' ' + category;
        liSub.appendChild(labelSub);

        suboptionCtr++;
      }

      if (typeof updateCheckboxes === 'function') {
        updateCheckboxes();
      }

      console.log(
          'Animation filters updated for variables present in Survey:',
          surveyHeaders);
    },

    error: function(err) {
      console.error('Error parsing Choice Set file:', err);
      ACTS.ui.statusSnackbar.labelText = 'Error reading Data Choice Set file.';
      ACTS.ui.statusSnackbar.open();
    },
  });
}
