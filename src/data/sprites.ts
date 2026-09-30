import type { CropId, DecorId } from './types';
import type { PlotStage } from '../domain/selectors';

/** Garden sprites (see scripts/generate-crop-sprites.mjs): /images/garden/<crop>-<stage>.webp. */
export function cropSprite(crop: CropId, stage: Exclude<PlotStage, 'empty'> | 'produce'): string {
  return `/images/garden/${crop}-${stage}.webp`;
}

/** Garden decorations bought at the market. */
export function decorSprite(id: DecorId): string {
  return `/images/garden/decor-${id}.webp`;
}
