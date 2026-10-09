/**
 * Vườn Mây art drawn one picture per file (prompts/sky-garden-playground*.md) →
 * public/images/sky-garden/{plants,bugs,machines}/ and src/data/skyGardenArt.json.
 *
 * Reads assets/sky-garden/art/ (flat, the file names the prompts ask for):
 *   <plant>-sprout.png, <plant>-young.png, <plant>-flowering.png, <plant>-ready.png
 *   bug-<bug>-a.png, bug-<bug>-b.png          (wing-flap frames)
 *   machine-<machine>.png                     (tea, pot, still, phin)
 *
 * A picture without real transparency (a painted checkerboard, a flat background) is refused:
 * the game must not show a box round a plant. A plant is used only once all four stages are
 * there, a bug only with both frames, so a half-drawn set never mixes with the borrowed art.
 * The stages of a plant (and the frames of a bug) are cut with one shared box, so they keep the
 * same scale and baseline as drawn. Run: npm run sky:art
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'assets/sky-garden/art');
const OUT = path.join(ROOT, 'public/images/sky-garden');
const MANIFEST = path.join(ROOT, 'src/data/skyGardenArt.json');

const PLANTS = [
  'jasmine',
  'mint',
  'kumquat',
  'lotus',
  'rose',
  'tea',
  'coffee',
  'chrysanthemum',
  'pepper',
  'orchid',
  'peach',
  'apricot',
  'vanilla',
  'saffron',
  'beanstalk',
];
const STAGES = ['sprout', 'young', 'flowering', 'ready'];
const BUGS = ['ladybug', 'bee', 'caterpillar', 'butterfly', 'dragonfly', 'firefly', 'goldbeetle'];
const FRAMES = ['a', 'b'];
const MACHINES = ['tea', 'pot', 'still', 'phin'];

const SIZE = { plants: 256, bugs: 128, machines: 256 };
const QUALITY = 88;
/** Alpha below this is background. */
const ALPHA_CUT = 24;

async function load(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Share of see-through pixels: a real cut-out has plenty, a painted background has none. */
function clearShare({ data, w, h }) {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < ALPHA_CUT) n++;
  return n / (w * h);
}

function bbox({ data, w, h }) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < ALPHA_CUT) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

function union(boxes) {
  return boxes.reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  }));
}

/**
 * Cuts `box` out of `file` and pads it to a square of `size`: `bottom` keeps the lowest pixel on
 * the bottom edge (plants stand in the soil, machines on the shelf), otherwise centred.
 */
async function write(file, box, size, bottom, out) {
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const side = Math.max(bw, bh);
  const left = Math.floor((side - bw) / 2);
  const top = bottom ? side - bh : Math.floor((side - bh) / 2);
  // Two passes: sharp would resize before extending if both were chained on one image.
  const square = await sharp(file)
    .ensureAlpha()
    .extract({ left: box.x0, top: box.y0, width: bw, height: bh })
    .extend({
      left,
      right: side - bw - left,
      top,
      bottom: side - bh - top,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp(square)
    .resize(size, size)
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(out);
}

/** A group of files drawn together (a plant's stages, a bug's frames): all there and cut-outs. */
async function group(names, report) {
  const files = names.map((n) => path.join(SRC, `${n}.png`));
  const missing = names.filter((_, i) => !fs.existsSync(files[i]));
  if (missing.length === names.length) return null;
  if (missing.length) {
    report.push(`  waiting: ${missing.join(', ')}`);
    return null;
  }
  const boxes = [];
  for (const [i, f] of files.entries()) {
    const img = await load(f);
    const clear = clearShare(img);
    if (clear < 0.05) {
      report.push(
        `  refused: ${names[i]}.png has no real transparency (${(clear * 100).toFixed(1)}% clear)`,
      );
      return null;
    }
    const b = bbox(img);
    if (!b) {
      report.push(`  refused: ${names[i]}.png is empty`);
      return null;
    }
    boxes.push(b);
  }
  return { files, box: union(boxes) };
}

async function main() {
  if (!fs.existsSync(SRC)) fs.mkdirSync(SRC, { recursive: true });
  const manifest = { plants: [], bugs: [], machines: [] };
  const report = [];
  for (const dir of ['plants', 'bugs', 'machines'])
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });

  for (const p of PLANTS) {
    const g = await group(
      STAGES.map((s) => `${p}-${s}`),
      report,
    );
    if (!g) continue;
    for (const [i, s] of STAGES.entries()) {
      await write(g.files[i], g.box, SIZE.plants, true, path.join(OUT, 'plants', `${p}-${s}.webp`));
    }
    manifest.plants.push(p);
  }
  for (const b of BUGS) {
    const g = await group(
      FRAMES.map((f) => `bug-${b}-${f}`),
      report,
    );
    if (!g) continue;
    for (const [i, f] of FRAMES.entries()) {
      await write(g.files[i], g.box, SIZE.bugs, false, path.join(OUT, 'bugs', `${b}-${f}.webp`));
    }
    manifest.bugs.push(b);
  }
  for (const m of MACHINES) {
    const g = await group([`machine-${m}`], report);
    if (!g) continue;
    await write(g.files[0], g.box, SIZE.machines, true, path.join(OUT, 'machines', `${m}.webp`));
    manifest.machines.push(m);
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `Vườn Mây art: ${manifest.plants.length}/${PLANTS.length} plants, ${manifest.bugs.length}/${BUGS.length} bugs, ` +
      `${manifest.machines.length}/${MACHINES.length} machines`,
  );
  for (const line of report) console.log(line);
}

await main();
