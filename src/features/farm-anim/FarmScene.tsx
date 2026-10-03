import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import {
  AnimationManager,
  type CameraView,
  type FarmPlace,
  type FocusName,
  type PlaceInfo,
  type Stats,
} from './engine/AnimationManager';
import type { FarmView } from './systems/FarmGameLayer';
import type { SkyMood } from './systems/SkySystem';
import { loadAssets } from './engine/assets';
import './farm-anim.css';

export type { CameraView, FarmPlace, FocusName, PlaceInfo };
export type { BubbleView, FarmView, PlotKindView, PlotView } from './systems/FarmGameLayer';

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
  /** Game mode: glide the camera to centre picture point (x, y). */
  panTo: (x: number, y?: number) => void;
  /** Game mode: glide the camera to a named stop (the field, the barn yard). */
  panToPlace: (name: FocusName) => void;
}

/**
 * The living floating farm (painted layers, wind, water, animals) in a canvas that fills its box.
 * Taps on the pond, cows, hens, farmhouse, market or field are reported through `onPlace`.
 * Renders nothing if the scene cannot load (the rest of the page keeps working).
 */
export default function FarmScene({
  className = '',
  reduced = false,
  quality = 'high',
  insetBottom = 0,
  flyTarget,
  farm = null,
  onPlace,
  onReady,
  label = t.farm.anim.title,
  mode = 'scene',
  focus,
  onCamera,
  onPanStart,
  sky,
  onManager,
  onStats,
  zoom,
}: {
  className?: string;
  /** The game's reduced-motion setting (the system setting is always honoured too). */
  reduced?: boolean;
  /** Graphics quality: particle budget and burst sizes. */
  quality?: 'low' | 'medium' | 'high';
  /** Game: CSS px at the bottom covered by the UI (seed tray, dock); the island sits above. */
  insetBottom?: number;
  /** CSS selector of the page element harvested produce flies to (e.g. the pantry button). */
  flyTarget?: string;
  /** The game drawn into the scene (plots, animal bubbles); null = scenery only. */
  farm?: FarmView | null;
  onPlace?: (place: FarmPlace, info: PlaceInfo) => void;
  onReady?: (api: FarmSceneApi) => void;
  label?: string;
  /** 'game': full screen, large island, drag to move the camera. */
  mode?: 'scene' | 'game';
  /** Picture point (or named stop) the game camera starts on. */
  focus?: [number, number] | FocusName;
  onCamera?: (v: CameraView) => void;
  onPanStart?: () => void;
  /** Hour and weather painted into the sky behind the island (default: clear midday). */
  sky?: SkyMood;
  /** The running scene itself (the animation showcase drives it directly). */
  onManager?: (m: AnimationManager | null) => void;
  /** Frame rate, object count and wind, twice a second. */
  onStats?: (s: Stats) => void;
  /** Game: closer than the fit (read once, like the mode). */
  zoom?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const manager = useRef<AnimationManager | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Latest callbacks without restarting the scene.
  const onPlaceRef = useRef(onPlace);
  const onReadyRef = useRef(onReady);
  const onCameraRef = useRef(onCamera);
  const onPanStartRef = useRef(onPanStart);
  const onManagerRef = useRef(onManager);
  const onStatsRef = useRef(onStats);
  // Read once: the camera mode and start point are fixed for the life of the scene.
  const start = useRef({ mode, focus, zoom });
  useEffect(() => {
    onPlaceRef.current = onPlace;
    onReadyRef.current = onReady;
    onCameraRef.current = onCamera;
    onPanStartRef.current = onPanStart;
    onManagerRef.current = onManager;
    onStatsRef.current = onStats;
  });

  useEffect(() => {
    let cancelled = false;
    let m: AnimationManager | null = null;
    loadAssets()
      .then((assets) => {
        if (cancelled || !ref.current) return;
        m = new AnimationManager(ref.current, assets, {
          onPlace: (p, info) => onPlaceRef.current?.(p, info),
          mode: start.current.mode,
          focus: start.current.focus,
          zoom: start.current.zoom,
          onCamera: (v) => onCameraRef.current?.(v),
          onPanStart: () => onPanStartRef.current?.(),
          onStats: (st) => onStatsRef.current?.(st),
        });
        manager.current = m;
        window.__farmAnim = m;
        m.start();
        setState('ready');
        onManagerRef.current?.(m);
        onReadyRef.current?.({
          jump: () => m?.jump(),
          cast: (x, y) => m?.cast(x, y),
          bite: (x, y) => m?.bite(x, y),
          plotScreen: (id) => m?.plotScreen(id) ?? null,
          plotAtClient: (x, y) => m?.plotAtClient(x, y) ?? null,
          select: (id) => m?.select(id),
          dropTarget: (id) => m?.dropTarget(id),
          panTo: (x, y) => m?.panTo(x, y),
          panToPlace: (name) => m?.panToPlace(name),
        });
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
      m?.destroy();
      if (m) onManagerRef.current?.(null);
      manager.current = null;
      if (window.__farmAnim === m) delete window.__farmAnim;
    };
  }, []);

  useEffect(() => {
    manager.current?.setReduced(reduced);
  }, [reduced, state]);

  useEffect(() => {
    manager.current?.setQuality(quality);
  }, [quality, state]);

  useEffect(() => {
    manager.current?.setInsetBottom(insetBottom);
  }, [insetBottom, state]);

  useEffect(() => {
    manager.current?.setFlyTarget(flyTarget ?? null);
  }, [flyTarget, state]);

  useEffect(() => {
    manager.current?.setFarm(farm);
  }, [farm, state]);

  const skyPart = sky?.part ?? 'noon';
  const skyWeather = sky?.weather ?? 'clear';
  useEffect(() => {
    manager.current?.setSky({ part: skyPart, weather: skyWeather });
  }, [skyPart, skyWeather, state]);

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
