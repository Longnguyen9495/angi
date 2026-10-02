import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/*
 * Splits the generated asset sheet into one transparent PNG per item.
 *
 * The sheet (15_NEW_REFERENCE_AND_SPRITE_SHEET/GENERATED_FARM_ASSET_SPRITE_SHEET.png) has no alpha:
 * its "transparency" is a painted, slightly irregular light-grey checkerboard with compression
 * noise. A pixel counts as background when it is light and nearly grey AND the checker pattern
 * (both its darker and its lighter squares) is around it, so the flat whites inside clouds,
 * chickens and smoke stay. Background regions are taken from the sheet border inward, plus closed
 * pockets that clearly carry the pattern (inside fences, between windmill blades).
 * Every remaining blob is one item; crumbs right next to a bigger item join it.
 *
 * Out (in the pack, next to the sheet):
 *   16_EXTRACTED_SPRITES/sprite-NNN.png   one item each, cropped with a small margin
 *   16_EXTRACTED_SPRITES/index.json       number → box on the sheet, size
 *   16_EXTRACTED_SPRITES/_contact.png     all items on a dark background, numbered
 *
 * Run: node scripts/farm-anim/split-sprite-sheet.mjs
 */

const PACK = resolve('assets/farm/pack-v4');
const SRC = join(PACK, '15_NEW_REFERENCE_AND_SPRITE_SHEET/GENERATED_FARM_ASSET_SPRITE_SHEET.png');
const OUT = join(PACK, '16_EXTRACTED_SPRITES');

/** Look-around radius (px) for the checker pattern; about half a checker square. */
const R = 5;
/** Items smaller than this (px) are noise, unless they sit right next to a bigger item. */
const MIN_ITEM = 140;
/** A crumb this close (px) to a bigger item belongs to it. */
const JOIN_GAP = 6;
/** Crumbs smaller than this (px) are dropped rather than joined. */
const DUST = 30;
const PAD = 4;

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;

// ——— 1. Per-pixel tests ———
const light = new Uint8Array(N); // light and nearly grey: could be background
const warm = new Uint8Array(N); // ...but leaning warm, like cream smoke: needs more proof
const dark = new Uint8Array(N); // the darker checker squares
const bright = new Uint8Array(N); // the lighter checker squares
for (let p = 0; p < N; p++) {
  const r = data[p * 3];
  const g = data[p * 3 + 1];
  const b = data[p * 3 + 2];
  const mn = Math.min(r, g, b);
  const mx = Math.max(r, g, b);
  // The checker is near grey (a little blue, or warm where a drop shadow was laid over it);
  // anything more colourful is art.
  if (mn < 192 || mx - mn > 22) continue;
  light[p] = 1;
  if (r > b + 4) warm[p] = 1;
  const l = (r + g + b) / 3;
  if (l < 238) dark[p] = 1;
  else if (l >= 243) bright[p] = 1;
}

/** Summed-area table, for "how many in the box round p" in O(1). */
function integral(a) {
  const s = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += a[y * W + x];
      s[(y + 1) * (W + 1) + x + 1] = s[y * (W + 1) + x + 1] + row;
    }
  }
  return s;
}
const boxSum = (s, x, y, r) => {
  const x0 = Math.max(0, x - r);
  const y0 = Math.max(0, y - r);
  const x1 = Math.min(W, x + r + 1);
  const y1 = Math.min(H, y + r + 1);
  return s[y1 * (W + 1) + x1] - s[y0 * (W + 1) + x1] - s[y1 * (W + 1) + x0] + s[y0 * (W + 1) + x0];
};
const sDark = integral(dark);
const sBright = integral(bright);

// Candidate background: light, with both checker tones round it. The plain checker leans blue;
// a warm pixel is either checker under a drop shadow or cream art (smoke), and only a dense
// alternation of both tones (a fifth of the box each) says checker.
const cand = new Uint8Array(N);
const box = (2 * R + 1) ** 2;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!light[p]) continue;
    const need = warm[p] ? box * 0.2 : 3;
    if (boxSum(sDark, x, y, R) >= need && boxSum(sBright, x, y, R) >= need) cand[p] = 1;
  }

// ——— 2. Background regions: from the border, and closed pockets with the pattern ———
const bg = new Uint8Array(N);
const label = new Int32Array(N).fill(-1);
const queue = new Int32Array(N);
let regions = 0;
for (let start = 0; start < N; start++) {
  if (!cand[start] || label[start] >= 0) continue;
  let qh = 0;
  let qt = 0;
  queue[qt++] = start;
  label[start] = regions;
  let size = 0;
  let darkCount = 0;
  let brightCount = 0;
  let border = false;
  while (qh < qt) {
    const p = queue[qh++];
    size++;
    darkCount += dark[p];
    brightCount += bright[p];
    const x = p % W;
    const y = (p / W) | 0;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
    if (x > 0 && cand[p - 1] && label[p - 1] < 0) ((label[p - 1] = regions), (queue[qt++] = p - 1));
    if (x < W - 1 && cand[p + 1] && label[p + 1] < 0)
      ((label[p + 1] = regions), (queue[qt++] = p + 1));
    if (y > 0 && cand[p - W] && label[p - W] < 0) ((label[p - W] = regions), (queue[qt++] = p - W));
    if (y < H - 1 && cand[p + W] && label[p + W] < 0)
      ((label[p + W] = regions), (queue[qt++] = p + W));
  }
  // A closed pocket is background when it carries both checker tones in good measure; a flat
  // white (cloud) or one soft grey (smoke) does not.
  const isBg = border || (size >= 30 && darkCount / size > 0.3 && brightCount / size > 0.25);
  if (isBg) for (let i = 0; i < qt; i++) bg[queue[i]] = 1;
  regions++;
}

// ——— 3. Foreground: drop specks, then one label per item ———
const fg = new Uint8Array(N);
for (let p = 0; p < N; p++) fg[p] = bg[p] ? 0 : 1;
// Light pixels of the checker that missed the test (isolated noise) and touch background go too.
for (let pass = 0; pass < 2; pass++)
  for (let p = 0; p < N; p++) {
    if (!fg[p] || !light[p]) continue;
    const x = p % W;
    const y = (p / W) | 0;
    let n = 0;
    if (x > 0 && !fg[p - 1]) n++;
    if (x < W - 1 && !fg[p + 1]) n++;
    if (y > 0 && !fg[p - W]) n++;
    if (y < H - 1 && !fg[p + W]) n++;
    if (n >= 3) fg[p] = 0;
  }

const item = new Int32Array(N).fill(-1);
const blobs = [];
for (let start = 0; start < N; start++) {
  if (!fg[start] || item[start] >= 0) continue;
  const id = blobs.length;
  let qh = 0;
  let qt = 0;
  queue[qt++] = start;
  item[start] = id;
  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  let lightCount = 0;
  while (qh < qt) {
    const p = queue[qh++];
    lightCount += light[p];
    const x = p % W;
    const y = (p / W) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (fg[q] && item[q] < 0) {
          item[q] = id;
          queue[qt++] = q;
        }
      }
  }
  blobs.push({ id, size: qt, light: lightCount / qt, x0, y0, x1, y1, into: id });
}

// Crumbs (splash drops, a loose leaf of a bush) join the biggest item whose box they touch.
const root = (b) => {
  while (blobs[b].into !== b) b = blobs[b].into;
  return b;
};
const big = blobs.filter((b) => b.size >= MIN_ITEM).sort((a, b) => b.size - a.size);
for (const b of blobs) {
  if (b.size >= MIN_ITEM) continue;
  // Crumbs that are mostly checker-grey are leftover background (round drop shadows), not art.
  // Dust (a few px) is the checker under a drop shadow; real details are bigger than that.
  if (b.light > 0.5 || b.size < DUST) continue;
  const host = big.find(
    (h) =>
      b.x0 <= h.x1 + JOIN_GAP &&
      b.x1 >= h.x0 - JOIN_GAP &&
      b.y0 <= h.y1 + JOIN_GAP &&
      b.y1 >= h.y0 - JOIN_GAP,
  );
  if (host) b.into = host.id;
}
const groups = new Map();
for (const b of blobs) {
  const r = root(b.id);
  if (blobs[r].size < MIN_ITEM) continue;
  const g = groups.get(r) ?? { ids: new Set(), x0: W, y0: H, x1: 0, y1: 0, size: 0 };
  g.ids.add(b.id);
  g.x0 = Math.min(g.x0, b.x0);
  g.y0 = Math.min(g.y0, b.y0);
  g.x1 = Math.max(g.x1, b.x1);
  g.y1 = Math.max(g.y1, b.y1);
  g.size += b.size;
  groups.set(r, g);
}

// Reading order: rows of items (by top edge, in 40 px bands), then left to right.
const items = [...groups.values()].sort((a, b) => {
  const ra = Math.floor((a.y0 + a.y1) / 2 / 40);
  const rb = Math.floor((b.y0 + b.y1) / 2 / 40);
  return ra - rb || a.x0 - b.x0;
});

// ——— 4. Write each item ———
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const index = [];
for (const [n, g] of items.entries()) {
  const x0 = Math.max(0, g.x0 - PAD);
  const y0 = Math.max(0, g.y0 - PAD);
  const w = Math.min(W, g.x1 + PAD + 1) - x0;
  const h = Math.min(H, g.y1 + PAD + 1) - y0;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * W + x0 + x;
      if (!g.ids.has(item[p])) continue;
      const o = (y * w + x) * 4;
      out[o] = data[p * 3];
      out[o + 1] = data[p * 3 + 1];
      out[o + 2] = data[p * 3 + 2];
      // Edge pixels (touching background) at partial opacity, so the cut does not look jagged.
      const sx = x0 + x;
      const sy = y0 + y;
      const edge =
        (sx > 0 && !fg[p - 1]) ||
        (sx < W - 1 && !fg[p + 1]) ||
        (sy > 0 && !fg[p - W]) ||
        (sy < H - 1 && !fg[p + W]);
      out[o + 3] = edge ? 170 : 255;
    }
  const file = `sprite-${String(n + 1).padStart(3, '0')}.png`;
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(OUT, file));
  index.push({ n: n + 1, file, x: x0, y: y0, w, h, px: g.size });
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 1));

// ——— 5. Contact sheet: every item in place on a dark background, numbered ———
const layers = index.map((s) => ({ input: join(OUT, s.file), left: s.x, top: s.y }));
const labels = index
  .map(
    (s) =>
      `<text x="${s.x + 2}" y="${s.y + 11}" font-family="Arial" font-size="11" font-weight="700" fill="#ffd36b" stroke="#000" stroke-width="2.5" paint-order="stroke">${s.n}</text>`,
  )
  .join('');
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${labels}</svg>`,
);
await sharp({ create: { width: W, height: H, channels: 4, background: '#1a2650' } })
  .composite([...layers, { input: svg, left: 0, top: 0 }])
  .png()
  .toFile(join(OUT, '_contact.png'));

console.log(`${index.length} items → ${OUT}`);
