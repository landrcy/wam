// ---- boss sub-form detail painted at fine resolution on top of the base art (HD only) ----
// every helper here uses design coordinates; P.R fine pixels per design pixel
function bdOn(P, x, y) { return P.at(Math.floor(x * P.R), Math.floor(y * P.R)); }
function bdScatter(P, n, seed, x0, y0, x1, y1, mat, fn) { for (let i = 0; i < n; i++) { const x = x0 + hh(i, seed, 1) * (x1 - x0), y = y0 + hh(i, seed, 2) * (y1 - y0); const m = bdOn(P, x, y); if (m && (!mat || mat.includes(m))) fn(x, y, i); } }
BDETAIL.gobchief = (P, ph, a) => {
  const b = a.br, R = ph >= 1;
  // muscle and belly definition, veins, warts
  P.fline(26, 33 - b, 31, 35 - b, 'skin', .3); P.fline(33, 35 - b, 38, 33 - b, 'skin', .3); P.fline(32, 36 - b, 32, 46 - b, 'skin', .6);
  for (let i = 0; i < 3; i++) P.fline(27 + i * 2.5, 40 - b + i, 29 + i * 2.5, 41 - b + i, 'skin', .5);
  bdScatter(P, 60, 3, 14, 4, 52, 58, ['skin'], (x, y, i) => i % 3 ? P.dot(x, y, 'skin', 3.6) : (P.dot(x, y, 'skin', .4), P.dot(x + .25, y, 'skin', .4)));
  for (const [x0, y0, x1, y1] of [[50, 33, 52, 40], [20, 30, 22, 36], [42, 48, 41, 54]]) P.fline(x0, y0 - b, x1, y1 - b, 'skin', 3.4);
  // fur mantle of tufts and a trophy-skull necklace
  for (let i = 0; i < 18; i++) { const x = 16 + i * 1.9, y = 22.5 - b + Math.sin(i * 1.7) * .8; P.line(x, y - 1.6, x + (i % 2 ? .8 : -.8), y + 1.8, .7, 'leather', .2); }
  for (let i = 0; i < 5; i++) { const x = 22.5 + i * 4.8, y = 27.5 - b + Math.abs(i - 2) * -.6; P.ell(x, y, 1.5, 1.6, 'bone'); P.ell(x - .5, y - .2, .35, .4, 'black'); P.ell(x + .5, y - .2, .35, .4, 'black'); P.fline(x - .6, y + .9, x + .6, y + .9, 'black', 0); }
  P.fline(20, 26.5 - b, 44, 26.5 - b, 'leather', 1);
  // belt: pouches, a goblet trophy, studs
  for (const x of [21, 41]) { P.box(x, 42 - b, 3.6, 4, 'leather'); P.fline(x + .3, 43 - b, x + 3.3, 43 - b, 'leather', 3.4); P.dot(x + 1.8, 44 - b, 'gold', 3.5); }
  for (let x = 19; x < 46; x += 2.2) P.dot(x, 42 - b, 'steel', 3.6);
  // face: brow wrinkles, nose holes, ear rings, tusk cracks
  const hy = 13 - b; for (let i = 0; i < 3; i++) P.fline(26, hy - 4 + i * .9, 38, hy - 4 + i * .9 + (i - 1) * .2, 'skin', 1);
  P.dot(31, hy + 2.6, 'black', 0); P.dot(33, hy + 2.6, 'black', 0); for (const [x, y] of [[12.5, hy - 1.5], [52.5, hy - 2]]) { P.ell(x, y + 1.6, 1, 1, 'gold'); P.dot(x, y + 1.6, 'black', 0); }
  P.fline(26.4, hy + 6, 26.8, hy + 3.4, 'bone', 1); P.fline(37.6, hy + 6, 37.9, hy + 3.4, 'bone', 1);
  if (!R) { bdScatter(P, 40, 7, 18, 18, 47, 41, ['iron'], (x, y) => P.dot(x, y, 'iron', 3.8)); P.fline(20, 30 - b, 44, 30 - b, 'iron', .6); P.fline(21, 34 - b, 43, 34 - b, 'iron', .6); }
  else { bdScatter(P, 22, 9, 18, 18, 46, 44, ['skin'], (x, y, i) => P.fline(x, y, x + 1.6, y + 1.2 * (i % 2 ? 1 : -1), 'red', 2.6)); P.ell(32, hy - 1, 1, .8, 'eyeR'); }
};
BDETAIL.treant = (P, ph, a) => {
  const b = a.br, burn = ph >= 2;
  // bark plates and knots, then fused bark faces like souls caught in the wood
  bdScatter(P, 120, 11, 13, 22, 51, 58, ['bark'], (x, y, i) => i % 2 ? P.fline(x, y, x + .2, y + 2.2, 'bark', 0) : P.dot(x, y, 'bark', 3.6));
  const faces = [[21, 47, 2.2], [43, 44, 2], [29, 53, 1.7], [38, 51, 1.6], [16.5, 38, 1.5], [47, 34, 1.5]];
  for (const [x, y, r] of faces) if (bdOn(P, x, y - b)) P.face(x, y - b, r, 'bark', burn ? 'ember' : ph ? 'eyeG' : 'black', .8);
  // mushrooms + hanging moss and vines
  if (!burn) { for (const [x, y, s] of [[15, 52, 1], [17, 54, .8], [47, 50, 1.1], [49, 53, .7], [24, 24, .7]]) { P.line(x, y - b, x, y + 1.6 * s - b, .35 * s, 'bone', .35 * s); P.ell(x, y - b, 1.6 * s, .9 * s, ph ? 'eyeG' : 'red'); P.dot(x - .5 * s, y - .3 - b, 'white', 3); }
    for (let i = 0; i < 9; i++) { const x = 17 + i * 3.6, L = 3 + (i * 7 % 5); for (let j = 0; j < L * 3; j++) P.dot(x + Math.sin(j * .6 + i) * .35, 25 - b + j / 3, 'moss', 2 + (j % 3 ? 0 : 1.4)); } }
  for (let i = 0; i < 3; i++) { let px = 14 + i * 13, py = 56; for (let j = 0; j < 9; j++) { const nx = px + Math.sin(j * .9 + i) * 1.8, ny = py - 3.4; P.line(px, py - b * (j / 9), nx, ny - b * (j / 9), .45, burn ? 'ember' : 'leaf', .4); px = nx; py = ny; } }
  if (ph === 0) bdScatter(P, 160, 13, 8, -6, 56, 24, ['leaf'], (x, y, i) => { P.line(x, y, x + .8, y + .7, .55, i % 4 ? 'leaf' : 'moss', .2); });
  if (burn) { bdScatter(P, 70, 17, 12, 20, 52, 58, ['bark'], (x, y) => P.dot(x, y, 'ember', 3)); for (let i = 0; i < 6; i++) P.glowc(18 + i * 5.6, 31 + (i % 2) * 13 - b, .9, 'fire'); }
  // the heart: a glowing sap core behind the mouth
  P.glowc(32, 44 - b, 1.3, burn ? 'fire' : ph ? 'eyeG' : 'eyeY');
};
BDETAIL.darkknight = (P, ph, a) => {
  const b = a.br, cr = ph >= 1, W = ph >= 2;
  // plate seams, rivets and gold filigree
  for (const y of [24, 29, 34]) P.fline(21, y - b, 43, y - b, 'iron', .4);
  bdScatter(P, 46, 21, 16, 2, 50, 62, ['iron'], (x, y) => { P.dot(x, y, 'steel', 4); P.dot(x + .25, y + .25, 'iron', 0); });
  for (let i = 0; i < 9; i++) { const t = i / 8, x = 22 + t * 20, y = 21 - b + Math.sin(t * Math.PI) * 2.6; P.dot(x, y, 'gold', 3.4); P.dot(x, y + .25, 'gold', 1.8); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) P.dot(32 + s * (2 + i * .9), 37 - b - i * .55, 'gold', 3);
  // chainmail between plates
  for (let y = 40; y < 45; y += .5) for (let x = 20; x < 44; x += .5) if (((x * 2 + y * 2) | 0) % 2 === 0 && bdOn(P, x, y - b) === 'iron') P.dot(x, y - b, 'dark', 2.4);
  // visor slits glow, helm engraving, pauldron spikes
  P.fline(25.5, 10.25 - b, 38.5, 10.25 - b, W ? 'dflame' : 'eyeR', 2.5); for (let x = 26; x < 39; x += 2) P.fline(x, 12 - b, x, 15 - b, 'black', 0);
  P.fline(32, 1 - b, 32, 7 - b, 'steel', 3.6); for (const [x, y, an] of [[13, 17, -2.2], [16, 15, -1.8], [44, 15, -1.3], [49, 16, -.9]]) P.spike(x, y - b, an, cr ? 4.5 : 3, .9, W ? 'dark' : 'steel');
  // sword runes
  const sa = swing(a, 1.95, -2.0, 2.9), [hx, hy] = pol(18, 22 - b, sa, 12), wa = swing(a, 1.75, -.45, 2.35);
  for (let k = 0; k < 6; k++) { const [x, y] = pol(hx, hy, wa, 9 + k * 3.6); P.glowc(x, y, .32, W ? 'void' : cr ? 'eyeR' : 'glass'); }
  // tattered cape holes and skulls on the belt
  if (!W) bdScatter(P, 14, 23, 14, 30, 50, 60, ['cloth'], (x, y) => P.ell(x, y, .7, .5, 'black', { flat: 0 }));
  for (const x of [23, 41]) { P.ell(x, 39.6 - b, 1.2, 1.2, 'bone'); P.dot(x - .4, 39.4 - b, 'black', 0); P.dot(x + .4, 39.4 - b, 'black', 0); }
  if (cr) bdScatter(P, 30, 27, 18, 18, 46, 46, ['iron'], (x, y, i) => P.fline(x, y, x + (i % 2 ? 1.4 : -1.4), y + 1.1, W ? 'dflame' : 'eyeR', 2.4));
  P.glowc(32, 27 - b, W ? 2.2 : 1.4, W ? 'dflame' : 'eyeR');
};
BDETAIL.mirror = (P, ph, a) => {
  const b = a.br;
  if (ph <= 1) { // carved frame: faces, gems, filigree; the glass carries reflections
    for (let i = 0; i < 10; i++) { const y = 16 + i * 4; P.face(13, y, 1.1, 'gold', 'black', .6); P.face(51, y + 2, 1.1, 'gold', 'black', .6); }
    for (let i = 0; i < 11; i++) { const an = Math.PI + i / 10 * Math.PI, [x, y] = pol(32, 13, an, 19.5); P.glowc(x, y, .45, i % 2 ? 'purple' : 'void'); }
    bdScatter(P, 30, 31, 15, 6, 49, 55, ['glass'], (x, y, i) => P.fline(x, y, x + 2.4, y - 2.4, 'shine', i % 3 ? 1.6 : 3));
    P.glowc(32, 2, 1.5, ph ? 'void' : 'eyeR');
    return;
  }
  const D = ph >= 3;
  // the reflection grows a fused crown of faces and crystal: bone spikes, many eyes, a burning core eye
  for (let i = 0; i < 7; i++) { const an = -Math.PI / 2 + (i - 3) * .32, [x, y] = pol(32, 14, an, 6); P.spike(x, y, an, D ? 9 : 6, 1.1, i % 2 ? 'glass' : 'bone'); }
  for (const [x, y, r] of [[25, 28, 2], [39, 26, 1.8], [22, 38, 1.6], [42, 37, 1.6], [32, 45, 1.4]]) P.face(x, y, r, 'black', D ? 'void' : 'eyeR', 1);
  bdScatter(P, 50, 37, 16, 14, 48, 62, ['black'], (x, y, i) => i % 4 ? P.dot(x, y, 'dark', 3) : P.glowc(x, y, .35, D ? 'void' : 'eyeR'));
  P.ell(32, 33, 4.2, 4.2, 'iron'); P.ell(32, 33, 3.2, 3.2, 'black'); P.glowc(32, 33, 2.6, 'eyeO'); for (let i = 0; i < 6; i++) { const [x, y] = pol(32, 33, i / 6 * Math.PI * 2, 2.2); P.dot(x, y, 'ember', 1); }
  bdScatter(P, 40, 41, 0, 0, 64, 64, ['glass'], (x, y, i) => { P.dot(x, y, 'shine', 3); if (i % 5 === 0) P.glowc(x, y, .5, 'cyan'); });
};
