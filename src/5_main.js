// ================= battle drawing =================
function drawBattle() {
  const A = ACTS[B.act];
  drawArena(A.c);
  ctx.save();
  const sk = B.shake * (RM ? .25 : 1); if (sk > 0) ctx.translate(Math.round(rnd(-sk, sk)), Math.round(rnd(-sk, sk)));
  if (B.zoom && !RM) { const z = B.zoom, s = 1 + z.a * Math.sin(Math.PI * z.t / z.dur); ctx.translate(z.x, z.y); ctx.scale(s, s); ctx.translate(-z.x, -z.y); }
  const ents = [...B.units.map((u, i) => ({ y: u.y, d: () => drawUnit(u, i) })), ...B.foes.map((f, i) => ({ y: B.boss && B.boss.f === f && B.boss.outside ? -1e9 : f.y, d: () => drawFoe(f, i) }))];
  drawTerrain();
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  for (const p of B.proj) drawProj(p);
  for (const e of B.eproj) drawEProj(e);
  drawGiantTell();
  for (const e of B.fx) drawFx(e);
  if (B.impact > 0 && !RM) { ctx.globalAlpha = .35; rect(-200, -200, LW + 400, AH + 400, '#ffffff'); ctx.globalAlpha = 1; }
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
  const w = 48, h = 48, atk = unitAtk(u);
  let lx = 0, ly = 0, dash = 0;
  if (u.dash) { const p = u.dash.t / u.dash.dur, k = p < .22 ? ease(p / .22) : 1 - ease((p - .22) / .78); lx = u.dash.tx * k; ly = u.dash.ty * k * .4; dash = p < .5 ? 1 : 0; if (atk === 'blink' && p < .22) lx = u.dash.tx; }
  else if (u.lt > 0 && atk !== 'slash' && atk !== 'spin' && atk !== 'smite' && atk !== 'blink') lx = Math.round(Math.sin((1 - u.lt / .16) * Math.PI) * 4);
  if (u.hop > 0) { const k = u.hop / .32; ly -= Math.sin(k * Math.PI) * 12; lx -= k * 8; }
  lx -= u.kb;
  const bob = RM ? 0 : Math.floor(B.t * 2 + i) % 2, x = Math.round(u.x + u.ox + lx - w / 2), y = Math.round(u.y - h - bob + ly);
  rect(u.x + lx - w / 2 + 8, u.y, w - 16, 2, '#1a1a22');
  if (u.dash && dash && !RM) for (let g = 2; g >= 1; g--) { const p = Math.max(0, u.dash.t / u.dash.dur - g * .05), k = p < .22 ? ease(p / .22) : 1; drawChar(u.c, Math.round(u.x + u.ox + u.dash.tx * k - u.kb - w / 2), y, PSC, 'flash', { alpha: .14 * g, noCape: true, spr: u.spr }); }
  const vr = u.hurt > 0 && Math.floor(u.hurt * 30) % 2 ? 'hurt' : B.impact > 0 && u.dash ? 'flash' : '';
  drawUltBack(u, x, y);
  drawChar(u.c, x, y, PSC, vr, { rim: ACTPAL[B.act].rim, dash, seed: u.seed, spr: u.spr, unit: u });
  if (u.cast > 0) { const k = u.cast / .25, cx = x + 44, cy = y + 6; ctx.globalAlpha = k; frame(cx - 6 + k * 2, cy - 6 + k * 2, 12 - k * 4, 12 - k * 4, unitCol(u)); rect(cx - 1, cy - 1, 2, 2, '#ffffff'); ctx.globalAlpha = 1; }
  drawUltFront(u, x, y);
  if (u.guard) corners(x - 3, y - 3, w + 6, h + 6, COL.blue, 4);
  bar(u.x - 14, u.y - h - 8, 28, 3, u.hp / u.max, '#7ee07e');
  if (u.id === save.active) { const ty = u.y - h - 16 + (Math.floor(B.t * 3) % 2); rect(u.x - 3, ty, 7, 1, '#fff'); rect(u.x - 2, ty + 1, 5, 1, '#fff'); rect(u.x - 1, ty + 2, 3, 1, '#fff'); rect(u.x, ty + 3, 1, 1, '#fff'); }
  if (B.units.length > 1) hit(u.x - w / 2 - 4, u.y - h - 6, w + 8, h + 10, () => switchTo(i));
}
const unitCol = u => u.s.burn ? '#ff9a3a' : u.s.chill ? '#9fe6f4' : u.s.holy ? '#ffe070' : TINT[u.id];
function drawProj(p) {
  if (p.kind === 'snipe') { for (let i = 0; i < 6; i++) { ctx.globalAlpha = .6 - i * .1; rect(p.x - 8 - i * 8, p.y, 8, 1, i ? '#ffe070' : '#ffffff'); } ctx.globalAlpha = 1; rect(p.x - 9, p.y - 1, 10, 3, '#fff0a0'); rect(p.x, p.y - 1, 3, 3, '#ffffff'); return; }
  const col = p.kind === 'arrow' ? '#e8e8e8' : p.kind === 'fire' ? '#ff9a3a' : p.kind === 'ice' ? '#9fe6f4' : p.kind === 'holy' ? '#ffe070' : p.kind === 'dark' ? '#b480ff' : '#9a8cff';
  p.tr.forEach(([x, y], i) => { ctx.globalAlpha = .5 - i * .09; rect(x - (p.kind === 'arrow' ? 4 : 2), y - (p.kind === 'arrow' ? 0 : 2), p.kind === 'arrow' ? 4 : 4, p.kind === 'arrow' ? 1 : 4, col); });
  ctx.globalAlpha = 1;
  if (p.kind === 'arrow' || p.kind === 'dark') { rect(p.x - 7, p.y, 8, 1, p.kind === 'dark' ? '#46226c' : '#c8a070'); rect(p.x, p.y - 1, 2, 3, '#ffffff'); rect(p.x - 9, p.y - 1, 2, 1, col); rect(p.x - 9, p.y + 1, 2, 1, col); }
  else { rect(p.x - 3, p.y - 3, 6, 6, col); rect(p.x - 2, p.y - 4, 4, 1, lighten(col, .4)); rect(p.x - 1, p.y - 1, 2, 2, '#ffffff'); if (!RM && Math.floor(B.t * 20) % 2) rect(p.x - 5, p.y + rnd(-3, 3), 1, 1, col); }
}
function drawEProj(e) {
  const k = e.t / e.dur, x = e.x + (e.tx - e.x) * k, y = e.y + (e.ty - e.y) * k - Math.sin(k * Math.PI) * (e.pk === 'beam' ? 0 : 22);
  if (e.pk === 'beam') { for (let i = 0; i < 18; i++) { const q = k * i / 18; rect(e.x + (e.tx - e.x) * q, e.y + (e.ty - e.y) * q, 3, 2, i % 2 ? '#b480ff' : '#ffffff'); } return; }
  const col = e.pk === 'spore' ? '#9cff6a' : e.pk === 'bone' ? '#cfc6aa' : '#9fe6f4';
  if (e.pk === 'bone') { const r = Math.floor(B.t * 16) % 2; rect(x - (r ? 3 : 1), y - (r ? 1 : 3), r ? 6 : 2, r ? 2 : 6, col); rect(x - 1, y - 1, 2, 2, '#fffaf0'); }
  else { rect(x - 2, y - 2, 4, 4, col); rect(x - 1, y - 1, 1, 1, '#ffffff'); ctx.globalAlpha = .3; rect(x - 4, y - 4, 8, 8, col); ctx.globalAlpha = 1; }
}
function drawFloor(act, a) {
  if (a <= 0) return; const P = ACTPAL[act];
  ctx.globalAlpha = a;
  rect(0, 92, LW, 1, P.line);
  for (let y = 100; y < 248; y += 6) { const d = Math.max(2, 14 - Math.floor((y - 100) / 14)); for (let x = (y * 3) % d; x < LW; x += d) rect(x, y, 1, 1, ((x + y) & 3) ? P.floor : P.line); }
  for (let i = 0; i < 10; i++) { const t = RM ? 0 : B.t, x = (i * 37 + t * (4 + i % 3) * 3) % LW, y = 110 + ((i * 53) % 130) + Math.sin(t + i) * 4; rect(x, y, 1, 1, P.mote); }
  ctx.globalAlpha = 1;
}
function drawFoe(f, i) {
  if (f.dead) return;
  const T_ = f.T, sc = f.sc, [w, h] = sprSize(f.spr, sc), boss = B.boss && B.boss.f === f;
  let lx = f.lt > 0 && boss ? -Math.round(Math.sin((1 - f.lt / .2) * Math.PI) * 18) : 0, ly = 0;
  if (f.anim && !boss) {
    const A = f.anim, hp = A.hit / A.dur, p = A.t / A.dur, go = p < hp ? ease(p / hp) : 1 - ease((p - hp) / (1 - hp));
    if (A.kind === 'leap') { lx = A.tx * .8 * go; ly = A.ty * go - Math.sin(Math.min(1, p / hp) * Math.PI) * 26 * (p < hp ? 1 : 0); }
    else if (A.kind === 'lunge') lx = A.tx * .75 * go;
    else if (A.kind === 'dive') { lx = A.tx * .85 * go; ly = (A.ty + 14) * go; }
    else if (A.kind === 'shoot') lx = 6 * (p < hp ? 1 - p / hp : 0);
  }
  if (boss) {
    const bx = Math.round(f.x + f.ox + f.kx + lx - w / 2), by = f.y - h - Math.round((f.drop || 0) * 340);
    rect(f.x - 80, f.y, 160, 3, '#1a1a22');
    drawBossBody(f, bx, by);
    const bw = 46, byy = f.y - 228;
    if (B.boss.st === 'fight') { bar(f.x - bw / 2 - 20, f.y + 6, bw, 2, f.wind > 0 ? 1 : 1 - f.timer / f.per, f.wind > 0 ? '#ffffff' : '#7a3a3a', '#16161c'); if (f.wind > 0) T('!', f.x - 20 - bw / 2 - 8, f.y + 2, COL.red, 1, 'c', '#000'); }
    if (f.burnT > 0) rect(f.x + 8, f.y + 6, 3, 3, '#ff9a3a'); if (f.chill > 0) rect(f.x + 14, f.y + 6, 3, 3, '#9fe6f4');
    if (B.boss.outside) { if (f.x > LW) hit(LW + 2, -OY, VW, VH, () => { B.target = i; onJ(); }); else if (f.x < 0) hit(-OX, -OY, OX - 2, VH, () => { B.target = i; onJ(); }); }
    else hit(f.x - BW * f.sc * .45, f.y - BH * f.sc, BW * f.sc * .9, BH * f.sc + 4, () => { B.target = i; onJ(); });
    return;
  }
  if (f.wind > 0 && !RM && Math.floor(B.t * 30) % 3 === 0) { const [cx, cy] = foeCenter(f), an = rnd(Math.PI * 2); B.parts.push({ x: cx + Math.cos(an) * 26, y: cy + Math.sin(an) * 26, vx: -Math.cos(an) * 90, vy: -Math.sin(an) * 90, t: 0, life: .28, col: '#ff5a5a', s: 1, g: 0 }); }
  const oy = f.wind > 0 ? -3 : 0, bob = T_.fly ? Math.round(Math.sin(B.t * 4 + f.seed) * 3) - 10 : Math.floor(B.t * 2 + f.seed) % 2;
  const x = Math.round(f.x + f.ox + f.kx + lx - w / 2), y = Math.round(f.y - h + oy + bob + ly - (f.drop || 0) * 340);
  rect(f.x + f.ox - w / 2 + 6, f.y, w - 12, boss ? 3 : 2, '#1a1a22');
  let outline = boss && B.boss.phase > 0 ? B.boss.D.crack : T_.outline || null;
  if (f.wind > 0 && Math.floor(B.t * 14) % 2) outline = '#ff5a5a';
  if (f.freeze > 0) outline = '#9fe6f4';
  const alpha = T_.ghost ? .72 + Math.sin(B.t * 6 + f.seed) * .12 : 1;
  drawSpr(f.spr, x, y, sc, f.flash > 0 || (f.inv && Math.floor(B.t * 16) % 2) ? 'flash' : '', outline, alpha);
  const bw = T_.boss ? 46 : 28, by = y - 9;
  if (!boss) bar(f.x + f.ox - bw / 2, by, bw, 3, f.hp / f.max, '#ff5a5a');
  bar(f.x + f.ox - bw / 2, by + 4, bw, boss ? 2 : 1, f.wind > 0 ? 1 : 1 - f.timer / f.per, f.wind > 0 ? '#ffffff' : '#7a3a3a', '#16161c');
  if (f.wind > 0) T('!', f.x + f.ox, by - 14, COL.red, 1, 'c', '#000');
  if (f.burnT > 0) rect(f.x + f.ox + bw / 2 + 2, by, 3, 3, '#ff9a3a');
  if (f.chill > 0) rect(f.x + f.ox + bw / 2 + 2, by + 4, 3, 3, '#9fe6f4');
  if (i === B.target && !boss) corners(x - 4, y - 4, w + 8, h + 8, Math.floor(B.t * 4) % 2 ? COL.gold : '#b08a30', 4);
  hit(x - 6, y - 12, w + 12, h + 16, () => { B.target = i; onJ(); });
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
  } else if (e.type === 'smear') { // thick crescent smear: the swing's motion blur, 2 frames solid then thinning
    const r = e.big ? 30 : 22, N = 22, th = e.big ? 4 : 3, k = Math.min(1, p * 2.2), fade = p < .4 ? 1 : 1 - (p - .4) / .6;
    ctx.globalAlpha = fade;
    for (let i = 0; i <= N; i++) { const q = i / N; if (q > k) break; const an = (e.flip ? 2.4 - q * 2.9 : -2.4 + q * 2.9), w = Math.max(1, Math.round(th * Math.sin(q * Math.PI))); const x = e.x + Math.cos(an) * r, y = e.y + Math.sin(an) * r * .8; rect(x - w / 2, y - w / 2, w, w, i > N * k - 4 ? '#ffffff' : e.col); }
    ctx.globalAlpha = 1;
  } else if (e.type === 'zap') { const k = e.t / e.dur; ctx.globalAlpha = 1 - k; let px = e.x, py = e.y; for (let i = 1; i <= 8; i++) { const nx = e.x + (e.x2 - e.x) * i / 8 + (i < 8 ? rnd(-5, 5) : 0), ny = e.y + (e.y2 - e.y) * i / 8 + (i < 8 ? rnd(-5, 5) : 0); const n = Math.ceil(Math.hypot(nx - px, ny - py)); for (let j = 0; j < n; j++) rect(Math.round(px + (nx - px) * j / n), Math.round(py + (ny - py) * j / n), 2, 2, j % 3 ? e.col : '#ffffff'); px = nx; py = ny; } ctx.globalAlpha = 1;
  } else if (e.type === 'pillar') { // holy light column
    const a = 1 - p; ctx.globalAlpha = a; rect(e.x - 6, 0, 12, e.y, '#ffe070'); rect(e.x - 2, 0, 4, e.y, '#ffffff'); ctx.globalAlpha = 1;
  } else if (e.type === 'nova') {
    const s = Math.round(8 + p * 90); ctx.globalAlpha = 1 - p; frame(e.x - s, e.y - s * .6, s * 2, s * 1.2, e.col); frame(e.x - s + 3, e.y - s * .6 + 3, s * 2 - 6, s * 1.2 - 6, '#ffffff'); ctx.globalAlpha = 1;
  } else if (['shock', 'rock', 'roots', 'arc', 'wave', 'shard', 'reach', 'giant'].includes(e.type)) { drawBossFx(e);
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
  if (B.boss && B.boss.exp > .5) { ctx.globalAlpha = .82; rect(0, 250, LW, AH - 250, '#000'); rect(0, 0, LW, 44, '#000'); ctx.globalAlpha = 1; }
  T(A.roman + '-' + (B.li % 3 + 1) + '  ' + LEVELS[B.li].n, 8, 6, A.c); drawUltHud();
  if (B.combo >= 3) { const big = B.combo >= 10; T(B.combo + ' hits', 312, 19, big ? COL.gold : COL.white, 1, 'r', '#000'); }
  if (B.streak >= 2) T('chain +' + Math.round(Math.min(TUNE.chainMax, TUNE.chainStep * B.streak) * 100) + '%', 312, 31, B.streak >= 10 ? '#ff7a5a' : COL.gold, 1, 'r', '#000');
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
    if (u.dead) drawSpr('grave', x + 3, y + 4, 1, 'dim'); else drawChar(u.c, x + 4, y + 5, 1, '', { noCape: true, spr: u.spr });
    T('' + (i + 1), x + 21, y + 4, act ? COL.white : COL.dim);
    bar(x + 3, y + 18, 28, 2, u.hp / u.max, u.dead ? '#333' : '#7ee07e', '#1a1620');
    if (B.units.length > 1) hit(x, y, 34, 22, () => switchTo(i));
  });
  const au = activeUnit();
  if (au) T(charName(au.c), 312, 259, TINT[au.id], 1, 'r');
  drawTimingBar(au);
  if (!TOUCH) { const m = mechOf(au); T(m === 'bow' ? 'hold J, let go on the ring   Esc menu' : m === 'rune' ? 'J when the mana hits the line   Esc menu' : 'J strike   Esc menu', 160, 305, '#4a4452', 1, 'c'); }
}
const TINT = { warrior: '#ffd35a', archer: '#7ee07e', mage: '#b48cff' };
function drawTimingBar(au) {
  const mech = mechOf(au); if (mech !== 'sword') return drawAltBar(au, mech);
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
  // class bar variants
  const bv = unitBar(au);
  if (bv === 'twin' && !hidden) { const px2 = X + Math.round((B.zc2 - p / 2) * W); rect(px2, Y + 1, pw, H - 2, ready ? '#ffd35a' : '#5a4a20'); rect(px2, Y + 1, pw, 1, ready ? '#fff4b8' : '#6a5a2a'); rect(px2 - 1, Y + 1, 1, H - 2, '#a8842e'); rect(px2 + pw, Y + 1, 1, H - 2, '#a8842e'); }
  if (bv === 'guard') { const ww = Math.round(g * .6 * W), wx = X + Math.round(B.zw * W) - (ww >> 1); rect(wx, Y + 3, ww, H - 6, ready ? '#2a4fa8' : '#1a2440'); rect(wx, Y + 3, ww, 1, ready ? '#a6caff' : '#2a3450'); for (let yy = Y + 4; yy < Y + H - 3; yy += 2) rect(wx + (ww >> 1), yy, 1, 1, '#a6caff'); }
  if (bv === 'snipe' && ready) { ctx.globalAlpha = .5; rect(px - 3, Y - 2, 1, H + 4, '#ff5a5a'); rect(px + pw + 2, Y - 2, 1, H + 4, '#ff5a5a'); ctx.globalAlpha = 1; }
  if (bv === 'frost' && B.slowT > 0) { ctx.globalAlpha = .25 * B.slowT / 1.2; rect(X, Y, W, H, '#9fe6f4'); ctx.globalAlpha = 1; for (let k = 0; k < 6; k++) rect(X + ((k * 41 + Math.floor(B.t * 10)) % W), Y + (k * 5) % H, 1, 1, '#e8ffff'); }
  if (bv === 'rage' && B.combo > 0) { const k = Math.min(1, B.combo / 14); ctx.globalAlpha = .1 + .2 * k; rect(X, Y + H - 2, Math.round(W * k), 2, '#ff3a3a'); ctx.globalAlpha = 1; }
  if (bv === 'heat') for (let k = 0; k < 5; k++) { const on = k < B.heat, gl = B.heat >= 5 && !RM && Math.floor(B.t * 8) % 2; rect(X + W / 2 - 26 + k * 11, Y + H + 4, 8, 3, on ? (gl ? '#fff3a8' : '#ff7a1a') : '#2a1a14'); }
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
  } else T('no loot this time', 160, 150, COL.dark, 1, 'c');
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
    const UU = ultOf(activeUnit()), mw = UU ? 186 : 250;
    if (UU) { const st = ultSt(), full = st.m >= 1 || ADM.ult; btn(198, y, 60, h, st.on ? 'FORM' : 'ULT', ultGo, { col: full || st.on ? UU.c : COL.dim, border: full ? UU.c : '#3a3a44', fill: '#0c0c10' }); if (!st.on && !full) rect(202, y + h - 5, Math.round(52 * st.m), 2, UU.c); }
    btn(8, y, mw, h, mechOf(activeUnit()) === 'bow' ? (B.drawing ? 'LOOSE' : 'DRAW') : mechOf(activeUnit()) === 'rune' ? 'CAST' : 'STRIKE', pressJ, { sc: 2, col: ready ? COL.gold : COL.dim, border: ready ? COL.gold : '#3a3a44', fill: ready ? '#16140a' : '#0c0c10' });
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
  if (scene === 'title') { confirmNew = 0; goto(save.cls ? 'camp' : 'select'); }
  else if (scene === 'select') { chooseClass(selHover); goto('camp'); }
  else if (scene === 'camp') startLevel(save.sel);
  else if (scene === 'msg') nextMsg();
  else if (scene === 'battle' && B) {
    if (B.paused) return;
    if ((B.state === 'win' || B.state === 'lose') && B.st <= 0) leaveBattle();
    else pressJ();
  }
}
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'KeyJ' || e.code === 'Space')) return;
  audio();
  const k = e.code;
  if (k === 'KeyJ' || k === 'Space' || k === 'Enter') { e.preventDefault(); onJ(); return; }
  if (k === 'KeyK' && scene === 'battle') { e.preventDefault(); ultGo(); return; }
  if (k === 'KeyL') { e.preventDefault(); openAdmin(); return; }
  if (scene === 'admin') { if (k === 'Escape') closeAdmin(); return; }
  if (k === 'KeyM') { save.mute = !save.mute; persist(); }
  if (scene === 'battle' && B) {
    if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') switchTo(+k.slice(5) - 1);
    if (k === 'Tab') { e.preventDefault(); cycleUnit(); }
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
      const live = B.foes.map((f, i) => f.dead ? -1 : i).filter(i => i >= 0); if (live.length) { const p = live.indexOf(B.target); B.target = live[(p + (k === 'ArrowUp' || k === 'KeyW' ? -1 : 1) + live.length) % live.length]; SFX.click(); }
    }
    if ((k === 'Escape' || k === 'KeyP') && B.state !== 'win' && B.state !== 'lose') { B.paused = !B.paused; SFX.click(); }
  } else if (k === 'Escape') {
    if (scene === 'gear' || scene === 'skills' || scene === 'party') goto('camp');
  }
});
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width - OX, y: (e.clientY - r.top) * VH / r.height - OY }; }
const ptrs = new Map(); let pinch0 = 0, dragMoved = 0, dragPend = null;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audio(); mouse = toLogical(e); ptrs.set(e.pointerId, mouse);
  if (ptrs.size === 2 && scene === 'skills') { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dragPend = null; return; }
  for (let i = UI.length - 1; i >= 0; i--) { const b = UI[i]; if (mouse.x >= b.x && mouse.x < b.x + b.w && mouse.y >= b.y && mouse.y < b.y + b.h) {
    // inside the skill tree: wait for release so a drag pans instead of clicking
    if (scene === 'skills' && mouse.y >= TREE_CLIP[1] && mouse.y < TREE_CLIP[1] + TREE_CLIP[3] && (b.drag || b.y >= TREE_CLIP[1] && b.y < TREE_CLIP[1] + TREE_CLIP[3] - 30)) { dragPend = { fn: b.fn, x: mouse.x, y: mouse.y }; dragMoved = 0; treeDrag = { x: mouse.x, y: mouse.y }; return; }
    b.fn(); return; } }
  // nothing under the pointer: a click or tap anywhere acts as J (strike / draw / cast, continue, next message)
  if (scene === 'title' || scene === 'msg' || scene === 'battle') onJ();
});
cv.addEventListener('pointermove', e => {
  const m = toLogical(e); if (e.pointerType === 'mouse') mouse = m;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, m);
  if (scene === 'skills' && ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (d > pinch0 * 1.4) { treeZoom(1); pinch0 = d; } else if (d < pinch0 / 1.4) { treeZoom(-1); pinch0 = d; } return; }
  if (scene === 'skills' && treeDrag && ptrs.has(e.pointerId)) { const dx = m.x - treeDrag.x, dy = m.y - treeDrag.y; dragMoved += Math.abs(dx) + Math.abs(dy); treePan(dx, dy); treeDrag = { x: m.x, y: m.y }; }
});
const endPtr = e => { ptrs.delete(e.pointerId); if (scene === 'battle') releaseJ(); if (ptrs.size < 2) pinch0 = 0; if (dragPend && dragMoved < 6) dragPend.fn(); dragPend = null; treeDrag = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { if (scene !== 'skills') return; e.preventDefault(); if (e.ctrlKey || Math.abs(e.deltaY) > 40 && !e.shiftKey && e.deltaMode === 0 && Math.abs(e.deltaX) < 1 && false) treeZoom(e.deltaY < 0 ? 1 : -1); else if (e.altKey) treeZoom(e.deltaY < 0 ? 1 : -1); else treePan(-e.deltaX * .5, -e.deltaY * .5); }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && B && B.state === 'fight') B.paused = true; persist(); });

let last = performance.now();
function drawVoid() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); if (drawBackdrop()) return; ctx.fillStyle = '#0e0d12';
  for (let y = ((OY % 8) + 8) % 8; y < VH; y += 8) for (let x = ((OX % 8) + 8) % 8; x < VW; x += 8) ctx.fillRect(x, y, 1, 1);
}
const WAM = window.WAM = { toCss: (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + (x + OX) * r.width / VW, y: r.top + (y + OY) * r.height / VH }; }, get save() { return save; }, get B() { return B; }, get scene() { return scene; }, startLevel, strike, zones, switchTo, onJ, TUNE, bot: 0, timeScale: 1, goto: s => { scene = s; } };
function botTick() {
  // test helper only: WAM.bot = accuracy 0..1 auto-presses J for recordings/tests
  if (!WAM.bot || !B || B.state !== 'fight' || B.paused || B.cd > 0) return;
  const { p, g } = zones(), d = aimD(), m = mechOf(activeUnit());
  if (m === 'bow' && !B.drawing) { pressJ(); B.tapMode = true; return; }
  if (!B._botAim) B._botAim = Math.random() < WAM.bot ? p * .35 : Math.random() < .6 ? g * .42 : 1;
  const go = () => { if (m === 'bow') bowRelease(); else strike(); B._botAim = 0; };
  if (d <= B._botAim) go();
  else if (B._botAim >= 1 && Math.random() < .02) go();
}
function loop(now) {
  let dt = Math.min(.05, (now - last) / 1000) * WAM.timeScale; last = now; gtime += dt;
  try {
    botTick();
    if (scene === 'battle' && B) updateBattle(dt);
    UI = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    { const free = VH - LH, S = (scene === 'camp' || scene === 'select') ? logoScale() : 0; OY = S ? logoH(S) + 8 + Math.floor((free - logoH(S) - 8) / 2) : Math.floor(free / 2); }
    drawVoid();
    const qa = scene === 'battle' && B ? B.quake * (RM ? .25 : 1) : 0;
    ctx.setTransform(1, 0, 0, 1, OX + (qa ? Math.round(rnd(-qa, qa)) : 0), OY + (qa ? Math.round(rnd(-qa, qa)) : 0));
    if (scene === 'title') drawTitle();
    else if (scene === 'camp') drawCamp();
    else if (scene === 'gear') drawGear();
    else if (scene === 'skills') drawSkills();
    else if (scene === 'party') drawParty();
    else if (scene === 'select') drawSelect();
    else if (scene === 'admin') drawAdmin();
    else if (scene === 'msg') drawMsg();
    else if (scene === 'battle' && B) drawBattle();
    drawStrip();
    if (scene === 'battle' && B) drawBossOverlay();
    drawAdminOverlay(dt);
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}
loadSave();
if (DEBUG) {
  // ?debug : everything unlocked for tweaking
  const dc = (Q.match(/cls=(\w+)/) || [])[1]; if (!save.cls || dc && dc !== save.cls) { chooseClass(dc && CLS[dc] ? dc : 'warrior'); }
  save.started = true; save.unlocked = 11; save.act4 = true; save.cleared = save.cleared.map((c, i) => i < 9 ? true : c);
  if (!save.goblets.length) save.goblets = ['blue', 'green', 'red'];
  save.party.forEach(id => { const c = save.chars[id]; if (c.lvl < 14) c.lvl = 14; });
  save.perfects = Math.max(save.perfects, TUNE.act4Perfects);
}
requestAnimationFrame(loop);
addEventListener('keyup', e => { if (e.code === 'KeyJ' || e.code === 'Space' || e.code === 'Enter') releaseJ(); });

// ---------- archer bow draw and mage rune circle ----------
function ringPx(cx, cy, r, col, step) { const n = Math.max(8, Math.round(r * 6.3 / (step || 1))); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; rect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1, col); } }
const bowPt = t => [62 + t * 206, 298 - Math.round(Math.sin(Math.min(1.1, t) * Math.PI * .86 + .2) * 14)];
function altLabel(lx, ly) {
  if (!B.label) return;
  const q = B.label.q, k = 1 - B.label.t / (B.label.rune ? .5 : .7), txt = B.label.rune ? 'rune ' + B.label.rune : q === 'perfect' ? 'Perfect!' : q === 'good' ? 'Good' : 'Miss';
  const col = q === 'perfect' ? COL.gold : q === 'good' ? COL.green : '#ff6a6a', sc = q === 'perfect' && !B.label.rune && k < .5 ? 2 : 1;
  ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; T(txt, clamp(lx, 40, 280), ly - sc * 6 - Math.round(k * 6), col, sc, 'c', '#000'); ctx.globalAlpha = 1;
}
function drawAltBar(au, mech) {
  const ready = B.cd <= 0 && B.state === 'fight', { g, p } = zones(), pat = bossPat() || {}, bv = unitBar(au);
  const sh = B.barShake > 0 && !RM ? Math.round(rnd(-2, 2) * B.barShake / .3) : 0;
  const hidden = pat.blink && Math.floor(B.t * 5) % 3 === 0, pulse = RM ? 0 : (Math.sin(B.t * 8) + 1) / 2;
  if (mech === 'bow') {
    // leather-wrapped plate behind the arc
    rect(40 + sh, 274, 240, 30, '#0a0c08'); frame(40 + sh, 274, 240, 30, ready ? '#3e6a2e' : '#22261c'); rect(41 + sh, 275, 238, 1, '#2a3420');
    for (let k = 0; k < 4; k++) rect(44 + k * 76 + sh, 301, 3, 1, '#5a3a1a');
    // dotted flight arc
    for (let t = 0; t <= 1.1; t += .025) { const [x, y] = bowPt(t); rect(x + sh, y, 1, 1, t > 1 ? '#4a1a1a' : '#2a3a24'); }
    // good arc + perfect band
    for (let t = B.zc - g / 2; t <= B.zc + g / 2; t += .006) { const [x, y] = bowPt(t); rect(x - 1 + sh, y - 1, 3, 3, ready ? '#2f6a3a' : '#1a2a1e'); }
    const band = (zc, col, hi) => { for (let t = zc - p / 2; t <= zc + p / 2; t += .004) { const [x, y] = bowPt(t); rect(x - 1 + sh, y - 2, 3, 4, col); rect(x + sh, y - 2, 1, 1, hi); } };
    if (!hidden) { band(B.zc, ready ? (pulse > .6 ? '#ffe27a' : COL.gold) : '#5a4a20', '#fff4b8'); if (bv === 'twin') band(B.zc2, ready ? '#ffd35a' : '#5a4a20', '#fff4b8'); }
    // target ring at the sweet spot
    if (bv === 'twin' && !hidden) { const [t2x, t2y] = bowPt(B.zc2), gl = RM ? 1 : .6 + .4 * pulse; ctx.globalAlpha = gl * .35; ringPx(t2x + sh, t2y, 8, '#ffe27a'); ctx.globalAlpha = 1; ringPx(t2x + sh, t2y, 6, ready ? '#ffd35a' : '#3a3220'); ringPx(t2x + sh, t2y, 4, ready ? '#c07a1a' : '#2a2014'); rect(t2x - 1 + sh, t2y - 1, 2, 2, ready ? '#fff4b8' : '#4a4a54'); }
    const [tx, ty] = bowPt(B.zc); ringPx(tx + sh, ty, 6, ready ? '#7ee07e' : '#2a3a24'); ringPx(tx + sh, ty, 4, ready ? '#c03a2a' : '#3a1a14'); rect(tx - 1 + sh, ty - 1, 2, 2, ready ? '#ffffff' : '#4a4a54');
    if (bv === 'snipe' && ready) { ctx.globalAlpha = .6; rect(tx - 9 + sh, ty, 4, 1, '#ff5a5a'); rect(tx + 6 + sh, ty, 4, 1, '#ff5a5a'); rect(tx + sh, ty - 9, 1, 4, '#ff5a5a'); rect(tx + sh, ty + 6, 1, 4, '#ff5a5a'); ctx.globalAlpha = 1; }
    // the bow: wood limbs with grip and fletching tint, string pulled back with the draw
    const bx = 52 + sh, by = 289, pull = Math.round(Math.min(1, B.mk) * 7) + (B.mk > 1 && !RM ? Math.round(rnd(-1, 1)) : 0);
    for (let k = -13; k <= 13; k++) { const x = bx + Math.round(Math.abs(k) * Math.abs(k) / 42); rect(x, by + k, 2, 1, Math.abs(k) < 3 ? '#3a2412' : k < 0 ? '#b07a3a' : '#7a4a20'); rect(x, by + k, 1, 1, Math.abs(k) < 3 ? '#5a3a1a' : '#d8a45a'); }
    const sx = bx - pull; for (let k = -12; k <= 12; k++) rect(Math.round(bx + 4 + (sx - bx - 4) * (1 - Math.abs(k) / 12)), by + k, 1, 1, '#e8e0c8');
    // the arrow: rides the arc as tension builds
    const t = B.drawing ? B.mk : 0, [ax, ay] = B.drawing ? bowPt(t) : [bx + 10, by], [bx2, by2] = B.drawing ? bowPt(Math.max(0, t - .05)) : [bx - pull, by];
    const dx = ax - bx2, dy = ay - by2, L = Math.max(1, Math.hypot(dx, dy)), ux = dx / L, uy = dy / L, shk = B.mk > 1 && !RM ? rnd(-1, 1) : 0;
    for (let k = 0; k < 11; k++) rect(Math.round(ax - ux * k + sh + shk), Math.round(ay - uy * k), 1, 1, '#a0743a');
    rect(Math.round(ax + sh + shk), Math.round(ay) - 1, 2, 3, '#d8dce8'); rect(Math.round(ax + ux * 2 + sh + shk), Math.round(ay), 1, 1, '#ffffff');
    for (let k = 9; k < 12; k++) { rect(Math.round(ax - ux * k + sh + shk), Math.round(ay - uy * k) - 2, 1, 2, '#5ac85a'); rect(Math.round(ax - ux * k + sh + shk), Math.round(ay - uy * k) + 1, 1, 2, '#e8f8e0'); }
    if (B.drawing) { const k = Math.min(1, B.mk); rect(44 + sh, 277, Math.round(36 * k), 2, B.mk > 1 ? '#ff5a5a' : '#7ee07e'); T('draw', 84 + sh, 276, COL.dark); }
    else if (ready) T(TOUCH ? 'hold DRAW' : 'hold J', 84 + sh, 276, Math.floor(B.t * 2) % 2 ? '#7ee07e' : '#3e6a2e');
    if (B.flash) { const k = B.flash.t / .3, [fx, fy] = bowPt(B.flash.x), c = B.flash.q === 'perfect' ? COL.gold : B.flash.q === 'good' ? COL.green : '#ff5a5a'; for (let i = 0; i < 10; i++) { const a = i * .63, r = (1 - k) * 14; rect(Math.round(fx + Math.cos(a) * r), Math.round(fy + Math.sin(a) * r), 2, 2, c); } }
    if (!ready && B.state === 'fight' && au && !B.drawing) bar(44, 300, 232, 1, 1 - B.cd / au.s.cd, '#3e6a2e', '#000');
    const [lx, ly] = bowPt(B.label ? B.label.x : .5); altLabel(lx, ly - 8);
  } else {
    // ---- mana vial: ornate glass on a gilded stand, arcane liquid rises toward the rune line ----
    const cx = 160 + sh, top = 250, bot = 294, IH = bot - top, lv = t => Math.round(bot - t * IH), frost = bv === 'frost' && B.slowT > 0;
    const halfW = y => y < top + 3 ? 4 : y < top + 7 ? 4 + (y - top - 3) * 2 : y > bot - 3 ? 11 - (y - bot + 3) * 2 : 12; // neck flares into a rounded body
    // shelf shadow + stand
    rect(cx - 18, 299, 36, 2, '#09080c'); rect(cx - 15, 296, 30, 3, '#6a4a1a'); rect(cx - 15, 296, 30, 1, '#c8902e'); rect(cx - 15, 296, 2, 1, '#ffe9a0'); rect(cx - 12, 299, 3, 2, '#6a4a1a'); rect(cx + 10, 299, 3, 2, '#6a4a1a');
    // glass interior (dark), liquid, glass edge
    const surf = B.mk, wave = RM ? 0 : 1;
    for (let y = top - 4; y <= bot; y++) {
      const hw = y < top ? 3 : halfW(y);
      for (let x = -hw; x <= hw; x++) {
        const sy = lv(surf) + (wave ? Math.round(Math.sin(B.t * 6 + x * .7) * (y > top ? 1 : 0)) : 0);
        let col = ready ? '#120c1c' : '#0c0a10';
        if (y >= sy && y > top - 1) { // dithered purple liquid lit from the upper left
          const k = (y - sy) / Math.max(1, IH), d = ((x + y) & 1) ? .5 : 0, s2 = (x + hw) / (2 * hw);
          col = frost ? (k + d * .3 < .35 ? '#9fe6f4' : '#3a7aa0') : y === sy ? '#e0b8ff' : s2 + d * .4 < .35 ? '#b47cff' : k + d * .3 > .6 ? '#4a1e8a' : '#7a3ad0';
        }
        if (Math.abs(x) === hw) col = Math.abs(x) === hw && x < 0 ? '#c8c0e0' : '#5a5070';
        rect(cx + x, y, 1, 1, col);
      }
    }
    // outline, glass highlight streak (upper left), gilded neck ring and cork
    for (let y = top - 4; y <= bot; y++) { const hw = y < top ? 3 : halfW(y); rect(cx - hw - 1, y, 1, 1, '#140e1c'); rect(cx + hw + 1, y, 1, 1, '#140e1c'); }
    rect(cx - 11, bot + 1, 23, 1, '#140e1c');
    for (let y = top + 9; y < bot - 10; y++) if (y % 9 < 6) rect(cx - 9, y, 1, 1, '#f0ecff');
    rect(cx - 5, top - 1, 11, 3, '#8a5a1a'); rect(cx - 5, top - 1, 11, 1, '#e8b84a'); rect(cx - 5, top - 1, 1, 1, '#fff3c0');
    rect(cx - 3, top - 9, 7, 5, '#6a4a2a'); rect(cx - 3, top - 9, 7, 1, '#a0743a'); rect(cx - 3, top - 9, 1, 4, '#a0743a');
    rect(cx - 1, top - 11, 3, 2, ready ? '#d6a6ff' : '#4a3a5a'); // gem on the cork
    // bubbles rising through the liquid
    if (!RM && surf > .05) for (let k = 0; k < 6; k++) { const ph = (B.t * (.6 + k * .13) + k * .37) % 1, by = Math.round(bot - 1 - ph * (bot - lv(surf) - 2)), bx = cx - 8 + ((k * 5) % 16) + Math.round(Math.sin(B.t * 3 + k) * 1); if (by > lv(surf) + 1) rect(bx, by, k % 3 ? 1 : 2, k % 3 ? 1 : 2, '#e0c8ff'); }
    // the fill lines: good brackets outside the glass, shimmering perfect line across it
    B.runes.forEach((r, idx) => {
      const done = idx < B.runeQ.length, cur = idx === B.runeQ.length, z = cur ? B.zc : r, y = lv(z);
      if (cur) {
        const gy0 = lv(z + g / 2), gy1 = lv(z - g / 2), py0 = lv(z + p / 2), py1 = lv(z - p / 2);
        for (const sx of [-1, 1]) { const x0 = cx + sx * 15; rect(sx < 0 ? x0 - 2 : x0, gy0, 3, gy1 - gy0 + 1, ready ? '#3a6a3a' : '#1a2a1a'); rect(sx < 0 ? x0 - 2 : x0, gy0, 3, 1, '#7ee07e'); rect(sx < 0 ? x0 - 2 : x0, gy1, 3, 1, '#7ee07e'); if (!hidden) rect(sx < 0 ? x0 - 3 : x0, py0, 4, Math.max(1, py1 - py0 + 1), ready ? COL.gold : '#5a4a20'); }
        if (!hidden) for (let x = -12; x <= 12; x++) { const sh2 = RM ? 0 : (x + Math.floor(B.t * 14)) % 6 === 0; rect(cx + x, y, 1, 1, sh2 ? '#ffffff' : ready ? (pulse > .6 ? '#ffe27a' : COL.gold) : '#5a4a20'); }
        if (!hidden && ready) { rune(cx - 20, y - 2, idx % 5, '#d6a6ff'); rune(cx + 18, y - 2, (idx + 2) % 5, '#d6a6ff'); }
      } else for (let x = -12; x <= 12; x += 2) rect(cx + x, y, 1, 1, done ? COL.gold : '#8a5ad8');
    });
    if (B.runes.length > 1) T(B.runeQ.length + '/' + B.runes.length, cx + 24, top + 2, '#b48cff');
    // spill: liquid foams over the lip and drips down the glass
    if (B.spill > 0 && !RM) { const k = 1 - B.spill / .6; for (let d = 0; d < 6; d++) { const sx = d % 2 ? 1 : -1, x = cx + sx * (4 + d), y = Math.round(top - 4 + k * (14 + d * 6)); rect(x, y, 1, 2, d % 3 ? '#b47cff' : '#e0b8ff'); } }
    if (bv === 'heat') for (let k = 0; k < 5; k++) { const on = k < B.heat, gl = B.heat >= 5 && !RM && Math.floor(B.t * 8) % 2; rect(cx - 60 + k * 6, 296, 4, 3, on ? (gl ? '#fff3a8' : '#ff7a1a') : '#2a1a14'); }
    if (frost) T('slow', cx - 56, 284, '#9fe6f4');
    if (B.flash) { const k = B.flash.t / .3, fy = lv(B.flash.x), c = B.flash.q === 'perfect' ? COL.gold : B.flash.q === 'good' ? COL.green : '#ff5a5a'; for (let i = 0; i < 10; i++) { const a = i * .63, r = (1 - k) * 16; rect(Math.round(cx + Math.cos(a) * r), Math.round(fy + Math.sin(a) * r * .5), 2, 2, c); } }
    if (!ready && B.state === 'fight' && au) bar(cx + 20, 292, 40, 1, 1 - B.cd / au.s.cd, '#6a4a9a', '#000');
    altLabel(cx + 44, 276);
  }
  if (!TOUCH) { slotBox(14, 283, 18, 16, ready ? TINT[au.id] : null); T('J', 23, 286, ready ? COL.white : COL.dim, 1, 'c'); }
  if (B.streak >= 2) T('x' + B.streak, 306, 286, COL.gold, 1, 'r');
}
