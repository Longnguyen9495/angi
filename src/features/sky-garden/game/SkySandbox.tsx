import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { xpForLevel } from '../../../data/game';
import {
  BUGS,
  BUG_IDS,
  BUG_ROLL,
  FLOORS,
  STAR_LUCK,
  STAR_STEPS,
  type BugId,
} from '../../../data/skyEconomy';
import type { PotId } from '../../../data/skyGarden';
import { createInitialProgress, type GuestProgress } from '../../../domain/progress';
import { gameReducer, type Action } from '../../../domain/reducer';
import { pendingChecks } from '../../../domain/sky';
import {
  AccountContext,
  FeedbackContext,
  GameContext,
  UiContext,
  type AccountContextValue,
  type ToastInput,
} from '../../../state/context';
import type { SkyOpResult, SkyReveal } from '../../../services/account';
import SkyGame, { type SkyServer } from './SkyGame';

/*
 * /sky-garden-test?game=1 — the real Vườn Mây game (SkyGame, the reducer, the sheets) on a
 * made-up garden kept in this tab only, with the server stood in for: bugs rolled here, stars
 * and tiers too. For trying the game and for screenshots without an account or an API;
 * nothing is saved anywhere. `&preset=rich` starts five floors up with pots and goods.
 */

const NOW = () => Date.now();

function start(preset: string | null): GuestProgress {
  const now = NOW();
  let p: GuestProgress = { ...createInitialProgress(now), xp: xpForLevel(29), coins: 12000 };
  p = { ...p, ingredients: { ...p.ingredients, honey: 6, milk: 4 } };
  if (preset !== 'rich') return p;
  // Five floors, every shop pot placed, goods and bugs in the store.
  const run = (a: Action) => (p = gameReducer(p, a));
  run({ type: 'SKY_OPEN_FLOOR', now });
  for (let n = 2; n <= 5; n++) {
    const f = FLOORS[n - 1]!;
    p = {
      ...p,
      sky: { ...p.sky!, items: { ...p.sky!.items, cloudseed: f.cloudseed, dew: f.dew } },
    };
    run({ type: 'SKY_OPEN_FLOOR', now: now + n });
  }
  p = { ...p, coins: 50000, sky: { ...p.sky!, items: { ...p.sky!.items, gem: 40 } } };
  const buy: PotId[] = [
    'pumpkin',
    'corn',
    'cabbage',
    'eggplant',
    'watermelon',
    'red_apple',
    'coconut',
    'crab',
    'porcelain_fish',
    'seashell',
  ];
  buy.forEach((pot, i) => run({ type: 'SKY_BUY_POT', pot, now: now + 10 + i }));
  const uids = Object.keys(p.sky!.pots);
  uids.forEach((uid, i) => {
    const floor = Math.floor(i / 3);
    for (let k = 0; k < 3 && (p.sky!.bought[floor] ?? 0) < 3 && floor < 5; k++)
      run({ type: 'SKY_BUY_SLOT', floor, now: now + 100 + i * 3 + k });
    if (floor < 5) run({ type: 'SKY_PLACE_POT', uid, floor, slot: i % 6, now: now + 200 + i });
  });
  for (const [i, uid] of uids.entries()) {
    run({ type: 'SKY_BUY_SEED', crop: i % 2 ? 'kumquat' : 'jasmine', now: now + 300 + i });
    run({
      type: 'SKY_PLANT',
      uid,
      seed: { kind: 'sky', id: i % 2 ? 'kumquat' : 'jasmine' },
      now: now - (i % 3) * 40 * 60_000,
    });
  }
  return {
    ...p,
    sky: {
      ...p.sky!,
      bugs: { ladybug: 12, bee: 6, butterfly: 3, goldbeetle: 1 },
      goods: { jasmine_bud: 9, kumquat: 6, rose: 4, lotus_seed: 3 },
    },
  };
}

/** Same draw as the server (minus its key): a stand-in for the sandbox only. */
function roll(): BugId | null {
  if (Math.random() * 10000 >= BUG_ROLL.baseBp + 1500) return null;
  const total = BUG_IDS.reduce((n, b) => n + BUGS[b].weight, 0);
  let x = Math.random() * total;
  for (const b of BUG_IDS) {
    x -= BUGS[b].weight;
    if (x < 0) return b;
  }
  return 'ladybug';
}

export function SkySandbox() {
  const params = new URLSearchParams(window.location.search);
  const [state, dispatch] = useReducer(gameReducer, params.get('preset'), start);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [toasts, setToasts] = useState<string[]>([]);
  const toast = useCallback((x: ToastInput) => {
    setToasts((l) => [...l.slice(-2), x.message]);
    window.setTimeout(() => setToasts((l) => l.slice(1)), x.duration ?? 2500);
  }, []);

  const api = useMemo<SkyServer>(
    () => ({
      bugs: async () => {
        const sky = stateRef.current.sky;
        const out: SkyReveal[] = [];
        for (const p of Object.values(sky?.pots ?? {})) {
          if (!p.plant) continue;
          for (const stage of pendingChecks(p.plant, NOW())) {
            const first = sky?.firstPot === p.uid && p.plant.cycle === 0 && stage === 0;
            out.push({ uid: p.uid, cycle: p.plant.cycle, stage, bug: first ? 'ladybug' : roll() });
          }
        }
        return { bugs: out };
      },
      starUp: async (uid, clover) => {
        const data = structuredClone(stateRef.current);
        const sky = data.sky!;
        const pot = sky.pots[uid]!;
        const step = STAR_STEPS[pot.stars]!;
        const ok =
          pot.tries + 1 >= STAR_LUCK.sureTry ||
          Math.random() * 10000 < step.rateBp + pot.luck + (clover ? STAR_LUCK.cloverBp : 0);
        const take = (cls: string, n: number) => {
          for (const b of BUG_IDS.filter((x) => BUGS[x].cls === cls)) {
            const k = Math.min(n, sky.bugs[b] ?? 0);
            sky.bugs[b] = (sky.bugs[b] ?? 0) - k;
            n -= k;
          }
        };
        const half = (n: number) => (ok ? n : Math.ceil(n / 2));
        take('common', half(step.common));
        take('rare', half(step.rare));
        take('firefly', half(step.firefly));
        if (ok) {
          data.coins -= step.coins;
          pot.stars += 1;
          pot.luck = 0;
          pot.tries = 0;
        } else {
          pot.luck += STAR_LUCK.failBp;
          pot.tries += 1;
        }
        return {
          result: ok ? 'success' : 'fail',
          stars: pot.stars,
          data,
          version: 0,
        } satisfies SkyOpResult;
      },
      tierUp: async (uid, feed) => {
        const data = structuredClone(stateRef.current);
        const sky = data.sky!;
        const pot = sky.pots[uid]!;
        delete sky.pots[feed];
        sky.slots = sky.slots.map((r) => r.map((u) => (u === feed ? null : u)));
        sky.bugs.goldbeetle = (sky.bugs.goldbeetle ?? 0) - 1;
        pot.tier = Math.min(4, pot.tier + 1) as typeof pot.tier;
        pot.stars = 0;
        return { result: 'success', tier: pot.tier, data, version: 0 } satisfies SkyOpResult;
      },
    }),
    [],
  );

  const account = useMemo(
    () =>
      ({
        status: 'signed-in',
        user: null,
        sync: 'idle',
        lastSyncAt: null,
        conflict: null,
        resolveConflict: async () => {},
        linkConfirm: null,
        answerLink: async () => {},
        signedIn: async () => {},
        logout: async () => {},
        deleteAccount: async () => {},
        setMarketing: async () => {},
        checkInbox: async () => {},
        farmBan: null,
        friends: null,
        refreshFriends: async () => {},
        serverOp: async (run) => {
          const r = await run(0);
          dispatch({ type: 'LOAD_PROGRESS', progress: r.data as GuestProgress });
          return r;
        },
      }) as AccountContextValue,
    [],
  );

  const game = useMemo(
    () => ({
      state,
      dispatch,
      reduced: false,
      quality: 'high' as const,
      now: NOW(),
      recoveryNotice: null,
      restored: true,
    }),
    [state],
  );
  const ui = useMemo(
    () => ({
      openCheckIn: () => {},
      openProfile: () => {},
      focusSection: () => {},
      spinForSeed: () => {},
      openAccount: () => {},
    }),
    [],
  );

  return (
    <GameContext.Provider value={game}>
      <FeedbackContext.Provider value={{ toast, announce: () => {} }}>
        <UiContext.Provider value={ui}>
          <AccountContext.Provider value={account}>
            <SkyGame onClose={() => window.location.assign('/sky-garden-test')} api={api} />
            <div className="sk-toasts" aria-live="polite">
              {toasts.map((m, i) => (
                <p key={`${i}-${m}`}>{m}</p>
              ))}
            </div>
          </AccountContext.Provider>
        </UiContext.Provider>
      </FeedbackContext.Provider>
    </GameContext.Provider>
  );
}
