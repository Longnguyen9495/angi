import { describe, expect, it } from 'vitest';
import { CROPS, FISHING, XP, getRecipe } from '../data/game';
import { createInitialProgress, type GuestProgress } from './progress';
import { LEDGER_LIMIT, gameReducer } from './reducer';
import { biteDelay, boatCatch, catchFor, fishingLeft } from './selectors';
import { reconcile } from './sync';
import { HOUR_MS } from './time';

/*
 * Regression tests for the game-cheating audit (plans/kiem-toan-gian-lan-game.md, F01–F17).
 * The device can never be trusted on its own: the server checks every save against the
 * game's rules (server/lib/ProgressGuard.php — see progressGuard.test.ts and
 * server/bin/selftest-security.php). These tests pin what the device itself must do so an
 * honest save stays acceptable, and record which findings now rest on the server.
 */
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
  for (let i = 0; i <= LEDGER_LIMIT; i++) {
    s = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: `filler-${i}`, type: 'thanks' },
      now: NOW + i,
    });
  }
  expect(s.ledger).toHaveLength(LEDGER_LIMIT);
  return s;
}
const castAt = NOW;
const afterBite = castAt + biteDelay(castAt) + 100;

describe('fixed on the device', () => {
  it('F06 a catch counts only after the fish has bitten', () => {
    const s = fresh();
    expect(gameReducer(s, { type: 'CATCH', castAt, now: castAt })).toBe(s);
    const caught = gameReducer(s, { type: 'CATCH', castAt, now: afterBite });
    expect(caught.ingredients[catchFor(castAt)]).toBe(1);
  });
  it('F07 cooking the same thing twice under one key changes nothing', () => {
    const { once, twice } = cookedTwice();
    expect(twice).toBe(once);
    expect(twice.cooked).toEqual(once.cooked);
  });
  it('F07 a photo put back after removing it pays and counts nothing more', () => {
    const { once, twice } = photoTwice();
    expect(twice.xp).toBe(once.xp);
    expect(twice.quests.total.photo).toBe(once.quests.total.photo);
    expect(twice.photos).toContain(once.photos[0]);
  });
  it('F07 a plot restored after its harvest was paid counts nothing', () => {
    const original = fresh();
    const once = gameReducer(original, { type: 'HARVEST_ALL', now: NOW });
    const restored = { ...once, plots: original.plots };
    const replay = gameReducer(restored, { type: 'HARVEST_ALL', now: NOW });
    expect(replay.ingredients).toEqual(once.ingredients);
    expect(replay.quests.total.harvest).toBe(once.quests.total.harvest);
  });
  it('F07 switching the meal after its seed was sent away pays no new seed', () => {
    let s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
    const seed = s.meal!.seedCrop;
    s = gameReducer(s, { type: 'GIFT_SENT', id: 'e1', crop: seed, now: NOW + 1 });
    const before = structuredClone(s.seeds);
    const switched = gameReducer(s, { type: 'CHOOSE_DISH', dishId: 'pho-bo', now: NOW + 2 });
    expect(switched.seeds).toEqual(before);
    expect(switched.meal?.dishId).toBe('pho-bo');
  });
  it('F09 two copies with the same last entry but different balances are the guest’s call', () => {
    const s = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
    const other = structuredClone(s);
    other.coins = 99999;
    expect(reconcile(s, other)).toEqual({ kind: 'ask' });
    expect(reconcile(s, structuredClone(s))).toEqual({ kind: 'same' });
  });
  it('F09 the copy holding the other’s newest entry is ahead, whatever the XP says', () => {
    const base = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
    const ahead = gameReducer(base, { type: 'HARVEST_ALL', now: NOW + 1000 });
    expect(reconcile(ahead, base)).toEqual({ kind: 'push' });
    expect(reconcile(base, ahead)).toEqual({ kind: 'pull' });
  });
  it('F10 an old pick does not mark a new planting of the same crop', () => {
    const s = fresh();
    s.plots[0] = { ...s.plots[0]!, plantedAt: NOW, readyAt: NOW + HOUR_MS };
    const next = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'old-cycle', type: 'stolen', plotId: 1, crop: 'herbs', cycle: NOW - HOUR_MS },
      now: NOW,
    });
    expect(next.plots[0]!.stolen).toBeUndefined();
    const same = gameReducer(s, {
      type: 'FRIEND_EVENT',
      event: { id: 'this-cycle', type: 'stolen', plotId: 1, crop: 'herbs', cycle: NOW },
      now: NOW,
    });
    expect(same.plots[0]!.stolen).toBe(true);
  });
  it('F15 a journey saved to one account is never uploaded into another', () => {
    const local = gameReducer(fresh(), { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOW });
    // A guest journey (no account yet) is uploaded when the guest first signs in…
    expect(reconcile(local, null, 'account-a')).toEqual({ kind: 'push' });
    // …but once it belongs to account A, account B starts its own.
    const ownedByA = { ...local, owner: 'account-a' };
    expect(reconcile(ownedByA, null, 'account-b')).toEqual({ kind: 'fresh' });
    expect(reconcile(ownedByA, fresh(), 'account-b')).toEqual({ kind: 'pull' });
    expect(reconcile(ownedByA, null, 'account-a')).toEqual({ kind: 'push' });
  });
});

describe('enforced by the server, not the device', () => {
  // The device must keep working offline, so these stay possible on a tampered device and
  // are refused when such a save reaches the server (each case is in progressGuard.test.ts
  // or server/bin/selftest-security.php).
  it('F05 the device clock drives the game offline; the server holds saves to its own clock', () => {
    const s = fresh();
    const future = gameReducer(s, { type: 'HARVEST_ALL', now: NOW + 3 * HOUR_MS });
    expect(future.ingredients.scallion).toBe(CROPS.scallion.yield);
  });
  it('F05 fishing quota follows the device day; the server caps catches per 24 hours', () => {
    let s = fresh();
    for (let i = 0; i < FISHING.perDay; i++) {
      const at = NOW + i * 10_000;
      s = gameReducer(s, { type: 'CATCH', castAt: at, now: at + biteDelay(at) + 100 });
    }
    expect(fishingLeft(s, NOW + HOUR_MS)).toBe(0);
  });
  it('F06/F07 rewards a ledger has forgotten are remembered by the server (progress_claims)', () => {
    const event = { id: 'original', type: 'present' as const, crop: 'rice' as const };
    const once = gameReducer(fresh(), { type: 'FRIEND_EVENT', event, now: NOW });
    expect(gameReducer(once, { type: 'FRIEND_EVENT', event, now: NOW })).toBe(once);
    const s = evict(once);
    // Locally the forgotten key pays again; the server refuses such a save as a replay.
    expect(gameReducer(s, { type: 'FRIEND_EVENT', event, now: NOW }).seeds.rice).toBe(
      s.seeds.rice + 1,
    );
  });
  it('F06 loot follows the cast time; the server recomputes it and refuses any other', () => {
    expect(boatCatch(NOW, 10)).toEqual(boatCatch(NOW, 10));
    expect(new Set(Array.from({ length: 200 }, (_, i) => catchFor(NOW + i * 7919))).size).toBe(2);
  });
});

describe('ordinary regression expectations', () => {
  it('rejects future/stale cast and duplicate cast while claim is retained', () => {
    const s = fresh();
    expect(gameReducer(s, { type: 'CATCH', castAt, now: castAt - 1 })).toBe(s);
    expect(gameReducer(s, { type: 'CATCH', castAt, now: castAt + FISHING.maxCastMs + 1 })).toBe(s);
    const once = gameReducer(s, { type: 'CATCH', castAt, now: afterBite });
    expect(gameReducer(once, { type: 'CATCH', castAt, now: afterBite })).toBe(once);
    expect(once.xp).toBe(s.xp + XP.catch);
  });
});
