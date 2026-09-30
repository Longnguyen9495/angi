/*
 * Which 3D renderer the garden uses. The React Three Fiber island stays the
 * default and the fallback; the PlayCanvas corner is an opt-in experiment:
 *
 *   ?renderer=playcanvas   switch on (remembered on this device)
 *   ?renderer=three        switch back (remembered)
 *   VITE_GARDEN_RENDERER=playcanvas   build-time default for a test deploy
 *
 * Only one renderer is ever mounted; the other is not loaded at all.
 */

export type GardenRenderer = 'three' | 'playcanvas';

export const RENDERER_KEY = 'bv.garden.renderer';

function parse(v: unknown): GardenRenderer | null {
  return v === 'three' || v === 'playcanvas' ? v : null;
}

export function readRenderer(search: string = window.location.search): GardenRenderer {
  const fromQuery = parse(new URLSearchParams(search).get('renderer'));
  if (fromQuery) {
    rememberRenderer(fromQuery);
    return fromQuery;
  }
  try {
    const stored = parse(localStorage.getItem(RENDERER_KEY));
    if (stored) return stored;
  } catch {
    /* storage blocked: use the build default */
  }
  return parse(import.meta.env.VITE_GARDEN_RENDERER) ?? 'three';
}

export function rememberRenderer(r: GardenRenderer): void {
  try {
    localStorage.setItem(RENDERER_KEY, r);
  } catch {
    /* not remembered — fine */
  }
}
