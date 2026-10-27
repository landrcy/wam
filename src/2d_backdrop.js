// ---- Act backdrops: animated pixel-art scene filling the screen around the 320px box ----
// Drawn in raw canvas pixels (1 canvas px = 1 logical px). Static layers are cached per act/size;
// moving pieces (clouds, embers, torches, banners, swaying trees, shards) are drawn live and freeze under RM.
const BDP = [
  { sky: ['#141a33', '#23284a', '#4a3350', '#8a4a3c', '#c8763c'], far: '#2a2a3a', mid: '#1f3324', near: '#16261a', acc: '#ffb040' },
  { sky: ['#140c0c', '#2a1414', '#4a2018', '#6e3020', '#8a4a2a'], far: '#2a1c1a', mid: '#1c1414', near: '#120c0c', acc: '#ff7a2a' },
  { sky: ['#06060e', '#0c0c1c', '#14142a', '#1e1a34', '#2a2040'], far: '#16142a', mid: '#0e0c1a', near: '#0a0812', acc: '#c83040' },
  { sky: ['#08040e', '#140a22', '#22103a', '#301650', '#3e1e66'], far: '#24183a', mid: '#180e28', near: '#0e0818', acc: '#c8a0ff' },
];
let bdCache = null;
function bdRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function bdDither(g, x, y, w, h, a, b, k) { // k 0..1 share of b, ordered 2x2 dither
  const M = [0, .5, .75, .25]; g.fillStyle = a; g.fillRect(x, y, w, h); g.fillStyle = b;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (M[((y + j) & 1) * 2 + ((x + i) & 1)] < k) g.fillRect(x + i, y + j, 1, 1);
}
function bdSky(g, P, W, H, hz) {
  const n = P.sky.length - 1;
  for (let y = 0; y < hz; y++) {
    const f = y / hz * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
    bdDither(g, 0, y, W, 1, P.sky[i], P.sky[i + 1], k);
  }
}
function bdRidge(g, W, base, amp, fr, col, hi, seed, H) {
  const r = bdRng(seed), ph = r() * 9;
  for (let x = 0; x < W; x++) {
    const y = Math.round(base - amp * (.55 * Math.sin(x * fr + ph) + .3 * Math.sin(x * fr * 2.7 + ph * 2) + .15 * Math.sin(x * fr * 6.1)));
    g.fillStyle = col; g.fillRect(x, y, 1, H - y);
    if (hi) { g.fillStyle = hi; if (x % 2 === 0 || Math.sin(x * fr * 3) > 0) g.fillRect(x, y, 1, 1); }
  }
}
function bdBuild(act, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const P = BDP[act], hz = Math.round(H * .52), r = bdRng(act * 977 + 13);
  bdSky(g, P, W, H, hz + 40);
  const S = { hz, torches: [], banners: [], trees: [], windows: [], shards: [] };
  if (act === 0) { // goblin lands: distant mountains, rolling hills, ploughed fields, war camp
    bdRidge(g, W, hz - 30, 34, .011, P.far, '#3a3a50', 3, H);
    bdRidge(g, W, hz, 14, .02, '#24402a', '#3a5a34', 5, H);
    for (let y = hz + 8; y < H; y++) { const k = (y - hz) / (H - hz); bdDither(g, 0, y, W, 1, P.mid, P.near, k); if (y % 6 === 0) { g.fillStyle = '#2c4a26'; for (let x = (y * 7) % 5; x < W; x += 5) g.fillRect(x, y, 2, 1); } }
    for (let i = 0; i < Math.max(5, W / 40); i++) { // tents
      const x = Math.round(r() * W), y = hz + 2 + Math.round(r() * 10), w = 14 + Math.round(r() * 8);
      for (let j = 0; j < w / 2; j++) { g.fillStyle = j < w / 4 ? '#6a4a2a' : '#4a3220'; g.fillRect(x - j, y - w / 2 + j, j * 2, 1); }
      g.fillStyle = '#1a1008'; g.fillRect(x - 1, y - 4, 2, 4); S.torches.push([x + w / 2 + 2, y - 8]);
    }
  } else if (act === 1) { // burnt ash forest
    bdRidge(g, W, hz - 10, 20, .015, P.far, '#3a2620', 8, H);
    for (let y = hz; y < H; y++) bdDither(g, 0, y, W, 1, P.mid, P.near, (y - hz) / (H - hz));
    for (let y = hz; y < H; y += 3) { g.fillStyle = '#2a2020'; for (let x = (y * 5) % 7; x < W; x += 7 + (y % 4)) g.fillRect(x, y, 2, 1); }
    for (let i = 0; i < W / 12; i++) S.trees.push({ x: Math.round(r() * W), y: hz + Math.round(r() * 30) - 4, h: 40 + Math.round(r() * 50), ph: r() * 6 });
    S.trees.sort((a, b) => a.y - b.y);
  } else if (act === 2) { // black keep
    for (let i = 0; i < W * hz / 300; i++) { g.fillStyle = r() < .2 ? '#c8c8e0' : '#4a4a6a'; g.fillRect(Math.round(r() * W), Math.round(r() * hz * .8), 1, 1); }
    g.fillStyle = '#d8d8c8'; const mx = Math.round(W * .78), my = Math.round(hz * .25);
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) if (x * x + y * y <= 81) { g.fillStyle = (x + 3) * (x + 3) + (y - 2) * (y - 2) < 40 ? '#e8e8d8' : '#a8a898'; g.fillRect(mx + x, my + y, 1, 1); }
    bdRidge(g, W, hz + 4, 10, .02, P.far, '#24203a', 21, H);
    const cx = Math.round(W / 2), base = hz + 6; // castle silhouette centred behind the box
    const towers = []; for (let i = -9; i <= 9; i++) towers.push({ x: cx + i * Math.max(26, W / 16) + Math.round(r() * 8), h: 70 + Math.abs(i) * 6 + Math.round(r() * 40), w: 14 + Math.round(r() * 8) });
    g.fillStyle = P.mid; g.fillRect(0, base - 36, W, H);
    for (let x = 0; x < W; x += 6) g.fillRect(x, base - 40, 4, 4);
    towers.forEach(t => {
      g.fillStyle = P.mid; g.fillRect(t.x - t.w / 2, base - t.h, t.w, t.h);
      for (let j = 0; j < t.w / 2 + 4; j++) { g.fillStyle = '#0a0814'; g.fillRect(t.x - j, base - t.h - t.w / 2 - 4 + j, j * 2, 1); }
      g.fillStyle = '#1a1830'; g.fillRect(t.x - t.w / 2, base - t.h, 1, t.h);
      for (let k = 0; k < 3; k++) if (r() < .6) S.windows.push([t.x - 1, base - t.h + 10 + k * 16]);
      S.banners.push([t.x, base - t.h - t.w / 2 - 4]);
    });
    for (let y = base; y < H; y++) bdDither(g, 0, y, W, 1, P.mid, P.near, (y - base) / (H - base));
  } else { // mirror void: reflective floor grid and floating shards
    for (let y = hz; y < H; y++) { bdDither(g, 0, y, W, 1, '#140a22', '#08040e', (y - hz) / (H - hz)); }
    g.fillStyle = '#3a2460'; for (let k = 1; k < 30; k++) { const y = hz + Math.round(k * k * .6); if (y < H) g.fillRect(0, y, W, 1); }
    for (let k = -30; k <= 30; k++) for (let y = hz; y < H; y += 2) { const x = Math.round(W / 2 + k * 8 * (1 + (y - hz) / 14)); if (x >= 0 && x < W) g.fillRect(x, y, 1, 1); }
    for (let i = 0; i < W / 30; i++) S.shards.push({ x: r() * W, y: r() * hz * .9 + 8, s: 6 + r() * 12, ph: r() * 6, sp: .2 + r() * .5 });
  }
  return { c, S, act, W, H };
}
function bdTorch(x, y, t) {
  const f = RM ? 1 : .7 + .3 * Math.sin(t * 13 + x) * Math.sin(t * 7.3 + y);
  ctx.globalAlpha = .25 * f; ctx.fillStyle = '#ffa040'; ctx.fillRect(x - 3, y - 3, 7, 7); ctx.globalAlpha = 1;
  ctx.fillStyle = '#3a2410'; ctx.fillRect(x, y + 1, 1, 6);
  ctx.fillStyle = '#ff7020'; ctx.fillRect(x - 1, y - 1, 3, 2); ctx.fillStyle = '#ffd060'; ctx.fillRect(x, y - 1 - Math.round(f * 2), 1, 2 + Math.round(f));
}
function drawBackdrop() {
  const act = scene === 'battle' && B ? B.act : scene !== 'title' && typeof save !== 'undefined' && save && save.started ? Math.floor((save.sel || 0) / 3) : 0;
  if (act < 0 || act > 3) return false;
  if (!bdCache || bdCache.act !== act || bdCache.W !== VW || bdCache.H !== VH) bdCache = bdBuild(act, VW, VH);
  const { c, S } = bdCache, t = RM ? 0 : gtime, P = BDP[act];
  const px = RM ? 0 : Math.round(Math.sin(t * .05) * 3);
  ctx.drawImage(c, px - 3, 0, VW + 6, VH, -3, 0, VW + 6, VH);
  // clouds / ash haze drifting
  const cr = bdRng(act + 77);
  for (let i = 0; i < 7; i++) {
    const w = 30 + cr() * 50, y = Math.round(cr() * S.hz * .7), sp = 3 + cr() * 5;
    const x = Math.round(((cr() * VW + t * sp) % (VW + w)) - w);
    ctx.globalAlpha = act === 3 ? .12 : .22; ctx.fillStyle = act === 1 ? '#3a2a28' : act === 3 ? '#8060c0' : '#4a4a68';
    ctx.fillRect(x, y, w, 3); ctx.fillRect(x + 6, y - 2, w - 14, 2); ctx.fillRect(x + 3, y + 3, w - 8, 1);
  }
  ctx.globalAlpha = 1;
  S.torches.forEach(([x, y]) => bdTorch(x + px, y, t));
  S.trees.forEach(tr => { // dead trees sway at the tips
    const sw = RM ? 0 : Math.sin(t * .8 + tr.ph) * 1.5;
    ctx.fillStyle = '#0a0606'; ctx.fillRect(tr.x + px - 1, tr.y - tr.h, 3, tr.h);
    for (let k = 0; k < 4; k++) { const by = tr.y - tr.h * (.45 + k * .13), d = k % 2 ? 1 : -1, L = 10 - k * 2;
      for (let j = 0; j < L; j++) ctx.fillRect(tr.x + px + d * j + Math.round(sw * j / L), by - Math.round(j * .6), 1, 1); }
    ctx.fillStyle = '#ff6020'; if (tr.ph > 4.5) { ctx.globalAlpha = .6 + .4 * Math.sin(t * 5 + tr.ph); ctx.fillRect(tr.x + px, tr.y - tr.h * .3, 1, 1); ctx.globalAlpha = 1; }
  });
  if (act === 1) { // the treant looms on the horizon, eyes glowing
    const tx = Math.round(VW * .18), ty = S.hz + 10, br = RM ? 0 : Math.round(Math.sin(t * .6) * 1);
    ctx.fillStyle = '#0c0808'; ctx.fillRect(tx - 9, ty - 90 + br, 18, 90); ctx.fillRect(tx - 20, ty - 70 + br, 6, 30); ctx.fillRect(tx + 14, ty - 76 + br, 6, 34);
    ctx.fillRect(tx - 26, ty - 82 + br, 52, 10); ctx.fillRect(tx - 32, ty - 92 + br, 8, 12); ctx.fillRect(tx + 24, ty - 96 + br, 8, 16);
    ctx.fillStyle = '#ff9030'; ctx.globalAlpha = .7 + .3 * Math.sin(t * 2); ctx.fillRect(tx - 5, ty - 78 + br, 3, 2); ctx.fillRect(tx + 3, ty - 78 + br, 3, 2); ctx.globalAlpha = 1;
  }
  S.windows.forEach(([x, y], i) => { const f = RM ? 1 : .6 + .4 * Math.sin(t * 3 + i * 1.7); ctx.globalAlpha = f; rectRaw(x + px, y, 2, 3, '#e8a040'); ctx.globalAlpha = 1; });
  S.banners.forEach(([x, y], i) => { // flapping banners
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x + px, y - 10, 1, 10);
    for (let j = 0; j < 8; j++) { const w = RM ? 0 : Math.round(Math.sin(t * 5 - j * .7 + i) * 1.2); ctx.fillStyle = j > 5 ? '#8a1c28' : P.acc; ctx.fillRect(x + px + 1 + j, y - 10 + w, 1, 4 - (j > 5 ? 1 : 0)); }
  });
  S.shards.forEach(s => { // mirror shards drift and glint
    const y = s.y + (RM ? 0 : Math.sin(t * s.sp + s.ph) * 4), x = s.x + px, gl = RM ? .5 : .5 + .5 * Math.sin(t * 1.3 + s.ph * 3);
    ctx.fillStyle = '#2a1e48'; for (let j = 0; j < s.s; j++) ctx.fillRect(Math.round(x - j / 2), Math.round(y + j), Math.max(1, Math.round(j / 2)), 1);
    ctx.fillStyle = '#8a70c8'; for (let j = 0; j < s.s; j++) ctx.fillRect(Math.round(x - j / 2), Math.round(y + j), 1, 1);
    ctx.globalAlpha = gl; ctx.fillStyle = '#e8d8ff'; ctx.fillRect(Math.round(x), Math.round(y + 2), 1, 1); ctx.globalAlpha = 1;
    ctx.globalAlpha = .25; ctx.fillStyle = '#5a40a0'; for (let j = 0; j < s.s; j += 2) ctx.fillRect(Math.round(x - j / 2), Math.round(2 * S.hz - y - j + 30), 1, 1); ctx.globalAlpha = 1;
  });
  // particles: embers (I, II), ash (II), motes (IV)
  if (!RM) {
    const pr = bdRng(act * 31 + 5), N = Math.round(VW * VH / 9000);
    for (let i = 0; i < N; i++) {
      const sp = 8 + pr() * 16, ph = pr() * 100, x0 = pr() * VW, life = (t * sp / VH + ph) % 1;
      const y = VH - life * VH, x = x0 + Math.sin(t + ph) * 6;
      ctx.globalAlpha = .7 * (1 - life);
      ctx.fillStyle = act === 3 ? '#c8a0ff' : act === 2 ? '#8a8aa8' : i % 3 ? '#ff8030' : '#ffd060';
      if (act === 2 && i % 2) continue;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  // dim it so the box stays the focus: overall shade plus a darker ring hugging the frame
  ctx.globalAlpha = .38; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  for (let k = 1; k <= 3; k++) { ctx.globalAlpha = .18; ctx.fillRect(OX - k * 4, OY - k * 4, LW + k * 8, LH + k * 8); }
  ctx.globalAlpha = 1;
  return true;
}
function rectRaw(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
