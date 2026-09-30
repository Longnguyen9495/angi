import { LockSimple, SealCheck } from '@phosphor-icons/react';
import { RECIPE_LIST, REGIONS } from '../../../data/game';
import { useGame } from '../../../state/hooks';
import { getReelDish } from '../data/reelCatalogue';

/** Sổ bếp: one page per recipe, filled in the first time it is cooked. */
export function Cookbook() {
  const { state } = useGame();
  const pages = RECIPE_LIST;
  const done = pages.filter((r) => (state.cooked[r.id] ?? 0) > 0).length;
  return (
    <div className="fj-book">
      <h3 className="fj-h3" id="so-bep" tabIndex={-1}>
        Sổ bếp · {done}/{pages.length} trang
      </h3>
      <ul className="fj-book__pages">
        {pages.map((r) => {
          const n = state.cooked[r.id] ?? 0;
          const dish = getReelDish(r.dishId);
          return (
            <li key={r.id} className={`fj-page ${n > 0 ? 'is-cooked' : 'is-blank'}`}>
              <span className="fj-page__media">
                {dish && (
                  <img
                    src={dish.thumbnail}
                    alt=""
                    width={384}
                    height={384}
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {n === 0 && (
                  <span className="fj-page__lock" aria-hidden="true">
                    <LockSimple size={18} />
                  </span>
                )}
              </span>
              <span className="fj-page__name">{r.name}</span>
              <span className="fj-page__meta">
                {REGIONS[r.region].name}
                {n > 0 ? (
                  <>
                    {' · '}
                    <SealCheck aria-hidden="true" size={12} weight="fill" /> Đã nấu ×{n}
                  </>
                ) : (
                  ' · Chưa nấu'
                )}
              </span>
              {n > 0 && <span className="fj-page__fact">{r.fact}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
