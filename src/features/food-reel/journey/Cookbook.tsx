import { LockSimple, PuzzlePiece, SealCheck, Star } from '@phosphor-icons/react';
import {
  CHEF_TITLE_AT,
  RECIPE_LIST,
  chefTitleIndex,
  masteryStars,
  recipeRegionName,
  reputation,
} from '../../../data/game';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { Collections } from './Collections';
import { DishPuzzle } from './DishPuzzle';
import { PUZZLE_PIECES, piecesShown } from './puzzle';

/**
 * Sổ bếp: one page per recipe. The first cook opens the page; each cook after
 * that uncovers another of the photo's eight slices until the dish is whole.
 */
export function Cookbook() {
  const { state } = useGame();
  const pages = RECIPE_LIST;
  const done = pages.filter((r) => (state.cooked[r.id] ?? 0) > 0).length;
  const whole = pages.filter((r) => piecesShown(state.cooked[r.id] ?? 0) === PUZZLE_PIECES).length;
  return (
    <div className="fj-book">
      <h3 className="fj-h3" id="so-bep" tabIndex={-1}>
        {t.journey.cookbook.title(done, pages.length)}
      </h3>
      <p className="fj-note">{t.journey.cookbook.puzzleHint(whole, pages.length)}</p>
      <Reputation stars={reputation(state.cooked)} />
      <Collections />
      <ul className="fj-book__pages">
        {pages.map((r) => {
          const n = state.cooked[r.id] ?? 0;
          const shown = piecesShown(n);
          const cls =
            n === 0 ? 'is-blank' : shown === PUZZLE_PIECES ? 'is-cooked is-whole' : 'is-cooked';
          return (
            <li key={r.id} className={`fj-page ${cls}`}>
              <span className="fj-page__media">
                <DishPuzzle recipe={r} cooked={n} />
                {n === 0 && (
                  <span className="fj-page__lock" aria-hidden="true">
                    <LockSimple size={18} />
                  </span>
                )}
              </span>
              <span className="fj-page__name">{r.name}</span>
              {n > 0 && (
                <span
                  className="fj-page__stars"
                  role="img"
                  aria-label={t.journey.orders.stars(masteryStars(n))}
                >
                  {[1, 2, 3].map((k) => (
                    <Star
                      key={k}
                      size={13}
                      weight={k <= masteryStars(n) ? 'fill' : 'regular'}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              )}
              <span className="fj-page__meta">
                {recipeRegionName(r)}
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
              {n > 0 && (
                <span className="fj-page__pieces">
                  <PuzzlePiece aria-hidden="true" size={12} weight="fill" />{' '}
                  {shown === PUZZLE_PIECES
                    ? t.journey.cookbook.whole
                    : t.journey.cookbook.pieces(shown, PUZZLE_PIECES)}
                </span>
              )}
              {n > 0 && <span className="fj-page__fact">{r.fact}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The chef's reputation: stars over all recipes, the title they earn and the next one. */
function Reputation({ stars }: { stars: number }) {
  const i = chefTitleIndex(stars);
  const titles = t.data.chefTitles;
  const next = CHEF_TITLE_AT[i + 1];
  return (
    <p className="fj-reputation">
      <Star size={16} weight="fill" aria-hidden="true" />{' '}
      <strong>{t.journey.cookbook.reputation(stars, titles[i]!)}</strong>
      <span>
        {next === undefined
          ? t.journey.cookbook.reputationMax
          : t.journey.cookbook.reputationNext(next - stars, titles[i + 1]!)}
      </span>
    </p>
  );
}
