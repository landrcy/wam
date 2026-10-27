// ---- giant out-of-box swings and per-act terrain that transforms on breakout and each phase ----
const GIANT = { // per boss: weapon look per phase [shaft, head, glow]
  gobchief: [['#5a3216', '#8a8a96', '#d8d8e0'], ['#5a3216', '#ff7a1a', '#fff3a8']],
  treant: [['#4a3220', '#62a038', '#b0ff7a'], ['#3a2618', '#cfc6aa', '#b0ff7a'], ['#1a1210', '#ff7a1a', '#ffd060']],
  darkknight: [['#7a7a86', '#e4ecf6', '#ffffff'], ['#5a5a66', '#ff4a5a', '#ffd0d0'], ['#16061e', '#8a2ad0', '#e6a8ff']],
  mirror: [['#d8b04a', '#9fe6f4', '#ffffff'], ['#d8b04a', '#b480ff', '#ffffff'], ['#1a1420', '#9fe6f4', '#ffffff'], ['#1a1420', '#d07aff', '#ffffff']] };
function giantSwing(f, targets) { // queued by bossAttackFx when the boss fights from outside
  const bo = B.boss, [bcx, bcy] = foeCenter(f), u = targets[0] || B.units[0]; if (!u) return;
  const n = bo.k === 'mirror' && bo.phase >= 3 ? 3 : 1;
  for (let i = 0; i < n; i++) B.fx.push({ type: 'giant', t: -i * .09, dur: .5, px: bcx, py: bcy - 20, tx: u.x, ty: u.y - 16, k: bo.k, ph: bo.phase, i, done: 0 });
}
function drawGiant(e) {
  if (e.t < 0) return; const p = clamp(e.t / e.dur, 0, 1), C = (GIANT[e.k] || GIANT.darkknight)[Math.min(e.ph, (GIANT[e.k] || []).length - 1)] || GIANT.darkknight[0];
  const dx = e.tx - e.px, dy = e.ty - e.py, L = Math.hypot(dx, dy) + 70, mid = Math.atan2(dy, dx), side = e.px > 160 ? 1 : -1;
  const sweep = RM ? 0 : 1.05, k = p < .55 ? ease(p / .55) : 1, an = mid - side * sweep * (1 - 2 * k) * .6 + e.i * .22 * side;
  const al = p < .8 ? 1 : (1 - p) / .2; ctx.globalAlpha = al * (p > .55 ? .75 : 1);
  const W = e.k === 'treant' ? 16 : e.k === 'gobchief' ? 12 : 9;
  // motion smear behind the blade
  if (!RM && p < .6) for (let s = 1; s <= 3; s++) { const a2 = an + side * s * .09; ctx.globalAlpha = al * (.22 / s); for (let d = L * .35; d < L; d += 4) rect(e.px + Math.cos(a2) * d - W / 2, e.py + Math.sin(a2) * d - W / 2, W, W, C[2]); }
  ctx.globalAlpha = al;
  for (let d = 0; d < L; d += 3) { // shaft then a heavy head on the last third
    const x = e.px + Math.cos(an) * d, y = e.py + Math.sin(an) * d, head = d > L * .62, w = head ? W + (e.k === 'gobchief' ? 8 : 2) : Math.max(5, W * .55);
    rect(x - w / 2 - 1, y - w / 2 - 1, w + 2, w + 2, '#0a0810'); rect(x - w / 2, y - w / 2, w, w, head ? C[1] : C[0]); rect(x - w / 2, y - w / 2, Math.max(2, w * .4), Math.max(2, w * .4), lighten(head ? C[1] : C[0], .3));
    if (head && (d / 3) % 4 < 1) { const nx = -Math.sin(an), ny = Math.cos(an); for (const sg of [-1, 1]) rect(x + nx * sg * (w / 2 + 3) - 2, y + ny * sg * (w / 2 + 3) - 2, 4, 4, e.k === 'treant' ? C[0] : '#d8d8e0'); }
  }
  const hx = e.px + Math.cos(an) * L, hy = e.py + Math.sin(an) * L; ctx.globalAlpha = al * .5; rect(hx - 12, hy - 12, 24, 24, C[2]); ctx.globalAlpha = 1;
  if (p >= .55 && !e.done) { e.done = 1; quake(RM ? 3 : 10); if (!RM) B.impact = Math.max(B.impact || 0, .08); SFX.land && SFX.land();
    for (let i = 0; i < (RM ? 8 : 30); i++) B.parts.push({ x: e.tx + rnd(-14, 14), y: e.ty + 14, vx: rnd(-150, 150), vy: rnd(-220, -60), t: 0, life: rnd(.4, .9), col: i % 3 ? C[1] : '#3a2a1a', s: i % 2 ? 3 : 2, g: 420 }); }
}
// wind-up telegraph: a pulsing danger lane from the looming boss to the hero
function drawGiantTell() {
  const bo = B.boss; if (!bo || !bo.outside || bo.st !== 'fight') return; const f = bo.f; if (!(f.wind > 0)) return;
  const u = B.units.find(x => x.hp > 0); if (!u) return; const [bcx, bcy] = foeCenter(f), on = RM ? 1 : Math.floor(B.t * 12) % 2;
  ctx.globalAlpha = on ? .28 : .14; for (let d = 0, L = Math.hypot(u.x - bcx, u.y - 16 - bcy); d < L; d += 6) { const q = d / L; rect(bcx + (u.x - bcx) * q - 5, bcy + (u.y - 16 - bcy) * q - 5, 10, 10, '#ff3a3a'); }
  ctx.globalAlpha = 1; rect(u.x - 14, u.y + 2, 28, 2, on ? '#ff5a5a' : '#7a2020');
}
// terrain: level grows with each phase (and the breakout); eases in over a second, instant under reduced motion
function terrLevel(bo) { return bo ? Math.max(bo.phase, bo.outside ? 1 : 0) : 0; }
function drawTerrain() {
  const bo = B.boss; if (!bo) return; const L = terrLevel(bo); if (!L) return;
  if (bo.terrL !== L) { bo.terrL = L; bo.terrT = 0; } bo.terrT = Math.min(1, (bo.terrT || 0) + (RM ? 1 : 1 / 60 / 1.2));
  const k = ease(bo.terrT), act = B.act, t = RM ? 0 : B.t, gy = 248, x0 = -OX, x1 = VW - OX;
  const flood = (h, c1, c2, c3) => { const top = gy + 30 - h * k; for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) { const w = Math.round(Math.sin(x * .05 + t * 2) * 2); rect(x, top + w, 4, VH, c1); rect(x, top + w, 4, 2, c3); if ((x / 4 + Math.floor(t * 6)) % 7 === 0) rect(x, top + w + 4, 2, 2, c2); } };
  const cracks = (n, col, glow) => { for (let i = 0; i < n; i++) { let x = hh(i, 7, 1) * LW, y = 150 + hh(i, 7, 2) * 95; const m = Math.floor(10 * k); for (let s = 0; s < m; s++) { const nx = x + (hh(i, s, 3) - .5) * 14, ny = y + hh(i, s, 4) * 5; for (let q = 0; q < 1; q += .2) rect(x + (nx - x) * q, y + (ny - y) * q, 2, 1, col); if (glow && s % 3 === 0) { ctx.globalAlpha = .35 + Math.sin(t * 4 + i) * .15; rect(nx - 2, ny - 1, 4, 3, glow); ctx.globalAlpha = 1; } x = nx; y = ny; } } };
  const rocks = (n, c1, c2, rise) => { for (let i = 0; i < n; i++) { const x = (i % 2 ? hh(i, 9, 1) * 60 : LW - hh(i, 9, 1) * 60) + (i % 2 ? -OX * .6 : OX * .6), h = (18 + hh(i, 9, 2) * 40) * k, bob = rise ? Math.sin(t * 1.5 + i) * 4 : 0, y = rise ? 150 - hh(i, 9, 3) * 90 + bob : gy;
      rect(x - 7, y - h, 14, h, c1); rect(x - 7, y - h, 5, h, c2); rect(x - 5, y - h - 3, 10, 3, c2); if (rise) { rect(x - 4, y, 8, 4, c1); rect(x - 1, y + 4, 2, 3, c1); } } };
  if (act === 0) { cracks(6 + L * 3, '#1a0a04', '#ff7a1a'); rocks(L * 3, '#4a3a2a', '#6a5a44', false); if (L >= 2) flood(10, '#a02408', '#fff3a8', '#ffb03a'); }
  else if (act === 1) { cracks(6 + L * 2, '#1a1008', L >= 2 ? '#ff7a1a' : '#62a038'); for (let i = 0; i < L * 5; i++) { const x = hh(i, 5, 1) * LW, h = (8 + hh(i, 5, 2) * 16) * k; rect(x, gy - h, 3, h, '#36261a'); rect(x + 1, gy - h - 2, 1, 2, '#cfc6aa'); }
    if (L >= 2) { flood(14, '#c0300c', '#ffd060', '#ff7a1a'); for (let i = 0; i < 14; i++) { const y = gy - ((t * 30 + i * 23) % 160); rect(hh(i, 3, 1) * LW, y, 2, 2, '#ffb03a'); } } }
  else if (act === 2) { cracks(8 + L * 3, '#0a0a10', L >= 2 ? '#8a2ad0' : null); rocks(L * 2, '#3a3a46', '#5a5a66', false);
    for (let i = 0; i < L * 6; i++) { const x = hh(i, 4, 1) * LW, fall = ((t * 60 + i * 41) % 260) - 20; rect(x, fall, 4, 4, '#4a4a56'); rect(x, fall, 2, 2, '#6a6a76'); }
    if (L >= 2) flood(12, '#16304a', '#9fe6f4', '#2886a6'); }
  else { ctx.globalAlpha = .5 * k; for (let i = -6; i < 12; i++) { const x = i * 40 + Math.sin(t * .7) * 10; for (let y = 120; y < gy; y += 3) rect(x + (y - 120) * .4, y, 1, 1, '#8a2ad0'); } ctx.globalAlpha = 1;
    rocks(L * 3, '#1a1420', '#3c0e52', true); if (L >= 2) flood(8 + L * 4, '#16061e', '#e6a8ff', '#8a2ad0'); }
}
