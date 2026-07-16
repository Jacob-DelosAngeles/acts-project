function updateCheckboxes(){

  let checkboxes = document.querySelectorAll('input.subOption');
  let map_ = ACTS.map;

  for(var i=0; i<checkboxes.length; i++) {
    checkboxes[i].onclick = function() {
      // checkbox callback
      let filters = [];
      for(let checkbox of checkboxes){
        if (checkbox.checked == true){
          filters.push(checkbox.name)
        }      
      }

      for(const [agent, marker] of agent_markers){
        if (filters.length == 0){
          marker._icon.style.display = '';
        }
        else {
          marker._icon.style.display = 'none';
        }
      }
      
      for(const [agent, marker] of agent_markers){
        let show = [];

        for(let filter of filters){
          let values = filter.split('-');

          variable = values[0];
          filter_value = values[1];
          agent_value = agent.data[variable];

          show.push((show_marker(filter_value, agent_value) ? true : false));
        }

        if (show.includes(false)){
          marker._icon.style.display = 'none';
        }
        else {
          marker._icon.style.display = '';
        }
      }
    }
  }
}

function show_marker(filter_value, agent_value){
  if (filter_value == agent_value){
    return true;
  }
  else {
    return false;
  }
}