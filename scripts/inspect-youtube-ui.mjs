import { mkdirSync, writeFileSync } from 'node:fs';
import { withPage } from './lib/headless.mjs';

mkdirSync('storage/youtube-ui', { recursive: true });
const results = [];
for (const slug of ['com-tam', 'pho-bo']) {
  for (const width of [1440, 1920, 390]) {
    await withPage(
      `http://angi.local/mon/${slug}`,
      async ({ evaluate, screenshot, send }) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const hero = await evaluate(
          `({url:location.href, frames:document.querySelectorAll('iframe').length,cards:document.querySelectorAll('.fr-youtube__card').length,overflow:document.documentElement.scrollWidth>innerWidth})`,
        );
        writeFileSync(`storage/youtube-ui/${slug}-${width}-hero.png`, await screenshot());
        await evaluate(`document.querySelector('.fr-youtube-trigger')?.click()`);
        const before = await evaluate(`(() => {
        const section = document.querySelector('.fr-youtube');
        section?.scrollIntoView({block:'center'});
        return {url:location.href, cards:document.querySelectorAll('.fr-youtube__card').length, frames:document.querySelectorAll('.fr-media--youtube iframe').length, links:section?.querySelectorAll('a').length, overflow:document.documentElement.scrollWidth > innerWidth};
      })()`);
        await new Promise((resolve) => setTimeout(resolve, 700));
        writeFileSync(`storage/youtube-ui/${slug}-${width}-cards.png`, await screenshot());
        // Real input gesture, not synthetic DOM click.
        const point = await evaluate(
          `(() => {const b=document.querySelector('.fr-youtube__card'); if(!b)return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
        );
        if (point) {
          await send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            ...point,
            button: 'left',
            clickCount: 1,
          });
          await send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            ...point,
            button: 'left',
            clickCount: 1,
          });
          await evaluate(
            `document.querySelector('.fr-youtube-stage')?.scrollIntoView({block:'center'})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        const after = await evaluate(
          `({url:location.href, frames:document.querySelectorAll('.fr-media--youtube iframe').length, selected:document.querySelectorAll('.fr-youtube__card[aria-pressed="true"]').length, status:document.querySelector('.fr-youtube-stage__status')?.textContent, frameSrc:document.querySelector('.fr-media--youtube iframe')?.src})`,
        );
        writeFileSync(`storage/youtube-ui/${slug}-${width}-player.png`, await screenshot());
        await evaluate(`document.querySelectorAll('.fr-youtube__card')[1]?.click()`);
        const switched = await evaluate(
          `({frames:document.querySelectorAll('.fr-media--youtube iframe').length, selected:document.querySelectorAll('.fr-youtube__card[aria-pressed="true"]').length, frameSrc:document.querySelector('.fr-media--youtube iframe')?.src})`,
        );
        await send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
        });
        const reduced = await evaluate(
          `getComputedStyle(document.querySelector('.fr-youtube__list li') || document.body).animationName`,
        );
        await send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: 'Escape',
          code: 'Escape',
          windowsVirtualKeyCode: 27,
        });
        await send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: 'Escape',
          code: 'Escape',
          windowsVirtualKeyCode: 27,
        });
        const closed = await evaluate(
          `({frames:document.querySelectorAll('iframe').length,popup:!!document.querySelector('.fr-youtube-layer'),parent:!!document.querySelector('.fr-story'),focus:document.activeElement?.className,bodyOverflow:document.body.style.overflow,parentOverflow:document.querySelector('.fr-story__scroll')?.style.overflow})`,
        );
        results.push({ slug, width, hero, before, after, switched, reduced, closed });
        if (
          hero.frames ||
          hero.cards ||
          before.cards !== 5 ||
          after.frames !== 1 ||
          switched.frames !== 1 ||
          closed.frames ||
          closed.popup ||
          !closed.parent ||
          reduced !== 'none'
        )
          throw new Error('Popup inspection failed: ' + slug + ' ' + width);
      },
      { width, height: 900, ready: null },
    );
  }
}
writeFileSync('storage/youtube-ui/results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
