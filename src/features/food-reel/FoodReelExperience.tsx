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
import { SplitLines } from './components/SplitLines';
import { dishAt, getReelDish, getReelDishBySlug, reelCount } from './data/reelCatalogue';
import { layoutFor } from './engine/layout';
import { mod, randomSeed } from './engine/spin';
import type { ReelEvent, ReelState } from './foodReel.types';
import { foodReelReducer, initialReelState } from './foodReelReducer';
import { isBusy, isDetailPhase, isInteractive } from './foodReelMachine';
import { preloadImage, useAssetPreloader } from './hooks/useAssetPreloader';
import { usePointerParallax } from './hooks/usePointerParallax';
import { useReelMotionPrefs } from './hooks/useReducedMotion';
import { useReelPhysics } from './hooks/useReelPhysics';
import { useReelPrefs } from './hooks/useReelPrefs';
import type { Route } from './hooks/useRoute';
import { useSound } from './hooks/useSound';
import { useCanHover, useViewport } from './hooks/useViewport';

// Story and epilogue load after the reel is on screen (preloaded when idle).
const loadStory = () => import('./components/FoodStory');
const loadEpilogue = () => import('./components/ChosenEpilogue');

const UNLOCK_MS = 700;
const sceneReducer = (s: ReelState, e: ReelEvent) => foodReelReducer(s, e);
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
}

export function FoodReelExperience({
  route,
  navigate,
  back,
  onOpenJourney,
  onOpenProfile,
  covered,
}: FoodReelExperienceProps) {
  const { state: game, dispatch: gameDispatch } = useGame();
  const { announce } = useFeedback();
  const { reduced, saveData, autoplayVideo } = useReelMotionPrefs();
  const { prefs, update, toggleSaved } = useReelPrefs();
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
  const [scene, send] = useReducer(sceneReducer, initialIndex, initialReelState);
  const [center, setCenter] = useState(initialIndex);
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
  const centreDish = dishAt(center);

  // ——— Physics ———
  const callbacks = useMemo(
    () => ({
      onIndexChange: (i: number) => {
        setCenter(i);
        if (phaseRef.current === 'spinning' || phaseRef.current === 'settling') sound.tick(30);
      },
      onRest: (i: number) => {
        if (phaseRef.current === 'dragging') send({ type: 'DRAG_END', velocity: 0, index: i });
        else send({ type: 'NAVIGATE', index: i });
      },
      onDecelerate: () => send({ type: 'DECELERATE' }),
      onSettle: (target: number) => send({ type: 'SETTLE', dishId: dishAt(target).id }),
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
  const bootSources = useMemo(() => {
    const out: string[] = [];
    // Only the centre and its neighbours gate the first paint; the rest stream in.
    for (let i = -1; i <= 1; i++) out.push(dishAt(initialIndex + i).thumbnail);
    return out;
  }, [initialIndex]);
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

  useEffect(() => {
    if (!scene.spin || scene.phase !== 'spinning') return;
    const winnerDish = dishAt(scene.spin.target);
    // Preload the winner's 768 px image the moment the target is known.
    void preloadImage(winnerDish.image);
    engine.spinTo(scene.spin, performance.now());
    sound.whoosh();
    // Only react to a new spin, not to phase changes within it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.spinCount]);

  // Winner settled: announce, then enable the CTAs after the choreography.
  useEffect(() => {
    if (phase !== 'selected' || scene.ready || !winner) return;
    announce(`Đã chọn ${winner.name}`);
    sound.chime();
    exploreRef.current?.focus({ preventScroll: true });
    const t = setTimeout(() => send({ type: 'UNLOCK' }), reduced ? 0 : UNLOCK_MS);
    return () => clearTimeout(t);
  }, [phase, scene.ready, winner, announce, sound, reduced]);

  // Remember the reel position between visits.
  useEffect(() => {
    if (phase === 'idle' || phase === 'selected')
      update({ lastIndex: mod(scene.index, reelCount()) });
  }, [phase, scene.index, update]);

  // ——— Navigation & keyboard ———
  const goStep = useCallback(
    (step: number) => {
      if (!isInteractive(phaseRef.current)) return;
      engine.goTo(Math.round(engine.position) + step);
    },
    [engine],
  );

  // Keep focus on the centred item while navigating with the keyboard.
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.fr-reel')) {
      rootRef.current
        ?.querySelector<HTMLElement>('[data-reel-centre]')
        ?.focus({ preventScroll: true });
    }
  }, [center]);

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
    document.title = detailDish
      ? `${detailDish.name} — Bếp Việt · Food Reel`
      : 'Bếp Việt · Food Reel — Hôm nay ăn gì?';
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
      setConfirmError('Chưa chốt được — mạng giả lập đang lỗi. Món vẫn ở đây, bạn thử lại nhé.');
      send({ type: 'CONFIRM_FAILED' });
      return;
    }
    gameDispatch({ type: 'CHOOSE_DISH', dishId: detailDish.id, now: currentTime() });
    announce(`Đã chốt ${detailDish.name}.`);
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
      const t = setTimeout(() => setOrbitVisible(false), 220);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setOrbitVisible(true), reduced ? 0 : ORBIT_DWELL_MS);
    return () => clearTimeout(t);
  }, [orbitWanted, reduced]);

  const busy = isBusy(phase);
  const showDock = phase === 'idle' || phase === 'dragging' || busy;
  const orbitDish = phase === 'selected' && winner ? winner : centreDish;
  const saved = detailDish ? prefs.saved.includes(detailDish.id) : false;

  const rootStyle = {
    '--fr-accent-dish': (detailDish ?? winner ?? centreDish).palette[2],
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
            <main className="fr-stage" id="noi-dung" aria-label="Food reel">
              <div className="fr-headline" aria-hidden={phase === 'selected'}>
                <SplitLines
                  as="h1"
                  className="fr-headline__title"
                  lines={['Hôm nay', 'ăn gì?']}
                  delay={0.1}
                  stagger={0.12}
                />
                <m.p
                  className="fr-headline__sub"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  {reelCount()} món · ba miền & thế giới
                </m.p>
              </div>

              <div onWheel={onWheel} className="fr-reel-wrap">
                <ReelScene
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
                  ready={scene.ready}
                  exploreRef={exploreRef}
                  onExplore={() => openDetail(winner.id)}
                  onBack={() => send({ type: 'RESET' })}
                  extra={
                    layout.tier !== 'desktop' ? <IngredientRail dish={winner} inline /> : undefined
                  }
                />
              )}

              {showDock && (
                <footer className="fr-dock">
                  <SceneCounter current={mod(center, reelCount()) + 1} total={reelCount()} />
                  <SpinControl ref={spinRef} busy={busy} onSpin={spin} />
                  <p className="fr-hint">
                    {canHover
                      ? 'Kéo để khám phá · Nhấn để xem câu chuyện'
                      : 'Vuốt để lướt · Chạm để xem chuyện'}
                  </p>
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
              autoplay={autoplayVideo}
              videoMuted={prefs.videoMuted}
              onVideoMuted={(videoMuted) => update({ videoMuted })}
              saved={saved}
              onToggleSave={() => toggleSaved(detailDish.id)}
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
              onSpinAgain={() => {
                send({ type: 'RESET' });
                send({ type: 'SPIN', seed: randomSeed() });
              }}
            />
          )}

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
