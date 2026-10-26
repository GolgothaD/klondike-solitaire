(function () {
  'use strict';
  var K = window.Klondike, Art = window.CardArt, THEMES = window.THEMES, A = window.SFX, FX = window.FX;
  var KEY = 'klondike.v1.';
  var $ = function (id) { return document.getElementById(id); };
  var board = $('board');
  function load(k, d) { try { var v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { if (k === 'game' && v.history && v.history.length > 20) { v.history = v.history.slice(-20); save(k, v); } } }

  var DEF = { v: 3, drawCount: 1, scoring: 'standard', timed: true, tapMove: true, autoFinish: true, back: 'auto', theme: 'casino',
    sfx: 80, music: 45, haptics: true, winStyle: 'auto', level: 'easy', hints: true };
  var settings = load('settings', {});
  if (settings.v !== 3) settings = Object.assign({}, settings, { v: 3, back: 'auto', theme: 'casino' }); // upgrade: themes pick the back
  settings = Object.assign({}, DEF, settings);
  var STATS0 = { played: 0, won: 0, bestTime: null, bestScore: null, fewestMoves: null, streak: 0, bestStreak: 0, dailyWon: 0, dailyStreak: 0, lastDaily: '', dailyDates: [], lv: {} };
  var stats = Object.assign({}, STATS0, load('stats', {})); stats.lv = stats.lv || {};
  // ---------- difficulty ----------
  // Deal hardness comes from verified-winnable seed pools (levels.js, built offline by tools/pools.js);
  // the level also sets hint / undo / redeal allowances. Draw 1/3 and scoring stay the player's choice.
  var INF = Infinity, LEVELS = [
    { id: 'beginner', name: 'Beginner', rec: INF, hints: INF, undo: INF },
    { id: 'easy', name: 'Easy', rec: INF, hints: INF, undo: INF },
    { id: 'medium', name: 'Medium', rec: 3, hints: 10, undo: 50 },
    { id: 'hard', name: 'Hard', rec: 2, hints: 5, undo: 25 },
    { id: 'expert', name: 'Expert', rec: 1, hints: 2, undo: 10 },
    { id: 'grandmaster', name: 'Grandmaster', rec: 0, hints: 0, undo: 3, gmHints: 2 }];
  function lvById(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return LEVELS[1]; }
  function hintAllowance(lv) { if (!settings.hints) return 0; return lv.id === 'grandmaster' ? lv.gmHints : lv.hints; }
  function poolFor(lv, draw) { var P = window.LEVEL_POOLS; return P && P[draw] && P[draw][lv.id] && P[draw][lv.id].length ? P[draw][lv.id] : null; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function lvStat(id) { return stats.lv[id] || (stats.lv[id] = { p: 0, w: 0 }); }
  var params = new URLSearchParams(location.search);
  var st, els = {}, slots = {}, L = {}, busy = false, prevPile = {}, prevUp = {}, theme = THEMES.byId(settings.theme);
  var counted = false;

  function buzz(p) { if (settings.haptics && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } }
  function sfx(n, o) { A && A.play(n, o); }

  // ---------- themes ----------
  var bgFlip = false;
  function applyTheme(id, silent) {
    theme = THEMES.byId(id); settings.theme = theme.id;
    var r = document.documentElement.style;
    r.setProperty('--accent', theme.accent); r.setProperty('--accent2', theme.accent2); r.setProperty('--ui', theme.ui);
    r.setProperty('--glow', theme.glow); r.setProperty('--slot', theme.slot);
    $('shade').style.background = theme.shade;
    var big = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1) > 2700 || Math.max(innerWidth, innerHeight) * (window.devicePixelRatio || 1) > 2700;
    var url = 'bg/' + theme.id + (big ? '_4k' : '') + '.webp', next = bgFlip ? $('bgA') : $('bgB'), prev = bgFlip ? $('bgB') : $('bgA');
    var im = new Image(); im.onload = im.onerror = function () {
      next.style.backgroundImage = 'url(' + url + ')'; next.classList.add('on'); prev.classList.remove('on'); bgFlip = !bgFlip;
    }; im.src = url;
    document.querySelector('meta[name=theme-color]').setAttribute('content', theme.meta || '#0b0f14');
    if (Art.setFaceTheme) Art.setFaceTheme(theme.id);
    FX.setTheme(theme); if (window.ThemeCursor) ThemeCursor.set(theme.id);
    A.config({ sfx: settings.sfx / 100, music: settings.music / 100, flavor: theme.sfx });
    A.setMusic(theme.music);
    document.body.dataset.theme = theme.id;
    if (st && !silent) render();
  }
  function backKey() { return settings.back === 'auto' ? theme.back : settings.back; }

  // ---------- game lifecycle ----------
  function deal(seed, daily, levelId) {
    var picked = levelId || settings.level, rnd = picked === 'random';
    if (rnd) picked = LEVELS[Math.floor(Math.random() * LEVELS.length)].id;
    var lv = lvById(picked), pool = poolFor(lv, settings.drawCount), perm = 0, h;
    if (seed == null && pool) {
      if (daily) { h = hash(daily + ':' + lv.id + ':' + settings.drawCount); seed = pool[h % pool.length]; perm = (h >>> 16) & 3; }
      else { seed = pool[Math.floor(Math.random() * pool.length)]; perm = Math.floor(Math.random() * 4); }
    } else if (seed == null && daily) seed = dailySeed(daily) + LEVELS.indexOf(lv);
    st = K.newGame({ seed: seed, drawCount: settings.drawCount, scoring: settings.scoring, timed: settings.timed, maxRecycles: lv.rec, perm: perm });
    st.level = lv.id; st.randomLevel = rnd; st.hintsLeft = hintAllowance(lv); st.undoLeft = lv.undo; st.verified = !!pool;
    if (daily) st.daily = daily;
    counted = false; combo = 0; held = null; persist(); build(); render('deal');
  }
  function countPlayed() { if (!counted && st.started) { counted = true; st.counted = true; stats.played++; if (st.level) lvStat(st.level).p++; save('stats', stats); } }
  function abandon() { if (st && st.started && !st.won) { stats.streak = 0; save('stats', stats); } }
  function persist() { var copy = Object.assign({}, st); copy.history = st.history.slice(-300); save('game', copy); }
  function nearWin() { // test/demo deal: one drag away from auto-complete
    st = K.newGame({ seed: 1, drawCount: settings.drawCount, scoring: settings.scoring, timed: settings.timed });
    var C = function (s, r, up) { return { id: K.SUITS[s] + r, s: s, r: r, up: up !== false }; };
    var upTo = [11, 11, 12, 11];
    st.found = upTo.map(function (n, s) { var a = []; for (var r = 1; r <= n; r++) a.push(C(s, r)); return a; });
    st.stock = []; st.waste = [];
    st.tab = [[C(0, 13)], [C(1, 13), C(0, 12)], [C(3, 13), C(1, 12)], [C(3, 12, false), C(2, 13)], [], [], []];
    if (st.scoring === 'vegas') st.score = -52 + 45 * 5;
    counted = false; build(); render(true);
  }
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dailySeed(s) { return +s.replace(/-/g, '') * 7919 + 13; }
  function dailyKeyLevel(s) { return s.level; } // every level has its own daily; the streak counts any of them once per day
  function startDaily(levelId) {
    abandon(); hideWinFx(); closeAll(); var d = todayStr(), lv = lvById(levelId || (settings.level === 'random' ? 'medium' : settings.level));
    deal(null, d, lv.id); lvDone(d, lv.id) ; toast('Daily deal · ' + lv.name + ' · ' + d);
  }
  function lvDone(d, id) { return (stats.dailyLv || []).indexOf(d + ':' + id) >= 0; }

  // ---------- layout ----------
  var MIN_UP_FULL = 0.175, MIN_UP_COMPACT = 0.27, MIN_DOWN = 0.05;
  function layout() {
    var W = board.clientWidth, H = board.clientHeight;
    var wide = W / H >= 1.9 && H < 560;
    var gap = wide ? Math.max(5, Math.min(10, W * 0.01)) : Math.max(4, Math.min(16, W * 0.014));
    var cw = Math.floor(wide ? Math.min((W - gap * 12) / 10, 110) : Math.min((W - gap * 8) / 7, 128));
    function geom(cw) {
      var ch = Math.round(cw * 1.4), compact = cw < 74 || wide, top = Math.round(gap * 1.1);
      var tabTop = wide ? top : Math.round(top + ch + gap * (H > W ? 2.2 : 1.4));
      var minUp = ch * (compact ? MIN_UP_COMPACT : MIN_UP_FULL);
      return { cw: cw, ch: ch, compact: compact, top: top, tabTop: tabTop, minUp: minUp, need: tabTop + ch + 6 * MIN_DOWN * ch + 12 * minUp + gap };
    }
    var g = geom(cw);
    while (g.need > H && cw > 30) g = geom(--cw);
    L = { W: W, H: H, gap: gap, cw: g.cw, ch: g.ch, compact: g.compact, wide: wide, top: g.top, tabTop: g.tabTop,
      minUp: g.minUp, minDown: g.ch * MIN_DOWN, down: g.ch * (g.compact ? 0.13 : 0.11), up: g.ch * (g.compact ? 0.34 : 0.25) };
    if (wide) {
      var total = cw * 10 + gap * 10;
      L.left = Math.round((W - total) / 2 + cw + gap * 1.5);
      L.sideL = L.left - cw - gap * 1.5; L.sideR = L.left + 7 * (cw + gap) + gap * 0.5;
    } else L.left = Math.round((W - (cw * 7 + gap * 6)) / 2);
  }
  function colX(i) { return L.left + i * (L.cw + L.gap); }
  function stockXY() { return L.wide ? { x: L.sideL, y: L.top } : { x: colX(0), y: L.top }; }
  function wasteXY() { return L.wide ? { x: L.sideL, y: L.top + L.ch + L.gap } : { x: colX(1), y: L.top }; }
  function foundXY(f) {
    if (L.wide) return { x: L.sideR + (f % 2) * (L.cw + L.gap), y: L.top + Math.floor(f / 2) * (L.ch + L.gap) };
    return { x: colX(3 + f), y: L.top };
  }
  function tabOffsets(p) {
    var nd = 0, nu = 0; p.forEach(function (c, i) { if (i < p.length - 1) { if (c.up) nu++; else nd++; } });
    var avail = L.H - L.tabTop - L.gap - L.ch, d = L.down, u = L.up;
    if (nd * d + nu * u > avail) {
      d = Math.max(L.minDown, nd ? Math.min(d, (avail - nu * u) / nd) : d);
      if (nd * d + nu * u > avail && nu) u = Math.max(L.minUp, (avail - nd * d) / nu);
    }
    return { d: d, u: u };
  }
  function positions() {
    var pos = {}, z = 1;
    var sp = stockXY(), wp = wasteXY();
    st.stock.forEach(function (c, i) { var dpt = Math.floor(i / 8); pos[c.id] = { x: sp.x + dpt, y: sp.y + dpt, z: z++, pile: 'stock' }; });
    var fan = L.wide ? L.ch * 0.28 : L.cw * (L.compact ? 0.22 : 0.2), wl = st.waste.length;
    st.waste.forEach(function (c, i) {
      var k = st.drawCount === 3 ? Math.max(0, i - (wl - 3)) : 0;
      if (st.drawCount === 3 && wl < 3) k = i;
      pos[c.id] = L.wide ? { x: wp.x, y: wp.y + k * fan, z: z++, pile: 'waste' } : { x: wp.x + k * fan, y: wp.y, z: z++, pile: 'waste' };
    });
    st.found.forEach(function (p, f) { p.forEach(function (c) { var fp = foundXY(f); pos[c.id] = { x: fp.x, y: fp.y, z: z++, pile: 'f' + f }; }); });
    st.tab.forEach(function (p, t) {
      var o = tabOffsets(p), yy = L.tabTop;
      p.forEach(function (c) { pos[c.id] = { x: colX(t), y: yy, z: 100 + z++, pile: 't' + t }; yy += c.up ? o.u : o.d; });
    });
    return pos;
  }

  // ---------- DOM ----------
  function build() {
    board.innerHTML = ''; els = {}; slots = {}; prevPile = {}; prevUp = {};
    function slot(key, cls, txt) { var d = document.createElement('div'); d.className = 'slot ' + cls; d.dataset.slot = key; d.textContent = txt || ''; board.appendChild(d); slots[key] = d; }
    slot('stock', 'stock'); slot('waste', 'waste');
    for (var f = 0; f < 4; f++) slot('f' + f, 'found', 'A');
    for (var t = 0; t < 7; t++) slot('t' + t, 'tab', 'K');
    allCards().forEach(function (c) {
      var d = document.createElement('div'); d.className = 'card'; d.dataset.id = c.id;
      var im = document.createElement('img'); im.alt = ''; im.draggable = false; d.appendChild(im);
      board.appendChild(d); els[c.id] = d;
    });
  }
  function allCards() { return [].concat(st.stock, st.waste, st.found[0], st.found[1], st.found[2], st.found[3], st.tab[0], st.tab[1], st.tab[2], st.tab[3], st.tab[4], st.tab[5], st.tab[6]); }
  function placeSlot(key, x, y) { var s = slots[key].style; s.left = x + 'px'; s.top = y + 'px'; s.width = L.cw + 'px'; s.height = L.ch + 'px'; s.fontSize = (L.cw * 0.42) + 'px'; }
  function tf(x, y, extra) { return 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)' + (extra || ''); }
  function srcFor(c) { return c.up ? Art.faceURI(c.s, c.r, L.compact) : Art.backURI(backKey()); }
  function setSrc(e, src) { var im = e.firstChild; if (im.getAttribute('src') !== src) im.setAttribute('src', src); }
  function flipTo(e, src, delay) {
    setTimeout(function () {
      e.classList.remove('flip'); void e.offsetWidth; e.classList.add('flip');
      setTimeout(function () { setSrc(e, src); }, 140);
      setTimeout(function () { e.classList.remove('flip'); }, 320);
    }, delay || 0);
  }
  var dealTimer = 0;
  function render(mode) {
    layout();
    var instant = mode === true || mode === 'instant', dealing = mode === 'deal';
    if (instant || dealing) board.classList.add('notrans');
    var sp = stockXY(), wp = wasteXY(); placeSlot('stock', sp.x, sp.y); placeSlot('waste', wp.x, wp.y);
    slots.waste.style.visibility = 'hidden';
    for (var f = 0; f < 4; f++) { var fp = foundXY(f); placeSlot('f' + f, fp.x, fp.y); }
    for (var t = 0; t < 7; t++) placeSlot('t' + t, colX(t), L.tabTop);
    var lim = K.recycleLimit(st);
    slots.stock.textContent = st.stock.length ? '' : (st.waste.length && st.recycles < lim ? '↻' : (st.waste.length ? '✕' : ''));
    var pos = positions();
    if (dealing) return renderDeal(pos, sp);
    allCards().forEach(function (c) {
      var e = els[c.id], p = pos[c.id], src = srcFor(c);
      e.style.width = L.cw + 'px'; e.style.height = L.ch + 'px';
      if (!instant && prevUp[c.id] != null && prevUp[c.id] !== c.up) flipTo(e, src, 60); else setSrc(e, src);
      prevUp[c.id] = c.up;
      var moved = prevPile[c.id] && prevPile[c.id] !== p.pile;
      prevPile[c.id] = p.pile;
      e.style.zIndex = moved && !instant ? 1000 + p.z : p.z;
      if (moved && !instant) { (function (e, z) { setTimeout(function () { if (!e.classList.contains('drag')) e.style.zIndex = z; }, 280); })(e, p.z); }
      e.style.transform = tf(p.x, p.y);
      e.dataset.x = p.x; e.dataset.y = p.y;
      e.style.visibility = '';
    });
    if (held) liftHeld();
    if (instant) { void board.offsetWidth; board.classList.remove('notrans'); }
    status(); updateAuto(); placeCursor();
  }
  function renderDeal(pos, sp) {
    // all cards start face down on the stock, then fly out in real deal order and flip on landing
    clearTimeout(dealTimer);
    allCards().forEach(function (c) {
      var e = els[c.id], p = pos[c.id];
      e.style.width = L.cw + 'px'; e.style.height = L.ch + 'px'; e.style.transitionDelay = '';
      setSrc(e, Art.backURI(backKey())); e.style.zIndex = p.z; e.style.visibility = '';
      e.style.transform = tf(sp.x, sp.y); e.dataset.x = p.x; e.dataset.y = p.y;
      prevPile[c.id] = p.pile; prevUp[c.id] = c.up;
    });
    void board.offsetWidth; board.classList.remove('notrans');
    var order = [], step = 34;
    for (var r = 0; r < 7; r++) for (var c = r; c < 7; c++) order.push(st.tab[c][r]);
    busy = true; sfx('shuffle', { gain: 0.8 });
    order.forEach(function (cd, i) {
      var e = els[cd.id], p = pos[cd.id];
      e.style.transitionDelay = (i * step + 120) + 'ms';
      e.style.transform = tf(p.x, p.y);
      setTimeout(function () { sfx('deal', { gain: 0.55, gap: 0.045, pan: (p.x / L.W - 0.5) * 0.6 }); }, i * step + 140);
      if (cd.up) flipTo(e, srcFor(cd), i * step + 330);
    });
    var total = order.length * step + 520;
    dealTimer = setTimeout(function () { order.forEach(function (cd) { if (els[cd.id]) els[cd.id].style.transitionDelay = ''; }); busy = false; status(); updateAuto(); }, total);
    status(); placeCursor();
  }
  function fmtTime(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  var lastShown = {};
  function setChip(id, chip, txt) { var el = $(id); if (el.textContent !== txt) { if (lastShown[id] != null && id !== 'sTime') { $(chip).classList.remove('bump'); void $(chip).offsetWidth; $(chip).classList.add('bump'); } el.textContent = txt; lastShown[id] = txt; } }
  function status() {
    $('cScore').style.display = st.scoring === 'none' ? 'none' : '';
    setChip('sScore', 'cScore', st.scoring === 'vegas' ? (st.score < 0 ? '−$' + (-st.score) : '$' + st.score) : '' + st.score);
    $('cTime').style.display = st.timed ? '' : 'none';
    setChip('sTime', 'cTime', fmtTime(st.elapsed));
    setChip('sMoves', 'cMoves', '' + st.moves);
    $('cDaily').hidden = !st.daily;
    $('bUndo').disabled = !st.history.length || busy;
    var lv = lvById(st.level || 'easy');
    $('cLevel').hidden = !st.level; $('sLevel').textContent = (st.randomLevel ? '🎲 ' : '') + lv.name;
    $('bHint').hidden = !settings.hints;
    var hl = st.hintsLeft, ul = st.undoLeft;
    $('bHint').querySelector('span').textContent = 'Hint' + (hl != null && isFinite(hl) ? ' ' + hl : '');
    $('bUndo').querySelector('span').textContent = 'Undo' + (ul != null && isFinite(ul) ? ' ' + ul : '');
  }
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1900); }
  function shake(id) { var e = els[id]; if (!e) return; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); sfx('bad', { gain: 0.5, gap: 0.25 }); buzz([12, 40, 12]); }
  function popAt(x, y, txt) { var d = document.createElement('div'); d.className = 'pop'; d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; board.appendChild(d); setTimeout(function () { d.remove(); }, 1000); }
  function boardToScreen(x, y) { var r = board.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; }

  // ---------- actions + juice ----------
  var combo = 0, lastGood = 0, PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  function feedback(before, from, to, ids) {
    var good = to.pile === 'found' || (from.pile === 'tab' && st.tab[from.idx].length && before.revealCount < countUp());
    var now = performance.now();
    if (good) { combo = now - lastGood < 6000 ? combo + 1 : 1; lastGood = now; }
    var lead = els[ids[0]], x = +lead.dataset.x + L.cw / 2, y = +lead.dataset.y + L.ch / 2;
    if (to.pile === 'found') {
      sfx('place', { gain: 0.9 });
      var landed = top(st.found[to.idx]);
      if (landed && landed.r === 1) aceFx(to.idx);
      sfx('chime', { rate: Math.pow(2, PENTA[Math.min(combo - 1, PENTA.length - 1)] / 12), gain: 0.55, gap: 0.03, pan: (x / L.W - 0.5) * 0.6, delay: 0.12 });
      setTimeout(function () { var s = boardToScreen(x, y); FX.burst(s.x, s.y, 18 + Math.min(combo, 6) * 4); lead.classList.remove('land'); void lead.offsetWidth; lead.classList.add('land'); }, 230);
      buzz(14);
    } else { sfx('place', { pan: (x / L.W - 0.5) * 0.6 }); buzz(8); }
    var d = st.score - before.score;
    if (d > 0 && st.scoring !== 'none') setTimeout(function () { popAt(x, y - L.ch * 0.2, (st.scoring === 'vegas' ? '+$' : '+') + d); }, 200);
    if (good && combo >= 3) showCombo(combo);
  }
  function countUp() { var n = 0; st.tab.forEach(function (p) { p.forEach(function (c) { if (c.up) n++; }); }); return n; }
  var comboT;
  function showCombo(n) {
    var words = ['', '', '', 'Nice!', 'Great!', 'Superb!', 'Brilliant!', 'Unstoppable!'];
    var c = $('combo'); c.innerHTML = (words[Math.min(n, 7)] || 'Unstoppable!') + '<small>Combo ×' + n + '</small>';
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); clearTimeout(comboT); comboT = setTimeout(function () { c.classList.remove('on'); }, 1250);
  }
  function after() {
    countPlayed(); persist(); render();
    if (st.won) return onWin();
    if (K.canAutoComplete(st)) autoComplete();
  }
  function doMove(from, to) {
    if (busy) return false;
    var before = { score: st.score, revealCount: countUp() }, src = pile(from), ids = src.slice(src.length - (from.n || 1)).map(function (c) { return c.id; });
    if (K.move(st, from, to)) { after(); feedback(before, from, to, ids); return true; }
    return false;
  }
  function doDraw() {
    if (busy || st.won) return;
    var recycle = !st.stock.length;
    if (K.draw(st)) { after(); if (recycle) sfx('shuffle', { gain: 0.7 }); else sfx('slide', { gain: 0.7 }); buzz(6); }
    else if (st.waste.length) { toast(st.scoring === 'vegas' ? 'No more passes through the deck' : 'No cards left'); sfx('bad', { gain: 0.4 }); }
  }
  function doUndo() {
    if (busy || st.won) return; cancelHold();
    var u = (st.undos || 0) + 1, keep = { hintsLeft: st.hintsLeft, undoLeft: st.undoLeft, level: st.level, randomLevel: st.randomLevel, verified: st.verified, daily: st.daily, counted: st.counted };
    if (st.undoLeft != null && st.undoLeft !== null && st.undoLeft <= 0) { toast('No undos left at ' + lvById(st.level).name); sfx('bad', { gain: 0.3 }); return; }
    if (K.undo(st)) { Object.assign(st, keep); if (st.undoLeft != null) st.undoLeft--; st.undos = u; status(); combo = 0; persist(); render(); sfx('slide', { rate: 0.85, gain: 0.6 }); buzz(6); }
  }
  function autoComplete() {
    busy = true; status(); $('bAuto').hidden = true;
    (function step() {
      var m = K.autoStep(st);
      if (m) { render(); finishFx(m); if (st.won) { busy = false; persist(); return onWin(); } setTimeout(step, 110); }
      else { busy = false; persist(); render(); }
    })();
  }
  function finishFx(m) {
    var c = top(st.found[m.to.idx]), e = els[c.id];
    sfx('place', { gain: 0.7, gap: 0.03 }); sfx('chime', { rate: Math.pow(2, PENTA[(c.r - 1) % PENTA.length] / 12), gain: 0.35, gap: 0.03, delay: 0.1 });
    setTimeout(function () { var s = boardToScreen(+e.dataset.x + L.cw / 2, +e.dataset.y + L.ch / 2); FX.burst(s.x, s.y, 10); }, 220);
  }
  function top(p) { return p[p.length - 1]; }
  function aceFx(f) { // themed flourish when an ace lands on its foundation (never blocks input)
    var fp = foundXY(f);
    setTimeout(function () {
      var s = boardToScreen(fp.x + L.cw / 2, fp.y + L.ch / 2), s2 = boardToScreen(fp.x + L.cw, fp.y + L.ch);
      FX.ace(s.x, s.y, (s2.x - s.x) * 2, (s2.y - s.y) * 2); window.__aceCount = (window.__aceCount || 0) + 1;
      sfx('chime', { rate: 0.5, gain: 0.22, gap: 0.05 }); sfx('chime', { rate: 0.667, gain: 0.16, gap: 0.05, delay: 0.09 });
    }, 200);
  }
  // Greedy finish: once every tableau card is face up, play foundations first, then waste → tableau, then draw.
  function greedyStep(s) {
    var best = null;
    var srcs = [{ pile: 'waste', idx: 0, n: 1 }]; for (var i = 0; i < 7; i++) srcs.push({ pile: 'tab', idx: i, n: 1 });
    srcs.forEach(function (from) {
      var p = from.pile === 'waste' ? s.waste : s.tab[from.idx], c = top(p); if (!c) return;
      for (var f = 0; f < 4; f++) if (K.canMove(s, from, { pile: 'found', idx: f }) && (!best || c.r < best.r)) best = { r: c.r, from: from, to: { pile: 'found', idx: f } };
    });
    if (best) { K.move(s, best.from, best.to); return best; }
    if (s.waste.length) for (var t = 0; t < 7; t++) if (K.canMove(s, { pile: 'waste', idx: 0, n: 1 }, { pile: 'tab', idx: t })) { var m = { from: { pile: 'waste', idx: 0, n: 1 }, to: { pile: 'tab', idx: t } }; K.move(s, m.from, m.to); return m; }
    if (K.draw(s)) return { draw: true };
    return null;
  }
  function allUp() { return st.tab.every(function (p) { return p.every(function (c) { return c.up; }); }); }
  function solvable() {
    if (!allUp() || st.won) return false;
    var s = JSON.parse(JSON.stringify(Object.assign({}, st, { history: [] }))), idle = 0;
    for (var n = 0; n < 1500 && !s.won; n++) {
      var m = greedyStep(s); if (!m) return false;
      idle = m.draw ? idle + 1 : 0; if (idle > s.stock.length + s.waste.length + 3) return false;
      s.history = [];
    }
    return s.won;
  }
  function updateAuto() {
    var show = settings.autoFinish && !busy && !st.won && !K.canAutoComplete(st) && solvable();
    var b = $('bAuto'); if (b.hidden === !show) return; b.hidden = !show;
    if (show) { sfx('tap', { gain: 0.5 }); buzz(10); }
  }
  function autoFinish() {
    if (busy || st.won) return; $('bAuto').hidden = true; cancelHold(); busy = true; status();
    (function step() {
      var m = greedyStep(st);
      if (!m) { busy = false; persist(); render(); return; }
      render();
      if (m.to && m.to.pile === 'found') finishFx(m); else sfx('slide', { gain: 0.5, gap: 0.03 });
      if (st.won) { busy = false; persist(); return onWin(); }
      setTimeout(step, m.draw ? 70 : 105);
    })();
  }
  var hintIdx = 0, hintKey = '';
  function doHint() {
    if (busy || st.won || !settings.hints) return;
    if (st.hintsLeft != null && st.hintsLeft <= 0) { toast('No hints left at ' + lvById(st.level).name); sfx('bad', { gain: 0.3 }); return; }
    if (st.hintsLeft != null && isFinite(st.hintsLeft)) st.hintsLeft--;
    status();
    clearHints(); sfx('tap', { gain: 0.5 });
    var moves = K.allMoves(st), key = st.moves + ':' + st.history.length;
    if (key !== hintKey) { hintKey = key; hintIdx = 0; }
    if (!moves.length) {
      if (K.canDraw(st)) { (st.stock.length && els[st.stock[st.stock.length - 1].id] || slots.stock).classList.add('hint'); }
      else toast('No moves left — try Undo or a new game');
      return setTimeout(clearHints, 1500);
    }
    var m = moves[hintIdx++ % moves.length], src = pile(m.from);
    src.slice(src.length - (m.from.n || 1)).forEach(function (c) { els[c.id].classList.add('hint'); });
    var dst = pile(m.to), dt = dst[dst.length - 1];
    (dt ? els[dt.id] : slots[(m.to.pile === 'found' ? 'f' : 't') + m.to.idx]).classList.add('hint');
    setTimeout(clearHints, 1500);
  }
  function clearHints() { board.querySelectorAll('.hint').forEach(function (e) { e.classList.remove('hint'); }); }
  function pile(ref) { return ref.pile === 'tab' ? st.tab[ref.idx] : ref.pile === 'found' ? st.found[ref.idx] : ref.pile === 'waste' ? st.waste : st.stock; }
  function locate(id) {
    var r = null;
    st.tab.forEach(function (p, i) { p.forEach(function (c, j) { if (c.id === id) r = { pile: 'tab', idx: i, j: j, n: p.length - j, card: c }; }); });
    st.found.forEach(function (p, i) { p.forEach(function (c, j) { if (c.id === id) r = { pile: 'found', idx: i, j: j, n: p.length - j, card: c }; }); });
    st.waste.forEach(function (c, j) { if (c.id === id) r = { pile: 'waste', idx: 0, j: j, n: st.waste.length - j, card: c }; });
    st.stock.forEach(function (c, j) { if (c.id === id) r = { pile: 'stock', idx: 0, j: j, card: c }; });
    return r;
  }
  function tapMove(loc) {
    var from = { pile: loc.pile, idx: loc.idx, n: loc.n };
    var to = K.bestTarget(st, from);
    if (!to || !doMove(from, to)) shake(loc.card.id);
  }

  // ---------- pointer input: lift, tilt, magnetic drop ----------
  var drag = null, lastTap = { id: null, t: 0 }, dragRaf = 0;
  board.addEventListener('pointerdown', function (ev) {
    hidePadCursor();
    if (busy || st.won || drag || (ev.button && ev.button !== 0)) return;
    var ce = ev.target.closest('.card'), se = ev.target.closest('.slot');
    if (!ce) { if (se && se.dataset.slot === 'stock') { ev.preventDefault(); doDraw(); } return; }
    var loc = locate(ce.dataset.id); if (!loc) return;
    ev.preventDefault(); cancelHold();
    if (loc.pile === 'stock') { doDraw(); return; }
    if (!loc.card.up || (loc.pile !== 'tab' && loc.n !== 1)) return;
    var cards = pile(loc).slice(loc.j);
    var rc = ce.getBoundingClientRect(), gx = Math.max(0, Math.min(1, (ev.clientX - rc.left) / rc.width)), gy = Math.max(0, Math.min(1, (ev.clientY - rc.top) / rc.height));
    drag = { loc: loc, ids: cards.map(function (c) { return c.id; }), x0: ev.clientX, y0: ev.clientY, moved: false, pid: ev.pointerId, vx: 0, tilt: 0, lt: performance.now(), lx: ev.clientX, target: null,
      gx: gx, gy: gy, ang: 0, av: 0, pvx: 0, pdx: 0, pdy: 0, ft: 0, lag: [] };
    try { board.setPointerCapture(ev.pointerId); } catch (e) { }
  });
  board.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.pid) return;
    var dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) {
      drag.moved = true; clearHints(); sfx('slide', { gain: 0.6 }); buzz(8);
      document.documentElement.classList.add('dragging');
      var y0 = +els[drag.ids[0]].dataset.y, px = drag.gx * L.cw, py = drag.gy * L.ch;
      drag.ids.forEach(function (id, i) { var e = els[id]; e.classList.add('drag'); e.classList.remove('settle'); e.style.zIndex = 5000 + i;
        // every card in the stack pivots around the grab point on the lead card
        e.style.transformOrigin = px.toFixed(1) + 'px ' + (py - (+e.dataset.y - y0)).toFixed(1) + 'px'; drag.lag.push({ x: 0, y: 0 }); });
      // lever arm: grab off-centre and gravity hangs the card; grab dead-centre and it just tilts like before
      var rx = L.cw / 2 - px, ry = L.ch / 2 - py; drag.beta = Math.atan2(rx, ry); drag.lever = Math.hypot(rx, ry); drag.arm = Math.min(1, Math.hypot(rx / (L.cw / 2), ry / (L.ch / 2)) / 1.2);
      if (REDUCE) drag.arm *= 0.25;
      drag.ft = performance.now();
    }
    var now = performance.now(), dt = Math.max(1, now - drag.lt);
    drag.vx = drag.vx * 0.7 + ((ev.clientX - drag.lx) / dt) * 0.3; drag.lt = now; drag.lx = ev.clientX;
    drag.dx = dx; drag.dy = dy;
    if (!dragRaf) dragRaf = requestAnimationFrame(dragFrame);
  });
  var REDUCE = false; try { REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  function dragFrame(now) {
    dragRaf = 0; if (!drag || !drag.moved) return;
    now = now || performance.now(); var dt = Math.min(0.033, Math.max(0.001, (now - drag.ft) / 1000)); drag.ft = now;
    // classic velocity tilt (kept), faded down as the lever arm grows
    var want = Math.max(-14, Math.min(14, drag.vx * 9));
    drag.tilt += (want - drag.tilt) * 0.35; drag.vx *= 0.85;
    // damped pendulum around the grab point: gravity pulls the centre under the finger, horizontal acceleration swings it
    var vxNow = (drag.dx - drag.pdx) / dt, ax = (vxNow - drag.pvx) / dt; drag.pvx += (vxNow - drag.pvx) * 0.5; drag.pdx = drag.dx;
    ax = Math.max(-12000, Math.min(12000, ax));
    var th = drag.ang, b = drag.beta, Lp = Math.max(12, drag.lever);
    var acc = drag.arm * (-55 * Math.sin(th - b) + (ax / Lp) * 0.35 * Math.cos(th - b)) - drag.av * 6.5; // rad/s², ~1.2 Hz, damped
    drag.av += acc * dt; drag.ang += drag.av * dt; drag.ang = Math.max(-1.3, Math.min(1.3, drag.ang));
    var rot = drag.ang * 57.2958 + drag.tilt * (1 - drag.arm * 0.6);
    var lift = -Math.round(L.ch * 0.04);
    drag.ids.forEach(function (id, i) { var e = els[id], g = drag.lag[i], k = i ? Math.max(0.35, 0.7 - i * 0.06) : 1;
      g.x += (drag.dx - g.x) * k; g.y += (drag.dy - g.y) * k; // trailing cards follow with a slight lag
      e.style.transform = tf(+e.dataset.x + g.x, +e.dataset.y + g.y + lift, ' rotate(' + (rot * (1 - i * 0.04)).toFixed(2) + 'deg) scale(1.06)'); });
    window.__dragAng = rot;
    var t = magnetTarget(); if ((t && t.key) !== (drag.target && drag.target.key)) { markTarget(drag.target, false); markTarget(t, true); drag.target = t; if (t) buzz(4); }
    dragRaf = requestAnimationFrame(dragFrame); // keep swinging while held
  }
  function markTarget(t, on) { if (!t) return; var dst = pile(t.ref), last = dst[dst.length - 1]; var el = last ? els[last.id] : slots[(t.ref.pile === 'found' ? 'f' : 't') + t.ref.idx]; el.classList.toggle('drop-ok', on); }
  function magnetTarget() {
    var lead = els[drag.ids[0]], lx = +lead.dataset.x + drag.dx, ly = +lead.dataset.y + drag.dy, cx = lx + L.cw / 2, cy = ly + L.ch / 2;
    var from = { pile: drag.loc.pile, idx: drag.loc.idx, n: drag.loc.n }, best = null, bestS = -1e9;
    targets().forEach(function (t) {
      if (!K.canMove(st, from, t.ref)) return;
      var ox = Math.min(lx + L.cw, t.x + t.w) - Math.max(lx, t.x), oy = Math.min(ly + L.ch, t.y + t.h) - Math.max(ly, t.y);
      var area = ox > 0 && oy > 0 ? ox * oy : 0, dist = Math.hypot(cx - (t.x + t.w / 2), cy - (t.y + t.h / 2));
      if (!area && dist > L.cw * 1.25) return; // magnet radius
      var score = area - dist * L.cw * 0.5;
      if (score > bestS) { bestS = score; best = t; }
    });
    return best;
  }
  function endDrag(ev, cancel) {
    if (!drag || ev.pointerId !== drag.pid) return;
    var d = drag; drag = null; cancelAnimationFrame(dragRaf); dragRaf = 0; markTarget(d.target, false); document.documentElement.classList.remove('dragging');
    d.ids.forEach(function (id) { var e = els[id]; e.classList.remove('drag'); e.classList.add('settle'); e.style.transformOrigin = ''; setTimeout(function () { e.classList.remove('settle'); }, 360); });
    if (!d.moved) {
      if (cancel) return;
      var now = Date.now(), dbl = lastTap.id === d.loc.card.id && now - lastTap.t < 380;
      lastTap = { id: d.loc.card.id, t: now };
      if (settings.tapMove || dbl) { lastTap.id = null; tapMove(d.loc); }
      return;
    }
    if (!cancel && d.target) { var from = { pile: d.loc.pile, idx: d.loc.idx, n: d.loc.n }; if (doMove(from, d.target.ref)) return; }
    if (!cancel) { sfx('slide', { gain: 0.4, rate: 0.9 }); }
    render();
  }
  board.addEventListener('pointerup', function (e) { endDrag(e, false); });
  board.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  board.addEventListener('dblclick', function (e) { e.preventDefault(); });
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  function targets() {
    var out = [];
    for (var f = 0; f < 4; f++) { var fp = foundXY(f); out.push({ key: 'f' + f, ref: { pile: 'found', idx: f }, x: fp.x, y: fp.y, w: L.cw, h: L.ch }); }
    st.tab.forEach(function (p, t) {
      var lastY = p.length ? +els[p[p.length - 1].id].dataset.y : L.tabTop;
      out.push({ key: 't' + t, ref: { pile: 'tab', idx: t }, x: colX(t), y: lastY, w: L.cw, h: L.ch });
    });
    return out;
  }

  // ---------- win ----------
  function onWin() {
    if (st.winRecorded) return; st.winRecorded = true;
    cancelHold(); hidePadCursor(); $('bAuto').hidden = true;
    countPlayed(); if (st.level) lvStat(st.level).w++;
    var best = {};
    stats.won++; stats.streak++; if (stats.streak > stats.bestStreak) { stats.bestStreak = stats.streak; best.streak = stats.streak > 1; }
    if (st.timed && (stats.bestTime == null || st.elapsed < stats.bestTime)) { stats.bestTime = st.elapsed; best.time = true; }
    if (st.scoring !== 'none' && (stats.bestScore == null || st.score > stats.bestScore)) { stats.bestScore = st.score; best.score = true; }
    if (stats.fewestMoves == null || st.moves < stats.fewestMoves) { stats.fewestMoves = st.moves; best.moves = true; }
    if (st.daily && stats.dailyDates.indexOf(st.daily) < 0 && (!st.level || st.level === dailyKeyLevel(st))) {
      var y = new Date(st.daily + 'T12:00'); y.setDate(y.getDate() - 1);
      stats.dailyStreak = stats.lastDaily === todayStr(y) ? stats.dailyStreak + 1 : 1;
      stats.lastDaily = st.daily; stats.dailyWon++; stats.dailyDates.push(st.daily); stats.dailyDates = stats.dailyDates.slice(-60);
    }
    if (st.daily && st.level) { stats.dailyLv = (stats.dailyLv || []); if (stats.dailyLv.indexOf(st.daily + ':' + st.level) < 0) stats.dailyLv.push(st.daily + ':' + st.level); stats.dailyLv = stats.dailyLv.slice(-200); }
    save('stats', stats); persist(); status();
    var stars = 1 + (st.moves <= 130 ? 1 : 0) + (!st.undos ? 1 : 0);
    $('winStars').innerHTML = [0, 1, 2].map(function (i) { return '<span class="' + (i < stars ? '' : 'off') + '" style="animation-delay:' + (0.25 + i * 0.18) + 's">★</span>'; }).join('');
    function tile(v, label, b) { return '<div class="stat"><b>' + v + '</b><small>' + label + '</small>' + (b ? '<br><span class="badge">NEW BEST</span>' : '') + '</div>'; }
    $('winText').innerHTML = (st.timed ? tile(fmtTime(st.elapsed), 'Time', best.time) : '') + tile(st.moves, 'Moves', best.moves) +
      (st.scoring !== 'none' ? tile((st.scoring === 'vegas' ? '$' : '') + st.score, 'Score' + (st.bonus ? ' (+' + st.bonus + ' bonus)' : ''), best.score) : '') +
      tile(stats.streak, 'Win streak', best.streak) + (st.daily ? tile('✓', 'Daily · ' + stats.dailyStreak + ' day streak') : '');
    var style = settings.winStyle === 'auto' ? (theme.classic ? 'classic' : 'modern') : settings.winStyle;
    sfx('win', { gain: 0.8, gap: 1 }); buzz([30, 60, 30, 60, 80]);
    window.__winStyle = style;
    if (style === 'classic') setTimeout(winAnimation, 350);
    else { setTimeout(function () { FX.celebrate(5); fanFoundations(); }, 250); setTimeout(function () { window.__winAnimDone = true; open('mWin'); }, 1700); }
  }
  function fanFoundations() { // kings hop in a wave
    for (var f = 0; f < 4; f++) (function (f) { var c = top(st.found[f]); if (!c) return; setTimeout(function () { var e = els[c.id]; e.classList.remove('land'); void e.offsetWidth; e.classList.add('land'); var s = boardToScreen(+e.dataset.x + L.cw / 2, +e.dataset.y + L.ch / 2); FX.burst(s.x, s.y, 30); }, f * 140); })(f);
  }
  var bounce = null;
  function winAnimation() {
    var cv = $('winfx'), dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.display = 'block';
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var br = board.getBoundingClientRect(), queue = [];
    for (var r = 13; r >= 1; r--) for (var f = 0; f < 4; f++) { var c = st.found[f][r - 1]; if (c) queue.push({ c: c, f: f }); }
    var imgs = {}; queue.forEach(function (q) { var im = new Image(); im.src = Art.faceURI(q.c.s, q.c.r, L.compact); imgs[q.c.id] = im; });
    var cur = null, floor = innerHeight, w = L.cw, h = L.ch, done = false, raf;
    window.__winAnimStarted = true;
    function launch() {
      var q = queue.shift(); if (!q) { finish(); return; }
      els[q.c.id].style.visibility = 'hidden';
      var dir = Math.random() < 0.5 ? -1 : 1;
      var fp = foundXY(q.f); cur = { im: imgs[q.c.id], x: br.left + fp.x, y: br.top + fp.y, vx: dir * (2.5 + Math.random() * 5), vy: -(Math.random() * 7) - 1 };
      sfx('flip', { gain: 0.35, gap: 0.08 });
    }
    function frame() {
      if (done) return;
      for (var k = 0; k < 2; k++) {
        if (!cur) launch(); if (done) return;
        cur.vy += 0.42; cur.x += cur.vx; cur.y += cur.vy;
        if (cur.y + h > floor) { cur.y = floor - h; cur.vy = -cur.vy * (0.7 + Math.random() * 0.12); if (Math.abs(cur.vy) < 2) cur.vy = -2; }
        if (cur.im.complete) ctx.drawImage(cur.im, cur.x, cur.y, w, h);
        if (cur.x + w < 0 || cur.x > innerWidth) cur = null;
      }
      raf = requestAnimationFrame(frame);
    }
    function finish() { if (done) return; done = true; cancelAnimationFrame(raf); bounce = null; setTimeout(function () { window.__winAnimDone = true; open('mWin'); }, 250); }
    bounce = { stop: function () { queue = []; cur = null; finish(); } };
    raf = requestAnimationFrame(frame);
  }
  $('winfx').addEventListener('pointerdown', function () { if (bounce) bounce.stop(); else $('winfx').style.display = 'none'; });
  function hideWinFx() { var cv = $('winfx'); cv.style.display = 'none'; FX.clear(); if (bounce) { var b = bounce; bounce = null; b.stop(); } }

  // ---------- modals ----------
  function open(id) { $(id).hidden = false; sfx('tap', { gain: 0.45 }); padFocusFirst($(id)); }
  function close(id) { $(id).hidden = true; }
  function closeAll() { document.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; }); }
  function topModal() { var ms = [].filter.call(document.querySelectorAll('.modal'), function (m) { return !m.hidden; }); return ms[ms.length - 1] || null; }
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('pointerdown', function (e) { if (e.target === m) m.hidden = true; });
    m.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { m.hidden = true; sfx('tap', { gain: 0.4 }); }); });
  });
  function requestNew() { cancelHold(); if (st.started && !st.won) open('mConfirm'); else newDeal(); }
  function newDeal() { abandon(); hideWinFx(); closeAll(); if (pendingDaily) { pendingDaily = false; return startDaily(pendingDailyLv); } deal(); dealToast(); }
  function dealToast() { toast((st.randomLevel ? 'Random → ' : '') + lvById(st.level).name + ' · Draw ' + st.drawCount + ' · ' + ({ standard: 'Standard', vegas: 'Vegas', none: 'No' })[st.scoring] + ' scoring'); }
  var pendingDailyLv = null;
  // new-game + daily pickers
  function lvButtons(daily) {
    var d = todayStr();
    return LEVELS.map(function (l) { return '<button data-lv="' + l.id + '" class="' + (!daily && settings.level === l.id ? 'sel' : '') + '"><b>' + l.name + '</b><small>' + (daily ? (lvDone(d, l.id) ? '✓ solved' : 'Today') : lvBlurb(l)) + '</small></button>'; }).join('') +
      (daily ? '' : '<button data-lv="random" class="' + (settings.level === 'random' ? 'sel' : '') + '"><b>🎲 Random</b><small>Surprise me each deal</small></button>');
  }
  function lvBlurb(l) { var f = function (n) { return isFinite(n) ? n : '∞'; }; return 'Hints ' + f(l.id === 'grandmaster' ? (settings.hints ? l.gmHints : 0) : (settings.hints ? l.hints : 0)) + ' · Undo ' + f(l.undo) + ' · Redeals ' + f(l.rec); }
  function openNew() { cancelHold(); $('lvGrid').innerHTML = lvButtons(false); $('lvMode').textContent = 'Draw ' + settings.drawCount + ' · ' + ({ standard: 'Standard', vegas: 'Vegas', none: 'No' })[settings.scoring] + ' scoring (change in Settings)'; open('mNew'); }
  function openDaily() { cancelHold(); $('dlGrid').innerHTML = lvButtons(true); open('mDaily'); }
  $('lvGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-lv]'); if (!b) return; settings.level = b.dataset.lv; save('settings', settings); sfx('tap', { gain: 0.4 });
    $('lvGrid').querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); }); });
  $('lvDeal').addEventListener('click', function () { close('mNew'); pendingDaily = false; requestNew(); });
  $('dlGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-lv]'); if (!b) return; close('mDaily');
    if (st.started && !st.won) { pendingDaily = true; pendingDailyLv = b.dataset.lv; open('mConfirm'); } else startDaily(b.dataset.lv); });
  var pendingDaily = false;
  $('cNewYes').addEventListener('click', newDeal);
  $('wNew').addEventListener('click', newDeal);
  $('bNew').addEventListener('click', function () { pendingDaily = false; requestNew(); });
  $('bUndo').addEventListener('click', doUndo);
  $('bHint').addEventListener('click', doHint);
  $('bTheme').addEventListener('click', openThemes);
  $('bMenu').addEventListener('click', openMenu);
  $('bAuto').addEventListener('click', autoFinish);
  function openMenu() {
    cancelHold();
    var done = stats.dailyDates.indexOf(todayStr()) >= 0;
    $('dailyTag').textContent = done ? '✓ solved' : todayStr().slice(5).replace('-', '/');
    open('mMenu');
  }
  $('mMenu').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var a = b.dataset.act; close('mMenu');
    if (a === 'resume') return;
    if (a === 'new') openNew();
    if (a === 'daily') openDaily();
    if (a === 'themes') openThemes();
    if (a === 'stats') { renderStats(); open('mStats'); }
    if (a === 'opts') openOpts();
    if (a === 'help') open('mHelp');
    if (a === 'credits') open('mCredits');
  });
  function openThemes() {
    cancelHold();
    $('themeGrid').innerHTML = THEMES.map(function (t) {
      return '<button class="th' + (t.id === theme.id ? ' sel' : '') + '" data-theme="' + t.id + '"><span class="pv" style="background-image:url(bg/' + t.id + '_t.webp)"></span>' +
        '<span class="cards"><img alt="" src="' + Art.backURI(t.back) + '"><img alt="" src="' + Art.faceURI(1, 1, false, t.id) + '"></span>' +
        '<span class="chk">✓</span><span class="sw" style="background:' + t.accent + '"></span><span class="lab"><b>' + t.name + '</b><small>' + t.sub + '</small></span></button>';
    }).join('');
    open('mThemes');
  }
  $('themeGrid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme]'); if (!b) return;
    applyTheme(b.dataset.theme); save('settings', settings);
    $('themeGrid').querySelectorAll('.th').forEach(function (x) { x.classList.toggle('sel', x === b); });
    sfx('flip', { gain: 0.6 }); buzz(8);
  });
  function renderStats() {
    var pct = stats.played ? Math.round(stats.won / stats.played * 100) : 0;
    var rows = [['Played', stats.played], ['Won', stats.won], ['Win rate', pct + '%'], ['Streak', stats.streak], ['Best streak', stats.bestStreak],
      ['Best time', stats.bestTime == null ? '—' : fmtTime(stats.bestTime)], ['Fewest moves', stats.fewestMoves == null ? '—' : stats.fewestMoves],
      ['Best score', stats.bestScore == null ? '—' : stats.bestScore], ['Dailies won', stats.dailyWon]];
    $('statsT').innerHTML = rows.map(function (r) { return '<div class="stat"><b>' + r[1] + '</b><small>' + r[0] + '</small></div>'; }).join('') +
      '<div class="lvstats">' + LEVELS.map(function (l) { var x = lvStat(l.id); return '<div><span>' + l.name + '</span><b>' + x.w + ' / ' + x.p + '</b><small>' + (x.p ? Math.round(x.w / x.p * 100) : 0) + '%</small></div>'; }).join('') + '</div>';
  }
  $('stReset').addEventListener('click', function () { stats = Object.assign({}, STATS0, { dailyDates: [], lv: {} }); save('stats', stats); renderStats(); });
  var pend = {};
  function openOpts() {
    cancelHold();
    pend = { drawCount: settings.drawCount, scoring: settings.scoring, winStyle: settings.winStyle, back: settings.back, level: settings.level };
    $('oHints').checked = settings.hints;
    syncSegs();
    $('oTimed').checked = settings.timed; $('oTap').checked = settings.tapMove; $('oAutoFin').checked = settings.autoFinish; $('oHap').checked = settings.haptics;
    $('oSfx').value = settings.sfx; $('oMus').value = settings.music;
    $('backs').innerHTML = '<button data-back="auto" class="' + (pend.back === 'auto' ? 'sel' : '') + '"><span class="auto">Match theme</span>Auto</button>' + Object.keys(Art.BACKS).map(function (k) {
      return '<button data-back="' + k + '" class="' + (k === pend.back ? 'sel' : '') + '"><img alt="" src="' + Art.backURI(k) + '">' + Art.BACKS[k].name + '</button>';
    }).join('');
    open('mOpts');
  }
  function syncSegs() { document.querySelectorAll('.seg').forEach(function (s) { s.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', String(pend[s.dataset.opt]) === b.dataset.v); }); }); }
  document.querySelectorAll('.seg').forEach(function (s) { s.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var v = b.dataset.v; pend[s.dataset.opt] = s.dataset.opt === 'drawCount' ? +v : v; syncSegs(); sfx('tap', { gain: 0.4 }); }); });
  $('backs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; pend.back = b.dataset.back;
    $('backs').querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); }); sfx('tap', { gain: 0.4 });
  });
  $('oSfx').addEventListener('input', function () { A.config({ sfx: this.value / 100 }); });
  $('oSfx').addEventListener('change', function () { sfx('place'); });
  $('oMus').addEventListener('input', function () { A.config({ music: this.value / 100 }); });
  $('mOpts').querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { A.config({ sfx: settings.sfx / 100, music: settings.music / 100 }); }); });
  $('oSave').addEventListener('click', function () {
    var redeal = pend.drawCount !== settings.drawCount || pend.scoring !== settings.scoring || $('oTimed').checked !== settings.timed || pend.level !== settings.level;
    var hintsWas = settings.hints;
    Object.assign(settings, pend, { hints: $('oHints').checked, timed: $('oTimed').checked, tapMove: $('oTap').checked, autoFinish: $('oAutoFin').checked, haptics: $('oHap').checked, sfx: +$('oSfx').value, music: +$('oMus').value });
    save('settings', settings); close('mOpts'); A.config({ sfx: settings.sfx / 100, music: settings.music / 100 });
    if (!redeal && hintsWas !== settings.hints && st.level) { st.hintsLeft = hintAllowance(lvById(st.level)); if (!settings.hints) clearHints(); persist(); }
    if (redeal) { abandon(); deal(); dealToast(); }
    else render();
  });

  // ---------- gamepad + keyboard cursor ----------
  var cur = { zone: 'tab', col: 0, i: 0 }, held = null, padVisible = false;
  function firstUp(p) { for (var i = 0; i < p.length; i++) if (p[i].up) return i; return Math.max(0, p.length - 1); }
  function clampCur() {
    if (cur.zone === 'top') { if (cur.col === 2) cur.col = 1; cur.col = Math.max(0, Math.min(6, cur.col)); return; }
    var p = st.tab[cur.col]; if (!p.length) { cur.i = 0; return; } cur.i = Math.max(firstUp(p), Math.min(p.length - 1, cur.i));
  }
  function curRect() {
    clampCur();
    if (cur.zone === 'top') {
      var xy = cur.col === 0 ? stockXY() : cur.col === 1 ? wasteXY() : foundXY(cur.col - 3);
      if (cur.col === 1 && st.waste.length) { var e = els[top(st.waste).id]; xy = { x: +e.dataset.x, y: +e.dataset.y }; }
      return { x: xy.x, y: xy.y, w: L.cw, h: L.ch };
    }
    var p = st.tab[cur.col]; if (!p.length) return { x: colX(cur.col), y: L.tabTop, w: L.cw, h: L.ch };
    var a = els[p[cur.i].id], b = els[top(p).id];
    return { x: +a.dataset.x, y: +a.dataset.y, w: L.cw, h: +b.dataset.y - +a.dataset.y + L.ch };
  }
  function placeCursor() {
    if (!padVisible || !st) return; var r = curRect(), s = boardToScreen(r.x, r.y), c = $('padCursor'), lift = held ? -L.ch * 0.12 : 0;
    c.hidden = false; c.classList.toggle('hold', !!held);
    c.style.left = (s.x - 5) + 'px'; c.style.top = (s.y - 5 + (held && cur.zone === 'tab' && held.loc.pile === 'tab' && held.loc.idx === cur.col ? lift : 0)) + 'px'; c.style.width = (r.w + 10) + 'px'; c.style.height = (r.h + 10) + 'px';
  }
  function showPadCursor() { if (!padVisible) { padVisible = true; } placeCursor(); }
  function hidePadCursor() { padVisible = false; $('padCursor').hidden = true; }
  function navMove(dx, dy) {
    showPadCursor(); clampCur();
    if (dx) {
      cur.col += dx;
      if (cur.zone === 'top') { if (cur.col === 2) cur.col += dx; if (cur.col < 0) cur.col = 6; if (cur.col > 6) cur.col = 0; }
      else { cur.col = (cur.col + 7) % 7; cur.i = st.tab[cur.col].length - 1; }
    }
    if (dy < 0) { if (cur.zone === 'tab' && st.tab[cur.col].length && cur.i > firstUp(st.tab[cur.col])) cur.i--; else if (cur.zone === 'tab') { cur.zone = 'top'; if (cur.col === 2) cur.col = 1; } }
    if (dy > 0) { if (cur.zone === 'top') { cur.zone = 'tab'; cur.i = st.tab[cur.col].length - 1; } else if (cur.i < st.tab[cur.col].length - 1) cur.i++; }
    clampCur(); placeCursor(); sfx('tap', { gain: 0.25, gap: 0.04 });
  }
  function curLoc() {
    if (cur.zone === 'top') {
      if (cur.col === 0) return { stock: true };
      var p = cur.col === 1 ? st.waste : st.found[cur.col - 3], c = top(p); if (!c) return null;
      return { pile: cur.col === 1 ? 'waste' : 'found', idx: cur.col === 1 ? 0 : cur.col - 3, j: p.length - 1, n: 1, card: c };
    }
    var t = st.tab[cur.col]; if (!t.length || !t[cur.i].up) return null;
    return { pile: 'tab', idx: cur.col, j: cur.i, n: t.length - cur.i, card: t[cur.i] };
  }
  function liftHeld() { var dy = -L.ch * 0.12; held.ids.forEach(function (id, k) { var e = els[id]; e.classList.add('held'); if (!REDUCE) { e.classList.remove('sway'); void e.offsetWidth; e.classList.add('sway'); } e.style.zIndex = 5000 + k; e.style.transform = tf(+e.dataset.x, +e.dataset.y + dy, ' scale(1.04)'); }); }
  function cancelHold() { if (!held) return; held.ids.forEach(function (id) { if (els[id]) els[id].classList.remove('held'); }); held = null; if (st) render(); }
  function padA() {
    if (busy || st.won) return; showPadCursor(); clampCur();
    if (!held) {
      var loc = curLoc(); if (!loc) return sfx('bad', { gain: 0.3, gap: 0.2 });
      if (loc.stock) return doDraw();
      held = { loc: loc, ids: pile(loc).slice(loc.j).map(function (c) { return c.id; }) };
      liftHeld(); sfx('slide', { gain: 0.6 }); buzz(8); placeCursor(); return;
    }
    var to = cur.zone === 'tab' ? { pile: 'tab', idx: cur.col } : cur.col >= 3 ? { pile: 'found', idx: cur.col - 3 } : null;
    var h = held, from = { pile: h.loc.pile, idx: h.loc.idx, n: h.loc.n };
    if (to && to.pile === h.loc.pile && to.idx === h.loc.idx) return cancelHold();
    held.ids.forEach(function (id) { els[id].classList.remove('held'); }); held = null;
    if (!to || !doMove(from, to)) { render(); shake(h.ids[0]); return; }
    if (cur.zone === 'tab') cur.i = st.tab[cur.col].length - 1;
    placeCursor();
  }
  function padX() { if (busy || st.won) return; showPadCursor(); cancelHold(); var loc = curLoc(); if (!loc) return; if (loc.stock) return doDraw(); tapMove(loc); placeCursor(); }
  function padB() { if (held) return cancelHold(); doUndo(); }
  // spatial focus navigation for menus (pad + arrow keys)
  function focusables(m) { return [].filter.call(m.querySelectorAll('button,input,[tabindex]'), function (e) { return e.offsetParent !== null && !e.disabled; }); }
  function padFocusFirst(m) { if (!padVisible && !padUsed) return; var f = focusables(m); var s = m.querySelector('.sel,.primary') || f[0]; if (s) setFocus(s); }
  function setFocus(e) { document.querySelectorAll('.padfocus').forEach(function (x) { x.classList.remove('padfocus'); }); e.classList.add('padfocus'); e.focus({ preventScroll: false }); try { e.scrollIntoView({ block: 'nearest' }); } catch (er) { } }
  function modalNav(m, dx, dy) {
    var f = focusables(m), a = document.activeElement; if (!f.length) return;
    if (f.indexOf(a) < 0) return setFocus(f[0]);
    if (a.type === 'range' && dx) { a.value = +a.value + dx * 5; a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); return; }
    var r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, bs = 1e9;
    f.forEach(function (e) {
      if (e === a) return; var q = e.getBoundingClientRect(), ex = q.left + q.width / 2, ey = q.top + q.height / 2, vx = ex - cx, vy = ey - cy;
      var along = dx ? vx * dx : vy * dy, across = dx ? Math.abs(vy) : Math.abs(vx); if (along <= 2) return;
      var s = along + across * 2.5; if (s < bs) { bs = s; best = e; }
    });
    if (best) { setFocus(best); sfx('tap', { gain: 0.25, gap: 0.04 }); }
  }
  function modalA(m) { var a = document.activeElement; if (m.contains(a) && a !== m) { if (a.type === 'checkbox') a.click(); else if (a.click) a.click(); } }
  function modalBack(m) { if (m.id === 'mWin') return; m.hidden = true; sfx('tap', { gain: 0.35 }); }
  var padUsed = false;
  function act(name) { // shared action router for pad + keyboard
    var m = topModal();
    if (m) {
      if (name === 'up') return modalNav(m, 0, -1); if (name === 'down') return modalNav(m, 0, 1);
      if (name === 'left') return modalNav(m, -1, 0); if (name === 'right') return modalNav(m, 1, 0);
      if (name === 'a') return modalA(m); if (name === 'b' || name === 'start') return modalBack(m);
      return;
    }
    if ($('winfx').style.display === 'block') { if (bounce) bounce.stop(); return; }
    if (name === 'up') navMove(0, -1); else if (name === 'down') navMove(0, 1); else if (name === 'left') navMove(-1, 0); else if (name === 'right') navMove(1, 0);
    else if (name === 'a') padA(); else if (name === 'b') padB(); else if (name === 'x') padX(); else if (name === 'y') doHint();
    else if (name === 'lb') doUndo(); else if (name === 'rb') doDraw(); else if (name === 'start') openMenu(); else if (name === 'view') openThemes();
    else if (name === 'auto') { if (!$('bAuto').hidden) autoFinish(); }
  }
  var BTN = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 8: 'view', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right', 7: 'auto' };
  var prevB = {}, rep = {};
  function pollPads(now) {
    requestAnimationFrame(pollPads);
    if (!navigator.getGamepads) return;
    var pads = navigator.getGamepads(), pad = null; for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
    if (!pad) return;
    var state = {};
    Object.keys(BTN).forEach(function (k) { var b = pad.buttons[k]; state[BTN[k]] = !!(b && (b.pressed || b.value > 0.5)); });
    var ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (ax < -0.55) state.left = true; if (ax > 0.55) state.right = true; if (ay < -0.55) state.up = true; if (ay > 0.55) state.down = true;
    Object.keys(state).forEach(function (n) {
      if (state[n] && !prevB[n]) { padUsed = true; A.unlock(); act(n); rep[n] = now + 320; }
      else if (state[n] && /up|down|left|right/.test(n) && now > rep[n]) { act(n); rep[n] = now + 110; }
      prevB[n] = state[n];
    });
  }
  requestAnimationFrame(pollPads);
  addEventListener('gamepadconnected', function () { toast('Controller connected · D-pad to move, A to pick up'); padUsed = true; showPadCursor(); });

  document.addEventListener('keydown', function (e) {
    var k = e.key, m = topModal();
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); return doUndo(); }
    if (k === 'F2') { e.preventDefault(); return requestNew(); }
    if (k === 'Escape') { if (held) return cancelHold(); if (m) return modalBack(m); return openMenu(); }
    var dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
    if (dir) { if (m && document.activeElement && document.activeElement.type === 'range' && (dir === 'left' || dir === 'right')) return; e.preventDefault(); padUsed = true; return act(dir); }
    if (m) return; // let buttons in dialogs handle Enter/Space natively
    if (k === 'Enter') { e.preventDefault(); act('a'); }
    else if (k === ' ') { e.preventDefault(); doDraw(); }
    else if (k === 'h' || k === 'H') doHint();
    else if (k === 'a' || k === 'A') act('x');
    else if (k === 't' || k === 'T') openThemes();
    else if (k === 'f' || k === 'F') act('auto');
  });
  document.addEventListener('pointerdown', function () { document.querySelectorAll('.padfocus').forEach(function (x) { x.classList.remove('padfocus'); }); }, true);

  // ---------- timer, resize, lifecycle ----------
  setInterval(function () {
    if (!st || !st.started || st.won || document.hidden) return;
    K.tick(st, 1); status(); if (st.elapsed % 5 === 0) persist();
  }, 1000);
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { render(true); }, 60); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });

  // ---------- boot ----------
  if (params.has('theme')) settings.theme = params.get('theme');
  applyTheme(settings.theme, true);
  var saved = load('game', null);
  if (params.has('nearwin')) nearWin();
  else if (params.has('seed')) deal(+params.get('seed'), null, params.get('level'));
  else if (params.has('level')) deal(null, null, params.get('level'));
  else if (saved && saved.tab && !saved.won) { st = saved; st.history = st.history || []; counted = !!st.counted; build(); render(true); }
  else deal();
  window.SOL = { get state() { return st; }, layout: function () { return L; }, deal: deal, nearWin: nearWin, render: render, K: K,
    applyTheme: function (id) { applyTheme(id); save('settings', settings); }, settings: settings, solvable: solvable, autoFinish: autoFinish,
    act: act, get cursor() { return cur; }, get held() { return held; }, get busy() { return busy; }, startDaily: startDaily, LEVELS: LEVELS, openNew: openNew, openDaily: openDaily, doHint: doHint, stats: function () { return stats; } };
})();
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () { });
