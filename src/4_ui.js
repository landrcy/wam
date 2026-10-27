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
// big floating title: above the arena box when the screen has room, otherwise across its top
function bigTitle() {
  const TL = 'W.A.M.', room = OY - 6; let sc = Math.min(7, Math.floor(room / 9)); while (sc > 2 && [...TL].reduce((w, ch) => w + textW(ch, sc) + sc, 0) > VW - 16) sc--; const out = sc >= 3, S = out ? sc : 3;
  const tw = [...TL].map(ch => textW(ch, S) + S); let tx = Math.round(160 - tw.reduce((a, b) => a + b) / 2);
  const by = out ? Math.round(-OY / 2 - S * 4) : 4, amp = RM ? 0 : (out ? S : 2);
  for (let i = 0; i < TL.length; i++) {
    const dy = Math.round(Math.sin(gtime * 2.2 + i * .8) * amp);
    if (out && !RM && i % 2 === 0) { ctx.globalAlpha = .25 + .15 * Math.sin(gtime * 3 + i); rect(tx - S, by + dy + S * 8, tw[i] - S, S, COL.gold); ctx.globalAlpha = 1; }
    T(TL[i], tx, by + dy, i % 2 ? COL.gold : '#ffffff', S, 'l', '#2a2238'); tx += tw[i];
  }
  if (out && !RM) for (let k = 0; k < 6; k++) { const t = (gtime * .6 + k / 6) % 1; ctx.globalAlpha = 1 - t; rect(Math.round(100 + k * 23 + Math.sin(k * 9 + gtime) * 6), Math.round(by + S * 9 - t * S * 10), 1, 1, COL.gold); } ctx.globalAlpha = 1;
}
function drawCamp() {
  if (act4Ready() && !save.act4) { save.act4 = true; persist(); msgQueue.push({ title: 'A void opens', spr: 'shade', col: '#b480ff', lines: ['Your ' + TUNE.act4Perfects + ' perfect strikes tore the sky.', 'Secret Act IV: The Void is open.'] }); scene = 'msg'; return; }
  const sa = Math.floor(save.sel / 3);
  drawArena(ACTS[sa].c);
  bigTitle();
  T('Perfect', 8, 6, COL.gold); T('' + save.perfects, 8, 18, COL.gold);
  btn(250, 6, 62, 16, save.mute ? 'Sound off' : 'Sound on', () => { save.mute = !save.mute; persist(); SFX.click(); }, { col: COL.dim });
  const showAct4 = save.cleared[8] || save.act4;
  for (let a = 0; a < (showAct4 ? 4 : 3); a++) {
    const y = 38 + a * 25, A = ACTS[a], open = a < 3 || save.act4;
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
  const L = LEVELS[save.sel], py = 40 + (showAct4 ? 4 : 3) * 25;
  panel(8, py, 304, 50, ACTS[sa].c + '66');
  T(ACTS[sa].roman + '-' + (save.sel % 3 + 1) + '  ' + L.n, 16, py + 6, ACTS[sa].c);
  T(save.cleared[save.sel] ? 'cleared' : 'new', 304, py + 6, save.cleared[save.sel] ? COL.green : COL.gold, 1, 'r');
  const names = [...new Set(L.w.flat())].map(k => FOES[k].n);
  T('Foes: ' + names.join(', '), 16, py + 21, COL.dim);
  T('Foe level ' + (save.sel + 1) + '   3 waves' + (save.sel % 3 === 2 ? ' + boss' : ''), 16, py + 34, COL.dim);
  // party
  const qy = py + 54;
  ORDER.forEach((id, i) => {
    const x = 8 + i * 102, c = save.chars[id], got = save.party.includes(id), cx = x + 50;
    panel(x, qy, 100, 222 + 52 - qy, id === save.active && got ? '#5a5a6a' : '#2a2a32');
    const bob = got && !RM ? Math.floor(gtime * 2 + i) % 2 : 0;
    if (c && got) drawChar(c, cx - 18, qy + 4 - bob, 2, '', { seed: i }); else drawSpr(CLS[id].spr, cx - 18, qy + 4 - bob, 2, 'dim');
    if (got) {
      T(charName(c), cx, qy + 42, id === save.active ? COL.white : COL.dim, 1, 'c');
      T(canEvolve(c) && Math.floor(gtime * 3) % 2 ? 'evolve!' : 'Lv ' + c.lvl, cx, qy + 54, canEvolve(c) ? COL.gold : COL.dim, 1, 'c');
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
function scrapItem(it) { if (it.lock) return; save.inv = save.inv.filter(x => x !== it); save.scrap += it.rar + 1; selItem = null; SFX.kill(); persist(); }
function isWorse(it) { const users = save.party.filter(id => canUse(it, id)); return !it.lock && !users.some(id => itemScore(it) > itemScore(save.chars[id].gear[it.slot])); }
function scrapWorse() {
  let n = 0;
  save.inv = save.inv.filter(it => { if (it.lock) return true;
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
  // paper-doll preview: the character as it looks with this gear
  panel(8, 28, 76, 112, '#2a2a32');
  const pv = selItem && !selItem.eq && canUse(selItem.it, tab) ? Object.assign({}, c, { gear: Object.assign({}, c.gear, { [selItem.it.slot]: selItem.it }) }) : c;
  drawChar(pv, 14, 40 - (RM ? 0 : Math.floor(gtime * 2) % 2), 4, '', { seed: 1 });
  T(charName(c), 46, 110, COL.white, 1, 'c'); T(pv === c ? 'Lv ' + c.lvl : 'preview', 46, 124, pv === c ? COL.dim : COL.gold, 1, 'c');
  SLOTS.forEach((sl, i) => {
    const x = 88 + (i % 2) * 38, y = 28 + Math.floor(i / 2) * 38, it = c.gear[sl], sel = selItem && selItem.it === it && it;
    slotBox(x, y, 36, 36, sel ? '#ffffff' : it ? RAR[it.rar].c + 'cc' : '#2a2a32');
    if (it) { drawGearArt(it, x + 18, y + 18, 2); hit(x, y, 36, 36, () => { selItem = { it, eq: true }; SFX.click(); }); }
    else rect(x + 16, y + 16, 4, 4, '#2a2a32');
  });
  T('DMG ' + Math.round(s.dmg) + ' LIFE ' + s.hp + ' ARM ' + s.arm + ' CRIT ' + s.crit + '%', 8, 146, COL.white);
  // detail
  panel(166, 28, 146, 112, '#2a2a32');
  if (selItem) {
    const it = selItem.it, eq = c.gear[it.slot];
    wrap(it.name, 136).slice(0, 1).forEach(l => T(l, 171, 33, RAR[it.rar].c));
    T(RAR[it.rar].n + ' Lv ' + it.ilvl, 171, 45, COL.dim);
    let y = 57; modLines(it).slice(0, 3).forEach(l => { T(l, 171, y, COL.white); y += 11; });
    if (it.u) { const L = itemLook(it); if (L && L.d) { T(wrap(L.d, 136)[0], 171, y, COL.gold); y += 11; } }
    if (!selItem.eq) {
      if (!canUse(it, tab)) T(CLS[it.cls].n + ' only', 171, 102, COL.red);
      else { const d = Math.round(itemScore(it) - itemScore(eq)); T(d >= 0 ? '+' + d + ' power' : d + ' power', 171, 102, d >= 0 ? COL.green : COL.red); }
      btn(168, 116, 44, 20, 'Equip', () => equip(it), { dis: !canUse(it, tab) });
      btn(214, 116, 52, 20, it.lock ? 'Unlock' : 'Lock', () => { it.lock = !it.lock; SFX.click(); persist(); }, { col: COL.gold });
      btn(268, 116, 42, 20, 'Scrap', () => scrapItem(it), { col: COL.red, dis: !!it.lock });
    } else T('equipped', 171, 120, COL.green);
  } else { T('Pick an item', 171, 34, COL.dim); wrap('Equipped and locked items are never scrapped.', 134).forEach((l, i) => T(l, 171, 52 + i * 12, COL.dark)); }
  // bag
  T('Bag ' + save.inv.length + '/' + TUNE.invMax, 8, 160, COL.white);
  save.inv.forEach((it, i) => {
    const x = 8 + (i % 12) * 25, y = 172 + Math.floor(i / 12) * 25, sel = selItem && selItem.it === it;
    drawItemCell(it, x, y, 24, !canUse(it, tab), sel);
    if (canUse(it, tab) && itemScore(it) > itemScore(c.gear[it.slot])) rect(x + 19, y + 2, 3, 3, COL.green);
    if (it.lock) { rect(x + 2, y + 17, 5, 4, COL.gold); frame(x + 3, y + 14, 3, 4, COL.gold); }
    hit(x, y, 24, 24, () => { selItem = { it }; SFX.click(); });
  });
  for (let i = save.inv.length; i < TUNE.invMax; i++) frame(8 + (i % 12) * 25, 172 + Math.floor(i / 12) * 25, 24, 24, '#18181e');
  T('Forge ' + save.scrap + '/' + TUNE.forgeCost, 8, 226, COL.white);
  bar(8, 239, 150, 3, save.scrap / TUNE.forgeCost, COL.gold);
  btn(232, 222, 80, 20, 'Craft', claimForge, { dis: save.scrap < TUNE.forgeCost, col: COL.gold });
  btn(8, 250, 148, 22, 'Scrap all worse', scrapWorse, { dis: !save.inv.some(isWorse), col: COL.white });
  btn(162, 250, 150, 22, 'Auto-scrap ' + (save.autoScrap ? 'on' : 'off'), () => { save.autoScrap = !save.autoScrap; persist(); SFX.click(); if (save.autoScrap) scrapWorse(); }, { col: save.autoScrap ? COL.green : COL.dim, sel: save.autoScrap });
  T('never scraps equipped or locked', 312, 278, COL.dark, 1, 'r');
  backBtn();
}
// ---------- skills: a scrollable, zoomable rune constellation per character ----------
const TV = {}; let treeSel = null, treeAnim = [], treeDrag = null;
const ZOOMS = [.5, 1, 2];
function tview(id) { if (!TV[id]) { const c = save.chars[id], T = buildTree(id), f = treeFocus(c); TV[id] = { x: 0, y: -60, zi: 1 }; } return TV[id]; }
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
  for (const n of newlyLit(c)) { c.seen.push(n.id); treeAnim.push({ id: n.id, t: -.8 * treeAnim.length }); if (treeAnim.length === 1) SFX.lvl(); persist(); }
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
    a.t += 1 / 60; const n = Tr.by[a.id]; if (!n || a.t < 0) continue; const [x, y] = treeToScr(v, n), k = a.t / 1.2, col = KINDCOL[n.k];
    ctx.globalAlpha = 1 - k; const R = 6 + k * 26;
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; rect(Math.round(x + Math.cos(an) * R), Math.round(y + Math.sin(an) * R), 2, 2, i % 2 ? col : '#ffffff'); }
    if (k < .3) { ctx.globalAlpha = (.3 - k) * 2; rect(x - 12, y - 12, 24, 24, '#ffffff'); }
    ctx.globalAlpha = 1; if (k < .6) T('unlocked', x, y - 26 - Math.round(k * 10), col, 1, 'c', '#000');
  }
  ctx.restore();
  // drag to pan; wheel or buttons to zoom
  UI.unshift({ x: cx0, y: cy0, w: cw, h: ch, fn: () => {}, drag: true });
  btn(282, 196, 14, 14, '+', () => treeZoom(1), { dis: v.zi >= ZOOMS.length - 1 }); btn(298, 196, 14, 14, '-', () => treeZoom(-1), { dis: v.zi <= 0 });
  btn(230, 196, 48, 14, 'center', () => { v.x = 0; v.y = -60; SFX.click(); });
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
    T('Nodes light up with levels and bosses.', 12, 232, COL.dim);
    T('Each fork: pick one path for good.', 12, 245, COL.dim);
    T(TOUCH ? 'Drag to look, tap a node.' : 'Drag or scroll, click a node.', 12, 258, COL.dark);
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
