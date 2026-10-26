/* Themed card faces: every theme gets its own card stock, frame, suit pips, rank lettering, aces and
   court figures. Pure vector SVG (sharp at any DPI), generated lazily per theme and cached, so only the
   active theme's art is ever built. Classic heart/diamond/club/spade silhouettes stay intact, and every
   theme keeps a strongly contrasting red vs dark (or light-on-dark) pair. */
(function (root) {
  'use strict';
  var Art = root.CardArt, FONTS = root.CARD_FONTS || {};
  var BASE = [
    'M50 2C60 22 98 40 98 63C98 78 87 87 74 87C65 87 58 82 54 75C55 86 59 93 67 99H33C41 93 45 86 46 75C42 82 35 87 26 87C13 87 2 78 2 63C2 40 40 22 50 2Z',
    'M50 94C22 70 2 52 2 29C2 13 14 3 27 3C38 3 46 10 50 20C54 10 62 3 73 3C86 3 98 13 98 29C98 52 78 70 50 94Z',
    'M50 1L88 50L50 99L12 50Z',
    'M50 4A23 23 0 0 1 69.5 39.8A23 23 0 1 1 58 75C59 86 62 93 69 99H31C38 93 41 86 42 75A23 23 0 1 1 30.5 39.8A23 23 0 0 1 50 4Z'
  ];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var LAY = {
    2: [[1, 0], [1, 1]], 3: [[1, 0], [1, .5], [1, 1]], 4: [[0, 0], [2, 0], [0, 1], [2, 1]],
    5: [[0, 0], [2, 0], [1, .5], [0, 1], [2, 1]], 6: [[0, 0], [2, 0], [0, .5], [2, .5], [0, 1], [2, 1]],
    7: [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [0, 1], [2, 1]], 8: [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [1, .75], [0, 1], [2, 1]],
    9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, .5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]],
    10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]]
  };
  function P(d, a) { return '<path d="' + d + '" ' + (a || '') + '/>'; }
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
  // ---------- per-theme suit icons (drawn in a 100x100 box, colour c) ----------
  var PIX = [ // Classic 95 pixel suits, 7 wide x 8 tall
    ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
    ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '.......'],
    ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '.......'],
    ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..', '.......']
  ];
  var FOREST_VEIN = ['M50 72V16M50 60L30 48M50 60L70 48M50 42L36 32M50 42L64 32', 'M50 86V24M50 68L28 50M50 68L72 50M50 48L26 30M50 48L74 30', '', 'M50 42V10M42 62H12M58 62H88'];
  var REEF_RIB = [[50, 82, [[22, 52], [34, 30], [50, 8], [66, 30], [78, 52]]], [50, 92, [[14, 24], [30, 8], [50, 24], [70, 8], [86, 24]]], [50, 97, [[28, 40], [50, 4], [72, 40]]], [50, 76, [[30, 22], [50, 6], [70, 22], [12, 56], [88, 56]]]];
  var STARS = [[[50, 14], [70, 50], [62, 76], [38, 76], [30, 50], [50, 14]], [[27, 18], [50, 30], [73, 18], [74, 46], [50, 78], [26, 46], [27, 18]], [[50, 10], [76, 50], [50, 90], [24, 50], [50, 10]], [[50, 18], [50, 42], [25, 58], [75, 58], [50, 42], [50, 88]]];
  function shape(s, a) { return P(BASE[s], a); }
  var PIPS = {
    casino: function (s, c) { return shape(s, 'fill="' + c + '" stroke="url(#foil)" stroke-width="5" stroke-linejoin="round"') + '<g transform="translate(22 22) scale(.56)">' + shape(s, 'fill="none" stroke="url(#foil)" stroke-width="4.5"') + '</g>'; },
    walnut: function (s, c, k) { return shape(s, 'fill="url(#hatch' + k + ')" stroke="' + c + '" stroke-width="6" stroke-linejoin="round"') + '<g transform="translate(24 24) scale(.52)">' + shape(s, 'fill="' + c + '"') + '</g>'; },
    neon: function (s, c) { return '<g filter="url(#glow)">' + shape(s, 'fill="' + c + '" fill-opacity=".22" stroke="' + c + '" stroke-width="8" stroke-linejoin="round"') + '</g>' + shape(s, 'fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.5" stroke-linejoin="round"'); },
    nebula: function (s, c, k) { var st = STARS[s], l = st.map(function (p) { return p.join(' '); }).join(' L');
      return '<g filter="url(#glow)">' + shape(s, 'fill="url(#planet' + k + ')" stroke="' + c + '" stroke-width="3"') + '</g>' + P('M' + l, 'fill="none" stroke="#fff" stroke-width="1.6" stroke-opacity=".75"') +
        st.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#fff"/>'; }).join(''); },
    forest: function (s, c) { var o = shape(s, 'fill="' + c + '"');
      if (s === 2) o += P('M24 32H76', 'stroke="#f4e9c8" stroke-width="4"') + P('M38 18L56 32M45 9L66 28M62 18L44 32M55 9L34 28', 'stroke="#f4e9c8" stroke-width="2.2"') + P('M50 1V-8', 'stroke="' + c + '" stroke-width="5" stroke-linecap="round"');
      else o += P(FOREST_VEIN[s], 'stroke="#f4e9c8" stroke-width="3" fill="none" stroke-linecap="round"');
      if (s === 3) o += P('M60 84q16-2 14-16q-2-8-9-4', 'fill="none" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"');
      return o; },
    reef: function (s, c) { var r = REEF_RIB[s];
      return shape(s, 'fill="' + c + '"') + r[2].map(function (p) { return P('M' + r[0] + ' ' + r[1] + 'L' + p[0] + ' ' + p[1], 'stroke="#fff" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"'); }).join('') +
        (s === 3 ? '<g fill="#fff" fill-opacity=".6"><circle cx="50" cy="22" r="3.4"/><circle cx="26" cy="60" r="3.4"/><circle cx="74" cy="60" r="3.4"/></g>' : '') + '<ellipse cx="' + (s === 2 ? 40 : 32) + '" cy="' + (s === 1 ? 22 : 40) + '" rx="8" ry="5" fill="#fff" fill-opacity=".5" transform="rotate(-30 32 30)"/>'; },
    zen: function (s, c) { return '<g filter="url(#brush)">' + shape(s, 'fill="' + c + '" fill-opacity=".93"') + '</g>' + shape(s, 'fill="none" stroke="' + c + '" stroke-width="3" stroke-opacity=".5" filter="url(#brush)"'); },
    classic: function (s, c) { var g = PIX[s], o = ''; g.forEach(function (row, y) { for (var x = 0; x < 7; x++) if (row[x] === 'X') o += '<rect x="' + (6.25 + x * 12.5) + '" y="' + (y * 12.5) + '" width="12.6" height="12.6"/>'; }); return '<g fill="' + c + '" shape-rendering="crispEdges">' + o + '</g>'; }
  };
  // ---------- per-theme card stock ----------
  var STY = {
    casino: { red: '#c01d2a', black: '#16181f', font: 'Georgia,serif', fs: 44, fsC: 84, tint: ['#fbeee6', '#eef1f5'],
      defs: '<linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#d8a93b"/><stop offset=".6" stop-color="#fff4c9"/><stop offset="1" stop-color="#9b6d14"/></linearGradient><linearGradient id="pp" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f1e6cb"/></linearGradient>',
      paper: '<rect x="2.5" y="2.5" width="245" height="345" rx="16" fill="url(#pp)" stroke="url(#foil)" stroke-width="5"/><rect x="11" y="11" width="228" height="328" rx="10" fill="none" stroke="url(#foil)" stroke-width="1.6"/>' },
    walnut: { red: '#9c1a17', black: '#21170e', font: 'Georgia,serif', fs: 44, fsC: 84, tint: ['#f3e2c4', '#ede2cb'],
      defs: '<linearGradient id="pp" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fbf1da"/><stop offset="1" stop-color="#e8d5ae"/></linearGradient>',
      paper: '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#pp)" stroke="#5a3a1a" stroke-width="3"/><rect x="9" y="9" width="232" height="332" rx="9" fill="none" stroke="#5a3a1a" stroke-width="2.4"/><rect x="13" y="13" width="224" height="324" rx="7" fill="none" stroke="#5a3a1a" stroke-width=".9"/>' +
        [[13, 13, 0], [237, 13, 90], [237, 337, 180], [13, 337, 270]].map(function (p) { return '<path d="M0 0q16 2 18 18M0 0q8 4 9 9" transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')" fill="none" stroke="#5a3a1a" stroke-width="1.4"/>'; }).join('') },
    neon: { red: '#ff3d78', black: '#3df2ff', font: 'Arial,sans-serif', fs: 46, fsC: 86, dark: true, tint: ['#1a0a18', '#071a20'],
      defs: '<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b16"/><stop offset="1" stop-color="#05040a"/></linearGradient>',
      paper: '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#pp)" stroke="#2a2340" stroke-width="3"/><rect x="9" y="9" width="232" height="332" rx="11" fill="none" stroke="#b45cff" stroke-width="2" filter="url(#glow)" opacity=".8"/>' },
    nebula: { red: '#ff6b8f', black: '#9cd9ff', font: 'Verdana,sans-serif', fs: 38, fsC: 70, dark: true, tint: ['#2a1640', '#13204a'],
      defs: '<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<radialGradient id="pp" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#2d2068"/><stop offset=".6" stop-color="#170f3c"/><stop offset="1" stop-color="#0a0720"/></radialGradient><linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff6ff" stop-opacity=".22"/><stop offset=".4" stop-color="#ff8ee8" stop-opacity="0"/><stop offset=".7" stop-color="#b59cff" stop-opacity=".2"/><stop offset="1" stop-color="#7ff6ff" stop-opacity="0"/></linearGradient>' +
        '<radialGradient id="planetR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd3df"/><stop offset=".5" stop-color="#ff6b8f"/><stop offset="1" stop-color="#9e1f4a"/></radialGradient><radialGradient id="planetB" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#eef9ff"/><stop offset=".5" stop-color="#9cd9ff"/><stop offset="1" stop-color="#3466b8"/></radialGradient>',
      paper: (function () { var r = rnd(7), s = ''; for (var i = 0; i < 26; i++) s += '<circle cx="' + (12 + r() * 226).toFixed(1) + '" cy="' + (12 + r() * 326).toFixed(1) + '" r="' + (0.6 + r() * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (0.3 + r() * 0.5).toFixed(2) + '"/>';
        return '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#pp)" stroke="#6f5ad8" stroke-width="3"/>' + s + '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#holo)"/><rect x="9" y="9" width="232" height="332" rx="11" fill="none" stroke="#9cd9ff" stroke-opacity=".35" stroke-width="1.4"/>'; })() },
    forest: { red: '#b0241c', black: '#1c2a16', font: 'Georgia,serif', fs: 46, fsC: 86, tint: ['#f3e2c0', '#e4e6c6'],
      defs: '<linearGradient id="pp" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#f8eed0"/><stop offset="1" stop-color="#dcc796"/></linearGradient>',
      paper: (function () { var s = '', pts = []; for (var i = 0; i <= 20; i++) { pts.push([16 + i * 10.9, 14]); pts.push([16 + i * 10.9, 336]); } for (i = 1; i < 30; i++) { pts.push([14, 14 + i * 10.7]); pts.push([236, 14 + i * 10.7]); }
        pts.forEach(function (p, i) { if (i % 3) return; s += '<ellipse cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" rx="4.6" ry="2.2" fill="#5c8a2c" transform="rotate(' + (i * 47 % 180) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')"/>'; });
        return '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#pp)" stroke="#6b5530" stroke-width="3"/><rect x="14" y="14" width="222" height="322" rx="10" fill="none" stroke="#3f6b22" stroke-width="2" stroke-dasharray="14 3 3 3"/>' + s; })() },
    reef: { red: '#e23b33', black: '#0b2d45', font: 'Arial,sans-serif', fs: 46, fsC: 86, tint: ['#fde9e4', '#e3f3f7'],
      defs: '<linearGradient id="pp" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#f4fbfc"/><stop offset="1" stop-color="#e2f1f4"/></linearGradient><linearGradient id="iri" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1e8" stop-opacity=".35"/><stop offset=".5" stop-color="#c4f5ff" stop-opacity="0"/><stop offset="1" stop-color="#d9ccff" stop-opacity=".3"/></linearGradient>',
      paper: '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#pp)" stroke="#2aa0b4" stroke-width="3"/><rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#iri)"/><path d="M12 326q12-8 24 0t24 0t24 0t24 0t24 0t24 0t24 0t24 0t24 0" fill="none" stroke="#2aa0b4" stroke-width="1.6" opacity=".55"/><path d="M12 24q12-8 24 0t24 0t24 0t24 0t24 0t24 0t24 0t24 0t24 0" fill="none" stroke="#2aa0b4" stroke-width="1.6" opacity=".55"/>' },
    zen: { red: '#c2261c', black: '#111111', font: 'Georgia,serif', fs: 46, fsC: 86, tint: ['#f7eee6', '#f1efe8'],
      defs: '<filter id="brush" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter><filter id="fiber"><feTurbulence type="fractalNoise" baseFrequency=".04 .6" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .42  0 0 0 .18 0"/></filter>',
      paper: '<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="#f8f4ea" stroke="#8d8578" stroke-width="2.5"/><rect x="2" y="2" width="246" height="346" rx="16" filter="url(#fiber)"/><rect x="12" y="12" width="226" height="326" rx="6" fill="none" stroke="#222" stroke-width="1.6" filter="url(#brush)" opacity=".7"/>' },
    classic: { red: '#e00000', black: '#000000', font: 'Courier New,monospace', fs: 30, fsC: 58, pixel: true, tint: ['#ffffff', '#ffffff'],
      defs: '', paper: '<rect x="2" y="2" width="246" height="346" rx="8" fill="#fff" stroke="#000" stroke-width="4" shape-rendering="crispEdges"/>' }
  };
  // ---------- court figures (drawn in the top half, centred on 0,0; ~ -54..+53) ----------
  var EMB = {
    13: function (g, a) { return '<path d="M-46 22V-14L-26 6L-12 -30L0 -2L12 -30L26 6L46 -14V22Z" fill="' + g + '" stroke="' + a + '" stroke-width="4" stroke-linejoin="round"/><rect x="-48" y="18" width="96" height="14" rx="3" fill="' + a + '"/>'; },
    12: function (g, a) { return '<path d="M-44 24Q0 4 44 24L42 12L28 -6L18 6L0 -32L-18 6L-28 -6L-42 12Z" fill="' + g + '" stroke="' + a + '" stroke-width="4" stroke-linejoin="round"/><path d="M0 -14L8 -2L0 10L-8 -2Z" fill="' + a + '"/>'; },
    11: function (g, a) { return '<path d="M6 -6Q22 -46 56 -44Q38 -30 20 -2Z" fill="' + a + '"/><path d="M-40 24L40 24L32 0Q0 -16 -32 0Z" fill="' + g + '" stroke="' + a + '" stroke-width="4" stroke-linejoin="round"/>'; }
  };
  function hat(r, g, a, y, k) { return '<g transform="translate(0 ' + y + ') scale(' + (k || .48) + ')">' + EMB[r](g, a) + '</g>'; }
  function bust(skin, robe, line, trim) {
    return '<path d="M-48 53Q-46 20 -16 14L16 14Q46 20 48 53Z" fill="' + robe + '" stroke="' + line + '" stroke-width="2.5"/>' + (trim ? '<path d="M-16 14L0 40L16 14" fill="none" stroke="' + trim + '" stroke-width="4"/>' : '') +
      '<rect x="-7" y="4" width="14" height="12" fill="' + skin + '"/><circle cx="0" cy="-6" r="19" fill="' + skin + '" stroke="' + line + '" stroke-width="2.5"/><circle cx="-7" cy="-8" r="2.4" fill="' + line + '"/><circle cx="7" cy="-8" r="2.4" fill="' + line + '"/><path d="M-6 3Q0 7 6 3" fill="none" stroke="' + line + '" stroke-width="2"/>';
  }
  var FIG = {
    casino: function (r, c) { return bust('#f6dcc0', c, '#3b2a12', '#e2b54a') + hat(r, '#e2b54a', '#8d6614', -34); },
    walnut: function (r, c, k) { return bust('#f7e8cc', 'url(#hatch' + k + ')', c, c) + hat(r, '#c99a4a', c, -34); },
    neon: function (r, c) { return '<g class="tube" filter="url(#glow)">' + bust('none', 'none', c, c) + hat(r, 'none', c, -34) + '</g>'; },
    forest: function (r, c) { var leaves = ''; for (var i = 0; i < 9; i++) { var a = -150 + i * 15, x = Math.cos(a * Math.PI / 180) * 21, y = -6 + Math.sin(a * Math.PI / 180) * 21; leaves += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="8" ry="4" fill="' + (i % 2 ? '#4e7d22' : '#7bab3a') + '" transform="rotate(' + (a + 90) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>'; }
      var top = r === 13 ? P('M-12 -24L-22 -50M-19 -40L-32 -44M12 -24L22 -50M19 -40L32 -44', 'stroke="#6b4a22" stroke-width="4" stroke-linecap="round" fill="none"') :
        r === 12 ? [-16, -8, 0, 8, 16].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (-26 + Math.abs(x) * .25) + '" r="5" fill="' + (i % 2 ? '#f6d36b' : c) + '"/>'; }).join('') :
          '<path d="M-20 -14Q0 -44 20 -14Z" fill="#8a5a2b"/><path d="M-20 -14H20" stroke="#5a3a1a" stroke-width="4"/><path d="M0 -36V-44" stroke="#5a3a1a" stroke-width="4"/>';
      return '<path d="M-48 53Q-46 20 -16 14L16 14Q46 20 48 53Z" fill="#3f6b22" stroke="#1c2a16" stroke-width="2.5"/><path d="M-30 53L16 14" stroke="' + c + '" stroke-width="8"/>' + leaves + bust('#f1d6b0', 'none', '#1c2a16').replace(/<path d="M-48[^>]*>/, '') + top; },
    nebula: function (r, c) {
      if (r === 13) return '<path d="M-48 53Q-46 18 -16 14L16 14Q46 18 48 53Z" fill="#d9e2f2" stroke="#9cb4e0" stroke-width="2.5"/><rect x="-14" y="26" width="28" height="16" rx="3" fill="#33406b"/><circle cx="-6" cy="34" r="3" fill="' + c + '"/><circle cx="0" cy="-6" r="25" fill="#eef3ff" stroke="#9cb4e0" stroke-width="3"/><ellipse cx="0" cy="-5" rx="18" ry="14" fill="#1b1440"/><path d="M-10 -12q6-5 14-3" stroke="#9cd9ff" stroke-width="3" fill="none"/>' + hat(13, '#ffd56b', c, -40, .36);
      if (r === 12) return '<path d="M-44 53Q-42 20 -14 16L14 16Q42 20 44 53Z" fill="' + c + '" opacity=".85"/><ellipse cx="0" cy="-6" rx="18" ry="24" fill="#8dffb0" stroke="#1b6b3d" stroke-width="2.5"/><ellipse cx="-8" cy="-6" rx="6" ry="9" fill="#120b2e" transform="rotate(-20 -8 -6)"/><ellipse cx="8" cy="-6" rx="6" ry="9" fill="#120b2e" transform="rotate(20 8 -6)"/><path d="M-8 -28L-16 -46M8 -28L16 -46" stroke="#1b6b3d" stroke-width="2.5"/><circle cx="-16" cy="-47" r="4" fill="' + c + '"/><circle cx="16" cy="-47" r="4" fill="' + c + '"/>';
      return '<path d="M-44 53V24Q-44 16 -30 16H30Q44 16 44 24V53Z" fill="#b8c2d6" stroke="#5d6a86" stroke-width="2.5"/><rect x="-20" y="-26" width="40" height="38" rx="7" fill="#d6deec" stroke="#5d6a86" stroke-width="2.5"/><rect x="-14" y="-14" width="28" height="10" rx="5" fill="#120b2e"/><circle cx="-7" cy="-9" r="3" fill="' + c + '"/><circle cx="7" cy="-9" r="3" fill="' + c + '"/><path d="M0 -26V-40" stroke="#5d6a86" stroke-width="2.5"/><circle cx="0" cy="-42" r="4" fill="' + c + '"/>'; },
    reef: function (r, c) { var hair = r === 12 ? '<path d="M-20 -10Q-34 20 -26 46M20 -10Q34 20 26 46" stroke="' + c + '" stroke-width="9" fill="none" stroke-linecap="round"/>' : '';
      var top = r === 13 ? hat(13, '#ffd56b', '#2a8aa0', -34) + P('M38 53V-30M30 -24L38 -40L46 -24M30 -30V-22M46 -30V-22', 'stroke="#d4a23a" stroke-width="3.5" fill="none" stroke-linejoin="round"') :
        r === 12 ? '<path d="M-22 -24Q0 -52 22 -24Z" fill="#ffc2b0" stroke="#d0705a" stroke-width="2"/>' + [-12, -6, 0, 6, 12].map(function (x) { return P('M0 -24L' + x * 1.6 + ' -44', 'stroke="#d0705a" stroke-width="1.6"'); }).join('') :
          '<ellipse cx="0" cy="-30" rx="22" ry="10" fill="#ffa24c" stroke="#b5561c" stroke-width="2"/><path d="M20 -30L34 -40V-20Z" fill="#ffa24c" stroke="#b5561c" stroke-width="2"/><circle cx="-12" cy="-32" r="2.6" fill="#0b2d45"/>';
      return hair + bust('#ffdcc6', '#2aa0b4', '#0b2d45', c) + top; },
    zen: function (r, c) { var top = r === 13 ? '<rect x="-12" y="-46" width="24" height="24" rx="3" fill="#111"/><path d="M12 -30Q30 -26 34 -10" stroke="#111" stroke-width="3" fill="none"/>' :
        r === 12 ? '<ellipse cx="0" cy="-26" rx="16" ry="11" fill="#111"/><path d="M-20 -36L20 -22M-18 -22L22 -36" stroke="#b08a3a" stroke-width="2.5"/><circle cx="16" cy="-30" r="6" fill="' + c + '"/>' :
          '<path d="M-36 -14L0 -42L36 -14Z" fill="#d9b86a" stroke="#111" stroke-width="2.5"/>';
      return '<g filter="url(#brush)"><path d="M-48 53Q-46 20 -16 14L16 14Q46 20 48 53Z" fill="#f2ece0" stroke="#111" stroke-width="3.5"/><path d="M-16 14L4 53M16 14L-4 40" stroke="' + c + '" stroke-width="5"/><circle cx="0" cy="-6" r="19" fill="#f7efe2" stroke="#111" stroke-width="3.5"/><path d="M-10 -8h6M4 -8h6" stroke="#111" stroke-width="3"/>' + top + '</g>'; },
    classic: function (r, c) { var a = c === '#e00000' ? '#000080' : '#e00000'; return '<g shape-rendering="crispEdges">' + bust('#ffff80', c, '#000', '#ffff00') + hat(r, '#ffff00', a, -34) + '</g>'; }
  };
  var ACE = {
    casino: '<circle cx="125" cy="175" r="66" fill="none" stroke="url(#foil)" stroke-width="3"/><circle cx="125" cy="175" r="58" fill="none" stroke="url(#foil)" stroke-width="1.2" stroke-dasharray="2 5"/>',
    walnut: '<ellipse cx="125" cy="175" rx="66" ry="86" fill="none" stroke="#5a3a1a" stroke-width="2.2"/><ellipse cx="125" cy="175" rx="60" ry="80" fill="none" stroke="#5a3a1a" stroke-width=".8" stroke-dasharray="1 3"/>',
    neon: '<circle cx="125" cy="175" r="68" fill="none" stroke="#b45cff" stroke-width="3" filter="url(#glow)"/>',
    nebula: '<ellipse cx="125" cy="175" rx="92" ry="24" fill="none" stroke="#9cd9ff" stroke-opacity=".7" stroke-width="2" transform="rotate(-22 125 175)"/><circle cx="196" cy="140" r="5" fill="#ffd56b"/>',
    forest: (function () { var s = '<circle cx="125" cy="175" r="66" fill="none" stroke="#5a3a1a" stroke-width="2"/>'; for (var i = 0; i < 16; i++) { var a = i * 22.5 * Math.PI / 180, x = 125 + Math.cos(a) * 66, y = 175 + Math.sin(a) * 66; s += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="8" ry="3.6" fill="' + (i % 2 ? '#4e7d22' : '#7bab3a') + '" transform="rotate(' + (i * 22.5 + 45) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>'; } return s; })(),
    reef: '<g fill="none" stroke="#2aa0b4" stroke-width="2" opacity=".7"><circle cx="70" cy="110" r="9"/><circle cx="58" cy="132" r="5"/><circle cx="186" cy="246" r="8"/><circle cx="196" cy="226" r="4"/><circle cx="66" cy="250" r="6"/></g>',
    zen: '<path d="M178 132A68 68 0 1 1 150 113" fill="none" stroke="#111" stroke-width="9" stroke-linecap="round" filter="url(#brush)" opacity=".85"/>',
    classic: ''
  };
  var theme = 'casino', cache = {};
  function S() { return STY[theme]; }
  function col(s) { return (s === 1 || s === 2) ? S().red : S().black; }
  function key(s) { return (s === 1 || s === 2) ? 'R' : 'B'; }
  function pip(s, cx, cy, size, flip) {
    var t = 'translate(' + (cx - size / 2) + ' ' + (cy - size / 2) + ') scale(' + (size / 100) + ')';
    if (flip) t = 'rotate(180 ' + cx + ' ' + cy + ') ' + t;
    return '<g transform="' + t + '">' + PIPS[theme](s, col(s), key(s)) + '</g>';
  }
  function defs() {
    var st = S(), d = st.defs;
    if (theme === 'walnut') d += ['R', 'B'].map(function (k) { return '<pattern id="hatch' + k + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#f6e6c4"/><rect width="2.4" height="5" fill="' + (k === 'R' ? st.red : st.black) + '"/></pattern>'; }).join('');
    if (theme === 'neon') d += '<style>.tube *{fill:none!important;stroke:currentColor!important;stroke-width:3px!important}</style>';
    if (FONTS[theme]) d += '<style>@font-face{font-family:CF;src:url(data:font/woff2;base64,' + FONTS[theme] + ') format("woff2")}</style>';
    return '<defs>' + d + '</defs>';
  }
  function rank(txt, x, y, fs, c, anchor) {
    var st = S(), a = ' text-anchor="' + (anchor || 'middle') + '" font-family="CF,' + st.font + '" font-size="' + fs + '"' + (txt === '10' && !st.pixel ? ' letter-spacing="-' + (fs * .07).toFixed(1) + '"' : '');
    if (theme === 'neon') return '<text x="' + x + '" y="' + y + '"' + a + ' fill="' + c + '" stroke="' + c + '" stroke-width="1" filter="url(#glow)">' + txt + '</text>';
    if (theme === 'nebula') return '<text x="' + x + '" y="' + y + '"' + a + ' fill="' + c + '" filter="url(#glow)">' + txt + '</text>';
    if (theme === 'casino') return '<text x="' + x + '" y="' + y + '"' + a + ' fill="' + c + '" stroke="url(#foil)" stroke-width="1.2" paint-order="stroke">' + txt + '</text>';
    return '<text x="' + x + '" y="' + y + '"' + a + ' fill="' + c + '">' + txt + '</text>';
  }
  function svg(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350">' + defs() + S().paper + inner + '</svg>'; }
  function corner(s, r) {
    var c = col(s), t = RANKS[r], st = S(), fs = t === '10' ? st.fs * .88 : st.fs;
    var g = rank(t, 31, st.pixel ? 50 : 56, st.pixel && t === '10' ? fs * .72 : fs, c) + pip(s, 31, 80, 30, false);
    return g + '<g transform="rotate(180 125 175)">' + g + '</g>';
  }
  function courtPanel(s, r) {
    var c = col(s), tint = S().tint[key(s) === 'R' ? 0 : 1];
    var half = '<g transform="translate(125 128) scale(1.15)"' + (theme === 'neon' ? ' style="color:' + c + '"' : '') + '>' + FIG[theme](r, c, key(s)) + '</g>' + pip(s, 80, 90, 22, false);
    return '<rect x="56" y="62" width="138" height="226" rx="10" fill="' + tint + '" stroke="' + c + '" stroke-width="2.5"/>' +
      '<clipPath id="ct"><rect x="58" y="64" width="134" height="111"/></clipPath><clipPath id="cb"><rect x="58" y="175" width="134" height="111"/></clipPath>' +
      '<g clip-path="url(#ct)">' + half + '</g><g clip-path="url(#cb)"><g transform="rotate(180 125 175)">' + half + '</g></g>' +
      '<path d="M58 175H192" stroke="' + c + '" stroke-width="1.5" stroke-dasharray="3 4" opacity=".6"/>';
  }
  function face(s, r) {
    var body;
    if (r === 1) body = ACE[theme] + pip(s, 125, 175, s === 0 ? 92 : 78);
    else if (r <= 10) { var xs = [76, 125, 174], y0 = 76, y1 = 274, size = r >= 9 ? 38 : 44; body = LAY[r].map(function (p) { return pip(s, xs[p[0]], y0 + (y1 - y0) * p[1], size, p[1] > .5); }).join(''); }
    else body = courtPanel(s, r);
    return svg(body + corner(s, r));
  }
  // compact (phone / cover screen): oversized index, big centre symbol
  function compact(s, r) {
    var c = col(s), t = RANKS[r], st = S(), fs = t === '10' ? st.fsC * (st.pixel ? .62 : .9) : st.fsC, body;
    var idx = rank(t, 14, st.pixel ? 76 : 88, fs, c, 'start') + pip(s, 198, 54, 60);
    if (r > 10) body = '<rect x="28" y="116" width="194" height="212" rx="12" fill="' + st.tint[key(s) === 'R' ? 0 : 1] + '" stroke="' + c + '" stroke-width="3"/><g transform="translate(125 214) scale(1.55)"' + (theme === 'neon' ? ' style="color:' + c + '"' : '') + '><clipPath id="cc"><rect x="-60" y="-62" width="120" height="115"/></clipPath><g clip-path="url(#cc)">' + FIG[theme](r, c, key(s)) + '</g></g>';
    else body = (r === 1 ? '<g transform="translate(62.5 125) scale(.5)">' + ACE[theme] + '</g>' : '') + pip(s, 125, 226, r === 1 ? 130 : 116);
    return svg(idx + body);
  }
  function uri(x) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x); }
  function faceURI(s, r, cmp, th) {
    var prev = theme; if (th && STY[th]) theme = th;
    var k = theme + ':' + s + ':' + r + (cmp ? 'c' : ''), v = cache[k] || (cache[k] = uri(cmp ? compact(s, r) : face(s, r)));
    theme = prev; return v;
  }
  Art.faceURI = faceURI;
  Art.svgFace = function (s, r) { return face(s, r); };
  Art.setFaceTheme = function (id) { theme = STY[id] ? id : 'casino'; };
  Art.faceTheme = function () { return theme; };
})(this);
