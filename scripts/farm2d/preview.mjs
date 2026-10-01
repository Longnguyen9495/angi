import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withPage } from '../lib/headless.mjs';

/*
 * Checks the farm-2d PlayCanvas build (public/farm2d/play) the way the site uses it: inside an
 * iframe, talking over postMessage. Taps a plot, the pond and the dock and checks the intents
 * that come back, sends a farm:view and screenshots the result at desktop and phone size.
 *
 * Run: node scripts/farm2d/preview.mjs [outDir]
 */

const OUT = resolve(process.argv[2] ?? 'storage/farm2d-preview');
mkdirSync(OUT, { recursive: true });
const PIC = [1678, 937];

async function run(width, height, tag) {
  return withPage(
    '/farm2d/layout.json',
    async ({ evaluate, screenshot, send }) => {
      await evaluate(`(() => {
        window.__msgs = [];
        addEventListener('message', (e) => window.__msgs.push(e.data));
        document.documentElement.innerHTML = '<body style="margin:0"><iframe id="f" src="/farm2d/play/index.html" style="border:0;width:${width}px;height:${height}px;display:block"></iframe></body>';
        return true;
      })()`);
      const t0 = Date.now();
      while (!(await evaluate(`window.__msgs.some((m) => m && m.type === 'farm:ready')`))) {
        if (Date.now() - t0 > 60000) throw new Error('no farm:ready');
        await new Promise((r) => setTimeout(r, 250));
      }
      const readyMs = Date.now() - t0;
      await new Promise((r) => setTimeout(r, 1500));
      writeFileSync(join(OUT, `${tag}-demo.png`), await screenshot());

      // Picture px → page px: cover fit, panned to the stage's default focus (760, 540) and clamped.
      const s = Math.max(width / PIC[0], height / PIC[1]);
      const clamp = (v, m) => Math.max(-m, Math.min(m, v));
      const panX = clamp((PIC[0] / 2 - 760) * s, Math.max(0, (PIC[0] * s - width) / 2));
      const panY = clamp((540 - PIC[1] / 2) * s, Math.max(0, (PIC[1] * s - height) / 2));
      const toPage = ([x, y]) => [
        (x - PIC[0] / 2) * s + width / 2 + panX,
        (y - PIC[1] / 2) * s + height / 2 - panY,
      ];
      const tap = async (pt) => {
        const [x, y] = toPage(pt);
        for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
          await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
        await new Promise((r) => setTimeout(r, 150));
      };
      const taps = {
        plot5: [617, 484],
        pond: [1015, 800],
        dock: [1052, 600],
        farmhouse: [640, 150],
      };
      const got = {};
      for (const [k, pt] of Object.entries(taps)) {
        const [x, y] = toPage(pt);
        if (x < 0 || y < 0 || x > width || y > height) {
          got[k] = 'off-screen';
          continue;
        }
        await evaluate('window.__msgs.length = 0, true');
        await tap(pt);
        got[k] = await evaluate(
          `JSON.stringify(window.__msgs.filter((m) => m.type === 'farm:intent'))`,
        );
      }
      // Hover a plot so its glow shows in the next shot, then push a host view.
      const [hx, hy] = toPage([525, 527]);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hx, y: hy });
      await evaluate(`document.getElementById('f').contentWindow.postMessage({ type: 'farm:view', selected: 5, plots: [
        { id: 1, tile: 'grass' }, { id: 2, tile: 'grass' }, { id: 3, tile: 'grass' },
        { id: 4, tile: 'soil', crop: 'tomato', stage: 'ready' }, { id: 5, tile: 'soil', crop: 'garlic', stage: 'young' }, { id: 6, tile: 'seeded' },
        { id: 7, tile: 'soil', crop: 'cucumber', stage: 'flowering' }, { id: 8, tile: 'soil', crop: 'bean', stage: 'sprout' }, { id: 9, tile: 'soil' },
      ] }, '*'), true`);
      await new Promise((r) => setTimeout(r, 800));
      writeFileSync(join(OUT, `${tag}-view.png`), await screenshot());
      return { tag, width, height, readyMs, got };
    },
    { width, height, ready: null },
  );
}

const results = [];
results.push(await run(1280, 720, 'desktop'));
results.push(await run(390, 760, 'phone'));
console.log(JSON.stringify(results, null, 2));
