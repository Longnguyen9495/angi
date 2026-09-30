import { describe, expect, it } from 'vitest';
import { canFulfill, dailyOrders, todaysOrders } from './orders';
import { EMPTY_CROPS, createInitialProgress, type GuestProgress } from './progress';
import { gameReducer } from './reducer';
import { waterLeft } from './selectors';
import { HOUR_MS, dateKey } from './time';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

/** A guest holding exactly what today's order `n` asks for. */
function stocked(n: number): GuestProgress {
  const s = createInitialProgress(NOON);
  const order = todaysOrders(s, NOON)[n]!;
  const ingredients = { ...EMPTY_CROPS };
  for (const i of order.items) ingredients[i.crop] = i.qty;
  return { ...s, ingredients };
}

describe("Cô Ba's orders", () => {
  it('are the same all day, different the next day, and use distinct crops', () => {
    const a = dailyOrders('2026-09-29');
    expect(dailyOrders('2026-09-29')).toEqual(a);
    expect(dailyOrders('2026-09-30')).not.toEqual(a);
    expect(a).toHaveLength(2);
    for (const o of a) expect(new Set(o.items.map((i) => i.crop)).size).toBe(o.items.length);
    expect(a[0]!.items).toHaveLength(2);
    expect(a[1]!.items).toHaveLength(3);
  });

  it('trade produce for seeds, XP and water exactly once', () => {
    const s0 = stocked(0);
    const order = todaysOrders(s0, NOON)[0]!;
    expect(canFulfill(s0, order)).toBe(true);
    const s1 = gameReducer(s0, { type: 'FULFILL_ORDER', orderId: order.id, now: NOON });
    for (const i of order.items) expect(s1.ingredients[i.crop]).toBe(0);
    for (const seed of order.reward.seeds) {
      expect(s1.seeds[seed.crop]).toBe(s0.seeds[seed.crop] + seed.qty);
    }
    expect(s1.xp).toBe(s0.xp + order.reward.xp);
    expect(waterLeft(s1, NOON)).toBe(waterLeft(s0, NOON) + 1);
    expect(s1.orders.done).toContain(order.id);
    expect(gameReducer(s1, { type: 'FULFILL_ORDER', orderId: order.id, now: NOON + 1 })).toBe(s1);
  });

  it('refuse a delivery without enough produce, or from another day', () => {
    const s = createInitialProgress(NOON);
    const order = todaysOrders(s, NOON)[1]!;
    expect(gameReducer(s, { type: 'FULFILL_ORDER', orderId: order.id, now: NOON })).toBe(s);
    const full = stocked(1);
    const tomorrow = NOON + 24 * HOUR_MS;
    expect(dateKey(tomorrow)).not.toBe(dateKey(NOON));
    expect(gameReducer(full, { type: 'FULFILL_ORDER', orderId: order.id, now: tomorrow })).toBe(
      full,
    );
  });
});
