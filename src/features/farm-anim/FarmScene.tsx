import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { AnimationManager, type FarmPlace, type PlaceInfo } from './engine/AnimationManager';
import type { FarmView } from './systems/FarmGameLayer';
import { loadAssets } from './engine/assets';
import './farm-anim.css';

export type { FarmPlace, PlaceInfo };
export type { BubbleView, FarmView, PlotView } from './systems/FarmGameLayer';

/** What the page can ask of a running scene. */
export interface FarmSceneApi {
  /** A koi jumps. */
  jump: () => void;
  /** Fishing float at picture point (x, y), and the bite that pulls it under. */
  cast: (x: number, y: number) => void;
  bite: (x: number, y: number) => void;
  /** Top of a plot in CSS px inside the scene box. */
  plotScreen: (id: number) => { x: number; y: number } | null;
  /** The plot under a viewport point, for dropping a dragged seed. */
  plotAtClient: (clientX: number, clientY: number) => number | null;
  select: (id: number | null) => void;
  dropTarget: (id: number | null) => void;
}

/**
 * The living floating farm (painted layers, wind, water, animals) in a canvas that fills its box.
 * Taps on the pond, cows, hens, farmhouse, market or field are reported through `onPlace`.
 * Renders nothing if the scene cannot load (the rest of the page keeps working).
 */
export default function FarmScene({
  className = '',
  reduced = false,
  farm = null,
  onPlace,
  onReady,
  label = t.farm.anim.title,
}: {
  className?: string;
  /** The game's reduced-motion setting (the system setting is always honoured too). */
  reduced?: boolean;
  /** The game drawn into the scene (plots, animal bubbles); null = scenery only. */
  farm?: FarmView | null;
  onPlace?: (place: FarmPlace, info: PlaceInfo) => void;
  onReady?: (api: FarmSceneApi) => void;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const manager = useRef<AnimationManager | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Latest callbacks without restarting the scene.
  const onPlaceRef = useRef(onPlace);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onPlaceRef.current = onPlace;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;
    let m: AnimationManager | null = null;
    loadAssets()
      .then((assets) => {
        if (cancelled || !ref.current) return;
        m = new AnimationManager(ref.current, assets, {
          onPlace: (p, info) => onPlaceRef.current?.(p, info),
        });
        manager.current = m;
        window.__farmAnim = m;
        m.start();
        setState('ready');
        onReadyRef.current?.({
          jump: () => m?.jump(),
          cast: (x, y) => m?.cast(x, y),
          bite: (x, y) => m?.bite(x, y),
          plotScreen: (id) => m?.plotScreen(id) ?? null,
          plotAtClient: (x, y) => m?.plotAtClient(x, y) ?? null,
          select: (id) => m?.select(id),
          dropTarget: (id) => m?.dropTarget(id),
        });
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
      m?.destroy();
      manager.current = null;
      if (window.__farmAnim === m) delete window.__farmAnim;
    };
  }, []);

  useEffect(() => {
    manager.current?.setReduced(reduced);
  }, [reduced, state]);

  useEffect(() => {
    manager.current?.setFarm(farm);
  }, [farm, state]);

  if (state === 'failed') return null;
  return (
    <div className={`fa-scene ${className}`} data-state={state}>
      <canvas ref={ref} className="fa-canvas" role="img" aria-label={label} />
      {state === 'loading' && (
        <p className="fa-loading" role="status">
          {t.farm.anim.loading}
        </p>
      )}
    </div>
  );
}

declare global {
  interface Window {
    __farmAnim?: AnimationManager;
  }
}
