import { useEffect, useState } from 'react';

const cache = new Map<string, Promise<void>>();

/** Boot gate settings; tests shorten the timeout because jsdom never loads images. */
export const reelBootConfig = { timeoutMs: 2200 };

/** Loads and decodes an image once; later calls share the same promise. */
export function preloadImage(src: string): Promise<void> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(resolve, resolve);
      else resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
  cache.set(src, p);
  return p;
}

/**
 * Starts loading `sources` a few per animation frame, in order, so a burst of
 * requests never lands inside one frame. Returns a cancel function.
 */
export function preloadGradually(sources: readonly string[], perFrame = 3): () => void {
  let i = 0;
  let id = 0;
  const pending = [...new Set(sources)].filter((src) => !cache.has(src));
  const step = () => {
    for (let n = 0; n < perFrame && i < pending.length; n++) void preloadImage(pending[i++]!);
    if (i < pending.length) id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

/**
 * Boot gate: waits for the first visible thumbnails (bounded by a timeout so a
 * slow network never blocks the scene) and reports progress 0–1.
 */
export function useAssetPreloader(sources: string[], timeoutMs = reelBootConfig.timeoutMs) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(sources.length === 0);
  const key = sources.join('|');

  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (list.length === 0) return;
    let cancelled = false;
    let done = 0;
    const finish = () => {
      if (!cancelled) setReady(true);
    };
    const timer = setTimeout(finish, timeoutMs);
    Promise.all(
      list.map((src) =>
        preloadImage(src).then(() => {
          done++;
          if (!cancelled) setProgress(done / list.length);
        }),
      ),
    ).then(finish);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, timeoutMs]);

  return { ready, progress };
}
