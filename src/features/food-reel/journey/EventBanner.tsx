import { CalendarStar, SealCheck } from '@phosphor-icons/react';
import { EVENT, eventOn, getRecipe, hasRecipe } from '../../../data/game';
import { EVENT_POTS } from '../../../data/skyEconomy';
import { eventDays } from '../../../domain/guests';
import { HOUR_MS, currentTime, dateKey } from '../../../domain/time';
import { t } from '../../../i18n';
import { useFeedback, useGame } from '../../../state/hooks';

const m = t.journey.orders;

/** The event running today: what it is about, its dishes, days served and its milestones. */
export function EventBanner() {
  const { state, now, dispatch } = useGame();
  const { toast, announce } = useFeedback();
  const today = dateKey(now);
  const event = eventOn(today);
  if (!event) return null;
  const copy = t.data.events[event.id];
  const days = eventDays(state, event.id).filter((d) => d >= event.from && d <= event.to).length;
  const claimed = state.events[event.id]?.claimed ?? [];
  const left = Math.round(
    (new Date(`${event.to}T12:00`).getTime() - new Date(`${today}T12:00`).getTime()) /
      (24 * HOUR_MS),
  );
  const dishes = event.recipes.filter((id) => hasRecipe(id));
  // Festival pots for a guest who already has a cloud garden (they come with the last milestone).
  const pots = state.sky ? (EVENT_POTS[event.id] ?? []) : [];
  return (
    <section className="fj-event" aria-labelledby="su-kien">
      <p className="fj-event__kicker">
        <CalendarStar aria-hidden="true" size={16} weight="fill" /> {m.eventKicker} ·{' '}
        {m.eventLeft(left)}
      </p>
      <h3 className="fj-event__title" id="su-kien">
        {copy.name}
      </h3>
      <p className="fj-event__blurb">{copy.blurb}</p>
      <p className="fj-event__label">{m.eventDishes}</p>
      <ul className="fj-set__dishes">
        {dishes.map((id) => (
          <li key={id} className={(state.cooked[id] ?? 0) > 0 ? 'is-cooked' : ''}>
            {getRecipe(id).name}
          </li>
        ))}
      </ul>
      <p className="fj-event__label">{m.eventProgress(days)}</p>
      <ol className="fj-event__steps">
        {event.targets.map((need, step) => {
          const reward = EVENT.rewards[step]!;
          const done = claimed.includes(step);
          const ready = !done && days >= need;
          return (
            <li key={step} className={done ? 'is-done' : ready ? 'is-ready' : ''}>
              <span>{m.eventMilestone(need, reward.coins, reward.xp)}</span>
              {done ? (
                <span className="fj-order__done">
                  <SealCheck aria-hidden="true" size={14} weight="fill" /> {m.eventClaimed}
                </span>
              ) : (
                <button
                  type="button"
                  className="fr-ghost fr-ghost--compact"
                  aria-disabled={!ready}
                  onClick={() => {
                    if (!ready) return;
                    dispatch({ type: 'CLAIM_EVENT', id: event.id, step, now: currentTime() });
                    const message = m.eventDone(copy.name, reward.coins);
                    toast({ message, tone: 'reward' });
                    announce(message);
                  }}
                >
                  {m.eventClaim}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {pots.length > 0 && (
        <p className="fj-note">{m.eventPots(pots.map((p) => t.sky.pots[p]).join(', '))}</p>
      )}
    </section>
  );
}
