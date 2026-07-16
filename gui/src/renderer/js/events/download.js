let interval

function download(urls,name) {
    // let url = urls.pop();
    let a = document.createElement("a");
    a.setAttribute('href', urls);
    a.setAttribute('download', '');
    a.setAttribute('target', '_blank');
    a.click();

    if (a){
        ACTS.ui.statusSnackbar.labelText = `${name} Template Downloading!`;
        ACTS.ui.statusSnackbar.open();
    }

}

$('#acts-upload-survey-button').on('click', function () {
    download('https://actsproject.uplb.edu.ph/base_input.csv','Survey')
})


$('#acts-upload-od-button').on('click', function () {
    download('https://actsproject.uplb.edu.ph/od_mat.csv','OD')
})

$('#acts-upload-dc-button').on('click', function () {
    download('https://actsproject.uplb.edu.ph/choice_set.csv','Data Choice')
})