// ================= UI / scenes =================
let scene = 'title', UI = [], mouse = { x: -1, y: -1 }, msgQueue = [], tab = 'warrior', selItem = null, selSkill = null, evoPick = null, confirmNew = 0, gtime = 0;
function btn(x, y, w, h, label, fn, o = {}) {
  const hov = !o.dis && mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h;
  rect(x, y, w, h, o.fill || (hov ? '#1c1c24' : '#0e0e12'));
  frame(x, y, w, h, o.dis ? '#24242c' : o.sel ? '#ffffff' : hov ? '#9a9aa6' : (o.border || '#3a3a44'));
  if (label) T(label, x + w / 2, y + Math.floor((h - 10) / 2), o.dis ? COL.dark : (o.col || COL.white), o.sc || 1, 'c');
  if (o.badge) rect(x + w - 5, y + 2, 3, 3, COL.gold);
  if (!o.dis && fn) UI.push({ x, y, w, h, fn });
}
function hit(x, y, w, h, fn) { UI.push({ x, y, w, h, fn }); }
function bar(x, y, w, h, f, col, bg = '#222228') { rect(x, y, w, h, bg); rect(x, y, Math.max(0, Math.round(w * clamp(f, 0, 1))), h, col); }
function corners(x, y, w, h, col, l = 5) {
  rect(x, y, l, 1, col); rect(x, y, 1, l, col); rect(x + w - l, y, l, 1, col); rect(x + w - 1, y, 1, l, col);
  rect(x, y + h - 1, l, 1, col); rect(x, y + h - l, 1, l, col); rect(x + w - l, y + h - 1, l, 1, col); rect(x + w - 1, y + h - l, 1, l, col);
}
function drawArena(accent = '#3a3a44') {
  rect(0, 0, LW, LH, '#000');
  ctx.fillStyle = '#111115';
  for (let y = 8; y < AH; y += 16) for (let x = 8; x < LW; x += 16) ctx.fillRect(x, y, 1, 1);
  frame(0, 0, LW, AH, '#202028'); corners(0, 0, LW, AH, accent, 8);
}
function panel(x, y, w, h, col = '#3a3a44') { rect(x, y, w, h, COL.panel); frame(x, y, w, h, col); }
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
    } else T(id === 'archer' ? 'Act I' : 'Act II', x + 40, qy + 14, COL.dark);
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
  rect(x, y, s, s, '#0c0c10'); frame(x, y, s, s, sel ? '#ffffff' : RAR[it.rar].c + (dim ? '55' : 'cc'));
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
    if (!got) { T('?', x + 49, 100, COL.dark, 1, 'c'); T(id === 'archer' ? 'joins after' : 'joins after', x + 49, 120, COL.dark, 1, 'c'); T(id === 'archer' ? 'Act I' : 'Act II', x + 49, 133, COL.dark, 1, 'c'); return; }
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
