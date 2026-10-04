import sharp from 'sharp';
import { join } from 'node:path';

/*
 * Sprites for the meat animals and their meat, in the farm item sheet's soft painted style:
 * yellow cattle, the free-range chicken and the muscovy duck are recoloured from the sheet's
 * calf, hen and duck; the pig and the four cuts of meat are drawn here (no outlines, soft
 * gradients, a light top-left). Run: node scripts/farm-items/meat-art.mjs
 */

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIR = join(ROOT, 'public/images/farm-items');
const out = (name) => join(DIR, `${name}.webp`);
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 6 });

/** Recolours a sprite pixel by pixel (alpha kept). */
async function recolour(src, name, fn, scale = 1) {
  const img = sharp(join(DIR, `${src}.webp`)).ensureAlpha();
  const { width, height } = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = fn(data[i], data[i + 1], data[i + 2]);
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
  let res = sharp(data, { raw: info });
  if (scale !== 1)
    res = sharp(await res.png().toBuffer()).resize(
      Math.round(width * scale),
      Math.round(height * scale),
    );
  await webp(res).toFile(out(name));
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const luma = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
const isRed = (r, g, b) => r > 150 && r > g * 1.6 && r > b * 1.6;
const isOrange = (r, g, b) => r > 170 && g > 90 && g < 190 && b < 90 && r - b > 110;

/** Draws an SVG at 4× and scales it down to w×h (soft edges like the sheet). */
async function draw(name, w, h, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 4}" height="${h * 4}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  await webp(sharp(Buffer.from(svg)).resize(w, h)).toFile(out(name));
}

// ——— Recoloured from the sheet ———

// Yellow cattle (bò vàng): the brown calf, warmer and lighter; the adult a size up.
const tan = (r, g, b) => {
  const l = luma(r, g, b);
  if (l > 200 || isRed(r, g, b)) return [r, g, b]; // muzzle, white patches, pink nose
  const l2 = luma(r, g, b);
  return [l2 * 1.15 + 70, l2 * 0.92 + 42, l2 * 0.45];
};
await recolour('animal-cow-young', 'animal-cattle', tan, 1.25);
await recolour('animal-cow-young', 'animal-cattle-young', tan, 0.85);

// Free-range chicken (gà ta): straw-yellow plumage instead of the hen's brown; only the
// bright red comb and wattles keep their colour.
const comb = (r, g, b) => r > 170 && g < 70 && b < 70;
const golden = (r, g, b) => {
  if (comb(r, g, b)) return [r, g, b];
  const l = luma(r, g, b);
  return [l * 1.22 + 74, l * 0.9 + 40, l * 0.3];
};
await recolour('animal-chicken', 'animal-broiler', golden);
await recolour('animal-chicken-young', 'animal-broiler-young', golden);

// Muscovy duck (vịt xiêm): dark glossy plumage, the beak and feet keep their colour.
const muscovy = (r, g, b) => {
  if (isOrange(r, g, b) || isRed(r, g, b)) return [r * 0.95, g * 0.6, b * 0.6];
  const l = luma(r, g, b);
  return [l * 0.33 + 8, l * 0.34 + 10, l * 0.38 + 16];
};
await recolour('animal-duck', 'animal-muscovy', muscovy);
await recolour('animal-duck-young', 'animal-muscovy-young', muscovy);

// ——— Drawn ———

const shadow = (cx, cy, rx, ry) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".12"/>`;

/** A pink pig facing right, like the cow. */
function pig() {
  return `<defs>
    <radialGradient id="pb" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffd3dc"/><stop offset=".6" stop-color="#f4a7b6"/><stop offset="1" stop-color="#d9798e"/></radialGradient>
    <radialGradient id="ph" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffd9e1"/><stop offset=".7" stop-color="#f3a5b5"/><stop offset="1" stop-color="#d77a8f"/></radialGradient>
    <linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e895a6"/><stop offset="1" stop-color="#c76a80"/></linearGradient>
  </defs>
  ${shadow(46, 52, 34, 3.5)}
  <path d="M14 26 q-7 -3 -4 -9 q3 -4 6 0" fill="none" stroke="#d9798e" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="20" y="38" width="8" height="14" rx="3.5" fill="url(#pl)"/>
  <rect x="52" y="38" width="8" height="14" rx="3.5" fill="url(#pl)"/>
  <ellipse cx="40" cy="31" rx="29" ry="18" fill="url(#pb)"/>
  <rect x="28" y="40" width="8" height="13" rx="3.5" fill="#f2a0b1"/>
  <rect x="60" y="40" width="8" height="13" rx="3.5" fill="#f2a0b1"/>
  <ellipse cx="70" cy="25" rx="15" ry="14" fill="url(#ph)"/>
  <path d="M62 12 l-1 -9 l9 6 z" fill="#e48aa0"/>
  <path d="M74 12 l5 -8 l2 10 z" fill="#d77a8f"/>
  <ellipse cx="83" cy="28" rx="7" ry="6" fill="#f08ba1"/>
  <ellipse cx="81" cy="28" rx="1.3" ry="2" fill="#a24860"/>
  <ellipse cx="85.5" cy="28" rx="1.3" ry="2" fill="#a24860"/>
  <circle cx="72" cy="20" r="2.3" fill="#3a2028"/><circle cx="72.8" cy="19.2" r=".8" fill="#fff"/>
  <ellipse cx="69" cy="31" rx="3.5" ry="2" fill="#ff8fa8" opacity=".55"/>
  <ellipse cx="34" cy="20" rx="12" ry="5" fill="#fff" opacity=".28"/>`;
}

/** Pork belly (ba chỉ): two slabs with skin, fat and lean layers. */
function pork() {
  const slab = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 8 q0 -6 6 -6 h44 q6 0 6 6 v4 h-56 z" fill="#f2c79d"/>
    <rect x="0" y="11" width="56" height="7" fill="#fff4ec"/>
    <rect x="0" y="17" width="56" height="7" fill="#e5707c"/>
    <rect x="0" y="23.5" width="56" height="5" fill="#fbe3dc"/>
    <path d="M0 28 h56 v4 q0 6 -6 6 h-44 q-6 0 -6 -6 z" fill="#c9505f"/>
    <rect x="4" y="18.5" width="30" height="2" rx="1" fill="#fff" opacity=".3"/>
    <rect x="4" y="3.5" width="26" height="2" rx="1" fill="#fff" opacity=".4"/>
  </g>`;
  return `${shadow(50, 50, 40, 3.5)}${slab(30, 12, 1)}${slab(6, 4, 1)}`;
}

/** A beef steak with marbling and a fat rim. */
function beef() {
  return `<defs><radialGradient id="bm" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#e2545a"/><stop offset=".65" stop-color="#b8303b"/><stop offset="1" stop-color="#8e1f2b"/></radialGradient></defs>
  ${shadow(48, 49, 38, 3.5)}
  <path d="M10 26 C8 10 30 4 50 6 C74 8 90 14 88 28 C86 42 66 46 48 44 C26 42 12 40 10 26 Z" fill="#f6e3d3"/>
  <path d="M15 26 C14 13 32 9 50 10.5 C71 12 84 17 83 28 C82 38 65 41 48 39.5 C29 38 16 37 15 26 Z" fill="url(#bm)"/>
  <g fill="none" stroke="#f3c9c5" stroke-width="1.1" stroke-linecap="round" opacity=".8">
    <path d="M28 18 q6 4 3 9 q-2 4 4 7"/><path d="M48 15 q-3 6 3 9 q5 3 1 9"/><path d="M64 19 q5 3 2 8 q-2 4 5 6"/><path d="M38 32 q5 -2 9 1"/>
  </g>
  <ellipse cx="38" cy="16" rx="14" ry="3.5" fill="#fff" opacity=".25"/>`;
}

/** A raw chicken drumstick. */
function chicken() {
  return `<defs><radialGradient id="cm" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffe3d2"/><stop offset=".6" stop-color="#f6c2a6"/><stop offset="1" stop-color="#de9a7c"/></radialGradient></defs>
  ${shadow(46, 50, 36, 3.5)}
  <path d="M60 32 L82 40" stroke="#f3ebdd" stroke-width="7" stroke-linecap="round"/>
  <circle cx="84" cy="37" r="4.5" fill="#f7f0e4"/><circle cx="85" cy="44" r="4.5" fill="#efe6d6"/>
  <path d="M8 26 C8 10 30 4 46 12 C58 18 66 26 62 36 C58 46 40 48 26 44 C14 40 8 36 8 26 Z" fill="url(#cm)"/>
  <path d="M18 20 q10 -8 24 -4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>`;
}

/** A raw duck breast, scored skin on top of dark meat. */
function duck() {
  return `<defs><linearGradient id="dm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b43a46"/><stop offset="1" stop-color="#7d1d2a"/></linearGradient></defs>
  ${shadow(48, 49, 38, 3.5)}
  <path d="M10 30 C10 20 26 14 48 14 C70 14 88 20 88 30 C88 40 70 44 48 44 C26 44 10 40 10 30 Z" fill="url(#dm)"/>
  <path d="M10 28 C10 16 28 8 48 8 C70 8 88 16 88 28 C80 22 66 19 48 19 C30 19 16 22 10 28 Z" fill="#f7ead8"/>
  <g stroke="#dcc3a6" stroke-width="1" stroke-linecap="round">
    <path d="M28 12 l10 9"/><path d="M40 10 l10 10"/><path d="M53 10 l10 10"/><path d="M66 12 l9 9"/>
    <path d="M30 20 l10 -9"/><path d="M44 19 l9 -9"/><path d="M57 19 l9 -8"/>
  </g>
  <ellipse cx="40" cy="12" rx="13" ry="2.5" fill="#fff" opacity=".4"/>`;
}

await draw('animal-pig', 96, 56, pig());
await webp(sharp(out('animal-pig')).resize(70, 41)).toFile(out('animal-pig-young'));
await draw('pork-produce', 96, 56, pork());
await draw('beef-produce', 96, 54, beef());
await draw('chickenmeat-produce', 96, 54, chicken());
await draw('duckmeat-produce', 96, 54, duck());
console.log('meat art written to', DIR);
