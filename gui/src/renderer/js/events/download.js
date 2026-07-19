/**
 * Triggers a browser download of a template CSV.
 * @param {string} urls - The URL to download from.
 * @param {string} name - Human-readable name shown in the status snackbar.
 */
function download(urls, name) {
  // let url = urls.pop();
  const a = document.createElement('a');
  a.setAttribute('href', urls);
  a.setAttribute('download', '');
  a.click();

  if (a) {
    ACTS.ui.statusSnackbar.labelText = `${name} Template Downloading!`;
    ACTS.ui.statusSnackbar.open();
  }
}

// Templates ship inside the app under src/renderer/template/. They are served
// from the same file:// origin as this page, which is the only case where the
// anchor `download` attribute actually saves the file — a cross-origin URL
// (the old UPLB host) would just open the CSV instead of downloading it.
$('#acts-upload-survey-button').on('click', function() {
  download('template/survey.csv', 'Survey');
});


$('#acts-upload-od-button').on('click', function() {
  download('template/od.csv', 'OD');
});

$('#acts-upload-dc-button').on('click', function() {
  download('template/data%20choice.csv', 'Data Choice');
});
