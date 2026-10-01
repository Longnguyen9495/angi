import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { t } from '../../../i18n';
import { formatReelPrice, REGION_LABEL, type ReelView } from '../data/reelCatalogue';
import type { FrameState } from '../engine/ReelEngine';
import { itemVisual, type ReelLayout, type SceneValues } from '../engine/layout';
import { mod } from '../engine/spin';
import type { ReelPhase } from '../foodReel.types';
import { ReelItem } from './ReelItem';

interface ReelSceneProps {
  /** Whole catalogue or the guest's shortlist; items wrap over its count. */
  view: ReelView;
  center: number;
  layout: ReelLayout;
  phase: ReelPhase;
  reduced: boolean;
  hovered: boolean;
  subscribe: (fn: (f: FrameState, now: number) => void) => () => void;
  getPosition: () => number;
  onActivate: (virtualIndex: number) => void;
  onKeyNav: (step: number) => void;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onCenterHover: (hover: boolean) => void;
  /** Winner of the current spin, its full image is preloaded. */
  winnerIndex: number | null;
}

const LERP = 0.14;

/**
 * Virtualised 3D reel: only `2·half + 1` items exist in the DOM. Items are
 * keyed by virtual index, and their pose is written directly each frame.
 */
export function ReelScene({
  view,
  center,
  layout,
  phase,
  reduced,
  hovered,
  subscribe,
  getPosition,
  onActivate,
  onKeyNav,
  onPointerDown,
  onCenterHover,
  winnerIndex,
}: ReelSceneProps) {
  const nodes = useRef(new Map<number, HTMLElement>());
  const painted = useRef(
    new WeakMap<
      HTMLElement,
      { transform: string; opacity: string; filter: string; zIndex: string }
    >(),
  );
  // Stable per-slot ref and click callbacks keep ReelItem's memo effective: a
  // spin re-renders the scene on every new dish, but untouched items stay put.
  const activateRef = useRef(onActivate);
  const positionRef = useRef(getPosition);
  useEffect(() => {
    activateRef.current = onActivate;
    positionRef.current = getPosition;
  });
  const activate = useCallback((vi: number) => activateRef.current(vi), []);
  // The scene follows the engine itself, so a spin re-renders only the reel —
  // not the whole experience — each time a new dish passes the centre.
  const [live, setLive] = useState(center);
  const liveRef = useRef(center);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep focus on the centred item while navigating with the keyboard.
  useEffect(() => {
    const root = rootRef.current;
    const active = document.activeElement;
    if (root && active instanceof HTMLElement && root.contains(active)) {
      root.querySelector<HTMLElement>('[data-reel-centre]')?.focus({ preventScroll: true });
    }
  }, [live]);
  const scene = useRef<Omit<SceneValues, 'speed' | 'settleAge'>>({ focus: 0, hover: 0, camera: 1 });
  const target = useRef({ focus: 0, hover: 0, camera: 1 });
  const lastFrame = useRef<FrameState>({
    position: center,
    speed: 0,
    mode: 'rest',
    settleAge: Infinity,
  });

  useEffect(() => {
    target.current = {
      focus: phase === 'selected' ? 1 : 0,
      hover: hovered ? 1 : 0,
      camera: phase === 'spinning' || phase === 'settling' ? 0.94 : 1,
    };
  }, [phase, hovered]);

  const paint = (el: HTMLElement, vi: number, f: FrameState) => {
    const v = itemVisual(vi - f.position, layout, {
      ...scene.current,
      speed: f.speed,
      // No overshoot "bounce" under reduced motion.
      settleAge: reduced ? Infinity : f.settleAge,
    });
    // Only touch what changed: redundant inline-style writes still cost a style
    // recalc per item per frame, which is what phones felt during a spin.
    const last = painted.current.get(el);
    const opacity = String(v.opacity);
    const zIndex = String(v.zIndex);
    if (last?.transform !== v.transform) el.style.transform = v.transform;
    if (last?.opacity !== opacity) el.style.opacity = opacity;
    if (last?.filter !== v.filter) el.style.filter = v.filter;
    if (last?.zIndex !== zIndex) el.style.zIndex = zIndex;
    painted.current.set(el, { transform: v.transform, opacity, filter: v.filter, zIndex });
  };
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  });

  useEffect(
    () =>
      subscribe((f) => {
        lastFrame.current = f;
        const c = Math.round(f.position);
        if (c !== liveRef.current) {
          liveRef.current = c;
          setLive(c);
        }
        const s = scene.current;
        const goal = target.current;
        const k = reduced ? 1 : LERP;
        scene.current = {
          focus: s.focus + (goal.focus - s.focus) * k,
          hover: s.hover + (goal.hover - s.hover) * k,
          camera: s.camera + (goal.camera - s.camera) * k,
        };
        nodes.current.forEach((el, vi) => paintRef.current(el, vi, f));
      }),
    [subscribe, reduced],
  );

  // One stable ref callback for every slot (React 19 ref cleanup): items read
  // their virtual index from data-vi, so re-renders never detach and re-attach.
  const register = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const vi = Number(el.dataset.vi);
    nodes.current.set(vi, el);
    // Pose new items immediately so they never flash at the origin.
    paintRef.current(el, vi, { ...lastFrame.current, position: positionRef.current() });
    return () => {
      if (nodes.current.get(vi) === el) nodes.current.delete(vi);
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onKeyNav(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onKeyNav(-1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      onKeyNav(5);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      onKeyNav(-5);
    }
  };

  const indices: number[] = [];
  for (let vi = live - layout.half; vi <= live + layout.half; vi++) indices.push(vi);
  const busy = phase === 'spinning' || phase === 'settling';
  const centreDish = view.dishAt(live);

  return (
    <div
      ref={rootRef}
      className="fr-reel"
      role="group"
      aria-roledescription={t.reel.reel.roleDescription}
      aria-label={t.reel.reel.label(view.pooled, view.count)}
      aria-busy={busy}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      style={
        {
          '--fr-size': `${layout.size}px`,
          ...(layout.centerY !== undefined && { '--fr-reel-y': `${layout.centerY}px` }),
        } as CSSProperties
      }
    >
      <p className="sr-only" aria-live="off">
        {t.reel.reel.current(
          mod(live, view.count) + 1,
          centreDish.name,
          REGION_LABEL[centreDish.region],
          formatReelPrice(centreDish.price),
        )}
      </p>
      <div className="fr-track">
        {indices.map((vi) => {
          const dish = view.dishAt(vi);
          const isCentre = vi === live;
          return (
            <ReelItem
              // The dish id is part of the key: switching to the shortlist swaps the
              // dish behind a slot, and its sharp image must not reuse the old load state.
              key={`${vi}:${dish.id}`}
              ref={register}
              dish={dish}
              number={mod(vi, view.count) + 1}
              isCentre={isCentre}
              isWinner={phase === 'selected' && isCentre}
              useFull={
                // The 384 px thumbnail is upscaled on every screen, so the resting centre
                // always gets the 768 px image; desktop also sharpens its two neighbours
                // and the slow tail of a spin (preloaded when the spin starts).
                (isCentre && !busy) ||
                (layout.tier === 'desktop' && Math.abs(vi - live) <= 1 && phase !== 'spinning') ||
                (winnerIndex !== null && vi === winnerIndex && !reduced)
              }
              busy={busy}
              driftSeed={mod(vi, 7)}
              vi={vi}
              onActivate={activate}
              onHover={isCentre ? onCenterHover : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
