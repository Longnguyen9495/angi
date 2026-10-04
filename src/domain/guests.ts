import {
  EVENT,
  GUESTS,
  RECIPE_LIST,
  eventOn,
  getRecipe,
  masteryStars,
  sellPrice,
  type EventId,
} from '../data/game';
import type { RecipeId } from '../data/types';
import { t } from '../i18n';
import { hash, rng } from './orders';
import type { GuestProgress } from './progress';
import { produceAvailable, recipeAvailable, recipeProgress } from './selectors';
import { dateKey } from './time';

/** One of the people who come to the farm kitchen (names and lines in t.domain.guests). */
export type Persona = (typeof t.domain.guests)[number];

/** A guest waiting today for one dish. */
export interface Guest {
  /** `guest:<date>:<slot>`; also what is kept in orders.done once served. */
  id: string;
  date: string;
  slot: number;
  persona: Persona;
  recipe: RecipeId;
  /** Set for the event guest: asks for one of the event's dishes and pays its bonus. */
  event?: EventId;
}

/**
 * Today's guests: GUESTS.perDay of them, each asking for a different dish the guest can
 * already work towards (an open recipe whose ingredients can all be had). The same for the
 * whole day on every device of one garden, different from garden to garden.
 */
export function todaysGuests(p: GuestProgress, now: number): Guest[] {
  const date = dateKey(now);
  const menu = RECIPE_LIST.filter(
    (r) => recipeAvailable(p, r.id) && r.ingredients.every((i) => produceAvailable(p, i.crop)),
  );
  if (menu.length === 0) return [];
  const r = rng(hash(`guest:${p.guestId}:${date}`));
  const people = [...t.domain.guests];
  const dishes = [...menu];
  const out: Guest[] = [];
  for (let slot = 0; slot < GUESTS.perDay && dishes.length > 0; slot++) {
    const persona = people.splice(Math.floor(r() * people.length), 1)[0]!;
    const recipe = dishes.splice(Math.floor(r() * dishes.length), 1)[0]!;
    out.push({ id: `guest:${date}:${slot}`, date, slot, persona, recipe: recipe.id });
  }
  // While an event runs, one more guest comes for one of its dishes the garden can make.
  const event = eventOn(date);
  const featured = event ? menu.filter((r) => event.recipes.includes(r.id)) : [];
  if (event && featured.length > 0 && people.length > 0) {
    const persona = people.splice(Math.floor(r() * people.length), 1)[0]!;
    const recipe = featured[Math.floor(r() * featured.length)]!;
    const slot = EVENT.slot;
    out.push({
      id: `guest:${date}:${slot}`,
      date,
      slot,
      persona,
      recipe: recipe.id,
      event: event.id,
    });
  }
  return out;
}

export function guestServed(p: GuestProgress, g: Guest): boolean {
  return p.orders.date === g.date && p.orders.done.includes(g.id);
}

export function canServe(p: GuestProgress, g: Guest): boolean {
  return !guestServed(p, g) && recipeProgress(p, g.recipe).canCook;
}

/** What the recipe's ingredients would sell for at the market. */
export function ingredientValue(id: RecipeId): number {
  return getRecipe(id).ingredients.reduce((n, i) => n + sellPrice(i.crop) * i.qty, 0);
}

/**
 * What a guest pays for a dish cooked for the `times`-th time (stars count that cooking):
 * payPct% of its ingredients' value, plus the mastery bonus. Integer maths, as on the server.
 */
export function guestPay(id: RecipeId, times: number, event = false): number {
  const bonus = GUESTS.starBonusPct[masteryStars(times)];
  const extra = event ? EVENT.bonusPct : 0;
  return Math.floor(
    (ingredientValue(id) * GUESTS.payPct * (100 + bonus) * (100 + extra) + 500_000) / 1_000_000,
  );
}

/** Days of an event on which its guest was served (as this garden recorded them). */
export function eventDays(p: GuestProgress, id: EventId): string[] {
  return p.events?.[id]?.days ?? [];
}
