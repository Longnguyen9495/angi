import type { CropId } from '../../data/types';
import type { PlotStage } from '../../domain/selectors';
import type { Quality } from '../garden3d/quality';

/*
 * The only shapes that cross between React/domain and the PlayCanvas engine.
 * The engine never sees GuestProgress, the reducer or storage: it gets a view
 * of what to draw, and sends back what the guest pointed at.
 */

/** One garden plot as the engine draws it. */
export interface FarmPlotView {
  id: number;
  crop: CropId | null;
  stage: PlotStage;
  /** 0 → 1 share of the grow time done, rounded so minute ticks rarely change it. */
  growth: number;
  wet: boolean;
  /** Watering mode is on and this plot can take water right now. */
  thirsty: boolean;
}

export type FarmSelection = { kind: 'plot'; id: number } | { kind: 'barn' } | null;

/** React/domain → engine: what the corner should show. Sent on change, never per frame. */
export interface FarmView {
  plots: FarmPlotView[];
  selected: FarmSelection;
}

export type DayPart = 'morning' | 'noon' | 'evening' | 'night';

/** React → engine: device and preference settings. */
export interface FarmEnv {
  quality: Quality;
  reduced: boolean;
  dayPart: DayPart;
}

/** Engine → React: the guest tapped something. `null` target = empty ground. */
export type FarmIntent = { type: 'select'; target: FarmSelection };

/** React → engine: a result the domain already accepted, to be shown. Never a transaction. */
export interface FarmEffect {
  kind: 'plant' | 'water' | 'harvest';
  plotIds: number[];
}

/** What the action bar asks the domain to do. */
export type FarmCommand =
  | { kind: 'plant'; plotId: number; crop: CropId }
  | { kind: 'water'; plotId: number }
  | { kind: 'harvest' };

/** Why the domain turned a command down (shown by React, never fixed by the scene). */
export type FarmBlock =
  | 'no-plot'
  | 'occupied'
  | 'no-seed'
  | 'not-growing'
  | 'wet'
  | 'empty-can'
  | 'nothing-ready'
  | 'busy'
  | 'rejected';

export interface FarmEngineOptions {
  canvas: HTMLCanvasElement;
  env: FarmEnv;
  onIntent: (intent: FarmIntent) => void;
  /** WebGL context lost or the device failed after start-up. */
  onLost: () => void;
}

/** The adapter's surface. Implemented by engine/FarmEngine.ts; mocked in tests. */
export interface FarmEngineHandle {
  setView(view: FarmView): void;
  setEnv(env: FarmEnv): void;
  play(effect: FarmEffect): void;
  /** False while scrolled away, the tab is hidden or the drawer is closing. */
  setActive(active: boolean): void;
  /** Canvas box or DPR changed. */
  resize(): void;
  zoom(factor: number): void;
  resetCamera(): void;
  /** Frees GPU resources, listeners and the loop. Safe to call twice. */
  destroy(): void;
}

export type CreateFarmEngine = (opts: FarmEngineOptions) => Promise<FarmEngineHandle>;
