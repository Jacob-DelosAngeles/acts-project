/* ! events/model.js | Project ACTS | github.com/project-acts */

document.addEventListener('DOMContentLoaded', () => {
  runModelOnModelButtonClick();
});

/**
 * Wires the "Run Model" button: POST the uploaded survey CSV straight to the
 * API's /models/run, stash the returned model summaries, then open the
 * Outputs page to render them. No cloud storage is involved — the CSV goes
 * from the local blob directly to the server.
 */
function runModelOnModelButtonClick() {
  ACTS.ui.runModelButton.on('click', async () => {
    const surveyUrl = localStorage.getItem('SURVEY_FILE_URL');
    if (!surveyUrl) {
      ACTS.ui.statusSnackbar.labelText =
          'Please upload a Survey Input file first.';
      ACTS.ui.statusSnackbar.open();
      return;
    }

    ACTS.ui.statusSnackbar.labelText =
        'Running models on the server... this can take a couple of ' +
        'minutes. The Outputs page will open when it is done.';
    ACTS.ui.statusSnackbar.open();

    try {
      const blob = await (await fetch(surveyUrl)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'survey.csv');

      const response = await fetch(ACTS.apis.RUN_MODELS_ENDPOINT, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Server responded ' + response.status);
      }

      const payload = await response.json();
      localStorage.setItem(
          ACTS.store.MODEL_RESULTS_KEY,
          JSON.stringify(payload.results || {}),
      );

      window.open(ACTS.pages.OUTPUTS_PAGE_FILE);
    } catch (err) {
      console.error('Model run failed:', err);
      ACTS.ui.statusSnackbar.labelText =
          'Model run failed. Check your connection and try again.';
      ACTS.ui.statusSnackbar.open();
    }
  });
}

document.getElementById('acts-animation-start')
    .addEventListener('click', () => {
      ACTS.map.labels.setOpacity(0);
      // ACTS.map.animate();
      ACTS.map.animate_2();
      $('#acts-animation-start').hide();
      setTimeout(() => {
        $('#acts-animation-stop').show();
      }, 10000);


      localStorage.setItem('run', true);
    });

document.getElementById('acts-animation-stop').addEventListener('click', () => {
  const map_ = ACTS.map;
  for (const [, marker] of agentMarkers) {
    map_.container.removeLayer(marker);
  }

  for (ctrl of controls) {
    // ctrl.removeFrom(map_);
    // console.log(controls)
    map_.container.removeControl(ctrl);
  }
  agentMarkers.clear();
  agents = [];
  controls = [];
  ACTS.map.labels.setOpacity(1);
  $('#acts-animation-start').show();
  $('#acts-animation-stop').hide();
  localStorage.setItem('run', false);

  Object.entries(lineRoutes).forEach(([key, value]) => {
    globalMap.removeControl(value);
  });

  // lineHeat.forEach((value) => {
  //     console.log(value)
  //     globalMap.removeLayer(value)
  // });
  if (tempHeatmap) {
    globalMap.removeLayer(tempHeatmap);
  }
});

document.getElementById('acts-animation-reset')
    .addEventListener('click', () => {
      $('.subOption').prop('checked', false);
      for (const [, marker] of agentMarkers) {
        marker._icon.style.display = '';
      }

      $('.desire-line-route').prop('checked', false);
      $('#cbk-heatmap').prop('checked', false);

      Object.entries(lineRoutes).forEach(([key, value]) => {
        globalMap.removeControl(value);
      });

      if (tempHeatmap) {
        globalMap.removeLayer(tempHeatmap);
      }
      tempHeatmap = '';
    });
