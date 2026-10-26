/* Sound: Web Audio sample player with per-sound throttling and a voice cap so effects
   never pile up, a warm low-pass per theme, and a looping music bed that pauses
   whenever the page is hidden or loses focus. */
(function (root) {
  'use strict';
  var ctx = null, master, sfxBus, musBus, lp, buffers = {}, loading = {}, lastAt = {}, voices = 0;
  var opts = { sfx: 0.8, music: 0.5, flavor: { rate: 1, lp: 9000 } };
  var GROUPS = { slide: 4, place: 4, flip: 2 };
  var LIST = ['slide0', 'slide1', 'slide2', 'slide3', 'place0', 'place1', 'place2', 'place3', 'flip0', 'flip1', 'deal', 'shuffle', 'chime', 'win', 'tap', 'bad'];
  var musicEl = null, musicSrc = null, musicGain = null, musicTrack = null, wantMusic = false, unlocked = false;
  function ensure() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(master);
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opts.flavor.lp; lp.Q.value = 0.5; lp.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = opts.sfx; sfxBus.connect(lp);
    musBus = ctx.createGain(); musBus.gain.value = opts.music; musBus.connect(master);
    LIST.forEach(load);
    return ctx;
  }
  function load(n) {
    if (buffers[n] || loading[n]) return;
    loading[n] = fetch('audio/' + n + '.wav').then(function (r) { return r.arrayBuffer(); })
      .then(function (a) { return new Promise(function (res, rej) { ctx.decodeAudioData(a, res, rej); }); })
      .then(function (b) { buffers[n] = b; }).catch(function () { loading[n] = null; });
  }
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
    if (!unlocked) { unlocked = true; if (wantMusic) startMusic(); }
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { root.addEventListener(ev, unlock, { capture: true, passive: true }); });

  // name may be a group ('slide') picked at random; o: {rate, gain, pan, gap}
  function play(name, o) {
    o = o || {};
    if (!ctx || ctx.state !== 'running' || document.hidden || opts.sfx <= 0) return;
    if (GROUPS[name]) name = name + Math.floor(Math.random() * GROUPS[name]);
    var b = buffers[name]; if (!b) return;
    var key = name.replace(/\d+$/, ''), now = ctx.currentTime, gap = o.gap != null ? o.gap : 0.05;
    if (lastAt[key] && now - lastAt[key] < gap) return; // throttle repeats
    if (voices >= 6) return;                              // hard cap on overlap
    lastAt[key] = now;
    var s = ctx.createBufferSource(); s.buffer = b;
    s.playbackRate.value = (o.rate || 1) * opts.flavor.rate * (0.97 + Math.random() * 0.06);
    var g = ctx.createGain(); g.gain.value = o.gain != null ? o.gain : 1;
    var out = g;
    if (ctx.createStereoPanner && o.pan) { var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); out = p; }
    s.connect(g); out.connect(sfxBus);
    voices++; s.onended = function () { voices--; };
    s.start(now + (o.delay || 0));
  }
  // ---- music ----
  function setMusic(track) {
    wantMusic = true;
    if (track === musicTrack && musicEl) { if (unlocked) startMusic(); return; }
    musicTrack = track;
    if (!ensure()) return;
    var old = musicEl, oldG = musicGain;
    if (old) { fadeTo(oldG, 0, 0.8); setTimeout(function () { old.pause(); old.removeAttribute('src'); try { old.load(); } catch (e) { } }, 900); }
    musicEl = new Audio(); musicEl.loop = true; musicEl.preload = 'auto'; musicEl.crossOrigin = 'anonymous';
    musicEl.src = 'audio/m_' + track + '.m4a';
    try { musicSrc = ctx.createMediaElementSource(musicEl); musicGain = ctx.createGain(); musicGain.gain.value = 0; musicSrc.connect(musicGain); musicGain.connect(musBus); }
    catch (e) { musicGain = null; }
    if (unlocked) startMusic();
  }
  function fadeTo(g, v, t) { if (!g || !ctx) return; var n = ctx.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(v, n + t); }
  function startMusic() {
    if (!musicEl || !wantMusic || document.hidden || opts.music <= 0) return;
    var p = musicEl.play(); if (p && p.catch) p.catch(function () { });
    fadeTo(musicGain, 1, 1.5);
  }
  function pauseAll() {
    if (musicEl) { musicEl.pause(); if (musicGain) musicGain.gain.value = 0; }
    if (ctx && ctx.state === 'running') ctx.suspend();
  }
  function resumeAll() { if (!ctx || !unlocked) return; ctx.resume().then(startMusic); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseAll(); else resumeAll(); });
  root.addEventListener('pagehide', pauseAll);
  root.addEventListener('blur', function () { setTimeout(function () { if (!document.hasFocus()) pauseAll(); }, 50); });
  root.addEventListener('focus', resumeAll);
  function config(o) {
    Object.assign(opts, o);
    if (!ctx) return;
    sfxBus.gain.value = opts.sfx; musBus.gain.value = opts.music; lp.frequency.value = opts.flavor.lp;
    if (opts.music <= 0 && musicEl) musicEl.pause(); else if (unlocked) startMusic();
  }
  // Warm, soft win fanfare synthesised per theme: rounded triangle/sine voices, slow attacks, a gentle
  // low-pass and long releases (no bright dings). Goes through the SFX bus, so the SFX slider/mute and
  // the background pause (context suspend) apply to it.
  var FAN = { casino: [196, [0, 4, 7, 12], [0, 4, 7, 11, 14]], walnut: [174.6, [0, 4, 9, 7], [0, 4, 7, 11, 14]], neon: [220, [0, 7, 10, 15], [0, 3, 7, 10, 14]],
    forest: [293.7, [0, 2, 7, 9], [0, 4, 7, 9, 14]], nebula: [164.8, [0, 7, 12, 19], [0, 7, 12, 16, 19]], zen: [293.7, [0, 5, 7, 12], [0, 5, 7, 10, 14], 1],
    reef: [261.6, [0, 4, 9, 12], [0, 4, 7, 9, 12]], classic: [261.6, [0, 4, 7, 12], [0, 4, 7, 12, 16]] };
  function fanfare(id) {
    if (!ctx || ctx.state !== 'running' || document.hidden || opts.sfx <= 0) return false;
    var f = FAN[id] || FAN.casino, now = ctx.currentTime + .03, out = ctx.createGain(), lf = ctx.createBiquadFilter();
    lf.type = 'lowpass'; lf.frequency.value = 2200; lf.Q.value = .4; out.gain.value = .55; out.connect(lf); lf.connect(sfxBus);
    function note(semi, t, len, peak, pluck) {
      var fr = f[0] * Math.pow(2, semi / 12);
      [['triangle', 1, 1], ['sine', .5, .6], ['sine', 2.001, .12]].forEach(function (v) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.type = v[0]; o.frequency.value = fr * v[1]; o.detune.value = (Math.random() - .5) * 8;
        var a = pluck ? .012 : .07, p = peak * v[2]; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p, t + a);
        g.gain.setTargetAtTime(p * (pluck ? .15 : .55), t + a, pluck ? .25 : .5); g.gain.setTargetAtTime(0, t + len, .45);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 2.5);
      });
    }
    f[1].forEach(function (s, i) { note(s + 12, now + i * .2, .5, .16, f[3]); });
    f[2].forEach(function (s, i) { note(s, now + .9 + i * .03, 2.6, .09, f[3]); });
    note(f[1][f[1].length - 1] + 12, now + 1.0, 2.4, .1, f[3]);
    return true;
  }
  root.SFX = { fanfare: fanfare, play: play, setMusic: setMusic, config: config, unlock: unlock, get state() { return { ctx: ctx && ctx.state, music: musicEl && !musicEl.paused, track: musicTrack, voices: voices, loaded: Object.keys(buffers).length }; } };
})(this);
