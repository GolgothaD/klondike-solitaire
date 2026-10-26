const { solve, buried } = require('./solve.js');
const draw = +process.argv[2], N = +process.argv[3], out = [];
for (let s = 1; s <= N; s++) { const r = {}; for (const m of [0, 1, 3, 99]) { const x = solve(s, draw, m, 20000); r[m] = x.ok ? x.nodes : -1; if (x.ok) { for (const m2 of [0, 1, 3, 99]) if (m2 > m && r[m2] === undefined) r[m2] = r[m2]; } }
  out.push({ s, b: buried(s), r }); }
require('fs').writeFileSync('pool' + draw + '.json', JSON.stringify(out));
