// Called from events/upload.js; ESLint's single-file analysis can't see
// cross-file usage in this non-module codebase.
/** Wires each socio-demographic/travel/scenario checkbox to filter markers. */
function updateCheckboxes() { // eslint-disable-line no-unused-vars
  const checkboxes = document.querySelectorAll('input.subOption');

  for (let i=0; i<checkboxes.length; i++) {
    checkboxes[i].onclick = function() {
      // checkbox callback
      const filters = [];
      for (const checkbox of checkboxes) {
        if (checkbox.checked == true) {
          filters.push(checkbox.name);
        }
      }

      for (const [, marker] of agentMarkers) {
        if (filters.length == 0) {
          marker._icon.style.display = '';
        } else {
          marker._icon.style.display = 'none';
        }
      }

      for (const [agent, marker] of agentMarkers) {
        const show = [];

        for (const filter of filters) {
          const values = filter.split('-');

          variable = values[0];
          filterValue = values[1];
          agentValue = agent.data[variable];

          show.push((showMarker(filterValue, agentValue) ? true : false));
        }

        if (show.includes(false)) {
          marker._icon.style.display = 'none';
        } else {
          marker._icon.style.display = '';
        }
      }
    };
  }
}

/**
 * @param {string} filterValue - The filter checkbox's expected value.
 * @param {string} agentValue - The agent's actual value for that variable.
 * @return {boolean} Whether the agent matches the filter.
 */
function showMarker(filterValue, agentValue) {
  if (filterValue == agentValue) {
    return true;
  } else {
    return false;
  }
}
