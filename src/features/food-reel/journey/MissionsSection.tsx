import { CheckCircle, Circle } from '@phosphor-icons/react';
import { getDish } from '../../../data/dishes';
import { DAILY_MISSIONS } from '../../../data/game';
import { missionsToday } from '../../../domain/selectors';
import { useGame } from '../../../state/hooks';

const OUTCOME = { ate: 'Đã ăn', swapped: 'Đổi món', skipped: 'Bỏ bữa' } as const;

export function MissionsSection() {
  const { state, now } = useGame();
  const list = missionsToday(state, now);
  return (
    <ul className="fj-missions">
      {list.map((m) => {
        const def = DAILY_MISSIONS.find((d) => d.id === m.id)!;
        return (
          <li key={m.id} className={`fj-mission ${m.done ? 'is-done' : ''}`}>
            {m.done ? (
              <CheckCircle aria-hidden="true" size={22} weight="fill" />
            ) : (
              <Circle aria-hidden="true" size={22} />
            )}
            <span className="fj-mission__title">{def.title}</span>
            <span className="fj-mission__xp">+{def.xp} XP</span>
            <span className="sr-only">{m.done ? '(đã xong)' : '(chưa xong)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MealLog() {
  const { state } = useGame();
  if (state.history.length === 0) {
    return (
      <p className="fj-note">Chưa có bữa nào được check-in. Check-in đầu tiên sẽ hiện ở đây.</p>
    );
  }
  return (
    <ol className="fj-log">
      {state.history.slice(0, 6).map((h) => {
        const d = new Date(h.at);
        return (
          <li key={`${h.slotKey}-${h.at}`} className="fj-log__row">
            <span className="fj-log__date">
              {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}
            </span>
            <span className="fj-log__dish">{getDish(h.dishId)?.name ?? h.dishId}</span>
            <span className="fj-log__meta">
              {OUTCOME[h.outcome]}
              {h.rating ? ` · ${h.rating}/5` : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
