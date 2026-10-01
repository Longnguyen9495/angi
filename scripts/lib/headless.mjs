import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

/*
 * Dev pages under Vite in headless Chrome/Edge, driven over the DevTools
 * protocol (Node's built-in WebSocket; no Playwright dependency).
 * `withPage(path, fn)` serves the repo, opens `path`, waits until the page sets
 * document.title to `ready` (or, with `ready: null`, until it has loaded), and
 * hands `fn` an evaluate/screenshot API.
 */

const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export async function withPage(
  path,
  fn,
  { width = 1280, height = 900, ready = 'ready', gpu = false } = {},
) {
  const browserPath = BROWSERS.find((p) => existsSync(p));
  if (!browserPath) throw new Error('No Chrome/Edge found; set BROWSER=/path/to/browser');
  const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
  await server.listen();
  const url = new URL(path, server.resolvedUrls.local[0]).href;
  const profile = mkdtempSync(join(tmpdir(), 'angi-headless-'));
  const port = Number(process.env.ANGI_HEADLESS_PORT || 9333);
  const browser = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      // gpu: the machine's GPU (frame-rate measurements); default: software GL (stable screenshots).
      ...(gpu
        ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
        : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
      '--no-first-run',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  let ws;
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = list.find((t) => t.type === 'page');
      } catch {
        /* not up yet */
      }
    }
    if (!target) throw new Error('Browser DevTools endpoint did not come up');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => {
      ws.onopen = r;
      ws.onerror = j;
    });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.consoleAPICalled')
        console.log('[page]', msg.params.args.map((a) => a.value ?? a.description).join(' '));
      if (msg.method === 'Runtime.exceptionThrown')
        console.error('[page error]', msg.params.exceptionDetails.exception?.description);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };
    const send = (method, params = {}) =>
      new Promise((r) => {
        const n = ++id;
        pending.set(n, r);
        ws.send(JSON.stringify({ id: n, method, params }));
      });
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
    const screenshot = async () => {
      const res = await send('Page.captureScreenshot', { format: 'png' });
      return Buffer.from(res.result.data, 'base64');
    };
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url });
    for (let i = 0; ; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const done =
        ready === null
          ? (await evaluate('document.readyState')) === 'complete'
          : (await evaluate('document.title')) === ready;
      if (done) break;
      if (i === 300) throw new Error(`${path} did not become ready`);
    }
    return await fn({ evaluate, screenshot, send });
  } finally {
    ws?.close();
    // On Windows kill() only ends the parent; the renderer/GPU children would linger.
    if (process.platform === 'win32' && browser.pid)
      spawnSync('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
    else browser.kill();
    await server.close();
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* the browser may still hold the profile for a moment */
    }
  }
}
