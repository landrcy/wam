'use strict';
// ================= W.A.M. test build =================
// Plain JS, no build step. Everything draws on one 320px logical canvas scaled by an integer.
const LW = 320, AH = 320;
const Q = location.search;
const TOUCH = /[?&]touch/.test(Q) || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
const DEBUG = /[?&]debug/.test(Q);
const STRIP = TOUCH ? 76 : 0;
const LH = AH + STRIP;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]calm/.test(Q);
// The canvas covers the whole window at an integer pixel scale. The 320px arena sits in the middle (OX, OY);
// everything outside it is the black void that bosses and cracks can spill onto.
let VW = LW, VH = LH, OX = 0, OY = 0, PXS = 1;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const s = Math.max(1, Math.floor(Math.min(innerWidth * dpr / LW, innerHeight * dpr / LH)));
  PXS = s; VW = Math.ceil(innerWidth * dpr / s); VH = Math.ceil(innerHeight * dpr / s);
  cv.width = VW; cv.height = VH; ctx.imageSmoothingEnabled = false;
  cv.style.width = (VW * s / dpr) + 'px'; cv.style.height = (VH * s / dpr) + 'px';
  OX = Math.floor((VW - LW) / 2); OY = Math.floor((VH - LH) / 2);
}
addEventListener('resize', resize); resize();

// ---------- tuning knobs (tweak here) ----------
const TUNE = {
  markerSpeed: 1.12,      // timing-bar sweeps per second (base)
  goodZone: 0.19,         // width of the GOOD zone (fraction of bar)
  perfectZone: 0.05,      // width of the PERFECT zone
  perfectMult: 2.0,       // damage multiplier for perfect
  missMult: 0,            // damage multiplier for a miss
  autoCdMul: 1.7,         // allies auto-attack this much slower than their cooldown
  autoDmgMul: 0.6,        // allies' auto attack damage
  foeHp: 24, foeHpGrow: 1.44,
  foeDmg: 6.2, foeDmgGrow: 1.37,
  foeRate: 0.78,          // foe attack period multiplier (lower = more often)
  bossHp: 1.35,           // extra boss life
  missLock: 0.25,         // extra cooldown after a miss
  chainStep: 0.05, chainMax: 0.5, // perfect-chain damage bonus per perfect in a row
  dropChance: 0.4,
  forgeCost: 12,
  evoLevel: 5,
  act4Perfects: 60,       // secret Act IV: clear Act III + this many lifetime PERFECT hits
  invMax: 24,
};

// ---------- palette ----------
const PAL = {
  W:'#f4f4f4', w:'#c4c4cc', k:'#000000', K:'#0c0c0e', g:'#8a8f9c', G:'#4a4e58', s:'#dfe6f2',
  y:'#e8c25a', Y:'#a8842e', r:'#d8464a', R:'#8a2430', o:'#a8703a', O:'#6b4424',
  h:'#5fae5f', H:'#2f6e3c', l:'#b8ffc8', b:'#4f7fd8', B:'#2a3f8a', p:'#9a5fd0', P:'#5a3080',
  c:'#9fe6f4', C:'#3a8aa8', f:'#ff9a3a', F:'#ffe08a', u:'#d8d0b8', U:'#8a8270', v:'#c070ff',
  n:'#2c2c36', m:'#141018', e:'#ff4060', t:'#e86aa0',
  '1':'#ffb04a', '2':'#9cff6a', '3':'#ff4a5a', '4':'#e8e0ff'
};
// per-act palette: dust puffs, rim light, floor tones, ambient motes
const ACTPAL = [
  { dust: ['#3e4632', '#5a6644', '#2a3022'], rim: '#d8f0b0', floor: '#0f140c', line: '#1a2414', mote: '#9fd08a' },
  { dust: ['#463626', '#5e4a34', '#2e2218'], rim: '#ffbe7a', floor: '#120d08', line: '#22180e', mote: '#ffb070' },
  { dust: ['#36364a', '#4e4e66', '#22222e'], rim: '#b0b8ff', floor: '#0c0c14', line: '#181826', mote: '#a0a0c8' },
  { dust: ['#36264a', '#523a6e', '#22182e'], rim: '#e0b0ff', floor: '#0e0816', line: '#1c1228', mote: '#b480ff' },
];
const COL = { white:'#f2f2f2', dim:'#8a8a96', dark:'#45454f', gold:'#ffd35a', red:'#ff5a5a', green:'#7ee07e', blue:'#7aa8ff', panel:'#0b0b0e', line:'#2c2c34' };

// ---------- bitmap font (traced from the reference alphabet) ----------
const GL = {};
for (const k in FONT_GLYPHS) { const a = FONT_GLYPHS[k]; GL[k] = { w: a[0], rows: a.slice(1) }; }
const gCache = new Map();
function glyph(ch) { return GL[ch] || GL[ch.toUpperCase()] || GL['?']; }
function glyphCanvas(ch, col) {
  const key = ch + col; let c = gCache.get(key); if (c) return c;
  const g = glyph(ch); c = document.createElement('canvas'); c.width = g.w; c.height = 11;
  const x = c.getContext('2d'); x.fillStyle = col;
  g.rows.forEach((bits, ry) => { for (let rx = 0; rx < g.w; rx++) if (bits >> rx & 1) x.fillRect(rx, ry, 1, 1); });
  gCache.set(key, c); return c;
}
function textW(s, sc = 1) {
  let w = 0; for (const ch of String(s)) w += ch === ' ' ? 4 : glyph(ch).w + 1;
  return Math.max(0, w - 1) * sc;
}
// draw text. align: 'l' | 'c' | 'r'. y = top of caps.
function T(s, x, y, col = COL.white, sc = 1, align = 'l', shadow = null) {
  s = String(s);
  if (align === 'c') x -= Math.floor(textW(s, sc) / 2); else if (align === 'r') x -= textW(s, sc);
  x = Math.round(x); y = Math.round(y);
  if (shadow) T(s, x + sc, y + sc, shadow, sc, 'l');
  for (const ch of s) {
    if (ch === ' ') { x += 4 * sc; continue; }
    const c = glyphCanvas(ch, col); ctx.drawImage(c, x, y, c.width * sc, 11 * sc); x += (c.width + 1) * sc;
  }
}
function wrap(s, maxW) {
  const out = []; let line = '';
  for (const word of String(s).split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (textW(t) > maxW && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line); return out;
}

// ---------- sprites ----------
const SPR = {
  warrior: [
    "....WWWW....",
    "...WWWWWW.s.",
    "...WkWWkW.s.",
    "...WkWWkW.s.",
    "...wWWWWw.s.",
    "....wWWw..s.",
    "...WWWWWWyyy",
    "..wWWWWWW.y.",
    "..wWWWWWW...",
    "...WWWWw....",
    "...WW..WW...",
    "...ww..ww..."],
  knight: [
    "....rrr.....",
    "...gggggg.s.",
    "..gGGGGGGgs.",
    "...WkWWkW.s.",
    "...WkWWkW.s.",
    "...wWWWWw.s.",
    "bb..WWWW..s.",
    "bybWWWWWWyyy",
    "bbbWWWWWW.y.",
    ".b.wWWWWw...",
    "...gg..gg...",
    "...GG..GG..."],
  berserker: [
    "..u......u..",
    "..uWWWWWWu..",
    "...WWWWWW..s",
    "...WrWWrW.s.",
    "...WrWWrWs..",
    "...wWWWWy...",
    "s..rrrrrrr..",
    ".s.WWWWWWWr.",
    "..yWWWWWW...",
    "...WWWWw....",
    "...WW..WW...",
    "...ww..ww..."],
  archer: [
    "....HHH.....",
    "...HhhhH..o.",
    "..HhWWWh...o",
    "..HWkWkh...o",
    "..HWkWkh..so",
    "...hWWWh..so",
    "..hhhhhhh.so",
    ".Hhhhhhhh..o",
    "..hhhhhhh..o",
    "...hhhhh..o.",
    "...OO.OO....",
    "...OO.OO...."],
  ranger: [
    "y...HHH.....",
    "oy.HHHHH..o.",
    ".o.HhWWH...o",
    "..oHWkWk...o",
    "..HoWkWk..so",
    "..HHWWWH..so",
    ".HHhhhhhH.so",
    "HHhhyhhhH..o",
    "HHhhhhhhh..o",
    ".HHhhhhH..o.",
    "...OO.OO....",
    "...OO.OO...."],
  sniper: [
    "....GGG...o.",
    "...GgggG...o",
    "..GgWWWg...o",
    "..GWkWkg..co",
    "..GWkWkg..so",
    "...gWWWg..so",
    "..ppppppp.so",
    ".Ggggggg..so",
    "..ggggggg..o",
    "...ggggg...o",
    "...GG.GG..o.",
    "...GG.GG...."],
  mage: [
    "......P.....",
    ".....PP...c.",
    "....PPPP.cCc",
    "...PPPPPP.c.",
    "..yyyyyyyyo.",
    "...WkWWkW.o.",
    "...WkWWkW.o.",
    "...wWWWWw.o.",
    "..BBBBBBBBo.",
    "..BbBBBBBBo.",
    "..BBBBBBBB..",
    "..BBBBBBBB.."],
  pyro: [
    "......R....F",
    ".....RR...fF",
    "....RRRR.fFf",
    "...RRRRRR.f.",
    "..ffffffffo.",
    "...WkWWkW.o.",
    "...WkWWkW.o.",
    "...wWWWWw.o.",
    "..RRrRRrRRo.",
    "..RrRRRRrRo.",
    "..RRRRRRRR..",
    ".RRfRRRRfRR."],
  cryo: [
    "...c.c.c..c.",
    "...ccccc.cWc",
    "..CCCCCCC.c.",
    "...WkWWkW.c.",
    "...WkWWkW.c.",
    "...wWWWWw.u.",
    "..CcccccCCu.",
    "..CcCCCCcCu.",
    "..CCcccCCCu.",
    "..CCCCCCCC..",
    ".CCcCCCCcCC.",
    "CCCCCCCCCCCC"],
  grave: [
    "..gggg..",
    ".gGGGGg.",
    ".gGgGGg.",
    ".ggggGg.",
    ".gGgGGg.",
    ".gGGGGg.",
    "gggggggg"],
  slime: [
    "....hhhh....",
    "..hhhhhhhh..",
    ".hhllhhhhhh.",
    ".hkhhkhhhhh.",
    "hhkhhkhhhhhh",
    "hhhhhhhhhhhh",
    ".HHHHHHHHHH."],
  bat: [
    "P..........P",
    "PP..pppp..PP",
    "PPPppppppPPP",
    ".PPpkppkpPP.",
    "..P.pWWp.P..",
    ".....pp....."],
  goblin: [
    "....hhhh....",
    "..h.hhhhh.h.",
    "...hkhhkhh..",
    "....hhhhh...",
    "s..OOOOOO...",
    ".shOOOOOOh..",
    "..sOOOOOO...",
    "...OOOOOO...",
    "....h..h....",
    "....H..H...."],
  gobchief: [
    "...y.y.y....",
    "...yyyyy....",
    "..hhhhhhh...",
    "..hrhhrhhh..",
    "..hhhhhhhh..",
    "...hkkkh....",
    "ss.RRRRRRR..",
    ".sshRRRRRRh.",
    "..sRRyRRRR..",
    "...RRRRRRR..",
    "...RR...RR..",
    "...HH...HH.."],
  shroom: [
    "...rrrrrr...",
    ".rrWrrrrWrr.",
    "rrrrrrWrrrrr",
    "rrWrrrrrrrWr",
    "..uuuuuuuu..",
    "..ukuukuuu..",
    "..uuuuuuuu..",
    "...uuuuuu...",
    "...U....U..."],
  wolf: [
    "..g.g.........",
    ".gggg.........",
    "gkgggg......g.",
    "gggggggggggg.g",
    "Wg.gggggggg...",
    "...ggggggggg..",
    "...gg.gg.gg...",
    "...GG.GG.GG..."],
  treant: [
    "..H.hh.H.h..",
    ".hhHhhhhHhh.",
    "hhhhHhhhhhhH",
    ".hhhhhhhhhh.",
    "..OoooooooO.",
    "..oyoooyoo..",
    "..oooooooo..",
    "..ookkkkoo..",
    "O.oooooooo.O",
    ".OoooooooOO.",
    "..oO.oo.Oo..",
    ".OO..OO..OO."],
  skel: [
    "...uuuu...",
    "..uuuuuu..",
    "..ukuuku..",
    "..uuuuuu..",
    "...uUuU...",
    "....uu....",
    ".uuuuuuuu.",
    "g.uUuuUu..",
    "g..uuuu...",
    "g..uUUu...",
    "...u..u...",
    "..uu..uu.."],
  ghost: [
    "...cccc....",
    "..cccccc...",
    ".ckccckcc..",
    ".ccccccccc.",
    ".cccCCcccc.",
    ".ccccccccc.",
    ".ccccccccc.",
    "..cc.cc.cc.",
    "...c..c..c."],
  darkknight: [
    "....nnnn....",
    "...nGGGGn...",
    "...GeGGeG...",
    "...nGGGGn...",
    "s..nnnnnn...",
    "s.nGnnnnGn..",
    "snnGRRRRGnn.",
    "s.nGnnnnGn..",
    "yy.nnnnnn...",
    "...nn..nn...",
    "...GG..GG...",
    "..GGG..GGG.."],
  shade: [
    "...mmmm...",
    "..mmmmmm..",
    ".mWmmWmmm.",
    ".mmmmmmmm.",
    "mmmmmmmmmm",
    ".mmmmmmmmm",
    "..m.mm.m.m"],
  eye: [
    "...WWWW...",
    ".WWWtWWWW.",
    "WWWWvvWWWW",
    "WWWvkkvWtW",
    "WtWvkkvWWW",
    "WWWWvvWWWW",
    ".WWWWtWWW.",
    "...WWWW..."],
};
// the final boss is your own reflection: an inverted, mirrored warrior
SPR.mirror = SPR.warrior.map(r => r.split('').reverse().map(ch => ({ W: 'K', w: 'm', k: 'W', y: 'v', s: 'g' }[ch] || ch)).join(''));
// item icons ('X' = rarity colour)
const ICON = {
  sword: ["......ss", ".....ss.", "....ss..", "y..ss...", ".yXs....", "..y.....", ".X.y....", "X......."],
  bow: ["..Xoo...", ".X...o..", "X.....o.", "s.....o.", "s.....o.", "X.....o.", ".X...o..", "..Xoo..."],
  staff: [".....XX.", "....XccX", ".....XX.", "....o...", "...o....", "..o.....", ".o......", "o......."],
  armor: [".XX..XX.", "XWWWWWWX", ".WWWWWW.", ".WWXXWW.", ".WWWWWW.", ".WWWWWW.", ".XWWWWX.", "........"],
  ring: ["...XX...", "..X..X..", "........", "..yyyy..", ".y....y.", ".y....y.", "..yyyy..", "........"],
  charm: ["..yyyy..", ".y....y.", "...XX...", "..XWWX..", "..XWWX..", "...XX...", "........", "........"],
};
function normRows(rows) { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.')); }
for (const k in SPR) SPR[k] = normRows(SPR[k]);
const sCache = new Map();
// variant: '' normal | 'flash' white | 'hurt' red | 'dim' | or outline colour via opts
function sprCanvas(rows, key, variant = '', outline = null, xcol = null) {
  const id = key + '|' + variant + '|' + outline + '|' + xcol; let c = sCache.get(id); if (c) return c;
  const h = rows.length, w = rows[0].length, pad = outline ? 1 : 0;
  c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2;
  const g = c.getContext('2d');
  const on = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  if (outline) {
    g.fillStyle = outline;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++)
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.fillRect(x + pad, y + pad, 1, 1);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x]; if (ch === '.') continue;
    let col = ch === 'X' ? (xcol || '#fff') : PAL[ch] || '#f0f';
    if (variant === 'flash') col = '#ffffff';
    else if (variant === 'hurt') col = (ch === 'k' || ch === 'K') ? '#300' : '#ff6a6a';
    else if (variant === 'dim') col = '#3a3a44';
    g.fillStyle = col; g.fillRect(x + pad, y + pad, 1, 1);
  }
  sCache.set(id, c); return c;
}
function drawSpr(key, x, y, sc, variant = '', outline = null, alpha = 1) {
  const c = sprCanvas(SPR[key], key, variant, outline);
  if (outline) { x -= sc; y -= sc; }
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(c, Math.round(x), Math.round(y), c.width * sc, c.height * sc);
  ctx.globalAlpha = 1;
}
function drawIcon(kind, x, y, sc, rcol) {
  const c = sprCanvas(ICON[kind], 'icon_' + kind, '', null, rcol);
  ctx.drawImage(c, Math.round(x), Math.round(y), c.width * sc, c.height * sc);
}
function rect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function frame(x, y, w, h, col) { rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, col); rect(x, y, 1, h, col); rect(x + w - 1, y, 1, h, col); }
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- sound (Web Audio, generated) ----------
let AC = null, master = null, noiseBuf = null;
function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.3; master.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(f, d, type = 'square', vol = 0.25, slide = 0, delay = 0) {
  if (!AC || (save && save.mute)) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, vol = 0.25, freq = 1200, delay = 0) {
  if (!AC || (save && save.mute)) return;
  const t = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + 0.03);
}
const SFX = {
  perfect() { tone(988, .06, 'square', .2); tone(1480, .14, 'square', .16, 0, .045); noise(.09, .3, 3500); },
  good() { tone(587, .07, 'square', .18); noise(.07, .25, 1800); },
  miss() { tone(160, .14, 'triangle', .3, -70); },
  hurt() { noise(.14, .35, 500); tone(120, .12, 'sawtooth', .12, -50); },
  kill() { tone(330, .07, 'square', .16, 500); noise(.18, .25, 900, .02); },
  drop() { [784, 988, 1318].forEach((f, i) => tone(f, .08, 'square', .12, 0, i * .06)); },
  lvl() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .1, 'square', .14, 0, i * .07)); },
  click() { tone(660, .03, 'square', .1); },
  wind() { tone(196, .07, 'triangle', .14); tone(196, .07, 'triangle', .1, 0, .12); },
  arrow() { noise(.05, .2, 5000); tone(1300, .05, 'triangle', .08, -700); },
  orb() { tone(420, .14, 'sine', .2, 500); },
  clang() { tone(2350, .18, 'square', .1, -300); tone(3100, .12, 'triangle', .08, -900, .02); noise(.06, .3, 7000); },
  whoosh() { noise(.12, .18, 900); },
  parry() { tone(1760, .12, 'square', .16, -600); noise(.1, .3, 6000); },
  win() { [523, 659, 784, 659, 1046].forEach((f, i) => tone(f, .12, 'square', .14, 0, i * .09)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .18, 'triangle', .2, 0, i * .14)); },
  tick() { tone(1200, .015, 'square', .05); },
  rumble() { tone(55, .9, 'sawtooth', .16, -15); noise(.5, .18, 180); },
  crack() { noise(.07, .4, 3200); tone(900 + rnd(400), .05, 'square', .08, -600); },
  shatter() { noise(.5, .5, 2400); [2100, 1600, 2500, 1300, 1900].forEach((f, i) => tone(f, .1, 'square', .07, -900, i * .035)); tone(70, .55, 'sawtooth', .28, -30); },
  land() { noise(.35, .55, 260); tone(58, .35, 'sine', .45, -25); },
  roar() { tone(98, .75, 'sawtooth', .2, -45); tone(147, .6, 'square', .1, -70, .06); noise(.5, .3, 650); },
  morph() { [880, 660, 440, 330].forEach((f, i) => tone(f, .09, 'square', .1, 0, i * .05)); noise(.25, .25, 4000, .2); },
  bossDie() { tone(220, .9, 'sawtooth', .22, -190); noise(.5, .45, 1200); [1760, 1320, 990, 740].forEach((f, i) => tone(f, .12, 'square', .08, 0, .25 + i * .07)); },
  reform() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .12, 'square', .11, 0, i * .06)); noise(.3, .15, 5000, .35); },
};
// ================= game data =================
const ORDER = ['warrior', 'archer', 'mage'];
const CLS = {
  warrior: { n: 'Warrior', spr: 'warrior', hp: 80, dmg: 10, cd: .55, arm: 4, crit: 5, hpPer: 10, dmgPer: 2, weapon: 'sword', atk: 'slash', col: '#f4f4f4',
    evos: ['knight', 'berserker'] },
  archer: { n: 'Archer', spr: 'archer', hp: 55, dmg: 8, cd: .42, arm: 2, crit: 10, hpPer: 7, dmgPer: 1.6, weapon: 'bow', atk: 'arrow', col: '#5fae5f',
    evos: ['ranger', 'sniper'] },
  mage: { n: 'Mage', spr: 'mage', hp: 50, dmg: 12, cd: .8, arm: 1, crit: 5, hpPer: 6, dmgPer: 2.4, weapon: 'staff', atk: 'orb', col: '#7a8cff',
    evos: ['pyro', 'cryo'] },
};
// Evolution tree: 3 tiers, two paths at every tier. Tier 1 keeps its own base sprite; tiers 2-3 build on it with
// palette shifts and pixel decorations (halo, horns, crown, wings, aura...). Each node also changes moves/bar.
const EVOLV = [5, 9, 13];
const EVO = {
  // ---- warrior ----
  knight: { n: 'Paladin', tier: 1, from: 'warrior', spr: 'knight', atk: 'smite', bar: 'guard', d: ['+35% life, +8 armor, foes target you', 'Bar: hit the blue ward zone to shield the party', 'Perfect hits raise a guard; smites call light'], hpMul: 1.35, arm: 8, dmgMul: .95, taunt: 3, guard: 1, look: {} },
  templar: { n: 'Templar', tier: 2, from: 'knight', d: ['Perfect hits heal the party 4%', '+4 armor'], healP: .04, arm: 4, look: { tint: { W: '#f0ead8', w: '#b8a888' }, cape: '#d8b04a', deco: ['cross'] } },
  crusader: { n: 'Crusader', tier: 3, from: 'templar', d: ['+15% damage, heal +2%', 'Every 6 perfects: holy nova hits all for 1.5x'], dmgMul: 1.15, healP: .02, nova: 6, novaM: 1.5, holy: 1, look: { tint: { W: '#fff4d0', w: '#c8a860' }, cape: '#c8323e', deco: ['cross', 'plume'], aura: '#ffe070' } },
  bastion: { n: 'Bastion', tier: 3, from: 'templar', d: ['+30% life, +10 armor', 'Reflects 40% of damage taken'], hpMul: 1.3, arm: 10, taunt: 5, thorns: .4, look: { tint: { W: '#a8aebc', w: '#5a6070' }, cape: '#2a4fa8', deco: ['cross', 'pauldrons'], aura: '#a6caff' } },
  lightbringer: { n: 'Lightbringer', tier: 2, from: 'knight', d: ['Every 5 perfects: holy nova hits all for 1.8x', 'Smites leave a pillar of light'], nova: 5, novaM: 1.8, holy: 1, dmgMul: 1.05, look: { tint: { W: '#ffe9a0', w: '#c8a040' }, cape: '#f4f4f4', deco: ['halo'] } },
  sunknight: { n: 'Sun Knight', tier: 3, from: 'lightbringer', d: ['Nova every 4 perfects', '+10% damage, +6% crit'], nova: 4, dmgMul: 1.1, crit: 6, look: { tint: { W: '#ffd35a', w: '#c88a20' }, cape: '#ff7a1a', deco: ['halo', 'crown'], aura: '#ffb03a' } },
  seraph: { n: 'Seraph', tier: 3, from: 'lightbringer', d: ['Rises once per fight at 40% life', 'Perfect hits heal the party 3%'], revive: 1, healP: .03, look: { tint: { W: '#ffffff', w: '#c8c8e0' }, cape: '#a6caff', deco: ['halo'], wings: '#f4f4ff', aura: '#ffffff' } },
  berserker: { n: 'Berserker', tier: 1, from: 'warrior', spr: 'berserker', atk: 'spin', bar: 'rage', d: ['+25% damage, faster swings', 'Bar: speeds up with your combo, so does damage', 'Heals 8% of damage; hits harder when hurt'], dmgMul: 1.25, cdMul: .85, hpMul: .9, mark: 1.1, steal: .08, rage: 1, look: {} },
  warlord: { n: 'Warlord', tier: 2, from: 'berserker', d: ['Perfect hits rally the party: +25% damage 2.5s', '+10% damage'], rally: 2.5, dmgMul: 1.1, look: { cape: '#d8b04a', deco: ['horns'] } },
  conqueror: { n: 'Conqueror', tier: 3, from: 'warlord', d: ['Longer rally, +10% crit', 'Perfect hits execute foes under 15%'], rally: 1.5, crit: 10, exec: .15, look: { cape: '#7a1a26', deco: ['horns', 'crown'], aura: '#ffd35a' } },
  warmaster: { n: 'Warmaster', tier: 3, from: 'warlord', d: ['Whirlwind hits every foe for 35%', '15% faster swings'], multi: .35, cdMul: .85, look: { cape: '#3e424e', deco: ['horns', 'pauldrons'], eyes: '#ffb03a' } },
  bloodreaver: { n: 'Bloodreaver', tier: 2, from: 'berserker', d: ['+8% lifesteal', 'Hits bleed for 30% over 3s'], steal: .08, bleed: .3, look: { tint: { W: '#c8a0a0', w: '#7a4a4a' }, cape: '#561620', eyes: '#ff3a3a' } },
  bloodlord: { n: 'Blood Lord', tier: 3, from: 'bloodreaver', d: ['+6% lifesteal, bleed +20%', 'Perfect hits execute foes under 20%'], steal: .06, bleed: .2, exec: .2, look: { tint: { W: '#b07070', w: '#6a2a2a' }, cape: '#c8323e', eyes: '#ff3a3a', deco: ['crown'], aura: '#ff3a3a' } },
  reaper: { n: 'Reaper', tier: 3, from: 'bloodreaver', d: ['Executes foes under 25%', '+15% crit, crits +50%'], exec: .25, crit: 15, critAdd: .5, look: { tint: { W: '#5e5c6e', w: '#1e1c26' }, cape: '#0c0a10', eyes: '#d07aff', deco: ['hood'], aura: '#8a2ad0' } },
  // ---- archer ----
  ranger: { n: 'Ranger', tier: 1, from: 'archer', spr: 'ranger', atk: 'fan', bar: 'twin', d: ['Every shot also hits all other foes for 45%', 'Bar: two perfect zones', 'Fires a fan of arrows'], multi: .45, cdMul: 1.05, look: {} },
  beastmaster: { n: 'Beastmaster', tier: 2, from: 'ranger', d: ['A spirit wolf joins 50% of your attacks', '+10% life'], pet: .5, hpMul: 1.1, look: { cape: '#8a5a30', deco: ['antlers'] } },
  wildlord: { n: 'Wild Lord', tier: 3, from: 'beastmaster', d: ['Wolf joins 80% of attacks', '+20% life'], pet: .3, hpMul: 1.2, look: { cape: '#367632', deco: ['antlers', 'crown'], aura: '#9cff6a' } },
  packleader: { n: 'Packleader', tier: 3, from: 'beastmaster', d: ['Wolf joins 60% of attacks', 'Perfect hits rally the party 1.5s'], pet: .1, rally: 1.5, look: { cape: '#5e5c6e', deco: ['antlers'], eyes: '#ffe070' } },
  windrunner: { n: 'Windrunner', tier: 2, from: 'ranger', d: ['20% faster shots', '15% chance to dodge blows'], cdMul: .8, dodge: .15, look: { cape: '#78d6ee', deco: ['scarf'] } },
  tempest: { n: 'Tempest', tier: 3, from: 'windrunner', d: ['35%: lightning chains to all foes', '10% faster shots'], zap: .35, cdMul: .9, look: { cape: '#4878d6', deco: ['scarf'], aura: '#a6caff', eyes: '#e8ffff' } },
  skyhunter: { n: 'Sky Hunter', tier: 3, from: 'windrunner', d: ['+15% crit, multishot +20%', '+10% dodge'], crit: 15, multi: .2, dodge: .1, look: { cape: '#f4f4f4', deco: ['scarf'], wings: '#e6e6f0' } },
  sniper: { n: 'Assassin', tier: 1, from: 'archer', spr: 'sniper', atk: 'blink', bar: 'snipe', d: ['Perfect hits deal 3.5x, +10% crit', 'Bar: slows down inside the zone, tiny perfect', 'Blinks in for twin dagger strikes'], perfMult: 3.5, cdMul: 1.35, perfZ: .8, crit: 10, look: {} },
  shadowblade: { n: 'Shadowblade', tier: 2, from: 'sniper', d: ['Hits bleed for 35% over 3s', '15% chance to dodge blows'], bleed: .35, dodge: .15, look: { cape: '#1e1c26', deco: ['mask'] } },
  nightstalker: { n: 'Nightstalker', tier: 3, from: 'shadowblade', d: ['Executes foes under 20%', '+10% crit'], exec: .2, crit: 10, look: { cape: '#0c0a10', deco: ['mask', 'hood'], eyes: '#d07aff', aura: '#8a2ad0' } },
  phantom: { n: 'Phantom', tier: 3, from: 'shadowblade', d: ['30% dodge', 'Perfect hits echo for 50%'], dodge: .3, echo: .5, look: { cape: '#b4b4c4', deco: ['mask'], aura: '#e6e6f0', ghost: 1 } },
  deadeye: { n: 'Deadeye', tier: 2, from: 'sniper', atk: 'snipe', d: ['Perfect hits 4.5x, +10% crit', 'Heavy piercing shots'], perfMult: 4.5, crit: 10, look: { cape: '#9a7428', deco: ['patch'] } },
  marksman: { n: 'Marksman', tier: 3, from: 'deadeye', d: ['Perfect hits 5.5x', 'Shots pierce every foe for 50%'], perfMult: 5.5, multi: .5, look: { cape: '#5a3080', deco: ['patch', 'plume'], aura: '#ffe070' } },
  hawkeye: { n: 'Hawkeye', tier: 3, from: 'deadeye', d: ['+20% crit', 'Crits +80%'], crit: 20, critAdd: .8, look: { cape: '#c08a50', deco: ['patch'], eyes: '#ffe070', wings: '#8a5a30' } },
  // ---- mage ----
  pyro: { n: 'Pyromancer', tier: 1, from: 'mage', spr: 'pyro', atk: 'fire', bar: 'heat', d: ['Blasts set all foes ablaze (40% over 3s)', 'Bar: 5 perfects build heat, the next hit erupts', 'Hurls fireballs'], burn: .4, dmgMul: 1.05, look: {} },
  infernalist: { n: 'Infernalist', tier: 2, from: 'pyro', d: ['Burn +30%', 'Every 5 perfects: fire nova 1.6x'], burn: .3, nova: 5, novaM: 1.6, look: { cape: '#a02408', deco: ['horns'], eyes: '#ffb03a' } },
  hellcaller: { n: 'Hellcaller', tier: 3, from: 'infernalist', d: ['Burn +30%', 'Perfect hits execute foes under 10%'], burn: .3, exec: .1, look: { tint: { R: '#3c0e52', r: '#16061e' }, cape: '#3c0e52', deco: ['horns'], eyes: '#d07aff', aura: '#8a2ad0' } },
  cinderlord: { n: 'Cinderlord', tier: 3, from: 'infernalist', d: ['+20% damage', 'Nova every 4 perfects'], dmgMul: 1.2, nova: 4, look: { cape: '#ff7a1a', deco: ['crown'], eyes: '#fff3a8', aura: '#ff7a1a' } },
  phoenix: { n: 'Phoenix', tier: 2, from: 'pyro', d: ['Rises once per fight at 40% life', 'Perfect hits heal the party 2%'], revive: 1, healP: .02, look: { cape: '#ffb03a', wings: '#ff7a1a' } },
  sunflare: { n: 'Sunflare', tier: 3, from: 'phoenix', d: ['+15% damage', 'Every 5 perfects: solar nova 2x'], dmgMul: 1.15, nova: 5, novaM: 2, look: { cape: '#ffe070', wings: '#ffb03a', deco: ['halo'], aura: '#ffe070' } },
  ashborn: { n: 'Ashborn', tier: 3, from: 'phoenix', d: ['Rises twice per fight', '+5% lifesteal'], revive: 1, steal: .05, look: { tint: { R: '#5e5c6e', r: '#363442' }, cape: '#363442', wings: '#5e5c6e', eyes: '#ff7a1a' } },
  cryo: { n: 'Cryomancer', tier: 1, from: 'mage', spr: 'cryo', atk: 'ice', bar: 'frost', d: ['Hits chill foes: they attack 40% slower', 'Bar: a perfect slows the marker for 1.2s', 'Perfect hits freeze foes for 1.2s'], chill: 1, freeze: 1.2, dmgMul: .9, look: {} },
  frostlord: { n: 'Frostlord', tier: 2, from: 'cryo', d: ['Freeze 1.6s, +6 armor', 'Foes act 20% slower'], freeze: 1.6, arm: 6, slow: .2, look: { cape: '#e8ffff', deco: ['crown'] } },
  glacier: { n: 'Glacier King', tier: 3, from: 'frostlord', d: ['+30% life', 'Every 4 perfects the party is shielded'], hpMul: 1.3, shieldAll: 4, look: { cape: '#78d6ee', deco: ['crown', 'pauldrons'], aura: '#a6caff' } },
  blizzard: { n: 'Blizzard', tier: 3, from: 'frostlord', d: ['Blast splash +30%', '30%: ice shards hit all foes'], splashAdd: .3, zap: .3, look: { cape: '#f4f4f4', deco: ['crown'], aura: '#e8ffff', eyes: '#e8ffff' } },
  chrono: { n: 'Chronomancer', tier: 2, from: 'cryo', d: ['Foes act 25% slower', '10% faster casts'], slow: .25, cdMul: .9, look: { cape: '#d8b04a', deco: ['halo'] } },
  timeweaver: { n: 'Timeweaver', tier: 3, from: 'chrono', d: ['Perfect hits echo for 50%', 'Foes act 10% slower'], echo: .5, slow: .1, look: { cape: '#fff0a0', deco: ['halo', 'crown'], aura: '#ffe070' } },
  voidwalker: { n: 'Voidwalker', tier: 3, from: 'chrono', atk: 'void', d: ['+25% damage, +10% crit', 'Casts void bolts'], dmgMul: 1.25, crit: 10, look: { tint: { C: '#46226c', c: '#1c0c2e' }, cape: '#1c0c2e', deco: ['halo'], eyes: '#d07aff', aura: '#8a2ad0' } },
};
function evoLine(c) { const l = []; let e = c && c.evo; while (e && EVO[e]) { l.unshift(e); e = EVO[e].from; } return l; }
function evoRoot(c) { return evoLine(c)[0]; }
function evoNext(c) { const t = c.evo ? EVO[c.evo].tier : 0, par = c.evo || c.id; return Object.keys(EVO).filter(k => EVO[k].from === par && EVO[k].tier === t + 1); }
function canEvolve(c) { const t = c.evo ? EVO[c.evo].tier : 0; return t < 3 && c.lvl >= EVOLV[t]; }
function evoField(c, k, def) { const l = evoLine(c); for (let i = l.length - 1; i >= 0; i--) if (EVO[l[i]][k] != null) return EVO[l[i]][k]; return def; }
function mergeEvo(c) {
  const o = {}, MUL = ['hpMul', 'dmgMul', 'cdMul', 'perfZ', 'mark'], MAX = ['perfMult', 'taunt', 'freeze', 'novaM'], SKIP = ['n', 'tier', 'from', 'spr', 'atk', 'bar', 'd', 'look'];
  for (const k of evoLine(c)) for (const [key, v] of Object.entries(EVO[k])) {
    if (SKIP.includes(key)) continue;
    if (MUL.includes(key)) o[key] = (o[key] || 1) * v; else if (MAX.includes(key)) o[key] = Math.max(o[key] || 0, v);
    else if (key === 'nova') o.nova = o.nova ? Math.min(o.nova, v) : v; else o[key] = (o[key] || 0) + v;
  }
  return o;
}
const SKILLS = {
  warrior: [
    { k: 'edge', n: 'Keen Edge', d: '+12% damage per rank' },
    { k: 'hide', n: 'Iron Hide', d: '+8% life and +3 armor per rank' },
    { k: 'focus', n: 'Focus', d: '+12% perfect zone per rank' },
    { k: 'cleave', n: 'Cleave', d: 'Perfect hits splash 25% per rank to other foes', req: 'edge' },
    { k: 'wind', n: 'Second Wind', d: 'Regenerate 1% life per second per rank', req: 'hide' },
    { k: 'riposte', n: 'Riposte', d: 'Parries hit back for 60% per rank', req: 'focus' },
  ],
  archer: [
    { k: 'draw', n: 'Quick Draw', d: '8% faster shots per rank' },
    { k: 'eye', n: 'Eagle Eye', d: '+6% crit chance per rank' },
    { k: 'steady', n: 'Steady Aim', d: '+10% good zone per rank' },
    { k: 'volley', n: 'Volley', d: '15% chance per rank to loose a 2nd arrow', req: 'draw' },
    { k: 'head', n: 'Headshot', d: '+25% crit damage per rank', req: 'eye' },
    { k: 'pin', n: 'Pin Down', d: 'Perfect hits delay the foe 0.3s per rank', req: 'steady' },
  ],
  mage: [
    { k: 'arcane', n: 'Arcane Power', d: '+12% damage per rank' },
    { k: 'ward', n: 'Ward', d: '+10% life and +3 armor per rank' },
    { k: 'flow', n: 'Flow', d: '+12% perfect zone per rank' },
    { k: 'chain', n: 'Chain', d: 'Blast splash +15% per rank (base 40%)', req: 'arcane' },
    { k: 'barrier', n: 'Barrier', d: 'Whole party +2 armor per rank', req: 'ward' },
    { k: 'surge', n: 'Surge', d: 'Perfect streak 5+: +10% damage per rank', req: 'flow' },
  ],
};
const SKMAX = 3;
const FOES = {
  slime: { n: 'Slime', spr: 'slime', hp: 1, dmg: .8, per: 2.4, wind: .55, sc: 4, atk: 'leap' },
  bigslime: { n: 'Big Slime', spr: 'slime', hp: 2.4, dmg: 1.1, per: 2.8, wind: .6, sc: 5, atk: 'leap' },
  bat: { n: 'Bat', spr: 'bat', hp: .6, dmg: .6, per: 1.4, wind: .35, sc: 4, fly: 1, atk: 'dive' },
  goblin: { n: 'Goblin', spr: 'goblin', hp: 1, dmg: 1, per: 2.0, wind: .45, sc: 4, atk: 'lunge' },
  gobchief: { n: 'Goblin Chief', spr: 'gobchief', hp: 5, dmg: 1.5, per: 2.6, wind: .7, sc: 5, boss: 1, slam: 3 },
  shroom: { n: 'Shroom', spr: 'shroom', hp: 1.1, dmg: .9, per: 2.2, wind: .5, sc: 4, atk: 'shoot', pk: 'spore' },
  wolf: { n: 'Wolf', spr: 'wolf', hp: .8, dmg: 1.1, per: 1.3, wind: .35, sc: 4, atk: 'leap' },
  treant: { n: 'Elder Treant', spr: 'treant', hp: 6, dmg: 1.6, per: 3.0, wind: .8, sc: 5, boss: 1, slam: 2 },
  skel: { n: 'Skeleton', spr: 'skel', hp: 1, dmg: 1, per: 1.8, wind: .45, sc: 4, revive: 1, atk: 'shoot', pk: 'bone' },
  ghost: { n: 'Ghost', spr: 'ghost', hp: .7, dmg: 1.2, per: 2.0, wind: .45, sc: 4, ghost: 1, fly: 1, atk: 'shoot', pk: 'wisp' },
  darkknight: { n: 'Dark Knight', spr: 'darkknight', hp: 7, dmg: 1.7, per: 2.2, wind: .55, sc: 5, boss: 1, plated: 1, slam: 3, outline: '#5a5a66' },
  shade: { n: 'Shade', spr: 'shade', hp: .8, dmg: 1, per: 1.2, wind: .3, sc: 4, outline: '#5a3d8a', fly: 1, atk: 'dive' },
  eye: { n: 'Void Eye', spr: 'eye', hp: 1, dmg: .9, per: 2.4, wind: .5, sc: 4, stare: 1, fly: 1, outline: '#5a3d8a', atk: 'shoot', pk: 'beam' },
  mirror: { n: 'Your Reflection', spr: 'mirror', hp: 9, dmg: 1.8, per: 1.6, wind: .45, sc: 5, boss: 1, mirror: 1, slam: 4, outline: '#d0d0d0' },
};
const FOE_TIPS = { ghost: 'Ghosts: only PERFECT hits land fully', darkknight: 'Plated: GOOD hits do 60%', eye: 'Void Eyes speed up your timing bar', mirror: 'Your misses heal it', skel: 'Skeletons rise once', bat: 'Bats strike on a fast beat', wolf: 'Wolves strike on a fast beat' };
const ACTS = [
  { n: 'Pale Fields', c: '#9fd08a', roman: 'I' },
  { n: 'Ash Woods', c: '#d6a070', roman: 'II' },
  { n: 'Black Keep', c: '#a0a0c8', roman: 'III' },
  { n: 'The Void', c: '#b480ff', roman: 'IV' },
];
const LEVELS = [
  { n: 'Slime Meadow', w: [['slime', 'slime'], ['slime', 'slime', 'slime'], ['slime', 'bigslime', 'slime']] },
  { n: 'Bat Cave', w: [['bat', 'slime', 'bat'], ['bat', 'bigslime', 'bat'], ['bat', 'bat', 'bat']] },
  { n: 'Goblin Camp', w: [['goblin', 'goblin'], ['goblin', 'bat', 'goblin'], ['gobchief']] },
  { n: 'Spore Grove', w: [['shroom', 'shroom'], ['shroom', 'wolf', 'shroom'], ['wolf', 'shroom', 'wolf']] },
  { n: 'Wolf Den', w: [['wolf', 'wolf'], ['wolf', 'wolf', 'wolf'], ['wolf', 'shroom', 'wolf']] },
  { n: 'Elder Root', w: [['wolf', 'shroom'], ['shroom', 'wolf', 'shroom'], ['treant']] },
  { n: 'Bone Hall', w: [['skel', 'skel'], ['skel', 'skel', 'skel'], ['skel', 'ghost', 'skel']] },
  { n: 'Haunted Stair', w: [['ghost', 'skel'], ['ghost', 'skel', 'ghost'], ['ghost', 'ghost', 'ghost']] },
  { n: 'Throne Room', w: [['skel', 'ghost'], ['skel', 'ghost', 'skel'], ['darkknight']] },
  { n: 'Hollow Shore', w: [['shade', 'shade'], ['shade', 'eye', 'shade'], ['shade', 'shade', 'shade']] },
  { n: 'Watching Dark', w: [['eye', 'shade'], ['eye', 'shade', 'eye'], ['eye', 'eye', 'eye']] },
  { n: 'The Mirror', w: [['shade', 'eye'], ['eye', 'shade', 'eye'], ['mirror']] },
];
const GOBLETS = {
  blue: { n: 'Blue Goblet', c: '#5a8cff', d: 'Below 75% life: party +25% damage for 4s', th: .75 },
  green: { n: 'Green Goblet', c: '#5fd06a', d: 'Below 50% life: party attacks 50% faster for 3s', th: .5 },
  red: { n: 'Red Goblet', c: '#ff5a50', d: 'Below 25% life: party heals 10%/s for 3s', th: .25 },
};

// ================= items =================
const SLOTS = ['weapon', 'helm', 'armor', 'boots', 'ring', 'charm'];
const RAR = [
  { n: 'Plain', c: '#a0a0aa' }, { n: 'Blue', c: '#5a8cff' }, { n: 'Green', c: '#5fd06a' },
  { n: 'Red', c: '#ff5a50' }, { n: 'Ancient', c: '#ffa53a' }, { n: 'White', c: '#ffffff' },
];
const MAT = ['Iron', 'Ash', 'Bone', 'Void'];
const STATN = { dmg: 'dmg', hp: 'life', arm: 'armor', crit: '% crit', spd: '% speed', zone: '% zone' };
const POOL = { weapon: ['dmg', 'spd', 'crit', 'dmg'], helm: ['hp', 'arm', 'crit', 'zone'], armor: ['hp', 'arm', 'hp'], boots: ['spd', 'hp', 'arm'], ring: ['dmg', 'crit', 'hp', 'arm', 'zone'], charm: ['zone', 'spd', 'hp', 'dmg'] };
function statVal(st, ilvl, rar) {
  const m = 1 + rar * 0.22;
  switch (st) {
    case 'dmg': return Math.max(1, Math.round((1.5 + ilvl * 1.25) * m));
    case 'hp': return Math.round((8 + ilvl * 6) * m);
    case 'arm': return Math.max(1, Math.round((1 + ilvl * .7) * m));
    case 'crit': return 2 + rar + Math.floor(ilvl / 4);
    case 'spd': return 3 + rar * 2 + Math.floor(ilvl / 4);
    case 'zone': return 4 + rar * 3 + Math.floor(ilvl / 4);
  }
}
function rollRarity(minR = 0, bonus = 0) {
  const w = [52, 26, 12, 6, 3, 1]; let tot = 0; const ww = w.map((x, i) => i < minR ? 0 : x * (1 + bonus * i)); ww.forEach(x => tot += x);
  let r = Math.random() * tot; for (let i = 0; i < 6; i++) { r -= ww[i]; if (r <= 0) return i; } return 0;
}
function makeItem(ilvl, slot, cls, minR = 0, bonus = 0) {
  slot = slot || pick(SLOTS);
  const rar = rollRarity(minR, bonus);
  cls = cls && LOOKS[cls] ? cls : pick(save && save.party ? save.party : ['warrior']);
  const it = { id: save.nextId++, slot, cls, rar, ilvl, mods: {}, look: Math.floor(Math.random() * 1000) };
  it.lk = pickLook(cls, slot, rar); const LK = LOOKS[cls][slot][it.lk];
  if (LK.u) { it.u = LK.u; it.fx = LK.fx; it.rar = Math.max(4, rar); }
  const main = { weapon: 'dmg', helm: 'hp', armor: 'hp', boots: 'spd', ring: 'crit', charm: 'zone' }[slot];
  it.mods[main] = slot === 'helm' ? Math.round(statVal('hp', ilvl, rar) * .6) : statVal(main, ilvl, rar);
  if (slot === 'armor' || slot === 'helm' || slot === 'boots') it.mods.arm = Math.max(1, Math.round(statVal('arm', ilvl, rar) * (slot === 'armor' ? 1 : .5)));
  const extra = [0, 1, 1, 2, 2, 3][rar];
  for (let i = 0; i < extra; i++) { const st = pick(POOL[slot]); it.mods[st] = (it.mods[st] || 0) + statVal(st, ilvl, Math.max(0, rar - 1)); }
  it.name = it.u ? LK.n : MAT[clamp(Math.floor((ilvl - 1) / 3), 0, 3)] + ' ' + LK.n;
  return it;
}
function itemIcon(it) { return it.slot === 'weapon' ? CLS[it.cls].weapon : it.slot; }
function itemScore(it) { if (!it) return 0; const m = it.mods; return (m.dmg || 0) * 3 + (m.hp || 0) * .4 + (m.arm || 0) * 1.5 + (m.crit || 0) * 1.5 + (m.spd || 0) * 1.5 + (m.zone || 0) * 1.2; }
function canUse(it, cid) { return itemCls(it) === cid; }
function modLines(it) { return Object.entries(it.mods).map(([k, v]) => '+' + v + (STATN[k][0] === '%' ? '' : ' ') + STATN[k]); }

// ================= save =================
const SAVE_KEY = 'wam_save_v1';
let save = null;
function newChar(id, lvl) {
  return { id, lvl, xp: 0, sk: {}, seen: [], evo: null, gear: { weapon: null, helm: null, armor: null, boots: null, ring: null, charm: null } };
}
function newSave() {
  save = { v: 1, unlocked: 0, cleared: Array(12).fill(false), sel: 0, perfects: 0, bestStreak: 0, kills: 0, party: ['warrior'], active: 'warrior',
    chars: { warrior: newChar('warrior', 1) }, inv: [], scrap: 0, goblets: [], act4: false, mute: false, nextId: 1, bestLvl: 1, tut: false, started: false, autoScrap: false };
  const sw = makeItem(1, 'weapon', 'warrior'); sw.rar = 0; sw.mods = { dmg: 2 }; sw.look = 0; sw.lk = 0; sw.name = 'Iron Shortsword'; save.chars.warrior.gear.weapon = sw;
  return save;
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1 && s.chars) { save = s; for (const id in s.chars) for (const sl of SLOTS) if (s.chars[id].gear[sl] === undefined) s.chars[id].gear[sl] = null; if (s.autoScrap === undefined) s.autoScrap = false;
      for (const id in s.chars) { const c = s.chars[id]; delete c.st; delete c.stp; delete c.sp; c.seen = c.seen || []; for (const sl of SLOTS) { const it = c.gear[sl]; if (it && !it.cls) it.cls = id; } }
      for (const it of s.inv) if (!it.cls) it.cls = pick(s.party);
      return true; } } catch (e) {}
  newSave(); return false;
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const xpNeed = l => Math.round(10 + 6 * l * l);
function addChar(id) {
  if (save.party.includes(id)) return;
  const lvl = Math.max(1, save.chars.warrior.lvl - 1);
  const c = newChar(id, lvl); save.chars[id] = c; save.party.push(id);
  const w = makeItem(Math.max(1, save.bestLvl - 1), 'weapon', id); w.rar = 1; c.gear.weapon = w;
}
function act4Ready() { return save.cleared[8] && save.perfects >= TUNE.act4Perfects; }
function levelOpen(li) { return li <= save.unlocked && (li < 9 || save.act4); }

// ================= stats =================
function calcStats(c) {
  const C = CLS[c.id], E = mergeEvo(c), r = k => c.sk[k] || 0, FX = {};
  const G = GROW[c.id], L1 = c.lvl - 1; c.sk = treeSk(c);
  let hp = C.hp * (1 + G.hp * L1), dmg = C.dmg * (1 + G.dmg * L1);
  let spd = G.spd * L1, arm = C.arm + Math.floor(G.arm * L1), crit = C.crit + Math.floor(G.crit * L1), zone = 0;
  for (const s of SLOTS) { const it = c.gear[s]; if (!it) continue; const m = it.mods; if (it.fx) for (const [k, v] of Object.entries(it.fx)) FX[k] = (FX[k] || 0) + v; hp += m.hp || 0; dmg += m.dmg || 0; spd += m.spd || 0; arm += m.arm || 0; crit += m.crit || 0; zone += m.zone || 0; }
  const o = { perfMult: E.perfMult || TUNE.perfectMult, perfZ: 1, goodZ: 1, cdMul: E.cdMul || 1, critDmg: 1.5, mark: E.mark || 1 };
  if (c.id === 'warrior') { dmg *= 1 + .12 * r('edge'); hp *= 1 + .08 * r('hide'); arm += 3 * r('hide'); o.perfZ *= 1 + .12 * r('focus'); o.cleave = .25 * r('cleave'); o.regen = .01 * r('wind'); o.riposte = .6 * r('riposte'); }
  if (c.id === 'archer') { o.cdMul *= 1 - .08 * r('draw'); crit += 6 * r('eye'); o.goodZ *= 1 + .1 * r('steady'); o.volley = .15 * r('volley'); o.critDmg += .25 * r('head'); o.pin = .3 * r('pin'); }
  if (c.id === 'mage') { dmg *= 1 + .12 * r('arcane'); hp *= 1 + .1 * r('ward'); arm += 3 * r('ward'); o.perfZ *= 1 + .12 * r('flow'); o.splash = .4 + .15 * r('chain'); o.barrier = 2 * r('barrier'); o.surge = .1 * r('surge'); }
  hp *= E.hpMul || 1; dmg *= E.dmgMul || 1; arm += E.arm || 0; crit += E.crit || 0; o.perfZ *= E.perfZ || 1;
  Object.assign(o, { taunt: E.taunt || 1, guard: E.guard, steal: E.steal, rage: E.rage, multi: E.multi, burn: E.burn, chill: E.chill, freeze: E.freeze,
    healP: E.healP, exec: E.exec, nova: E.nova, novaM: E.novaM || 1.5, rally: E.rally, pet: E.pet, zap: E.zap, bleed: E.bleed, thorns: E.thorns, shieldAll: E.shieldAll, revive: E.revive, slow: E.slow, echo: E.echo, dodge: E.dodge, holy: E.holy });
  o.critDmg += E.critAdd || 0; if (o.splash != null) o.splash += E.splashAdd || 0;
  // unique item effects stack on top
  for (const [k, v] of Object.entries(FX)) { if (k === 'perfMult') o.perfMult += v; else if (k === 'perfZ') o.perfZ *= 1 + v; else if (k === 'splash') o.splash = (o.splash || 0) + v; else if (k === 'volley') o.volley = (o.volley || 0) + v; else if (k === 'aegis') o.aegis = 1; else o[k] = (o[k] || 0) + v; }
  if (FX.chill) { o.chill = 1; o.freeze = Math.max(o.freeze || 0, .6); }
  o.hp = Math.round(hp); o.dmg = Math.round(dmg * 10) / 10; o.cd = C.cd * o.cdMul / (1 + spd / 100); o.arm = Math.round(arm); o.crit = Math.min(75, crit); o.zone = zone;
  return o;
}
function charSpr(c) { const r = evoRoot(c); return r ? EVO[r].spr : CLS[c.id].spr; }
function charName(c) { return c.evo ? EVO[c.evo].n : CLS[c.id].n; }
function giveXp(amount) {
  const ups = [];
  for (const id of save.party) {
    const c = save.chars[id]; c.xp += amount;
    while (c.xp >= xpNeed(c.lvl)) { c.xp -= xpNeed(c.lvl); c.lvl++; ups.push(id); }
  }
  return ups;
}
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
// ================= skill constellation =================
// No points: nodes light up on their own at level milestones or boss clears. The only choices are the forks,
// which are the evolution splits (tier 1 at Lv 5, tier 2 at Lv 9, tier 3 at Lv 13). Passive, active and
// timing-bar nodes on a branch unlock only if that branch is the path you took.
const BOSSLV = [2, 5, 8, 11];
const GROW = { // automatic growth per level after 1
  warrior: { hp: .13, dmg: .075, arm: .7, crit: .15, spd: 0 },
  archer: { hp: .09, dmg: .09, arm: .3, crit: .45, spd: 1 },
  mage: { hp: .08, dmg: .1, arm: .35, crit: .2, spd: .5 },
};
function reqMet(c, q) { if (!q) return true; if (q.lvl && c.lvl < q.lvl) return false; if (q.boss != null && !save.cleared[BOSSLV[q.boss]]) return false; return true; }
function reqText(q) { return q.boss != null ? 'Defeat boss ' + (q.boss + 1) : 'Reach Lv ' + q.lvl; }
const treeCache = {};
function buildTree(cls) {
  if (treeCache[cls]) return treeCache[cls];
  const S = SKILLS[cls], K = S.map(s => s.k), N = [], add = n => (N.push(n), n);
  const kind = k => k === K[2] ? 'bar' : (k === K[3] || k === K[5]) ? 'active' : 'passive';
  const sk = (id, k, q, x, y, from, rank = 1) => add({ id, k: kind(k), sk: k, rank, q, x, y, from, ic: k, n: S.find(s => s.k === k).n, d: S.find(s => s.k === k).d.replace(' per rank', '') });
  add({ id: 'root', k: 'root', x: 0, y: 0, ic: null, n: CLS[cls].n, d: 'Grows stronger every level.', from: null });
  sk('t1', K[0], { lvl: 2 }, 0, -38, 'root'); sk('t2', K[1], { lvl: 3 }, 0, -74, 't1'); sk('t3', K[2], { boss: 0 }, 0, -110, 't2');
  const kids = p => Object.keys(EVO).filter(k => EVO[k].from === p);
  const t1 = kids(cls);
  t1.forEach((e1, i) => {
    const X1 = (i ? 1 : -1) * 96;
    add({ id: e1, k: 'evo', evo: e1, tier: 1, q: { lvl: EVOLV[0] }, x: X1, y: -152, from: 't3', ic: 'evo' });
    sk(e1 + 'a', K[3 + i], { lvl: 7 }, X1, -188, e1); sk(e1 + 'b', K[5], { boss: 1 }, X1, -224, e1 + 'a');
    kids(e1).forEach((e2, j) => {
      const X2 = X1 + (j ? 1 : -1) * 46;
      add({ id: e2, k: 'evo', evo: e2, tier: 2, q: { lvl: EVOLV[1] }, x: X2, y: -266, from: e1 + 'b', ic: 'evo' });
      sk(e2 + 'a', K[j], { lvl: 11 }, X2, -302, e2, 2);
      kids(e2).forEach((e3, m) => {
        const X3 = X2 + (m ? 1 : -1) * 22;
        add({ id: e3, k: 'evo', evo: e3, tier: 3, q: { lvl: EVOLV[2] }, x: X3, y: -344 - (m ? 0 : 10), from: e2 + 'a', ic: 'evo' });
        sk(e3 + 'a', K[m ? 2 : 3], { boss: 3 }, X3, -384 - (m ? 0 : 10), e3, 2);
      });
    });
  });
  const by = {}; N.forEach(n => by[n.id] = n);
  return (treeCache[cls] = { N, by });
}
// state of a node for a character: 'own' | 'pick' (fork you can take now) | 'open' (path taken, waiting) | 'lock' | 'seal' (other branch)
function nodeState(c, n) {
  const T = buildTree(c.id), line = evoLine(c);
  if (n.k === 'root') return 'own';
  // which evolution branch does this node live under?
  let p = n, ev = null; while (p) { if (p.evo) { ev = p.evo; break; } p = T.by[p.from]; }
  if (n.k === 'evo') {
    if (line.includes(n.evo)) return 'own';
    const par = EVO[n.evo].from, parOk = par === c.id ? true : line.includes(par);
    if (!parOk || (line.length >= n.tier)) return 'seal';
    const pre = T.by[n.from]; if (pre && pre.k !== 'evo' && !(nodeState(c, pre) === 'own' || pre.q && pre.q.boss != null)) return 'lock';
    return reqMet(c, n.q) ? 'pick' : 'lock';
  }
  if (ev && !line.includes(ev)) { const st = nodeState(c, T.by[ev]); return st === 'seal' ? 'seal' : 'lock'; }
  return reqMet(c, n.q) ? 'own' : 'open';
}
// skill ranks come from lit nodes
function treeSk(c) { const T = buildTree(c.id), o = {}; for (const n of T.N) if (n.sk && nodeState(c, n) === 'own') o[n.sk] = (o[n.sk] || 0) + n.rank; return o; }
function newlyLit(c) { const T = buildTree(c.id); c.seen = c.seen || []; return T.N.filter(n => n.k !== 'root' && nodeState(c, n) === 'own' && !c.seen.includes(n.id)); }
// ================= battle =================
let B = null;
const PPOS = { 1: [[92, 182]], 2: [[94, 150], [62, 218]], 3: [[96, 172], [62, 110], [62, 234]] };
const FPOS = { 1: [[238, 188]], 2: [[234, 148], [256, 220]], 3: [[230, 112], [256, 174], [230, 236]] };
SFX.auto = () => noise(.05, .12, 2500);

function startLevel(li) {
  audio();
  const n = save.party.length;
  B = { li, act: Math.floor(li / 3), wave: 0, foes: [], units: [], t: 0, mk: 0, md: 1, zc: .5, cd: 0, state: 'intro', st: 1.0,
    fx: [], parts: [], nums: [], proj: [], shake: 0, hitstop: 0, loot: [], xp: 0, streak: 0, perf: 0, target: 0,
    buff: { dmg: 0, spd: 0, heal: 0 }, gobUsed: {}, label: null, flash: null, banner: null, paused: false, msgs: [], quake: 0, zBase: .5, boss: null, trail: [], heat: 0, slowT: 0, zc2: .2, zw: .8, novaC: {}, shC: {}, crackFx: null, barShake: 0, eproj: [], combo: 0, impact: 0, zoom: null, dust: [] };
  B.units = save.party.map((id, i) => {
    const c = save.chars[id], s = calcStats(c), [x, y] = PPOS[n][i];
    return { id, c, s, hp: s.hp, max: s.hp, x, y, bx: x, ox: -60, lt: 0, hurt: 0, atkT: rnd(.4, 1.2), dead: false, guard: 0, spr: charSpr(c), dash: null, hop: 0, kb: 0, cast: 0, seed: i * 1.7 };
  });
  const bar = B.units.reduce((a, u) => a + (u.s.barrier || 0), 0);
  B.units.forEach(u => u.s.arm += bar);
  if (!save.party.includes(save.active)) save.active = save.party[0];
  spawnWave(0); rerollBar();
  scene = 'battle';
  banner(ACTS[B.act].roman + '-' + (li % 3 + 1) + '  ' + LEVELS[li].n, ACTS[B.act].c, 1.4);
}
function spawnWave(w) {
  const keys = LEVELS[B.li].w[w], n = keys.length;
  B.foes = keys.map((k, i) => {
    const T = FOES[k], L = B.li + 1, [x, y] = FPOS[n][i];
    const hp = Math.round(TUNE.foeHp * Math.pow(TUNE.foeHpGrow, L - 1) * T.hp * (T.boss ? TUNE.bossHp : 1));
    return { k, T, L, hp, max: hp, dmg: TUNE.foeDmg * Math.pow(TUNE.foeDmgGrow, L - 1) * T.dmg, timer: T.per * TUNE.foeRate * rnd(.7, 1.1) + .9, wind: 0, per: T.per * TUNE.foeRate, pend: null, anim: null, dodge: 0,
      x, y, spr: T.spr, sc: T.sc, ox: 90 + i * 12, flash: 0, kx: 0, dead: false, burnT: 0, burnDps: 0, burnAcc: 0, chill: 0, freeze: 0, lt: 0, atk: 0, reviveT: 0, seed: rnd(10) };
  });
  B.target = B.foes.findIndex(f => f.T.boss) >= 0 ? B.foes.findIndex(f => f.T.boss) : 0;
  B.gobUsed = {}; if (B.units) B.units.forEach(u => u.aegis = u.s.aegis ? 1 : 0);
  const bf = B.foes.find(f => f.T.boss && BOSS[f.k]); if (bf) bossStart(bf);
  const tip = keys.map(k => FOE_TIPS[k]).find(Boolean);
  if (tip && w === 0) B.tip = { txt: tip, t: 3.5 };
}
function unitAtk(u) { return evoField(u.c, 'atk', CLS[u.id].atk); }
function unitBar(u) { return u ? evoField(u.c, 'bar', null) : null; }
function rerollBar() { B.zc2 = B.zc < .5 ? rnd(Math.min(.86, B.zc + .3), .88) : rnd(.12, Math.max(.14, B.zc - .3)); B.zw = B.zc < .5 ? rnd(Math.min(.86, B.zc + .25), .88) : rnd(.12, Math.max(.14, B.zc - .25)); }
const activeUnit = () => B.units.find(u => u.id === save.active && !u.dead);
const liveFoes = () => B.foes.filter(f => !f.dead);
function sprSize(key, sc) { const r = SPR[key]; if (!r) return [BW * sc, BH * sc]; return [r[0].length * sc, r.length * sc]; }
function foeCenter(f) { const [w, h] = sprSize(f.spr, f.sc); return [f.x + f.ox + f.kx, f.y - h / 2 - (f.T.fly ? 10 : 0)]; }
const PSC = 4;
function unitCenter(u) { return [u.x + u.ox, u.y - 24]; }
function getTarget() {
  let f = B.foes[B.target];
  if (!f || f.dead) { f = liveFoes()[0]; B.target = B.foes.indexOf(f); }
  return f;
}
function zones() {
  const u = activeUnit(); if (!u) return { g: .2, p: .06 };
  const zm = 1 + (u.s.zone || 0) / 100;
  const g = clamp(TUNE.goodZone * u.s.goodZ * zm * (unitBar(u) === 'frost' ? 1.15 : 1), .08, .6);
  const pat = bossPat(), bz = pat && pat.zone || 1;
  const p = clamp(TUNE.perfectZone * u.s.perfZ * zm * bz, .02, g * .8);
  return { g: g * bz, p };
}
function markerSpeed() {
  const u = activeUnit(); let v = TUNE.markerSpeed * (1 + .07 * B.act) * (u ? u.s.mark : 1);
  v *= 1 + .15 * liveFoes().filter(f => f.T.stare).length;
  const pat = bossPat(); if (pat && pat.spd) v *= pat.spd;
  const bv = unitBar(u);
  if (bv === 'rage') v *= 1 + Math.min(.4, B.combo * .03);
  if (bv === 'snipe') { const { g } = zones(); if (Math.abs(B.mk - B.zc) < g / 2) v *= .55; }
  if (bv === 'frost' && B.slowT > 0) v *= .6;
  return v;
}
function switchTo(i) {
  if (!B || B.state === 'win' || B.state === 'lose') return;
  const u = B.units[i]; if (!u || u.dead || u.id === save.active) return;
  save.active = u.id; SFX.click(); B.cd = Math.max(B.cd, .15);
  B.fx.push({ type: 'ring', x: u.x, y: u.y - 24, t: 0, dur: .3, col: '#ffffff' });
}
function cycleUnit() {
  const n = B.units.length; let i = B.units.findIndex(u => u.id === save.active);
  for (let k = 1; k <= n; k++) { const u = B.units[(i + k) % n]; if (!u.dead) { switchTo((i + k) % n); return; } }
}
function strike() {
  if (!B || B.state !== 'fight' || B.paused) return;
  const u = activeUnit(); if (!u) return;
  if (B.cd > 0) return;
  const { g, p } = zones(), d = Math.abs(B.mk - B.zc);
  const bv = unitBar(u);
  let q = d <= p / 2 ? 'perfect' : d <= g / 2 ? 'good' : 'miss', ward = false;
  if (bv === 'twin' && q !== 'perfect' && Math.abs(B.mk - B.zc2) <= p / 2) q = 'perfect';
  if (bv === 'guard' && q === 'miss' && Math.abs(B.mk - B.zw) <= g * .3) { q = 'good'; ward = true; }
  B.cd = u.s.cd * (B.buff.spd > 0 ? .67 : 1);
  B.flash = { q, t: .3, x: B.mk };
  if (q === 'perfect') { save.perfects++; B.streak++; B.perf++; save.bestStreak = Math.max(save.bestStreak, B.streak); }
  else if (q === 'miss') B.streak = 0;
  B.label = { q, t: .7, x: B.mk };
  B.zc = B.zBase = rnd(.18, .82); rerollBar();
  if (ward) { B.units.forEach(o => { if (!o.dead) o.guard = 1; }); num(u.x, u.y - 70, 'WARD', COL.blue); B.fx.push({ type: 'ring', x: u.x, y: u.y - 24, t: 0, dur: .4, col: '#a6caff' }); }
  if (bv === 'frost' && q === 'perfect') B.slowT = 1.2;
  if (bv === 'heat' && q === 'perfect') B.heat = Math.min(5, B.heat + 1);
  if (bv === 'heat' && q !== 'miss' && B.heat >= 5 && B.heatArm) { B.heat = 0; B.heatArm = 0; nova(u, 2.5, '#ff7a1a', 'ERUPT'); }
  else if (bv === 'heat' && B.heat >= 5) B.heatArm = 1;
  if (q === 'miss') { B.barShake = .3; B.crackFx = { x: B.flash.x, t: .7, s: Math.floor(rnd(1000)) }; B.cd += TUNE.missLock; B.combo = 0; } else B.combo++;
  if (q !== 'miss') save.tut = true;
  attack(u, q, true);
}
function attack(u, q, manual) {
  const f = getTarget(); if (!f) return;
  u.lt = .16;
  if (q === 'miss') {
    SFX.miss(); num(...foeCenter(f), 'miss', COL.dim);
    if (f.T.mirror) { const h = Math.round(f.max * .06); f.hp = Math.min(f.max, f.hp + h); num(foeCenter(f)[0], foeCenter(f)[1] - 12, '+' + h, COL.green); }
    return;
  }
  let dmg = u.s.dmg * (q === 'perfect' ? u.s.perfMult : 1);
  if (!manual) dmg *= TUNE.autoDmgMul;
  if (manual && B.streak >= 2) dmg *= 1 + Math.min(TUNE.chainMax, TUNE.chainStep * B.streak);
  const mv = unitAtk(u), grp = { slash: 'm', spin: 'm', smite: 'm', blink: 'm', arrow: 'r', fan: 'r', snipe: 'r' }[mv] || 'c', [fx0, fy0] = foeCenter(f);
  if (grp === 'm') { u.dash = { t: 0, dur: mv === 'blink' ? .18 : manual ? .26 : .22, tx: fx0 - 34 - u.x, ty: f.y - u.y, blink: mv === 'blink' }; dust(u.x, u.y, 5); }
  else if (grp === 'r') u.kb = manual ? (mv === 'snipe' ? 8 : 5) : 3; else u.cast = .25;
  if (B.buff.dmg > 0) dmg *= 1.25;
  if (manual && unitBar(u) === 'rage') dmg *= 1 + Math.min(.3, B.combo * .02);
  if (u.s.rage) dmg *= 1 + Math.min(.4, (1 - u.hp / u.max) * .6);
  if (u.s.surge && manual && B.streak >= 5) dmg *= 1 + u.s.surge;
  const crit = Math.random() * 100 < u.s.crit; if (crit) dmg *= u.s.critDmg;
  const info = { q, crit, manual };
  if (manual && q === 'perfect') {
    B.hitstop = .055; B.shake = Math.max(B.shake, 3);
    if (f.wind > 0 || f.pend) {
      f.wind = 0; f.pend = null; f.anim = null; f.timer = f.per; SFX.parry(); SFX.clang(); num(fx0, fy0 - 22, 'PARRY!', COL.blue); if (u.s.riposte) dmg *= 1 + u.s.riposte;
      B.hitstop = .09; B.shake = Math.max(B.shake, 5); B.fx.push({ type: 'ring', x: fx0 - 20, y: fy0, t: 0, dur: .35, col: '#ffffff' });
      for (let i = 0; i < 14; i++) spark(fx0 - 22, fy0, i % 2 ? COL.gold : '#ffffff', 200);
    }
    if (u.s.pin) f.timer += u.s.pin;
    if (u.s.guard) u.guard = 1;
  }
  if (manual && q === 'good' && (f.wind > 0 || f.pend)) { if (f.pend) f.pend.dodge = 1; else f.dodge = 1; }
  if (crit || (manual && q === 'perfect')) { B.impact = crit && manual ? .07 : .045; if (crit && !RM) B.zoom = { t: 0, dur: .2, x: fx0, y: fy0, a: manual ? .09 : .05 }; }
  const hs = manual ? SFX[q] : SFX.auto, P = manual && q === 'perfect';
  const after = () => evoAfterHit(u, f, dmg, q, manual);
  if (grp === 'm') {
    hs(); const [cx, cy] = foeCenter(f);
    if (mv === 'spin') { for (let k = 0; k < 3; k++) B.fx.push({ type: 'smear', x: cx - 4 + k * 4, y: cy - 6 + k * 6, t: -k * .04, dur: .18, big: true, col: P ? COL.gold : '#ff9a9a', flip: k % 2 === 1 }); B.fx.push({ type: 'ring', x: cx, y: cy, t: 0, dur: .25, col: '#ff6a6a' }); }
    else if (mv === 'smite') { B.fx.push({ type: 'slash', x: cx, y: cy, t: 0, dur: .2, big: P }); B.fx.push({ type: 'pillar', x: cx, y: f.y, t: 0, dur: P ? .5 : .3, col: u.s.holy ? '#fff0a0' : '#e6e6f0' }); }
    else if (mv === 'blink') { B.fx.push({ type: 'smear', x: cx, y: cy, t: 0, dur: .12, big: false, col: '#d07aff', flip: false }); B.fx.push({ type: 'smear', x: cx, y: cy + 4, t: -.06, dur: .12, big: false, col: '#ffffff', flip: true }); for (let i = 0; i < 6; i++) spark(u.x, u.y - 24, '#8a2ad0', 60); }
    else { B.fx.push({ type: 'slash', x: cx, y: cy, t: 0, dur: .2, big: P });
    B.fx.push({ type: 'smear', x: cx, y: cy, t: 0, dur: .16, big: q === 'perfect' || crit, col: P ? COL.gold : '#ffffff', flip: Math.random() < .5 }); }
    if (mv === 'blink') { hitFoe(f, dmg * .55, info, u); setTimeout(() => B && hitFoe(f, dmg * .55, { q, manual }, u), 80); } else hitFoe(f, dmg, info, u);
    after();
    if (mv === 'spin' && u.s.multi) liveFoes().filter(o => o !== f).forEach(o => hitFoe(o, dmg * u.s.multi, { q: 'splash' }, u));
    if (u.s.cleave && q === 'perfect') liveFoes().filter(o => o !== f).forEach(o => { const [ox, oy] = foeCenter(o); B.fx.push({ type: 'slash', x: ox, y: oy, t: 0, dur: .16 }); hitFoe(o, dmg * u.s.cleave, { q: 'splash' }, u); });
  } else if (grp === 'r') {
    SFX.arrow();
    shoot(u, f, mv === 'snipe' ? 'snipe' : 'arrow', () => { hs(); hitFoe(f, dmg, info, u); after(); });
    if (mv === 'fan') [-14, 14].forEach((dy, k) => setTimeout(() => B && shoot(u, f, 'arrow', () => hitFoe(f, dmg * .15, { q: 'splash' }, u), dy), 40 + k * 30));
    if (u.s.volley && Math.random() < u.s.volley) { const o = pick(liveFoes()); setTimeout(() => B && shoot(u, o, 'arrow', () => hitFoe(o, dmg * .8, { q: 'good' }, u)), 90); }
    if (u.s.multi) liveFoes().filter(o => o !== f).forEach(o => shoot(u, o, 'arrow', () => hitFoe(o, dmg * u.s.multi, { q: 'splash' }, u)));
  } else {
    SFX.orb();
    shoot(u, f, mv === 'void' ? 'dark' : mv === 'fire' || u.s.burn ? 'fire' : mv === 'ice' || u.s.chill ? 'ice' : 'orb', () => {
      hs(); hitFoe(f, dmg, info, u); after();
      const [cx, cy] = foeCenter(f);
      B.fx.push({ type: 'ring', x: cx, y: cy, t: 0, dur: .3, col: u.s.burn ? '#ff9a3a' : u.s.chill ? '#9fe6f4' : '#9a8cff' });
      liveFoes().filter(o => o !== f).forEach(o => hitFoe(o, dmg * u.s.splash, { q: 'splash', manual }, u));
      if (u.s.burn) liveFoes().forEach(o => { o.burnT = 3; o.burnDps = Math.max(o.burnDps, dmg * u.s.burn / 3); });
    });
  }
}
function shoot(u, f, kind, cb, dy = 0) {
  const [x, y] = unitCenter(u);
  B.proj.push({ x: x + 14, y: y + dy, f, kind, cb, sp: kind === 'snipe' ? 900 : kind === 'arrow' ? 520 : 340, t: 0, tr: [] });
}
function nova(u, mult, col, label) {
  const [ux, uy] = unitCenter(u); B.fx.push({ type: 'nova', x: ux, y: uy, t: 0, dur: .5, col }); B.shake = Math.max(B.shake, 5); SFX.lvl();
  num(ux, uy - 46, label, col, 2);
  liveFoes().forEach(o => { const [cx, cy] = foeCenter(o); B.fx.push({ type: 'ring', x: cx, y: cy, t: 0, dur: .35, col }); hitFoe(o, u.s.dmg * mult, { q: 'perfect', manual: true }, u); });
}
// evolution abilities that trigger after a hit lands
function evoAfterHit(u, f, dmg, q, manual) {
  if (!B) return; const s = u.s, P = manual && q === 'perfect', [cx, cy] = foeCenter(f);
  if (s.bleed && !f.dead) { f.burnT = 3; f.burnDps = Math.max(f.burnDps, dmg * s.bleed / 3); f.bleed = 1; }
  if (s.pet && Math.random() < s.pet) setTimeout(() => { if (!B || f.dead) return; B.fx.push({ type: 'smear', x: cx - 6, y: cy + 8, t: 0, dur: .14, big: false, col: '#b4b4c4', flip: true }); num(cx - 14, cy + 10, 'wolf', '#b4b4c4'); hitFoe(f, dmg * .5, { q: 'good' }, u); }, 140);
  if (s.zap && Math.random() < s.zap) liveFoes().filter(o => o !== f).forEach(o => { const [ox, oy] = foeCenter(o); B.fx.push({ type: 'zap', x: cx, y: cy, x2: ox, y2: oy, t: 0, dur: .22, col: s.chill ? '#e8ffff' : '#a6caff' }); hitFoe(o, dmg * .4, { q: 'splash' }, u); });
  if (!P) return;
  if (s.healP) B.units.forEach(o => { if (!o.dead) { const h = Math.round(o.max * s.healP); o.hp = Math.min(o.max, o.hp + h); if (h) num(o.x + 8, o.y - 60, '+' + h, COL.green); } });
  if (s.exec && !f.dead && f.hp / f.max < s.exec && !(B.boss && B.boss.f === f)) { num(cx, cy - 26, 'EXECUTE', COL.red); hitFoe(f, f.hp + 1, { q: 'perfect', manual: true }, u); }
  if (s.rally) { B.buff.dmg = Math.max(B.buff.dmg, s.rally); num(u.x, u.y - 72, 'RALLY', COL.gold); }
  if (s.echo) setTimeout(() => { if (B && !f.dead) { num(cx, cy - 30, 'echo', '#e8ffff'); hitFoe(f, dmg * s.echo, { q: 'good' }, u); } }, 180);
  if (s.nova) { B.novaC[u.id] = (B.novaC[u.id] || 0) + 1; if (B.novaC[u.id] >= s.nova) { B.novaC[u.id] = 0; nova(u, s.novaM, s.holy ? '#fff0a0' : s.burn ? '#ff7a1a' : '#d6a6ff', 'NOVA'); } }
  if (s.shieldAll) { B.shC[u.id] = (B.shC[u.id] || 0) + 1; if (B.shC[u.id] >= s.shieldAll) { B.shC[u.id] = 0; B.units.forEach(o => { if (!o.dead) o.guard = 1; }); num(u.x, u.y - 72, 'SHIELD', COL.blue); } }
}
function hitFoe(f, dmg, info, u) {
  if (!f || f.dead) return;
  if (f.inv) { const [cx, cy] = foeCenter(f); spark(cx, cy, '#ffffff', 60); return; }
  if (f.T.ghost && info.q === 'good') dmg *= .5;
  if (f.T.plated && info.q === 'good') dmg *= .6;
  dmg = Math.max(1, Math.round(dmg));
  f.hp -= dmg; const isB = B.boss && B.boss.f === f; f.flash = isB ? (info.manual ? .06 : Math.max(f.flash, 0)) : .09;
  const str = clamp(dmg / f.max * (isB ? 12 : 3), 0, 1); f.kx = Math.round((info.q === 'splash' ? 2 : 4) + str * (isB ? 6 : 16) + (info.q === 'perfect' ? 4 : 0));
  if (info.manual) B.shake = Math.max(B.shake, 1.5 + str * 6 + (info.crit ? 2 : 0));
  const [cx, cy] = foeCenter(f);
  const col = info.q === 'perfect' ? COL.gold : info.crit ? '#ff9a6a' : info.q === 'splash' ? COL.dim : COL.white;
  num(cx + rnd(-6, 6), cy - 10, (info.crit ? dmg + '!' : '' + dmg), col, info.q === 'perfect' && info.manual ? 2 : 1);
  const n = info.q === 'perfect' ? 16 : info.q === 'splash' ? 3 : 7;
  let mc = '#fff'; if (SPR[f.spr]) { const mr = SPR[f.spr][Math.floor(SPR[f.spr].length / 2)].replace(/\./g, ''); mc = PAL[mr[Math.floor(mr.length / 2)]] || '#fff'; } else if (isB) mc = B.boss.D.crack;
  for (let i = 0; i < n; i++) spark(cx, cy, i % 2 ? '#ffffff' : (info.q === 'perfect' ? COL.gold : mc), info.q === 'perfect' ? 150 : 90);
  if (u && u.s.steal) u.hp = Math.min(u.max, u.hp + dmg * u.s.steal);
  if (u && u.s.chill) { f.chill = 3; if (info.q === 'perfect' && info.manual) { f.freeze = u.s.freeze; f.wind = 0; } }
  bossPhaseCheck(f);
  if (f.hp <= 0) killFoe(f);
}
function killFoe(f) {
  f.hp = 0; f.dead = true; f.pend = null; if (SPR[f.spr]) shatter(f.spr, foeCenter(f)[0], f.y - (f.T.fly ? 10 : 0), f.sc, f.T.outline); else bossShatter(f); SFX.kill();
  bossKilled(f);
  B.shake = Math.max(B.shake, f.T.boss ? 7 : 2.5);
  if (f.T.revive && !f.revived) { f.reviveT = 1.3; return; }
  const xp = Math.round(5 * Math.pow(f.L, 1.1) * (f.T.boss ? 6 : 1)); B.xp += xp; save.kills++;
  save.bestLvl = Math.max(save.bestLvl, f.L);
  const ups = giveXp(xp);
  new Set(ups).forEach(id => {
    const u = B.units.find(x => x.id === id); if (!u) return;
    const old = u.max; u.s = calcStats(u.c); u.max = u.s.hp; if (!u.dead) u.hp += u.max - old;
    num(u.x, u.y - 66, 'LEVEL UP', COL.gold); SFX.lvl();
    B.fx.push({ type: 'ring', x: u.x, y: u.y - 24, t: 0, dur: .5, col: COL.gold });
  });
  const lastOne = B.wave === 2 && !liveFoes().length && !B.foes.some(o => o.reviveT > 0);
  if (f.T.boss || lastOne || Math.random() < TUNE.dropChance) {
    const it = makeItem(f.L + (Math.random() < .3 ? 1 : 0), null, pick(save.party), f.T.boss ? 1 : 0, f.T.boss ? .6 : .1 * B.act);
    const [dx0, dy0] = foeCenter(f);
    if (save.autoScrap && isWorse(it)) { it.scrapped = true; save.scrap += it.rar + 1; setTimeout(() => B && num(dx0, dy0 - 30, 'scrapped +' + (it.rar + 1), COL.dim), 500); }
    else if (save.inv.length >= TUNE.invMax) { it.scrapped = true; save.scrap += it.rar + 1; num(dx0, f.y - 40, 'bag full +' + (it.rar + 1), COL.dim); }
    else save.inv.push(it);
    B.loot.push(it); B.fx.push({ type: 'drop', it, x: foeCenter(f)[0], y: foeCenter(f)[1], t: 0, dur: 1.2 });
    setTimeout(SFX.drop, 120);
  }
}
function foeAttack(f, second) {
  f.atk++; f.lt = .2;
  const boss = B.boss && B.boss.f === f, pat = boss ? bossPat() || {} : {};
  if (pat.dbl && !second) f.dbl = .3;
  const alive = B.units.filter(u => !u.dead); if (!alive.length) return;
  const sl = pat.slam || f.T.slam, slam = sl && f.atk % sl === 0;
  let targets;
  if (slam) targets = alive;
  else {
    const w = alive.map(u => u.s.taunt * (u.id === 'warrior' ? 1.5 : 1)); let r = rnd(w.reduce((a, b) => a + b, 0));
    let t = alive[0]; for (let i = 0; i < alive.length; i++) { r -= w[i]; if (r <= 0) { t = alive[i]; break; } }
    targets = [t];
  }
  const kind = boss ? 'boss' : f.T.atk || 'lunge', t0 = targets[0], [cx, cy] = foeCenter(f);
  const delay = { leap: .2, lunge: .11, dive: .15, shoot: .26, boss: .16 }[kind] || .12;
  f.pend = { targets, slam, t: delay, dodge: f.dodge }; f.dodge = 0;
  f.anim = { kind, t: 0, hit: delay, dur: delay + .24, tx: t0.x + 30 - f.x, ty: t0.y - f.y };
  if (kind === 'shoot') B.eproj.push({ x: cx - 8, y: cy, tx: t0.x + 6, ty: t0.y - 24, t: 0, dur: delay, pk: f.T.pk });
  if (kind === 'leap' || kind === 'lunge') dust(f.x, f.y, 4);
  if (boss) bossAttackFx(f, targets, slam);
  if (slam) num(cx, cy - 20, 'SLAM', COL.red);
}
function foeHit(f) {
  const P = f.pend; f.pend = null; if (!P) return;
  let any = false;
  for (const u of P.targets) {
    if (u.dead) continue; any = true;
    if (u.s.dodge && Math.random() < u.s.dodge) { u.hop = .32; num(u.x - 10, u.y - 64, 'evade', COL.green); continue; }
    if (u.aegis) { u.aegis = 0; num(u.x, u.y - 64, 'AEGIS', '#a6caff'); B.fx.push({ type: 'ring', x: u.x, y: u.y - 24, t: 0, dur: .35, col: '#a6caff' }); SFX.clang(); continue; }
    let d = f.dmg * rnd(.9, 1.1) * (P.slam ? .7 : 1) * 30 / (30 + u.s.arm);
    if (P.dodge) { d *= .4; u.hop = .32; num(u.x - 10, u.y - 64, 'dodge', COL.green); }
    if (u.guard) { d *= .5; u.guard = 0; num(u.x, u.y - 64, 'guard', COL.blue); }
    d = Math.max(1, Math.round(d)); u.hp -= d;
    if (u.s.thorns && !f.dead) hitFoe(f, d * u.s.thorns * 2, { q: 'splash' }, u); u.hurt = .22; u.kb = Math.max(u.kb, P.dodge ? 2 : 7);
    num(u.x + rnd(-5, 5), u.y - 54, '-' + d, COL.red, d > u.max * .2 ? 2 : 1);
    for (let i = 0; i < 8; i++) spark(u.x, u.y - 24, i % 2 ? '#ff5a5a' : '#ffffff', 100);
    dust(u.x, u.y, 3);
    if (u.id === save.active) B.combo = 0;
    if (u.hp <= 0) unitDie(u);
  }
  if (!any) return;
  SFX.hurt(); B.shake = Math.max(B.shake, P.slam ? 6 : 3);
  for (const g of save.goblets) {
    if (B.gobUsed[g]) continue; const G = GOBLETS[g];
    if (B.units.some(u => !u.dead && u.hp / u.max < G.th)) {
      B.gobUsed[g] = true; banner(G.n + '!', G.c, 1.1); SFX.lvl();
      if (g === 'blue') B.buff.dmg = 4; if (g === 'green') B.buff.spd = 3; if (g === 'red') B.buff.heal = 3;
    }
  }
}
function dust(x, y, n) { for (let i = 0; i < n; i++) B.parts.push({ x: x + rnd(-8, 8), y: y - 1, vx: rnd(-40, 40), vy: rnd(-24, -6), t: 0, life: rnd(.3, .55), col: pick(ACTPAL[B.act].dust), s: Math.random() < .5 ? 2 : 1, g: 30 }); }
function unitDie(u) {
  if (u.s.revive && (u.revUsed || 0) < u.s.revive) { u.revUsed = (u.revUsed || 0) + 1; u.hp = Math.round(u.max * .4); B.fx.push({ type: 'nova', x: u.x, y: u.y - 24, t: 0, dur: .6, col: '#ffb03a' }); num(u.x, u.y - 70, 'REBORN', '#ffb03a', 2); SFX.lvl(); return; }
  u.hp = 0; u.dead = true; shatter(u.spr, u.x, u.y, PSC);
  if (u.id === save.active) { const nx = B.units.find(x => !x.dead); if (nx) { save.active = nx.id; } }
  if (B.units.every(x => x.dead)) { B.state = 'lose'; B.st = 1.2; SFX.lose(); persist(); }
}
function num(x, y, txt, col, sc = 1) { B.nums.push({ x, y, txt, col, sc, t: 0 }); }
function spark(x, y, col, sp = 90) { const a = rnd(Math.PI * 2), v = rnd(.3, 1) * sp; B.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: rnd(.25, .5), col, s: Math.random() < .3 ? 2 : 1, g: 260 }); }
function shatter(key, cx, by, sc, outline) {
  const rows = SPR[key], h = rows.length, w = rows[0].length, x0 = cx - w * sc / 2, y0 = by - h * sc, step = w > 24 ? 2 : 1;
  for (let y = 0; y < h; y += step) for (let x = (y / step) % 2 && step > 1 ? 1 : 0; x < w; x += step) {
    const ch = rows[y][x]; if (ch === '.') continue;
    const px = x0 + x * sc, py = y0 + y * sc, a = Math.atan2(py - (by - h * sc / 2), px - cx) + rnd(-.4, .4), v = rnd(40, 140);
    B.parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: rnd(.4, .9), col: ch === 'K' && outline ? outline : PAL[ch], s: sc, g: 300 });
  }
}
function banner(txt, col, dur = 1.2) { B.banner = { txt, col, t: 0, dur }; }

function winLevel() {
  B.state = 'win'; B.st = .6; SFX.win();
  const li = B.li, first = !save.cleared[li];
  save.cleared[li] = true;
  save.unlocked = Math.max(save.unlocked, Math.min(11, li + 1));
  const msgs = [];
  if (first && li === 2) { save.goblets.push('blue'); addChar('archer'); msgs.push({ title: 'An Archer joins!', spr: 'archer', col: '#5fae5f', lines: ['Fast shots from the back row.', 'Press 1 2 3 (or tap a portrait) to', 'choose who you control. The others', 'auto-attack.', '', 'Found the Blue Goblet.'] }); }
  if (first && li === 5) { save.goblets.push('green'); addChar('mage'); msgs.push({ title: 'A Mage joins!', spr: 'mage', col: '#7a8cff', lines: ['Slow blasts that splash every foe.', '', 'Found the Green Goblet.'] }); }
  if (first && li === 8) {
    save.goblets.push('red');
    msgs.push({ title: 'Act III cleared', spr: 'warrior', col: COL.gold, lines: ['The Black Keep falls silent.', 'Found the Red Goblet.', '', 'But something stirs beyond the keep...', 'The void hungers for perfection.'] });
  }
  if (act4Ready() && !save.act4) { save.act4 = true; msgs.push({ title: 'A void opens', spr: 'shade', col: '#b480ff', lines: ['Your ' + TUNE.act4Perfects + ' perfect strikes tore the sky.', 'Secret Act IV: The Void is open.'] }); }
  if (first && li === 11) msgs.push({ title: 'The reflection breaks', spr: 'mirror', col: '#ffffff', lines: ['You beat the secret act.', 'Thanks for testing W.A.M.!'] });
  B.msgs = msgs;
  if (save.unlocked > li && levelOpen(li + 1)) save.sel = li + 1;
  persist();
}
function leaveBattle() {
  const msgs = (B && B.msgs) || [];
  B = null; persist();
  msgQueue.push(...msgs);
  scene = msgQueue.length ? 'msg' : 'camp';
}

function updateBattle(dt) {
  B.t += dt;
  if (B.banner) { B.banner.t += dt; if (B.banner.t > B.banner.dur) B.banner = null; }
  if (B.tip) { B.tip.t -= dt; if (B.tip.t <= 0) B.tip = null; }
  if (B.hitstop > 0) { B.hitstop -= dt; return; }
  B.shake = Math.max(0, B.shake - dt * 30); B.quake = Math.max(0, B.quake - dt * 22); B.barShake = Math.max(0, B.barShake - dt);
  if (B.crackFx) { B.crackFx.t -= dt; if (B.crackFx.t <= 0) B.crackFx = null; }
  // movement / anim decay
  const shf = B.boss ? B.boss.exp * .25 : 0;
  for (const u of B.units) {
    u.ox += (0 - u.ox) * Math.min(1, dt * 8); u.lt = Math.max(0, u.lt - dt); u.hurt = Math.max(0, u.hurt - dt); u.x = u.bx - shf;
    if (u.dash) { u.dash.t += dt; if (u.dash.t >= u.dash.dur) u.dash = null; }
    u.hop = Math.max(0, u.hop - dt); u.cast = Math.max(0, u.cast - dt); u.kb += (0 - u.kb) * Math.min(1, dt * 12);
  }
  for (const f of B.foes) {
    f.ox += (0 - f.ox) * Math.min(1, dt * 7); f.kx += (0 - f.kx) * Math.min(1, dt * 14); f.flash -= dt; f.lt = Math.max(0, f.lt - dt);
    if (f.anim) { f.anim.t += dt; if (f.anim.t >= f.anim.dur) f.anim = null; }
  }
  if (B.boss && B.boss.f && !B.boss.f.dead) B.boss.f.x = BOSS_POS[0] + shf * .4;
  B.impact = Math.max(0, B.impact - dt); if (B.zoom) { B.zoom.t += dt; if (B.zoom.t >= B.zoom.dur) B.zoom = null; }
  for (const e of B.eproj) e.t += dt; B.eproj = B.eproj.filter(e => e.t < e.dur);
  for (const p of B.parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  B.parts = B.parts.filter(p => p.t < p.life);
  for (const n of B.nums) n.t += dt; B.nums = B.nums.filter(n => n.t < .9);
  for (const e of B.fx) e.t += dt; B.fx = B.fx.filter(e => e.t < e.dur);
  for (const p of B.proj) {
    p.t += dt; p.tr.unshift([p.x, p.y]); if (p.tr.length > 5) p.tr.pop(); const [tx, ty] = foeCenter(p.f), dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    if (d < 8 || p.t > 1) { p.done = true; p.cb(); continue; }
    p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt;
    if (p.kind !== 'arrow' && Math.random() < .6) B.parts.push({ x: p.x, y: p.y, vx: rnd(-10, 10), vy: rnd(-10, 10), t: 0, life: .25, col: p.kind === 'fire' ? '#ff9a3a' : p.kind === 'ice' ? '#9fe6f4' : '#9a8cff', s: 1, g: 0 });
  }
  if (B.proj) B.proj = B.proj.filter(p => !p.done);
  if (B.flash) { B.flash.t -= dt; if (B.flash.t <= 0) B.flash = null; }
  if (B.label) { B.label.t -= dt; if (B.label.t <= 0) B.label = null; }
  if (B.paused) return;
  updateBoss(dt);
  if (B.state === 'intro') { B.st -= dt; if (B.st <= 0) B.state = 'fight'; }
  if (B.state === 'clear') {
    B.st -= dt;
    if (B.st <= 0) { if (B.wave < 2) { B.wave++; spawnWave(B.wave); if (!B.boss) { B.state = 'fight'; banner('Wave ' + (B.wave + 1) + '/3', COL.white, .9); } } else winLevel(); }
    return;
  }
  if (B.state === 'lose' || B.state === 'win') { if (B.st > 0) B.st -= dt; return; }
  // timing marker (keeps moving during intro)
  B.mk += B.md * markerSpeed() * dt;
  if (B.mk > 1) { B.mk = 2 - B.mk; B.md = -1; } if (B.mk < 0) { B.mk = -B.mk; B.md = 1; }
  if (B.state !== 'fight') return;
  B.cd = Math.max(0, B.cd - dt); B.slowT = Math.max(0, B.slowT - dt);
  for (const k in B.buff) B.buff[k] = Math.max(0, B.buff[k] - dt);
  if (!activeUnit()) { const nx = B.units.find(u => !u.dead); if (nx) save.active = nx.id; }
  // party
  for (const u of B.units) {
    if (u.dead) continue;
    if (u.s.regen) u.hp = Math.min(u.max, u.hp + u.max * u.s.regen * dt);
    if (B.buff.heal > 0) u.hp = Math.min(u.max, u.hp + u.max * .1 * dt);
    if (u.id === save.active) continue;
    u.atkT -= dt * (B.buff.spd > 0 ? 1.5 : 1);
    if (u.atkT <= 0 && liveFoes().length) { u.atkT = u.s.cd * TUNE.autoCdMul * rnd(.9, 1.1); attack(u, Math.random() < .1 ? 'perfect' : 'good', false); }
  }
  // foes
  for (const f of B.foes) {
    if (f.dead) {
      if (f.reviveT > 0) { f.reviveT -= dt; if (f.reviveT <= 0) { f.dead = false; f.revived = true; f.hp = Math.round(f.max * .35); f.ox = 0; num(...foeCenter(f), 'rises', COL.dim); for (let i = 0; i < 10; i++) spark(...foeCenter(f), PAL.u, 80); } }
      continue;
    }
    if (f.burnT > 0) {
      f.burnT -= dt; f.burnAcc += f.burnDps * dt;
      if (Math.random() < .3) { const [cx, cy] = foeCenter(f); B.parts.push({ x: cx + rnd(-8, 8), y: cy + rnd(-4, 8), vx: 0, vy: -30, t: 0, life: .4, col: Math.random() < .5 ? '#ff9a3a' : '#ffe08a', s: 1, g: -20 }); }
      if (f.burnAcc >= 1 && !f.inv) { const d = Math.floor(f.burnAcc); f.burnAcc -= d; f.hp -= d; bossPhaseCheck(f); if (f.hp <= 0) { killFoe(f); continue; } }
    }
    if (f.pend && !f.inv) { f.pend.t -= dt; if (f.pend.t <= 0) foeHit(f); if (B.state !== 'fight') return; }
    if (f.inv) continue;
    if (f.freeze > 0) { f.freeze -= dt; continue; }
    const bp = B.boss && B.boss.f === f ? bossPat() || {} : {};
    const slow = Math.min(.5, B.units.reduce((a, u) => u.dead ? a : Math.max(a, u.s.slow || 0), 0)), rate = (f.chill > 0 ? .6 : 1) * (1 - slow); f.chill -= dt;
    if (f.wind > 0) { f.wind -= dt * rate; if (f.wind <= 0) { f.wind = 0; foeAttack(f); f.timer = f.per * (bp.per || 1) * rnd(.85, 1.15); } }
    else { f.timer -= dt * rate; if (f.timer <= 0) { f.wind = f.windMax = f.T.wind * (bp.wind || 1); SFX.wind(); } }
    if (B.state !== 'fight') return;
  }
  if (!liveFoes().length && !B.foes.some(f => f.reviveT > 0) && !B.proj.length && B.state === 'fight' && (!B.boss || B.boss.st === 'done')) {
    B.state = 'clear'; B.st = 1.1; if (B.wave < 2) banner('Wave clear', COL.green, .9);
  }
}
// ================= boss fights =================
// Act bosses break the arena: the border shatters, the square tears open wider each phase to reveal the act's
// own world, and the boss is a large hand-built pixel figure (painted procedurally at the party's pixel size,
// lit from the upper left) that visibly transforms every phase.
const BOSS = {
  gobchief: { phases: 2, crack: '#ffb04a', lines: ['', 'The Chief rages!'], tr: ['', 'burst'],
    pats: [{}, { per: .7, wind: .8, zone: .8, spd: 1.15, dbl: 1 }] },
  treant: { phases: 3, crack: '#9cff6a', lines: ['', 'Roots tear the ground', 'The forest burns'], tr: ['', 'burst', 'wipe'],
    pats: [{}, { per: .85, zone: .85, spd: 1.1, drift: .12 }, { per: .7, wind: .75, zone: .72, spd: 1.2, drift: .22, slam: 2 }] },
  darkknight: { phases: 3, crack: '#ff4a5a', lines: ['', 'The helm splits', 'Black wings'], tr: ['', 'burst', 'spread'],
    pats: [{}, { per: .8, zone: .8, spd: 1.15, dbl: 1 }, { per: .65, wind: .7, zone: .68, spd: 1.3, blink: 1, dbl: 1 }] },
  mirror: { phases: 4, crack: '#e8e0ff', lines: ['', 'Reality inverts', 'Your reflection steps out', 'Break the reflection'], tr: ['', 'burst', 'reasm', 'reasm'],
    pats: [{}, { per: .85, zone: .85, spd: 1.1, invert: 1 }, { per: .75, zone: .75, spd: 1.2, drift: .18, rev: 1 },
      { per: .6, wind: .7, zone: .65, spd: 1.35, drift: .25, blink: 1, dbl: 1, invert: 1 }] },
};
const BOSS_POS = [252, 248];
const BW = 96, BH = 74, BOX = 16, BOY = 10; // boss canvas (boss pixels) and design-space offset
const ease = t => 1 - (1 - t) * (1 - t);
// arm angle through a swing: idle -> raised (windup) -> strike -> back to idle
function swing(a, idle, wind, hit) {
  if (a.at > 0) return a.at < .4 ? wind + (hit - wind) * ease(a.at / .4) : hit + (idle - hit) * ease((a.at - .4) / .6);
  return idle + (wind - idle) * a.wu;
}
const pol = (x, y, ang, len) => [x + Math.cos(ang) * len, y + Math.sin(ang) * len];

// ---------- Goblin Chief: crowned, armoured -> armour torn off, horns, war paint, flaming club ----------
function artGob(P, ph, a) {
  const b = a.br, R = ph >= 1, sk = 'skin';
  // back arm (behind the body)
  P.line(46, 28 - b, 51, 41 - b, 3.4, sk, 2.8); P.ell(52, 43 - b, 3.2, 3.2, sk);
  // legs, feet
  P.line(26, 47, 24, 59, 3.8, sk, 3); P.line(38, 47, 40, 59, 3.8, sk, 3);
  P.ell(21, 61, 5.5, 2.5, 'leather'); P.ell(43, 61, 5.5, 2.5, 'leather');
  P.poly([[20, 44 - b], [44, 44 - b], [42, 55], [36, 52], [32, 57], [28, 52], [22, 55]], R ? 'red' : 'leather');
  // belly + chest
  P.ell(32, 38 - b, 15, 11, sk); P.ell(32, 29 - b, 13, 7, sk);
  if (!R) {
    P.poly([[19, 23 - b], [45, 23 - b], [46, 35 - b], [32, 40 - b], [18, 35 - b]], 'iron');
    P.line(32, 24 - b, 32, 38 - b, .6, 'steel', .6);
    for (const [x, y] of [[21, 26], [43, 26], [22, 33], [42, 33]]) P.px(x, y - b, 'steel', 3);
    P.box(18, 41 - b, 28, 3, 'leather'); P.box(29, 40 - b, 6, 5, 'gold');
    P.ell(46, 23 - b, 6.5, 5, 'iron'); P.poly([[44, 19 - b], [47, 12 - b], [50, 19 - b]], 'steel');
  } else {
    for (const [x0, y0, x1, y1] of [[23, 30, 28, 40], [27, 29, 32, 39], [37, 30, 41, 37]]) P.line(x0, y0 - b, x1, y1 - b, .7, 'red', .7, { flat: 2 });
    P.line(36, 33 - b, 42, 41 - b, .5, 'bone', .5, { flat: 1 }); // scar
    for (let i = 0; i < 5; i++) P.ell(24 + i * 4, 24 - b + (i === 2 ? 1 : 0), 1.3, 1.6, 'bone');
    P.box(18, 41 - b, 28, 3, 'leather'); P.ell(32, 42 - b, 3, 2.5, 'bone'); P.px(31, 42 - b, 'black', 0); P.px(33, 42 - b, 'black', 0);
    P.ell(47, 24 - b, 4, 3, 'iron'); // what's left of the pauldron
  }
  // head
  const hy = 13 - b, eye = R ? 'eyeR' : 'eyeY';
  P.poly([[22, hy - 1], [7, hy - 7], [12, hy - 2], [22, hy + 4]], sk); P.poly([[42, hy - 1], [55, hy - 8], [52, hy - 2], [42, hy + 4]], sk);
  P.ell(32, hy, 11, 9, sk); P.ell(32, hy + 5, 9.5, 5, sk);
  P.box(23, hy - 3, 18, 2, sk, { flat: 1 }); P.ell(29, hy + 1, 2.4, 2, sk, { b: 1 });
  P.ell(26, hy, 2.4, 1.8, eye); P.ell(37, hy, 2.4, 1.8, eye); P.px(25, hy, 'black', 0); P.px(36, hy, 'black', 0);
  P.box(25, hy + 5, 14, 2, 'black', { flat: 0 });
  for (let x = 27; x < 38; x += 3) P.px(x, hy + 5, 'bone', 3);
  P.poly([[25, hy + 8], [26, hy + 2], [28, hy + 8]], 'bone'); P.poly([[36, hy + 8], [38, hy + 2], [39, hy + 8]], 'bone');
  if (!R) {
    P.box(23, hy - 10, 18, 3, 'gold');
    for (const x of [23, 28, 33, 38]) P.poly([[x, hy - 10], [x + 1.5, hy - 15], [x + 3, hy - 10]], 'gold');
    P.ell(32, hy - 9, 1.5, 1.2, 'red');
  } else {
    P.line(25, hy - 6, 16, hy - 16, 2.6, 'bone', .6); P.line(39, hy - 6, 47, hy - 16, 2.6, 'bone', .6); // horns
    P.poly([[26, hy - 8], [38, hy - 11], [39, hy - 8], [27, hy - 5]], 'gold'); P.poly([[34, hy - 10], [36, hy - 15], [38, hy - 10]], 'gold');
    P.line(22, hy + 2, 30, hy + 3, .5, 'red', .5, { flat: 2 }); P.line(34, hy + 3, 42, hy + 2, .5, 'red', .5, { flat: 2 }); // war paint
  }
  // weapon arm + club (in front)
  const sa = swing(a, 2.2, -2.3, 2.8), [hx, hy2] = pol(18, 27 - b, sa, 12);
  const ca = swing(a, -2.0, -.5, 2.5), [ex, ey] = pol(hx, hy2, ca, R ? 20 : 18);
  P.ell(18, 25 - b, R ? 6 : 7, R ? 5 : 5.5, R ? sk : 'iron'); if (!R) P.poly([[14, 21 - b], [16, 14 - b], [19, 21 - b]], 'steel');
  P.line(18, 27 - b, hx, hy2, 3.4, sk, 2.8);
  P.line(hx, hy2, ex, ey, 1.2, 'wood', 2.2);
  const hr = R ? 5.5 : 4.5;
  P.ell(ex, ey, hr, hr, R ? 'iron' : 'wood');
  for (let k = 0; k < 7; k++) { const an = ca - 1.6 + k * .55, [sx, sy] = pol(ex, ey, an, hr - .5), [tx, ty] = pol(ex, ey, an, hr + (R ? 4 : 3)); P.line(sx, sy, tx, ty, 1, 'steel', .3); }
  if (!R) { const [bx, by] = pol(hx, hy2, ca, 13); P.line(bx - 2, by, bx + 2, by, .8, 'iron', .8); }
  else {
    for (let k = 0; k < 3; k++) { const an = ca + (k - 1) * .9, [sx, sy] = pol(ex, ey, an, 1), [tx, ty] = pol(ex, ey, an, hr - 1); P.line(sx, sy, tx, ty, .5, 'ember', .5); }
    for (let k = 0; k < 4; k++) { const fx = ex - 4 + k * 3, h = 4 + ((k + a.fl) % 3) * 2; P.poly([[fx - 2, ey - hr + 2], [fx, ey - hr - h], [fx + 2, ey - hr + 2]], 'fire'); }
  }
  P.ell(hx, hy2, 3.2, 3.2, sk);
}
// ---------- Treant: leafy giant -> thorn-root arms + glowing fungus -> catches fire ----------
function artTreant(P, ph, a) {
  const b = a.br, burn = ph >= 2, bark = burn ? 'black' : 'bark', eye = ph === 0 ? 'eyeY' : ph === 1 ? 'eyeG' : 'fire';
  if (ph >= 1) for (const s of [-1, 1]) { // thorn root-arms rising out of the ground
    const bx = s < 0 ? 0 : 64, sway = [0, 1, 0, -1][a.fl] * s;
    let px = bx, py = 63;
    for (let i = 1; i <= 7; i++) {
      const nx = bx - s * Math.sin(i * .45) * 7 + sway * (i > 3 ? 1 : 0), ny = 63 - i * 4.4, r = 3 - i * .32;
      P.line(px, py, nx, ny, r + .3, bark, r);
      if (i % 2) { const [tx, ty] = [nx + s * (r + 2), ny - 1]; P.line(nx, ny, tx, ty, .9, 'bone', .3); }
      px = nx; py = ny;
    }
    if (burn) P.ell(px, py - 1, 2, 2.5, 'fire');
  }
  for (const [x1, y1, x2, y2] of [[22, 52, 6, 62], [27, 55, 16, 63], [37, 55, 47, 63], [42, 52, 58, 62], [32, 56, 32, 63]]) P.line(x1, y1, x2, y2, 3.2, bark, 1.4);
  // back branch arm
  P.line(46, 28 - b, 57, 39 - b, 3, bark, 2); P.line(57, 39 - b, 60, 33 - b, 1.6, bark, .8); P.line(57, 39 - b, 62, 42 - b, 1.4, bark, .6);
  // trunk
  P.poly([[18, 23 - b], [46, 23 - b], [51, 56], [13, 56]], bark);
  for (let x = 20, i = 0; x < 46; x += 5, i++) P.line(x, 26 - b, x + (i & 1 ? 1.5 : -1.5), 54, .5, bark, .5, { flat: 0 });
  P.ell(41, 46, 2.5, 2, bark, { flat: 0 }); P.ell(21, 50, 2, 1.6, bark, { flat: 0 });
  if (burn) for (const pts of [[[20, 30], [23, 36], [21, 42], [24, 49]], [[44, 28], [41, 35], [44, 41]], [[33, 48], [30, 53]]]) for (let i = 0; i + 1 < pts.length; i++) P.line(pts[i][0], pts[i][1] - b, pts[i + 1][0], pts[i + 1][1] - b, .6, 'ember', .6);
  if (ph === 1) for (const [x, y] of [[20, 45], [22, 47], [44, 37], [45, 39], [40, 51], [26, 24]]) P.ell(x, y - b, 1.3, 1, 'eyeG');
  if (!burn) { P.ell(20, 24 - b, 5.5, 2.6, 'moss'); P.ell(44, 24 - b, 5.5, 2.6, 'moss'); }
  // face
  P.line(20, 28 - b, 30, 31 - b, 1.3, bark); P.line(44, 28 - b, 34, 31 - b, 1.3, bark);
  P.ell(26, 34 - b, 3.6, 3, 'black', { flat: 0 }); P.ell(38, 34 - b, 3.6, 3, 'black', { flat: 0 });
  P.ell(26, 34 - b, 1.6, 1.4, eye); P.ell(38, 34 - b, 1.6, 1.4, eye);
  P.poly([[23, 41 - b], [41, 41 - b], [38, 48 - b], [32, 45 - b], [26, 48 - b]], 'black', { flat: 0 });
  if (burn) P.ell(32, 43 - b, 4, 1.6, 'fire');
  for (const x of [26, 30, 34, 38]) P.px(x, 41 - b, bark, 2);
  // canopy
  if (ph === 0) {
    for (const [x, y, rx, ry] of [[32, 9, 17, 9], [17, 15, 9, 7], [47, 15, 9, 7], [24, 4, 9, 6], [41, 4, 9, 6], [32, 19, 13, 4]]) P.ell(x, y - b, rx, ry, 'leaf');
    for (const [x, y] of [[22, 2], [30, 0], [38, 3], [14, 12], [44, 9], [27, 9]]) P.ell(x, y - b, 1.5, 1, 'moss', { flat: 3 });
  } else {
    P.line(22, 20 - b, 8, 2 - b, 1.6, bark, .6); P.line(42, 20 - b, 57, 1 - b, 1.6, bark, .6); P.line(32, 20 - b, 33, -6 - b, 1.8, bark, .6); P.line(28, 12 - b, 20, -2 - b, 1, bark, .4);
    if (!burn) { for (const [x, y, rx, ry] of [[30, 10, 11, 6], [45, 13, 6, 4], [16, 12, 5, 4]]) P.ell(x, y - b, rx, ry, 'leaf'); P.ell(31, 8 - b, 2, 1, 'eyeG'); }
    else for (let i = 0; i < 8; i++) {
      const x = 9 + i * 6.5, h = 9 + ((i * 7 + a.fl * 3) % 5) * 2.2, y0 = 20 - b - (i % 3 === 1 ? 4 : 0);
      P.poly([[x - 4, y0], [x + ((i + a.fl) % 2 ? 1 : -1), y0 - h], [x + 4, y0]], 'fire');
      P.poly([[x - 2, y0], [x, y0 - h * .55], [x + 2, y0]], 'eyeY', { flat: 2 });
    }
  }
  // front arm (slams)
  const sa = swing(a, 2.25, -2.4, 2.75), [ex, ey] = pol(18, 28 - b, sa, 13), fa = sa + (a.at > 0 && a.at < .6 ? .1 : .5), [hx, hy] = pol(ex, ey, fa, 10);
  P.line(18, 28 - b, ex, ey, 3.4, bark, 2.8); P.line(ex, ey, hx, hy, 2.8, bark, 2);
  for (let k = -1; k <= 1; k++) { const [tx, ty] = pol(hx, hy, fa + k * .55, 5); P.line(hx, hy, tx, ty, 1.2, bark, .5); }
  if (!burn) P.ell(ex, ey - 2, 3, 1.8, 'moss'); else P.ell(ex, ey - 2, 2, 2.5, 'fire');
}
// ---------- Dark Knight: full plate -> helm cracks (glowing eye), broken pauldron -> horns, black wings, black-flame sword ----------
function artKnight(P, ph, a) {
  const b = a.br, cr = ph >= 1, W = ph >= 2;
  if (W) { // wings behind everything
    const s = a.sp;
    for (const d of [-1, 1]) {
      const rx = 32 + d * 6, ry = 18 - b, tip = (dx, dy) => [rx + d * dx * s, ry + dy * s];
      const t1 = tip(30, -22), t2 = tip(38, -2), t3 = tip(30, 16), t4 = tip(18, 26);
      P.poly([[rx, ry], t1, [rx + d * 26 * s, ry - 8 * s], t2, [rx + d * 28 * s, ry + 8 * s], t3, [rx + d * 16 * s, ry + 18 * s], t4, [rx + d * 4, ry + 16]], 'black');
      for (const t of [t1, t2, t3, t4]) P.line(rx, ry, t[0], t[1], 1.2, 'dark', .5);
      P.ell(t1[0], t1[1], 1.2, 1.2, 'bone');
    }
  } else { // cape
    const tear = cr ? [[50, 60], [46, 56], [43, 61], [38, 57], [33, 62], [28, 56], [22, 61], [18, 57], [14, 60]] : [[50, 61], [14, 61]];
    P.poly([[20, 19 - b], [44, 19 - b], ...tear], 'cloth');
  }
  // legs
  P.box(22, 44, 8, 13, 'iron', { cyl: 1 }); P.box(34, 44, 8, 13, 'iron', { cyl: 1 });
  P.ell(26, 48, 4, 3, 'steel'); P.ell(38, 48, 4, 3, 'steel');
  P.poly([[16, 63], [30, 63], [30, 57], [21, 57]], 'iron'); P.poly([[33, 63], [46, 63], [44, 57], [34, 57]], 'iron');
  // tassets + cuirass
  P.poly([[19, 39 - b], [45, 39 - b], [47, 47 - b], [17, 47 - b]], 'iron'); P.line(32, 40 - b, 32, 46 - b, .5, 'dark', .5, { flat: 0 });
  P.poly([[19, 19 - b], [45, 19 - b], [43, 40 - b], [21, 40 - b]], 'iron');
  P.line(32, 20 - b, 32, 38 - b, .6, 'steel', .6); P.box(20, 38 - b, 24, 2, 'leather'); P.box(30, 37 - b, 4, 4, 'gold');
  if (!cr) P.ell(32, 27 - b, 2.6, 2.6, 'red');
  else {
    const core = W ? 'dflame' : 'eyeR';
    P.ell(32, 27 - b, W ? 4 : 2.6, W ? 4 : 2.6, core);
    for (const pts of [[[32, 27], [27, 23], [24, 25]], [[32, 27], [36, 33], [40, 32]], [[32, 27], [29, 34], [30, 38]]]) for (let i = 0; i + 1 < pts.length; i++) P.line(pts[i][0], pts[i][1] - b, pts[i + 1][0], pts[i + 1][1] - b, .55, core, .55);
  }
  // back pauldron
  P.ell(46, 20 - b, 7, 5, 'iron'); if (W) P.poly([[44, 16 - b], [48, 8 - b], [50, 16 - b]], 'dark');
  // helm
  P.ell(32, 8 - b, 8.5, 8, 'iron'); P.box(24, 7 - b, 17, 11, 'iron');
  P.box(25, 10 - b, 14, 1, 'black', { flat: 0 }); for (let x = 27; x < 38; x += 2) P.px(x, 14 - b, 'black', 0);
  if (!cr) { P.line(32, 1 - b, 40, -5 - b, 1.8, 'red', 1.2); P.line(38, -4 - b, 47, -1 - b, 1.4, 'red', .5); P.ell(25, 10 - b, 1, 1, 'eyeR'); }
  else {
    P.poly([[24, 6 - b], [31, 9 - b], [29, 16 - b], [24, 16 - b]], 'black', { flat: 0 }); // broken face plate
    P.line(31, 0 - b, 33, 8 - b, .5, 'black', .5, { flat: 0 }); P.line(33, 8 - b, 30, 13 - b, .5, 'black', .5, { flat: 0 });
    P.ell(27, 11 - b, 1.6, 1.3, W ? 'dflame' : 'eyeR'); if (W) P.ell(36, 10 - b, 1.2, .9, 'dflame');
    if (W) { P.line(26, 3 - b, 17, -7 - b, 2.2, 'bone', .5); P.line(38, 3 - b, 46, -7 - b, 2.2, 'bone', .5); for (let i = 0; i < 3; i++) P.poly([[28 + i * 3, 0 - b], [29.5 + i * 3, -5 - b - ((i + a.fl) % 2) * 2], [31 + i * 3, 0 - b]], 'dflame'); }
    else P.line(32, 0 - b, 34, -2 - b, 1, 'dark', .6); // burnt plume stub
  }
  // sword arm
  const sa = swing(a, 1.95, -2.0, 2.9), [hx, hy] = pol(18, 22 - b, sa, 12), wa = swing(a, 1.75, -.45, 2.35);
  if (!cr) { P.ell(18, 20 - b, 7, 5, 'iron'); P.poly([[13, 17 - b], [16, 12 - b], [19, 17 - b]], 'steel'); }
  else { P.ell(18, 21 - b, 4.5, 3.6, 'dark'); P.poly([[14, 19 - b], [20, 16 - b], [19, 21 - b]], 'iron'); }
  P.line(18, 22 - b, hx, hy, 3, 'iron', 2.6);
  const [tx, ty] = pol(hx, hy, wa, 32), [px, py] = pol(hx, hy, wa, -4);
  P.line(hx, hy, tx, ty, 2, W ? 'dflame' : 'steel', 1);
  if (W) for (let k = 0; k < 4; k++) { const [fx, fy] = pol(hx, hy, wa, 8 + k * 6); P.ell(fx + ((k + a.fl) % 2), fy - 2, 1.3, 2, 'dflame'); }
  else P.line(hx, hy, tx, ty, .5, 'steel', .5, { flat: 3 });
  const [g1x, g1y] = pol(hx, hy, wa + Math.PI / 2, 4), [g2x, g2y] = pol(hx, hy, wa - Math.PI / 2, 4), [gx, gy] = pol(hx, hy, wa, 2);
  P.line(g1x + (gx - hx), g1y + (gy - hy), g2x + (gx - hx), g2y + (gy - hy), 1, 'gold', 1);
  P.line(hx, hy, px, py, 1, 'leather', 1); P.ell(px, py, 1.5, 1.5, 'gold');
  P.ell(hx, hy, 2.8, 2.8, 'iron');
}
// ---------- Mirror: ornate mirror -> cracked + inverted -> your reflection steps out -> distorted many-armed copy ----------
function artMirror(P, ph, a) {
  const b = a.br;
  const copy = (big, D) => { // the dark reflection of the warrior
    const k = big ? 1 : .55, cx = 32, by = big ? 62 : 52, Y = v => by - v * k, X = v => cx + v * k;
    if (D) for (const d of [-1, 1]) { const s = a.sp; P.poly([[X(d * 6), Y(40)], [X(d * (16 + 14 * s)), Y(60 + 6 * s)], [X(d * (14 + 18 * s)), Y(44)], [X(d * (20 + 14 * s)), Y(36)], [X(d * 10), Y(30)]], 'glass'); }
    P.box(Math.round(X(-9)), Math.round(Y(16)), Math.round(7 * k), Math.round(16 * k), 'black'); P.box(Math.round(X(3)), Math.round(Y(16)), Math.round(7 * k), Math.round(16 * k), 'black');
    P.poly([[X(-14), Y(38)], [X(14), Y(38)], [X(12), Y(15)], [X(-12), Y(15)]], 'black');
    P.ell(X(0), Y(47), 11 * k, 10 * k, 'black'); P.box(Math.round(X(-10)), Math.round(Y(48)), Math.round(20 * k), Math.round(9 * k), 'black');
    const ey = Y(47), eye = D ? 'void' : ph >= 1 ? 'eyeR' : 'white';
    P.box(Math.round(X(-6)), Math.round(ey), Math.max(1, Math.round(3 * k)), Math.max(1, Math.round(3 * k)), eye, { flat: 3 });
    P.box(Math.round(X(3)), Math.round(ey), Math.max(1, Math.round(3 * k)), Math.max(1, Math.round(3 * k)), eye, { flat: 3 });
    if (D) P.box(Math.round(X(-1)), Math.round(Y(53)), 2, 3, 'void', { flat: 3 });
    for (const [x, y] of [[-8, 30], [6, 24], [-2, 20], [9, 34]]) P.px(X(x), Y(y), D ? 'void' : 'glass', 3);
    if (D) for (let i = 0; i < 5; i++) P.poly([[X(-10 + i * 5), Y(56)], [X(-8 + i * 5), Y(64 + (i % 2) * 5)], [X(-6 + i * 5), Y(56)]], 'glass');
    return { X, Y, k };
  };
  if (ph <= 1) {
    P.poly([[14, 63], [50, 63], [45, 55], [19, 55]], 'gold'); P.ell(14, 61, 3.5, 2.5, 'gold'); P.ell(50, 61, 3.5, 2.5, 'gold');
    P.box(11, 12, 42, 45, 'gold'); P.ell(32, 13, 21, 12, 'gold');
    P.box(15, 14, 34, 41, 'glass', { flat: ph ? 0 : 1 }); P.ell(32, 14, 17, 9, 'glass', { flat: ph ? 0 : 1 });
    const r = copy(false, false), sw = swing(a, -1.2, -2.2, -.2), [hx, hy] = pol(r.X(11), r.Y(32), sw, 2), [tx, ty] = pol(hx, hy, sw, 14);
    P.line(r.X(10), r.Y(36), hx, hy, 1.4, 'black', 1.2); P.line(hx, hy, tx, ty, .8, ph ? 'eyeR' : 'white', .5, { flat: 3 });
    if (!ph) { P.line(18, 44, 28, 18, .5, 'shine', .5, { flat: 2 }); P.line(22, 52, 36, 16, .5, 'shine', .5, { flat: 1 }); }
    else for (const [x1, y1] of [[18, 16], [47, 20], [16, 44], [46, 50], [30, 54], [40, 12], [20, 30]]) P.line(37, 27, x1, y1, .5, 'shine', .5, { flat: 3 });
    P.ell(32, 2, 3.5, 3.5, ph ? 'void' : 'red'); P.ell(11, 32, 2.2, 2.2, ph ? 'void' : 'purple'); P.ell(53, 32, 2.2, 2.2, ph ? 'void' : 'purple');
    for (const [x, y] of [[16, 8], [48, 8]]) { P.ell(x, y, 3, 2, 'gold'); P.px(x, y, 'gold', 3); }
    return;
  }
  const D = ph >= 3;
  // broken frame left behind
  P.box(4, 16, 5, 40, 'gold'); P.poly([[4, 16], [12, 6], [20, 3], [22, 6], [9, 16]], 'gold'); P.box(55, 30, 5, 26, 'gold');
  P.poly([[9, 18], [14, 22], [9, 30]], 'glass'); P.poly([[55, 32], [51, 36], [55, 44]], 'glass'); P.poly([[2, 56], [62, 56], [58, 63], [6, 63]], 'gold');
  const r = copy(true, D);
  // cape of inverted light
  P.poly([[r.X(-12), r.Y(38)], [r.X(-22), r.Y(6)], [r.X(-14), r.Y(2)], [r.X(-6), r.Y(30)]], 'white');
  const arms = D ? [[-12, 34, 0], [-12, 26, .9], [12, 30, 2.6]] : [[-12, 34, 0]];
  for (const [ax, ay, off] of arms) {
    const sw = swing(a, 2.0, -2.0, 2.8) + off * (off > 2 ? -1 : 1) * .4, [hx, hy] = pol(r.X(ax), r.Y(ay), sw + (off > 2 ? Math.PI - 2 * sw + 2.6 : 0), 11);
    const wa = swing(a, 1.8, -.5, 2.35) + off * .35, [tx, ty] = pol(hx, hy, wa, D ? 26 : 30);
    P.line(r.X(ax), r.Y(ay), hx, hy, 2.6, 'black', 2.2);
    P.line(hx, hy, tx, ty, 2, 'glass', .8); P.line(hx, hy, tx, ty, .5, 'shine', .5, { flat: 3 });
    const [gx, gy] = pol(hx, hy, wa + Math.PI / 2, 3.5), [gx2, gy2] = pol(hx, hy, wa - Math.PI / 2, 3.5); P.line(gx, gy, gx2, gy2, .9, D ? 'void' : 'white', .9);
    P.ell(hx, hy, 2.4, 2.4, 'black');
  }
  if (D) for (const [x, y] of [[-10, 28], [6, 22], [11, 36], [-4, 40]]) P.line(r.X(x), r.Y(y), r.X(x + 4), r.Y(y - 5), .5, 'void', .5);
}
const BOSSART = { gobchief: artGob, treant: artTreant, darkknight: artKnight, mirror: artMirror };
const bfCache = new Map();
function bossFrame(k, ph, a) {
  const key = k + ph + '|' + a.br + a.wu + a.at + a.fl + a.sp; let c = bfCache.get(key); if (c) return c;
  const P = new Pix(BW, BH, BOX, BOY);
  BOSSART[k](P, ph, { br: a.br, wu: a.wu / 4, at: a.at / 6, fl: a.fl, sp: a.sp / 6 });
  c = P.bake(); if (bfCache.size > 600) bfCache.clear(); bfCache.set(key, c); return c;
}
const bossPat = () => B && B.boss && B.boss.st !== 'outro' && B.boss.st !== 'done' ? BOSS[B.boss.k].pats[B.boss.phase] : null;
function bossFlash(col, dur = .35) { if (B.boss) B.boss.flash = { col, t: 0, dur }; }
function quake(a) { B.quake = Math.max(B.quake || 0, a); }
function addCracks(n, born) {
  const bo = B.boss;
  for (let i = 0; i < n; i++) {
    const e = Math.floor(Math.random() * 4);
    let x = e === 0 ? rnd(LW) : e === 1 ? LW : e === 2 ? rnd(LW) : 0, y = e === 0 ? 0 : e === 1 ? rnd(LH) : e === 2 ? LH : rnd(LH);
    let a = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][e] + rnd(-.7, .7);
    mkCrack(x, y, a, 7 + Math.floor(rnd(9)), born + rnd(.25), 0);
  }
  function mkCrack(x, y, a, segs, b, depth) {
    const px = [], base = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    for (let s = 0; s < segs; s++) {
      const len = rnd(5, 13), nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
      const steps = Math.ceil(Math.max(Math.abs(nx - x), Math.abs(ny - y)));
      for (let k = 1; k <= steps; k++) px.push([Math.round(x + (nx - x) * k / steps), Math.round(y + (ny - y) * k / steps)]);
      x = nx; y = ny; a += rnd(-.65, .65);
      if (depth < 2 && Math.random() < .14) mkCrack(x, y, a + (Math.random() < .5 ? -1 : 1) * rnd(.5, 1.1), Math.max(3, segs - s - 2), b + px.length / 180, depth + 1);
    }
    bo.cracks.push({ px, born: b, w: depth === 0 ? 1 : 0 });
  }
}
function borderShards(outward) {
  // chunks of the arena frame: fly out (shatter) or fly back in (reform)
  const per = [];
  for (let x = 0; x < LW; x += 5) { per.push([x, 0, 0, -1]); per.push([x, AH - 1, 0, 1]); }
  for (let y = 0; y < AH; y += 5) { per.push([0, y, -1, 0]); per.push([LW - 1, y, 1, 0]); }
  for (const [x, y, nx, ny] of per) {
    const a = Math.atan2(ny, nx) + rnd(-.8, .8), v = rnd(60, 220), s = Math.random() < .5 ? 2 : 3, col = pick(['#56506a', '#3a3444', '#d8b04a', '#8a8aa0', B.boss.D.crack]);
    if (outward) B.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rnd(.8, 1.6), col, s, g: 90 });
    else { const life = rnd(.55, .9), d = v * life * .8; B.parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * d / life, vy: -Math.sin(a) * d / life, t: 0, life, col, s, g: 0 }); }
  }
}
function bossStart(f) {
  const D = BOSS[f.k]; if (!D) return;
  f.spr = 'boss:' + f.k; f.sc = PSC; f.x = BOSS_POS[0]; f.y = BOSS_POS[1]; f.ox = 0; f.drop = 1;
  B.boss = { f, k: f.k, D, phase: 0, st: 'intro', t: 0, cracks: [], integ: 1, bcrack: 0, warp: 0, inv: false, flash: null, ev: {}, exp: 0, expT: 0, jag: jagSeed(f.k), tr: null };
  B.state = 'boss'; B.tip = null; SFX.rumble();
}
// sample the visible pixels of a boss frame into flying particles (transforms, death)
function bossBits(cv, x0, y0, n, sp, life) {
  const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, pts = [];
  for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) { const i = (y * cv.width + x) * 4; if (d[i + 3] > 200) pts.push([x, y, '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')]); }
  for (let k = 0; k < n && pts.length; k++) {
    const [x, y, col] = pts[Math.floor(Math.random() * pts.length)], px = x0 + x * PSC, py = y0 + y * PSC, cx = x0 + cv.width * PSC / 2, cy = y0 + cv.height * PSC * .6;
    const an = Math.atan2(py - cy, px - cx) + rnd(-.4, .4), v = rnd(.3, 1) * sp;
    B.parts.push({ x: px, y: py, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 40, t: 0, life: rnd(.5, 1) * life, col, s: PSC, g: 220 });
  }
}
function bossPose(f) {
  const bo = B.boss, wu = f.wind > 0 && f.windMax ? 1 - f.wind / f.windMax : 0, at = f.anim ? f.anim.t / f.anim.dur : 0;
  let sp = 6; if (bo.st === 'phase' && bo.tr === 'spread') sp = Math.round(clamp((bo.t - .45) / .7, 0, 1) * 6); else if (bo.k === 'darkknight' || bo.k === 'mirror') sp = 5 + (RM ? 0 : Math.floor(B.t * 1.5) % 2);
  return { br: RM ? 0 : Math.sin(B.t * 2.4) > 0 ? 1 : 0, wu: Math.round(wu * 4), at: Math.ceil(at * 6), fl: RM ? 0 : Math.floor(B.t * 8) % 4, sp };
}
function bossPhaseCheck(f) {
  const bo = B.boss; if (!bo || bo.f !== f || bo.st !== 'fight') return;
  const n = bo.D.phases; if (bo.phase >= n - 1) return;
  const th = f.max * (1 - (bo.phase + 1) / n);
  if (f.hp > th) return;
  f.hp = Math.max(1, Math.ceil(th));
  bo.old = bossFrame(bo.k, bo.phase, bossPose(f));
  bo.phase++; bo.st = 'phase'; bo.t = 0; bo.ev = {}; f.wind = 0; f.inv = true; f.dbl = 0; f.pend = null; f.anim = null; bo.tr = bo.D.tr[bo.phase];
  quake(12); bossFlash(bo.D.crack, .45); bo.warp = 1; SFX.roar();
  addCracks(6 + bo.phase * 2, B.t);
  banner(bo.D.lines[bo.phase] || ('Phase ' + (bo.phase + 1)), bo.D.crack, 1.5);
}
function bossKilled(f) {
  const bo = B.boss; if (!bo || bo.f !== f) return false;
  bo.st = 'outro'; bo.t = 0; bo.ev = {}; bo.inv = false; bo.warp = 0; bo.expT = 0;
  quake(14); bossFlash('#ffffff', .5); SFX.bossDie();
  return true;
}
function bossShatter(f) {
  const bo = B.boss; if (!bo) return;
  const cv = bossFrame(bo.k, bo.phase, bossPose(f)), x0 = f.x - BW * PSC / 2 - PSC, y0 = f.y - BH * PSC - PSC;
  bossBits(cv, x0, y0, 260, 260, 1.6);
}
const expFor = (bo, ph) => bo.D.phases < 2 ? 70 : 26 + 98 * ph / (bo.D.phases - 1);
function updateBoss(dt) {
  const bo = B.boss; if (!bo) return;
  bo.t += dt; const t = bo.t, ev = bo.ev, f = bo.f;
  if (bo.flash) { bo.flash.t += dt; if (bo.flash.t > bo.flash.dur) bo.flash = null; }
  bo.warp = Math.max(0, bo.warp - dt * 1.1);
  bo.exp += (bo.expT - bo.exp) * Math.min(1, dt * (bo.st === 'outro' ? 3.2 : 2.2)); if (Math.abs(bo.expT - bo.exp) < .3) bo.exp = bo.expT;
  if (bo.st === 'intro') {
    bo.bcrack = clamp(t / .9, 0, 1); quake(1 + t * 3);
    if (t > .3 && !ev.c1) { ev.c1 = 1; SFX.crack(); } if (t > .6 && !ev.c2) { ev.c2 = 1; SFX.crack(); }
    if (t > .9 && !ev.sh) { ev.sh = 1; bo.integ = .3; borderShards(true); bossFlash('#ffffff', .4); quake(10); addCracks(14, B.t); SFX.shatter(); bo.expT = expFor(bo, 0); }
    if (t > .9) f.drop = Math.max(0, 1 - Math.pow((t - .9) / .75, 2));
    if (t > 1.65 && !ev.land) {
      ev.land = 1; f.drop = 0; quake(9); SFX.land(); banner(FOES[f.k].n, bo.D.crack, 1.4);
      for (let i = 0; i < 30; i++) B.parts.push({ x: f.x + rnd(-90, 90), y: f.y, vx: rnd(-110, 110), vy: rnd(-110, -20), t: 0, life: rnd(.3, .8), col: i % 3 ? pick(ACTPAL[B.act].dust) : bo.D.crack, s: i % 2 ? 2 : 4, g: 260 });
    }
    if (t > 2.5) { bo.st = 'fight'; B.state = 'fight'; }
  } else if (bo.st === 'phase') {
    if (!RM && t < .45 && Math.random() < .6) { const [cx, cy] = foeCenter(f); spark(cx + rnd(-60, 60), cy + rnd(-60, 60), bo.D.crack, 120); }
    if (t > .45 && !ev.morph) {
      ev.morph = 1; SFX.morph(); bossFlash('#ffffff', .25); bo.inv = !!BOSS[bo.k].pats[bo.phase].invert; quake(9);
      const x0 = f.x - BW * PSC / 2 - PSC, y0 = f.y - BH * PSC - PSC;
      if (bo.old) bossBits(bo.old, x0, y0, bo.tr === 'burst' ? 170 : 90, bo.tr === 'burst' ? 300 : 160, 1.2);
      bo.expT = expFor(bo, bo.phase);
      for (let i = 0; i < 26; i++) spark(...foeCenter(f), i % 2 ? bo.D.crack : '#ffffff', 260);
      if (bo.tr === 'reasm') bo.reasm = mkReasm(bossFrame(bo.k, bo.phase, bossPose(f)));
    }
    if (t > 1.3) { bo.st = 'fight'; f.inv = false; f.timer = f.per * .8; bo.old = null; bo.reasm = null; }
  } else if (bo.st === 'outro') {
    if (t > .5 && !ev.back) { ev.back = 1; borderShards(false); SFX.rumble(); }
    if (t > .5) bo.integ = .3 + .7 * clamp((t - .5) / .85, 0, 1);
    if (t > 1.4 && !ev.ref) { ev.ref = 1; bo.integ = 1; bossFlash('#ffffff', .3); SFX.reform(); }
    if (t > 1.9) bo.st = 'done';
  }
  if (bo.st === 'fight' && !f.dead) {
    const pat = bossPat() || {};
    if (pat.drift && B.state === 'fight') B.zc = clamp(B.zBase + Math.sin(B.t * 1.6) * pat.drift, .12, .88);
    if (pat.rev && B.state === 'fight') { B.revT = (B.revT || 1) - dt; if (B.revT <= 0) { B.md *= -1; B.revT = rnd(.7, 1.5); } }
    if (f.dbl > 0) { f.dbl -= dt; if (f.dbl <= 0) { f.dbl = 0; foeAttack(f, true); } }
    if (Math.random() < .6) { const [cx, cy] = foeCenter(f); B.parts.push({ x: cx + rnd(-70, 70), y: cy + rnd(-50, 110), vx: rnd(-8, 8), vy: rnd(-40, -15), t: 0, life: rnd(.4, .9), col: bo.phase ? bo.D.crack : '#3a3444', s: Math.random() < .3 ? 2 : 1, g: -10 }); }
  }
}
function mkReasm(cv) { // pixel list with scattered start positions: the new form flies together
  const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, px = [];
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const i = (y * cv.width + x) * 4; if (d[i + 3] > 0) px.push([x, y, 'rgba(' + d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ',' + (d[i + 3] / 255).toFixed(2) + ')', rnd(-40, 40), rnd(-30, 30), rnd(0, .35)]); }
  return px;
}
// ---------- boss attacks: a unique move per boss and phase ----------
function bossAttackFx(f, targets, slam) {
  const bo = B.boss, ph = bo.phase, fx = f.x - 70, gy = 246;
  const add = e => B.fx.push(Object.assign({ t: 0 }, e));
  const tx = targets.map(u => [u.x, u.y]);
  SFX.whoosh();
  if (bo.k === 'gobchief') {
    add({ type: 'shock', x: fx, y: gy, dur: .45, col: ph ? '#ff7a1a' : '#8a7a5a', to: 20 });
    if (ph) tx.forEach(([x, y], i) => add({ type: 'rock', x0: fx, y0: 120, x, y: y - 10, dur: .16 + i * .03, col: '#ff7a1a' }));
  } else if (bo.k === 'treant') {
    if (ph === 0) add({ type: 'shock', x: fx, y: gy, dur: .45, col: '#62a038', to: 20 });
    else tx.forEach(([x, y]) => add({ type: 'roots', x, y, dur: .55, fire: ph >= 2 }));
    if (ph >= 2) tx.forEach(([x, y], i) => add({ type: 'rock', x0: x + 60, y0: -40, x, y: y - 10, dur: .16 + i * .03, col: '#ffb03a', meteor: 1 }));
  } else if (bo.k === 'darkknight') {
    add({ type: 'arc', x: 90, y: 200, dur: .32, col: ph >= 2 ? '#8a2ad0' : ph ? '#ff4a5a' : '#e4ecf6', r: 90 });
    if (ph >= 2) add({ type: 'wave', x: fx, y: gy, dur: .5, col: '#8a2ad0' });
  } else {
    tx.forEach(([x, y], i) => { for (let k = 0; k < (ph >= 3 ? 4 : 2); k++) add({ type: 'shard', x0: f.x - 40 + rnd(-20, 20), y0: 120 + rnd(-40, 40), x: x + rnd(-6, 6), y: y - 20 + rnd(-8, 8), dur: .16 + k * .02, col: ph ? '#e0b0ff' : '#86ccec' }); });
    if (ph >= 2) add({ type: 'arc', x: 90, y: 200, dur: .3, col: '#e8e0ff', r: 80, flip: 1 });
  }
}
function drawBossFx(e) {
  const p = clamp(e.t / e.dur, 0, 1);
  if (e.type === 'shock') { // ground shockwave rolling toward the party
    const x = e.x + (e.to - e.x) * Math.min(1, p * 2.4), a = p < .6 ? 1 : (1 - p) / .4;
    ctx.globalAlpha = a;
    for (let k = 0; k < 7; k++) { const xx = Math.round(x + k * 9), h = Math.max(2, 18 - k * 3 - Math.round(p * 6)); rect(xx, e.y - h, 6, h, k % 2 ? e.col : lighten(e.col, .35)); rect(xx, e.y - h, 6, 1, '#ffffff'); }
    ctx.globalAlpha = 1;
  } else if (e.type === 'rock') {
    const k = Math.min(1, p * 2.2), x = e.x0 + (e.x - e.x0) * k, y = e.y0 + (e.y - e.y0) * k - Math.sin(k * Math.PI) * (e.meteor ? 0 : 60);
    if (k < 1) { rect(x - 4, y - 4, 8, 8, '#3a2a1a'); rect(x - 4, y - 4, 4, 4, e.col); rect(x - 2, y - 2, 2, 2, '#fff3a8'); for (let i = 1; i < 4; i++) rect(x - (e.x - e.x0) / 30 * i * 3 - 2, y - (e.y - e.y0) / 30 * i * 3 - 2, 4 - i, 4 - i, e.col); }
    else { ctx.globalAlpha = 1 - p; frame(e.x - 10 - p * 10, e.y - 6, 20 + p * 20, 12, e.col); ctx.globalAlpha = 1; }
  } else if (e.type === 'roots') { // thorned roots burst from under the target
    const h = Math.round(Math.sin(Math.min(1, p * 1.6) * Math.PI) * 34);
    for (let k = -1; k <= 1; k++) { const hh = Math.max(0, h - Math.abs(k) * 10), x = e.x + k * 9; rect(x - 2, e.y - hh, 5, hh, '#36261a'); rect(x - 2, e.y - hh, 2, hh, '#5a4028'); rect(x, e.y - hh - 3, 1, 3, e.fire ? '#ff7a1a' : '#cfc6aa'); if (hh > 8) { rect(x + 3, e.y - hh + 6, 2, 1, '#cfc6aa'); rect(x - 4, e.y - hh + 12, 2, 1, '#cfc6aa'); } }
  } else if (e.type === 'arc') { // giant crescent slash across the party
    const N = 40, r = e.r, a0 = e.flip ? -.3 : -2.6;
    for (let k = 0; k <= N; k++) {
      const q = k / N; if (q > p * 1.8 || q < p * 1.8 - .6) continue;
      const an = a0 + q * 2.3 * (e.flip ? 1 : 1), x = e.x + Math.cos(an) * r, y = e.y + Math.sin(an) * r * .55;
      rect(x - 3, y - 3, 6, 6, k % 3 ? e.col : '#ffffff'); rect(x - 1, y + 3, 2, 2, darken(e.col, .3));
    }
  } else if (e.type === 'wave') { // black-flame wave
    const x = e.x + (10 - e.x) * Math.min(1, p * 1.6), a = p < .7 ? 1 : (1 - p) / .3;
    ctx.globalAlpha = a;
    for (let k = 0; k < 10; k++) { const h = 10 + ((k * 7 + Math.floor(B.t * 20)) % 5) * 4; rect(x + k * 5, e.y - h, 4, h, k % 2 ? e.col : '#3c0e52'); rect(x + k * 5 + 1, e.y - h, 2, 2, '#e6a8ff'); }
    ctx.globalAlpha = 1;
  } else if (e.type === 'shard') {
    const k = Math.min(1, p * 2.4), x = e.x0 + (e.x - e.x0) * k, y = e.y0 + (e.y - e.y0) * k;
    if (k < 1) { rect(x - 3, y - 1, 6, 2, e.col); rect(x - 1, y - 3, 2, 6, e.col); rect(x - 1, y - 1, 2, 2, '#ffffff'); rect(x + 4, y, 6, 1, darken(e.col, .3)); }
    else if (p < .7) { ctx.globalAlpha = 1 - p; rect(e.x - 1, e.y - 6, 2, 12, '#ffffff'); rect(e.x - 6, e.y - 1, 12, 2, '#ffffff'); ctx.globalAlpha = 1; }
  }
}
// draw the boss body: transforms, flicker, reassembly, orbiting shards, glitch rows
function drawBossBody(f, x, y) {
  const bo = B.boss, pose = bossPose(f), sc = PSC, X = x - sc, Y = y - sc;
  let cv = bossFrame(bo.k, bo.phase, pose); f._cv = cv;
  const W = cv.width * sc, H = cv.height * sc, flash = f.flash > 0;
  // aura behind (rage / spirit) from phase 1 on
  if (bo.phase > 0 && !RM) { ctx.globalAlpha = .18 + .08 * Math.sin(B.t * 5); const t2 = tinted(cv, bo.D.crack); for (const [a, b] of [[-sc, 0], [sc, 0], [0, -sc], [0, sc]]) ctx.drawImage(t2, X + a * 2, Y + b * 2, W, H); ctx.globalAlpha = 1; }
  if (bo.k === 'mirror' && bo.phase >= 2) drawShardOrbit(f, x, y, true);
  if (bo.st === 'phase') {
    const t = bo.t;
    if (t < .45 && bo.old) { // old form trembles and flickers white
      const j = RM ? 0 : Math.round(rnd(-1, 1)) * sc; ctx.drawImage(Math.floor(t * 20) % 2 ? tinted(bo.old, '#ffffff') : bo.old, X + j, Y, W, H); return;
    }
    const rv = clamp((t - .45) / .75, 0, 1);
    if (bo.tr === 'wipe' && bo.old && rv < 1) { // fire climbs the body from the ground up
      const cut = Math.round(cv.height * (1 - rv));
      ctx.drawImage(bo.old, 0, 0, cv.width, cut, X, Y, W, cut * sc);
      ctx.drawImage(cv, 0, cut, cv.width, cv.height - cut, X, Y + cut * sc, W, (cv.height - cut) * sc);
      for (let i = 0; i < 24; i++) rect(X + Math.floor(rnd(cv.width)) * sc, Y + (cut - 1 - Math.floor(rnd(3))) * sc, sc, sc, pick(['#ff7a1a', '#ffb03a', '#fff3a8']));
      return;
    }
    if (bo.tr === 'reasm' && bo.reasm && rv < 1) {
      for (const [px, py, col, dx, dy, dl] of bo.reasm) { const k = ease(clamp((rv - dl) / (1 - dl), 0, 1)); ctx.fillStyle = col; ctx.fillRect(X + Math.round(px + dx * (1 - k)) * sc, Y + Math.round(py + dy * (1 - k)) * sc, sc, sc); }
      return;
    }
    if (bo.tr === 'burst' && rv < .3) cv = tinted(cv, '#ffffff', 1 - rv / .3);
  }
  if (flash) cv = tinted(cv, '#ffffff');
  else if (f.inv && Math.floor(B.t * 16) % 2) cv = tinted(cv, '#ffffff', .5);
  if (bo.k === 'mirror' && bo.phase >= 3 && !RM) { // glitch: horizontal slices slip sideways
    const sl = 6;
    for (let r = 0; r < cv.height; r += sl) { const off = (Math.floor(B.t * 9 + r) % 7 === 0) ? Math.round(rnd(-3, 3)) * sc : 0; ctx.drawImage(cv, 0, r, cv.width, Math.min(sl, cv.height - r), X + off, Y + r * sc, W, Math.min(sl, cv.height - r) * sc); }
  } else ctx.drawImage(cv, X, Y, W, H);
  if (f.wind > 0 && Math.floor(B.t * 14) % 2) { ctx.globalAlpha = .35; ctx.drawImage(tinted(cv, '#ff3a3a'), X, Y, W, H); ctx.globalAlpha = 1; }
  if (bo.k === 'mirror' && bo.phase >= 2) drawShardOrbit(f, x, y, false);
}
function drawShardOrbit(f, x, y, back) {
  const bo = B.boss, n = bo.phase >= 3 ? 9 : 6, cx = f.x, cy = y + BH * PSC * .45;
  for (let i = 0; i < n; i++) {
    const an = B.t * (RM ? .3 : 1.4) + i * Math.PI * 2 / n, z = Math.sin(an); if ((z < 0) !== back) continue;
    const sx = Math.round((cx + Math.cos(an) * 120) / PSC) * PSC, sy = Math.round((cy + z * 26 - 40) / PSC) * PSC;
    rect(sx, sy - PSC * 2, PSC, PSC * 4, '#86ccec'); rect(sx - PSC, sy - PSC, PSC, PSC * 2, '#3674a0'); rect(sx, sy - PSC * 2, PSC, PSC, '#f0ffff');
  }
}
// ---------- the torn-open arena: each act's world shows through, wider every phase ----------
const ENV_E = 150, envCache = {};
function jagSeed(k) { let s = k.length * 977 + 13; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, a = []; for (let i = 0; i < 400; i++) a.push(R()); return a; }
function envCanvas(act) {
  if (envCache[act]) return envCache[act];
  const E = ENV_E, W = LW + E * 2, H = AH + E * 2, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); let sd = 91 + act * 131; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x + E), Math.round(y + E), Math.round(w), Math.round(h)); };
  const sky = (top, mid, hz) => { for (let y = -E; y < 70; y += 2) { const k = (y + E) / (70 + E); r(-E, y, W, 2, k < .6 ? top : k < .85 ? (((y >> 1) & 1) ? top : mid) : mid); } r(-E, 62, W, 8, hz); };
  const dither = (y0, y1, c0, c1, dens) => { for (let y = y0; y < y1; y++) for (let x = -E; x < LW + E; x++) if (((x * 7 + y * 13) % dens) === 0) r(x, y, 1, 1, ((x + y) & 1) ? c0 : c1); };
  const hills = (col, y0, amp, f, ph) => { for (let x = -E; x < LW + E; x += 2) { const h = Math.round(amp * (Math.sin(x * f + ph) * .6 + Math.sin(x * f * 2.3 + ph * 2) * .4)); r(x, y0 - h, 2, h + 12, col); } };
  if (act === 0) { // goblin war camp
    sky('#0c0810', '#1c0e10', '#2a1410');
    for (let i = 0; i < 40; i++) r(R() * W - E, -E + R() * (E + 30), 1, 1, R() < .3 ? '#8a7a6a' : '#4a3a3a');
    hills('#140c0e', 58, 10, .02, 1); r(-E, 66, W, H, '#1a120c'); dither(66, AH + E, '#22180e', '#140e08', 5);
    for (let x = -E; x < LW + E; x += 7) { if (x > -10 && x < LW + 10) continue; const h = 30 + Math.floor(R() * 8); r(x, 66 - h, 6, h, '#3a2416'); r(x, 66 - h, 2, h, '#5a3a20'); r(x + 1, 66 - h - 3, 4, 3, '#3a2416'); r(x + 2, 66 - h - 5, 2, 2, '#2a180e'); r(x, 66 - h + 10, 6, 2, '#1a0e08'); }
    for (const [tx, ty, col] of [[-118, 150, '#7a1a26'], [-70, 250, '#583216'], [352, 140, '#583216'], [400, 260, '#7a1a26'], [-100, 380, '#583216'], [380, 400, '#7a1a26']]) {
      for (let k = 0; k < 26; k++) { const w = Math.round(k * 1.6); r(tx - w, ty - 26 + k, w * 2 + 1, 1, k % 6 < 3 ? col : darken(col, .35)); }
      r(tx - 4, ty - 10, 9, 10, '#0a0606'); r(tx, ty - 30, 1, 4, '#5a3a20');
    }
    for (const [x, y] of [[-40, 120], [360, 210], [-130, 300], [340, 360]]) { r(x, y - 30, 2, 30, '#8a8270'); r(x - 3, y - 36, 8, 7, '#cfc6aa'); r(x - 1, y - 33, 2, 2, '#0a0606'); r(x + 2, y - 33, 2, 2, '#0a0606'); }
    for (const [x, y] of [[-60, 330], [380, 300]]) { r(x - 8, y, 16, 3, '#3a2416'); r(x - 6, y - 2, 4, 3, '#5a3a20'); r(x + 2, y - 2, 4, 3, '#5a3a20'); }
  } else if (act === 1) { // dark forest
    sky('#040806', '#08120c', '#0e1a12');
    for (let i = 0; i < 26; i++) { const x = -E + R() * W, w = 6 + R() * 10; r(x, -E, w, 70 + E, '#0a140e'); r(x, -E, 2, 70 + E, '#0e1c12'); }
    r(-E, 66, W, H, '#0e140c'); dither(66, AH + E, '#16200e', '#0a0e08', 4);
    for (let i = 0; i < 18; i++) { const x = -E + R() * W; if (x > -20 && x < LW + 6) continue; const w = 14 + R() * 12; r(x, -E, w, 76 + E + R() * 40, '#1a120a'); r(x, -E, 3, 76 + E, '#36261a'); r(x + w - 3, -E, 3, 76 + E, '#100a06'); for (let y = -E; y < 100; y += 9) r(x + 4 + (y % 3), y, 1, 5, '#100a06'); r(x - 8, 100 + R() * 40, w + 16, 6, '#1a120a'); }
    for (let i = 0; i < 22; i++) { let x = -E + R() * W, y = 70 + R() * (AH + E - 70); if (x > -6 && x < LW + 6 && y < AH + 4) continue; for (let k = 0; k < 20; k++) { r(x, y, 4, 3, '#2e2014'); r(x, y, 4, 1, '#4a3420'); x += 3; y += Math.sin(k * .6 + i) * 1.6; } }
    for (let i = 0; i < 26; i++) { const x = -E + R() * W, y = 80 + R() * (AH + E - 90); if (x > -6 && x < LW + 6 && y < AH + 4) continue; const col = R() < .5 ? '#3ad6b0' : '#9cff6a'; r(x, y - 3, 1, 3, '#cfc6aa'); r(x - 2, y - 5, 5, 2, col); r(x - 1, y - 6, 3, 1, lighten(col, .5)); }
  } else if (act === 2) { // ruined castle
    sky('#080a14', '#10121e', '#1a1c2c');
    for (let i = 0; i < 50; i++) r(R() * W - E, -E + R() * (E + 40), 1, 1, R() < .3 ? '#c8ccff' : '#5a5c80');
    g.fillStyle = '#d8dcf0'; for (let y = -26; y <= 26; y++) { const w = Math.round(Math.sqrt(26 * 26 - y * y)); g.fillRect(-90 - w + E, -100 + y + E, w * 2, 1); }
    r(-100, -110, 7, 5, '#b0b4d0'); r(-80, -94, 9, 6, '#b0b4d0'); r(-96, -88, 4, 3, '#b0b4d0');
    for (let x = -E; x < LW + E; x += 16) { if (x > -14 && x < LW) continue; const h = 46 + ((x * 31) % 13); for (let y = 66 - h; y < 66; y += 6) { r(x, y, 16, 6, '#2a2a3a'); r(x + ((y / 6) & 1 ? 8 : 0), y, 1, 6, '#16161e'); r(x, y, 16, 1, '#3a3a4e'); } r(x + 2, 66 - h - 6, 5, 6, '#2a2a3a'); r(x + 10, 66 - h - 6, 5, 6, '#2a2a3a'); }
    for (const tx of [-128, 366]) { for (let y = -E; y < 66; y += 6) { r(tx, y, 28, 6, '#262636'); r(tx, y, 28, 1, '#34344a'); r(tx + ((y / 6) & 1 ? 14 : 4), y, 1, 6, '#14141c'); } r(tx + 10, -40, 8, 12, '#ffb04a'); r(tx + 10, -40, 8, 3, '#ffe070'); r(tx + 10, 10, 8, 12, '#ffb04a'); }
    r(-E, 66, W, H, '#10101a'); for (let y = 70; y < AH + E; y += 12) { r(-E, y, W, 1, '#1a1a28'); for (let x = -E + ((y / 12) & 1) * 10; x < LW + E; x += 20) r(x, y, 1, 12, '#1a1a28'); }
    for (const [x, y] of [[-70, 200], [-120, 330], [360, 220], [410, 360], [-40, 400], [330, 420]]) { r(x, y - 40, 14, 40, '#2a2a3a'); r(x, y - 40, 3, 40, '#3a3a4e'); r(x - 3, y - 44, 20, 5, '#34344a'); r(x + 8, y - 48, 7, 4, '#2a2a3a'); r(x - 8, y - 4, 10, 4, '#22222e'); }
  } else { // shattered mirror dimension
    for (let y = -E; y < AH + E; y++) r(-E, y, W, 1, y < 70 ? '#06030c' : '#0a0612');
    for (let i = 0; i < 90; i++) r(R() * W - E, R() * H - E, 1, 1, R() < .3 ? '#e0b0ff' : '#4a3a6a');
    for (let y = 72; y < AH + E; y += 10) for (let x = -E + ((y / 10) & 1) * 10; x < LW + E; x += 20) { r(x, y, 10, 10, '#140c22'); r(x, y, 10, 1, '#22163a'); }
    for (let i = 0; i < 26; i++) { const x = -E + R() * W, y = -E + R() * H; if (x > -10 && x < LW + 10 && y > -10 && y < AH + 10) continue; const w = 6 + R() * 18, h = 10 + R() * 26; for (let k = 0; k < h; k++) { const ww = Math.round(w * (1 - k / h)); r(x + (w - ww) / 2, y + k, ww, 1, k < 2 ? '#f0ffff' : ((k >> 1) & 1) ? '#3674a0' : '#18385a'); } r(x + w / 2, y, 1, h * .6, '#86ccec'); }
    for (const [x, y, w, h] of [[-120, -100, 40, 56], [350, -80, 34, 48], [-110, 260, 30, 44], [370, 300, 44, 60]]) { g.strokeStyle = '#d8b04a'; r(x, y, w, 2, '#d8b04a'); r(x, y + h - 2, w, 2, '#9a7428'); r(x, y, 2, h, '#d8b04a'); r(x + w - 2, y, 2, h, '#9a7428'); r(x + 4, y + 4, w - 8, h - 8, '#0c1424'); r(x + 6, y + 6, 2, h - 14, '#3674a0'); }
  }
  return (envCache[act] = c);
}
// jagged, axis-aligned outline of the torn opening (crisp at any integer scale)
function tearPath(m) {
  const bo = B.boss, J = bo.jag, amp = Math.min(7, m * .3), L = -Math.round(m), Rr = LW + Math.round(m), T = -Math.round(m * .8), Bt = AH + Math.round(m * .45), S = 8, pts = [], rims = [];
  let i = 0; const j = () => Math.round((J[(i++) % J.length] - .5) * 2 * amp);
  for (let x = L; x < Rr; x += S) { const y = T + j(); pts.push([x, y], [Math.min(Rr, x + S), y]); rims.push([x, y, S, 1]); }
  for (let y = T; y < Bt; y += S) { const x = Rr + j(); pts.push([x, y], [x, Math.min(Bt, y + S)]); rims.push([x - 1, y, 1, S]); }
  for (let x = Rr; x > L; x -= S) { const y = Bt + j(); pts.push([x, y], [Math.max(L, x - S), y]); rims.push([x - S, y - 1, S, 1]); }
  for (let y = Bt; y > T; y -= S) { const x = L + j(); pts.push([x, y], [x, Math.max(T, y - S)]); rims.push([x, y - S, 1, S]); }
  return { pts, rims };
}
function drawBossEnv() {
  const bo = B.boss; if (!bo || bo.exp < .5) return;
  const m = bo.exp, { pts, rims } = tearPath(m), env = envCanvas(B.act), E = ENV_E;
  ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip();
  ctx.drawImage(env, -E, -E);
  drawEnvAnim(B.act, bo.phase);
  if (bo.inv) { ctx.globalAlpha = .1; rect(-E, -E, LW + 2 * E, AH + 2 * E, bo.D.crack); ctx.globalAlpha = 1; }
  ctx.restore();
  // dim the original square so the fight stays readable
  ctx.globalAlpha = .5; rect(0, 0, LW, AH, '#000'); ctx.globalAlpha = 1;
  const pulse = RM ? .8 : .6 + .3 * Math.sin(B.t * 5);
  ctx.globalAlpha = pulse; ctx.fillStyle = bo.D.crack; for (const [x, y, w, h] of rims) ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = pulse * .35; for (const [x, y, w, h] of rims) ctx.fillRect(x - (h > 1 ? 1 : 0), y - (w > 1 ? 1 : 0), w + (h > 1 ? 2 : 0), h + (w > 1 ? 2 : 0));
  ctx.globalAlpha = 1;
}
function drawEnvAnim(act, ph) {
  const t = RM ? 0 : B.t, fl = Math.floor(t * 10);
  const flame = (x, y, s) => { const h = 4 + ((fl + x) % 3); rect(x - s, y - h, s * 2, h, '#f0601a'); rect(x - s + 1, y - h + 1, s * 2 - 2, h - 1, '#ffb03a'); rect(x - 1, y - h - 1 - (fl % 2), 2, 2, '#fff3a8'); ctx.globalAlpha = .12; rect(x - 10, y - 14, 20, 18, '#ffb03a'); ctx.globalAlpha = 1; };
  if (act === 0) {
    for (const [x, y] of [[-30, 36], [-90, 36], [350, 36], [420, 36], [-140, 200], [-20, 330], [345, 330], [-60, 330], [380, 300]]) { if (y === 36) rect(x, y, 2, 30, '#3a2416'); flame(x + 1, y, 2); }
    if (ph >= 1) for (let i = 0; i < 10; i++) { const k = (t * .3 + i * .1) % 1; rect(-80 + i * 50 + Math.sin(t + i) * 6, 300 - k * 360, 1, 1, '#ff7a1a'); }
  } else if (act === 1) {
    for (let i = 0; i < 16; i++) { const x = -120 + ((i * 53) % 560), y = 60 + ((i * 97) % 300) + Math.sin(t * 1.3 + i) * 8, on = Math.sin(t * 3 + i * 1.7) > -.2; if (on) { rect(x + Math.sin(t * .7 + i) * 10, y, 1, 1, '#d8ff7a'); ctx.globalAlpha = .25; rect(x + Math.sin(t * .7 + i) * 10 - 1, y - 1, 3, 3, '#d8ff7a'); ctx.globalAlpha = 1; } }
    if (ph >= 2) { for (const [x, y] of [[-130, 60], [-60, 40], [350, 50], [420, 70], [-100, 250], [380, 230]]) flame(x, y, 3); for (let i = 0; i < 14; i++) { const k = (t * .4 + i * .07) % 1; rect(-140 + i * 45, 380 - k * 480, 1, 1, i % 2 ? '#ff7a1a' : '#ffd060'); } ctx.globalAlpha = .08; rect(-ENV_E, -ENV_E, LW + 2 * ENV_E, AH + 2 * ENV_E, '#ff6a1a'); ctx.globalAlpha = 1; }
  } else if (act === 2) {
    for (const [x, y] of [[-92, -60], [-40, -24], [352, -60], [400, -30], [-140, 120], [360, 120]]) for (let r = 0; r < 26; r++) { const off = Math.round(Math.sin(t * 2.6 + r * .35 + x) * (r / 10)); rect(x + off, y + r, 12, 1, r > 22 ? '#c8323e' : r % 7 === 3 ? '#d8b04a' : ph >= 2 ? '#46226c' : '#7a1a26'); }
    if (ph >= 1 && Math.floor(t * 1.3) % 5 === 0 && (fl % 3) === 0) { ctx.globalAlpha = .18; rect(-ENV_E, -ENV_E, LW + 2 * ENV_E, AH + 2 * ENV_E, ph >= 2 ? '#d07aff' : '#c8ccff'); ctx.globalAlpha = 1; }
  } else {
    for (let i = 0; i < 18; i++) { const an = t * .25 + i, x = -120 + ((i * 71) % 560) + Math.cos(an) * 14, y = -110 + ((i * 113) % 540) + Math.sin(an * 1.3) * 10, s = 2 + (i % 3); rect(x, y, s, s * 2, i % 4 ? '#3674a0' : '#86ccec'); rect(x, y, 1, 1, '#f0ffff'); }
    if (ph >= 2) { ctx.globalAlpha = .06 + .04 * Math.sin(t * 3); rect(-ENV_E, -ENV_E, LW + 2 * ENV_E, AH + 2 * ENV_E, ph >= 3 ? '#d07aff' : '#86ccec'); ctx.globalAlpha = 1; }
  }
}
// ---------- drawing ----------
const crackRetract = () => { const bo = B.boss; return bo.st === 'done' ? 0 : bo.st === 'outro' ? 1 - clamp((bo.t - .3) / 1.0, 0, 1) : 1; };
function drawCracks() {
  const bo = B.boss; if (!bo || !bo.cracks.length) return;
  const rf = crackRetract(); if (rf <= 0) return;
  const col = bo.D.crack;
  bo.cracks.forEach((c, i) => {
    const g = clamp((B.t - c.born) / .55, 0, 1) * rf, n = Math.floor(c.px.length * g); if (n <= 0) return;
    const pulse = .16 + .1 * Math.sin(B.t * 4 + i) * (RM ? .3 : 1);
    ctx.globalAlpha = pulse; ctx.fillStyle = col;
    for (let k = 0; k < n; k++) { const [x, y] = c.px[k]; ctx.fillRect(x - 1, y - 1, 3, 3); }
    ctx.globalAlpha = 1;
    for (let k = 0; k < n; k++) { const [x, y] = c.px[k]; ctx.fillRect(x, y, 1, 1); if (c.w && k % 3 === 0) ctx.fillRect(x + 1, y, 1, 1); }
    ctx.fillStyle = '#ffffff'; if (n > 2) { const [x, y] = c.px[n - 1]; ctx.fillRect(x, y, 1, 1); }
  });
}
function borderSegVisible(i) { const bo = B && B.boss; if (!bo) return true; const h = ((i * 2654435761) >>> 0) % 1000 / 1000; return h < bo.integ; }
function drawBorderCracks() {
  const bo = B.boss; if (!bo || bo.st !== 'intro' || bo.integ < 1) return;
  const pts = [[40, 0, 1], [150, 0, 1], [262, 0, 1], [319, 90, 2], [319, 210, 2], [96, 319, 3], [228, 319, 3], [0, 140, 4], [0, 250, 4]];
  ctx.fillStyle = bo.D.crack;
  pts.forEach(([x, y, e], i) => {
    const n = Math.floor(14 * clamp(bo.bcrack * 1.6 - i * .07, 0, 1));
    let cx = x, cy = y;
    for (let k = 0; k < n; k++) {
      ctx.fillRect(cx, cy, 1, 1);
      if (e === 1 || e === 3) { cx += (k % 2 ? 1 : -1) * (1 + (k % 3 === 0)); cy += e === 1 ? 1 : -1; }
      else { cy += (k % 2 ? 1 : -1) * (1 + (k % 3 === 0)); cx += e === 4 ? 1 : -1; }
    }
  });
}
function drawBossBar() {
  const bo = B.boss; if (!bo || bo.st === 'intro' && bo.t < 1.65 || bo.st === 'outro' || bo.st === 'done') return;
  const f = bo.f, x = 8, y = 21, w = 150;
  T(FOES[f.k].n, x, y, bo.D.crack, 1, 'l', '#000');
  for (let i = 0; i < bo.D.phases; i++) { const px = x + w - 4 - (bo.D.phases - 1 - i) * 7, on = i <= bo.phase; rect(px + 1, y + 1, 3, 1, on ? bo.D.crack : '#2a2a32'); rect(px, y + 2, 5, 1, on ? bo.D.crack : '#2a2a32'); rect(px + 1, y + 3, 3, 1, on ? bo.D.crack : '#2a2a32'); rect(px + 2, y, 1, 5, on ? bo.D.crack : '#2a2a32'); }
  rect(x - 1, y + 12, w + 2, 6, '#3a3444'); rect(x, y + 13, w, 4, '#120e14');
  rect(x, y + 13, Math.round(w * clamp(f.hp / f.max, 0, 1)), 4, f.inv ? '#ffffff' : '#ff5a5a');
  rect(x, y + 13, Math.round(w * clamp(f.hp / f.max, 0, 1)), 1, '#ffa0a0');
  for (let i = 1; i < bo.D.phases; i++) rect(x + Math.round(w * (1 - i / bo.D.phases)), y + 12, 1, 6, bo.D.crack);
}
let warpBuf = null;
function drawBossOverlay() {
  const bo = B && B.boss; if (!bo) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bo.inv) {
    if (!RM) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(OX, OY, LW, AH); ctx.globalCompositeOperation = 'source-over'; }
    else { ctx.globalAlpha = .12; ctx.fillStyle = bo.D.crack; ctx.fillRect(OX, OY, LW, AH); ctx.globalAlpha = 1; }
  }
  if (bo.warp > 0 && !RM) {
    if (!warpBuf || warpBuf.width !== VW || warpBuf.height !== VH) { warpBuf = document.createElement('canvas'); warpBuf.width = VW; warpBuf.height = VH; }
    const g = warpBuf.getContext('2d'); g.clearRect(0, 0, VW, VH); g.drawImage(cv, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    const amp = bo.warp * 6;
    for (let y = 0; y < VH; y += 2) ctx.drawImage(warpBuf, 0, y, VW, 2, Math.round(Math.sin(y * .06 + B.t * 18) * amp), y, VW, 2);
  }
  if (bo.flash) { const k = bo.flash.t / bo.flash.dur; ctx.globalAlpha = (1 - k) * (RM ? .2 : .75); ctx.fillStyle = bo.flash.col; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
}
// ================= UI / scenes =================
let scene = 'title', UI = [], mouse = { x: -1, y: -1 }, msgQueue = [], tab = 'warrior', selItem = null, selSkill = null, evoPick = null, confirmNew = 0, gtime = 0;
// ---------- fantasy pixel frames: carved stone + gilded filigree ----------
const STONE = { d: '#121016', m: '#1e1a24', l: '#3a3444', h: '#56506a' };
const GILD = { d: '#5a4018', m: '#9a7428', l: '#d8b04a', h: '#fff0a0' };
function gem(x, y, c) { // 5x5 cut gem in a gold setting, top-left at x,y
  rect(x + 2, y, 1, 1, GILD.m); rect(x + 1, y + 1, 1, 1, GILD.m); rect(x + 3, y + 1, 1, 1, GILD.m); rect(x, y + 2, 1, 1, GILD.m); rect(x + 4, y + 2, 1, 1, GILD.m);
  rect(x + 1, y + 3, 1, 1, GILD.d); rect(x + 3, y + 3, 1, 1, GILD.d); rect(x + 2, y + 4, 1, 1, GILD.d);
  rect(x + 2, y + 1, 1, 3, c); rect(x + 1, y + 2, 3, 1, c); rect(x + 2, y + 1, 1, 1, '#ffffff');
}
function filigree(x, y, sx, sy, col, L) { // gilded corner bracket with a little curl
  for (let i = 0; i < L; i++) { rect(x + sx * i, y, 1, 1, col); rect(x, y + sy * i, 1, 1, col); }
  rect(x + sx * 2, y + sy * 2, 1, 1, col); rect(x + sx * 3, y + sy * 2, 1, 1, col); rect(x + sx * 2, y + sy * 3, 1, 1, col);
  if (L > 6) { rect(x + sx * (L - 1), y + sy, 1, 1, col); rect(x + sx, y + sy * (L - 1), 1, 1, col); }
}
function ornFrame(x, y, w, h, o = {}) {
  const trim = o.trim || GILD.m, L = o.L || (Math.min(w, h) >= 40 ? 7 : 4);
  rect(x, y, w, 1, STONE.h); rect(x, y, 1, h, STONE.h); rect(x, y + h - 1, w, 1, STONE.l); rect(x + w - 1, y, 1, h, STONE.l);
  rect(x + 1, y + 1, w - 2, 1, STONE.d); rect(x + 1, y + h - 2, w - 2, 1, STONE.d); rect(x + 1, y + 1, 1, h - 2, STONE.d); rect(x + w - 2, y + 1, 1, h - 2, STONE.d);
  filigree(x + 1, y + 1, 1, 1, trim, L); filigree(x + w - 2, y + 1, -1, 1, trim, L); filigree(x + 1, y + h - 2, 1, -1, trim, L); filigree(x + w - 2, y + h - 2, -1, -1, trim, L);
  if (o.mid && w >= 90) for (const yy of [y, y + h - 1]) { const cx = x + Math.floor(w / 2); rect(cx - 6, yy, 3, 1, trim); rect(cx + 4, yy, 3, 1, trim); rect(cx - 1, yy - 1, 3, 3, STONE.d); rect(cx, yy - 1, 1, 3, trim); rect(cx - 1, yy, 3, 1, trim); }
  if (o.gem) { gem(x - 2, y - 2, o.gem); gem(x + w - 3, y - 2, o.gem); gem(x - 2, y + h - 3, o.gem); gem(x + w - 3, y + h - 3, o.gem); }
}
function ornDivider(x, y, w, col = GILD.m) {
  const cx = x + Math.floor(w / 2);
  for (let i = x + 4; i < x + w - 4; i += 2) rect(i, y, 1, 1, i % 4 ? STONE.l : col);
  rect(x, y, 2, 1, col); rect(x + w - 2, y, 2, 1, col); rect(x + 2, y - 1, 1, 1, col); rect(x + w - 3, y - 1, 1, 1, col);
  rect(cx - 2, y - 2, 5, 5, '#000'); gem(cx - 2, y - 2, col === GILD.m ? '#7a5cff' : col);
}
function slotBox(x, y, w, h, accent) { // inset stone slot
  rect(x, y, w, h, '#0c0a10'); rect(x, y, w, 1, STONE.d); rect(x, y, 1, h, STONE.d); rect(x, y + h - 1, w, 1, STONE.l); rect(x + w - 1, y, 1, h, STONE.l);
  if (accent) { frame(x, y, w, h, accent); rect(x, y, 1, 1, '#000'); rect(x + w - 1, y, 1, 1, '#000'); rect(x, y + h - 1, 1, 1, '#000'); rect(x + w - 1, y + h - 1, 1, 1, '#000'); rect(x + 1, y + 1, 1, 1, accent); rect(x + w - 2, y + 1, 1, 1, accent); }
}
function btn(x, y, w, h, label, fn, o = {}) {
  const hov = !o.dis && mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h;
  const edge = o.dis ? '#221e28' : o.sel ? GILD.l : hov ? '#9a8aa8' : (o.border || STONE.h);
  rect(x, y, w, h, o.fill || (hov ? '#221c2a' : '#141118'));
  rect(x + 1, y + 1, w - 2, 1, o.dis ? '#18151c' : '#2e2838'); rect(x + 1, y + h - 2, w - 2, 1, '#0a080c');
  frame(x, y, w, h, edge);
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) rect(cx, cy, 1, 1, '#000');
  if (!o.dis && h >= 16) { const rc = o.sel ? GILD.h : GILD.m; rect(x + 2, y + 2, 1, 1, rc); rect(x + w - 3, y + 2, 1, 1, rc); rect(x + 2, y + h - 3, 1, 1, rc); rect(x + w - 3, y + h - 3, 1, 1, rc); }
  if (label) T(label, x + w / 2, y + Math.floor((h - 10) / 2), o.dis ? COL.dark : (o.col || COL.white), o.sc || 1, 'c');
  if (o.badge) gem(x + w - 7, y + 2, COL.gold);
  if (!o.dis && fn) UI.push({ x, y, w, h, fn });
}
function hit(x, y, w, h, fn) { UI.push({ x, y, w, h, fn }); }
function bar(x, y, w, h, f, col, bg = '#222228') { rect(x, y, w, h, bg); rect(x, y, Math.max(0, Math.round(w * clamp(f, 0, 1))), h, col); }
function corners(x, y, w, h, col, l = 5) {
  rect(x, y, l, 1, col); rect(x, y, 1, l, col); rect(x + w - l, y, l, 1, col); rect(x + w - 1, y, 1, l, col);
  rect(x, y + h - 1, l, 1, col); rect(x, y + h - l, 1, l, col); rect(x + w - l, y + h - 1, l, 1, col); rect(x + w - 1, y + h - l, 1, l, col);
}
// tiny runes carved into the arena edge
const RUNES = [[0b010, 0b111, 0b010, 0b010, 0b010], [0b101, 0b110, 0b100, 0b110, 0b101], [0b111, 0b001, 0b010, 0b100, 0b111], [0b100, 0b110, 0b101, 0b110, 0b100], [0b011, 0b100, 0b010, 0b001, 0b110]];
function rune(x, y, r, col) { RUNES[r].forEach((m, yy) => { for (let xx = 0; xx < 3; xx++) if (m & (4 >> xx)) rect(x + xx, y + yy, 1, 1, col); }); }
function drawArena(accent = GILD.m) {
  const bo = scene === 'battle' && B && B.boss;
  if (bo) drawCracks();
  rect(0, 0, LW, LH, '#000');
  if (bo) drawBossEnv();
  if (scene === 'battle' && B) drawFloor(B.act, bo ? clamp(1 - bo.exp / 24, 0, 1) : 1);
  ctx.fillStyle = '#121117';
  for (let y = 8; y < AH; y += 16) for (let x = 8; x < LW; x += 16) ctx.fillRect(x, y, 1, 1);
  if (bo && bo.integ < 1) { // shattered border: only jagged remnants
    let i = 0;
    for (let x = 0; x < LW; x += 8, i++) { if (borderSegVisible(i)) { rect(x, 0, 8, 1, STONE.h); rect(x, 1, 8, 1, STONE.d); } if (borderSegVisible(i + 97)) { rect(x, AH - 1, 8, 1, STONE.l); rect(x, AH - 2, 8, 1, STONE.d); } }
    for (let y = 0; y < AH; y += 8, i++) { if (borderSegVisible(i + 211)) { rect(0, y, 1, 8, STONE.h); rect(1, y, 1, 8, STONE.d); } if (borderSegVisible(i + 307)) { rect(LW - 1, y, 1, 8, STONE.l); rect(LW - 2, y, 1, 8, STONE.d); } }
    if (bo.integ > .95) ornFrame(0, 0, LW, AH, { trim: accent, L: 12, mid: true });
    return;
  }
  ornFrame(0, 0, LW, AH, { trim: accent, L: 12, mid: true });
  for (const [x, y] of [[2, 2], [LW - 7, 2], [2, AH - 7], [LW - 7, AH - 7]]) gem(x, y, accent === GILD.m ? '#7a5cff' : accent);
  const rc = '#3a3022';
  [0, 1, 2].forEach(k => { rune(3, 120 + k * 30, (k + 1) % 5, rc); rune(LW - 6, 120 + k * 30, (k + 3) % 5, rc); });
  if (bo) drawBorderCracks();
}
function panel(x, y, w, h, col = '#3a3a44') {
  rect(x, y, w, h, COL.panel);
  const neutral = col === '#3a3a44' || col === '#2a2a32' || col === '#2a2a32';
  ornFrame(x, y, w, h, { trim: neutral ? '#6a5426' : col, L: h >= 40 && w >= 40 ? 6 : 3 });
}
function goto(s) { scene = s; selItem = null; selSkill = null; evoPick = null; SFX.click(); persist(); }
function tabs(y = 4) {
  save.party.forEach((id, i) => btn(124 + i * 64, y, 60, 18, CLS[id].n, () => { tab = id; selItem = null; selSkill = null; SFX.click(); }, { sel: tab === id, badge: scene === 'skills' && (canEvolve(save.chars[id]) || newlyLit(save.chars[id]).length > 0) }));
  if (!save.party.includes(tab)) tab = save.party[0];
}
function backBtn() { btn(8, 292, 70, 22, 'Back', () => goto('camp')); }

// ---------- title ----------
function drawTitle() {
  drawArena('#f4f4f4');
  T('W.A.M.', 160, 54, '#ffffff', 4, 'c', '#24242c');
  const bob = Math.floor(gtime * 2) % 2;
  rect(160 - 22, 196, 44, 3, '#16161c');
  drawChar(save.chars.warrior, 160 - 30, 136 - bob, 5);
  const ph = (gtime % 2.4) / 2.4; // sword glint travelling up the blade
  if (ph < .35) { const gy = 136 - bob + Math.round((5 - ph / .35 * 5)) * 5 + 5; rect(160 + 20, gy, 5, 5, '#ffffff'); rect(160 + 17, gy + 2, 11, 1, '#ffffff'); rect(160 + 22, gy - 3, 1, 11, '#ffffff'); }
  const has = save.started;
  if (has) {
    btn(105, 222, 110, 22, 'Continue', () => { confirmNew = 0; goto('camp'); });
    btn(105, 250, 110, 22, confirmNew ? 'Sure? tap again' : 'New game', () => {
      if (!confirmNew) { confirmNew = 1; SFX.click(); return; }
      const m = save.mute; newSave(); save.mute = m; save.started = true; confirmNew = 0; persist(); goto('camp');
    }, { col: confirmNew ? COL.red : COL.white });
  } else btn(105, 236, 110, 24, 'Start', () => { save.started = true; goto('camp'); });
  if (Math.floor(gtime * 2) % 2 === 0) T(TOUCH ? 'tap to begin' : 'press J', 160, 290, COL.dim, 1, 'c');
  T('test build', 312, 306, '#2e2e38', 1, 'r');
}
// ---------- camp ----------
function drawCamp() {
  if (act4Ready() && !save.act4) { save.act4 = true; persist(); msgQueue.push({ title: 'A void opens', spr: 'shade', col: '#b480ff', lines: ['Your ' + TUNE.act4Perfects + ' perfect strikes tore the sky.', 'Secret Act IV: The Void is open.'] }); scene = 'msg'; return; }
  const sa = Math.floor(save.sel / 3);
  drawArena(ACTS[sa].c);
  T('W.A.M.', 8, 6, '#ffffff', 2, 'l', '#24242c');
  T('Perfect ' + save.perfects, 312, 6, COL.gold, 1, 'r');
  btn(250, 20, 62, 16, save.mute ? 'Sound off' : 'Sound on', () => { save.mute = !save.mute; persist(); SFX.click(); }, { col: COL.dim });
  const showAct4 = save.cleared[8] || save.act4;
  for (let a = 0; a < (showAct4 ? 4 : 3); a++) {
    const y = 42 + a * 26, A = ACTS[a], open = a < 3 || save.act4;
    T(A.roman, 10, y + 5, open ? A.c : COL.dark);
    T(a === 3 && !save.act4 ? '? ? ?' : A.n, 34, y + 5, levelOpen(a * 3) ? COL.white : COL.dark);
    for (let l = 0; l < 3; l++) {
      const li = a * 3 + l, x = 166 + l * 48, op = levelOpen(li), sel = save.sel === li;
      btn(x, y, 42, 20, op ? (a + 1) + '-' + (l + 1) : '', op ? () => { save.sel = li; SFX.click(); } : null,
        { dis: !op, sel, col: save.cleared[li] ? COL.green : COL.white, border: l === 2 ? '#5a2a30' : null });
      if (!op) { rect(x + 18, y + 8, 6, 5, '#2a2a32'); frame(x + 19, y + 5, 4, 4, '#2a2a32'); }
      if (save.cleared[li]) rect(x + 36, y + 3, 3, 3, COL.green);
    }
    if (a === 3 && !save.act4) T('perfect hits ' + Math.min(save.perfects, TUNE.act4Perfects) + '/' + TUNE.act4Perfects, 34, y + 16, '#5a4a7a');
  }
  // selected level
  const L = LEVELS[save.sel], py = showAct4 ? 150 : 128;
  panel(8, py, 304, 56, ACTS[sa].c + '66');
  T(ACTS[sa].roman + '-' + (save.sel % 3 + 1) + '  ' + L.n, 16, py + 6, ACTS[sa].c);
  T(save.cleared[save.sel] ? 'cleared' : 'new', 304, py + 6, save.cleared[save.sel] ? COL.green : COL.gold, 1, 'r');
  const names = [...new Set(L.w.flat())].map(k => FOES[k].n);
  T('Foes: ' + names.join(', '), 16, py + 21, COL.dim);
  T('Foe level ' + (save.sel + 1) + '   3 waves' + (save.sel % 3 === 2 ? ' + boss' : ''), 16, py + 36, COL.dim);
  // party
  const qy = showAct4 ? 214 : 196;
  ORDER.forEach((id, i) => {
    const x = 10 + i * 104, c = save.chars[id], got = save.party.includes(id);
    const bob = got ? Math.floor(gtime * 2 + i) % 2 : 0;
    if (c && got) drawChar(c, x, qy + 4 - bob, 3, '', { seed: i }); else drawSpr(CLS[id].spr, x, qy + 4 - bob, 3, 'dim');
    if (got) {
      T(charName(c), x + 40, qy + 6, id === save.active ? COL.white : COL.dim);
      T('Lv ' + c.lvl, x + 40, qy + 20, COL.dim);
      if (canEvolve(c) && Math.floor(gtime * 3) % 2) T('evolve!', x + 40, qy + 32, COL.gold);
      if (id === save.active) rect(x + 16, qy - 2, 4, 2, COL.white);
    }
  });
  const anySp = save.party.some(id => canEvolve(save.chars[id]) || newlyLit(save.chars[id]).length > 0);
  const anyEvo = save.party.some(id => canEvolve(save.chars[id]));
  btn(8, 280, 88, 32, TOUCH ? 'Fight' : 'Fight (J)', () => startLevel(save.sel), { border: COL.gold, col: COL.gold });
  btn(102, 280, 66, 32, 'Gear', () => { tab = save.active; goto('gear'); });
  btn(174, 280, 66, 32, 'Skills', () => { tab = save.active; goto('skills'); }, { badge: anySp });
  btn(246, 280, 66, 32, 'Party', () => goto('party'), { badge: anyEvo });
}
// ---------- gear ----------
function equip(it) {
  const c = save.chars[tab]; if (!canUse(it, tab)) return;
  const old = c.gear[it.slot]; c.gear[it.slot] = it;
  save.inv = save.inv.filter(x => x !== it); if (old) save.inv.push(old);
  selItem = { it, eq: true }; SFX.drop(); persist();
}
function scrapItem(it) { save.inv = save.inv.filter(x => x !== it); save.scrap += it.rar + 1; selItem = null; SFX.kill(); persist(); }
function scrapWorse() {
  let n = 0;
  save.inv = save.inv.filter(it => {
    const users = save.party.filter(id => canUse(it, id));
    const better = users.some(id => itemScore(it) > itemScore(save.chars[id].gear[it.slot]));
    if (!better) { save.scrap += it.rar + 1; n++; return false; } return true;
  });
  selItem = null; if (n) SFX.kill(); persist();
}
function claimForge() {
  if (save.scrap < TUNE.forgeCost) return;
  save.scrap -= TUNE.forgeCost;
  const it = makeItem(save.bestLvl, null, pick(save.party), 1, .4);
  if (save.inv.length < TUNE.invMax) save.inv.push(it); else save.scrap += it.rar + 1;
  selItem = { it }; SFX.lvl(); persist();
}
function drawItemCell(it, x, y, s, dim, sel) {
  slotBox(x, y, s, s, sel ? '#ffffff' : RAR[it.rar].c + (dim ? '55' : 'cc'));
  drawGearArt(it, x + s / 2, y + s / 2, 2);
  if (dim) { ctx.globalAlpha = .6; rect(x + 1, y + 1, s - 2, s - 2, '#000'); ctx.globalAlpha = 1; }
}
function drawGear() {
  drawArena(); tabs(); T('Gear', 8, 7, COL.white, 1);
  const c = save.chars[tab], s = calcStats(c);
  SLOTS.forEach((sl, i) => {
    const y = 28 + i * 28, it = c.gear[sl], sel = selItem && selItem.it === it && it;
    panel(8, y, 150, 26, sel ? '#ffffff' : '#2a2a32');
    if (it) {
      drawGearArt(it, 20, y + 13, 2);
      T(it.name, 34, y + 3, RAR[it.rar].c); T(modLines(it).slice(0, 2).join(' '), 34, y + 14, COL.dim);
      hit(8, y, 150, 26, () => { selItem = { it, eq: true }; SFX.click(); });
    } else T('no ' + (sl === 'weapon' ? CLS[tab].weapon : sl), 34, y + 8, COL.dark);
  });
  T('DMG ' + Math.round(s.dmg) + '  LIFE ' + s.hp + '  ARM ' + s.arm, 8, 145, COL.white);
  T('CRIT ' + s.crit + '%  ' + (1 / s.cd).toFixed(1) + ' hits/s  ZONE +' + s.zone + '%', 8, 158, COL.dim);
  // detail
  panel(164, 28, 148, 110, '#2a2a32');
  if (selItem) {
    const it = selItem.it, eq = c.gear[it.slot];
    T(it.name, 170, 33, RAR[it.rar].c);
    T(RAR[it.rar].n + '  Lv ' + it.ilvl, 170, 46, COL.dim);
    let y = 59; modLines(it).forEach(l => { T(l, 170, y, COL.white); y += 11; });
    if (!selItem.eq) {
      if (!canUse(it, tab)) T(CLS[it.cls].n + ' only', 170, 106, COL.red);
      else { const d = Math.round(itemScore(it) - itemScore(eq)); T(d >= 0 ? '+' + d + ' power' : d + ' power', 170, 106, d >= 0 ? COL.green : COL.red); }
      btn(168, 116, 68, 18, 'Equip', () => equip(it), { dis: !canUse(it, tab) });
      btn(240, 116, 68, 18, 'Scrap', () => scrapItem(it), { col: COL.red });
    } else T('equipped', 170, 120, COL.green);
  } else { T('Pick an item', 170, 34, COL.dim); wrap('Scrap gear you do not need to fill the Forge. A full Forge crafts a new item.', 136).forEach((l, i) => T(l, 170, 52 + i * 12, COL.dark)); }
  // bag
  T('Bag ' + save.inv.length + '/' + TUNE.invMax, 8, 174, COL.white);
  save.inv.forEach((it, i) => {
    const x = 8 + (i % 12) * 25, y = 188 + Math.floor(i / 12) * 25, sel = selItem && selItem.it === it;
    drawItemCell(it, x, y, 24, !canUse(it, tab), sel);
    if (!canUse(it, tab) === false && itemScore(it) > itemScore(c.gear[it.slot])) rect(x + 19, y + 2, 3, 3, COL.green);
    hit(x, y, 24, 24, () => { selItem = { it }; SFX.click(); });
  });
  for (let i = save.inv.length; i < TUNE.invMax; i++) frame(8 + (i % 12) * 25, 188 + Math.floor(i / 12) * 25, 24, 24, '#18181e');
  T('Forge ' + save.scrap + '/' + TUNE.forgeCost, 8, 248, COL.white);
  bar(8, 261, 100, 3, save.scrap / TUNE.forgeCost, COL.gold);
  btn(116, 244, 66, 20, 'Craft', claimForge, { dis: save.scrap < TUNE.forgeCost, col: COL.gold });
  btn(188, 244, 124, 20, 'Scrap worse', scrapWorse, { dis: !save.inv.length, col: COL.dim });
  backBtn();
}
// ---------- skills: a scrollable, zoomable rune constellation per character ----------
const TV = {}; let treeSel = null, treeAnim = [], treeDrag = null;
const ZOOMS = [.5, 1, 2];
function tview(id) { if (!TV[id]) { const c = save.chars[id], T = buildTree(id), f = treeFocus(c); TV[id] = { x: f.x, y: f.y, zi: 1 }; } return TV[id]; }
function treeFocus(c) { const T = buildTree(c.id); const p = T.N.find(n => nodeState(c, n) === 'pick') || [...T.N].reverse().find(n => nodeState(c, n) === 'own') || T.N[0]; return { x: p.x, y: p.y + 40 }; }
const TREE_CLIP = [4, 24, 312, 196];
function treeToScr(v, n) { const z = ZOOMS[v.zi]; return [Math.round(160 + (n.x - v.x) * z), Math.round(TREE_CLIP[1] + TREE_CLIP[3] / 2 + (n.y - v.y) * z)]; }
function treePan(dx, dy) { const v = tview(tab), z = ZOOMS[v.zi]; v.x = clamp(v.x - dx / z, -190, 190); v.y = clamp(v.y - dy / z, -420, 30); }
function treeZoom(d) { const v = tview(tab); v.zi = clamp(v.zi + d, 0, ZOOMS.length - 1); SFX.click(); }
const KINDCOL = { root: '#e6e6f0', passive: '#a6caff', active: '#ff9a5a', bar: '#ffe070', evo: '#d6a6ff' };
const KINDN = { root: 'Origin', passive: 'Passive', active: 'Active', bar: 'Timing bar', evo: 'Evolution' };
function nodeInfo(c, n) {
  if (n.k === 'evo') { const E = EVO[n.evo]; return { n: E.n, d: [...E.d, ...(E.atk ? ['Moves: ' + ({ smite: 'holy smite', spin: 'whirlwind', fan: 'arrow fan', blink: 'blink strikes', fire: 'fireballs', ice: 'ice lances', snipe: 'piercing snipe', void: 'void bolts' }[E.atk] || E.atk)] : [])] }; }
  if (n.k === 'root') { const G = GROW[c.id]; return { n: CLS[c.id].n, d: ['Every level: +' + Math.round(G.hp * 100) + '% life, +' + Math.round(G.dmg * 100) + '% damage', 'armor, crit' + (G.spd ? ' and speed' : '') + ' grow on their own'] }; }
  return { n: n.n + (n.rank > 1 ? ' II' : ''), d: [n.d + (n.rank > 1 ? ' (x' + n.rank + ')' : '')] };
}
function drawSkills() {
  drawArena(); tabs(); T('Skills', 8, 7, COL.white);
  const c = save.chars[tab], Tr = buildTree(tab), v = tview(tab), z = ZOOMS[v.zi], [cx0, cy0, cw, ch] = TREE_CLIP;
  // unlock animations for nodes that lit up since you last looked
  for (const n of newlyLit(c)) { c.seen.push(n.id); treeAnim.push({ id: n.id, t: 0 }); if (treeAnim.length === 1) SFX.lvl(); persist(); }
  panel(cx0 - 2, cy0 - 2, cw + 4, ch + 4, '#3a3a44');
  ctx.save(); ctx.beginPath(); ctx.rect(cx0, cy0, cw, ch); ctx.clip();
  rect(cx0, cy0, cw, ch, '#07060c');
  // parallax starfield
  for (let i = 0; i < 90; i++) {
    const sx = ((i * 97.3 - v.x * .3 * z) % cw + cw) % cw, sy = ((i * 53.7 + i * i * .7 - v.y * .3 * z) % ch + ch) % ch, tw = RM ? 1 : (Math.sin(gtime * 2 + i) + 1) / 2;
    rect(cx0 + Math.round(sx), cy0 + Math.round(sy), 1, 1, tw > .7 ? '#8a86a8' : '#2c2a3c');
  }
  // rune rings around the origin
  const [rx, ry] = treeToScr(v, Tr.by.root);
  for (let r = 0; r < 2; r++) { const R = (16 + r * 8) * z; for (let k = 0; k < 24 + r * 12; k++) { const a = k / (24 + r * 12) * Math.PI * 2 + (RM ? 0 : gtime * (r ? -.2 : .3)); rect(Math.round(rx + Math.cos(a) * R), Math.round(ry + Math.sin(a) * R), 1, 1, k % 3 ? '#3a3450' : '#6a5426'); } }
  // paths
  const st = {}; Tr.N.forEach(n => st[n.id] = nodeState(c, n));
  for (const n of Tr.N) {
    if (!n.from) continue; const p = Tr.by[n.from], [ax, ay] = treeToScr(v, p), [bx, by] = treeToScr(v, n);
    const lit = st[n.id] === 'own' && st[p.id] === 'own', pk = st[n.id] === 'pick', seal = st[n.id] === 'seal';
    const L = Math.max(1, Math.hypot(bx - ax, by - ay)), steps = Math.ceil(L);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t);
      if (seal && i % 4) continue;
      let col = seal ? '#1c1a24' : lit ? '#9a7428' : pk ? '#5a5070' : '#2a2836';
      if (lit && !RM) { const ph = (i - gtime * 40) % 18; if (ph > -3 && ph < 0) col = '#fff0a0'; else if (ph < 0 && ph > -6) col = '#d8b04a'; }
      if (pk && !RM && Math.floor(i / 3 - gtime * 6) % 3 === 0) col = '#e6e6f0';
      rect(x, y, 1, 1, col); if (lit) rect(x + 1, y, 1, 1, darken(col, .4));
    }
  }
  // nodes
  for (const n of Tr.N) {
    const [x, y] = treeToScr(v, n), S = st[n.id], big = n.k === 'evo' || n.k === 'root';
    const r = (big ? 13 : 9) * (z >= 2 ? 2 : 1) * (z < 1 ? .7 : 1);
    if (x < cx0 - 30 || x > cx0 + cw + 30 || y < cy0 - 30 || y > cy0 + ch + 30) continue;
    const kc = KINDCOL[n.k], edge = S === 'own' ? kc : S === 'pick' ? '#ffffff' : S === 'seal' ? '#1e1c26' : '#4a4652';
    const sel = treeSel === n.id, pulse = RM ? .5 : (Math.sin(gtime * 5) + 1) / 2;
    if (S === 'own') { ctx.globalAlpha = .18 + .1 * pulse; rect(x - r - 3, y - r - 3, r * 2 + 6, r * 2 + 6, kc); ctx.globalAlpha = 1; }
    if (S === 'pick') { ctx.globalAlpha = .3 + .4 * pulse; frame(x - r - 3, y - r - 3, r * 2 + 6, r * 2 + 6, '#ffffff'); ctx.globalAlpha = 1; }
    // frame shape by kind: circle passive, diamond active, square bar, ornate hex evo
    const R = Math.round(r);
    if (n.k === 'active') { for (let i = -R; i <= R; i++) { const w = R - Math.abs(i); rect(x - w, y + i, w * 2 + 1, 1, '#0c0a12'); rect(x - w - 1, y + i, 1, 1, edge); rect(x + w + 1, y + i, 1, 1, edge); } }
    else if (n.k === 'bar') { rect(x - R, y - R, R * 2, R * 2, '#0c0a12'); frame(x - R, y - R, R * 2, R * 2, edge); rect(x - R + 2, y + R - 3, R * 2 - 4, 1, S === 'own' ? COL.gold : '#3a3444'); }
    else if (n.k === 'evo' || n.k === 'root') { for (let i = -R; i <= R; i++) { const w = Math.round(R - Math.max(0, Math.abs(i) - R / 2)); rect(x - w, y + i, w * 2, 1, '#0c0a12'); rect(x - w - 1, y + i, 1, 1, edge); rect(x + w, y + i, 1, 1, edge); } rect(x - R / 2, y - R - 1, R, 1, edge); rect(x - R / 2, y + R, R, 1, edge); for (const [gx, gy] of [[0, -R - 3], [0, R + 2]]) rect(x + gx - 1, y + gy, 2, 2, S === 'own' ? GILD.h : '#3a3444'); }
    else { for (let i = -R; i <= R; i++) { const w = Math.round(Math.sqrt(R * R - i * i)); rect(x - w, y + i, w * 2, 1, '#0c0a12'); rect(x - w - 1, y + i, 1, 1, edge); rect(x + w, y + i, 1, 1, edge); } }
    // art: a pixel icon, or for evolutions/origin the character wearing that look
    const isc = z >= 2 ? 2 : 1;
    if (n.k === 'evo' || n.k === 'root') {
      const fc = Object.assign({}, c, { evo: n.k === 'root' ? null : n.evo });
      const s2 = z >= 2 ? 2 : 1;
      drawChar(fc, x - 6 * s2, y - 7 * s2, s2, S === 'own' || S === 'pick' || n.k === 'root' ? '' : 'dim', { noCape: z < 1 });
    } else if (n.ic && SKICON[n.ic]) {
      const ic = skillIcon(n.ic, S === 'own' ? 'own' : S === 'pick' || S === 'open' ? 'open' : 'lock');
      if (S === 'seal') ctx.globalAlpha = .35;
      ctx.drawImage(ic, x - Math.round(ic.width * isc / 2), y - Math.round(ic.height * isc / 2), ic.width * isc, ic.height * isc); ctx.globalAlpha = 1;
    }
    if (S === 'lock' || S === 'open') drawPadlock(x + R - 4, y + R - 5, S === 'open' ? COL.gold : '#5a5a66');
    if (sel) { const k = RM ? 0 : Math.floor(gtime * 8) % 2; corners(x - R - 4 - k, y - R - 4 - k, R * 2 + 9 + k * 2, R * 2 + 9 + k * 2, '#ffffff', 4); }
    hit(Math.max(cx0, x - R - 2), Math.max(cy0, y - R - 2), R * 2 + 4, R * 2 + 4, () => { treeSel = n.id; SFX.click(); });
  }
  // unlock bursts
  treeAnim = treeAnim.filter(a => a.t < 1.2);
  for (const a of treeAnim) {
    a.t += 1 / 60; const n = Tr.by[a.id]; if (!n) continue; const [x, y] = treeToScr(v, n), k = a.t / 1.2, col = KINDCOL[n.k];
    ctx.globalAlpha = 1 - k; const R = 6 + k * 26;
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; rect(Math.round(x + Math.cos(an) * R), Math.round(y + Math.sin(an) * R), 2, 2, i % 2 ? col : '#ffffff'); }
    if (k < .3) { ctx.globalAlpha = (.3 - k) * 2; rect(x - 12, y - 12, 24, 24, '#ffffff'); }
    ctx.globalAlpha = 1; if (k < .6) T('unlocked', x, y - 26 - Math.round(k * 10), col, 1, 'c', '#000');
  }
  ctx.restore();
  // drag to pan; wheel or buttons to zoom
  UI.unshift({ x: cx0, y: cy0, w: cw, h: ch, fn: () => {}, drag: true });
  btn(282, 196, 14, 14, '+', () => treeZoom(1), { dis: v.zi >= ZOOMS.length - 1 }); btn(298, 196, 14, 14, '-', () => treeZoom(-1), { dis: v.zi <= 0 });
  btn(230, 196, 48, 14, 'center', () => { const f = treeFocus(c); v.x = f.x; v.y = f.y; SFX.click(); });
  // tooltip in the game font
  T(charName(c) + '  Lv ' + c.lvl, 8, 28, COL.white, 1, 'l', '#000');
  bar(8, 40, 90, 2, c.xp / xpNeed(c.lvl), COL.blue);
  panel(4, 224, 312, 64, '#2a2a32');
  const n = treeSel && Tr.by[treeSel];
  if (n) {
    const S = nodeState(c, n), I = nodeInfo(c, n);
    T(I.n, 12, 230, KINDCOL[n.k]); T(KINDN[n.k], 308, 230, COL.dim, 1, 'r');
    I.d.slice(0, 3).forEach((l, i) => T(l, 12, 243 + i * 11, COL.white));
    const foot = S === 'own' ? 'Unlocked' : S === 'seal' ? 'Sealed: another path was chosen' : S === 'pick' ? 'A fork: choose one path' : n.q ? reqText(n.q) : '';
    if (S !== 'pick') T(foot, 308, 276, S === 'own' ? COL.green : S === 'seal' ? COL.dark : COL.gold, 1, 'r');
    else btn(212, 266, 96, 18, 'Take this path', () => {
      c.evo = n.evo; const E = EVO[n.evo]; SFX.lvl(); treeAnim.push({ id: n.id, t: 0 }); c.seen.push(n.id); persist();
      msgQueue.push({ title: E.n + '!', char: c, col: COL.gold, lines: ['The ' + CLS[c.id].n + ' evolved.', ...E.d] }); msgReturn = 'skills'; scene = 'msg';
    }, { col: COL.gold, border: COL.gold });
  } else {
    T('Nodes light up as you level and beat bosses.', 12, 232, COL.dim);
    T('At each fork you pick one path for good.', 12, 245, COL.dim);
    T(TOUCH ? 'Drag to look around, tap a node.' : 'Drag or scroll to look, click a node.', 12, 258, COL.dark);
  }
  backBtn();
}
// ---------- party / evolution ----------
function drawParty() {
  drawArena(); T('Party', 8, 7, COL.white); T('Lead = who you start as', 312, 7, COL.dark, 1, 'r');
  ORDER.forEach((id, i) => {
    const x = 8 + i * 104, c = save.chars[id], got = save.party.includes(id);
    panel(x, 26, 98, 258, got && id === save.active ? '#8a8a96' : '#26262e');
    const bob = got ? Math.floor(gtime * 2 + i) % 2 : 0;
    if (c && got) drawChar(c, x + 25, 40 - bob, 4, '', { seed: i }); else drawSpr(CLS[id].spr, x + 25, 36 - bob, 4, 'dim');
    if (!got) { T('?', x + 49, 110, COL.dark, 2, 'c'); return; }
    const s = calcStats(c);
    T(charName(c), x + 49, 92, COL.white, 1, 'c');
    T('Lv ' + c.lvl, x + 49, 105, COL.dim, 1, 'c');
    bar(x + 14, 118, 70, 2, c.xp / xpNeed(c.lvl), COL.blue);
    T('DMG ' + Math.round(s.dmg), x + 8, 128, COL.white); T('LIFE ' + s.hp, x + 8, 141, COL.white);
    T('ARM ' + s.arm, x + 8, 154, COL.white); T((1 / s.cd).toFixed(1) + '/s', x + 8, 167, COL.white);
    btn(x + 8, 200, 82, 20, id === save.active ? 'Leading' : 'Lead', () => { save.active = id; SFX.click(); persist(); }, { sel: id === save.active });
    const tier = c.evo ? EVO[c.evo].tier : 0;
    if (canEvolve(c)) btn(x + 8, 226, 82, 22, 'Evolve', () => { tab = id; treeSel = null; delete TV[id]; goto('skills'); }, { col: COL.gold, border: COL.gold });
    else T(tier >= 3 ? 'final form' : 'evolves Lv ' + EVOLV[tier], x + 49, 232, COL.dark, 1, 'c');
    T('tier ' + tier + '/3', x + 49, 250, COL.dim, 1, 'c');
  });
  backBtn();
}
// ---------- message cards ----------
let msgReturn = 'camp';
function nextMsg() { msgQueue.shift(); SFX.click(); if (!msgQueue.length) { scene = msgReturn; msgReturn = 'camp'; persist(); } }
function drawMsg() {
  const m = msgQueue[0]; if (!m) { scene = 'camp'; return; }
  drawArena(m.col);
  const sc = textW(m.title, 2) <= 290 ? 2 : 1;
  T(m.title, 160, 30, m.col, sc, 'c', '#24242c');
  if (m.char) { rect(138, 140, 44, 3, '#16161c'); drawChar(m.char, 130, 84 - (Math.floor(gtime * 2) % 2), 5); }
  else { const [w, h] = sprSize(m.spr, 5);
  rect(160 - w / 2 + 8, 76 + h, w - 16, 3, '#16161c');
  drawSpr(m.spr, 160 - w / 2, 76 - (Math.floor(gtime * 2) % 2), 5, '', FOES[m.spr] && FOES[m.spr].outline || null); }
  for (let i = 0; i < 6; i++) { const a = gtime * 1.5 + i * 1.047, r = 52 + Math.sin(gtime * 3 + i) * 4; rect(160 + Math.cos(a) * r, 108 + Math.sin(a) * r * .6, 2, 2, i % 2 ? m.col : '#ffffff'); }
  m.lines.forEach((l, i) => T(l, 160, 168 + i * 13, COL.white, 1, 'c'));
  if (Math.floor(gtime * 2) % 2 === 0) T(TOUCH ? 'tap to continue' : 'J to continue', 160, 296, COL.dim, 1, 'c');
  hit(0, 0, LW, LH, nextMsg);
}
// ================= battle drawing =================
function drawBattle() {
  const A = ACTS[B.act];
  drawArena(A.c);
  ctx.save();
  const sk = B.shake * (RM ? .25 : 1); if (sk > 0) ctx.translate(Math.round(rnd(-sk, sk)), Math.round(rnd(-sk, sk)));
  if (B.zoom && !RM) { const z = B.zoom, s = 1 + z.a * Math.sin(Math.PI * z.t / z.dur); ctx.translate(z.x, z.y); ctx.scale(s, s); ctx.translate(-z.x, -z.y); }
  const ents = [...B.units.map((u, i) => ({ y: u.y, d: () => drawUnit(u, i) })), ...B.foes.map((f, i) => ({ y: f.y, d: () => drawFoe(f, i) }))];
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  for (const p of B.proj) drawProj(p);
  for (const e of B.eproj) drawEProj(e);
  for (const e of B.fx) drawFx(e);
  if (B.impact > 0 && !RM) { ctx.globalAlpha = .35; rect(-200, -200, LW + 400, AH + 400, '#ffffff'); ctx.globalAlpha = 1; }
  for (const p of B.parts) { ctx.globalAlpha = clamp(1 - p.t / p.life + .3, 0, 1); rect(p.x, p.y, p.s, p.s, p.col); }
  ctx.globalAlpha = 1;
  for (const n of B.nums) { const k = n.t / .9; ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; T(n.txt, n.x, n.y - Math.round(Math.sqrt(k) * 22), n.col, n.sc, 'c', '#000'); }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawHud();
  if (B.banner) {
    const b = B.banner, k = b.t / b.dur, sc = textW(b.txt, 2) < 280 ? 2 : 1;
    ctx.globalAlpha = k > .75 ? (1 - k) / .25 : 1;
    const w = textW(b.txt, sc) + 24; rect(160 - w / 2, 118, w, 14 * sc + 8, '#000'); corners(160 - w / 2, 118, w, 14 * sc + 8, b.col, 4);
    T(b.txt, 160, 122 + (sc === 1 ? 2 : 0), b.col, sc, 'c'); ctx.globalAlpha = 1;
  }
  if (B.state === 'win' || B.state === 'lose') drawResult();
  if (B.paused) drawPause();
}
function drawUnit(u, i) {
  if (u.dead) { drawSpr('grave', u.x - 16, u.y - 28, PSC); return; }
  const w = 48, h = 48, atk = unitAtk(u);
  let lx = 0, ly = 0, dash = 0;
  if (u.dash) { const p = u.dash.t / u.dash.dur, k = p < .22 ? ease(p / .22) : 1 - ease((p - .22) / .78); lx = u.dash.tx * k; ly = u.dash.ty * k * .4; dash = p < .5 ? 1 : 0; if (atk === 'blink' && p < .22) lx = u.dash.tx; }
  else if (u.lt > 0 && atk !== 'slash' && atk !== 'spin' && atk !== 'smite' && atk !== 'blink') lx = Math.round(Math.sin((1 - u.lt / .16) * Math.PI) * 4);
  if (u.hop > 0) { const k = u.hop / .32; ly -= Math.sin(k * Math.PI) * 12; lx -= k * 8; }
  lx -= u.kb;
  const bob = RM ? 0 : Math.floor(B.t * 2 + i) % 2, x = Math.round(u.x + u.ox + lx - w / 2), y = Math.round(u.y - h - bob + ly);
  rect(u.x + lx - w / 2 + 8, u.y, w - 16, 2, '#1a1a22');
  if (u.dash && dash && !RM) for (let g = 2; g >= 1; g--) { const p = Math.max(0, u.dash.t / u.dash.dur - g * .05), k = p < .22 ? ease(p / .22) : 1; drawChar(u.c, Math.round(u.x + u.ox + u.dash.tx * k - u.kb - w / 2), y, PSC, 'flash', { alpha: .14 * g, noCape: true, spr: u.spr }); }
  const vr = u.hurt > 0 && Math.floor(u.hurt * 30) % 2 ? 'hurt' : B.impact > 0 && u.dash ? 'flash' : '';
  drawChar(u.c, x, y, PSC, vr, { rim: ACTPAL[B.act].rim, dash, seed: u.seed, spr: u.spr, unit: u });
  if (u.cast > 0) { const k = u.cast / .25, cx = x + 44, cy = y + 6; ctx.globalAlpha = k; frame(cx - 6 + k * 2, cy - 6 + k * 2, 12 - k * 4, 12 - k * 4, unitCol(u)); rect(cx - 1, cy - 1, 2, 2, '#ffffff'); ctx.globalAlpha = 1; }
  if (u.guard) corners(x - 3, y - 3, w + 6, h + 6, COL.blue, 4);
  bar(u.x - 14, u.y - h - 8, 28, 3, u.hp / u.max, '#7ee07e');
  if (u.id === save.active) { const ty = u.y - h - 16 + (Math.floor(B.t * 3) % 2); rect(u.x - 3, ty, 7, 1, '#fff'); rect(u.x - 2, ty + 1, 5, 1, '#fff'); rect(u.x - 1, ty + 2, 3, 1, '#fff'); rect(u.x, ty + 3, 1, 1, '#fff'); }
  hit(u.x - w / 2 - 4, u.y - h - 6, w + 8, h + 10, () => switchTo(i));
}
const unitCol = u => u.s.burn ? '#ff9a3a' : u.s.chill ? '#9fe6f4' : u.s.holy ? '#ffe070' : TINT[u.id];
function drawProj(p) {
  if (p.kind === 'snipe') { for (let i = 0; i < 6; i++) { ctx.globalAlpha = .6 - i * .1; rect(p.x - 8 - i * 8, p.y, 8, 1, i ? '#ffe070' : '#ffffff'); } ctx.globalAlpha = 1; rect(p.x - 9, p.y - 1, 10, 3, '#fff0a0'); rect(p.x, p.y - 1, 3, 3, '#ffffff'); return; }
  const col = p.kind === 'arrow' ? '#e8e8e8' : p.kind === 'fire' ? '#ff9a3a' : p.kind === 'ice' ? '#9fe6f4' : p.kind === 'holy' ? '#ffe070' : p.kind === 'dark' ? '#b480ff' : '#9a8cff';
  p.tr.forEach(([x, y], i) => { ctx.globalAlpha = .5 - i * .09; rect(x - (p.kind === 'arrow' ? 4 : 2), y - (p.kind === 'arrow' ? 0 : 2), p.kind === 'arrow' ? 4 : 4, p.kind === 'arrow' ? 1 : 4, col); });
  ctx.globalAlpha = 1;
  if (p.kind === 'arrow' || p.kind === 'dark') { rect(p.x - 7, p.y, 8, 1, p.kind === 'dark' ? '#46226c' : '#c8a070'); rect(p.x, p.y - 1, 2, 3, '#ffffff'); rect(p.x - 9, p.y - 1, 2, 1, col); rect(p.x - 9, p.y + 1, 2, 1, col); }
  else { rect(p.x - 3, p.y - 3, 6, 6, col); rect(p.x - 2, p.y - 4, 4, 1, lighten(col, .4)); rect(p.x - 1, p.y - 1, 2, 2, '#ffffff'); if (!RM && Math.floor(B.t * 20) % 2) rect(p.x - 5, p.y + rnd(-3, 3), 1, 1, col); }
}
function drawEProj(e) {
  const k = e.t / e.dur, x = e.x + (e.tx - e.x) * k, y = e.y + (e.ty - e.y) * k - Math.sin(k * Math.PI) * (e.pk === 'beam' ? 0 : 22);
  if (e.pk === 'beam') { for (let i = 0; i < 18; i++) { const q = k * i / 18; rect(e.x + (e.tx - e.x) * q, e.y + (e.ty - e.y) * q, 3, 2, i % 2 ? '#b480ff' : '#ffffff'); } return; }
  const col = e.pk === 'spore' ? '#9cff6a' : e.pk === 'bone' ? '#cfc6aa' : '#9fe6f4';
  if (e.pk === 'bone') { const r = Math.floor(B.t * 16) % 2; rect(x - (r ? 3 : 1), y - (r ? 1 : 3), r ? 6 : 2, r ? 2 : 6, col); rect(x - 1, y - 1, 2, 2, '#fffaf0'); }
  else { rect(x - 2, y - 2, 4, 4, col); rect(x - 1, y - 1, 1, 1, '#ffffff'); ctx.globalAlpha = .3; rect(x - 4, y - 4, 8, 8, col); ctx.globalAlpha = 1; }
}
function drawFloor(act, a) {
  if (a <= 0) return; const P = ACTPAL[act];
  ctx.globalAlpha = a;
  rect(0, 92, LW, 1, P.line);
  for (let y = 100; y < 248; y += 6) { const d = Math.max(2, 14 - Math.floor((y - 100) / 14)); for (let x = (y * 3) % d; x < LW; x += d) rect(x, y, 1, 1, ((x + y) & 3) ? P.floor : P.line); }
  for (let i = 0; i < 10; i++) { const t = RM ? 0 : B.t, x = (i * 37 + t * (4 + i % 3) * 3) % LW, y = 110 + ((i * 53) % 130) + Math.sin(t + i) * 4; rect(x, y, 1, 1, P.mote); }
  ctx.globalAlpha = 1;
}
function drawFoe(f, i) {
  if (f.dead) return;
  const T_ = f.T, sc = f.sc, [w, h] = sprSize(f.spr, sc), boss = B.boss && B.boss.f === f;
  let lx = f.lt > 0 && boss ? -Math.round(Math.sin((1 - f.lt / .2) * Math.PI) * 18) : 0, ly = 0;
  if (f.anim && !boss) {
    const A = f.anim, hp = A.hit / A.dur, p = A.t / A.dur, go = p < hp ? ease(p / hp) : 1 - ease((p - hp) / (1 - hp));
    if (A.kind === 'leap') { lx = A.tx * .8 * go; ly = A.ty * go - Math.sin(Math.min(1, p / hp) * Math.PI) * 26 * (p < hp ? 1 : 0); }
    else if (A.kind === 'lunge') lx = A.tx * .75 * go;
    else if (A.kind === 'dive') { lx = A.tx * .85 * go; ly = (A.ty + 14) * go; }
    else if (A.kind === 'shoot') lx = 6 * (p < hp ? 1 - p / hp : 0);
  }
  if (boss) {
    const bx = Math.round(f.x + f.ox + f.kx + lx - w / 2), by = f.y - h - Math.round((f.drop || 0) * 340);
    rect(f.x - 80, f.y, 160, 3, '#1a1a22');
    drawBossBody(f, bx, by);
    const bw = 46, byy = f.y - 228;
    if (B.boss.st === 'fight') { bar(f.x - bw / 2 - 20, f.y + 6, bw, 2, f.wind > 0 ? 1 : 1 - f.timer / f.per, f.wind > 0 ? '#ffffff' : '#7a3a3a', '#16161c'); if (f.wind > 0) T('!', f.x - 20 - bw / 2 - 8, f.y + 2, COL.red, 1, 'c', '#000'); }
    if (f.burnT > 0) rect(f.x + 8, f.y + 6, 3, 3, '#ff9a3a'); if (f.chill > 0) rect(f.x + 14, f.y + 6, 3, 3, '#9fe6f4');
    hit(f.x - 90, f.y - 220, 180, 224, () => { B.target = i; SFX.click(); });
    return;
  }
  if (f.wind > 0 && !RM && Math.floor(B.t * 30) % 3 === 0) { const [cx, cy] = foeCenter(f), an = rnd(Math.PI * 2); B.parts.push({ x: cx + Math.cos(an) * 26, y: cy + Math.sin(an) * 26, vx: -Math.cos(an) * 90, vy: -Math.sin(an) * 90, t: 0, life: .28, col: '#ff5a5a', s: 1, g: 0 }); }
  const oy = f.wind > 0 ? -3 : 0, bob = T_.fly ? Math.round(Math.sin(B.t * 4 + f.seed) * 3) - 10 : Math.floor(B.t * 2 + f.seed) % 2;
  const x = Math.round(f.x + f.ox + f.kx + lx - w / 2), y = Math.round(f.y - h + oy + bob + ly - (f.drop || 0) * 340);
  rect(f.x + f.ox - w / 2 + 6, f.y, w - 12, boss ? 3 : 2, '#1a1a22');
  let outline = boss && B.boss.phase > 0 ? B.boss.D.crack : T_.outline || null;
  if (f.wind > 0 && Math.floor(B.t * 14) % 2) outline = '#ff5a5a';
  if (f.freeze > 0) outline = '#9fe6f4';
  const alpha = T_.ghost ? .72 + Math.sin(B.t * 6 + f.seed) * .12 : 1;
  drawSpr(f.spr, x, y, sc, f.flash > 0 || (f.inv && Math.floor(B.t * 16) % 2) ? 'flash' : '', outline, alpha);
  const bw = T_.boss ? 46 : 28, by = y - 9;
  if (!boss) bar(f.x + f.ox - bw / 2, by, bw, 3, f.hp / f.max, '#ff5a5a');
  bar(f.x + f.ox - bw / 2, by + 4, bw, boss ? 2 : 1, f.wind > 0 ? 1 : 1 - f.timer / f.per, f.wind > 0 ? '#ffffff' : '#7a3a3a', '#16161c');
  if (f.wind > 0) T('!', f.x + f.ox, by - 14, COL.red, 1, 'c', '#000');
  if (f.burnT > 0) rect(f.x + f.ox + bw / 2 + 2, by, 3, 3, '#ff9a3a');
  if (f.chill > 0) rect(f.x + f.ox + bw / 2 + 2, by + 4, 3, 3, '#9fe6f4');
  if (i === B.target && !boss) corners(x - 4, y - 4, w + 8, h + 8, Math.floor(B.t * 4) % 2 ? COL.gold : '#b08a30', 4);
  hit(x - 6, y - 12, w + 12, h + 16, () => { B.target = i; SFX.click(); });
}
function drawFx(e) {
  const p = e.t / e.dur;
  if (e.type === 'slash') {
    const r = e.big ? 28 : 21, N = 30, s = e.big ? 3 : 2;
    for (let k = 0; k <= N; k++) {
      const q = k / N; if (q > p * 1.6 || q < p * 1.6 - .7) continue;
      const a = -2.3 + q * 2.6;
      const col = e.big ? (k % 3 ? COL.gold : '#ffffff') : (q > p * 1.6 - .2 ? '#ffffff' : '#9a9aa6');
      rect(e.x + Math.cos(a) * r - s / 2, e.y + Math.sin(a) * r * .9 - s / 2 + 4, s, s, col);
    }
  } else if (e.type === 'smear') { // thick crescent smear: the swing's motion blur, 2 frames solid then thinning
    const r = e.big ? 30 : 22, N = 22, th = e.big ? 4 : 3, k = Math.min(1, p * 2.2), fade = p < .4 ? 1 : 1 - (p - .4) / .6;
    ctx.globalAlpha = fade;
    for (let i = 0; i <= N; i++) { const q = i / N; if (q > k) break; const an = (e.flip ? 2.4 - q * 2.9 : -2.4 + q * 2.9), w = Math.max(1, Math.round(th * Math.sin(q * Math.PI))); const x = e.x + Math.cos(an) * r, y = e.y + Math.sin(an) * r * .8; rect(x - w / 2, y - w / 2, w, w, i > N * k - 4 ? '#ffffff' : e.col); }
    ctx.globalAlpha = 1;
  } else if (e.type === 'zap') { const k = e.t / e.dur; ctx.globalAlpha = 1 - k; let px = e.x, py = e.y; for (let i = 1; i <= 8; i++) { const nx = e.x + (e.x2 - e.x) * i / 8 + (i < 8 ? rnd(-5, 5) : 0), ny = e.y + (e.y2 - e.y) * i / 8 + (i < 8 ? rnd(-5, 5) : 0); const n = Math.ceil(Math.hypot(nx - px, ny - py)); for (let j = 0; j < n; j++) rect(Math.round(px + (nx - px) * j / n), Math.round(py + (ny - py) * j / n), 2, 2, j % 3 ? e.col : '#ffffff'); px = nx; py = ny; } ctx.globalAlpha = 1;
  } else if (e.type === 'pillar') { // holy light column
    const a = 1 - p; ctx.globalAlpha = a; rect(e.x - 6, 0, 12, e.y, '#ffe070'); rect(e.x - 2, 0, 4, e.y, '#ffffff'); ctx.globalAlpha = 1;
  } else if (e.type === 'nova') {
    const s = Math.round(8 + p * 90); ctx.globalAlpha = 1 - p; frame(e.x - s, e.y - s * .6, s * 2, s * 1.2, e.col); frame(e.x - s + 3, e.y - s * .6 + 3, s * 2 - 6, s * 1.2 - 6, '#ffffff'); ctx.globalAlpha = 1;
  } else if (['shock', 'rock', 'roots', 'arc', 'wave', 'shard'].includes(e.type)) { drawBossFx(e);
  } else if (e.type === 'ring') {
    const s = Math.round(4 + p * 22); ctx.globalAlpha = 1 - p; frame(e.x - s, e.y - s, s * 2, s * 2, e.col); ctx.globalAlpha = 1;
  } else if (e.type === 'drop') {
    const y = e.y - Math.round(Math.min(1, p * 2) * 26); ctx.globalAlpha = p > .7 ? (1 - p) / .3 : 1;
    drawItemCell(e.it, e.x - 10, y - 10, 20, false, false);
    if (Math.floor(e.t * 10) % 2) rect(e.x + 8, y - 12, 2, 2, RAR[e.it.rar].c);
    ctx.globalAlpha = 1;
  }
}
function drawHud() {
  const A = ACTS[B.act];
  if (B.boss && B.boss.exp > .5) { ctx.globalAlpha = .82; rect(0, 250, LW, AH - 250, '#000'); rect(0, 0, LW, 44, '#000'); ctx.globalAlpha = 1; }
  T(A.roman + '-' + (B.li % 3 + 1) + '  ' + LEVELS[B.li].n, 8, 6, A.c);
  if (B.combo >= 3) { const big = B.combo >= 10; T(B.combo + ' hits', 312, 19, big ? COL.gold : COL.white, 1, 'r', '#000'); }
  if (B.streak >= 2) T('chain +' + Math.round(Math.min(TUNE.chainMax, TUNE.chainStep * B.streak) * 100) + '%', 312, 31, B.streak >= 10 ? '#ff7a5a' : COL.gold, 1, 'r', '#000');
  T('Wave ' + (B.wave + 1) + '/3', 312, 6, COL.dim, 1, 'r');
  drawBossBar();
  let bx = 8, byy = B.boss ? 42 : 19; [['dmg', '#5a8cff', 'DMG+'], ['spd', '#5fd06a', 'SPD+'], ['heal', '#ff5a50', 'HEAL']].forEach(([k, c, n]) => { if (B.buff[k] > 0) { T(n, bx, byy, c); bx += textW(n) + 6; } });
  if (B.tip) T(B.tip.txt, 160, 34, COL.dim, 1, 'c');
  if (!save.tut && B.state === 'fight') { if (Math.floor(B.t * 2) % 2 === 0) T(TOUCH ? 'Tap STRIKE when the line is on gold' : 'Press J when the line is on gold', 160, 34, COL.gold, 1, 'c'); }
  ornDivider(6, 252, 308, '#6a5426');
  // portraits
  B.units.forEach((u, i) => {
    const x = 8 + i * 38, y = 257, act = u.id === save.active;
    slotBox(x, y, 34, 22, act ? TINT[u.id] : null);
    if (u.dead) drawSpr('grave', x + 3, y + 4, 1, 'dim'); else drawChar(u.c, x + 4, y + 5, 1, '', { noCape: true, spr: u.spr });
    T('' + (i + 1), x + 21, y + 4, act ? COL.white : COL.dim);
    bar(x + 3, y + 18, 28, 2, u.hp / u.max, u.dead ? '#333' : '#7ee07e', '#1a1620');
    hit(x, y, 34, 22, () => switchTo(i));
  });
  const au = activeUnit();
  if (au) T(charName(au.c), 312, 259, TINT[au.id], 1, 'r');
  drawTimingBar(au);
  if (!TOUCH) T('J strike   1 2 3 swap   Esc menu', 160, 305, '#4a4452', 1, 'c');
}
const TINT = { warrior: '#ffd35a', archer: '#7ee07e', mage: '#b48cff' };
function drawTimingBar(au) {
  const W = 228, H = 12, Y = 285, ready = B.cd <= 0 && B.state === 'fight', { g, p } = zones();
  const tint = au ? TINT[au.id] : '#8a8a96', pat = bossPat() || {};
  const X = 46 + (B.barShake > 0 && !RM ? Math.round(rnd(-2, 2) * B.barShake / .3) : 0);
  // beveled stone frame with gilded rivets, tinted per character
  rect(X - 4, Y - 4, W + 8, H + 8, '#000');
  rect(X - 3, Y - 3, W + 6, 1, '#56506a'); rect(X - 3, Y - 3, 1, H + 6, '#56506a');
  rect(X - 3, Y + H + 2, W + 6, 1, '#24202c'); rect(X + W + 2, Y - 3, 1, H + 6, '#24202c');
  rect(X - 2, Y - 2, W + 4, 1, '#3a3444'); rect(X - 2, Y + H + 1, W + 4, 1, '#16131a'); rect(X - 2, Y - 2, 1, H + 4, '#3a3444'); rect(X + W + 1, Y - 2, 1, H + 4, '#16131a');
  frame(X - 1, Y - 1, W + 2, H + 2, ready ? tint : '#2e2a36');
  for (const [rx, ry] of [[X - 5, Y - 5], [X + W + 2, Y - 5], [X - 5, Y + H + 2], [X + W + 2, Y + H + 2]]) { rect(rx, ry, 3, 3, '#6a5426'); rect(rx + 1, ry + 1, 1, 1, tint); rect(rx, ry, 1, 1, '#d8b04a'); }
  // fill, faint tint
  rect(X, Y, W, H, '#09080c'); ctx.globalAlpha = .08; rect(X, Y, W, H, tint); ctx.globalAlpha = 1;
  // good zone with dithered edges
  const gx = X + Math.round((B.zc - g / 2) * W), gw = Math.round(g * W), gc = ready ? '#2f6a3a' : '#1a2a1e', gl = ready ? '#3f8a4a' : '#22362a';
  rect(gx + 3, Y + 2, gw - 6, H - 4, gc); rect(gx + 3, Y + 2, gw - 6, 1, gl);
  for (let k = 0; k < 3; k++) for (let yy = Y + 2; yy < Y + H - 2; yy++) {
    if ((yy + k) % (k === 0 ? 1 : k === 1 ? 2 : 3) === 0) { rect(gx + k, yy, 1, 1, gc); rect(gx + gw - 1 - k, yy, 1, 1, gc); }
  }
  // perfect zone: pulse + shimmer (blinks in some boss phases)
  const px = X + Math.round((B.zc - p / 2) * W), pw = Math.max(2, Math.round(p * W));
  const hidden = pat.blink && Math.floor(B.t * 5) % 3 === 0;
  if (!hidden) {
    const pulse = RM ? 0 : (Math.sin(B.t * 8) + 1) / 2;
    rect(px, Y + 1, pw, H - 2, ready ? (pulse > .6 ? '#ffe27a' : COL.gold) : '#5a4a20');
    rect(px, Y + 1, pw, 1, ready ? '#fff4b8' : '#6a5a2a'); rect(px, Y + H - 2, pw, 1, ready ? '#c89a2a' : '#4a3a18');
    if (ready) { for (let yy = Y + 1; yy < Y + H - 1; yy += 2) { rect(px - 1, yy, 1, 1, '#a8842e'); rect(px + pw, yy + 1, 1, 1, '#a8842e'); } }
    if (ready && !RM) { const sx = px + Math.floor((B.t * 30) % (pw + 6)) - 3; if (sx >= px && sx < px + pw) rect(sx, Y + 2, 1, H - 4, '#ffffff'); }
  }
  // class bar variants
  const bv = unitBar(au);
  if (bv === 'twin' && !hidden) { const px2 = X + Math.round((B.zc2 - p / 2) * W); rect(px2, Y + 1, pw, H - 2, ready ? '#ffd35a' : '#5a4a20'); rect(px2, Y + 1, pw, 1, ready ? '#fff4b8' : '#6a5a2a'); rect(px2 - 1, Y + 1, 1, H - 2, '#a8842e'); rect(px2 + pw, Y + 1, 1, H - 2, '#a8842e'); }
  if (bv === 'guard') { const ww = Math.round(g * .6 * W), wx = X + Math.round(B.zw * W) - (ww >> 1); rect(wx, Y + 3, ww, H - 6, ready ? '#2a4fa8' : '#1a2440'); rect(wx, Y + 3, ww, 1, ready ? '#a6caff' : '#2a3450'); for (let yy = Y + 4; yy < Y + H - 3; yy += 2) rect(wx + (ww >> 1), yy, 1, 1, '#a6caff'); }
  if (bv === 'snipe' && ready) { ctx.globalAlpha = .5; rect(px - 3, Y - 2, 1, H + 4, '#ff5a5a'); rect(px + pw + 2, Y - 2, 1, H + 4, '#ff5a5a'); ctx.globalAlpha = 1; }
  if (bv === 'frost' && B.slowT > 0) { ctx.globalAlpha = .25 * B.slowT / 1.2; rect(X, Y, W, H, '#9fe6f4'); ctx.globalAlpha = 1; for (let k = 0; k < 6; k++) rect(X + ((k * 41 + Math.floor(B.t * 10)) % W), Y + (k * 5) % H, 1, 1, '#e8ffff'); }
  if (bv === 'rage' && B.combo > 0) { const k = Math.min(1, B.combo / 14); ctx.globalAlpha = .1 + .2 * k; rect(X, Y + H - 2, Math.round(W * k), 2, '#ff3a3a'); ctx.globalAlpha = 1; }
  if (bv === 'heat') for (let k = 0; k < 5; k++) { const on = k < B.heat, gl = B.heat >= 5 && !RM && Math.floor(B.t * 8) % 2; rect(X + W / 2 - 26 + k * 11, Y + H + 4, 8, 3, on ? (gl ? '#fff3a8' : '#ff7a1a') : '#2a1a14'); }
  // tick marks
  for (let k = 1; k < 16; k++) { const tx = X + Math.round(W * k / 16), maj = k % 4 === 0; rect(tx, Y + H - (maj ? 3 : 2), 1, maj ? 3 : 2, maj ? '#4a4452' : '#2a2632'); rect(tx, Y, 1, maj ? 2 : 1, maj ? '#4a4452' : '#2a2632'); }
  // hit flash
  if (B.flash) {
    const k = B.flash.t / .3, c = B.flash.q === 'perfect' ? '#ffffff' : B.flash.q === 'good' ? '#bfffbf' : '#ff5a5a';
    ctx.globalAlpha = k * (RM ? .2 : .45); rect(X, Y, W, H, c); ctx.globalAlpha = 1;
    const fx = X + Math.round(B.flash.x * W), n = B.flash.q === 'perfect' ? 12 : 6;
    for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n + .3, r = (1 - k) * (B.flash.q === 'perfect' ? 18 : 11); rect(fx + Math.round(Math.cos(a) * r), Y + 6 + Math.round(Math.sin(a) * r * .7), 2, 2, B.flash.q === 'perfect' ? (i % 2 ? COL.gold : '#ffffff') : B.flash.q === 'good' ? COL.green : '#ff5a5a'); }
  }
  // miss crack
  if (B.crackFx) {
    const cx = X + Math.round(B.crackFx.x * W), a = clamp(B.crackFx.t / .4, 0, 1), s = B.crackFx.s;
    ctx.globalAlpha = a; let x = cx;
    for (let yy = Y - 2; yy < Y + H + 2; yy++) { rect(x, yy, 1, 1, '#ff5a5a'); rect(x + 1, yy, 1, 1, '#000'); x += ((s >> (yy - Y + 2)) & 1) ? 1 : -1; if (yy === Y + 4) { rect(x - 2, yy + 1, 2, 1, '#ff5a5a'); rect(x - 4, yy + 2, 2, 1, '#ff5a5a'); } }
    ctx.globalAlpha = 1;
  }
  // marker: a small pixel sword with a motion trail
  if (B.state === 'fight' || B.state === 'intro') { B.trail.push(B.mk); if (B.trail.length > 6) B.trail.shift(); }
  B.trail.forEach((m, i) => { ctx.globalAlpha = (i + 1) / B.trail.length * .35; rect(X + Math.round(m * (W - 2)), Y + 1, 2, H - 2, ready ? tint : '#4a4a54'); });
  ctx.globalAlpha = 1;
  const mx = X + Math.round(B.mk * (W - 2)), mc = ready ? '#ffffff' : '#6a6a74', hc = ready ? tint : '#4a4a54';
  rect(mx, Y - 7, 2, 2, hc);           // pommel
  rect(mx, Y - 5, 2, 2, '#8a6a3a');    // grip
  rect(mx - 2, Y - 3, 6, 1, hc);       // crossguard
  rect(mx, Y - 2, 2, H + 3, mc);       // blade
  rect(mx, Y + H + 1, 1, 1, mc);       // tip
  rect(mx + 1, Y - 2, 1, H + 3, ready ? '#c8c8d4' : '#55555e');
  if (!ready && B.state === 'fight' && au) bar(X, Y + H + 4, W, 1, 1 - B.cd / au.s.cd, '#5a5a66', '#000');
  // pop text in the game font
  if (B.label) {
    const q = B.label.q, k = 1 - B.label.t / .7, txt = q === 'perfect' ? 'Perfect!' : q === 'good' ? 'Good' : 'Miss';
    const col = q === 'perfect' ? COL.gold : q === 'good' ? COL.green : '#ff6a6a', sc = q === 'perfect' && k < .5 ? 2 : 1;
    const lx = clamp(X + Math.round((B.flash ? B.flash.x : B.label.x || .5) * W), 40, 280);
    if (B.flash) B.label.x = B.flash.x;
    ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
    T(txt, lx, Y - 13 - sc * 6 - Math.round(k * 6) + (sc === 2 ? 0 : 6), col, sc, 'c', '#000');
    ctx.globalAlpha = 1;
  }
  if (!TOUCH) { slotBox(14, Y - 2, 18, 16, ready ? tint : null); T('J', 23, Y + 1, ready ? COL.white : COL.dim, 1, 'c'); }
  if (B.streak >= 2) T('x' + B.streak, 306, Y + 1, COL.gold, 1, 'r');
}
function drawResult() {
  UI = UI.filter(() => false);
  ctx.globalAlpha = .7; rect(0, 0, LW, AH, '#000'); ctx.globalAlpha = 1;
  const win = B.state === 'win';
  panel(40, 70, 240, 170, win ? COL.gold : COL.red);
  T(win ? 'Level clear!' : 'Defeated', 160, 82, win ? COL.gold : COL.red, 2, 'c');
  T('XP +' + B.xp + '    perfect hits ' + B.perf, 160, 112, COL.white, 1, 'c');
  if (B.loot.length) {
    T('Loot', 160, 130, COL.dim, 1, 'c');
    const n = Math.min(8, B.loot.length), sx = 160 - n * 13;
    B.loot.slice(0, 8).forEach((it, i) => drawItemCell(it, sx + i * 26, 144, 24, false, false));
    if (B.loot.length > 8) T('+' + (B.loot.length - 8), 270, 150, COL.dim, 1, 'r');
  } else T('no loot this time', 160, 140, COL.dark, 1, 'c');
  if (!win) { T('Loot and XP are kept.', 160, 180, COL.dim, 1, 'c'); T('Gear up, spend points, try again.', 160, 193, COL.dim, 1, 'c'); }
  if (B.st <= 0) { if (Math.floor(gtime * 2) % 2 === 0) T(TOUCH ? 'tap to continue' : 'J to continue', 160, 218, COL.white, 1, 'c'); hit(0, 0, LW, LH, leaveBattle); }
}
function drawPause() {
  UI = [];
  ctx.globalAlpha = .75; rect(0, 0, LW, AH, '#000'); ctx.globalAlpha = 1;
  panel(80, 86, 160, 140, '#8a8a96');
  T('Paused', 160, 96, COL.white, 2, 'c');
  btn(100, 128, 120, 22, 'Resume', () => { B.paused = false; SFX.click(); });
  btn(100, 156, 120, 22, 'Retreat', () => { B.loot = B.loot; persist(); B.msgs = []; leaveBattle(); SFX.click(); }, { col: COL.red });
  btn(100, 184, 120, 22, save.mute ? 'Sound off' : 'Sound on', () => { save.mute = !save.mute; persist(); });
}
// ---------- touch strip ----------
function drawStrip() {
  if (!TOUCH) return;
  rect(0, AH, LW, STRIP, '#000');
  const y = AH + 6, h = STRIP - 12;
  if (scene === 'battle' && B && !B.paused && (B.state === 'fight' || B.state === 'intro' || B.state === 'clear' || B.state === 'boss')) {
    const ready = B.cd <= 0 && B.state === 'fight';
    btn(8, y, 196, h, 'STRIKE', strike, { sc: 2, col: ready ? COL.gold : COL.dim, border: ready ? COL.gold : '#3a3a44', fill: ready ? '#16140a' : '#0c0c10' });
    btn(210, y, 50, h, 'Swap', cycleUnit, { dis: B.units.filter(u => !u.dead).length < 2 });
    btn(266, y, 46, h, 'Menu', () => { B.paused = true; SFX.click(); });
  } else if (scene === 'title' || scene === 'msg' || (scene === 'battle' && B && (B.state === 'win' || B.state === 'lose') && B.st <= 0)) {
    btn(8, y, 304, h, 'Continue', onJ, { sc: 2 });
  } else if (scene === 'camp') {
    btn(8, y, 304, h, 'Fight', () => startLevel(save.sel), { sc: 2, col: COL.gold, border: COL.gold });
  }
}

// ================= loop & input =================
function onJ() {
  audio();
  if (scene === 'title') { confirmNew = 0; save.started = true; goto('camp'); }
  else if (scene === 'camp') startLevel(save.sel);
  else if (scene === 'msg') nextMsg();
  else if (scene === 'battle' && B) {
    if (B.paused) return;
    if ((B.state === 'win' || B.state === 'lose') && B.st <= 0) leaveBattle();
    else strike();
  }
}
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'KeyJ' || e.code === 'Space')) return;
  audio();
  const k = e.code;
  if (k === 'KeyJ' || k === 'Space' || k === 'Enter') { e.preventDefault(); onJ(); return; }
  if (k === 'KeyM') { save.mute = !save.mute; persist(); }
  if (scene === 'battle' && B) {
    if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') switchTo(+k.slice(5) - 1);
    if (k === 'Tab') { e.preventDefault(); cycleUnit(); }
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
      const live = B.foes.map((f, i) => f.dead ? -1 : i).filter(i => i >= 0); if (live.length) { const p = live.indexOf(B.target); B.target = live[(p + (k === 'ArrowUp' || k === 'KeyW' ? -1 : 1) + live.length) % live.length]; SFX.click(); }
    }
    if ((k === 'Escape' || k === 'KeyP') && B.state !== 'win' && B.state !== 'lose') { B.paused = !B.paused; SFX.click(); }
  } else if (k === 'Escape') {
    if (scene === 'gear' || scene === 'skills' || scene === 'party') goto('camp');
  }
});
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width - OX, y: (e.clientY - r.top) * VH / r.height - OY }; }
const ptrs = new Map(); let pinch0 = 0, dragMoved = 0, dragPend = null;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audio(); mouse = toLogical(e); ptrs.set(e.pointerId, mouse);
  if (ptrs.size === 2 && scene === 'skills') { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dragPend = null; return; }
  for (let i = UI.length - 1; i >= 0; i--) { const b = UI[i]; if (mouse.x >= b.x && mouse.x < b.x + b.w && mouse.y >= b.y && mouse.y < b.y + b.h) {
    // inside the skill tree: wait for release so a drag pans instead of clicking
    if (scene === 'skills' && mouse.y >= TREE_CLIP[1] && mouse.y < TREE_CLIP[1] + TREE_CLIP[3] && (b.drag || b.y >= TREE_CLIP[1] && b.y < TREE_CLIP[1] + TREE_CLIP[3] - 30)) { dragPend = { fn: b.fn, x: mouse.x, y: mouse.y }; dragMoved = 0; treeDrag = { x: mouse.x, y: mouse.y }; return; }
    b.fn(); return; } }
  if (scene === 'title') onJ();
});
cv.addEventListener('pointermove', e => {
  const m = toLogical(e); if (e.pointerType === 'mouse') mouse = m;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, m);
  if (scene === 'skills' && ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (d > pinch0 * 1.4) { treeZoom(1); pinch0 = d; } else if (d < pinch0 / 1.4) { treeZoom(-1); pinch0 = d; } return; }
  if (scene === 'skills' && treeDrag && ptrs.has(e.pointerId)) { const dx = m.x - treeDrag.x, dy = m.y - treeDrag.y; dragMoved += Math.abs(dx) + Math.abs(dy); treePan(dx, dy); treeDrag = { x: m.x, y: m.y }; }
});
const endPtr = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (dragPend && dragMoved < 6) dragPend.fn(); dragPend = null; treeDrag = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { if (scene !== 'skills') return; e.preventDefault(); if (e.ctrlKey || Math.abs(e.deltaY) > 40 && !e.shiftKey && e.deltaMode === 0 && Math.abs(e.deltaX) < 1 && false) treeZoom(e.deltaY < 0 ? 1 : -1); else if (e.altKey) treeZoom(e.deltaY < 0 ? 1 : -1); else treePan(-e.deltaX * .5, -e.deltaY * .5); }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && B && B.state === 'fight') B.paused = true; persist(); });

let last = performance.now();
function drawVoid() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#0e0d12';
  for (let y = ((OY % 8) + 8) % 8; y < VH; y += 8) for (let x = ((OX % 8) + 8) % 8; x < VW; x += 8) ctx.fillRect(x, y, 1, 1);
}
const WAM = window.WAM = { toCss: (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + (x + OX) * r.width / VW, y: r.top + (y + OY) * r.height / VH }; }, get save() { return save; }, get B() { return B; }, get scene() { return scene; }, startLevel, strike, zones, switchTo, onJ, TUNE, bot: 0, timeScale: 1, goto: s => { scene = s; } };
function botTick() {
  // test helper only: WAM.bot = accuracy 0..1 auto-presses J for recordings/tests
  if (!WAM.bot || !B || B.state !== 'fight' || B.paused || B.cd > 0) return;
  const { p, g } = zones(), d = Math.abs(B.mk - B.zc);
  if (!B._botAim) B._botAim = Math.random() < WAM.bot ? p * .35 : Math.random() < .6 ? g * .42 : 1;
  if (d <= B._botAim) { strike(); B._botAim = 0; }
  else if (B._botAim >= 1 && Math.random() < .02) { strike(); B._botAim = 0; }
}
function loop(now) {
  let dt = Math.min(.05, (now - last) / 1000) * WAM.timeScale; last = now; gtime += dt;
  try {
    botTick();
    if (scene === 'battle' && B) updateBattle(dt);
    UI = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawVoid();
    const qa = scene === 'battle' && B ? B.quake * (RM ? .25 : 1) : 0;
    ctx.setTransform(1, 0, 0, 1, OX + (qa ? Math.round(rnd(-qa, qa)) : 0), OY + (qa ? Math.round(rnd(-qa, qa)) : 0));
    if (scene === 'title') drawTitle();
    else if (scene === 'camp') drawCamp();
    else if (scene === 'gear') drawGear();
    else if (scene === 'skills') drawSkills();
    else if (scene === 'party') drawParty();
    else if (scene === 'msg') drawMsg();
    else if (scene === 'battle' && B) drawBattle();
    drawStrip();
    if (scene === 'battle' && B) drawBossOverlay();
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}
loadSave();
if (DEBUG) {
  // ?debug : everything unlocked for tweaking
  save.started = true; save.unlocked = 11; save.act4 = true; save.cleared = save.cleared.map((c, i) => i < 9 ? true : c);
  ['archer', 'mage'].forEach(addChar); if (!save.goblets.length) save.goblets = ['blue', 'green', 'red'];
  save.party.forEach(id => { const c = save.chars[id]; if (c.lvl < 14) c.lvl = 14; });
  save.perfects = Math.max(save.perfects, TUNE.act4Perfects);
}
requestAnimationFrame(loop);
