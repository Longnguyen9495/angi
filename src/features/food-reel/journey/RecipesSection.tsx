import { CookingPot, LockSimple, SealCheck } from '@phosphor-icons/react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { RECIPE_LIST, produceName, produceUnlockLevel, recipeRegionName } from '../../../data/game';
import type { RecipeId } from '../../../data/types';
import {
  produceAvailable,
  recipeAvailable,
  recipeProgress,
  regionProgress,
} from '../../../domain/selectors';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';

const m = t.journey.recipes;
const STATUS = m.status;

/** Recipes fill from harvested ingredients plus crops still in the ground. */
export function RecipesSection({ onCook }: { onCook: (recipe: RecipeId) => void }) {
  const { state } = useGame();
  // Ready to cook first, then the closest to ready: with a recipe per catalogue dish the
  // list is long, and what can be cooked soon belongs at the top.
  const open = RECIPE_LIST.filter((r) => recipeAvailable(state, r.id))
    .map((r) => ({ r, p: recipeProgress(state, r.id) }))
    .sort(
      (a, b) =>
        Number(b.p.canCook) - Number(a.p.canCook) ||
        b.p.secured / b.p.total - a.p.secured / a.p.total,
    )
    .map(({ r }) => r);
  const locked = RECIPE_LIST.filter((r) => !recipeAvailable(state, r.id));

  return (
    <>
      <ol className="fj-recipes">
        {open.map((r, i) => {
          const p = recipeProgress(state, r.id);
          const have = p.ingredients.reduce((s, x) => s + Math.min(x.qty, x.have), 0);
          const cooked = state.cooked[r.id] ?? 0;
          return (
            <li key={r.id} className="fj-recipe">
              <div className="fj-recipe__head">
                <span className="fj-recipe__no" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="fj-recipe__name">{r.name}</h3>
                <span className={`fj-region-tag fj-region-tag--${r.region}`}>
                  {recipeRegionName(r)}
                </span>
              </div>
              <ProgressBar
                label={m.progress(r.name)}
                hideLabel
                value={have}
                pending={p.secured - have}
                max={p.total}
                valueText={m.progressText(p.secured, p.total, Math.max(0, p.secured - have))}
                size="sm"
                tone={r.region === 'world' ? 'accent' : r.region}
              />
              <ul className="fj-ingredients">
                {p.ingredients.map((x) => {
                  const status = !produceAvailable(state, x.crop)
                    ? 'locked'
                    : x.have >= x.qty
                      ? 'have'
                      : x.growing > 0
                        ? 'growing'
                        : 'missing';
                  return (
                    <li key={x.crop} className={`fj-ingredient fj-ingredient--${status}`}>
                      <CropIcon crop={x.crop} size={14} />
                      {produceName(x.crop)}
                      <span className="fj-ingredient__status">{STATUS[status]}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="fj-recipe__foot">
                {p.canCook ? (
                  <button type="button" className="fr-cta" onClick={() => onCook(r.id)}>
                    <CookingPot aria-hidden="true" size={18} />
                    {m.cook(r.name)}
                  </button>
                ) : (
                  <p className="fj-note">
                    {(() => {
                      const lockedCrop = p.ingredients.find(
                        (x) => !produceAvailable(state, x.crop),
                      );
                      if (lockedCrop) {
                        return m.needLocked(
                          produceName(lockedCrop.crop).toLowerCase(),
                          produceUnlockLevel(lockedCrop.crop),
                        );
                      }
                      return p.ingredients.some((x) => x.have < x.qty && x.growing === 0)
                        ? m.pickDish
                        : m.waitGrow;
                    })()}
                  </p>
                )}
                <span className="fj-recipe__xp">+{r.xp} XP</span>
                {cooked > 0 && (
                  <span className="fj-recipe__cooked">
                    <SealCheck aria-hidden="true" size={16} weight="fill" /> {m.cooked(cooked)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {locked.length > 0 && (
        <div className="fj-locked">
          <h3 className="fj-h3">{m.lockedTitle(locked.length)}</h3>
          <ul className="fj-locked__list">
            {locked.map((r) => {
              const need = r.region === 'world' ? 0 : regionProgress(state, r.region).stampsNeeded;
              return (
                <li key={r.id} className="fj-locked__item">
                  <LockSimple aria-hidden="true" size={14} />
                  <span className="fj-locked__name">{r.name}</span>
                  <span className={`fj-region-tag fj-region-tag--${r.region}`}>
                    {recipeRegionName(r)}
                  </span>
                  <span className="fj-locked__note">
                    {r.region === 'world' ? m.opensAbroad : m.opensWith(recipeRegionName(r))}
                    {need > 0 ? m.stampsLeft(need) : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
