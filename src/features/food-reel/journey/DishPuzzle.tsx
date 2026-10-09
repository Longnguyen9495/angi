import { CookingPot } from '@phosphor-icons/react';
import { useState } from 'react';
import type { RecipeDef } from '../../../data/types';
import { getReelDish, snapshotThumbnail } from '../data/reelCatalogue';
import { PUZZLE_PIECES, pieceOrder, piecesShown } from './puzzle';

/**
 * Bundled photos for the built-in recipes: the last fallback, so a page still
 * has a picture when the catalogue lacks the dish or /uploads is unreachable.
 */
const LOCAL_PHOTO: Record<string, string> = {
  'com-tam': 'com-tam',
  'bun-rieu': 'bun-rieu',
  'bun-bo-hue': 'bun-bo-hue',
  'goi-cuon': 'goi-cuon',
  'banh-xeo': 'banh-xeo',
  'mi-quang': 'mi-quang',
  'com-ga-hoi-an': 'com-ga',
  'pho-bo': 'pho-bo',
  'bun-cha': 'bun-cha',
  'banh-cuon': 'banh-cuon',
  'banh-mi-chao': 'banh-mi',
  'canh-chua-ca': 'canh-chua',
};

/** SVG path for slice i of the plate (viewBox 0 0 100 100), clockwise from 12 o'clock. */
function slicePath(i: number): string {
  const a0 = (i / PUZZLE_PIECES) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / PUZZLE_PIECES) * 2 * Math.PI - Math.PI / 2;
  const p = (a: number) =>
    `${(50 + 51 * Math.cos(a)).toFixed(2)} ${(50 + 51 * Math.sin(a)).toFixed(2)}`;
  return `M50 50 L${p(a0)} A51 51 0 0 1 ${p(a1)} Z`;
}

/**
 * The dish photo split into eight slices like a cake: uncovered ones show the
 * photo, the rest stay dark. `fresh` marks the slice the latest cook uncovered.
 */
export function DishPuzzle({
  recipe,
  cooked,
  fresh = false,
}: {
  recipe: RecipeDef;
  cooked: number;
  fresh?: boolean;
}) {
  const local = LOCAL_PHOTO[recipe.id];
  const sources = [
    getReelDish(recipe.dishId)?.thumbnail,
    snapshotThumbnail(recipe.dishId),
    local && `/images/dishes/${local}.jpg`,
  ].filter((s, i, all): s is string => !!s && all.indexOf(s) === i);
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  const shown = piecesShown(cooked);
  const order = pieceOrder(recipe.id);
  const open = new Set(order.slice(0, shown));
  const newest = fresh && shown > 0 ? order[shown - 1] : -1;

  return (
    <span className={`fj-puzzle${shown === PUZZLE_PIECES ? ' is-whole' : ''}`}>
      {src ? (
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
      ) : (
        <span className="fj-puzzle__plate">
          <CookingPot size={28} weight="light" />
        </span>
      )}
      <svg className="fj-puzzle__cover" viewBox="0 0 100 100" aria-hidden="true">
        {order.map((i) =>
          open.has(i) ? (
            i === newest && <path key={i} className="fj-puzzle__new" d={slicePath(i)} />
          ) : (
            <path key={i} className="fj-puzzle__piece" d={slicePath(i)} />
          ),
        )}
      </svg>
    </span>
  );
}
