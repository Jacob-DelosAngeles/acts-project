/* ! index.js | Project ACTS | github.com/project-acts */

document.addEventListener('DOMContentLoaded', () => {
  // Attach appbar
  ACTS.ui.appbar = MDCTopAppBar.attachTo(document.querySelector('#acts-appbar'));

  // Instantiate the main ACTS map
  ACTS.map = new ACTS.Map(14.651455448918075, 121.04932520030924);
  ACTS.leaflet = '';

  // Attach input file upload components (jQuery)
  ACTS.ui.inputFileButton = $('#acts-input-file');
  ACTS.ui.runModelButton = $('#acts-run-model-button');
  ACTS.ui.uploadInputButton = $('#acts-upload-input-button');
  ACTS.ui.uploadInputDialog = $('#acts-upload-input-dialog');
  ACTS.ui.animationCard = $('#acts-filters-container');

  ACTS.ui.inputFileButtonLabel = ACTS.ui.inputFileButton.children('.mdc-fab__label');
  ACTS.ui.uploadInputButtonLabel = ACTS.ui.uploadInputButton.children('.mdc-fab__label');

  ACTS.ui.uploadInputForm = $('#acts-upload-input-dialog__form');
  ACTS.ui.uploadInputFile = $('#acts-upload-input-dialog__file-input');
  ACTS.ui.uploadInputODFile = $('#acts-upload-input-dialog__file-input-od');
  ACTS.ui.uploadInputChoiceFile = $('#acts-upload-input-dialog__file-input-choice');

  // Attach input file upload components (Material Component)
  ACTS.ui.mdc.inputFileButton = MDCRipple.attachTo(ACTS.ui.inputFileButton[0]);
  ACTS.ui.mdc.uploadInputButton = MDCRipple.attachTo(ACTS.ui.uploadInputButton[0]);
  ACTS.ui.mdc.uploadInputDialog = MDCDialog.attachTo(ACTS.ui.uploadInputDialog[0]);

  // Status / State snackbar
  ACTS.ui.statusSnackbar = MDCSnackbar.attachTo(document.querySelector('#acts-status-snackbar'));

  $("#acts-animation-stop").hide()
  localStorage.setItem('run', false)
});
