import { describe, expect, it } from 'vitest';
import { FISHING, MARKET, XP, produceName } from '../data/game';
import { nextStep } from './nextStep';
import { STORAGE_KEY, SCHEMA_VERSION, loadProgress } from './persistence';
import { EMPTY_PRODUCE, createInitialProgress, type GuestProgress } from './progress';
import { gameReducer } from './reducer';
import { biteDelay, catchFor, fishingLeft, recipeProgress } from './selectors';
import { HOUR_MS } from './time';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

const fresh = (): GuestProgress => createInitialProgress(NOON);
/** Reported just after the fish bites, as the garden does. */
const cast = (s: GuestProgress, castAt: number, now = castAt + biteDelay(castAt) + 100) =>
  gameReducer(s, { type: 'CATCH', castAt, now });

describe('pond', () => {
  it('lands the catch decided by the cast time, with XP, and uses one catch', () => {
    const s = cast(fresh(), NOON);
    const kind = catchFor(NOON);
    expect(s.ingredients[kind]).toBe(1);
    expect(s.xp).toBe(fresh().xp + XP.catch);
    expect(fishingLeft(s, NOON)).toBe(FISHING.perDay - 1);
    expect(s.ledger.at(-2)?.reason).toContain(produceName(kind));
  });

  it('ignores the same cast reported twice', () => {
    const once = cast(fresh(), NOON);
    expect(cast(once, NOON)).toBe(once);
  });

  it('ignores a catch reported before the fish bites', () => {
    const s = fresh();
    expect(cast(s, NOON, NOON)).toBe(s);
    expect(cast(s, NOON, NOON + biteDelay(NOON) - 1000)).toBe(s);
  });

  it('rejects stale or future casts', () => {
    const s = fresh();
    expect(cast(s, NOON, NOON + FISHING.maxCastMs + 1)).toBe(s);
    expect(cast(s, NOON, NOON - 1)).toBe(s);
  });

  it('stops after the daily catches and refills at local midnight', () => {
    let s = fresh();
    for (let i = 0; i < FISHING.perDay; i++) s = cast(s, NOON + i * 10_000);
    expect(fishingLeft(s, NOON + HOUR_MS)).toBe(0);
    expect(cast(s, NOON + HOUR_MS)).toBe(s);
    const tomorrow = NOON + 24 * HOUR_MS;
    expect(fishingLeft(s, tomorrow)).toBe(FISHING.perDay);
    expect(cast(s, tomorrow).fishing.used).toBe(1);
  });

  it('mixes fish and shrimp, with bite delays inside the configured range', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 200; i++) {
      kinds.add(catchFor(NOON + i * 7919));
      const d = biteDelay(NOON + i * 7919);
      expect(d).toBeGreaterThanOrEqual(FISHING.biteMinMs);
      expect(d).toBeLessThanOrEqual(FISHING.biteMaxMs);
    }
    expect(kinds).toEqual(new Set(['fish', 'shrimp']));
  });

  it('feeds recipes and the market like any pantry item', () => {
    const s = {
      ...fresh(),
      ingredients: { ...EMPTY_PRODUCE, fish: 1, tomato: 2, herbs: 2 },
    };
    expect(recipeProgress(s, 'canh-chua-ca').canCook).toBe(true);
    const sold = gameReducer(s, { type: 'SELL', crop: 'fish', now: NOON });
    expect(sold.coins).toBe(MARKET.sell('fish'));
    expect(sold.ingredients.fish).toBe(0);
  });

  it('suggests the pond when the closest recipe misses a catch', () => {
    const s = {
      ...fresh(),
      plots: fresh().plots.map((p) => ({ ...p, crop: null, plantedAt: null, readyAt: null })),
      seeds: { ...fresh().seeds, rice: 0, herbs: 0, scallion: 0 },
      ingredients: { ...EMPTY_PRODUCE, tomato: 1, herbs: 1 },
    };
    const step = nextStep(s, NOON);
    expect(step).toMatchObject({ kind: 'fish', catch: 'fish', recipe: 'canh-chua-ca' });
  });

  it('backfills the pond for saves made before it existed', () => {
    const old = fresh() as Partial<GuestProgress>;
    delete old.fishing;
    const ingredients = { ...old.ingredients } as Record<string, number>;
    delete ingredients.fish;
    delete ingredients.shrimp;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, savedAt: NOON, data: { ...old, ingredients } }),
    );
    const r = loadProgress(NOON);
    expect(r.status).toBe('restored');
    const loaded = r.progress;
    expect(loaded.fishing.used).toBe(0);
    expect(loaded.ingredients.fish).toBe(0);
    expect(loaded.ingredients.shrimp).toBe(0);
  });
});
