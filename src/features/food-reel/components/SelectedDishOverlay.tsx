import { ArrowLeft, ArrowUpRight, X } from '@phosphor-icons/react';
import { m } from 'motion/react';
import type { ReactNode, Ref } from 'react';
import { formatReelPrice, REGION_LABEL } from '../data/reelCatalogue';
import type { ReelDish } from '../foodReel.types';
import { splitName } from '../utils';
import { SplitLines } from './SplitLines';

interface SelectedDishOverlayProps {
  dish: ReelDish;
  number: number;
  /** Picked from the guest's Rổ quay rather than the whole reel. */
  pooled?: boolean;
  ready: boolean;
  onExplore: () => void;
  onBack: () => void;
  /** Rổ quay only: drop this dish and spin the rest again. */
  onEliminate?: () => void;
  exploreRef?: Ref<HTMLButtonElement>;
  /** Touch layouts put the ingredient rail inside the spotlight copy. */
  extra?: ReactNode;
}

const meta = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.42 + i * 0.07, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const },
});

/** Scene C: winner spotlight copy. CTAs wait for the settle choreography. */
export function SelectedDishOverlay({
  dish,
  number,
  pooled = false,
  ready,
  onExplore,
  onBack,
  onEliminate,
  exploreRef,
  extra,
}: SelectedDishOverlayProps) {
  return (
    <section className="fr-selected" aria-labelledby="fr-selected-title">
      <m.p className="fr-kicker" {...meta(-3)}>
        {pooled ? 'Rổ' : 'Reel'} chọn cho bạn · {String(number).padStart(3, '0')}
      </m.p>
      <SplitLines
        as="h2"
        id="fr-selected-title"
        className="fr-selected__title"
        lines={splitName(dish.name)}
        delay={0.28}
      />
      <m.dl className="fr-selected__meta" {...meta(0)}>
        <div>
          <dt>Vùng</dt>
          <dd>{REGION_LABEL[dish.region]}</dd>
        </div>
        <div>
          <dt>Tham khảo</dt>
          <dd>{formatReelPrice(dish.price)}</dd>
        </div>
        <div>
          <dt>Phần</dt>
          <dd>{dish.subtitle}</dd>
        </div>
      </m.dl>
      <m.p className="fr-selected__story" {...meta(1)}>
        {dish.story}
      </m.p>
      {extra && <m.div {...meta(1.5)}>{extra}</m.div>}
      <m.div className="fr-selected__actions" {...meta(2)}>
        <button
          ref={exploreRef}
          type="button"
          className="fr-cta"
          aria-disabled={!ready}
          onClick={() => {
            if (ready) onExplore();
          }}
        >
          Khám phá món này
          <ArrowUpRight aria-hidden="true" size={18} />
        </button>
        {onEliminate && (
          <button
            type="button"
            className="fr-ghost"
            aria-disabled={!ready}
            onClick={() => {
              if (ready) onEliminate();
            }}
          >
            <X aria-hidden="true" size={16} />
            Loại & quay tiếp
          </button>
        )}
        <button type="button" className="fr-ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={16} />
          Quay lại
        </button>
      </m.div>
    </section>
  );
}
