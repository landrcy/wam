// ---- admin / dev panel: L key, or tap the W.A.M. logo 5 times. A cheat panel for a static site, not security. ----
const ADM = { god: false, ohk: false, perfect: false, overlay: false, tab: 'travel', ret: 'camp', slot: 0, rar: 0, uniq: false, resetArm: 0, taps: [], fps: 60, wantPhase: 0, toast: null };
const ADM_TABS = [['travel', 'Travel'], ['hero', 'Hero'], ['gear', 'Gear'], ['cheat', 'Cheats'], ['sys', 'System']];
const BOSS_LV = [2, 5, 8, 11];
function openAdmin() { if (scene === 'admin') return closeAdmin(); ADM.ret = scene === 'msg' ? 'camp' : scene; if (B && scene === 'battle') B.paused = true; scene = 'admin'; SFX.click(); }
function closeAdmin() { scene = ADM.ret || 'camp'; if (scene === 'battle' && !B) scene = 'camp'; if (B && scene === 'battle') B.paused = false; SFX.click(); }
function adminTap() { const now = gtime; ADM.taps = ADM.taps.filter(t => now - t < 2).concat(now); if (ADM.taps.length >= 5) { ADM.taps = []; openAdmin(); } }
function admToast(s) { ADM.toast = { s, t: 1.6 }; }
function admHero() { return save.chars[save.cls || save.party[0]]; }
function admGo(li, phase) {
  save.unlocked = Math.max(save.unlocked, li); if (li >= 9) save.act4 = true; save.sel = li; save.started = true;
  B = null; scene = 'camp'; startLevel(li);
  if (phase !== undefined) { B.state = 'clear'; B.st = 0; B.wave = 1; B.foes = []; ADM.wantPhase = phase; }
}
// called by the boss update: skip straight to the requested phase once the fight starts
function admBossPhase(bo) {
  if (!ADM.wantPhase || bo.st !== 'fight') return; const n = Math.min(ADM.wantPhase, bo.D.phases - 1); ADM.wantPhase = 0; if (n <= 0) return;
  const f = bo.f; bo.phase = n; f.hp = Math.max(1, Math.ceil(f.max * (1 - n / bo.D.phases)) - 1); bo.expT = expFor(bo, n); bo.inv = !!(BOSS[bo.k].pats[n] || {}).invert; banner('Phase ' + (n + 1), bo.D.crack, 1);
}
function admSwitchClass(id) {
  const old = admHero(), lvl = old.lvl, xp = old.xp; giveStarter(id); save.cls = id; const c = save.chars[id]; c.lvl = lvl; c.xp = xp;
  save.inv = save.inv.filter(it => it.cls === id); tab = id; persist(); admToast('Now a ' + CLS[id].n);
}
function admSpawn() {
  const c = admHero(), sl = SLOTS[ADM.slot]; let it = null;
  for (let i = 0; i < 400 && !it; i++) { const t = makeItem(Math.max(1, c.lvl + 1), sl, save.cls, ADM.uniq ? 4 : ADM.rar, 0); if (ADM.uniq ? t.u : t.rar === ADM.rar && !t.u) it = t; }
  if (!it) { admToast(ADM.uniq ? 'No unique for that slot' : 'Could not roll that'); return; }
  if (save.inv.length >= TUNE.invMax) { admToast('Bag full'); return; }
  save.inv.push(it); persist(); admToast('Spawned ' + (it.name || lookName(it)));
}
function admEvos(cls) { // every evolution in this class's family, grouped by tier
  const fam = new Set([cls]); let grew = true; while (grew) { grew = false; for (const k in EVO) if (fam.has(EVO[k].from) && !fam.has(k)) { fam.add(k); grew = true; } }
  return [1, 2, 3].map(t => Object.keys(EVO).filter(k => EVO[k].tier === t && fam.has(k)));
}
function admSetEvo(k) { // take the path, and its ancestors, at any tier
  const c = admHero(), E = EVO[k]; c.evo = k; c.lvl = Math.max(c.lvl, EVOLV[E.tier - 1]);
  let p = k; while (p && EVO[p]) { if (!c.seen.includes(p)) c.seen.push(p); p = EVO[p].from; }
  persist(); admToast(E.n);
}
function aBtn(x, y, w, label, fn, o = {}) { btn(x, y, w, 15, label, () => { fn(); SFX.click(); }, o); }
function drawAdmin() {
  drawArena('#c83040');
  panel(4, 4, 312, 312, '#c83040');
  T('Admin', 12, 10, '#ff6a6a'); T('dev panel', 18 + textW('Admin'), 10, COL.dark);
  aBtn(262, 8, 48, 'Close', closeAdmin, { col: COL.white });
  ADM_TABS.forEach(([id, n], i) => aBtn(10 + i * 61, 26, 58, n, () => { ADM.tab = id; ADM.resetArm = 0; }, { sel: ADM.tab === id, col: ADM.tab === id ? COL.gold : COL.dim }));
  const c = admHero(), x0 = 12; let y = 50;
  const lab = (s, yy) => T(s, x0, yy, COL.dim);
  if (ADM.tab === 'travel') {
    for (let a = 0; a < 4; a++) {
      T(ACTS[a].roman, x0, y + 4, ACTS[a].c); T(ACTS[a].n, x0 + 20, y + 4, COL.white);
      for (let l = 0; l < 3; l++) { const li = a * 3 + l; aBtn(176 + l * 46, y, 42, (a + 1) + '-' + (l + 1), () => admGo(li), { col: l === 2 ? '#ff9a9a' : COL.white }); }
      y += 20;
    }
    y += 6; lab('Boss, starting phase', y); y += 14;
    BOSS_LV.forEach((li, i) => {
      const k = LEVELS[li].w[2][0], P = BOSS[k].phases; T(FOES[k].n, x0, y + 4, ACTS[i].c);
      for (let p = 0; p < P; p++) aBtn(150 + p * 40, y, 36, 'P' + (p + 1), () => admGo(li, p), { col: COL.gold });
      y += 20;
    });
    y += 6; aBtn(x0, y, 140, 'Unlock all levels', () => { save.unlocked = 11; save.act4 = true; save.cleared = save.cleared.map(() => true); persist(); admToast('All levels open'); }, { col: COL.green });
  } else if (ADM.tab === 'hero') {
    T(charName(c) + '  Lv ' + c.lvl, x0, y, TINT[c.id]); y += 14;
    lab('Level', y + 4); [['-5', -5], ['-1', -1], ['+1', 1], ['+5', 5], ['Max', 99]].forEach(([s, d], i) => aBtn(70 + i * 46, y, 42, s, () => { c.lvl = clamp(d === 99 ? 20 : c.lvl + d, 1, 20); c.xp = 0; persist(); }));
    y += 20; lab('XP', y + 4); bar(70, y + 6, 100, 3, c.xp / xpNeed(c.lvl), COL.blue);
    aBtn(176, y, 64, '+50%', () => { c.xp += Math.round(xpNeed(c.lvl) * .5); while (c.xp >= xpNeed(c.lvl) && c.lvl < 20) { c.xp -= xpNeed(c.lvl); c.lvl++; } persist(); });
    aBtn(244, y, 60, 'Fill', () => { c.xp = xpNeed(c.lvl) - 1; persist(); });
    y += 20; lab('Scrap ' + save.scrap, y + 4); aBtn(176, y, 64, '+10', () => { save.scrap += 10; persist(); }); aBtn(244, y, 60, '+100', () => { save.scrap += 100; persist(); });
    y += 20; lab('Perfects ' + save.perfects, y + 4); aBtn(176, y, 64, '+10', () => { save.perfects += 10; persist(); }); aBtn(244, y, 60, '+100', () => { save.perfects += 100; persist(); });
    y += 22; lab('Class', y + 4); ['warrior', 'archer', 'mage'].forEach((id, i) => aBtn(70 + i * 78, y, 74, CLS[id].n, () => admSwitchClass(id), { sel: save.cls === id, col: TINT[id] }));
    y += 22; lab('Evolution (any tier)', y); y += 12;
    admEvos(c.id).forEach((ks, t) => { T('T' + (t + 1), x0, y + 4, COL.dark); let xx = 34; ks.forEach(k => { const w = textW(EVO[k].n) + 10; if (xx + w > 308) { xx = 34; y += 17; } aBtn(xx, y, w, EVO[k].n, () => admSetEvo(k), { sel: c.evo === k, col: COL.gold }); xx += w + 4; }); y += 18; });
    aBtn(x0, y, 120, 'No evolution', () => { c.evo = null; persist(); }); aBtn(138, y, 166, 'Unlock all skills', () => { c.lvl = 20; save.cleared = save.cleared.map(() => true); save.unlocked = 11; save.act4 = true; for (const n of buildTree(c.id).N) if (!c.seen.includes(n.id)) c.seen.push(n.id); persist(); admToast('All nodes lit'); }, { col: COL.green });
  } else if (ADM.tab === 'gear') {
    T('Spawn for ' + CLS[c.id].n + '  (bag ' + save.inv.length + '/' + TUNE.invMax + ')', x0, y, COL.white); y += 16;
    lab('Slot', y + 4); SLOTS.forEach((s, i) => aBtn(52 + (i % 3) * 84, y + Math.floor(i / 3) * 18, 80, s, () => { ADM.slot = i; }, { sel: ADM.slot === i }));
    y += 42; lab('Rarity', y + 4); RAR.forEach((r, i) => aBtn(52 + (i % 3) * 84, y + Math.floor(i / 3) * 18, 80, r.n, () => { ADM.rar = i; ADM.uniq = false; }, { sel: !ADM.uniq && ADM.rar === i, col: r.c }));
    y += Math.ceil(RAR.length / 3) * 18 + 6; aBtn(52, y, 164, ADM.uniq ? 'Unique: on' : 'Unique: off', () => { ADM.uniq = !ADM.uniq; }, { sel: ADM.uniq, col: COL.gold });
    y += 24; aBtn(52, y, 164, 'Spawn item', admSpawn, { col: COL.green });
    y += 22; aBtn(52, y, 164, 'Open gear screen', () => { ADM.ret = 'camp'; tab = c.id; scene = 'gear'; });
  } else if (ADM.tab === 'cheat') {
    const tog = (lbl, k) => { aBtn(x0, y, 200, lbl + (ADM[k] ? ': on' : ': off'), () => { ADM[k] = !ADM[k]; }, { sel: ADM[k], col: ADM[k] ? COL.green : COL.dim }); y += 20; };
    tog('God mode', 'god'); tog('One-hit kills', 'ohk'); tog('Always perfect', 'perfect'); tog('FPS + hitboxes', 'overlay');
    y += 4; lab('Game speed x' + WAM.timeScale, y); y += 14;
    [.25, .5, 1, 2, 4].forEach((s, i) => aBtn(x0 + i * 58, y, 54, 'x' + s, () => { WAM.timeScale = s; }, { sel: WAM.timeScale === s }));
  } else {
    T('Save: ' + CLS[c.id].n + ' Lv ' + c.lvl + ', ' + save.cleared.filter(Boolean).length + '/12 cleared', x0, y, COL.white); y += 20;
    aBtn(x0, y, 200, ADM.resetArm ? 'Sure? tap again' : 'Reset save', () => { if (!ADM.resetArm) { ADM.resetArm = 1; return; } ADM.resetArm = 0; localStorage.removeItem(SAVE_KEY); newSave(); B = null; ADM.ret = 'title'; scene = 'title'; }, { col: ADM.resetArm ? COL.red : COL.white });
    y += 24; wrap('Open with L, or tap the W.A.M. logo 5 times. Cheats are for testing; they are not saved.', 290).forEach(l => { T(l, x0, y, COL.dark); y += 11; });
  }
  if (ADM.toast) { ADM.toast.t -= 1 / 60; if (ADM.toast.t <= 0) ADM.toast = null; else { const w = Math.min(296, textW(ADM.toast.s) + 16); panel(160 - w / 2, 290, w, 18, COL.gold); T(ADM.toast.s, 160, 295, COL.gold, 1, 'c'); } }
}
function drawAdminOverlay(dt) {
  if (!ADM.overlay) return;
  ADM.fps += ((dt > 0 ? 1 / dt : 60) - ADM.fps) * .05;
  ctx.globalAlpha = .7; for (const u of UI) { ctx.strokeStyle = u.drag ? '#3aa0ff' : '#ff3a8a'; ctx.strokeRect(u.x + .5, u.y + .5, u.w - 1, u.h - 1); } ctx.globalAlpha = 1;
  if (B && scene === 'battle') for (const f of B.foes) if (!f.dead) { const [cx, cy] = foeCenter(f); rect(cx - 1, cy - 1, 3, 3, '#ff3a8a'); }
  rect(-OX + 2, -OY + 2, 64, 13, '#000'); T(Math.round(ADM.fps / Math.max(.25, WAM.timeScale)) + ' fps', -OX + 5, -OY + 4, '#7ee07e');
}
