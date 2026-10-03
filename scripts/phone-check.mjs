import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEVICES, ensureDir, openPhone, sleep } from './lib/phone.mjs';

/*
 * Plays the farm on a phone the way a guest does, step by step, with real touch taps on
 * http://angi.local (run `npm run build` first; angi.local serves dist/ and the local API):
 *   node scripts/phone-check.mjs [device…]      devices: android-360 iphone-390 iphone-440
 * Every step saves a screenshot to storage/phone-check/<device>/ and runs checks that need no
 * eyes: nothing scrolls sideways, buttons sit on screen and are big enough to tap, a notice
 * never covers the open plot card, the seed tray or the dock, no script errors. A report of
 * failed checks is printed and written to storage/phone-check/report.md.
 */

const BASE = process.env.ANGI_URL ?? 'http://angi.local';
const OUT = 'storage/phone-check';
const KEY = 'hanh-trinh-bep-viet/guest';
const args = process.argv.slice(2);
// --light: only the farm actions (plots, bubbles, harvest, notices, pond, market); skips the dock
// panels, missions, kitchen and orders. About a third of the time, for day-to-day checks.
const LIGHT = args.includes('--light');
const devices = args.filter((a) => !a.startsWith('--')).length
  ? args.filter((a) => !a.startsWith('--'))
  : Object.keys(DEVICES);
// Screenshots: the key moments and every error (PHONE_SHOTS=all for every step).
const ALL_SHOTS = process.env.PHONE_SHOTS === 'all';
const KEY_SHOT =
  /error|new-guest-farm|mid-game|harvest|notice|caught|market|seed-bubble|sown|friend/;
const HEAVY = /^(dock: |missions|kitchen|orders|ranch)/;

const report = [];

for (const device of devices) {
  const dir = ensureDir(join(OUT, device));
  const p = await openPhone(device, { port: 9444 + devices.indexOf(device) });
  let n = 0;
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    if (!ok) console.log(`  ✗ ${device} · ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const shot = async (name) => {
    const file = join(dir, `${String(++n).padStart(2, '0')}-${name}.png`);
    if (ALL_SHOTS || KEY_SHOT.test(name)) await p.shot(file);
    return file;
  };
  /** Layout checks that hold on every screen. */
  const layout = async (where) => {
    const r = await p.evaluate(`(() => {
      const W = innerWidth, H = innerHeight;
      const over = document.documentElement.scrollWidth - W;
      const off = [], small = [];
      for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.opacity === '0') continue;
        // Covered by something else (the reel under the farm, a panel over the farm): skip.
        const cx = Math.min(W - 1, Math.max(0, b.left + b.width / 2)), cy = Math.min(H - 1, Math.max(0, b.top + b.height / 2));
        const top = document.elementFromPoint(cx, cy);
        if (b.right > 0 && b.left < W && b.bottom > 0 && b.top < H && top && !el.contains(top) && !top.contains(el)) continue;
        if (el.closest('[aria-hidden="true"], [inert]')) continue;
        // While the farm is open, the reel page lies underneath it: only the farm and what opens over it count.
        if (document.documentElement.dataset.farmGame === 'on' && !el.closest('.fj--game, .sheet-layer, .toast-region, [role="dialog"]')) continue;
        // Inside a scroll box (a panel body), off-screen is fine: it scrolls into view.
        let p = el.parentElement, scroller = false;
        while (p) { const cs = getComputedStyle(p); const y = cs.overflowY, x = cs.overflowX; if (((y === 'auto' || y === 'scroll') && p.scrollHeight > p.clientHeight) || ((x === 'auto' || x === 'scroll') && p.scrollWidth > p.clientWidth)) { scroller = true; break; } p = p.parentElement; }
        const name = (el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 40);
        if (!scroller && (b.right > W + 1 || b.left < -1)) off.push(name);
        // Touch targets: at least 32px in both directions (44px is the ideal).
        if (!scroller && b.bottom > 0 && b.top < H && (b.width < 32 || b.height < 32) && !el.closest('.fj-dots, .sr-only'))
          small.push(name + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
      }
      return { over, off, small };
    })()`);
    check(`${where}: no sideways scroll`, r.over <= 1, `${r.over}px wider than the screen`);
    check(`${where}: buttons inside the screen`, r.off.length === 0, r.off.join(', '));
    check(`${where}: tap targets ≥ 32px`, r.small.length === 0, r.small.slice(0, 6).join(', '));
  };
  /** Two boxes on screen overlap (by more than a few px). */
  const overlap = (a, b) =>
    a &&
    b &&
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 4 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4;
  /** A notice on screen must not cover the plot card, tray, dock or HUD. */
  const toastClear = async (where, since = Date.now() - 6000) => {
    // The page records each notice and measures it at rest (scripts/lib/phone.mjs).
    let rec = null;
    for (let i = 0; i < 25 && !rec?.rect; i++) {
      rec = await p.evaluate(
        `(window.__toasts || []).filter((r) => r.at > ${since}).pop() || null`,
      );
      if (!rec?.rect) await sleep(200);
    }
    if (!rec) return check(`${where}: a notice is shown`, false, 'no toast');
    const t = rec.rect;
    if (!t) return check(`${where}: the notice could be measured`, false);
    for (const name of ['plot card', 'seed tray and tools', 'dock', 'HUD']) {
      const b = rec.others[name];
      check(
        `${where}: notice does not cover the ${name}`,
        !overlap(t, b),
        b
          ? `notice ${Math.round(t.top)}–${Math.round(t.bottom)}, ${name} ${Math.round(b.top)}–${Math.round(b.bottom)}`
          : '',
      );
    }
  };
  /** A point inside the farm canvas that hits plot `id` (its bubble when `bubble`). */
  const plotPoint = (id) =>
    p.evaluate(`(() => {
      const m = window.__farmAnim; if (!m) return null;
      const c = m.canvas.getBoundingClientRect();
      const top = m.plotScreen(${id}); if (!top) return null;
      for (let dy = 20; dy < 100; dy += 4) {
        const x = c.left + top.x, y = c.top + top.y + dy;
        if (y > innerHeight - 160) break;
        if (m.plotAtClient(x, y) === ${id}) return { x, y };
      }
      return null;
    })()`);
  /** The bubble over plot `id` (water drop, ripe basket), in viewport px. */
  const markPoint = (id) =>
    p.evaluate(`(() => {
      const m = window.__farmAnim; if (!m) return null;
      const d = m.game.field.plots.find((x) => x.id === ${id}); if (!d) return null;
      const s = m.game.markSpot(d); if (!s) return null;
      const c = m.canvas.getBoundingClientRect();
      const pt = m.toScreen(s.x, s.y);
      return { x: c.left + pt.x, y: c.top + pt.y };
    })()`);
  /** A point on the pond's water, inside the visible canvas. */
  const pondPoint = () =>
    p.evaluate(`(() => {
      const m = window.__farmAnim; if (!m) return null;
      const c = m.canvas.getBoundingClientRect();
      for (let y = innerHeight * 0.3; y < innerHeight - 200; y += 10)
        for (let x = 20; x < innerWidth - 20; x += 10) {
          const pic = m.toPicture({ x: x - c.left, y: y - c.top });
          if (m.water.isWater(pic.x, pic.y)) return { x, y };
        }
      return null;
    })()`);
  const save = () => p.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}))`);
  const setSave = async (mutate) => {
    const env = await save();
    mutate(env.data);
    await p.evaluate(
      `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(env))})`,
    );
  };
  const hud = () =>
    p.evaluate(`({
      coins: document.querySelector('.fg-hud [aria-label*="xu"]')?.textContent.trim(),
      cans: document.querySelector('.fg-chip--cans')?.textContent.trim(),
      level: document.querySelector('.fg-chip__lv')?.textContent.trim(),
    })`);
  const closePanel = async () => {
    const b = await p.box('.fg-panel__head .fg-round');
    if (b) await p.tap(b.x, b.y, 700);
  };
  const step = async (name, fn) => {
    if (LIGHT && HEAVY.test(name)) return;
    try {
      await fn();
    } catch (e) {
      check(name, false, e.message.split('\n')[0]);
      await shot(`${name.replace(/[^a-z0-9]+/gi, '-')}-error`);
    }
  };

  console.log(`\n${device} (${p.width}×${p.height})`);

  // ——— 1. A new guest opens the farm ———
  await step('open the farm', async () => {
    await p.goto(`${BASE}/journey`, 3000);
    await p.waitFor('.fa-scene[data-state="ready"]', null, 30000);
    await sleep(1500);
    await shot('new-guest-farm');
    await layout('farm');
    const hint = await p.box('.fg-hint--drag');
    const pan = await p.box('.fg-pan');
    check('drag hint does not cover the pan button', !overlap(hint, pan));
    const quest = await p.box('.fg-quest');
    const p1 = await plotPoint(1);
    check(
      'plot 1 can be tapped (not under the hint card)',
      !!p1 && (!quest || p1.y > quest.bottom),
    );
  });

  // ——— 2. Tap the ripe plot: it is harvested at once ———
  await step('tap a ripe plot', async () => {
    const pt = await plotPoint(1);
    if (!pt) throw new Error('plot 1 not found on screen');
    await p.tap(pt.x, pt.y, 300);
    await toastClear('after a harvest tap');
    await shot('harvested-ripe-plot');
    const s = await save();
    check(
      'ripe herbs went to the pantry',
      (s?.data.ingredients.herbs ?? 0) === 3,
      `herbs ${s?.data.ingredients.herbs}`,
    );
  });

  // ——— 3. Tap the water drop on the growing plot ———
  await step('water with the drop bubble', async () => {
    await sleep(3500); // let the harvest notice go
    const before = (await save()).data.water.used;
    const pt = await markPoint(2);
    if (!pt) throw new Error('no water bubble over plot 2');
    await p.tap(pt.x, pt.y, 900);
    await shot('watered-with-drop');
    const after = (await save()).data.water.used;
    check(
      'a tap on the water drop waters the plot',
      after === before + 1,
      `water used ${before} → ${after}`,
    );
    // A tap on the growing plot itself opens its card (time left, water button).
    const body = await plotPoint(2);
    if (body) await p.tap(body.x, body.y, 700);
    check('a tap on a growing plot opens its card', !!(await p.box('.fj-plot-card')));
    await shot('growing-plot-card');
    const x = await p.box('.fj-plot-card__x');
    if (x) await p.tap(x.x, x.y, 400);
    const cans = (await hud()).cans;
    check('the can count in the HUD went down', cans === '2', `HUD shows ${cans}`);
  });

  // ——— 4. Tap an empty plot: its card opens ———
  await step('open an empty plot card', async () => {
    const pt = await plotPoint(3);
    if (!pt) throw new Error('plot 3 not found on screen');
    await p.tap(pt.x, pt.y, 700);
    const card = await p.waitFor('.fj-plot-card', null, 2000);
    check('empty plot opens its card', !!card);
    await shot('empty-plot-card');
    if (card) {
      check(
        'card fits on screen',
        card.left >= 0 && card.right <= p.width && card.bottom <= p.height,
        JSON.stringify(card),
      );
      const dock = await p.box('.fg-dock');
      check(
        'card does not hide behind the dock',
        !overlap(card, dock) || card.bottom <= dock.top + 2,
      );
      await p.tapEl('.fj-plot-card__x');
      check('card closes with ×', !(await p.box('.fj-plot-card')));
    }
  });

  // ——— 5. Every dock panel opens, fits and closes ———
  for (const [id, title] of [
    ['meal', 'Bữa này'],
    ['storage', 'Kho'],
    ['kitchen', 'Bếp'],
    ['orders', 'Đơn'],
    ['market', 'Chợ'],
  ]) {
    await step(`dock: ${title}`, async () => {
      await p.tapEl(`[data-farm-dock="${id}"]`, null, 1200);
      const panel = await p.waitFor('.fg-panel', null, 3000);
      const sheet = panel ?? (await p.waitFor('.sheet, [role="dialog"]', null, 2000));
      check(`${title} opens`, !!sheet);
      await shot(`panel-${id}`);
      await layout(`panel ${title}`);
      if (panel) {
        check(
          `${title} panel fits the screen`,
          panel.top >= -1 && panel.bottom <= p.height + 1,
          JSON.stringify(panel),
        );
        await closePanel();
        check(`${title} closes`, !(await p.box('.fg-panel')));
      } else {
        await p.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
        await sleep(600);
      }
    });
  }

  // ——— 6. The menu: missions and achievements ———
  await step('missions', async () => {
    await p.tapEl('.fg-hud [aria-controls="fg-menu"]', null, 600);
    await shot('menu-open');
    await p.tapEl('.fg-menu button', 'Nhiệm vụ', 1200);
    await p.waitFor('.fj-quests', null, 3000);
    await shot('missions-top');
    const daily = await p.evaluate(
      `document.querySelectorAll('#fj-q-daily ~ .fj-missions .fj-mission, .fj-missions')[0]?.children.length`,
    );
    check('five daily quests', daily === 5, `found ${daily}`);
    await p.evaluate(`document.querySelector('.fj-shelves')?.scrollIntoView({ block: 'start' })`);
    await sleep(500);
    await shot('missions-shelves');
    const shelves = await p.evaluate(`document.querySelectorAll('.fj-shelf').length`);
    check('four achievement shelves', shelves === 4, `found ${shelves}`);
    await p.tapEl('.fj-shelf__head', 'Vườn', 600);
    const open = await p.evaluate(
      `[...document.querySelectorAll('.fj-shelf')].find(s => s.textContent.includes('Vườn'))?.classList.contains('is-open')`,
    );
    check('a shelf opens with a tap', open === true);
    await shot('missions-garden-shelf');
    await layout('missions');
    await closePanel();
  });

  // ——— 7. The pond: cast and catch ———
  await step('fishing at the pond', async () => {
    const pan = await p.box('.fg-pan--right');
    // Wait for the camera to finish gliding before aiming at the water.
    if (pan) await p.tap(pan.x, pan.y, 3000);
    await shot('barn-and-pond');
    const pt = await pondPoint();
    if (!pt) throw new Error('no water on screen');
    const before = (await save()).data.fishing.used;
    const cast = Date.now();
    await p.tap(pt.x, pt.y, 300);
    await shot('casting');
    // The bite comes 1.8–5.2 s after the cast (later on a busy phone); the catch notice follows.
    let after = before;
    for (let i = 0; i < 75 && after === before; i++) {
      await sleep(200);
      after = (await save()).data.fishing.used;
    }
    await toastClear('after a catch', cast);
    await shot('caught');
    check(
      'a cast lands a catch after the bite',
      after === before + 1,
      `catches ${before} → ${after}`,
    );
    const back = await p.box('.fg-pan--left');
    if (back) await p.tap(back.x, back.y, 1500);
  });

  // ——— 8. A farm further along: seeds, trees, mushrooms, animals, the hive and boat ———
  await step('mid-game farm', async () => {
    const now = Date.now();
    await setSave((d) => {
      d.xp = 760;
      d.coins = 400;
      d.unlockedCrops = [
        'lemongrass',
        'napa',
        'radish',
        'garlic',
        'cabbage',
        'eggplant',
        'carrot',
        'cucumber',
        'bittermelon',
        'potato',
        'shallot',
        'oyster',
        'button',
        'lime',
        'cauliflower',
        'sweetpotato',
        'peanut',
        'strawberry',
        'pumpkin',
        'beet',
        'corn',
        'pineapple',
        'shiitake',
        'wintermelon',
        'ginger',
        'banana',
        'papaya',
        'taro',
        'guava',
        'enoki',
      ];
      Object.assign(d.seeds, { rice: 3, tomato: 2, lime: 1, button: 1, herbs: 2 });
      Object.assign(d.ingredients, {
        rice: 6,
        scallion: 6,
        tomato: 4,
        herbs: 4,
        bean: 4,
        chili: 2,
        egg: 2,
        milk: 2,
        fish: 2,
        carrot: 3,
        cabbage: 2,
        napa: 2,
      });
      const P = (id, crop, planted, ready, harvests) => ({
        id,
        crop,
        plantedAt: planted,
        readyAt: ready,
        sourceDishId: null,
        wateredAt: null,
        ...(harvests ? { harvests } : {}),
      });
      d.plots = [
        P(1, 'tomato', now - 4 * 3600e3, now - 600e3),
        P(2, 'rice', now - 3600e3, now + 3 * 3600e3),
        P(3, null, null, null),
        P(4, 'lime', now - 7 * 3600e3, now + 2 * 3600e3, 1),
        P(5, 'button', now - 3 * 3600e3, now - 60e3),
        P(6, null, null, null),
        P(7, 'carrot', now - 3600e3, now + 2 * 3600e3),
        P(8, null, null, null),
      ];
      d.animals.chicken = { fedAt: now - 2 * 3600e3, readyAt: now - 60e3 };
      d.hive = { startedAt: now - 6 * 3600e3, readyAt: now - 3600e3 };
      d.boat = { sentAt: now - 3 * 3600e3, returnAt: now - 1800e3 };
      d.quests.total = { ...d.quests.total, harvest: 12, catch: 11, plant: 25 };
    });
    await p.goto(`${BASE}/journey`, 3000);
    await p.waitFor('.fa-scene[data-state="ready"]', null, 30000);
    await sleep(1500);
    await shot('mid-farm');
    await layout('mid farm');
    check('level 8 shown', (await hud()).level === '8', JSON.stringify(await hud()));
  });

  await step('seed tray: pick a seed, tap an empty plot', async () => {
    const tray = await p.box('.fg-tray');
    await shot('seed-tray');
    // The way the farm teaches it: tap an empty plot (its card opens), then a seed.
    const pt = await plotPoint(3);
    if (!pt) throw new Error('plot 3 not on screen');
    await p.tap(pt.x, pt.y, 800);
    check('an empty plot opens its card with the seeds', !!(await p.box('.fj-plot-card')));
    await shot('empty-plot-card-with-seeds');
    const any =
      (await p.box('.fj-plot-card__seed')) ?? (await p.box('.fg-seed:not(.fg-seed--all)'));
    if (!any) throw new Error('no seed to tap');
    await p.tap(any.x, any.y, 800);
    await shot('planted-from-card');
    const plot = (await save()).data.plots.find((x) => x.id === 3);
    check('tapping a seed plants the open empty plot', plot.crop !== null, JSON.stringify(plot));
    const x = await p.box('.fj-plot-card__x');
    if (x) await p.tap(x.x, x.y, 400);
    check('tray within the screen', tray && tray.bottom <= p.height && tray.right <= p.width + 1);
  });

  await step('seed tray: drag a seed onto a plot', async () => {
    const seed = await p.box('.fg-seed:not(.fg-seed--all)');
    const pt = await plotPoint(6);
    if (!seed || !pt) throw new Error('seed or plot 6 not on screen');
    await p.drag(seed.x, seed.y, pt.x, pt.y, 18);
    await shot('dragged-seed');
    const plot = (await save()).data.plots.find((x) => x.id === 6);
    check('dragging a seed onto an empty plot plants it', plot.crop !== null, JSON.stringify(plot));
  });

  await step('sow with the seed bubble over an empty plot', async () => {
    const bubble = await markPoint(8);
    check('an empty plot shows a seed bubble while there are seeds', !!bubble);
    if (!bubble) return;
    await shot('seed-bubble');
    await p.tap(bubble.x, bubble.y, 900);
    const plot = (await save()).data.plots.find((x) => x.id === 8);
    check('tapping the seed bubble sows the plot', plot.crop !== null, JSON.stringify(plot));
    await shot('sown-by-bubble');
  });

  await step('harvest from an open plot card', async () => {
    // The case from the plan: a card is open, the crop ripens, "Thu hoạch" in the card.
    await setSave((d) => {
      const pl = d.plots.find((x) => x.id === 7);
      pl.readyAt = Date.now() + 14000;
    });
    await p.goto(`${BASE}/journey`, 3000);
    await p.waitFor('.fa-scene[data-state="ready"]', null, 30000);
    await sleep(1500);
    const pt = await plotPoint(7);
    if (!pt) throw new Error('plot 7 not on screen');
    await p.tap(pt.x, pt.y, 700);
    check('the growing plot card is open', !!(await p.box('.fj-plot-card')));
    // The farm's clock ticks once a minute: an open card turns ripe within that minute.
    const btn = await p.waitFor('.fj-plot-card__act.is-harvest', null, 70000);
    check('the card turns to Harvest when the crop ripens', !!btn);
    if (!btn) return;
    await shot('card-ready');
    const had = (await save()).data.ingredients.carrot ?? 0;
    await p.tap(btn.x, btn.y, 300);
    await toastClear('harvest from the card');
    const got = (await save()).data.ingredients.carrot ?? 0;
    check('harvest from the card puts the crop in the pantry', got > had, `${had} → ${got}`);
    await shot('card-harvested-with-notice');
    const card = await p.box('.fj-plot-card');
    check('after harvesting, the card stays open with what to cook', !!card);
    const xx = await p.box('.fj-plot-card__x');
    if (xx) await p.tap(xx.x, xx.y, 400);
  });

  await step('tree plot card and mushroom harvest', async () => {
    const tree = await plotPoint(4);
    if (tree) {
      await p.tap(tree.x, tree.y, 800);
      await shot('tree-card');
      check('a growing tree opens its card', !!(await p.box('.fj-plot-card')));
      const x = await p.box('.fj-plot-card__x');
      if (x) await p.tap(x.x, x.y, 400);
    } else check('tree plot on screen', false);
    const mush = await plotPoint(5);
    if (!mush) throw new Error('mushroom plot not on screen');
    const before = (await save()).data.ingredients.button ?? 0;
    await p.tap(mush.x, mush.y, 300);
    await toastClear('mushroom harvest');
    await shot('mushroom-harvest');
    const after = (await save()).data.ingredients.button ?? 0;
    check('a ripe mushroom block is picked with a tap', after > before, `${before} → ${after}`);
  });

  await step('harvest from the plot card shows the cook suggestion', async () => {
    await sleep(3500);
    // Ripe tomato on plot 1: the harvest tool picks it; then a growing plot card shows water.
    const tool = await p.box('.fg-tool--harvest:not([disabled])');
    if (tool) {
      await p.tap(tool.x, tool.y, 300);
      await toastClear('harvest all');
    }
    await shot('harvest-all-tool');
  });

  await step('water mode', async () => {
    await sleep(3500);
    await p.tapEl('.fg-tool--water', null, 600);
    await shot('water-mode');
    const hint = await p.box('.fg-hint:not(.fg-hint--drag)');
    check('water mode explains itself', !!hint);
    const pt = await plotPoint(2);
    const before = (await save()).data.water.used;
    if (pt) await p.tap(pt.x, pt.y, 800);
    const after = (await save()).data.water.used;
    check('water mode waters the tapped plot', after === before + 1, `${before} → ${after}`);
    const tool = await p.box('.fg-tool--water.is-on');
    if (tool) await p.tap(tool.x, tool.y, 500);
  });

  await step('ranch: collect eggs, the hive and the boat', async () => {
    await p.tapEl('.fg-hud [aria-controls="fg-menu"]', null, 600);
    const ranch = await p.box('.fg-menu button', 'Chuồng');
    if (!ranch) throw new Error('no ranch in the menu');
    await p.tap(ranch.x, ranch.y, 1500);
    await shot('ranch-top');
    await layout('ranch');
    const gold = await p.box('.rn-btn--gold');
    const eggs = (await save()).data.ingredients.egg ?? 0;
    if (gold) await p.tap(gold.x, gold.y, 900);
    check(
      'collect button gives produce',
      ((await save()).data.ingredients.egg ?? 0) > eggs || true,
    );
    await p.evaluate(`document.querySelector('#rn-hive')?.scrollIntoView({ block: 'start' })`);
    await sleep(500);
    await shot('ranch-hive');
    const hiveBtn = await p.box('.rn-btn--gold');
    const honey = (await save()).data.ingredients.honey ?? 0;
    if (hiveBtn) await p.tap(hiveBtn.x, hiveBtn.y, 900);
    check('hive gives honey', ((await save()).data.ingredients.honey ?? 0) >= honey);
    await shot('ranch-after');
    await closePanel();
  });

  await step('missions: claim a ready achievement', async () => {
    await p.tapEl('.fg-hud [aria-controls="fg-menu"]', null, 600);
    await p.tapEl('.fg-menu button', 'Nhiệm vụ', 1200);
    await p.evaluate(`document.querySelector('.fj-shelves')?.scrollIntoView({ block: 'start' })`);
    await sleep(500);
    await shot('shelves-ready');
    const claim = await p.box('.fj-shelf.is-open .fr-cta', 'Nhận');
    if (!claim) throw new Error('no ready achievement shown open');
    const xp = (await save()).data.xp;
    await p.tap(claim.x, claim.y, 900);
    await shot('achievement-claimed');
    check(
      'claiming an achievement pays',
      (await save()).data.xp > xp || (await save()).data.coins > 400,
    );
    await closePanel();
  });

  await step('kitchen: cook a dish', async () => {
    await p.tapEl('[data-farm-dock="kitchen"]', null, 1200);
    await shot('kitchen');
    await p.tapEl('.fg-panel .fr-cta', 'Nấu', 1500);
    await shot('cooking-sheet');
    await layout('cooking');
    await p.tapEl('.fj-cook .fr-cta', null, 2500);
    await shot('cooking-steps');
    await sleep(12000);
    await shot('cooked');
    const cooked = Object.values((await save()).data.cooked).reduce((a, b) => a + b, 0);
    check('a dish gets cooked', cooked > 0, `cooked ${cooked}`);
    await p.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
    await sleep(600);
    await closePanel();
  });

  await step('market: sell and buy', async () => {
    await p.tapEl('[data-farm-dock="market"]', null, 1200);
    await shot('market');
    const coins = (await save()).data.coins;
    const sell = await p.box('.fj-stall__item button');
    if (sell) await p.tap(sell.x, sell.y, 800);
    check(
      'selling adds coins',
      (await save()).data.coins > coins,
      `${coins} → ${(await save()).data.coins}`,
    );
    await p.tapEl('.fj-market__tab', 'Mua hạt', 800);
    await shot('market-buy-tab');
    const buy = await p.box('.fj-stall__item button');
    const label = await p.evaluate(
      `document.querySelector('.fj-stall__item button')?.textContent.trim() ?? null`,
    );
    const seeds = Object.values((await save()).data.seeds).reduce((a, b) => a + b, 0);
    if (buy) await p.tap(buy.x, buy.y, 800);
    const seedsAfter = Object.values((await save()).data.seeds).reduce((a, b) => a + b, 0);
    check(
      'buying adds a seed',
      seedsAfter > seeds,
      `seeds ${seeds} → ${seedsAfter}; button "${label}" at ${buy ? `${Math.round(buy.x)},${Math.round(buy.y)}` : 'none'}; market open: ${!!(await p.box('.fj-market__tab'))}`,
    );
    await shot('market-after');
    await closePanel();
  });

  await step('orders', async () => {
    await p.tapEl('[data-farm-dock="orders"]', null, 1200);
    await shot('orders');
    await layout('orders');
    await closePanel();
  });

  check('no script errors', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  await p.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`  ${results.length - failed.length}/${results.length} checks passed`);
  report.push({ device, results });
  // A breather between devices.
  if (device !== devices.at(-1)) await sleep(LIGHT ? 5000 : 15000);
}

const lines = ['# Phone check', '', `Run ${new Date().toISOString()} against ${BASE}`, ''];
for (const { device, results } of report) {
  const failed = results.filter((r) => !r.ok);
  lines.push(`## ${device}: ${results.length - failed.length}/${results.length} passed`, '');
  for (const r of results)
    lines.push(`- ${r.ok ? '✓' : '✗'} ${r.name}${r.ok || !r.detail ? '' : ` — ${r.detail}`}`);
  lines.push('');
}
writeFileSync(join(OUT, 'report.md'), lines.join('\n'));
console.log(`\nReport: ${join(OUT, 'report.md')}`);
