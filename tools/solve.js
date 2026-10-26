// Offline Klondike solver used to build levels.js (verified-winnable deal pools).
const K = require('../engine.js');
function init(seed) {
  const d = K.makeDeck(seed).map(c => c.s * 13 + c.r - 1); // engine deals with deck.pop()
  const tab = [[], [], [], [], [], [], []], up = [0, 0, 0, 0, 0, 0, 0];
  for (let c = 0; c < 7; c++) for (let k = c; k < 7; k++) tab[k].push(d.pop());
  for (let k = 0; k < 7; k++) up[k] = tab[k].length - 1; // index of first face-up card
  return { tab, up, stock: d.reverse(), waste: [], found: [0, 0, 0, 0], rec: 0 };
}
const R = c => c % 13 + 1, S = c => (c / 13) | 0, red = c => S(c) === 1 || S(c) === 2;
function clone(s) { return { tab: s.tab.map(p => p.slice()), up: s.up.slice(), stock: s.stock.slice(), waste: s.waste.slice(), found: s.found.slice(), rec: s.rec }; }
function key(s) { return s.tab.map((p, i) => p.slice(s.up[i]).join(',')).sort().join('|') + '#' + s.found.join(',') + '#' + s.stock.length + ':' + s.waste.length + ':' + s.rec; }
function canF(s, c) { return s.found[S(c)] === R(c) - 1; }
function canT(c, p, up) { if (!p.length) return R(c) === 13; const t = p[p.length - 1]; return R(t) === R(c) + 1 && red(t) !== red(c); }
function safe(s, c) { const r = R(c); if (r <= 2) return true; const o = red(c) ? [0, 3] : [1, 2]; return s.found[o[0]] >= r - 1 && s.found[o[1]] >= r - 1; }
function flip(s, i) { if (s.tab[i].length && s.up[i] >= s.tab[i].length) s.up[i] = s.tab[i].length - 1; }
function auto(s) { let m = true; while (m) { m = false; for (let i = 0; i < 7; i++) { const p = s.tab[i]; if (p.length) { const c = p[p.length - 1]; if (canF(s, c) && safe(s, c)) { p.pop(); s.found[S(c)]++; flip(s, i); m = true; } } }
  if (s.waste.length) { const c = s.waste[s.waste.length - 1]; if (canF(s, c) && safe(s, c)) { s.waste.pop(); s.found[S(c)]++; m = true; } } } }
function moves(s, draw, maxRec) {
  const out = [];
  if (s.waste.length) { const c = s.waste[s.waste.length - 1];
    if (canF(s, c)) out.push(t => { t.waste.pop(); t.found[S(c)]++; });
    for (let j = 0; j < 7; j++) if (canT(c, s.tab[j])) { if (R(c) === 13 && false) continue; out.push(t => { t.tab[j].push(t.waste.pop()); }); } }
  for (let i = 0; i < 7; i++) { const p = s.tab[i]; if (!p.length) continue;
    const c = p[p.length - 1]; if (canF(s, c)) out.unshift(t => { t.tab[i].pop(); t.found[S(c)]++; flip(t, i); });
    for (let k = s.up[i]; k < p.length; k++) { const b = p[k];
      if (k === 0 && R(b) === 13) continue; // king already at bottom
      for (let j = 0; j < 7; j++) if (j !== i && canT(b, s.tab[j])) {
        if (k > s.up[i]) { const under = p[k - 1]; if (!canF(s, under)) continue; } // partial only if it frees a foundation play
        out.push(t => { const run = t.tab[i].splice(k); t.tab[j].push(...run); flip(t, i); });
        if (!s.tab[j].length) break; } } }
  if (s.stock.length) out.push(t => { for (let n = 0; n < draw && t.stock.length; n++) t.waste.push(t.stock.pop()); });
  else if (s.waste.length && s.rec < maxRec) out.push(t => { t.stock = t.waste.reverse(); t.waste = []; t.rec++; });
  return out;
}
function solve(seed, draw, maxRec, cap) {
  const seen = new Set(); let nodes = 0; const st = init(seed); auto(st);
  const stack = [st];
  while (stack.length) { const s = stack.pop();
    if (s.found.every(f => f === 13)) return { ok: true, nodes };
    if (++nodes > cap) return { ok: false, nodes, capped: true };
    const ms = moves(s, draw, maxRec);
    for (let m = ms.length - 1; m >= 0; m--) { const t = clone(s); ms[m](t); auto(t); const k = key(t); if (seen.has(k)) continue; seen.add(k); stack.push(t); } }
  return { ok: false, nodes };
}
function buried(seed) { const s = init(seed); let b = 0; s.tab.forEach(p => p.forEach((c, i) => { if (R(c) === 1) b += p.length - 1 - i; if (R(c) === 13 && i > 0) b += 0.5 * i; })); return b; }
module.exports = { solve, buried, init };
if (require.main === module) { let t = Date.now(), w = 0; for (let s = 1; s <= 40; s++) { const r = solve(s, +process.argv[2] || 1, +process.argv[3] || 99, 20000); if (r.ok) w++; } console.log('won', w, '/40', Date.now() - t, 'ms'); }
