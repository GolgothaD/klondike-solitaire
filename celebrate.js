/* v6 win celebrations: one HD canvas scene per theme, starring that theme's own card faces.
   Cards are pre-rasterised once at device resolution (capped at a 4K-sized backing store) and every
   scene is driven by an accumulated, clamped clock, so a backgrounded tab pauses the show instead of
   skipping it. Particle counts scale with a quality factor that drops on slow devices or reduced motion.
   Tap, click or any key skips straight to the stats screen. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, cv, ctx, W, H, dpr, run = null;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = cl(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function eio(t) { t = cl(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var glowCache = {};
  function glow(c) { // soft radial sprite per colour, drawn additively
    if (glowCache[c]) return glowCache[c];
    var g = document.createElement('canvas'); g.width = g.height = 64; var x = g.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, '#fff'); r.addColorStop(.18, c); r.addColorStop(.45, c.length === 7 ? c + '55' : c); r.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = r; x.fillRect(0, 0, 64, 64); return (glowCache[c] = g);
  }
  // ---------- particles ----------
  function P(o) { if (run.parts.length > 900 * run.q) return null; o.life = o.max = o.life || 1; o.vx = o.vx || 0; o.vy = o.vy || 0; o.g = o.g || 0; o.drag = o.drag == null ? 1 : o.drag; o.r = o.r || 3; o.a = o.a == null ? 1 : o.a; o.rot = o.rot || 0; o.vr = o.vr || 0; o.ph = rnd(0, TAU); run.parts.push(o); return o; }
  function n(k) { return Math.max(1, Math.round(k * run.q)); }
  function burst(x, y, cs, k, sp, o) { for (var i = 0; i < n(k); i++) { var a = rnd(0, TAU), v = rnd(sp * .3, sp); P(Object.assign({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, drag: .985, life: rnd(.9, 1.6), r: rnd(2, 4.5), c: cs[i % cs.length], k: 'glow' }, o || {})); } }
  function stepParts(dt) {
    var ps = run.parts, i, p;
    for (i = ps.length - 1; i >= 0; i--) {
      p = ps[i]; p.life -= dt; if (p.life <= 0 || p.y > H + 80 || p.y < -200) { ps.splice(i, 1); continue; }
      var dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy *= dr; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.sway) p.x += Math.sin(run.t * p.sway + p.ph) * 30 * dt;
      var f = Math.min(1, p.life / Math.min(.5, p.max * .4)) * p.a; drawPart(p, f);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function drawPart(p, f) {
    var r = p.r;
    if (p.k === 'glow') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f; ctx.drawImage(glow(p.c), p.x - r * 4, p.y - r * 4, r * 8, r * 8); ctx.globalCompositeOperation = 'source-over'; return; }
    ctx.globalAlpha = f; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    if (p.k === 'coin') { var sx = Math.abs(Math.cos(run.t * 7 + p.ph)) + .08; ctx.scale(sx, 1); ctx.fillStyle = '#a8740f'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#f6cf55'; ctx.beginPath(); ctx.arc(0, 0, r * .84, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff3b8'; ctx.lineWidth = r * .12; ctx.beginPath(); ctx.arc(-r * .1, -r * .1, r * .55, 3.6, 5.2); ctx.stroke(); }
    else if (p.k === 'chip') { ctx.scale(1, Math.abs(Math.cos(run.t * 5 + p.ph)) * .8 + .2); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * .22; ctx.setLineDash([r * .5, r * .5]); ctx.beginPath(); ctx.arc(0, 0, r * .8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = r * .08; ctx.beginPath(); ctx.arc(0, 0, r * .5, 0, TAU); ctx.stroke(); }
    else if (p.k === 'petal') { ctx.scale(1, Math.abs(Math.sin(run.t * 3 + p.ph)) * .7 + .3); ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r, -r * .4, r * .7, r, 0, r); ctx.bezierCurveTo(-r * .7, r, -r, -r * .4, 0, -r); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-r * .15, -r * .3, r * .2, r * .45, 0, 0, TAU); ctx.fill(); }
    else if (p.k === 'leaf') { ctx.scale(Math.cos(run.t * 4 + p.ph), 1); ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.quadraticCurveTo(r, 0, 0, r * 1.3); ctx.quadraticCurveTo(-r, 0, 0, -r * 1.3); ctx.fill(); ctx.strokeStyle = 'rgba(0,40,0,.5)'; ctx.lineWidth = r * .1; ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(0, r * 1.5); ctx.stroke(); }
    else if (p.k === 'bubble') { ctx.strokeStyle = 'rgba(220,255,255,.8)'; ctx.lineWidth = Math.max(1, r * .14); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-r * .35, -r * .35, r * .22, 0, TAU); ctx.fill(); }
    else if (p.k === 'ember') { ctx.restore(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f * (.6 + .4 * Math.sin(run.t * 20 + p.ph)); ctx.drawImage(glow(p.c), p.x - r * 4, p.y - r * 4, r * 8, r * 8); ctx.globalCompositeOperation = 'source-over'; return; }
    else if (p.k === 'ring') { var q = 1 - p.life / p.max; ctx.restore(); ctx.globalAlpha = f * .8; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r + q * p.grow, (p.r + q * p.grow) * .38, 0, 0, TAU); ctx.stroke(); return; }
    ctx.restore();
  }
  // ---------- cards ----------
  function sprite(k) { return run.spr[k]; }
  function card(k, x, y, s, rot, a, sx, sy) { // k = index into run.cards; s = scale vs base width
    var sp = sprite(k); if (!sp || a <= 0.01) return;
    var w = run.CW * s, h = run.CH * s, pad = sp.pad * s;
    ctx.save(); ctx.globalAlpha = cl(a, 0, 1); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx != null) ctx.scale(sx, sy == null ? 1 : sy);
    ctx.drawImage(sp.c, -w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2); ctx.restore();
  }
  function startPos(k) { return run.cards[k].from; }
  function fly(k, t, t0, d, tx, ty, ts, trot) { // from foundation to target with an arcing ease; returns [x,y,s,rot] or null before launch
    var f = startPos(k), u = (t - t0) / d; if (u <= 0) return [f.x, f.y, run.s0, 0, false];
    var e = eio(u), arc = Math.sin(cl(u, 0, 1) * Math.PI) * -H * .12;
    return [lerp(f.x, tx, e), lerp(f.y, ty, e) + arc, lerp(run.s0, ts, e), lerp(0, trot || 0, e), true];
  }
  function veil(c, a) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  function idxOf(s, r) { for (var i = 0; i < run.cards.length; i++) if (run.cards[i].s === s && run.cards[i].r === r) return i; return 0; }
  // ---------- scenes ----------
  var S = {};
  S.casino = { dur: 7, init: function () { var R = [10, 11, 12, 13, 1].map(function (r) { return idxOf(1, r); }); run.flush = R; run.rest = run.cards.map(function (_, i) { return i; }).filter(function (i) { return R.indexOf(i) < 0; }); },
    frame: function (t, dt) {
      var cx = W / 2, cy = H * .5, R = Math.min(W, H) * .43;
      veil('#0b0600', .62 * ease(t / .8));
      // spotlight sweep
      ctx.globalCompositeOperation = 'lighter'; var sx = cx + Math.sin(t * 1.25) * W * .32, g = ctx.createRadialGradient(sx, cy, 0, sx, cy, H * .55);
      g.addColorStop(0, 'rgba(255,230,160,.30)'); g.addColorStop(.5, 'rgba(255,200,100,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var beam = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0); beam.addColorStop(0, 'rgba(255,235,180,0)'); beam.addColorStop(.5, 'rgba(255,235,180,.10)'); beam.addColorStop(1, 'rgba(255,235,180,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(sx - 30, 0); ctx.lineTo(sx + 30, 0); ctx.lineTo(sx + 200, H); ctx.lineTo(sx - 200, H); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      // the other 47 cards wheel around
      run.rest.forEach(function (k, j) { var a = j / run.rest.length * TAU + t * .35, tx = cx + Math.cos(a) * R, ty = cy + Math.sin(a) * R * .72, p = fly(k, t, .1 + j * .018, .9, tx, ty, .62, a + Math.PI / 2); card(k, p[0], p[1], p[2], p[3], 1); });
      // royal flush fans open in the centre
      var piv = { x: cx, y: cy + run.CH * 1.05 }, L = run.CH * 1.15;
      run.flush.forEach(function (k, j) { var t0 = 1.0 + j * .16, u = ease((t - t0 - .8) / .7), a = (j - 2) * .2 * u, tx = piv.x + Math.sin(a) * L, ty = piv.y - Math.cos(a) * L - run.CH * .1; var p = fly(k, t, t0, .8, tx, ty, 1.25 + .04 * Math.sin(t * 3 + j), a); card(k, p[0], p[1], p[2], p[3], 1); });
      if (t > 2.2 && !run.flashed) { run.flashed = 1; burst(cx, cy - run.CH * .2, ['#fff6d8', '#ffe08a', '#d9a93b'], 70, 420); }
      if (t > 1.8 && t < 5.6) { var m = 46 * run.q * dt, i; run.acc = (run.acc || 0) + m; while (run.acc > 1) { run.acc--; i = Math.random();
        if (i < .7) P({ k: 'coin', x: rnd(0, W), y: -20, vy: rnd(160, 380), vx: rnd(-40, 40), g: 520, life: 3, r: rnd(7, 12) * run.u });
        else P({ k: 'chip', x: rnd(0, W), y: -20, vy: rnd(140, 320), vx: rnd(-50, 50), g: 480, life: 3, r: rnd(9, 13) * run.u, c: ['#b3202f', '#1d4fb3', '#111', '#1e8a4a'][Math.floor(rnd(0, 4))] }); } }
      if (t > 2.3 && Math.random() < 6 * dt) { var fk = run.flush[Math.floor(rnd(0, 5))]; burst(cx + rnd(-1, 1) * run.CW, cy + rnd(-.3, .4) * run.CH, ['#fff'], 6, 80, { g: 0, life: .6, r: 2.5 }); }
    } };
  S.walnut = { dur: 7, frame: function (t, dt) {
      var cx = W / 2; veil('#120601', .6 * ease(t / .8));
      var fl = .34 + .08 * Math.sin(t * 9) + .06 * Math.sin(t * 23 + 1), g = ctx.createRadialGradient(cx, H * 1.08, 0, cx, H * 1.08, H * .95);
      g.addColorStop(0, 'rgba(255,150,50,' + fl + ')'); g.addColorStop(.45, 'rgba(200,70,10,' + fl * .45 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      var piv = { x: cx, y: H * 1.22 }, R = H * .78, span = Math.min(1.25, W / R * .9);
      run.cards.forEach(function (_, k) { var a = (k / 51 - .5) * span * 2, tx = piv.x + Math.sin(a) * R, ty = piv.y - Math.cos(a) * R; var p = fly(k, t, .15 + k * .055, .7, tx, ty, .82, a); card(k, p[0], p[1], p[2], p[3], 1); });
      if (Math.random() < 30 * run.q * dt) P({ k: 'ember', x: cx + rnd(-W * .45, W * .45), y: H + 10, vy: rnd(-120, -60), vx: rnd(-20, 20), sway: rnd(1, 3), life: rnd(3, 5), r: rnd(1.6, 3.2) * run.u, c: ['#ffb347', '#ff7a2a', '#ffd27a'][Math.floor(rnd(0, 3))] });
      // toast clink: two sparkles meet, then a shimmer sweeps the fan
      if (t > 3.6 && t < 4.3) { var u = ease((t - 3.6) / .6); [-1, 1].forEach(function (d) { var x = cx + d * (1 - u) * W * .3, y = H * .3; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#ffe3a6'), x - 30 * run.u, y - 30 * run.u, 60 * run.u, 60 * run.u); ctx.globalCompositeOperation = 'source-over'; }); }
      if (t > 4.25 && !run.clink) { run.clink = 1; burst(cx, H * .3, ['#fff0c8', '#ffd27a', '#ffffff'], 80, 360, { g: 60 }); }
      if (t > 4.3 && t < 5.8) { var sx = lerp(-W * .2, W * 1.2, (t - 4.3) / 1.5), sh = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0); sh.addColorStop(0, 'rgba(255,240,200,0)'); sh.addColorStop(.5, 'rgba(255,240,200,.28)'); sh.addColorStop(1, 'rgba(255,240,200,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    } };
  S.neon = { dur: 7, init: function () { var b = [], x = 0; while (x < W) { var w = rnd(30, 80) * run.u; b.push({ x: x, w: w, h: rnd(.12, .38) * H }); x += w + 4; } run.blds = b; },
    frame: function (t, dt) {
      var cx = W / 2, cy = H * .45, M = Math.max(W, H); veil('#05000f', .72 * ease(t / .6));
      ctx.lineJoin = 'round';
      for (var i = 0; i < 12; i++) { var z = ((i / 12) + t * .42) % 1, s = z * z, w = s * M * 1.5, h = w * .62, col = i % 2 ? '#ff4fb0' : '#38e6ff';
        ctx.globalAlpha = Math.min(1, z * 2.5) * (1 - z * .4); ctx.strokeStyle = col; ctx.lineWidth = (2 + s * 14) * run.u; ctx.globalAlpha *= .25; rr(cx - w / 2, cy - h / 2, w, h, h * .12); ctx.stroke();
        ctx.globalAlpha = Math.min(1, z * 2.5) * (1 - z * .4); ctx.lineWidth = (1 + s * 4) * run.u; ctx.strokeStyle = '#fff'; rr(cx - w / 2, cy - h / 2, w, h, h * .12); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // cards zoom out of the tunnel toward the viewer
      for (var k = 51; k >= 0; k--) { var L0 = .15 + k * .065, u = (t - L0) / 1.7; if (u < 0) { var f = startPos(k); card(k, f.x, f.y, run.s0, 0, 1); continue; } if (u > 1) continue;
        var a = hash(k) * TAU, pre = cl(u / .25, 0, 1), z2 = cl((u - .25) / .75, 0, 1), f2 = startPos(k);
        var x = lerp(f2.x, cx, ease(pre)) + Math.cos(a) * z2 * z2 * M * .7, y = lerp(f2.y, cy, ease(pre)) + Math.sin(a) * z2 * z2 * M * .45, s = lerp(run.s0, .35, ease(pre)) + z2 * z2 * 2.6;
        card(k, x, y, s, (hash(k + 9) - .5) * z2 * 1.4, 1 - cl((z2 - .8) / .2, 0, 1)); }
      // skyline lights up, then fireworks
      if (t > 2.8) { var up = ease((t - 2.8) / .8), base = H; ctx.fillStyle = '#07021a'; run.blds.forEach(function (b, j) { var y = base - b.h * up; ctx.fillRect(b.x, y, b.w, b.h + 2);
          var lit = cl((t - 3.2) / 1.6, 0, 1), ww = 5 * run.u, gap = 10 * run.u; for (var yy = y + gap; yy < base - gap; yy += gap) for (var xx = b.x + 5 * run.u; xx < b.x + b.w - ww; xx += gap) { var hh = hash(xx * 3.1 + yy * 7.7); if (hh < lit * .7) { ctx.fillStyle = hh < .2 ? '#ff4fb0' : hh < .45 ? '#38e6ff' : '#ffe9a8'; ctx.fillRect(xx, yy, ww, ww * 1.3); } }
          ctx.fillStyle = '#07021a'; ctx.strokeStyle = j % 2 ? '#ff4fb0' : '#38e6ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = .7 * up; ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); ctx.globalAlpha = 1; }); }
      if (t > 3.4 && t < 6.3 && t - (run.fw || 0) > .38) { run.fw = t; var fx = rnd(W * .15, W * .85), fy = rnd(H * .12, H * .42); burst(fx, fy, [['#38e6ff', '#fff'], ['#ff4fb0', '#fff'], ['#b47bff', '#ffe9a8']][Math.floor(rnd(0, 3))], 70, 330 * run.u, { g: 90 }); }
    } };
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function butterfly(x, y, s, t, c1, c2, rot) {
    var fl = Math.abs(Math.sin(t * 13)) * .8 + .2; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    [-1, 1].forEach(function (d) { ctx.save(); ctx.scale(d * fl, 1); var g = ctx.createLinearGradient(0, 0, 18, 0); g.addColorStop(0, c2); g.addColorStop(1, c1); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(8, -18, 22, -16, 18, -4); ctx.bezierCurveTo(16, 2, 6, 2, 0, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 1); ctx.bezierCurveTo(12, 4, 14, 16, 6, 14); ctx.bezierCurveTo(2, 12, 0, 6, 0, 1); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(12, -8, 2, 0, TAU); ctx.fill(); ctx.restore(); });
    ctx.fillStyle = '#2a1a0a'; ctx.beginPath(); ctx.ellipse(0, 2, 1.6, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  S.forest = { dur: 7.2, init: function () { for (var i = 0; i < n(70); i++) P({ k: 'glow', x: rnd(0, W), y: rnd(0, H), vx: rnd(-15, 15), vy: rnd(-15, 15), sway: rnd(1, 2), life: 99, r: rnd(1.5, 3) * run.u, c: ['#d9ff7a', '#f7ffb0', '#9dff8a'][i % 3], a: .9 }); },
    frame: function (t, dt) {
      var cx = W / 2, cy = H * .5, R = Math.min(W, H) * .36; veil('#021208', .55 * ease(t / .8));
      var cs = [['#ffd36b', '#ff8a3a'], ['#b8f08a', '#3d9a3a'], ['#ffb0e0', '#b47bff'], ['#9de8ff', '#3a7bff']];
      run.cards.forEach(function (_, k) {
        var T = 2.1 + (k % 26) * .06 + (k > 25 ? .25 : 0), a0 = k / 52 * TAU;
        var a = a0 + t * 1.1, rad = R * (.45 + .55 * ((k * 7) % 13) / 12), tx = cx + Math.cos(a) * rad, ty = cy + Math.sin(a) * rad * .8;
        if (t < T) { var p = fly(k, t, .05 + k * .02, .9, tx, ty, .62, a); var m = t > T - .35 ? Math.cos((t - (T - .35)) / .35 * Math.PI / 2) : 1; card(k, p[0], p[1], p[2], p[3], 1, m, 1); return; }
        var u = t - T, up = u * u * 40 * run.u, x = tx + Math.cos(a + u) * u * 30, y = ty - up, c = cs[k % 4], rot = Math.sin(t * 2 + k) * .3;
        if (k % 3 === 2) { ctx.save(); P && 0; var p2 = { k: 'leaf', r: 9 * run.u, c: ['#7fc23a', '#d4a83a', '#c2502a'][k % 3 === 2 && k % 2 ? 1 : 0], ph: k, rot: a, x: x, y: y }; drawPart(p2, cl(1 - (u - 3.3) / .8, 0, 1)); ctx.restore(); }
        else { ctx.globalAlpha = cl(1 - (u - 3.3) / .8, 0, 1) * cl(u / .25, 0, 1); butterfly(x, y, run.u * 1.25, t + k, c[0], c[1], rot); ctx.globalAlpha = 1; }
        if (Math.random() < .5 * dt * 60 * .05) P({ k: 'glow', x: x, y: y, life: .6, r: 2 * run.u, c: c[0] });
      });
      ctx.globalAlpha = 1;
    } };
  S.nebula = { dur: 7.4, init: function () { run.stars = []; for (var i = 0; i < n(240); i++) run.stars.push({ a: rnd(0, TAU), d: rnd(.02, 1), s: rnd(.4, 1.4) });
      var im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(root.ThemeCursor ? ThemeCursor.svg('nebula', 'grab') : '<svg xmlns="http://www.w3.org/2000/svg"/>'); run.ship = im; },
    frame: function (t, dt) {
      var cx = W / 2, cy = H * .48, M = Math.hypot(W, H) / 2; veil('#04001a', .7 * ease(t / .7));
      var warp = cl((t - 2.4) / 1.6, 0, 1), wv = warp * warp * (1 - cl((t - 4.4) / .6, 0, 1));
      ctx.lineCap = 'round';
      run.stars.forEach(function (s) { s.d += dt * (.03 + wv * 1.8) * s.s; if (s.d > 1.1) s.d = .02; var r1 = s.d * s.d * M * 1.2, r0 = Math.max(0, r1 - (4 + wv * 160) * s.d * run.u), x1 = cx + Math.cos(s.a) * r1, y1 = cy + Math.sin(s.a) * r1;
        ctx.globalAlpha = Math.min(1, s.d * 2); ctx.strokeStyle = s.s > 1 ? '#c8b8ff' : '#ffffff'; ctx.lineWidth = (.8 + s.d * 1.8) * run.u; ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); ctx.lineTo(x1 + .1, y1); ctx.stroke(); });
      ctx.globalAlpha = 1;
      // galaxy of cards, then warp into hyperspace
      var R = Math.min(W, H) * .4;
      run.cards.forEach(function (_, k) { var arm = k % 2, j = k >> 1, a = arm * Math.PI + j * .24 + t * .5, rad = R * (.18 + j / 26 * .85), tx = cx + Math.cos(a) * rad, ty = cy + Math.sin(a) * rad * .62;
        var p = fly(k, t, .05 + k * .02, .9, tx, ty, .5 + j / 26 * .25, a + 1.57);
        if (warp > 0) { var w = ease(warp - hash(k) * .3), ang = Math.atan2(p[1] - cy, p[0] - cx), out = w * w * M * 1.4; p[0] += Math.cos(ang) * out; p[1] += Math.sin(ang) * out; p[2] *= 1 + w * 2; }
        card(k, p[0], p[1], p[2], p[3], 1 - cl((warp - .7) / .3, 0, 1)); });
      // spaceship fly-by
      if (t > .7 && t < 3.6 && run.ship.complete) { var u = (t - .7) / 2.9, sx = lerp(-80, W + 80, u), sy = lerp(H * .78, H * .18, u) + Math.sin(u * 9) * 14, sz = 92 * run.u; ctx.save(); ctx.translate(sx, sy); ctx.rotate(.85); ctx.drawImage(run.ship, -sz / 2, -sz / 2, sz, sz); ctx.restore();
        if (Math.random() < .8) P({ k: 'glow', x: sx - 20 * run.u, y: sy + 16 * run.u, vx: -60, vy: 30, life: .6, r: 3 * run.u, c: ['#ffd36b', '#ff6a3a', '#7fd8ff'][Math.floor(rnd(0, 3))] }); }
      // supernova bloom
      if (t > 4.1) { var q = ease((t - 4.1) / 1.4), rad2 = q * M * 1.05, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rad2));
        var fade = 1 - cl((t - 5.6) / 1.4, 0, 1); g.addColorStop(0, 'rgba(255,255,255,' + fade + ')'); g.addColorStop(.18, 'rgba(255,190,240,' + .85 * fade + ')'); g.addColorStop(.5, 'rgba(150,90,255,' + .45 * fade + ')'); g.addColorStop(1, 'rgba(40,0,90,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(180,220,255,' + .7 * fade + ')'; ctx.lineWidth = 6 * run.u * (1 - q) + 1; ctx.beginPath(); ctx.arc(cx, cy, rad2 * .8, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        if (!run.nova) { run.nova = 1; burst(cx, cy, ['#ffffff', '#ffb0e8', '#9cd9ff', '#b47bff'], 140, 620 * run.u, { g: 0, drag: .97, life: 1.8 }); } }
      // the four aces orbit the newborn star
      if (t > 4.6) { var ap = ease((t - 4.6) / 1); [1, 14, 27, 40].forEach(function (_, i) { var k = idxOf(i, 1), a = i / 4 * TAU + t * .9, rr2 = R * .62 * ap; card(k, cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * .55, .9 * ap + .01, Math.sin(t + i) * .15, ap); }); }
    } };
  function lotus(x, y, s, open) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s * .7);
    for (var ring = 0; ring < 2; ring++) for (var i = 0; i < 8; i++) { var a = i / 8 * TAU + ring * .4, o = open * (ring ? .7 : 1); ctx.save(); ctx.rotate(a); ctx.scale(1, .6 + .4 * o);
      var g = ctx.createLinearGradient(0, 0, 0, -22); g.addColorStop(0, ring ? '#ffd2e0' : '#f08aac'); g.addColorStop(1, '#fff4f8'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(9 * o + 2, -8, 6 * o + 2, -18 * (.5 + o * .5), 0, -24 * (.5 + o * .5)); ctx.bezierCurveTo(-6 * o - 2, -18 * (.5 + o * .5), -9 * o - 2, -8, 0, 0); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.restore();
  }
  S.zen = { dur: 7.5, init: function () { run.spots = run.cards.map(function (_, k) { var a = hash(k) * TAU, r = Math.sqrt(hash(k + 50)); return { x: Math.cos(a) * r * .82, y: Math.sin(a) * r * .7, rot: (hash(k + 99) - .5) * 1.4 }; });
      run.spots.sort(function (a, b) { return a.y - b.y; }); run.lot = [0, 1, 2, 3, 4, 5].map(function (i) { return { x: (hash(i + 7) - .5) * 1.5, y: (hash(i + 17) - .5) * 1.2, t: 2.4 + i * .35 }; }); },
    frame: function (t, dt) {
      var cx = W / 2, cy = H * .6, rx = W * .46, ry = H * .27; veil('#0b1416', .4 * ease(t / .8));
      var po = ease(t / 1), g = ctx.createRadialGradient(cx, cy - ry * .3, 0, cx, cy, rx); g.addColorStop(0, 'rgba(120,190,190,' + .85 * po + ')'); g.addColorStop(.7, 'rgba(40,100,110,' + .85 * po + ')'); g.addColorStop(1, 'rgba(20,50,60,' + .6 * po + ')');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rx * po, ry * po, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(40,30,20,' + .5 * po + ')'; ctx.lineWidth = 4 * run.u; ctx.stroke();
      for (var w = 0; w < 4; w++) { var q = ((t * .25 + w / 4) % 1); ctx.strokeStyle = 'rgba(255,255,255,' + .18 * (1 - q) * po + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, cy, rx * q, ry * q, 0, 0, TAU); ctx.stroke(); }
      run.cards.forEach(function (_, k) { var sp = run.spots[k], tx = cx + sp.x * rx, ty = cy + sp.y * ry, t0 = .2 + k * .06, u = (t - t0) / 1.7, f = startPos(k);
        if (u <= 0) return card(k, f.x, f.y, run.s0, 0, 1);
        var e = eio(u), x = lerp(f.x, tx, e) + Math.sin(u * 5 + k) * 40 * run.u * (1 - e), y = lerp(f.y, ty, e) - Math.sin(Math.min(1, u) * Math.PI) * H * .1, land = cl((u - .85) / .15, 0, 1);
        if (u >= 1 && !run['r' + k]) { run['r' + k] = 1; P({ k: 'ring', x: tx, y: ty, r: run.CW * .3, grow: run.CW * 1.4, life: 1.6, c: 'rgba(230,255,255,.9)' }); }
        card(k, x, y + (u >= 1 ? Math.sin(t * 1.6 + k) * 2 : 0), .55, lerp(Math.sin(u * 4 + k) * .6, sp.rot, e), 1, 1, 1 - .38 * land); });
      run.lot.forEach(function (l) { if (t > l.t) lotus(cx + l.x * rx * .8, cy + l.y * ry * .8, (1.3 + .15 * Math.sin(t)) * run.u, ease((t - l.t) / 1.1)); });
      if (t > 3.3 && t < 6.6) { run.acc = (run.acc || 0) + 55 * run.q * dt; while (run.acc > 1) { run.acc--; P({ k: 'petal', x: rnd(-W * .2, W), y: -10, vx: rnd(60, 140) * run.u, vy: rnd(60, 130) * run.u, sway: 2, vr: rnd(-3, 3), life: 6, r: rnd(5, 9) * run.u, c: ['#f7b9c8', '#ffd6e0', '#f08aac'][Math.floor(rnd(0, 3))] }); } }
    } };
  function fish(x, y, s, a, c, t) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); var w = Math.sin(t * 14) * 3;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-17, -6 + w); ctx.lineTo(-17, 6 + w); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-3, -5, 2, 10); ctx.fillStyle = '#071820'; ctx.beginPath(); ctx.arc(6, -1.2, 1.4, 0, TAU); ctx.fill(); ctx.restore(); }
  S.reef = { dur: 7.2, init: function () { run.school = []; for (var i = 0; i < n(46); i++) run.school.push({ o: rnd(0, TAU), r: rnd(.5, 1.1), dy: rnd(-.2, .2), c: ['#ff9a3a', '#ffd34a', '#3ad1ff', '#ff6aa0', '#ffffff'][i % 5], s: rnd(.8, 1.4) }); },
    frame: function (t, dt) {
      var cx = W / 2, cy = H * .5, R = Math.min(W, H) * .4; veil('#00192e', .5 * ease(t / .8));
      ctx.globalCompositeOperation = 'lighter'; for (var i = 0; i < 6; i++) { var x = W * (i / 5) + Math.sin(t * .5 + i) * 60, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(180,255,255,.16)'); g.addColorStop(1, 'rgba(180,255,255,0)'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 160 + Math.sin(t + i) * 40, H); ctx.lineTo(x + 40, H); ctx.fill(); } ctx.globalCompositeOperation = 'source-over';
      run.cards.forEach(function (_, k) { var sp = .7 + (k % 3) * .18, a = k / 52 * TAU * 2 + t * sp, rad = R * (.35 + .65 * hash(k)), tx = cx + Math.cos(a) * rad * 1.15, ty = cy + Math.sin(a) * rad * .62 + Math.sin(t * 2 + k) * 8;
        if (t > 5) { var g2 = ease((t - 5) / 1.4); tx = lerp(tx, cx + (k % 13 - 6) * run.CW * .34, g2); ty = lerp(ty, cy + ((k / 13 | 0) - 1.5) * run.CH * .5, g2); }
        var p = fly(k, t, .05 + k * .022, 1, tx, ty, .58, Math.sin(a) * .5 * (t > 5 ? 1 - ease((t - 5) / 1.4) : 1)); card(k, p[0], p[1], p[2], p[3], 1); });
      run.school.forEach(function (f, i) { var a = f.o + t * 1.3 * (i % 2 ? 1 : 1.1), x = cx + Math.cos(a) * R * 1.25 * f.r, y = cy + Math.sin(a) * R * .7 * f.r + f.dy * R; fish(x, y, f.s * run.u * 1.2, a + Math.PI / 2, f.c, t + i); });
      if (Math.random() < 22 * run.q * dt) P({ k: 'bubble', x: rnd(0, W), y: H + 10, vy: rnd(-140, -70) * run.u, sway: rnd(1, 3), life: 7, r: rnd(3, 9) * run.u });
    } };
  S.classic = { dur: 8, init: function () { run.trail = document.createElement('canvas'); run.trail.width = cv.width; run.trail.height = cv.height; run.tc = run.trail.getContext('2d'); run.tc.setTransform(dpr, 0, 0, dpr, 0, 0); run.q2 = []; for (var r = 13; r >= 1; r--) for (var f = 0; f < 4; f++) { var k = idxOf(f, r); run.q2.push(k); } run.live = []; run.nextL = 0; },
    frame: function (t, dt) {
      var tc = run.tc, w = run.CW * run.s0, h = run.CH * run.s0;
      if (t > run.nextL && run.q2.length && run.live.length < 3) { run.nextL = t + .14; var k = run.q2.shift(), f = startPos(k); run.cards[k].gone = 1; run.live.push({ k: k, x: f.x, y: f.y, vx: (Math.random() < .5 ? -1 : 1) * rnd(160, 420) * run.u, vy: -rnd(60, 420) * run.u }); }
      for (var s = 0; s < 3; s++) run.live.forEach(function (c) { var d = dt / 3; c.vy += 1500 * run.u * d; c.x += c.vx * d; c.y += c.vy * d; if (c.y + h / 2 > H) { c.y = H - h / 2; c.vy = -c.vy * rnd(.7, .82); }
        var sp = sprite(c.k); if (sp) tc.drawImage(sp.c, c.x - w / 2 - sp.pad * run.s0, c.y - h / 2 - sp.pad * run.s0, w + sp.pad * 2 * run.s0, h + sp.pad * 2 * run.s0); });
      run.live = run.live.filter(function (c) { return c.x > -w && c.x < W + w; });
      ctx.drawImage(run.trail, 0, 0, W, H);
      run.cards.forEach(function (c, k) { if (!c.gone) card(k, c.from.x, c.from.y, run.s0, 0, 1); });
      if (!run.q2.length && !run.live.length && !run.endAt) run.endAt = t + .6;
      if (run.endAt && t > run.endAt) run.t = 99;
    } };
  // ---------- driver ----------
  function raster(cards, faceURI, cw, done) {
    var left = cards.length, out = [], scale = 2.7 * dpr, pad = Math.ceil(cw * .08);
    cards.forEach(function (c, k) { var im = new Image(); im.onload = im.onerror = function () {
      var w = Math.ceil(cw * scale), h = Math.ceil(cw * 1.4 * scale), p = Math.ceil(pad * scale), cn = document.createElement('canvas'); cn.width = w + p * 2; cn.height = h + p * 2;
      var x = cn.getContext('2d'); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = p * .7; x.shadowOffsetY = p * .3; try { x.drawImage(im, p, p, w, h); } catch (e) { }
      out[k] = { c: cn, pad: pad }; if (!--left) done(out); }; im.src = faceURI(c.s, c.r); });
  }
  function play(o) {
    stop(true);
    cv = o.canvas; var big = innerWidth * innerHeight; dpr = Math.min(root.devicePixelRatio || 1, Math.sqrt(8.3e6 / big), 3); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.display = 'block'; cv.style.opacity = '1'; ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var reduce = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, scene = S[o.style] || S.casino;
    var CW = cl(Math.min(W / 6.2, H / 6.5), 56, 190);
    run = { o: o, t: 0, parts: [], cards: o.cards, spr: [], CW: CW, CH: CW * 1.4, s0: o.cw / CW, u: cl(Math.min(W, H) / 700, .6, 2.2), q: reduce ? .3 : (W * H < 6e5 ? .65 : 1), scene: scene, dur: scene.dur, frames: 0, slow: 0, last: 0 };
    root.__winAnimStarted = true; root.__celebration = { style: o.style, t: 0 };
    var me = run;
    raster(o.cards, o.faceURI, CW, function (s) { if (run !== me) return; run.spr = s; if (scene.init) scene.init(); run.raf = requestAnimationFrame(frame); });
    addEventListener('keydown', skipKey, true);
    return { stop: skip };
  }
  function skipKey(e) { if (run && !e.repeat) { e.preventDefault(); e.stopPropagation(); skip(); } }
  function frame(now) {
    if (!run) return; var r = run, raw = r.last ? (now - r.last) / 1000 : 1 / 60, dt = Math.min(.05, raw); r.last = now; r.t += dt; r.frames++;
    if (r.frames > 20 && raw > .024) { r.slow++; if (r.slow > 12 && r.q > .3) { r.q *= .7; r.slow = 0; } } else r.slow = Math.max(0, r.slow - 1);
    if (r.scene !== S.classic) ctx.clearRect(0, 0, W, H); else ctx.clearRect(0, 0, W, H);
    r.scene.frame(r.t, dt); stepParts(dt); root.__celebration.t = r.t; root.__celebration.q = r.q; root.__celebration.parts = r.parts.length;
    if (r.t > r.dur - .7 && !r.fading) { r.fading = 1; cv.style.transition = 'opacity .7s'; cv.style.opacity = '0'; }
    if (r.t >= r.dur) return finish();
    r.raf = requestAnimationFrame(frame);
  }
  function finish() { if (!run) return; var r = run; stop(false); r.o.onDone && r.o.onDone(); }
  function skip() { if (!run) return; finish(); }
  function stop(silent) { if (!run) return; cancelAnimationFrame(run.raf); removeEventListener('keydown', skipKey, true); run = null; if (cv) { cv.style.transition = ''; cv.style.display = 'none'; cv.style.opacity = '1'; } }
  root.Celebrate = { play: play, skip: skip, stop: function () { stop(true); }, get active() { return !!run; }, styles: Object.keys(S) };
})(this);
