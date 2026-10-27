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
    buff: { dmg: 0, spd: 0, heal: 0 }, gobUsed: {}, label: null, flash: null, banner: null, paused: false, msgs: [], quake: 0, zBase: .5, boss: null, trail: [], heat: 0, slowT: 0, zc2: .2, zw: .8, drawing: false, drawT: 0, tapMode: false, over: 0, runes: [], runeQ: [], novaC: {}, shC: {}, crackFx: null, barShake: 0, eproj: [], combo: 0, impact: 0, zoom: null, dust: [] };
  B.units = save.party.map((id, i) => {
    const c = save.chars[id], s = calcStats(c), [x, y] = PPOS[n][i];
    return { id, c, s, hp: s.hp, max: s.hp, x, y, bx: x, ox: -60, lt: 0, hurt: 0, atkT: rnd(.4, 1.2), dead: false, guard: 0, spr: charSpr(c), dash: null, hop: 0, kb: 0, cast: 0, seed: i * 1.7 };
  });
  const bar = B.units.reduce((a, u) => a + (u.s.barrier || 0), 0);
  B.units.forEach(u => u.s.arm += bar);
  if (!save.party.includes(save.active)) save.active = save.party[0];
  spawnWave(0); newTarget();
  scene = 'battle';
  banner(ACTS[B.act].roman + '-' + (li % 3 + 1) + '  ' + LEVELS[li].n, ACTS[B.act].c, 1.4);
}
function spawnWave(w) {
  const keys = LEVELS[B.li].w[w], n = keys.length;
  B.foes = keys.map((k, i) => {
    const T = FOES[k], L = B.li + 1, [x, y] = FPOS[n][i];
    const hp = Math.round(TUNE.foeHp * Math.pow(TUNE.foeHpGrow, L - 1) * T.hp * (T.boss ? TUNE.bossHp : 1) * TUNE.soloHp * (TUNE.soloCls[save.cls] || [1])[0]);
    return { k, T, L, hp, max: hp, dmg: TUNE.foeDmg * Math.pow(TUNE.foeDmgGrow, L - 1) * T.dmg * TUNE.soloDmg * (TUNE.soloCls[save.cls] || [1, 1])[1], timer: T.per * TUNE.foeRate * rnd(.7, 1.1) + .9, wind: 0, per: T.per * TUNE.foeRate, pend: null, anim: null, dodge: 0,
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
// each class has its own timing mechanic: warrior sword bar, archer bow draw (hold + release), mage rune circle
const MECH = { warrior: 'sword', archer: 'bow', mage: 'rune' };
const mechOf = u => u ? MECH[u.id] || 'sword' : 'sword';
const circD = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };
function aimD() { return Math.abs(B.mk - B.zc); }
function newTarget() {
  const m = mechOf(activeUnit());
  if (m === 'bow') { B.zc = B.zBase = rnd(.45, .88); B.zc2 = B.zc > .66 ? B.zc - rnd(.2, .28) : Math.min(.96, B.zc + rnd(.16, .24)); B.drawing = false; B.tapMode = false; B.over = 0; B.mk = 0; B.md = 1; return; }
  if (m === 'rune') {
    // mana vial: one or more fill lines, bottom to top; the liquid rises and must be stopped on each line in turn
    const n = Math.random() < .12 + .06 * B.act ? 3 : Math.random() < .3 ? 2 : 1; B.runes = [];
    let a = n === 1 ? rnd(.45, .85) : n === 2 ? rnd(.32, .5) : rnd(.26, .36);
    for (let i = 0; i < n; i++) { B.runes.push(Math.min(.9, a)); a += rnd(.2, .26); }
    B.runeQ = []; B.zc = B.zBase = B.runes[0]; B.mk = 0; B.md = 1; return;
  }
  B.zc = B.zBase = rnd(.18, .82); rerollBar();
}
function pressJ() {
  if (!B || B.state !== 'fight' || B.paused) return;
  const u = activeUnit(); if (!u) return;
  if (mechOf(u) !== 'bow') return strike();
  if (B.cd > 0) return;
  if (ADM.perfect) B.mk = B.zc;
  if (!B.drawing) { B.drawing = true; B.drawT = B.t; B.tapMode = false; B.over = 0; B.mk = 0; SFX.click(); }
  else if (B.tapMode) bowRelease();
}
function releaseJ() {
  if (!B || !B.drawing || B.tapMode) return;
  if (B.t - B.drawT < .15) { B.tapMode = true; return; }   // a quick tap: keep drawing, tap again to loose
  bowRelease();
}
function bowRelease() { if (!B.drawing) return; strike(); }
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
  save.active = u.id; SFX.click(); B.cd = Math.max(B.cd, .15); newTarget();
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
  const { g, p } = zones(), d = aimD(), mech = mechOf(u);
  if (mech === 'bow' && !B.drawing) return;
  const bv = unitBar(u);
  let q = d <= p / 2 ? 'perfect' : d <= g / 2 ? 'good' : 'miss', ward = false;
  if (bv === 'twin' && q !== 'perfect' && Math.abs(B.mk - B.zc2) <= p / 2) q = 'perfect';
  if (mech === 'bow') { B.drawing = false; B.tapMode = false; SFX.click(); }
  if (mech === 'rune' && q !== 'miss') {
    B.runeQ.push(q);
    if (B.runeQ.length < B.runes.length) {   // light this rune, aim for the next one
      B.zc = B.zBase = B.runes[B.runeQ.length]; B.flash = { q, t: .3, x: B.mk }; B.label = { q, t: .5, x: B.mk, rune: B.runeQ.length + '/' + B.runes.length }; SFX.click(); return;
    }
    q = B.runeQ.every(x => x === 'perfect') ? 'perfect' : 'good';
  }
  if (bv === 'guard' && q === 'miss' && Math.abs(B.mk - B.zw) <= g * .3) { q = 'good'; ward = true; }
  B.cd = u.s.cd * (B.buff.spd > 0 ? .67 : 1);
  B.flash = { q, t: .3, x: B.mk };
  if (q === 'perfect') { save.perfects++; B.streak++; B.perf++; save.bestStreak = Math.max(save.bestStreak, B.streak); }
  else if (q === 'miss') B.streak = 0;
  B.label = { q, t: .7, x: B.mk };
  newTarget();
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
  if (ADM.ohk) dmg = Math.max(dmg, f.hp); f.hp -= dmg; const isB = B.boss && B.boss.f === f; f.flash = isB ? (info.manual ? .06 : Math.max(f.flash, 0)) : .09;
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
    if (autoEquipDrop(it)) { it.equipped = true; setTimeout(() => { if (B) { num(dx0, dy0 - 30, 'equipped!', COL.gold); B.fx.push({ type: 'ring', x: B.units[0].x, y: B.units[0].y - 24, t: 0, dur: .45, col: COL.gold }); } }, 700); }
    else if (save.autoScrap && isWorse(it)) { it.scrapped = true; save.scrap += it.rar + 1; setTimeout(() => B && num(dx0, dy0 - 30, 'scrapped +' + (it.rar + 1), COL.dim), 500); }
    else if (save.inv.length >= TUNE.invMax) { it.scrapped = true; save.scrap += it.rar + 1; num(dx0, f.y - 40, 'bag full +' + (it.rar + 1), COL.dim); }
    else if (save.autoScrap && isWorse(it)) { it.scrapped = true; save.scrap += it.rar + 1; num(dx0, f.y - 40, 'scrapped +' + (it.rar + 1), COL.dim); }
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
    d = Math.max(1, Math.round(d)); if (ADM.god) d = 0; u.hp -= d;
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
  if (first && li === 2) { save.goblets.push('blue'); msgs.push({ title: 'Blue Goblet', char: save.chars[save.cls], col: '#5a8cff', lines: ['Found the Blue Goblet.'] }); }
  if (first && li === 5) { save.goblets.push('green'); msgs.push({ title: 'Green Goblet', char: save.chars[save.cls], col: '#5fd06a', lines: ['Found the Green Goblet.'] }); }
  if (first && li === 8) {
    save.goblets.push('red');
    msgs.push({ title: 'Act III cleared', char: save.chars[save.cls], col: COL.gold, lines: ['The Black Keep falls silent.', 'Found the Red Goblet.', '', 'But something stirs beyond the keep...', 'The void hungers for perfection.'] });
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
  if (B.boss && B.boss.f && !B.boss.f.dead && !B.boss.outside && !B.boss.mv) B.boss.f.x = BOSS_POS[0] + shf * .4;
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
  const mech = mechOf(activeUnit());
  if (mech === 'bow') {
    if (B.drawing) { B.mk += markerSpeed() * .8 * dt; if (B.mk >= 1.12) { B.mk = 1.12; B.over += dt; if (B.over > .45 && B.state === 'fight') { num(60, 270, 'overdrawn', '#ff6a6a'); bowRelease(); } } }
    else B.mk = Math.max(0, B.mk - dt * 4);
  } else if (mech === 'rune') { // vial fills only when the hero is ready; later lines in a cast fill faster
    if (B.cd <= 0) B.mk += B.md * markerSpeed() * .5 * (1 + .25 * B.runeQ.length) * dt;
    if (B.mk < 0) { B.mk = 0; B.md = 1; }
    B.spill = Math.max(0, (B.spill || 0) - dt);
    if (B.state === 'fight' && B.cd <= 0 && B.mk > B.zc + zones().g / 2 + .06) { B.spill = .6; B.spillLv = B.mk; num(160, 244, 'spilled', '#ff6a6a'); strike(); newTarget(); }
    if (B.mk > 1.05) B.mk = 0;
  }
  else { B.mk += B.md * markerSpeed() * dt;
  if (B.mk > 1) { B.mk = 2 - B.mk; B.md = -1; } if (B.mk < 0) { B.mk = -B.mk; B.md = 1; } }
  if (B.state !== 'fight') return;
  B.cd = Math.max(0, B.cd - dt); B.slowT = Math.max(0, B.slowT - dt);
  for (const k in B.buff) B.buff[k] = Math.max(0, B.buff[k] - dt);
  if (!activeUnit()) { const nx = B.units.find(u => !u.dead); if (nx) { save.active = nx.id; newTarget(); } }
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
