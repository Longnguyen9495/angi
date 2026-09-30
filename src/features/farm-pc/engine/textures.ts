import type { Vec3 } from '../sceneLayout';

/*
 * PBR texture sets for the corner (Poly Haven, CC0). Files live in
 * public/textures/farm/{id}_{diff|nor|arm}.webp and public/env/ — all checked
 * in, so no path here can 404. `avg` is the measured mean sRGB colour of the
 * diffuse map: tints are expressed relative to it so materials keep the art
 * direction's palette instead of the photo's colour.
 */

export type TexSetId =
  | 'leafy_grass'
  | 'brown_mud_02'
  | 'brown_planks_05'
  | 'clay_roof_tiles_02'
  | 'bark_brown_02'
  | 'rock_boulder_dry';

export interface TexSet {
  id: TexSetId;
  avg: Vec3;
  /** Max size shipped (px); diffuse/normal/ARM share it except where noted. */
  size: number;
}

export const TEX_SETS: Record<TexSetId, TexSet> = {
  leafy_grass: { id: 'leafy_grass', avg: [0.593, 0.516, 0.349], size: 1024 },
  brown_mud_02: { id: 'brown_mud_02', avg: [0.302, 0.268, 0.215], size: 512 },
  brown_planks_05: { id: 'brown_planks_05', avg: [0.603, 0.583, 0.532], size: 512 },
  clay_roof_tiles_02: { id: 'clay_roof_tiles_02', avg: [0.57, 0.313, 0.168], size: 1024 },
  bark_brown_02: { id: 'bark_brown_02', avg: [0.371, 0.338, 0.249], size: 512 },
  rock_boulder_dry: { id: 'rock_boulder_dry', avg: [0.658, 0.61, 0.55], size: 512 },
};

export type TexMap = 'diff' | 'nor' | 'arm';

const base = () => import.meta.env.BASE_URL;

export function texUrl(id: TexSetId, map: TexMap): string {
  return `${base()}textures/farm/${id}_${map}.webp`;
}

/** 1K HDR used only to light the scene (image-based lighting). */
export const ENV_HDR = () => `${base()}env/kloofendal_48d_partly_cloudy_puresky_1k.hdr`;
/** Tonemapped copy of the same sky, 2048×1024, for the backdrop behind the island. */
export const ENV_BACKDROP = () => `${base()}env/kloofendal_48d_partly_cloudy_puresky_bg.webp`;

/** Palette colour ÷ texture mean: the diffuse multiplier that recolours the photo. */
export function tintFor(set: TexSetId, target: Vec3): Vec3 {
  const a = TEX_SETS[set].avg;
  return [target[0] / a[0], target[1] / a[1], target[2] / a[2]];
}
