import { describe, expect, it } from 'vitest';
import { getReelGameDish } from '../features/food-reel/data/reelCatalogue';
import { dishIdsForSeed, nextStep } from './nextStep';
import { EMPTY_PRODUCE, createInitialProgress, type GuestProgress, EMPTY_CROPS } from './progress';
import { HOUR_MS } from './time';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

/** A garden with every plot empty and nothing in the tray or pantry. */
function bare(): GuestProgress {
  const s = createInitialProgress(NOON);
  return {
    ...s,
    plots: s.plots.map((p) => ({ ...p, crop: null, plantedAt: null, readyAt: null })),
  };
}

describe('nextStep', () => {
  it('cooks first when a recipe is complete', () => {
    const s = { ...bare(), ingredients: { ...EMPTY_PRODUCE, pork: 2, rice: 2, scallion: 2 } };
    expect(nextStep(s, NOON)).toEqual({ kind: 'cook', recipe: 'com-tam' });
  });

  it('harvests ready plots before anything else can be planned', () => {
    // A new guest starts with the herb plot ready.
    expect(nextStep(createInitialProgress(NOON), NOON)).toEqual({ kind: 'harvest', count: 1 });
  });

  it('plants a tray seed the closest recipe needs, into the first empty plot', () => {
    const s = {
      ...bare(),
      ingredients: { ...EMPTY_PRODUCE, pork: 2, rice: 2 },
      seeds: { ...EMPTY_CROPS, chili: 1, scallion: 1 },
    };
    expect(nextStep(s, NOON)).toEqual({ kind: 'plant', crop: 'scallion', plotId: 1 });
  });

  it('points to dishes that grant the missing seed when the tray is empty', () => {
    const s = { ...bare(), ingredients: { ...EMPTY_PRODUCE, pork: 2, rice: 2 } };
    const step = nextStep(s, NOON);
    expect(step).toEqual({ kind: 'find', crop: 'scallion', recipe: 'com-tam' });
    const ids = dishIdsForSeed('scallion');
    expect(ids.length).toBeGreaterThan(1);
    for (const id of ids) expect(getReelGameDish(id)?.seed).toBe('scallion');
  });

  it('waits when every plot is busy growing', () => {
    const s0 = bare();
    const s = {
      ...s0,
      // Today's casts are spent, so the pond has nothing to offer either.
      fishing: { date: s0.fishing.date, used: 5 },
      plots: s0.plots.map((p, i) => ({
        ...p,
        crop: 'bean' as const,
        plantedAt: NOON,
        readyAt: NOON + (i + 2) * HOUR_MS,
      })),
    };
    const step = nextStep(s, NOON);
    expect(step.kind).toBe('wait');
    expect(step.kind === 'wait' && step.readyAt).toBe(NOON + 2 * HOUR_MS);
  });
});
