import { describe, expect, it } from 'vitest';
import {
  BOAT,
  CATCHES,
  CROPS,
  HIVE,
  MARKET,
  PRODUCE_IDS,
  produceName,
  sellPrice,
} from '../data/game';
import type { CropId } from '../data/types';
import { STORAGE_KEY, loadProgress, parseProgress } from './persistence';
import { createInitialProgress, type GuestProgress } from './progress';
import { gameReducer } from './reducer';
import { boatCatch, boatStage, catchFor, hiveStage, plotStage } from './selectors';
import { HOUR_MS } from './time';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

/** A guest at `lv` with every crop open and plot 1 holding `crop`, ripe now. */
function withRipe(crop: CropId, lv = 15): GuestProgress {
  const s = createInitialProgress(NOON);
  return {
    ...s,
    xp: (lv - 1) * 100,
    unlockedCrops: Object.keys(CROPS) as CropId[],
    plots: s.plots.map((p) =>
      p.id === 1
        ? { ...p, crop, plantedAt: NOON - 10 * HOUR_MS, readyAt: NOON - 1, wateredAt: null }
        : { ...p, crop: null, plantedAt: null, readyAt: null },
    ),
  };
}

describe('the item catalogue', () => {
  it('names and prices every pantry item, and keeps the first ten crops as they were', () => {
    for (const id of PRODUCE_IDS) {
      expect(produceName(id).length).toBeGreaterThan(0);
      expect(sellPrice(id)).toBeGreaterThan(0);
    }
    expect(MARKET.seed('rice')).toBe(6);
    expect(MARKET.seed('lemongrass')).toBe(10);
    expect(MARKET.sell('rice')).toBe(2);
    expect(CROPS.rice.growHours).toBe(5);
    expect(CROPS.tomato.growHours).toBe(5);
  });

  it('opens new crops by level, never all at once', () => {
    const lv1 = (Object.keys(CROPS) as CropId[]).filter((c) => !CROPS[c].unlock);
    expect(lv1).toEqual(['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato']);
    const levels = new Set(Object.values(CROPS).map((c) => c.unlock?.level ?? 1));
    expect(levels.size).toBeGreaterThan(8);
  });

  it('follows its balance rules (trees and mushrooms repay their sapling or block)', () => {
    for (const c of Object.values(CROPS)) {
      if (!c.price) continue;
      if (c.kind === 'veg') expect(c.price.seed).toBe(c.price.sell * 3);
      if (c.kind === 'tree') {
        expect(c.regrowHours).toBeLessThan(c.growHours);
        // Paid back within ten harvests.
        expect(c.price.sell * c.yield * 10).toBeGreaterThanOrEqual(c.price.seed);
      }
      if (c.kind === 'mushroom') expect(c.flushes).toBe(3);
    }
  });
});

describe('perennial crops', () => {
  it('a tree stays after its harvest and fruits again (not a sprout again)', () => {
    let s = withRipe('mango');
    s = gameReducer(s, { type: 'HARVEST_ALL', now: NOON });
    const plot = s.plots[0]!;
    expect(s.ingredients.mango).toBe(CROPS.mango.yield);
    expect(plot.crop).toBe('mango');
    expect(plot.harvests).toBe(1);
    expect(plotStage(plot, NOON + 1)).toBe('flowering');
    expect(plot.readyAt).toBe(NOON + CROPS.mango.regrowHours! * HOUR_MS);
    // A second tap at the same moment pays nothing more.
    expect(gameReducer(s, { type: 'HARVEST_ALL', now: NOON })).toBe(s);
    // Next cycle: a new harvest with its own ledger key.
    const later = NOON + CROPS.mango.regrowHours! * HOUR_MS;
    s = gameReducer(s, { type: 'HARVEST_ALL', now: later });
    expect(s.ingredients.mango).toBe(CROPS.mango.yield * 2);
    expect(s.plots[0]!.crop).toBe('mango');
  });

  it('a mushroom block gives its flushes, then the plot is free', () => {
    let s = withRipe('oyster');
    let now = NOON;
    for (let i = 0; i < CROPS.oyster.flushes!; i++) {
      s = gameReducer(s, { type: 'HARVEST_ALL', now });
      now += CROPS.oyster.regrowHours! * HOUR_MS;
    }
    expect(s.ingredients.oyster).toBe(CROPS.oyster.yield * CROPS.oyster.flushes!);
    expect(s.plots[0]!.crop).toBeNull();
  });

  it('a vegetable is harvested once and the plot is free', () => {
    const s = gameReducer(withRipe('pumpkin'), { type: 'HARVEST_ALL', now: NOON });
    expect(s.ingredients.pumpkin).toBe(3);
    expect(s.plots[0]!.crop).toBeNull();
  });

  it('a tree can be taken out to free its plot', () => {
    const s = gameReducer(withRipe('durian'), { type: 'CLEAR_PLOT', plotId: 1 });
    expect(s.plots[0]!.crop).toBeNull();
    expect(s.ingredients.durian).toBe(0);
  });
});

describe('beehive and boat', () => {
  it('the hive opens at its level, fills, and is emptied once per fill', () => {
    const lv5 = { ...createInitialProgress(NOON), xp: 400 };
    expect(hiveStage(lv5, NOON)).toBe('locked');
    expect(gameReducer(lv5, { type: 'START_HIVE', now: NOON })).toBe(lv5);
    let s = { ...lv5, xp: (HIVE.unlockLevel - 1) * 100 };
    s = gameReducer(s, { type: 'START_HIVE', now: NOON });
    expect(hiveStage(s, NOON + HOUR_MS)).toBe('filling-1');
    expect(gameReducer(s, { type: 'COLLECT_HIVE', now: NOON + HOUR_MS })).toBe(s);
    const full = NOON + HIVE.hours * HOUR_MS;
    s = gameReducer(s, { type: 'COLLECT_HIVE', now: full });
    expect(s.ingredients.honey).toBe(HIVE.yield.honey);
    expect(s.ingredients.honeycomb).toBe(HIVE.yield.honeycomb);
    expect(hiveStage(s, full)).toBe('filling-1');
    expect(gameReducer(s, { type: 'COLLECT_HIVE', now: full })).toBe(s);
  });

  it('the boat brings back the same catch however often it is unloaded', () => {
    let s = { ...createInitialProgress(NOON), xp: (BOAT.unlockLevel - 1) * 100 };
    s = gameReducer(s, { type: 'SEND_BOAT', now: NOON });
    expect(boatStage(s, NOON + 1)).toBe('away');
    expect(gameReducer(s, { type: 'SEND_BOAT', now: NOON + 2 })).toBe(s);
    const back = NOON + BOAT.hours * HOUR_MS;
    const expected = boatCatch(NOON, BOAT.unlockLevel);
    s = gameReducer(s, { type: 'COLLECT_BOAT', now: back });
    for (const c of new Set(expected))
      expect(s.ingredients[c]).toBe(expected.filter((x) => x === c).length);
    expect(boatStage(s, back)).toBe('docked');
    expect(gameReducer(s, { type: 'COLLECT_BOAT', now: back })).toBe(s);
  });

  it('the pond keeps fish and shrimp at level 1 and opens carp and crab later', () => {
    const early = new Set(Array.from({ length: 400 }, (_, i) => catchFor(NOON + i * 7919, 1)));
    expect(early).toEqual(new Set(['fish', 'shrimp']));
    const late = new Set(Array.from({ length: 400 }, (_, i) => catchFor(NOON + i * 7919, 10)));
    expect(late).toEqual(new Set(['fish', 'shrimp', 'carp', 'crab']));
    for (const c of late) expect(CATCHES[c].source).toBe('pond');
  });
});

describe('saves from before the item pack', () => {
  it('a version-1 save loads with its pantry, coins and growing plots intact', () => {
    const old = createInitialProgress(NOON) as unknown as Record<string, unknown>;
    // What a v1 save looked like: only the first ten crops, no hive or boat.
    const seeds = {
      rice: 2,
      herbs: 0,
      chili: 1,
      scallion: 0,
      bean: 0,
      tomato: 0,
      lemongrass: 0,
      garlic: 0,
      cucumber: 0,
      lime: 1,
    };
    const ingredients = { ...seeds, egg: 3, milk: 1, fish: 2, shrimp: 0 };
    delete old.hive;
    delete old.boat;
    const v1 = { ...old, seeds, ingredients, coins: 42, quests: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, savedAt: NOON, data: v1 }));
    const r = loadProgress(NOON);
    expect(r.status).toBe('restored');
    expect(r.progress.coins).toBe(42);
    expect(r.progress.seeds.rice).toBe(2);
    expect(r.progress.seeds.lime).toBe(1);
    expect(r.progress.ingredients.egg).toBe(3);
    expect(r.progress.ingredients.honey).toBe(0);
    expect(r.progress.seeds.mango).toBe(0);
    expect(r.progress.plots[0]!.crop).toBe('herbs');
    expect(r.progress.hive).toEqual({ startedAt: null, readyAt: null });
    expect(r.progress.boat).toEqual({ sentAt: null, returnAt: null });
  });

  it('round-trips trees, hive and boat', () => {
    let s = withRipe('banana');
    s = gameReducer(s, { type: 'HARVEST_ALL', now: NOON });
    s = gameReducer(s, { type: 'START_HIVE', now: NOON });
    s = gameReducer(s, { type: 'SEND_BOAT', now: NOON });
    const p = parseProgress(JSON.parse(JSON.stringify(s)), NOON)!;
    expect(p.plots[0]).toMatchObject({ crop: 'banana', harvests: 1 });
    expect(p.hive).toEqual(s.hive);
    expect(p.boat).toEqual(s.boat);
  });
});
