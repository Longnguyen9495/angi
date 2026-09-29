import { describe, expect, it } from 'vitest';
import { getDish } from '../data/dishes';
import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import { createInitialProgress } from './progress';
import { gameReducer, touchStreak } from './reducer';
import { plotStage, recipeProgress, regionProgress } from './selectors';
import { HOUR_MS, dateKey } from './time';

// A fixed lunch-time instant so slot keys are deterministic.
const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

function chosen(dishId = 'com-tam') {
  return gameReducer(createInitialProgress(NOON), { type: 'CHOOSE_DISH', dishId, now: NOON });
}

describe('choosing a dish', () => {
  it('grants exactly one related seed, XP and the choose mission', () => {
    const s = chosen('com-tam');
    expect(s.meal?.dishId).toBe('com-tam');
    expect(s.seeds.rice).toBe(1);
    expect(s.xp).toBeGreaterThan(0);
    expect(s.missions.done).toContain('choose');
  });

  it('is idempotent for the same dish in the same meal slot', () => {
    const s1 = chosen('com-tam');
    const s2 = gameReducer(s1, { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON + 1000 });
    expect(s2).toBe(s1);
    expect(s2.seeds.rice).toBe(1);
  });

  it('re-targets (not duplicates) the pending seed when switching dish before planting', () => {
    // Pick a second dish whose seed differs from com-tam's (catalogue content is editable).
    const a = getDish('com-tam')!;
    const other = reelGameDishes().find((d) => d.seed !== a.seed)!;
    const s1 = chosen('com-tam');
    const s2 = gameReducer(s1, { type: 'CHOOSE_DISH', dishId: other.id, now: NOON + 1000 });
    expect(s2.seeds[a.seed]).toBe(0);
    expect(s2.seeds[other.seed]).toBe(1);
    const s3 = gameReducer(s2, { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON + 2000 });
    expect(s3.seeds[a.seed]).toBe(1);
    expect(s3.seeds[other.seed]).toBe(0);
    expect(s3.xp).toBe(s1.xp);
  });
});

describe('planting the meal seed', () => {
  it('plants only once even when dispatched repeatedly', () => {
    const s1 = chosen('com-tam');
    const s2 = gameReducer(s1, { type: 'PLANT_MEAL_SEED', now: NOON + 5000 });
    const s3 = gameReducer(s2, { type: 'PLANT_MEAL_SEED', now: NOON + 5001 });
    const s4 = gameReducer(s3, { type: 'PLANT_MEAL_SEED', now: NOON + 5002 });
    expect(s4).toBe(s2);
    expect(s2.meal?.planted).toBe(true);
    expect(s2.seeds.rice).toBe(0);
    expect(s2.plots.filter((p) => p.crop === 'rice')).toHaveLength(1);
    expect(s2.ledger.filter((e) => e.key.startsWith('plant:'))).toHaveLength(1);
  });

  it('raises recipe and region progress', () => {
    const s1 = chosen('com-tam');
    const before = recipeProgress(s1, 'com-tam').secured;
    const s2 = gameReducer(s1, { type: 'PLANT_MEAL_SEED', now: NOON + 5000 });
    expect(recipeProgress(s2, 'com-tam').secured).toBe(before + 1);
    expect(regionProgress(s2, 'south').discovered).toBe(1);
  });

  it('does nothing when every plot is taken', () => {
    let s = chosen('com-tam');
    s = {
      ...s,
      plots: s.plots.map((p) => ({ ...p, crop: 'bean', plantedAt: NOON, readyAt: NOON + HOUR_MS })),
    };
    const next = gameReducer(s, { type: 'PLANT_MEAL_SEED', now: NOON + 1 });
    expect(next).toBe(s);
    expect(next.seeds.rice).toBe(1);
  });

  it('keeps the reward spent when re-choosing after planting', () => {
    const planted = gameReducer(chosen('com-tam'), { type: 'PLANT_MEAL_SEED', now: NOON + 10 });
    const again = gameReducer(planted, { type: 'CHOOSE_DISH', dishId: 'pho-bo', now: NOON + 20 });
    expect(again.meal?.dishId).toBe('pho-bo');
    expect(again.meal?.rewardDishId).toBe('com-tam');
    expect(again.seeds.rice).toBe(0);
    expect(again.xp).toBe(planted.xp);
  });
});

describe('check-in', () => {
  it('matures the planted crop, adds an eaten stamp, XP and unlocks the next region', () => {
    const planted = gameReducer(chosen('com-tam'), { type: 'PLANT_MEAL_SEED', now: NOON + 10 });
    const at = NOON + HOUR_MS;
    const s = gameReducer(planted, {
      type: 'CHECK_IN',
      outcome: 'ate',
      rating: 5,
      again: 'yes',
      now: at,
    });
    const plot = s.plots.find((p) => p.id === s.meal?.plotId)!;
    expect(plotStage(plot, at)).toBe('ready');
    expect(s.stamps.eaten).toContain('com-tam');
    expect(s.xp).toBeGreaterThan(planted.xp);
    expect(s.missions.done).toContain('checkin');
    expect(s.unlockedRegions).toContain('central');
    expect(s.recentUnlock).toBe('central');
    expect(s.history[0]?.outcome).toBe('ate');
  });

  it('pays out only once per meal slot', () => {
    const s1 = gameReducer(chosen('com-tam'), {
      type: 'CHECK_IN',
      outcome: 'ate',
      rating: 4,
      again: 'yes',
      now: NOON + 100,
    });
    const s2 = gameReducer(s1, {
      type: 'CHECK_IN',
      outcome: 'ate',
      rating: 4,
      again: 'yes',
      now: NOON + 200,
    });
    expect(s2).toBe(s1);
  });

  it('records a skipped meal without penalty and hides a dish the guest rejects', () => {
    const skipped = gameReducer(chosen('com-tam'), {
      type: 'CHECK_IN',
      outcome: 'skipped',
      rating: null,
      again: null,
      now: NOON + 100,
    });
    expect(skipped.stamps.eaten).toHaveLength(0);
    expect(skipped.xp).toBeGreaterThan(chosen('com-tam').xp);

    const rejected = gameReducer(chosen('bun-rieu'), {
      type: 'CHECK_IN',
      outcome: 'ate',
      rating: 2,
      again: 'no',
      now: NOON + 100,
    });
    expect(rejected.hiddenDishIds).toContain('bun-rieu');
  });
});

describe('harvest and cook', () => {
  it('harvests ready plots into ingredients, never below zero, then cooks', () => {
    let s = createInitialProgress(NOON);
    s = gameReducer(s, { type: 'HARVEST_ALL', now: NOON });
    expect(s.ingredients.herbs).toBe(1);
    expect(s.plots[0]?.crop).toBeNull();
    expect(gameReducer(s, { type: 'HARVEST_ALL', now: NOON })).toBe(s);

    s = { ...s, ingredients: { ...s.ingredients, rice: 1, scallion: 1 } };
    const cooked = gameReducer(s, { type: 'COOK', recipeId: 'com-tam', now: NOON + 1 });
    expect(cooked.cooked['com-tam']).toBe(1);
    expect(cooked.ingredients.rice).toBe(0);
    expect(gameReducer(cooked, { type: 'COOK', recipeId: 'com-tam', now: NOON + 2 })).toBe(cooked);
  });
});

describe('soft streak', () => {
  it('uses a rest pass or steps back one milestone instead of resetting', () => {
    const today = dateKey(NOON);
    const threeDaysAgo = dateKey(NOON - 3 * 24 * HOUR_MS);
    const twoDaysAgo = dateKey(NOON - 2 * 24 * HOUR_MS);
    expect(touchStreak({ count: 4, lastActiveDate: twoDaysAgo, restPasses: 1 }, NOON)).toEqual({
      count: 5,
      lastActiveDate: today,
      restPasses: 0,
    });
    expect(touchStreak({ count: 6, lastActiveDate: threeDaysAgo, restPasses: 0 }, NOON).count).toBe(
      6,
    );
    expect(
      touchStreak({ count: 6, lastActiveDate: threeDaysAgo, restPasses: 0 }, NOON).count,
    ).toBeGreaterThan(1);
  });

  it('keeps dish metadata consistent for the seed reward', () => {
    expect(getDish('com-tam')?.seed).toBe('rice');
  });
});
