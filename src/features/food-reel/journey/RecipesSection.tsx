import { CookingPot, SealCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { CROPS, RECIPE_LIST, REGIONS } from '../../../data/game';
import type { RecipeId } from '../../../data/types';
import { recipeProgress } from '../../../domain/selectors';
import { currentTime } from '../../../domain/time';
import { useFeedback, useGame } from '../../../state/hooks';

const STATUS = { have: 'Có', growing: 'Đang lớn', missing: 'Thiếu' } as const;

/** Recipes fill from harvested ingredients plus crops still in the ground. */
export function RecipesSection() {
  const { state, dispatch } = useGame();
  const { toast } = useFeedback();
  const [justCooked, setJustCooked] = useState<RecipeId | null>(null);

  return (
    <ol className="fj-recipes">
      {RECIPE_LIST.map((r, i) => {
        const p = recipeProgress(state, r.id);
        const have = p.ingredients.reduce((s, x) => s + Math.min(x.qty, x.have), 0);
        const cooked = state.cooked[r.id] ?? 0;
        return (
          <li key={r.id} className={`fj-recipe ${justCooked === r.id ? 'is-cooked' : ''}`}>
            <div className="fj-recipe__head">
              <span className="fj-recipe__no" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="fj-recipe__name">{r.name}</h3>
              <span className={`fj-region-tag fj-region-tag--${r.region}`}>
                {REGIONS[r.region].name}
              </span>
            </div>
            <ProgressBar
              label={`Tiến độ ${r.name}`}
              hideLabel
              value={have}
              pending={p.secured - have}
              max={p.total}
              valueText={`${p.secured}/${p.total} nguyên liệu${p.secured > have ? ` · ${p.secured - have} đang lớn` : ''}`}
              size="sm"
              tone={r.region}
            />
            <ul className="fj-ingredients">
              {p.ingredients.map((x) => {
                const status = x.have >= x.qty ? 'have' : x.growing > 0 ? 'growing' : 'missing';
                return (
                  <li key={x.crop} className={`fj-ingredient fj-ingredient--${status}`}>
                    <CropIcon crop={x.crop} size={14} />
                    {CROPS[x.crop].produceName}
                    <span className="fj-ingredient__status">{STATUS[status]}</span>
                  </li>
                );
              })}
            </ul>
            <div className="fj-recipe__foot">
              {p.canCook ? (
                <button
                  type="button"
                  className="fr-cta"
                  onClick={() => {
                    dispatch({ type: 'COOK', recipeId: r.id, now: currentTime() });
                    setJustCooked(r.id);
                    toast({ message: `Đã nấu ${r.name}! +${r.xp} XP.`, tone: 'success' });
                  }}
                >
                  <CookingPot aria-hidden="true" size={18} />
                  Nấu {r.name}
                </button>
              ) : (
                <p className="fj-note">
                  {p.ingredients.some((x) => x.have < x.qty && x.growing === 0)
                    ? 'Chốt một món có nguyên liệu còn thiếu để nhận hạt.'
                    : 'Chờ cây lớn rồi thu hoạch là nấu được.'}
                </p>
              )}
              <span className="fj-recipe__xp">+{r.xp} XP</span>
              {cooked > 0 && (
                <span className="fj-recipe__cooked">
                  <SealCheck aria-hidden="true" size={16} weight="fill" /> Đã nấu ×{cooked}
                </span>
              )}
            </div>
            {justCooked === r.id && <p className="fj-recipe__fact">{r.fact}</p>}
          </li>
        );
      })}
    </ol>
  );
}
