// Re-cuts the farm item sheet (storage/item-pdf-v2-check/source.png) on its real grid.
//
// The auto split (storage/item-pdf-v2-check/sprites) used connected regions, so drawings
// that touch came out glued together. Here every block of the sheet is a grid: cells are
// separated at the narrowest "waist" between neighbours, only the drawing parts that belong
// to a cell are kept, and the colour of soft edge pixels is cleaned (the source keeps red
// garbage under transparent pixels, which bleeds when scaled).
//
// Usage: node scripts/farm-items/cut.mjs            → storage/farm-items-cut/<cell>.png + review sheets
//        node scripts/farm-items/cut.mjs --publish  → public/images/farm-items/<id>.webp from catalog.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'storage/item-pdf-v2-check/source.png');
const OUT = join(ROOT, 'storage/farm-items-cut');
const PUB = join(ROOT, 'public/images/farm-items');
const GRID = JSON.parse(readFileSync(join(ROOT, 'scripts/farm-items/grid.json'), 'utf8'));

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const alpha = (x, y) => data[(y * W + x) * 4 + 3];
const SOLID = 12;

/** Opaque pixels per row (or column) of a strip. */
function profile(x0, x1, y0, y1, axis) {
  const n = axis === 'y' ? y1 - y0 + 1 : x1 - x0 + 1;
  const out = new Array(n).fill(0);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (alpha(x, y) > SOLID) out[axis === 'y' ? y - y0 : x - x0]++;
  return out;
}

/** Boundary between two bands: the emptiest line near their midpoint (ties → nearest). */
function waist(a, b, lo, hi, axis, near) {
  const from = Math.max(a[1] - 18, Math.min(a[1], b[0]) - 4);
  const to = Math.min(b[0] + 18, Math.max(a[1], b[0]) + 4);
  const p = axis === 'y' ? profile(lo, hi, from, to, 'y') : profile(from, to, lo, hi, 'x');
  let best = -1;
  let bestN = Infinity;
  for (let i = 0; i < p.length; i++) {
    const v = from + i;
    const score = p[i] * 1000 + Math.abs(v - near);
    if (score < bestN) {
      bestN = score;
      best = v;
    }
  }
  return best;
}

/** Cells of a block: { id, x0, x1, y0, y1 } with waist boundaries. */
function cells(block) {
  const out = [];
  const xs = block.cols;
  for (let c = 0; c < xs.length; c++) {
    const col = xs[c];
    const rows = block.rows[c] ?? block.rows[0];
    const lx = c === 0 ? col[0] - 3 : Math.round((xs[c - 1][1] + col[0]) / 2);
    const rx = c === xs.length - 1 ? col[1] + 3 : Math.round((col[1] + xs[c + 1][0]) / 2);
    for (let r = 0; r < rows.length; r++) {
      const ty =
        r === 0
          ? rows[0][0] - 4
          : waist(rows[r - 1], rows[r], col[0], col[1], 'y', (rows[r - 1][1] + rows[r][0]) / 2);
      const by =
        r === rows.length - 1
          ? rows[r][1] + 4
          : waist(rows[r], rows[r + 1], col[0], col[1], 'y', (rows[r][1] + rows[r + 1][0]) / 2) - 1;
      out.push({
        id: `${block.id}-r${String(r + 1).padStart(2, '0')}-c${c + 1}`,
        x0: lx,
        x1: rx,
        y0: ty,
        y1: by,
      });
    }
  }
  for (const extra of block.cells ?? []) out.push({ ...extra });
  return out.map((c) => ({
    ...c,
    x0: Math.max(0, c.x0),
    y0: Math.max(0, c.y0),
    x1: Math.min(W - 1, c.x1),
    y1: Math.min(H - 1, c.y1),
  }));
}

/**
 * The cell's own drawing: connected parts (inside the cell rect) bigger than a speck, minus
 * slivers of a neighbour cut off at the edge. Soft edge colours are taken from the nearest
 * solid pixels so no red rim shows on any background.
 */
function extract(cell) {
  const w = cell.x1 - cell.x0 + 1;
  const h = cell.y1 - cell.y0 + 1;
  const label = new Int32Array(w * h).fill(-1);
  const parts = [];
  for (let i = 0; i < w * h; i++) {
    if (label[i] >= 0) continue;
    const x = i % w;
    const y = (i / w) | 0;
    if (alpha(cell.x0 + x, cell.y0 + y) <= SOLID) continue;
    const q = [i];
    label[i] = parts.length;
    let edge = 0;
    for (let k = 0; k < q.length; k++) {
      const v = q[k];
      const vx = v % w;
      const vy = (v / w) | 0;
      if (vx === 0 || vy === 0 || vx === w - 1 || vy === h - 1) edge++;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = vx + dx;
          const ny = vy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (label[n] < 0 && alpha(cell.x0 + nx, cell.y0 + ny) > SOLID) {
            label[n] = parts.length;
            q.push(n);
          }
        }
    }
    parts.push({ size: q.length, edge });
  }
  const biggest = Math.max(1, ...parts.map((p) => p.size));
  // Keep real parts: not specks, and not a neighbour's piece cut off by the cell edge (a small
  // part touching the edge, or one lying mostly on it). `biggest` keeps only the main drawing
  // (a hive without its baked-in bees, one bee out of a swarm).
  const keep = parts.map((p) =>
    cell.biggest
      ? p.size === biggest
      : p.size >= Math.max(40, biggest * 0.02) &&
        p.edge < p.size * 0.35 &&
        !(p.edge > 0 && p.size < biggest * 0.25),
  );
  const out = Buffer.alloc(w * h * 4);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = cell.x0 + x;
      const sy = cell.y0 + y;
      const a = alpha(sx, sy);
      if (a === 0) continue;
      // Soft pixels belong to the part they touch.
      let owner = label[y * w + x];
      if (owner < 0) {
        for (let dy = -2; dy <= 2 && owner < 0; dy++)
          for (let dx = -2; dx <= 2 && owner < 0; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && label[ny * w + nx] >= 0)
              owner = label[ny * w + nx];
          }
      }
      if (owner < 0 || !keep[owner]) continue;
      const si = (sy * W + sx) * 4;
      const o = (y * w + x) * 4;
      let r = data[si];
      let g = data[si + 1];
      let b = data[si + 2];
      if (a < 200) {
        // Defringe: average colour of solid neighbours.
        let n = 0;
        let rr = 0;
        let gg = 0;
        let bb = 0;
        for (let rad = 1; rad <= 3 && n === 0; rad++)
          for (let dy = -rad; dy <= rad; dy++)
            for (let dx = -rad; dx <= rad; dx++) {
              const nx = sx + dx;
              const ny = sy + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              const ni = (ny * W + nx) * 4;
              if (data[ni + 3] >= 200) {
                rr += data[ni];
                gg += data[ni + 1];
                bb += data[ni + 2];
                n++;
              }
            }
        if (n > 0) {
          r = Math.round(rr / n);
          g = Math.round(gg / n);
          b = Math.round(bb / n);
        }
      }
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  if (maxX < 0) return null;
  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(w, maxX + pad + 1) - left;
  const height = Math.min(h, maxY + pad + 1) - top;
  return {
    img: sharp(out, { raw: { width: w, height: h, channels: 4 } }).extract({
      left,
      top,
      width,
      height,
    }),
    rect: { left: cell.x0 + left, top: cell.y0 + top, width, height },
  };
}

const allCells = GRID.blocks.flatMap(cells);

if (process.argv.includes('--publish')) {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'scripts/farm-items/catalog.json'), 'utf8'));
  mkdirSync(PUB, { recursive: true });
  const byId = new Map(allCells.map((c) => [c.id, c]));
  const rects = {};
  let n = 0;
  for (const [file, cellId] of Object.entries(catalog.images)) {
    const cell = byId.get(cellId);
    if (!cell) throw new Error(`unknown cell ${cellId} for ${file}`);
    const cut = extract(cell);
    if (!cut) throw new Error(`empty cell ${cellId}`);
    const buf = await cut.img.png().toBuffer();
    await sharp(buf)
      .webp({ quality: 92, alphaQuality: 100, nearLossless: true })
      .toFile(join(PUB, `${file}.webp`));
    rects[file] = { cell: cellId, ...cut.rect };
    n++;
  }
  writeFileSync(join(PUB, 'rects.json'), JSON.stringify(rects, null, 1) + '\n');
  console.log(`published ${n} images to public/images/farm-items`);
} else {
  mkdirSync(OUT, { recursive: true });
  const index = [];
  for (const cell of allCells) {
    const cut = extract(cell);
    if (!cut) continue;
    const file = `${cell.id}.png`;
    await cut.img.png().toFile(join(OUT, file));
    index.push({ cell: cell.id, file, ...cut.rect });
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 1));
  // Review sheets per block: each cell 3× with its id, on dark and on light.
  for (const bg of ['#263343', '#f6f1e6']) {
    for (const block of GRID.blocks) {
      const items = index.filter((i) => i.cell.startsWith(block.id + '-'));
      if (!items.length) continue;
      const per = 8;
      const tw = 240;
      const th = 250;
      const tiles = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const png = await sharp(join(OUT, it.file))
          .resize(220, 220, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: 'nearest',
          })
          .png()
          .toBuffer();
        tiles.push({ input: png, left: (i % per) * tw + 10, top: Math.floor(i / per) * th + 24 });
      }
      const rows = Math.ceil(items.length / per);
      const fg = bg === '#263343' ? '#fff' : '#111';
      const labels = items
        .map(
          (it, i) =>
            `<text x="${(i % per) * tw + 10}" y="${Math.floor(i / per) * th + 18}" fill="${fg}" font-size="16" font-family="Arial">${it.cell}</text>`,
        )
        .join('');
      tiles.push({
        input: Buffer.from(`<svg width="${per * tw}" height="${rows * th}">${labels}</svg>`),
        left: 0,
        top: 0,
      });
      const name = `review-${block.id}-${bg === '#263343' ? 'dark' : 'light'}.png`;
      await sharp({ create: { width: per * tw, height: rows * th, channels: 4, background: bg } })
        .composite(tiles)
        .png()
        .toFile(join(OUT, name));
    }
  }
  console.log(`cut ${index.length} cells → storage/farm-items-cut`);
}
if (!existsSync(SRC)) throw new Error('missing source sheet');
