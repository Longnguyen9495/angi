import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BALLOON,
  BUGS,
  EVENT_POTS,
  MACHINE_IDS,
  SKY_GOOD_PRICE,
  SKY_HELPERS,
  SKY_LEVEL,
  SKY_XP_PER_DAY,
  type BugId,
} from '../../../data/skyEconomy';
import { EVENTS } from '../../../data/game';
import type { Action } from '../../../domain/reducer';
import { level, waterLeft } from '../../../domain/selectors';
import { bugsOn, pendingChecks, skyDay } from '../../../domain/sky';
import { currentTime } from '../../../domain/time';
import { t } from '../../../i18n';
import { AccountError, skyApi, type SkyOpResult, type SkyReveal } from '../../../services/account';
import { useAccount, useFeedback, useGame, useNow, useUi } from '../../../state/hooks';
import { SkyScene } from '../SkyScene';
import {
  BalloonSheet,
  MachineSheet,
  PotSheet,
  SetsSheet,
  ShopSheet,
  SlotSheet,
  StoreSheet,
  type SkySheet,
  type SkySheetCtx,
} from './sheets';
import { buildView, machineOfFloor, machinePhase, skyDecor } from './view';
import '../sky-garden.css';
import './sky-game.css';

/*
 * Vườn Mây in the game (plans/vuon-may.md §0.3 G2–G5): the cloud tower over the farm, played
 * on the real garden. The scene draws GuestProgress.sky (controlled mode) and hands taps back;
 * every change is a game action (src/domain/skyReducer.ts), saved and checked like the farm's.
 * Bugs are revealed by the server once their check has come (skyApi.bugs), stars and tiers are
 * rolled there (serverOp). Needs an account: a guest sees a sign-in card.
 */

const BUG_POLL_MS = 15_000;

function opId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `op-${currentTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Where bugs, stars and tiers come from: the server, or the sandbox's stand-in (?game=1). */
export interface SkyServer {
  bugs: () => Promise<{ bugs: SkyReveal[] }>;
  starUp: (uid: string, clover: boolean, opId: string, base: number) => Promise<SkyOpResult>;
  tierUp: (uid: string, feed: string, opId: string, base: number) => Promise<SkyOpResult>;
}

export default function SkyGame({
  onClose,
  api = skyApi,
}: {
  onClose: () => void;
  api?: SkyServer;
}) {
  const g = t.sky.game;
  const { state, dispatch } = useGame();
  const account = useAccount();
  const { toast } = useFeedback();
  const { openAccount } = useUi();
  const [now] = useNow(2000);
  const sky = state.sky;
  const lv = level(state.xp).level;
  const signedIn = account.status === 'signed-in';
  const [sheet, setSheet] = useState<SkySheet | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [mode, setMode] = useState<{ mode: 'overview' | 'focus'; floor: number | null }>({
    mode: 'overview',
    floor: null,
  });
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bag = useRef<HTMLSpanElement>(null);
  const scene = useRef<SkyScene | null>(null);
  const stateRef = useRef(state);
  const movingRef = useRef(moving);
  useEffect(() => {
    stateRef.current = state;
    movingRef.current = moving;
  });

  const act = useCallback(
    (a: Action) => {
      const before = stateRef.current;
      dispatch(a);
      // Feedback for what the player just did (the reducer stays silent).
      if (a.type === 'SKY_OPEN_FLOOR')
        toast({ message: g.toasts.floor((before.sky?.floors ?? 0) + 1), tone: 'reward' });
      if (a.type === 'SKY_SELL') {
        const n = Math.min(a.qty, before.sky?.goods[a.good] ?? 0);
        if (n > 0)
          toast({
            message: g.toasts.sold(n * SKY_GOOD_PRICE[a.good]),
            tone: 'reward',
            duration: 1200,
          });
      }
    },
    [dispatch, g, toast],
  );

  // The scene: created once the garden is up there (not again on every change of it), fed the
  // view on every change.
  const hasSky = !!sky;

  // Festival pots of events finished before there was a cloud garden (or on another device).
  useEffect(() => {
    if (!hasSky) return;
    const s = stateRef.current;
    for (const ev of EVENTS) {
      if (!EVENT_POTS[ev.id] || s.sky?.events?.includes(ev.id)) continue;
      if (!s.events[ev.id]?.claimed.includes(ev.targets.length - 1)) continue;
      dispatch({ type: 'SKY_EVENT_POTS', event: ev.id, now: currentTime() });
      toast({ message: g.toasts.eventPots, tone: 'reward' });
    }
  }, [hasSky, dispatch, g, toast]);
  useEffect(() => {
    if (!hasSky || !canvas.current || scene.current) return;
    const s = new SkyScene(canvas.current, {
      labels: { draft: t.sky.demo.draft },
      control: {
        onSlot: (floor, slot) => {
          const mv = movingRef.current;
          if (mv) {
            dispatch({ type: 'SKY_PLACE_POT', uid: mv, floor, slot, now: currentTime() });
            setMoving(null);
            return;
          }
          setSheet({ kind: 'slot', floor, slot });
        },
        onBug: (floor, slot, stage) => {
          const uid = stateRef.current.sky?.slots[floor]?.[slot];
          const bug = uid ? stateRef.current.sky?.pots[uid]?.plant?.bugs[stage] : null;
          if (!uid) return;
          dispatch({ type: 'SKY_CATCH', uid, stage, now: currentTime() });
          if (bug)
            toast({
              message: t.sky.game.toasts.caught(t.sky.bugs[bug]),
              tone: 'reward',
              duration: 1500,
            });
        },
        onMachine: (floor) => {
          const m = machineOfFloor(floor);
          if (m) setSheet({ kind: 'machine', machine: m });
        },
      },
      onMode: (m, f) => setMode({ mode: m, floor: f }),
      bagAt: () => {
        const b = bag.current?.getBoundingClientRect();
        const h = host.current?.getBoundingClientRect();
        return b && h
          ? { x: b.left - h.left + b.width / 2, y: b.top - h.top + b.height / 2 }
          : { x: 28, y: 28 };
      },
    });
    scene.current = s;
    // The QA screenshots (scripts/sky-garden/game-shots.mjs) steer the camera through this.
    const w = window as unknown as { __skyGame?: SkyScene };
    if (import.meta.env.DEV) w.__skyGame = s;
    return () => {
      s.destroy();
      scene.current = null;
      if (w.__skyGame === s) delete w.__skyGame;
    };
  }, [hasSky, dispatch, toast]);

  const decor = useMemo(() => skyDecor(state), [state]);
  const view = useMemo(() => (sky ? buildView(sky, now, decor) : null), [sky, now, decor]);
  useEffect(() => {
    if (view) scene.current?.setView(view);
  }, [view]);

  // Bugs: ask the server for the checks that have come (it alone knows what they bring).
  useEffect(() => {
    if (!sky || !signedIn) return;
    let stop = false;
    const tick = async () => {
      const cur = stateRef.current.sky;
      const t0 = currentTime();
      const due =
        cur &&
        Object.values(cur.pots).some((p) => p.plant && pendingChecks(p.plant, t0).length > 0);
      if (!due) return;
      try {
        const r = await api.bugs();
        if (stop) return;
        setOffline(false);
        dispatch({ type: 'SKY_REVEAL', bugs: r.bugs, now: currentTime() });
      } catch (e) {
        if (!stop && e instanceof AccountError && e.status === 0) setOffline(true);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), BUG_POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [sky, signedIn, dispatch, api]);

  const onStar = useCallback(
    async (uid: string, clover: boolean) => {
      setBusy(true);
      try {
        const r = await account.serverOp((base) => api.starUp(uid, clover, opId(), base));
        if (r.result === 'success') dispatch({ type: 'SKY_STARRED', now: Date.now() });
        const stars = r.stars ?? 0;
        toast({
          message:
            r.result === 'fail'
              ? g.star.fail
              : r.jumped
                ? g.star.jumped(stars)
                : g.star.success(stars),
          tone: r.result === 'fail' ? 'info' : 'reward',
        });
      } catch (e) {
        toast({ message: e instanceof AccountError ? e.message : g.star.failed, tone: 'warning' });
      } finally {
        setBusy(false);
      }
    },
    [account, api, dispatch, g, toast],
  );

  const onTier = useCallback(
    async (uid: string, feed: string) => {
      setBusy(true);
      try {
        const r = await account.serverOp((base) => api.tierUp(uid, feed, opId(), base));
        toast({
          message: g.star.tierDone(
            t.sky.tiers[(['clay', 'porcelain', 'jade', 'gold', 'legend'] as const)[r.tier ?? 0]!],
          ),
          tone: 'reward',
        });
        setSheet(null);
      } catch (e) {
        toast({ message: e instanceof AccountError ? e.message : g.star.failed, tone: 'warning' });
      } finally {
        setBusy(false);
      }
    },
    [account, api, g, toast],
  );

  // ——— Gates ———
  if (!signedIn || lv < SKY_LEVEL || !sky) {
    return (
      <div className="sk-root sk-root--gate" role="dialog" aria-label={t.sky.name}>
        <div className="sk-gate">
          {!signedIn ? (
            <>
              <h2>{g.signIn.title}</h2>
              <p>{g.signIn.body}</p>
              <button type="button" className="sk-btn" onClick={openAccount}>
                {g.signIn.button}
              </button>
            </>
          ) : lv < SKY_LEVEL ? (
            <h2>{g.enterAt(SKY_LEVEL)}</h2>
          ) : (
            <>
              <h2>{g.welcome.title}</h2>
              <p>{g.welcome.body}</p>
              <button
                type="button"
                className="sk-btn"
                onClick={() => act({ type: 'SKY_OPEN_FLOOR', now: currentTime() })}
              >
                {g.welcome.button}
              </button>
            </>
          )}
          <button type="button" className="sk-btn sk-btn--ghost" onClick={onClose}>
            {g.down}
          </button>
        </div>
      </div>
    );
  }

  const day = skyDay(sky, now);
  const bugs = (Object.keys(sky.bugs) as BugId[]).reduce(
    (n, b) => n + (BUGS[b] ? (sky.bugs[b] ?? 0) : 0),
    0,
  );
  const ctx: SkySheetCtx = { state, sky, now, act, open: setSheet, moving, setMoving };
  const focus = mode.mode === 'focus' ? mode.floor : null;
  const ripeOnFloor =
    focus !== null &&
    (sky.slots[focus] ?? []).some((u) => {
      const p = u ? sky.pots[u]?.plant : null;
      return p && now >= p.readyAt;
    });

  // Helpers (§17.4): taps the guest could make one by one, gathered once a floor is reached.
  const helper = (id: keyof typeof SKY_HELPERS) => sky.floors >= SKY_HELPERS[id].floors;
  const ripe = (f: number) =>
    (sky.slots[f] ?? []).some((u) => {
      const p = u ? sky.pots[u]?.plant : null;
      return !!p && now >= p.readyAt;
    });
  const ripeFloors = Array.from({ length: sky.floors }, (_, f) => f).filter(ripe);
  const doneMachines = MACHINE_IDS.filter((m) => machinePhase(sky, m, now) === 'done');
  const bugFloor = Array.from({ length: sky.floors }, (_, f) => f).find((f) =>
    (sky.slots[f] ?? []).some((u) => {
      const p = u ? sky.pots[u]?.plant : null;
      return !!p && bugsOn(p).length > 0;
    }),
  );
  const helpers = {
    sparrow: helper('sparrow') && bugFloor !== undefined && focus !== bugFloor,
    bee: helper('bee') && doneMachines.length > 0,
    squirrel: helper('squirrel') && ripeFloors.length > 1,
    crane: helper('crane') && !!sky.balloon,
  };
  const batch = (actions: ((now: number) => Action)[]) => {
    const t0 = currentTime();
    actions.forEach((a, i) => act(a(t0 + i)));
  };

  return (
    <div className="sk-root sg-root" role="dialog" aria-label={t.sky.name}>
      <div className="sg-scene" ref={host}>
        <canvas ref={canvas} className="sg-canvas" aria-label={t.sky.name} />
      </div>
      <header className="sg-bar">
        <strong className="sg-bar__title">{t.sky.name}</strong>
        <span className="sg-bar__chip">{state.coins} xu</span>
        <span className="sg-bar__chip">{g.hud.xp(day.xp, SKY_XP_PER_DAY)}</span>
        <span className="sg-bar__chip" ref={bag}>
          {g.hud.bugs(bugs)}
        </span>
        <span className="sg-bar__chip">{g.hud.cans(waterLeft(state, now))}</span>
        {(sky.items.gem ?? 0) > 0 && (
          <span className="sg-bar__chip">{g.hud.gems(sky.items.gem ?? 0)}</span>
        )}
      </header>
      <p className="sg-hint" aria-live="polite">
        {moving
          ? g.slot.moveHint
          : offline
            ? g.hint.offline
            : focus === null
              ? g.hint.tower
              : g.hint.floor(focus + 1)}
      </p>
      <nav className="sk-dock">
        {focus !== null && (
          <button
            type="button"
            className="sg-btn"
            onClick={() => scene.current?.setMode('overview')}
          >
            {g.bar.tower}
          </button>
        )}
        {ripeOnFloor && (
          <button
            type="button"
            className="sg-btn"
            onClick={() => act({ type: 'SKY_HARVEST_FLOOR', floor: focus!, now: currentTime() })}
          >
            {g.bar.harvestFloor}
          </button>
        )}
        {helpers.sparrow && (
          <button
            type="button"
            className="sg-btn sg-btn--helper"
            onClick={() => scene.current?.setMode('focus', bugFloor)}
          >
            {g.helpers.sparrow(bugFloor! + 1)}
          </button>
        )}
        {helpers.bee && (
          <button
            type="button"
            className="sg-btn sg-btn--helper"
            onClick={() =>
              batch(
                doneMachines.map((machine) => (n) => ({
                  type: 'SKY_COLLECT_JOB',
                  machine,
                  now: n,
                })),
              )
            }
          >
            {g.helpers.bee(doneMachines.length)}
          </button>
        )}
        {helpers.squirrel && (
          <button
            type="button"
            className="sg-btn sg-btn--helper"
            onClick={() =>
              batch(
                ripeFloors.map((floor) => (n) => ({ type: 'SKY_HARVEST_FLOOR', floor, now: n })),
              )
            }
          >
            {g.helpers.squirrel}
          </button>
        )}
        {helpers.crane && (
          <button
            type="button"
            className="sg-btn sg-btn--helper"
            onClick={() =>
              batch(
                Array.from({ length: BALLOON.boxes }, (_, box) => (n) => ({
                  type: 'SKY_PACK_BOX',
                  box,
                  now: n,
                })),
              )
            }
          >
            {g.helpers.crane}
          </button>
        )}
        <button type="button" className="sg-btn" onClick={() => setSheet({ kind: 'store' })}>
          {g.bar.store}
        </button>
        <button type="button" className="sg-btn" onClick={() => setSheet({ kind: 'shop' })}>
          {g.bar.shop}
        </button>
        <button type="button" className="sg-btn" onClick={() => setSheet({ kind: 'sets' })}>
          {g.bar.sets}
        </button>
        {sky.floors >= 5 && (
          <button type="button" className="sg-btn" onClick={() => setSheet({ kind: 'balloon' })}>
            {g.bar.balloon}
          </button>
        )}
        <button
          type="button"
          className="sg-btn sg-btn--ghost"
          onClick={moving ? () => setMoving(null) : onClose}
        >
          {moving ? t.common.cancel : g.down}
        </button>
      </nav>

      {sheet?.kind === 'slot' && <SlotSheet ctx={ctx} floor={sheet.floor} slot={sheet.slot} />}
      {sheet?.kind === 'pot' && (
        <PotSheet ctx={ctx} uid={sheet.uid} onStar={onStar} onTier={onTier} busy={busy} />
      )}
      {sheet?.kind === 'machine' && <MachineSheet ctx={ctx} machine={sheet.machine} />}
      {sheet?.kind === 'store' && <StoreSheet ctx={ctx} />}
      {sheet?.kind === 'shop' && <ShopSheet ctx={ctx} level={lv} />}
      {sheet?.kind === 'sets' && <SetsSheet ctx={ctx} />}
      {sheet?.kind === 'balloon' && <BalloonSheet ctx={ctx} />}
    </div>
  );
}
