import { describe, expect, it } from 'vitest';
import { xpForLevel } from '../data/game';
import {
  FLOORS,
  SKY_CROPS,
  SKY_GOOD_PRICE,
  SKY_LEVEL,
  SKY_RECIPES,
  SKY_XP_PER_DAY,
  inputValue,
  type BugId,
} from '../data/skyEconomy';
import { createInitialProgress, type GuestProgress } from './progress';
import { gameReducer, type Action } from './reducer';
import {
  bugCheckAt,
  floorCombo,
  pendingChecks,
  potBase,
  potMax,
  potStats,
  skyStage,
  type SkyState,
} from './sky';

const T0 = new Date(2026, 9, 8, 8, 0).getTime();
const MIN = 60_000;

function player(lv = SKY_LEVEL, coins = 5000): GuestProgress {
  const p = createInitialProgress(T0);
  return { ...p, xp: xpForLevel(lv), coins };
}

function run(p: GuestProgress, ...actions: Action[]): GuestProgress {
  return actions.reduce((s, a) => gameReducer(s, a), p);
}

/** What the server would reveal: here, a ladybug at every check that is due. */
function revealAll(p: GuestProgress, now: number, bug: BugId | null = 'ladybug'): GuestProgress {
  const bugs = Object.values(p.sky!.pots).flatMap((pot) =>
    pot.plant
      ? pendingChecks(pot.plant, now).map((stage) => ({
          uid: pot.uid,
          cycle: pot.plant!.cycle,
          stage,
          bug,
        }))
      : [],
  );
  return gameReducer(p, { type: 'SKY_REVEAL', bugs, now });
}

describe('Vườn Mây economy tables', () => {
  it('sells no machine product for more than 1.35 × its inputs (no buy–cook–sell loop)', () => {
    for (const r of Object.values(SKY_RECIPES)) {
      if (!('good' in r.out)) continue;
      const inputs = r.inputs.reduce((n, i) => n + inputValue(i), 0);
      expect(SKY_GOOD_PRICE[r.out.good] * r.out.qty, r.id).toBeLessThanOrEqual(
        Math.floor(inputs * 1.35),
      );
    }
  });

  it('never sells a sky seed for more than its harvest is worth plus a little (§0.4)', () => {
    for (const c of Object.values(SKY_CROPS)) {
      const value = c.yield.reduce(
        (n, y) => n + ('good' in y ? SKY_GOOD_PRICE[y.good] * y.qty : 0),
        0,
      );
      if (value > 0) expect(c.seed, c.id).toBeLessThan(value);
    }
  });

  it('gives the §0.5 worked example for a pumpkin pot', () => {
    expect(potBase('pumpkin', 2).time).toBe(600);
    expect(potBase('pumpkin', 3).time).toBe(Math.floor((600 * 220) / 170));
    expect(potMax('pumpkin', 2, 0).time).toBeLessThanOrEqual(5000);
  });
});

describe('Vườn Mây play', () => {
  it('stays shut below the level, opens floor 1 with the starter pots at level 12', () => {
    const low = run(player(SKY_LEVEL - 1), { type: 'SKY_OPEN_FLOOR', now: T0 });
    expect(low.sky).toBeUndefined();
    const p = run(player(), { type: 'SKY_OPEN_FLOOR', now: T0 });
    expect(p.sky!.floors).toBe(1);
    expect(Object.keys(p.sky!.pots)).toHaveLength(3);
    expect(p.ledger.filter((e) => e.key.startsWith('sky:starter:'))).toHaveLength(3);
  });

  it('walks the tutorial to floors 2 and 3 without friends, events or rare bugs (§0.4, §0.15.1)', () => {
    let now = T0;
    let p = player(19, 3000);
    p = { ...p, ingredients: { ...p.ingredients, honey: 0 } };
    p = run(p, { type: 'SKY_OPEN_FLOOR', now });
    const [a, b] = Object.keys(p.sky!.pots);
    p = run(
      p,
      { type: 'SKY_PLACE_POT', uid: a!, floor: 0, slot: 0, now },
      { type: 'SKY_PLACE_POT', uid: b!, floor: 0, slot: 1, now },
    );
    expect(p.sky!.seeds.jasmine).toBe(3);
    // Plant, the first check reveals the tutorial ladybug, catch it, harvest.
    p = run(p, { type: 'SKY_PLANT', uid: a!, seed: { kind: 'sky', id: 'jasmine' }, now });
    p = run(p, { type: 'SKY_PLANT', uid: b!, seed: { kind: 'sky', id: 'jasmine' }, now });
    now = bugCheckAt(p.sky!.pots[a!]!.plant!, 0) + 1000;
    p = revealAll(p, now);
    p = run(p, { type: 'SKY_CATCH', uid: a!, stage: 0, now });
    expect(p.sky!.bugs.ladybug).toBe(1);
    now = p.sky!.pots[a!]!.plant!.readyAt + 1000;
    p = run(p, { type: 'SKY_HARVEST_FLOOR', floor: 0, now });
    expect(p.sky!.goods.jasmine_bud).toBe(6);
    expect(p.sky!.items.cloudseed).toBe(2);
    // Floor 2 (2 cloud seeds) → +2 cloud seeds and a pumpkin pot.
    p = run(p, { type: 'SKY_OPEN_FLOOR', now });
    expect(p.sky!.floors).toBe(2);
    expect(p.sky!.items.cloudseed).toBe(2);
    // Dried jasmine twice (dew + a honey for MIX01), then MIX01.
    p = run(p, { type: 'SKY_START_JOB', machine: 'tea', recipe: 'dried_jasmine', now });
    now += 21 * MIN;
    p = run(p, { type: 'SKY_COLLECT_JOB', machine: 'tea', now });
    expect(p.sky!.items.dew).toBe(1);
    expect(p.ingredients.honey).toBe(1);
    p = run(p, { type: 'SKY_START_JOB', machine: 'tea', recipe: 'dried_jasmine', now });
    now += 21 * MIN;
    p = run(p, { type: 'SKY_COLLECT_JOB', machine: 'tea', now });
    p = run(p, { type: 'SKY_START_JOB', machine: 'tea', recipe: 'jasmine_honey_tea', now });
    now += 41 * MIN;
    p = run(p, { type: 'SKY_COLLECT_JOB', machine: 'tea', now });
    expect(p.sky!.goods.jasmine_honey_tea).toBe(1);
    expect(p.sky!.items.cloudseed).toBe(4);
    // Floor 3: 4 cloud seeds + 1 dew + 900 xu.
    p = run(p, { type: 'SKY_OPEN_FLOOR', now });
    expect(p.sky!.floors).toBe(3);
    expect(p.sky!.items.cloudseed ?? 0).toBe(0);
    expect(p.sky!.items.dew ?? 0).toBe(0);
    // Every reward once: replaying the steps pays nothing more.
    const keys = p.ledger.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('holds sky XP to its daily cap', () => {
    let now = T0;
    let p = run(player(SKY_LEVEL, 50000), { type: 'SKY_OPEN_FLOOR', now });
    const uids = Object.keys(p.sky!.pots);
    uids.forEach((uid, i) => (p = run(p, { type: 'SKY_PLACE_POT', uid, floor: 0, slot: i, now })));
    let paid = 0;
    for (let round = 0; round < 40; round++) {
      for (const uid of uids) {
        p = run(
          p,
          { type: 'SKY_BUY_SEED', crop: 'kumquat', now },
          { type: 'SKY_PLANT', uid, seed: { kind: 'sky', id: 'kumquat' }, now },
        );
      }
      now += 3 * 60 * MIN;
      const before = p.xp;
      p = run(p, { type: 'SKY_HARVEST_FLOOR', floor: 0, now });
      paid += p.xp - before;
      if (new Date(now).getDate() !== new Date(T0).getDate()) break;
    }
    expect(paid).toBeLessThanOrEqual(SKY_XP_PER_DAY);
  });

  it('keeps a planted pot on the shelves and moves pots by swapping', () => {
    const now = T0;
    let p = run(player(), { type: 'SKY_OPEN_FLOOR', now });
    const [a, b] = Object.keys(p.sky!.pots);
    p = run(
      p,
      { type: 'SKY_PLACE_POT', uid: a!, floor: 0, slot: 0, now },
      { type: 'SKY_PLACE_POT', uid: b!, floor: 0, slot: 1, now },
    );
    p = run(p, { type: 'SKY_PLANT', uid: a!, seed: { kind: 'sky', id: 'jasmine' }, now });
    expect(run(p, { type: 'SKY_STORE_POT', uid: a!, now })).toBe(p);
    const swapped = run(p, { type: 'SKY_PLACE_POT', uid: a!, floor: 0, slot: 1, now });
    expect(swapped.sky!.slots[0]!.slice(0, 2)).toEqual([b, a]);
  });

  it('reads floor effects in their order and snapshots stats at planting (§0.6)', () => {
    const now = T0;
    let p = run(player(29, 20000), { type: 'SKY_OPEN_FLOOR', now });
    const sky = (): SkyState => p.sky!;
    expect(floorCombo(sky(), 0)).toBeNull();
    const uid = Object.keys(sky().pots)[0]!;
    p = run(p, { type: 'SKY_PLACE_POT', uid, floor: 0, slot: 0, now });
    // The first starter pot is a market pot: it gives xu, not time.
    const st = potStats(sky(), uid);
    expect(st.time + st.xp + st.bug + st.coin).toBeGreaterThan(0);
    // Placing the first pot gave three jasmine seeds (tutorial).
    p = run(p, { type: 'SKY_PLANT', uid, seed: { kind: 'sky', id: 'jasmine' }, now });
    const plant = sky().pots[uid]!.plant!;
    expect(plant.stats).toEqual(potStats(sky(), uid));
    expect(skyStage(plant, now)).toBe('sprout');
    expect(skyStage(plant, plant.readyAt)).toBe('ready');
  });

  it('opens floors only in order, at their level, for their price', () => {
    let p = run(player(14, 99999), { type: 'SKY_OPEN_FLOOR', now: T0 });
    // Level 14: floor 2 needs 15.
    expect(run(p, { type: 'SKY_OPEN_FLOOR', now: T0 }).sky!.floors).toBe(1);
    p = { ...p, xp: xpForLevel(FLOORS[1]!.level) };
    // No cloud seeds yet: still shut.
    expect(run(p, { type: 'SKY_OPEN_FLOOR', now: T0 }).sky!.floors).toBe(1);
  });
});
