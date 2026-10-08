import { mkdirSync, writeFileSync } from 'node:fs';
import { withPage } from '../lib/headless.mjs';

/*
 * QA screenshots of the Vườn Mây motion demo (G1, plans/vuon-may.md §0.15.4 and §18.4): for each
 * screen size, the whole tower, one floor zoomed in as a row (1×6, panning) and as a grid (2×3),
 * and the night. Writes storage/sky-garden-qa/shot-<w>x<h>-<view>.png and prints the frame rate
 * the page measured (headless software rendering: not a device number).
 * Run: node scripts/sky-garden/shots.mjs   (GPU=1 to use the machine's GPU)
 */

const OUT = 'storage/sky-garden-qa';
const SCREENS = [
  [360, 800, 3],
  [390, 844, 3],
  [430, 932, 3],
  [768, 1024, 2],
  [1366, 768, 1],
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

await withPage(
  '/sky-garden-test?lang=vi',
  async ({ evaluate, screenshot, send }) => {
    // Hide the demo panel and skip the long intro for the shots.
    await evaluate(
      `localStorage.setItem('sky-garden/panel', '0'); localStorage.setItem('sky-garden/intro-seen', '1')`,
    );
    const rows = [];
    for (const [w, h, dpr] of SCREENS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: dpr,
        mobile: w < 600,
      });
      await send('Page.reload');
      await wait(3500);
      const shot = async (name) => {
        const file = `${OUT}/shot-${w}x${h}-${name}.png`;
        writeFileSync(file, await screenshot());
        const s = await evaluate(
          `(() => { const g = window.__skyGarden; return g ? JSON.stringify({ fps: g.lastStats?.fps, cell: g.lastStats?.cell }) : null })()`,
        );
        rows.push({ screen: `${w}x${h}@${dpr}`, view: name, ...(s ? JSON.parse(s) : {}) });
      };
      await shot('overview');
      await evaluate(`window.__skyGarden.setShape('row'); window.__skyGarden.setMode('focus', 0)`);
      await wait(1400);
      await shot('focus-row');
      await evaluate(`window.__skyGarden.setShape('grid')`);
      await wait(1400);
      await shot('focus-grid');
      await evaluate(
        `window.__skyGarden.setMode('overview'); window.__skyGarden.setDayPart('night')`,
      );
      await wait(1400);
      await shot('night');
    }
    console.table(rows);
  },
  { ready: null, width: 1366, height: 900, gpu: !!process.env.GPU },
);
