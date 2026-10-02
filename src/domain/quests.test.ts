import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/game';
import { createInitialProgress, type GuestProgress } from './progress';
import { parseProgress } from './persistence';
import {
  DAILY_COUNT,
  WEEKLY_COUNT,
  badges,
  claimableCount,
  dailyQuests,
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
