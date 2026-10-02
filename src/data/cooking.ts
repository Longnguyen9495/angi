import { t } from '../i18n';
import type { DishGroup, RecipeDef, RecipeId } from './types';

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

/**
 * Every dish is cooked in its own order of steps: how hot the fire burns in each one and
 * what share of the time it takes. The step names are in t.data.cooking[recipe].
 */
const STEPS: Record<RecipeId, [Heat, number][]> = {
  'com-tam': [
    ['mid', 3],
    ['high', 3],
    ['mid', 1],
    ['low', 1],
  ],
  'bun-rieu': [
    ['high', 4],
    ['mid', 2],
    ['mid', 2],
    ['low', 2],
  ],
  'bun-bo-hue': [
    ['high', 5],
    ['mid', 2],
    ['mid', 1],
    ['low', 2],
  ],
  'goi-cuon': [
    ['high', 3],
    ['low', 1],
    ['low', 3],
  ],
  'banh-xeo': [
    ['low', 2],
    ['mid', 2],
    ['high', 3],
    ['low', 1],
  ],
  'bo-luc-lac': [
    ['low', 2],
    ['high', 3],
    ['low', 1],
    ['low', 1],
  ],
  'mi-quang': [
    ['high', 3],
    ['mid', 2],
    ['mid', 2],
    ['low', 1],
  ],
  'com-ga-hoi-an': [
    ['high', 3],
    ['mid', 3],
    ['low', 2],
    ['low', 1],
  ],
  'nem-nuong': [
    ['low', 2],
    ['high', 3],
    ['low', 1],
    ['low', 2],
  ],
  'pho-bo': [
    ['mid', 1],
    ['high', 5],
    ['mid', 1],
    ['low', 2],
  ],
  'bun-cha': [
    ['low', 2],
    ['high', 3],
    ['low', 1],
    ['low', 1],
  ],
  'banh-cuon': [
    ['mid', 2],
    ['high', 3],
    ['low', 2],
    ['low', 1],
  ],
  'banh-mi-chao': [
    ['high', 1],
    ['mid', 3],
    ['low', 1],
    ['mid', 2],
  ],
  'canh-chua-ca': [
    ['high', 3],
    ['mid', 2],
    ['mid', 2],
    ['low', 1],
  ],
};

function stagesFor(id: RecipeId): CookStage[] {
  const labels = t.data.cooking[id];
  return STEPS[id].map(([heat, weight], i) => ({ label: labels[i] ?? '', heat, weight }));
}

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
  const stages = stagesFor(recipe.id);
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
