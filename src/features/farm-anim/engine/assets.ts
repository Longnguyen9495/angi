import type { FarmLayout } from './types';

export const ASSET_BASE = '/farm-anim/';

export interface Assets {
  layout: FarmLayout;
  img: (file: string) => HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`could not load ${src}`));
    im.src = src;
  });
}

/**
 * Loads layers.json and every image it names (all are small except island and sky).
 * The files keep their names across repaints, so layers.json is always revalidated and its
 * ETag versions the image URLs: a browser never pairs a new layout with stale pictures.
 */
export async function loadAssets(): Promise<Assets> {
  const res = await fetch(`${ASSET_BASE}layers.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`layers.json: ${res.status}`);
  const layout = (await res.json()) as FarmLayout;
  const files = new Set<string>([
    'sky.jpg',
    'island.webp',
    'island-2x.webp',
    layout.water.file,
    layout.glass.file,
    layout.field.soil.file,
  ]);
  if (layout.field.sign) files.add(layout.field.sign.file);
  if (layout.field.grass) files.add(layout.field.grass.file);
  for (const c of layout.clouds) files.add(c.file);
  for (const f of Object.values(layout.fx ?? {})) files.add(f.file);
  for (const s of Object.values(layout.sprites)) files.add(s.file);
  for (const l of layout.layers) {
    files.add(l.file);
    if (typeof l.fruit === 'string') files.add(l.fruit);
  }
  const etag = res.headers.get('etag')?.replace(/\W/g, '');
  const version = etag ? `?v=${etag}` : '';
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...files].map(async (f) => images.set(f, await loadImage(ASSET_BASE + f + version))),
  );
  return {
    layout,
    img: (file) => {
      const im = images.get(file);
      if (!im) throw new Error(`image not loaded: ${file}`);
      return im;
    },
  };
}

/** An offscreen canvas (2D context) of the given size. */
export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}
