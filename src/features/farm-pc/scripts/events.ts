import type { AppBase } from 'playcanvas';
import type { FarmEffect, FarmEnv, FarmView } from '../contract';

/*
 * App-level events between the game host and scene scripts. The host fires
 * them; scripts only listen and animate. Scripts never write progress, never
 * call the network and never decide a reward — the domain already did.
 *
 * The same names are what an Editor-authored scene listens to
 * (plans/playcanvas-editor-pipeline.md, giai đoạn 4).
 */

export const FARM_EVENTS = {
  /** FarmView: plots (crop, stage, wet, thirsty) and the current selection. */
  view: 'farm:view',
  /** FarmEffect: plant / water / harvest on plot ids, fired after the domain accepted it. */
  effect: 'farm:effect',
  /** FarmEnv: day part, quality tier, reduced motion. */
  env: 'farm:env',
} as const;

const lastEnv = new WeakMap<AppBase, FarmEnv>();
const lastView = new WeakMap<AppBase, FarmView>();

/** Latest env, so a script created later (a new crop) starts in the right state. */
export function currentEnv(app: AppBase): FarmEnv | undefined {
  return lastEnv.get(app);
}

export function currentView(app: AppBase): FarmView | undefined {
  return lastView.get(app);
}

export function emitEnv(app: AppBase, env: FarmEnv) {
  lastEnv.set(app, env);
  app.fire(FARM_EVENTS.env, env);
}

export function emitView(app: AppBase, view: FarmView) {
  lastView.set(app, view);
  app.fire(FARM_EVENTS.view, view);
}

export function emitEffect(app: AppBase, effect: FarmEffect) {
  app.fire(FARM_EVENTS.effect, effect);
}

/** Night and evening light the lamps; brightness 0–1 by day part. */
export const LAMP_LEVEL: Record<FarmEnv['dayPart'], number> = {
  morning: 0,
  noon: 0,
  evening: 0.6,
  night: 1,
};
