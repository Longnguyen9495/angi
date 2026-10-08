/**
 * Vườn Mây: pieces cut from the test sprite sheet (assets/sky-garden/source/sprite-sheet-v1.png)
 * into public/images/sky-garden/sheet/. Test art only (§0.14, Q6): it shares its subjects with the
 * layout reference, so it must be cleared or redrawn before release.
 *
 * The sheet's alpha is soft: objects stop at about 251/255 (slightly see-through) and a faint
 * coloured glow covers about a sixth of the sheet, gluing neighbours together. So:
 *  1. every piece is cut from a hand-set box (automatic separation merges shelves and machines);
 *  2. alpha is remapped: under LO is glow and goes, over HI is solid, a ramp between;
 *  3. only the piece's own body is kept (its largest connected part, plus parts at least KEEP
 *     of that size that touch it within a few px), which drops the slivers of the neighbours;
 *  4. trim, and write WebP at the sheet's own size (never upscaled).
 *
 * The beanstalk is cut into a base, a seamless repeating stretch (from between two flags, its
 * seam blended over a few rows) and a top, so it can be any height without the baked-in flags.
 * Run: npm run sky:sheet
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'assets/sky-garden/source/sprite-sheet-v1.png');
const OUT = path.join(ROOT, 'public/images/sky-garden/sheet');

const LO = 80;
const HI = 200;

/** Hand-set boxes [x0, y0, x1, y1] in sheet px. Shelf rows are cut at their emptiest rows. */
const SHELF_X = [228, 870];
const SHELF_CUTS = [5, 103, 178, 254, 325, 405];
const SHELF_NAMES = ['shelf-blue', 'shelf-purple', 'shelf-green', 'shelf-pink', 'shelf-sky'];

const BUBBLES = [
  [398, 600, 472, 696],
  [475, 600, 536, 696],
  [539, 600, 604, 696],
  [606, 600, 668, 696],
  [670, 600, 740, 696],
  [747, 600, 812, 696],
  [817, 600, 878, 696],
];

const FX = {
  butterfly: [678, 812, 748, 882],
  bird: [753, 798, 838, 892],
  rainbow: [1402, 805, 1520, 885],
  'flower-pink': [838, 802, 900, 862],
  'flower-white': [956, 806, 1006, 856],
  leaf: [906, 806, 954, 856],
  star: [1196, 812, 1248, 862],
  cloud: [1062, 810, 1134, 856],
};

/** Beanstalk column, its flag-free repeating stretch (found by scripts' seam search) and ends. */
const STALK_X = [2, 236];
const STALK_TILE = [313, 409];
/** The top ends, and the base starts, at the row that best continues the tile (searched below,
 *  before the first flag and after the last one). */
const STALK_TOP_SEARCH = [5, [56, 84]];
const STALK_BASE_SEARCH = [[690, 800], 905];
const SEAM_ROWS = 14;
/** Shelves: rows at the bottom where the next shelf's flowers are painted over this one. */
const SCRUB_ROWS = 18;
/** RGB distance from the row's cloud colour that marks a pixel as foreign. */
const FOREIGN = 85;
/** Shelves: rows at the top searched for flowers the cut went through. */
const CLIP_ROWS = 30;

/** Parts smaller than this share of the main body are dropped (neighbour slivers). */
const KEEP = 0.04;
/** A part touching the main body within this many px stays (a flower on its shelf). */
const TOUCH = 3;

const { data: sheet, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const SW = info.width;

function crop(x0, y0, x1, y1) {
  const w = x1 - x0;
  const h = y1 - y0;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * SW + x0 + x) * 4;
      const d = (y * w + x) * 4;
      const k = Math.max(0, Math.min(1, (sheet[s + 3] - LO) / (HI - LO)));
      buf[d] = sheet[s];
      buf[d + 1] = sheet[s + 1];
      buf[d + 2] = sheet[s + 2];
      buf[d + 3] = Math.round(k * 255);
    }
  }
  return { buf, w, h };
}

/** Clears every connected part except the body (largest) and big parts touching it. */
function keepBody({ buf, w, h }) {
  const lab = new Int32Array(w * h).fill(-1);
  const parts = [];
  for (let s = 0; s < w * h; s++) {
    if (buf[s * 4 + 3] === 0 || lab[s] >= 0) continue;
    const id = parts.length;
    const px = [];
    const stack = [s];
    lab[s] = id;
    while (stack.length) {
      const i = stack.pop();
      px.push(i);
      const x = i % w;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || lab[j] >= 0 || buf[j * 4 + 3] === 0) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        lab[j] = id;
        stack.push(j);
      }
    }
    parts.push(px);
  }
  if (!parts.length) return { dropped: 0 };
  const body = parts.reduce((a, b) => (b.length > a.length ? b : a));
  const bodyId = lab[body[0]];
  // Body mask grown by TOUCH px, to find the parts that sit on it.
  const near = new Uint8Array(w * h);
  for (const i of body) {
    const x = i % w;
    const y = Math.floor(i / w);
    for (let dy = -TOUCH; dy <= TOUCH; dy++) {
      for (let dx = -TOUCH; dx <= TOUCH; dx++) {
        const X = x + dx;
        const Y = y + dy;
        if (X >= 0 && Y >= 0 && X < w && Y < h) near[Y * w + X] = 1;
      }
    }
  }
  let dropped = 0;
  parts.forEach((px, id) => {
    if (id === bodyId) return;
    const keep = px.length >= body.length * KEEP && px.some((i) => near[i]);
    if (keep) return;
    for (const i of px) buf[i * 4 + 3] = 0;
    dropped += px.length;
  });
  return { dropped };
}

/** Rows of clear sky added above a shelf, for the whole flowers laid over the clipped ones. */
const CROWN = 22;

/** A shelf with a whole flower over each clipped one (centred on it, half above the old cut). */
async function writeShelf(name, img, clipped) {
  const flower = crop(...FX['flower-pink']);
  keepBody(flower);
  const flowerPng = await sharp(flower.buf, {
    raw: { width: flower.w, height: flower.h, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
  const meta = await sharp(flowerPng).metadata();
  const layers = [];
  for (const c of clipped) {
    const fw = Math.round(Math.max(22, Math.min(34, (c.x1 - c.x0 + 1) * 0.62)));
    const fh = Math.round((meta.height / meta.width) * fw);
    const cx = (c.x0 + c.x1) / 2;
    layers.push({
      input: await sharp(flowerPng).resize(fw, fh).png().toBuffer(),
      left: Math.round(cx - fw / 2),
      top: Math.max(0, Math.round(CROWN + Math.min(c.y1, 14) - fh * 0.7)),
    });
  }
  const base = await sharp(img.buf, { raw: { width: img.w, height: img.h, channels: 4 } })
    .extend({
      top: CROWN,
      bottom: 0,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const out = await sharp(base)
    .composite(layers)
    .png()
    .toBuffer()
    .then((b) =>
      sharp(b).trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 100, effort: 6 }),
    )
    .then((p) => p.toFile(path.join(OUT, `${name}.webp`)));
  return { name, w: out.width, h: out.height };
}

async function write(name, img) {
  const out = await sharp(img.buf, { raw: { width: img.w, height: img.h, channels: 4 } })
    .trim({ threshold: 1 })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, `${name}.webp`));
  return { name, w: out.width, h: out.height };
}

/**
 * The repeating beanstalk stretch. Stacked, the row after the tile's last row is its first row;
 * so its first rows are faded in from the rows that really follow its end in the sheet (no flag
 * there), which hides the seam.
 */
function stalkTile() {
  const [x0, x1] = STALK_X;
  const [y0, y1] = STALK_TILE;
  const tile = crop(x0, y0, x1, y1);
  const after = crop(x0, y1, x1, y1 + SEAM_ROWS);
  for (let r = 0; r < SEAM_ROWS; r++) {
    const t = (r + 1) / (SEAM_ROWS + 1);
    for (let x = 0; x < tile.w; x++) {
      const d = (r * tile.w + x) * 4;
      for (let c = 0; c < 4; c++)
        tile.buf[d + c] = Math.round(after.buf[d + c] * (1 - t) + tile.buf[d + c] * t);
    }
  }
  return tile;
}

/** One sheet row of the stalk column (alpha-cleaned), for matching rows. */
function stalkRow(y) {
  return crop(STALK_X[0], y, STALK_X[1], y + 1).buf;
}

function rowDiff(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

/** The row in [from, to] that looks most like `target`. */
function bestRow([from, to], target) {
  const t = stalkRow(target);
  let best = from;
  let d = Infinity;
  for (let y = from; y <= to; y++) {
    const e = rowDiff(stalkRow(y), t);
    if (e < d) {
      d = e;
      best = y;
    }
  }
  return best;
}

/**
 * Shelves overlap in the sheet: the flowers on top of one are painted over the bottom of the one
 * above. In this shelf's last rows, pixels far from the row's cloud colour are that foreign
 * flower; they are repainted from the nearest cloud pixels on their left and right (colour and
 * alpha), so the cloud edge runs on unbroken.
 */
/** Fades the first (`atTop`) or last rows of `img` from/to the sheet rows starting at `sheetY`. */
function blendRows(img, sheetY, atTop) {
  const ref = crop(STALK_X[0], sheetY, STALK_X[1], sheetY + SEAM_ROWS);
  for (let r = 0; r < SEAM_ROWS; r++) {
    // Weight of the image's own pixels: 0 at the joint, 1 SEAM_ROWS away from it.
    const own = atTop ? (r + 1) / (SEAM_ROWS + 1) : (SEAM_ROWS - r) / (SEAM_ROWS + 1);
    const y = atTop ? r : img.h - SEAM_ROWS + r;
    for (let x = 0; x < img.w; x++) {
      const d = (y * img.w + x) * 4;
      const sIdx = (r * img.w + x) * 4;
      for (let c = 0; c < 4; c++)
        img.buf[d + c] = Math.round(ref.buf[sIdx + c] * (1 - own) + img.buf[d + c] * own);
    }
  }
}

function scrubBottom(img) {
  return scrubRows(img, Math.max(0, img.h - SCRUB_ROWS), img.h, null);
}

/**
 * The cut between two shelves goes through some flowers on top of this one: their upper half is
 * hidden under the shelf above in the sheet, so it cannot be recovered. Each such flower (foreign
 * colour connected to the top row) is found and returned as a box; a whole flower is laid over it
 * later, so the shelf shows complete flowers. (Repainting them away left smears.)
 */
function clippedFlowers(img) {
  const { buf, w } = img;
  const rows = Math.min(CLIP_ROWS, img.h);
  const foreign = foreignMask(img, 0, rows);
  const seen = new Uint8Array(w * rows);
  const boxes = [];
  for (let s0 = 0; s0 < w; s0++) {
    if (!foreign[s0] || seen[s0] || buf[s0 * 4 + 3] === 0) continue;
    let x0 = w;
    let x1 = 0;
    let y1 = 0;
    const stack = [s0];
    seen[s0] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      const y = Math.floor(i / w);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * rows || seen[j] || !foreign[j]) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (x1 - x0 >= 8) boxes.push({ x0, x1, y1 });
  }
  return boxes;
}

/** Per row, pixels far from the row's cloud colour (1 = foreign), rows [y0, y1). */
function foreignMask(img, y0, y1) {
  const { buf, w } = img;
  const mask = new Uint8Array(w * (y1 - y0));
  // The cloud colour of a shelf: taken from its middle rows, where it is all cloud.
  const mid = Math.floor(img.h * 0.6);
  const solid = [];
  for (let x = 0; x < w; x++) if (buf[(mid * w + x) * 4 + 3] > 200) solid.push(x);
  const med = [0, 1, 2].map((c) => {
    const v = solid.map((x) => buf[(mid * w + x) * 4 + c]).sort((p, q) => p - q);
    return v[Math.floor(v.length / 2)] ?? 0;
  });
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (buf[i + 3] === 0) continue;
      if (Math.hypot(buf[i] - med[0], buf[i + 1] - med[1], buf[i + 2] - med[2]) > FOREIGN)
        mask[(y - y0) * w + x] = 1;
    }
  }
  return mask;
}

/**
 * Repaints marked pixels from the nearest unmarked pixels on their left and right in the same
 * row (colour and alpha). Marks: `only` (rows [y0, y1) of it), or every foreign pixel by the row's
 * own cloud colour when `only` is null.
 */
function scrubRows(img, y0, y1, only) {
  const { buf, w } = img;
  let fixed = 0;
  for (let y = y0; y < y1; y++) {
    const solid = [];
    for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3] > 200) solid.push(x);
    if (!only && solid.length < 20) continue;
    const med = [0, 1, 2].map((c) => {
      const v = solid.map((x) => buf[(y * w + x) * 4 + c]).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)] ?? 0;
    });
    const foreign = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (only) {
        foreign[x] = only[(y - y0) * w + x];
        continue;
      }
      if (buf[i + 3] === 0) continue;
      const d = Math.hypot(buf[i] - med[0], buf[i + 1] - med[1], buf[i + 2] - med[2]);
      if (d > FOREIGN) foreign[x] = 1;
    }
    for (let x = 0; x < w; x++) {
      if (!foreign[x]) continue;
      let l = x - 1;
      while (l >= 0 && foreign[l]) l--;
      let r = x + 1;
      while (r < w && foreign[r]) r++;
      const i = (y * w + x) * 4;
      const L = l >= 0 ? (y * w + l) * 4 : -1;
      const R = r < w ? (y * w + r) * 4 : -1;
      const t = L >= 0 && R >= 0 ? (x - l) / (r - l) : L >= 0 ? 0 : 1;
      const A = L >= 0 ? L : R;
      const B = R >= 0 ? R : L;
      if (A < 0) {
        buf[i + 3] = 0;
        fixed++;
        continue;
      }
      // Colour weighted by alpha, so a clear neighbour does not darken the edge.
      const wa = buf[A + 3] * (1 - t);
      const wb = buf[B + 3] * t;
      const sum = wa + wb || 1;
      for (let c = 0; c < 3; c++)
        buf[i + c] = Math.round((buf[A + c] * wa + buf[B + c] * wb) / sum);
      buf[i + 3] = Math.round(buf[A + 3] * (1 - t) + buf[B + 3] * t);
      fixed++;
    }
  }
  return fixed;
}

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (let i = 0; i < SHELF_NAMES.length; i++) {
  const img = crop(SHELF_X[0], SHELF_CUTS[i], SHELF_X[1], SHELF_CUTS[i + 1]);
  const { dropped } = keepBody(img);
  const scrubbed = scrubBottom(img);
  // The first shelf has nothing above it: its flowers are whole.
  const clipped = i === 0 ? [] : clippedFlowers(img);
  report.push({
    ...(await writeShelf(SHELF_NAMES[i], img, clipped)),
    dropped: `${dropped} · vá đáy ${scrubbed} · hoa cụt được phủ ${clipped.length}`,
  });
}
for (const [i, [x0, y0, x1, y1]] of BUBBLES.entries()) {
  const img = crop(x0, y0, x1, y1);
  const { dropped } = keepBody(img);
  report.push({ ...(await write(`bubble-${i + 1}`, img)), dropped });
}
for (const [name, [x0, y0, x1, y1]] of Object.entries(FX)) {
  const img = crop(x0, y0, x1, y1);
  const { dropped } = keepBody(img);
  report.push({ ...(await write(name, img)), dropped });
}
// Beanstalk: never trimmed, so the three parts keep one width and line up when stacked.
const topEnd = bestRow(STALK_TOP_SEARCH[1], STALK_TILE[0]);
const baseStart = bestRow(STALK_BASE_SEARCH[0], STALK_TILE[1]);
const top = crop(STALK_X[0], STALK_TOP_SEARCH[0], STALK_X[1], topEnd);
const base = crop(STALK_X[0], baseStart, STALK_X[1], STALK_BASE_SEARCH[1]);
keepBody(top);
keepBody(base);
// Top: its last rows fade into the rows just above the tile; base: its first rows fade in from
// the rows just after the tile's end. Both continue the tile, so the joints do not step.
blendRows(top, STALK_TILE[0] - SEAM_ROWS, false);
blendRows(base, STALK_TILE[1], true);
console.log(`đậu: ngọn đến dòng ${topEnd}, gốc từ dòng ${baseStart}`);
for (const [name, img] of [
  ['beanstalk-top', top],
  ['beanstalk-tile', stalkTile()],
  ['beanstalk-base', base],
]) {
  const out = await sharp(img.buf, { raw: { width: img.w, height: img.h, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, `${name}.webp`));
  report.push({ name, w: out.width, h: out.height, dropped: 0 });
}

console.log('mảnh               kích thước   bỏ (px mảnh thừa)');
for (const r of report)
  console.log(`${r.name.padEnd(18)} ${`${r.w}x${r.h}`.padEnd(12)} ${r.dropped}`);
console.log(`\n${report.length} mảnh → ${path.relative(ROOT, OUT)}`);
