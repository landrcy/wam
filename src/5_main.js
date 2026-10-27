// ================= battle drawing =================
function drawBattle() {
  const A = ACTS[B.act];
  drawArena(A.c);
  ctx.save();
  const sk = B.shake * (RM ? .25 : 1); if (sk > 0) ctx.translate(Math.round(rnd(-sk, sk)), Math.round(rnd(-sk, sk)));
  const ents = [...B.units.map((u, i) => ({ y: u.y, d: () => drawUnit(u, i) })), ...B.foes.map((f, i) => ({ y: f.y, d: () => drawFoe(f, i) }))];
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  for (const p of B.proj) {
    if (p.kind === 'arrow') { rect(p.x - 6, p.y, 6, 1, '#c8a070'); rect(p.x, p.y - 1, 2, 3, '#ffffff'); rect(p.x - 8, p.y - 1, 2, 1, '#e8e8e8'); rect(p.x - 8, p.y + 1, 2, 1, '#e8e8e8'); }
    else { const c = p.kind === 'fire' ? '#ff9a3a' : p.kind === 'ice' ? '#9fe6f4' : '#9a8cff'; rect(p.x - 3, p.y - 3, 6, 6, c); rect(p.x - 1, p.y - 1, 2, 2, '#ffffff'); }
  }
  for (const e of B.fx) drawFx(e);
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
  const [w, h] = sprSize(u.spr, PSC), lx = u.lt > 0 ? Math.round(Math.sin((1 - u.lt / .16) * Math.PI) * 14) : 0;
  const bob = Math.floor(B.t * 2 + i) % 2, x = Math.round(u.x + u.ox + lx - w / 2), y = u.y - h - bob;
  rect(u.x - w / 2 + 5, u.y, w - 10, 2, '#1a1a22');
  drawSpr(u.spr, x, y, PSC, u.hurt > 0 && Math.floor(u.hurt * 30) % 2 ? 'hurt' : '');
  if (u.guard) corners(x - 3, y - 3, w + 6, h + 6, COL.blue, 4);
  bar(u.x - 14, u.y - h - 8, 28, 3, u.hp / u.max, '#7ee07e');
  if (u.id === save.active) { const ty = u.y - h - 16 + (Math.floor(B.t * 3) % 2); rect(u.x - 3, ty, 7, 1, '#fff'); rect(u.x - 2, ty + 1, 5, 1, '#fff'); rect(u.x - 1, ty + 2, 3, 1, '#fff'); rect(u.x, ty + 3, 1, 1, '#fff'); }
  hit(x - 4, y - 6, w + 8, h + 10, () => switchTo(i));
}
function drawFoe(f, i) {
  if (f.dead) return;
  const T_ = f.T, sc = f.sc, [w, h] = sprSize(f.spr, sc), boss = B.boss && B.boss.f === f;
  const lx = f.lt > 0 ? -Math.round(Math.sin((1 - f.lt / .2) * Math.PI) * 18) : 0;
  const oy = f.wind > 0 ? -3 : 0, bob = T_.fly ? Math.round(Math.sin(B.t * 4 + f.seed) * 3) - 10 : Math.floor(B.t * 2 + f.seed) % 2;
  const x = Math.round(f.x + f.ox + f.kx + lx - w / 2), y = f.y - h + oy + bob - Math.round((f.drop || 0) * 340);
  rect(f.x + f.ox - w / 2 + 6, f.y, w - 12, boss ? 3 : 2, '#1a1a22');
  let outline = boss && B.boss.phase > 0 ? B.boss.D.crack : T_.outline || null;
  if (f.wind > 0 && Math.floor(B.t * 14) % 2) outline = '#ff5a5a';
  if (f.freeze > 0) outline = '#9fe6f4';
  const alpha = T_.ghost ? .72 + Math.sin(B.t * 6 + f.seed) * .12 : 1;
  drawSpr(f.spr, x, y, sc, f.flash > 0 || (f.inv && Math.floor(B.t * 16) % 2) ? 'flash' : '', outline, alpha);
  const bw = T_.boss ? 46 : 28, by = y - 9;
  if (!boss) bar(f.x + f.ox - bw / 2, by, bw, 3, f.hp / f.max, '#ff5a5a');
  bar(f.x + f.ox - bw / 2, by + 4, bw, boss ? 2 : 1, f.wind > 0 ? 1 : 1 - f.timer / T_.per, f.wind > 0 ? '#ffffff' : '#7a3a3a', '#16161c');
  if (f.wind > 0) T('!', f.x + f.ox, by - 14, COL.red, 1, 'c', '#000');
  if (f.burnT > 0) rect(f.x + f.ox + bw / 2 + 2, by, 3, 3, '#ff9a3a');
  if (f.chill > 0) rect(f.x + f.ox + bw / 2 + 2, by + 4, 3, 3, '#9fe6f4');
  if (i === B.target && !boss) corners(x - 4, y - 4, w + 8, h + 8, Math.floor(B.t * 4) % 2 ? COL.gold : '#b08a30', 4);
  hit(x - 6, y - 12, w + 12, h + 16, () => { B.target = i; SFX.click(); });
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
  T(A.roman + '-' + (B.li % 3 + 1) + '  ' + LEVELS[B.li].n, 8, 6, A.c);
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
    drawSpr(u.dead ? 'grave' : u.spr, x + 3, y + 4, 1, u.dead ? 'dim' : '');
    T('' + (i + 1), x + 21, y + 4, act ? COL.white : COL.dim);
    bar(x + 3, y + 18, 28, 2, u.hp / u.max, u.dead ? '#333' : '#7ee07e', '#1a1620');
    hit(x, y, 34, 22, () => switchTo(i));
  });
  const au = activeUnit();
  if (au) T(charName(au.c), 312, 259, TINT[au.id], 1, 'r');
  drawTimingBar(au);
  if (!TOUCH) T('J strike   1 2 3 swap   Esc menu', 160, 305, '#4a4452', 1, 'c');
}
const TINT = { warrior: '#ffd35a', archer: '#7ee07e', mage: '#b48cff' };
function drawTimingBar(au) {
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
  } else T('no loot this time', 160, 140, COL.dark, 1, 'c');
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
    btn(8, y, 196, h, 'STRIKE', strike, { sc: 2, col: ready ? COL.gold : COL.dim, border: ready ? COL.gold : '#3a3a44', fill: ready ? '#16140a' : '#0c0c10' });
    btn(210, y, 50, h, 'Swap', cycleUnit, { dis: B.units.filter(u => !u.dead).length < 2 });
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
  if (scene === 'title') { confirmNew = 0; save.started = true; goto('camp'); }
  else if (scene === 'camp') startLevel(save.sel);
  else if (scene === 'msg') nextMsg();
  else if (scene === 'battle' && B) {
    if (B.paused) return;
    if ((B.state === 'win' || B.state === 'lose') && B.st <= 0) leaveBattle();
    else strike();
  }
}
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'KeyJ' || e.code === 'Space')) return;
  audio();
  const k = e.code;
  if (k === 'KeyJ' || k === 'Space' || k === 'Enter') { e.preventDefault(); onJ(); return; }
  if (k === 'KeyM') { save.mute = !save.mute; persist(); }
  if (scene === 'battle' && B) {
    if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') switchTo(+k.slice(5) - 1);
    if (k === 'Tab') { e.preventDefault(); cycleUnit(); }
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
      const live = B.foes.map((f, i) => f.dead ? -1 : i).filter(i => i >= 0); if (live.length) { const p = live.indexOf(B.target); B.target = live[(p + (k === 'ArrowUp' || k === 'KeyW' ? -1 : 1) + live.length) % live.length]; SFX.click(); }
    }
    if ((k === 'Escape' || k === 'KeyP') && B.state !== 'win' && B.state !== 'lose') { B.paused = !B.paused; SFX.click(); }
  } else if (k === 'Escape') {
    if (evoPick) evoPick = null; else if (scene === 'gear' || scene === 'skills' || scene === 'party') goto('camp');
  }
});
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width - OX, y: (e.clientY - r.top) * VH / r.height - OY }; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audio(); mouse = toLogical(e);
  for (let i = UI.length - 1; i >= 0; i--) { const b = UI[i]; if (mouse.x >= b.x && mouse.x < b.x + b.w && mouse.y >= b.y && mouse.y < b.y + b.h) { b.fn(); return; } }
  if (scene === 'title') onJ();
});
cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') mouse = toLogical(e); });
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && B && B.state === 'fight') B.paused = true; persist(); });

let last = performance.now();
function drawVoid() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#0e0d12';
  for (let y = ((OY % 8) + 8) % 8; y < VH; y += 8) for (let x = ((OX % 8) + 8) % 8; x < VW; x += 8) ctx.fillRect(x, y, 1, 1);
}
const WAM = window.WAM = { toCss: (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + (x + OX) * r.width / VW, y: r.top + (y + OY) * r.height / VH }; }, get save() { return save; }, get B() { return B; }, get scene() { return scene; }, startLevel, strike, zones, switchTo, onJ, TUNE, bot: 0, timeScale: 1, goto: s => { scene = s; } };
function botTick() {
  // test helper only: WAM.bot = accuracy 0..1 auto-presses J for recordings/tests
  if (!WAM.bot || !B || B.state !== 'fight' || B.paused || B.cd > 0) return;
  const { p, g } = zones(), d = Math.abs(B.mk - B.zc);
  if (!B._botAim) B._botAim = Math.random() < WAM.bot ? p * .35 : Math.random() < .6 ? g * .42 : 1;
  if (d <= B._botAim) { strike(); B._botAim = 0; }
  else if (B._botAim >= 1 && Math.random() < .02) { strike(); B._botAim = 0; }
}
function loop(now) {
  let dt = Math.min(.05, (now - last) / 1000) * WAM.timeScale; last = now; gtime += dt;
  try {
    botTick();
    if (scene === 'battle' && B) updateBattle(dt);
    UI = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawVoid();
    const qa = scene === 'battle' && B ? B.quake * (RM ? .25 : 1) : 0;
    ctx.setTransform(1, 0, 0, 1, OX + (qa ? Math.round(rnd(-qa, qa)) : 0), OY + (qa ? Math.round(rnd(-qa, qa)) : 0));
    if (scene === 'title') drawTitle();
    else if (scene === 'camp') drawCamp();
    else if (scene === 'gear') drawGear();
    else if (scene === 'skills') drawSkills();
    else if (scene === 'party') drawParty();
    else if (scene === 'msg') drawMsg();
    else if (scene === 'battle' && B) drawBattle();
    drawStrip();
    if (scene === 'battle' && B) drawBossOverlay();
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}
loadSave();
if (DEBUG) {
  // ?debug : everything unlocked for tweaking
  save.started = true; save.unlocked = 11; save.act4 = true; save.cleared = save.cleared.map((c, i) => i < 9 ? true : c);
  ['archer', 'mage'].forEach(addChar); if (!save.goblets.length) save.goblets = ['blue', 'green', 'red'];
  save.party.forEach(id => { const c = save.chars[id]; if (c.lvl < 6) { c.lvl = 6; c.sp = 5; c.stp = 10; } });
  save.perfects = Math.max(save.perfects, TUNE.act4Perfects);
}
requestAnimationFrame(loop);
