import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { withPage } from './lib/headless.mjs';

// Public stored metadata only: extracted with ReviewService::reviews(..., false).
const cached = JSON.parse(readFileSync('storage/review-cached-public.json', 'utf8'));
for (const [dish, count] of [
  ['com-tam', 5],
  ['pho-bo', 4],
]) {
  if (cached[dish]?.items?.length !== count) throw new Error('Stored HCMC coverage changed');
}
mkdirSync('storage/review-ui', { recursive: true });
const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (const origin of ['http://localhost:5199', 'http://angi.local']) {
  for (const width of [1440, 390]) {
    for (const dish of ['com-tam', 'pho-bo']) {
      process.env.ANGI_HEADLESS_PORT = String(9450 + results.length);
      await withPage(
        origin.includes('localhost') ? `/mon/${dish}` : `${origin}/mon/${dish}`,
        async ({ evaluate, screenshot, send }) => {
          await send('Network.enable');
          await send('Network.setBlockedURLs', {
            urls: ['*youtube-nocookie.com/*', '*youtube.com/*'],
          });
          for (let attempt = 0; attempt < 60; attempt++) {
            if (await evaluate(`!!document.querySelector('.fr-youtube-trigger')`)) break;
            await sleep(500);
          }
          await evaluate(`(() => {
          const cached = ${JSON.stringify(cached)};
          const original = window.fetch.bind(window);
          window.reviewEvidence = { requests: [], gpsCalls: 0 };
          window.fetch = async (input, init) => {
            const url = new URL(String(input), location.href);
            if (url.pathname === '/api/provinces') return new Response(JSON.stringify({items:[{id:'HN',name:'Hà Nội'},{id:'HCMC',name:'Hồ Chí Minh'}]}));
            if (url.pathname === '/api/reviews') {
              const province = url.searchParams.get('province');
              const dishId = url.searchParams.get('dish');
              reviewEvidence.requests.push({route:'reviews', province, dishId, source:province === 'HCMC' ? 'stored-public-cache' : 'mock'});
              return new Response(JSON.stringify(province === 'HCMC' ? cached[dishId] : {dishId,provinceId:'HN',basis:'title-description-only',items:[]}));
            }
            if (url.pathname === '/api/reverse') {
              reviewEvidence.requests.push({route:'reverse',method:init?.method,query:!!url.search,source:'mock',bodyKeys:Object.keys(JSON.parse(init.body))});
              return new Response(JSON.stringify({provinceId:'HCMC',provinceName:'Hồ Chí Minh'}));
            }
            return original(input,init);
          };
          Object.defineProperty(navigator, 'geolocation', {configurable:true,value:{getCurrentPosition(ok, fail){reviewEvidence.gpsCalls++; if(window.denyGPS) fail({code:1}); else setTimeout(()=>ok({coords:{latitude:10.77,longitude:106.69}}),20);}}});
          localStorage.removeItem('angi.review.province');
        })()`);
          const hero = await evaluate(
            `({secure:isSecureContext,frames:document.querySelectorAll('iframe').length,trigger:!!document.querySelector('.fr-youtube-trigger')})`,
          );
          if (!hero.trigger)
            throw new Error(
              'Review opener absent: ' +
                JSON.stringify(
                  await evaluate(`({url:location.href,text:document.body.innerText.slice(0,800)})`),
                ),
            );
          await evaluate(`document.querySelector('.fr-youtube-trigger').click()`);
          await sleep(200);
          const initial = await evaluate(
            `({gpsCalls:reviewEvidence.gpsCalls,frames:document.querySelectorAll('iframe').length,focus:document.activeElement?.getAttribute('aria-label'),bodyLock:document.body.style.overflow,parentLock:document.querySelector('.fr-story__scroll')?.style.overflow,inert:document.querySelector('.fr-story')?.inert})`,
          );
          await evaluate(
            `(() => {const s=document.querySelector('.fr-youtube select');s.value='HCMC';s.dispatchEvent(new Event('change',{bubbles:true}));})()`,
          );
          await sleep(300);
          const manual = await evaluate(
            `({cards:document.querySelectorAll('.fr-youtube__card').length,frames:document.querySelectorAll('iframe').length,province:localStorage.getItem('angi.review.province'),overflow:document.documentElement.scrollWidth>innerWidth,privacy:document.querySelector('.fr-youtube').textContent.includes('không cam kết việc')})`,
          );
          const name = `${hero.secure ? 'localhost' : 'http'}-${dish}-${width}`;
          writeFileSync(`storage/review-ui/${name}-manual.png`, await screenshot());
          await evaluate(`document.querySelector('.fr-youtube__card').click()`);
          await sleep(300);
          const player = await evaluate(
            `({frames:document.querySelectorAll('iframe').length,src:document.querySelector('iframe')?.src})`,
          );
          await evaluate(
            `(() => {const s=document.querySelector('.fr-youtube select');s.value='HN';s.dispatchEvent(new Event('change',{bubbles:true}));})()`,
          );
          await sleep(200);
          const hn = await evaluate(
            `({cards:document.querySelectorAll('.fr-youtube__card').length,frames:document.querySelectorAll('iframe').length})`,
          );
          await evaluate(
            `Array.from(document.querySelectorAll('.fr-youtube button')).find(b=>b.textContent==='Dùng vị trí của tôi').click()`,
          );
          await sleep(200);
          const gps = await evaluate(
            `({calls:reviewEvidence.gpsCalls,province:document.querySelector('.fr-youtube select')?.value,text:document.querySelector('.fr-youtube').textContent,requests:reviewEvidence.requests})`,
          );
          writeFileSync(`storage/review-ui/${name}-gps.png`, await screenshot());
          if (hero.secure) {
            await evaluate(
              `window.denyGPS=true;Array.from(document.querySelectorAll('.fr-youtube button')).find(b=>b.textContent==='Dùng vị trí của tôi').click()`,
            );
            await sleep(100);
          }
          const denied = await evaluate(
            `document.querySelector('.fr-youtube').textContent.includes('từ chối quyền')`,
          );
          // Real keyboard input: Shift+Tab wraps from close into the dialog.
          await evaluate(`document.querySelector('.fr-youtube-dialog__bar button').focus()`);
          await send('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Tab',
            code: 'Tab',
            windowsVirtualKeyCode: 9,
            modifiers: 8,
          });
          await send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: 'Tab',
            code: 'Tab',
            windowsVirtualKeyCode: 9,
            modifiers: 8,
          });
          const trap = await evaluate(
            `document.querySelector('.fr-youtube-dialog').contains(document.activeElement) && document.activeElement !== document.querySelector('.fr-youtube-dialog__bar button')`,
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
          await sleep(100);
          const closed = await evaluate(
            `({popup:!!document.querySelector('.fr-youtube-layer'),parent:!!document.querySelector('.fr-story'),frames:document.querySelectorAll('iframe').length,focus:document.activeElement?.className,bodyLock:document.body.style.overflow,parentLock:document.querySelector('.fr-story__scroll')?.style.overflow,inert:document.querySelector('.fr-story')?.inert,province:localStorage.getItem('angi.review.province')})`,
          );
          const pass =
            initial.gpsCalls === 0 &&
            initial.bodyLock === 'hidden' &&
            initial.parentLock === 'hidden' &&
            initial.inert &&
            manual.cards === (dish === 'com-tam' ? 5 : 4) &&
            !manual.frames &&
            !manual.overflow &&
            manual.privacy &&
            player.frames === 1 &&
            !hn.cards &&
            !hn.frames &&
            trap &&
            !closed.popup &&
            closed.parent &&
            !closed.frames &&
            closed.focus === 'fr-youtube-trigger' &&
            !closed.inert &&
            (hero.secure
              ? gps.calls === 1 && gps.province === 'HCMC' && denied
              : gps.calls === 0 && gps.text.includes('GPS cần HTTPS hoặc localhost'));
          results.push({
            origin,
            width,
            dish,
            hero,
            initial,
            manual,
            player,
            hn,
            gps,
            denied,
            trap,
            closed,
            pass,
          });
          writeFileSync('storage/review-ui/results.json', JSON.stringify(results, null, 2));
          console.log(name, pass ? 'PASS' : 'FAIL');
          if (!pass) throw new Error('Review browser assertion failed: ' + name);
        },
        { width, height: 900, ready: null },
      );
    }
  }
}
console.log(
  '8 browser scenarios passed; no review/reverse provider requests. GPS mocked only in secure localhost; no security bypass.',
);
