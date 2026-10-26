/* Klondike rules engine — pure, no DOM. Works in browser (window.Klondike) and Node (module.exports). */
(function (root) {
  'use strict';
  var SUITS = ['S', 'H', 'D', 'C'];
  function isRed(c) { return c.s === 1 || c.s === 2; }
  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeDeck(seed) {
    var d = [], r = rng(seed);
    for (var s = 0; s < 4; s++) for (var k = 1; k <= 13; k++) d.push({ id: SUITS[s] + k, s: s, r: k, up: false });
    for (var i = d.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }
  // Max recycles of waste->stock. Infinity = unlimited.
  function recycleLimit(st) {
    if (st.scoring === 'vegas') return st.drawCount === 1 ? 0 : 2;
    return st.maxRecycles == null ? Infinity : st.maxRecycles; // difficulty redeal allowance
  }
  function newGame(opts) {
    opts = opts || {};
    var seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296);
    var deck = makeDeck(seed);
    if (opts.perm) { // colour-preserving suit swap (S<->C, H<->D): same deal shape, so winnability is kept
      var map = [opts.perm & 1 ? 3 : 0, opts.perm & 2 ? 2 : 1, opts.perm & 2 ? 1 : 2, opts.perm & 1 ? 0 : 3];
      deck.forEach(function (c) { c.s = map[c.s]; c.id = SUITS[c.s] + c.r; });
    }
    var st = {
      seed: seed, drawCount: opts.drawCount === 3 ? 3 : 1,
      scoring: opts.scoring || 'standard', timed: opts.timed !== false,
      stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []],
      score: 0, moves: 0, recycles: 0, elapsed: 0, timePenalized: 0,
      won: false, bonus: 0, started: false, history: [],
      maxRecycles: opts.maxRecycles == null || opts.maxRecycles === Infinity ? null : opts.maxRecycles, perm: opts.perm || 0
    };
    for (var c = 0; c < 7; c++) for (var k = c; k < 7; k++) { var card = deck.pop(); st.tab[k].push(card); }
    st.tab.forEach(function (p) { p[p.length - 1].up = true; });
    st.stock = deck.reverse(); // top of stock = last element
    if (st.scoring === 'vegas') st.score = -52;
    return st;
  }
  function snapshot(st) {
    var h = st.history; st.history = undefined; var c = JSON.parse(JSON.stringify(st)); st.history = h; delete c.history; return c;
  }
  function pushHistory(st) { st.history.push(snapshot(st)); if (st.history.length > 100000) st.history.shift(); }
  function addScore(st, n) {
    if (st.scoring === 'none') return;
    st.score += n;
    if (st.scoring === 'standard' && st.score < 0) st.score = 0;
  }
  function pileOf(st, ref) {
    if (ref.pile === 'tab') return st.tab[ref.idx];
    if (ref.pile === 'found') return st.found[ref.idx];
    if (ref.pile === 'waste') return st.waste;
    if (ref.pile === 'stock') return st.stock;
    return null;
  }
  function top(p) { return p[p.length - 1]; }
  function canPlaceOnTab(card, dest) {
    var t = top(dest);
    if (!t) return card.r === 13;
    return t.up && isRed(t) !== isRed(card) && t.r === card.r + 1;
  }
  function canPlaceOnFound(card, dest, count) {
    if (count !== 1) return false;
    var t = top(dest);
    if (!t) return card.r === 1;
    return t.s === card.s && t.r + 1 === card.r;
  }
  // from: {pile, idx, n} where n = number of cards from top (tableau stack moves); to: {pile, idx}
  function canMove(st, from, to) {
    if (st.won) return false;
    var src = pileOf(st, from), dst = pileOf(st, to);
    if (!src || !dst || src === dst) return false;
    var n = from.n || 1;
    if (from.pile !== 'tab' && n !== 1) return false;
    if (src.length < n) return false;
    var moving = src.slice(src.length - n);
    if (!moving.every(function (c) { return c.up; })) return false;
    for (var i = 1; i < moving.length; i++) {
      if (isRed(moving[i]) === isRed(moving[i - 1]) || moving[i].r !== moving[i - 1].r - 1) return false;
    }
    if (to.pile === 'tab') return canPlaceOnTab(moving[0], dst);
    if (to.pile === 'found') {
      if (from.pile === 'found') return false;
      return canPlaceOnFound(moving[0], dst, n);
    }
    return false;
  }
  function move(st, from, to) {
    if (!canMove(st, from, to)) return false;
    pushHistory(st);
    var src = pileOf(st, from), dst = pileOf(st, to), n = from.n || 1;
    var moving = src.splice(src.length - n, n);
    Array.prototype.push.apply(dst, moving);
    var vegas = st.scoring === 'vegas';
    if (to.pile === 'found') addScore(st, vegas ? 5 : 10);
    else if (from.pile === 'waste') { if (!vegas) addScore(st, 5); }
    else if (from.pile === 'found') addScore(st, vegas ? -5 : -15);
    if (from.pile === 'tab' && src.length && !top(src).up) { top(src).up = true; if (!vegas) addScore(st, 5); }
    st.moves++; st.started = true;
    checkWin(st);
    return true;
  }
  function canRecycle(st) { return st.stock.length === 0 && st.waste.length > 0 && st.recycles < recycleLimit(st); }
  function canDraw(st) { return !st.won && (st.stock.length > 0 || canRecycle(st)); }
  function draw(st) {
    if (!canDraw(st)) return false;
    pushHistory(st);
    if (st.stock.length === 0) {
      st.stock = st.waste.reverse().map(function (c) { c.up = false; return c; });
      st.waste = []; st.recycles++;
      if (st.scoring === 'standard') addScore(st, st.drawCount === 1 ? -100 : (st.recycles >= 3 ? -20 : 0));
    } else {
      for (var i = 0; i < st.drawCount && st.stock.length; i++) { var c = st.stock.pop(); c.up = true; st.waste.push(c); }
    }
    st.moves++; st.started = true;
    return true;
  }
  function undo(st) {
    if (!st.history.length) return false;
    var prev = st.history.pop(), keepElapsed = st.elapsed, hist = st.history;
    Object.keys(st).forEach(function (k) { delete st[k]; });
    Object.assign(st, prev); st.history = hist;
    st.elapsed = keepElapsed; // time keeps running
    return true;
  }
  function checkWin(st) {
    if (st.found.every(function (f) { return f.length === 13; })) {
      st.won = true;
      if (st.scoring === 'standard' && st.timed && st.elapsed >= 30) { st.bonus = Math.floor(700000 / st.elapsed); st.score += st.bonus; }
    }
    return st.won;
  }
  // Called once per second of play. Applies timed-scoring penalty (-2 per 10s, standard only).
  function tick(st, secs) {
    if (st.won || !st.started) return;
    st.elapsed += secs || 1;
    if (st.timed && st.scoring === 'standard') {
      var due = Math.floor(st.elapsed / 10);
      while (st.timePenalized < due) { st.timePenalized++; addScore(st, -2); }
    }
  }
  function foundationTargetFor(st, from) {
    for (var i = 0; i < 4; i++) if (canMove(st, { pile: from.pile, idx: from.idx, n: 1 }, { pile: 'found', idx: i })) return { pile: 'found', idx: i };
    return null;
  }
  // Best destination for a tap: foundation first, then tableau (prefer non-empty piles).
  function bestTarget(st, from) {
    if ((from.n || 1) === 1) { var f = foundationTargetFor(st, from); if (f) return f; }
    var empty = null;
    for (var i = 0; i < 7; i++) {
      var to = { pile: 'tab', idx: i };
      if (canMove(st, from, to)) { if (st.tab[i].length) return to; if (!empty) empty = to; }
    }
    // don't shuffle a king from one empty-bottomed column to another
    if (empty && from.pile === 'tab' && st.tab[from.idx].length === (from.n || 1)) return null;
    return empty;
  }
  function allMoves(st) {
    var out = [];
    function add(from, to, pri) { if (canMove(st, from, to)) out.push({ from: from, to: to, pri: pri }); }
    var srcs = [{ pile: 'waste', idx: 0, n: 1 }];
    st.tab.forEach(function (p, i) {
      for (var n = 1; n <= p.length; n++) { if (!p[p.length - n].up) break; srcs.push({ pile: 'tab', idx: i, n: n }); }
    });
    var kingWaiting = (st.waste.length && top(st.waste).r === 13) || st.tab.some(function (p) {
      for (var i = 1; i < p.length; i++) if (p[i].up && p[i].r === 13 && !p[i - 1].up) return true; return false; });
    srcs.forEach(function (from) {
      var p = pileOf(st, from); if (!p.length) return;
      for (var f = 0; f < 4; f++) add(from, { pile: 'found', idx: f }, 100);
      for (var t = 0; t < 7; t++) {
        if (from.pile === 'tab' && from.idx === t) continue;
        var reveals = from.pile === 'tab' && p.length > from.n && !p[p.length - from.n - 1].up;
        var wholeKingMove = from.pile === 'tab' && p.length === from.n && st.tab[t].length === 0;
        if (wholeKingMove) continue;
        // pointless: moving a partial run onto a same-ranked equivalent spot without revealing
        var pri = from.pile === 'waste' ? 50 : reveals ? 80 : (p.length === from.n && kingWaiting ? 70 : 0);
        if (pri === 0) continue;
        add(from, { pile: 'tab', idx: t }, pri);
      }
    });
    out.sort(function (a, b) { return b.pri - a.pri; });
    return out;
  }
  function hint(st) {
    var m = allMoves(st);
    if (m.length) return m[0];
    if (canDraw(st)) return { draw: true };
    return null;
  }
  function canAutoComplete(st) {
    return !st.won && st.stock.length === 0 && st.waste.length === 0 &&
      st.tab.every(function (p) { return p.every(function (c) { return c.up; }); });
  }
  // One step of auto-complete: returns the move made or null.
  function autoStep(st) {
    var best = null;
    st.tab.forEach(function (p, i) {
      var c = top(p); if (!c) return;
      var t = foundationTargetFor(st, { pile: 'tab', idx: i });
      if (t && (!best || c.r < best.r)) best = { r: c.r, from: { pile: 'tab', idx: i, n: 1 }, to: t };
    });
    if (best) { move(st, best.from, best.to); return best; }
    return null;
  }
  var api = { newGame: newGame, canMove: canMove, move: move, draw: draw, canDraw: canDraw, canRecycle: canRecycle,
    undo: undo, tick: tick, hint: hint, allMoves: allMoves, bestTarget: bestTarget, canAutoComplete: canAutoComplete,
    autoStep: autoStep, recycleLimit: recycleLimit, isRed: isRed, checkWin: checkWin, makeDeck: makeDeck, SUITS: SUITS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Klondike = api;
})(this);
