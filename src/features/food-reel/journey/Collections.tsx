import { SealCheck, Trophy } from '@phosphor-icons/react';
import { getRecipe } from '../../../data/game';
import { collectionProgress } from '../../../domain/collections';
import { currentTime } from '../../../domain/time';
import { t } from '../../../i18n';
import { useFeedback, useGame } from '../../../state/hooks';

const m = t.journey.cookbook;

/** Bộ sưu tập món: sets of dishes to cook once each, with a reward for every finished set. */
export function Collections() {
  const { state, dispatch } = useGame();
  const { toast, announce } = useFeedback();
  const sets = collectionProgress(state).filter((c) => c.recipes.length > 0);
  return (
    <section className="fj-sets" aria-labelledby="bo-suu-tap">
      <h3 className="fj-h3" id="bo-suu-tap">
        {m.collectionsTitle}
      </h3>
      <p className="fj-note">{m.collectionsIntro}</p>
      <ul className="fj-sets__list">
        {sets.map((c) => {
          const name = t.data.collections[c.id];
          const claim = () => {
            dispatch({ type: 'CLAIM_COLLECTION', id: c.id, now: currentTime() });
            const message = m.collectionDone(name, c.reward.coins);
            toast({ message, tone: 'reward' });
            announce(message);
          };
          return (
            <li
              key={c.id}
              className={`fj-set${c.complete ? ' is-complete' : ''}${c.claimed ? ' is-claimed' : ''}`}
            >
              <div className="fj-set__head">
                <Trophy aria-hidden="true" size={18} weight={c.complete ? 'fill' : 'regular'} />
                <strong>{name}</strong>
                <span className="fj-set__count">
                  {m.collectionCount(c.cooked, c.recipes.length)}
                </span>
              </div>
              <div
                className="fj-set__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={c.recipes.length}
                aria-valuenow={c.cooked}
                aria-label={name}
              >
                <span style={{ width: `${(100 * c.cooked) / c.recipes.length}%` }} />
              </div>
              <ul className="fj-set__dishes">
                {c.recipes.map((id) => (
                  <li key={id} className={(state.cooked[id] ?? 0) > 0 ? 'is-cooked' : ''}>
                    {getRecipe(id).name}
                  </li>
                ))}
              </ul>
              {c.claimed ? (
                <p className="fj-order__done">
                  <SealCheck aria-hidden="true" size={16} weight="fill" /> {m.collectionClaimed}
                </p>
              ) : c.complete ? (
                <button type="button" className="fr-cta" onClick={claim}>
                  {m.collectionClaim(c.reward.coins, c.reward.xp)}
                </button>
              ) : (
                <p className="fj-set__reward">{m.collectionReward(c.reward.coins, c.reward.xp)}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
