import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { xpForLevel } from '../data/game';
import { BUGS, BUG_IDS, BUG_ROLL, type BugId } from '../data/skyEconomy';
import { post } from './ledger';
import { createInitialProgress, type GuestProgress } from './progress';
import { gameReducer, type Action } from './reducer';
import { bugCheckAt, plantGrowMs, type SkyPlant } from './sky';

/*
 * Vườn Mây through the server's save guard (ProgressGuard.php + SkyGuard.php): a bot plays the
 * tutorial up to floor 3 and on (bugs revealed with the same key the server uses), saving as it
 * goes, and every save must pass; then forged saves must each be refused for their reason.
 */

const T0 = new Date(2026, 9, 8, 8, 0).getTime();
const MIN = 60_000;
const SECRET = 'sky-test-secret';
const USER = 1;

/** Same as SkyRules::rollBug (offset 0: the test's device clock is the server's). */
function rollBug(
  uid: string,
  cycle: number,
  stage: number,
  bugBp: number,
  at: number,
  tutorial: boolean,
): BugId | null {
  if (tutorial && cycle === 0 && stage === 0) return 'ladybug';
  const h = createHmac('sha256', SECRET).update(`${USER}|${uid}|${cycle}|${stage}`).digest('hex');
  const u1 = parseInt(h.slice(0, 8), 16) / 4294967296;
  const u2 = parseInt(h.slice(8, 16), 16) / 4294967296;
  const p = Math.min(BUG_ROLL.capBp, BUG_ROLL.baseBp + bugBp) / 10000;
  if (u1 >= p) return null;
  const total = BUG_IDS.reduce((n, b) => n + BUGS[b].weight, 0);
  let acc = 0;
  let pick: BugId = BUG_IDS[0]!;
  for (const b of BUG_IDS) {
    acc += BUGS[b].weight;
    if (u2 * total < acc) {
      pick = b;
      break;
    }
  }
  const hour = new Date(at + 7 * 3_600_000).getUTCHours();
  if (BUGS[pick].night && !(hour >= 18 || hour < 6)) return 'ladybug';
  return pick;
}

interface Step {
  clientNow: number;
  data: GuestProgress;
}

function play() {
  let s: GuestProgress = {
    ...createInitialProgress(T0),
    guestId: 'sky-bot-0001',
    xp: xpForLevel(19),
    coins: 6000,
  };
  s = { ...s, ingredients: { ...s.ingredients, honey: 0 } };
  const steps: Step[] = [{ clientNow: T0, data: structuredClone(s) }];
  let clock = T0;
  const act = (a: Action) => (s = gameReducer(s, a));
  const at = () => (clock += 1000);
  const save = () => steps.push({ clientNow: (clock += 5000), data: structuredClone(s) });
  /** Reveals every due check the way GET /account/sky/bugs does, then catches what came. */
  const bugs = () => {
    const sky = s.sky!;
    const reveals = Object.values(sky.pots).flatMap((p) => {
      const pl = p.plant as SkyPlant | null;
      if (!pl) return [];
      return [0, 1, 2]
        .filter((i) => pl.bugs[i] === undefined && clock >= bugCheckAt(pl, i) && clock < pl.readyAt)
        .map((stage) => ({
          uid: p.uid,
          cycle: pl.cycle,
          stage,
          bug: rollBug(
            p.uid,
            pl.cycle,
            stage,
            pl.stats.bug,
            bugCheckAt(pl, stage),
            sky.firstPot === p.uid,
          ),
        }));
    });
    act({ type: 'SKY_REVEAL', bugs: reveals, now: at() });
    for (const r of reveals)
      if (r.bug) act({ type: 'SKY_CATCH', uid: r.uid, stage: r.stage, now: at() });
  };
  const plantAll = (crop: 'jasmine' | 'mint' | 'kumquat' | 'lotus' | 'rose') => {
    for (const uid of s.sky!.slots.flat()) {
      if (!uid || s.sky!.pots[uid]!.plant) continue;
      if ((s.sky!.seeds[crop] ?? 0) <= 0) act({ type: 'SKY_BUY_SEED', crop, now: at() });
      act({ type: 'SKY_PLANT', uid, seed: { kind: 'sky', id: crop }, now: at() });
    }
  };
  const growAndPick = () => {
    const plants = Object.values(s.sky!.pots).flatMap((p) => (p.plant ? [p.plant] : []));
    for (const stage of [0, 1, 2]) {
      const t = Math.max(...plants.map((p) => bugCheckAt(p, stage)));
      if (t > clock) clock = t + 1000;
      bugs();
      save();
    }
    clock = Math.max(clock, ...plants.map((p) => p.readyAt)) + 2000;
    for (let f = 0; f < s.sky!.floors; f++) act({ type: 'SKY_HARVEST_FLOOR', floor: f, now: at() });
    save();
  };

  // Floor 1, the starter pots on the shelf, the tutorial jasmine.
  act({ type: 'SKY_OPEN_FLOOR', now: at() });
  Object.keys(s.sky!.pots).forEach((uid, i) =>
    act({ type: 'SKY_PLACE_POT', uid, floor: 0, slot: i, now: at() }),
  );
  plantAll('jasmine');
  save();
  growAndPick();
  // Floor 2, dried jasmine (dew, honey), MIX01, floor 3.
  act({ type: 'SKY_OPEN_FLOOR', now: at() });
  save();
  for (const recipe of ['dried_jasmine', 'dried_jasmine', 'jasmine_honey_tea'] as const) {
    if (recipe === 'dried_jasmine' && (s.sky!.goods.jasmine_bud ?? 0) < 3) {
      plantAll('jasmine');
      save();
      growAndPick();
    }
    act({ type: 'SKY_START_JOB', machine: 'tea', recipe, now: at() });
    save();
    clock += (recipe === 'jasmine_honey_tea' ? 41 : 21) * MIN;
    act({ type: 'SKY_COLLECT_JOB', machine: 'tea', now: at() });
    save();
  }
  act({ type: 'SKY_OPEN_FLOOR', now: at() });
  // A slot, a pot from the shop, roses, a sale.
  act({ type: 'SKY_BUY_SLOT', floor: 0, now: at() });
  act({ type: 'SKY_BUY_POT', pot: 'pumpkin', now: at() });
  const pumpkin = Object.values(s.sky!.pots).find(
    (p) => p.pot === 'pumpkin' && !s.sky!.slots.flat().includes(p.uid),
  )!;
  act({ type: 'SKY_PLACE_POT', uid: pumpkin.uid, floor: 1, slot: 0, now: at() });
  save();
  plantAll('rose');
  save();
  growAndPick();
  act({ type: 'SKY_SELL', good: 'rose', qty: 2, now: at() });
  save();
  return { steps, last: s, lastAt: clock };
}

function forged(last: GuestProgress, at: number) {
  const out: { name: string; code: string; clientNow: number; data: GuestProgress }[] = [];
  const add = (name: string, data: GuestProgress, code: string) =>
    out.push({ name, code, clientNow: at + 60_000, data });
  const t = at + 30_000;
  const uid = last.sky!.slots[0]![0]!;
  {
    const d = structuredClone(last);
    d.sky!.pots[uid]!.stars = 3;
    add('a pot given stars by the client', d, 'rule');
  }
  {
    const d = structuredClone(last);
    d.sky!.goods = { ...d.sky!.goods, jasmine_bud: (d.sky!.goods.jasmine_bud ?? 0) + 50 };
    add('sky goods out of nowhere', d, 'balance');
  }
  {
    const d = structuredClone(last);
    post(d, `sky:harvest:${uid}:999:0`, 'skygood:jasmine_bud', 3, 'x', t);
    add('a harvest of a planting never made', d, 'rule');
  }
  {
    const d = structuredClone(last);
    post(d, `sky:bug:${uid}:0:2`, 'bug:goldbeetle', 1, 'x', t);
    add('a gold beetle the check did not bring', d, 'rule');
  }
  {
    const d = structuredClone(last);
    d.sky!.floors = 4;
    d.sky!.slots.push([null, null, null, null, null, null]);
    d.sky!.bought.push(0);
    add('a floor opened without paying', d, 'rule');
  }
  {
    const d = structuredClone(last);
    post(d, `sky:star:${uid}:1`, 'coin', 0, 'x', t);
    add('a star entry made by the client', d, 'rule');
  }
  {
    const d = structuredClone(last);
    post(d, `sky:job:tea:${t}:out`, 'skygood:jasmine_honey_tea', 1, 'x', t);
    add('a machine product without its job', d, 'rule');
  }
  {
    const d = structuredClone(last);
    const free = Object.values(d.sky!.pots).find(
      (p) => !p.plant && d.sky!.slots.flat().includes(p.uid),
    );
    if (free) {
      d.sky!.seeds = { ...d.sky!.seeds, jasmine: (d.sky!.seeds.jasmine ?? 0) + 1 };
      post(d, `sky:seed:jasmine:${t}:pay`, 'coin', -15, 'x', t);
      post(d, `sky:seed:jasmine:${t}`, 'skyseed:jasmine', 1, 'x', t);
      d.sky!.seeds = { ...d.sky!.seeds, jasmine: (d.sky!.seeds.jasmine ?? 0) - 1 };
      const g = gameReducer(d, {
        type: 'SKY_PLANT',
        uid: free.uid,
        seed: { kind: 'sky', id: 'jasmine' },
        now: t + 1000,
      });
      const pl = g.sky!.pots[free.uid]!.plant!;
      pl.stats = { ...pl.stats, time: 5000 };
      pl.readyAt = pl.plantedAt + plantGrowMs(pl.seed, pl.stats);
      add('a planting that claims more time bonus than its pot', g, 'rule');
    }
  }
  return out;
}

function phpBinary(): string | null {
  for (const bin of [process.env.PHP_BIN, 'C:/xampp/php/php.exe', 'php'].filter(
    Boolean,
  ) as string[]) {
    if (bin.includes('/') && !existsSync(bin)) continue;
    if (spawnSync(bin, ['-v'], { encoding: 'utf8' }).status === 0) return bin;
  }
  return null;
}

const php = phpBinary();

describe('Vườn Mây save guard (SkyGuard.php)', () => {
  it.skipIf(!php)('accepts honest sky play and refuses each forged save for its reason', () => {
    const { steps, last, lastAt } = play();
    // The bot really went through the tutorial and up to floor 3.
    expect(last.sky!.floors).toBe(3);
    expect(last.sky!.tutorial).toEqual(
      expect.arrayContaining(['place', 'harvest', 'bug', 'dried', 'floor2', 'mix01']),
    );
    expect(Object.keys(last.sky!.bugs).length).toBeGreaterThan(0);
    const cheats = forged(last, lastAt);
    const dir = mkdtempSync(join(tmpdir(), 'sky-guard-'));
    const file = join(dir, 'fixture.json');
    writeFileSync(
      file,
      JSON.stringify({ steps, cheats, parity: { casts: [], boats: [], bites: [], xp: [] } }),
    );
    try {
      const r = spawnSync(php!, [resolve('server/bin/selftest-guard.php'), file], {
        encoding: 'utf8',
        env: { ...process.env, SKY_SECRET: SECRET },
      });
      const out = `${r.stdout}${r.stderr}`;
      expect(out, out).toMatch(/SUMMARY passed=\d+ failed=0/);
      // Every save and every forgery was really checked.
      expect(out).toContain(`honest saves: ${steps.length}`);
      expect(out).toContain(`forged saves: ${cheats.length}`);
      expect(cheats.length).toBeGreaterThanOrEqual(8);
      if (process.env.SKY_GUARD_LOG) console.log(out, steps.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
