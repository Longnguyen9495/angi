import { mkdirSync, writeFileSync } from 'node:fs';
import { withPage } from '../lib/headless.mjs';

/*
 * QA screenshots of the real Vườn Mây game (G2–G4) in the sandbox (/sky-garden-test?game=1, a
 * made-up garden with the server stood in for): the welcome, the first floor, then a five-floor
 * garden (preset=rich) as a whole, one floor zoomed in, a pot tapped, and each dock sheet.
 * Writes storage/sky-garden-qa/game-<w>x<h>-<step>.png.
 * Run: node scripts/sky-garden/game-shots.mjs
 */

const OUT = 'storage/sky-garden-qa';
const SCREENS = [
  [390, 844, 2],
  [1366, 768, 1],
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

await withPage(
  '/sky-garden-test?lang=vi&game=1',
  async ({ evaluate, screenshot, send }) => {
    const go = async (path) => {
      await send('Page.navigate', { url: new URL(path, await evaluate('location.href')).href });
      await wait(3000);
    };
    const click = (selector, i = 0) =>
      evaluate(
        `(() => { const b = document.querySelectorAll(${JSON.stringify(selector)})[${i}]; if (b) b.click(); return !!b })()`,
      );
    const button = (text) =>
      evaluate(
        `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b })()`,
      );
    for (const [w, h, dpr] of SCREENS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: dpr,
        mobile: w < 600,
      });
      const shot = async (name) => {
        await wait(1200);
        writeFileSync(`${OUT}/game-${w}x${h}-${name}.png`, await screenshot());
      };
      await go('/sky-garden-test?lang=vi&game=1');
      await shot('1-welcome');
      await click('.sk-gate .sk-btn');
      // Past the first-visit intro (the clouds part).
      await wait(6000);
      await shot('2-first-floor');

      await go('/sky-garden-test?lang=vi&game=1&preset=rich');
      await shot('3-overview');
      await evaluate(`window.__skyGame?.setMode('focus', 0)`);
      await shot('4-focus');
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: w / 2,
        y: h / 2,
        button: 'left',
        clickCount: 1,
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: w / 2,
        y: h / 2,
        button: 'left',
        clickCount: 1,
      });
      await shot('5-tap');
      await evaluate(`document.querySelector('.sk-sheet__close, [data-sheet-close]')?.click()`);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
      for (const [i, [label, name]] of [
        ['Kho mây', 'store'],
        ['Cửa hàng', 'shop'],
        ['Bộ sưu tập', 'sets'],
        ['Khinh khí cầu', 'balloon'],
      ].entries()) {
        if (!(await button(label))) continue;
        await shot(`${6 + i}-${name}`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
        await wait(400);
      }
    }
  },
  { ready: null, width: 1366, height: 900 },
);
