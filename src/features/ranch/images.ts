/** Effects quality, as useGame() reports it. */
export type Quality = 'low' | 'medium' | 'high';

/*
 * Sprite cache for the ranch canvases. Images load once per URL and are drawn only when ready;
 * `onReady` lets a paused (reduced-motion) scene repaint when a late image arrives.
 */
const cache = new Map<string, HTMLImageElement>();
const waiters = new Set<() => void>();

export function sprite(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = cache.get(url);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.onload = () => waiters.forEach((w) => w());
    img.src = url;
    cache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function onSpriteReady(fn: () => void): () => void {
  waiters.add(fn);
  return () => waiters.delete(fn);
}
