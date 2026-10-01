import { writeFileSync } from 'node:fs';
import { withPage } from './lib/headless.mjs';

/*
 * Screenshots the PlayCanvas garden (scripts/farm-preview/) in headless
 * Chrome/Edge once its loading veil is gone, and reports console errors.
 * Run: node scripts/preview-farm-pc.mjs [scene-version] [out.png]
 *   e.g. node scripts/preview-farm-pc.mjs corner-v3 storage/preview-v3.png
 */

const [scene, out = 'storage/farm-preview.png'] = process.argv.slice(2);
const path = `scripts/farm-preview/index.html${scene ? `?scene=${scene}` : ''}`;
await withPage(
  path,
  async ({ evaluate, screenshot }) => {
    // Wait for the canvas and for the loading veil to lift (or 60 s).
    for (let i = 0; i < 300; i++) {
      const state = await evaluate(
        `(() => { const c = document.querySelector('canvas'); const veil = document.querySelector('.fpc__veil--loading'); return c ? (veil ? 'loading' : 'ready') : 'none'; })()`,
      );
      if (state === 'ready') break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 3000));
    writeFileSync(out, await screenshot());
    console.log(`Saved ${out}`);
  },
  { ready: 'Farm preview' },
);
