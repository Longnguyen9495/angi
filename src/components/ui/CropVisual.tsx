import type { CSSProperties, Ref } from 'react';
import { CROPS } from '../../data/game';
import type { CropId } from '../../data/types';
import type { PlotStage } from '../../domain/selectors';

/**
 * Plant drawn with DOM + pseudo-elements only (stem, two leaves, fruit).
 * Stage is shown through shape/size; text labels live next to it.
 */
export function CropVisual({ crop, stage }: { crop: CropId | null; stage: PlotStage }) {
  if (!crop || stage === 'empty') return null;
  const style = { '--crop-color': CROPS[crop].color } as CSSProperties;
  return (
    <span className={`crop crop--${stage} crop--${crop}`} style={style} aria-hidden="true">
      <span className="crop__stem" />
      <span className="crop__leaf crop__leaf--l" />
      <span className="crop__leaf crop__leaf--r" />
      {stage === 'ready' && <span className="crop__fruit" />}
    </span>
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
