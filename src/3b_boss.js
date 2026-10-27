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
