import type { Ref } from 'react';
import type { CropId } from '../../data/types';
import { CropVisual, SeedToken } from '../ui/CropVisual';
import { t } from '../../i18n';
import { stepAtLeast, type PlantStep } from './plantSteps';

interface PlantingStageProps {
  crop: CropId;
  cropName: string;
  plotNumber: number | null;
  step: PlantStep;
  particlesRef: Ref<HTMLSpanElement>;
  highlighted: boolean;
}

export function PlantingStage({
  crop,
  cropName,
  plotNumber,
  step,
  particlesRef,
  highlighted,
}: PlantingStageProps) {
  const sprouted = stepAtLeast(step, 'sprout');
  const falling = step === 'drop' || step === 'impact';
  const m = t.account.planting;
  return (
    <figure className={`plant-stage ${highlighted ? 'is-target' : ''}`} data-step={step}>
      <div className="plant-stage__plot">
        <span className="plant-stage__soil" aria-hidden="true" />
        {falling && <SeedToken crop={crop} className="plant-stage__seed" />}
        <span className="plant-stage__sprout" data-visible={sprouted} aria-hidden="true">
          <CropVisual crop={crop} stage="sprout" />
        </span>
        <span className="plant-stage__particles" ref={particlesRef} aria-hidden="true" />
      </div>
      <figcaption className="plant-stage__caption">
        {plotNumber !== null ? m.plotN(plotNumber) : m.plot} ·{' '}
        {sprouted ? m.sprouted(cropName) : m.waiting}
      </figcaption>
    </figure>
  );
}
