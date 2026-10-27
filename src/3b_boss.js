// ================= boss fights =================
// Act bosses break the arena: the border shatters, the square tears open wider each phase to reveal the act's
// own world, and the boss is a large hand-built pixel figure (painted procedurally at the party's pixel size,
// lit from the upper left) that visibly transforms every phase.
const BOSS = {
  gobchief: { phases: 2, crack: '#ffb04a', lines: ['', 'The Chief rages!'], tr: ['', 'burst'],
    pats: [{}, { per: .7, wind: .8, zone: .8, spd: 1.15, dbl: 1 }] },
  treant: { phases: 3, crack: '#9cff6a', lines: ['', 'Roots tear the ground', 'The forest burns'], tr: ['', 'burst', 'wipe'],
    pats: [{}, { per: .85, zone: .85, spd: 1.1, drift: .12 }, { per: .7, wind: .75, zone: .72, spd: 1.2, drift: .22, slam: 2 }] },
  darkknight: { phases: 3, crack: '#ff4a5a', lines: ['', 'The helm splits', 'Black wings'], tr: ['', 'burst', 'spread'],
    pats: [{}, { per: .8, zone: .8, spd: 1.15, dbl: 1 }, { per: .65, wind: .7, zone: .68, spd: 1.3, blink: 1, dbl: 1 }] },
  mirror: { phases: 4, crack: '#e8e0ff', lines: ['', 'Reality inverts', 'Your reflection steps out', 'Break the reflection'], tr: ['', 'burst', 'reasm', 'reasm'],
    pats: [{}, { per: .85, zone: .85, spd: 1.1, invert: 1 }, { per: .75, zone: .75, spd: 1.2, drift: .18, rev: 1 },
      { per: .6, wind: .7, zone: .65, spd: 1.35, drift: .25, blink: 1, dbl: 1, invert: 1 }] },
};
const BOSS_POS = [252, 248];
const BW = 96, BH = 74, BOX = 16, BOY = 10; // boss canvas (boss pixels) and design-space offset
const ease = t => 1 - (1 - t) * (1 - t);
// arm angle through a swing: idle -> raised (windup) -> strike -> back to idle
function swing(a, idle, wind, hit) {
  if (a.at > 0) return a.at < .4 ? wind + (hit - wind) * ease(a.at / .4) : hit + (idle - hit) * ease((a.at - .4) / .6);
  return idle + (wind - idle) * a.wu;
}
const pol = (x, y, ang, len) => [x + Math.cos(ang) * len, y + Math.sin(ang) * len];

// ---------- Goblin Chief: crowned, armoured -> armour torn off, horns, war paint, flaming club ----------
function artGob(P, ph, a) {
  const b = a.br, R = ph >= 1, sk = 'skin';
  // back arm (behind the body)
  P.line(46, 28 - b, 51, 41 - b, 3.4, sk, 2.8); P.ell(52, 43 - b, 3.2, 3.2, sk);
  // legs, feet
  P.line(26, 47, 24, 59, 3.8, sk, 3); P.line(38, 47, 40, 59, 3.8, sk, 3);
  P.ell(21, 61, 5.5, 2.5, 'leather'); P.ell(43, 61, 5.5, 2.5, 'leather');
  P.poly([[20, 44 - b], [44, 44 - b], [42, 55], [36, 52], [32, 57], [28, 52], [22, 55]], R ? 'red' : 'leather');
  // belly + chest
  P.ell(32, 38 - b, 15, 11, sk); P.ell(32, 29 - b, 13, 7, sk);
  if (!R) {
    P.poly([[19, 23 - b], [45, 23 - b], [46, 35 - b], [32, 40 - b], [18, 35 - b]], 'iron');
    P.line(32, 24 - b, 32, 38 - b, .6, 'steel', .6);
    for (const [x, y] of [[21, 26], [43, 26], [22, 33], [42, 33]]) P.px(x, y - b, 'steel', 3);
    P.box(18, 41 - b, 28, 3, 'leather'); P.box(29, 40 - b, 6, 5, 'gold');
    P.ell(46, 23 - b, 6.5, 5, 'iron'); P.poly([[44, 19 - b], [47, 12 - b], [50, 19 - b]], 'steel');
  } else {
    for (const [x0, y0, x1, y1] of [[23, 30, 28, 40], [27, 29, 32, 39], [37, 30, 41, 37]]) P.line(x0, y0 - b, x1, y1 - b, .7, 'red', .7, { flat: 2 });
    P.line(36, 33 - b, 42, 41 - b, .5, 'bone', .5, { flat: 1 }); // scar
    for (let i = 0; i < 5; i++) P.ell(24 + i * 4, 24 - b + (i === 2 ? 1 : 0), 1.3, 1.6, 'bone');
    P.box(18, 41 - b, 28, 3, 'leather'); P.ell(32, 42 - b, 3, 2.5, 'bone'); P.px(31, 42 - b, 'black', 0); P.px(33, 42 - b, 'black', 0);
    P.ell(47, 24 - b, 4, 3, 'iron'); // what's left of the pauldron
  }
  // head
  const hy = 13 - b, eye = R ? 'eyeR' : 'eyeY';
  P.poly([[22, hy - 1], [7, hy - 7], [12, hy - 2], [22, hy + 4]], sk); P.poly([[42, hy - 1], [55, hy - 8], [52, hy - 2], [42, hy + 4]], sk);
  P.ell(32, hy, 11, 9, sk); P.ell(32, hy + 5, 9.5, 5, sk);
  P.box(23, hy - 3, 18, 2, sk, { flat: 1 }); P.ell(29, hy + 1, 2.4, 2, sk, { b: 1 });
  P.ell(26, hy, 2.4, 1.8, eye); P.ell(37, hy, 2.4, 1.8, eye); P.px(25, hy, 'black', 0); P.px(36, hy, 'black', 0);
  P.box(25, hy + 5, 14, 2, 'black', { flat: 0 });
  for (let x = 27; x < 38; x += 3) P.px(x, hy + 5, 'bone', 3);
  P.poly([[25, hy + 8], [26, hy + 2], [28, hy + 8]], 'bone'); P.poly([[36, hy + 8], [38, hy + 2], [39, hy + 8]], 'bone');
  if (!R) {
    P.box(23, hy - 10, 18, 3, 'gold');
    for (const x of [23, 28, 33, 38]) P.poly([[x, hy - 10], [x + 1.5, hy - 15], [x + 3, hy - 10]], 'gold');
    P.ell(32, hy - 9, 1.5, 1.2, 'red');
  } else {
    P.line(25, hy - 6, 16, hy - 16, 2.6, 'bone', .6); P.line(39, hy - 6, 47, hy - 16, 2.6, 'bone', .6); // horns
    P.poly([[26, hy - 8], [38, hy - 11], [39, hy - 8], [27, hy - 5]], 'gold'); P.poly([[34, hy - 10], [36, hy - 15], [38, hy - 10]], 'gold');
    P.line(22, hy + 2, 30, hy + 3, .5, 'red', .5, { flat: 2 }); P.line(34, hy + 3, 42, hy + 2, .5, 'red', .5, { flat: 2 }); // war paint
  }
  // weapon arm + club (in front)
  const sa = swing(a, 2.2, -2.3, 2.8), [hx, hy2] = pol(18, 27 - b, sa, 12);
  const ca = swing(a, -2.0, -.5, 2.5), [ex, ey] = pol(hx, hy2, ca, R ? 20 : 18);
  P.ell(18, 25 - b, R ? 6 : 7, R ? 5 : 5.5, R ? sk : 'iron'); if (!R) P.poly([[14, 21 - b], [16, 14 - b], [19, 21 - b]], 'steel');
  P.line(18, 27 - b, hx, hy2, 3.4, sk, 2.8);
  P.line(hx, hy2, ex, ey, 1.2, 'wood', 2.2);
  const hr = R ? 5.5 : 4.5;
  P.ell(ex, ey, hr, hr, R ? 'iron' : 'wood');
  for (let k = 0; k < 7; k++) { const an = ca - 1.6 + k * .55, [sx, sy] = pol(ex, ey, an, hr - .5), [tx, ty] = pol(ex, ey, an, hr + (R ? 4 : 3)); P.line(sx, sy, tx, ty, 1, 'steel', .3); }
  if (!R) { const [bx, by] = pol(hx, hy2, ca, 13); P.line(bx - 2, by, bx + 2, by, .8, 'iron', .8); }
  else {
    for (let k = 0; k < 3; k++) { const an = ca + (k - 1) * .9, [sx, sy] = pol(ex, ey, an, 1), [tx, ty] = pol(ex, ey, an, hr - 1); P.line(sx, sy, tx, ty, .5, 'ember', .5); }
    for (let k = 0; k < 4; k++) { const fx = ex - 4 + k * 3, h = 4 + ((k + a.fl) % 3) * 2; P.poly([[fx - 2, ey - hr + 2], [fx, ey - hr - h], [fx + 2, ey - hr + 2]], 'fire'); }
  }
  P.ell(hx, hy2, 3.2, 3.2, sk);
}
// ---------- Treant: leafy giant -> thorn-root arms + glowing fungus -> catches fire ----------
function artTreant(P, ph, a) {
  const b = a.br, burn = ph >= 2, bark = burn ? 'black' : 'bark', eye = ph === 0 ? 'eyeY' : ph === 1 ? 'eyeG' : 'fire';
  if (ph >= 1) for (const s of [-1, 1]) { // thorn root-arms rising out of the ground
    const bx = s < 0 ? 0 : 64, sway = [0, 1, 0, -1][a.fl] * s;
    let px = bx, py = 63;
    for (let i = 1; i <= 7; i++) {
      const nx = bx - s * Math.sin(i * .45) * 7 + sway * (i > 3 ? 1 : 0), ny = 63 - i * 4.4, r = 3 - i * .32;
      P.line(px, py, nx, ny, r + .3, bark, r);
      if (i % 2) { const [tx, ty] = [nx + s * (r + 2), ny - 1]; P.line(nx, ny, tx, ty, .9, 'bone', .3); }
      px = nx; py = ny;
    }
    if (burn) P.ell(px, py - 1, 2, 2.5, 'fire');
  }
  for (const [x1, y1, x2, y2] of [[22, 52, 6, 62], [27, 55, 16, 63], [37, 55, 47, 63], [42, 52, 58, 62], [32, 56, 32, 63]]) P.line(x1, y1, x2, y2, 3.2, bark, 1.4);
  // back branch arm
  P.line(46, 28 - b, 57, 39 - b, 3, bark, 2); P.line(57, 39 - b, 60, 33 - b, 1.6, bark, .8); P.line(57, 39 - b, 62, 42 - b, 1.4, bark, .6);
  // trunk
  P.poly([[18, 23 - b], [46, 23 - b], [51, 56], [13, 56]], bark);
  for (let x = 20, i = 0; x < 46; x += 5, i++) P.line(x, 26 - b, x + (i & 1 ? 1.5 : -1.5), 54, .5, bark, .5, { flat: 0 });
  P.ell(41, 46, 2.5, 2, bark, { flat: 0 }); P.ell(21, 50, 2, 1.6, bark, { flat: 0 });
  if (burn) for (const pts of [[[20, 30], [23, 36], [21, 42], [24, 49]], [[44, 28], [41, 35], [44, 41]], [[33, 48], [30, 53]]]) for (let i = 0; i + 1 < pts.length; i++) P.line(pts[i][0], pts[i][1] - b, pts[i + 1][0], pts[i + 1][1] - b, .6, 'ember', .6);
  if (ph === 1) for (const [x, y] of [[20, 45], [22, 47], [44, 37], [45, 39], [40, 51], [26, 24]]) P.ell(x, y - b, 1.3, 1, 'eyeG');
  if (!burn) { P.ell(20, 24 - b, 5.5, 2.6, 'moss'); P.ell(44, 24 - b, 5.5, 2.6, 'moss'); }
  // face
  P.line(20, 28 - b, 30, 31 - b, 1.3, bark); P.line(44, 28 - b, 34, 31 - b, 1.3, bark);
  P.ell(26, 34 - b, 3.6, 3, 'black', { flat: 0 }); P.ell(38, 34 - b, 3.6, 3, 'black', { flat: 0 });
  P.ell(26, 34 - b, 1.6, 1.4, eye); P.ell(38, 34 - b, 1.6, 1.4, eye);
  P.poly([[23, 41 - b], [41, 41 - b], [38, 48 - b], [32, 45 - b], [26, 48 - b]], 'black', { flat: 0 });
  if (burn) P.ell(32, 43 - b, 4, 1.6, 'fire');
  for (const x of [26, 30, 34, 38]) P.px(x, 41 - b, bark, 2);
  // canopy
  if (ph === 0) {
    for (const [x, y, rx, ry] of [[32, 9, 17, 9], [17, 15, 9, 7], [47, 15, 9, 7], [24, 4, 9, 6], [41, 4, 9, 6], [32, 19, 13, 4]]) P.ell(x, y - b, rx, ry, 'leaf');
    for (const [x, y] of [[22, 2], [30, 0], [38, 3], [14, 12], [44, 9], [27, 9]]) P.ell(x, y - b, 1.5, 1, 'moss', { flat: 3 });
  } else {
    P.line(22, 20 - b, 8, 2 - b, 1.6, bark, .6); P.line(42, 20 - b, 57, 1 - b, 1.6, bark, .6); P.line(32, 20 - b, 33, -6 - b, 1.8, bark, .6); P.line(28, 12 - b, 20, -2 - b, 1, bark, .4);
    if (!burn) { for (const [x, y, rx, ry] of [[30, 10, 11, 6], [45, 13, 6, 4], [16, 12, 5, 4]]) P.ell(x, y - b, rx, ry, 'leaf'); P.ell(31, 8 - b, 2, 1, 'eyeG'); }
    else for (let i = 0; i < 8; i++) {
      const x = 9 + i * 6.5, h = 9 + ((i * 7 + a.fl * 3) % 5) * 2.2, y0 = 20 - b - (i % 3 === 1 ? 4 : 0);
      P.poly([[x - 4, y0], [x + ((i + a.fl) % 2 ? 1 : -1), y0 - h], [x + 4, y0]], 'fire');
      P.poly([[x - 2, y0], [x, y0 - h * .55], [x + 2, y0]], 'eyeY', { flat: 2 });
    }
  }
  // front arm (slams)
  const sa = swing(a, 2.25, -2.4, 2.75), [ex, ey] = pol(18, 28 - b, sa, 13), fa = sa + (a.at > 0 && a.at < .6 ? .1 : .5), [hx, hy] = pol(ex, ey, fa, 10);
  P.line(18, 28 - b, ex, ey, 3.4, bark, 2.8); P.line(ex, ey, hx, hy, 2.8, bark, 2);
  for (let k = -1; k <= 1; k++) { const [tx, ty] = pol(hx, hy, fa + k * .55, 5); P.line(hx, hy, tx, ty, 1.2, bark, .5); }
  if (!burn) P.ell(ex, ey - 2, 3, 1.8, 'moss'); else P.ell(ex, ey - 2, 2, 2.5, 'fire');
}
// ---------- Dark Knight: full plate -> helm cracks (glowing eye), broken pauldron -> horns, black wings, black-flame sword ----------
function artKnight(P, ph, a) {
  const b = a.br, cr = ph >= 1, W = ph >= 2;
  if (W) { // wings behind everything
    const s = a.sp;
    for (const d of [-1, 1]) {
      const rx = 32 + d * 6, ry = 18 - b, tip = (dx, dy) => [rx + d * dx * s, ry + dy * s];
      const t1 = tip(30, -22), t2 = tip(38, -2), t3 = tip(30, 16), t4 = tip(18, 26);
      P.poly([[rx, ry], t1, [rx + d * 26 * s, ry - 8 * s], t2, [rx + d * 28 * s, ry + 8 * s], t3, [rx + d * 16 * s, ry + 18 * s], t4, [rx + d * 4, ry + 16]], 'black');
      for (const t of [t1, t2, t3, t4]) P.line(rx, ry, t[0], t[1], 1.2, 'dark', .5);
      P.ell(t1[0], t1[1], 1.2, 1.2, 'bone');
    }
  } else { // cape
    const tear = cr ? [[50, 60], [46, 56], [43, 61], [38, 57], [33, 62], [28, 56], [22, 61], [18, 57], [14, 60]] : [[50, 61], [14, 61]];
    P.poly([[20, 19 - b], [44, 19 - b], ...tear], 'cloth');
  }
  // legs
  P.box(22, 44, 8, 13, 'iron', { cyl: 1 }); P.box(34, 44, 8, 13, 'iron', { cyl: 1 });
  P.ell(26, 48, 4, 3, 'steel'); P.ell(38, 48, 4, 3, 'steel');
  P.poly([[16, 63], [30, 63], [30, 57], [21, 57]], 'iron'); P.poly([[33, 63], [46, 63], [44, 57], [34, 57]], 'iron');
  // tassets + cuirass
  P.poly([[19, 39 - b], [45, 39 - b], [47, 47 - b], [17, 47 - b]], 'iron'); P.line(32, 40 - b, 32, 46 - b, .5, 'dark', .5, { flat: 0 });
  P.poly([[19, 19 - b], [45, 19 - b], [43, 40 - b], [21, 40 - b]], 'iron');
  P.line(32, 20 - b, 32, 38 - b, .6, 'steel', .6); P.box(20, 38 - b, 24, 2, 'leather'); P.box(30, 37 - b, 4, 4, 'gold');
  if (!cr) P.ell(32, 27 - b, 2.6, 2.6, 'red');
  else {
    const core = W ? 'dflame' : 'eyeR';
    P.ell(32, 27 - b, W ? 4 : 2.6, W ? 4 : 2.6, core);
    for (const pts of [[[32, 27], [27, 23], [24, 25]], [[32, 27], [36, 33], [40, 32]], [[32, 27], [29, 34], [30, 38]]]) for (let i = 0; i + 1 < pts.length; i++) P.line(pts[i][0], pts[i][1] - b, pts[i + 1][0], pts[i + 1][1] - b, .55, core, .55);
  }
  // back pauldron
  P.ell(46, 20 - b, 7, 5, 'iron'); if (W) P.poly([[44, 16 - b], [48, 8 - b], [50, 16 - b]], 'dark');
  // helm
  P.ell(32, 8 - b, 8.5, 8, 'iron'); P.box(24, 7 - b, 17, 11, 'iron');
  P.box(25, 10 - b, 14, 1, 'black', { flat: 0 }); for (let x = 27; x < 38; x += 2) P.px(x, 14 - b, 'black', 0);
  if (!cr) { P.line(32, 1 - b, 40, -5 - b, 1.8, 'red', 1.2); P.line(38, -4 - b, 47, -1 - b, 1.4, 'red', .5); P.ell(25, 10 - b, 1, 1, 'eyeR'); }
  else {
    P.poly([[24, 6 - b], [31, 9 - b], [29, 16 - b], [24, 16 - b]], 'black', { flat: 0 }); // broken face plate
    P.line(31, 0 - b, 33, 8 - b, .5, 'black', .5, { flat: 0 }); P.line(33, 8 - b, 30, 13 - b, .5, 'black', .5, { flat: 0 });
    P.ell(27, 11 - b, 1.6, 1.3, W ? 'dflame' : 'eyeR'); if (W) P.ell(36, 10 - b, 1.2, .9, 'dflame');
    if (W) { P.line(26, 3 - b, 17, -7 - b, 2.2, 'bone', .5); P.line(38, 3 - b, 46, -7 - b, 2.2, 'bone', .5); for (let i = 0; i < 3; i++) P.poly([[28 + i * 3, 0 - b], [29.5 + i * 3, -5 - b - ((i + a.fl) % 2) * 2], [31 + i * 3, 0 - b]], 'dflame'); }
    else P.line(32, 0 - b, 34, -2 - b, 1, 'dark', .6); // burnt plume stub
  }
  // sword arm
  const sa = swing(a, 1.95, -2.0, 2.9), [hx, hy] = pol(18, 22 - b, sa, 12), wa = swing(a, 1.75, -.45, 2.35);
  if (!cr) { P.ell(18, 20 - b, 7, 5, 'iron'); P.poly([[13, 17 - b], [16, 12 - b], [19, 17 - b]], 'steel'); }
  else { P.ell(18, 21 - b, 4.5, 3.6, 'dark'); P.poly([[14, 19 - b], [20, 16 - b], [19, 21 - b]], 'iron'); }
  P.line(18, 22 - b, hx, hy, 3, 'iron', 2.6);
  const [tx, ty] = pol(hx, hy, wa, 32), [px, py] = pol(hx, hy, wa, -4);
  P.line(hx, hy, tx, ty, 2, W ? 'dflame' : 'steel', 1);
  if (W) for (let k = 0; k < 4; k++) { const [fx, fy] = pol(hx, hy, wa, 8 + k * 6); P.ell(fx + ((k + a.fl) % 2), fy - 2, 1.3, 2, 'dflame'); }
  else P.line(hx, hy, tx, ty, .5, 'steel', .5, { flat: 3 });
  const [g1x, g1y] = pol(hx, hy, wa + Math.PI / 2, 4), [g2x, g2y] = pol(hx, hy, wa - Math.PI / 2, 4), [gx, gy] = pol(hx, hy, wa, 2);
  P.line(g1x + (gx - hx), g1y + (gy - hy), g2x + (gx - hx), g2y + (gy - hy), 1, 'gold', 1);
  P.line(hx, hy, px, py, 1, 'leather', 1); P.ell(px, py, 1.5, 1.5, 'gold');
  P.ell(hx, hy, 2.8, 2.8, 'iron');
}
// ---------- Mirror: ornate mirror -> cracked + inverted -> your reflection steps out -> distorted many-armed copy ----------
function artMirror(P, ph, a) {
  const b = a.br;
  const copy = (big, D) => { // the dark reflection of the warrior
    const k = big ? 1 : .55, cx = 32, by = big ? 62 : 52, Y = v => by - v * k, X = v => cx + v * k;
    if (D) for (const d of [-1, 1]) { const s = a.sp; P.poly([[X(d * 6), Y(40)], [X(d * (16 + 14 * s)), Y(60 + 6 * s)], [X(d * (14 + 18 * s)), Y(44)], [X(d * (20 + 14 * s)), Y(36)], [X(d * 10), Y(30)]], 'glass'); }
    P.box(Math.round(X(-9)), Math.round(Y(16)), Math.round(7 * k), Math.round(16 * k), 'black'); P.box(Math.round(X(3)), Math.round(Y(16)), Math.round(7 * k), Math.round(16 * k), 'black');
    P.poly([[X(-14), Y(38)], [X(14), Y(38)], [X(12), Y(15)], [X(-12), Y(15)]], 'black');
    P.ell(X(0), Y(47), 11 * k, 10 * k, 'black'); P.box(Math.round(X(-10)), Math.round(Y(48)), Math.round(20 * k), Math.round(9 * k), 'black');
    const ey = Y(47), eye = D ? 'void' : ph >= 1 ? 'eyeR' : 'white';
    P.box(Math.round(X(-6)), Math.round(ey), Math.max(1, Math.round(3 * k)), Math.max(1, Math.round(3 * k)), eye, { flat: 3 });
    P.box(Math.round(X(3)), Math.round(ey), Math.max(1, Math.round(3 * k)), Math.max(1, Math.round(3 * k)), eye, { flat: 3 });
    if (D) P.box(Math.round(X(-1)), Math.round(Y(53)), 2, 3, 'void', { flat: 3 });
    for (const [x, y] of [[-8, 30], [6, 24], [-2, 20], [9, 34]]) P.px(X(x), Y(y), D ? 'void' : 'glass', 3);
    if (D) for (let i = 0; i < 5; i++) P.poly([[X(-10 + i * 5), Y(56)], [X(-8 + i * 5), Y(64 + (i % 2) * 5)], [X(-6 + i * 5), Y(56)]], 'glass');
    return { X, Y, k };
  };
  if (ph <= 1) {
    P.poly([[14, 63], [50, 63], [45, 55], [19, 55]], 'gold'); P.ell(14, 61, 3.5, 2.5, 'gold'); P.ell(50, 61, 3.5, 2.5, 'gold');
    P.box(11, 12, 42, 45, 'gold'); P.ell(32, 13, 21, 12, 'gold');
    P.box(15, 14, 34, 41, 'glass', { flat: ph ? 0 : 1 }); P.ell(32, 14, 17, 9, 'glass', { flat: ph ? 0 : 1 });
    const r = copy(false, false), sw = swing(a, -1.2, -2.2, -.2), [hx, hy] = pol(r.X(11), r.Y(32), sw, 2), [tx, ty] = pol(hx, hy, sw, 14);
    P.line(r.X(10), r.Y(36), hx, hy, 1.4, 'black', 1.2); P.line(hx, hy, tx, ty, .8, ph ? 'eyeR' : 'white', .5, { flat: 3 });
    if (!ph) { P.line(18, 44, 28, 18, .5, 'shine', .5, { flat: 2 }); P.line(22, 52, 36, 16, .5, 'shine', .5, { flat: 1 }); }
    else for (const [x1, y1] of [[18, 16], [47, 20], [16, 44], [46, 50], [30, 54], [40, 12], [20, 30]]) P.line(37, 27, x1, y1, .5, 'shine', .5, { flat: 3 });
    P.ell(32, 2, 3.5, 3.5, ph ? 'void' : 'red'); P.ell(11, 32, 2.2, 2.2, ph ? 'void' : 'purple'); P.ell(53, 32, 2.2, 2.2, ph ? 'void' : 'purple');
    for (const [x, y] of [[16, 8], [48, 8]]) { P.ell(x, y, 3, 2, 'gold'); P.px(x, y, 'gold', 3); }
    return;
  }
  const D = ph >= 3;
  // broken frame left behind
  P.box(4, 16, 5, 40, 'gold'); P.poly([[4, 16], [12, 6], [20, 3], [22, 6], [9, 16]], 'gold'); P.box(55, 30, 5, 26, 'gold');
  P.poly([[9, 18], [14, 22], [9, 30]], 'glass'); P.poly([[55, 32], [51, 36], [55, 44]], 'glass'); P.poly([[2, 56], [62, 56], [58, 63], [6, 63]], 'gold');
  const r = copy(true, D);
  // cape of inverted light
  P.poly([[r.X(-12), r.Y(38)], [r.X(-22), r.Y(6)], [r.X(-14), r.Y(2)], [r.X(-6), r.Y(30)]], 'white');
  const arms = D ? [[-12, 34, 0], [-12, 26, .9], [12, 30, 2.6]] : [[-12, 34, 0]];
  for (const [ax, ay, off] of arms) {
    const sw = swing(a, 2.0, -2.0, 2.8) + off * (off > 2 ? -1 : 1) * .4, [hx, hy] = pol(r.X(ax), r.Y(ay), sw + (off > 2 ? Math.PI - 2 * sw + 2.6 : 0), 11);
    const wa = swing(a, 1.8, -.5, 2.35) + off * .35, [tx, ty] = pol(hx, hy, wa, D ? 26 : 30);
    P.line(r.X(ax), r.Y(ay), hx, hy, 2.6, 'black', 2.2);
    P.line(hx, hy, tx, ty, 2, 'glass', .8); P.line(hx, hy, tx, ty, .5, 'shine', .5, { flat: 3 });
    const [gx, gy] = pol(hx, hy, wa + Math.PI / 2, 3.5), [gx2, gy2] = pol(hx, hy, wa - Math.PI / 2, 3.5); P.line(gx, gy, gx2, gy2, .9, D ? 'void' : 'white', .9);
    P.ell(hx, hy, 2.4, 2.4, 'black');
  }
  if (D) for (const [x, y] of [[-10, 28], [6, 22], [11, 36], [-4, 40]]) P.line(r.X(x), r.Y(y), r.X(x + 4), r.Y(y - 5), .5, 'void', .5);
}
const BOSSART = { gobchief: artGob, treant: artTreant, darkknight: artKnight, mirror: artMirror };
const bfCache = new Map(), BHD = 4; // bosses are painted 4x finer than their design grid
const BDETAIL = {};
function bossFrame(k, ph, a) {
  const key = k + ph + '|' + a.br + a.wu + a.at + a.fl + a.sp; let c = bfCache.get(key); if (c) return c;
  const P = new HD(BW, BH, BOX, BOY, BHD);
  const A = { br: a.br, wu: a.wu / 4, at: a.at / 6, fl: a.fl, sp: a.sp / 6 }; BOSSART[k](P, ph, A);
  if (BDETAIL[k]) BDETAIL[k](P, ph, A); c = P.bake(); if (bfCache.size > 90) bfCache.delete(bfCache.keys().next().value); bfCache.set(key, c); return c;
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
  f.spr = 'boss:' + f.k; f.sc = PSC; f.x = BOSS_POS[0]; f.y = BOSS_POS[1]; f.ox = 0; f.drop = 1;
  B.boss = { f, k: f.k, D, phase: 0, st: 'intro', t: 0, cracks: [], integ: 1, bcrack: 0, warp: 0, inv: false, flash: null, ev: {}, exp: 0, expT: 0, jag: jagSeed(f.k), tr: null };
  B.state = 'boss'; B.tip = null; SFX.rumble();
}
// sample the visible pixels of a boss frame into flying particles (transforms, death)
function bossBits(cv, x0, y0, n, sp, life) {
  const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, pts = [];
  for (let y = 0; y < cv.height; y += 2 * (cv.R || 1)) for (let x = 0; x < cv.width; x += 2 * (cv.R || 1)) { const i = (y * cv.width + x) * 4; if (d[i + 3] > 200) pts.push([x, y, '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')]); }
  for (let k = 0; k < n && pts.length; k++) {
    const [x, y, col] = pts[Math.floor(Math.random() * pts.length)], S = ((B.boss && B.boss.f.sc) || PSC) / (cv.R || 1), px = x0 + x * S, py = y0 + y * S, cx = x0 + cv.width * S / 2, cy = y0 + cv.height * S * .6;
    const an = Math.atan2(py - cy, px - cx) + rnd(-.4, .4), v = rnd(.3, 1) * sp;
    B.parts.push({ x: px, y: py, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 40, t: 0, life: rnd(.5, 1) * life, col, s: S, g: 220 });
  }
}
function bossPose(f) {
  const bo = B.boss, wu = f.wind > 0 && f.windMax ? 1 - f.wind / f.windMax : 0, at = f.anim ? f.anim.t / f.anim.dur : 0;
  let sp = 6; if (bo.st === 'phase' && bo.tr === 'spread') sp = Math.round(clamp((bo.t - .45) / .7, 0, 1) * 6); else if (bo.k === 'darkknight' || bo.k === 'mirror') sp = 5 + (RM ? 0 : Math.floor(B.t * 1.5) % 2);
  return { br: RM ? 0 : Math.sin(B.t * 2.4) > 0 ? 1 : 0, wu: Math.round(wu * 4), at: Math.ceil(at * 6), fl: RM ? 0 : Math.floor(B.t * 8) % 4, sp };
}
function bossPhaseCheck(f) {
  const bo = B.boss; if (!bo || bo.f !== f || bo.st !== 'fight') return;
  const n = bo.D.phases; if (bo.phase >= n - 1) return;
  const th = f.max * (1 - (bo.phase + 1) / n);
  if (f.hp > th) return;
  f.hp = Math.max(1, Math.ceil(th));
  bo.old = bossFrame(bo.k, bo.phase, bossPose(f));
  bo.phase++; bo.st = 'phase'; bo.t = 0; bo.ev = {}; f.wind = 0; f.inv = true; f.dbl = 0; f.pend = null; f.anim = null; bo.tr = bo.D.tr[bo.phase];
  quake(12); bossFlash(bo.D.crack, .45); bo.warp = 1; SFX.roar();
  addCracks(6 + bo.phase * 2, B.t);
  banner(bo.D.lines[bo.phase] || ('Phase ' + (bo.phase + 1)), bo.D.crack, 1.5);
}
function bossKilled(f) {
  const bo = B.boss; if (!bo || bo.f !== f) return false;
  bo.st = 'outro'; bo.t = 0; bo.ev = {}; bo.inv = false; bo.warp = 0; bo.expT = 0;
  quake(14); bossFlash('#ffffff', .5); SFX.bossDie();
  return true;
}
function bossShatter(f) {
  const bo = B.boss; if (!bo) return;
  const cv = bossFrame(bo.k, bo.phase, bossPose(f)), x0 = f.x - BW * f.sc / 2 - f.sc, y0 = f.y - BH * f.sc - f.sc;
  bossBits(cv, x0, y0, 260, 260, 1.6);
}
// where the boss fights from once it has broken out: beside the box on wide screens, looming above it on tall ones
function bossOutPos(bo) {
  const side = bo.side || 1;
  // towers over the whole screen: taller than the viewport, head and arms cropped, feet below the bottom edge
  if (OX >= 110) { const sc = clamp(Math.round(VH * 1.12 / 64), 4, 14); return { x: side > 0 ? LW + BW * sc * .3 : -BW * sc * .3, y: VH - OY + sc * 4, sc, where: 'side' }; }
  if (OY >= 40) { const sc = clamp(Math.round(VW * 1.15 / 64), 4, 10); return { x: 160 + side * 30, y: clamp(64 * sc * .5 - OY, 20, 120), sc, where: 'top' }; } // looms over the top of the box
  return { x: BOSS_POS[0], y: BOSS_POS[1], sc: PSC, where: 'in' };
}
function bossMove(bo, dur) { const f = bo.f; bo.mv = { t: 0, dur, x0: f.x, y0: f.y, s0: f.sc, to: bossOutPos(bo), broke: false }; }
function updateBossMove(bo, dt) {
  const f = bo.f, m = bo.mv; if (!m) { if (bo.outside) { const o = bossOutPos(bo); f.x = o.x; f.y = o.y; f.sc = o.sc; } return; }
  m.t += dt; const k = clamp(m.t / m.dur, 0, 1), e = ease(k), to = m.to;
  f.x = m.x0 + (to.x - m.x0) * e; f.y = m.y0 + (to.y - m.y0) * e - Math.sin(k * Math.PI) * (RM ? 10 : 70);
  f.sc = k < .5 ? m.s0 : to.sc;
  if (k > .45 && !m.broke && !bo.outside && to.where !== 'in') { // crashing through the frame
    m.broke = true; bo.integ = Math.min(bo.integ, .3); borderShards(true); addCracks(10, B.t); quake(12); bossFlash('#ffffff', .3); SFX.shatter();
    const ex = to.where === 'side' ? (to.x > 160 ? LW : 0) : clamp(to.x, 10, LW - 10), ey = to.where === 'side' ? LH * .55 : 0;
    for (let i = 0; i < 40; i++) B.parts.push({ x: ex, y: ey + rnd(-30, 30), vx: rnd(-160, 160), vy: rnd(-160, 60), t: 0, life: rnd(.4, 1), col: i % 2 ? bo.D.crack : '#d8b04a', s: i % 3 ? 2 : 3, g: 180 });
  }
  if (k >= 1) { bo.mv = null; bo.outside = to.where !== 'in'; quake(8); SFX.land(); }
}
const expFor = (bo, ph) => bo.D.phases < 2 ? 70 : 26 + 98 * ph / (bo.D.phases - 1);
function updateBoss(dt) {
  const bo = B.boss; if (!bo) return;
  bo.t += dt; const t = bo.t, ev = bo.ev, f = bo.f;
  if (bo.flash) { bo.flash.t += dt; if (bo.flash.t > bo.flash.dur) bo.flash = null; }
  bo.warp = Math.max(0, bo.warp - dt * 1.1);
  bo.exp += (bo.expT - bo.exp) * Math.min(1, dt * (bo.st === 'outro' ? 3.2 : 2.2)); if (Math.abs(bo.expT - bo.exp) < .3) bo.exp = bo.expT;
  if (bo.st === 'intro') {
    bo.bcrack = clamp(t / .9, 0, 1); quake(1 + t * 3);
    if (t > .3 && !ev.c1) { ev.c1 = 1; SFX.crack(); } if (t > .6 && !ev.c2) { ev.c2 = 1; SFX.crack(); }
    if (t > .9 && !ev.sh) { ev.sh = 1; bo.integ = .3; borderShards(true); bossFlash('#ffffff', .4); quake(10); addCracks(14, B.t); SFX.shatter(); bo.expT = expFor(bo, 0); }
    if (t > .9) f.drop = Math.max(0, 1 - Math.pow((t - .9) / .75, 2));
    if (t > 1.65 && !ev.land) {
      ev.land = 1; f.drop = 0; quake(9); SFX.land(); banner(FOES[f.k].n, bo.D.crack, 1.4);
      for (let i = 0; i < 30; i++) B.parts.push({ x: f.x + rnd(-90, 90), y: f.y, vx: rnd(-110, 110), vy: rnd(-110, -20), t: 0, life: rnd(.3, .8), col: i % 3 ? pick(ACTPAL[B.act].dust) : bo.D.crack, s: i % 2 ? 2 : 4, g: 260 });
    }
    if (t > 2.3 && !ev.leap) { ev.leap = 1; bo.side = 1; bossMove(bo, RM ? .5 : 1.1); SFX.roar(); }
    if (ev.leap && !bo.mv && t > 2.6) { bo.st = 'fight'; B.state = 'fight'; }
  } else if (bo.st === 'phase') {
    if (!RM && t < .45 && Math.random() < .6) { const [cx, cy] = foeCenter(f); spark(cx + rnd(-60, 60), cy + rnd(-60, 60), bo.D.crack, 120); }
    if (t > .45 && !ev.morph) {
      ev.morph = 1; SFX.morph(); bossFlash('#ffffff', .25); bo.inv = !!BOSS[bo.k].pats[bo.phase].invert; quake(9);
      const x0 = f.x - BW * f.sc / 2 - f.sc, y0 = f.y - BH * f.sc - f.sc;
      if (bo.old) bossBits(bo.old, x0, y0, bo.tr === 'burst' ? 170 : 90, bo.tr === 'burst' ? 300 : 160, 1.2);
      bo.expT = expFor(bo, bo.phase); if (bo.outside) { bo.side = -(bo.side || 1); bossMove(bo, RM ? .4 : .8); }
      for (let i = 0; i < 26; i++) spark(...foeCenter(f), i % 2 ? bo.D.crack : '#ffffff', 260);
      if (bo.tr === 'reasm') bo.reasm = mkReasm(bossFrame(bo.k, bo.phase, bossPose(f)));
    }
    if (t > 1.3 && !bo.mv) { bo.st = 'fight'; f.inv = false; f.timer = f.per * .8; bo.old = null; bo.reasm = null; }
  } else if (bo.st === 'outro') {
    if (t > .5 && !ev.back) { ev.back = 1; borderShards(false); SFX.rumble(); }
    if (t > .5) bo.integ = .3 + .7 * clamp((t - .5) / .85, 0, 1);
    if (t > 1.4 && !ev.ref) { ev.ref = 1; bo.integ = 1; bossFlash('#ffffff', .3); SFX.reform(); }
    if (t > 1.9) bo.st = 'done';
  }
  updateBossMove(bo, dt); admBossPhase(bo);
  if (bo.st === 'fight' && !f.dead) {
    const pat = bossPat() || {};
    if (pat.drift && B.state === 'fight') { const nz = clamp(B.zBase + Math.sin(B.t * 1.6) * pat.drift, .12, .88); if (B.zc2 !== undefined) B.zc2 = clamp(B.zc2 + nz - B.zc, .08, .96); B.zc = nz; }
    if (pat.rev && B.state === 'fight') { B.revT = (B.revT || 1) - dt; if (B.revT <= 0) { B.md *= -1; B.revT = rnd(.7, 1.5); } }
    if (f.dbl > 0) { f.dbl -= dt; if (f.dbl <= 0) { f.dbl = 0; foeAttack(f, true); } }
    if (Math.random() < .6) { const [cx, cy] = foeCenter(f); B.parts.push({ x: cx + rnd(-70, 70), y: cy + rnd(-50, 110), vx: rnd(-8, 8), vy: rnd(-40, -15), t: 0, life: rnd(.4, .9), col: bo.phase ? bo.D.crack : '#3a3444', s: Math.random() < .3 ? 2 : 1, g: -10 }); }
  }
}
function mkReasm(cv) { // pixel list with scattered start positions: the new form flies together
  const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, px = [];
  const st = cv.R ? 2 : 1; for (let y = 0; y < cv.height; y += st) for (let x = 0; x < cv.width; x += st) { const i = (y * cv.width + x) * 4; if (d[i + 3] > 0) px.push([x, y, 'rgba(' + d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ',' + (d[i + 3] / 255).toFixed(2) + ')', rnd(-40, 40) * (cv.R || 1), rnd(-30, 30) * (cv.R || 1), rnd(0, .35)]); }
  return px;
}
// ---------- boss attacks: a unique move per boss and phase ----------
function bossAttackFx(f, targets, slam) {
  const bo = B.boss, ph = bo.phase, out = bo.outside, [bcx, bcy] = foeCenter(f), fx = out ? 250 : f.x - 70, gy = 246;
  const add = e => B.fx.push(Object.assign({ t: 0 }, e));
  if (out) { // an arm / tendril smashes in through the cracked frame, then the attack lands
    const ex = bcx > LW ? LW : bcx < 0 ? 0 : clamp(bcx, 20, LW - 20), ey = bcx > LW || bcx < 0 ? clamp(bcy, 60, 240) : 0;
    giantSwing(f, targets);
    if (bo.k === 'mirror') targets.forEach(u => add({ type: 'reach', x0: bcx, y0: bcy, ex, ey, x: u.x + 14, y: u.y - 22, dur: .42, col: bo.D.crack }));
    addCracks(2, B.t);
  }
  const tx = targets.map(u => [u.x, u.y]);
  SFX.whoosh();
  if (bo.k === 'gobchief') {
    add({ type: 'shock', x: fx, y: gy, dur: .45, col: ph ? '#ff7a1a' : '#8a7a5a', to: 20 });
    if (ph) tx.forEach(([x, y], i) => add({ type: 'rock', x0: out ? bcx : fx, y0: out ? bcy : 120, x, y: y - 10, dur: .16 + i * .03, col: '#ff7a1a' }));
  } else if (bo.k === 'treant') {
    if (ph === 0) add({ type: 'shock', x: fx, y: gy, dur: .45, col: '#62a038', to: 20 });
    else tx.forEach(([x, y]) => add({ type: 'roots', x, y, dur: .55, fire: ph >= 2 }));
    if (ph >= 2) tx.forEach(([x, y], i) => add({ type: 'rock', x0: x + 60, y0: -40, x, y: y - 10, dur: .16 + i * .03, col: '#ffb03a', meteor: 1 }));
  } else if (bo.k === 'darkknight') {
    add({ type: 'arc', x: 90, y: 200, dur: .32, col: ph >= 2 ? '#8a2ad0' : ph ? '#ff4a5a' : '#e4ecf6', r: 90 });
    if (ph >= 2) add({ type: 'wave', x: fx, y: gy, dur: .5, col: '#8a2ad0' });
  } else {
    tx.forEach(([x, y], i) => { for (let k = 0; k < (ph >= 3 ? 4 : 2); k++) add({ type: 'shard', x0: (out ? bcx : f.x - 40) + rnd(-20, 20), y0: (out ? bcy : 120) + rnd(-40, 40), x: x + rnd(-6, 6), y: y - 20 + rnd(-8, 8), dur: .16 + k * .02, col: ph ? '#e0b0ff' : '#86ccec' }); });
    if (ph >= 2) add({ type: 'arc', x: 90, y: 200, dur: .3, col: '#e8e0ff', r: 80, flip: 1 });
  }
}
function drawBossFx(e) {
  if (e.type === 'giant') return drawGiant(e);
  const p = clamp(e.t / e.dur, 0, 1);
  if (e.type === 'shock') { // ground shockwave rolling toward the party
    const x = e.x + (e.to - e.x) * Math.min(1, p * 2.4), a = p < .6 ? 1 : (1 - p) / .4;
    ctx.globalAlpha = a;
    for (let k = 0; k < 7; k++) { const xx = Math.round(x + k * 9), h = Math.max(2, 18 - k * 3 - Math.round(p * 6)); rect(xx, e.y - h, 6, h, k % 2 ? e.col : lighten(e.col, .35)); rect(xx, e.y - h, 6, 1, '#ffffff'); }
    ctx.globalAlpha = 1;
  } else if (e.type === 'rock') {
    const k = Math.min(1, p * 2.2), x = e.x0 + (e.x - e.x0) * k, y = e.y0 + (e.y - e.y0) * k - Math.sin(k * Math.PI) * (e.meteor ? 0 : 60);
    if (k < 1) { rect(x - 4, y - 4, 8, 8, '#3a2a1a'); rect(x - 4, y - 4, 4, 4, e.col); rect(x - 2, y - 2, 2, 2, '#fff3a8'); for (let i = 1; i < 4; i++) rect(x - (e.x - e.x0) / 30 * i * 3 - 2, y - (e.y - e.y0) / 30 * i * 3 - 2, 4 - i, 4 - i, e.col); }
    else { ctx.globalAlpha = 1 - p; frame(e.x - 10 - p * 10, e.y - 6, 20 + p * 20, 12, e.col); ctx.globalAlpha = 1; }
  } else if (e.type === 'roots') { // thorned roots burst from under the target
    const h = Math.round(Math.sin(Math.min(1, p * 1.6) * Math.PI) * 34);
    for (let k = -1; k <= 1; k++) { const hh = Math.max(0, h - Math.abs(k) * 10), x = e.x + k * 9; rect(x - 2, e.y - hh, 5, hh, '#36261a'); rect(x - 2, e.y - hh, 2, hh, '#5a4028'); rect(x, e.y - hh - 3, 1, 3, e.fire ? '#ff7a1a' : '#cfc6aa'); if (hh > 8) { rect(x + 3, e.y - hh + 6, 2, 1, '#cfc6aa'); rect(x - 4, e.y - hh + 12, 2, 1, '#cfc6aa'); } }
  } else if (e.type === 'arc') { // giant crescent slash across the party
    const N = 40, r = e.r, a0 = e.flip ? -.3 : -2.6;
    for (let k = 0; k <= N; k++) {
      const q = k / N; if (q > p * 1.8 || q < p * 1.8 - .6) continue;
      const an = a0 + q * 2.3 * (e.flip ? 1 : 1), x = e.x + Math.cos(an) * r, y = e.y + Math.sin(an) * r * .55;
      rect(x - 3, y - 3, 6, 6, k % 3 ? e.col : '#ffffff'); rect(x - 1, y + 3, 2, 2, darken(e.col, .3));
    }
  } else if (e.type === 'wave') { // black-flame wave
    const x = e.x + (10 - e.x) * Math.min(1, p * 1.6), a = p < .7 ? 1 : (1 - p) / .3;
    ctx.globalAlpha = a;
    for (let k = 0; k < 10; k++) { const h = 10 + ((k * 7 + Math.floor(B.t * 20)) % 5) * 4; rect(x + k * 5, e.y - h, 4, h, k % 2 ? e.col : '#3c0e52'); rect(x + k * 5 + 1, e.y - h, 2, 2, '#e6a8ff'); }
    ctx.globalAlpha = 1;
  } else if (e.type === 'reach') { // segmented arm from the boss outside, through the frame breach, to the target
    const k = p < .45 ? ease(p / .45) : p < .7 ? 1 : 1 - ease((p - .7) / .3), pts = [[e.x0, e.y0], [e.ex, e.ey], [e.x, e.y]];
    const L1 = Math.hypot(e.ex - e.x0, e.ey - e.y0), L2 = Math.hypot(e.x - e.ex, e.y - e.ey), reach = (L1 + L2) * k;
    for (let d = 0; d < reach; d += 3) {
      const [a, b, q] = d < L1 ? [pts[0], pts[1], d / L1] : [pts[1], pts[2], (d - L1) / L2];
      const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q, w = d < L1 ? 7 : 5;
      rect(x - w / 2, y - w / 2, w, w, '#1a1420'); rect(x - w / 2 + 1, y - w / 2 + 1, w - 3, w - 3, (d / 3) % 4 < 2 ? e.col : darken(e.col, .35));
    }
    if (k > .1) { rect(e.ex - 5, e.ey - 5, 10, 10, '#ffffff'); ctx.globalAlpha = .5; rect(e.ex - 9, e.ey - 9, 18, 18, e.col); ctx.globalAlpha = 1; }
    if (p > .4 && p < .6) { rect(e.x - 8, e.y - 1, 16, 2, '#ffffff'); rect(e.x - 1, e.y - 8, 2, 16, '#ffffff'); }
  } else if (e.type === 'shard') {
    const k = Math.min(1, p * 2.4), x = e.x0 + (e.x - e.x0) * k, y = e.y0 + (e.y - e.y0) * k;
    if (k < 1) { rect(x - 3, y - 1, 6, 2, e.col); rect(x - 1, y - 3, 2, 6, e.col); rect(x - 1, y - 1, 2, 2, '#ffffff'); rect(x + 4, y, 6, 1, darken(e.col, .3)); }
    else if (p < .7) { ctx.globalAlpha = 1 - p; rect(e.x - 1, e.y - 6, 2, 12, '#ffffff'); rect(e.x - 6, e.y - 1, 12, 2, '#ffffff'); ctx.globalAlpha = 1; }
  }
}
// draw the boss body: transforms, flicker, reassembly, orbiting shards, glitch rows
function drawBossBody(f, x, y) {
  const bo = B.boss, pose = bossPose(f), S0 = f.sc || PSC, lk = bo.outside && !RM ? (pose.at > 0 ? 1 - Math.abs(pose.at - 3) / 3 : pose.wu / 8) : 0, SC = S0 * (1 + .07 * lk);
  x -= (SC - S0) * BW / 2 + (bo.outside ? (x > 160 ? -1 : 1) * lk * 10 : 0); y -= (SC - S0) * BH;
  let cv = bossFrame(bo.k, bo.phase, pose); f._cv = cv;
  const sc = SC / (cv.R || 1), X = x - 2 * sc, Y = y - 2 * sc; // sc: screen pixels per fine pixel
  const W = cv.width * sc, H = cv.height * sc, flash = f.flash > 0;
  // aura behind (rage / spirit) from phase 1 on
  if (bo.phase > 0 && !RM) { ctx.globalAlpha = .18 + .08 * Math.sin(B.t * 5); const t2 = tinted(cv, bo.D.crack); for (const [a, b] of [[-SC, 0], [SC, 0], [0, -SC], [0, SC]]) ctx.drawImage(t2, X + a, Y + b, W, H); ctx.globalAlpha = 1; }
  if (bo.k === 'mirror' && bo.phase >= 2) drawShardOrbit(f, x, y, true);
  if (bo.st === 'phase') {
    const t = bo.t;
    if (t < .45 && bo.old) { // old form trembles and flickers white
      const j = RM ? 0 : Math.round(rnd(-1, 1)) * SC; ctx.drawImage(Math.floor(t * 20) % 2 ? tinted(bo.old, '#ffffff') : bo.old, X + j, Y, W, H); return;
    }
    const rv = clamp((t - .45) / .75, 0, 1);
    if (bo.tr === 'wipe' && bo.old && rv < 1) { // fire climbs the body from the ground up
      const cut = Math.round(cv.height * (1 - rv));
      ctx.drawImage(bo.old, 0, 0, cv.width, cut, X, Y, W, cut * sc);
      ctx.drawImage(cv, 0, cut, cv.width, cv.height - cut, X, Y + cut * sc, W, (cv.height - cut) * sc);
      for (let i = 0; i < 40; i++) rect(X + Math.floor(rnd(cv.width)) * sc, Y + (cut - 1 - Math.floor(rnd(6))) * sc, Math.max(1, sc), Math.max(1, sc), pick(['#ff7a1a', '#ffb03a', '#fff3a8']));
      return;
    }
    if (bo.tr === 'reasm' && bo.reasm && rv < 1) {
      for (const [px, py, col, dx, dy, dl] of bo.reasm) { const k = ease(clamp((rv - dl) / (1 - dl), 0, 1)); ctx.fillStyle = col; ctx.fillRect(X + Math.round(px + dx * (1 - k)) * sc, Y + Math.round(py + dy * (1 - k)) * sc, sc * 2, sc * 2); }
      return;
    }
    if (bo.tr === 'burst' && rv < .3) cv = tinted(cv, '#ffffff', 1 - rv / .3);
  }
  if (flash) cv = tinted(cv, '#ffffff');
  else if (f.inv && Math.floor(B.t * 16) % 2) cv = tinted(cv, '#ffffff', .5);
  if (bo.k === 'mirror' && bo.phase >= 3 && !RM) { // glitch: horizontal slices slip sideways
    const sl = 6 * (cv.R || 1);
    for (let r = 0; r < cv.height; r += sl) { const off = (Math.floor(B.t * 9 + r) % 7 === 0) ? Math.round(rnd(-3, 3)) * SC : 0; ctx.drawImage(cv, 0, r, cv.width, Math.min(sl, cv.height - r), X + off, Y + r * sc, W, Math.min(sl, cv.height - r) * sc); }
  } else ctx.drawImage(cv, X, Y, W, H);
  if (f.wind > 0 && Math.floor(B.t * 14) % 2) { ctx.globalAlpha = .35; ctx.drawImage(tinted(cv, '#ff3a3a'), X, Y, W, H); ctx.globalAlpha = 1; }
  if (bo.k === 'mirror' && bo.phase >= 2) drawShardOrbit(f, x, y, false);
}
function drawShardOrbit(f, x, y, back) {
  const bo = B.boss, n = bo.phase >= 3 ? 9 : 6, cx = f.x, cy = y + BH * PSC * .45;
  for (let i = 0; i < n; i++) {
    const an = B.t * (RM ? .3 : 1.4) + i * Math.PI * 2 / n, z = Math.sin(an); if ((z < 0) !== back) continue;
    const sx = Math.round((cx + Math.cos(an) * 120) / PSC) * PSC, sy = Math.round((cy + z * 26 - 40) / PSC) * PSC;
    rect(sx, sy - PSC * 2, PSC, PSC * 4, '#86ccec'); rect(sx - PSC, sy - PSC, PSC, PSC * 2, '#3674a0'); rect(sx, sy - PSC * 2, PSC, PSC, '#f0ffff');
  }
}
// ---------- the torn-open arena: each act's world shows through, wider every phase ----------
const ENV_E = 150, envCache = {};
function jagSeed(k) { let s = k.length * 977 + 13; const R = () => (s = (s * 16807) % 2147483647) / 2147483647, a = []; for (let i = 0; i < 400; i++) a.push(R()); return a; }
function envCanvas(act) {
  if (envCache[act]) return envCache[act];
  const E = ENV_E, W = LW + E * 2, H = AH + E * 2, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); let sd = 91 + act * 131; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x + E), Math.round(y + E), Math.round(w), Math.round(h)); };
  const sky = (top, mid, hz) => { for (let y = -E; y < 70; y += 2) { const k = (y + E) / (70 + E); r(-E, y, W, 2, k < .6 ? top : k < .85 ? (((y >> 1) & 1) ? top : mid) : mid); } r(-E, 62, W, 8, hz); };
  const dither = (y0, y1, c0, c1, dens) => { for (let y = y0; y < y1; y++) for (let x = -E; x < LW + E; x++) if (((x * 7 + y * 13) % dens) === 0) r(x, y, 1, 1, ((x + y) & 1) ? c0 : c1); };
  const hills = (col, y0, amp, f, ph) => { for (let x = -E; x < LW + E; x += 2) { const h = Math.round(amp * (Math.sin(x * f + ph) * .6 + Math.sin(x * f * 2.3 + ph * 2) * .4)); r(x, y0 - h, 2, h + 12, col); } };
  if (act === 0) { // goblin war camp
    sky('#0c0810', '#1c0e10', '#2a1410');
    for (let i = 0; i < 40; i++) r(R() * W - E, -E + R() * (E + 30), 1, 1, R() < .3 ? '#8a7a6a' : '#4a3a3a');
    hills('#140c0e', 58, 10, .02, 1); r(-E, 66, W, H, '#1a120c'); dither(66, AH + E, '#22180e', '#140e08', 5);
    for (let x = -E; x < LW + E; x += 7) { if (x > -10 && x < LW + 10) continue; const h = 30 + Math.floor(R() * 8); r(x, 66 - h, 6, h, '#3a2416'); r(x, 66 - h, 2, h, '#5a3a20'); r(x + 1, 66 - h - 3, 4, 3, '#3a2416'); r(x + 2, 66 - h - 5, 2, 2, '#2a180e'); r(x, 66 - h + 10, 6, 2, '#1a0e08'); }
    for (const [tx, ty, col] of [[-118, 150, '#7a1a26'], [-70, 250, '#583216'], [352, 140, '#583216'], [400, 260, '#7a1a26'], [-100, 380, '#583216'], [380, 400, '#7a1a26']]) {
      for (let k = 0; k < 26; k++) { const w = Math.round(k * 1.6); r(tx - w, ty - 26 + k, w * 2 + 1, 1, k % 6 < 3 ? col : darken(col, .35)); }
      r(tx - 4, ty - 10, 9, 10, '#0a0606'); r(tx, ty - 30, 1, 4, '#5a3a20');
    }
    for (const [x, y] of [[-40, 120], [360, 210], [-130, 300], [340, 360]]) { r(x, y - 30, 2, 30, '#8a8270'); r(x - 3, y - 36, 8, 7, '#cfc6aa'); r(x - 1, y - 33, 2, 2, '#0a0606'); r(x + 2, y - 33, 2, 2, '#0a0606'); }
    for (const [x, y] of [[-60, 330], [380, 300]]) { r(x - 8, y, 16, 3, '#3a2416'); r(x - 6, y - 2, 4, 3, '#5a3a20'); r(x + 2, y - 2, 4, 3, '#5a3a20'); }
  } else if (act === 1) { // dark forest
    sky('#040806', '#08120c', '#0e1a12');
    for (let i = 0; i < 26; i++) { const x = -E + R() * W, w = 6 + R() * 10; r(x, -E, w, 70 + E, '#0a140e'); r(x, -E, 2, 70 + E, '#0e1c12'); }
    r(-E, 66, W, H, '#0e140c'); dither(66, AH + E, '#16200e', '#0a0e08', 4);
    for (let i = 0; i < 18; i++) { const x = -E + R() * W; if (x > -20 && x < LW + 6) continue; const w = 14 + R() * 12; r(x, -E, w, 76 + E + R() * 40, '#1a120a'); r(x, -E, 3, 76 + E, '#36261a'); r(x + w - 3, -E, 3, 76 + E, '#100a06'); for (let y = -E; y < 100; y += 9) r(x + 4 + (y % 3), y, 1, 5, '#100a06'); r(x - 8, 100 + R() * 40, w + 16, 6, '#1a120a'); }
    for (let i = 0; i < 22; i++) { let x = -E + R() * W, y = 70 + R() * (AH + E - 70); if (x > -6 && x < LW + 6 && y < AH + 4) continue; for (let k = 0; k < 20; k++) { r(x, y, 4, 3, '#2e2014'); r(x, y, 4, 1, '#4a3420'); x += 3; y += Math.sin(k * .6 + i) * 1.6; } }
    for (let i = 0; i < 26; i++) { const x = -E + R() * W, y = 80 + R() * (AH + E - 90); if (x > -6 && x < LW + 6 && y < AH + 4) continue; const col = R() < .5 ? '#3ad6b0' : '#9cff6a'; r(x, y - 3, 1, 3, '#cfc6aa'); r(x - 2, y - 5, 5, 2, col); r(x - 1, y - 6, 3, 1, lighten(col, .5)); }
  } else if (act === 2) { // ruined castle
    sky('#080a14', '#10121e', '#1a1c2c');
    for (let i = 0; i < 50; i++) r(R() * W - E, -E + R() * (E + 40), 1, 1, R() < .3 ? '#c8ccff' : '#5a5c80');
    g.fillStyle = '#d8dcf0'; for (let y = -26; y <= 26; y++) { const w = Math.round(Math.sqrt(26 * 26 - y * y)); g.fillRect(-90 - w + E, -100 + y + E, w * 2, 1); }
    r(-100, -110, 7, 5, '#b0b4d0'); r(-80, -94, 9, 6, '#b0b4d0'); r(-96, -88, 4, 3, '#b0b4d0');
    for (let x = -E; x < LW + E; x += 16) { if (x > -14 && x < LW) continue; const h = 46 + ((x * 31) % 13); for (let y = 66 - h; y < 66; y += 6) { r(x, y, 16, 6, '#2a2a3a'); r(x + ((y / 6) & 1 ? 8 : 0), y, 1, 6, '#16161e'); r(x, y, 16, 1, '#3a3a4e'); } r(x + 2, 66 - h - 6, 5, 6, '#2a2a3a'); r(x + 10, 66 - h - 6, 5, 6, '#2a2a3a'); }
    for (const tx of [-128, 366]) { for (let y = -E; y < 66; y += 6) { r(tx, y, 28, 6, '#262636'); r(tx, y, 28, 1, '#34344a'); r(tx + ((y / 6) & 1 ? 14 : 4), y, 1, 6, '#14141c'); } r(tx + 10, -40, 8, 12, '#ffb04a'); r(tx + 10, -40, 8, 3, '#ffe070'); r(tx + 10, 10, 8, 12, '#ffb04a'); }
    r(-E, 66, W, H, '#10101a'); for (let y = 70; y < AH + E; y += 12) { r(-E, y, W, 1, '#1a1a28'); for (let x = -E + ((y / 12) & 1) * 10; x < LW + E; x += 20) r(x, y, 1, 12, '#1a1a28'); }
    for (const [x, y] of [[-70, 200], [-120, 330], [360, 220], [410, 360], [-40, 400], [330, 420]]) { r(x, y - 40, 14, 40, '#2a2a3a'); r(x, y - 40, 3, 40, '#3a3a4e'); r(x - 3, y - 44, 20, 5, '#34344a'); r(x + 8, y - 48, 7, 4, '#2a2a3a'); r(x - 8, y - 4, 10, 4, '#22222e'); }
  } else { // shattered mirror dimension
    for (let y = -E; y < AH + E; y++) r(-E, y, W, 1, y < 70 ? '#06030c' : '#0a0612');
    for (let i = 0; i < 90; i++) r(R() * W - E, R() * H - E, 1, 1, R() < .3 ? '#e0b0ff' : '#4a3a6a');
    for (let y = 72; y < AH + E; y += 10) for (let x = -E + ((y / 10) & 1) * 10; x < LW + E; x += 20) { r(x, y, 10, 10, '#140c22'); r(x, y, 10, 1, '#22163a'); }
    for (let i = 0; i < 26; i++) { const x = -E + R() * W, y = -E + R() * H; if (x > -10 && x < LW + 10 && y > -10 && y < AH + 10) continue; const w = 6 + R() * 18, h = 10 + R() * 26; for (let k = 0; k < h; k++) { const ww = Math.round(w * (1 - k / h)); r(x + (w - ww) / 2, y + k, ww, 1, k < 2 ? '#f0ffff' : ((k >> 1) & 1) ? '#3674a0' : '#18385a'); } r(x + w / 2, y, 1, h * .6, '#86ccec'); }
    for (const [x, y, w, h] of [[-120, -100, 40, 56], [350, -80, 34, 48], [-110, 260, 30, 44], [370, 300, 44, 60]]) { g.strokeStyle = '#d8b04a'; r(x, y, w, 2, '#d8b04a'); r(x, y + h - 2, w, 2, '#9a7428'); r(x, y, 2, h, '#d8b04a'); r(x + w - 2, y, 2, h, '#9a7428'); r(x + 4, y + 4, w - 8, h - 8, '#0c1424'); r(x + 6, y + 6, 2, h - 14, '#3674a0'); }
  }
  return (envCache[act] = c);
}
// jagged, axis-aligned outline of the torn opening (crisp at any integer scale)
function tearPath(m) {
  const bo = B.boss, J = bo.jag, amp = Math.min(7, m * .3), L = -Math.round(m), Rr = LW + Math.round(m), T = -Math.round(m * .8), Bt = AH + Math.round(m * .45), S = 8, pts = [], rims = [];
  let i = 0; const j = () => Math.round((J[(i++) % J.length] - .5) * 2 * amp);
  for (let x = L; x < Rr; x += S) { const y = T + j(); pts.push([x, y], [Math.min(Rr, x + S), y]); rims.push([x, y, S, 1]); }
  for (let y = T; y < Bt; y += S) { const x = Rr + j(); pts.push([x, y], [x, Math.min(Bt, y + S)]); rims.push([x - 1, y, 1, S]); }
  for (let x = Rr; x > L; x -= S) { const y = Bt + j(); pts.push([x, y], [Math.max(L, x - S), y]); rims.push([x - S, y - 1, S, 1]); }
  for (let y = Bt; y > T; y -= S) { const x = L + j(); pts.push([x, y], [x, Math.max(T, y - S)]); rims.push([x, y - S, 1, S]); }
  return { pts, rims };
}
function drawBossEnv() {
  const bo = B.boss; if (!bo || bo.exp < .5) return;
  const m = bo.exp, { pts, rims } = tearPath(m), env = envCanvas(B.act), E = ENV_E;
  ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip();
  ctx.drawImage(env, -E, -E);
  drawEnvAnim(B.act, bo.phase);
  if (bo.inv) { ctx.globalAlpha = .1; rect(-E, -E, LW + 2 * E, AH + 2 * E, bo.D.crack); ctx.globalAlpha = 1; }
  ctx.restore();
  // dim the original square so the fight stays readable
  ctx.globalAlpha = .5; rect(0, 0, LW, AH, '#000'); ctx.globalAlpha = 1;
  const pulse = RM ? .8 : .6 + .3 * Math.sin(B.t * 5);
  ctx.globalAlpha = pulse; ctx.fillStyle = bo.D.crack; for (const [x, y, w, h] of rims) ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = pulse * .35; for (const [x, y, w, h] of rims) ctx.fillRect(x - (h > 1 ? 1 : 0), y - (w > 1 ? 1 : 0), w + (h > 1 ? 2 : 0), h + (w > 1 ? 2 : 0));
  ctx.globalAlpha = 1;
}
function drawEnvAnim(act, ph) {
  const t = RM ? 0 : B.t, fl = Math.floor(t * 10);
  const flame = (x, y, s) => { const h = 4 + ((fl + x) % 3); rect(x - s, y - h, s * 2, h, '#f0601a'); rect(x - s + 1, y - h + 1, s * 2 - 2, h - 1, '#ffb03a'); rect(x - 1, y - h - 1 - (fl % 2), 2, 2, '#fff3a8'); ctx.globalAlpha = .12; rect(x - 10, y - 14, 20, 18, '#ffb03a'); ctx.globalAlpha = 1; };
  if (act === 0) {
    for (const [x, y] of [[-30, 36], [-90, 36], [350, 36], [420, 36], [-140, 200], [-20, 330], [345, 330], [-60, 330], [380, 300]]) { if (y === 36) rect(x, y, 2, 30, '#3a2416'); flame(x + 1, y, 2); }
    if (ph >= 1) for (let i = 0; i < 10; i++) { const k = (t * .3 + i * .1) % 1; rect(-80 + i * 50 + Math.sin(t + i) * 6, 300 - k * 360, 1, 1, '#ff7a1a'); }
  } else if (act === 1) {
    for (let i = 0; i < 16; i++) { const x = -120 + ((i * 53) % 560), y = 60 + ((i * 97) % 300) + Math.sin(t * 1.3 + i) * 8, on = Math.sin(t * 3 + i * 1.7) > -.2; if (on) { rect(x + Math.sin(t * .7 + i) * 10, y, 1, 1, '#d8ff7a'); ctx.globalAlpha = .25; rect(x + Math.sin(t * .7 + i) * 10 - 1, y - 1, 3, 3, '#d8ff7a'); ctx.globalAlpha = 1; } }
    if (ph >= 2) { for (const [x, y] of [[-130, 60], [-60, 40], [350, 50], [420, 70], [-100, 250], [380, 230]]) flame(x, y, 3); for (let i = 0; i < 14; i++) { const k = (t * .4 + i * .07) % 1; rect(-140 + i * 45, 380 - k * 480, 1, 1, i % 2 ? '#ff7a1a' : '#ffd060'); } ctx.globalAlpha = .08; rect(-ENV_E, -ENV_E, LW + 2 * ENV_E, AH + 2 * ENV_E, '#ff6a1a'); ctx.globalAlpha = 1; }
  } else if (act === 2) {
    for (const [x, y] of [[-92, -60], [-40, -24], [352, -60], [400, -30], [-140, 120], [360, 120]]) for (let r = 0; r < 26; r++) { const off = Math.round(Math.sin(t * 2.6 + r * .35 + x) * (r / 10)); rect(x + off, y + r, 12, 1, r > 22 ? '#c8323e' : r % 7 === 3 ? '#d8b04a' : ph >= 2 ? '#46226c' : '#7a1a26'); }
    if (ph >= 1 && Math.floor(t * 1.3) % 5 === 0 && (fl % 3) === 0) { ctx.globalAlpha = .18; rect(-ENV_E, -ENV_E, LW + 2 * ENV_E, AH + 2 * ENV_E, ph >= 2 ? '#d07aff' : '#c8ccff'); ctx.globalAlpha = 1; }
  } else {
    for (let i = 0; i < 18; i++) { const an = t * .25 + i, x = -120 + ((i * 71) % 560) + Math.cos(an) * 14, y = -110 + ((i * 113) % 540) + Math.sin(an * 1.3) * 10, s = 2 + (i % 3); rect(x, y, s, s * 2, i % 4 ? '#3674a0' : '#86ccec'); rect(x, y, 1, 1, '#f0ffff'); }
    if (ph >= 2) { ctx.globalAlpha = .06 + .04 * Math.sin(t * 3); rect(-ENV_E, -ENV_E, LW + 2 * ENV_E, AH + 2 * ENV_E, ph >= 3 ? '#d07aff' : '#86ccec'); ctx.globalAlpha = 1; }
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
