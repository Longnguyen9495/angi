import { describe, expect, it } from 'vitest';
import { LEDGER_LIMIT, post } from './ledger';
import { createInitialProgress } from './progress';
import { transitionEntries } from './skySimMeasurement';

describe('simulator transition measurement', () => {
  it('measures multi-entry transitions past 1000 without loss or double counting, including cloned no-ops and retries', () => {
    let state = createInitialProgress(0);
    const initialCoins = state.coins;
    const initialXp = state.xp;
    let sources = 0;
    let sinks = 0;
    let xp = 0;
    let count = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 1100; i++) {
      const before = state;
      state = { ...state, ledger: state.ledger.map((entry) => ({ ...entry })) };
      post(state, `sky:test:${i}:coin`, 'coin', 3, 'sky:test', i);
      post(state, `sky:test:${i}:sink`, 'coin', -1, 'sky:test', i);
      post(state, `xp:sky:test:${i}`, 'xp', 2, 'sky:test', i);
      const entries = transitionEntries(before, state);
      expect(entries).toHaveLength(3);
      for (const entry of entries) {
        expect(seen.has(entry.key)).toBe(false);
        seen.add(entry.key);
        count++;
        if (entry.resource === 'coin' && entry.delta > 0) sources += entry.delta;
        if (entry.resource === 'coin' && entry.delta < 0) sinks -= entry.delta;
        if (entry.resource === 'xp') xp += entry.delta;
      }
      const retry = { ...state, ledger: state.ledger.map((entry) => ({ ...entry })) };
      expect(post(retry, `sky:test:${i}:coin`, 'coin', 3, 'sky:test', i)).toBe(false);
      expect(transitionEntries(state, retry)).toEqual([]);
      expect(transitionEntries(state, state)).toEqual([]);
    }
    expect(count).toBe(3300);
    expect(state.ledger).toHaveLength(LEDGER_LIMIT);
    expect(sources).toBe(3300);
    expect(sinks).toBe(1100);
    expect(xp).toBe(2200);
    expect(state.coins).toBe(initialCoins + sources - sinks);
    expect(state.xp).toBe(initialXp + xp);
  });

  it('fails closed on unmeasured balance changes or a completely replaced tail', () => {
    const state = createInitialProgress(0);
    expect(() => transitionEntries(state, { ...state, coins: state.coins + 1 })).toThrow('Unmeasured coin');
    post(state, 'old', 'coin', 1, 'test', 0);
    const next = structuredClone(state);
    next.ledger = [];
    post(next, 'new', 'coin', 1, 'test', 1);
    expect(() => transitionEntries(state, next)).toThrow('entire ledger tail');
  });
});
