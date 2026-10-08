/**
 * Vườn Mây pots: assets/sky-garden/pots/<id>.png → public/images/sky-garden/pots/.
 *
 * For each pot:
 *  1. patch the holes in the soil: transparent pixels that do not reach the image edge were left
 *     when the black background was keyed out of the 20-pot set; they are filled from the opaque
 *     pixels around them, growing inwards, until none is left;
 *  2. trim, then pad to a square with an even margin;
 *  3. write <id>@1x.webp (256 px) and, only when the source is big enough (never upscaled),
 *     <id>@2x.webp (512 px), plus <id>-silhouette.webp for the collection;
 *  4. find the soil opening (the largest patch of dark brown in the upper half) and record it as
 *     an ellipse { cx, cy, rx, ry } in 0..1 of the square, where plants are planted.
 *
 * assets/sky-garden/pots.anchors.json can override any anchor by hand: { "<id>": { cx, cy, rx, ry } }.
 * Writes src/data/skyGardenPots.json (bundled with the app) and prints a report. Run: npm run sky:pots
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'assets/sky-garden/pots');
const OVERRIDES = path.join(ROOT, 'assets/sky-garden/pots.anchors.json');
const OUT = path.join(ROOT, 'public/images/sky-garden/pots');
const MANIFEST = path.join(ROOT, 'src/data/skyGardenPots.json');

const SIZE_1X = 256;
const SIZE_2X = 512;
/** Margin round the trimmed pot, share of the square side. */
const MARGIN = 0.06;
const QUALITY = 88;

/**
 * Keeps only the holes that sit in the soil: an enclosed transparent patch whose centre lies in
 * the soil opening (`soil`, an ellipse in pixels, a little enlarged). The openings inside handles
 * and loops are enclosed too, but they lie outside the mouth and must stay see-through.
 */
function soilHoles(data, w, h, holes, soil) {
  const seen = new Uint8Array(w * h);
  const keep = new Uint8Array(w * h);
  let filled = 0;
  let kept = 0;
  for (let s = 0; s < w * h; s++) {
    if (!holes[s] || seen[s]) continue;
    const comp = [];
    const stack = [s];
    seen[s] = 1;
    let sx = 0;
    let sy = 0;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % w;
      sx += x;
      sy += Math.floor(i / w);
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || !holes[j]) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    const mx = sx / comp.length;
    const my = sy / comp.length;
    const inMouth =
      soil &&
      ((mx - soil.cx) / (soil.rx * 1.25)) ** 2 + ((my - soil.cy) / (soil.ry * 1.6)) ** 2 <= 1;
    if (inMouth) {
      for (const i of comp) keep[i] = 1;
      filled += comp.length;
    } else kept += comp.length;
  }
  return { mask: keep, filled, kept };
}

/** Transparent pixels (alpha < 128) not connected to the border, as a mask. */
function enclosedHoles(data, w, h) {
  const clear = (i) => data[i * 4 + 3] < 128;
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || !clear(i)) continue;
    outside[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  const holes = new Uint8Array(w * h);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    if (clear(i) && !outside[i]) {
      holes[i] = 1;
      n++;
    }
  }
  return { holes, n };
}

/** Fills the holes with the mean colour of their filled neighbours, ring by ring. */
function fillHoles(data, w, h, holes) {
  let left = holes.reduce((a, b) => a + b, 0);
  while (left > 0) {
    const ring = [];
    for (let i = 0; i < w * h; i++) {
      if (!holes[i]) continue;
      const x = i % w;
      let r = 0;
      let g = 0;
      let b = 0;
      let k = 0;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        if (holes[j] || data[j * 4 + 3] < 128) continue;
        r += data[j * 4];
        g += data[j * 4 + 1];
        b += data[j * 4 + 2];
        k++;
      }
      if (k) ring.push([i, r / k, g / k, b / k]);
    }
    if (!ring.length) break; // cannot happen for an enclosed hole, but never loop forever
    for (const [i, r, g, b] of ring) {
      data[i * 4] = Math.round(r);
      data[i * 4 + 1] = Math.round(g);
      data[i * 4 + 2] = Math.round(b);
      data[i * 4 + 3] = 255;
      holes[i] = 0;
      left--;
    }
  }
}

/**
 * Dark brown, the soil in the pot mouth: not the near-black outline, not the glaze, and not the
 * dark red of a pot's inner wall (soil keeps green at a third or more of red; the red wall does not).
 */
function isSoil(r, g, b, a) {
  return a > 200 && r >= 35 && r + g + b < 330 && r >= g && g >= 0.25 * r && b <= g + 15;
}

/**
 * The soil opening: the largest connected patch of soil colour in the upper 65% of the square
 * image, as an ellipse in 0..1. The ellipse uses the 4th–96th percentile so loose crumbs and a
 * few stray pixels do not stretch it.
 */
function findSoil(data, w, h) {
  const mask = new Uint8Array(w * h);
  const top = Math.round(h * 0.65);
  for (let y = 0; y < top; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (isSoil(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3])) mask[i] = 1;
    }
  }
  const seen = new Uint8Array(w * h);
  let best = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp = [];
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % w;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || !mask[j]) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (comp.length > best.length) best = comp;
  }
  if (best.length < 30) return null;
  const xs = best.map((i) => i % w).sort((a, b) => a - b);
  const ys = best.map((i) => Math.floor(i / w)).sort((a, b) => a - b);
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  const x0 = q(xs, 0.04);
  const x1 = q(xs, 0.96);
  const y0 = q(ys, 0.04);
  const y1 = q(ys, 0.96);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
}

async function preparePot(file, overrides) {
  const id = path.basename(file, '.png');
  const src = sharp(path.join(SRC, file)).ensureAlpha();
  const meta = await src.metadata();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const { holes } = enclosedHoles(data, info.width, info.height);
  const mouth = findSoil(data, info.width, info.height);
  const soil = soilHoles(data, info.width, info.height, holes, mouth);
  fillHoles(data, info.width, info.height, soil.mask);
  const holesBefore = soil.filled;
  // What is still enclosed afterwards should be exactly the openings that were meant to stay.
  const holesAfter = enclosedHoles(data, info.width, info.height).n - soil.kept;

  const patched = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const trimmed = await patched
    .png()
    .toBuffer()
    .then((b) => sharp(b).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true }));
  const tw = trimmed.info.width;
  const th = trimmed.info.height;
  const side = Math.ceil(Math.max(tw, th) / (1 - 2 * MARGIN));
  const square = await sharp(trimmed.data)
    .extend({
      top: Math.floor((side - th) / 2),
      bottom: Math.ceil((side - th) / 2),
      left: Math.floor((side - tw) / 2),
      right: Math.ceil((side - tw) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Never upscale: @2x only when the pot itself is at least that big in the source.
  const has2x = Math.max(tw, th) >= SIZE_2X * (1 - 2 * MARGIN);
  const webp = (size) =>
    sharp(square)
      .resize(size, size, { kernel: 'lanczos3' })
      .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 });
  await webp(SIZE_1X).toFile(path.join(OUT, `${id}@1x.webp`));
  if (has2x) await webp(SIZE_2X).toFile(path.join(OUT, `${id}@2x.webp`));
  else fs.rmSync(path.join(OUT, `${id}@2x.webp`), { force: true });

  // Silhouette: the pot's shape in one dark tone.
  const s1 = await sharp(square).resize(SIZE_1X, SIZE_1X).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < s1.length; i += 4) {
    s1[i] = 58;
    s1[i + 1] = 64;
    s1[i + 2] = 86;
  }
  await sharp(s1, { raw: { width: SIZE_1X, height: SIZE_1X, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 90 })
    .toFile(path.join(OUT, `${id}-silhouette.webp`));

  // Soil anchor on a 256 px copy (the same square, so 0..1 holds for every size).
  const probe = await sharp(square).resize(SIZE_1X, SIZE_1X).ensureAlpha().raw().toBuffer();
  const found = findSoil(probe, SIZE_1X, SIZE_1X);
  const r3 = (v) => Math.round((v / SIZE_1X) * 1000) / 1000;
  const manual = overrides[id];
  const anchor =
    manual ??
    (found ? { cx: r3(found.cx), cy: r3(found.cy), rx: r3(found.rx), ry: r3(found.ry) } : null);

  return {
    id,
    source: { file: `assets/sky-garden/pots/${file}`, w: meta.width, h: meta.height },
    potPx: [tw, th],
    has2x,
    anchor,
    anchorFrom: manual ? 'manual' : found ? 'auto' : 'missing',
    holesFilled: holesBefore,
    holesLeft: holesAfter,
    openingsKept: soil.kept,
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const overrides = fs.existsSync(OVERRIDES) ? JSON.parse(fs.readFileSync(OVERRIDES, 'utf8')) : {};
  const files = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith('.png'))
    .sort();
  const pots = [];
  for (const f of files) pots.push(await preparePot(f, overrides));

  const manifest = {
    note: 'Written by scripts/sky-garden/prepare-pots.mjs. Anchor: soil ellipse in 0..1 of the square image.',
    size1x: SIZE_1X,
    size2x: SIZE_2X,
    pots: pots.map(({ id, has2x, anchor, anchorFrom, holesFilled, openingsKept, potPx }) => ({
      id,
      has2x,
      anchor,
      anchorFrom,
      holesFilled,
      openingsKept,
      sourcePx: potPx.join('x'),
    })),
  };
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    'id               nguồn       chậu      @2x  vá đất  giữ quai  anchor (cx, cy, rx, ry)',
  );
  for (const p of pots) {
    const a = p.anchor
      ? `${p.anchor.cx}, ${p.anchor.cy}, ${p.anchor.rx}, ${p.anchor.ry}`
      : 'KHÔNG TÌM THẤY';
    console.log(
      `${p.id.padEnd(16)} ${`${p.source.w}x${p.source.h}`.padEnd(11)} ${p.potPx.join('x').padEnd(9)} ${(p.has2x ? 'có' : '—').padEnd(4)} ${String(p.holesFilled).padStart(6)}  ${String(p.openingsKept).padStart(8)}  ${a}${p.anchorFrom === 'manual' ? ' (tay)' : ''}`,
    );
  }
  const bad = pots.filter((p) => p.holesLeft > 0 || !p.anchor);
  if (bad.length) {
    console.error(`\nCòn lỗi ở: ${bad.map((p) => p.id).join(', ')}`);
    process.exitCode = 1;
  }
  console.log(
    `\n${pots.length} chậu → ${path.relative(ROOT, OUT)} và ${path.relative(ROOT, MANIFEST)}`,
  );
}

await main();
