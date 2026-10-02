import { useState } from 'react';
import type { ItemCategory } from '../../../data/types';

/** Folds Vietnamese accents away so "ca chua" finds "Cà chua". */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export interface FilterState {
  query: string;
  category: ItemCategory | 'all';
}

/**
 * Search + group filter for long item lists (pantry, seeds, market). Only groups that have
 * items are offered; the list itself is filtered by the caller with `matches`.
 */
export function useItemFilter() {
  const [state, setState] = useState<FilterState>({ query: '', category: 'all' });
  const matches = (name: string, category: ItemCategory) =>
    (state.category === 'all' || state.category === category) &&
    (state.query === '' || fold(name).includes(fold(state.query)));
  return { state, setState, matches };
}

/** Groups in a stable order: garden first, then animals, hive and water. */
export const CATEGORY_ORDER: ItemCategory[] = [
  'leafy',
  'fruitveg',
  'root',
  'grain',
  'spice',
  'fruit',
  'mushroom',
  'egg',
  'dairy',
  'fiber',
  'bee',
  'freshwater',
  'seafood',
];

export function presentCategories(cats: Iterable<ItemCategory>): ItemCategory[] {
  const set = new Set(cats);
  return CATEGORY_ORDER.filter((c) => set.has(c));
}
