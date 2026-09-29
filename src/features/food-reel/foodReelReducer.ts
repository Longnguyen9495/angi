import { dishAt, reelCount } from './data/reelCatalogue';
import { planSpin } from './engine/spin';
import type { ReelEvent, ReelState } from './foodReel.types';
import { accepts } from './foodReelMachine';

export function initialReelState(index = 0): ReelState {
  return {
    phase: 'booting',
    index,
    spin: null,
    spinCount: 0,
    winnerId: null,
    ready: false,
    detailId: null,
    returnPhase: 'idle',
    pendingSpin: false,
    chosenId: null,
  };
}

/** Pure scene reducer. Guards live in TRANSITIONS; each case assumes a valid phase. */
export function foodReelReducer(
  state: ReelState,
  event: ReelEvent,
  count = reelCount(),
): ReelState {
  if (!accepts(state.phase, event.type)) return state;

  switch (event.type) {
    case 'ASSETS_READY':
      return { ...state, phase: 'idle' };

    case 'DRAG_START':
      return { ...state, phase: 'dragging', ready: false, winnerId: null };

    case 'DRAG_MOVE':
      // Continuous position lives in the physics engine; the scene only tracks phase.
      return state;

    case 'DRAG_END':
      return { ...state, phase: 'idle', index: Math.round(event.index) };

    case 'NAVIGATE':
      return {
        ...state,
        phase: 'idle',
        index: Math.round(event.index),
        winnerId: null,
        ready: false,
      };

    case 'SPIN': {
      const spin = planSpin(state.index, event.seed, count);
      return {
        ...state,
        phase: 'spinning',
        spin,
        spinCount: state.spinCount + 1,
        winnerId: dishAt(spin.target).id,
        ready: false,
        pendingSpin: false,
        chosenId: null,
      };
    }

    case 'DECELERATE':
      return { ...state, phase: 'settling' };

    case 'SETTLE':
      if (!state.spin || event.dishId !== state.winnerId) return state;
      return { ...state, phase: 'selected', index: state.spin.target, ready: false };

    case 'UNLOCK':
      return state.ready ? state : { ...state, ready: true };

    case 'OPEN_DETAIL': {
      if (state.phase === 'selected' && !state.ready) return state;
      const detailId =
        event.dishId ??
        (state.phase === 'selected' && state.winnerId ? state.winnerId : dishAt(state.index).id);
      return {
        ...state,
        phase: 'opening-detail',
        detailId,
        returnPhase: state.phase === 'selected' ? 'selected' : 'idle',
      };
    }

    case 'DETAIL_OPENED':
      return { ...state, phase: 'detail' };

    case 'CLOSE_DETAIL':
      return { ...state, phase: 'closing-detail', pendingSpin: event.then === 'spin' };

    case 'DETAIL_CLOSED':
      return {
        ...state,
        phase: state.returnPhase,
        detailId: null,
        ready: state.returnPhase === 'selected',
      };

    case 'CONFIRM_DISH':
      return { ...state, phase: 'confirming' };

    case 'CONFIRMED':
      return { ...state, phase: 'chosen', chosenId: state.detailId, detailId: null };

    case 'CONFIRM_FAILED':
      return { ...state, phase: 'detail' };

    case 'RESET':
      return {
        ...state,
        phase: 'idle',
        winnerId: null,
        ready: false,
        detailId: null,
        chosenId: null,
        pendingSpin: false,
      };
  }
}
