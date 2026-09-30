import type { CSSProperties, Ref } from 'react';
import { CROPS } from '../../data/game';
import type { CropId } from '../../data/types';
import type { PlotStage } from '../../domain/selectors';
import { cropSprite } from '../../data/sprites';

/**
 * A plant as a raster sprite per crop and stage. The stage is also shown as
 * text next to it; the image itself is decorative.
 */
export function CropVisual({ crop, stage }: { crop: CropId | null; stage: PlotStage }) {
  if (!crop || stage === 'empty') return null;
  return (
    <span className={`crop crop--${stage} crop--${crop}`} aria-hidden="true">
      <img
        className="crop__img"
        src={cropSprite(crop, stage)}
        alt=""
        width={256}
        height={256}
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

/** Harvested produce (pantry chips, harvest flight, cooking). */
export function ProduceImage({ crop, size = 24 }: { crop: CropId; size?: number }) {
  return (
    <img
      className="produce-img"
      src={cropSprite(crop, 'produce')}
      alt=""
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      aria-hidden="true"
    />
  );
}

/** Small seed token (CSS shape) coloured per crop. */
export function SeedToken({
  crop,
  className = '',
  ref,
}: {
  crop: CropId;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}) {
  const style = { '--crop-color': CROPS[crop].color } as CSSProperties;
  return <span ref={ref} className={`seed-token ${className}`} style={style} aria-hidden="true" />;
}
