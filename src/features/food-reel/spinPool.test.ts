import { describe, expect, it } from 'vitest';
import { CATALOGUE_VIEW, createReelView, reelDishes } from './data/reelCatalogue';
import { planSpin } from './engine/spin';
import type { ReelState } from './foodReel.types';
import { foodReelReducer, initialReelState } from './foodReelReducer';
import { fold } from './utils';

const ids = () => reelDishes().map((d) => d.id);

describe('Rổ quay view', () => {
  it('wraps a shortlist like a slot machine, in the given order', () => {
    const [a, b, c] = ids();
    const view = createReelView([a!, b!, c!]);
    expect(view.pooled).toBe(true);
    expect(view.count).toBe(3);
    expect([0, 1, 2, 3, -1].map((i) => view.dishAt(i).id)).toEqual([a, b, c, a, c]);
  });

  it('drops unknown and duplicate ids, and falls back to the catalogue below two dishes', () => {
    const [a, b] = ids();
    expect(createReelView([a!, 'khong-ton-tai', a!, b!]).count).toBe(2);
    expect(createReelView([a!, 'khong-ton-tai'])).toBe(CATALOGUE_VIEW);
    expect(createReelView([])).toBe(CATALOGUE_VIEW);
    expect(createReelView(null)).toBe(CATALOGUE_VIEW);
  });

  it('only ever lands on dishes in the Rổ, from any start position', () => {
    const pool = ids().slice(10, 13);
    const view = createReelView(pool);
    let s: ReelState = foodReelReducer(initialReelState(57), { type: 'ASSETS_READY' }, view);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      s = foodReelReducer(s, { type: 'SPIN', seed: 7000 + i }, view);
      expect(pool).toContain(s.winnerId);
      expect(view.dishAt(s.spin!.target).id).toBe(s.winnerId);
      seen.add(s.winnerId!);
      s = foodReelReducer(s, { type: 'SETTLE', dishId: s.winnerId! }, view);
      s = foodReelReducer(s, { type: 'RESET' }, view);
    }
    // Every dish of a small Rổ gets picked at some point.
    expect(seen.size).toBe(3);
  });

  it('lets a two-dish Rổ land on the dish already in the centre', () => {
    const winners = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      winners.add(planSpin(0, seed, 2, { avoidCurrent: false }).winnerIndex);
      // The full catalogue still never "spins" onto the dish already showing.
      expect(planSpin(0, seed, 2).winnerIndex).toBe(1);
    }
    expect(winners).toEqual(new Set([0, 1]));
  });
});

describe('fold', () => {
  it('matches Vietnamese names without accents or case', () => {
    expect(fold('Bún bò Huế')).toBe('bun bo hue');
    expect(fold('ĐẬU phụ')).toBe('dau phu');
  });
});
