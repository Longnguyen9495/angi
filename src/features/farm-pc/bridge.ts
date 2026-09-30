import type { GuestProgress } from '../../domain/progress';
import { gameReducer, type Action } from '../../domain/reducer';
import {
  isGrowing,
  isWet,
  plotGrowth,
  plotStage,
  readyPlots,
  waterBlock,
} from '../../domain/selectors';
import type { FarmBlock, FarmCommand, FarmEffect, FarmSelection, FarmView } from './contract';

/*
 * Pure glue between the domain and the PlayCanvas corner. Everything here is
 * testable without WebGL: the engine only ever receives the output of
 * buildFarmView, and every command is checked by the real reducer.
 */

/** Domain → engine: what the corner draws, derived from real progress. */
export function buildFarmView(
  state: GuestProgress,
  now: number,
  selected: FarmSelection,
  watering: boolean,
): FarmView {
  return {
    plots: state.plots.map((p) => {
      const stage = plotStage(p, now);
      return {
        id: p.id,
        crop: p.crop,
        stage,
        growth: Math.round(plotGrowth(p, now) * 50) / 50,
        wet: isWet(p, now),
        thirsty: watering && isGrowing(stage) && waterBlock(state, p, now) === null,
      };
    }),
    selected,
  };
}

/** Cheap equality key so the host pushes a view only when something visible changed. */
export function viewKey(view: FarmView): string {
  return JSON.stringify(view);
}

export type CommandPlan =
  { ok: true; action: Action; effect: FarmEffect } | { ok: false; reason: FarmBlock };

/**
 * Turns an action-bar command into the existing reducer action, or explains
 * why not. The reducer itself has the last word: if it would leave the state
 * untouched the command is rejected, so the scene can never show a result the
 * domain did not accept.
 */
export function planCommand(state: GuestProgress, now: number, cmd: FarmCommand): CommandPlan {
  let action: Action;
  let effect: FarmEffect;
  if (cmd.kind === 'plant') {
    const plot = state.plots.find((p) => p.id === cmd.plotId);
    if (!plot) return { ok: false, reason: 'no-plot' };
    if (plot.crop !== null) return { ok: false, reason: 'occupied' };
    if (state.seeds[cmd.crop] <= 0) return { ok: false, reason: 'no-seed' };
    action = { type: 'PLANT_FROM_TRAY', crop: cmd.crop, plotId: plot.id, now };
    effect = { kind: 'plant', plotIds: [plot.id] };
  } else if (cmd.kind === 'water') {
    const plot = state.plots.find((p) => p.id === cmd.plotId);
    if (!plot) return { ok: false, reason: 'no-plot' };
    const block = waterBlock(state, plot, now);
    if (block) return { ok: false, reason: block };
    action = { type: 'WATER', plotId: plot.id, now };
    effect = { kind: 'water', plotIds: [plot.id] };
  } else {
    // The existing rule harvests every ripe plot at once.
    const ready = readyPlots(state.plots, now);
    if (ready.length === 0) return { ok: false, reason: 'nothing-ready' };
    action = { type: 'HARVEST_ALL', now };
    effect = { kind: 'harvest', plotIds: ready.map((p) => p.id) };
  }
  if (gameReducer(state, action) === state) return { ok: false, reason: 'rejected' };
  return { ok: true, action, effect };
}

export const BLOCK_TEXT: Record<FarmBlock, string> = {
  'no-plot': 'Không tìm thấy ô đất này.',
  occupied: 'Ô này đã có cây.',
  'no-seed': 'Khay đã hết loại hạt này.',
  'not-growing': 'Chỉ tưới được cây đang lớn.',
  wet: 'Đất còn ẩm — tưới lại sau 1 giờ.',
  'empty-can': 'Hết lượt tưới hôm nay.',
  'nothing-ready': 'Chưa có ô nào chín.',
  busy: 'Đang xử lý thao tác trước…',
  rejected: 'Thao tác chưa thực hiện được.',
};

/**
 * One command per progress version. A double tap arrives before React has
 * re-rendered with the new state, so both taps would pass planCommand on the
 * same (stale) state; the gate lets only the first through until the state
 * object changes. The reducer's own ledger keys stay the real guarantee.
 */
export class CommandGate {
  private sentFor: unknown = null;

  /** True if a command may go out for this state version. */
  enter(state: unknown): boolean {
    if (this.sentFor === state) return false;
    this.sentFor = state;
    return true;
  }

  /** The command did not reach the domain (it was blocked): allow another. */
  release(): void {
    this.sentFor = null;
  }
}
