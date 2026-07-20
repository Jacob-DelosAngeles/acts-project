/* ! map.js | Project ACTS | github.com/project-acts */

'use strict';
let globalMap;
const coorLength = [];

/**
 * @param {number} min - Inclusive lower bound.
 * @param {number} max - Inclusive upper bound.
 * @return {number} A random integer between min and max, inclusive.
 */
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // max and min both inclusive
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// setup icons
const travellerIcon = L.icon({
  iconUrl: 'img/marker.png',
  iconSize: [32, 48],
  iconAnchor: [16, 43],
  shadowUrl: null,
});

// var agentMarkers = {};
const agentMarkers = new Map();
let agents = [];
let controls = [];
// One routing failure per run is enough to tell the user; every agent routes
// separately, so an outage would otherwise raise hundreds of identical alerts.
let routingErrorReported = false;

/** ACTS' own Map class. */
ACTS.Map = class Map {
  /**
     * @param {number} latitude - Latitude in degrees of the map's center.
     * @param {number} longitude - Longitude in degrees of the map's center.
     * @param {string} cssSelector - CSS Selector for the map container.
     * @param {number=} zoom - Initial map zoom level.
     * */
  constructor(latitude, longitude, cssSelector = 'acts-map', zoom = 14) {
    // Map constants
    this.MIN_ZOOM = 5;
    this.MAX_ZOOM = 16;

    // Validate if all parameters are numbers
    if (isNaN(latitude)) {
      throw new Error('Latitude is not a number');
    }
    if (isNaN(longitude)) {
      throw new Error('Longitude is not a number');
    }
    if (isNaN(zoom)) {
      throw new Error('Initial zoom value is not a number');
    }

    // Initial zoom level should be between Map.MIN_ZOOM and Map.MAX_ZOOM
    if (zoom < Map.MIN_ZOOM || zoom > Map.MAX_ZOOM) {
      throw new Error(
          `Initial zoom value should be from ${Map.MIN_ZOOM} to ` +
                `${Map.MAX_ZOOM}`,
      );
    }

    this.cssSelector = String(cssSelector);
    this.latitude = latitude;
    this.longitude = longitude;
    this.zoom = zoom;

    // Instantiate Leaflet map container
    this.container = new Leaflet.Map(
        this.cssSelector,
        {
          // Container-specific Configurations
          center: [this.latitude, this.longitude],
          crs: Leaflet.CRS.EPSG3857,
          zoom: this.zoom,
          zoomControl: false,
          preferCanvas: false,
        },
    );

    globalMap = this.container;

    // Add and load map background tiles
    this.background = new Leaflet.TileLayer(
        GMapTile.getURL(
            [
              {
                elementType: 'labels',
                stylers: [{visibility: 'off'}],
              },
              {
                featureType: 'road.highway',
                elementType: 'geometry.fill',
                stylers: [{color: '#f0f0f0'}],
              },
              {
                featureType: 'road.highway',
                elementType: 'geometry.stroke',
                stylers: [{color: '#6f444444'}],
              },
            ],
        ),
        {
          // Tile-related Configurations
          attribution: '',
          maxNativeZoom: this.MAX_ZOOM,
          maxZoom: this.MAX_ZOOM,
          minZoom: this.MIN_ZOOM,
          name: 'background',
          keepBuffer: 32,
          edgeBufferTiles: 1,
        },
    ).addTo(this.container);

    // Add and load map labels
    // use same configuration from map background
    this.labels = new Leaflet.TileLayer(
        GMapTile.getURL(
            [
              {
                elementType: 'geometry',
                stylers: [{visibility: 'off'}],
              },
              {
                featureType: 'administrative.neighborhood',
                elementType: 'labels',
                stylers: [{visibility: 'off'}],
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{visibility: 'off'}],
              },
            ],
        ),
        {
          // Tile-related Configurations
          attribution: '',
          maxNativeZoom: this.MAX_ZOOM,
          maxZoom: this.MAX_ZOOM,
          minZoom: this.MIN_ZOOM,
          name: 'label',
          keepBuffer: 32,
          edgeBufferTiles: 1,
        },
    ).addTo(this.container);

    // Add zoom in/out control
    this.zoom = new L.Control.Zoom({
      position: 'bottomright',
      name: 'control',
    }).addTo(this.container);
  }

  /** Legacy animation path: loads survey/OD data from S3, animates agents. */
  animate() {
    const map_ = this.container;

    // Complete the API URL given the current users ID
    const filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
    const fileURL = ACTS.apis.PUBLIC_S3_URL + encodeURIComponent(
        ACTS.user + '/' + filename,
    );

    Papa.parse(fileURL, {
      header: true,
      download: true,
      complete: function(results) {
        const odURL = localStorage.getItem(ACTS.store.OD_FILE_KEY);

        if (odURL === null) {
          document.getElementById('acts-animation-stop').click();
          ACTS.ui.statusSnackbar.labelText =
              `Please upload Origin and Destination data!`;
          ACTS.ui.statusSnackbar.open();
          return;
        }
        // getData(odURL)

        Papa.parse(odURL, {
          header: true,
          download: true,
          complete: function(odTable) {
            // let temp = 20;

            // ensure survey input file and od table data have same length
            if (odTable.data.length == results.data.length) {
              for (let ctr = 0; ctr < odTable.data.length-1; ctr++) {
                // for(let ctr=0; ctr<temp; ctr++){
                const resultData = results.data[ctr];
                const odData = odTable.data[ctr];

                const agent = new Agent(resultData, odData);
                agents.push(agent);
                generateRouting(agent, map_);
              }
              populateLineRun(map_);
              // controls[0].on('routesfound', function (e) {
              //     const coordinates = e.routes
              //     coordinates.forEach(async (c) => {
              //         const routes = c.coordinates
              //         routes.forEach(async (r) => {
              //             const heat = L.heatLayer(
              //                 [[r.lat, r.lng, 0.2]], { radius: 25 });
              //             heat.addTo(map_)
              //             setTimeout(async () => {
              //                 // await map_.removeLayer(heat);
              //             }, 1000)
              //         })

              //     })
              // })
            } else {
              document.getElementById('acts-animation-stop').click();
              ACTS.ui.statusSnackbar.labelText = `Invalid uploaded data!`;
              ACTS.ui.statusSnackbar.open();
              return;
            }
          },
        });
      },
    });

    if (tempHeatmap) {
      tempHeatmap.addTo(globalMap);
    }

    populateLineRun(globalMap, coorLength);
  }

  /** Loads survey/OD data from local blob URLs (or S3), animates agents. */
  animate_2() {
    const map_ = this.container;

    // --- Get SURVEY file URL (prefer local blob URL, fallback to S3) ---
    let fileURL = localStorage.getItem('SURVEY_FILE_URL');

    if (!fileURL) {
      // Fallback to legacy behavior using S3/public URL
      const filename = localStorage.getItem(ACTS.store.INPUT_FILE_KEY);
      if (!filename) {
        document.getElementById('acts-animation-stop').click();
        ACTS.ui.statusSnackbar.labelText = `Please upload Survey Input data!`;
        ACTS.ui.statusSnackbar.open();
        return;
      }

      fileURL = ACTS.apis.PUBLIC_S3_URL + encodeURIComponent(
          ACTS.user + '/' + filename,
      );
    }

    Papa.parse(fileURL, {
      header: true,
      download: true,
      complete: function(results) {
        // --- Get OD file URL (prefer local blob URL, fallback to old key) ---
        const odURL = localStorage.getItem('OD_FILE_URL') ||
            localStorage.getItem(ACTS.store.OD_FILE_KEY);

        if (!odURL) {
          document.getElementById('acts-animation-stop').click();
          ACTS.ui.statusSnackbar.labelText =
              `Please upload Origin and Destination data!`;
          ACTS.ui.statusSnackbar.open();
          return;
        }

        Papa.parse(odURL, {
          header: true,
          download: true,
          complete: function(odTable) {
            // ensure survey input file and od table data have same length
            if (odTable.data.length == results.data.length) {
              // (optional) clear previous animation state before new agents
              agents = [];
              agentMarkers.clear();
              controls = [];
              routingErrorReported = false;

              for (let ctr = 0; ctr < odTable.data.length - 1; ctr++) {
                const resultData = results.data[ctr];
                const odData = odTable.data[ctr];

                const agent = new Agent(resultData, odData);
                agents.push(agent);
                generateRouting(agent, map_);
              }

              // desire lines / line routes
              populateLineRun(map_);
            } else {
              document.getElementById('acts-animation-stop').click();
              ACTS.ui.statusSnackbar.labelText = `Invalid uploaded data!`;
              ACTS.ui.statusSnackbar.open();
              return;
            }
          },
        });
      },
    });

    // Heatmap handling
    if (tempHeatmap) {
      tempHeatmap.addTo(globalMap);
    }

    // Keep existing call if you rely on this elsewhere
    populateLineRun(globalMap, coorLength);
  }
};

/**
 * Reports a routing failure once per animation run. Agents are only created
 * inside the 'routesfound' handler, so without this a failing routing
 * service leaves the map silently empty with no indication why.
 * @param {Object} e - The leaflet-routing-machine error event.
 */
function reportRoutingError(e) {
  console.error('Routing failed:', (e && e.error) || e);
  if (routingErrorReported) {
    return;
  }
  routingErrorReported = true;

  ACTS.ui.statusSnackbar.labelText = 'Could not fetch routes for the ' +
      'agents, so none can be animated. Check your internet connection, ' +
      'or set a Mapbox token for higher rate limits.';
  ACTS.ui.statusSnackbar.open();
}

/**
 * Draws the route between an agent's origin and destination.
 * @param {Agent} agent - The agent to route.
 * @param {L.Map} map_ - The map to add the route to.
 */
function generateRouting(agent, map_) {
  const origin = new L.LatLng(
      agent.od_data['ORIGX'], agent.od_data['ORIGY']);
  const destination = new L.LatLng(
      agent.od_data['DSTNX'], agent.od_data['DSTNY']);

  // create routing control
  const ctrl = L.Routing.control({
    show: false,
    waypointMode: 'snap',
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: false,
    showAlternatives: false,
    waypoints: [
      L.latLng(origin),
      L.latLng(destination),
    ],
    lineOptions: {
      styles: [{color: 'red', opacity: 0.5, weight: 0.3}],
    },
    createMarker: function() {
      return null;
    },
    // Mapbox needs an access token, which an open-source app can't ship (the
    // old hard-coded one leaked and had to be revoked). Default to the public
    // OSRM service so routing works with no credentials; set
    // ACTS.apis.MAPBOX_TOKEN locally for higher, more reliable rate limits.
    router: ACTS.apis.MAPBOX_TOKEN ?
        L.Routing.mapbox(ACTS.apis.MAPBOX_TOKEN) :
        L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
        }),
  })
      .on('routingerror', reportRoutingError)
      .on('routesfound', function(e) {
        const coords = e.routes[0].coordinates;
        const points = [];

        coords.forEach((element) => {
          const latLng = [];
          latLng.push(element['lat']);
          latLng.push(element['lng']);
          points.push(latLng);
        });
        // create animated marker per route
        // generateAnimatedMarkers(_map, vehicles, weights, types, points);
        generateMarker(map_, points, agent);
      });

  ctrl.addTo(map_);
  controls.push(ctrl);
  // ctrl.on('routeselected', function (e) {
  //     var route = e.route;
  //     coorLength.push(route.coordinates.length)
  //     coor.push(route.coordinates)
  // })
}

/**
 * Creates and starts an animated marker for an agent along its route.
 * @param {L.Map} map_ - The map to add the marker to.
 * @param {L.LatLng[]} points - The route's coordinates.
 * @param {Agent} agent - The agent the marker represents.
 */
function generateMarker(map_, points, agent) {
  const line = L.polyline(points);
  const animatedMarker = L.animatedMarker(line.getLatLngs(), {
    icon: travellerIcon,
    interval: getRandomIntInclusive(200, 1000),
    onEnd: function() {
      map_.removeLayer(this);
      agentMarkers.delete(agent);
    },
  });
  let agentDetails = 'AGENT DETAILS' + '<hr>';
  for (const key in agent.data) {
    if (Object.prototype.hasOwnProperty.call(agent.data, key)) {
      agentDetails = agentDetails + key + ': ' + agent.data[key] + '<br>';
    }
  }
  // console.log(agent.data);
  animatedMarker.bindPopup(agentDetails).openPopup();

  agentMarkers.set(agent, animatedMarker);
  // agentMarkers[agent] = animatedMarker;
  map_.addLayer(animatedMarker);
}
