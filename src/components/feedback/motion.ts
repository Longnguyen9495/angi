/** True when the guest (or the OS) asked for reduced motion. */
export function motionReduced(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.dataset.motion === 'reduced') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
