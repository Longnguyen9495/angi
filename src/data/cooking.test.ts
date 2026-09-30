import { describe, expect, it } from 'vitest';
import { cookPlan } from './cooking';
import { RECIPE_LIST, RECIPES } from './game';

describe('cookPlan', () => {
  it('lays the stages end to end across the whole cooking time', () => {
    for (const recipe of RECIPE_LIST) {
      const plan = cookPlan(recipe);
      let end = 0;
      for (const s of plan.stages) {
        expect(s.startMs).toBe(end);
        end = s.startMs + s.durationMs;
      }
      expect(Math.abs(end - plan.totalMs)).toBeLessThanOrEqual(2);
    }
  });

  it('simmers soups longer than rice dishes', () => {
    expect(cookPlan(RECIPES['pho-bo']).totalMs).toBeGreaterThan(
      cookPlan(RECIPES['com-tam']).totalMs,
    );
  });
});
