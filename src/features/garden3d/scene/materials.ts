import { CanvasTexture, Color, MeshStandardMaterial, SRGBColorSpace } from 'three';

/*
 * Matte, faceted PBR for the whole diorama: no plastic sheen, light that
 * wraps softly. Cached by colour so every "green leaf" shares one program and
 * one uniform set — fewer state changes on phones. Most props are built with
 * the vertex-coloured kit (./kit.ts); this is for small single-colour bits.
 */

const cache = new Map<string, MeshStandardMaterial>();

export function mat(color: string, opts: { emissive?: string; transparent?: number } = {}) {
  const key = `${color}|${opts.emissive ?? ''}|${opts.transparent ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color: new Color(color),
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
    });
    if (opts.emissive) {
      m.emissive = new Color(opts.emissive);
      m.emissiveIntensity = 1.1;
    }
    if (opts.transparent !== undefined) {
      m.transparent = true;
      m.opacity = opts.transparent;
      m.depthWrite = false;
    }
    cache.set(key, m);
  }
  return m;
}

/** Palette shared by the scene pieces. */
export const C = {
  // Olive, fresh and moss greens mixed on the lawn — never one flat neon green.
  grass: '#7fae4e',
  grassDark: '#5e8f3c',
  grassOlive: '#93a24a',
  moss: '#557a35',
  dirt: '#8a5e3c',
  dirtDark: '#6b4730',
  soil: '#6e4b30',
  soilWet: '#4a3121',
  rock: '#9a9083',
  rockDark: '#766d62',
  rockWarm: '#b3a58f',
  // Honey and warm browns.
  wood: '#b07a42',
  woodDark: '#7d5534',
  woodLight: '#c9975a',
  // Faded terracotta tiles.
  roofRed: '#b85a3e',
  roofDark: '#8f4630',
  wall: '#efdfc1',
  leaf: '#6a9f45',
  leafDark: '#4a7d35',
  leafLight: '#9cc567',
  gold: '#e6c052',
  red: '#e2412b',
  white: '#fbf7ee',
  water: '#6fb8e0',
  purple: '#a77fd0',
  yellow: '#f4d03f',
  copper: '#c9663d',
  cloud: '#ffffff',
  stone: '#c9c0b0',
} as const;

/**
 * A flat text label as a texture (for signs like "Cấp 3"), drawn with the
 * page's fonts so Vietnamese diacritics render properly.
 */
export function labelTexture(text: string, opts: { bg?: string; fg?: string } = {}): CanvasTexture {
  const scale = 2;
  const font = `600 ${28 * scale}px "Be Vietnam Pro", system-ui, sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  let width = 200;
  if (probe) {
    probe.font = font;
    width = Math.ceil(probe.measureText(text).width) + 40 * scale;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 64 * scale;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = opts.bg ?? 'rgba(20,16,12,0.82)';
    const r = 30 * scale;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, r);
    ctx.fill();
    ctx.font = font;
    ctx.fillStyle = opts.fg ?? '#f4ede1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
