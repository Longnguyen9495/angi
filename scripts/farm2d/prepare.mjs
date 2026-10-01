import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/*
 * 2D farm layers from the owner's own illustration (FARM_GAME_ASSET_PACK_V4…/
 * 00_MASTER/MASTER_REFERENCE.png, 1678×937): a clean base plate (koi painted
 * out so they can swim), koi sprites, field-tile state sprites cut along the
 * tile lattice, drifting cloud sprites and a water glint. Writes PNGs and
 * layout.json (tile corners, hotspots, swim area) to public/farm2d/.
 *
 * Run: node scripts/farm2d/prepare.mjs
 */

const PACK = resolve('FARM_GAME_ASSET_PACK_V4_ULTRA_CLAUDE_PLAYCANVA_UPDATED');
const OUT = resolve('public/farm2d');
mkdirSync(OUT, { recursive: true });

const { data: src, info } = await sharp(join(PACK, '00_MASTER/MASTER_REFERENCE.png'))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const at = (x, y) => (y * W + x) * 4;
const base = Buffer.from(src);

// ——— Field lattice (measured on the picture): top corner, steps along both tile axes ———
// Measured on the seams: corner(1,1) ≈ (617,436), corner(1,2) ≈ (525,480), corner(2,2) ≈ (610,530).
const FIELD = { v0: [620, 342], R: [88, 51], L: [-92.5, 43.5] };
const corner = (i, j) => [
  FIELD.v0[0] + FIELD.R[0] * i + FIELD.L[0] * j,
  FIELD.v0[1] + FIELD.R[1] * i + FIELD.L[1] * j,
];
const tileQuad = (i, j) => [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];

/** Is (x, y) inside the convex quad q, with `inset` px margin (negative grows)? Returns signed distance. */
function quadDist(q, x, y) {
  let d = Infinity;
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = q[k];
    const [bx, by] = q[(k + 1) % 4];
    const ex = bx - ax;
    const ey = by - ay;
    const len = Math.hypot(ex, ey);
    // Inward normal for clockwise screen-space winding.
    const s = ((x - ax) * ey - (y - ay) * ex) / len;
    d = Math.min(d, -s);
  }
  return d;
}

/** Cut the tile (i, j) from the original picture as a soft-edged parallelogram sprite. */
async function tileSprite(i, j, file, pix = src, grow = 3) {
  const q = tileQuad(i, j);
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs) - grow - 2);
  const y0 = Math.floor(Math.min(...ys) - grow - 2);
  const w = Math.ceil(Math.max(...xs) + grow + 2) - x0;
  const h = Math.ceil(Math.max(...ys) + grow + 2) - y0;
  const out = Buffer.alloc(w * h * 4);
  // Sign of quadDist depends on winding: pick the one where the centre is inside.
  const cx = xs.reduce((a, b) => a + b) / 4;
  const cy = ys.reduce((a, b) => a + b) / 4;
  const sign = quadDist(q, cx, cy) > 0 ? 1 : -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = sign * quadDist(q, x0 + x + 0.5, y0 + y + 0.5) + grow;
      const a = Math.max(0, Math.min(1, d / 2.5));
      const s = at(x0 + x, y0 + y);
      const o = (y * w + x) * 4;
      out[o] = pix[s];
      out[o + 1] = pix[s + 1];
      out[o + 2] = pix[s + 2];
      out[o + 3] = Math.round(a * 255);
    }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(OUT, file));
  // x, y: sprite top-left; i, j: the tile it was cut from (offset to another tile = corner delta).
  return { file, x: x0, y: y0, w, h, i, j };
}

// ——— Koi: mask in hand-placed boxes, cut as sprites, paint out of the base ———
const KOI = [
  [969, 706, 1058, 744],
  [899, 737, 961, 779],
  [974, 769, 1030, 801],
  [1054, 753, 1133, 807],
];
// Clean pond water is r < 20, g > 150, b > 175; anything else in a koi box is fish, outline or shadow.
const isFish = (r, g, b) => r > 35 || g < 150 || b < 175;
const isWater = (p) => base[p * 4] < 30 && base[p * 4 + 1] > 145 && base[p * 4 + 2] > 170;
const mask = new Uint8Array(W * H);
const sprites = [];
for (const [k, [x0, y0, x1, y1]] of KOI.entries()) {
  const w = x1 - x0;
  const h = y1 - y0;
  const out = Buffer.alloc(w * h * 4);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const s = at(x, y);
      if (isFish(src[s], src[s + 1], src[s + 2])) mask[y * W + x] = 1;
    }
  // Grow the mask 2 px so no fringe is left behind.
  for (let pass = 0; pass < 3; pass++) {
    const grow = [];
    for (let y = y0 - 4; y < y1 + 4; y++)
      for (let x = x0 - 4; x < x1 + 4; x++)
        if (
          !mask[y * W + x] &&
          (mask[y * W + x - 1] ||
            mask[y * W + x + 1] ||
            mask[(y - 1) * W + x] ||
            mask[(y + 1) * W + x])
        )
          grow.push(y * W + x);
    for (const p of grow) mask[p] = 2;
  }
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const s = at(x, y);
      const o = ((y - y0) * w + (x - x0)) * 4;
      out[o] = src[s];
      out[o + 1] = src[s + 1];
      out[o + 2] = src[s + 2];
      // Bluish pixels are water seen between fins: keep them out of the sprite.
      const blue = src[s + 2] - src[s] > 40 ? 0 : 1;
      out[o + 3] = blue * (mask[y * W + x] === 1 ? 255 : mask[y * W + x] === 2 ? 90 : 0);
    }
  const file = `koi-${k + 1}.png`;
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(OUT, file));
  sprites.push({ file, x: x0, y: y0, w, h });
}
// Inpaint: copy each masked pixel from a nearby clean-water patch (offset chosen per koi box so
// the source has the most water and no mask), so the painted ripples carry on instead of a smear.
for (const [x0, y0, x1, y1] of KOI) {
  const w = x1 - x0;
  const h = y1 - y0;
  const offsets = [];
  for (const dy of [-h - 6, 0, h + 6])
    for (const dx of [-w - 6, -w / 2, 0, w / 2, w + 6])
      if (dx || dy) offsets.push([Math.round(dx), dy]);
  let best = null;
  for (const [dx, dy] of offsets) {
    let score = 0;
    for (let y = y0 - 4; y < y1 + 4; y++)
      for (let x = x0 - 4; x < x1 + 4; x++) {
        const q = (y + dy) * W + x + dx;
        if (mask[q]) score -= 5;
        else if (isWater(q)) score++;
      }
    if (!best || score > best.score) best = { dx, dy, score };
  }
  for (let y = y0 - 4; y < y1 + 4; y++)
    for (let x = x0 - 4; x < x1 + 4; x++) {
      const p = y * W + x;
      if (!mask[p]) continue;
      const q = (y + best.dy) * W + x + best.dx;
      for (let c = 0; c < 3; c++) base[p * 4 + c] = src[q * 4 + c];
    }
}
// Soften the seam: one blur pass over a 2 px band round the mask.
{
  const band = [];
  for (let p = W; p < W * H - W; p++)
    if (!mask[p] && (mask[p - 1] || mask[p + 1] || mask[p - W] || mask[p + W])) band.push(p);
  const vals = band.map((p) =>
    [0, 1, 2].map(
      (c) =>
        (base[p * 4 + c] * 2 +
          base[(p - 1) * 4 + c] +
          base[(p + 1) * 4 + c] +
          base[(p - W) * 4 + c] +
          base[(p + W) * 4 + c]) /
        6,
    ),
  );
  band.forEach((p, k) => vals[k].forEach((v, c) => (base[p * 4 + c] = v)));
}

// ——— Field tile sprites (states) from tiles in the picture ———
// Lattice (i along R, j along L). In the picture tiles i 0–1 × j 0–2 are tilled (sprouts at i = 0 and
// (1,0), seed clumps at (1,1), (1,2)); the rest is grass. Empty soil = tile (1,2) with its seeds patched out.
const soilPix = Buffer.from(src);
{
  const [cx, cy] = [525, 522]; // seed clump on tile (1,2)
  const [dx, dy] = [-44, 6];
  for (let y = cy - 18; y <= cy + 14; y++)
    for (let x = cx - 26; x <= cx + 26; x++) {
      const e = Math.hypot((x - cx) / 26, (y - cy + 2) / 16);
      if (e > 1) continue;
      const t = Math.min(1, (1 - e) / 0.35);
      for (let c = 0; c < 3; c++) {
        const p = at(x, y) + c;
        soilPix[p] = soilPix[p] * (1 - t) + src[at(x + dx, y + dy) + c] * t;
      }
    }
}
const tiles = {
  grass: await tileSprite(2, 1, 'tile-grass.png'),
  soil: await tileSprite(1, 2, 'tile-soil.png', soilPix),
  seeded: await tileSprite(1, 1, 'tile-seeded.png'),
  sprout: await tileSprite(0, 1, 'tile-sprout.png'),
};

// ——— Base plate field: leaf tips of the painted sprouts that hang over the fence/rim are painted
// out (they would float above whatever state a plot shows), then plain soil is stamped on every plot.
{
  const plantTiles = [
    [0, 0],
    [1, 0],
    [0, 1],
    [0, 2],
  ].map(([i, j]) => tileQuad(i, j));
  const field = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) field.push(tileQuad(i, j));
  const leaf = new Uint8Array(W * H);
  const isLeaf = (r, g, b) => r < 95 && g > 100 && b < 120;
  for (let y = 300; y < 480; y++)
    for (let x = 380; x < 800; x++) {
      const outside = field.every(
        (q) =>
          quadDist(q, x + 0.5, y + 0.5) *
            Math.sign(quadDist(q, ...q[0].map((v, k) => (q[0][k] + q[2][k]) / 2))) <
          -2,
      );
      const near = plantTiles.some((q) => {
        const sg = Math.sign(quadDist(q, (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2));
        return sg * quadDist(q, x + 0.5, y + 0.5) > -40;
      });
      const p = y * W + x;
      if (outside && near && isLeaf(src[p * 4], src[p * 4 + 1], src[p * 4 + 2])) leaf[p] = 1;
    }
  // Grow 2 px to take the dark outline with it.
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let y = 300; y < 480; y++)
      for (let x = 380; x < 800; x++) {
        const p = y * W + x;
        if (!leaf[p] && (leaf[p - 1] || leaf[p + 1] || leaf[p - W] || leaf[p + W])) add.push(p);
      }
    for (const p of add) leaf[p] = 1;
  }
  // Diffusion fill from the surrounding (fence, rim, grass).
  let unknown = [];
  for (let p = 0; p < W * H; p++) if (leaf[p]) unknown.push(p);
  while (unknown.length) {
    const next = [];
    const fill = [];
    for (const p of unknown) {
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (const q of [p - 1, p + 1, p - W, p + W])
        if (!leaf[q]) {
          r += base[q * 4];
          g += base[q * 4 + 1];
          b += base[q * 4 + 2];
          n++;
        }
      if (n) fill.push([p, r / n, g / n, b / n]);
      else next.push(p);
    }
    if (!fill.length) break;
    for (const [p, r, g, b] of fill) {
      base[p * 4] = r;
      base[p * 4 + 1] = g;
      base[p * 4 + 2] = b;
      leaf[p] = 0;
    }
    unknown = next;
  }
}
{
  const t = tiles.soil;
  const { data: spr } = await sharp(join(OUT, t.file)).raw().toBuffer({ resolveWithObject: true });
  const [sx, sy] = corner(t.i, t.j);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      const [dx, dy] = corner(i, j);
      const ox = Math.round(t.x + dx - sx);
      const oy = Math.round(t.y + dy - sy);
      for (let y = 0; y < t.h; y++)
        for (let x = 0; x < t.w; x++) {
          const a = spr[(y * t.w + x) * 4 + 3] / 255;
          if (!a) continue;
          const p = at(ox + x, oy + y);
          for (let c = 0; c < 3; c++)
            base[p + c] = base[p + c] * (1 - a) + spr[(y * t.w + x) * 4 + c] * a;
        }
    }
}

// ——— Clouds for drifting: cut from the open sky (blue keyed out) ———
async function cloud(x0, y0, x1, y1, file) {
  const w = x1 - x0;
  const h = y1 - y0;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = at(x0 + x, y0 + y);
      const r = src[s];
      const g = src[s + 1];
      const b = src[s + 2];
      // Whiteness: low saturation and bright = cloud; strong blue = sky.
      const sat = (b - r) / 255;
      const a =
        Math.max(0, Math.min(1, (0.42 - sat) / 0.22)) * Math.max(0, Math.min(1, (r - 150) / 50));
      const o = (y * w + x) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = Math.round(a * 255);
    }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(OUT, file));
  return { file, w, h };
}
const clouds = [
  await cloud(60, 55, 165, 98, 'cloud-1.png'),
  await cloud(1245, 35, 1350, 82, 'cloud-2.png'),
  await cloud(360, 20, 650, 112, 'cloud-3.png'),
];

// ——— Water glint: a soft white crescent, drawn here ———
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="24"><defs><radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="12" rx="30" ry="5" fill="url(#g)"/></svg>`,
  ),
)
  .png()
  .toFile(join(OUT, 'glint.png'));

await sharp(base, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(join(OUT, 'base.png'));
// Web copy: no alpha needed, JPEG is a fraction of the PNG.
await sharp(base, { raw: { width: W, height: H, channels: 4 } })
  .removeAlpha()
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(join(OUT, 'base.jpg'));

// ——— Crop atlas: the game's crop sprites (public/images/garden/<crop>-<stage>.webp, 256²) in one
// texture, a row per crop, a column per stage, each with a soft contact shadow under the plant. ———
const CROPS = [
  'rice',
  'herbs',
  'chili',
  'scallion',
  'bean',
  'tomato',
  'lemongrass',
  'garlic',
  'cucumber',
  'lime',
];
const STAGES = ['sprout', 'young', 'flowering', 'ready'];
const CELL = 128;
const shadow = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}"><defs><radialGradient id="s"><stop offset="0" stop-color="#3a2410" stop-opacity=".45"/><stop offset="1" stop-color="#3a2410" stop-opacity="0"/></radialGradient></defs><ellipse cx="${CELL / 2}" cy="${CELL - 12}" rx="${CELL * 0.3}" ry="${CELL * 0.08}" fill="url(#s)"/></svg>`,
  ),
)
  .png()
  .toBuffer();
const cells = [];
for (const [r, crop] of CROPS.entries())
  for (const [c, stage] of STAGES.entries()) {
    const plant = await sharp(resolve('public/images/garden', `${crop}-${stage}.webp`))
      .resize(CELL, CELL)
      .png()
      .toBuffer();
    cells.push(
      { input: shadow, left: c * CELL, top: r * CELL },
      { input: plant, left: c * CELL, top: r * CELL },
    );
  }
await sharp({
  create: {
    width: CELL * STAGES.length,
    height: CELL * CROPS.length,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(cells)
  .png()
  .toFile(join(OUT, 'crops.png'));
const cropAtlas = { file: 'crops.png', cell: CELL, crops: CROPS, stages: STAGES };

// ——— Highlights: a white tile (plot hover / selection) and a soft halo for the other hotspots ———
{
  const q = tileQuad(0, 0);
  const ox = Math.min(...q.map((p) => p[0])) - 4;
  const oy = Math.min(...q.map((p) => p[1])) - 4;
  const pts = q.map(([x, y]) => `${x - ox},${y - oy}`).join(' ');
  const w = Math.ceil(Math.max(...q.map((p) => p[0])) - ox + 4);
  const h = Math.ceil(Math.max(...q.map((p) => p[1])) - oy + 4);
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><polygon points="${pts}" fill="#fff" fill-opacity=".28" stroke="#fff8d0" stroke-width="3" stroke-linejoin="round"/></svg>`,
    ),
  )
    .png()
    .toFile(join(OUT, 'tile-glow.png'));
}
await sharp(
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><defs><radialGradient id="h"><stop offset=".55" stop-color="#fff6c8" stop-opacity=".0"/><stop offset=".8" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="64" fill="url(#h)"/></svg>',
  ),
)
  .png()
  .toFile(join(OUT, 'halo.png'));

const hotspots = JSON.parse(
  (await import('node:fs')).readFileSync(
    join(PACK, '09_MAPS_AND_LAYOUT/INTERACTION_HOTSPOTS.json'),
    'utf8',
  ),
).hotspots;
// Playable plots: the 3×3 block at the back of the field (tiles i, j in 0..2), plot id = j*3+i+1.
const plots = [];
for (let j = 0; j < 3; j++)
  for (let i = 0; i < 3; i++) plots.push({ id: j * 3 + i + 1, i, j, quad: tileQuad(i, j) });
const layout = {
  size: [W, H],
  field: FIELD,
  plots,
  tiles,
  crops: cropAtlas,
  koi: sprites,
  clouds,
  // Water the koi may swim in (an ellipse well inside the pond, picture px).
  swim: { cx: 1015, cy: 760, rx: 175, ry: 62 },
  hotspots,
};
writeFileSync(join(OUT, 'layout.json'), `${JSON.stringify(layout, null, 2)}\n`);
console.log('farm2d layers written to', OUT);
