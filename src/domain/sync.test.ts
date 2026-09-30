import { describe, expect, it } from 'vitest';
import { maskEmail } from '../services/account';
import { fitWithin } from '../services/photoStore';
import { createInitialProgress, type GuestProgress } from './progress';
import { gameReducer } from './reducer';
import { reconcile } from './sync';

const NOON = new Date(2026, 8, 29, 12, 0, 0).getTime();

/** A guest who chose a dish and checked in: a journey worth keeping. */
function played(outcome: 'ate' | 'skipped' = 'ate'): GuestProgress {
  let s = createInitialProgress(NOON);
  s = gameReducer(s, { type: 'CHOOSE_DISH', dishId: 'com-tam', now: NOON });
  return gameReducer(s, { type: 'CHECK_IN', outcome, rating: 5, again: 'yes', now: NOON + 1 });
}

describe('account sync decisions', () => {
  const fresh = createInitialProgress(NOON);
  it('pushes when the account is empty and pulls onto an empty device', () => {
    expect(reconcile(played(), null)).toEqual({ kind: 'push' });
    expect(reconcile(fresh, played())).toEqual({ kind: 'pull' });
    expect(reconcile(played(), fresh)).toEqual({ kind: 'push' });
  });

  it('follows the same journey forward, and asks when two journeys meet', () => {
    const a = played();
    const ahead = gameReducer(a, { type: 'PLANT_MEAL_SEED', now: NOON + 2 });
    expect(reconcile(a, a)).toEqual({ kind: 'same' });
    expect(reconcile(ahead, a)).toEqual({ kind: 'push' });
    expect(reconcile(a, ahead)).toEqual({ kind: 'pull' });
    const other = { ...played(), guestId: 'someone-else' };
    expect(reconcile(a, other)).toEqual({ kind: 'ask' });
  });
});

describe('check-in photos', () => {
  it('pay 5 XP once per eaten meal, and never for a skipped one', () => {
    const s = played();
    const slot = s.history[0]!.slotKey;
    const s1 = gameReducer(s, { type: 'ATTACH_PHOTO', slotKey: slot, now: NOON + 5 });
    expect(s1.xp).toBe(s.xp + 5);
    expect(s1.photos).toEqual([slot]);
    expect(gameReducer(s1, { type: 'ATTACH_PHOTO', slotKey: slot, now: NOON + 6 })).toBe(s1);
    // Removing keeps the XP; attaching again can't pay twice (ledger key is spent).
    const s2 = gameReducer(s1, { type: 'REMOVE_PHOTO', slotKey: slot });
    const s3 = gameReducer(s2, { type: 'ATTACH_PHOTO', slotKey: slot, now: NOON + 7 });
    expect(s2.xp).toBe(s1.xp);
    expect(s3.xp).toBe(s1.xp);

    const skipped = played('skipped');
    const k = skipped.history[0]!.slotKey;
    expect(gameReducer(skipped, { type: 'ATTACH_PHOTO', slotKey: k, now: NOON + 5 })).toBe(skipped);
  });

  it('are shrunk to 1080 px on the long edge, never enlarged', () => {
    expect(fitWithin(4032, 3024)).toEqual({ w: 1080, h: 810 });
    expect(fitWithin(3024, 4032)).toEqual({ w: 810, h: 1080 });
    expect(fitWithin(640, 480)).toEqual({ w: 640, h: 480 });
  });
});

describe('maskEmail', () => {
  it('keeps the domain and hides most of the name', () => {
    expect(maskEmail('khach@example.vn')).toBe('kh•••@example.vn');
    expect(maskEmail('ab@x.vn')).toBe('a•@x.vn');
  });
});
