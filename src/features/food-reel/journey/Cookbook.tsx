import { CookingPot, LockSimple, SealCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import { RECIPE_LIST, REGIONS } from '../../../data/game';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { getReelDish, snapshotThumbnail } from '../data/reelCatalogue';

/**
 * The page photo: the live thumbnail, then the bundled one, then an empty
 * plate — a dish missing from the catalogue or a dead admin upload must not
 * leave a hole in the page.
 */
function PageThumb({ dishId }: { dishId: string }) {
  const sources = [getReelDish(dishId)?.thumbnail, snapshotThumbnail(dishId)].filter(
    (s, i, all): s is string => !!s && all.indexOf(s) === i,
  );
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  if (!src) {
    return (
      <span className="fj-page__plate">
        <CookingPot size={28} weight="light" />
      </span>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt=""
      width={384}
      height={384}
      loading="lazy"
      decoding="async"
      onError={() => setFailed((n) => n + 1)}
    />
  );
}

/** Sổ bếp: one page per recipe, filled in the first time it is cooked. */
export function Cookbook() {
  const { state } = useGame();
  const pages = RECIPE_LIST;
  const done = pages.filter((r) => (state.cooked[r.id] ?? 0) > 0).length;
  return (
    <div className="fj-book">
      <h3 className="fj-h3" id="so-bep" tabIndex={-1}>
        {t.journey.cookbook.title(done, pages.length)}
      </h3>
      <ul className="fj-book__pages">
        {pages.map((r) => {
          const n = state.cooked[r.id] ?? 0;
          return (
            <li key={r.id} className={`fj-page ${n > 0 ? 'is-cooked' : 'is-blank'}`}>
              <span className="fj-page__media">
                <PageThumb dishId={r.dishId} />
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
                    <SealCheck aria-hidden="true" size={12} weight="fill" />{' '}
                    {t.journey.cookbook.cooked(n)}
                  </>
                ) : (
                  t.journey.cookbook.notCooked
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
