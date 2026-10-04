import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react';
import { level } from '../../domain/selectors';
import { slotKey, currentTime } from '../../domain/time';
import { confirmCommand, isAbortError } from '../../services/mockApi';
import { useFeedback, useGame } from '../../state/hooks';
import { AboutPanel, BootScreen, SavedPanel } from './components/InfoPanels';
import { ExperienceHeader } from './components/ExperienceHeader';
import { IngredientOrbit, IngredientRail } from './components/IngredientOrbit';
import { ReelScene } from './components/ReelScene';
import { SelectedDishOverlay } from './components/SelectedDishOverlay';
import { SceneCounter, SpinControl } from './components/SpinControl';
import { PoolPicker, PoolSwitch } from './components/SpinPool';
import { SplitLines } from './components/SplitLines';
import {
  CATALOGUE_VIEW,
  createReelView,
  getReelDish,
  getReelDishBySlug,
  poolDishes,
  reelCount,
} from './data/reelCatalogue';
import { layoutFor } from './engine/layout';
import { mod, randomSeed } from './engine/spin';
import type { ReelEvent, ReelState } from './foodReel.types';
import { foodReelReducer, initialReelState } from './foodReelReducer';
import { setPageMeta } from './pageMeta';
import { isBusy, isDetailPhase, isInteractive } from './foodReelMachine';
import { preloadGradually, preloadImage, useAssetPreloader } from './hooks/useAssetPreloader';
import { usePointerParallax } from './hooks/usePointerParallax';
import { useReelMotionPrefs } from './hooks/useReducedMotion';
import { useReelPhysics } from './hooks/useReelPhysics';
import { useReelPrefs } from './hooks/useReelPrefs';
import type { Route } from './hooks/useRoute';
import { useSound } from './hooks/useSound';
import { useCanHover, useViewport } from './hooks/useViewport';
import { CROPS } from '../../data/game';
import type { CropId } from '../../data/types';
import { dishIdsForSeed } from '../../domain/nextStep';
import { BRAND, t } from '../../i18n';

// Story and epilogue load after the reel is on screen (preloaded when idle).
const loadStory = () => import('./components/FoodStory');
const loadEpilogue = () => import('./components/ChosenEpilogue');

const UNLOCK_MS = 700;
const ORBIT_DWELL_MS = 180;
const DRAG_THRESHOLD = 6;

interface FoodReelExperienceProps {
  route: Route;
  navigate: (r: Route, opts?: { replace?: boolean }) => void;
  back: (fallback: Route) => void;
  onOpenJourney: () => void;
  onOpenProfile: () => void;
  /** Pauses the reel loop while another full-screen layer covers it. */
  covered: boolean;
  /** Journey asked for a spin over the dishes that grant this seed. */
  spinRequest?: { crop: CropId; nonce: number } | null;
}

export function FoodReelExperience({
  route,
  navigate,
  back,
  onOpenJourney,
  onOpenProfile,
  covered,
  spinRequest = null,
}: FoodReelExperienceProps) {
  const { state: game, dispatch: gameDispatch } = useGame();
  const { announce } = useFeedback();
  const { reduced, saveData } = useReelMotionPrefs();
  const { prefs, update, toggleSaved, togglePool } = useReelPrefs();
  const viewport = useViewport();
  const canHover = useCanHover();
  const layout = useMemo(
    () => layoutFor(viewport.width, viewport.height, saveData),
    [viewport.width, viewport.height, saveData],
  );
  const sound = useSound(prefs.sound);

  const [initialIndex] = useState(() => {
    if (route.name === 'dish') {
      const d = getReelDishBySlug(route.slug);
      if (d) return d.index;
    }
    return prefs.lastIndex;
  });
  // ——— Rổ quay: spin over the whole catalogue or only the guest's shortlist ———
  // The list persists per device; the mode does not, so a visit always opens on the full reel.
  // Dishes knocked out with "Loại & quay tiếp" stay out for this visit only.
  // A crop scope is a temporary shortlist opened from the Journey ("món cho hạt ớt").
  const [scope, setScope] = useState<'all' | 'pool' | CropId>('all');
  const [excluded, setExcluded] = useState<string[]>([]);
  const poolSize = poolDishes(prefs.pool).length;
  const scopeIds = useMemo(
    () => (scope === 'all' ? null : scope === 'pool' ? prefs.pool : dishIdsForSeed(scope)),
    [scope, prefs.pool],
  );
  const view = useMemo(
    () =>
      scopeIds ? createReelView(scopeIds.filter((id) => !excluded.includes(id))) : CATALOGUE_VIEW,
    [scopeIds, excluded],
  );
  const cropScope = scope !== 'all' && scope !== 'pool' && view.pooled ? scope : null;
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  const [picker, setPicker] = useState(false);
  // Bumped to spin once the reducer has picked up a new view (see the effect below).
  const [spinNonce, setSpinNonce] = useState(0);
  // The reducer closes over the view, so a SPIN always plans over what is on screen.
  const sceneReducer = useCallback(
    (s: ReelState, e: ReelEvent) => foodReelReducer(s, e, view),
    [view],
  );
  const [scene, send] = useReducer(sceneReducer, initialIndex, initialReelState);
  const [center, setCenter] = useState(initialIndex);
  const centerAt = useRef(0);
  const [hoverCentre, setHoverCentre] = useState(false);
  const [orbitKeep, setOrbitKeep] = useState(false);
  const [orbitVisible, setOrbitVisible] = useState(false);
  const [panel, setPanel] = useState<'saved' | 'about' | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLButtonElement>(null);
  const exploreRef = useRef<HTMLButtonElement>(null);
  const phaseRef = useRef(scene.phase);
  useEffect(() => {
    phaseRef.current = scene.phase;
  });

  const phase = scene.phase;
  const detailDish = getReelDish(scene.detailId);
  const winner = getReelDish(scene.winnerId);
  const chosenDish = getReelDish(scene.chosenId);
  const centreDish = view.dishAt(center);

  // ——— Physics ———
  const callbacks = useMemo(
    () => ({
      onIndexChange: (i: number) => {
        if (phaseRef.current === 'spinning' || phaseRef.current === 'settling') {
          sound.tick(30);
          // The reel repaints itself; the counter only needs a few updates a second.
          const now = performance.now();
          if (now - centerAt.current < 140) return;
          centerAt.current = now;
        }
        setCenter(i);
      },
      onRest: (i: number) => {
        setCenter(i);
        if (phaseRef.current === 'dragging') send({ type: 'DRAG_END', velocity: 0, index: i });
        else send({ type: 'NAVIGATE', index: i });
      },
      onDecelerate: () => send({ type: 'DECELERATE' }),
      onSettle: (target: number) => {
        // Counter updates are throttled mid-spin; snap to the exact dish on landing.
        setCenter(target);
        send({ type: 'SETTLE', dishId: viewRef.current.dishAt(target).id });
      },
    }),
    [sound],
  );
  const reelHidden = phase === 'detail' || phase === 'confirming' || phase === 'chosen' || covered;
  const { engine, subscribe } = useReelPhysics({
    initial: initialIndex,
    reduced,
    running: !reelHidden,
    callbacks,
  });
  usePointerParallax(rootRef, canHover && !reduced && !reelHidden);

  // ——— Boot: first visible thumbnails, bounded by a timeout ———
  const [bootView] = useState(view);
  const bootSources = useMemo(() => {
    const out: string[] = [];
    // Only the centre and its neighbours gate the first paint; the rest stream in.
    for (let i = -1; i <= 1; i++) out.push(bootView.dishAt(initialIndex + i).thumbnail);
    return out;
  }, [initialIndex, bootView]);
  const boot = useAssetPreloader(bootSources);
  // Scene modules are held in state rather than React.lazy: a lazy component
  // suspends on first render and React throttles that fallback (~300 ms),
  // which would delay the shared-element transition.
  const [storyMod, setStoryMod] = useState<typeof import('./components/FoodStory') | null>(null);
  const [epilogueMod, setEpilogueMod] = useState<
    typeof import('./components/ChosenEpilogue') | null
  >(null);
  useEffect(() => {
    if (!boot.ready) return;
    send({ type: 'ASSETS_READY' });
    let alive = true;
    void loadStory().then((mod) => alive && setStoryMod(mod));
    void loadEpilogue().then((mod) => alive && setEpilogueMod(mod));
    return () => {
      alive = false;
    };
  }, [boot.ready]);
  const FoodStory = storyMod?.FoodStory;
  const ChosenEpilogue = epilogueMod?.ChosenEpilogue;

  // Deep link /mon/<slug>: open the story as soon as the scene is ready.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (phase !== 'idle' || deepLinked.current) return;
    deepLinked.current = true;
    if (route.name === 'dish') {
      const d = getReelDishBySlug(route.slug);
      if (d) send({ type: 'OPEN_DETAIL', dishId: d.id });
      else navigate({ name: 'reel' }, { replace: true });
    }
  }, [phase, route, navigate]);

  // ——— Spin ———
  const spin = useCallback(() => {
    if (!isInteractive(phaseRef.current)) return;
    send({ type: 'SPIN', seed: randomSeed() });
  }, []);

  // A spin requested together with a view change runs one commit later, so the
  // reducer that plans it already spins over the new view.
  useEffect(() => {
    if (spinNonce > 0) spin();
  }, [spinNonce, spin]);

  const setPoolMode = (on: boolean) => {
    if (!isInteractive(phaseRef.current)) return;
    if ((on ? 'pool' : 'all') === scope && excluded.length === 0) return;
    send({ type: 'RESET' });
    setExcluded([]);
    setScope(on ? 'pool' : 'all');
    announce(on ? t.reel.announce.spinPool(poolSize) : t.reel.announce.spinAll(reelCount()));
  };

  const spinPool = () => {
    setPicker(false);
    if (!isInteractive(phaseRef.current)) return;
    send({ type: 'RESET' });
    setExcluded([]);
    setScope('pool');
    setSpinNonce((n) => n + 1);
  };

  // "Quay các món cho hạt ớt" from the Journey: spin over the dishes that grant that seed.
  const handledRequest = useRef(0);
  useEffect(() => {
    if (!spinRequest || spinRequest.nonce === handledRequest.current) return;
    const current = phaseRef.current;
    if (current === 'chosen') send({ type: 'RESET' });
    else if (!isInteractive(current)) return;
    handledRequest.current = spinRequest.nonce;
    send({ type: 'RESET' });
    setExcluded([]);
    setScope(spinRequest.crop);
    setSpinNonce((n) => n + 1);
    announce(t.reel.announce.spinCrop(CROPS[spinRequest.crop].seedName.toLowerCase()));
  }, [spinRequest, phase, announce]);

  const eliminate = (dishId: string) => {
    if (phaseRef.current !== 'selected' || !view.pooled || view.count <= 2) return;
    const dish = getReelDish(dishId);
    send({ type: 'RESET' });
    setExcluded((x) => [...x, dishId]);
    setSpinNonce((n) => n + 1);
    if (dish) announce(t.reel.announce.eliminated(dish.name, view.count - 1));
  };

  useEffect(() => {
    if (!scene.spin || scene.phase !== 'spinning') return;
    const winnerDish = view.dishAt(scene.spin.target);
    // Preload the winner's 768 px image the moment the target is known, plus
    // (desktop) the last few plates of the slow tail, and every thumbnail on the
    // way so none decodes mid-spin.
    // The spin starts first; the loads are fed a few per frame so starting them
    // never costs a dropped frame.
    engine.spinTo(scene.spin, performance.now());
    void preloadImage(winnerDish.image);
    const { from, target } = scene.spin;
    const queue: string[] = [];
    for (let vi = from - layout.half; vi <= target + layout.half; vi++) {
      const d = view.dishAt(vi);
      queue.push(d.thumbnail);
      if (layout.tier === 'desktop' && vi >= target - 6 && vi <= target + 1) queue.push(d.image);
    }
    const stopPreload = preloadGradually(queue);
    sound.whoosh();
    return stopPreload;
    // Only react to a new spin, not to phase changes within it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.spinCount]);

  // Winner settled: announce, then enable the CTAs after the choreography.
  useEffect(() => {
    if (phase !== 'selected' || scene.ready || !winner) return;
    announce(t.reel.announce.picked(winner.name));
    sound.chime();
    exploreRef.current?.focus({ preventScroll: true });
    const timer = setTimeout(() => send({ type: 'UNLOCK' }), reduced ? 0 : UNLOCK_MS);
    return () => clearTimeout(timer);
  }, [phase, scene.ready, winner, announce, sound, reduced]);

  // Remember the reel position between visits.
  useEffect(() => {
    // A shortlist index means nothing on the full reel, so only the full reel is remembered.
    if ((phase === 'idle' || phase === 'selected') && !view.pooled)
      update({ lastIndex: mod(scene.index, reelCount()) });
  }, [phase, scene.index, update, view.pooled]);

  // ——— Navigation & keyboard ———
  const goStep = useCallback(
    (step: number) => {
      if (!isInteractive(phaseRef.current)) return;
      engine.goTo(Math.round(engine.position) + step);
    },
    [engine],
  );

  const openDetail = useCallback((dishId?: string) => {
    send({ type: 'OPEN_DETAIL', dishId });
  }, []);

  const activate = (vi: number) => {
    if (!isInteractive(phase)) return;
    if (vi === center) openDetail(phase === 'selected' ? (scene.winnerId ?? undefined) : undefined);
    else engine.goTo(vi);
  };

  // Scene ↔ URL: the story owns /mon/<slug>, closing returns to /.
  useEffect(() => {
    if (phase === 'opening-detail' && detailDish && route.name !== 'dish') {
      navigate({ name: 'dish', slug: detailDish.slug });
    }
  }, [phase, detailDish, route.name, navigate]);

  // Browser back/forward: react only to an actual route change, never to a
  // phase change (the story pushes its own URL one commit after opening).
  const prevRoute = useRef(route);
  useEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = route;
    if (prev === route) return;
    const current = phaseRef.current;
    if (prev.name === 'dish' && route.name !== 'dish' && isDetailPhase(current)) {
      send({ type: 'CLOSE_DETAIL' });
    }
    if (route.name === 'dish' && prev.name !== 'dish' && isInteractive(current)) {
      const d = getReelDishBySlug(route.slug);
      if (d) send({ type: 'OPEN_DETAIL', dishId: d.id });
    }
  }, [route]);

  useEffect(() => {
    setPageMeta(
      detailDish
        ? {
            title: t.reel.docTitleDish(BRAND, detailDish.name),
            description: detailDish.story,
            path: `/mon/${detailDish.id}`,
          }
        : { title: t.reel.docTitle(BRAND) },
    );
  }, [detailDish]);

  const closeDetail = (then?: 'spin') => {
    send({ type: 'CLOSE_DETAIL', then });
    if (route.name === 'dish') back({ name: 'reel' });
  };

  const onDetailClosed = () => {
    send({ type: 'DETAIL_CLOSED' });
    setConfirmError(null);
  };

  useEffect(() => {
    if (phase === 'idle' || phase === 'selected') {
      if (scene.pendingSpin) {
        spin();
        return;
      }
    }
  }, [phase, scene.pendingSpin, spin]);

  // After the story closes, focus returns to the dish it came from.
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current === 'closing-detail' && (phase === 'idle' || phase === 'selected')) {
      const target =
        phase === 'selected'
          ? exploreRef.current
          : rootRef.current?.querySelector<HTMLElement>('[data-reel-centre]');
      target?.focus({ preventScroll: true });
    }
    if (prevPhase.current === 'chosen' && phase === 'idle') spinRef.current?.focus();
    prevPhase.current = phase;
  }, [phase]);

  // ——— Confirm (Scene E → F) ———
  const confirm = async () => {
    // Allowed as soon as the story is on screen, even mid-transition.
    if ((phase !== 'detail' && phase !== 'opening-detail') || !detailDish) return;
    send({ type: 'CONFIRM_DISH' });
    setConfirmError(null);
    try {
      await confirmCommand(`reel-confirm:${slotKey(currentTime())}:${detailDish.id}`, {
        fail: game.settings.simulateFailure,
      });
    } catch (e) {
      if (isAbortError(e)) return;
      setConfirmError(t.reel.confirmError);
      send({ type: 'CONFIRM_FAILED' });
      return;
    }
    gameDispatch({ type: 'CHOOSE_DISH', dishId: detailDish.id, now: currentTime() });
    announce(t.reel.announce.confirmed(detailDish.name));
    send({ type: 'CONFIRMED' });
    navigate({ name: 'reel' }, { replace: true });
  };

  // ——— Drag / swipe ———
  const suppressClick = useRef(false);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isInteractive(phase) || e.button !== 0) return;
    const startX = e.clientX;
    let lastX = startX;
    let dragging = false;
    const spacing = layout.radius * layout.step;
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - startX) > DRAG_THRESHOLD) {
        dragging = true;
        send({ type: 'DRAG_START' });
        engine.startDrag(performance.now());
      }
      if (dragging) {
        engine.dragBy(-(ev.clientX - lastX) / spacing, performance.now());
        lastX = ev.clientX;
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (dragging) {
        suppressClick.current = true;
        engine.endDrag(performance.now());
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const wheelAt = useRef(0);
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12) return;
    const now = performance.now();
    if (now - wheelAt.current < 260) return;
    wheelAt.current = now;
    goStep(Math.sign(d));
  };

  // ——— Ingredient orbit (desktop hover/focus with a short dwell) ———
  const orbitWanted =
    (hoverCentre || orbitKeep) &&
    layout.tier === 'desktop' &&
    (phase === 'idle' || (phase === 'selected' && scene.ready));
  useEffect(() => {
    if (!orbitWanted) {
      const timer = setTimeout(() => setOrbitVisible(false), 220);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setOrbitVisible(true), reduced ? 0 : ORBIT_DWELL_MS);
    return () => clearTimeout(timer);
  }, [orbitWanted, reduced]);

  const busy = isBusy(phase);
  const showDock = phase === 'idle' || phase === 'dragging' || busy;
  const orbitDish = phase === 'selected' && winner ? winner : centreDish;
  const saved = detailDish ? prefs.saved.includes(detailDish.id) : false;

  const rootStyle = {
    '--fr-accent-dish': (detailDish ?? winner ?? centreDish).palette[2],
    // Reel centre and headline size come from the layout so plates and title never overlap.
    ...(layout.centerY !== undefined && { '--fr-reel-y': `${layout.centerY}px` }),
    ...(layout.headlineFont !== undefined && { '--fr-headline-size': `${layout.headlineFont}px` }),
  } as CSSProperties;

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <LazyMotion features={domAnimation} strict>
        <div
          ref={rootRef}
          className={`fr fr--${layout.tier}`}
          data-phase={phase}
          data-motion-reduced={reduced || undefined}
          data-orbit={orbitVisible || undefined}
          style={rootStyle}
          onClickCapture={(e) => {
            if (suppressClick.current) {
              suppressClick.current = false;
              e.stopPropagation();
              e.preventDefault();
            }
          }}
        >
          <div className="fr-grain" aria-hidden="true" />
          <ExperienceHeader
            sound={prefs.sound}
            onToggleSound={() => update({ sound: !prefs.sound })}
            onAbout={() => setPanel('about')}
            onSaved={() => setPanel('saved')}
            savedCount={prefs.saved.length}
            onJourney={onOpenJourney}
            journey={{
              level: level(game.xp).level,
              streak: game.streak.count,
              pendingCheckIn:
                !!game.meal && game.meal.slotKey === slotKey(currentTime()) && !game.meal.checkedIn,
            }}
            onProfile={onOpenProfile}
          />

          {phase === 'booting' ? (
            <BootScreen progress={boot.progress} />
          ) : (
            <main className="fr-stage" id="noi-dung" aria-label={t.reel.stage.label}>
              <div className="fr-headline" aria-hidden={phase === 'selected'}>
                <SplitLines
                  as="h1"
                  className="fr-headline__title"
                  lines={t.reel.stage.headline}
                  delay={0.1}
                  stagger={0.12}
                />
                <m.p
                  className="fr-headline__sub"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  {cropScope
                    ? t.reel.stage.subCrop(view.count, CROPS[cropScope].seedName.toLowerCase())
                    : view.pooled
                      ? t.reel.stage.subPool(view.count)
                      : t.reel.stage.subAll(reelCount())}
                </m.p>
              </div>

              <div onWheel={onWheel} className="fr-reel-wrap">
                <ReelScene
                  view={view}
                  center={center}
                  layout={layout}
                  phase={phase}
                  reduced={reduced}
                  hovered={hoverCentre}
                  subscribe={subscribe}
                  getPosition={() => engine.position}
                  onActivate={activate}
                  onKeyNav={goStep}
                  onPointerDown={onPointerDown}
                  onCenterHover={setHoverCentre}
                  winnerIndex={busy && scene.spin ? scene.spin.target : null}
                />
                {orbitVisible && (
                  <IngredientOrbit
                    key={orbitDish.id}
                    dish={orbitDish}
                    size={layout.size * (phase === 'selected' ? 1.2 : 1)}
                    onKeepOpen={setOrbitKeep}
                  />
                )}
              </div>

              {layout.tier !== 'desktop' && phase === 'idle' && (
                <IngredientRail key={orbitDish.id} dish={orbitDish} />
              )}

              {phase === 'selected' && winner && (
                <SelectedDishOverlay
                  key={scene.spinCount}
                  dish={winner}
                  number={winner.index + 1}
                  pooled={view.pooled}
                  ready={scene.ready}
                  exploreRef={exploreRef}
                  onExplore={() => openDetail(winner.id)}
                  onBack={() => send({ type: 'RESET' })}
                  onEliminate={
                    view.pooled && view.count > 2 ? () => eliminate(winner.id) : undefined
                  }
                  extra={
                    layout.tier !== 'desktop' ? <IngredientRail dish={winner} inline /> : undefined
                  }
                />
              )}

              {showDock && (
                <footer className="fr-dock">
                  <SceneCounter current={mod(center, view.count) + 1} total={view.count} />
                  <SpinControl ref={spinRef} busy={busy} onSpin={spin} />
                  <div className="fr-dock__side">
                    <PoolSwitch
                      pooled={view.pooled}
                      crop={cropScope}
                      size={cropScope ? view.count : poolSize}
                      left={view.pooled ? view.count : poolSize}
                      total={reelCount()}
                      disabled={busy || phase === 'dragging'}
                      onAll={() => setPoolMode(false)}
                      onPool={() => setPoolMode(true)}
                      onEdit={() => setPicker(true)}
                    />
                    <p className="fr-hint">
                      {canHover ? t.reel.stage.hintHover : t.reel.stage.hintTouch}
                    </p>
                  </div>
                </footer>
              )}
            </main>
          )}

          {FoodStory && detailDish && isDetailPhase(phase) && (
            <FoodStory
              key={detailDish.id}
              dish={detailDish}
              phase={phase}
              reduced={reduced}
              saved={saved}
              onToggleSave={() => toggleSaved(detailDish.id)}
              orderCity={prefs.orderCity}
              onOrderCity={(orderCity) => update({ orderCity })}
              inPool={prefs.pool.includes(detailDish.id)}
              onTogglePool={() => {
                const inPool = prefs.pool.includes(detailDish.id);
                togglePool(detailDish.id);
                announce(
                  inPool
                    ? t.reel.announce.poolRemoved(detailDish.name)
                    : t.reel.announce.poolAdded(detailDish.name),
                );
              }}
              onOpened={() => send({ type: 'DETAIL_OPENED' })}
              onClosed={onDetailClosed}
              onClose={closeDetail}
              onConfirm={confirm}
              confirmError={confirmError}
              number={detailDish.index + 1}
            />
          )}

          {ChosenEpilogue && phase === 'chosen' && chosenDish && (
            <ChosenEpilogue
              dish={chosenDish}
              onJourney={onOpenJourney}
              orderCity={prefs.orderCity}
              onOrderCity={(orderCity) => update({ orderCity })}
              onSpinAgain={() => {
                send({ type: 'RESET' });
                send({ type: 'SPIN', seed: randomSeed() });
              }}
            />
          )}

          <PoolPicker
            open={picker}
            onClose={() => setPicker(false)}
            pool={prefs.pool}
            saved={prefs.saved}
            onToggle={togglePool}
            onChange={(pool) => update({ pool })}
            onSpin={spinPool}
          />

          <SavedPanel
            open={panel === 'saved'}
            onClose={() => setPanel(null)}
            saved={prefs.saved}
            onRemove={toggleSaved}
            onOpenDish={(id) => {
              setPanel(null);
              if (phase === 'chosen') send({ type: 'RESET' });
              send({ type: 'OPEN_DETAIL', dishId: id });
            }}
          />
          <AboutPanel open={panel === 'about'} onClose={() => setPanel(null)} />
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}
