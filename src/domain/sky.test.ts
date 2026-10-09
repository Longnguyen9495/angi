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
import { badges, dailyQuests, setSkyQuests, starPots, weeklyQuests } from './quests';
import { gameReducer, type Action } from './reducer';
import {
  bugCheckAt,
  floorCombo,
  pendingChecks,
  potBase,
  potMax,
  potStats,
  resonance,
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

describe('resonance (§17.3)', () => {
  it("adds to the set's main stat for 2 and 4 pots of a set, never on top of a floor effect", () => {
    let p = run(player(29, 20000), { type: 'SKY_OPEN_FLOOR', now: T0 });
    const sky = p.sky!;
    const add = (pot: 'pumpkin' | 'corn' | 'cabbage' | 'eggplant', i: number) => {
      const uid = `${pot}.${90 + i}`;
      sky.pots[uid] = { uid, pot, tier: 2, stars: 0, luck: 0, tries: 0, cycles: 0, plant: null };
      return uid;
    };
    const a = add('pumpkin', 0);
    const b = add('corn', 1);
    const c = add('cabbage', 2);
    const d = add('eggplant', 3);
    p = { ...p, sky: { ...sky } };
    const at = (uid: string, slot: number) => {
      p = run(p, { type: 'SKY_PLACE_POT', uid, floor: 0, slot, now: T0 });
    };
    at(a, 0);
    const alone = potStats(p.sky!, a).time;
    expect(resonance(p.sky!, a)).toBe(0);
    at(b, 1);
    expect(resonance(p.sky!, a)).toBe(2);
    expect(potStats(p.sky!, a).time).toBe(alone + 300);
    at(c, 2);
    expect(resonance(p.sky!, a)).toBe(2);
    // A fourth produce pot on a bought slot: the higher step, still no floor effect.
    p = { ...p, sky: { ...p.sky!, bought: [3] } };
    at(d, 3);
    expect(floorCombo(p.sky!, 0)).toBeNull();
    expect(resonance(p.sky!, d)).toBe(4);
    expect(potStats(p.sky!, a).time).toBe(alone + 700);
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
    // Floor 3 is the first to give Mây Ngọc, the steady source the 90-day sim was missing.
    expect(p.sky!.items.gem ?? 0).toBe(FLOORS[2]!.gem);
    expect(FLOORS[2]!.gem).toBeGreaterThan(0);
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

describe('Vườn Mây with friends (G5)', () => {
  it('takes a friend’s catch on our pot once revealed, and a ladybug for our own help', () => {
    let now = T0;
    let p = run(player(), { type: 'SKY_OPEN_FLOOR', now });
    const [a] = Object.keys(p.sky!.pots);
    p = run(
      p,
      { type: 'SKY_PLACE_POT', uid: a!, floor: 0, slot: 0, now },
      { type: 'SKY_PLANT', uid: a!, seed: { kind: 'sky', id: 'jasmine' }, now },
    );
    now = bugCheckAt(p.sky!.pots[a!]!.plant!, 0) + 1000;
    const caught: Action = {
      type: 'FRIEND_EVENT',
      event: { id: 'e7', type: 'skycaught', pot: a!, plotId: 0, cycle: 0, from: 'Bình' },
      now,
    };
    // Not revealed to us yet: left for a later sync.
    expect(gameReducer(p, caught)).toBe(p);
    p = revealAll(p, now);
    p = run(p, caught);
    expect(p.sky!.pots[a!]!.plant!.caught).toEqual([0]);
    expect(p.sky!.bugs.ladybug).toBe(1);
    expect(p.ledger.some((e) => e.key === 'friend:e7:seen')).toBe(true);
    // Applied once.
    expect(run(p, caught)).toBe(p);

    const help: Action = {
      type: 'FRIEND_EVENT',
      event: { id: 'e8', type: 'skyhelp', bug: 'ladybug', plotId: 1, cycle: 0, from: 'Bình' },
      now,
    };
    p = run(p, help);
    expect(p.sky!.bugs.ladybug).toBe(2);
    expect(run(p, help)).toBe(p);
  });

  it('ripens our pot sooner when a friend waters it, only that planting, once', () => {
    let now = T0;
    let p = run(player(), { type: 'SKY_OPEN_FLOOR', now });
    const [a] = Object.keys(p.sky!.pots);
    p = run(
      p,
      { type: 'SKY_PLACE_POT', uid: a!, floor: 0, slot: 0, now },
      { type: 'SKY_PLANT', uid: a!, seed: { kind: 'sky', id: 'jasmine' }, now },
    );
    now += 10 * MIN;
    const before = p.sky!.pots[a!]!.plant!.readyAt;
    const xp = p.xp;
    const water: Action = {
      type: 'FRIEND_EVENT',
      event: { id: 'e9', type: 'skywater', pot: a!, cycle: 0, from: 'Bình' },
      now,
    };
    p = run(p, water);
    const plant = p.sky!.pots[a!]!.plant!;
    expect(plant.readyAt).toBe(now + Math.round((before - now) * 0.75));
    expect(plant.wateredAt).toBe(now);
    expect(p.xp).toBeGreaterThan(xp);
    expect(run(p, water)).toBe(p);

    // An event for an earlier planting pays the XP but leaves this one alone.
    const stale: Action = {
      type: 'FRIEND_EVENT',
      event: { id: 'e10', type: 'skywater', pot: a!, cycle: 5, from: 'Bình' },
      now,
    };
    const q = run(p, stale);
    expect(q.sky!.pots[a!]!.plant!.readyAt).toBe(plant.readyAt);
    expect(q.ledger.some((e) => e.key === 'friend:e10:xp')).toBe(true);

    const helped: Action = {
      type: 'FRIEND_EVENT',
      event: { id: 'e11', type: 'skywatered', pot: a!, cycle: 0, from: 'Bình' },
      now,
    };
    const r = run(q, helped);
    expect(r.xp).toBeGreaterThan(q.xp);
    expect(run(r, helped)).toBe(r);
  });
});

describe('Vườn Mây quests and achievements (§5.8)', () => {
  it('draws sky quests only with a cloud garden and the switch on', () => {
    const drawn = (p: GuestProgress) =>
      Array.from({ length: 40 }, (_, d) => [
        ...dailyQuests(p, T0 + d * 86_400_000),
        ...weeklyQuests(p, T0 + d * 7 * 86_400_000),
      ]).flatMap((list) => list.map((v) => v.def.id));
    const sky = run(player(), { type: 'SKY_OPEN_FLOOR', now: T0 });
    try {
      setSkyQuests(false);
      expect(drawn(sky).filter((id) => id.includes('-sky-'))).toEqual([]);
      setSkyQuests(true);
      expect(drawn(player()).filter((id) => id.includes('-sky-'))).toEqual([]);
      const ids = drawn(sky);
      expect(ids).toContain('d-sky-bug');
      // No machine below its floor, no balloon below floor 5.
      expect(ids).not.toContain('d-sky-box');
      expect(ids).not.toContain('w-sky-trip');
    } finally {
      setSkyQuests(false);
    }
  });

  it('counts catches, harvests and star-ups toward the quests', () => {
    let now = T0;
    let p = run(player(), { type: 'SKY_OPEN_FLOOR', now });
    const [a] = Object.keys(p.sky!.pots);
    p = run(
      p,
      { type: 'SKY_PLACE_POT', uid: a!, floor: 0, slot: 0, now },
      { type: 'SKY_PLANT', uid: a!, seed: { kind: 'sky', id: 'jasmine' }, now },
    );
    now = bugCheckAt(p.sky!.pots[a!]!.plant!, 0) + 1000;
    p = revealAll(p, now);
    p = run(p, { type: 'SKY_CATCH', uid: a!, stage: 0, now });
    now = p.sky!.pots[a!]!.plant!.readyAt + 1000;
    p = run(p, { type: 'SKY_HARVEST', uid: a!, now }, { type: 'SKY_STARRED', now });
    expect(p.quests.total).toMatchObject({ skyBug: 1, skyHarvest: 1, skyStar: 1 });
  });

  it('shows the sky shelf of achievements only with a cloud garden', () => {
    expect(badges(player()).some((b) => b.def.group === 'sky')).toBe(false);
    const p = run(player(), { type: 'SKY_OPEN_FLOOR', now: T0 });
    const climb = badges(p).find((b) => b.def.id === 'skyclimber')!;
    expect(climb.value).toBe(1);
    expect(starPots(p)).toBe(0);
  });
});

describe('Vườn Mây festival pots (EVENT_POTS)', () => {
  it('gives an event’s pots once its last milestone is claimed, and only once', () => {
    let p = run(player(), { type: 'SKY_OPEN_FLOOR', now: T0 });
    const give: Action = { type: 'SKY_EVENT_POTS', event: 'tet-dinh-mui', now: T0 };
    // Not finished: nothing.
    expect(run(p, give)).toBe(p);
    p = { ...p, events: { ...p.events, 'tet-dinh-mui': { days: [], claimed: [0, 1, 2] } } };
    const q = run(p, give);
    const kinds = Object.values(q.sky!.pots).map((x) => x.pot);
    expect(kinds).toContain('peach_blossom');
    expect(kinds).toContain('golden_dragon');
    expect(q.sky!.events).toEqual(['tet-dinh-mui']);
    expect(run(q, give)).toBe(q);
    // An event without festival pots gives none.
    const r = run(
      { ...q, events: { ...q.events, 'thu-ha-noi': { days: [], claimed: [0, 1, 2] } } },
      { type: 'SKY_EVENT_POTS', event: 'thu-ha-noi', now: T0 },
    );
    expect(Object.keys(r.sky!.pots)).toHaveLength(Object.keys(q.sky!.pots).length);
  });
});
