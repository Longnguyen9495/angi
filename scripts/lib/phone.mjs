import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { constants, setPriority, tmpdir } from 'node:os';
import { join } from 'node:path';

/*
 * A phone in headless Chrome/Edge over the DevTools protocol (no Playwright): a device
 * viewport with touch, a phone user agent and DPR 2, real touch taps (Input.dispatchTouchEvent)
 * and screenshots. Used by scripts/phone-check.mjs against http://angi.local (the built app and
 * the local API), so it sees exactly what a guest on a phone sees.
 *
 * Kind to the machine it runs on: the farm is drawn on the graphics card (PHONE_GPU=0 for
 * software GL), at DPR 1 (PHONE_DPR=2 for sharp screenshots), and the checks and their browser
 * run below normal priority, so the editor and everything else stay responsive
 * (PHONE_PRIORITY=normal to turn that off).
 */

const GPU = process.env.PHONE_GPU !== '0';
const DPR = Number(process.env.PHONE_DPR) || 1;
const LOW = process.env.PHONE_PRIORITY !== 'normal';
const belowNormal = (pid) => {
  try {
    setPriority(pid, constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    /* not allowed here: run at normal priority */
  }
};
// Windows hands a below-normal class down to child processes: the browser and its renderers.
if (LOW) belowNormal(0);

const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

// Every notice, recorded by the page itself: its text, and 1.1 s later (at rest after the
// pop-in) its box and the boxes of what it must not cover. Checks read this afterwards, so a
// busy machine cannot make a short notice slip by unmeasured.
const TOAST_RECORDER = `(() => {
window.__toasts = [];
const seen = new WeakSet();
const box = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null;
};
const record = (n) => {
  if (seen.has(n)) return;
  seen.add(n);
  const rec = { text: n.textContent, at: Date.now(), rect: null, others: {} };
  window.__toasts.push(rec);
  // At rest: 1.1 s in, then whatever is still animating (a busy phone runs the pop-in late).
  new Promise((r) => setTimeout(r, 1100))
    .then(() => Promise.all(n.getAnimations().map((a) => a.finished)))
    .catch(() => {})
    .then(() => {
      rec.rect = box(n);
      for (const [k, sel] of [['plot card', '.fj-plot-card'], ['seed tray and tools', '.fg-tray'], ['dock', '.fg-dock'], ['HUD', '.fg-hud']])
        rec.others[k] = box(document.querySelector(sel));
    });
};
// A notice may arrive inside a new wrapper, so look inside every added element.
new MutationObserver((list) => {
  for (const m of list)
    for (const n of m.addedNodes)
      if (n instanceof HTMLElement)
        for (const t of n.matches('.toast') ? [n] : n.querySelectorAll('.toast')) record(t);
}).observe(document, { subtree: true, childList: true });
})();
`;

export const DEVICES = {
  // Small Android, the most common iPhone size, a large iPhone (the 440px layout).
  'android-360': { width: 360, height: 740, ua: 'android' },
  'iphone-390': { width: 390, height: 844, ua: 'iphone' },
  'iphone-440': { width: 440, height: 956, ua: 'iphone' },
};

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
};

// Browsers still open. If a check throws or is interrupted before phone.close(), the
// headless Chrome would keep running (software-rendering the farm at full CPU) and its
// temp profile would stay behind, so kill whatever is left when the process ends.
const open = new Set();
function killBrowser(browser) {
  open.delete(browser);
  if (process.platform === 'win32' && browser.pid)
    spawnSync('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
  else browser.kill();
  try {
    rmSync(browser.profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch {
    /* still held for a moment */
  }
}
process.on('exit', () => [...open].forEach(killBrowser));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
for (const ev of ['uncaughtException', 'unhandledRejection'])
  process.on(ev, (e) => {
    console.error(e);
    process.exit(1);
  });

export async function openPhone(device, { port = 9444, gpu = GPU, dpr = DPR } = {}) {
  const d = DEVICES[device];
  const browserPath = BROWSERS.find((p) => existsSync(p));
  if (!browserPath) throw new Error('No Chrome/Edge found; set BROWSER=/path/to/browser');
  const profile = mkdtempSync(join(tmpdir(), 'angi-phone-'));
  const browser = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${d.width},${d.height}`,
      ...(gpu ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
      '--lang=vi-VN',
      '--no-first-run',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  if (LOW && browser.pid) belowNormal(browser.pid);
  browser.profile = profile;
  open.add(browser);
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(
        (t) => t.type === 'page',
      );
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('Browser DevTools endpoint did not come up');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Runtime.exceptionThrown')
      errors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error')
      errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  // Every call answers within 30 s, or the step fails instead of the whole run hanging.
  const send = (method, params = {}) =>
    new Promise((r, j) => {
      const n = ++id;
      const timer = setTimeout(() => {
        pending.delete(n);
        j(new Error(`${method} took longer than 30 s`));
      }, 30000);
      pending.set(n, (msg) => {
        clearTimeout(timer);
        r(msg);
      });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: d.width,
    height: d.height,
    deviceScaleFactor: dpr,
    mobile: true,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setUserAgentOverride', { userAgent: UA[d.ua], acceptLanguage: 'vi-VN,vi' });
  await send('Emulation.setLocaleOverride', { locale: 'vi-VN' });
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: TOAST_RECORDER });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.result?.exceptionDetails)
      throw new Error(res.result.exceptionDetails.exception?.description ?? 'page exception');
    return res.result?.result?.value;
  };
  const touch = (type, x, y) =>
    send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 6, radiusY: 6, force: 1 }],
    });
  const phone = {
    device,
    width: d.width,
    height: d.height,
    errors,
    send,
    evaluate,
    async goto(url, waitMs = 1500) {
      await send('Page.enable');
      await send('Page.navigate', { url });
      for (let i = 0; i < 150; i++) {
        await sleep(200);
        if ((await evaluate('document.readyState')) === 'complete') break;
      }
      await sleep(waitMs);
    },
    /** A finger tap at viewport point (x, y). */
    async tap(x, y, waitMs = 500) {
      await touch('touchStart', x, y);
      await sleep(60);
      await touch('touchEnd', x, y);
      await sleep(waitMs);
    },
    /** A finger drag from one point to another. */
    async drag(x1, y1, x2, y2, steps = 12) {
      await touch('touchStart', x1, y1);
      for (let i = 1; i <= steps; i++) {
        await send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }],
        });
        await sleep(16);
      }
      await touch('touchEnd', x2, y2);
      await sleep(400);
    },
    /** Centre of the first visible element matching `selector` (and containing `text`). */
    async box(selector, text = null) {
      return evaluate(`(() => {
        const els = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((el) => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'
            && (${JSON.stringify(text)} === null || el.textContent.includes(${JSON.stringify(text)})
              || (el.getAttribute('aria-label') || '').includes(${JSON.stringify(text)}));
        });
        const el = els[0];
        if (!el) return null;
        // A finger scrolls a list to reach a button out of sight: below the fold, or scrolled up
        // under a panel's header (inside the viewport, but clipped by its scroll box).
        // (Only the nearest scroll box moves, as under a thumb: scrollIntoView would also shift the fixed game frame.)
        let r = el.getBoundingClientRect();
        let box = el.parentElement;
        while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
        const clip = box ? box.getBoundingClientRect() : { top: 0, bottom: innerHeight, height: innerHeight };
        const top = Math.max(0, clip.top), bottom = Math.min(innerHeight, clip.bottom);
        if (box && (r.top < top || r.bottom > bottom)) {
          box.scrollTop += r.top - clip.top - clip.height / 2 + r.height / 2;
          r = el.getBoundingClientRect();
        }
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
          top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      })()`);
    },
    /**
     * Taps the element once it has stopped moving (a panel sliding up), as a finger would;
     * throws when it is missing (the check then fails with its name).
     */
    async tapEl(selector, text = null, waitMs = 600) {
      let b = await phone.box(selector, text);
      for (let i = 0; i < 15 && b; i++) {
        await sleep(120);
        const again = await phone.box(selector, text);
        const still = again && Math.abs(again.x - b.x) < 1 && Math.abs(again.y - b.y) < 1;
        b = again;
        if (still) break;
      }
      if (!b) throw new Error(`not on screen: ${selector}${text ? ` "${text}"` : ''}`);
      await phone.tap(b.x, b.y, waitMs);
      return b;
    },
    /** Types into the focused field, like the on-screen keyboard. */
    async type(text) {
      await send('Input.insertText', { text });
      await sleep(200);
    },
    async waitFor(selector, text = null, ms = 8000) {
      for (let t = 0; t < ms; t += 200) {
        const b = await phone.box(selector, text);
        if (b) return b;
        await sleep(200);
      }
      return null;
    },
    /** A screenshot for the report; a slow one is skipped, it never fails a check. */
    async shot(file) {
      try {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(file, Buffer.from(res.result.data, 'base64'));
      } catch (e) {
        console.log(`    (screenshot skipped: ${e.message})`);
      }
    },
    async close() {
      ws.close();
      killBrowser(browser);
    },
  };
  return phone;
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
