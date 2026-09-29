import { DISHES } from '../data/dishes';
import { AVOID_OPTIONS, BUDGET_OPTIONS } from '../data/game';
import type { AvoidId, BudgetId, Dish, MoodId } from '../data/types';

export interface Filters {
  budget: BudgetId | 'any';
  moods: MoodId[];
  vegetarian: boolean;
  avoid: AvoidId[];
}

export const DEFAULT_FILTERS: Filters = {
  budget: 'mid',
  moods: [],
  vegetarian: false,
  avoid: [],
};

export interface RecommendContext {
  hiddenDishIds: string[];
  /** Dishes the guest has already checked in as eaten — "Đổi vị" favours the rest. */
  triedDishIds: string[];
  /** Ids already shown in this session; rerolls skip them while the pool allows. */
  shownDishIds?: string[];
  /** Deterministic tie-break so rerolls feel varied but tests stay stable. */
  seed: number;
}

export type Relaxation =
  | { kind: 'budget'; label: string; count: number }
  | { kind: 'vegetarian'; label: string; count: number }
  | { kind: 'moods'; label: string; count: number }
  | { kind: 'avoid'; avoid: AvoidId; label: string; count: number }
  | { kind: 'hidden'; label: string; count: number };

export type RecommendResult =
  | { status: 'ok'; dishes: Dish[]; poolSize: number; wrapped: boolean }
  | { status: 'empty'; relaxations: Relaxation[] };

function matchesHard(dish: Dish, f: Filters, hidden: string[]): boolean {
  if (hidden.includes(dish.id)) return false;
  if (f.vegetarian && !dish.vegetarian) return false;
  if (f.budget !== 'any' && dish.budget !== f.budget) return false;
  if (f.avoid.some((a) => dish.contains.includes(a))) return false;
  if (f.moods.length > 0 && !f.moods.some((m) => dish.moods.includes(m))) return false;
  return true;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function jitter(seed: number, id: string): number {
  return (hash(`${seed}:${id}`) % 1000) / 1000;
}

function score(dish: Dish, f: Filters, ctx: RecommendContext): number {
  let s = 0;
  for (const m of f.moods) if (dish.moods.includes(m)) s += 3;
  if (f.moods.includes('novel') && !ctx.triedDishIds.includes(dish.id)) s += 2;
  return s + jitter(ctx.seed, dish.id);
}

export function filterCandidates(filters: Filters, hidden: string[], dishes = DISHES): Dish[] {
  return dishes.filter((d) => matchesHard(d, filters, hidden));
}

export function rankDishes(filters: Filters, ctx: RecommendContext, dishes = DISHES): Dish[] {
  return filterCandidates(filters, ctx.hiddenDishIds, dishes).sort(
    (a, b) => score(b, filters, ctx) - score(a, filters, ctx),
  );
}

/** Explains which filter is too strict by testing each one relaxed on its own. */
export function diagnoseEmpty(filters: Filters, hidden: string[], dishes = DISHES): Relaxation[] {
  const out: Relaxation[] = [];
  const count = (f: Filters, h = hidden) => filterCandidates(f, h, dishes).length;

  if (filters.budget !== 'any') {
    const n = count({ ...filters, budget: 'any' });
    const label = BUDGET_OPTIONS.find((b) => b.id === filters.budget)?.label ?? '';
    if (n > 0) out.push({ kind: 'budget', label: `Bỏ giới hạn ngân sách “${label}”`, count: n });
  }
  if (filters.vegetarian) {
    const n = count({ ...filters, vegetarian: false });
    if (n > 0) out.push({ kind: 'vegetarian', label: 'Tắt lọc “Chỉ món chay”', count: n });
  }
  if (filters.moods.length > 0) {
    const n = count({ ...filters, moods: [] });
    if (n > 0) out.push({ kind: 'moods', label: 'Bỏ chọn khẩu vị', count: n });
  }
  for (const a of filters.avoid) {
    const n = count({ ...filters, avoid: filters.avoid.filter((x) => x !== a) });
    const label = AVOID_OPTIONS.find((o) => o.id === a)?.label ?? a;
    if (n > 0) out.push({ kind: 'avoid', avoid: a, label: `Thôi tránh “${label}”`, count: n });
  }
  if (hidden.length > 0) {
    const n = count(filters, []);
    if (n > 0) out.push({ kind: 'hidden', label: 'Hiện lại các món đã ẩn', count: n });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function applyRelaxation(filters: Filters, r: Relaxation): Filters {
  switch (r.kind) {
    case 'budget':
      return { ...filters, budget: 'any' };
    case 'vegetarian':
      return { ...filters, vegetarian: false };
    case 'moods':
      return { ...filters, moods: [] };
    case 'avoid':
      return { ...filters, avoid: filters.avoid.filter((a) => a !== r.avoid) };
    case 'hidden':
      return filters;
  }
}

/**
 * Returns up to three dishes: [featured, alt, alt]. Rerolls pass the ids already
 * shown; once the pool is exhausted we wrap around instead of returning nothing.
 */
export function recommend(
  filters: Filters,
  ctx: RecommendContext,
  dishes = DISHES,
): RecommendResult {
  const ranked = rankDishes(filters, ctx, dishes);
  if (ranked.length === 0) {
    return { status: 'empty', relaxations: diagnoseEmpty(filters, ctx.hiddenDishIds, dishes) };
  }
  const shown = new Set(ctx.shownDishIds ?? []);
  const fresh = ranked.filter((d) => !shown.has(d.id));
  let wrapped = false;
  let picks = fresh.slice(0, 3);
  if (picks.length < Math.min(3, ranked.length)) {
    // Not enough unseen dishes: top up with the best already-seen ones.
    wrapped = true;
    const fill = ranked.filter((d) => !picks.includes(d));
    picks = [...picks, ...fill].slice(0, 3);
  }
  return { status: 'ok', dishes: picks, poolSize: ranked.length, wrapped };
}

export function sameFilters(a: Filters, b: Filters): boolean {
  return (
    a.budget === b.budget &&
    a.vegetarian === b.vegetarian &&
    a.moods.length === b.moods.length &&
    a.moods.every((m) => b.moods.includes(m)) &&
    a.avoid.length === b.avoid.length &&
    a.avoid.every((x) => b.avoid.includes(x))
  );
}
