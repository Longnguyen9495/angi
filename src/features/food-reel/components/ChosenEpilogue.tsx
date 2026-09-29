import { ArrowsClockwise, Compass } from '@phosphor-icons/react';
import { m } from 'motion/react';
import { useEffect, type CSSProperties } from 'react';
import { RewardPanel } from '../../../components/reward/RewardPanel';
import { SLOT_LABEL, mealSlot, slotKey } from '../../../domain/time';
import { useGame } from '../../../state/hooks';
import type { ReelDish } from '../foodReel.types';
import { splitName } from '../utils';
import { SplitLines } from './SplitLines';

interface ChosenEpilogueProps {
  dish: ReelDish;
  onSpinAgain: () => void;
  onJourney: () => void;
}

/**
 * Scene F: only after a dish is confirmed does the game appear — as an
 * epilogue reusing the idempotent seed reward, never next to the reel.
 */
export function ChosenEpilogue({ dish, onSpinAgain, onJourney }: ChosenEpilogueProps) {
  const { state, now } = useGame();
  const meal = state.meal?.slotKey === slotKey(now) ? state.meal : null;

  useEffect(() => {
    document.getElementById('fr-epilogue-title')?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className="fr-epilogue"
      aria-labelledby="fr-epilogue-title"
      style={{ '--story-bg': dish.palette[0], '--story-accent': dish.palette[2] } as CSSProperties}
    >
      <div className="fr-epilogue__inner">
        <div className="fr-epilogue__hero">
          <m.img
            className="fr-epilogue__img"
            src={dish.image}
            alt={`${dish.name} — ${dish.subtitle}`}
            width={768}
            height={768}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          />
          <div>
            <p className="fr-kicker">Đã chốt cho {SLOT_LABEL[mealSlot(now)]}</p>
            <SplitLines
              as="h2"
              id="fr-epilogue-title"
              className="fr-epilogue__title"
              lines={splitName(dish.name)}
              delay={0.15}
              tabIndex={-1}
            />
            <p className="fr-epilogue__lede">
              Chúc bạn ngon miệng. Món này gửi lại một hạt giống cho khu vườn Hành trình — gieo ngay
              nếu thích, hoặc cứ để trong khay.
            </p>
          </div>
        </div>

        <div className="fr-epilogue__reward">
          {meal ? (
            <RewardPanel key={meal.rewardDishId} meal={meal} justChosen />
          ) : (
            <p className="fr-epilogue__lede">Đang ghi lại lựa chọn của bạn…</p>
          )}
        </div>

        <div className="fr-epilogue__actions">
          <button type="button" className="fr-ghost" onClick={onJourney}>
            <Compass aria-hidden="true" size={16} />
            Mở Hành trình
          </button>
          <button type="button" className="fr-ghost" onClick={onSpinAgain}>
            <ArrowsClockwise aria-hidden="true" size={16} />
            Quay món mới
          </button>
        </div>
      </div>
    </section>
  );
}
