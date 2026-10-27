// ================= materials, paper-doll gear, skill icons =================
// Shared material ramps, darkest to lightest. Shading always assumes light from the upper left.
const RAMP = {
  steel: ['#2a303c', '#5a6474', '#9aa6b8', '#e4ecf6'], iron: ['#202228', '#3e424e', '#6a7080', '#a8aebc'],
  dark: ['#0c0a10', '#1e1c26', '#363442', '#5e5c6e'], gold: ['#5a3c14', '#9a7428', '#d8b04a', '#fff0a0'],
  wood: ['#2e1c10', '#5a3a20', '#8a5a30', '#c08a50'], bark: ['#1a120a', '#36261a', '#5a4028', '#86663e'],
  leaf: ['#0c2212', '#1c4622', '#367632', '#74b446'], moss: ['#183812', '#346622', '#62a038', '#b0e070'],
  skin: ['#1c3612', '#386424', '#5c9a38', '#98d05e'], red: ['#3a0c14', '#7a1a26', '#c8323e', '#ff7a70'],
  cloth: ['#28080e', '#561620', '#882830', '#c04a48'], bone: ['#4a4438', '#8a8270', '#cfc6aa', '#fffaf0'],
  white: ['#76768a', '#b4b4c4', '#e6e6f0', '#ffffff'], black: ['#040306', '#0c0a10', '#1a1822', '#302c3a'],
  glass: ['#18385a', '#3674a0', '#86ccec', '#f0ffff'], purple: ['#1c0c2e', '#46226c', '#8648c4', '#d6a6ff'],
  blue: ['#0e1c46', '#223e88', '#4878d6', '#a6caff'], green: ['#0c2e16', '#226632', '#48b058', '#a6eea0'],
  cyan: ['#0c3846', '#2886a6', '#78d6ee', '#e8ffff'], leather: ['#281406', '#583216', '#885226', '#b67e46'],
  stone: ['#16141a', '#2e2a34', '#4a4652', '#76727e'], rust: ['#2a1408', '#5a2e12', '#8a4a1e', '#c07a3a'],
  fire: ['#a02408', '#f0601a', '#ffb03a', '#fff3a8'], ember: ['#5a1008', '#c0300c', '#ff7a1a', '#ffd060'],
  void: ['#3a0c4a', '#8a2ad0', '#d07aff', '#fff0ff'], dflame: ['#16061e', '#3c0e52', '#8a2ad0', '#e6a8ff'],
  eyeR: ['#7a0c10', '#e8202a', '#ff7a5a', '#fff0d0'], eyeY: ['#7a5a08', '#e0b020', '#ffe070', '#ffffe0'],
  eyeG: ['#1a5a10', '#4ae030', '#b0ff7a', '#f0fff0'], eyeO: ['#7a3008', '#ff7a1a', '#ffc060', '#fff6d0'],
  shine: ['#9aacd0', '#cad8f4', '#f2f6ff', '#ffffff'], spark: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
};
const GLOWS = new Set(['fire', 'ember', 'void', 'dflame', 'eyeR', 'eyeY', 'eyeG', 'eyeO', 'spark']);
function hexMix(a, b, t) {
  const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), Bc = p(b);
  return '#' + A.map((v, i) => Math.round(v + (Bc[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const lighten = (c, t) => hexMix(c, '#ffffff', t), darken = (c, t) => hexMix(c, '#000000', t);

// ---------- Pix: a tiny paint buffer (material + shade per pixel) ----------
function Pix(w, h, ox = 0, oy = 0) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.m = new Array(w * h).fill(null); this.s = new Int8Array(w * h); }
Pix.prototype.raw = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.m[y * this.w + x]; };
Pix.prototype.put = function (x, y, mat, s = 2) { x = Math.floor(x) + this.ox; y = Math.floor(y) + this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.m[i] = mat; this.s[i] = clamp(s, 0, 3); };
Pix.prototype.at = function (x, y) { x += this.ox; y += this.oy; return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.m[y * this.w + x]; };
Pix.prototype.clear = function (x, y) { x += this.ox; y += this.oy; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = null; };
const lit = (nx, ny, nz, x, y) => { const l = -nx * .55 - ny * .65 + nz * .52 + (((x + y) & 1) ? .05 : -.05); return l > .6 ? 3 : l > .22 ? 2 : l > -.18 ? 1 : 0; };
Pix.prototype.ell = function (cx, cy, rx, ry, mat, o = {}) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue;
    if (o.only && !this.at(x, y)) continue;
    this.put(x, y, mat, o.flat != null ? o.flat : lit(nx, ny, Math.sqrt(1 - d), x, y) + (o.b || 0));
  }
  return this;
};
Pix.prototype.box = function (x0, y0, w, h, mat, o = {}) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (o.only && !this.at(x, y)) continue;
    let s = o.flat != null ? o.flat : 2;
    if (o.flat == null) { if (y === y0 || x === x0) s = 3; if (y === y0 + h - 1 || x === x0 + w - 1) s = 1; if (o.cyl) s = lit((x + .5 - x0 - w / 2) / (w / 2), 0, .7, x, y); }
    this.put(x, y, mat, s + (o.b || 0));
  }
  return this;
};
Pix.prototype.poly = function (pts, mat, o = {}) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(1, (x1 - x0) / 2), hh = Math.max(1, (y1 - y0) / 2);
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yy = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yy) !== (by <= yy)) xs.push(ax + (yy - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x < xs[k + 1] - .5; x++) {
      if (o.only && !this.at(x, y)) continue;
      const nx = (x + .5 - cx) / hw * .8, ny = (yy - cy) / hh * .8;
      this.put(x, y, mat, o.flat != null ? o.flat : lit(nx, ny, Math.sqrt(Math.max(0, 1 - Math.min(1, nx * nx + ny * ny))), x, y) + (o.b || 0));
    }
  }
  return this;
};
// thick tapered stroke, shaded like a cylinder
Pix.prototype.line = function (ax, ay, bx, by, r0, mat, r1 = r0, o = {}) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, R = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(ay, by) - R); y <= Math.ceil(Math.max(ay, by) + R); y++) for (let x = Math.floor(Math.min(ax, bx) - R); x <= Math.ceil(Math.max(ax, bx) + R); x++) {
    const px = x + .5, py = y + .5, t = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1), qx = ax + dx * t, qy = ay + dy * t, r = r0 + (r1 - r0) * t;
    const ex = px - qx, ey = py - qy, d = Math.hypot(ex, ey); if (d > r) continue;
    if (o.only && !this.at(x, y)) continue;
    const nx = ex / Math.max(.5, r), ny = ey / Math.max(.5, r);
    this.put(x, y, mat, o.flat != null ? o.flat : lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), x, y) + (o.b || 0));
  }
  return this;
};
Pix.prototype.px = function (x, y, mat, s = 2) { this.put(x, y, mat, s); return this; };
// bake: rim light on exposed upper-left edges, a dark outline, and a soft halo around glowing materials
Pix.prototype.bake = function (o = {}) {
  const w = this.w, h = this.h, P = 1, cvs = document.createElement('canvas'); cvs.width = w + P * 2; cvs.height = h + P * 2;
  const g = cvs.getContext('2d'), img = g.createImageData(cvs.width, cvs.height), D = img.data;
  const at = (x, y) => this.raw(x, y), set = (x, y, c, a = 255) => { const i = ((y + P) * cvs.width + x + P) * 4; D[i] = parseInt(c.slice(1, 3), 16); D[i + 1] = parseInt(c.slice(3, 5), 16); D[i + 2] = parseInt(c.slice(5, 7), 16); D[i + 3] = a; };
  const out = o.outline || '#07060a';
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const m = at(x, y);
    if (m) {
      let s = this.s[y * w + x];
      if (!o.noRim) { if (!at(x, y - 1) || !at(x - 1, y)) s++; if (!at(x, y + 1) || !at(x + 1, y)) s--; }
      let c = RAMP[m][clamp(s, 0, 3)];
      if (o.tint) c = o.tint(c, m);
      set(x, y, c);
    } else {
      let n = 0, gl = null;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = at(x + a, y + b); if (q) { if (GLOWS.has(q)) gl = gl || q; else n++; } }
      if (n && !o.noOutline) set(x, y, out);
      else if (gl && !o.noGlow) set(x, y, RAMP[gl][1], 150);
      else if (!o.noGlow) { for (const [a, b] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) { const q = at(x + a, y + b); if (q && GLOWS.has(q)) { set(x, y, RAMP[q][1], 90); break; } } }
    }
  }
  g.putImageData(img, 0, 0);
  return cvs;
};
// tinted copy of a canvas (flash white, hurt red, dim)
const tintCache = new WeakMap();
function tinted(cvs, col, a = 1) {
  let m = tintCache.get(cvs); if (!m) { m = {}; tintCache.set(cvs, m); }
  const k = col + a; if (m[k]) return m[k];
  const c = document.createElement('canvas'); c.width = cvs.width; c.height = cvs.height; const g = c.getContext('2d');
  g.drawImage(cvs, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return (m[k] = c);
}

// ---------- gear looks: every class has its own pool, every look its own hand-made sprite ----------
// Rows legend: A/M/N tier metal light-mid-dark, X/Z/x rarity colour mid-light-dark, o/O wood, s string, L/l leather,
// y/Y gold, u/U bone, k black, c/C ice, f/F fire, g/G leaf, p/P violet, r/R red, q white, e glow (rarity light, shines),
// + the hand grip. m = lowest rarity it can drop at (rarer rolls unlock bigger silhouettes). w/ey/ox = worn placement.
const LOOKS = {
  warrior: {
    weapon: [
      { n: 'Shortsword', m: 0, r: ['.A.', '.AN', '.AN', '.AN', 'XXX', '.+.', '.x.'] },
      { n: 'Hand Axe', m: 0, r: ['NMA.', 'NMAo', '.Nxo', '...o', '...o', '...+', '...O'] },
      { n: 'Broadsword', m: 1, r: ['..A..', '.AAN.', '.AMN.', '.AMN.', '.AMN.', '.AMN.', 'xXXXx', '..+..', '..X..'] },
      { n: 'Falchion', m: 1, r: ['...A', '..AN', '.AMN', '.AN.', '.AN.', '.AN.', 'XXX.', '.+..', '.x..'] },
      { n: 'Battleaxe', m: 2, r: ['...Z...', 'MA.o.AM', 'MMAoAMM', 'NMXoXMN', 'N..o..N', '...o...', '...o...', '...+...', '...O...'] },
      { n: 'Claymore', m: 3, r: ['..A..', '.AAN.', '.AMN.', '.AMN.', '.AMN.', '.AMN.', '.AMN.', 'XXXXX', 'x.+.x', '..O..', '..X..'] },
      { n: 'Greatsword', m: 3, r: ['..A..', '.AAN.', '.AMN.', '.AMN.', '.AMN.', '.AxN.', '.AMN.', 'yyXyy', '..+..', '..O..', '..y..'] },
      { n: 'Executioner', m: 4, r: ['..AA.', '.AMMo', 'AMMNo', 'AMMNo', 'AMNxo', '.NN.o', '....o', '....o', '....+', '....o', '....X'] },
      { n: 'Emberfang', m: 4, u: 'emberfang', r: ['.F.', '.Ff', 'fAN', '.AN', 'fAN', '.AN', 'rRr', '.+.', '.r.'], fx: { burn: .25 }, d: 'Hits set foes ablaze', glow: '#ff7a1a' },
      { n: 'Kingsplitter', m: 4, u: 'kingsplitter', r: ['..q..', '.qAy.', '.AMy.', '.AXy.', '.AMy.', '.AMy.', '.AMy.', 'yyZyy', 'y.+.y', '..R..', '..y..'], fx: { perfMult: .6 }, d: 'Perfect hits +60%', glow: '#ffe070' },
    ],
    helm: [
      { n: 'Cap', m: 0, r: ['..MMMM..', '.AMMMMN.', '.XXXXXX.'] },
      { n: 'Great Helm', m: 1, ey: 3, r: ['..AMMN..', '.AMMMMN.', '.MXMMXM.', '.M....M.'] },
      { n: 'Horned Helm', m: 2, r: ['u......u', 'u.AMMN.u', '.AMMMMN.', '.XXXXXX.'] },
      { n: 'Plumed Helm', m: 3, r: ['....XZ..', '...XX...', '..AMMN..', '.AMMMMN.', '.NXXXXN.'] },
      { n: 'Winged Helm', m: 4, r: ['q......q', 'qq.AN.qq', '.qAMMNq.', '.AMMMMN.', '.XXXXXX.'] },
      { n: 'Crown of Thorns', m: 4, u: 'thorncrown', r: ['r.G..G.r', '.GyyyyG.', '.yRyyRy.'], fx: { thorns: .3 }, d: 'Reflects 30% of blows', glow: '#ff3a3a' },
    ],
    armor: [
      { n: 'Mail', m: 0, pat: 'mail', ic: ['.MM..MM.', 'MAMNMNMN', '.MNMNMN.', '.NMXXNM.', '.MNMNMN.', '.NMNMNM.', '.XXXXXX.'] },
      { n: 'Scale', m: 1, pat: 'scale', ic: ['.MM..MM.', 'MAAMMMMN', '.ANANAN.', '.NANANA.', '.ANANAN.', '.NANANA.', '.XXXXXX.'] },
      { n: 'Plate', m: 2, pat: 'plate', ic: ['.AA..MN.', 'AAAMMMMN', '.AMMMMN.', '.AMXXMN.', '.AMMMMN.', '.AMMMMN.', '.XNNNNX.'] },
      { n: 'Gilded Plate', m: 4, pat: 'gild', ic: ['.yy..yy.', 'yAAMMMMy', '.AMMMMN.', '.yMXXMy.', '.AMyyMN.', '.AMMMMN.', '.yXXXXy.'] },
      { n: 'Aegis Plate', m: 4, u: 'aegis', pat: 'aegis', ic: ['.qq..qq.', 'qAAMMMMq', '.AyyyyN.', '.AyXXyN.', '.AyyyyN.', '.AMyyMN.', '.qXXXXq.'], fx: { aegis: 1 }, d: 'Blocks the first blow each wave', glow: '#a6caff' },
    ],
    boots: [
      { n: 'Boots', m: 0, pat: 'boots', ic: ['.XXX....', '.lll....', '.lll....', '.llll...', '.lllll..', '.LLLLL..'] },
      { n: 'Greaves', m: 1, pat: 'greave', ic: ['.AMN....', '.AMN....', '.AXN....', '.AMN....', '.AMMN...', '.NNNNN..'] },
      { n: 'Sabatons', m: 3, pat: 'sabaton', ic: ['.XAN....', '.AMN....', '.AXN....', '.AMMN...', '.AMMMN..', 'XNNNNNX.'] },
    ],
    ring: [{ n: 'Signet', m: 0, ic: ['..AXXA..', '..yXXy..', '.y....y.', '.y....y.', '..yyyy..'] }, { n: 'War Band', m: 2, ic: ['...XX...', '..XZZX..', '.y.XX.y.', '.y....y.', '..yyyy..'] }],
    charm: [{ n: 'Talisman', m: 0, w: 'medal', ic: ['..yyyy..', '.y....y.', '...XX...', '..XZZX..', '..XZZX..', '...XX...'] }, { n: 'War Medal', m: 2, w: 'star', ic: ['.R.yy.R.', '.RR..RR.', '..RyyR..', '..yXZy..', '.yXZZXy.', '..yXXy..', '...yy...'] }],
  },
  archer: {
    weapon: [
      { n: 'Shortbow', m: 0, r: ['Xo..', 's.o.', 's..o', 's..+', 's..o', 's.o.', 'Xo..'] },
      { n: 'Recurve', m: 1, r: ['..oX', '.o..', 's...', 's.o.', 's..+', 's.o.', 's...', '.o..', '..oX'] },
      { n: 'Crossbow', m: 1, r: ['....o.', '....so', 'NMMAAX', '.+..so', '....o.'] },
      { n: 'Longbow', m: 2, r: ['Xo..', 'so..', 's.o.', 's.o.', 's..o', 's..+', 's..o', 's.o.', 's.o.', 'so..', 'Xo..'] },
      { n: 'Heavy Crossbow', m: 3, r: ['....AM.', '....sAM', 'ONMMMAAX', '.+...sAM', '.....AM.'] },
      { n: 'Greatbow', m: 4, r: ['Z...', 'Xo..', 'so..', 's.o.', 's.o.', 's..o', 's..+', 's..o', 's.o.', 's.o.', 'so..', 'Xo..', 'Z...'] },
      { n: 'Windpiercer', m: 4, u: 'windpiercer', r: ['cq..', 'sCC.', 's..C', 's..+', 's..C', 'sCC.', 'cq..'], fx: { multi: .3 }, d: 'Arrows pierce every foe for 30%', glow: '#78d6ee' },
      { n: 'Nightstring', m: 4, u: 'nightstring', r: ['pP..', 'sPP.', 's..P', 's..e', 's..+', 's..P', 'sPP.', 'pP..'], fx: { bleed: .3 }, d: 'Arrows make foes bleed', glow: '#d07aff' },
    ],
    helm: [
      { n: 'Hood', m: 0, mat: 'leather', r: [] },
      { n: 'Cowl', m: 1, mat: 'rar', ey: 4, r: ['...X....'] },
      { n: 'Feathered Hood', m: 2, mat: 'leather', ey: 4, r: ['......Zq', '.....Zx.'] },
      { n: 'Antler Hood', m: 3, mat: 'rar', ey: 5, r: ['u.u..u.u', '.uu..uu.', '..u..u..'] },
      { n: 'Raven Hood', m: 4, mat: 'dark', ey: 4, r: ['k......k', 'Pk....kP'] },
      { n: 'Fox Hood', m: 4, u: 'foxhood', mat: 'fox', ey: 5, r: ['.r....r.', '.rf..fr.'], fx: { dodge: .12 }, d: '12% chance to dodge blows', glow: '#ff7a1a' },
    ],
    armor: [
      { n: 'Leathers', m: 0, pat: 'leather', ic: ['.ll..ll.', 'lLlllllL', '.LLlllL.', '.LlXXlL.', '.LllllL.', '.LllllL.', '.llXXll.'] },
      { n: 'Studded', m: 1, pat: 'studded', ic: ['.ll..ll.', 'lLAlllAL', '.LlAlAL.', '.LAXXAL.', '.LlAlAL.', '.LAlllL.', '.llXXll.'] },
      { n: 'Ranger Coat', m: 2, pat: 'coat', ic: ['.GG..GG.', 'GgGGGGgG', '.gGllGg.', '.gGXXGg.', '.gGllGg.', 'gGGllGGg', 'gG....Gg'] },
      { n: 'Shadow Leathers', m: 4, pat: 'shadow', ic: ['.PP..PP.', 'PpPPPPpP', '.pPPPPp.', '.pPXXPp.', '.pPPPPp.', '.pPPPPp.', '.ZZZZZZ.'] },
    ],
    boots: [
      { n: 'Wraps', m: 0, pat: 'wrap', ic: ['.uU.....', '.Uu.....', '.uU.....', '.UuU....', '.uUuU...', '.LLLL...'] },
      { n: 'Boots', m: 1, pat: 'lboot', ic: ['.LLL....', '.lXl....', '.lll....', '.llll...', '.lllll..', '.LLLLL..'] },
      { n: 'Swift Boots', m: 3, pat: 'swift', ic: ['qZ......', '.ZXX....', 'qXXX....', '.XXXX...', '.xXXXX..', '.xxxxx..'] },
    ],
    ring: [{ n: "Hunter's Ring", m: 0, ic: ['...gg...', '..gXXg..', '.o....o.', '.o....o.', '..oooo..'] }, { n: 'Eagle Ring', m: 2, ic: ['.Z.XX.Z.', '..ZXXZ..', '.y....y.', '.y....y.', '..yyyy..'] }],
    charm: [
      { n: 'Quiver', m: 0, w: 'quiver', ic: ['.q.q....', '.s.s....', 'LLLLL...', 'LllL....', 'LllL....', 'LXXL....', 'LllL....', '.LL.....'] },
      { n: 'Hunter Quiver', m: 2, w: 'quiver2', ic: ['q.q.q...', 's.s.s...', 'XLLLLX..', 'LlllL...', 'LXXlL...', 'LlllL...', 'LXXlL...', '.LLL....'] },
      { n: 'Quiver of Stars', m: 4, u: 'starquiver', w: 'quiver3', ic: ['e.e.e...', 'c.c.c...', 'PyyyyP..', 'PpppP...', 'PqppP...', 'PppqP...', 'PpppP...', '.PPP....'], fx: { volley: .3 }, d: 'Fires extra star arrows', glow: '#e8ffff' },
    ],
  },
  mage: {
    weapon: [
      { n: 'Wand', m: 0, r: ['Z', 'X', 'o', '+', 'O'] },
      { n: 'Orb Staff', m: 0, r: ['.X.', 'XcX', '.X.', '.o.', '.o.', '.o.', '.o.', '.+.', '.o.', '.o.', '.O.'] },
      { n: 'Crook', m: 1, r: ['.oo.', 'o..o', 'o..X', 'o...', '.o..', '.o..', '.o..', '.+..', '.o..', '.o..', '.O..'] },
      { n: 'Scepter', m: 2, r: ['..Z..', '.ZXZ.', '.XZX.', '..X..', '.A.A.', '..M..', '..M..', '..+..', '..M..', '..N..'] },
      { n: 'Skull Staff', m: 3, r: ['.uu.', 'ukku', '.uu.', '..o.', '..o.', '..o.', '..o.', '..+.', '..o.', '..o.', '..O.'] },
      { n: 'Crystal Staff', m: 4, r: ['.c.', 'cqC', 'cCC', '.C.', 'XoX', '.o.', '.o.', '.o.', '.+.', '.o.', '.O.'] },
      { n: 'Staff of Ruin', m: 4, u: 'ruin', r: ['p.p', 'pep', '.P.', '.o.', '.o.', '.o.', '.o.', '.+.', '.o.', '.O.'], fx: { splash: .3 }, d: 'Blasts splash 30% wider', glow: '#d07aff' },
      { n: 'Wand of Echoes', m: 4, u: 'echoes', r: ['.q.', 'q.q', '.q.', '.y.', '.o.', '.+.', '.O.'], fx: { echo: .4 }, d: 'Perfect hits echo for 40%', glow: '#e8ffff' },
    ],
    helm: [
      { n: 'Pointed Hat', m: 0, mat: 'rar', r: [] },
      { n: 'Wide Brim', m: 1, mat: 'rar', ey: 1, ox: -2, r: ['xxxxxxxxxx'] },
      { n: 'Circlet', m: 2, mat: 'clear', ey: 3, r: ['....Z...', '..uuuu..', '.yyXyyy.'] },
      { n: 'Horned Cowl', m: 3, mat: 'dark', ey: 6, r: ['u......u', 'u......u'] },
      { n: 'Star Hat', m: 4, mat: 'blue', ey: 6, r: ['.....q..', '........', '..q.....', '......q.'] },
      { n: 'Hat of Stars', m: 4, u: 'starhat', mat: 'void', ey: 7, r: ['...yqy..', '....y...'], fx: { perfZ: .25 }, d: 'Perfect zone +25%', glow: '#ffe070' },
    ],
    armor: [
      { n: 'Robe', m: 0, pat: 'robe', ic: ['.yy..yy.', 'yZXXXXxy', '.ZXZXXx.', '.ZXZXXx.', '.ZXZXXx.', 'ZXXZXXXx', 'yyyyyyyy'] },
      { n: 'Mantle', m: 2, pat: 'mantle', ic: ['yXXyyXXy', 'XZXXXXXx', '.pPPPPp.', '.pPyyPp.', '.pPPPPp.', 'pPPPPPPp', 'yyyyyyyy'] },
      { n: 'Starweave', m: 4, pat: 'star', ic: ['.yy..yy.', 'yBBBBBBy', '.BqBBBB.', '.BBBBqB.', '.BBqBBB.', 'BqBBBBqB', 'yyyyyyyy'] },
    ],
    boots: [
      { n: 'Slippers', m: 0, pat: 'slip', ic: ['........', '..XX....', '.XZZX...', '.XXXXX..', 'xxxxxxZ.'] },
      { n: 'Rune Slippers', m: 2, pat: 'rune', ic: ['..y.....', '..XX....', '.XeyX...', '.XXXXX..', 'yyyyyyZ.'] },
    ],
    ring: [{ n: 'Rune Ring', m: 0, ic: ['...pp...', '..pXXp..', '.y....y.', '.y....y.', '..yyyy..'] }, { n: 'Star Ring', m: 2, ic: ['.q.XX.q.', '..qZZq..', '.y.XX.y.', '.y....y.', '..yyyy..'] }],
    charm: [
      { n: 'Glass Orb', m: 0, w: 'orb', o: ['.c.', 'cqC', '.C.'], ic: ['..cccc..', '.cqcccC.', 'cqcccccC', 'cccccccC', 'ccccccCC', '.cCCCCC.', '..CCCC..'] },
      { n: 'Ember Orb', m: 2, w: 'orb', o: ['.f.', 'fFf', '.r.'], ic: ['..ffff..', '.fFfffr.', 'fFfffffr', 'ffffFffr', 'fffffrrr', '.frrrrr.', '..rrrr..'] },
      { n: 'Void Orb', m: 4, w: 'orb', o: ['.p.', 'pep', '.P.'], ic: ['..pppp..', '.peppPP.', 'peppppPP', 'pppekpPP', 'ppppppPP', '.pPPPPP.', '..PPPP..'] },
      { n: 'Frostheart', m: 4, u: 'frostheart', w: 'orb', o: ['c.c', 'qcC', '.C.'], ic: ['.cc..cc.', 'cqcccccC', 'cqcccccC', 'ccccccCC', '.ccccCC.', '..cCCC..', '...CC...'], fx: { chill: 1 }, d: 'Hits chill and briefly freeze', glow: '#a6caff' },
    ],
  },
};
const TIERM = [RAMP.steel, ['#2a221e', '#5a4a40', '#8a7868', '#c0b0a0'], RAMP.bone, RAMP.purple];
const itemTier = it => clamp(Math.floor((it.ilvl - 1) / 3), 0, 3);
const itemCls = it => it.cls && LOOKS[it.cls] ? it.cls : 'warrior';
const lookList = it => LOOKS[itemCls(it)][it.slot];
function itemLook(it) { const L = lookList(it); if (it.lk != null && L[it.lk]) return it.lk; const n = L.filter(l => !l.u).length; return ((it.look != null ? it.look : it.id) % n + n) % n; }
const lookOf = it => lookList(it)[itemLook(it)];
function lookName(it) { return lookOf(it).n; }
// rarer rolls favour the rarest silhouette they qualify for; ancient/white rolls can become a named unique
function pickLook(cls, slot, rar) {
  const L = LOOKS[cls][slot], uq = L.map((l, i) => [l, i]).filter(([l]) => l.u && l.m <= rar);
  if (uq.length && rar >= 4 && Math.random() < .35) return pick(uq)[1];
  const ok = L.map((l, i) => [l, i]).filter(([l]) => !l.u && l.m <= rar), top = Math.max(...ok.map(([l]) => l.m));
  const w = ok.map(([l]) => l.m === top ? 3 : 1); let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < ok.length; k++) { r -= w[k]; if (r <= 0) return ok[k][1]; } return ok[0][1];
}
function gearColors(it) {
  const m = TIERM[itemTier(it)], c = RAR[it.rar].c, L = RAMP.leather;
  return { A: m[3], M: m[2], N: m[1], X: c, Z: lighten(c, .45), x: darken(c, .4), e: lighten(c, .7), o: PAL.o, O: PAL.O, s: PAL.s, c: PAL.c, C: PAL.C, u: PAL.u, U: PAL.U, y: PAL.y, Y: PAL.Y, k: '#000000',
    '+': PAL.W, W: m[2], L: L[2], l: L[1], f: PAL.f, F: PAL.F, g: '#48b058', G: '#226632', p: '#8648c4', P: '#46226c', r: PAL.r, R: PAL.R, q: '#ffffff', B: '#223e88' };
}
// worn patterns: chest
function chestPx(pat, x, y, i, n, first, last, C) {
  const L = RAMP.leather, left = i === 0, right = i === n - 1, mid = i === n >> 1 || i === (n - 1) >> 1;
  switch (pat) {
    case 'mail': return last ? C.X : first ? C.A : ((x + y) & 1 ? C.M : C.N);
    case 'scale': return last ? C.X : first ? C.A : ((x + (y & 1)) % 2 ? C.A : C.N);
    case 'plate': return last ? C.X : first || left ? C.A : right ? C.N : (mid && y === first + 1 ? C.X : C.M);
    case 'gild': return first || last ? PAL.y : left ? C.A : right ? C.N : mid ? PAL.y : C.M;
    case 'aegis': return first ? '#ffffff' : last ? PAL.y : mid ? C.X : left ? C.A : right ? C.N : PAL.y;
    case 'leather': return last ? (mid ? C.X : L[1]) : left ? L[3] : right ? L[1] : L[2];
    case 'studded': return last ? (mid ? C.X : L[1]) : (x + y) % 3 === 0 ? C.A : left ? L[3] : right ? L[1] : L[2];
    case 'coat': return last ? (mid ? C.X : '#226632') : mid ? L[1] : left ? '#48b058' : right ? '#0c2e16' : '#226632';
    case 'shadow': return last ? C.Z : first ? C.X : left ? '#46226c' : right ? '#1c0c2e' : '#2c1444';
    case 'robe': return first || last ? PAL.y : mid ? C.Z : right ? C.x : C.X;
    case 'mantle': return first ? (mid ? PAL.y : C.X) : last ? PAL.y : left ? '#8648c4' : right ? '#1c0c2e' : '#46226c';
    case 'star': return first || last ? PAL.y : ((x * 7 + y * 13) % 5 === 0 ? '#ffffff' : right ? '#0e1c46' : '#223e88');
  }
  return C.M;
}
function bootPx(pat, x, y, top, C) {
  const L = RAMP.leather;
  switch (pat) {
    case 'boots': return top ? C.X : L[1];
    case 'greave': return top ? C.A : (x & 1 ? C.N : C.M);
    case 'sabaton': return top ? C.X : (x & 1 ? C.A : C.M);
    case 'wrap': return (y & 1) ? PAL.u : PAL.U;
    case 'lboot': return top ? L[3] : L[1];
    case 'swift': return top ? C.Z : C.X;
    case 'slip': return top ? C.Z : C.X;
    case 'rune': return top ? PAL.y : C.X;
  }
  return C.M;
}
const HOODMAT = { leather: RAMP.leather, dark: RAMP.dark, blue: RAMP.blue, void: RAMP.purple, fox: ['#7a3008', '#c0500c', '#ff7a1a', '#ffc060'] };
function wearLayers(D, gear, at, set, setBack) {
  const rowXs = (y, chars) => { const xs = []; for (let x = 0; x < 12; x++) { const p = at(x, y); if (p && p.gl < 0 && chars.includes(p.ch)) xs.push(x); } return xs; };
  const tag = it => it.u ? Math.max(4, it.rar) : it.rar;
  // chest
  let it = gear.armor;
  if (it) {
    const C = gearColors(it), L = lookOf(it);
    for (let y = D.tor[0]; y <= D.tor[1]; y++) { const xs = rowXs(y, D.tc); xs.forEach((x, i) => set(x, y, chestPx(L.pat, x, y, i, xs.length, y === D.tor[0], y === D.tor[1], C), tag(it), 'g')); }
  }
  // boots (mages only show slipper tips under the robe)
  it = gear.boots;
  if (it) {
    const C = gearColors(it), L = lookOf(it);
    for (let y = D.leg[0]; y <= D.leg[1]; y++) {
      if (D.f === 'm' && y !== D.leg[1]) continue;
      const xs = rowXs(y, D.lc);
      xs.forEach((x, i) => { if (D.f === 'm' && !(i === 1 || i === 2 || i === xs.length - 2 || i === xs.length - 3)) return; set(x, y, bootPx(L.pat, x, y, y === D.leg[0], C), tag(it), 'g'); });
    }
  }
  // helm / hood / hat
  it = gear.helm;
  if (it) {
    const C = gearColors(it), L = lookOf(it);
    if (D.f !== 'w') {
      const y1 = D.f === 'a' ? D.ey + 2 : (D.brim != null ? D.brim : D.hat[1]), px = []; let x0 = 99, x1 = -1;
      for (let y = 0; y <= y1; y++) for (let x = 0; x < 12; x++) { const p = at(x, y); if (p && p.gl < 0 && (D.hc.includes(p.ch) || (D.f === 'm' && y === D.brim && 'yf'.includes(p.ch)))) { px.push([x, y]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
      const R = HOODMAT[L.mat];
      px.forEach(([x, y]) => {
        if (L.mat === 'clear') { set(x, y, null); return; }
        const s = x === x0 ? 3 : x === x1 ? 0 : (x + y) & 1 ? 1 : 2;
        set(x, y, R ? R[s] : [C.x, C.X, C.X, C.Z][s], tag(it), 'g');
      });
      if (D.f === 'm' && D.brim != null && L.mat !== 'clear') for (let x = 0; x < 12; x++) { const p = at(x, D.brim); if (p && p.ch === 'g') set(x, D.brim, R ? R[0] : C.x, tag(it), 'g'); }
    }
    const rows = L.r, ey = L.ey != null ? L.ey : rows.length, ox = L.ox != null ? L.ox : -1;
    rows.forEach((row, i) => row.split('').forEach((ch, j) => { if (ch !== '.') set(D.fx + ox + j, D.ey - ey + i, C[ch] || PAL[ch], ch === 'e' ? 5 : tag(it), 'g'); }));
  }
  // weapon in hand
  it = gear.weapon;
  if (it) {
    const C = gearColors(it), L = lookOf(it), rows = L.r;
    let ax = 0, ay = 0; rows.forEach((r, y) => { const i = r.indexOf('+'); if (i >= 0) { ax = i; ay = y; } });
    const hx = D.hand[0] - (D.f === 'a' && rows[0].length > 5 ? 1 : 0), hy = D.hand[1];
    rows.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch !== '.') set(hx - ax + x, hy - ay + y, C[ch] || PAL[ch], ch === '+' ? -1 : ch === 'e' ? 5 : tag(it), ch === '+' ? 'W' : 'g'); }));
  }
  if (gear.ring) { const p = at(D.hand[0] - 1, D.hand[1]); if (!p || p.gl < 0) set(D.hand[0] - 1, D.hand[1], RAR[gear.ring.rar].c, tag(gear.ring), 'g'); }
  // charm: medal on the chest, quiver on the back (behind the body), or a floating orb (drawn by drawChar)
  it = gear.charm; let orb = null;
  if (it) {
    const C = gearColors(it), L = lookOf(it), cx = D.fx + 2, cy = D.tor[0] + (D.f === 'm' ? 0 : 1);
    if (L.w === 'star') { set(cx, cy, C.Z, tag(it), 'g'); set(cx - 1, cy, PAL.y, tag(it), 'g'); set(cx + 1, cy, PAL.y, tag(it), 'g'); set(cx, cy - 1, PAL.R, -1, 'g'); set(cx, cy + 1, PAL.y, tag(it), 'g'); }
    else if (L.w && L.w.startsWith('quiver')) {
      const q = { quiver: ['q.q', 's.s', 'LLL', 'lLl', 'lXl', 'lLl', '.l.'], quiver2: ['qqq', 'sss', 'XLX', 'lLl', 'XXl', 'lLl', '.l.'], quiver3: ['eee', 'ccc', 'yyy', 'PpP', 'PqP', 'PpP', '.P.'] }[L.w];
      q.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch !== '.') setBack(x, 1 + y, C[ch] || PAL[ch], ch === 'e' ? 5 : tag(it), 'g'); }));
    } else if (L.w === 'orb') orb = { rows: L.o, C, r: tag(it) };
    else { set(cx, cy, RAR[it.rar].c, tag(it), 'g'); set(cx + 1, cy - 1, PAL.y, -1, 'y'); set(cx - 1, cy - 1, PAL.y, -1, 'y'); }
  }
  return orb;
}
// per base sprite: eye row, face left col, torso/leg rows and recolourable chars, hand, hood/hat, cape colour + neck
const DOLL = {
  warrior: { f: 'w', ey: 2, fx: 3, tor: [6, 9], tc: 'Ww', leg: [10, 11], lc: 'Ww', hand: [10, 7], cape: '#c8323e', neck: [3, 6] },
  knight: { f: 'w', ey: 3, fx: 3, tor: [7, 9], tc: 'Ww', leg: [10, 11], lc: 'gG', hand: [10, 8], cape: '#2a4fa8', neck: [3, 7] },
  berserker: { f: 'w', ey: 3, fx: 3, tor: [6, 9], tc: 'Ww', leg: [10, 11], lc: 'Ww', hand: [10, 7], cape: '#8a2430', neck: [3, 6], strip: [[11, 2], [10, 3], [9, 4], [8, 5], [0, 6], [1, 7], [2, 8]] },
  archer: { f: 'a', ey: 3, fx: 3, tor: [6, 9], tc: 'hH', leg: [10, 11], lc: 'O', hand: [11, 6], hat: [0, 2], hc: 'Hh', cape: '#2f6e3c', neck: [2, 6] },
  ranger: { f: 'a', ey: 3, fx: 4, tor: [6, 9], tc: 'hH', leg: [10, 11], lc: 'O', hand: [11, 6], hat: [0, 2], hc: 'Hh', cape: '#1e5a2a', neck: [2, 6] },
  sniper: { f: 'a', ey: 3, fx: 3, tor: [7, 9], tc: 'gG', leg: [10, 11], lc: 'G', hand: [11, 6], hat: [0, 2], hc: 'Gg', cape: '#5a3080', neck: [2, 6] },
  mage: { f: 'm', ey: 5, fx: 3, tor: [8, 9], tc: 'Bb', leg: [10, 11], lc: 'Bb', hand: [10, 7], hat: [0, 3], hc: 'P', brim: 4, cape: '#5a3080', neck: [2, 8] },
  pyro: { f: 'm', ey: 5, fx: 3, tor: [8, 9], tc: 'Rr', leg: [10, 11], lc: 'Rr', hand: [10, 7], hat: [0, 3], hc: 'R', brim: 4, cape: '#ff7a1a', neck: [2, 8] },
  cryo: { f: 'm', ey: 3, fx: 3, tor: [6, 9], tc: 'Cc', leg: [10, 11], lc: 'Cc', hand: [10, 6], hat: [0, 2], hc: 'cC', cape: '#9fe6f4', neck: [2, 6] },
};
function stripPx(spr, D, x, y) {
  if (D.strip) return D.strip.some(([a, b]) => a === x && b === y);
  if (spr === 'knight') return x >= 10 || (x === 9 && y === 7);
  if (D.f === 'm') return (y <= 3 && x >= 9) || (y >= 4 && y <= 9 && x >= 10);
  return x >= 9;
}
const gearSig = g => SLOTS.map(s => { const it = g[s]; return it ? s[0] + itemCls(it)[0] + itemLook(it) + itemTier(it) + it.rar : '-'; }).join('');
const DW = 18, DH = 17, DPL = 2, DPT = 4;
const dCache = new Map();
function buildDoll(spr, gear, variant = '', rim = null) {
  const key = spr + '|' + gearSig(gear) + '|' + variant + '|' + rim; let d = dCache.get(key); if (d) return d;
  const D = DOLL[spr] || DOLL.warrior, P = Array.from({ length: DH }, () => Array(DW).fill(null));
  const at = (x, y) => (P[y + DPT] || [])[x + DPL];
  const set = (x, y, c, gl, ch) => { const yy = y + DPT, xx = x + DPL; if (xx < 0 || yy < 0 || xx >= DW || yy >= DH) return; P[yy][xx] = c ? { c, gl, ch } : null; };
  SPR[spr].forEach((r, y) => r.split('').forEach((ch, x) => { if (ch !== '.' && !stripPx(spr, D, x, y)) set(x, y, PAL[ch], -1, ch); }));
  const setBack = (x, y, c, gl, ch) => { if (!at(x, y)) set(x, y, c, gl, ch); };
  const orb = wearLayers(D, gear, at, set, setBack);
  // bake
  const mk = () => { const c = document.createElement('canvas'); c.width = DW; c.height = DH; return c; };
  const cv0 = mk(), g = cv0.getContext('2d'), gp = []; let halo = null, rimc = null;
  for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
    const p = P[y][x]; if (!p) continue; let c = p.c;
    if (variant === 'flash') c = '#ffffff'; else if (variant === 'hurt') c = p.ch === 'k' || p.ch === 'K' ? '#330000' : '#ff6a6a'; else if (variant === 'dim') c = '#3a3a44';
    g.fillStyle = c; g.fillRect(x, y, 1, 1); if (p.gl >= 0) gp.push([x, y, p.gl]);
  }
  if (variant === '') {
    const hp = []; const filled = (x, y) => P[y] && P[y][x];
    for (const [x, y, r] of gp) if (r >= 3) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (!filled(x + a, y + b)) hp.push([x + a, y + b, r]);
    if (hp.length) { halo = mk(); const hg = halo.getContext('2d'); for (const [x, y, r] of hp) { hg.fillStyle = RAR[r].c; hg.fillRect(x, y, 1, 1); } }
    if (rim) { rimc = mk(); const rg = rimc.getContext('2d'); rg.fillStyle = rim; for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) if (P[y][x] && P[y][x].ch !== 'k' && (!filled(x + 1, y) || !filled(x, y - 1) && !filled(x + 1, y - 1))) rg.fillRect(x, y, 1, 1); }
  }
  let orbCv = null;
  if (orb) { orbCv = mk(); orbCv.width = 3; orbCv.height = 3; const og = orbCv.getContext('2d'); orb.rows.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch !== '.') { og.fillStyle = variant === 'flash' ? '#fff' : variant === 'dim' ? '#3a3a44' : (orb.C[ch] || PAL[ch]); og.fillRect(x, y, 1, 1); } })); }
  const uniq = SLOTS.some(s => gear[s] && gear[s].u);
  d = { cv: cv0, halo, rim: rimc, gp, D, orbCv, uniq };
  if (dCache.size > 400) dCache.clear();
  dCache.set(key, d); return d;
}
// draw a character with its gear at the top-left of its 12x12 body cell
function drawChar(c, x, y, sc, variant = '', o = {}) {
  const spr = o.spr || charSpr(c), gear = o.gear || c.gear, d = buildDoll(spr, gear, variant, o.rim || null);
  const ox = Math.round(x) - DPL * sc, oy = Math.round(y) - DPT * sc, A = o.alpha != null ? o.alpha : 1;
  ctx.globalAlpha = A;
  if (variant !== 'dim' && !o.noCape) drawCape(d.D, Math.round(x), Math.round(y), sc, o.dash || 0, o.seed || 0, variant, (evoLook(c) || {}).cape);
  if (d.halo) { ctx.globalAlpha = A * (.3 + .22 * Math.sin(gtime * 4 + (o.seed || 0))); if (d.uniq && !RM) ctx.filter = 'hue-rotate(' + Math.round(gtime * 90 % 360) + 'deg)'; ctx.drawImage(d.halo, ox, oy, DW * sc, DH * sc); ctx.filter = 'none'; ctx.globalAlpha = A; }
  if (o.evo !== false) drawEvoBack(c, x, y, sc, variant, A);
  ctx.drawImage(d.cv, ox, oy, DW * sc, DH * sc);
  if (d.rim) { ctx.globalAlpha = A * .5; ctx.drawImage(d.rim, ox, oy, DW * sc, DH * sc); ctx.globalAlpha = A; }
  if (o.evo !== false) drawEvoFront(c, x, y, sc, variant, A);
  if (d.orbCv) { const bob = RM ? 0 : Math.round(Math.sin(gtime * 3 + (o.seed || 0)) * 1.2); ctx.drawImage(d.orbCv, Math.round(x) - 3 * sc, Math.round(y) + (5 + bob) * sc, 3 * sc, 3 * sc); }
  if (variant === '') { const sp = d.gp.filter(p => p[2] >= 4); if (sp.length) { const k = Math.floor(gtime * 6 + (o.seed || 0) * 3) % (sp.length * 3); if (k < sp.length) rect(ox + sp[k][0] * sc, oy + sp[k][1] * sc, sc, sc, '#ffffff'); } }
  ctx.globalAlpha = 1;
}
// secondary motion: a short cape/scarf that sways when idle and streams back when dashing
function drawCape(D, x, y, sc, dash, seed, variant, capeCol) {
  const base = capeCol || D.cape, col = variant === 'flash' ? '#ffffff' : variant === 'hurt' ? '#ff6a6a' : base, dk = variant ? col : darken(base, .35);
  const [nx, ny] = D.neck, sw = RM ? 0 : 1;
  for (let i = 1; i <= 4; i++) {
    const droop = (1 - dash) * i * .55, wave = Math.sin(gtime * 5 + seed - i * .9) * i * .3 * sw;
    const px = nx - i - (dash > .5 ? 1 : 0) * Math.floor(i / 2), py = ny + Math.round(droop + wave);
    rect(x + px * sc, y + py * sc, sc, sc, i >= 3 ? dk : col);
    if (i <= 2) rect(x + px * sc, y + (py + 1) * sc, sc, sc, dk);
  }
}
// item cell art: the real weapon / helm look, or a slot icon tinted by tier + rarity
const gCanvasCache = new Map();
function gearArt(it) {
  const L = lookOf(it), key = itemCls(it) + it.slot + itemLook(it) + itemTier(it) + it.rar; let c = gCanvasCache.get(key); if (c) return c;
  const C = gearColors(it), R = normRows(L.ic || L.r.length && L.r || ICON[it.slot] || ICON.charm);
  c = document.createElement('canvas'); c.width = R[0].length; c.height = R.length; const g = c.getContext('2d');
  R.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch === '.') return; g.fillStyle = ch === '+' ? PAL.O : (C[ch] || PAL[ch] || '#f0f'); g.fillRect(x, y, 1, 1); }));
  // helms with only worn ornaments get a hood/hat icon from the class's base sprite head
  if (!L.ic && it.slot === 'helm' && (!L.r.length || L.mat)) {
    const H = { archer: ['..LLL...', '.LllL...', 'LlWWlL..', 'LWkWkL..', 'LWWWWL..', '.LLLL...'], mage: ['...XZ...', '..XXZ...', '.XXXXZ..', 'xXXXXXZ.', 'yyyyyyyy', '.WkWWk..'] }[itemCls(it)] || ['MMMM'];
    const M = HOODMAT[L.mat]; c.width = 10; c.height = 10; g.clearRect(0, 0, 10, 10);
    H.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch === '.') return; let col = C[ch] || PAL[ch]; if (M && 'LlXZx'.includes(ch)) col = M[ch === 'L' || ch === 'X' ? 2 : ch === 'Z' ? 3 : 1]; if (L.mat === 'rar' && ch === 'L') col = C.X; if (L.mat === 'rar' && ch === 'l') col = C.x; g.fillStyle = col; g.fillRect(x + 1, y + 3, 1, 1); }));
    L.r.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch === '.') return; g.fillStyle = C[ch] || PAL[ch]; g.fillRect(x + (L.ox != null ? L.ox + 1 : 0), y + 3 - (L.ey != null ? L.ey - (itemCls(it) === 'mage' ? 5 : 3) : 0) - 0, 1, 1); }));
  }
  gCanvasCache.set(key, c); return c;
}
function drawGearArt(it, cx, cy, sc = 2, dim) {
  const c = gearArt(it), w = c.width * sc, h = c.height * sc;
  if (it.rar >= 3 && !dim) { ctx.globalAlpha = .25 + .15 * Math.sin(gtime * 4); const gc = it.u ? (RM ? lookOf(it).glow : 'hsl(' + Math.round(gtime * 90 % 360) + ',90%,60%)') : RAR[it.rar].c; rect(cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2, gc); ctx.globalAlpha = 1; }
  ctx.drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
}
Object.assign(ICON, {
  armor: ['.MM..MM.', 'MAAMMMMN', '.AMMMMN.', '.AMXXMN.', '.AMMMMN.', '.AMMMMN.', '.XXXXXX.', '........'],
  mail: ['.MM..MM.', 'MAMNMNMN', '.MNMNMN.', '.NMXXNM.', '.MNMNMN.', '.NMNMNM.', '.XXXXXX.', '........'],
  vest: ['.oo..oo.', 'oOooooOo', '.oooooO.', '.ooXXoO.', '.oooooO.', '.OOOOOO.', '.OOXXOO.', '........'],
  robe: ['.yy..yy.', 'yZXXXXxy', '.ZXZXXx.', '.ZXZXXx.', '.ZXZXXx.', 'ZXXZXXXx', 'yyyyyyyy', '........'],
  boots: ['........', '..XXX...', '..ooo...', '..ooo...', '..oooo..', '..ooooo.', '..OOOOO.', '........'],
  greaves: ['........', '..AAA...', '..MMN...', '..MMN...', '..MMNN..', '..MMMNN.', '..XXXXX.', '........'],
  wraps: ['........', '..ZZZ...', '..uuu...', '..ZZZ...', '..uuuu..', '..ZZZZZ.', '..OOOOO.', '........'],
  ring: ['...XX...', '..XZZX..', '...XX...', '..yyyy..', '.y....y.', '.y....y.', '..yyyy..', '........'],
  charm: ['..yyyy..', '.y....y.', '.y....y.', '...XX...', '..XZZX..', '..XZXX..', '...XX...', '........'],
  helm: ['..MMMM..', '.AMMMMN.', 'AMMMMMMN', 'AMXMMXMN', 'AM....MN', '.N....N.', '........', '........'],
});

// ---------- skill icons: 12x12 art, shaded automatically from the upper left ----------
const ICM = { S: 'steel', G: 'gold', W: 'wood', R: 'red', E: 'leaf', B: 'blue', P: 'purple', C: 'cyan', F: 'fire', U: 'bone', K: 'black', L: 'leather', H: 'white', Y: 'eyeY', V: 'void', O: 'eyeO' };
const SKICON = {
  edge: ['..........H.', '.........SS.', '........SSs.', '.......SSs..', '......SSs...', '.....SSs....', '..G.SSs.....', '...GSs......', '...WGG......', '..WW..G.....', '.WW.........', '.W..........'],
  hide: ['..SSSSSSSS..', '.SSSSSSSSss.', '.SSGGGGGGss.', '.SSGRRRRGss.', '.SSGRRRRGss.', '.SSGRRRRGss.', '..SSGRRGss..', '..SSSGGsss..', '...SSSSss...', '....SSss....', '.....Ss.....', '............'],
  focus: ['............', '...GGGGGG...', '..G......G..', '.G..HHHH..G.', 'G..HHBBHH..G', 'G.HHBKKBHH.G', 'G.HHBKKBHH.G', 'G..HHBBHH..G', '.G..HHHH..G.', '..G......G..', '...GGGGGG...', '............'],
  cleave: ['....HHH.....', '..HH...H....', '.H......SS..', 'H......SSSS.', 'H.....SSSSs.', '.....SSSSs..', '....SSSWs...', '...SSs.W....', '.......W....', '......W.....', '.....W......', '....W.......'],
  wind: ['............', '..RR...RR...', '.RRRR.RRRR..', '.RRRRRRRRR..', '.RRRRRRRRr..', '..RRRRRRr...', '...RRRRr..C.', '....RRr..C..', '.....r..C...', '.CCC...C....', 'C...CCC.....', '............'],
  riposte: ['S..........S', '.S........S.', '..S..H...S..', '...S.H..S...', '....SHHS....', '..HHHSSHHH..', '.....SS.....', '....S..S....', '...G....G...', '..GG....GG..', '.W........W.', 'W..........W'],
  draw: ['............', '.R..........', '.RR....H....', '..RR....H...', 'RRRWWWWWWSS.', '..RR.....SSS', '.RR....H.SS.', '.R....H.....', '............', '.HH.HHHH.HH.', '............', '............'],
  eye: ['............', '....UUUU....', '...UUUUUU...', '..UUUKYUUL..', '..UUUUUUGGG.', '.LUUUUUUUGG.', '.LLUUUUUU.G.', '.LLLUUUU....', '..LLLLLL....', '...LLLL.....', '....LL......', '............'],
  steady: ['.....RR.....', '.....RR.....', '...RRRRRR...', '..R......R..', '.R...RR...R.', 'RRR.RRRR.RRR', 'RRR.RRRR.RRR', '.R...RR...R.', '..R......R..', '...RRRRRR...', '.....RR.....', '.....RR.....'],
  volley: ['.........SS.', '..SS.....WS.', '..WS....W...', '..W....W....', '.W....W..SS.', '.W...W...WS.', 'W...W...W...', '...W...W....', '..RR..W.....', '..R..W......', '....RR......', '....R.......'],
  head: ['..UUUUUU....', '.UUUUUUUU...', 'UUUUUUUUUU..', 'UUKKUUKKUU..', 'UUKKUUKKUU.S', 'UUUUUUUUUWSS', '.UUUKKUUWW.S', '..UUUUUWU...', '..UKUKUW....', '.......W....', '......RR....', '.....R......'],
  pin: ['.....RR.....', '....R..R....', '.....RR.....', '.....WW.....', '.....WW.....', '.....WW.....', '.....WW.....', '....SSSS....', '.....SS.....', '.L..LSSL..L.', 'LLLLLLLLLLLL', '.LLLLLLLLLL.'],
  arcane: ['.....PP.....', '.....PP.....', '....PVVP....', 'PPPPVVVVPPPP', '.PPVVVVVVPP.', '..PPVVVVPP..', '..PVVVVVVP..', '.PVVPPPPVVP.', '.PPP....PPP.', 'PP........PP', '............', '............'],
  ward: ['....CCCC....', '..CC....CC..', '.C........C.', '.C..BBBB..C.', 'C..B.BB.B..C', 'C..B.BB.B..C', 'C..BBBBBB..C', 'C....BB....C', '.C...BB...C.', '.C........C.', '..CC....CC..', '....CCCC....'],
  flow: ['............', '..CCC.......', '.C...C...C..', 'C.....CCC...', '............', '...BBB......', '..B...B...B.', '.B.....BBB..', '............', '....CCC.....', '...C...C...C', '..C.....CCC.'],
  chain: ['.......YY...', '......YY....', '.....YY.....', '....YYYYY...', '.......YY...', '......YY....', '.SS..YY.....', 'S..SYYYYY...', 'S..S...YY.SS', '.SS...YY.S..', '.....YY..S..', '.........SS.'],
  barrier: ['............', '.BBBB.BBBB..', '.BBBB.BBBB..', '............', 'BBB.BBBB.BBB', 'BBB.BBBB.BBB', '............', '.BBBB.BBBB..', '.BBBB.BBBB..', '............', 'BBB.BBBB.BBB', 'BBB.BBBB.BBB'],
  surge: ['...PPPPPP...', '..P.....YP..', '.P.....YY.P.', 'P.....YY...P', 'P....YYYYY.P', 'P...YYYYY..P', 'P.....YY...P', 'P....YY....P', '.P..YY....P.', '..PYY....P..', '...PPPPPP...', '............'],
};
const icCache = new Map();
function skillIcon(k, state) { // state: 'own' | 'open' | 'lock'
  const key = k + state; let c = icCache.get(key); if (c) return c;
  const rows = SKICON[k], p = new Pix(12, 12);
  rows.forEach((r, y) => r.split('').forEach((ch, x) => { if (ch === '.') return; const up = ch.toUpperCase(); p.put(x, y, ICM[up], ch === up ? 2 : 1); }));
  const grey = col => { const v = parseInt(col.slice(1, 3), 16) * .3 + parseInt(col.slice(3, 5), 16) * .59 + parseInt(col.slice(5, 7), 16) * .11, q = Math.round(v * .38 + 14); const h = n => clamp(n, 0, 255).toString(16).padStart(2, '0'); return '#' + h(q) + h(q) + h(q + 10); };
  c = p.bake({ tint: state === 'lock' ? grey : state === 'open' ? (col => hexMix(col, '#1a1622', .18)) : null, noGlow: state === 'lock' });
  icCache.set(key, c); return c;
}
function drawPadlock(x, y) { rect(x + 1, y, 3, 1, GILD.l); rect(x, y + 1, 1, 2, GILD.l); rect(x + 4, y + 1, 1, 2, GILD.m); rect(x - 1, y + 3, 7, 4, GILD.m); rect(x - 1, y + 3, 7, 1, GILD.l); rect(x + 2, y + 4, 1, 2, '#1a1206'); }

// ---------- auto-scrap ----------
function isWorse(it) {
  const users = save.party.filter(id => canUse(it, id));
  return !users.some(id => itemScore(it) > itemScore(save.chars[id].gear[it.slot]));
}
// ---------- evolution looks: decorations layered over the paper doll ----------
function evoLook(c) { if (!c || !c.evo || !EVO[c.evo]) return null; const l = {}; for (const k of evoLine(c)) { const e = EVO[k].look || {}; for (const key in e) l[key] = key === 'deco' ? [...new Set([...(l.deco || []), ...e.deco])] : e[key]; } return l; }
function evoHead(c) { const D = DOLL[charSpr(c)] || DOLL.warrior; return { D, hx: D.fx + 2.5, top: D.f === 'm' ? D.ey - 6 : D.ey - 3 }; }
function drawEvoBack(c, x, y, sc, variant, A) {
  const L = evoLook(c); if (!L || variant === 'dim') return;
  const P = (px, py, col, w = 1, h = 1) => rect(Math.round(x + px * sc), Math.round(y + py * sc), w * sc, h * sc, variant === 'flash' ? '#ffffff' : col);
  if (L.aura && !RM) { ctx.globalAlpha = A * (.18 + .1 * Math.sin(gtime * 3)); for (let i = 0; i < 6; i++) { const t = gtime * 1.5 + i * 1.05; P(5.5 + Math.cos(t) * 7 - .5, 6 + Math.sin(t * 1.3) * 6, L.aura, 1, 1); } ctx.globalAlpha = A * .14; P(1, 1, L.aura, 10, 11); ctx.globalAlpha = A; }
  if (L.wings) {
    const f = RM ? 0 : Math.round(Math.sin(gtime * 4) * 1), dk = darken(L.wings, .3);
    for (let i = 0; i < 5; i++) { P(1 - i, 3 + i - f + (i > 2 ? 1 : 0), i % 2 ? dk : L.wings, 1, 4 - (i >> 1)); }
    P(0, 4 - f, L.wings, 2, 2);
  }
}
function drawEvoFront(c, x, y, sc, variant, A) {
  const L = evoLook(c); if (!L || variant === 'dim') return;
  const { D, hx, top } = evoHead(c), fl = variant === 'flash';
  const P = (px, py, col, w = 1, h = 1) => rect(Math.round(x + px * sc), Math.round(y + py * sc), w * sc, h * sc, fl ? '#ffffff' : col);
  const dec = L.deco || [];
  if (L.eyes) { const g = RM ? 1 : .7 + .3 * Math.sin(gtime * 6); ctx.globalAlpha = A * g; P(D.fx + 1, D.ey, L.eyes); P(D.fx + 4, D.ey, L.eyes); ctx.globalAlpha = A; }
  if (dec.includes('mask')) { P(D.fx, D.ey + 1, '#1e1c26', 6, 1); }
  if (dec.includes('patch')) { P(D.fx + 1, D.ey, '#0c0a10'); P(D.fx, D.ey - 1, '#0c0a10', 3, 1); }
  if (dec.includes('hood')) { P(hx - 3.5, top + 1, '#1e1c26', 1, 4); P(hx + 2.5, top + 1, '#1e1c26', 1, 4); P(hx - 2.5, top, '#363442', 5, 1); }
  if (dec.includes('horns')) { P(hx - 4.5, top, '#cfc6aa'); P(hx - 5.5, top - 1, '#fffaf0'); P(hx + 3.5, top, '#cfc6aa'); P(hx + 4.5, top - 1, '#fffaf0'); }
  if (dec.includes('antlers')) { P(hx - 4.5, top - 1, '#86663e', 1, 2); P(hx - 5.5, top - 2, '#c08a50'); P(hx - 3.5, top - 2, '#c08a50'); P(hx + 3.5, top - 1, '#86663e', 1, 2); P(hx + 4.5, top - 2, '#c08a50'); P(hx + 2.5, top - 2, '#c08a50'); }
  if (dec.includes('crown')) { P(hx - 2.5, top - 1, '#d8b04a', 5, 1); P(hx - 2.5, top - 2, '#fff0a0'); P(hx - .5, top - 2, '#fff0a0'); P(hx + 1.5, top - 2, '#fff0a0'); P(hx - .5, top - 1, '#c8323e'); }
  if (dec.includes('halo')) { const b = RM ? 0 : Math.round(Math.sin(gtime * 2.5)); ctx.globalAlpha = A * .9; P(hx - 2.5, top - 3 + b, '#ffe070', 5, 1); P(hx - 3.5, top - 2 + b, '#c89a2a'); P(hx + 2.5, top - 2 + b, '#c89a2a'); ctx.globalAlpha = A; }
  if (dec.includes('plume')) { P(hx, top - 2, '#c8323e', 1, 2); P(hx + 1, top - 3, '#ff7a70', 2, 1); }
  if (dec.includes('cross')) { P(D.fx + 2, D.tor[0], '#d8b04a', 1, 3); P(D.fx + 1, D.tor[0] + 1, '#d8b04a', 3, 1); }
  if (dec.includes('pauldrons')) { P(D.fx - 2, D.tor[0] - 1, '#a8aebc', 2, 2); P(D.fx + 6, D.tor[0] - 1, '#6a7080', 2, 2); }
  if (dec.includes('scarf')) { const w = RM ? 0 : Math.round(Math.sin(gtime * 6)); P(D.fx, D.tor[0] - 1, L.cape || '#78d6ee', 6, 1); P(D.fx - 2, D.tor[0] + w, L.cape || '#78d6ee', 2, 1); P(D.fx - 4, D.tor[0] + 1 + w, darken(L.cape || '#78d6ee', .3), 2, 1); }
}
