/* v7 performance governor: watches real frame times and tells the effect layers how much
   resolution and particle work the device can afford, so phones stay near 60 fps.
   Also rasterises the vector card faces once per size into bitmaps (cheap to move and rotate). */
(function (root) {
  'use strict';
  var phone = false;
  try { phone = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || Math.min(screen.width, screen.height) < 820; } catch (e) { }
  var lowHW = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  var level = lowHW ? 1 : 0, ema = 16.7, slow = 0, fast = 0, last = 0, listeners = [];
  function set(l) { l = Math.max(0, Math.min(2, l)); if (l === level) return; level = l; apply(); listeners.forEach(function (f) { try { f(level); } catch (e) { } }); }
  function apply() { var c = document.documentElement.classList; c.toggle('perf-mid', level >= 1); c.toggle('perf-low', level >= 2); }
  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = 0; return; }
    if (last) { var d = now - last; if (d < 250) { ema += (d - ema) * 0.08;
      if (d > 26) { slow++; fast = Math.max(0, fast - 2); } else if (d < 19) { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 14 && ema > 22) { slow = 0; fast = 0; set(level + 1); }
      else if (fast > 900) { fast = 0; set(level - 1); } } }
    last = now;
  }
  requestAnimationFrame(tick); apply();
  // backing-store pixel ratio for full-screen effect canvases (particles do not need 4K)
  function fxDpr() { var d = root.devicePixelRatio || 1, cap = [phone ? 1.75 : 3, 1.5, 1][level]; return Math.max(1, Math.min(d, cap, 3840 / Math.max(1, innerWidth))); }
  // ---------- bitmap card cache ----------
  var bmp = {}, pend = {}, curW = 0, queue = [], busyQ = false;
  var idle = root.requestIdleCallback || function (f) { return setTimeout(f, 30); };
  function pump() { if (busyQ || !queue.length) return; busyQ = true; idle(function () { var job = queue.shift(); job(function () { busyQ = false; pump(); }); }, { timeout: 400 }); }
  function raster(uri, w, h, cb) {
    var hit = bmp[uri]; if (hit && hit.w === w) return hit.url;
    if (w !== curW) { curW = w; var old = bmp; bmp = {}; pend = {}; setTimeout(function () { for (var k in old) URL.revokeObjectURL(old[k].url); }, 3000); }
    if (!pend[uri] && root.HTMLCanvasElement && HTMLCanvasElement.prototype.toBlob) { pend[uri] = 1; queue.push(function (done) { var im = new Image(); im.onerror = done;
      im.onload = function () {
        if (curW !== w) return done();
        var px = Math.min(3, root.devicePixelRatio || 1), cv = document.createElement('canvas');
        cv.width = Math.round(w * px * 1.08); cv.height = Math.round(h * px * 1.08); // headroom for the 1.06 lift scale
        var x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, cv.width, cv.height);
        cv.toBlob(function (b) { done(); if (!b || curW !== w) return; bmp[uri] = { w: w, url: URL.createObjectURL(b) }; cb && cb(uri, bmp[uri].url); }, 'image/png');
      };
      im.src = uri; }); pump();
    }
    return uri;
  }
  root.Perf = { get level() { return level; }, set level(l) { set(l); }, get phone() { return phone; }, get frameMs() { return ema; },
    fxDpr: fxDpr, onChange: function (f) { listeners.push(f); }, raster: raster };
})(this);
