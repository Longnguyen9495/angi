import { t } from '../i18n';
import type { DishGroup, RecipeDef } from './types';

/** How hard the fire burns during a stage — drives flame, bubbles and pot shake. */
export type Heat = 'low' | 'mid' | 'high';

export interface CookStage {
  label: string;
  heat: Heat;
  /** Share of the cooking time this stage takes. */
  weight: number;
}

export interface PlannedStage extends CookStage {
  startMs: number;
  durationMs: number;
}

export interface CookPlan {
  stages: PlannedStage[];
  totalMs: number;
}

/** Every dish family is cooked in its own order of steps. */
const STAGES: Record<DishGroup, CookStage[]> = {
  rice: [
    { label: t.data.cooking.rice[0]!, heat: 'low', weight: 2 },
    { label: t.data.cooking.rice[1]!, heat: 'high', weight: 3 },
    { label: t.data.cooking.rice[2]!, heat: 'mid', weight: 3 },
    { label: t.data.cooking.rice[3]!, heat: 'low', weight: 1 },
  ],
  'noodle-soup': [
    { label: t.data.cooking.noodleSoup[0]!, heat: 'low', weight: 2 },
    { label: t.data.cooking.noodleSoup[1]!, heat: 'high', weight: 5 },
    { label: t.data.cooking.noodleSoup[2]!, heat: 'mid', weight: 2 },
    { label: t.data.cooking.noodleSoup[3]!, heat: 'low', weight: 2 },
  ],
  'bread-roll': [
    { label: t.data.cooking.breadRoll[0]!, heat: 'low', weight: 2 },
    { label: t.data.cooking.breadRoll[1]!, heat: 'high', weight: 3 },
    { label: t.data.cooking.breadRoll[2]!, heat: 'low', weight: 2 },
  ],
  'noodle-dry': [
    { label: t.data.cooking.noodleDry[0]!, heat: 'low', weight: 2 },
    { label: t.data.cooking.noodleDry[1]!, heat: 'high', weight: 3 },
    { label: t.data.cooking.noodleDry[2]!, heat: 'mid', weight: 2 },
    { label: t.data.cooking.noodleDry[3]!, heat: 'low', weight: 1 },
  ],
  pancake: [
    { label: t.data.cooking.pancake[0]!, heat: 'low', weight: 2 },
    { label: t.data.cooking.pancake[1]!, heat: 'mid', weight: 2 },
    { label: t.data.cooking.pancake[2]!, heat: 'high', weight: 3 },
    { label: t.data.cooking.pancake[3]!, heat: 'low', weight: 1 },
  ],
};

/** Base cooking time per family; soups simmer longest, rolls are quickest. */
const BASE_MS: Record<DishGroup, number> = {
  rice: 7000,
  'noodle-soup': 11000,
  'bread-roll': 6000,
  'noodle-dry': 8000,
  pancake: 8000,
};

/** Each extra ingredient adds a little prep time. */
const PER_INGREDIENT_MS = 700;

export function cookPlan(recipe: RecipeDef): CookPlan {
  const pieces = recipe.ingredients.reduce((n, i) => n + i.qty, 0);
  const totalMs = BASE_MS[recipe.group] + pieces * PER_INGREDIENT_MS;
  const stages = STAGES[recipe.group];
  const weights = stages.reduce((n, s) => n + s.weight, 0);
  let startMs = 0;
  return {
    totalMs,
    stages: stages.map((s) => {
      const durationMs = Math.round((s.weight / weights) * totalMs);
      const planned = { ...s, startMs, durationMs };
      startMs += durationMs;
      return planned;
    }),
  };
}
