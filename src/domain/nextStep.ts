import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import { RECIPE_LIST } from '../data/game';
import type { AnimalId, Catch, CropId, RecipeId } from '../data/types';
import { canFulfill, todaysOrders } from './orders';
import type { GuestProgress } from './progress';
import {
  produceAvailable,
  firstEmptyPlot,
  plotStage,
  readyPlots,
  recipeAvailable,
  recipeProgress,
  animalStage,
  fishingLeft,
} from './selectors';
import { ANIMALS, ANIMAL_LIST, animalOf, isAnimalProduct, isCatch, isCrop } from '../data/game';

/**
 * The one thing worth doing next in the garden loop, so a harvest never ends
 * in a dead end. Ordered by how soon it pays off.
 */
export type NextStep =
  | { kind: 'cook'; recipe: RecipeId }
  | { kind: 'order'; orderId: string }
  | { kind: 'harvest'; count: number }
  | { kind: 'collect'; animal: AnimalId }
  | { kind: 'feed'; animal: AnimalId }
  | { kind: 'fish'; catch: Catch; recipe: RecipeId; left: number }
  | { kind: 'plant'; crop: CropId; plotId: number }
  | { kind: 'find'; crop: CropId; recipe: RecipeId }
  | { kind: 'wait'; recipe: RecipeId; readyAt: number }
  | { kind: 'full' };

/** Dishes whose confirmation grants a seed of `crop` (the reel's first crop ingredient). */
export function dishIdsForSeed(crop: CropId): string[] {
  return reelGameDishes()
    .filter((d) => d.seed === crop)
    .map((d) => d.id);
}

export function nextStep(p: GuestProgress, now: number): NextStep {
  // Only recipes the guest can actually work on: open, and every crop already unlocked.
  const recipes = RECIPE_LIST.filter(
    (r) => recipeAvailable(p, r.id) && r.ingredients.every((i) => produceAvailable(p, i.crop)),
  ).map((r) => ({ r, prog: recipeProgress(p, r.id) }));

  const cookable = recipes.filter((x) => x.prog.canCook).sort((a, b) => b.r.xp - a.r.xp)[0];
  if (cookable) return { kind: 'cook', recipe: cookable.r.id };

  const order = todaysOrders(p, now).find((o) => canFulfill(p, o));
  if (order) return { kind: 'order', orderId: order.id };

  const ready = readyPlots(p.plots, now).length;
  if (ready > 0) return { kind: 'harvest', count: ready };

  const collectable = ANIMAL_LIST.find((a) => animalStage(p, a.id, now) === 'ready');
  if (collectable) return { kind: 'collect', animal: collectable.id };

  // The recipe closest to done (by share of ingredients secured) is the one to work on.
  const open = recipes
    .filter((x) => !x.prog.canCook)
    .sort(
      (a, b) => b.prog.secured / b.prog.total - a.prog.secured / a.prog.total || a.r.xp - b.r.xp,
    );
  const focus = open[0];
  const missing = focus?.prog.ingredients.find((i) => i.have + i.growing < i.qty);

  // Fish or shrimp short: the pond, while today's catches last.
  if (focus && missing && isCatch(missing.crop) && fishingLeft(p, now) > 0) {
    return { kind: 'fish', catch: missing.crop, recipe: focus.r.id, left: fishingLeft(p, now) };
  }

  // An egg or milk short: feed the animal if the pantry has its feed.
  if (missing && isAnimalProduct(missing.crop)) {
    const animal = ANIMALS[animalOf(missing.crop)];
    if (animalStage(p, animal.id, now) === 'hungry' && p.ingredients[animal.feed] > 0) {
      return { kind: 'feed', animal: animal.id };
    }
  }

  const plot = firstEmptyPlot(p.plots);
  const missingCrop = missing && isCrop(missing.crop) ? missing.crop : null;
  if (plot) {
    // Prefer a tray seed the focus recipe still needs, else any seed at all.
    const wanted = missingCrop && p.seeds[missingCrop] > 0 ? missingCrop : null;
    const any = (Object.keys(p.seeds) as CropId[]).find((c) => p.seeds[c] > 0) ?? null;
    const crop = wanted ?? any;
    if (crop) return { kind: 'plant', crop, plotId: plot.id };
  }

  if (focus && missingCrop && plot) return { kind: 'find', crop: missingCrop, recipe: focus.r.id };

  const growing = p.plots
    .filter((pl) => pl.readyAt !== null && plotStage(pl, now) !== 'ready')
    .sort((a, b) => a.readyAt! - b.readyAt!)[0];
  if (focus && growing) return { kind: 'wait', recipe: focus.r.id, readyAt: growing.readyAt! };
  return { kind: 'full' };
}
