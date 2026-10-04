// Renders the link-preview artwork from the HTML sources next to this file.
// Usage: node scripts/brand/render.mjs
// Output: public/og-image.jpg (site preview, 1200×630 JPEG) and
// server/web/og-dish-base.png (background that server/web/share.php draws each dish on).
// Headless Chrome/Edge at DPR 1 (scripts/lib/headless.mjs), so the app's own fonts are used.
import { join } from 'node:path';
import sharp from 'sharp';
import { withPage } from '../lib/headless.mjs';

const root = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const jobs = [
  ['scripts/brand/og-image.html', 'public/og-image.jpg'],
  ['scripts/brand/og-dish-base.html', 'server/web/og-dish-base.png'],
];

for (const [page, out] of jobs) {
  await withPage(
    page,
    async ({ evaluate, screenshot }) => {
      // Fonts and photos must be in before the shot.
      await evaluate(
        'Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))])',
      );
      await new Promise((r) => setTimeout(r, 300));
      const png = sharp(await screenshot());
      const file = join(root, out);
      if (out.endsWith('.jpg')) await png.jpeg({ quality: 86, mozjpeg: true }).toFile(file);
      else await png.png({ compressionLevel: 9 }).toFile(file);
      console.log(`Saved ${out}`);
    },
    { width: 1200, height: 630, ready: null },
  );
}
