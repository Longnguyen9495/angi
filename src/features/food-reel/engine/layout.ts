export type Tier = 'desktop' | 'tablet' | 'mobile';

export interface ReelLayout {
  tier: Tier;
  /** Side of the centre item in px. */
  size: number;
  /** Angular step between neighbours on the cylinder (radians). */
  step: number;
  /** Cylinder radius in px. */
  radius: number;
  /** Items mounted on each side of the centre (virtualisation window). */
  half: number;
  /** Whether fake motion blur via CSS filter is affordable. */
  blur: boolean;
  /** Phones: vertical centre of the reel in px (CSS positions it otherwise). */
  centerY?: number;
}

export function layoutFor(width: number, height: number, saveData = false): ReelLayout {
  if (width >= 1024) {
    const size = Math.round(Math.min(width * 0.4, height * 0.54, 620));
    const step = (21 * Math.PI) / 180;
    return {
      tier: 'desktop',
      size,
      step,
      radius: (size * 1.02) / step,
      half: saveData ? 4 : 6,
      blur: !saveData,
    };
  }
  if (width >= 768) {
    const size = Math.round(Math.min(width * 0.58, height * 0.5));
    const step = (18 * Math.PI) / 180;
    return { tier: 'tablet', size, step, radius: (size * 0.96) / step, half: 5, blur: false };
  }
  const { top, bottom } = mobileBands(width, height);
  const room = height - top - bottom;
  const size = Math.round(Math.max(150, Math.min(width * 0.84, room + 12)));
  const step = (15 * Math.PI) / 180;
  return {
    tier: 'mobile',
    size,
    step,
    radius: (size * 0.82) / step,
    half: saveData ? 3 : 4,
    blur: false,
    // Centre the plate (plus its caption) in the band left between the chrome.
    centerY: Math.round(top + room / 2 - MOBILE_CAPTION / 2),
  };
}

/** Phones shorter than this drop the ingredient rail (see reel.responsive.css). */
export const MOBILE_COMPACT_HEIGHT = 640;
const MOBILE_CAPTION = 34;

/**
 * Vertical space taken by the chrome on phones, mirroring reel.responsive.css:
 * header + two-line headline on top; ingredient rail + dock at the bottom.
 */
function mobileBands(width: number, height: number) {
  const headlineFont = Math.min(width * 0.155, height * 0.082, 83);
  const top = 68 + 1.8 * headlineFont + 30;
  const dock = 112;
  const rail = height < MOBILE_COMPACT_HEIGHT ? 0 : 82;
  return { top, bottom: dock + rail + MOBILE_CAPTION };
}

export interface SceneValues {
  /** 0 → browsing, 1 → winner spotlight (neighbours recede). */
  focus: number;
  speed: number;
  /** Hover on the centre item dims neighbours slightly. */
  hover: number;
  /** ms since the winner settled; drives the 1.04 overshoot. */
  settleAge: number;
  /** Camera pull-back while spinning (1 → 0.94). */
  camera: number;
}

export interface ItemVisual {
  transform: string;
  opacity: number;
  filter: string;
  zIndex: number;
}

/** Winner overshoot: 1 → 1.04 in 160 ms, back to 1 by 420 ms. */
export function overshoot(age: number): number {
  if (age < 0 || !Number.isFinite(age)) return 1;
  if (age < 160) return 1 + 0.04 * (age / 160);
  if (age < 420) {
    const k = (age - 160) / 260;
    return 1 + 0.04 * (1 - k * k * (3 - 2 * k));
  }
  return 1;
}

/**
 * Pure mapping from an item's distance to the camera centre onto its 3D pose.
 * Convex cylinder: neighbours rotate away and recede, so the centre dominates.
 */
export function itemVisual(d: number, layout: ReelLayout, s: SceneValues): ItemVisual {
  const ad = Math.abs(d);
  const theta = d * layout.step;
  const clamped = Math.max(-1.35, Math.min(1.35, theta));
  const depth = layout.tier === 'desktop' ? 1 : layout.tier === 'tablet' ? 0.7 : 0.45;
  const x = Math.sin(clamped) * layout.radius;
  const z = -(1 - Math.cos(clamped)) * layout.radius * depth;
  const y = (1 - Math.cos(clamped)) * layout.size * 0.18;
  const rot = ((-clamped * 180) / Math.PI) * 0.8 * depth;

  const centre = Math.max(0, 1 - ad);
  const baseScale = 1 - Math.min(ad, 4) * 0.07;
  const spotlight = 1 + 0.2 * s.focus * centre;
  const scale = baseScale * spotlight * (ad < 0.5 ? overshoot(s.settleAge) : 1) * s.camera;

  let opacity = Math.max(0, 1 - ad * 0.24);
  // Neighbours fade to ~0.2 in the winner spotlight, ~12% dimmer on hover.
  opacity *= 1 - Math.min(1, ad) * (0.8 * s.focus + 0.13 * s.hover * (1 - s.focus));
  if (ad > layout.half + 0.5) opacity = 0;

  const spinBlur = layout.blur && ad > 0.35 ? Math.min(3, s.speed * 0.05) : 0;
  const focusBlur = layout.blur ? Math.min(1, ad) * 2 * s.focus : 0;
  const blur = Math.min(4, spinBlur + focusBlur);

  return {
    transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
    opacity: Number(opacity.toFixed(3)),
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
    zIndex: 100 - Math.round(ad * 10),
  };
}
