import { describe, expect, it } from 'vitest';
import { getDish } from '../data/dishes';
import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import {
  CROPS,
  LAND_PRICES,
  xpForLevel,
  COLLECTIONS,
  collectionReward,
  ANIMALS,
  UPGRADES,
} from '../data/game';
import { createInitialProgress } from './progress';
import { dailyQuests } from './quests';
import { gameReducer, touchStreak } from './reducer';
import {
  isWet,
  plotStage,
  recipeProgress,
  regionProgress,
  waterBlock,
  waterLeft,
  animalYield,
} from './selectors';
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
    expect(dailyQuests(s, NOON)[0]).toMatchObject({ def: { id: 'd-choose' }, status: 'ready' });
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
    // A southern dish from the live catalogue whose seed goes into the com-tam recipe
    // (picked by content, since catalogue ids are editable).
    const dish = reelGameDishes().find(
      (d) => d.region === 'south' && ['rice', 'scallion'].includes(d.seed),
    )!;
    const s1 = chosen(dish.id);
    const before = recipeProgress(s1, 'com-tam').secured;
    const s2 = gameReducer(s1, { type: 'PLANT_MEAL_SEED', now: NOON + 5000 });
    expect(recipeProgress(s2, 'com-tam').secured).toBeGreaterThan(before);
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
    expect(s.quests.day.checkin).toBe(1);
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
    expect(s.ingredients.herbs).toBe(CROPS.herbs.yield);
    expect(s.plots[0]?.crop).toBeNull();
    expect(gameReducer(s, { type: 'HARVEST_ALL', now: NOON })).toBe(s);

    s = { ...s, ingredients: { ...s.ingredients, pork: 2, rice: 2, scallion: 1 } };
    const cooked = gameReducer(s, { type: 'COOK', recipeId: 'com-tam', now: NOON + 1 });
    expect(cooked.cooked['com-tam']).toBe(1);
    expect(cooked.ingredients.rice).toBe(0);
    expect(gameReducer(cooked, { type: 'COOK', recipeId: 'com-tam', now: NOON + 2 })).toBe(cooked);
  });

  it('picks only the tapped ripe plot, once', () => {
    const start = createInitialProgress(NOON);
    const ripe = start.plots[0]!;
    // Two ripe plots of herbs: plot 1 and a copy on plot 2.
    const s = {
      ...start,
      plots: start.plots.map((p) => (p.id === 2 ? { ...ripe, id: 2 } : p)),
    };
    const picked = gameReducer(s, { type: 'HARVEST_PLOT', plotId: 2, now: NOON });
    expect(picked.ingredients.herbs).toBe(CROPS.herbs.yield);
    expect(picked.plots.find((p) => p.id === 2)?.crop).toBeNull();
    expect(picked.plots.find((p) => p.id === 1)?.crop).toBe(ripe.crop);
    expect(gameReducer(picked, { type: 'HARVEST_PLOT', plotId: 2, now: NOON })).toBe(picked);
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

describe('watering', () => {
  // Plot 2 of a new guest is a scallion sprouting: planted 1h ago, ready in 2h.
  const fresh = () => createInitialProgress(NOON);

  it('shortens a quarter of the remaining time and uses one can', () => {
    const s0 = fresh();
    const s1 = gameReducer(s0, { type: 'WATER', plotId: 2, now: NOON });
    const plot = s1.plots[1]!;
    expect(plot.readyAt).toBe(NOON + 1.5 * HOUR_MS);
    expect(plot.wateredAt).toBe(NOON);
    expect(isWet(plot, NOON + 10)).toBe(true);
    expect(waterLeft(s1, NOON)).toBe(waterLeft(s0, NOON) - 1);
  });

  it('waits an hour between waterings of the same plot', () => {
    const s1 = gameReducer(fresh(), { type: 'WATER', plotId: 2, now: NOON });
    expect(waterBlock(s1, s1.plots[1]!, NOON + 60_000)).toBe('wet');
    expect(gameReducer(s1, { type: 'WATER', plotId: 2, now: NOON + 60_000 })).toBe(s1);
    const s2 = gameReducer(s1, { type: 'WATER', plotId: 2, now: NOON + HOUR_MS });
    expect(s2.plots[1]!.readyAt).toBeLessThan(s1.plots[1]!.readyAt!);
  });

  it('ignores empty and ready plots', () => {
    const s = fresh();
    expect(gameReducer(s, { type: 'WATER', plotId: 1, now: NOON })).toBe(s); // ready herbs
    expect(gameReducer(s, { type: 'WATER', plotId: 3, now: NOON })).toBe(s); // empty
  });

  it('runs dry after three cans, refills the next day, and a check-in adds one', () => {
    let s = fresh();
    s = {
      ...s,
      plots: s.plots.map((p) => ({
        ...p,
        crop: 'bean',
        plantedAt: NOON,
        readyAt: NOON + 4 * HOUR_MS,
      })),
    };
    for (const id of [1, 2, 3]) s = gameReducer(s, { type: 'WATER', plotId: id, now: NOON });
    expect(waterLeft(s, NOON)).toBe(0);
    expect(waterBlock(s, s.plots[3]!, NOON)).toBe('empty-can');
    expect(gameReducer(s, { type: 'WATER', plotId: 4, now: NOON })).toBe(s);

    const ate = gameReducer(gameReducer(s, { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON }), {
      type: 'CHECK_IN',
      outcome: 'ate',
      rating: 5,
      again: 'yes',
      now: NOON + 1,
    });
    expect(waterLeft(ate, NOON + 1)).toBe(1);

    const tomorrow = NOON + 24 * HOUR_MS;
    expect(waterLeft(s, tomorrow)).toBe(3);
  });

  it('marks the meal plot wet when the check-in rain ripens it', () => {
    const planted = gameReducer(chosen('com-tam'), { type: 'PLANT_MEAL_SEED', now: NOON + 10 });
    const s = gameReducer(planted, {
      type: 'CHECK_IN',
      outcome: 'ate',
      rating: 5,
      again: 'yes',
      now: NOON + 20,
    });
    expect(s.plots.find((p) => p.id === s.meal?.plotId)?.wateredAt).toBe(NOON + 20);
  });
});

describe('levelling up', () => {
  it('opens a new crop with a gift seed, and more plots, exactly once', () => {
    // Crops open at their level: lemongrass and the level-2 crops of the item pack.
    const openAt = (lv: number) =>
      (Object.keys(CROPS) as (keyof typeof CROPS)[]).filter(
        (c) => CROPS[c].unlock && CROPS[c].unlock!.level <= lv,
      );
    // 95 XP + a 10 XP choice crosses into level 2.
    const s0 = { ...createInitialProgress(NOON), xp: 95 };
    const s1 = gameReducer(s0, { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON });
    expect(s1.unlockedCrops).toEqual(openAt(2));
    expect(s1.unlockedCrops).toContain('lemongrass');
    expect(s1.seeds.lemongrass).toBe(1);
    expect(s1.recentCropUnlock).toBe(openAt(2).at(-1));
    // Plots are not given with the level any more: they are cleared for xu.
    expect(s1.plots).toHaveLength(4);
    const s2 = gameReducer(s1, { type: 'PLANT_MEAL_SEED', now: NOON + 1 });
    expect(s2.seeds.lemongrass).toBe(1);

    // Level 3 adds garlic (and the other level-3 crops).
    const s3 = gameReducer(
      { ...s2, xp: xpForLevel(3) },
      { type: 'WATER', plotId: 2, now: NOON + 2 },
    );
    expect([...s3.unlockedCrops].sort()).toEqual(openAt(3).sort());
    expect(s3.unlockedCrops).toContain('garlic');
    expect(s3.plots).toHaveLength(4);
  });

  it('clears the next plot for its price once its level is reached, in order', () => {
    const poor = { ...createInitialProgress(NOON), xp: xpForLevel(3), coins: LAND_PRICES[0] - 1 };
    expect(gameReducer(poor, { type: 'BUY_LAND', now: NOON })).toBe(poor);
    const low = { ...poor, xp: xpForLevel(2) - 1, coins: 1000 };
    expect(gameReducer(low, { type: 'BUY_LAND', now: NOON })).toBe(low);
    let s = { ...poor, coins: LAND_PRICES[0] + LAND_PRICES[1] + 5 };
    s = gameReducer(s, { type: 'BUY_LAND', now: NOON });
    expect(s.plots).toHaveLength(5);
    expect(s.plots[4]).toMatchObject({ id: 5, crop: null });
    s = gameReducer(s, { type: 'BUY_LAND', now: NOON + 1 });
    expect(s.plots).toHaveLength(6);
    expect(s.coins).toBe(5);
    // Plot 7 needs level 5.
    expect(
      gameReducer({ ...s, coins: 999 }, { type: 'BUY_LAND', now: NOON + 2 }).plots,
    ).toHaveLength(6);
  });
});

describe('the market', () => {
  it('sells produce for xu and buys seeds and decorations, never going negative', () => {
    const s0 = {
      ...createInitialProgress(NOON),
      ingredients: { ...createInitialProgress(NOON).ingredients, herbs: 6 },
    };
    let s = s0;
    for (let i = 0; i < 6; i++) s = gameReducer(s, { type: 'SELL', crop: 'herbs', now: NOON + i });
    expect(s.ingredients.herbs).toBe(0);
    expect(s.coins).toBe(12);
    expect(gameReducer(s, { type: 'SELL', crop: 'herbs', now: NOON + 9 })).toBe(s);

    s = gameReducer(s, { type: 'BUY_SEED', crop: 'chili', now: NOON + 10 });
    expect(s.seeds.chili).toBe(1);
    expect(s.coins).toBe(6);
    // Locked crops cannot be bought; decorations cost more than we have.
    expect(gameReducer(s, { type: 'BUY_SEED', crop: 'lime', now: NOON + 11 })).toBe(s);
    expect(gameReducer(s, { type: 'BUY_DECOR', decor: 'jar', now: NOON + 12 })).toBe(s);

    const rich = { ...s, coins: 60 };
    const decorated = gameReducer(rich, { type: 'BUY_DECOR', decor: 'jar', now: NOON + 13 });
    expect(decorated.decor).toEqual(['jar']);
    expect(decorated.coins).toBe(35);
    expect(gameReducer(decorated, { type: 'BUY_DECOR', decor: 'jar', now: NOON + 14 })).toBe(
      decorated,
    );
  });
});

describe('dish collections', () => {
  it('pays a finished set once, and nothing before it is finished', () => {
    const set = COLLECTIONS.find((c) => c.id === 'central')!;
    const start = createInitialProgress(NOON);
    const all = Object.fromEntries(set.recipes.map((id) => [id, 1]));
    const [first, ...rest] = set.recipes;
    const half = { ...start, cooked: Object.fromEntries(rest.map((id) => [id, 1])) };
    expect(gameReducer(half, { type: 'CLAIM_COLLECTION', id: 'central', now: NOON })).toBe(half);
    expect(first).toBeDefined();
    const done = { ...start, cooked: all };
    const s = gameReducer(done, { type: 'CLAIM_COLLECTION', id: 'central', now: NOON });
    const reward = collectionReward(set.recipes.length);
    expect(s.coins).toBe(done.coins + reward.coins);
    expect(s.xp).toBe(done.xp + reward.xp);
    expect(s.collections).toEqual(['central']);
    expect(gameReducer(s, { type: 'CLAIM_COLLECTION', id: 'central', now: NOON + 1 })).toBe(s);
  });
});

describe('farm upgrades', () => {
  it('buys levels in order for their price, and the buildings give more', () => {
    const start = { ...createInitialProgress(NOON), coins: 2000, xp: xpForLevel(5) };
    expect(waterLeft(start, NOON)).toBe(3);
    let s = gameReducer(start, { type: 'BUY_UPGRADE', id: 'well', now: NOON });
    expect(s.upgrades.well).toBe(1);
    expect(s.coins).toBe(2000 - UPGRADES.well.prices[0]!);
    expect(waterLeft(s, NOON)).toBe(4);
    s = gameReducer(s, { type: 'BUY_UPGRADE', id: 'barn', now: NOON + 1 });
    expect(animalYield(s, 'chicken')).toBe(ANIMALS.chicken.yield + 1);
    // The barn's last level, then nothing more to buy.
    s = gameReducer(s, { type: 'BUY_UPGRADE', id: 'barn', now: NOON + 2 });
    expect(gameReducer(s, { type: 'BUY_UPGRADE', id: 'barn', now: NOON + 3 })).toBe(s);
    const poor = { ...s, coins: 0 };
    expect(gameReducer(poor, { type: 'BUY_UPGRADE', id: 'hive', now: NOON + 4 })).toBe(poor);
  });
});
