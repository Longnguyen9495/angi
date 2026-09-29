import { ArrowsClockwise, CalendarCheck, SealCheck } from '@phosphor-icons/react';
import { RewardPanel } from '../../../components/reward/RewardPanel';
import { getDish } from '../../../data/dishes';
import { SLOT_LABEL, mealSlot, slotKey } from '../../../domain/time';
import { useGame, useUi } from '../../../state/hooks';
import { getReelDish } from '../data/reelCatalogue';

const OUTCOME = { ate: 'đã ăn', swapped: 'đổi món', skipped: 'bỏ bữa' } as const;

/** "Bữa này": the meal chosen for the current slot, its seed and its check-in. */
export function CurrentMeal({ onSpin }: { onSpin: () => void }) {
  const { state, now } = useGame();
  const { openCheckIn } = useUi();
  const meal = state.meal?.slotKey === slotKey(now) ? state.meal : null;
  const dish = meal ? getDish(meal.dishId) : undefined;
  const reel = meal ? getReelDish(meal.dishId) : undefined;
  const slot = SLOT_LABEL[mealSlot(now)];
  const last = state.history[0];

  if (!meal || !dish) {
    return (
      <div className="fj-meal fj-meal--empty">
        <p className="fj-lede">
          Chưa chốt món cho {slot}. Quay reel, chọn một món — món đó gửi lại một hạt giống cho khu
          vườn.
        </p>
        <button type="button" className="fr-cta" onClick={onSpin}>
          <ArrowsClockwise aria-hidden="true" size={18} />
          Quay món
        </button>
      </div>
    );
  }

  return (
    <div className="fj-meal">
      <div className="fj-meal__dish">
        {reel && <img className="fj-plate" src={reel.thumbnail} alt="" width={384} height={384} />}
        <div className="fj-meal__copy">
          <p className="fr-kicker">Đã chốt cho {slot}</p>
          <p className="fj-meal__name">{dish.name}</p>
          <ul className="fj-tags" aria-label="Trạng thái bữa này">
            <li className={meal.planted ? 'is-on' : ''}>
              {meal.planted ? 'Đã gieo hạt' : 'Hạt đang trong khay'}
            </li>
            <li className={meal.checkedIn ? 'is-on' : ''}>
              {meal.checkedIn
                ? `Đã check-in${last?.slotKey === meal.slotKey ? ` · ${OUTCOME[last.outcome]}` : ''}`
                : 'Chờ check-in sau bữa'}
            </li>
          </ul>
          {meal.checkedIn ? (
            <p className="fj-note">
              <SealCheck aria-hidden="true" size={16} weight="fill" /> Bữa này đã nhận đủ thưởng.
              Hẹn bữa sau!
            </p>
          ) : (
            <button type="button" className="fr-ghost" onClick={openCheckIn}>
              <CalendarCheck aria-hidden="true" size={16} />
              Check-in bữa này
            </button>
          )}
        </div>
      </div>
      <div className="fj-meal__reward">
        <RewardPanel key={meal.rewardDishId} meal={meal} justChosen={false} />
      </div>
    </div>
  );
}
