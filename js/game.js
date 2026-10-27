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
  markerSpeed: 0.95,      // timing-bar sweeps per second (base)
  goodZone: 0.24,         // width of the GOOD zone (fraction of bar)
  perfectZone: 0.065,     // width of the PERFECT zone
  perfectMult: 2.0,       // damage multiplier for perfect
  missMult: 0,            // damage multiplier for a miss
  autoCdMul: 1.55,        // allies auto-attack this much slower than their cooldown
  autoDmgMul: 0.8,        // allies' auto attack damage
  foeHp: 20, foeHpGrow: 1.42,
  foeDmg: 4.6, foeDmgGrow: 1.36,
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
const EVO = {
  knight: { n: 'Knight', spr: 'knight', d: ['+35% life, +8 armor', 'Foes target you more', 'Perfect hits raise a guard that halves the next blow'], hpMul: 1.35, arm: 8, dmgMul: .95, taunt: 3, guard: 1 },
  berserker: { n: 'Berserker', spr: 'berserker', d: ['+25% damage, faster swings', 'Timing bar runs 20% faster', 'Heals 8% of damage; hits harder when hurt'], dmgMul: 1.25, cdMul: .85, hpMul: .9, mark: 1.2, steal: .08, rage: 1 },
  ranger: { n: 'Ranger', spr: 'ranger', d: ['Every shot also hits all other foes for 45%', 'Wide crowd control'], multi: .45, cdMul: 1.05 },
  sniper: { n: 'Sniper', spr: 'sniper', d: ['Perfect hits deal 3.5x', 'Slower shots, tighter perfect zone', '+10% crit'], perfMult: 3.5, cdMul: 1.35, perfZ: .8, crit: 10 },
  pyro: { n: 'Pyromancer', spr: 'pyro', d: ['Blasts set all foes ablaze', 'Burn deals 40% of the hit over 3s'], burn: .4, dmgMul: 1.05 },
  cryo: { n: 'Cryomancer', spr: 'cryo', d: ['Hits chill foes: they attack 40% slower', 'Perfect hits freeze foes for 1.2s'], chill: 1, freeze: 1.2, dmgMul: .9 },
};
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
  slime: { n: 'Slime', spr: 'slime', hp: 1, dmg: .8, per: 2.4, wind: .55, sc: 4 },
  bigslime: { n: 'Big Slime', spr: 'slime', hp: 2.4, dmg: 1.1, per: 2.8, wind: .6, sc: 5 },
  bat: { n: 'Bat', spr: 'bat', hp: .6, dmg: .6, per: 1.4, wind: .35, sc: 4, fly: 1 },
  goblin: { n: 'Goblin', spr: 'goblin', hp: 1, dmg: 1, per: 2.0, wind: .45, sc: 4 },
  gobchief: { n: 'Goblin Chief', spr: 'gobchief', hp: 5, dmg: 1.5, per: 2.6, wind: .7, sc: 5, boss: 1, slam: 3 },
  shroom: { n: 'Shroom', spr: 'shroom', hp: 1.1, dmg: .9, per: 2.2, wind: .5, sc: 4 },
  wolf: { n: 'Wolf', spr: 'wolf', hp: .8, dmg: 1.1, per: 1.3, wind: .35, sc: 4 },
  treant: { n: 'Elder Treant', spr: 'treant', hp: 6, dmg: 1.6, per: 3.0, wind: .8, sc: 5, boss: 1, slam: 2 },
  skel: { n: 'Skeleton', spr: 'skel', hp: 1, dmg: 1, per: 1.8, wind: .45, sc: 4, revive: 1 },
  ghost: { n: 'Ghost', spr: 'ghost', hp: .7, dmg: 1.2, per: 2.0, wind: .45, sc: 4, ghost: 1, fly: 1 },
  darkknight: { n: 'Dark Knight', spr: 'darkknight', hp: 7, dmg: 1.7, per: 2.2, wind: .55, sc: 5, boss: 1, plated: 1, slam: 3, outline: '#5a5a66' },
  shade: { n: 'Shade', spr: 'shade', hp: .8, dmg: 1, per: 1.2, wind: .3, sc: 4, outline: '#5a3d8a', fly: 1 },
  eye: { n: 'Void Eye', spr: 'eye', hp: 1, dmg: .9, per: 2.4, wind: .5, sc: 4, stare: 1, fly: 1, outline: '#5a3d8a' },
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
  { n: 'Slime Meadow', w: [['slime'], ['slime', 'slime'], ['bigslime']] },
  { n: 'Bat Cave', w: [['bat', 'bat'], ['bat', 'slime', 'bat'], ['bat', 'bat', 'bat']] },
  { n: 'Goblin Camp', w: [['goblin'], ['goblin', 'goblin'], ['gobchief']] },
  { n: 'Spore Grove', w: [['shroom', 'shroom'], ['shroom', 'shroom', 'shroom'], ['shroom', 'wolf', 'shroom']] },
  { n: 'Wolf Den', w: [['wolf'], ['wolf', 'wolf'], ['wolf', 'wolf', 'wolf']] },
  { n: 'Elder Root', w: [['wolf', 'shroom'], ['shroom', 'wolf', 'shroom'], ['treant']] },
  { n: 'Bone Hall', w: [['skel'], ['skel', 'skel'], ['skel', 'skel', 'skel']] },
  { n: 'Haunted Stair', w: [['ghost'], ['ghost', 'skel'], ['ghost', 'ghost', 'ghost']] },
  { n: 'Throne Room', w: [['skel', 'ghost'], ['skel', 'ghost', 'skel'], ['darkknight']] },
  { n: 'Hollow Shore', w: [['shade'], ['shade', 'shade'], ['shade', 'shade', 'shade']] },
  { n: 'Watching Dark', w: [['eye'], ['eye', 'shade'], ['eye', 'eye', 'eye']] },
  { n: 'The Mirror', w: [['shade', 'eye'], ['eye', 'shade', 'eye'], ['mirror']] },
];
const GOBLETS = {
  blue: { n: 'Blue Goblet', c: '#5a8cff', d: 'Below 75% life: party +25% damage for 4s', th: .75 },
  green: { n: 'Green Goblet', c: '#5fd06a', d: 'Below 50% life: party attacks 50% faster for 3s', th: .5 },
  red: { n: 'Red Goblet', c: '#ff5a50', d: 'Below 25% life: party heals 10%/s for 3s', th: .25 },
};

// ================= items =================
const SLOTS = ['weapon', 'armor', 'ring', 'charm'];
const RAR = [
  { n: 'Plain', c: '#a0a0aa' }, { n: 'Blue', c: '#5a8cff' }, { n: 'Green', c: '#5fd06a' },
  { n: 'Red', c: '#ff5a50' }, { n: 'Ancient', c: '#ffa53a' }, { n: 'White', c: '#ffffff' },
];
const MAT = ['Iron', 'Ash', 'Bone', 'Void'];
const STATN = { dmg: 'dmg', hp: 'life', arm: 'armor', crit: '% crit', spd: '% speed', zone: '% zone' };
const POOL = { weapon: ['dmg', 'spd', 'crit', 'dmg'], armor: ['hp', 'arm', 'hp'], ring: ['dmg', 'crit', 'hp', 'arm', 'zone'], charm: ['zone', 'spd', 'hp', 'dmg'] };
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
  const it = { id: save.nextId++, slot, cls: slot === 'weapon' ? cls : null, rar, ilvl, mods: {} };
  const main = { weapon: 'dmg', armor: 'hp', ring: 'crit', charm: 'zone' }[slot];
  it.mods[main] = statVal(main, ilvl, rar);
  if (slot === 'armor') it.mods.arm = statVal('arm', ilvl, rar);
  const extra = [0, 1, 1, 2, 2, 3][rar];
  for (let i = 0; i < extra; i++) { const st = pick(POOL[slot]); it.mods[st] = (it.mods[st] || 0) + statVal(st, ilvl, Math.max(0, rar - 1)); }
  const base = slot === 'weapon' ? { sword: 'Sword', bow: 'Bow', staff: 'Staff' }[CLS[cls].weapon] : { armor: 'Armor', ring: 'Ring', charm: 'Charm' }[slot];
  it.name = MAT[clamp(Math.floor((ilvl - 1) / 3), 0, 3)] + ' ' + base;
  return it;
}
function itemIcon(it) { return it.slot === 'weapon' ? CLS[it.cls].weapon : it.slot; }
function itemScore(it) { if (!it) return 0; const m = it.mods; return (m.dmg || 0) * 3 + (m.hp || 0) * .4 + (m.arm || 0) * 1.5 + (m.crit || 0) * 1.5 + (m.spd || 0) * 1.5 + (m.zone || 0) * 1.2; }
function canUse(it, cid) { return it.slot !== 'weapon' || it.cls === cid; }
function modLines(it) { return Object.entries(it.mods).map(([k, v]) => '+' + v + (STATN[k][0] === '%' ? '' : ' ') + STATN[k]); }

// ================= save =================
const SAVE_KEY = 'wam_save_v1';
let save = null;
function newChar(id, lvl) {
  return { id, lvl, xp: 0, sp: lvl - 1, stp: (lvl - 1) * 2, st: { dmg: 0, life: 0, spd: 0 }, sk: {}, evo: null, gear: { weapon: null, armor: null, ring: null, charm: null } };
}
function newSave() {
  save = { v: 1, unlocked: 0, cleared: Array(12).fill(false), sel: 0, perfects: 0, bestStreak: 0, kills: 0, party: ['warrior'], active: 'warrior',
    chars: { warrior: newChar('warrior', 1) }, inv: [], scrap: 0, goblets: [], act4: false, mute: false, nextId: 1, bestLvl: 1, tut: false, started: false };
  const sw = makeItem(1, 'weapon', 'warrior'); sw.rar = 0; sw.mods = { dmg: 2 }; save.chars.warrior.gear.weapon = sw;
  return save;
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1 && s.chars) { save = s; return true; } } catch (e) {}
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
  const C = CLS[c.id], E = c.evo ? EVO[c.evo] : {}, r = k => c.sk[k] || 0;
  let hp = C.hp * (1 + .1 * (c.lvl - 1)) + c.st.life * C.hpPer;
  let dmg = C.dmg * (1 + .08 * (c.lvl - 1)) + c.st.dmg * C.dmgPer;
  let spd = c.st.spd * 4, arm = C.arm, crit = C.crit, zone = 0;
  for (const s of SLOTS) { const it = c.gear[s]; if (!it) continue; const m = it.mods; hp += m.hp || 0; dmg += m.dmg || 0; spd += m.spd || 0; arm += m.arm || 0; crit += m.crit || 0; zone += m.zone || 0; }
  const o = { perfMult: E.perfMult || TUNE.perfectMult, perfZ: 1, goodZ: 1, cdMul: E.cdMul || 1, critDmg: 1.5, mark: E.mark || 1 };
  if (c.id === 'warrior') { dmg *= 1 + .12 * r('edge'); hp *= 1 + .08 * r('hide'); arm += 3 * r('hide'); o.perfZ *= 1 + .12 * r('focus'); o.cleave = .25 * r('cleave'); o.regen = .01 * r('wind'); o.riposte = .6 * r('riposte'); }
  if (c.id === 'archer') { o.cdMul *= 1 - .08 * r('draw'); crit += 6 * r('eye'); o.goodZ *= 1 + .1 * r('steady'); o.volley = .15 * r('volley'); o.critDmg += .25 * r('head'); o.pin = .3 * r('pin'); }
  if (c.id === 'mage') { dmg *= 1 + .12 * r('arcane'); hp *= 1 + .1 * r('ward'); arm += 3 * r('ward'); o.perfZ *= 1 + .12 * r('flow'); o.splash = .4 + .15 * r('chain'); o.barrier = 2 * r('barrier'); o.surge = .1 * r('surge'); }
  hp *= E.hpMul || 1; dmg *= E.dmgMul || 1; arm += E.arm || 0; crit += E.crit || 0; o.perfZ *= E.perfZ || 1;
  Object.assign(o, { taunt: E.taunt || 1, guard: E.guard, steal: E.steal, rage: E.rage, multi: E.multi, burn: E.burn, chill: E.chill, freeze: E.freeze });
  o.hp = Math.round(hp); o.dmg = Math.round(dmg * 10) / 10; o.cd = C.cd * o.cdMul / (1 + spd / 100); o.arm = Math.round(arm); o.crit = Math.min(75, crit); o.zone = zone;
  return o;
}
function charSpr(c) { return c.evo ? EVO[c.evo].spr : CLS[c.id].spr; }
function charName(c) { return c.evo ? EVO[c.evo].n : CLS[c.id].n; }
function giveXp(amount) {
  const ups = [];
  for (const id of save.party) {
    const c = save.chars[id]; c.xp += amount;
    while (c.xp >= xpNeed(c.lvl)) { c.xp -= xpNeed(c.lvl); c.lvl++; c.sp += 1; c.stp += 2; ups.push(id); }
  }
  return ups;
}
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
    buff: { dmg: 0, spd: 0, heal: 0 }, gobUsed: {}, label: null, flash: null, banner: null, paused: false, msgs: [], quake: 0, zBase: .5, boss: null, trail: [], crackFx: null, barShake: 0 };
  B.units = save.party.map((id, i) => {
    const c = save.chars[id], s = calcStats(c), [x, y] = PPOS[n][i];
    return { id, c, s, hp: s.hp, max: s.hp, x, y, ox: -60, lt: 0, hurt: 0, atkT: rnd(.4, 1.2), dead: false, guard: 0, spr: charSpr(c) };
  });
  const bar = B.units.reduce((a, u) => a + (u.s.barrier || 0), 0);
  B.units.forEach(u => u.s.arm += bar);
  if (!save.party.includes(save.active)) save.active = save.party[0];
  spawnWave(0);
  scene = 'battle';
  banner(ACTS[B.act].roman + '-' + (li % 3 + 1) + '  ' + LEVELS[li].n, ACTS[B.act].c, 1.4);
}
function spawnWave(w) {
  const keys = LEVELS[B.li].w[w], n = keys.length;
  B.foes = keys.map((k, i) => {
    const T = FOES[k], L = B.li + 1, [x, y] = FPOS[n][i];
    const hp = Math.round(TUNE.foeHp * Math.pow(TUNE.foeHpGrow, L - 1) * T.hp);
    return { k, T, L, hp, max: hp, dmg: TUNE.foeDmg * Math.pow(TUNE.foeDmgGrow, L - 1) * T.dmg, timer: T.per * rnd(.7, 1.1) + .9, wind: 0,
      x, y, spr: T.spr, sc: T.sc, ox: 90 + i * 12, flash: 0, kx: 0, dead: false, burnT: 0, burnDps: 0, burnAcc: 0, chill: 0, freeze: 0, lt: 0, atk: 0, reviveT: 0, seed: rnd(10) };
  });
  B.target = B.foes.findIndex(f => f.T.boss) >= 0 ? B.foes.findIndex(f => f.T.boss) : 0;
  B.gobUsed = {};
  const bf = B.foes.find(f => f.T.boss && BOSS[f.k]); if (bf) bossStart(bf);
  const tip = keys.map(k => FOE_TIPS[k]).find(Boolean);
  if (tip && w === 0) B.tip = { txt: tip, t: 3.5 };
}
const activeUnit = () => B.units.find(u => u.id === save.active && !u.dead);
const liveFoes = () => B.foes.filter(f => !f.dead);
function sprSize(key, sc) { const r = SPR[key]; return [r[0].length * sc, r.length * sc]; }
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
  const g = clamp(TUNE.goodZone * u.s.goodZ * zm, .08, .6);
  const pat = bossPat(), bz = pat && pat.zone || 1;
  const p = clamp(TUNE.perfectZone * u.s.perfZ * zm * bz, .02, g * .8);
  return { g: g * bz, p };
}
function markerSpeed() {
  const u = activeUnit(); let v = TUNE.markerSpeed * (1 + .07 * B.act) * (u ? u.s.mark : 1);
  v *= 1 + .15 * liveFoes().filter(f => f.T.stare).length;
  const pat = bossPat(); if (pat && pat.spd) v *= pat.spd;
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
  const q = d <= p / 2 ? 'perfect' : d <= g / 2 ? 'good' : 'miss';
  B.cd = u.s.cd * (B.buff.spd > 0 ? .67 : 1);
  B.flash = { q, t: .3, x: B.mk };
  if (q === 'perfect') { save.perfects++; B.streak++; B.perf++; save.bestStreak = Math.max(save.bestStreak, B.streak); }
  else if (q === 'miss') B.streak = 0;
  B.label = { q, t: .7, x: B.mk };
  B.zc = B.zBase = rnd(.18, .82);
  if (q === 'miss') { B.barShake = .3; B.crackFx = { x: B.flash.x, t: .7, s: Math.floor(rnd(1000)) }; }
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
  if (B.buff.dmg > 0) dmg *= 1.25;
  if (u.s.rage) dmg *= 1 + Math.min(.4, (1 - u.hp / u.max) * .6);
  if (u.s.surge && manual && B.streak >= 5) dmg *= 1 + u.s.surge;
  const crit = Math.random() * 100 < u.s.crit; if (crit) dmg *= u.s.critDmg;
  const info = { q, crit, manual };
  if (manual && q === 'perfect') {
    B.hitstop = .055; B.shake = Math.max(B.shake, 3);
    if (f.wind > 0) { f.wind = 0; f.timer = f.T.per; SFX.parry(); num(foeCenter(f)[0], foeCenter(f)[1] - 22, 'PARRY!', COL.blue); if (u.s.riposte) dmg *= 1 + u.s.riposte; }
    if (u.s.pin) f.timer += u.s.pin;
    if (u.s.guard) u.guard = 1;
  }
  const atk = CLS[u.id].atk, hs = manual ? SFX[q] : SFX.auto;
  if (atk === 'slash') {
    hs(); const [cx, cy] = foeCenter(f);
    B.fx.push({ type: 'slash', x: cx, y: cy, t: 0, dur: .2, big: q === 'perfect' && manual });
    hitFoe(f, dmg, info, u);
    if (u.s.cleave && q === 'perfect') liveFoes().filter(o => o !== f).forEach(o => { const [ox, oy] = foeCenter(o); B.fx.push({ type: 'slash', x: ox, y: oy, t: 0, dur: .16 }); hitFoe(o, dmg * u.s.cleave, { q: 'splash' }, u); });
  } else if (atk === 'arrow') {
    SFX.arrow();
    shoot(u, f, 'arrow', () => { hs(); hitFoe(f, dmg, info, u); });
    if (u.s.volley && Math.random() < u.s.volley) { const o = pick(liveFoes()); setTimeout(() => B && shoot(u, o, 'arrow', () => hitFoe(o, dmg * .8, { q: 'good' }, u)), 90); }
    if (u.s.multi) liveFoes().filter(o => o !== f).forEach(o => shoot(u, o, 'arrow', () => hitFoe(o, dmg * u.s.multi, { q: 'splash' }, u)));
  } else {
    SFX.orb();
    shoot(u, f, u.s.burn ? 'fire' : u.s.chill ? 'ice' : 'orb', () => {
      hs(); hitFoe(f, dmg, info, u);
      const [cx, cy] = foeCenter(f);
      B.fx.push({ type: 'ring', x: cx, y: cy, t: 0, dur: .3, col: u.s.burn ? '#ff9a3a' : u.s.chill ? '#9fe6f4' : '#9a8cff' });
      liveFoes().filter(o => o !== f).forEach(o => hitFoe(o, dmg * u.s.splash, { q: 'splash', manual }, u));
      if (u.s.burn) liveFoes().forEach(o => { o.burnT = 3; o.burnDps = Math.max(o.burnDps, dmg * u.s.burn / 3); });
    });
  }
}
function shoot(u, f, kind, cb) {
  const [x, y] = unitCenter(u);
  B.proj.push({ x: x + 14, y, f, kind, cb, sp: kind === 'arrow' ? 520 : 340, t: 0 });
}
function hitFoe(f, dmg, info, u) {
  if (!f || f.dead) return;
  if (f.inv) { const [cx, cy] = foeCenter(f); spark(cx, cy, '#ffffff', 60); return; }
  if (f.T.ghost && info.q === 'good') dmg *= .5;
  if (f.T.plated && info.q === 'good') dmg *= .6;
  dmg = Math.max(1, Math.round(dmg));
  f.hp -= dmg; f.flash = B.boss && B.boss.f === f ? (info.manual ? .06 : Math.max(f.flash, 0)) : .09; f.kx = info.q === 'perfect' ? 8 : info.q === 'splash' ? 2 : 4;
  const [cx, cy] = foeCenter(f);
  const col = info.q === 'perfect' ? COL.gold : info.crit ? '#ff9a6a' : info.q === 'splash' ? COL.dim : COL.white;
  num(cx + rnd(-6, 6), cy - 10, (info.crit ? dmg + '!' : '' + dmg), col, info.q === 'perfect' && info.manual ? 2 : 1);
  const n = info.q === 'perfect' ? 16 : info.q === 'splash' ? 3 : 7;
  const mr = SPR[f.spr][Math.floor(SPR[f.spr].length / 2)].replace(/\./g, ''), mc = PAL[mr[Math.floor(mr.length / 2)]] || '#fff';
  for (let i = 0; i < n; i++) spark(cx, cy, i % 2 ? '#ffffff' : (info.q === 'perfect' ? COL.gold : mc), info.q === 'perfect' ? 150 : 90);
  if (u && u.s.steal) u.hp = Math.min(u.max, u.hp + dmg * u.s.steal);
  if (u && u.s.chill) { f.chill = 3; if (info.q === 'perfect' && info.manual) { f.freeze = u.s.freeze; f.wind = 0; } }
  bossPhaseCheck(f);
  if (f.hp <= 0) killFoe(f);
}
function killFoe(f) {
  f.hp = 0; f.dead = true; shatter(f.spr, foeCenter(f)[0], f.y - (f.T.fly ? 10 : 0), f.sc, f.T.outline); SFX.kill();
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
    if (save.inv.length >= TUNE.invMax) { save.scrap += it.rar + 1; num(foeCenter(f)[0], f.y - 40, 'scrapped', COL.dim); }
    else save.inv.push(it);
    B.loot.push(it); B.fx.push({ type: 'drop', it, x: foeCenter(f)[0], y: foeCenter(f)[1], t: 0, dur: 1.2 });
    setTimeout(SFX.drop, 120);
  }
}
function foeAttack(f, second) {
  f.atk++; f.lt = .2;
  const pat = B.boss && B.boss.f === f ? bossPat() || {} : {};
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
  if (slam) num(...foeCenter(f), 'SLAM', COL.red);
  for (const u of targets) {
    let d = f.dmg * rnd(.9, 1.1) * (slam ? .7 : 1) * 30 / (30 + u.s.arm);
    if (u.guard) { d *= .5; u.guard = 0; num(u.x, u.y - 64, 'guard', COL.blue); }
    d = Math.max(1, Math.round(d)); u.hp -= d; u.hurt = .22;
    num(u.x + rnd(-5, 5), u.y - 54, '-' + d, COL.red);
    for (let i = 0; i < 6; i++) spark(u.x, u.y - 24, i % 2 ? '#ff5a5a' : '#ffffff', 80);
    if (u.hp <= 0) unitDie(u);
  }
  SFX.hurt(); B.shake = Math.max(B.shake, slam ? 5 : 2.5);
  for (const g of save.goblets) {
    if (B.gobUsed[g]) continue; const G = GOBLETS[g];
    if (B.units.some(u => !u.dead && u.hp / u.max < G.th)) {
      B.gobUsed[g] = true; banner(G.n + '!', G.c, 1.1); SFX.lvl();
      if (g === 'blue') B.buff.dmg = 4; if (g === 'green') B.buff.spd = 3; if (g === 'red') B.buff.heal = 3;
    }
  }
}
function unitDie(u) {
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
  for (const u of B.units) { u.ox += (0 - u.ox) * Math.min(1, dt * 8); u.lt = Math.max(0, u.lt - dt); u.hurt = Math.max(0, u.hurt - dt); }
  for (const f of B.foes) { f.ox += (0 - f.ox) * Math.min(1, dt * 7); f.kx += (0 - f.kx) * Math.min(1, dt * 14); f.flash -= dt; f.lt = Math.max(0, f.lt - dt); }
  for (const p of B.parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  B.parts = B.parts.filter(p => p.t < p.life);
  for (const n of B.nums) n.t += dt; B.nums = B.nums.filter(n => n.t < .9);
  for (const e of B.fx) e.t += dt; B.fx = B.fx.filter(e => e.t < e.dur);
  for (const p of B.proj) {
    p.t += dt; const [tx, ty] = foeCenter(p.f), dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
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
  B.cd = Math.max(0, B.cd - dt);
  for (const k in B.buff) B.buff[k] = Math.max(0, B.buff[k] - dt);
  if (!activeUnit()) { const nx = B.units.find(u => !u.dead); if (nx) save.active = nx.id; }
  // party
  for (const u of B.units) {
    if (u.dead) continue;
    if (u.s.regen) u.hp = Math.min(u.max, u.hp + u.max * u.s.regen * dt);
    if (B.buff.heal > 0) u.hp = Math.min(u.max, u.hp + u.max * .1 * dt);
    if (u.id === save.active) continue;
    u.atkT -= dt * (B.buff.spd > 0 ? 1.5 : 1);
    if (u.atkT <= 0 && liveFoes().length) { u.atkT = u.s.cd * TUNE.autoCdMul * rnd(.9, 1.1); attack(u, Math.random() < .12 ? 'perfect' : 'good', false); }
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
    if (f.inv) continue;
    if (f.freeze > 0) { f.freeze -= dt; continue; }
    const bp = B.boss && B.boss.f === f ? bossPat() || {} : {};
    const rate = f.chill > 0 ? .6 : 1; f.chill -= dt;
    if (f.wind > 0) { f.wind -= dt * rate; if (f.wind <= 0) { f.wind = 0; foeAttack(f); f.timer = f.T.per * (bp.per || 1) * rnd(.85, 1.15); } }
    else { f.timer -= dt * rate; if (f.timer <= 0) { f.wind = f.T.wind * (bp.wind || 1); SFX.wind(); } }
    if (B.state !== 'fight') return;
  }
  if (!liveFoes().length && !B.foes.some(f => f.reviveT > 0) && !B.proj.length && B.state === 'fight' && (!B.boss || B.boss.st === 'done')) {
    B.state = 'clear'; B.st = 1.1; if (B.wave < 2) banner('Wave clear', COL.green, .9);
  }
}
// ================= boss fights =================
// Act bosses break the arena: the border cracks and shatters, glowing cracks spread over the void,
// the boss is drawn huge (upscaled to the party's pixel size) and spills out of the square.
const BOSS = {
  gobchief: { phases: 2, crack: '#ffb04a', ch: '1', lines: ['', 'The Chief rages!'],
    pats: [{}, { per: .7, wind: .8, zone: .8, spd: 1.15, dbl: 1 }] },
  treant: { phases: 3, crack: '#9cff6a', ch: '2', lines: ['', 'Roots tear the ground', 'The forest screams'],
    pats: [{}, { per: .85, zone: .85, spd: 1.1, drift: .12 }, { per: .7, wind: .75, zone: .72, spd: 1.2, drift: .22, slam: 2 }] },
  darkknight: { phases: 3, crack: '#ff4a5a', ch: '3', lines: ['', 'The armor splits', 'Black flame'],
    pats: [{}, { per: .8, zone: .8, spd: 1.15, dbl: 1 }, { per: .65, wind: .7, zone: .68, spd: 1.3, blink: 1, dbl: 1 }] },
  mirror: { phases: 4, crack: '#e8e0ff', ch: '4', lines: ['', 'Reality inverts', 'Your timing is mine', 'Break the reflection'],
    pats: [{}, { per: .85, zone: .85, spd: 1.1, invert: 1 }, { per: .75, zone: .75, spd: 1.2, drift: .18, rev: 1 },
      { per: .6, wind: .7, zone: .65, spd: 1.35, drift: .25, blink: 1, dbl: 1, invert: 1 }] },
};
const BOSS_POS = [282, 246];
// pixel-art upscalers (Scale2x / Scale3x) so a 12px sprite becomes 36-48px at the same pixel size as the party
function scale2x(r) {
  const h = r.length, w = r[0].length, g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : r[y][x], o = [];
  for (let y = 0; y < h; y++) {
    let a = '', b = '';
    for (let x = 0; x < w; x++) {
      const P = g(x, y), A = g(x, y - 1), Bq = g(x + 1, y), C = g(x - 1, y), D = g(x, y + 1);
      a += (C === A && C !== D && A !== Bq ? A : P) + (A === Bq && A !== C && Bq !== D ? Bq : P);
      b += (D === C && D !== Bq && C !== A ? C : P) + (Bq === D && Bq !== A && D !== C ? D : P);
    }
    o.push(a, b);
  }
  return o;
}
function scale3x(r) {
  const h = r.length, w = r[0].length, g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : r[y][x], o = [];
  for (let y = 0; y < h; y++) {
    let r0 = '', r1 = '', r2 = '';
    for (let x = 0; x < w; x++) {
      const A = g(x - 1, y - 1), Bq = g(x, y - 1), C = g(x + 1, y - 1), D = g(x - 1, y), E = g(x, y), F = g(x + 1, y), G = g(x - 1, y + 1), H = g(x, y + 1), I = g(x + 1, y + 1);
      if (Bq !== H && D !== F) {
        r0 += (D === Bq ? D : E) + ((D === Bq && E !== C) || (Bq === F && E !== A) ? Bq : E) + (Bq === F ? F : E);
        r1 += ((D === Bq && E !== G) || (D === H && E !== A) ? D : E) + E + ((Bq === F && E !== I) || (H === F && E !== C) ? F : E);
        r2 += (D === H ? D : E) + ((D === H && E !== I) || (H === F && E !== G) ? H : E) + (H === F ? F : E);
      } else { r0 += E + E + E; r1 += E + E + E; r2 += E + E + E; }
    }
    o.push(r0, r1, r2);
  }
  return o;
}
function bossSprKey(k, ph) {
  const key = 'boss_' + k + '_' + ph; if (SPR[key]) return key;
  const D = BOSS[k], last = ph >= D.phases - 1 && ph > 0;
  const rows = (last ? scale2x(scale2x(SPR[FOES[k].spr])) : scale3x(SPR[FOES[k].spr])).map(r => r.split(''));
  const h = rows.length, w = rows[0].length;
  let seed = 7 + ph * 13 + k.length; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (ph > 0) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] === 'k') rows[y][x] = D.ch; // glowing eyes
    for (let n = 0; n < ph * 4; n++) { // fissures through the body
      let x = Math.floor(R() * w), y = Math.floor(R() * h), tries = 0;
      while (rows[y][x] === '.' && tries++ < 60) { x = Math.floor(R() * w); y = Math.floor(R() * h); }
      for (let s = 0; s < 10 + ph * 3; s++) {
        if (rows[y] && rows[y][x] && rows[y][x] !== '.') rows[y][x] = D.ch;
        const d = Math.floor(R() * 4); x += d === 0 ? 1 : d === 1 ? -1 : 0; y += d === 2 ? 1 : d === 3 ? -1 : 0;
        x = clamp(x, 0, w - 1); y = clamp(y, 0, h - 1);
      }
    }
  }
  SPR[key] = rows.map(r => r.join(''));
  return key;
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
  f.spr = bossSprKey(f.k, 0); f.sc = PSC; f.x = BOSS_POS[0]; f.y = BOSS_POS[1]; f.ox = 0; f.drop = 1;
  B.boss = { f, k: f.k, D, phase: 0, st: 'intro', t: 0, cracks: [], integ: 1, bcrack: 0, warp: 0, inv: false, flash: null, ev: {} };
  B.state = 'boss'; B.tip = null; SFX.rumble();
}
function bossPhaseCheck(f) {
  const bo = B.boss; if (!bo || bo.f !== f || bo.st !== 'fight') return;
  const n = bo.D.phases; if (bo.phase >= n - 1) return;
  const th = f.max * (1 - (bo.phase + 1) / n);
  if (f.hp > th) return;
  f.hp = Math.max(1, Math.ceil(th));
  bo.phase++; bo.st = 'phase'; bo.t = 0; bo.ev = {}; f.wind = 0; f.inv = true; f.dbl = 0;
  quake(12); bossFlash(bo.D.crack, .45); bo.warp = 1; SFX.roar();
  addCracks(6 + bo.phase * 2, B.t);
  banner(bo.D.lines[bo.phase] || ('Phase ' + (bo.phase + 1)), bo.D.crack, 1.5);
  for (let i = 0; i < 30; i++) spark(...foeCenter(f), i % 2 ? bo.D.crack : '#ffffff', 220);
}
function bossKilled(f) {
  const bo = B.boss; if (!bo || bo.f !== f) return false;
  bo.st = 'outro'; bo.t = 0; bo.ev = {}; bo.inv = false; bo.warp = 0;
  quake(14); bossFlash('#ffffff', .5); SFX.bossDie();
  return true;
}
function updateBoss(dt) {
  const bo = B.boss; if (!bo) return;
  bo.t += dt; const t = bo.t, ev = bo.ev, f = bo.f;
  if (bo.flash) { bo.flash.t += dt; if (bo.flash.t > bo.flash.dur) bo.flash = null; }
  bo.warp = Math.max(0, bo.warp - dt * 1.1);
  if (bo.st === 'intro') {
    bo.bcrack = clamp(t / .9, 0, 1); quake(1 + t * 3);
    if (t > .3 && !ev.c1) { ev.c1 = 1; SFX.crack(); } if (t > .6 && !ev.c2) { ev.c2 = 1; SFX.crack(); }
    if (t > .9 && !ev.sh) { ev.sh = 1; bo.integ = .3; borderShards(true); bossFlash('#ffffff', .4); quake(10); addCracks(14, B.t); SFX.shatter(); }
    if (t > .9) f.drop = Math.max(0, 1 - Math.pow((t - .9) / .75, 2));
    if (t > 1.65 && !ev.land) {
      ev.land = 1; f.drop = 0; quake(9); SFX.land(); banner(FOES[f.k].n, bo.D.crack, 1.4);
      for (let i = 0; i < 24; i++) B.parts.push({ x: f.x + rnd(-70, 70), y: f.y, vx: rnd(-90, 90), vy: rnd(-90, -20), t: 0, life: rnd(.3, .7), col: i % 2 ? '#56506a' : bo.D.crack, s: 2, g: 260 });
    }
    if (t > 2.5) { bo.st = 'fight'; B.state = 'fight'; }
  } else if (bo.st === 'phase') {
    if (t > .45 && !ev.morph) { ev.morph = 1; f.spr = bossSprKey(bo.k, bo.phase); SFX.morph(); bossFlash('#ffffff', .25); bo.inv = !!BOSS[bo.k].pats[bo.phase].invert; quake(8); }
    if (t > 1.3) { bo.st = 'fight'; f.inv = false; f.timer = f.T.per * .8; }
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
    if (Math.random() < .5) { const [w, h] = sprSize(f.spr, f.sc); B.parts.push({ x: f.x + rnd(-w / 2, w / 2), y: f.y - rnd(h), vx: rnd(-8, 8), vy: rnd(-40, -15), t: 0, life: rnd(.4, .9), col: bo.phase ? bo.D.crack : '#3a3444', s: 1, g: -10 }); }
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
  save.party.forEach((id, i) => btn(124 + i * 64, y, 60, 18, CLS[id].n, () => { tab = id; selItem = null; selSkill = null; SFX.click(); }, { sel: tab === id, badge: scene === 'skills' && (save.chars[id].sp > 0 || save.chars[id].stp > 0) }));
  if (!save.party.includes(tab)) tab = save.party[0];
}
function backBtn() { btn(8, 292, 70, 22, 'Back', () => goto('camp')); }

// ---------- title ----------
function drawTitle() {
  drawArena('#f4f4f4');
  T('W.A.M.', 160, 54, '#ffffff', 4, 'c', '#24242c');
  const bob = Math.floor(gtime * 2) % 2;
  rect(160 - 22, 196, 44, 3, '#16161c');
  drawSpr('warrior', 160 - 30, 136 - bob, 5);
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
    drawSpr(c ? charSpr(c) : CLS[id].spr, x, qy + 4 - bob, 3, got ? '' : 'dim');
    if (got) {
      T(charName(c), x + 40, qy + 6, id === save.active ? COL.white : COL.dim);
      T('Lv ' + c.lvl, x + 40, qy + 20, COL.dim);
      if (c.lvl >= TUNE.evoLevel && !c.evo && Math.floor(gtime * 3) % 2) T('evolve!', x + 40, qy + 32, COL.gold);
      if (id === save.active) rect(x + 16, qy - 2, 4, 2, COL.white);
    }
  });
  const anySp = save.party.some(id => save.chars[id].sp > 0 || save.chars[id].stp > 0);
  const anyEvo = save.party.some(id => save.chars[id].lvl >= TUNE.evoLevel && !save.chars[id].evo);
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
  drawIcon(itemIcon(it), x + (s - 16) / 2, y + (s - 16) / 2, 2, RAR[it.rar].c);
  if (dim) { ctx.globalAlpha = .6; rect(x + 1, y + 1, s - 2, s - 2, '#000'); ctx.globalAlpha = 1; }
}
function drawGear() {
  drawArena(); tabs(); T('Gear', 8, 7, COL.white, 1);
  const c = save.chars[tab], s = calcStats(c);
  SLOTS.forEach((sl, i) => {
    const y = 28 + i * 28, it = c.gear[sl], sel = selItem && selItem.it === it && it;
    panel(8, y, 150, 26, sel ? '#ffffff' : '#2a2a32');
    if (it) {
      drawIcon(itemIcon(it), 12, y + 5, 2, RAR[it.rar].c);
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
// ---------- skills ----------
function drawSkills() {
  drawArena(); tabs(); T('Skills', 8, 7, COL.white);
  const c = save.chars[tab], tree = SKILLS[tab];
  T(charName(c) + '  Lv ' + c.lvl, 8, 28, COL.white);
  bar(8, 41, 120, 2, c.xp / xpNeed(c.lvl), COL.blue);
  T('Skill pts ' + c.sp, 312, 28, c.sp ? COL.gold : COL.dim, 1, 'r');
  T('Stat pts ' + c.stp, 312, 44, c.stp ? COL.gold : COL.dim, 1, 'r');
  [['dmg', 'Damage'], ['life', 'Life'], ['spd', 'Speed']].forEach(([k, n], i) => {
    const x = 8 + i * 104;
    T(n + ' ' + c.st[k], x, 64, COL.white);
    btn(x + 72, 60, 22, 18, '+', () => { if (c.stp > 0) { c.stp--; c.st[k]++; SFX.click(); persist(); } }, { dis: c.stp <= 0 });
  });
  tree.forEach((s, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 8 + col * 104, y = 92 + row * 54;
    const rk = c.sk[s.k] || 0, locked = s.req && !(c.sk[s.req] > 0), sel = selSkill === s.k;
    if (row === 1) rect(x + 47, y - 20, 2, 20, (c.sk[s.req] || 0) > 0 ? '#8a8a96' : '#26262e');
    panel(x, y, 96, 34, sel ? '#ffffff' : locked ? '#1e1e24' : rk ? COL.gold + '99' : '#3a3a44');
    T(s.n, x + 48, y + 5, locked ? COL.dark : COL.white, 1, 'c');
    for (let p = 0; p < SKMAX; p++) { const px = x + 36 + p * 9; if (p < rk) rect(px, y + 22, 6, 6, COL.gold); else frame(px, y + 22, 6, 6, locked ? '#26262e' : '#5a5a66'); }
    hit(x, y, 96, 34, () => { selSkill = s.k; SFX.click(); });
  });
  panel(8, 204, 304, 70, '#2a2a32');
  const s = tree.find(x => x.k === selSkill);
  if (s) {
    const rk = c.sk[s.k] || 0, locked = s.req && !(c.sk[s.req] > 0);
    T(s.n + '  ' + rk + '/' + SKMAX, 16, 210, COL.gold);
    wrap(s.d, 210).forEach((l, i) => T(l, 16, 226 + i * 12, COL.white));
    if (locked) T('needs ' + tree.find(x => x.k === s.req).n, 16, 256, COL.red);
    btn(236, 248, 70, 20, 'Learn', () => { c.sp--; c.sk[s.k] = rk + 1; SFX.lvl(); persist(); }, { dis: locked || rk >= SKMAX || c.sp <= 0, col: COL.gold });
  } else {
    T('Level up to earn points.', 16, 212, COL.dim);
    T('Each level: 1 skill point, 2 stat points.', 16, 226, COL.dark);
    T('Evolve at Lv ' + TUNE.evoLevel + ' in the Party screen.', 16, 240, COL.dark);
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
    drawSpr(c ? charSpr(c) : CLS[id].spr, x + 25, 36 - bob, 4, got ? '' : 'dim');
    if (!got) { T('?', x + 49, 110, COL.dark, 2, 'c'); return; }
    const s = calcStats(c);
    T(charName(c), x + 49, 92, COL.white, 1, 'c');
    T('Lv ' + c.lvl, x + 49, 105, COL.dim, 1, 'c');
    bar(x + 14, 118, 70, 2, c.xp / xpNeed(c.lvl), COL.blue);
    T('DMG ' + Math.round(s.dmg), x + 8, 128, COL.white); T('LIFE ' + s.hp, x + 8, 141, COL.white);
    T('ARM ' + s.arm, x + 8, 154, COL.white); T((1 / s.cd).toFixed(1) + '/s', x + 8, 167, COL.white);
    btn(x + 8, 200, 82, 20, id === save.active ? 'Leading' : 'Lead', () => { save.active = id; SFX.click(); persist(); }, { sel: id === save.active });
    if (c.evo) T('evolved', x + 49, 232, COL.dim, 1, 'c');
    else if (c.lvl >= TUNE.evoLevel) btn(x + 8, 226, 82, 22, 'Evolve', () => { evoPick = id; SFX.click(); }, { col: COL.gold, border: COL.gold });
    else T('evolves Lv ' + TUNE.evoLevel, x + 49, 232, COL.dark, 1, 'c');
  });
  backBtn();
  if (evoPick) {
    UI = [];
    ctx.globalAlpha = .85; rect(0, 0, LW, AH, '#000'); ctx.globalAlpha = 1;
    panel(8, 20, 304, 280, COL.gold);
    T('Evolve the ' + CLS[evoPick].n, 160, 28, COL.gold, 1, 'c');
    T('choose a path, it is permanent', 160, 41, COL.dim, 1, 'c');
    CLS[evoPick].evos.forEach((ek, i) => {
      const E = EVO[ek], x = 16 + i * 148;
      panel(x, 56, 140, 206, '#3a3a44');
      drawSpr(E.spr, x + 46, 64 + (Math.floor(gtime * 2) % 2), 4);
      T(E.n, x + 70, 120, COL.white, 1, 'c');
      let y = 136; E.d.forEach(d => wrap(d, 128).forEach(l => { T(l, x + 6, y, COL.dim); y += 11; }));
      btn(x + 20, 234, 100, 22, 'Choose', () => { save.chars[evoPick].evo = ek; SFX.lvl(); persist(); msgQueue.push({ title: E.n + '!', spr: E.spr, col: COL.gold, lines: ['The ' + CLS[evoPick].n + ' evolved.', ...E.d] }); evoPick = null; scene = 'msg'; msgReturn = 'party'; }, { col: COL.gold });
    });
    btn(120, 270, 80, 22, 'Cancel', () => { evoPick = null; SFX.click(); });
  }
}
// ---------- message cards ----------
let msgReturn = 'camp';
function nextMsg() { msgQueue.shift(); SFX.click(); if (!msgQueue.length) { scene = msgReturn; msgReturn = 'camp'; persist(); } }
function drawMsg() {
  const m = msgQueue[0]; if (!m) { scene = 'camp'; return; }
  drawArena(m.col);
  const sc = textW(m.title, 2) <= 290 ? 2 : 1;
  T(m.title, 160, 30, m.col, sc, 'c', '#24242c');
  const [w, h] = sprSize(m.spr, 5);
  rect(160 - w / 2 + 8, 76 + h, w - 16, 3, '#16161c');
  drawSpr(m.spr, 160 - w / 2, 76 - (Math.floor(gtime * 2) % 2), 5, '', FOES[m.spr] && FOES[m.spr].outline || null);
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
  const ents = [...B.units.map((u, i) => ({ y: u.y, d: () => drawUnit(u, i) })), ...B.foes.map((f, i) => ({ y: f.y, d: () => drawFoe(f, i) }))];
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  for (const p of B.proj) {
    if (p.kind === 'arrow') { rect(p.x - 6, p.y, 6, 1, '#c8a070'); rect(p.x, p.y - 1, 2, 3, '#ffffff'); rect(p.x - 8, p.y - 1, 2, 1, '#e8e8e8'); rect(p.x - 8, p.y + 1, 2, 1, '#e8e8e8'); }
    else { const c = p.kind === 'fire' ? '#ff9a3a' : p.kind === 'ice' ? '#9fe6f4' : '#9a8cff'; rect(p.x - 3, p.y - 3, 6, 6, c); rect(p.x - 1, p.y - 1, 2, 2, '#ffffff'); }
  }
  for (const e of B.fx) drawFx(e);
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
  const [w, h] = sprSize(u.spr, PSC), lx = u.lt > 0 ? Math.round(Math.sin((1 - u.lt / .16) * Math.PI) * 14) : 0;
  const bob = Math.floor(B.t * 2 + i) % 2, x = Math.round(u.x + u.ox + lx - w / 2), y = u.y - h - bob;
  rect(u.x - w / 2 + 5, u.y, w - 10, 2, '#1a1a22');
  drawSpr(u.spr, x, y, PSC, u.hurt > 0 && Math.floor(u.hurt * 30) % 2 ? 'hurt' : '');
  if (u.guard) corners(x - 3, y - 3, w + 6, h + 6, COL.blue, 4);
  bar(u.x - 14, u.y - h - 8, 28, 3, u.hp / u.max, '#7ee07e');
  if (u.id === save.active) { const ty = u.y - h - 16 + (Math.floor(B.t * 3) % 2); rect(u.x - 3, ty, 7, 1, '#fff'); rect(u.x - 2, ty + 1, 5, 1, '#fff'); rect(u.x - 1, ty + 2, 3, 1, '#fff'); rect(u.x, ty + 3, 1, 1, '#fff'); }
  hit(x - 4, y - 6, w + 8, h + 10, () => switchTo(i));
}
function drawFoe(f, i) {
  if (f.dead) return;
  const T_ = f.T, sc = f.sc, [w, h] = sprSize(f.spr, sc), boss = B.boss && B.boss.f === f;
  const lx = f.lt > 0 ? -Math.round(Math.sin((1 - f.lt / .2) * Math.PI) * 18) : 0;
  const oy = f.wind > 0 ? -3 : 0, bob = T_.fly ? Math.round(Math.sin(B.t * 4 + f.seed) * 3) - 10 : Math.floor(B.t * 2 + f.seed) % 2;
  const x = Math.round(f.x + f.ox + f.kx + lx - w / 2), y = f.y - h + oy + bob - Math.round((f.drop || 0) * 340);
  rect(f.x + f.ox - w / 2 + 6, f.y, w - 12, boss ? 3 : 2, '#1a1a22');
  let outline = boss && B.boss.phase > 0 ? B.boss.D.crack : T_.outline || null;
  if (f.wind > 0 && Math.floor(B.t * 14) % 2) outline = '#ff5a5a';
  if (f.freeze > 0) outline = '#9fe6f4';
  const alpha = T_.ghost ? .72 + Math.sin(B.t * 6 + f.seed) * .12 : 1;
  drawSpr(f.spr, x, y, sc, f.flash > 0 || (f.inv && Math.floor(B.t * 16) % 2) ? 'flash' : '', outline, alpha);
  const bw = T_.boss ? 46 : 28, by = y - 9;
  if (!boss) bar(f.x + f.ox - bw / 2, by, bw, 3, f.hp / f.max, '#ff5a5a');
  bar(f.x + f.ox - bw / 2, by + 4, bw, boss ? 2 : 1, f.wind > 0 ? 1 : 1 - f.timer / T_.per, f.wind > 0 ? '#ffffff' : '#7a3a3a', '#16161c');
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
  T(A.roman + '-' + (B.li % 3 + 1) + '  ' + LEVELS[B.li].n, 8, 6, A.c);
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
    drawSpr(u.dead ? 'grave' : u.spr, x + 3, y + 4, 1, u.dead ? 'dim' : '');
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
    if (evoPick) evoPick = null; else if (scene === 'gear' || scene === 'skills' || scene === 'party') goto('camp');
  }
});
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width - OX, y: (e.clientY - r.top) * VH / r.height - OY }; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audio(); mouse = toLogical(e);
  for (let i = UI.length - 1; i >= 0; i--) { const b = UI[i]; if (mouse.x >= b.x && mouse.x < b.x + b.w && mouse.y >= b.y && mouse.y < b.y + b.h) { b.fn(); return; } }
  if (scene === 'title') onJ();
});
cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mouse = toLogical(e); });
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
  save.party.forEach(id => { const c = save.chars[id]; if (c.lvl < 6) { c.lvl = 6; c.sp = 5; c.stp = 10; } });
  save.perfects = Math.max(save.perfects, TUNE.act4Perfects);
}
requestAnimationFrame(loop);
