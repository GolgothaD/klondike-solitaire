(function () {
  'use strict';
  var K = window.Klondike, Art = window.CardArt;
  var KEY = 'klondike.v1.';
  var $ = function (id) { return document.getElementById(id); };
  var board = $('board');
  function load(k, d) { try { var v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* quota: drop oldest undo */ if (k === 'game' && v.history && v.history.length > 20) { v.history = v.history.slice(-20); save(k, v); } } }

  var settings = Object.assign({ drawCount: 1, scoring: 'standard', timed: true, tapMove: true, showStatus: true, back: 'retro' }, load('settings', {}));
  var stats = Object.assign({ played: 0, won: 0, bestTime: null, bestScore: null, streak: 0, bestStreak: 0 }, load('stats', {}));
  var params = new URLSearchParams(location.search);
  var st, els = {}, slots = {}, L = {}, busy = false, prevPile = {};

  // ---------- game lifecycle ----------
  function deal(seed) {
    st = K.newGame({ seed: seed, drawCount: settings.drawCount, scoring: settings.scoring, timed: settings.timed });
    counted = false; persist(); build(); render(true);
  }
  var counted = false;
  function countPlayed() { if (!counted && st.started) { counted = true; st.counted = true; stats.played++; stats.streak = st.won ? stats.streak : stats.streak; save('stats', stats); } }
  function abandon() { if (st && st.started && !st.won) { stats.streak = 0; save('stats', stats); } }
  function persist() {
    var copy = Object.assign({}, st); copy.history = st.history.slice(-300); save('game', copy);
  }
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

  // ---------- layout ----------
  // Card size is the largest that still fits the worst legal column (6 face-down + K..A run)
  // with every rank index fully readable, so nothing ever overflows.
  var MIN_UP_FULL = 0.175, MIN_UP_COMPACT = 0.27, MIN_DOWN = 0.05;
  function layout() {
    var W = board.clientWidth, H = board.clientHeight;
    var wide = W / H >= 1.9 && H < 560; // landscape phones: side columns so the tableau gets full height
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
      // squeeze face-down cards first, then face-up ones, never below the readable minimum
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
    board.innerHTML = ''; els = {}; slots = {};
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
  function render(instant) {
    layout();
    if (instant) board.classList.add('notrans');
    var sp = stockXY(), wp = wasteXY(); placeSlot('stock', sp.x, sp.y); placeSlot('waste', wp.x, wp.y);
    slots.waste.style.visibility = 'hidden';
    for (var f = 0; f < 4; f++) { var fp = foundXY(f); placeSlot('f' + f, fp.x, fp.y); }
    for (var t = 0; t < 7; t++) placeSlot('t' + t, colX(t), L.tabTop);
    var lim = K.recycleLimit(st);
    slots.stock.textContent = st.stock.length ? '' : (st.waste.length && st.recycles < lim ? '↻' : (st.waste.length ? '✕' : ''));
    var pos = positions();
    allCards().forEach(function (c) {
      var e = els[c.id], p = pos[c.id];
      var src = c.up ? Art.faceURI(c.s, c.r, L.compact) : Art.backURI(settings.back);
      var im = e.firstChild; if (im.getAttribute('src') !== src) im.setAttribute('src', src);
      e.style.width = L.cw + 'px'; e.style.height = L.ch + 'px';
      var moved = prevPile[c.id] && prevPile[c.id] !== p.pile;
      prevPile[c.id] = p.pile;
      e.style.zIndex = moved && !instant ? 1000 + p.z : p.z;
      if (moved && !instant) { (function (e, z) { setTimeout(function () { if (!e.classList.contains('drag')) e.style.zIndex = z; }, 230); })(e, p.z); }
      e.style.transform = 'translate3d(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px,0)';
      e.dataset.x = p.x; e.dataset.y = p.y;
      e.style.visibility = '';
    });
    if (instant) { void board.offsetWidth; board.classList.remove('notrans'); }
    status();
  }
  function fmtTime(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function status() {
    var sc = $('sScore');
    sc.style.display = st.scoring === 'none' ? 'none' : '';
    sc.textContent = st.scoring === 'vegas' ? 'Score: ' + (st.score < 0 ? '−$' + (-st.score) : '$' + st.score) : 'Score: ' + st.score;
    $('sTime').style.display = st.timed ? '' : 'none';
    $('sTime').textContent = 'Time: ' + fmtTime(st.elapsed);
    $('sMoves').textContent = 'Moves: ' + st.moves;
    $('bUndo').disabled = !st.history.length || busy;
    document.body.classList.toggle('nostatus', !settings.showStatus);
  }
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1800); }
  function shake(id) { var e = els[id]; if (!e) return; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }

  // ---------- actions ----------
  function after() {
    countPlayed(); persist(); render();
    if (st.won) return onWin();
    if (K.canAutoComplete(st)) autoComplete();
  }
  function doMove(from, to) { if (busy) return false; if (K.move(st, from, to)) { after(); return true; } return false; }
  function doDraw() {
    if (busy || st.won) return;
    if (K.draw(st)) after();
    else if (st.waste.length) { toast(st.scoring === 'vegas' ? 'No more passes through the deck' : 'No cards left'); }
  }
  function doUndo() { if (busy || st.won) return; if (K.undo(st)) { persist(); render(); } }
  function autoComplete() {
    busy = true; status();
    (function step() {
      if (K.autoStep(st)) { render(); if (st.won) { busy = false; persist(); return onWin(); } setTimeout(step, 95); }
      else { busy = false; persist(); render(); }
    })();
  }
  var hintIdx = 0, hintKey = '';
  function doHint() {
    if (busy || st.won) return;
    clearHints();
    var moves = K.allMoves(st), key = st.moves + ':' + st.history.length;
    if (key !== hintKey) { hintKey = key; hintIdx = 0; }
    if (!moves.length) {
      if (K.canDraw(st)) { (st.stock.length && els[st.stock[st.stock.length - 1].id] || slots.stock).classList.add('hint'); }
      else toast('No moves left — try Undo or a new deal');
      return setTimeout(clearHints, 1300);
    }
    var m = moves[hintIdx++ % moves.length], src = pile(m.from);
    src.slice(src.length - (m.from.n || 1)).forEach(function (c) { els[c.id].classList.add('hint'); });
    var dst = pile(m.to), dt = dst[dst.length - 1];
    (dt ? els[dt.id] : slots[(m.to.pile === 'found' ? 'f' : 't') + m.to.idx]).classList.add('hint');
    setTimeout(clearHints, 1300);
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

  // ---------- pointer input (mouse + touch + pen) ----------
  var drag = null, lastTap = { id: null, t: 0 };
  board.addEventListener('pointerdown', function (ev) {
    if (busy || st.won || drag || (ev.button && ev.button !== 0)) return;
    var ce = ev.target.closest('.card'), se = ev.target.closest('.slot');
    if (!ce) { if (se && se.dataset.slot === 'stock') { ev.preventDefault(); doDraw(); } return; }
    var loc = locate(ce.dataset.id); if (!loc) return;
    ev.preventDefault();
    if (loc.pile === 'stock') { doDraw(); return; }
    if (!loc.card.up || (loc.pile !== 'tab' && loc.n !== 1)) return;
    var cards = pile(loc).slice(loc.j);
    drag = { loc: loc, ids: cards.map(function (c) { return c.id; }), x0: ev.clientX, y0: ev.clientY, moved: false, pid: ev.pointerId };
    try { board.setPointerCapture(ev.pointerId); } catch (e) { }
  });
  board.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.pid) return;
    var dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; clearHints(); drag.ids.forEach(function (id, i) { var e = els[id]; e.classList.add('drag'); e.style.zIndex = 5000 + i; }); }
    drag.dx = dx; drag.dy = dy;
    drag.ids.forEach(function (id) { var e = els[id]; e.style.transform = 'translate3d(' + (+e.dataset.x + dx) + 'px,' + (+e.dataset.y + dy) + 'px,0) scale(1.03)'; });
  });
  function endDrag(ev, cancel) {
    if (!drag || ev.pointerId !== drag.pid) return;
    var d = drag; drag = null;
    d.ids.forEach(function (id) { els[id].classList.remove('drag'); });
    if (!d.moved) {
      if (cancel) return;
      var now = Date.now(), dbl = lastTap.id === d.loc.card.id && now - lastTap.t < 380;
      lastTap = { id: d.loc.card.id, t: now };
      if (settings.tapMove || dbl) { lastTap.id = null; tapMove(d.loc); }
      return;
    }
    if (!cancel) {
      var lead = els[d.ids[0]], lx = +lead.dataset.x + d.dx, ly = +lead.dataset.y + d.dy;
      var from = { pile: d.loc.pile, idx: d.loc.idx, n: d.loc.n }, best = null, bestA = 0;
      targets().forEach(function (t) {
        var ox = Math.min(lx + L.cw, t.x + t.w) - Math.max(lx, t.x), oy = Math.min(ly + L.ch, t.y + t.h) - Math.max(ly, t.y);
        var a = ox > 0 && oy > 0 ? ox * oy : 0;
        if (a > bestA && K.canMove(st, from, t.ref)) { bestA = a; best = t.ref; }
      });
      if (best && doMove(from, best)) return;
    }
    render();
  }
  board.addEventListener('pointerup', function (e) { endDrag(e, false); });
  board.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  board.addEventListener('dblclick', function (e) { e.preventDefault(); });
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  function targets() {
    var out = [];
    for (var f = 0; f < 4; f++) { var fp = foundXY(f); out.push({ ref: { pile: 'found', idx: f }, x: fp.x, y: fp.y, w: L.cw, h: L.ch }); }
    st.tab.forEach(function (p, t) {
      var lastY = p.length ? +els[p[p.length - 1].id].dataset.y : L.tabTop;
      out.push({ ref: { pile: 'tab', idx: t }, x: colX(t), y: lastY, w: L.cw, h: L.ch });
    });
    return out;
  }

  // ---------- win ----------
  function onWin() {
    if (st.winRecorded) return; st.winRecorded = true;
    countPlayed();
    stats.won++; stats.streak++; stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    if (st.timed && (stats.bestTime == null || st.elapsed < stats.bestTime)) stats.bestTime = st.elapsed;
    if (st.scoring !== 'none' && (stats.bestScore == null || st.score > stats.bestScore)) stats.bestScore = st.score;
    save('stats', stats); persist(); status();
    var parts = ['Finished in ' + st.moves + ' moves'];
    if (st.timed) parts[0] += ' and ' + fmtTime(st.elapsed);
    if (st.scoring !== 'none') parts.push('Score: ' + (st.scoring === 'vegas' ? '$' : '') + st.score + (st.bonus ? ' (includes ' + st.bonus + ' time bonus)' : ''));
    $('winText').textContent = parts.join('. ') + '.';
    setTimeout(winAnimation, 350);
  }
  var fx = null;
  function winAnimation() {
    var cv = $('winfx'), dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.display = 'block';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
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
    }
    function frame() {
      if (done) return;
      for (var k = 0; k < 2; k++) { // two physics steps per frame keeps the trail dense
        if (!cur) launch(); if (done) return;
        cur.vy += 0.42; cur.x += cur.vx; cur.y += cur.vy;
        if (cur.y + h > floor) { cur.y = floor - h; cur.vy = -cur.vy * (0.7 + Math.random() * 0.12); if (Math.abs(cur.vy) < 2) cur.vy = -2; }
        if (cur.im.complete) ctx.drawImage(cur.im, cur.x, cur.y, w, h);
        if (cur.x + w < 0 || cur.x > innerWidth) cur = null;
      }
      raf = requestAnimationFrame(frame);
    }
    function finish() { if (done) return; done = true; cancelAnimationFrame(raf); fx = null; setTimeout(function () { window.__winAnimDone = true; open('mWin'); }, 250); }
    fx = { stop: function () { queue = []; cur = null; finish(); } };
    raf = requestAnimationFrame(frame);
  }
  $('winfx').addEventListener('pointerdown', function () { if (fx) fx.stop(); else { $('winfx').style.display = 'none'; } });
  function hideFx() { var cv = $('winfx'); cv.style.display = 'none'; cv.getContext('2d').setTransform(1, 0, 0, 1, 0, 0); }

  // ---------- modals ----------
  function open(id) { $(id).hidden = false; }
  function close(id) { $(id).hidden = true; }
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('pointerdown', function (e) { if (e.target === m) m.hidden = true; });
    m.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { m.hidden = true; }); });
  });
  function requestNew() {
    if (st.started && !st.won) open('mConfirm'); else newDeal();
  }
  function newDeal() { abandon(); hideFx(); close('mConfirm'); close('mWin'); deal(); }
  $('cNewYes').addEventListener('click', newDeal);
  $('wNew').addEventListener('click', newDeal);
  $('bNew').addEventListener('click', requestNew);
  $('bUndo').addEventListener('click', doUndo);
  $('bHint').addEventListener('click', doHint);
  $('bStats').addEventListener('click', function () { renderStats(); open('mStats'); });
  $('bOpts').addEventListener('click', openOpts);
  function renderStats() {
    var pct = stats.played ? Math.round(stats.won / stats.played * 100) : 0;
    var rows = [['Games played', stats.played], ['Games won', stats.won + ' (' + pct + '%)'], ['Best time', stats.bestTime == null ? '—' : fmtTime(stats.bestTime)],
      ['Best score', stats.bestScore == null ? '—' : stats.bestScore], ['Current streak', stats.streak], ['Best streak', stats.bestStreak]];
    $('statsT').innerHTML = rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('');
  }
  $('stReset').addEventListener('click', function () { stats = { played: 0, won: 0, bestTime: null, bestScore: null, streak: 0, bestStreak: 0 }; save('stats', stats); renderStats(); });
  var pendingBack;
  function openOpts() {
    document.querySelectorAll('input[name=draw]').forEach(function (i) { i.checked = +i.value === settings.drawCount; });
    document.querySelectorAll('input[name=scoring]').forEach(function (i) { i.checked = i.value === settings.scoring; });
    $('oTimed').checked = settings.timed; $('oTap').checked = settings.tapMove; $('oStatus').checked = settings.showStatus;
    pendingBack = settings.back;
    $('backs').innerHTML = Object.keys(Art.BACKS).map(function (k) {
      return '<button data-back="' + k + '" title="' + Art.BACKS[k].name + '" class="' + (k === pendingBack ? 'sel' : '') + '"><img alt="' + Art.BACKS[k].name + '" src="' + Art.backURI(k) + '"></button>';
    }).join('');
    open('mOpts');
  }
  $('backs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; pendingBack = b.dataset.back;
    $('backs').querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); });
  });
  $('oSave').addEventListener('click', function () {
    var draw = +document.querySelector('input[name=draw]:checked').value, scoring = document.querySelector('input[name=scoring]:checked').value;
    var redeal = draw !== settings.drawCount || scoring !== settings.scoring || $('oTimed').checked !== settings.timed;
    Object.assign(settings, { drawCount: draw, scoring: scoring, timed: $('oTimed').checked, tapMove: $('oTap').checked, showStatus: $('oStatus').checked, back: pendingBack });
    save('settings', settings); close('mOpts');
    if (redeal) { if (st.started && !st.won) { abandon(); } deal(); toast('New deal: Draw ' + draw + ', ' + ({ standard: 'Standard', vegas: 'Vegas', none: 'no' })[scoring] + ' scoring'); }
    else render();
  });

  // ---------- keyboard, timer, resize ----------
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
    else if (e.key === 'F2') { e.preventDefault(); requestNew(); }
    else if (e.key === 'h' || e.key === 'H') doHint();
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); doDraw(); }
    else if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; });
  });
  setInterval(function () {
    if (!st || !st.started || st.won || document.hidden) return;
    K.tick(st, 1); status(); if (st.elapsed % 5 === 0) persist();
  }, 1000);
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { render(true); }, 60); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });

  // ---------- boot ----------
  var saved = load('game', null);
  if (params.has('nearwin')) nearWin();
  else if (params.has('seed')) deal(+params.get('seed'));
  else if (saved && saved.tab && !saved.won) { st = saved; st.history = st.history || []; counted = !!st.counted; build(); render(true); }
  else deal();
  window.SOL = { get state() { return st; }, layout: function () { return L; }, deal: deal, nearWin: nearWin, render: render, K: K };
})();
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () {});
(function () { // reserve room for the host's injected badge instead of hiding it
  var had = null;
  function check() { var has = !!document.getElementById('nl-badge-frame'); if (has !== had) { had = has; document.body.classList.toggle('has-badge', has); window.SOL && window.SOL.render(true); } }
  check(); new MutationObserver(check).observe(document.body, { childList: true });
})();
