import { CheckCircle, Circle } from '@phosphor-icons/react';
import { getDish } from '../../../data/dishes';
import { DAILY_MISSIONS } from '../../../data/game';
import { missionsToday } from '../../../domain/selectors';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';

const m = t.journey.missions;
const OUTCOME = m.outcome;

export function MissionsSection() {
  const { state, now } = useGame();
  const list = missionsToday(state, now);
  return (
    <ul className="fj-missions">
      {list.map((mission) => {
        const def = DAILY_MISSIONS.find((d) => d.id === mission.id)!;
        return (
          <li key={mission.id} className={`fj-mission ${mission.done ? 'is-done' : ''}`}>
            {mission.done ? (
              <CheckCircle aria-hidden="true" size={22} weight="fill" />
            ) : (
              <Circle aria-hidden="true" size={22} />
            )}
            <span className="fj-mission__title">{def.title}</span>
            <span className="fj-mission__xp">+{def.xp} XP</span>
            <span className="sr-only">{mission.done ? m.done : m.notDone}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MealLog() {
  const { state } = useGame();
  if (state.history.length === 0) {
    return <p className="fj-note">{m.logEmpty}</p>;
  }
  return (
    <ol className="fj-log">
      {state.history.slice(0, 6).map((h) => {
        const d = new Date(h.at);
        return (
          <li key={`${h.slotKey}-${h.at}`} className="fj-log__row">
            <span className="fj-log__date">
              {m.logDate(
                String(d.getDate()).padStart(2, '0'),
                String(d.getMonth() + 1).padStart(2, '0'),
              )}
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
