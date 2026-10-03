import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/game';
import { createInitialProgress, type GuestProgress } from './progress';
import { parseProgress } from './persistence';
import {
  ACHIEVEMENTS,
  DAILY_COUNT,
  QUEST_DEFS,
  WEEKLY_COUNT,
  badgeReward,
  badges,
  claimableCount,
  dailyQuests,
  questsFor,
  weekKey,
  weeklyQuests,
} from './quests';
import { gameReducer } from './reducer';
import { HOUR_MS } from './time';

// Tuesday 29 Sep 2026, lunch time.
const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();
const DAY = 24 * HOUR_MS;

function fresh(): GuestProgress {
  return createInitialProgress(NOON);
}

describe('daily and weekly quests', () => {
  it('draws the same quests all day, choosing a dish first, and new ones tomorrow', () => {
    const s = fresh();
    const today = dailyQuests(s, NOON).map((v) => v.def.id);
    expect(today).toHaveLength(DAILY_COUNT);
    expect(today[0]).toBe('d-choose');
    expect(new Set(today).size).toBe(DAILY_COUNT);
    expect(dailyQuests(s, NOON + 5 * HOUR_MS).map((v) => v.def.id)).toEqual(today);
    expect(weeklyQuests(s, NOON)).toHaveLength(WEEKLY_COUNT);
  });

  it('keeps friends-only quests out until the guest has friends', () => {
    let s = fresh();
    for (let d = 0; d < 30; d++) {
      const ids = dailyQuests(s, NOON + d * DAY).map((v) => v.def.id);
      expect(ids.some((id) => ['d-help', 'd-steal', 'd-gift'].includes(id))).toBe(false);
    }
    s = gameReducer(s, { type: 'SET_SOCIAL', on: true });
    const seen = new Set<string>();
    for (let d = 0; d < 60; d++) for (const v of dailyQuests(s, NOON + d * DAY)) seen.add(v.def.id);
    expect([...seen].some((id) => ['d-help', 'd-steal', 'd-gift'].includes(id))).toBe(true);
  });

  it('pays a finished quest once, on claim', () => {
    let s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON });
    expect(claimableCount(s, NOON)).toBeGreaterThanOrEqual(1);
    const xp = s.xp;
    const seeds = Object.values(s.seeds).reduce((a, b) => a + b, 0);
    s = gameReducer(s, { type: 'CLAIM_QUEST', id: 'd-choose', now: NOON + 1 });
    expect(s.xp).toBe(xp + 10);
    expect(Object.values(s.seeds).reduce((a, b) => a + b, 0)).toBe(seeds + 1);
    expect(dailyQuests(s, NOON)[0]?.status).toBe('claimed');
    expect(gameReducer(s, { type: 'CLAIM_QUEST', id: 'd-choose', now: NOON + 2 })).toBe(s);
  });

  it('refuses an unfinished quest and one that is not today’s', () => {
    const s = fresh();
    const open = dailyQuests(s, NOON).find((v) => v.status === 'open')!;
    expect(gameReducer(s, { type: 'CLAIM_QUEST', id: open.def.id, now: NOON })).toBe(s);
    expect(gameReducer(s, { type: 'CLAIM_QUEST', id: 'nope', now: NOON })).toBe(s);
  });

  it('counts the week across days and resets on Monday', () => {
    let s = fresh();
    s = gameReducer(s, { type: 'HARVEST_ALL', now: NOON });
    expect(s.quests.weekTally.harvest).toBe(1);
    expect(s.quests.total.harvest).toBe(1);
    // Next Monday is a new week: the weekly tally restarts, the total keeps going.
    const monday = new Date(2026, 9, 5, 9).getTime();
    expect(weekKey(monday)).not.toBe(weekKey(NOON));
    s = gameReducer(s, { type: 'SELL', crop: 'herbs', now: monday });
    expect(s.quests.weekTally.harvest ?? 0).toBe(0);
    expect(s.quests.total.harvest).toBe(1);
  });
});

describe('streak chest and achievements', () => {
  it('leaves a chest when the streak reaches a chest day, opened once', () => {
    // A new guest starts on a 2-day streak, so today's pick makes 3.
    let s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON });
    expect(s.streak.count).toBe(3);
    expect(s.quests.chest).toMatchObject({ streak: 3 });
    const coins = s.coins;
    s = gameReducer(s, { type: 'OPEN_CHEST', now: NOON + 1 });
    expect(s.quests.chest).toBeNull();
    expect(s.coins).toBeGreaterThan(coins);
    expect(gameReducer(s, { type: 'OPEN_CHEST', now: NOON + 2 })).toBe(s);
  });

  it('pays each achievement tier once', () => {
    let s = fresh();
    s = { ...s, quests: { ...s.quests, total: { harvest: 12 } } };
    const farmer = badges(s).find((b) => b.def.id === 'farmer')!;
    expect(farmer.ready).toBe(true);
    s = gameReducer(s, { type: 'CLAIM_BADGE', id: 'farmer', now: NOON });
    expect(s.quests.badges.farmer).toBe(1);
    expect(badges(s).find((b) => b.def.id === 'farmer')!.ready).toBe(false);
    expect(gameReducer(s, { type: 'CLAIM_BADGE', id: 'farmer', now: NOON + 1 })).toBe(s);
  });
});

describe('friends: invite reward', () => {
  it('a referral milestone pays its coins and XP once', () => {
    const ev = {
      id: 'e9',
      type: 'referral' as const,
      plotId: 1,
      coins: 20,
      xp: 10,
      from: 'Vườn Chi',
    };
    const s = gameReducer(fresh(), { type: 'FRIEND_EVENT', event: ev, now: NOON });
    expect(s.coins).toBe(fresh().coins + 20);
    expect(s.xp).toBe(fresh().xp + 10);
    expect(gameReducer(s, { type: 'FRIEND_EVENT', event: ev, now: NOON + 1 })).toBe(s);
  });
});

describe('friends: picking and gifts', () => {
  it('a pick from a friend gives us one crop; the owner harvests one less', () => {
    let thief = gameReducer(fresh(), {
      type: 'FRIEND_EVENT',
      event: { id: 'e1', type: 'stole', crop: 'tomato', plotId: 2 },
      now: NOON,
    });
    expect(thief.ingredients.tomato).toBe(1);
    expect(thief.quests.total.steal).toBe(1);
    const again = gameReducer(thief, {
      type: 'FRIEND_EVENT',
      event: { id: 'e1', type: 'stole', crop: 'tomato', plotId: 2 },
      now: NOON + 1,
    });
    expect(again).toBe(thief);

    // Plot 1 of a new guest is ripe herbs.
    let owner = gameReducer(fresh(), {
      type: 'FRIEND_EVENT',
      event: { id: 'e2', type: 'stolen', crop: 'herbs', plotId: 1, from: 'Vườn Bình' },
      now: NOON,
    });
    expect(owner.plots[0]?.stolen).toBe(true);
    const xp = owner.xp;
    owner = gameReducer(owner, { type: 'HARVEST_ALL', now: NOON + 1 });
    expect(owner.ingredients.herbs).toBe(CROPS.herbs.yield - 1);
    expect(owner.xp).toBeGreaterThan(xp);
    expect(owner.plots[0]?.stolen).toBeUndefined();
    thief = gameReducer(thief, { type: 'HARVEST_ALL', now: NOON + 1 });
    expect(thief.xp).toBeGreaterThan(0);
  });

  it('a picked plot that was already replanted is left alone', () => {
    const s = gameReducer(fresh(), {
      type: 'FRIEND_EVENT',
      event: { id: 'e3', type: 'stolen', crop: 'rice', plotId: 1 },
      now: NOON,
    });
    expect(s.plots[0]?.stolen).toBeUndefined();
  });

  it('sending a seed takes it from the tray once; receiving one adds it', () => {
    let s = { ...fresh(), seeds: { ...fresh().seeds, chili: 1 } };
    s = gameReducer(s, { type: 'GIFT_SENT', id: 'e9', crop: 'chili', now: NOON });
    expect(s.seeds.chili).toBe(0);
    expect(s.quests.day.gift).toBe(1);
    expect(gameReducer(s, { type: 'GIFT_SENT', id: 'e9', crop: 'chili', now: NOON })).toBe(s);
    s = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'e10', type: 'present', crop: 'bean', from: 'Vườn An' },
      now: NOON,
    });
    expect(s.seeds.bean).toBe(1);
  });
});

describe('saves', () => {
  it('older saves with the old missions start quests fresh', () => {
    const old = { ...fresh(), missions: { date: '2026-09-29', done: ['choose'] } } as Record<
      string,
      unknown
    >;
    delete old.quests;
    const p = parseProgress(old, NOON)!;
    expect(p.quests.total).toEqual({});
    expect(dailyQuests(p, NOON)).toHaveLength(DAILY_COUNT);
  });

  it('round-trips quest progress', () => {
    let s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON });
    s = gameReducer(s, { type: 'CLAIM_QUEST', id: 'd-choose', now: NOON });
    const p = parseProgress(JSON.parse(JSON.stringify(s)), NOON)!;
    expect(p.quests).toEqual(s.quests);
  });
});

describe('more quests and 28 achievements', () => {
  const every = (s: GuestProgress, days: number) =>
    Array.from({ length: days }, (_, d) => [
      dailyQuests(s, NOON + d * DAY).map((v) => v.def),
      weeklyQuests(s, NOON + d * 7 * DAY).map((v) => v.def),
    ]);

  it('every quest and achievement has words in Vietnamese and English', async () => {
    const vi = (await import('../i18n/messages/vi/data')).default.quests;
    const en = (await import('../i18n/messages/en/data')).default.quests;
    for (const def of Object.values(QUEST_DEFS)) {
      expect(vi.metric[def.metric], def.id).toBeTypeOf('function');
      expect(en.metric[def.metric], def.id).toBeTypeOf('function');
    }
    for (const a of ACHIEVEMENTS) {
      expect(vi.badges[a.id as keyof typeof vi.badges]?.name, a.id).toBeTruthy();
      expect(en.badges[a.id as keyof typeof en.badges]?.name, a.id).toBeTruthy();
    }
    expect(ACHIEVEMENTS).toHaveLength(28);
  });

  it('never draws two quests that count the same thing, nor more than one friends quest', () => {
    const s = { ...gameReducer(fresh(), { type: 'SET_SOCIAL', on: true }), xp: 2000 };
    for (const [daily, weekly] of every(s, 60)) {
      for (const list of [daily!, weekly!]) {
        expect(new Set(list.map((d) => d.metric)).size).toBe(list.length);
        expect(
          list.filter((d) => ['help', 'steal', 'gift'].includes(d.metric)).length,
        ).toBeLessThan(2);
      }
      expect(daily).toHaveLength(DAILY_COUNT);
      expect(weekly).toHaveLength(WEEKLY_COUNT);
    }
  });

  it('a level-1 guest with no friends, animals, hive, boat or trees gets only quests they can do', () => {
    const s = fresh();
    const cannot = [
      'd-honey',
      'd-boat',
      'd-fruit',
      'd-mushroom',
      'w-boat',
      'w-fruit',
      'w-mushroom',
    ];
    const social = ['d-help', 'd-steal', 'd-gift', 'w-help', 'w-steal', 'w-gift'];
    for (const [daily, weekly] of every(s, 60)) {
      for (const d of [...daily!, ...weekly!]) {
        expect(cannot, d.id).not.toContain(d.id);
        expect(social, d.id).not.toContain(d.id);
        expect(['feed', 'collect'], d.id).not.toContain(d.metric);
      }
    }
  });

  it('counts the new tallies where they happen', () => {
    let s = { ...fresh(), ingredients: { ...fresh().ingredients, rice: 3 } };
    s = gameReducer(s, { type: 'SELL', crop: 'rice', now: NOON });
    expect(s.quests.total.earn).toBe(s.coins);
    // First cook of a recipe counts once as new, the second time not.
    const r = { ...s, ingredients: { ...s.ingredients, rice: 4, scallion: 4 } };
    const once = gameReducer(r, { type: 'COOK', recipeId: 'com-tam', now: NOON + 1 });
    const twice = gameReducer(once, { type: 'COOK', recipeId: 'com-tam', now: NOON + 2 });
    expect(once.quests.total.newRecipe).toBe(1);
    expect(twice.quests.total.newRecipe).toBe(1);
    // A rated check-in counts as rated; a skipped meal does not.
    let m = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON });
    m = gameReducer(m, { type: 'CHECK_IN', outcome: 'ate', rating: 4, again: 'yes', now: NOON });
    expect(m.quests.total.rate).toBe(1);
    // Harvests remember the crop; trees and mushrooms have their own tallies.
    const h = gameReducer(fresh(), { type: 'HARVEST_ALL', now: NOON });
    expect(h.grown).toEqual(['herbs']);
    const tree = fresh();
    tree.plots[2] = {
      ...tree.plots[2]!,
      crop: 'lime',
      plantedAt: NOON - 7 * HOUR_MS,
      readyAt: NOON - 1,
    };
    const picked = gameReducer(tree, { type: 'HARVEST_ALL', now: NOON });
    expect(picked.quests.total.fruit).toBe(1);
    expect(new Set(picked.grown)).toEqual(new Set(['herbs', 'lime']));
  });

  it('claiming the last daily quest of the day counts the day once', () => {
    let s = fresh();
    const list = dailyQuests(s, NOON).map((v) => v.def);
    const tally = Object.fromEntries(list.map((d) => [d.metric, d.target]));
    s = { ...s, quests: { ...questsFor(s, NOON), day: tally } };
    for (const d of list) s = gameReducer(s, { type: 'CLAIM_QUEST', id: d.id, now: NOON + 1 });
    expect(s.quests.total.allDaily).toBe(1);
    expect(gameReducer(s, { type: 'CLAIM_QUEST', id: list[0]!.id, now: NOON + 2 })).toBe(s);
  });

  it('an older save keeps its four quests today and draws five tomorrow', () => {
    const s = fresh();
    const four = questsFor(s, NOON);
    const old = { ...s, quests: { ...four, daily: four.daily.slice(0, 4) } };
    expect(dailyQuests(old, NOON)).toHaveLength(4);
    expect(dailyQuests(old, NOON + DAY)).toHaveLength(5);
    const p = parseProgress({ ...JSON.parse(JSON.stringify(old)), grown: undefined }, NOON)!;
    expect(p.grown).toEqual([]);
  });

  it('achievements the save already earns are claimable at once, level paying no XP', () => {
    const s = { ...fresh(), xp: 450 };
    const level = badges(s).find((b) => b.def.id === 'level')!;
    expect(level.ready).toBe(true);
    expect(claimableCount(s, NOON)).toBeGreaterThanOrEqual(1);
    const after = gameReducer(s, { type: 'CLAIM_BADGE', id: 'level', now: NOON });
    expect(after.xp).toBe(s.xp);
    expect(after.coins).toBe(s.coins + badgeReward(1, 'level').coins);
  });
});

describe('quest lists stay put once seen', () => {
  // A level 6 guest whose farm gains a tree that ripens today, after the lists were drawn.
  const withTree = (s: GuestProgress): GuestProgress => ({
    ...s,
    plots: s.plots.map((p, i) =>
      i === 0
        ? { ...p, crop: 'lime', plantedAt: NOON - DAY, readyAt: NOON + HOUR_MS, wateredAt: null }
        : p,
    ),
  });
  const guest = (n: number): GuestProgress => ({ ...fresh(), guestId: `g-${n}`, xp: 500 });

  it('keeps the rolled lists when a gate opens later in the day', () => {
    for (let n = 0; n < 50; n++) {
      const rolled = gameReducer(guest(n), { type: 'ROLL_QUESTS', now: NOON });
      const later = withTree(rolled);
      expect(dailyQuests(later, NOON + 60_000).map((v) => v.def.id)).toEqual(
        dailyQuests(rolled, NOON).map((v) => v.def.id),
      );
      expect(weeklyQuests(later, NOON + 60_000).map((v) => v.def.id)).toEqual(
        weeklyQuests(rolled, NOON).map((v) => v.def.id),
      );
    }
  });

  it('even unrolled, a gate that opens swaps in at most one quest', () => {
    for (let n = 0; n < 50; n++) {
      const before = dailyQuests(guest(n), NOON).map((v) => v.def.id);
      const after = dailyQuests(withTree(guest(n)), NOON).map((v) => v.def.id);
      expect(after.filter((id) => !before.includes(id)).length).toBeLessThanOrEqual(1);
    }
  });
});
