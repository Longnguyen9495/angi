import { withPage } from './lib/headless.mjs';

/*
 * Runs a JavaScript expression against the running PlayCanvas garden
 * (scripts/farm-preview/) once it has loaded; `app` is the PlayCanvas app.
 * Run: node scripts/inspect-farm-pc.mjs <scene-version> "<expression>"
 */

const [scene, expr] = process.argv.slice(2);
await withPage(
  `scripts/farm-preview/index.html?scene=${scene}`,
  async ({ evaluate }) => {
    for (let i = 0; i < 300; i++) {
      if (
        await evaluate(
          `!!document.querySelector('canvas') && !document.querySelector('.fpc__veil--loading')`,
        )
      )
        break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 1500));
    console.log(
      JSON.stringify(
        await evaluate(`(() => { const app = pc.AppBase.getApplication(); return (${expr}); })()`),
        null,
        1,
      ),
    );
  },
  { ready: 'Farm preview' },
);
