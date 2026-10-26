/* Theme mouse cursors: SVG art rasterised to crisp 1x/2x/3x PNGs at startup, swapped instantly
   per theme via CSS variables. Fine pointers only; touch and the controller cursor are untouched. */
(function (root) {
  'use strict';
  var ARROW = 'M3 2 L3 25 L9 19.5 L13.2 29 L17.4 27.2 L13.3 18 L21 18 Z';
  var T = {
    casino: { fill: '#f3d27a', fill2: '#b8862b', line: '#2a1a05', emb: '<path d="M22 22c-2 2.4-4.6 3.8-4.6 6 0 1.4 1.1 2.3 2.3 2.3.8 0 1.5-.4 1.9-1l-.6 1.9h2l-.6-1.9c.4.6 1.1 1 1.9 1 1.2 0 2.3-.9 2.3-2.3 0-2.2-2.6-3.6-4.6-6z" fill="#1b1b1b" stroke="#f3d27a" stroke-width=".8"/>' },
    walnut: { fill: '#ffd28a', fill2: '#a86a22', line: '#2b1406', emb: '<circle cx="23" cy="26" r="3.4" fill="#ff9a3c" stroke="#2b1406" stroke-width="1"/><circle cx="23" cy="26" r="1.4" fill="#fff2c4"/>' },
    neon: { fill: '#0b0820', fill2: '#0b0820', line: '#38e6ff', glow: '#38e6ff', lw: 1.8, emb: '<path d="M20 24h7M23.5 20.5v7" stroke="#ff4fb0" stroke-width="2" stroke-linecap="round"/>' },
    forest: { shape: 'M3 3 C14 2 26 8 27 20 C27 27 20 30 14 28 C7 26 3 18 3 3 Z', vein: '<path d="M3.5 3.5 L20 22 M10 11 L16 10 M13 15 L9 19 M16 18 L22 16" stroke="#2f4f1a" stroke-width="1.2" fill="none" stroke-linecap="round"/>', fill: '#8bc34a', fill2: '#4e7d22', line: '#1f3410' },
    nebula: { fill: '#d9ccff', fill2: '#6a4cff', line: '#170a3a', emb: '<path d="M23 20l1.3 3.7 3.7 1.3-3.7 1.3L23 30l-1.3-3.7L18 25l3.7-1.3z" fill="#fff" stroke="#6a4cff" stroke-width=".8"/>' },
    zen: { fill: '#f4efe4', fill2: '#c9bfae', line: '#3a332a', emb: '<circle cx="23" cy="25" r="3.6" fill="none" stroke="#b53a3a" stroke-width="1.6" stroke-dasharray="19 4"/>' },
    reef: { fill: '#7ff0e6', fill2: '#ff8a6b', line: '#083a44', emb: '<circle cx="24" cy="24" r="3" fill="none" stroke="#e8ffff" stroke-width="1.3"/><circle cx="20" cy="28.5" r="1.7" fill="none" stroke="#e8ffff" stroke-width="1"/>' },
    classic: { pixel: true }
  };
  function arrowSVG(t) {
    if (t.pixel) { // chunky Win95-style arrow on a 1px grid
      var rows = ['X', 'XX', 'X.X', 'X..X', 'X...X', 'X....X', 'X.....X', 'X......X', 'X.......X', 'X........X', 'X.....XXXXX', 'X..X..X', 'X.X X..X', 'XX  X..X', 'X    X..X', '     X..X', '      XX'], r = '';
      rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) { var ch = row[x]; if (ch === 'X') r += '<rect x="' + (x * 1.75 + 2) + '" y="' + (y * 1.75 + 1) + '" width="1.8" height="1.8" fill="#000"/>'; else if (ch === '.') r += '<rect x="' + (x * 1.75 + 2) + '" y="' + (y * 1.75 + 1) + '" width="1.8" height="1.8" fill="#fff"/>'; } });
      return r;
    }
    var d = t.shape || ARROW, g = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + t.fill + '"/><stop offset="1" stop-color="' + t.fill2 + '"/></linearGradient>' +
      (t.glow ? '<filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter>' : '') + '</defs>';
    return g + '<path d="' + d + '" fill="rgba(0,0,0,.35)" transform="translate(1.2 1.6)"/>' + (t.glow ? '<path d="' + d + '" fill="none" stroke="' + t.glow + '" stroke-width="3" filter="url(#f)"/>' : '') +
      '<path d="' + d + '" fill="url(#g)" stroke="' + t.line + '" stroke-width="' + (t.lw || 1.4) + '" stroke-linejoin="round"/>' + (t.vein || '') + (t.emb || '');
  }
  function handSVG(t, closed) { // open ring = grab, tight filled ring with card = grabbing; hotspot centre
    var c = t.pixel ? '#fff' : (t.glow || t.fill), l = t.pixel ? '#000' : t.line;
    if (closed) return '<circle cx="16" cy="16" r="9.5" fill="' + c + '" fill-opacity=".35" stroke="' + l + '" stroke-width="3.2"/><circle cx="16" cy="16" r="9.5" fill="none" stroke="' + c + '" stroke-width="1.6"/>' +
      '<rect x="12" y="10.5" width="8" height="11" rx="1.6" fill="#fff" stroke="' + l + '" stroke-width="1.2"/><circle cx="16" cy="16" r="1.6" fill="' + l + '"/>';
    var s = ''; for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4, x = 16 + Math.cos(a) * 11, y = 16 + Math.sin(a) * 11;
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6" fill="' + c + '" stroke="' + l + '" stroke-width="1.3"/>'; }
    return '<circle cx="16" cy="16" r="6.5" fill="none" stroke="' + l + '" stroke-width="3.4"/><circle cx="16" cy="16" r="6.5" fill="none" stroke="' + c + '" stroke-width="1.8"/>' + s;
  }
  function wrap(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"' + '>' + inner + '</svg>'; }
  function svgURI(s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }
  var cache = {}, fine = false, cur = 'casino';
  try { fine = matchMedia('(pointer:fine)').matches || matchMedia('(any-pointer:fine)').matches; } catch (e) { }
  function raster(svg, done) {
    var img = new Image(); img.onload = function () {
      var out = {}; [1, 2, 3].forEach(function (k) { var c = document.createElement('canvas'); c.width = c.height = 32 * k; var x = c.getContext('2d'); x.drawImage(img, 0, 0, 32 * k, 32 * k); out[k] = c.toDataURL('image/png'); });
      done(out);
    }; img.src = svgURI(svg);
  }
  function css(set, hx, hy, fb) {
    if (!set) return fb;
    return '-webkit-image-set(url("' + set[1] + '") 1x, url("' + set[2] + '") 2x, url("' + set[3] + '") 3x) ' + hx + ' ' + hy + ', url("' + set[1] + '") ' + hx + ' ' + hy + ', ' + fb;
  }
  function apply(id) {
    cur = T[id] ? id : 'casino'; var c = cache[cur], r = document.documentElement.style; if (!c) return;
    r.setProperty('--cur', css(c.arrow, 3, 2, 'default')); r.setProperty('--cur-grab', css(c.grab, 16, 16, 'grab')); r.setProperty('--cur-grabbing', css(c.grabbing, 16, 16, 'grabbing'));
  }
  function build() {
    Object.keys(T).forEach(function (id) {
      var t = T[id], c = cache[id] = {}, left = 3;
      [['arrow', arrowSVG(t)], ['grab', handSVG(t, false)], ['grabbing', handSVG(t, true)]].forEach(function (p) {
        raster(wrap(p[1]), function (set) { c[p[0]] = set; if (!--left && id === cur) apply(cur); });
      });
    });
  }
  if (fine) { document.documentElement.classList.add('tcur'); build(); }
  root.ThemeCursor = { set: apply, svg: function (id, kind) { var t = T[id]; return wrap(kind === 'arrow' ? arrowSVG(t) : handSVG(t, kind === 'grabbing')); }, ready: function (id) { var c = cache[id || cur]; return !!(c && c.arrow && c.grab && c.grabbing); } };
})(this);
