/**
 * QA sheets for the Vườn Mây pots (§0.11 / §0.14 of plans/vuon-may.md): every pot in
 * src/data/skyGardenPots.json on a light, a dark and a sky background, with its id, the
 * soil ellipse outlined and a plant (growth stages sprout → ready, in turn) planted on the anchor.
 * Writes storage/sky-garden-qa/contact-<bg>.png. Run after npm run sky:pots: npm run sky:qa
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MANIFEST = path.join(ROOT, 'src/data/skyGardenPots.json');
const POTS = path.join(ROOT, 'public/images/sky-garden/pots');
const ITEMS = path.join(ROOT, 'public/images/farm-items');
const OUT = path.join(ROOT, 'storage/sky-garden-qa');

const CELL = 256;
const LABEL = 22;
const COLS = 5;
const BACKGROUNDS = { light: '#f4f1e8', dark: '#1b1b24', sky: '#8fc8f0' };
const STAGES = ['sprout', 'young', 'flowering', 'ready'];
const PLANTS = ['strawberry', 'herbs', 'chili', 'tomato', 'pumpkin', 'corn', 'cabbage', 'eggplant'];
/** Plant width as a share of the soil opening's width, and how far below the soil centre its
 *  bottom edge sits, in soil half-heights (same rule as the scene, PLANT_FIT in skyGarden.ts). */
const PLANT_W = 1.0;
const PLANT_SINK = 0.6;

const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

async function sheet(name, bg, pots) {
  const rows = Math.ceil(pots.length / COLS);
  const comps = [];
  for (const [i, pot] of pots.entries()) {
    const left = (i % COLS) * CELL;
    const top = Math.floor(i / COLS) * (CELL + LABEL);
    comps.push({ input: path.join(POTS, `${pot.id}@1x.webp`), left, top: top + LABEL });
    const a = pot.anchor;
    if (a) {
      const plant = PLANTS[i % PLANTS.length];
      const stage = STAGES[i % STAGES.length];
      const meta = await sharp(path.join(ITEMS, `${plant}-${stage}.webp`)).metadata();
      const pw = Math.max(8, Math.round(a.rx * 2 * CELL * PLANT_W));
      const ph = Math.round((meta.height / meta.width) * pw);
      const img = await sharp(path.join(ITEMS, `${plant}-${stage}.webp`))
        .resize(pw, ph)
        .png()
        .toBuffer();
      // Roots in the soil: the plant's bottom edge a little below the ellipse centre.
      comps.push({
        input: img,
        left: Math.round(left + a.cx * CELL - pw / 2),
        top: Math.round(top + LABEL + (a.cy + a.ry * PLANT_SINK) * CELL - ph),
      });
      const ring = `<svg width="${CELL}" height="${CELL}"><ellipse cx="${a.cx * CELL}" cy="${a.cy * CELL}" rx="${a.rx * CELL}" ry="${a.ry * CELL}" fill="none" stroke="#ff2d7a" stroke-width="1.5" stroke-dasharray="4 3"/></svg>`;
      comps.push({ input: Buffer.from(ring), left, top: top + LABEL });
    }
    const ink = name === 'dark' ? '#f4f1e8' : '#1b1b24';
    const text = `${pot.id}${pot.has2x ? ' · 2x' : ''}${pot.holesFilled ? ` · vá ${pot.holesFilled}` : ''}${pot.anchorFrom === 'manual' ? ' · neo tay' : ''}`;
    const label = `<svg width="${CELL}" height="${LABEL}"><text x="6" y="16" font-family="Arial" font-size="13" fill="${ink}">${esc(text)}</text></svg>`;
    comps.push({ input: Buffer.from(label), left, top });
  }
  const file = path.join(OUT, `contact-${name}.png`);
  await sharp({
    create: { width: CELL * COLS, height: rows * (CELL + LABEL), channels: 4, background: bg },
  })
    .composite(comps)
    .png()
    .toFile(file);
  return file;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
for (const [name, bg] of Object.entries(BACKGROUNDS)) {
  console.log(path.relative(ROOT, await sheet(name, bg, manifest.pots)));
}
