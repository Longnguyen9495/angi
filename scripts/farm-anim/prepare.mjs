import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/*
 * Layers for the farm animation demo (/farm-animation-test), cut from the owner's painting
 * (FARM_GAME_ASSET_PACK_V4…/00_MASTER/MASTER_REFERENCE.png, 1678×937).
 *
 *  sky.jpg       clean sky gradient (clouds and island removed)
 *  cloud-*.webp  clouds matted against the sky colour (true alpha), drifting or front banks
 *  island.webp   the island with alpha; things that move a lot are painted out of it
 *                (koi, chickens, the yard cow, windmill blades, lily pads, painted sprouts)
 *  <id>.webp     a sprite per animated object (tree crowns, bushes, reeds, flowers, animals…)
 *  water-mask / glass-mask  alpha masks for water waves and greenhouse reflections
 *  layers.json   placement, pivots and kinds for the runtime
 *
 * Small-motion objects (trees, grass, reeds…) are soft-edged copies laid over the island: the
 * painting stays underneath, so a sway of a few pixels reads as bending, not as a hole.
 *
 * Run: node scripts/farm-anim/prepare.mjs
 */

const SRC = resolve(
  'FARM_GAME_ASSET_PACK_V4_ULTRA_CLAUDE_PLAYCANVA/00_MASTER/MASTER_REFERENCE.png',
);
const OUT = resolve('public/farm-anim');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const { data: M, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;
const px = (p) => [M[p * 4], M[p * 4 + 1], M[p * 4 + 2]];

// ——— 1. Sky: flood from the border over sky-blue and cloud pixels ———
const isSky = (r, g, b) => b > 195 && b - r > 55 && g > 140;
const isCloud = (r, g, b) => r > 165 && g > 195 && b > 215 && b - r < 85;
const F = new Uint8Array(N);
{
  const q = [];
  const push = (p) => {
    if (F[p]) return;
    const [r, g, b] = px(p);
    if (isSky(r, g, b) || isCloud(r, g, b)) {
      F[p] = 1;
      q.push(p);
    }
  };
  for (let x = 0; x < W; x++) (push(x), push((H - 1) * W + x));
  for (let y = 0; y < H; y++) (push(y * W), push(y * W + W - 1));
  while (q.length) {
    const p = q.pop();
    const x = p % W;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (p >= W) push(p - W);
    if (p < N - W) push(p + W);
  }
}

/** Distance (px, 4-connected, capped) from every pixel to the nearest pixel where `src` is 1. */
function distanceTo(src, cap) {
  const d = new Uint8Array(N).fill(255);
  let front = [];
  for (let p = 0; p < N; p++) if (src[p]) ((d[p] = 0), front.push(p));
  for (let k = 1; k <= cap && front.length; k++) {
    const next = [];
    for (const p of front) {
      const x = p % W;
      for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W])
        if (n >= 0 && n < N && d[n] === 255) ((d[n] = k), next.push(n));
    }
    front = next;
  }
  return d;
}

// ——— 2. Sky colour: a smooth cubic in (x, y) fitted to the pure-sky pixels (least squares) ———
const basis = (x, y) => {
  const u = x / W - 0.5;
  const v = y / H - 0.5;
  return [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
};
const NB = 10;
const ATA = Array.from({ length: NB }, () => new Float64Array(NB));
const ATb = [new Float64Array(NB), new Float64Array(NB), new Float64Array(NB)];
for (let y = 0; y < H; y += 2)
  for (let x = 0; x < W; x += 2) {
    const p = y * W + x;
    if (!F[p]) continue;
    const [r, g, b] = px(p);
    if (!isSky(r, g, b) || r > 140) continue;
    const f = basis(x, y);
    for (let i = 0; i < NB; i++) {
      for (let j = 0; j < NB; j++) ATA[i][j] += f[i] * f[j];
      ATb[0][i] += f[i] * r;
      ATb[1][i] += f[i] * g;
      ATb[2][i] += f[i] * b;
    }
  }
function solve(A0, b0) {
  const A = A0.map((r) => Float64Array.from(r));
  const b = Float64Array.from(b0);
  for (let i = 0; i < NB; i++) {
    let m = i;
    for (let k = i + 1; k < NB; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
    [A[i], A[m]] = [A[m], A[i]];
    [b[i], b[m]] = [b[m], b[i]];
    for (let k = i + 1; k < NB; k++) {
      const t = A[k][i] / A[i][i];
      for (let j = i; j < NB; j++) A[k][j] -= t * A[i][j];
      b[k] -= t * b[i];
    }
  }
  const x = new Float64Array(NB);
  for (let i = NB - 1; i >= 0; i--) {
    let t = b[i];
    for (let j = i + 1; j < NB; j++) t -= A[i][j] * x[j];
    x[i] = t / A[i][i];
  }
  return x;
}
const coef = ATb.map((b) => solve(ATA, b));
const sky = new Float32Array(N * 3);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const f = basis(x, y);
    for (let k = 0; k < 3; k++) {
      let v = 0;
      for (let i = 0; i < NB; i++) v += coef[k][i] * f[i];
      sky[(y * W + x) * 3 + k] = Math.max(0, Math.min(255, v));
    }
  }
{
  const out = Buffer.alloc(N * 3);
  for (let i = 0; i < N * 3; i++) out[i] = Math.round(sky[i]);
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 90 })
    .toFile(join(OUT, 'sky.jpg'));
}

// ——— 3. Clouds: matte against the sky colour; cores (dense parts) split the sky into pieces ———
const A = new Float32Array(N);
for (let p = 0; p < N; p++) {
  if (!F[p]) continue;
  const [r, g, b] = px(p);
  let a = 0;
  for (const [v, sv] of [
    [r, sky[p * 3]],
    [g, sky[p * 3 + 1]],
    [b, sky[p * 3 + 2]],
  ])
    a = Math.max(a, (v - sv) / Math.max(8, 252 - sv));
  // Small residues are the sky fit, not cloud: cut them so drifting clouds carry no halo.
  A[p] = Math.max(0, Math.min(1, (a - 0.07) / 0.93));
}
const distIsland = distanceTo(
  Uint8Array.from(F, (f) => (f ? 0 : 1)),
  24,
);
const label = new Int32Array(N).fill(-1);
const comps = [];
for (let p0 = 0; p0 < N; p0++) {
  if (label[p0] !== -1 || A[p0] < 0.4) continue;
  const c = { id: comps.length, n: 0, touch: 0, sy: 0 };
  const stack = [p0];
  label[p0] = c.id;
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    c.n++;
    c.sy += (p / W) | 0;
    if (distIsland[p] <= 3) c.touch++;
    for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W])
      if (n >= 0 && n < N && label[n] === -1 && A[n] >= 0.4) ((label[n] = c.id), stack.push(n));
  }
  comps.push(c);
}
// Grow the cores over the faint cloud pixels, nearest core first (breadth-first), so every
// wisp belongs to exactly one piece.
{
  let front = [];
  for (let p = 0; p < N; p++) if (label[p] >= 0) front.push(p);
  while (front.length) {
    const next = [];
    for (const p of front) {
      const x = p % W;
      for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W])
        if (n >= 0 && n < N && label[n] === -1 && A[n] >= 0.02)
          ((label[n] = label[p]), next.push(n));
    }
    front = next;
  }
}
const stats = comps.map((c) => ({ ...c, x0: W, y0: H, x1: 0, y1: 0, m: 0 }));
for (let p = 0; p < N; p++) {
  const l = label[p];
  if (l < 0) continue;
  const c = stats[l];
  const x = p % W;
  const y = (p / W) | 0;
  c.m++;
  if (x < c.x0) c.x0 = x;
  if (x > c.x1) c.x1 = x;
  if (y < c.y0) c.y0 = y;
  if (y > c.y1) c.y1 = y;
}
// Front banks: pieces that run into the island (they sit in front of its cliffs).
const clouds = [];
const bankOf = new Uint8Array(comps.length);
for (const c of stats) {
  if (c.n < 60) continue;
  // Upper clouds touching the island are behind it (trees in front); only low ones overlap cliffs.
  const bank = c.touch > 25 && c.sy / c.n > 450;
  bankOf[c.id] = bank ? 1 : 0;
  const x0 = Math.max(0, c.x0 - 1);
  const y0 = Math.max(0, c.y0 - 1);
  const w = Math.min(W - 1, c.x1 + 1) - x0 + 1;
  const h = Math.min(H - 1, c.y1 + 1) - y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * W + x0 + x;
      if (label[p] !== c.id) continue;
      const a = A[p];
      const o = (y * w + x) * 4;
      for (let k = 0; k < 3; k++)
        buf[o + k] = Math.max(
          0,
          Math.min(255, (M[p * 4 + k] - sky[p * 3 + k] * (1 - a)) / Math.max(a, 0.05)),
        );
      buf[o + 3] = Math.round(a * 255);
    }
  const file = `cloud-${clouds.length + 1}.webp`;
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(join(OUT, file));
  clouds.push({ file, x: x0, y: y0, w, h, bank });
}

// ——— 4. Island: everything that is not sky; it keeps a copy of front cloud banks near its edge ———
const island = Buffer.from(M);
for (let p = 0; p < N; p++) {
  if (!F[p]) continue;
  const keep = label[p] >= 0 && bankOf[label[p]] && distIsland[p] <= 18;
  island[p * 4 + 3] = keep ? 255 : 0;
}

// ——— Masks and helpers ———
const inEllipse = ([cx, cy, rx, ry], x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry);
/** Soft ellipse weight: 1 inside, falling to 0 over `feather` px at the rim. */
function ellipseWeight(e, x, y, feather) {
  const d = inEllipse(e, x, y);
  const r = Math.min(e[2], e[3]);
  return Math.max(0, Math.min(1, ((1 - d) * r) / feather + 0.5));
}
function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const polyBox = (poly) => [
  Math.floor(Math.min(...poly.map((p) => p[0]))),
  Math.floor(Math.min(...poly.map((p) => p[1]))),
  Math.ceil(Math.max(...poly.map((p) => p[0]))),
  Math.ceil(Math.max(...poly.map((p) => p[1]))),
];

/** Fill masked pixels of `buf` from their unmasked neighbours, ring by ring, with a little grain. */
function inpaint(buf, mask) {
  let unknown = [];
  for (let p = 0; p < N; p++) if (mask[p]) unknown.push(p);
  const known = new Uint8Array(N).fill(1);
  for (const p of unknown) known[p] = 0;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 6;
  while (unknown.length) {
    const next = [];
    const fill = [];
    for (const p of unknown) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (const q of [p - 1, p + 1, p - W, p + W, p - W - 1, p - W + 1, p + W - 1, p + W + 1])
        if (q >= 0 && q < N && known[q] && buf[q * 4 + 3] > 0) {
          r += buf[q * 4];
          g += buf[q * 4 + 1];
          b += buf[q * 4 + 2];
          n++;
        }
      if (n) fill.push([p, r / n, g / n, b / n]);
      else next.push(p);
    }
    if (!fill.length) break;
    for (const [p, r, g, b] of fill) {
      const j = rnd();
      buf[p * 4] = Math.max(0, Math.min(255, r + j));
      buf[p * 4 + 1] = Math.max(0, Math.min(255, g + j));
      buf[p * 4 + 2] = Math.max(0, Math.min(255, b + j));
      known[p] = 1;
    }
    unknown = next;
  }
}
/**
 * Texture-keeping fill: a smooth diffusion fill gives the colour each hole pixel should roughly
 * have; the pixel then copies the real painted pixel, from a few candidates just outside the
 * hole in eight directions, whose colour is closest to that guide. Grass takes grass, sand takes
 * sand, water takes water, and the brush texture carries on instead of a smear or a mirror.
 */
function inpaintGuided(buf, mask) {
  const guide = Buffer.from(buf);
  inpaint(guide, mask);
  const out = Buffer.from(guide);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  for (let p = 0; p < N; p++) {
    if (!mask[p]) continue;
    const x = p % W;
    const y = (p / W) | 0;
    const gr = guide[p * 4];
    const gg = guide[p * 4 + 1];
    const gb = guide[p * 4 + 2];
    let best = -1;
    let bestCost = Infinity;
    for (const [dx, dy] of dirs) {
      let d = 1;
      for (; d < 60; d++) {
        const qx = x + dx * d;
        const qy = y + dy * d;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) break;
        if (!mask[qy * W + qx]) break;
      }
      if (d >= 60) continue;
      for (const k of [1, 3, 6, 10]) {
        const qx = x + dx * (d + k);
        const qy = y + dy * (d + k);
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const q = qy * W + qx;
        if (mask[q] || buf[q * 4 + 3] === 0) continue;
        const cost =
          (buf[q * 4] - gr) ** 2 +
          (buf[q * 4 + 1] - gg) ** 2 +
          (buf[q * 4 + 2] - gb) ** 2 +
          (d + k) * 6;
        if (cost < bestCost) ((bestCost = cost), (best = q));
      }
    }
    if (best >= 0) for (let c = 0; c < 3; c++) out[p * 4 + c] = buf[best * 4 + c];
  }
  out.copy(buf);
}

function dilate(mask, times) {
  for (let t = 0; t < times; t++) {
    const add = [];
    for (let p = W; p < N - W; p++)
      if (!mask[p] && (mask[p - 1] || mask[p + 1] || mask[p - W] || mask[p + W])) add.push(p);
    for (const p of add) mask[p] = 1;
  }
  return mask;
}

/** Writes a sprite from `buf` over box [x0,y0,x1,y1] with per-pixel alpha `alphaAt(x,y,r,g,b)` (0..1). */
async function sprite(id, buf, [x0, y0, x1, y1], alphaAt) {
  x0 = Math.max(0, x0);
  y0 = Math.max(0, y0);
  x1 = Math.min(W - 1, x1);
  y1 = Math.min(H - 1, y1);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = Buffer.alloc(w * h * 4);
  let any = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * W + x0 + x;
      const a = alphaAt(x0 + x, y0 + y, buf[p * 4], buf[p * 4 + 1], buf[p * 4 + 2], p);
      const o = (y * w + x) * 4;
      out[o] = buf[p * 4];
      out[o + 1] = buf[p * 4 + 1];
      out[o + 2] = buf[p * 4 + 2];
      out[o + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
      if (out[o + 3]) any++;
    }
  if (!any) throw new Error(`sprite ${id} is empty`);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 95 })
    .toFile(join(OUT, `${id}.webp`));
  return { file: `${id}.webp`, x: x0, y: y0, w, h };
}

// ——— 5. Objects that move a lot: cut from the painting, then painted out of the island ———
const removed = new Uint8Array(N);
const sprites = {};
const hue = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const sat = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
const isWaterPx = (r, g, b) => b > 150 && g > 120 && r < 140 && b - r > 60;
const isSand = (r, g, b) => r > 170 && r - b > 40 && r - b < 125 && g > 140;
const isLeaf = (r, g, b) => hue(r, g, b) > 60 && hue(r, g, b) < 170 && sat(r, g, b) > 0.25;
const isDark = (r, g, b) => r + g + b < 200;

// Koi: everything in their boxes that is not clean water.
const KOI = [
  [969, 706, 1058, 744],
  [899, 737, 961, 779],
  [974, 769, 1030, 801],
  [1054, 753, 1133, 807],
];
for (const [k, box] of KOI.entries()) {
  const fish = (r, g, b) => !(r < 40 && g > 145 && b > 170);
  sprites[`koi-${k + 1}`] = await sprite(`koi-${k + 1}`, M, box, (x, y, r, g, b) =>
    fish(r, g, b) && b - r < 40 ? 1 : 0,
  );
  for (let y = box[1] - 12; y <= box[3] + 12; y++)
    for (let x = box[0] - 12; x <= box[2] + 12; x++) {
      const p = y * W + x;
      const [r, g, b] = px(p);
      const inside = x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
      // Inside the box anything that is not clean water; around it only the darker shadow.
      if ((inside && fish(r, g, b)) || (r < 40 && g < 186 && b < 213)) removed[p] = 1;
    }
}
// Chickens: their cream feathers are sand-coloured, so the hen is cut by its outline (traced on
// the painting). The second hen stands against the coop post and can't be cut cleanly: it is
// painted out (post kept) and the first hen's sprite plays both, with its own timing.
const HEN = [
  [1232, 471],
  [1236, 466],
  [1242, 469.5],
  [1246, 470.5],
  [1252, 460.5],
  [1256, 462],
  [1259, 469],
  [1260.5, 477],
  [1260, 485],
  [1258, 494],
  [1253, 498],
  [1255, 500],
  [1255, 507],
  [1245, 508.5],
  [1240, 506],
  [1238, 502],
  [1235, 494],
  [1233.5, 485],
  [1234, 476],
];
{
  const box = polyBox(HEN);
  const hen = await sprite(
    'chicken-1',
    M,
    [box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1],
    (x, y) => (inPoly(HEN, x + 0.5, y + 0.5) ? 1 : 0),
  );
  sprites['chicken-1'] = { ...hen, feet: [1247, 508] };
  sprites['chicken-2'] = { ...hen, feet: [1247, 508], start: [1378, 523] };
  const m = new Uint8Array(N);
  const shape2 = (x, y) =>
    (inEllipse([1376, 504, 13, 11], x, y) < 1 ||
      inEllipse([1384, 482, 9, 9], x, y) < 1 ||
      inEllipse([1377, 518, 8, 7], x, y) < 1 ||
      inEllipse([1366, 491, 7, 7], x, y) < 1) &&
    !(x >= 1369 && x <= 1378 && y < 494);
  for (let y = 450; y <= 530; y++)
    for (let x = 1220; x <= 1400; x++) {
      const [r, g, b] = px(y * W + x);
      const near1 = Math.abs(x - 1247) < 20 && y > 498 && y < 514;
      const near2 = Math.abs(x - 1377) < 20 && y > 514 && y < 530;
      const shadow = isSand(r, g, b) && r < 205 && (near1 || near2);
      if (inPoly(HEN, x + 0.5, y + 0.5) || shape2(x, y) || shadow) m[y * W + x] = 1;
    }
  dilate(m, 2);
  for (let p = 0; p < N; p++)
    if (m[p] && !(p % W >= 1369 && p % W <= 1378 && p / W < 494)) removed[p] = 1;
}
// Cows stay painted in the island: they move as soft-edged copies of themselves (body breathing
// and shifting weight, head grazing and nodding, tail swishing). The motion is a few pixels, so
// the painting underneath fills in and nothing shows a cut edge.
const COWS = [
  // Yard cow (in front of the barn door, facing left).
  { id: 'cowY', body: [1328, 368, 36, 33], head: [1308, 360, 18, 24], neck: [1327, 362], feet: [1330, 398] },
  // House cow (by the tree, facing left).
  { id: 'cowH', body: [895, 189, 37, 36], head: [877, 182, 19, 25], neck: [896, 186], feet: [896, 224], tail: [918, 156, 6, 5], tailPivot: [914, 159] },
];
for (const c of COWS) {
  const soft = async (id, e, feather) =>
    sprite(id, M, [Math.floor(e[0] - e[2] - 2), Math.floor(e[1] - e[3] - 2), Math.ceil(e[0] + e[2] + 2), Math.ceil(e[1] + e[3] + 2)], (x, y) => ellipseWeight(e, x, y, feather));
  sprites[`${c.id}-body`] = { ...(await soft(`${c.id}-body`, c.body, 7)), feet: c.feet };
  sprites[`${c.id}-head`] = { ...(await soft(`${c.id}-head`, c.head, 6)), base: c.neck };
  if (c.tail) sprites[`${c.id}-tail`] = { ...(await soft(`${c.id}-tail`, c.tail, 3)), base: c.tailPivot };
}
// Windmill blades: four arms round the hub, in the tilted plane of the sails.
const HUB = [868, 285];
const TIPS = [
  [828, 230],
  [904, 247],
  [908, 328],
  [827, 320],
];
const armPoly = ([tx, ty], half) => {
  const dx = tx - HUB[0];
  const dy = ty - HUB[1];
  const l = Math.hypot(dx, dy);
  const nx = (-dy / l) * half;
  const ny = (dx / l) * half;
  const ex = tx + (dx / l) * 3;
  const ey = ty + (dy / l) * 3;
  return [
    [HUB[0] + nx, HUB[1] + ny],
    [ex + nx, ey + ny],
    [ex - nx, ey - ny],
    [HUB[0] - nx, HUB[1] - ny],
  ];
};
const ARMS = TIPS.map((t) => armPoly(t, 8.5));
const inBlades = (x, y) =>
  ARMS.some((a) => inPoly(a, x, y)) || Math.hypot(x - HUB[0], y - HUB[1]) < 9;
sprites.blades = {
  ...(await sprite('blades', M, [818, 220, 918, 338], (x, y) => (inBlades(x, y) ? 1 : 0))),
  hub: HUB,
  tips: TIPS,
};
for (let y = 218; y <= 340; y++)
  for (let x = 816; x <= 920; x++) if (inBlades(x, y)) removed[y * W + x] = 1;
// Lily pads and painted sprouts: cut by colour inside a small ellipse, painted out underneath.
const LILIES = [
  [828, 733, 16, 9],
  [850, 748, 15, 8],
  [835, 760, 11, 6],
  [948, 666, 14, 6],
  [1244, 625, 22, 10],
  [1290, 641, 20, 9],
];
const lilies = [];
for (const [k, e] of LILIES.entries()) {
  const id = `lily-${k + 1}`;
  const box = [e[0] - e[2] - 2, e[1] - e[3] - 2, e[0] + e[2] + 2, e[1] + e[3] + 2];
  const pad = (r, g, b) => !isWaterPx(r, g, b);
  sprites[id] = await sprite(id, M, box, (x, y, r, g, b) =>
    inEllipse(e, x, y) < 1 && pad(r, g, b) ? 1 : 0,
  );
  lilies.push({ id, cx: e[0], cy: e[1] });
  for (let y = box[1]; y <= box[3]; y++)
    for (let x = box[0]; x <= box[2]; x++) {
      const [r, g, b] = px(y * W + x);
      if (inEllipse(e, x, y) < 1.15 && pad(r, g, b)) removed[y * W + x] = 1;
    }
}
const SPROUTS = [
  { id: 'sprout-1', e: [597, 365, 27, 27], base: [599, 388] },
  { id: 'sprout-2', e: [532, 402, 27, 27], base: [534, 426] },
  { id: 'sprout-3', e: [432, 444, 27, 27], base: [434, 468] },
  { id: 'sprout-4', e: [712, 410, 27, 27], base: [713, 433] },
];
for (const s of SPROUTS) {
  const box = [s.e[0] - s.e[2], s.e[1] - s.e[3], s.e[0] + s.e[2], s.e[1] + s.e[3]];
  const leafy = (r, g, b) => (isLeaf(r, g, b) && g > 90) || (isDark(r, g, b) && g > r * 0.9);
  const m = new Uint8Array(N);
  for (let y = box[1]; y <= box[3]; y++)
    for (let x = box[0]; x <= box[2]; x++) {
      const [r, g, b] = px(y * W + x);
      if (inEllipse(s.e, x, y) < 1 && leafy(r, g, b)) m[y * W + x] = 1;
    }
  dilate(m, 1);
  sprites[s.id] = {
    ...(await sprite(s.id, M, box, (x, y, r, g, b, p) => (m[p] ? 1 : 0))),
    base: s.base,
  };
  for (let p = 0; p < N; p++) if (m[p]) removed[p] = 1;
}
dilate(removed, 1);
for (let p = 0; p < N; p++) if (removed[p]) island[p * 4 + 3] = 255;
inpaintGuided(island, removed);

// ——— 6. Soft overlay layers (bend in the wind over the painting) ———
// kind: tree crown parts, bush, grass, flower, reed, crop field fringe, hay, dock.
// e = ellipse [cx, cy, rx, ry] in picture px, pivot = the point that stays put (stem base).
// sky: the crown also replaces the island's edge pixels against the sky (no ghost edge there).
const L = (id, kind, e, pivot, opts = {}) => ({ id, kind, e, pivot, ...opts });
const LAYERS = [
  // Mango trees: three crown parts each so they don't move as one block; fruit hangs separately.
  L('mango1-top', 'tree', [405, 170, 72, 42], [410, 330], {
    sky: true,
    parent: 'mango1',
    fruit: true,
  }),
  L('mango1-left', 'tree', [358, 238, 44, 50], [410, 330], {
    sky: true,
    parent: 'mango1',
    fruit: true,
  }),
  L('mango1-right', 'tree', [458, 238, 44, 46], [410, 330], {
    sky: true,
    parent: 'mango1',
    fruit: true,
  }),
  L('mango2-top', 'tree', [530, 165, 55, 38], [538, 272], {
    sky: true,
    parent: 'mango2',
    fruit: true,
  }),
  L('mango2-low', 'tree', [550, 225, 45, 30], [538, 272], {
    sky: true,
    parent: 'mango2',
    fruit: true,
  }),
  L('tree-left', 'tree', [208, 452, 42, 38], [207, 498], { sky: true }),
  L('tree-centre', 'tree', [975, 377, 66, 44], [962, 428]),
  L('tree-house', 'tree', [893, 88, 46, 60], [895, 160], { sky: true }),
  L('pine-1', 'pine', [575, 116, 24, 28], [580, 150], { sky: true }),
  L('pine-2', 'pine', [706, 73, 17, 20], [706, 96], { sky: true }),
  L('pine-3', 'pine', [985, 80, 60, 34], [985, 120], { sky: true }),
  L('pine-4', 'pine', [1212, 133, 31, 36], [1212, 172], { sky: true }),
  L('pine-5', 'pine', [1270, 146, 31, 40], [1270, 190], { sky: true }),
  L('pine-6', 'pine', [1423, 198, 46, 58], [1423, 265], { sky: true }),
  L('pine-7', 'pine', [1522, 253, 49, 50], [1520, 308], { sky: true }),
  L('tree-barn', 'tree', [1556, 350, 52, 46], [1550, 405], { sky: true }),
  L('tree-pond', 'tree', [1438, 584, 26, 25], [1438, 614], { sky: true }),
  L('bush-well', 'bush', [300, 377, 50, 46], [300, 425]),
  L('bush-fence', 'bush', [402, 382, 48, 28], [402, 412]),
  L('bush-barn', 'bush', [1592, 438, 28, 34], [1592, 474], { sky: true }),
  L('bush-path', 'bush', [1040, 523, 30, 21], [1040, 546]),
  L('grass-sign', 'grass', [822, 482, 23, 15], [822, 498]),
  L('grass-pond-1', 'grass', [700, 790, 18, 12], [700, 803]),
  L('grass-pond-2', 'grass', [1405, 690, 20, 14], [1405, 705]),
  L('grass-cliff-1', 'grass', [215, 500, 26, 10], [215, 511], { sky: true }),
  L('grass-cliff-2', 'grass', [1470, 640, 22, 10], [1470, 651], { sky: true }),
  L('flower-well', 'flower', [265, 441, 14, 9], [265, 450]),
  L('flower-path', 'flower', [1035, 487, 30, 9], [1035, 496]),
  L('flower-yard', 'flower', [1086, 482, 22, 9], [1086, 491]),
  L('flower-pond', 'flower', [1486, 558, 15, 12], [1486, 570]),
  L('flower-fence', 'flower', [703, 333, 12, 6], [703, 339]),
  L('reed-1', 'reed', [905, 660, 26, 37], [905, 698]),
  L('reed-2', 'reed', [786, 736, 21, 26], [786, 763]),
  L('reed-3', 'reed', [786, 788, 42, 44], [786, 832]),
  L('reed-4', 'reed', [860, 836, 21, 26], [860, 863]),
  L('reed-5', 'reed', [1333, 638, 21, 24], [1333, 663]),
  L('reed-6', 'reed', [1350, 698, 29, 30], [1350, 729]),
  L('reed-7', 'reed', [1200, 753, 14, 29], [1200, 783], { under: true }),
  L('hay', 'hay', [1205, 405, 58, 38], [1205, 443]),
  L('dock', 'dock', [1062, 605, 88, 50], [1062, 650]),
];
const fruitPx = (r, g, b) => r > 190 && g > 120 && b < 90 && r - g < 110;
const islandNow = Buffer.from(island);
const layers = [];
for (const l of LAYERS) {
  const [cx, cy, rx, ry] = l.e;
  const feather = Math.max(4, Math.min(rx, ry) * 0.35);
  const box = [
    Math.floor(cx - rx - 2),
    Math.floor(cy - ry - 2),
    Math.ceil(cx + rx + 2),
    Math.ceil(cy + ry + 2),
  ];
  const w = (x, y) => ellipseWeight(l.e, x, y, feather);
  const meta = await sprite(
    l.id,
    islandNow,
    box,
    (x, y, r, g, b, p) =>
      (islandNow[p * 4 + 3] ? w(x, y) : 0) * (l.fruit && fruitPx(r, g, b) ? 0 : 1),
  );
  if (l.fruit) {
    let n = 0;
    for (let y = box[1]; y <= box[3]; y++)
      for (let x = box[0]; x <= box[2]; x++) if (w(x, y) > 0.5 && fruitPx(...px(y * W + x))) n++;
    if (n > 30)
      meta.fruit = (
        await sprite(`${l.id}-fruit`, islandNow, box, (x, y, r, g, b, p) =>
          w(x, y) > 0.2 && islandNow[p * 4 + 3] && fruitPx(r, g, b) ? 1 : 0,
        )
      ).file;
  }
  layers.push({ ...l, ...meta });
}
// Sky band: island pixels near the sky inside fully-weighted sky crowns are left to the crown sprite.
{
  const distSky = distanceTo(F, 15);
  for (const l of LAYERS.filter((x) => x.sky)) {
    const [cx, cy, rx, ry] = l.e;
    const feather = Math.max(4, Math.min(rx, ry) * 0.35);
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const p = y * W + x;
        if (F[p] || distSky[p] > 14 || ellipseWeight(l.e, x, y, feather) < 0.99) continue;
        // Fade the island crown out towards the sky (the sprite covers it at rest), so a sway shows
        // a soft edge instead of two hard ones.
        island[p * 4 + 3] = Math.min(
          island[p * 4 + 3],
          Math.round(255 * Math.max(0, (distSky[p] - 1) / 13)),
        );
      }
  }
}
await sharp(island, { raw: { width: W, height: H, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(join(OUT, 'island.webp'));

// ——— 7. Masks: pond water and greenhouse glass ———
async function maskFile(file, box, test) {
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * W + x0 + x;
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = 255;
      out[o + 3] = test(x0 + x, y0 + y, island[p * 4], island[p * 4 + 1], island[p * 4 + 2])
        ? 255
        : 0;
    }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .blur(0.6)
    .png()
    .toFile(join(OUT, file));
  return { file, x: x0, y: y0, w, h };
}
const POND = [
  [790, 640],
  [870, 610],
  [960, 590],
  [1250, 590],
  [1390, 610],
  [1420, 680],
  [1300, 790],
  [1090, 905],
  [930, 880],
  [800, 845],
  [770, 760],
];
const water = await maskFile(
  'water-mask.png',
  [760, 560, 1440, 930],
  (x, y, r, g, b) => inPoly(POND, x, y) && isWaterPx(r, g, b),
);
const GLASS = [
  [1015, 110],
  [1060, 84],
  [1140, 92],
  [1336, 212],
  [1336, 292],
  [1290, 300],
  [1105, 172],
  [1040, 172],
];
const glass = await maskFile(
  'glass-mask.png',
  polyBox(GLASS),
  (x, y, r, g, b) => inPoly(GLASS, x, y) && r + g + b > 500 && sat(r, g, b) < 0.25,
);

// ——— 7b. Field plots: the game's 9 plots on the painted lattice, and an empty-soil tile ———
// Lattice measured on the seams (i along R, j along L). Plots 1–6 are the painted tilled tiles,
// 7–9 (unlocked later) the clear grass tiles in front; the runtime stamps soil on unlocked ones.
const FIELD = { v0: [620, 342], R: [88, 51], L: [-92.5, 43.5] };
const corner = (i, j) => [FIELD.v0[0] + FIELD.R[0] * i + FIELD.L[0] * j, FIELD.v0[1] + FIELD.R[1] * i + FIELD.L[1] * j];
const tileQuad = (i, j) => [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
const PLOT_TILES = [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 2]];
const plots = PLOT_TILES.map(([i, j], k) => ({ id: k + 1, quad: tileQuad(i, j), centre: corner(i + 0.5, j + 0.5) }));
let soilTile;
{
  // Tile (1, 2) with its painted seed clump patched from the soil beside it.
  const pix = Buffer.from(M);
  const [cx, cy] = [525, 522];
  for (let y = cy - 18; y <= cy + 14; y++)
    for (let x = cx - 26; x <= cx + 26; x++) {
      const e = Math.hypot((x - cx) / 26, (y - cy + 2) / 16);
      if (e > 1) continue;
      const t = Math.min(1, (1 - e) / 0.35);
      for (let c = 0; c < 3; c++) pix[(y * W + x) * 4 + c] = pix[(y * W + x) * 4 + c] * (1 - t) + M[((y + 6) * W + x - 44) * 4 + c] * t;
    }
  const q = tileQuad(1, 2);
  const edge = (x, y) => {
    let d = Infinity;
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      d = Math.min(d, ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay));
    }
    return d; // > 0 inside (clockwise on screen)
  };
  const box = polyBox(q);
  soilTile = { ...(await sprite('tile-soil', pix, [box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3], (x, y) => Math.max(0, Math.min(1, (edge(x + 0.5, y + 0.5) + 2.5) / 2.5)))), anchor: corner(1, 2) };
}

// ——— 8. Places for things drawn by the runtime ———
const places = {
  chimney: {
    x: 770,
    ridge: [
      [698, 85],
      [820, 33],
    ],
    top: 30,
    w: 15,
  },
  windows: [
    [657, 160, 10, 13],
    [632, 191, 8, 9],
    [667, 210, 8, 10],
    [638, 240, 7, 10],
    [673, 261, 9, 11],
    [748, 208, 9, 9],
    [781, 191, 9, 12],
    [825, 150, 8, 8],
    [823, 211, 7, 9],
  ],
  door: { x0: 740, y0: 240, x1: 780, y1: 293 },
  dockPosts: [
    [993, 646],
    [1026, 658],
    [1066, 683],
    [1130, 651],
  ],
  rope: { from: [1131, 600], to: [1137, 640] },
  pond: { cx: 1060, cy: 760, rx: 230, ry: 70, poly: POND },
  yard: {
    chickens: [
      [1180, 400],
      [1440, 470],
    ],
    cow: [1290, 1330],
  },
  sky: { y0: 0, y1: 330 },
};
const layout = { size: [W, H], field: { ...FIELD, plots, soil: soilTile }, clouds, sprites, layers, lilies, water, glass, places, koi: KOI };
writeFileSync(join(OUT, 'layers.json'), `${JSON.stringify(layout)}\n`);
console.log(
  `farm-anim: ${clouds.length} clouds (${clouds.filter((c) => c.bank).length} banks), ${Object.keys(sprites).length} sprites, ${layers.length} layers`,
);
