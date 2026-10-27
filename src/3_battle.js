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
    buff: { dmg: 0, spd: 0, heal: 0 }, gobUsed: {}, label: null, flash: null, banner: null, paused: false, msgs: [] };
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
      x, y, ox: 90 + i * 12, flash: 0, kx: 0, dead: false, burnT: 0, burnDps: 0, burnAcc: 0, chill: 0, freeze: 0, lt: 0, atk: 0, reviveT: 0, seed: rnd(10) };
  });
  B.target = B.foes.findIndex(f => f.T.boss) >= 0 ? B.foes.findIndex(f => f.T.boss) : 0;
  B.gobUsed = {};
  const tip = keys.map(k => FOE_TIPS[k]).find(Boolean);
  if (tip && w === 0) B.tip = { txt: tip, t: 3.5 };
}
const activeUnit = () => B.units.find(u => u.id === save.active && !u.dead);
const liveFoes = () => B.foes.filter(f => !f.dead);
function sprSize(key, sc) { const r = SPR[key]; return [r[0].length * sc, r.length * sc]; }
function foeCenter(f) { const [w, h] = sprSize(f.T.spr, f.T.sc); return [f.x + f.ox + f.kx, f.y - h / 2 - (f.T.fly ? 10 : 0)]; }
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
  const p = clamp(TUNE.perfectZone * u.s.perfZ * zm, .02, g * .8);
  return { g, p };
}
function markerSpeed() {
  const u = activeUnit(); let v = TUNE.markerSpeed * (1 + .07 * B.act) * (u ? u.s.mark : 1);
  v *= 1 + .15 * liveFoes().filter(f => f.T.stare).length;
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
  B.label = { q, t: .7 };
  B.zc = rnd(.18, .82);
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
  if (f.T.ghost && info.q === 'good') dmg *= .5;
  if (f.T.plated && info.q === 'good') dmg *= .6;
  dmg = Math.max(1, Math.round(dmg));
  f.hp -= dmg; f.flash = .09; f.kx = info.q === 'perfect' ? 8 : info.q === 'splash' ? 2 : 4;
  const [cx, cy] = foeCenter(f);
  const col = info.q === 'perfect' ? COL.gold : info.crit ? '#ff9a6a' : info.q === 'splash' ? COL.dim : COL.white;
  num(cx + rnd(-6, 6), cy - 10, (info.crit ? dmg + '!' : '' + dmg), col, info.q === 'perfect' && info.manual ? 2 : 1);
  const n = info.q === 'perfect' ? 16 : info.q === 'splash' ? 3 : 7;
  const mc = PAL[SPR[f.T.spr][Math.floor(SPR[f.T.spr].length / 2)].replace(/\./g, '')[0]] || '#fff';
  for (let i = 0; i < n; i++) spark(cx, cy, i % 2 ? '#ffffff' : (info.q === 'perfect' ? COL.gold : mc), info.q === 'perfect' ? 150 : 90);
  if (u && u.s.steal) u.hp = Math.min(u.max, u.hp + dmg * u.s.steal);
  if (u && u.s.chill) { f.chill = 3; if (info.q === 'perfect' && info.manual) { f.freeze = u.s.freeze; f.wind = 0; } }
  if (f.hp <= 0) killFoe(f);
}
function killFoe(f) {
  f.hp = 0; f.dead = true; shatter(f.T.spr, foeCenter(f)[0], f.y - (f.T.fly ? 10 : 0), f.T.sc, f.T.outline); SFX.kill();
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
function foeAttack(f) {
  f.atk++; f.lt = .2;
  const alive = B.units.filter(u => !u.dead); if (!alive.length) return;
  const slam = f.T.slam && f.atk % f.T.slam === 0;
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
  const rows = SPR[key], h = rows.length, w = rows[0].length, x0 = cx - w * sc / 2, y0 = by - h * sc;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
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
  B.shake = Math.max(0, B.shake - dt * 30);
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
  if (B.state === 'intro') { B.st -= dt; if (B.st <= 0) B.state = 'fight'; }
  if (B.state === 'clear') {
    B.st -= dt;
    if (B.st <= 0) { if (B.wave < 2) { B.wave++; spawnWave(B.wave); B.state = 'fight'; banner('Wave ' + (B.wave + 1) + '/3', COL.white, .9); } else winLevel(); }
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
      if (f.burnAcc >= 1) { const d = Math.floor(f.burnAcc); f.burnAcc -= d; f.hp -= d; if (f.hp <= 0) { killFoe(f); continue; } }
    }
    if (f.freeze > 0) { f.freeze -= dt; continue; }
    const rate = f.chill > 0 ? .6 : 1; f.chill -= dt;
    if (f.wind > 0) { f.wind -= dt * rate; if (f.wind <= 0) { f.wind = 0; foeAttack(f); f.timer = f.T.per * rnd(.85, 1.15); } }
    else { f.timer -= dt * rate; if (f.timer <= 0) { f.wind = f.T.wind; SFX.wind(); } }
    if (B.state !== 'fight') return;
  }
  if (!liveFoes().length && !B.foes.some(f => f.reviveT > 0) && !B.proj.length && B.state === 'fight') {
    B.state = 'clear'; B.st = 1.1; if (B.wave < 2) banner('Wave clear', COL.green, .9);
  }
}
