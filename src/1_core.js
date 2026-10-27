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
