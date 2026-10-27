// ================= HD painter for bosses =================
// Same shape calls as Pix, but rasterised R times finer (1 fine pixel = 1 screen pixel in the box),
// baked with 6-step hue-shifted ramps, ordered dither, per-material texture, thick rim light and glow halos.
const RAMP6 = {};
function ramp6(m) {
  if (RAMP6[m]) return RAMP6[m]; const r = RAMP[m];
  return (RAMP6[m] = [hexMix(r[0], '#120a22', .25), hexMix(r[0], r[1], .5), r[1], hexMix(r[1], r[2], .55), r[2], hexMix(r[3], '#fff4dc', .12), r[3]]);
}
const hh = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vn(x, y, s = 0) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hh(xi, yi, s), b = hh(xi + 1, yi, s), c = hh(xi, yi + 1, s), d = hh(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
// texture: shade offset (in 0..6 ramp steps) per material at fine pixel x,y
const TEX = {
  skin: (x, y) => (vn(x / 7, y / 7, 1) - .5) * 1.4 + (hh(x, y, 2) < .035 ? -1.6 : 0) + (vn(x / 2.5, y / 2.5, 3) > .82 ? .9 : 0),
  bark: (x, y) => Math.sin(x * .7 + vn(x / 6, y / 14, 4) * 7) * .9 + (vn(x / 3, y / 3, 5) > .86 ? -1.6 : 0),
  wood: (x, y) => Math.sin(y * .5 + vn(x / 10, y / 4, 6) * 5) * .6,
  iron: (x, y) => (vn(x / 18, y / 1.6, 7) - .5) * .8 + (Math.abs(vn(x / 9, y / 9, 8) - .5) < .025 ? 1.4 : 0) + (x % 14 === 3 && y % 14 === 3 ? 2 : x % 14 === 4 && y % 14 === 4 ? -2 : 0),
  steel: (x, y) => (vn(x / 20, y / 1.4, 9) - .5) * .9 + ((x + y * 2) % 23 === 0 && hh(x >> 3, y >> 3, 1) < .3 ? 1.3 : 0),
  dark: (x, y) => (vn(x / 12, y / 2, 10) - .5) * .9 + (Math.abs(vn(x / 7, y / 7, 11) - .5) < .02 ? 1.5 : 0),
  stone: (x, y) => (vn(x / 5, y / 5, 12) - .5) * 1.2 + (Math.abs(vn(x / 8, y / 8, 13) - .5) < .035 ? -2.2 : 0),
  leather: (x, y) => (vn(x / 4, y / 4, 14) - .5) * .9 + ((x + (y >> 2)) % 9 === 0 && y % 4 < 2 ? 1 : 0),
  cloth: (x, y) => ((x + y) % 4 < 2 ? .35 : -.35) + (vn(x / 9, y / 9, 15) - .5) * .8,
  red: (x, y) => (vn(x / 5, y / 5, 16) - .5) * 1.2 + (hh(x, y, 17) < .04 ? -1.4 : 0),
  bone: (x, y) => (vn(x / 4, y / 4, 18) - .5) * .8 + (hh(x, y, 19) < .05 ? -1.3 : 0),
  leaf: (x, y) => (vn(x / 2.2, y / 2.2, 20) - .5) * 2.2, moss: (x, y) => (vn(x / 2, y / 2, 21) - .5) * 2.2,
  gold: (x, y) => (vn(x / 6, y / 2, 22) - .5) * .8 + (hh(x, y, 23) < .02 ? 2 : 0),
  glass: (x, y) => (Math.floor((x * .7 + y) / 7) % 2 ? .7 : -.4) + (hh(x, y, 24) < .01 ? 3 : 0), purple: (x, y) => (Math.floor((x - y * .6) / 6) % 2 ? .6 : -.4),
  void: (x, y) => (vn(x / 4, y / 4, 25) - .5) * 1.6, fire: (x, y) => (vn(x / 3, y / 5, 26) - .5) * 1.8, ember: (x, y) => (vn(x / 3, y / 3, 27) - .5) * 1.6,
  rust: (x, y) => (vn(x / 4, y / 4, 28) - .5) * 1.6, black: (x, y) => (vn(x / 8, y / 8, 29) - .5) * .6,
};
const BAYER = [[0, .5], [.75, .25]];
const lit4 = lit, lit6 = (nx, ny, nz, x, y) => { const l = -nx * .55 - ny * .65 + nz * .52; return clamp((l + .55) / 1.35 * 3.2, 0, 3.49); };
function HD(w, h, ox, oy, R) { Pix.call(this, w * R, h * R, ox * R, oy * R); this.R = R; this.sf = new Float32Array(w * R * h * R); }
HD.prototype = Object.create(Pix.prototype);
HD.prototype.put = function (x, y, mat, s = 2) { x = Math.floor(x) + this.ox; y = Math.floor(y) + this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.m[i] = mat; this.sf[i] = clamp(s, 0, 4); };
const HDW = (fn) => function (...a) { lit = lit6; try { return fn.apply(this, a); } finally { lit = lit4; } };
HD.prototype.ell = HDW(function (cx, cy, rx, ry, mat, o) { const R = this.R; return Pix.prototype.ell.call(this, cx * R, cy * R, rx * R, ry * R, mat, o); });
HD.prototype.box = HDW(function (x0, y0, w, h, mat, o = {}) { const R = this.R, X = Math.round(x0 * R), Y = Math.round(y0 * R), W = Math.round(w * R), H = Math.round(h * R);
  if (o.flat != null || o.cyl) return Pix.prototype.box.call(this, X, Y, W, H, mat, o);
  for (let y = Y; y < Y + H; y++) for (let x = X; x < X + W; x++) { if (o.only && !this.at(x, y)) continue; const e = Math.min(x - X, y - Y), e2 = Math.min(X + W - 1 - x, Y + H - 1 - y); this.put(x, y, mat, (e < R * .6 ? 3.2 : e2 < R * .6 ? 1 : 2.1) + (o.b || 0)); } return this; });
HD.prototype.poly = HDW(function (pts, mat, o) { const R = this.R; return Pix.prototype.poly.call(this, pts.map(([x, y]) => [x * R, y * R]), mat, o); });
HD.prototype.line = HDW(function (ax, ay, bx, by, r0, mat, r1 = r0, o) { const R = this.R; return Pix.prototype.line.call(this, ax * R, ay * R, bx * R, by * R, r0 * R, mat, r1 * R, o); });
HD.prototype.px = function (x, y, mat, s = 2) { const R = this.R; for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) this.put(Math.floor(x) * R + i, Math.floor(y) * R + j, mat, s + (i + j < R * .6 ? .6 : i + j > R * 1.3 ? -.6 : 0)); return this; };
// fine-pixel helpers for small sub-forms (coordinates in design units, sizes may be fractional)
HD.prototype.dot = function (x, y, mat, s = 2.5) { this.put(x * this.R, y * this.R, mat, s); return this; };
HD.prototype.fline = function (ax, ay, bx, by, mat, s = 2) { const R = this.R, n = Math.ceil(Math.hypot(bx - ax, by - ay) * R) + 1; for (let i = 0; i <= n; i++) { const t = i / n; this.put((ax + (bx - ax) * t) * R, (ay + (by - ay) * t) * R, mat, s); } return this; };
HD.prototype.spike = function (x, y, ang, len, w, mat) { const [tx, ty] = [x + Math.cos(ang) * len, y + Math.sin(ang) * len]; return this.line(x, y, tx, ty, w, mat, .12); };
HD.prototype.face = function (x, y, r, mat, eye = 'black', open = 1) { // a small fused face: brow, eyes, nose, mouth
  this.ell(x, y, r, r * 1.15, mat); this.ell(x - r * .38, y - r * .15, r * .22, r * .18 * open + .05, eye); this.ell(x + r * .38, y - r * .15, r * .22, r * .18 * open + .05, eye);
  this.fline(x - r * .6, y - r * .45, x - r * .15, y - r * .38, mat, 3.2); this.fline(x + r * .15, y - r * .38, x + r * .6, y - r * .45, mat, 3.2);
  this.fline(x, y - r * .05, x, y + r * .25, mat, 1); this.ell(x, y + r * .55, r * .3, r * .14 + .05, 'black'); return this; };
HD.prototype.glowc = function (x, y, r, mat) { const R = this.R; for (let j = -r * R; j <= r * R; j++) for (let i = -r * R; i <= r * R; i++) { const d = Math.hypot(i, j) / (r * R); if (d <= 1) this.put(x * R + i, y * R + j, mat, 3.4 * (1 - d * .85) + (((i * 3 + j * 5) & 7) === 0 && d > .4 ? -.8 : 0)); } return this; };
HD.prototype.bake = function (o = {}) {
  const w = this.w, h = this.h, P = 2, cvs = document.createElement('canvas'); cvs.width = w + P * 2; cvs.height = h + P * 2; cvs.R = this.R;
  const g = cvs.getContext('2d'), img = g.createImageData(cvs.width, cvs.height), D = img.data, M = this.m, S = this.sf, R = this.R;
  const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? null : M[y * w + x];
  const set = (x, y, c, a = 255) => { const i = ((y + P) * cvs.width + x + P) * 4; D[i] = parseInt(c.slice(1, 3), 16); D[i + 1] = parseInt(c.slice(3, 5), 16); D[i + 2] = parseInt(c.slice(5, 7), 16); D[i + 3] = a; };
  const rimW = Math.max(1, R >> 1);
  for (let y = -P; y < h + P; y++) for (let x = -P; x < w + P; x++) {
    const m = at(x, y);
    if (m) {
      let v = S[y * w + x] * 1.75; // 0..~6
      let ul = 0, lr = 0; for (let k = 1; k <= rimW; k++) { if (at(x - k, y - k) !== m && !at(x - k, y - k)) ul = 1; if (at(x + k, y + k) !== m && !at(x + k, y + k)) lr = 1; }
      if (ul) v += 1.1; if (lr) v -= 1.1;
      if (at(x, y - 1) && at(x, y - 1) !== m && !GLOWS.has(m)) v -= .7; // contact shadow under other parts
      if (TEX[m] && !o.noTex) v += TEX[m](x, y);
      v += BAYER[y & 1][x & 1] - .4;
      const c = ramp6(m)[clamp(Math.round(v), 0, 6)];
      set(x, y, o.tint ? o.tint(c, m) : c);
    } else {
      let n = 0, gl = null, near = null;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = at(x + a, y + b); if (q) { if (GLOWS.has(q)) gl = gl || q; else { n++; near = q; } } }
      if (n && !o.noOutline) set(x, y, hexMix(RAMP[near][0], '#05040a', .6));
      else if (!o.noGlow) { let best = null, bd = 9; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const q = at(x + i, y + j); if (q && GLOWS.has(q)) { const d = Math.hypot(i, j); if (d < bd) { bd = d; best = q; } } } if (best) set(x, y, RAMP[best][1], Math.round(170 * (1 - bd / 4.3))); }
    }
  }
  g.putImageData(img, 0, 0); return cvs;
};
