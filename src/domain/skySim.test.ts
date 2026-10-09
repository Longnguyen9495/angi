import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { levelForXp, xpForLevel } from '../data/game';
import {
  BUGS,
  BUG_IDS,
  BUG_ROLL,
  FLOORS,
  MACHINE_IDS,
  POT_PRICES,
  SKY_CROPS,
  SKY_CROP_IDS,
  SKY_RECIPES,
  SKY_GOOD_PRICE,
  SKY_RECIPE_IDS,
  type BugId,
  type SkyCropId,
  type SkyGoodId,
} from '../data/skyEconomy';
import { POT_SETS, type PotId } from '../data/skyGarden';
import { createInitialProgress, type GuestProgress } from './progress';
import { gameReducer, type Action } from './reducer';
import { balloonBoxes, cropOpen, pendingChecks, slotCount, slotPrice, type SkyState } from './sky';
import { dateKey } from './time';

/*
 * Vườn Mây over 90 days (plans/vuon-may.md §0.3 G6 "mô phỏng"): a bot plays through the game's
 * own reducer three times a day — harvest, catch, cook, pack the balloon, sell what it does not
 * need, buy slots and pots, open floors, replant with the best crop that ripens before its next
 * visit. The server's bug rolls are stood in for by a seeded draw with the same odds; farm XP and
 * coins from the ground come in at a fixed rate. Prints a table with SIM_REPORT=1
 * (`npm run sky:sim`, 90 days); the checks below are guard rails (no stuck tutorial, no runaway coins),
 * not tuning targets.
 */

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 1, 0, 0).getTime();
/** Sessions: 8:00, 13:00, 21:00 local. */
const SESSIONS = [8, 13, 21];
/** What the farm below adds per day (XP, xu): a steady player around level 12–30. */
const FARM_XP_PER_DAY = 260;
const FARM_COINS_PER_DAY = 220;
const KEEP_COINS = 300;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DayRow {
  day: number;
  level: number;
  floors: number;
  pots: number;
  coins: number;
  skyCoins: number;
  skyXp: number;
  bugs: number;
  gems: number;
  cloudseed: number;
  dew: number;
  trips: number;
}

function simulate(days: number, seed: number): { rows: DayRow[]; end: GuestProgress } {
  const rand = rng(seed);
  let p: GuestProgress = {
    ...createInitialProgress(T0),
    xp: xpForLevel(12),
    coins: 800,
  };
  p = { ...p, ingredients: { ...p.ingredients, honey: 3, milk: 2 } };
  // The device keeps only the ledger's tail (LEDGER_LIMIT): new entries are the ones after the
  // last one seen before each action.
  let skyCoins = 0;
  let skyXp = 0;
  const act = (a: Action) => {
    const last = p.ledger.at(-1)?.key;
    p = gameReducer(p, a);
    let i = p.ledger.length;
    while (i > 0 && p.ledger[i - 1]!.key !== last) i--;
    for (const e of p.ledger.slice(i)) {
      if (!e.key.startsWith('sky:') && !e.key.startsWith('xp:sky')) continue;
      if (e.resource === 'coin' && e.delta > 0) skyCoins += e.delta;
      if (e.resource === 'xp') skyXp += e.delta;
    }
  };
  const rows: DayRow[] = [];
  let trips = 0;

  for (let d = 0; d < days; d++) {
    const dayStart = T0 + d * DAY;
    // The farm below: a day's XP, coins, a honey and a milk now and then.
    p = {
      ...p,
      xp: p.xp + FARM_XP_PER_DAY,
      coins: p.coins + FARM_COINS_PER_DAY,
      ingredients: {
        ...p.ingredients,
        honey: p.ingredients.honey + (d % 2 === 0 ? 1 : 0),
        milk: p.ingredients.milk + (d % 3 === 0 ? 1 : 0),
      },
    };
    skyCoins = 0;
    skyXp = 0;
    for (const [si, hour] of SESSIONS.entries()) {
      const now = dayStart + hour * 3_600_000;
      const next = dayStart + (SESSIONS[si + 1] ?? SESSIONS[0]! + 24) * 3_600_000;
      session(now, next);
    }
    const sky = p.sky;
    if (sky?.balloon?.done && sky.balloon.date === dateKey(dayStart)) trips++;
    rows.push({
      day: d + 1,
      level: levelForXp(p.xp),
      floors: sky?.floors ?? 0,
      pots: Object.keys(sky?.pots ?? {}).length,
      coins: p.coins,
      skyCoins,
      skyXp,
      bugs: Object.values(sky?.bugs ?? {}).reduce((n, x) => n + (x ?? 0), 0),
      gems: sky?.items.gem ?? 0,
      cloudseed: sky?.items.cloudseed ?? 0,
      dew: sky?.items.dew ?? 0,
      trips,
    });
  }
  return { rows, end: p };

  function session(now: number, next: number) {
    if (!p.sky) act({ type: 'SKY_OPEN_FLOOR', now });
    if (!p.sky) return;
    reveal(now);
    catchAll(now);
    for (let f = 0; f < p.sky.floors; f++) act({ type: 'SKY_HARVEST_FLOOR', floor: f, now });
    for (const m of MACHINE_IDS) act({ type: 'SKY_COLLECT_JOB', machine: m, now });
    for (let b = 0; b < 6; b++) act({ type: 'SKY_PACK_BOX', box: b, now });
    cook(now);
    for (const set of POT_SETS.map((s) => s.id)) act({ type: 'SKY_CLAIM_SET', set, now });
    act({ type: 'SKY_OPEN_FLOOR', now });
    sell(now);
    grow(now);
    plant(now, next);
  }

  function reveal(now: number) {
    const bugs: { uid: string; cycle: number; stage: number; bug: BugId | null }[] = [];
    for (const pot of Object.values(p.sky!.pots)) {
      if (!pot.plant) continue;
      for (const stage of pendingChecks(pot.plant, now)) {
        const first = p.sky!.firstPot === pot.uid && pot.plant.cycle === 0 && stage === 0;
        let bug: BugId | null = first ? 'ladybug' : null;
        if (!first) {
          const chance = Math.min(BUG_ROLL.capBp, BUG_ROLL.baseBp + pot.plant.stats.bug) / 10000;
          if (rand() < chance) {
            const total = BUG_IDS.reduce((n, b) => n + BUGS[b].weight, 0);
            let x = rand() * total;
            bug = BUG_IDS.find((b) => (x -= BUGS[b].weight) < 0) ?? 'ladybug';
            const h = new Date(now).getHours();
            if (BUGS[bug].night && h >= 6 && h < 18) bug = 'ladybug';
          }
        }
        bugs.push({ uid: pot.uid, cycle: pot.plant.cycle, stage, bug });
      }
    }
    if (bugs.length) act({ type: 'SKY_REVEAL', bugs, now });
  }

  function catchAll(now: number) {
    for (const pot of Object.values(p.sky!.pots))
      pot.plant?.bugs.forEach((b, stage) => {
        if (b) act({ type: 'SKY_CATCH', uid: pot.uid, stage, now });
      });
  }

  function cook(now: number) {
    // Items (dew, cloud seeds) open floors: worth more than any good.
    const worth = (r: (typeof SKY_RECIPE_IDS)[number]) => {
      const o = SKY_RECIPES[r].out;
      return 'good' in o ? SKY_GOOD_PRICE[o.good] * o.qty : 1000;
    };
    const best = [...SKY_RECIPE_IDS].sort((a, b) => worth(b) - worth(a));
    // Dew first while floors still need it, then the best-paying recipe each machine can make.
    for (const m of MACHINE_IDS) {
      const order = best.filter((r) => SKY_RECIPES[r].machine === m);
      for (const r of order) {
        const before = p;
        act({ type: 'SKY_START_JOB', machine: m, recipe: r, now });
        if (p !== before) break;
      }
    }
  }

  /** Goods the balloon or a recipe still wants are kept; the rest is sold. */
  function sell(now: number) {
    const sky = p.sky!;
    const want: Partial<Record<SkyGoodId, number>> = {};
    if (sky.floors >= 5)
      for (const b of balloonBoxes(dateKey(now))) want[b.good] = (want[b.good] ?? 0) + b.qty;
    for (const r of SKY_RECIPE_IDS)
      for (const i of SKY_RECIPES[r].inputs)
        if ('good' in i) want[i.good] = Math.max(want[i.good] ?? 0, i.qty * 2);
    for (const [good, n] of Object.entries(sky.goods) as [SkyGoodId, number][]) {
      const extra = n - (want[good] ?? 0);
      if (extra > 0) act({ type: 'SKY_SELL', good, qty: extra, now });
    }
  }

  function grow(now: number) {
    const sky = p.sky!;
    // Slots, then pots for the empty ones (cheapest coin pot of the floor the bot can afford).
    // Once the level allows the next floor, its coins are put aside first.
    const nf = FLOORS[sky.floors];
    const keep = nf && levelForXp(p.xp) >= nf.level ? Math.max(KEEP_COINS, nf.coins) : KEEP_COINS;
    for (let f = 0; f < sky.floors; f++) {
      const price = slotPrice(p.sky!, f);
      if (price !== null && p.coins - price >= keep) act({ type: 'SKY_BUY_SLOT', floor: f, now });
    }
    const coinPots = (Object.keys(POT_PRICES) as PotId[])
      .filter((x) => POT_PRICES[x]!.currency === 'coin')
      .sort((a, b) => POT_PRICES[a]!.price - POT_PRICES[b]!.price);
    for (let f = 0; f < p.sky!.floors; f++) {
      for (let s = 0; s < slotCount(p.sky!, f); s++) {
        if (p.sky!.slots[f]![s]) continue;
        let free = Object.values(p.sky!.pots).find((x) => !placed(p.sky!, x.uid));
        if (!free) {
          for (const pot of coinPots) {
            if (p.coins - POT_PRICES[pot]!.price < keep) break;
            const before = p;
            act({ type: 'SKY_BUY_POT', pot, now });
            if (p !== before) break;
          }
          free = Object.values(p.sky!.pots).find((x) => !placed(p.sky!, x.uid));
        }
        if (free) act({ type: 'SKY_PLACE_POT', uid: free.uid, floor: f, slot: s, now });
      }
    }
  }

  function plant(now: number, next: number) {
    const open = SKY_CROP_IDS.filter((c) => cropOpen(p.sky!, c));
    const value = (c: SkyCropId) =>
      SKY_CROPS[c].yield.reduce(
        (n, y) => n + ('good' in y ? SKY_GOOD_PRICE[y.good] * y.qty : 0),
        0,
      ) - SKY_CROPS[c].seed;
    const fits = (c: SkyCropId) => SKY_CROPS[c].growMin * 60_000 <= next - now;
    const order = [...open].sort(
      (a, b) => (fits(b) ? 1 : 0) - (fits(a) ? 1 : 0) || value(b) - value(a),
    );
    for (const row of p.sky!.slots)
      for (const uid of row) {
        if (!uid || p.sky!.pots[uid]?.plant) continue;
        for (const c of order) {
          if ((p.sky!.seeds[c] ?? 0) <= 0) act({ type: 'SKY_BUY_SEED', crop: c, now });
          const before = p;
          act({ type: 'SKY_PLANT', uid, seed: { kind: 'sky', id: c }, now });
          if (p !== before) break;
        }
      }
  }
}

function placed(sky: SkyState, uid: string): boolean {
  return sky.slots.some((r) => r.includes(uid));
}

describe('Vườn Mây 90-day simulation', () => {
  // 90 days take minutes: the full season with `npm run sky:sim`, three weeks in `npm test`.
  const DAYS = Number(process.env.SIM_DAYS ?? (process.env.SIM_REPORT ? 90 : 21));
  const { rows, end } = simulate(DAYS, 20261008);
  if (process.env.SIM_REPORT) {
    // A file as well as the console: the runner may swallow a test's console output.
    const shown = rows.filter((r) => r.day <= 7 || r.day % 7 === 0 || r.day === DAYS);
    const head = Object.keys(shown[0]!).join('\t');
    const opened = FLOORS.map((_, i) => rows.find((r) => r.floors > i)?.day ?? '—').join(' / ');
    const report = [
      head,
      ...shown.map((r) => Object.values(r).join('\t')),
      '',
      `floors opened on day: ${opened}`,
      `pots: ${Object.keys(end.sky?.pots ?? {}).length}`,
    ].join('\n');
    mkdirSync('storage/sky-garden-qa', { recursive: true });
    writeFileSync(`storage/sky-garden-qa/sim-${DAYS}.txt`, report + '\n');
    console.log(report);
  }

  it('opens floors 1–3 in the first days, without friends or rare bugs (§0.4)', () => {
    expect(rows[0]!.floors).toBeGreaterThanOrEqual(1);
    const third = rows.find((r) => r.floors >= 3);
    expect(third).toBeDefined();
    expect(third!.day).toBeLessThanOrEqual(10);
  });

  it.runIf(DAYS >= 90)('keeps climbing: floor 5 (the balloon) within the season', () => {
    expect(rows.at(-1)!.floors).toBeGreaterThanOrEqual(5);
  });

  it('never gets stuck after the tutorial: floor 4 within three weeks', () => {
    expect(rows.find((r) => r.floors >= 4)?.day ?? Infinity).toBeLessThanOrEqual(21);
  });

  it('holds sky XP to the daily cap and coins from the sky to a modest income', () => {
    for (const r of rows) expect(r.skyXp).toBeLessThanOrEqual(150);
    const late = rows.slice(-14);
    const avg = late.reduce((n, r) => n + r.skyCoins, 0) / late.length;
    // Gross coins in (before seeds, slots and pots): well under a day of the farm below × 10.
    expect(avg).toBeLessThan(FARM_COINS_PER_DAY * 10);
  });
});
