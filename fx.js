/* Particles: ambient theme life behind the cards (fireflies, petals, bubbles, stars,
   rain, dust) and celebration effects above them (sparks, confetti, fireworks). */
(function (root) {
  'use strict';
  var amb = document.getElementById('ambient'), top = document.getElementById('fx');
  var actx = amb.getContext('2d'), tctx = top.getContext('2d');
  var W = 0, H = 0, dpr = 1, ambP = [], parts = [], theme = null, raf = 0, last = 0, reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  function size() {
    dpr = Math.min(2, root.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
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
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
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
  root.FX = {
    setTheme: function (t) { theme = t; seedAmbient(); },
    burst: function (x, y, n) { if (!reduce) burstAt(x, y, theme ? theme.burst : ['#fff'], n || 26, 300, 'spark'); },
    celebrate: function (sec) {
      confetti(reduce ? 40 : 160); var end = performance.now() + (sec || 4) * 1000;
      (function fw() { if (performance.now() > end) return; firework(); if (Math.random() < .5) firework(); setTimeout(fw, 420 + Math.random() * 380); })();
    },
    clear: function () { parts = []; },
    get count() { return parts.length; }
  };
  addEventListener('resize', size); size(); raf = requestAnimationFrame(loop);
})(this);
