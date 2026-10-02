import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { box as wBox, ell as wEll, pt as wPt, SCALE, vec as wVec } from './warp.mjs';

/*
 * Layers for the living farm (/farm-animation-test and the /journey game), cut from the owner's
 * colourful painting (…_UPDATED/15_NEW_REFERENCE_AND_SPRITE_SHEET/
 * MASTER_REFERENCE_COLORFUL_FLOATING_FARM.png = nongtraivuive.png, 1678×937, island on true alpha),
 * plus loose pieces from the generated asset sheet (16_EXTRACTED_SPRITES, written by
 * split-sprite-sheet.mjs): clouds, smoke, leaves, butterflies, birds, sparkles, splashes.
 *
 *  sky.jpg       soft sky gradient (the painting has no sky)
 *  cloud-*.webp  sheet clouds: drifting sky clouds and front banks over the cut cliff bottoms
 *  island.webp   the island; things that move a lot are painted out of it
 *                (koi, chickens, windmill blades, lily pads, painted sprouts)
 *  <id>.webp     a sprite per animated object (tree crowns, bushes, reeds, flowers, animals…)
 *  fx-*.webp     sheet pieces the particle and ambient systems draw
 *  water-mask / glass-mask  alpha masks for water waves and greenhouse reflections
 *  layers.json   placement, pivots, kinds and tap places for the runtime
 *
 * Small-motion objects (trees, grass, reeds…) are soft-edged copies laid over the island: the
 * painting stays underneath, so a sway of a few pixels reads as bending, not as a hole.
 *
 * Coordinates: the boxes, ellipses and points below were measured on the first painting (V4
 * MASTER_REFERENCE.png); warp.mjs carries them onto the repaint (wPt / wBox / wEll / wVec).
 * New things measured on the repaint itself are written as plain numbers.
 *
 * Run: node scripts/farm-anim/split-sprite-sheet.mjs (once), then node scripts/farm-anim/prepare.mjs
 */

const PACK = resolve('FARM_GAME_ASSET_PACK_V4_ULTRA_CLAUDE_PLAYCANVA_UPDATED');
const SRC = join(
  PACK,
  '15_NEW_REFERENCE_AND_SPRITE_SHEET/MASTER_REFERENCE_COLORFUL_FLOATING_FARM.png',
);
const SHEET = join(PACK, '16_EXTRACTED_SPRITES');
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
// The repaint's island is stored at 252–253 alpha all over: make it solid, keep the soft rim.
for (let p = 0; p < N; p++) {
  const a = M[p * 4 + 3];
  M[p * 4 + 3] = a >= 240 ? 255 : a < 8 ? 0 : Math.round((a / 240) * 255);
}
const px = (p) => [M[p * 4], M[p * 4 + 1], M[p * 4 + 2]];

// ——— 1. Sky: whatever the painting leaves transparent ———
const F = new Uint8Array(N);
for (let p = 0; p < N; p++) if (M[p * 4 + 3] < 128) F[p] = 1;

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

// ——— 2. Sky colour: the first painting's sky (fitted there), as a smooth gradient ———
// Rows top → bottom of [edge colour, centre colour]; columns blend edge → centre → edge.
const SKY_ROWS = [
  [0, [75, 189, 252], [100, 201, 253]],
  [150, [88, 197, 254], [114, 214, 250]],
  [300, [107, 208, 254], [134, 229, 249]],
  [450, [125, 217, 254], [156, 244, 246]],
  [600, [134, 220, 253], [171, 252, 245]],
  [750, [128, 211, 255], [170, 249, 243]],
  [936, [90, 173, 253], [143, 221, 241]],
];
{
  const out = Buffer.alloc(N * 3);
  for (let y = 0; y < H; y++) {
    let k = 0;
    while (k < SKY_ROWS.length - 2 && SKY_ROWS[k + 1][0] < y) k++;
    const [y0, e0, c0] = SKY_ROWS[k];
    const [y1, e1, c1] = SKY_ROWS[k + 1];
    const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    for (let x = 0; x < W; x++) {
      const u = 1 - Math.abs(x / (W - 1) - 0.5) * 2; // 0 at the sides, 1 in the middle
      const s = u * u * (3 - 2 * u);
      for (let c = 0; c < 3; c++) {
        const edge = e0[c] + (e1[c] - e0[c]) * t;
        const mid = c0[c] + (c1[c] - c0[c]) * t;
        out[(y * W + x) * 3 + c] = Math.round(edge + (mid - edge) * s);
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 90 })
    .toFile(join(OUT, 'sky.jpg'));
}

// ——— 3. Pieces from the asset sheet, picked by where they sit on the sheet ———
const SHEET_INDEX = JSON.parse(readFileSync(join(SHEET, 'index.json'), 'utf8'));
/** The sheet item whose box holds sheet point (x, y). */
function sheetItem(x, y, what) {
  const hit = SHEET_INDEX.filter((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
  hit.sort((a, b) => a.w * a.h - b.w * b.h);
  if (!hit.length)
    throw new Error(`no sheet item at ${x},${y} (${what}); run split-sprite-sheet.mjs`);
  return hit[0];
}
/** Copies a sheet item into the output as webp; returns { file, w, h }. */
async function fromSheet(id, x, y) {
  const s = sheetItem(x, y, id);
  const file = `${id}.webp`;
  await sharp(join(SHEET, s.file)).webp({ quality: 90, alphaQuality: 95 }).toFile(join(OUT, file));
  return { file, w: s.w, h: s.h };
}

// Clouds: the four big puffs along the bottom of the sheet, reused at several sizes (flipped
// copies look like new clouds). No banks below the island: the cliff bottoms stay visible.
const CLOUD_SRC = [
  await fromSheet('cloud-1', 110, 950),
  await fromSheet('cloud-2', 300, 960),
  await fromSheet('cloud-3', 500, 970),
  await fromSheet('cloud-4', 640, 965),
];
const C = (i, x, y, scale, bank = false, flip = false) => {
  const s = CLOUD_SRC[i];
  return { file: s.file, x, y, w: Math.round(s.w * scale), h: Math.round(s.h * scale), bank, flip };
};
const clouds = [
  // Sky: high and small far away, bigger lower down; spread so a loop never shows a gap.
  C(0, 20, 20, 0.95),
  C(2, 380, -10, 0.7, false, true),
  C(1, 760, 10, 0.6),
  C(3, 1040, -6, 0.85, false, true),
  C(0, 1300, 30, 1.0, false, true),
  C(2, 1520, 140, 0.8),
  C(1, -80, 200, 1.15, false, true),
  C(3, 1540, 320, 1.1),
  C(2, -90, 440, 1.2),
];

// Loose pieces the runtime animates on their own (falling leaves, butterflies, birds, sparkle,
// smoke, splash).
const fx = {
  leaf1: await fromSheet('fx-leaf-1', 931, 951),
  leaf2: await fromSheet('fx-leaf-2', 981, 922),
  leaf3: await fromSheet('fx-leaf-3', 886, 970),
  leaf4: await fromSheet('fx-leaf-4', 961, 970),
  butterflyOrange: await fromSheet('fx-butterfly-1', 837, 926),
  butterflyBlue: await fromSheet('fx-butterfly-2', 882, 924),
  birdWhite: await fromSheet('fx-bird-1', 770, 928),
  birdBrown: await fromSheet('fx-bird-2', 784, 973),
  sparkle: await fromSheet('fx-sparkle', 1196, 924),
  smoke: await fromSheet('fx-smoke', 1080, 950),
  splash: await fromSheet('fx-splash', 1450, 826),
  flower: await fromSheet('fx-flower', 914, 1000),
};

// ——— 4. Island: the painting itself ———
const island = Buffer.from(M);

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

/** The pond's outline (measured on the first painting). */
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
].map(wPt);

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
].map(wBox);
for (const box of KOI) {
  const fish = (r, g, b) => !(r < 40 && g > 145 && b > 170);
  // The painted koi are painted out; the swimming ones are the sheet's (below).
  // The repaint's koi are a little larger than their boxes and carry a pale halo of lit water.
  const PAD = 7;
  for (let y = box[1] - 12; y <= box[3] + 12; y++)
    for (let x = box[0] - 12; x <= box[2] + 12; x++) {
      const p = y * W + x;
      const [r, g, b] = px(p);
      const inside =
        x >= box[0] - PAD && x <= box[2] + PAD && y >= box[1] - PAD && y <= box[3] + PAD;
      // Near the fish anything that is not clean water; further out only the darker shadow.
      if ((inside && fish(r, g, b)) || (r < 40 && g < 186 && b < 213)) removed[p] = 1;
    }
}
// The little fifth koi beside the fourth one (repaint only).
for (let y = 730; y <= 758; y++)
  for (let x = 1060; x <= 1084; x++) {
    const [r, g, b] = px(y * W + x);
    if (!(r < 40 && g > 145 && b > 170)) removed[y * W + x] = 1;
  }
/**
 * A koi from the asset sheet, made ready to swim: the water puddle baked under it is cut away
 * (only the fish's own blob is kept, holes in it filled from their rim), then it is turned so its
 * body lies flat with the nose to the right; the runtime bends it in strips along that axis and
 * turns it to its heading. `len` is the drawn length in picture px; `nose` is where the head is
 * on the sheet; `modulate` recolours a copy into another variety.
 */
async function sheetKoi(id, at, { nose, len, modulate, start }) {
  const s = sheetItem(at[0], at[1], id);
  const { data: d, info: si } = await sharp(join(SHEET, s.file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = si.width;
  const h = si.height;
  const n = w * h;
  for (let p = 0; p < n; p++) if (d[p * 4 + 2] - d[p * 4] > 45 && d[p * 4] < 170) d[p * 4 + 3] = 0;
  // Largest blob of solid pixels (the puddle's foam rim is a ring of loose dots).
  const comp = new Int32Array(n).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let p0 = 0, c = 0; p0 < n; p0++) {
    if (comp[p0] >= 0 || d[p0 * 4 + 3] < 100) continue;
    const stack = [p0];
    comp[p0] = c;
    let size = 0;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % w;
      for (const dy of [-1, 0, 1])
        for (const dx of [-1, 0, 1]) {
          const qx = x + dx;
          const q = p + dy * w + dx;
          if (qx < 0 || qx >= w || q < 0 || q >= n || comp[q] >= 0 || d[q * 4 + 3] < 100) continue;
          comp[q] = c;
          stack.push(q);
        }
    }
    if (size > bestSize) ((bestSize = size), (best = c));
    c++;
  }
  // Transparent pixels the outside cannot reach are holes in the fish (water showing through).
  const outside = new Uint8Array(n);
  const stack = [];
  for (let p = 0; p < n; p++) {
    const x = p % w;
    const y = (p / w) | 0;
    if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && comp[p] !== best)
      ((outside[p] = 1), stack.push(p));
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
      if (q >= 0 && q < n && !outside[q] && comp[q] !== best) ((outside[q] = 1), stack.push(q));
  }
  let hole = [];
  for (let p = 0; p < n; p++) {
    if (outside[p]) {
      if (comp[p] !== best) d[p * 4 + 3] = 0;
    } else if (comp[p] !== best) hole.push(p);
    else d[p * 4 + 3] = Math.max(d[p * 4 + 3], 200);
  }
  const known = new Uint8Array(n);
  for (let p = 0; p < n; p++) known[p] = comp[p] === best ? 1 : 0;
  while (hole.length) {
    const next = [];
    const fill = [];
    for (const p of hole) {
      const x = p % w;
      const acc = [0, 0, 0, 0];
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
        if (q >= 0 && q < n && known[q]) {
          for (let c = 0; c < 3; c++) acc[c] += d[q * 4 + c];
          acc[3]++;
        }
      if (acc[3]) fill.push([p, acc]);
      else next.push(p);
    }
    if (!fill.length) break;
    for (const [p, acc] of fill) {
      for (let c = 0; c < 3; c++) d[p * 4 + c] = acc[c] / acc[3];
      d[p * 4 + 3] = 255;
      known[p] = 1;
    }
    hole = next;
  }
  // Body axis (principal axis of the blob).
  let sx = 0;
  let sy = 0;
  let sn = 0;
  for (let p = 0; p < n; p++) if (d[p * 4 + 3] > 128) ((sx += p % w), (sy += (p / w) | 0), sn++);
  const mx = sx / sn;
  const my = sy / sn;
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (let p = 0; p < n; p++)
    if (d[p * 4 + 3] > 128) {
      const x = (p % w) - mx;
      const y = ((p / w) | 0) - my;
      cxx += x * x;
      cyy += y * y;
      cxy += x * y;
    }
  let axis = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
  let img = sharp(d, { raw: { width: w, height: h, channels: 4 } });
  if (nose === 'left') {
    img = sharp(await img.flop().raw().toBuffer(), { raw: { width: w, height: h, channels: 4 } });
    axis = -axis;
  }
  const { data: r, info: ri } = await img
    .rotate(-axis, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Trim to the fish.
  let [x0, y0, x1, y1] = [ri.width, ri.height, 0, 0];
  for (let y = 0; y < ri.height; y++)
    for (let x = 0; x < ri.width; x++)
      if (r[(y * ri.width + x) * 4 + 3] > 24) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  let out = sharp(r, { raw: { width: ri.width, height: ri.height, channels: 4 } }).extract({
    left: x0,
    top: y0,
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
  });
  if (modulate) out = sharp(await out.png().toBuffer()).modulate(modulate);
  const file = `${id}.webp`;
  await out.webp({ quality: 92, alphaQuality: 95 }).toFile(join(OUT, file));
  const fw = x1 - x0 + 1;
  const fh = y1 - y0 + 1;
  const dh = Math.round((len * fh) / fw);
  return {
    file,
    x: Math.round(start[0] - len / 2),
    y: Math.round(start[1] - dh / 2),
    w: len,
    h: dh,
  };
}
{
  // Sheet koi (picked by where it sits on the sheet): the white-and-red one lying flat, in five
  // colourings (the sheet's other koi are arched or turned, and one has water through its body).
  const centre = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  const LONG = [1380, 700];
  const KOI_FISH = [
    { len: 66, start: centre(KOI[0]) },
    { len: 60, start: centre(KOI[1]), modulate: { hue: 12, brightness: 1.08 } },
    { len: 58, start: centre(KOI[2]), modulate: { hue: 30, brightness: 1.1 } },
    { len: 56, start: centre(KOI[3]), modulate: { hue: -10, saturation: 1.15 } },
    { len: 44, start: [1072, 744], modulate: { hue: 10 } },
  ];
  for (const [k, f] of KOI_FISH.entries()) {
    const id = `koi-${k + 1}`;
    sprites[id] = await sheetKoi(id, LONG, { ...f, nose: 'left' });
  }
}
// Chickens: the two painted hens are painted out; the yard gets four hens from the asset sheet
// instead (different breeds and poses, so each can keep its own pace and habits). Measured on the
// repaint: hen left of the coop x 1240..1270, y 446..492; hen at its right x 1373..1400,
// y 460..499 (the coop's corner post above its head, x 1380..1387 above y 468, is kept).
{
  const m = new Uint8Array(N);
  const isCoopPost = (x, y) => x >= 1380 && x <= 1387 && y < 468;
  for (let y = 436; y <= 510; y++)
    for (let x = 1225; x <= 1415; x++) {
      const [r, g, b] = px(y * W + x);
      const hen1 = inEllipse([1255, 469, 17, 25], x, y) < 1;
      const hen2 = inEllipse([1387, 480, 16, 22], x, y) < 1 && !isCoopPost(x, y);
      // Their soft shadows on the sand, just below the feet.
      const shadow =
        isSand(r, g, b) &&
        r < 215 &&
        (inEllipse([1255, 491, 21, 6], x, y) < 1 || inEllipse([1388, 498, 21, 6], x, y) < 1);
      if (hen1 || hen2 || shadow) m[y * W + x] = 1;
    }
  dilate(m, 2);
  for (let p = 0; p < N; p++) if (m[p] && !isCoopPost(p % W, (p / W) | 0)) removed[p] = 1;
  // Sheet hens, scaled to the painted ones (~46 px tall), feet at the bottom centre. `faces` is
  // the side the head points to on the sheet, so the runtime flips the right way.
  const HENS = [
    { id: 'chicken-1', at: [1273, 388], faces: 'right', start: [1238, 474] },
    { id: 'chicken-2', at: [1324, 388], faces: 'left', start: [1186, 458] },
    { id: 'chicken-3', at: [1286, 442], faces: 'left', start: [1418, 468] },
    { id: 'chicken-4', at: [1334, 442], faces: 'left', start: [1458, 458] },
  ];
  for (const h of HENS) {
    const s = sheetItem(h.at[0], h.at[1], h.id);
    const tall = 46;
    const k = tall / s.h;
    const w = Math.round(s.w * k);
    const file = `${h.id}.webp`;
    await sharp(join(SHEET, s.file))
      .resize(w, tall)
      .webp({ quality: 92, alphaQuality: 95 })
      .toFile(join(OUT, file));
    const feet = [Math.round(w / 2), tall - 4];
    sprites[h.id] = {
      file,
      x: h.start[0] - feet[0],
      y: h.start[1] - feet[1],
      w,
      h: tall,
      feet: h.start,
      faces: h.faces,
    };
  }
}
// Cows stay painted in the island: they move as soft-edged copies of themselves (body breathing
// and shifting weight, head grazing and nodding, tail swishing). The motion is a few pixels, so
// the painting underneath fills in and nothing shows a cut edge.
const COWS = [
  // Yard cow (in front of the barn door, facing left).
  {
    id: 'cowY',
    body: [1328, 368, 36, 33],
    head: [1308, 360, 18, 24],
    neck: [1327, 362],
    feet: [1330, 398],
  },
  // House cow (by the tree, facing left).
  {
    id: 'cowH',
    body: [895, 189, 37, 36],
    head: [877, 182, 19, 25],
    neck: [896, 186],
    feet: [896, 224],
    tail: [918, 156, 6, 5],
    tailPivot: [914, 159],
  },
].map((c) => ({
  ...c,
  body: wEll(c.body),
  head: wEll(c.head),
  neck: wPt(c.neck),
  feet: wPt(c.feet),
  ...(c.tail ? { tail: wEll(c.tail), tailPivot: wPt(c.tailPivot) } : {}),
}));
for (const c of COWS) {
  const soft = async (id, e, feather) =>
    sprite(
      id,
      M,
      [
        Math.floor(e[0] - e[2] - 2),
        Math.floor(e[1] - e[3] - 2),
        Math.ceil(e[0] + e[2] + 2),
        Math.ceil(e[1] + e[3] + 2),
      ],
      (x, y) => ellipseWeight(e, x, y, feather),
    );
  sprites[`${c.id}-body`] = { ...(await soft(`${c.id}-body`, c.body, 7)), feet: c.feet };
  sprites[`${c.id}-head`] = { ...(await soft(`${c.id}-head`, c.head, 6)), base: c.neck };
  if (c.tail)
    sprites[`${c.id}-tail`] = { ...(await soft(`${c.id}-tail`, c.tail, 3)), base: c.tailPivot };
}
// Windmill blades: four arms round the hub, in the tilted plane of the sails.
const HUB = wPt([868, 285]);
const TIPS = [
  [828, 230],
  [904, 247],
  [908, 328],
  [827, 320],
].map(wPt);
const armPoly = ([tx, ty], half) => {
  const dx = tx - HUB[0];
  const dy = ty - HUB[1];
  const l = Math.hypot(dx, dy);
  const nx = (-dy / l) * half;
  const ny = (dx / l) * half;
  // Past the measured tip: the repaint's sail ends reach a little further.
  const ex = tx + (dx / l) * 9;
  const ey = ty + (dy / l) * 9;
  return [
    [HUB[0] + nx, HUB[1] + ny],
    [ex + nx, ey + ny],
    [ex - nx, ey - ny],
    [HUB[0] - nx, HUB[1] - ny],
  ];
};
// The repaint's sails are broad (≈ 16 px) and the upper-right one carries an orange cloth: all of
// it is painted out with a generous mask (a narrow one lets the fill copy the sail back from its
// own edge). The turning sails are the asset sheet's separate windmill blades, sized to span the
// painted ones, their hub on the painted hub.
const ARMS = TIPS.map((t) => armPoly(t, 13));
const inBlades = (x, y) =>
  ARMS.some((a) => inPoly(a, x, y)) ||
  Math.hypot(x - HUB[0], y - HUB[1]) < 13 ||
  inEllipse([887, 267, 18, 17], x, y) < 1;
{
  const [x0, y0, x1, y1] = wBox([810, 210, 926, 346]);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (inBlades(x, y)) removed[y * W + x] = 1;
  // The ends of the two upper sails reach past the measured tips (repaint): their wood, not the
  // grass and path round it.
  for (const e of [
    [835, 239, 13, 12],
    [894, 240, 13, 12],
  ])
    for (let y = e[1] - e[3]; y <= e[1] + e[3]; y++)
      for (let x = e[0] - e[2]; x <= e[0] + e[2]; x++) {
        const [r, g, b] = px(y * W + x);
        const ground = isLeaf(r, g, b) || (r > 200 && g > 175 && b > 130);
        if (inEllipse(e, x, y) < 1 && !ground) removed[y * W + x] = 1;
      }
  // Sheet blades (sprite on the sheet at 1260,238, 111×122): hub and arm ends in its own pixels.
  const s = sheetItem(1315, 300, 'blades');
  const HUB_AT = [53, 60];
  const ENDS = [
    [12, 10],
    [100, 23],
    [88, 108],
    [13, 107],
  ];
  // Span of the painted sails (tip to opposite tip), matched by the sheet sails.
  const span =
    (Math.hypot(TIPS[0][0] - TIPS[2][0], TIPS[0][1] - TIPS[2][1]) +
      Math.hypot(TIPS[1][0] - TIPS[3][0], TIPS[1][1] - TIPS[3][1])) /
    2;
  const sheetSpan =
    (Math.hypot(ENDS[0][0] - ENDS[2][0], ENDS[0][1] - ENDS[2][1]) +
      Math.hypot(ENDS[1][0] - ENDS[3][0], ENDS[1][1] - ENDS[3][1])) /
    2;
  const k = (span * 1.04) / sheetSpan;
  const w = Math.round(s.w * k);
  const h = Math.round(s.h * k);
  await sharp(join(SHEET, s.file))
    .resize(w, h)
    .webp({ quality: 92, alphaQuality: 95 })
    .toFile(join(OUT, 'blades.webp'));
  const x = Math.round(HUB[0] - HUB_AT[0] * k);
  const y = Math.round(HUB[1] - HUB_AT[1] * k);
  sprites.blades = {
    file: 'blades.webp',
    x,
    y,
    w,
    h,
    hub: HUB,
    tips: ENDS.map(([ex, ey]) => [x + ex * k, y + ey * k]),
  };
}
// Lily pads and painted sprouts: cut by colour inside a small ellipse, painted out underneath.
const LILIES = [
  [828, 733, 16, 9],
  [850, 748, 15, 8],
  [835, 760, 11, 6],
  [948, 666, 14, 6],
  [1244, 625, 22, 10],
  [1290, 641, 20, 9],
].map(wEll);
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
].map((s) => ({ ...s, e: wEll(s.e), base: wPt(s.base) }));
for (const s of SPROUTS) {
  const box = [s.e[0] - s.e[2], s.e[1] - s.e[3], s.e[0] + s.e[2], s.e[1] + s.e[3]];
  // Leaves, their dark outlines and the bright highlights of the repaint's glossier leaves.
  const leafy = (r, g, b) =>
    ((isLeaf(r, g, b) && g > 70) ||
      (isDark(r, g, b) && g > r * 0.9) ||
      (g > r + 25 && g > b + 25)) &&
    // ...but not the pale grass strip along the fence the top tiles touch.
    r < 110;
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
  // Paint out a pixel wider than the sprite: stray leaf tips would stay painted on the soil.
  dilate(m, 2);
  for (let p = 0; p < N; p++) if (m[p]) removed[p] = 1;
}
// The white goose by the well (measured on the repaint, x 446..479, y 313..352): cut along its
// outline (everything in its ellipse that is not grass), painted out, and drawn as two pieces so
// it can bob and peck: the head and neck turn about the neck root, the body breathes.
{
  const E = [463, 333, 19, 22];
  const grass = (r, g, b) => hue(r, g, b) > 58 && hue(r, g, b) < 170 && sat(r, g, b) > 0.3;
  const m = new Uint8Array(N);
  const box = [E[0] - E[2], E[1] - E[3], E[0] + E[2], E[1] + E[3]];
  for (let y = box[1]; y <= box[3]; y++)
    for (let x = box[0]; x <= box[2]; x++) {
      const [r, g, b] = px(y * W + x);
      if (inEllipse(E, x, y) < 1 && !grass(r, g, b)) m[y * W + x] = 1;
    }
  // Its dark outline reads as olive green: take the darker rim round the cut too.
  {
    const rim = Uint8Array.from(m);
    dilate(rim, 1);
    for (let p = 0; p < N; p++) if (rim[p] && !m[p] && Math.max(...px(p)) < 150) m[p] = 1;
  }
  // Head and neck: the upper-left lobe, down to just past the neck root (overlaps the body).
  const NECK = [458, 330];
  const inHead = (x, y) => x <= 469 && y <= 333 && !(x > 463 && y > 326);
  const soft = (p) => (m[p] ? 1 : 0);
  sprites['goose-body'] = {
    ...(await sprite('goose-body', M, box, (x, y, r, g, b, p) =>
      inHead(x, y) && y < 328 ? 0 : soft(p),
    )),
    feet: [463, 351],
  };
  sprites['goose-head'] = {
    ...(await sprite('goose-head', M, [446, 310, 470, 334], (x, y, r, g, b, p) =>
      inHead(x, y) ? soft(p) : 0,
    )),
    base: NECK,
  };
  // Paint out the goose and its shadow (everything in the ellipse but sunlit grass); the runtime
  // draws a soft shadow under it.
  for (let y = box[1]; y <= box[3]; y++)
    for (let x = box[0]; x <= box[2]; x++) {
      const p = y * W + x;
      const [r, g, b] = px(p);
      if (inEllipse(E, x, y) < 1.1 && !(grass(r, g, b) && Math.max(r, g, b) > 150)) m[p] = 1;
    }
  dilate(m, 1);
  for (let p = 0; p < N; p++) if (m[p]) removed[p] = 1;
}
dilate(removed, 1);
for (let p = 0; p < N; p++) if (removed[p]) island[p * 4 + 3] = 255;
inpaintGuided(island, removed);

/**
 * Patch fill: each hole in `zone` (a connected piece of `mask`) takes a whole piece of the
 * painting from somewhere nearby, the offset chosen where the pixels round the hole match best,
 * and the copy is blended into a 3 px band round the hole. Brush strokes, glints and grain carry
 * on unbroken instead of the smears and streaks a pixel-by-pixel fill leaves on large holes.
 * `srcOk(x, y)` limits where a copy may come from (e.g. open water only), failing for at most a
 * `budget` fraction of the piece (glints, specks); `keep(x, y)` leaves
 * hole pixels out (filled some other way).
 */
function patchFill(
  buf,
  mask,
  zone,
  { srcOk = () => true, keep = () => false, R = 90, budget = 0 } = {},
) {
  const [zx0, zy0, zx1, zy1] = zone;
  const seen = new Uint8Array(N);
  let filled = 0;
  for (let y = zy0; y <= zy1; y++)
    for (let x = zx0; x <= zx1; x++) {
      const p0 = y * W + x;
      if (!mask[p0] || seen[p0] || keep(x, y)) continue;
      // One hole.
      const comp = [];
      const stack = [p0];
      seen[p0] = 1;
      while (stack.length) {
        const p = stack.pop();
        comp.push(p);
        const px0 = p % W;
        for (const dy of [-1, 0, 1])
          for (const dx of [-1, 0, 1]) {
            const qx = px0 + dx;
            const q = p + dy * W + dx;
            const qy = (q / W) | 0;
            if (qx < zx0 || qx > zx1 || qy < zy0 || qy > zy1) continue;
            if (seen[q] || !mask[q] || keep(qx, qy)) continue;
            seen[q] = 1;
            stack.push(q);
          }
      }
      // Band round it: distance 1..3.
      const dist = new Map();
      for (const p of comp) dist.set(p, 0);
      let front = comp;
      for (let d = 1; d <= 3; d++) {
        const next = [];
        for (const p of front) {
          const px0 = p % W;
          for (const q of [px0 > 0 ? p - 1 : -1, px0 < W - 1 ? p + 1 : -1, p - W, p + W])
            if (q >= 0 && q < N && !dist.has(q) && !mask[q] && buf[q * 4 + 3]) {
              dist.set(q, d);
              next.push(q);
            }
        }
        front = next;
      }
      const all = [...dist.keys()];
      const band = all.filter((p) => dist.get(p) > 0);
      let best = null;
      let bestCost = Infinity;
      for (let dy = -R; dy <= R; dy += 2)
        for (let dx = -R; dx <= R; dx += 2) {
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) continue;
          const off = dy * W + dx;
          let ok = true;
          let misses = Math.floor(all.length * budget);
          for (const p of all) {
            const q = p + off;
            const qx = (p % W) + dx;
            if (q < 0 || q >= N || qx < 0 || qx >= W || mask[q] || !buf[q * 4 + 3]) {
              ok = false;
              break;
            }
            if (!srcOk(qx, (q / W) | 0) && --misses < 0) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          let cost = 0;
          for (const p of band) {
            const q = p + off;
            for (let c = 0; c < 3; c++) cost += (buf[p * 4 + c] - buf[q * 4 + c]) ** 2;
            if (cost >= bestCost) break;
          }
          // Prefer nearby pieces (same light, same depth).
          cost += Math.hypot(dx, dy) * band.length * 2;
          if (cost < bestCost) ((bestCost = cost), (best = off));
        }
      if (best === null) continue;
      const src = Buffer.from(buf);
      const mix = [1, 0.6, 0.35, 0.15];
      for (const p of all) {
        const k = mix[dist.get(p)];
        for (let c = 0; c < 3; c++)
          buf[p * 4 + c] = Math.round(src[p * 4 + c] * (1 - k) + src[(p + best) * 4 + c] * k);
      }
      filled++;
    }
  return filled;
}

// The pond where the koi were painted: whole pieces of open water (glints and all).
{
  const waterish = (x, y) => {
    const p = y * W + x;
    return inPoly(POND, x, y) && island[p * 4 + 2] - island[p * 4] > 40;
  };
  const n = patchFill(island, removed, wBox([880, 690, 1150, 820]), { srcOk: waterish });
  console.log(`farm-anim: pond patches ${n}`);
}
// Round the coop (the painted hens) and the goose by the well.
// Left of the coop door: sand and its own shadow only (never a piece of the coop). The hen by
// the ramp: right of the coop's corner post, sand and grass from the yard to its right.
patchFill(island, removed, [1215, 430, 1300, 512], {
  R: 190,
  budget: 0.12,
  srcOk: (x, y) => {
    const [r, g, b] = px(y * W + x);
    return (
      y < 490 &&
      isSand(r, g, b) &&
      sat(r, g, b) < 0.42 &&
      !(x > 1255 && x < 1392 && y > 395 && y < 532)
    );
  },
});
patchFill(island, removed, [1389, 440, 1420, 512], {
  R: 120,
  budget: 0.1,
  srcOk: (x, y) => {
    const [r, g, b] = px(y * W + x);
    return x > 1400 && (isSand(r, g, b) || isLeaf(r, g, b));
  },
});
patchFill(island, removed, [436, 300, 490, 362], { R: 50 });

// Windmill: the tower under the sails is rebuilt from its own visible stone (see towerFill), the
// path and grass round it take patches of path and grass.
const TOWER = {
  cx: 872,
  // [y, half width] down the silhouette: dome cap, its rim, the cone, the base ring.
  rows: [
    [247, 3],
    [249, 8],
    [253, 13],
    [258, 16],
    [263, 18],
    [266, 20],
    [268, 19],
    [280, 24],
    [300, 30],
    [324, 34],
  ],
};
const towerHalf = (y) => {
  const r = TOWER.rows;
  if (y < r[0][0] || y > r[r.length - 1][0]) return -1;
  for (let i = 1; i < r.length; i++)
    if (y <= r[i][0])
      return r[i - 1][1] + ((r[i][1] - r[i - 1][1]) * (y - r[i - 1][0])) / (r[i][0] - r[i - 1][0]);
  return -1;
};
const inTower = (x, y, pad = 0) => {
  const h = towerHalf(y);
  return h >= 0 && Math.abs(x - TOWER.cx) <= h + pad;
};
{
  const zone = wBox([800, 200, 940, 350]);
  patchFill(island, removed, zone, {
    keep: (x, y) => inTower(x, y, 1),
    // Only grass and path may be copied in (not crates, sails or the tower).
    srcOk: (x, y) => {
      if (inTower(x, y, 3)) return false;
      const [r, g, b] = px(y * W + x);
      return isLeaf(r, g, b) || isSand(r, g, b) || (r > 200 && g > 180 && b > 140);
    },
    R: 70,
  });
  // Tower and cap, painted in: the stone colour sampled from the tower's visible flank, shaded
  // round the cone (light from the left), curved stone courses, a dark outline; the cap a brown
  // dome with ribs and a wooden rim. Only the hole pixels are painted; the tower's own visible
  // pixels stay as painted.
  const CAP_END = 266;
  let [sr, sg, sb, sn] = [0, 0, 0, 0];
  for (let y = 285; y <= 318; y++)
    for (let x = TOWER.cx - 34; x <= TOWER.cx + 34; x++) {
      const p = y * W + x;
      if (removed[p] || !inTower(x, y, -4)) continue;
      const [r, g, bb] = px(p);
      if (r + g + bb < 480) continue;
      ((sr += r), (sg += g), (sb += bb), sn++);
    }
  const stone = sn ? [sr / sn, sg / sn, sb / sn] : [205, 190, 175];
  // Shading across the cone, as painted: mean colour of the visible stone in bins of u.
  const BINS = 16;
  const prof = Array.from({ length: BINS }, () => [0, 0, 0, 0]);
  for (let y = 272; y <= 320; y++)
    for (let x = TOWER.cx - 34; x <= TOWER.cx + 34; x++) {
      const p = y * W + x;
      if (removed[p] || !inTower(x, y, -2)) continue;
      const [r, g, bb] = px(p);
      if (r + g + bb < 300) continue; // outline and course lines
      const i = Math.min(BINS - 1, Math.floor((((x - TOWER.cx) / towerHalf(y) + 1) / 2) * BINS));
      prof[i][0] += r;
      prof[i][1] += g;
      prof[i][2] += bb;
      prof[i][3]++;
    }
  const shadeAt = (u) => {
    const f = ((u + 1) / 2) * BINS - 0.5;
    const pick = (i) => {
      const b = prof[Math.max(0, Math.min(BINS - 1, i))];
      return b[3] > 6 ? b.slice(0, 3).map((c) => c / b[3]) : null;
    };
    const i0 = Math.floor(f);
    const a = pick(i0);
    const b = pick(i0 + 1);
    if (a && b) return a.map((c, k) => c + (b[k] - c) * (f - i0));
    return a ?? b ?? null;
  };
  const OUTLINE = [84, 58, 44];
  let seed = 11;
  const grain = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 8;
  const [x0, y0, x1, y1] = zone;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const p = y * W + x;
      if (!removed[p] || !inTower(x, y, 1)) continue;
      const hw = Math.max(1, towerHalf(y));
      const u = Math.max(-1, Math.min(1, (x - TOWER.cx) / hw));
      let col;
      if (y < CAP_END) {
        const rimBand = y >= CAP_END - 3;
        const base = rimBand ? [176, 124, 78] : [126, 84, 60];
        let k = 1.18 - 0.42 * ((u + 1) / 2);
        // Ribs down the dome.
        if (!rimBand && Math.abs((((u + 1) * 3) % 1) - 0.5) > 0.42) k *= 0.82;
        col = base.map((c) => c * k);
      } else {
        const painted = shadeAt(u);
        let k = painted ? 1 : 1.0 - 0.32 * Math.max(0, u) ** 1.3 - 0.07 * Math.max(0, -u) ** 2;
        // Stone courses, bowed down at the middle like the painted ones.
        const yc = (y - CAP_END - 3 * (1 - u * u) + 90) % 9;
        if (yc < 1) k *= 0.8;
        col = (painted ?? stone).map((c) => c * k);
      }
      // Outline along the silhouette.
      const edge = Math.abs(u) > 0.93 || y < 249;
      if (edge) col = OUTLINE;
      const j = edge ? 0 : grain();
      for (let c = 0; c < 3; c++)
        island[p * 4 + c] = Math.max(0, Math.min(255, Math.round(col[c] + j)));
    }
}

// ——— 6. Soft overlay layers (bend in the wind over the painting) ———
// kind: tree crown parts, bush, grass, flower, reed, crop field fringe, hay, dock.
// e = ellipse [cx, cy, rx, ry] in picture px, pivot = the point that stays put (stem base).
// sky: the crown also replaces the island's edge pixels against the sky (no ghost edge there).
const L = (id, kind, e, pivot, opts = {}) => ({ id, kind, e: wEll(e), pivot: wPt(pivot), ...opts });
/** A layer measured on the repaint itself (no warp). */
const P = (id, kind, e, pivot, opts = {}) => ({ id, kind, e, pivot, ...opts });
/** Leaf pixels behind the glass: not the orange frame, its dark rim, or white glints. */
const glassPlant = (r, g, b) =>
  !(r > 150 && g > 70 && b < 110 && r - b > 80) && r + g + b > 200 && Math.max(r, g, b) < 236;
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
  // Plants behind the greenhouse glass (measured on the repaint): only the leaves move, the glass
  // frame and its highlights are left out of the cut (see glassPlant).
  P('glass-plant-1', 'indoor', [1048, 128, 20, 13], [1048, 140]),
  P('glass-plant-2', 'indoor', [1104, 136, 22, 15], [1104, 150]),
  P('glass-plant-3', 'indoor', [1146, 162, 22, 14], [1146, 175]),
  P('glass-plant-4', 'indoor', [1190, 190, 20, 14], [1190, 203]),
  P('glass-plant-5', 'indoor', [1236, 226, 20, 14], [1236, 239]),
  P('glass-plant-6', 'indoor', [1286, 240, 18, 16], [1286, 255]),
];
const fruitPx = (r, g, b) => r > 190 && g > 120 && b < 90 && r - g < 110;
const islandNow = Buffer.from(island);
// Greenhouse plants: leaf pixels, shrunk a pixel away from the frame so the bars never move.
const indoorMask = new Float32Array(N);
{
  const off = new Uint8Array(N);
  for (const l of LAYERS.filter((x) => x.kind === 'indoor')) {
    const [cx, cy, rx, ry] = l.e;
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++)
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        const p = y * W + x;
        if (!glassPlant(...px(p))) off[p] = 1;
        indoorMask[p] = 1;
      }
  }
  dilate(off, 1);
  for (let p = 0; p < N; p++) if (off[p]) indoorMask[p] = 0;
}
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
      (islandNow[p * 4 + 3] ? w(x, y) : 0) *
      (l.fruit && fruitPx(r, g, b) ? 0 : 1) *
      (l.kind === 'indoor' ? indoorMask[p] : 1),
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
const water = await maskFile(
  'water-mask.png',
  wBox([760, 560, 1440, 930]).map((v, i) => Math.max(0, Math.min(i % 2 ? H - 1 : W - 1, v))),
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
].map(wPt);
const glass = await maskFile(
  'glass-mask.png',
  polyBox(GLASS),
  (x, y, r, g, b) => inPoly(GLASS, x, y) && r + g + b > 500 && sat(r, g, b) < 0.25,
);

// ——— 7b. Field plots: the game's 9 plots on the painted lattice, and an empty-soil tile ———
// Lattice measured on the seams (i along R, j along L). Plots 1–6 are the painted tilled tiles,
// 7–9 (unlocked later) the grass column beside them, back to front, closing a 3×3 field; the
// runtime stamps soil on unlocked ones.
const FIELD = { v0: wPt([620, 342]), R: wVec([88, 51]), L: wVec([-92.5, 43.5]) };
const corner = (i, j) => [
  FIELD.v0[0] + FIELD.R[0] * i + FIELD.L[0] * j,
  FIELD.v0[1] + FIELD.R[1] * i + FIELD.L[1] * j,
];
const tileQuad = (i, j) => [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
const PLOT_TILES = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [0, 2],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
];
const plots = PLOT_TILES.map(([i, j], k) => ({
  id: k + 1,
  quad: tileQuad(i, j),
  centre: corner(i + 0.5, j + 0.5),
}));
let soilTile;
{
  // Tile (1, 2) with its painted seed clump patched from the soil beside it.
  const pix = Buffer.from(M);
  const [cx, cy] = wPt([525, 522]).map(Math.round);
  for (let y = cy - 18; y <= cy + 14; y++)
    for (let x = cx - 26; x <= cx + 26; x++) {
      const e = Math.hypot((x - cx) / 26, (y - cy + 2) / 16);
      if (e > 1) continue;
      const t = Math.min(1, (1 - e) / 0.35);
      for (let c = 0; c < 3; c++)
        pix[(y * W + x) * 4 + c] =
          pix[(y * W + x) * 4 + c] * (1 - t) + M[((y + 6) * W + x - 44) * 4 + c] * t;
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
  soilTile = {
    ...(await sprite('tile-soil', pix, [box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3], (x, y) =>
      Math.max(0, Math.min(1, (edge(x + 0.5, y + 0.5) + 2.5) / 2.5)),
    )),
    anchor: corner(1, 2),
  };
}

// ——— 8. Places for things drawn by the runtime ———
const chimneyTop = wPt([770, 30]);
const doorBox = wBox([740, 240, 780, 293]);
const pondC = wPt([1060, 760]);
/** Rectangle [x0, y0, x1, y1] measured on the first painting, carried over. */
const rect = (r) => wBox(r);
const places = {
  chimney: {
    x: chimneyTop[0],
    ridge: [
      [698, 85],
      [820, 33],
    ].map(wPt),
    top: chimneyTop[1],
    w: Math.round(15 * SCALE),
  },
  // [x, y, w, h]: the top-left corner moves, the size scales.
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
  ].map(([x, y, w, h]) => [...wPt([x, y]), Math.round(w * SCALE), Math.round(h * SCALE)]),
  door: { x0: doorBox[0], y0: doorBox[1], x1: doorBox[2], y1: doorBox[3] },
  dockPosts: [
    [993, 646],
    [1026, 658],
    [1066, 683],
    [1130, 651],
  ].map(wPt),
  rope: { from: wPt([1131, 600]), to: wPt([1137, 640]) },
  pond: { cx: pondC[0], cy: pondC[1], rx: Math.round(230 * SCALE), ry: 70, poly: POND },
  // Tap areas checked after the animals and the pond: [place, x0, y0, x1, y1].
  taps: [
    ['market', ...rect([845, 60, 1345, 300])],
    ['farmhouse', ...rect([470, 10, 860, 300])],
  ],
  // Tap ellipses round the cows [cx, cy, rx, ry].
  cowSpots: [
    [1328, 368, 38, 34],
    [895, 189, 38, 36],
  ].map(wEll),
  hens: {
    // Two patches either side of the coop [x0, y0, x1, y1].
    zones: [rect([1150, 448, 1250, 492]), rect([1395, 440, 1470, 488])],
    // The yard's front fence, as a line the hens stay behind: from, to.
    fence: [wPt([1130, 457]), wPt([1257, 500])],
    // The coop itself (no walking through it).
    coop: rect([1255, 395, 1392, 532]),
  },
  // Where the game's need bubbles float over the animals.
  bubbles: { cow: wPt([1296, 318]), chicken: wPt([1350, 384]) },
  // Camera stops in the game: the field, the barn yard.
  focus: { field: wPt([560, 470]), barn: wPt([1230, 430]) },
  // Band of sky the birds cross (picture y).
  skyBand: [40, 230],
};
const layout = {
  size: [W, H],
  field: { ...FIELD, plots, soil: soilTile },
  clouds,
  sprites,
  layers,
  lilies,
  water,
  glass,
  places,
  koi: KOI,
  fx,
};
writeFileSync(join(OUT, 'layers.json'), `${JSON.stringify(layout)}\n`);
console.log(
  `farm-anim: ${clouds.length} clouds (${clouds.filter((c) => c.bank).length} banks), ${Object.keys(sprites).length} sprites, ${layers.length} layers`,
);
