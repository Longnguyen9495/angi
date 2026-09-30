// Brand icons from the in-app logo mark (a copper plate with a dark centre).
// Usage: node scripts/generate-brand.mjs
// Output (public/): favicon.png (64), favicon-32.png, apple-touch-icon.png (180),
// icon-192.png, icon-512.png, icon-maskable-512.png. Static rasters only.
// The link-preview image (og-image.jpg) comes from scripts/brand/og-image.html.
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
  ['icon-maskable-512.png', maskable, 512],
];
for (const [name, svg, size] of jobs) {
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(pub, name));
}
console.log(`Rendered ${jobs.length} brand icons into public/`);
