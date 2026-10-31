/* Particles: ambient theme life behind the cards (fireflies, petals, bubbles, stars,
   rain, dust) and celebration effects above them (sparks, confetti, fireworks). */
(function (root) {
  'use strict';
  var amb = document.getElementById('ambient'), top = document.getElementById('fx');
  var actx = amb.getContext('2d'), tctx = top.getContext('2d');
  var W = 0, H = 0, dpr = 1, ambP = [], parts = [], theme = null, raf = 0, last = 0, reduce = false, qual = 1, slow = 0, fast = 0;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  function size() {
    W = innerWidth; H = innerHeight;
    dpr = Math.max(0.75, Math.min((root.Perf ? Perf.fxDpr() : (root.devicePixelRatio || 1)) * qual, 3840 / Math.max(1, W)));
    [amb, top].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
    seedAmbient();
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function seedAmbient() {
    ambP = []; if (!theme || !theme.ambient || reduce) return;
    var n = { dust: 26, rain: 70, fireflies: 34, stars: 60, petals: 22, bubbles: 26 }[theme.ambient] || 20;
    n = Math.round(n * Math.min(1.4, Math.max(0.6, W * H / 900000)));
    for (var i = 0; i < n; i++) ambP.push(spawnAmb(true));
  }
  function spawnAmb(anywhere) {
    var t = theme.ambient, c = theme.amb[Math.floor(Math.random() * theme.amb.length)];
    var p = { x: rnd(0, W), y: anywhere ? rnd(0, H) : 0, c: c, ph: rnd(0, 6.28), s: 1, a: 1, vx: 0, vy: 0, r: 2 };
    if (t === 'dust') { p.r = rnd(0.6, 1.8); p.vx = rnd(-4, 4); p.vy = rnd(-6, -1); p.a = rnd(.15, .45); if (!anywhere) p.y = H + 4; }
    if (t === 'rain') { p.r = rnd(8, 18); p.vy = rnd(380, 620); p.vx = -40; p.a = rnd(.08, .22); if (!anywhere) p.y = -20; }
    if (t === 'fireflies') { p.r = rnd(1.2, 2.6); p.vx = rnd(-10, 10); p.vy = rnd(-10, 10); p.a = 1; }
    if (t === 'stars') { p.r = rnd(.5, 1.6); p.a = rnd(.3, 1); }
    if (t === 'petals') { p.r = rnd(4, 7); p.vy = rnd(14, 30); p.vx = rnd(8, 26); p.rot = rnd(0, 6.28); p.vr = rnd(-1.5, 1.5); p.a = rnd(.55, .9); if (!anywhere) { p.y = -10; p.x = rnd(-W * .3, W); } }
    if (t === 'bubbles') { p.r = rnd(1.5, 4.5); p.vy = rnd(-36, -14); p.a = rnd(.25, .5); if (!anywhere) p.y = H + 8; }
    return p;
  }
  function stepAmb(dt, now) {
    actx.clearRect(0, 0, W, H); if (!ambP.length) return;
    var t = theme.ambient;
    for (var i = 0; i < ambP.length; i++) {
      var p = ambP[i];
      if (t === 'fireflies') { p.vx += rnd(-20, 20) * dt; p.vy += rnd(-20, 20) * dt; p.vx *= .98; p.vy *= .98; }
      if (t === 'petals') { p.rot += p.vr * dt; p.x += Math.sin(now / 900 + p.ph) * 12 * dt; }
      if (t === 'bubbles') p.x += Math.sin(now / 600 + p.ph) * 10 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > H + 30 || p.y < -30 || p.x < -40 || p.x > W + 40) {
        if (t === 'fireflies') { p.x = rnd(0, W); p.y = rnd(0, H); } else ambP[i] = p = spawnAmb(false);
      }
      actx.globalAlpha = p.a;
      if (t === 'fireflies') {
        var fl = .35 + .65 * Math.max(0, Math.sin(now / 700 + p.ph)); actx.globalAlpha = fl;
        var g = actx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6); g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = g; actx.beginPath(); actx.arc(p.x, p.y, p.r * 6, 0, 6.29); actx.fill();
      } else if (t === 'stars') {
        actx.globalAlpha = p.a * (.5 + .5 * Math.sin(now / 900 + p.ph)); actx.fillStyle = p.c; actx.fillRect(p.x, p.y, p.r, p.r);
      } else if (t === 'rain') {
        actx.strokeStyle = p.c; actx.lineWidth = 1; actx.beginPath(); actx.moveTo(p.x, p.y); actx.lineTo(p.x - p.r * .08, p.y - p.r); actx.stroke();
      } else if (t === 'petals') {
        actx.save(); actx.translate(p.x, p.y); actx.rotate(p.rot); actx.fillStyle = p.c; actx.beginPath(); actx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.29); actx.fill(); actx.restore();
      } else if (t === 'bubbles') {
        actx.strokeStyle = p.c; actx.lineWidth = 1; actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, 6.29); actx.stroke();
      } else { actx.fillStyle = p.c; actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, 6.29); actx.fill(); }
    }
    actx.globalAlpha = 1;
  }
  function stepFx(dt) {
    tctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt;
      if (p.life <= 0) { if (p.shell) burstAt(p.x, p.y, p.colors, 46, 260, 'spark'); parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx * dt; p.y += p.vy * dt;
      var k = Math.min(1, p.life / p.fade);
      tctx.globalAlpha = k;
      if (p.delay > 0) { p.delay -= dt; p.life += dt; continue; }
      if (p.kind === 'ring') {
        var q = 1 - p.life / p.max; tctx.globalAlpha = k * (1 - q * .6); tctx.strokeStyle = p.c; tctx.lineWidth = p.lw * (1 - q * .7);
        if (p.glow) { tctx.shadowColor = p.c; tctx.shadowBlur = 14; }
        tctx.beginPath(); tctx.ellipse(p.x, p.y, p.r + q * p.grow, (p.r + q * p.grow) * (p.sq || 1), 0, 0, 6.29); tctx.stroke(); tctx.shadowBlur = 0; continue;
      }
      if (p.kind === 'swirl') { p.ang += p.va * dt; p.rad += p.vr2 * dt; p.x = p.cx + Math.cos(p.ang) * p.rad; p.y = p.cy + Math.sin(p.ang) * p.rad * .7; }
      if (p.kind === 'bubble') { p.x += Math.sin(p.life * 9 + p.ph) * 22 * dt; tctx.strokeStyle = p.c; tctx.lineWidth = 1.2; tctx.beginPath(); tctx.arc(p.x, p.y, p.r, 0, 6.29); tctx.stroke();
        tctx.globalAlpha = k * .7; tctx.fillStyle = '#fff'; tctx.beginPath(); tctx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 6.29); tctx.fill(); continue; }
      if (p.kind === 'pixel') { var px = Math.round(p.x / 4) * 4, py = Math.round(p.y / 4) * 4; tctx.fillStyle = p.c; tctx.fillRect(px, py, p.r, p.r); continue; }
      if (p.kind === 'chip') { tctx.fillStyle = p.c; tctx.beginPath(); tctx.arc(p.x, p.y, p.r, 0, 6.29); tctx.fill(); tctx.strokeStyle = '#fff8e0'; tctx.setLineDash([2, 2]); tctx.lineWidth = 1.4; tctx.beginPath(); tctx.arc(p.x, p.y, p.r * .7, 0, 6.29); tctx.stroke(); tctx.setLineDash([]); continue; }
      if (p.kind === 'leaf' || p.kind === 'petal') { p.rot += p.vr * dt; p.x += Math.sin(p.life * 5 + p.ph) * 30 * dt; tctx.save(); tctx.translate(p.x, p.y); tctx.rotate(p.rot); tctx.fillStyle = p.c; tctx.beginPath();
        if (p.kind === 'leaf') { tctx.moveTo(-p.r, 0); tctx.quadraticCurveTo(0, -p.r * .8, p.r, 0); tctx.quadraticCurveTo(0, p.r * .8, -p.r, 0); } else tctx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.29);
        tctx.fill(); tctx.restore(); continue; }
      if (p.kind === 'glow') { var gg = tctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5); gg.addColorStop(0, p.c); gg.addColorStop(1, 'rgba(0,0,0,0)'); tctx.globalAlpha = k * (.5 + .5 * Math.sin(p.life * 14 + p.ph)); tctx.fillStyle = gg; tctx.beginPath(); tctx.arc(p.x, p.y, p.r * 5, 0, 6.29); tctx.fill(); continue; }
      if (p.kind === 'confetti') {
        p.rot += p.vr * dt; tctx.save(); tctx.translate(p.x, p.y); tctx.rotate(p.rot); tctx.scale(1, Math.cos(p.rot * 2.3));
        tctx.fillStyle = p.c; tctx.fillRect(-p.r, -p.r * .45, p.r * 2, p.r * .9); tctx.restore();
      } else {
        tctx.fillStyle = p.c; tctx.beginPath(); tctx.arc(p.x, p.y, p.r * (0.4 + 0.6 * k), 0, 6.29); tctx.fill();
        if (p.kind === 'spark' || p.shell) { tctx.globalAlpha = k * .35; tctx.beginPath(); tctx.arc(p.x, p.y, p.r * 2.6, 0, 6.29); tctx.fill(); }
      }
    }
    tctx.globalAlpha = 1;
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    var raw = now - (last || now), dt = Math.min(0.05, raw / 1000); last = now;
    // auto resolution: sustained slow frames drop the backing store, sustained fast ones restore it
    if (raw > 24 && raw < 200) { slow++; fast = 0; } else if (raw > 0 && raw < 18) { fast++; slow = Math.max(0, slow - 1); }
    if (slow > 20 && qual > 0.5) { qual = Math.max(0.5, qual - 0.25); slow = 0; size(); }
    else if (fast > 600 && qual < 1) { qual = Math.min(1, qual + 0.25); fast = 0; size(); }
    stepAmb(dt, now); stepFx(dt);
  }
  function burstAt(x, y, colors, n, speed, kind) {
    for (var i = 0; i < n; i++) {
      var a = rnd(0, 6.283), v = rnd(speed * .35, speed);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * .15, g: 380, drag: .965, r: rnd(1.4, 3.2),
        c: colors[i % colors.length], life: rnd(.45, .9), fade: .45, kind: kind || 'spark' });
    }
  }
  function confetti(n) {
    var cs = theme ? theme.burst.concat(['#ff6b6b', '#ffd166', '#4dd4ff', '#9b8cff', '#7cf29a']) : ['#fff'];
    for (var i = 0; i < n; i++) parts.push({ x: rnd(0, W), y: rnd(-H * .5, -10), vx: rnd(-60, 60), vy: rnd(40, 160), g: 120, drag: .99, r: rnd(4, 7),
      c: cs[i % cs.length], life: rnd(3.5, 6), fade: 1, kind: 'confetti', rot: rnd(0, 6), vr: rnd(-8, 8) });
  }
  function firework() {
    var cs = theme ? theme.burst : ['#fff'], x = rnd(W * .15, W * .85);
    parts.push({ x: x, y: H + 5, vx: rnd(-30, 30), vy: -rnd(H * .9, H * 1.25), g: 520, drag: .995, r: 2.2, c: '#fff8e0', life: rnd(.8, 1.05), fade: .2, kind: 'spark', shell: true, colors: cs });
  }
  // Ace-to-foundation flourish, one style per theme (~0.6-1.2 s, drawn on the top canvas so input is never blocked).
  function P(o) { o.life = o.max = o.life || rnd(.6, 1.1); o.fade = o.fade || .4; o.g = o.g || 0; o.drag = o.drag || .97; o.vx = o.vx || 0; o.vy = o.vy || 0; o.r = o.r || 2; parts.push(o); return o; }
  function ace(x, y, w, h) {
    var id = theme ? theme.id : 'casino', i, a, n = reduce ? 0.3 : 1, cs = theme ? theme.burst : ['#fff'];
    w = w || 60; h = h || 84;
    if (reduce) { P({ kind: 'ring', x: x, y: y, r: w * .5, grow: w * .2, lw: 2, c: cs[0], life: .5, sq: h / w }); return; }
    if (id === 'casino') {
      P({ kind: 'ring', x: x, y: y, r: w * .4, grow: w * .7, lw: 3, c: '#ffe08a', life: .7, glow: 1 });
      for (i = 0; i < 26; i++) { a = rnd(0, 6.28); P({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * rnd(60, 240), vy: Math.sin(a) * rnd(60, 240), r: rnd(1, 2.6), c: cs[i % 3], drag: .94 }); }
      for (i = 0; i < 6; i++) P({ kind: 'chip', x: x + rnd(-w * .3, w * .3), y: y, vx: rnd(-90, 90), vy: rnd(-300, -180), g: 760, r: rnd(5, 7), c: ['#c8202f', '#1b5e3b', '#20232a'][i % 3], life: rnd(.8, 1.1), drag: .99 });
    } else if (id === 'walnut') {
      for (i = 0; i < 34; i++) P({ kind: 'glow', x: x + rnd(-w * .45, w * .45), y: y + rnd(0, h * .45), vx: rnd(-20, 20), vy: rnd(-120, -40), g: -40, r: rnd(.8, 1.8), c: ['#ffb347', '#ff7a2a', '#ffd27a'][i % 3], ph: rnd(0, 6), life: rnd(.7, 1.2), drag: .985 });
    } else if (id === 'neon') {
      P({ kind: 'ring', x: x, y: y, r: w * .45, grow: w * .9, lw: 4, c: '#38e6ff', life: .65, glow: 1, sq: h / w });
      P({ kind: 'ring', x: x, y: y, r: w * .4, grow: w * .6, lw: 3, c: '#ff4fb0', life: .8, glow: 1, delay: .1, sq: h / w });
      for (i = 0; i < 18; i++) { a = i / 18 * 6.28; P({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 1.6, c: i % 2 ? '#38e6ff' : '#ff4fb0', drag: .9, life: .6 }); }
    } else if (id === 'forest') {
      for (i = 0; i < 12; i++) P({ kind: 'leaf', x: x + rnd(-w * .7, w * .7), y: y - h * rnd(.4, .8), vy: rnd(40, 90), r: rnd(5, 8), c: ['#7cb342', '#c0a03a', '#d9772b', '#9ccc65'][i % 4], rot: rnd(0, 6), vr: rnd(-4, 4), ph: rnd(0, 6), life: rnd(.9, 1.2), drag: .99 });
      for (i = 0; i < 10; i++) P({ kind: 'glow', x: x + rnd(-w * .5, w * .5), y: y + rnd(-h * .4, h * .4), vx: rnd(-30, 30), vy: rnd(-30, 10), r: rnd(1, 1.8), c: '#e8ff8a', ph: rnd(0, 6), life: rnd(.8, 1.1) });
    } else if (id === 'nebula') {
      for (i = 0; i < 40; i++) P({ kind: 'swirl', cx: x, cy: y, x: x, y: y, ang: rnd(0, 6.28), rad: rnd(2, w * .2), va: rnd(4, 7), vr2: rnd(40, 110), r: rnd(.8, 2), c: ['#b9a6ff', '#7fd8ff', '#ffffff', '#ff9ee8'][i % 4], life: rnd(.7, 1.1), drag: 1 });
    } else if (id === 'zen') {
      for (i = 0; i < 3; i++) P({ kind: 'ring', x: x, y: y + h * .1, r: w * .3, grow: w * 1.1, lw: 2, c: 'rgba(255,255,255,.85)', life: .9, sq: .45, delay: i * .16 });
      for (i = 0; i < 8; i++) P({ kind: 'petal', x: x + rnd(-w * .6, w * .6), y: y - h * rnd(.3, .7), vy: rnd(30, 70), vx: rnd(10, 40), r: rnd(4, 6), c: ['#ffc4d6', '#ffe1ea', '#f7a8c4'][i % 3], rot: rnd(0, 6), vr: rnd(-3, 3), ph: rnd(0, 6), life: rnd(.9, 1.2) });
    } else if (id === 'reef') {
      for (i = 0; i < 18; i++) P({ kind: 'bubble', x: x + rnd(-w * .4, w * .4), y: y + rnd(0, h * .45), vy: rnd(-160, -60), g: -60, r: rnd(2, 6), c: 'rgba(200,250,255,.9)', ph: rnd(0, 6), life: rnd(.7, 1.15), drag: .99 });
    } else if (id === 'classic') {
      for (i = 0; i < 28; i++) { a = rnd(0, 6.28); P({ kind: 'pixel', x: x, y: y, vx: Math.cos(a) * rnd(80, 260), vy: Math.sin(a) * rnd(80, 260) - 80, g: 600, r: 4, c: ['#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#00ff00'][i % 5], life: rnd(.6, .9), drag: .98, fade: .15 }); }
    } else burstAt(x, y, cs, 26, 300, 'spark');
  }
  root.FX = {
    ace: ace,
    get quality() { return qual; }, get dpr() { return dpr; },
    setTheme: function (t) { theme = t; seedAmbient(); },
    burst: function (x, y, n) { if (!reduce) burstAt(x, y, theme ? theme.burst : ['#fff'], n || 26, 300, 'spark'); },
    celebrate: function (sec) {
      confetti(reduce ? 40 : 160); var end = performance.now() + (sec || 4) * 1000;
      (function fw() { if (performance.now() > end) return; firework(); if (Math.random() < .5) firework(); setTimeout(fw, 420 + Math.random() * 380); })();
    },
    clear: function () { parts = []; },
    get count() { return parts.length; }
  };
  addEventListener('resize', size); if (root.Perf) Perf.onChange(size); size(); raf = requestAnimationFrame(loop);
})(this);
