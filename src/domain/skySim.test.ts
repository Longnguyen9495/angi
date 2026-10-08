import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { xpForLevel } from '../data/game';
import { FLOORS } from '../data/skyEconomy';
import { simulate, SESSIONS, FARM_XP_PER_DAY, FARM_COINS_PER_DAY } from './skySimHarness';

describe('Vườn Mây 90-day simulation', () => {
  // 90 days take minutes: the full season with `npm run sky:sim`, three weeks in `npm test`.
  const DAYS = Number(process.env.SIM_DAYS ?? (process.env.SIM_REPORT ? 90 : 21));
  const { rows, end, resourceFlows } = simulate(DAYS, 20261008);
  if (process.env.SIM_REPORT) {
    // A file as well as the console: the runner may swallow a test's console output.
    const shown = rows;
    const head = Object.keys(shown[0]!).join('\t');
    const opened = FLOORS.map((_, i) => rows.find((r) => r.floors > i)?.day ?? '—').join(' / ');
    const report = [
      head,
      ...shown.map((r) => Object.values(r).join('\t')),
      '',
      `floors opened on day: ${opened}`,
      `pots: ${Object.keys(end.sky?.pots ?? {}).length}`,
    ].join('\n');
    mkdirSync('storage/sky-garden-qa', { recursive: true });
    const prefix = `storage/sky-garden-qa/sim-${DAYS}-b02`;
    writeFileSync(`${prefix}.txt`, report + '\n');
    writeFileSync(`${prefix}.json`, JSON.stringify({
      measurement: 'transition-key-difference-v1', days: DAYS, seed: 20261008,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, requestedTimezone: process.env.TZ, sessions: SESSIONS,
      farmXpPerDay: FARM_XP_PER_DAY, farmCoinsPerDay: FARM_COINS_PER_DAY,
      initialCoins: 800, initialXp: xpForLevel(12), rows, resourceFlows,
      floorsOpened: FLOORS.map((_, i) => rows.find((r) => r.floors > i)?.day ?? null),
      reconciliation: 'every transition coin/xp and touched non-pot/non-stamp resources; every day coin/xp passed',
      failedFloorAttemptsDefinition: 'SKY_OPEN_FLOOR returned unchanged state; not a proven soft-lock',
      final: { coins: end.coins, xp: end.xp, ledgerLength: end.ledger.length },
    }, null, 2) + '\n');
    console.log(report);
  }

  it('opens floors 1–3 in the first days, without friends or rare bugs (§0.4)', () => {
    expect(rows[0]!.floors).toBeGreaterThanOrEqual(1);
    const third = rows.find((r) => r.floors >= 3);
    expect(third).toBeDefined();
    expect(third!.day).toBeLessThanOrEqual(10);
  });

  it.runIf(DAYS >= 90)('keeps climbing: floor 5 (the balloon) within the season', () => {
    expect(rows.at(-1)!.floors).toBeGreaterThanOrEqual(5);
  });

  it('never gets stuck after the tutorial: floor 4 within three weeks', () => {
    expect(rows.find((r) => r.floors >= 4)?.day ?? Infinity).toBeLessThanOrEqual(21);
  });

  it('holds sky XP to the daily cap and coins from the sky to a modest income', () => {
    for (const r of rows) expect(r.skyXp).toBeLessThanOrEqual(150);
    const late = rows.slice(-14);
    const avg = late.reduce((n, r) => n + r.skyCoins, 0) / late.length;
    // Gross coins in (before seeds, slots and pots): well under a day of the farm below × 10.
    expect(avg).toBeLessThan(FARM_COINS_PER_DAY * 10);
  });
});
