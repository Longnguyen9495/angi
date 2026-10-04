import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import { RECIPE_LIST } from '../data/game';
import type { AnimalId, Catch, CropId, Meat, RecipeId } from '../data/types';
import { canFulfill, todaysOrders } from './orders';
import { canServe, guestPay, todaysGuests } from './guests';
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
  nextLand,
} from './selectors';
import {
  ANIMALS,
  ANIMAL_LIST,
  MARKET,
  animalOf,
  isAnimalProduct,
  isCatch,
  isCrop,
  isMeat,
} from '../data/game';

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
  | { kind: 'buy'; item: Meat; recipe: RecipeId; price: number }
  | { kind: 'land'; plotId: number; price: number }
  | { kind: 'guest'; guestId: string; recipe: RecipeId; pay: number }
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

  // A guest whose dish is ready to cook pays more than cooking it alone.
  const guest = todaysGuests(p, now).find((g) => canServe(p, g));
  if (guest) {
    const pay = guestPay(guest.recipe, (p.cooked[guest.recipe] ?? 0) + 1);
    return { kind: 'guest', guestId: guest.id, recipe: guest.recipe, pay };
  }

  const cookable = recipes.filter((x) => x.prog.canCook).sort((a, b) => b.r.xp - a.r.xp)[0];
  if (cookable) return { kind: 'cook', recipe: cookable.r.id };

  const order = todaysOrders(p, now).find((o) => canFulfill(p, o));
  if (order) return { kind: 'order', orderId: order.id };

  const ready = readyPlots(p.plots, now).length;
  if (ready > 0) return { kind: 'harvest', count: ready };

  const collectable = ANIMAL_LIST.find((a) => animalStage(p, a.id, now) === 'ready');
  if (collectable) return { kind: 'collect', animal: collectable.id };

  // A new plot the guest can clear right now: more room is the farm's biggest step.
  const land = nextLand(p);
  if (land?.affordable) return { kind: 'land', plotId: land.id, price: land.price };

  // The recipe closest to done (by share of ingredients secured) is the one to work on.
  const open = recipes
    .filter((x) => !x.prog.canCook)
    .sort(
      (a, b) => b.prog.secured / b.prog.total - a.prog.secured / a.prog.total || a.r.xp - b.r.xp,
    );
  const focus = open[0];
  const short = focus?.prog.ingredients.filter((i) => i.have + i.growing < i.qty) ?? [];
  const missingCrop = short.map((i) => i.crop).find(isCrop) ?? null;
  // Meat, eggs, milk and catches: what the farm has to fetch rather than grow.
  const fetch = short.find((i) => !isCrop(i.crop))?.crop ?? null;
  const plot = firstEmptyPlot(p.plots);
  const anySeed = (Object.keys(p.seeds) as CropId[]).find((c) => p.seeds[c] > 0) ?? null;

  // Crops first: they take longest, so a free plot gets the seed the recipe still needs
  // (or any seed in the tray), else the reel points at dishes that give it.
  if (plot && missingCrop) {
    const crop = p.seeds[missingCrop] > 0 ? missingCrop : anySeed;
    if (crop) return { kind: 'plant', crop, plotId: plot.id };
    if (focus) return { kind: 'find', crop: missingCrop, recipe: focus.r.id };
  }

  // Fish or shrimp short: the pond, while today's catches last.
  if (focus && fetch && isCatch(fetch) && fishingLeft(p, now) > 0) {
    return { kind: 'fish', catch: fetch, recipe: focus.r.id, left: fishingLeft(p, now) };
  }

  // An egg, milk or meat short: feed the animal if the pantry has its feed.
  if (fetch && isAnimalProduct(fetch)) {
    const animal = ANIMALS[animalOf(fetch)];
    const stage = animalStage(p, animal.id, now);
    if (stage === 'hungry' && p.ingredients[animal.feed] > 0) {
      return { kind: 'feed', animal: animal.id };
    }
    // Meat whose animal cannot help right now (locked, or nothing to feed it): the market.
    if (focus && isMeat(fetch) && stage !== 'busy' && p.coins >= MARKET.buy(fetch)) {
      return { kind: 'buy', item: fetch, recipe: focus.r.id, price: MARKET.buy(fetch) };
    }
  }

  if (plot && anySeed) return { kind: 'plant', crop: anySeed, plotId: plot.id };

  const growing = p.plots
    .filter((pl) => pl.readyAt !== null && plotStage(pl, now) !== 'ready')
    .sort((a, b) => a.readyAt! - b.readyAt!)[0];
  if (focus && growing) return { kind: 'wait', recipe: focus.r.id, readyAt: growing.readyAt! };
  return { kind: 'full' };
}
