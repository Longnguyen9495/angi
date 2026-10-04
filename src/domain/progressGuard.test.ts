import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISHES } from '../data/dishes';
import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import {
  ANIMALS,
  CROPS,
  DECOR,
  MARKET,
  PRODUCE_IDS,
  RECIPE_LIST,
  harvestXp,
  isBuiltinRecipe,
  isMeat,
} from '../data/game';
import type { AnimalId, CropId, DecorId, ProduceId } from '../data/types';
import { canFulfill, todaysOrders } from './orders';
import { createInitialProgress, type GuestProgress } from './progress';
import { badges, dailyQuests, weeklyQuests } from './quests';
import { LEDGER_LIMIT, gameReducer, type Action } from './reducer';
import {
  animalStage,
  biteDelay,
  boatCatch,
  boatStage,
  catchFor,
  cropAvailable,
  fishingLeft,
  hiveStage,
  level,
  nextLand,
  plotStage,
  recipeAvailable,
  recipeProgress,
  waterBlock,
} from './selectors';
import { HOUR_MS, slotKey } from './time';

/*
 * The server refuses saves that do not follow the game's rules (server/lib/ProgressGuard.php).
 * The worst bug it could have is refusing an honest player. So a bot plays a week the way the
 * app does — meals, check-ins, photos, planting, watering, harvests, cooking, orders, the
 * market, fishing, animals, the hive, the boat, decorations, quests, badges, chests — saving
 * every two hours, and every one of those saves must pass the PHP guard. Then forged saves
 * (made-up xu, a harvest nobody planted, a clock jump…) must each be refused for its reason.
 * Runs when PHP is available (PHP_BIN, XAMPP's php.exe, or php on the PATH).
 */

const T0 = new Date(2026, 9, 1, 6, 0).getTime();
const MIN = 60_000;
const DAYS = 7;

interface Step {
  clientNow: number;
  data: GuestProgress;
}

function play(): { steps: Step[]; last: GuestProgress; lastAt: number } {
  // Classic dishes and catalogue dishes (some of which give a seed their recipe needs).
  const menu = [...DISHES.map((d) => d.id), ...reelGameDishes().map((d) => d.id)];
  let s: GuestProgress = { ...createInitialProgress(T0), guestId: 'bot-guest-0001' };
  const steps: Step[] = [{ clientNow: T0, data: structuredClone(s) }];
  let clock = T0;
  let dish = 0;
  let decorX = -3;
  const act = (a: Action) => {
    s = gameReducer(s, a);
  };
  const at = () => (clock += 1000);
  for (let tick = 1; tick <= (DAYS * 24 * 60) / 15; tick++) {
    clock = T0 + tick * 15 * MIN;
    const hour = new Date(clock).getHours();
    // Asleep from 23:00 to 06:59: the garden keeps growing, nobody taps.
    if (hour < 7 || hour >= 23) {
      if (tick % 8 === 0) steps.push({ clientNow: clock + 5 * MIN, data: structuredClone(s) });
      continue;
    }

    if (hour >= 7 && hour <= 21) {
      const key = slotKey(clock);
      if (s.meal?.slotKey !== key) {
        act({ type: 'CHOOSE_DISH', dishId: menu[dish++ % menu.length]!, now: at() });
        // Now and then the guest changes their mind before planting.
        if (dish % 4 === 0)
          act({ type: 'CHOOSE_DISH', dishId: menu[dish++ % menu.length]!, now: at() });
        act({ type: 'PLANT_MEAL_SEED', now: at() });
      } else if (!s.meal.checkedIn && clock - s.meal.chosenAt >= 45 * MIN) {
        const outcome = (['ate', 'ate', 'swapped', 'skipped'] as const)[dish % 4]!;
        act({ type: 'CHECK_IN', outcome, rating: 4, again: 'maybe', now: at() });
        if (outcome !== 'skipped') act({ type: 'ATTACH_PHOTO', slotKey: key, now: at() });
      }
    }
    act({ type: 'HARVEST_ALL', now: at() });
    // A new plot as soon as the level and the purse allow.
    if (nextLand(s)?.affordable) act({ type: 'BUY_LAND', now: at() });
    const thirsty = s.plots.find((p) => waterBlock(s, p, clock) === null);
    if (thirsty) act({ type: 'WATER', plotId: thirsty.id, now: at() });

    for (const plot of s.plots.filter((p) => p.crop === null)) {
      const open = (Object.keys(CROPS) as CropId[]).filter((c) => cropAvailable(s, c));
      // Rotate through every open crop (vegetables, fruit trees, mushrooms), buying as needed.
      let crop: CropId | undefined = open[(tick + plot.id) % open.length];
      if (crop && s.seeds[crop] <= 0 && s.coins >= MARKET.seed(crop))
        act({ type: 'BUY_SEED', crop, now: at() });
      if (crop && s.seeds[crop] <= 0) crop = open.find((c) => s.seeds[c] > 0);
      if (crop && s.seeds[crop] > 0)
        act({ type: 'PLANT_FROM_TRAY', crop, plotId: plot.id, now: at() });
    }

    for (const r of RECIPE_LIST.filter((x) => isBuiltinRecipe(x.id))) {
      // Short of meat only: buy it at the market when the purse allows.
      const short = recipeProgress(s, r.id).ingredients.filter((i) => i.have < i.qty);
      if (recipeAvailable(s, r.id) && short.length > 0 && short.every((i) => isMeat(i.crop))) {
        for (const i of short) {
          for (let n = i.have; n < i.qty && isMeat(i.crop) && s.coins >= MARKET.buy(i.crop); n++)
            act({ type: 'BUY_ITEM', item: i.crop, now: at() });
        }
      }
      if (recipeAvailable(s, r.id) && recipeProgress(s, r.id).canCook)
        act({ type: 'COOK', recipeId: r.id, now: at() });
    }
    for (const o of todaysOrders(s, clock)) {
      if (canFulfill(s, o)) act({ type: 'FULFILL_ORDER', orderId: o.id, now: at() });
    }
    for (const id of PRODUCE_IDS as ProduceId[]) {
      while (s.ingredients[id] > 20) act({ type: 'SELL', crop: id, now: at() });
    }

    if (hour >= 8 && hour <= 20 && fishingLeft(s, clock) > 0) {
      const castAt = at();
      clock = castAt + biteDelay(castAt) + 300;
      act({ type: 'CATCH', castAt, now: clock });
    }
    for (const id of Object.keys(ANIMALS) as AnimalId[]) {
      const stage = animalStage(s, id, clock);
      if (stage === 'ready') act({ type: 'COLLECT_ANIMAL', animal: id, now: at() });
      if (animalStage(s, id, clock) === 'hungry' && s.ingredients[ANIMALS[id].feed] > 0)
        act({ type: 'FEED_ANIMAL', animal: id, now: at() });
    }
    if (hiveStage(s, clock) === 'idle') act({ type: 'START_HIVE', now: at() });
    if (hiveStage(s, clock) === 'ready') act({ type: 'COLLECT_HIVE', now: at() });
    if (boatStage(s, clock) === 'back') act({ type: 'COLLECT_BOAT', now: at() });
    if (boatStage(s, clock) === 'docked') act({ type: 'SEND_BOAT', now: at() });
    for (const d of Object.values(DECOR)) {
      if (!s.decor.includes(d.id) && s.coins > d.price + 80) {
        act({ type: 'BUY_DECOR', decor: d.id, now: at() });
        act({ type: 'PLACE_DECOR', decor: d.id as DecorId, x: decorX++, z: 4, rot: 0 });
      }
    }
    for (const q of [...dailyQuests(s, clock), ...weeklyQuests(s, clock)]) {
      if (q.status === 'ready') act({ type: 'CLAIM_QUEST', id: q.def.id, now: at() });
    }
    for (const b of badges(s)) {
      if (b.ready) act({ type: 'CLAIM_BADGE', id: b.def.id, now: at() });
    }
    if (s.quests.chest) act({ type: 'OPEN_CHEST', now: at() });

    if (tick % 8 === 0) steps.push({ clientNow: clock + 5 * MIN, data: structuredClone(s) });
  }
  return { steps, last: s, lastAt: steps[steps.length - 1]!.clientNow };
}

/** A copy of the last save with one entry appended (its balance moved so only the rule is wrong). */
function withEntry(
  p: GuestProgress,
  key: string,
  resource: string,
  delta: number,
  at: number,
): GuestProgress {
  const q = structuredClone(p);
  const [kind, id] = resource.split(':') as [string, string];
  if (resource === 'xp') q.xp += delta;
  else if (resource === 'coin') q.coins += delta;
  else if (kind === 'seed') q.seeds[id as CropId] += delta;
  else q.ingredients[id as ProduceId] += delta;
  // Trimmed like the reducer does, so the save stays a valid shape.
  q.ledger = [
    ...q.ledger,
    { key, resource: resource as never, delta, balanceAfter: 0, reason: 'x', at },
  ].slice(-LEDGER_LIMIT);
  return q;
}

function cheats(last: GuestProgress, lastAt: number) {
  const now = lastAt + 30 * MIN;
  const at = lastAt + 20 * MIN;
  const lv = level(last.xp).level;
  // Something the bot has plenty of, to "sell".
  const item = (PRODUCE_IDS as ProduceId[]).reduce((a, b) =>
    last.ingredients[b] > last.ingredients[a] ? b : a,
  );
  const out: { name: string; clientNow: number; data: GuestProgress; code: string }[] = [];
  const add = (name: string, data: GuestProgress, code: string, clientNow = now) =>
    out.push({ name, clientNow, data, code });

  add(
    'xu edited without a ledger entry',
    { ...structuredClone(last), coins: last.coins + 500 },
    'balance',
  );
  add(
    'harvest of a crop nobody planted',
    withEntry(last, `harvest:1:${at - 9 * HOUR_MS}`, 'ingredient:durian', 2, at),
    'rule',
  );
  add(
    'sale dated an hour ahead',
    withEntry(
      withEntry(last, `sell:${item}:${now + HOUR_MS}:out`, `ingredient:${item}`, -1, now + HOUR_MS),
      `sell:${item}:${now + HOUR_MS}:coin`,
      'coin',
      MARKET.sell(item),
      now + HOUR_MS,
    ),
    'clock',
  );
  add(
    'coins from a sale with nothing sold',
    withEntry(last, `sell:rice:${at}:coin`, 'coin', 2, at),
    'rule',
  );
  add(
    'sale at a made-up price',
    withEntry(
      withEntry(last, `sell:${item}:${at}:out`, `ingredient:${item}`, -1, at),
      `sell:${item}:${at}:coin`,
      'coin',
      400,
      at,
    ),
    'rule',
  );
  const cooked = structuredClone(last);
  cooked.cooked = { ...cooked.cooked, 'com-tam': (cooked.cooked['com-tam'] ?? 0) + 5 };
  add('cooked count raised without cooking', cooked, 'rule');
  const planted = structuredClone(last);
  const empty = planted.plots.find((p) => p.crop === null) ?? planted.plots[0]!;
  Object.assign(empty, { crop: 'rice', plantedAt: at, readyAt: at + HOUR_MS, harvests: undefined });
  add('crop placed on a plot without a seed', planted, 'rule');
  const fast = structuredClone(last);
  const growing = fast.plots.find((p) => p.crop !== null && p.readyAt !== null && p.readyAt > now);
  if (growing) {
    growing.readyAt = growing.plantedAt! + 1000;
    add('plot set to ripen almost at once', fast, 'rule');
  }
  const locked = (Object.keys(CROPS) as CropId[]).find((c) => (CROPS[c].unlock?.level ?? 1) > lv);
  if (locked)
    add(
      'crop unlocked above the level',
      { ...structuredClone(last), unlockedCrops: [...last.unlockedCrops, locked] },
      'rule',
    );
  const castAt = at - 5000;
  const wrong = catchFor(castAt, lv) === 'fish' ? 'shrimp' : 'fish';
  add(
    'catch that is not what bites',
    withEntry(last, `catch:${castAt}`, `ingredient:${wrong}`, 1, at),
    'rule',
  );
  add(
    'catch reported before the bite',
    withEntry(last, `catch:${at}`, `ingredient:${catchFor(at, lv)}`, 1, at),
    'rule',
  );
  add(
    'same save with the device clock moved 3 hours ahead',
    structuredClone(last),
    'clock',
    now + 3 * HOUR_MS,
  );
  const decorated = structuredClone(last);
  const notOwned = (Object.keys(DECOR) as DecorId[]).find((d) => !last.decor.includes(d));
  if (notOwned) {
    decorated.decor = [...decorated.decor, notOwned];
    add('decoration never bought', decorated, 'rule');
  }
  add(
    'streak raised by a month',
    { ...structuredClone(last), streak: { ...last.streak, count: last.streak.count + 30 } },
    'rule',
  );
  add(
    'badge for picking from friends, never having done it',
    withEntry(last, 'badge:sneaky:1', 'xp', 20, at),
    'rule',
  );
  add(
    'quest reward larger than the quest',
    withEntry(last, `quest:${slotKey(at).slice(0, 10)}:d-buy`, 'xp', 500, at),
    'rule',
  );
  add('an XP entry nothing in the game pays', withEntry(last, `bonus:${at}`, 'xp', 50, at), 'rule');
  {
    // One more plot, as the app would add it, but without paying for it; then paid too little.
    const id = last.plots.length + 1;
    const plot = {
      id,
      crop: null,
      plantedAt: null,
      readyAt: null,
      sourceDishId: null,
      wateredAt: null,
    };
    add(
      'a plot added without clearing it',
      { ...structuredClone(last), plots: [...last.plots, plot] },
      'rule',
    );
    const cheap = withEntry(last, `land:${id}:${at}`, 'coin', -1, at);
    add('a plot cleared below its price', { ...cheap, plots: [...cheap.plots, plot] }, 'rule');
  }
  add(
    'meat bought below the market price',
    withEntry(
      withEntry(last, `buy:pork:${at}:coin`, 'coin', -1, at),
      `buy:pork:${at}:item`,
      'ingredient:pork',
      1,
      at,
    ),
    'rule',
  );
  const rewritten = structuredClone(last);
  const firstPay = rewritten.ledger.findIndex((e) => e.delta > 0 && e.resource === 'xp');
  if (firstPay >= 0) {
    rewritten.ledger[firstPay] = {
      ...rewritten.ledger[firstPay]!,
      delta: rewritten.ledger[firstPay]!.delta + 100,
    };
    rewritten.xp += 100;
    add('old ledger entry rewritten', rewritten, 'rule');
  }
  add(
    'boat catch on a trip never sent',
    withEntry(
      last,
      `boat:${at - 3 * HOUR_MS - 7 * 86_400_000}:0`,
      `ingredient:${boatCatch(at, lv)[0]}`,
      1,
      at,
    ),
    'rule',
  );
  // Holes found in the anti-cheat review (03/10/2026): each must stay shut.
  const day = new Date(at).toISOString().slice(0, 10);
  add(
    'chest xu without the chest',
    withEntry(last, `chest:${day}:30:coin`, 'coin', 150, at),
    'rule',
  );
  add(
    "order seeds without Cô Ba's order",
    withEntry(last, `order:${day}:77:seed:rice`, 'seed:rice', 500, at),
    'rule',
  );
  add(
    'a badge tier spelled with a leading zero',
    withEntry(last, 'badge:cook:01', 'xp', 20, at),
    'rule',
  );
  add(
    'a planting that spends no seed',
    withEntry(last, `tray:2:${at}`, 'seed:rice', 0, at),
    'rule',
  );
  add(
    'a meal seed handed back for nothing',
    withEntry(last, `seed:${day}:breakfast:r1:reverse`, 'seed:rice', 0, at),
    'rule',
  );
  {
    // A stamp moves no balance: added by hand (withEntry books resources).
    const stamped = structuredClone(last);
    stamped.ledger = [
      ...stamped.ledger,
      {
        key: 'stamp:discovered:made-up-dish',
        resource: 'stamp' as const,
        delta: 1,
        balanceAfter: 0,
        reason: 'x',
        at,
      },
    ].slice(-LEDGER_LIMIT);
    stamped.stamps = {
      ...stamped.stamps,
      discovered: [...stamped.stamps.discovered, 'made-up-dish'],
    };
    add('a stamp for a dish that does not exist', stamped, 'rule');
  }
  return out;
}

function parity() {
  const casts: [number, number, string][] = [];
  const boats: [number, number, string[]][] = [];
  const bites: [number, number][] = [];
  for (let i = 0; i < 400; i++) {
    const t = T0 + i * 7_919_113;
    const lv = 1 + (i % 12);
    casts.push([t, lv, catchFor(t, lv)]);
    boats.push([t, lv, boatCatch(t, lv)]);
    bites.push([t, biteDelay(t)]);
  }
  const xp = Object.values(CROPS).flatMap((c) =>
    [c.growHours, c.regrowHours ?? c.growHours].map(
      (h) => [Math.round(h * 3_600_000), harvestXp(h)] as [number, number],
    ),
  );
  return { casts, boats, bites, xp };
}

function phpBinary(): string | null {
  const candidates = [process.env.PHP_BIN, 'C:/xampp/php/php.exe', 'php'].filter(
    Boolean,
  ) as string[];
  for (const bin of candidates) {
    if (bin.includes('/') && !existsSync(bin)) continue;
    const r = spawnSync(bin, ['-v'], { encoding: 'utf8' });
    if (r.status === 0) return bin;
  }
  return null;
}

const php = phpBinary();

describe('server save guard (ProgressGuard.php)', () => {
  it.skipIf(!php)(
    'accepts a week of honest play and refuses each forged save for its reason',
    () => {
      const { steps, last, lastAt } = play();
      // The bot really used the butcher, so market purchases are checked too.
      const bought = steps.flatMap((st) => st.data.ledger.map((e) => e.key));
      expect(bought.some((k) => /^buy:[a-z]+:-?\d+:item$/.test(k))).toBe(true);
      expect(bought.some((k) => /^land:\d+:-?\d+$/.test(k))).toBe(true);
      expect(last.plots.length).toBeGreaterThan(4);
      // The bot really played: every part of the game came into its saves.
      const families = new Set(
        steps.flatMap((st) => st.data.ledger.map((e) => e.key.split(':')[0])),
      );
      const regrown = steps.some((st) => st.data.plots.some((p) => (p.harvests ?? 0) > 0));
      expect(regrown, 'a tree or mushroom harvested more than once').toBe(true);
      for (const f of [
        'seed',
        'plant',
        'tray',
        'harvest',
        'checkin',
        'photo',
        'cook',
        'order',
        'sell',
        'buy',
        'catch',
        'feed',
        'collect',
        'hive',
        'boat',
        'decor',
        'quest',
        'badge',
        'unlock',
        'stamp',
      ])
        expect(families, f).toContain(f);
      expect(level(last.xp).level).toBeGreaterThanOrEqual(8);
      expect(plotStage(last.plots[0]!, lastAt)).toBeDefined();

      const dir = mkdtempSync(join(tmpdir(), 'angi-guard-'));
      try {
        const file = join(dir, 'fixture.json');
        writeFileSync(
          file,
          JSON.stringify({ steps, cheats: cheats(last, lastAt), parity: parity() }),
        );
        // KEEP_FIXTURE=path keeps a copy to replay with php server/bin/selftest-guard.php <path>.
        if (process.env.KEEP_FIXTURE) writeFileSync(process.env.KEEP_FIXTURE, readFileSync(file));
        const r = spawnSync(
          php!,
          [resolve(__dirname, '../../server/bin/selftest-guard.php'), file],
          {
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
          },
        );
        const out = `${r.stdout}\n${r.stderr}`;
        expect(out).toContain('SUMMARY');
        if (process.env.GUARD_REPORT) {
          console.log(out.match(/^(honest saves|forged saves|SUMMARY).*$/gm)?.join('\n'));
        }
        expect(r.status, out.slice(-4000)).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
