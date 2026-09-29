import type { ReelEvent, ReelPhase } from './foodReel.types';

type EventType = ReelEvent['type'];

/**
 * Which events each scene accepts. Anything not listed is ignored, which is
 * what keeps double clicks and late timers from breaking a scene.
 */
export const TRANSITIONS: Record<ReelPhase, readonly EventType[]> = {
  booting: ['ASSETS_READY'],
  idle: ['DRAG_START', 'NAVIGATE', 'SPIN', 'OPEN_DETAIL', 'RESET'],
  dragging: ['DRAG_MOVE', 'DRAG_END'],
  spinning: ['DECELERATE', 'SETTLE'],
  settling: ['SETTLE'],
  selected: ['DRAG_START', 'NAVIGATE', 'SPIN', 'UNLOCK', 'OPEN_DETAIL', 'RESET'],
  'opening-detail': ['DETAIL_OPENED', 'CLOSE_DETAIL', 'CONFIRM_DISH'],
  detail: ['CLOSE_DETAIL', 'CONFIRM_DISH'],
  'closing-detail': ['DETAIL_CLOSED'],
  confirming: ['CONFIRMED', 'CONFIRM_FAILED'],
  chosen: ['RESET', 'OPEN_DETAIL'],
};

export function accepts(phase: ReelPhase, event: EventType): boolean {
  return TRANSITIONS[phase].includes(event);
}

/** Phases in which the reel itself can be driven by the user. */
export function isInteractive(phase: ReelPhase): boolean {
  return phase === 'idle' || phase === 'selected';
}

export function isBusy(phase: ReelPhase): boolean {
  return phase === 'spinning' || phase === 'settling';
}

export function isDetailPhase(phase: ReelPhase): boolean {
  return (
    phase === 'opening-detail' ||
    phase === 'detail' ||
    phase === 'closing-detail' ||
    phase === 'confirming'
  );
}
