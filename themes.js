/* Table themes: each is a full set — HD table art, matching card back, UI accents,
   its own music loop, sound flavour and ambient particles. */
(function (root) {
  'use strict';
  root.THEMES = [
    { id: 'casino', name: 'Royal Casino', sub: 'Emerald felt · lounge bossa', back: 'felt', music: 'casino',
      accent: '#e6c76a', accent2: '#fff1c2', ui: 'rgba(8,30,18,.62)', glow: 'rgba(230,199,106,.55)', slot: 'rgba(255,240,190,.28)',
      shade: 'radial-gradient(ellipse at 50% 42%,rgba(255,240,200,.10),rgba(0,0,0,0) 45%,rgba(0,0,0,.55) 100%)',
      ambient: 'dust', amb: ['#ffe9b0'], burst: ['#ffe08a', '#fff6d8', '#d9a93b'], sfx: { rate: 1, lp: 9000 } },
    { id: 'walnut', name: 'Walnut & Gold', sub: 'Private club · late-night jazz', back: 'gold', music: 'walnut',
      accent: '#d9ab52', accent2: '#ffe3a6', ui: 'rgba(28,12,6,.66)', glow: 'rgba(217,171,82,.55)', slot: 'rgba(255,215,150,.28)',
      shade: 'radial-gradient(ellipse at 50% 40%,rgba(255,200,120,.10),rgba(0,0,0,0) 45%,rgba(0,0,0,.6) 100%)',
      ambient: 'dust', amb: ['#ffd28a'], burst: ['#ffd27a', '#fff0c8', '#c8902c'], sfx: { rate: 0.94, lp: 7000 } },
    { id: 'neon', name: 'Neon City', sub: 'Rain-slick skyline · synth haze', back: 'neon', music: 'neon',
      accent: '#38e6ff', accent2: '#ff4fb0', ui: 'rgba(10,6,28,.66)', glow: 'rgba(56,230,255,.6)', slot: 'rgba(120,230,255,.35)',
      shade: 'radial-gradient(ellipse at 50% 45%,rgba(0,0,0,.05),rgba(0,0,0,.25) 55%,rgba(0,0,0,.6) 100%)',
      ambient: 'rain', amb: ['#7fe9ff', '#ff7ac8'], burst: ['#38e6ff', '#ff4fb0', '#ffffff', '#b47bff'], sfx: { rate: 1.03, lp: 10000 } },
    { id: 'forest', name: 'Enchanted Forest', sub: 'Mossy glade · fireflies', back: 'forest', music: 'forest',
      accent: '#b8f08a', accent2: '#f7ffb0', ui: 'rgba(6,26,20,.62)', glow: 'rgba(184,240,138,.55)', slot: 'rgba(210,255,190,.3)',
      shade: 'radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.08),rgba(0,0,0,.28) 60%,rgba(0,0,0,.62) 100%)',
      ambient: 'fireflies', amb: ['#f4ff8a', '#b6ffcf'], burst: ['#f4ff8a', '#9cffc4', '#ffffff'], sfx: { rate: 0.97, lp: 8000 } },
    { id: 'nebula', name: 'Deep Space', sub: 'Violet nebula · drifting ambience', back: 'midnight', music: 'nebula',
      accent: '#b9a2ff', accent2: '#6ff0e0', ui: 'rgba(10,8,30,.62)', glow: 'rgba(185,162,255,.6)', slot: 'rgba(200,190,255,.3)',
      shade: 'radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.0),rgba(0,0,0,.2) 60%,rgba(0,0,0,.55) 100%)',
      ambient: 'stars', amb: ['#ffffff', '#cfc2ff', '#9ff6ee'], burst: ['#cfc2ff', '#6ff0e0', '#ffffff'], sfx: { rate: 0.92, lp: 7500 } },
    { id: 'zen', name: 'Zen Garden', sub: 'Raked sand · cherry blossom', back: 'sakura', music: 'zen',
      accent: '#f29bb5', accent2: '#ffe1ea', ui: 'rgba(40,28,36,.62)', glow: 'rgba(242,155,181,.6)', slot: 'rgba(90,60,70,.35)',
      shade: 'radial-gradient(ellipse at 50% 45%,rgba(30,20,30,.22),rgba(30,20,30,.32) 60%,rgba(20,10,20,.6) 100%)',
      ambient: 'petals', amb: ['#f7b6c8', '#ffd6e2'], burst: ['#f7b6c8', '#ffffff', '#ffd6e2'], sfx: { rate: 1, lp: 8500 } },
    { id: 'reef', name: 'Coral Reef', sub: 'Sunlit shallows · gentle tide', back: 'reef', music: 'reef',
      accent: '#6ff0de', accent2: '#ffd08a', ui: 'rgba(4,30,44,.62)', glow: 'rgba(111,240,222,.6)', slot: 'rgba(200,255,250,.32)',
      shade: 'radial-gradient(ellipse at 50% 45%,rgba(0,30,50,.25),rgba(0,30,50,.35) 60%,rgba(0,15,30,.65) 100%)',
      ambient: 'bubbles', amb: ['#e4fffb'], burst: ['#6ff0de', '#ffffff', '#ffd08a'], sfx: { rate: 0.96, lp: 7500 } },
    { id: 'classic', name: 'Classic 95', sub: 'The original desktop look', back: 'classic', music: 'classic', classic: true,
      accent: '#ffffff', accent2: '#ffff00', ui: '#c0c0c0', glow: 'rgba(255,255,0,.7)', slot: 'rgba(0,0,0,.45)',
      shade: 'none', ambient: null, amb: [], burst: ['#ffff00', '#ffffff', '#00ffff', '#ff00ff'], sfx: { rate: 1, lp: 9000 } }
  ];
  root.THEMES.byId = function (id) { for (var i = 0; i < root.THEMES.length; i++) if (root.THEMES[i].id === id) return root.THEMES[i]; return root.THEMES[0]; };
})(this);
