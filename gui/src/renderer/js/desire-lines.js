let lineRoutes = {};
const lineHeat = {};
localStorage.setItem('run', false);
localStorage.removeItem('od-data');
localStorage.removeItem('input-file');
const odURL = localStorage.getItem(ACTS.store.OD_FILE_KEY);
if (odURL !== null) {
  // desire_lines.remove()
  getData(odURL);
}

/**
 * Loads the OD (origin-destination) CSV and renders the desire-line list.
 * @param {string} file - URL or path to the OD CSV file.
 */
function getData(file) {
  // const od_data = [];
  $('#desire_lines').html('');
  lineRoutes = {};
  Papa.parse(file, {
    header: true,
    download: true,
    complete: function(odTable) {
      for (let ctr = 0; ctr < odTable.data.length; ctr++) {
        // od_data.push(odTable.data[ctr]);

        const row = odTable.data[ctr];
        if (row.ORIGX === undefined ||
                    row.ORIGY === undefined ||
                    row.DSTNX === undefined ||
                    row.DSTNY === undefined
        ) {
          console.log(row.NAME_O, row.NAME_D);
        } else {
          const lbl = `  ${row.NAME_O} -  ${row.NAME_D}`;

          const listRoute = `<label><input
                    data-ORIGX-DSTNX="${row.ORIGX}, ${row.ORIGY}"
                    data-ORIGY-DSTNY="${row.DSTNX}, ${row.DSTNY}"
                    data-NAME-O="${row.NAME_O}"
                    data-NAME-D="${row.NAME_D}"
                    type="checkbox" class="desire-line-route" name="route"
                    value=${ctr} id="LineID${ctr}" />${lbl}</label>`;

          $('#desire_lines').append(`<li>${listRoute}</li>`);

          heatmaps.push([row.ORIGX, row.ORIGY, 0.2]);
          heatmaps.push([row.DSTNX, row.DSTNY, 0.2]);
        }


        // const route_ = createRoute(
        //     L.latLng([odTable.data[ctr].ORIGX, odTable.data[ctr].ORIGY]),
        //     L.latLng([odTable.data[ctr].DSTNX, odTable.data[ctr].DSTNY]),
        //     odTable.data[ctr].NAME_O, odTable.data[ctr].NAME_D
        // );

        // console.log(route_)
        // console.log('---------------------')
        // route_.on('routesFound', function (e) {
        //     var routes = e.route;
        //     console.log('testse')
        //     // coor_length.push(routes.coordinates.length)
        //     // coor.push(routes.coordinates)
        //     // console.log(coor)
        // })
      }
    },


  });

  // return od_data
}

/**
 * @param {L.LatLng} origin - Route start point.
 * @param {L.LatLng} destination - Route end point.
 * @param {string} nameO - Label for the origin marker's popup.
 * @param {string} nameD - Label for the destination marker's popup.
 * @return {L.Routing.Control} The Leaflet Routing Machine control.
 */
function createRoute(origin, destination, nameO, nameD) {
  if (localStorage.getItem('run') === 'true') {
    fit = true;
  } else {
    fit = false;
  }
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  const ctrl = L.Routing.control({
    show: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: fit,
    createMarker: function(Index, waypoint, numberOfWaypoints) {
      let markerRoute;
      if (Index === 0) {
        markerRoute = L.marker(waypoint.latLng)
            .bindPopup(nameO);
      } else {
        markerRoute = L.marker(waypoint.latLng)
            .bindPopup(nameD);
      }
      return markerRoute;
    },
    waypoints: [origin, destination],
    lineOptions: {
      styles: [{color: '#' + randomColor, opacity: 1, weight: 5}],
    },
  });
    // ctrl.on('routesfound', function (e) {
    //         e.routes.forEach(async (c) => {
    //             const routes = c.coordinates
    //             const frames = []
    //             for (let i = 0; i < routes.length; i += 1) {
    //                 frames.push(routes[i])
    //             }
    //
    //             const waitTime = 8000;
    //             const stepTime = 2000;
    //
    //             let currentOffset = 0;
    //             let previousOffset = currentOffset;
    //             let currentOffsetHeat
    //             setTimeout(() => {
    //                 setInterval(() => {
    //                     previousOffset = currentOffset;
    //                     currentOffset += 1;
    //                     if (currentOffset === frames.length - 1) {
    //                         currentOffset = 0;
    //                     }
    //                     if (currentOffsetHeat) {
    //                         globalMap.removeLayer(currentOffsetHeat)
    //                     }
    //
    //                     currentOffsetHeat = L.heatLayer(
    //                         [[frames[currentOffset].lat,
    //                           frames[currentOffset].lng, 0.2]], {radius: 25})
    //                     currentOffsetHeat.addTo(globalMap)
    //                     lineHeat.push(currentOffset)
    //                     currentOffset.opacity(0)
    //
    //                 }, stepTime)
    //             }, waitTime)
    //
    //         })
    //     })

  return ctrl;
}

$(document).ready(function() {
  $(document).on('click', '.desire-line-route', function() {
    const x = $(this).attr('data-ORIGX-DSTNX').split(',');
    const y = $(this).attr('data-ORIGY-DSTNY').split(',');
    const o = $(this).attr('data-NAME-O');
    const d = $(this).attr('data-NAME-D');
    const route = createRoute(
        L.latLng(x[0], x[1]),
        L.latLng(y[0], y[1]),
        o, d,
    );
    if ($(this).prop('checked') == true) {
      if (localStorage.getItem('run') === 'true') {
        route.addTo(globalMap);
      }
      lineRoutes[this.id] = route;
      lineHeat[this.id] = route;
      // console.log(route)
    } else {
      if (localStorage.getItem('run') === 'true') {
        globalMap.removeControl(lineRoutes[this.id]);
      }
      delete lineRoutes[this.id];
    }
  });
});

// Called from map.js; ESLint's single-file analysis can't see that
// cross-file usage in this non-module codebase.
/**
 * Adds all current desire-line routes to the given map.
 * @param {L.Map} map_ - The map to add routes to.
 */
function populateLineRun(map_) { // eslint-disable-line no-unused-vars
  if (lineRoutes) {
    Object.entries(lineRoutes).forEach(([key, value]) => {
      value.addTo(map_);
    });
  }
}
