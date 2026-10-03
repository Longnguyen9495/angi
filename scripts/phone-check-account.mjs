import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, openPhone, sleep } from './lib/phone.mjs';

/*
 * The account side on a phone, against http://angi.local (APP_ENV=local shows the sign-in
 * code on screen): sign in by email, the farm is saved, add a friend by garden code, visit
 * their garden (the 2D farm), water it through its drop bubble, pick from a long-ripe plot,
 * sign out (this phone starts over as a guest), sign back in (the farm comes back).
 * The friend is made through the local API first.
 *   node scripts/phone-check-account.mjs [device]
 */

const BASE = process.env.ANGI_URL ?? 'http://angi.local';
const device = process.argv[2] ?? 'iphone-390';
const dir = ensureDir(join('storage/phone-check', `${device}-account`));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

// ——— A friend with a garden, through the API ———
async function apiGuest(email) {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(`${BASE}/api/account${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Bepviet': '1', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      if (pair.startsWith('bepviet_guest=') && !pair.endsWith('=')) cookie = pair;
    }
    return res.json();
  };
  const r = await call('POST', '/code', { email, consent: true });
  await call('POST', '/verify', { email, code: r.devCode });
  return call;
}
const friendEmail = `friend-${Date.now()}@example.invalid`;
const friend = await apiGuest(friendEmail);
const now = Date.now();
const plot = (id, crop, planted, ready) => ({
  id,
  crop,
  plantedAt: planted,
  readyAt: ready,
  sourceDishId: null,
  wateredAt: null,
});
const garden = {
  guestId: `friend-${now}`,
  createdAt: now,
  xp: 150,
  coins: 0,
  seeds: {},
  ingredients: {},
  plots: [
    plot(1, 'rice', now - 3_600_000, now + 3 * 3_600_000),
    plot(2, 'tomato', now - 5 * 3_600_000, now - 2 * 3_600_000),
    plot(3, null, null, null),
    plot(4, 'chili', now - 1_800_000, now + 5_400_000),
    plot(5, null, null, null),
  ],
  stamps: { discovered: [], eaten: [] },
  unlockedRegions: ['south'],
  unlockedCrops: [],
  cooked: {},
  decor: [],
  decorLayout: {},
  animals: {},
  streak: { count: 1 },
  quests: { total: {}, badges: {} },
  history: [],
  photos: [],
  ledger: [],
};
const saved = await friend('PUT', '/progress', { data: garden, baseVersion: 0, clientNow: now });
check('friend garden saved through the API', saved.version === 1, JSON.stringify(saved));
const friendCode = (await friend('GET', '/garden')).code;
console.log(`friend garden ${friendCode}`);
// A second garden, met only through its invite link.
const inviter = await apiGuest(`inviter-${Date.now()}@example.invalid`);
const inviteCode = (await inviter('GET', '/garden')).code;

// ——— The phone ———
const p = await openPhone(device, { port: 9555 });
let n = 0;
const shot = (name) => p.shot(join(dir, `${String(++n).padStart(2, '0')}-${name}.png`));
const myEmail = `phone-${Date.now()}@example.invalid`;

async function signIn(email) {
  await p.goto(`${BASE}/`, 4000);
  await p.tapEl('button', 'Hồ sơ và cài đặt', 1200);
  await p.tapEl('button', 'Lưu nông trại bằng email', 1200);
  await shot('sign-in-sheet');
  await p.tapEl('input[type="email"]', null, 300);
  await p.type(email);
  await p.tapEl('.account__check input[type="checkbox"]', null, 300);
  await p.tapEl('form.account .fr-cta', null, 1500);
  const dev = await p.waitFor('.account__dev strong', null, 5000);
  check('the code screen shows (local test code on screen)', !!dev);
  await shot('code-screen');
  const code = await p.evaluate(
    `document.querySelector('.account__dev strong')?.textContent.trim()`,
  );
  await p.tapEl('.account__code', null, 300);
  await p.type(code);
  await sleep(1500);
  // Six digits send themselves; tap only when the confirm button is still there.
  if (!(await p.box('.account--done'))) {
    const b = await p.box('form.account .fr-cta');
    if (b) await p.tap(b.x, b.y, 2500);
  }
  await shot('signed-in');
}

async function openFarm() {
  await p.goto(`${BASE}/journey`, 3000);
  await p.waitFor('.fa-scene[data-state="ready"]', null, 30000);
  await sleep(1500);
}

try {
  await signIn(myEmail);
  check('signed in', !!(await p.waitFor('.account--done, .toast', null, 4000)));
  await openFarm();
  await shot('farm-signed-in');
  // The farm saves itself a few seconds after a change.
  await sleep(4500);
  const progress = await p.evaluate(
    `fetch('/api/account/progress', { credentials: 'same-origin' }).then((r) => r.json())`,
  );
  check('the farm was saved to the account', progress.version >= 1, `version ${progress.version}`);

  // Friends: add by code, then visit.
  await p.tapEl('.fg-hud [aria-controls="fg-menu"]', null, 600);
  await p.tapEl('.fg-menu button', 'Bạn vườn', 1500);
  await p.waitFor('#fj-friend-code', null, 5000);
  await shot('friends-panel');
  await p.tapEl('#fj-friend-code', null, 300);
  await p.type(friendCode);
  await p.tapEl('.fj-friends__form .fr-cta', null, 2000);
  const row = await p.waitFor('.fj-board__row', 'Khu vườn', 4000);
  check('the friend appears after adding the code', !!row);
  await shot('friend-added');
  await p.tapEl('.fj-board__actions .fr-ghost', null, 2500);
  const scene = await p.waitFor('.fj-visit__farm .fa-scene[data-state="ready"]', null, 30000);
  check("the friend's garden opens as the 2D farm", !!scene);
  await sleep(1500);
  await shot('friend-garden-2d');
  // Water through the drop bubble over plot 1 (growing, dry).
  const drop = await p.evaluate(`(() => {
    const m = window.__farmAnim; if (!m) return null;
    const d = m.game.field.plots.find((x) => x.id === 1); const s = d && m.game.markSpot(d);
    if (!s) return null; const c = m.canvas.getBoundingClientRect(); const pt = m.toScreen(s.x, s.y);
    return { x: c.left + pt.x, y: c.top + pt.y };
  })()`);
  check('a water bubble floats over the dry plot', !!drop);
  if (drop) {
    await p.tap(drop.x, drop.y, 2000);
    const toast = await p.waitFor('.toast', 'tưới giúp', 4000);
    check('tapping it waters the friend’s plot', !!toast);
    await shot('watered-friend');
  }
  // Pick from the long-ripe tomato (plot 2).
  const basket = await p.evaluate(`(() => {
    const m = window.__farmAnim; const d = m.game.field.plots.find((x) => x.id === 2); const s = d && m.game.markSpot(d);
    if (!s) return null; const c = m.canvas.getBoundingClientRect(); const pt = m.toScreen(s.x, s.y);
    return { x: c.left + pt.x, y: c.top + pt.y };
  })()`);
  check('a pick bubble floats over the long-ripe plot', !!basket);
  if (basket) {
    await p.tap(basket.x, basket.y, 2000);
    check('tapping it picks one', !!(await p.waitFor('.toast', 'hái trộm', 4000)));
    await shot('picked-from-friend');
  }
  await p.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  await sleep(800);

  // An invite link asks before it makes a friend (opening a link alone adds no one).
  await p.goto(`${BASE}/journey?ban=${inviteCode}`, 3000);
  const ask = await p.waitFor('.toast', inviteCode, 8000);
  check('an invite link asks first', !!ask);
  await shot('invite-asks');
  const listed = async () =>
    p.evaluate(
      `fetch('/api/account/friends', { credentials: 'same-origin' }).then((r) => r.json()).then((r) => (r.friends || []).some((f) => f.code === ${JSON.stringify(inviteCode)}))`,
    );
  check('no friendship before the tap', (await listed()) === false);
  await p.tapEl('.toast__action', 'Kết bạn', 2500);
  check('one tap on "Kết bạn" makes the friend', (await listed()) === true);
  await shot('invite-accepted');

  // The events come back with the next sync and are saved into this farm.
  await sleep(4500);
  const events = await p.evaluate(
    `fetch('/api/account/events', { credentials: 'same-origin' }).then((r) => r.json())`,
  );
  check(
    'help and pick rewards are delivered once saved',
    (events.events ?? []).every((e) => !['helped', 'stole'].includes(e.type)),
    JSON.stringify(events.events?.map((e) => e.type)),
  );

  // Sign out: this phone starts over.
  await p.goto(`${BASE}/`, 3000);
  await p.tapEl('button', 'Hồ sơ và cài đặt', 1200);
  await shot('profile-signed-in');
  await p.tapEl('button', 'Đăng xuất', 1500);
  await shot('signed-out');
  const local = await p.evaluate(
    `JSON.parse(localStorage.getItem('hanh-trinh-bep-viet/guest')).data`,
  );
  check(
    'after signing out, this phone starts as a new guest',
    local.xp === 0 && local.ledger.length === 0,
    `xp ${local.xp}`,
  );

  // Sign back in: the account's farm comes back.
  await signIn(myEmail);
  await openFarm();
  await sleep(2000);
  const back = await p.evaluate(
    `JSON.parse(localStorage.getItem('hanh-trinh-bep-viet/guest')).data`,
  );
  check(
    'signing back in brings the farm back',
    back.ledger.length > 0,
    `ledger ${back.ledger.length}`,
  );
  await shot('farm-back');
} catch (e) {
  check('account flow', false, e.message.split('\n')[0]);
  await shot('error');
}
check('no script errors', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
await p.close();
writeFileSync(
  join(dir, 'report.md'),
  [
    '# Account flow on a phone',
    '',
    ...results.map((r) => `- ${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.detail}`}`),
  ].join('\n'),
);
