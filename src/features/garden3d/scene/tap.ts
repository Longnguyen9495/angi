import type { ThreeEvent } from '@react-three/fiber';

/** Taps that moved more than this (px) were drags of the camera, not selections. */
export const TAP_SLOP = 8;

export function isTap(e: ThreeEvent<MouseEvent>): boolean {
  return e.delta <= TAP_SLOP;
}
