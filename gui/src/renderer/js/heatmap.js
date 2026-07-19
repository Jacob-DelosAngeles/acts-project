let tempHeatmap;
const heatmaps = [];
$('#cbk-heatmap').on('click', function() {
  if ($(this).prop('checked') == true) {
    tempHeatmap = L.heatLayer(heatmaps, {radius: 25});
    if (localStorage.getItem('run') === 'true') {
      tempHeatmap.addTo(globalMap);
    }
  } else {
    globalMap.removeLayer(tempHeatmap);
    tempHeatmap = '';
  }
});
