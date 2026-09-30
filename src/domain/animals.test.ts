import { describe, expect, it } from 'vitest';
import { EMPTY_PRODUCE, createInitialProgress, type GuestProgress } from './progress';
import { gameReducer } from './reducer';
import { animalStage } from './selectors';
import { HOUR_MS } from './time';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

function level(n: number): GuestProgress {
  const s = createInitialProgress(NOON);
  return { ...s, xp: (n - 1) * 100, ingredients: { ...EMPTY_PRODUCE, rice: 2, herbs: 1 } };
}

describe('animals', () => {
  it('stay locked until their level, and never run without being fed', () => {
    expect(animalStage(level(1), 'chicken', NOON)).toBe('locked');
    expect(animalStage(level(2), 'chicken', NOON)).toBe('hungry');
    expect(animalStage(level(3), 'cow', NOON)).toBe('locked');
    const s = level(1);
    expect(gameReducer(s, { type: 'FEED_ANIMAL', animal: 'chicken', now: NOON })).toBe(s);
  });

  it('eat from the pantry, produce on a timer, and pay out once per feeding', () => {
    const s0 = level(2);
    const fed = gameReducer(s0, { type: 'FEED_ANIMAL', animal: 'chicken', now: NOON });
    expect(fed.ingredients.rice).toBe(1);
    expect(animalStage(fed, 'chicken', NOON + HOUR_MS)).toBe('busy');
    expect(
      gameReducer(fed, { type: 'COLLECT_ANIMAL', animal: 'chicken', now: NOON + HOUR_MS }),
    ).toBe(fed);
    const later = NOON + 3 * HOUR_MS;
    expect(animalStage(fed, 'chicken', later)).toBe('ready');
    const got = gameReducer(fed, { type: 'COLLECT_ANIMAL', animal: 'chicken', now: later });
    expect(got.ingredients.egg).toBe(2);
    expect(got.xp).toBeGreaterThan(fed.xp);
    expect(animalStage(got, 'chicken', later)).toBe('hungry');
    expect(gameReducer(got, { type: 'COLLECT_ANIMAL', animal: 'chicken', now: later + 1 })).toBe(
      got,
    );
  });

  it('need their feed in the pantry', () => {
    const s = { ...level(4), ingredients: { ...EMPTY_PRODUCE } };
    expect(gameReducer(s, { type: 'FEED_ANIMAL', animal: 'cow', now: NOON })).toBe(s);
  });
});

describe('garden layout', () => {
  it('places owned decorations on free cells only, and can store them', () => {
    const s = {
      ...createInitialProgress(NOON),
      decor: ['jar', 'lantern'] as GuestProgress['decor'],
    };
    const a = gameReducer(s, { type: 'PLACE_DECOR', decor: 'jar', x: 2, z: -1, rot: 5 });
    expect(a.decorLayout.jar).toEqual({ x: 2, z: -1, rot: 1 });
    expect(gameReducer(a, { type: 'PLACE_DECOR', decor: 'lantern', x: 2, z: -1, rot: 0 })).toBe(a);
    expect(gameReducer(a, { type: 'PLACE_DECOR', decor: 'fence', x: 0, z: 0, rot: 0 })).toBe(a);
    expect(gameReducer(a, { type: 'STORE_DECOR', decor: 'jar' }).decorLayout.jar).toBeNull();
  });
});

describe('friend events', () => {
  it('apply a friend watering and a gift exactly once', () => {
    const s = createInitialProgress(NOON); // plot 2: scallion, ready in 2h
    const w = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'e1', type: 'water', plotId: 2, from: 'Vườn Mai' },
      now: NOON,
    });
    expect(w.plots[1]!.readyAt).toBe(NOON + 1.5 * HOUR_MS);
    expect(w.water).toEqual(s.water);
    expect(
      gameReducer(w, {
        type: 'FRIEND_EVENT',
        event: { id: 'e1', type: 'water', plotId: 2 },
        now: NOON + 1,
      }),
    ).toBe(w);
    const g = gameReducer(w, {
      type: 'FRIEND_EVENT',
      event: { id: 'e2', type: 'gift', crop: 'chili' },
      now: NOON,
    });
    expect(g.seeds.chili).toBe(s.seeds.chili + 1);
  });

  it('keeps event ids apart (e1 is not e10) and skips a replanted plot', () => {
    const s = createInitialProgress(NOON);
    const a = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'e10', type: 'gift', crop: 'rice' },
      now: NOON,
    });
    const b = gameReducer(a, {
      type: 'FRIEND_EVENT',
      event: { id: 'e1', type: 'gift', crop: 'rice' },
      now: NOON,
    });
    expect(b.seeds.rice).toBe(s.seeds.rice + 2);
    // The friend saw rice in plot 2; it's scallion now — the speed-up must not apply.
    const c = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'e3', type: 'water', plotId: 2, crop: 'rice' },
      now: NOON,
    });
    expect(c.plots[1]!.readyAt).toBe(s.plots[1]!.readyAt);
  });
});
