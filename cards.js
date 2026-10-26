/* Original vector card art. Every card is a standalone SVG (data URI) so it is
   razor sharp at any DPI and can also be drawn onto <canvas> for the win animation. */
(function (root) {
  'use strict';
  var W = 250, H = 350;
  var RED = '#c3202b', BLACK = '#1b1d24', GOLD = '#d8a93b', GOLD_D = '#8d6614';
  var SUIT_PATH = [
    // spade
    '<path d="M50 2C60 22 98 40 98 63C98 78 87 87 74 87C65 87 58 82 54 75C55 86 59 93 67 99H33C41 93 45 86 46 75C42 82 35 87 26 87C13 87 2 78 2 63C2 40 40 22 50 2Z"/>',
    // heart
    '<path d="M50 94C22 70 2 52 2 29C2 13 14 3 27 3C38 3 46 10 50 20C54 10 62 3 73 3C86 3 98 13 98 29C98 52 78 70 50 94Z"/>',
    // diamond
    '<path d="M50 1L88 50L50 99L12 50Z"/>',
    // club
    '<g><circle cx="50" cy="27" r="23"/><circle cx="25" cy="62" r="23"/><circle cx="75" cy="62" r="23"/>' +
    '<path d="M44 40H56L58 75C59 86 62 93 69 99H31C38 93 41 86 42 75Z"/></g>'
  ];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function color(s) { return (s === 1 || s === 2) ? RED : BLACK; }
  function pip(s, cx, cy, size, flip) {
    var t = 'translate(' + (cx - size / 2) + ' ' + (cy - size / 2) + ') scale(' + (size / 100) + ')';
    if (flip) t = 'rotate(180 ' + cx + ' ' + cy + ') ' + t;
    return '<g transform="' + t + '">' + SUIT_PATH[s] + '</g>';
  }
  // pip layouts: [col (0 left,1 mid,2 right), row fraction 0..1]
  var L = {
    2: [[1, 0], [1, 1]], 3: [[1, 0], [1, .5], [1, 1]],
    4: [[0, 0], [2, 0], [0, 1], [2, 1]],
    5: [[0, 0], [2, 0], [1, .5], [0, 1], [2, 1]],
    6: [[0, 0], [2, 0], [0, .5], [2, .5], [0, 1], [2, 1]],
    7: [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [0, 1], [2, 1]],
    8: [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [1, .75], [0, 1], [2, 1]],
    9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, .5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]],
    10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]]
  };
  function corner(s, r) {
    var c = color(s), txt = RANKS[r], fs = txt === '10' ? 40 : 46;
    var g = '<text x="31" y="56" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="' + fs + '"' +
      (txt === '10' ? ' letter-spacing="-3"' : '') + ' fill="' + c + '">' + txt + '</text>' + pip(s, 31, 80, 30, false);
    return '<g fill="' + c + '">' + g + '</g><g fill="' + c + '" transform="rotate(180 125 175)">' + g + '</g>';
  }
  var EMBLEM = {
    13: function (s, acc) { // crown
      return '<path d="M-46 22V-14L-26 6L-12 -30L0 -2L12 -30L26 6L46 -14V22Z" fill="' + GOLD + '" stroke="' + GOLD_D + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<rect x="-48" y="18" width="96" height="14" rx="3" fill="' + acc + '" stroke="' + GOLD_D + '" stroke-width="3"/>' +
        '<circle cx="-12" cy="-32" r="5" fill="' + acc + '"/><circle cx="12" cy="-32" r="5" fill="' + acc + '"/>' +
        '<circle cx="-46" cy="-17" r="5" fill="' + acc + '"/><circle cx="46" cy="-17" r="5" fill="' + acc + '"/>' +
        '<circle cx="0" cy="25" r="4" fill="#fff"/><circle cx="-26" cy="25" r="3" fill="#fff"/><circle cx="26" cy="25" r="3" fill="#fff"/>';
    },
    12: function (s, acc) { // tiara + gem
      return '<path d="M-44 24Q0 4 44 24L42 12L28 -6L18 6L0 -32L-18 6L-28 -6L-42 12Z" fill="' + GOLD + '" stroke="' + GOLD_D + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M0 -14L8 -2L0 10L-8 -2Z" fill="' + acc + '"/>' +
        '<circle cx="-28" cy="-10" r="4.5" fill="' + acc + '"/><circle cx="28" cy="-10" r="4.5" fill="' + acc + '"/>' +
        '<path d="M-40 26Q0 8 40 26" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="1 7" stroke-linecap="round"/>';
    },
    11: function (s, acc) { // plumed cap
      return '<path d="M6 -6Q22 -46 56 -44Q38 -30 20 -2Z" fill="' + acc + '" stroke="' + GOLD_D + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M14 -14Q30 -34 48 -40" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>' +
        '<path d="M-40 24L40 24L32 0Q0 -16 -32 0Z" fill="' + GOLD + '" stroke="' + GOLD_D + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<rect x="-44" y="20" width="88" height="10" rx="3" fill="' + acc + '" stroke="' + GOLD_D + '" stroke-width="2.5"/>' +
        '<circle cx="0" cy="8" r="5" fill="' + acc + '" stroke="#fff" stroke-width="1.5"/>';
    }
  };
  function court(s, r) {
    var c = color(s), acc = c === RED ? '#a3172a' : '#24427e', tint = c === RED ? '#fbeee6' : '#eef1f7';
    var half = '<g transform="translate(125 108) scale(.92)">' + EMBLEM[r](s, acc) + '</g>' + '<g fill="' + c + '">' + pip(s, 125, 151, 26, false) + '</g>';
    return '<rect x="56" y="62" width="138" height="226" rx="10" fill="' + tint + '" stroke="' + c + '" stroke-width="2.5"/>' +
      '<rect x="62" y="68" width="126" height="214" rx="7" fill="none" stroke="' + GOLD + '" stroke-width="1.5"/>' +
      '<path d="M62 175H188" stroke="' + GOLD + '" stroke-width="1.5" stroke-dasharray="3 4"/>' +
      '<clipPath id="ct"><rect x="62" y="68" width="126" height="107"/></clipPath>' +
      '<clipPath id="cb"><rect x="62" y="175" width="126" height="107"/></clipPath>' +
      '<g clip-path="url(#ct)">' + half + '</g>' +
      '<g clip-path="url(#cb)"><g transform="rotate(180 125 175)">' + half + '</g></g>';
  }
  function face(s, r) {
    var c = color(s), body = '';
    if (r === 1) {
      body = (s === 0 ? '<circle cx="125" cy="175" r="62" fill="none" stroke="' + GOLD + '" stroke-width="2"/><circle cx="125" cy="175" r="56" fill="none" stroke="' + GOLD + '" stroke-width="1" stroke-dasharray="2 5"/>' : '') +
        '<g fill="' + c + '">' + pip(s, 125, 175, s === 0 ? 86 : 70) + '</g>';
    } else if (r <= 10) {
      var xs = [76, 125, 174], y0 = 76, y1 = 274, size = r >= 9 ? 38 : 44;
      body = '<g fill="' + c + '">' + L[r].map(function (p) { var y = y0 + (y1 - y0) * p[1]; return pip(s, xs[p[0]], y, size, p[1] > .5); }).join('') + '</g>';
    } else body = court(s, r);
    return svg('<defs><linearGradient id="pp" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fdfbf5"/><stop offset="1" stop-color="#f3efe4"/></linearGradient></defs><rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#pp)" stroke="#a9a397" stroke-width="3"/><rect x="5" y="5" width="240" height="340" rx="13" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/>' + body + corner(s, r));
  }
  // Compact face for small (phone) cards: oversized index so fanned stacks stay readable.
  function compactFace(s, r) {
    var c = color(s), txt = RANKS[r], body;
    var idx = '<text x="' + (txt === '10' ? 12 : 18) + '" y="88" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="86"' +
      (txt === '10' ? ' letter-spacing="-7"' : '') + ' fill="' + c + '">' + txt + '</text>' + '<g fill="' + c + '">' + pip(s, 196, 56, 62) + '</g>';
    if (r > 10) {
      var acc = c === RED ? '#a3172a' : '#24427e', tint = c === RED ? '#fbeee6' : '#eef1f7';
      body = '<rect x="30" y="120" width="190" height="205" rx="12" fill="' + tint + '" stroke="' + c + '" stroke-width="3"/>' +
        '<g transform="translate(125 205) scale(1.6)">' + EMBLEM[r](s, acc) + '</g>' + '<g fill="' + c + '">' + pip(s, 125, 280, 50) + '</g>';
    } else body = '<g fill="' + c + '">' + pip(s, 125, 228, r === 1 ? 140 : 120) + '</g>';
    return svg('<defs><linearGradient id="pp" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fdfbf5"/><stop offset="1" stop-color="#f3efe4"/></linearGradient></defs><rect x="1.5" y="1.5" width="247" height="347" rx="18" fill="url(#pp)" stroke="#a9a397" stroke-width="4"/>' + idx + body);
  }
  var BACKS = {
    felt: { name: 'Royal Casino', bg: '#0f4d2c', art: function () {
      return '<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#11502e"/>' +
        '<path d="M14 2C18 9 26 10 26 14C26 18 18 19 14 26C10 19 2 18 2 14C2 10 10 9 14 2Z" fill="none" stroke="#d6b45a" stroke-width="1.2" opacity=".75"/><circle cx="14" cy="14" r="2" fill="#d6b45a"/></pattern>' +
        '<rect x="14" y="14" width="222" height="322" rx="10" fill="url(#p)" stroke="#e6c76a" stroke-width="4"/>' +
        '<rect x="24" y="24" width="202" height="302" rx="7" fill="none" stroke="#e6c76a" stroke-width="1.5"/>' +
        '<g transform="translate(125 175)"><circle r="44" fill="#0b3b21" stroke="#e6c76a" stroke-width="4"/><circle r="36" fill="none" stroke="#e6c76a" stroke-width="1.2" stroke-dasharray="3 4"/>' +
        '<g transform="translate(-22 -24) scale(.44)" fill="#e6c76a"><path d="M50 2C60 22 98 40 98 63C98 78 87 87 74 87C65 87 58 82 54 75C55 86 59 93 67 99H33C41 93 45 86 46 75C42 82 35 87 26 87C13 87 2 78 2 63C2 40 40 22 50 2Z"/></g></g>';
    } },
    gold: { name: 'Walnut & Gold', bg: '#3a1c12', art: function () {
      return '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a2316"/><stop offset="1" stop-color="#26100a"/></linearGradient>' +
        '<linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e3a1"/><stop offset=".5" stop-color="#c89b3c"/><stop offset="1" stop-color="#8a6420"/></linearGradient>' +
        '<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 0V24M0 12H24" stroke="#c89b3c" stroke-width=".6" opacity=".35"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="#c89b3c" stroke-width=".9" opacity=".6"/></pattern>' +
        '<rect x="14" y="14" width="222" height="322" rx="10" fill="url(#g)" stroke="url(#au)" stroke-width="5"/><rect x="14" y="14" width="222" height="322" rx="10" fill="url(#p)"/>' +
        '<rect x="26" y="26" width="198" height="298" rx="6" fill="none" stroke="url(#au)" stroke-width="1.6"/>' +
        '<g transform="translate(125 175)" fill="none" stroke="url(#au)" stroke-width="3"><path d="M0 -60L34 0L0 60L-34 0Z" fill="#2a120b"/><path d="M0 -42L22 0L0 42L-22 0Z"/><circle r="8" fill="url(#au)"/></g>';
    } },
    neon: { name: 'Neon Grid', bg: '#0b0820', art: function () {
      var g = '';
      for (var i = 0; i < 9; i++) g += '<path d="M' + (125 + (i - 4) * 12) + ' 175L' + (125 + (i - 4) * 60) + ' 336" />';
      for (var j = 0; j < 6; j++) { var y = 185 + j * j * 5 + j * 6; g += '<path d="M14 ' + y + 'H236"/>'; }
      return '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b3a"/><stop offset=".52" stop-color="#3b0f5c"/><stop offset=".53" stop-color="#070514"/><stop offset="1" stop-color="#0b0820"/></linearGradient>' +
        '<filter id="gl"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<clipPath id="cl"><rect x="14" y="14" width="222" height="322" rx="10"/></clipPath>' +
        '<rect x="14" y="14" width="222" height="322" rx="10" fill="url(#g)"/>' +
        '<g clip-path="url(#cl)" filter="url(#gl)"><g stroke="#28e0ff" stroke-width="1.6" opacity=".85">' + g + '</g>' +
        '<circle cx="125" cy="128" r="46" fill="#ff3fa4"/><path d="M79 116H171M79 128H171M79 140H171M79 152H171" stroke="#3b0f5c" stroke-width="5"/></g>' +
        '<rect x="14" y="14" width="222" height="322" rx="10" fill="none" stroke="#28e0ff" stroke-width="4" filter="url(#gl)"/>';
    } },
    sakura: { name: 'Sakura', bg: '#26244f', art: function () {
      var f = '', r = 11;
      function blossom(x, y, k) { var p = ''; for (var a = 0; a < 5; a++) p += '<ellipse cx="0" cy="-7" rx="4.6" ry="7.5" transform="rotate(' + (a * 72) + ')"/>'; return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" fill="#f6b8cc">' + p + '<circle r="2.6" fill="#f2d38a"/></g>'; }
      for (var i = 0; i < 16; i++) { r = (r * 9301 + 49297) % 233280; var x = 30 + r % 190; r = (r * 9301 + 49297) % 233280; var y = 30 + r % 290; f += blossom(x, y, .6 + (r % 4) * .15); }
      return '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2c63"/><stop offset="1" stop-color="#1a1838"/></linearGradient>' +
        '<rect x="14" y="14" width="222" height="322" rx="10" fill="url(#g)" stroke="#f3dfe6" stroke-width="4"/>' + f +
        '<circle cx="125" cy="175" r="40" fill="#c8323c"/><circle cx="125" cy="175" r="40" fill="none" stroke="#f3dfe6" stroke-width="3"/>';
    } },
    reef: { name: 'Reef Waves', bg: '#0d4e63', art: function () {
      return '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8ea3"/><stop offset="1" stop-color="#0a3a52"/></linearGradient>' +
        '<pattern id="p" width="30" height="16" patternUnits="userSpaceOnUse"><path d="M0 16A15 15 0 0 1 30 16M0 16A9 9 0 0 1 18 16" fill="none" stroke="#bdf2ef" stroke-width="1.4" opacity=".55"/></pattern>' +
        '<rect x="14" y="14" width="222" height="322" rx="10" fill="url(#g)" stroke="#f1e6c8" stroke-width="4"/><rect x="14" y="14" width="222" height="322" rx="10" fill="url(#p)"/>' +
        '<g transform="translate(125 175)"><circle r="42" fill="#f1e6c8"/><path d="M-26 0C-12 -18 14 -18 26 0C14 18 -12 18 -26 0ZM24 0L40 -14V14Z" fill="#f08a4b"/><circle cx="-12" cy="-3" r="3" fill="#0a3a52"/></g>';
    } },
    classic: { name: 'Classic 95', bg: '#0000a8', art: function () {
      return '<pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#0000a8"/><path d="M0 0L8 8M8 0L0 8" stroke="#5a5aff" stroke-width="1"/></pattern>' +
        '<rect x="12" y="12" width="226" height="326" fill="url(#p)" stroke="#fff" stroke-width="5"/><rect x="22" y="22" width="206" height="306" fill="none" stroke="#fff" stroke-width="2"/>' +
        '<g transform="translate(125 175)"><rect x="-30" y="-30" width="60" height="60" fill="#c0c0c0" stroke="#000" stroke-width="2"/><rect x="-24" y="-24" width="22" height="22" fill="#ff0000"/><rect x="2" y="-24" width="22" height="22" fill="#00a800"/><rect x="-24" y="2" width="22" height="22" fill="#0000ff"/><rect x="2" y="2" width="22" height="22" fill="#ffff00"/></g>';
    } },
    retro: { name: 'Retro Grid', bg: '#167a7a', art: function () {
      return '<pattern id="p" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<rect width="22" height="22" fill="#167a7a"/><path d="M0 0H22M0 0V22" stroke="#5fc6bd" stroke-width="2"/>' +
        '<rect x="7" y="7" width="8" height="8" fill="#f4c64e"/></pattern>' +
        '<rect x="18" y="18" width="214" height="314" rx="8" fill="url(#p)"/>' +
        '<rect x="18" y="18" width="214" height="314" rx="8" fill="none" stroke="#f6f0e0" stroke-width="5"/>' +
        '<rect x="80" y="135" width="90" height="80" rx="6" fill="#0f4f57" stroke="#f6f0e0" stroke-width="4"/>' +
        '<circle cx="125" cy="182" r="22" fill="#f4c64e"/><path d="M84 182H166M84 192H166M84 202H166" stroke="#0f4f57" stroke-width="4"/>';
    } },
    crimson: { name: 'Crimson Lattice', bg: '#8d1d2a', art: function () {
      return '<pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#9e2231"/>' +
        '<path d="M0 8L8 0L16 8L8 16Z" fill="none" stroke="#e9b9a5" stroke-width="1.4"/><circle cx="8" cy="8" r="1.6" fill="#f2d39b"/></pattern>' +
        '<rect x="16" y="16" width="218" height="318" rx="9" fill="url(#p)" stroke="#f2e6d6" stroke-width="4"/>' +
        '<rect x="26" y="26" width="198" height="298" rx="6" fill="none" stroke="#f2d39b" stroke-width="1.5"/>' +
        '<g transform="translate(125 175)"><circle r="40" fill="#7a1522" stroke="#f2d39b" stroke-width="3"/>' +
        '<path d="M0 -28L8 -8L28 0L8 8L0 28L-8 8L-28 0L-8 -8Z" fill="#f2d39b"/></g>';
    } },
    forest: { name: 'Forest Scales', bg: '#1f4a33', art: function () {
      return '<pattern id="p" width="20" height="14" patternUnits="userSpaceOnUse"><rect width="20" height="14" fill="#235a3c"/>' +
        '<path d="M0 14A10 10 0 0 1 20 14M-10 7A10 10 0 0 1 10 7M10 7A10 10 0 0 1 30 7" fill="none" stroke="#8cc69a" stroke-width="1.5"/></pattern>' +
        '<rect x="16" y="16" width="218" height="318" rx="9" fill="url(#p)" stroke="#e8e2c8" stroke-width="4"/>' +
        '<g transform="translate(125 175)"><ellipse rx="44" ry="58" fill="#173d29" stroke="#e8e2c8" stroke-width="3"/>' +
        '<path d="M0 -40C22 -18 22 18 0 40C-22 18 -22 -18 0 -40Z" fill="#8cc69a"/><path d="M0 -36V40" stroke="#173d29" stroke-width="3"/></g>';
    } },
    midnight: { name: 'Midnight Sky', bg: '#1b2150', art: function () {
      var stars = '', r = 7;
      for (var i = 0; i < 46; i++) { r = (r * 9301 + 49297) % 233280; var x = 24 + (r % 202); r = (r * 9301 + 49297) % 233280; var y = 24 + (r % 302); r = (r * 9301 + 49297) % 233280;
        stars += '<circle cx="' + x + '" cy="' + y + '" r="' + (0.8 + (r % 3) * 0.6) + '" fill="#fff" opacity="' + (0.5 + (r % 5) / 10) + '"/>'; }
      return '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28306e"/><stop offset="1" stop-color="#121638"/></linearGradient>' +
        '<rect x="16" y="16" width="218" height="318" rx="9" fill="url(#g)" stroke="#d9c98f" stroke-width="4"/>' + stars +
        '<circle cx="125" cy="175" r="34" fill="#f3e3a4"/><circle cx="141" cy="163" r="30" fill="#232a62"/>';
    } }
  };
  function back(key) {
    var b = BACKS[key] || BACKS.felt;
    return svg('<rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="#fbf8f0" stroke="#a9a397" stroke-width="3"/>' + b.art());
  }
  function svg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '">' + inner + '</svg>';
  }
  var cache = {};
  function uri(s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }
  function faceURI(s, r, compact) { var k = s + ':' + r + (compact ? 'c' : ''); return cache[k] || (cache[k] = uri(compact ? compactFace(s, r) : face(s, r))); }
  function backURI(key) { var k = 'b:' + key; return cache[k] || (cache[k] = uri(back(key))); }
  root.CardArt = { faceURI: faceURI, backURI: backURI, BACKS: BACKS, W: W, H: H, svgFace: face, svgBack: back };
})(this);
