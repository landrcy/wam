// ---- Ultimate Forms: level 15+ heroes with a tier-3 evolution charge a meter by dealing damage, then transform (K / ULT button) ----
const ULT_LV = 15, ULT_DUR = 7, ULT_FILL = 30; // meter = 30 base hits of damage
// fx: special power while transformed; deco: how the form looks
const ULT = {
  crusader: { n: 'Holy Avatar', c: '#ffe070', c2: '#fff8d8', fx: 'radiance', deco: 'wings' },
  bastion: { n: 'Living Fortress', c: '#a6caff', c2: '#e8f0ff', fx: 'aegis', deco: 'bulwark' },
  sunknight: { n: 'Solar Champion', c: '#ffb040', c2: '#fff0a0', fx: 'radiance', deco: 'sun' },
  seraph: { n: 'Archon', c: '#fff4d0', c2: '#ffffff', fx: 'rebirth', deco: 'wings' },
  conqueror: { n: 'Warlord Ascendant', c: '#ff9a3a', c2: '#ffe0a0', fx: 'execute', deco: 'crown' },
  warmaster: { n: 'Cyclone King', c: '#e8e8f0', c2: '#ffffff', fx: 'whirl', deco: 'storm' },
  bloodlord: { n: 'Crimson Tyrant', c: '#d02a3a', c2: '#ff8a8a', fx: 'leech', deco: 'horns' },
  reaper: { n: 'Death Incarnate', c: '#8a7aa8', c2: '#e0d8ff', fx: 'execute', deco: 'scythe' },
  wildlord: { n: 'Spirit of the Wild', c: '#7ee07e', c2: '#d8ffd0', fx: 'pack', deco: 'antlers' },
  packleader: { n: 'Alpha Howl', c: '#c8a060', c2: '#fff0c0', fx: 'pack', deco: 'spirits' },
  tempest: { n: 'Storm Eye', c: '#6ac8ff', c2: '#e0f8ff', fx: 'storm', deco: 'storm' },
  skyhunter: { n: 'Sky Sovereign', c: '#8ad8ff', c2: '#ffffff', fx: 'pierce', deco: 'wings' },
  nightstalker: { n: 'Living Shadow', c: '#5a3a8a', c2: '#c8a8ff', fx: 'execute', deco: 'shadow' },
  phantom: { n: 'Phantom Legion', c: '#a8b8d8', c2: '#ffffff', fx: 'echo', deco: 'spirits' },
  marksman: { n: 'Godshot', c: '#ffd35a', c2: '#ffffff', fx: 'pierce', deco: 'sight' },
  hawkeye: { n: 'Hawk Spirit', c: '#e0b070', c2: '#fff4d0', fx: 'crit', deco: 'wings' },
  hellcaller: { n: 'Hell Gate', c: '#ff4a1a', c2: '#ffb040', fx: 'radiance', deco: 'horns' },
  cinderlord: { n: 'Living Inferno', c: '#ff7a1a', c2: '#ffe070', fx: 'radiance', deco: 'flames' },
  sunflare: { n: 'Dawnbringer', c: '#ffd040', c2: '#ffffff', fx: 'radiance', deco: 'sun' },
  ashborn: { n: 'Phoenix Rebirth', c: '#ff8a2a', c2: '#ffe070', fx: 'rebirth', deco: 'wings' },
  glacier: { n: 'Winter Throne', c: '#a8e8ff', c2: '#ffffff', fx: 'freeze', deco: 'frost' },
  blizzard: { n: 'White Storm', c: '#c8f0ff', c2: '#ffffff', fx: 'storm', deco: 'frost' },
  timeweaver: { n: 'Time Lord', c: '#e8d8a0', c2: '#ffffff', fx: 'echo', deco: 'clock' },
  voidwalker: { n: 'Void Avatar', c: '#8a4ad8', c2: '#e0c0ff', fx: 'crit', deco: 'void' },
};
const ULT_FX = { radiance: 'every hit bursts on all foes', aegis: 'immune, reflects all harm', rebirth: 'heals fast, half damage taken', execute: 'executes foes under 35%, +50% vs bosses', whirl: 'every hit strikes all foes', leech: 'heals 25% of damage', pack: 'spirit beasts join every hit', storm: 'lightning chains to all foes', pierce: 'shots pierce every foe', crit: 'every hit crits', echo: 'every hit echoes in full', freeze: 'foes are frozen in time' };
function ultOf(u) { const c = u && u.c; if (!c || c.lvl < ULT_LV || !c.evo || !EVO[c.evo] || EVO[c.evo].tier !== 3) return null; return ULT[c.evo] || null; }
function ultSt() { if (!B.ult) B.ult = { m: 0, on: 0, t: 0, tr: 0 }; return B.ult; }
const ultOn = () => !!(B && B.ult && B.ult.on);
function ultFill(u, dmg) { const U = ultOf(u); if (!U) return; const st = ultSt(); if (st.on) return; const was = st.m; st.m = Math.min(1, st.m + dmg / (u.s.dmg * ULT_FILL)); if (was < 1 && st.m >= 1) { num(u.x, u.y - 78, 'ULTIMATE READY', U.c); SFX.orb(); } }
function ultGo() {
  if (!B || B.state !== 'fight' || B.paused) return; const u = activeUnit(), U = ultOf(u); if (!U) return; const st = ultSt();
  if (ADM.ult) st.m = 1; if (st.on || st.m < 1) return;
  st.on = 1; st.t = ULT_DUR; st.tr = .9; st.m = 0; st.k = u.c.evo;
  B.hitstop = Math.max(B.hitstop || 0, .12); if (!RM) { B.quake = 6; B.impact = .3; }
  for (let i = 0; i < 3; i++) B.fx.push({ type: 'ring', x: u.x, y: u.y - 24, t: -i * .12, dur: .6, col: i % 2 ? U.c2 : U.c });
  for (let i = 0; i < 30; i++) spark(u.x, u.y - 24, i % 2 ? U.c : U.c2, 160);
  banner(U.n + '!', U.c, 1.4); u.hp = Math.min(u.max, u.hp + u.max * .15); SFX.ult();
  if (U.fx === 'freeze') B.slowT = Math.max(B.slowT, ULT_DUR);
}
function updateUlt(dt) {
  if (!B || !B.ult) return; const st = B.ult; if (st.tr > 0) st.tr -= dt; if (ADM.ult && !st.on) st.m = 1;
  if (!st.on) return; st.t -= dt; const u = activeUnit(); const U = ULT[st.k];
  if (U && u && U.fx === 'rebirth') u.hp = Math.min(u.max, u.hp + u.max * .05 * dt);
  if (U && U.fx === 'freeze') B.slowT = Math.max(B.slowT, .2);
  if (!RM && u && U && Math.random() < dt * 30) B.parts.push({ x: u.x + rnd(-16, 16), y: u.y - rnd(0, 44), vx: rnd(-10, 10), vy: -rnd(30, 70), t: 0, life: rnd(.3, .7), col: Math.random() < .5 ? U.c : U.c2, s: 1, g: -20 });
  if (st.t <= 0 || !u) { st.on = 0; if (u) num(u.x, u.y - 70, 'form fades', COL.dim); }
}
const ultDmgMul = () => ultOn() ? 1.6 : 1, ultCdMul = () => ultOn() ? .65 : 1;
function ultTaken(d, u) { if (!ultOn()) return d; const U = ULT[B.ult.k]; if (U.fx === 'aegis') { const f = liveFoes()[0]; if (f && d > 0) hitFoe(f, d * 2, { q: 'good' }, u); return 0; } return d * .5; }
function ultPreHit(u, f, dmg, info) { // multipliers that depend on the target
  if (!ultOn()) return dmg; const U = ULT[B.ult.k], isB = B.boss && B.boss.f === f;
  if (U.fx === 'crit' && !info.crit) dmg *= u.s.critDmg; if (U.fx === 'execute' && isB) dmg *= 1.5; return dmg;
}
function ultOnHit(u, f, dmg) { // extra effects after a hero hit while transformed
  if (!ultOn()) return; const U = ULT[B.ult.k], others = liveFoes().filter(o => o !== f), [cx, cy] = foeCenter(f);
  const all = (m, lab, col) => { for (const o of others) { const [ox, oy] = foeCenter(o); B.fx.push({ type: 'ring', x: ox, y: oy, t: 0, dur: .25, col }); hitFoe(o, dmg * m, { q: 'splash' }, u); } if (others.length && lab) num(cx, cy - 34, lab, col); };
  if (U.fx === 'radiance') all(.45, 'RADIANCE', U.c); else if (U.fx === 'whirl') all(.6, 'CYCLONE', U.c); else if (U.fx === 'storm') all(.5, 'STORM', U.c); else if (U.fx === 'pierce') all(.7, 'PIERCE', U.c);
  else if (U.fx === 'leech') { u.hp = Math.min(u.max, u.hp + dmg * .25); } else if (U.fx === 'echo') { setTimeout(() => { if (B && !f.dead && ultOn()) { num(cx, cy - 30, 'echo', U.c2); hitFoe(f, dmg, { q: 'good' }, u); } }, 160); }
  else if (U.fx === 'pack') { const t = pick(liveFoes()); if (t) { const [tx, ty] = foeCenter(t); B.fx.push({ type: 'ring', x: tx, y: ty, t: 0, dur: .3, col: U.c }); hitFoe(t, dmg * .6, { q: 'good' }, u); } }
  else if (U.fx === 'execute' && !f.dead && f.hp / f.max < .35 && !(B.boss && B.boss.f === f)) { num(cx, cy - 26, 'EXECUTE', U.c); hitFoe(f, f.hp + 1, { q: 'perfect' }, u); }
}
// ---- drawing: aura behind, form details in front ----
function drawUltBack(u, x, y) {
  const st = B.ult; if (!st || !st.on || u.id !== save.active) return; const U = ULT[st.k], t = RM ? 0 : B.t, k = Math.min(1, (ULT_DUR - st.t) / .3) * Math.min(1, st.t / .5);
  ctx.globalAlpha = .35 * k; for (let i = 0; i < 14; i++) { const h = 10 + Math.round((Math.sin(t * 7 + i * 1.7) + 1) * 6) + (i > 3 && i < 10 ? 10 : 0); rect(x + 2 + i * 3.4 | 0, y + 46 - h, 3, h, i % 2 ? U.c : U.c2); } ctx.globalAlpha = 1;
  const D = U.deco, cx = x + 24, wf = RM ? 0 : Math.round(Math.sin(t * 6) * 2);
  if (D === 'wings') for (const s of [-1, 1]) for (let j = 0; j < 6; j++) { const len = 18 - j * 2; for (let q = 0; q < len; q++) rect(cx + s * (8 + q) - (s < 0 ? 1 : 0), y + 14 + j * 3 - Math.round(q * .5) + (q > len - 4 ? wf : 0), 1, 2, j % 2 ? U.c2 : U.c); }
  if (D === 'sun' || D === 'clock') { ctx.globalAlpha = .7; ringPx(cx, y + 16, 22, U.c); ringPx(cx, y + 16, 20, U.c2, 3); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + (D === 'clock' ? t * .8 : t * .3); rect(Math.round(cx + Math.cos(a) * 25), Math.round(y + 16 + Math.sin(a) * 25), 2, 2, U.c); } ctx.globalAlpha = 1; }
  if (D === 'shadow' || D === 'void') { ctx.globalAlpha = .5; for (let i = 0; i < 3; i++) drawChar(u.c, x - 6 - i * 6 + (RM ? 0 : Math.round(Math.sin(t * 3 + i) * 2)), y, PSC, 'flash'); ctx.globalAlpha = 1; }
}
function drawUltFront(u, x, y) {
  const st = B.ult; if (!st || u.id !== save.active) return; const U = st.k && ULT[st.k]; if (!U) return; const t = RM ? 0 : B.t, cx = x + 24;
  if (st.tr > 0) { const k = st.tr / .9; ctx.globalAlpha = k * .8; rect(x - 4, y - 4, 56, 56, '#ffffff'); ctx.globalAlpha = 1; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = (1 - k) * 40; rect(Math.round(cx + Math.cos(a) * r), Math.round(y + 24 + Math.sin(a) * r * .7), 2, 2, i % 2 ? U.c : U.c2); } }
  if (!st.on) return; const D = U.deco;
  if (D === 'wings' || D === 'crown' || D === 'sun') { const hy = y - 6 + (RM ? 0 : Math.round(Math.sin(t * 3))); if (D === 'crown') { rect(cx - 7, hy + 2, 14, 3, U.c); for (let i = 0; i < 4; i++) rect(cx - 7 + i * 4, hy - 1, 2, 3, U.c); rect(cx - 1, hy + 3, 2, 1, '#ff3a5a'); } else { for (let i = -6; i <= 6; i++) rect(cx + i, hy - (Math.abs(i) > 4 ? 0 : 1), 1, 1, U.c2); rect(cx - 7, hy, 1, 1, U.c); rect(cx + 7, hy, 1, 1, U.c); } }
  if (D === 'horns' || D === 'antlers') for (const s of [-1, 1]) for (let q = 0; q < 7; q++) { rect(cx + s * (6 + q) - (s < 0 ? 1 : 0), y + 2 - q - (q > 3 ? q - 3 : 0), 2, 2, q % 2 ? U.c2 : U.c); if (D === 'antlers' && q === 4) rect(cx + s * (8 + q), y - 6 - q, 1, 3, U.c); }
  if (D === 'frost' || D === 'void' || D === 'storm' || D === 'spirits' || D === 'flames' || D === 'clock') { const n = D === 'storm' ? 5 : 4; for (let i = 0; i < n; i++) { const a = t * (D === 'storm' ? 4 : 2) + i / n * Math.PI * 2, ox = Math.round(cx + Math.cos(a) * 26), oy = Math.round(y + 24 + Math.sin(a) * 12);
    if (D === 'frost') { rect(ox - 1, oy - 3, 2, 7, U.c2); rect(ox - 3, oy, 6, 1, U.c); } else if (D === 'void') { rect(ox - 2, oy - 2, 5, 5, '#1a0a2a'); rect(ox - 1, oy - 1, 3, 3, U.c); rect(ox, oy, 1, 1, U.c2); } else if (D === 'storm') { rect(ox, oy - 3, 1, 3, U.c2); rect(ox + 1, oy, 1, 3, U.c); } else if (D === 'flames') { rect(ox - 1, oy - 2, 3, 4, U.c); rect(ox, oy - 4, 1, 3, U.c2); } else if (D === 'clock') { rect(ox - 1, oy - 1, 3, 3, U.c); } else { ctx.globalAlpha = .6; rect(ox - 3, oy - 2, 7, 4, U.c2); rect(ox + 3, oy - 4, 2, 3, U.c2); ctx.globalAlpha = 1; } } }
  if (D === 'bulwark') { ctx.globalAlpha = .55 + (RM ? 0 : .2 * Math.sin(t * 5)); frame(x - 6, y - 6, 60, 60, U.c); corners(x - 8, y - 8, 64, 64, U.c2, 6); ctx.globalAlpha = 1; }
  if (D === 'scythe') { const sx = x + 46, sy = y - 4; for (let q = 0; q < 40; q++) rect(sx - (q >> 3), sy + q, 1, 1, '#5a4a3a'); for (let q = 0; q < 16; q++) rect(sx - q, sy + Math.round(q * q / 40), 2, 1, U.c2); }
  if (D === 'sight') { ctx.globalAlpha = .7; ringPx(cx + 30, y + 12, 5, U.c); rect(cx + 30, y + 4, 1, 4, U.c); rect(cx + 30, y + 17, 1, 4, U.c); ctx.globalAlpha = 1; }
}
// HUD meter: top-left under the level name; click to transform
function drawUltHud() {
  const u = activeUnit(), U = ultOf(u); if (!U) return; const st = ultSt(), full = st.m >= 1 || ADM.ult;
  const x = 8, y = 18, w = 82; rect(x, y, w, 11, '#0c0c10'); frame(x, y, w, 11, full ? U.c : '#3a3a44');
  const fw = st.on ? Math.round((w - 4) * st.t / ULT_DUR) : Math.round((w - 4) * st.m); rect(x + 2, y + 2, fw, 7, st.on ? U.c2 : U.c); if (full && !st.on && !RM && Math.floor(B.t * 4) % 2) rect(x + 2, y + 2, w - 4, 1, '#ffffff');
  T(st.on ? U.n.split(' ')[0] : full ? (TOUCH ? 'ULT ready' : 'K  ULT ready') : 'ultimate', x + w / 2, y + 2, full || st.on ? '#000' : COL.dim, 1, 'c');
  hit(x, y, w, 11, ultGo);
}
