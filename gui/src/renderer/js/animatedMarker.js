L.AnimatedMarker = L.Marker.extend({
  options: {
    // meters
    distance: 500,
    // ms
    interval: 1000,
    // animate on add?
    autoStart: true,
    // callback onend
    onEnd: function() {},
    clickable: false,
  },

  initialize: function(latlngs, options) {
    this.setLine(latlngs);
    L.Marker.prototype.initialize.call(this, latlngs[0], options);
  },

  // Breaks the line up into tiny chunks (see options) ONLY if CSS3 animations
  // are not supported.
  _chunk: function(latlngs) {
    let i;
    const len = latlngs.length;
    const chunkedLatLngs = [];

    for (i=1; i<len; i++) {
      let cur = latlngs[i-1];
      const next = latlngs[i];
      let dist = cur.distanceTo(next);
      const factor = this.options.distance / dist;
      const dLat = factor * (next.lat - cur.lat);
      const dLng = factor * (next.lng - cur.lng);

      if (dist > this.options.distance) {
        while (dist > this.options.distance) {
          cur = new L.LatLng(cur.lat + dLat, cur.lng + dLng);
          dist = cur.distanceTo(next);
          chunkedLatLngs.push(cur);
        }
      } else {
        chunkedLatLngs.push(cur);
      }
    }
    chunkedLatLngs.push(latlngs[len-1]);

    return chunkedLatLngs;
  },

  onAdd: function(map) {
    L.Marker.prototype.onAdd.call(this, map);

    // Start animating when added to the map
    if (this.options.autoStart) {
      this.start();
    }
  },

  animate: function() {
    const self = this;
    const len = this._latlngs.length;
    let speed = this.options.interval;

    // Normalize the transition speed from vertex to vertex
    if (this._i < len && this.i > 0) {
      speed = this._latlngs[this._i-1].distanceTo(this._latlngs[this._i]) /
          this.options.distance * this.options.interval;
    }

    // Only if CSS3 transitions are supported
    if (L.DomUtil.TRANSITION) {
      if (this._icon) {
        this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms linear');
      }
      if (this._shadow) {
        this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms linear';
      }
    }

    // Move to the next vertex
    this.setLatLng(this._latlngs[this._i]);
    this._i++;

    // Queue up the animation to the next next vertex
    this._tid = setTimeout(function(...args) {
      if (self._i === len) {
        self.options.onEnd.apply(self, args);
      } else {
        self.animate();
      }
    }, speed);
  },

  // Start the animation
  start: function() {
    this.animate();
  },

  // Stop the animation in place
  stop: function() {
    if (this._tid) {
      clearTimeout(this._tid);
    }
  },

  setLine: function(latlngs) {
    if (L.DomUtil.TRANSITION) {
      // No need to to check up the line if we can animate using CSS3
      this._latlngs = latlngs;
    } else {
      // Chunk up the lines into options.distance bits
      this._latlngs = this._chunk(latlngs);
      this.options.distance = 10;
      this.options.interval = 30;
    }
    this._i = 0;
  },

});

L.animatedMarker = function(latlngs, options) {
  return new L.AnimatedMarker(latlngs, options);
};
