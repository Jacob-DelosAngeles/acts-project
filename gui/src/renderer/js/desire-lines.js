let lineRoutes = {};
let lineHeat = {};
localStorage.setItem('run', false)
localStorage.removeItem('od-data')
localStorage.removeItem('input-file')
let odURL = localStorage.getItem(ACTS.store.OD_FILE_KEY);
if (odURL !== null) {
    // desire_lines.remove()
    getData(odURL)
}

function getData(file) {
    // const od_data = [];
    $("#desire_lines").html('')
    lineRoutes = {}
    Papa.parse(file, {
        header: true,
        download: true,
        complete: function (od_table) {
            for (let ctr = 0; ctr < od_table.data.length; ctr++) {
                // od_data.push(od_table.data[ctr]);

                if (od_table.data[ctr].ORIGX === undefined ||
                    od_table.data[ctr].ORIGY === undefined ||
                    od_table.data[ctr].DSTNX === undefined ||
                    od_table.data[ctr].DSTNY === undefined
                ) {
                    console.log(od_table.data[ctr].NAME_O, od_table.data[ctr].NAME_D)
                } else {
                    let lbl = `  ${od_table.data[ctr].NAME_O} -  ${od_table.data[ctr].NAME_D}`

                    let list_route = `<label><input
                    data-ORIGX-DSTNX="${od_table.data[ctr].ORIGX}, ${od_table.data[ctr].ORIGY}"
                    data-ORIGY-DSTNY="${od_table.data[ctr].DSTNX}, ${od_table.data[ctr].DSTNY}"
                    data-NAME-O="${od_table.data[ctr].NAME_O}"
                    data-NAME-D="${od_table.data[ctr].NAME_D}"
                    type="checkbox" class="desire-line-route" name="route" value=${ctr} id="LineID${ctr}" />${lbl}</label>`

                    $("#desire_lines").append(`<li>${list_route}</li>`);

                    heatmaps.push([od_table.data[ctr].ORIGX, od_table.data[ctr].ORIGY, 0.2])
                    heatmaps.push([od_table.data[ctr].DSTNX, od_table.data[ctr].DSTNY, 0.2])

                }


                // const route_ = createRoute(
                //     L.latLng([od_table.data[ctr].ORIGX, od_table.data[ctr].ORIGY]),
                //     L.latLng([od_table.data[ctr].DSTNX, od_table.data[ctr].DSTNY]),
                //     od_table.data[ctr].NAME_O, od_table.data[ctr].NAME_D
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
        }


    })

    // return od_data
}

function createRoute(origin, destination, name_o, name_d) {
    if (localStorage.getItem('run') === 'true') {
        fit = true
    } else {
        fit = false
    }
    var randomColor = Math.floor(Math.random() * 16777215).toString(16);
    let ctrl = L.Routing.control({
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: fit,
        createMarker: function (Index, waypoint, numberOfWaypoints) {
            let markerRoute
            if (Index === 0) {
                markerRoute = L.marker(waypoint.latLng)
                    .bindPopup(name_o);
            } else {
                markerRoute = L.marker(waypoint.latLng)
                    .bindPopup(name_d);
            }
            return markerRoute
        },
        waypoints: [origin, destination],
        lineOptions: {
            styles: [{color: '#' + randomColor, opacity: 1, weight: 5}]
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
    //                     currentOffsetHeat = L.heatLayer([[frames[currentOffset].lat, frames[currentOffset].lng, 0.2]], {radius: 25})
    //                     currentOffsetHeat.addTo(globalMap)
    //                     lineHeat.push(currentOffset)
    //                     currentOffset.opacity(0)
    //
    //                 }, stepTime)
    //             }, waitTime)
    //
    //         })
    //     })

    return ctrl
}

$(document).ready(function () {
    $(document).on("click", ".desire-line-route", function () {
        const x = $(this).attr("data-ORIGX-DSTNX").split(',')
        const y = $(this).attr("data-ORIGY-DSTNY").split(',')
        const o = $(this).attr("data-NAME-O")
        const d = $(this).attr("data-NAME-D")
        const route = createRoute(
            L.latLng(x[0], x[1]),
            L.latLng(y[0], y[1]),
            o, d
        );
        if ($(this).prop("checked") == true) {
            if (localStorage.getItem('run') === 'true') {
                route.addTo(globalMap)
            }
            lineRoutes[this.id] = route
            lineHeat[this.id] = route
            // console.log(route)
        } else {
            if (localStorage.getItem('run') === 'true') {
                globalMap.removeControl(lineRoutes[this.id])
            }
            delete lineRoutes[this.id]
        }
    })
});

function populateLineRun(map_) {
    if (lineRoutes) {
        Object.entries(lineRoutes).forEach(([key, value]) => {
            value.addTo(map_)
        });
    }
}