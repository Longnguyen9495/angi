/*
 * Graphics tiers for the 3D garden, and whether 3D can run at all. Phones get
 * "low" unless they look capable; everything else starts at "medium".
 */

export type Quality = 'low' | 'medium' | 'high';

export interface QualitySettings {
  dpr: [number, number];
  shadows: boolean;
  /** Sun shadow map size (only used when shadows are on). */
  shadowSize: number;
  /** Plants per plot (lushness vs. draw calls). */
  plantsPerPlot: number;
  clouds: number;
  grass: number;
  lights: boolean;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  // Nhẹ: silhouettes, palette and contact blobs; no dynamic shadows, sparse grass.
  low: {
    dpr: [1, 1],
    shadows: false,
    shadowSize: 0,
    plantsPerPlot: 1,
    clouds: 5,
    grass: 70,
    lights: false,
  },
  // Vừa: one soft sun shadow map, moderate foliage.
  medium: {
    dpr: [1, 1.5],
    shadows: true,
    shadowSize: 1024,
    plantsPerPlot: 3,
    clouds: 8,
    grass: 150,
    lights: true,
  },
  // Đẹp: sharper shadows, full foliage, retina.
  high: {
    dpr: [1, 2],
    shadows: true,
    shadowSize: 2048,
    plantsPerPlot: 3,
    clouds: 12,
    grass: 260,
    lights: true,
  },
};

export const QUALITY_LABEL: Record<Quality, string> = { low: 'Nhẹ', medium: 'Vừa', high: 'Đẹp' };

let webgl: boolean | null = null;

/** True when this browser can create a WebGL context (cached). */
export function canUseWebGL(): boolean {
  if (webgl !== null) return webgl;
  // jsdom (tests) has no canvas backend and complains loudly when asked.
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))
    return (webgl = false);
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** A starting tier from what the device tells us; the guest can always change it. */
export function suggestQuality(env: {
  cores?: number;
  memory?: number;
  touch: boolean;
  width: number;
  saveData?: boolean;
}): Quality {
  if (env.saveData) return 'low';
  const cores = env.cores ?? 4;
  const memory = env.memory ?? 4;
  if (env.touch && (cores <= 4 || memory <= 3)) return 'low';
  if (!env.touch && cores >= 8 && memory >= 8 && env.width >= 1280) return 'high';
  return 'medium';
}

export function deviceQuality(): Quality {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return suggestQuality({
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    touch: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    width: window.innerWidth,
    saveData: nav.connection?.saveData,
  });
}
