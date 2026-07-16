/* ! events/model.js | Project ACTS | github.com/project-acts */

document.addEventListener('DOMContentLoaded', () => {
    runModelOnModelButtonClick();
});

function runModelOnModelButtonClick() {
    // Show loading dialog when run model button is clicked
    ACTS.ui.runModelButton.on('click', () => {
        window.open(ACTS.pages.OUTPUTS_PAGE_FILE);
    });
}

document.getElementById("acts-animation-start").addEventListener('click', () => {
    ACTS.map.labels.setOpacity(0);
    // ACTS.map.animate();
    ACTS.map.animate_2();
    $("#acts-animation-start").hide()
    setTimeout(() => {
        $("#acts-animation-stop").show()
    }, 10000)


    localStorage.setItem('run', true)
})

document.getElementById("acts-animation-stop").addEventListener('click', () => {
    let map_ = ACTS.map;
    for (const [agent, marker] of agent_markers) {
        map_.container.removeLayer(marker);
    }

    for (ctrl of controls) {
        // ctrl.removeFrom(map_);
        // console.log(controls)
        map_.container.removeControl(ctrl);
    }
    agent_markers.clear();
    agents = [];
    controls = [];
    ACTS.map.labels.setOpacity(1);
    $("#acts-animation-start").show()
    $("#acts-animation-stop").hide()
    localStorage.setItem('run', false)

    Object.entries(lineRoutes).forEach(([key, value]) => {
        globalMap.removeControl(value)
    });

    // lineHeat.forEach((value) => {
    //     console.log(value)
    //     globalMap.removeLayer(value)
    // });
    if (tempHeatmap) {
        globalMap.removeLayer(tempHeatmap);
    }
})

document.getElementById("acts-animation-reset").addEventListener('click', () => {
    $(".subOption").prop('checked', false)
    for (const [agent, marker] of agent_markers) {
        marker._icon.style.display = '';
    }

    $(".desire-line-route").prop('checked', false)
    $("#cbk-heatmap").prop('checked', false)

    Object.entries(lineRoutes).forEach(([key, value]) => {
        globalMap.removeControl(value)
    });
    
    if (tempHeatmap) {
        globalMap.removeLayer(tempHeatmap);
    }
    tempHeatmap = ''
})
