import { describe, expect, it } from 'vitest';
import { CROPS, levelForXp } from '../data/game';
import type { CropId } from '../data/types';
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  fitToLevel,
  loadProgress,
  parseProgress,
  saveProgress,
} from './persistence';
import { createInitialProgress } from './progress';
import { gameReducer } from './reducer';
import { dateKey } from './time';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

describe('guest progress persistence', () => {
  it('starts fresh when nothing is stored', () => {
    expect(loadProgress(NOON).status).toBe('fresh');
  });

  it('round-trips progress through localStorage', () => {
    let s = createInitialProgress(NOON);
    s = gameReducer(s, { type: 'CHOOSE_DISH', dishId: 'pho-bo', now: NOON });
    s = gameReducer(s, { type: 'PLANT_MEAL_SEED', now: NOON + 1 });
    expect(saveProgress(s, NOON)).toBe(true);

    const loaded = loadProgress(NOON + 60_000);
    expect(loaded.status).toBe('restored');
    expect(loaded.progress.meal?.dishId).toBe('pho-bo');
    expect(loaded.progress.meal?.planted).toBe(true);
    expect(loaded.progress.plots).toEqual(s.plots);
    expect(loaded.progress.ledger).toEqual(s.ledger);
  });

  it('recovers safely from corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const r = loadProgress(NOON);
    expect(r.status).toBe('recovered');
    expect(r.progress.plots).toHaveLength(4);
  });

  it('recovers from a structurally invalid snapshot', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, savedAt: NOON, data: { seeds: { rice: -4 } } }),
    );
    expect(loadProgress(NOON).status).toBe('recovered');
  });

  it('does not reuse data from an unknown schema version', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, savedAt: NOON, data: createInitialProgress(NOON) }),
    );
    const r = loadProgress(NOON);
    expect(r.status).toBe('recovered');
  });

  it('restores saves made before watering existed, with dry soil and a full can', () => {
    const old = createInitialProgress(NOON) as unknown as Record<string, unknown>;
    delete old.water;
    for (const plot of old.plots as Record<string, unknown>[]) delete plot.wateredAt;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, savedAt: NOON, data: old }),
    );
    const r = loadProgress(NOON);
    expect(r.status).toBe('restored');
    expect(r.progress.plots.every((p) => p.wateredAt === null)).toBe(true);
    expect(r.progress.water).toEqual({ date: dateKey(NOON), used: 0, bonus: 0 });
  });
});

describe('levels on a curve', () => {
  it('gives back the plots and crops a save grown at the old pace no longer reaches', () => {
    const now = Date.now();
    const base = createInitialProgress(now);
    const plots = Array.from({ length: 10 }, (_, i) => ({ ...base.plots[0]!, id: i + 1 }));
    const crops = Object.keys(CROPS).filter((c) => CROPS[c as CropId].unlock) as CropId[];
    // 1512 XP was level 16 at a flat 100 XP; on the curve it is level 9.
    const old = { ...base, xp: 1512, plots, unlockedCrops: crops };
    const p = parseProgress(JSON.parse(JSON.stringify(old)), now)!;
    expect(levelForXp(1512)).toBe(9);
    expect(p.plots.map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(p.unlockedCrops.every((c) => (CROPS[c].unlock?.level ?? 1) <= 9)).toBe(true);
    expect(p.unlockedCrops).toContain('lime');
    expect(p.unlockedCrops).not.toContain('mango');
    expect(fitToLevel(p)).toBe(p);
  });
});
