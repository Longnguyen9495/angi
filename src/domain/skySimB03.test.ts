import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SIM_PROFILES, SIM_SEEDS, quantiles, validateSimConfig, type SimProfile } from './skySimConfig';
import { simulate } from './skySimHarness';

 describe('B03 configuration and measurement', () => {
  it('keeps explicit 1/3/6 schedules and next-day wrap', () => {
    expect(Object.values(SIM_PROFILES).map((s) => s.length)).toEqual([1, 3, 6]);
    expect(SIM_PROFILES.three).toEqual([8, 13, 21]);
    for (const sessions of Object.values(SIM_PROFILES)) {
      validateSimConfig(90, SIM_SEEDS[0], sessions);
      const gaps = sessions.map((hour, i) => (sessions[i + 1] ?? sessions[0]! + 24) - hour);
      expect(gaps.every((gap) => gap > 0)).toBe(true);
      expect(gaps.reduce((a, b) => a + b, 0)).toBe(24);
    }
  });
  it('rejects malformed configs', () => {
    for (const hours of [[], [8, 8], [21, 8], [-1], [24], [8.5]]) expect(() => validateSimConfig(90, 1, hours)).toThrow();
    expect(() => validateSimConfig(0, 1, [8])).toThrow();
    expect(() => validateSimConfig(90, NaN, [8])).toThrow();
  });
  it('reports nearest-rank quantiles without hiding unreached floors', () => {
    expect(quantiles([27, 28, null])).toEqual({ samples: 3, reached: 2, p10: 27, p50: 28, p90: null });
    expect(quantiles([3, 1, 2]).p50).toBe(2);
    expect(quantiles([null, null, null]).p10).toBeNull();
    expect(() => quantiles([])).toThrow();
  });
});

if (process.env.SIM_B03 === '1') {
  const profile = process.env.SIM_PROFILE as SimProfile;
  const sessions = SIM_PROFILES[profile];
  if (!sessions) throw new Error('Unknown B03 profile');
  const seed = Number(process.env.SIM_SEED);
  const days = Number(process.env.SIM_DAYS ?? 90);
  const result = simulate(days, seed, sessions);
  const { rows, end, resourceFlows } = result;
  const report = {
    measurement: 'transition-key-difference-v1', profile, seed, days, sessions,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    farmXpPerDay: 260, farmCoinsPerDay: 220, initialCoins: 800, initialLevel: 12,
    rows, resourceFlows,
    floorsOpened: Array.from({ length: 10 }, (_, i) => rows.find((r) => r.floors > i)?.day ?? null),
    inventory: { coins: end.coins, xp: end.xp, ingredients: end.ingredients, seeds: end.sky?.seeds, goods: end.sky?.goods, bugs: end.sky?.bugs, items: end.sky?.items, pots: Object.keys(end.sky?.pots ?? {}).length },
  };
  const prefix = `storage/sky-garden-qa/b03/${profile}-${seed}`;
  mkdirSync('storage/sky-garden-qa/b03', { recursive: true });
  describe('B03 real reducer case', () => {
    it('keeps existing progression and income guard rails', () => {
      expect(rows[0]!.floors).toBeGreaterThanOrEqual(1);
      expect(rows.find((r) => r.floors >= 3)?.day ?? Infinity).toBeLessThanOrEqual(10);
      expect(rows.find((r) => r.floors >= 4)?.day ?? Infinity).toBeLessThanOrEqual(21);
      if (days >= 90) expect(rows.at(-1)!.floors).toBeGreaterThanOrEqual(5);
      for (const r of rows) expect(r.skyXp).toBeLessThanOrEqual(150);
      const late = rows.slice(-14);
      expect(late.reduce((n, r) => n + r.skyCoins, 0) / late.length).toBeLessThan(2200);
    });
    it('matches baseline or independent repeated case exactly', () => {
      if (process.env.SIM_REPEAT === '1') expect(report).toEqual(JSON.parse(readFileSync(`${prefix}.json`, 'utf8')));
      if (profile === 'three' && seed === 20261008 && days === 90) {
        const baseline = JSON.parse(readFileSync('storage/sky-garden-qa/sim-90-b02.json', 'utf8'));
        expect(rows).toEqual(baseline.rows);
        expect(resourceFlows).toEqual(baseline.resourceFlows);
      }
    });
  });
  writeFileSync(`${prefix}${process.env.SIM_REPEAT === '1' ? '-repeat' : ''}.json`, JSON.stringify(report, null, 2) + '\n');
}
