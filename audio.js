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
  root.SFX = { play: play, setMusic: setMusic, config: config, unlock: unlock, get state() { return { ctx: ctx && ctx.state, music: musicEl && !musicEl.paused, track: musicTrack, voices: voices, loaded: Object.keys(buffers).length }; } };
})(this);
