import { LockKey, LockKeyOpen } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { REGIONS } from '../../../data/game';
import type { RegionId } from '../../../data/types';
import { regionProgress, stampCount } from '../../../domain/selectors';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { reelDishes, REGION_LABEL } from '../data/reelCatalogue';
import type { ReelDish } from '../foodReel.types';

const ORDER: (RegionId | 'world')[] = ['north', 'central', 'south', 'world'];
const SHOW = 10;
const m = t.journey.atlas;

const TAGLINE: Record<RegionId | 'world', string> = m.tagline;

interface AtlasSectionProps {
  onOpenDish: (dish: ReelDish) => void;
}

/**
 * The culinary map as four regional albums. Discovered dishes show their
 * photo and open their story; the rest stay as numbered silhouettes.
 */
export function AtlasSection({ onOpenDish }: AtlasSectionProps) {
  const { state, dispatch } = useGame();
  const known = new Set([...state.stamps.discovered, ...state.stamps.eaten]);
  const stamps = stampCount(state);
  const fresh = state.recentUnlock;

  // The "newly opened" badge is shown once, then acknowledged.
  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => dispatch({ type: 'ACK_UNLOCK' }), 6000);
    return () => clearTimeout(timer);
  }, [fresh, dispatch]);

  return (
    <ul className="fj-atlas">
      {ORDER.map((id) => {
        const dishes = reelDishes().filter((d) => d.region === id);
        const found = dishes.filter((d) => known.has(d.id));
        const rest = dishes.length - found.length;
        const game = id === 'world' ? null : regionProgress(state, id);
        const locked = game ? !game.unlocked : false;
        const shown = found.slice(0, SHOW);
        const silhouettes = Math.min(rest, Math.max(0, SHOW - shown.length));
        return (
          <li
            key={id}
            className={`fj-region fj-region--${id} ${locked ? 'is-locked' : ''} ${fresh === id ? 'is-fresh' : ''}`}
          >
            <div className="fj-region__head">
              <h3 className="fj-region__name">{REGION_LABEL[id]}</h3>
              <span className="fj-region__status">
                {locked ? (
                  <LockKey aria-hidden="true" size={14} />
                ) : (
                  <LockKeyOpen aria-hidden="true" size={14} />
                )}
                {fresh === id ? m.fresh : locked ? m.locked : m.open}
              </span>
            </div>
            <p className="fj-region__tagline">{TAGLINE[id]}</p>
            <p className="fj-region__count">
              <span className="fj-region__found">{found.length}</span>/{dishes.length} {m.dishes}
            </p>
            {locked && game && (
              <p className="fj-note">
                {m.lockedNote(REGIONS[id as RegionId].stampsToUnlock, stamps, game.stampsNeeded)}
              </p>
            )}
            <ul className="fj-album" aria-label={m.albumLabel(REGION_LABEL[id])}>
              {shown.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="fj-album__dish"
                    onClick={() => onOpenDish(d)}
                    title={d.name}
                  >
                    <img
                      src={d.thumbnail}
                      alt=""
                      width={96}
                      height={96}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="sr-only">{m.readStory(d.name)}</span>
                  </button>
                </li>
              ))}
              {Array.from({ length: silhouettes }, (_, i) => (
                <li key={`s${i}`} className="fj-album__unknown" aria-hidden="true" />
              ))}
            </ul>
            {rest > 0 && <p className="fj-region__rest">{m.rest(rest)}</p>}
          </li>
        );
      })}
    </ul>
  );
}
