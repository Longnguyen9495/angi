import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { dishAt, formatReelPrice, reelCount, REGION_LABEL } from '../data/reelCatalogue';
import type { FrameState } from '../engine/ReelEngine';
import { itemVisual, type ReelLayout, type SceneValues } from '../engine/layout';
import { mod } from '../engine/spin';
import type { ReelPhase } from '../foodReel.types';
import { ReelItem } from './ReelItem';

interface ReelSceneProps {
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
    el.style.transform = v.transform;
    el.style.opacity = String(v.opacity);
    el.style.filter = v.filter;
    el.style.zIndex = String(v.zIndex);
  };
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  });

  useEffect(
    () =>
      subscribe((f) => {
        lastFrame.current = f;
        const s = scene.current;
        const t = target.current;
        const k = reduced ? 1 : LERP;
        scene.current = {
          focus: s.focus + (t.focus - s.focus) * k,
          hover: s.hover + (t.hover - s.hover) * k,
          camera: s.camera + (t.camera - s.camera) * k,
        };
        nodes.current.forEach((el, vi) => paintRef.current(el, vi, f));
      }),
    [subscribe, reduced],
  );

  const register = (vi: number) => (el: HTMLElement | null) => {
    if (el) {
      nodes.current.set(vi, el);
      // Pose new items immediately so they never flash at the origin.
      paintRef.current(el, vi, { ...lastFrame.current, position: getPosition() });
    } else {
      nodes.current.delete(vi);
    }
  };

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
  for (let vi = center - layout.half; vi <= center + layout.half; vi++) indices.push(vi);
  const busy = phase === 'spinning' || phase === 'settling';
  const centreDish = dishAt(center);

  return (
    <div
      className="fr-reel"
      role="group"
      aria-roledescription="băng chuyền món ăn"
      aria-label={`Vũ trụ món ăn: ${reelCount()} món. Dùng phím mũi tên để đổi món, Enter để xem câu chuyện.`}
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
        Đang ở món {mod(center, reelCount()) + 1}: {centreDish.name},{' '}
        {REGION_LABEL[centreDish.region]}, {formatReelPrice(centreDish.price)}
      </p>
      <div className="fr-track">
        {indices.map((vi) => {
          const dish = dishAt(vi);
          const isCentre = vi === center;
          return (
            <ReelItem
              key={vi}
              ref={register(vi)}
              dish={dish}
              number={mod(vi, reelCount()) + 1}
              isCentre={isCentre}
              isWinner={phase === 'selected' && isCentre}
              useFull={
                // Plan budget: 768 px only for the winner/detail; desktop may also
                // sharpen the resting centre dish, touch layouts stay on thumbnails.
                (isCentre && !busy && (layout.tier === 'desktop' || phase === 'selected')) ||
                (winnerIndex !== null && vi === winnerIndex && !reduced)
              }
              busy={busy}
              driftSeed={mod(vi, 7)}
              onActivate={() => onActivate(vi)}
              onHover={isCentre ? onCenterHover : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
