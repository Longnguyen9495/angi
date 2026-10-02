import { describe, expect, it } from 'vitest';
import { CROPS, FISHING, XP, getRecipe } from '../data/game';
import { createInitialProgress, type GuestProgress } from './progress';
import { gameReducer } from './reducer';
import { boatCatch, catchFor, fishingLeft } from './selectors';
import { reconcile } from './sync';
import { HOUR_MS } from './time';

// Characterization PASS means the reported unsafe behavior still exists.
// Expected failures execute the desired invariant: an unexpected fix must be reviewed.
const NOW = new Date(2026, 9, 2, 12).getTime();
const fresh = () => createInitialProgress(NOW);
function cookedTwice() {
  const s = fresh();
  const recipe = getRecipe('com-tam');
  for (const i of recipe.ingredients) s.ingredients[i.crop] = i.qty * 3;
  const once = gameReducer(s, { type: 'COOK', recipeId: recipe.id, now: NOW });
  const twice = gameReducer(once, { type: 'COOK', recipeId: recipe.id, now: NOW });
  return { s, once, twice, recipe };
}
function photoTwice() {
  let s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
  s = gameReducer(s, { type: 'CHECK_IN', outcome: 'ate', rating: 5, again: 'yes', now: NOW });
  const slotKey = s.history[0]!.slotKey;
  const once = gameReducer(s, { type: 'ATTACH_PHOTO', slotKey, now: NOW });
  const removed = gameReducer(once, { type: 'REMOVE_PHOTO', slotKey });
  const twice = gameReducer(removed, { type: 'ATTACH_PHOTO', slotKey, now: NOW + 1 });
  return { once, twice, removed, slotKey };
}
function evict(s: GuestProgress) {
  for (let i = 0; i < 401; i++) {
    s = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: `filler-${i}`, type: 'thanks' },
      now: NOW + i,
    });
  }
  expect(s.ledger).toHaveLength(400);
  return s;
}

describe('audit characterization — PASS reproduces vulnerability', () => {
  it('F05 future clock harvests a currently growing plot', () => {
    const s = fresh();
    const now = gameReducer(s, { type: 'HARVEST_ALL', now: NOW });
    expect(now.ingredients.scallion).toBe(0);
    const future = gameReducer(now, { type: 'HARVEST_ALL', now: NOW + 3 * HOUR_MS });
    expect(future.ingredients.scallion).toBe(CROPS.scallion.yield);
  });
  it('F05 quota resets when moving to tomorrow and back', () => {
    let s = fresh();
    for (let i = 0; i < FISHING.perDay; i++)
      s = gameReducer(s, { type: 'CATCH', castAt: NOW + i, now: NOW + i });
    expect(fishingLeft(s, NOW)).toBe(0);
    s = gameReducer(s, { type: 'CATCH', castAt: NOW + 24 * HOUR_MS, now: NOW + 24 * HOUR_MS });
    s = gameReducer(s, { type: 'CATCH', castAt: NOW + 100, now: NOW + 100 });
    expect(s.fishing.used).toBe(1);
    expect(fishingLeft(s, NOW)).toBe(FISHING.perDay - 1);
  });
  it('F06 zero-age catch requires no cast session and timestamp selects loot', () => {
    const s = fresh();
    const next = gameReducer(s, { type: 'CATCH', castAt: NOW, now: NOW });
    expect(next.ingredients[catchFor(NOW)]).toBe(1);
    expect(
      new Set(Array.from({ length: 200 }, (_, i) => catchFor(NOW + i * 7919))).size,
    ).toBeGreaterThan(1);
    expect(boatCatch(NOW, 10)).toEqual(boatCatch(NOW, 10));
  });
  it('F07 repeated cook increments cooked/tally without a second debit or XP', () => {
    const { once, twice, recipe } = cookedTwice();
    expect(twice.ingredients).toEqual(once.ingredients);
    expect(twice.xp).toBe(once.xp);
    expect(twice.cooked[recipe.id]).toBe(2);
    expect(twice.quests.total.cook).toBe(2);
  });
  it('F07 remove/reattach photo inflates tally while XP key remains', () => {
    const { once, twice } = photoTwice();
    expect(twice.xp).toBe(once.xp);
    expect(twice.quests.total.photo).toBe(2);
  });
  it('F07 photo reward replays after 401 real reducer events evict its claim', () => {
    const { removed, slotKey } = photoTwice();
    const s = evict(removed);
    expect(s.ledger.some((e) => e.key === `photo:${slotKey}`)).toBe(false);
    const replay = gameReducer(s, { type: 'ATTACH_PHOTO', slotKey, now: NOW + 500 });
    expect(replay.xp).toBe(s.xp + XP.checkinPhoto);
  });
  it('F07 friend seed reward replays after eviction', () => {
    const event = { id: 'original', type: 'present' as const, crop: 'rice' as const };
    const once = gameReducer(fresh(), { type: 'FRIEND_EVENT', event, now: NOW });
    expect(gameReducer(once, { type: 'FRIEND_EVENT', event, now: NOW })).toBe(once);
    const s = evict(once);
    expect(gameReducer(s, { type: 'FRIEND_EVENT', event, now: NOW }).seeds.rice).toBe(
      s.seeds.rice + 1,
    );
  });
  it('F07 restored ready plot with spent harvest keys still increases tally', () => {
    const original = fresh();
    const once = gameReducer(original, { type: 'HARVEST_ALL', now: NOW });
    const restored = { ...once, plots: original.plots };
    const replay = gameReducer(restored, { type: 'HARVEST_ALL', now: NOW });
    expect(replay.ingredients).toEqual(once.ingredients);
    expect(replay.quests.total.harvest).toBe((once.quests.total.harvest ?? 0) + 1);
  });
  it('F09 equal XP and ledger hides different inventory', () => {
    const s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
    const other = structuredClone(s);
    other.coins = 99999;
    expect(reconcile(s, other)).toEqual({ kind: 'same' });
  });
  it('F10 old stolen event marks a new planting of the same crop', () => {
    const s = fresh();
    s.plots[0] = { ...s.plots[0]!, plantedAt: NOW, readyAt: NOW + HOUR_MS };
    const next = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'old-cycle', type: 'stolen', plotId: 1, crop: 'herbs' },
      now: NOW,
    });
    expect(next.plots[0]!.stolen).toBe(true);
  });
  it('F15 same earned local journey is pushed to every empty account', () => {
    const local = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
    expect(reconcile(local, null)).toEqual({ kind: 'push' });
    const accountA = structuredClone(local);
    expect(reconcile(local, null)).toEqual({ kind: 'push' });
    expect(accountA).toEqual(local);
  });
});

describe('security expectations — known failures, NOT fixed', () => {
  it.fails('F06 must reject a catch without a session/bite window', () => {
    const s = fresh();
    expect(gameReducer(s, { type: 'CATCH', castAt: NOW, now: NOW })).toBe(s);
  });
  it.fails('F07 replay must not increase cooked count', () => {
    const { once, twice } = cookedTwice();
    expect(twice.cooked).toEqual(once.cooked);
  });
  it.fails('F07 photo reattachment must not increase tally', () => {
    const { once, twice } = photoTwice();
    expect(twice.quests.total.photo).toBe(once.quests.total.photo);
  });
  it.fails(
    'F15 earned account state must not automatically upload to another empty account',
    () => {
      const local = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
      expect(reconcile(local, null).kind).not.toBe('push');
    },
  );
});

describe('security controls — ordinary regression expectations', () => {
  it('rejects future/stale cast and duplicate cast while claim is retained', () => {
    const s = fresh();
    expect(gameReducer(s, { type: 'CATCH', castAt: NOW, now: NOW - 1 })).toBe(s);
    expect(gameReducer(s, { type: 'CATCH', castAt: NOW, now: NOW + FISHING.maxCastMs + 1 })).toBe(
      s,
    );
    const once = gameReducer(s, { type: 'CATCH', castAt: NOW, now: NOW });
    expect(gameReducer(once, { type: 'CATCH', castAt: NOW, now: NOW })).toBe(once);
  });
});
