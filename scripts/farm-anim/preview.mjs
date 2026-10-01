import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withPage } from '../lib/headless.mjs';

/*
 * Opens /farm-animation-test in headless Chrome/Edge at desktop and phone sizes (and with
 * prefers-reduced-motion), lets it run, saves frames a few seconds apart and prints the
 * measured stats. Note: headless uses a software GPU, so FPS here is a floor, not a device number.
 *
 * Run: node scripts/farm-anim/preview.mjs [outDir]
 */

const OUT = resolve(process.argv[2] ?? 'storage/farm-anim-preview');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(tag, width, height, { reduced = false, mobile = false } = {}) {
  return withPage(
    '/farm-animation-test',
    async ({ evaluate, screenshot, send }) => {
      if (reduced)
        await send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
        });
      if (mobile)
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 2,
          mobile: true,
        });
      const t0 = Date.now();
      while (!(await evaluate('!!window.__farmAnim'))) {
        if (Date.now() - t0 > 30000) throw new Error('scene did not start');
        await wait(200);
      }
      const loadMs = Date.now() - t0;
      // Move the pointer so parallax and hover run, then let it live.
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: width * 0.7,
        y: height * 0.4,
      });
      const shots = [];
      const samples = [];
      for (const at of [1500, 6000, 12000]) {
        await wait(at - (shots.length ? [1500, 6000, 12000][shots.length - 1] : 0));
        writeFileSync(join(OUT, `${tag}-${at / 1000}s.png`), await screenshot());
        shots.push(at);
        samples.push(await evaluate('JSON.stringify(window.__farmAnim.getStats())'));
      }
      // A gust and a fish jump on demand, captured mid-way.
      await evaluate('window.__farmAnim.gust(), window.__farmAnim.jump(), true');
      await wait(2200);
      writeFileSync(join(OUT, `${tag}-gust.png`), await screenshot());
      samples.push(await evaluate('JSON.stringify(window.__farmAnim.getStats())'));
      return { tag, width, height, reduced, loadMs, samples: samples.map((s) => JSON.parse(s)) };
    },
    { width, height, ready: null },
  );
}

const results = [];
results.push(await run('desktop', 1440, 810));
results.push(await run('phone', 390, 844, { mobile: true }));
results.push(await run('reduced', 1280, 720, { reduced: true }));
console.log(JSON.stringify(results, null, 2));
