import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, SCHEMA_VERSION, loadProgress, saveProgress } from './persistence';
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
    expect(r.progress.plots).toHaveLength(6);
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
