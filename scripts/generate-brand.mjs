// Brand icons from the in-app logo mark (a copper plate with a dark centre).
// Usage: node scripts/generate-brand.mjs
// Output (public/): favicon.svg, favicon.ico (16/32/48), favicon.png (64), favicon-32.png,
// favicon-48.png, apple-touch-icon.png (180), icon-192.png, icon-512.png,
// icon-maskable-192.png, icon-maskable-512.png.
// The link-preview images come from scripts/brand/*.html (node scripts/brand/render.mjs).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const pub = join(root, 'public');

/** @param {{ radius: number, plate: number }} o tile corner radius and plate size (share of 512) */
function mark({ radius, plate }) {
  const r = 256 * plate;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="plate" cx=".38" cy=".32" r=".8">
      <stop offset="0" stop-color="#e5895f"/><stop offset=".55" stop-color="#c9663d"/><stop offset="1" stop-color="#8f3f22"/>
    </radialGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset=".6" stop-color="#c9663d" stop-opacity=".28"/><stop offset="1" stop-color="#c9663d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="#0c0c0b"/>
  <circle cx="256" cy="256" r="${r * 1.3}" fill="url(#glow)"/>
  <circle cx="256" cy="256" r="${r}" fill="url(#plate)"/>
  <circle cx="256" cy="256" r="${r * 0.36}" fill="#0c0c0b"/>
  <path d="M ${256 - r * 0.62} ${256 - r * 0.5} A ${r * 0.8} ${r * 0.8} 0 0 1 ${256 + r * 0.1} ${256 - r * 0.8}"
    stroke="#fff4e6" stroke-opacity=".45" stroke-width="${r * 0.07}" stroke-linecap="round" fill="none"/>
</svg>`;
}

const tile = mark({ radius: 112, plate: 0.62 });
// Maskable icons are cropped to a circle by some launchers: keep the plate inside the safe zone.
const maskable = mark({ radius: 0, plate: 0.5 });

const jobs = [
  ['favicon.png', tile, 64],
  ['favicon-32.png', tile, 32],
  ['apple-touch-icon.png', mark({ radius: 0, plate: 0.6 }), 180],
  ['icon-192.png', tile, 192],
  ['icon-512.png', tile, 512],
  // Google Search shows a site icon from a multiple of 48 px.
  ['favicon-48.png', tile, 48],
  ['icon-maskable-192.png', maskable, 192],
  ['icon-maskable-512.png', maskable, 512],
];
for (const [name, svg, size] of jobs) {
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(pub, name));
}
// Vector favicon for browsers that take one (crisp at any size, one small file).
writeFileSync(join(pub, 'favicon.svg'), tile.replace(/\n\s*/g, ' '));

// favicon.ico: crawlers and old browsers ask for /favicon.ico whatever the page links.
// An ICO may hold PNG images as-is: a 6-byte header, a 16-byte entry per image, then the PNGs.
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) =>
    sharp(Buffer.from(tile), { density: 144 }).resize(s, s).png({ compressionLevel: 9 }).toBuffer(),
  ),
);
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e);
  head.writeUInt8(s, e + 1);
  head.writeUInt16LE(1, e + 4);
  head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(pngs[i].length, e + 8);
  head.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([head, ...pngs]));
console.log(`Rendered ${jobs.length + 2} brand icons into public/`);
