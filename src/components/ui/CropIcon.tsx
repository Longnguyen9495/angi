import type { CropId } from '../../data/types';
import { cropSprite } from '../../data/sprites';

/** Small crop mark for chips and lists: the produce sprite, so every crop has one. */
export function CropIcon({ crop, size = 16 }: { crop: CropId; size?: number }) {
  return (
    <img
      className="crop-icon"
      src={cropSprite(crop, 'produce')}
      alt=""
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      aria-hidden="true"
      style={{ width: size + 4, height: size + 4, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
