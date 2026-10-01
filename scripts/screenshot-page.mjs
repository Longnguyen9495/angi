import { writeFileSync } from 'node:fs';
import { withPage } from './lib/headless.mjs';

/*
 * Screenshots any app page under Vite in headless Chrome/Edge.
 * Run: node scripts/screenshot-page.mjs <path> <out.png> [css-selector-to-scroll-to] [wait-ms]
 *   e.g. node scripts/screenshot-page.mjs "journey?renderer=three" storage/garden.png .g3d 6000
 */

const [path, out, selector, wait = '5000'] = process.argv.slice(2);
await withPage(
  path,
  async ({ evaluate, screenshot }) => {
    await new Promise((r) => setTimeout(r, Number(wait)));
    if (selector)
      await evaluate(
        `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'center' })`,
      );
    await new Promise((r) => setTimeout(r, Number(wait)));
    writeFileSync(out, await screenshot());
    console.log(`Saved ${out}`);
  },
  { ready: null },
);
