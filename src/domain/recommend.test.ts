import { describe, expect, it } from 'vitest';
import { DISHES } from '../data/dishes';
import { CROPS, RECIPES, REGIONS } from '../data/game';
import type { RegionId } from '../data/types';
import {
  DEFAULT_FILTERS,
  applyRelaxation,
  diagnoseEmpty,
  recommend,
  type Filters,
} from './recommend';

const ctx = { hiddenDishIds: [], triedDishIds: [], seed: 7 };

describe('catalogue data', () => {
  it('has at least 12 dishes across all three regions and budgets', () => {
    expect(DISHES.length).toBeGreaterThanOrEqual(12);
    for (const r of ['north', 'central', 'south'] as const) {
      expect(DISHES.filter((d) => d.region === r).length).toBeGreaterThanOrEqual(4);
    }
    for (const b of ['low', 'mid', 'high'] as const) {
      expect(DISHES.some((d) => d.budget === b)).toBe(true);
    }
  });

  it('links every dish seed to an ingredient of its recipe and to a known region', () => {
    for (const d of DISHES) {
      expect(CROPS[d.seed]).toBeDefined();
      expect(RECIPES[d.recipe].ingredients.some((i) => i.crop === d.seed)).toBe(true);
      expect(d.region).not.toBe('world');
      expect(REGIONS[d.region as RegionId].featuredDishIds).toContain(d.id);
    }
  });
});

describe('recommend', () => {
  it('returns a featured dish plus two alternatives matching hard filters', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, budget: 'any', vegetarian: true };
    const r = recommend(filters, ctx);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.dishes).toHaveLength(3);
    expect(r.dishes.every((d) => d.vegetarian)).toBe(true);
  });

  it('respects budget and avoid lists as hard exclusions', () => {
    const r = recommend(
      { budget: 'mid', moods: [], vegetarian: false, avoid: ['pork', 'beef'] },
      ctx,
    );
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    for (const d of r.dishes) {
      expect(d.budget).toBe('mid');
      expect(d.contains).not.toContain('pork');
      expect(d.contains).not.toContain('beef');
    }
  });

  it('never returns hidden dishes and rerolls to unseen dishes first', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, budget: 'any' };
    const first = recommend(filters, { ...ctx, hiddenDishIds: ['pho-bo'] });
    if (first.status !== 'ok') throw new Error('expected results');
    expect(first.dishes.map((d) => d.id)).not.toContain('pho-bo');
    const shown = first.dishes.map((d) => d.id);
    const second = recommend(filters, { ...ctx, hiddenDishIds: ['pho-bo'], shownDishIds: shown });
    if (second.status !== 'ok') throw new Error('expected results');
    expect(second.dishes.some((d) => shown.includes(d.id))).toBe(false);
  });

  it('explains which filter is too strict when nothing matches', () => {
    const strict: Filters = { budget: 'high', moods: ['quick'], vegetarian: true, avoid: [] };
    const r = recommend(strict, ctx);
    expect(r.status).toBe('empty');
    if (r.status !== 'empty') return;
    expect(r.relaxations.length).toBeGreaterThan(0);
    const relaxed = applyRelaxation(strict, r.relaxations[0]!);
    expect(recommend(relaxed, ctx).status).toBe('ok');
  });

  it('suggests showing hidden dishes again when that is the blocker', () => {
    const filters: Filters = { budget: 'high', moods: [], vegetarian: true, avoid: [] };
    const hidden = ['lau-nam-chay'];
    const kinds = diagnoseEmpty(filters, hidden).map((r) => r.kind);
    expect(kinds).toContain('hidden');
  });
});
