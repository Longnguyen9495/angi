import { COLLECTIONS, collectionReward, hasRecipe, type CollectionId } from '../data/game';
import type { GuestProgress } from './progress';

export interface CollectionProgress {
  id: CollectionId;
  /** The set's recipes this catalogue has (a dish removed from it is skipped). */
  recipes: string[];
  cooked: number;
  complete: boolean;
  claimed: boolean;
  reward: { coins: number; xp: number };
}

export function collectionProgress(p: GuestProgress): CollectionProgress[] {
  return COLLECTIONS.map((c) => {
    const recipes = c.recipes.filter((id) => hasRecipe(id));
    const cooked = recipes.filter((id) => (p.cooked[id] ?? 0) > 0).length;
    return {
      id: c.id,
      recipes,
      cooked,
      complete: recipes.length > 0 && cooked === recipes.length,
      claimed: p.collections.includes(c.id),
      reward: collectionReward(c.recipes.length),
    };
  });
}
