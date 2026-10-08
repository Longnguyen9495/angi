import { CROPS } from '../../../data/game';
import { SKY_CROPS, type SkyCropId } from '../../../data/skyEconomy';
import { POT_TIERS, POTS, type PotId } from '../../../data/skyGarden';
import type { CropId } from '../../../data/types';
import { formatDuration } from '../../../domain/time';
import type { FriendSky as FriendSkyData, FriendSkyPot } from '../../../services/account';
import { t } from '../../../i18n';
import './sky-game.css';

const f = () => t.sky.game.friend;

function cropName(seed: { kind: 'sky' | 'farm'; id: string }): string {
  if (seed.kind === 'sky' && Object.hasOwn(SKY_CROPS, seed.id))
    return t.sky.crops[seed.id as SkyCropId];
  if (seed.kind === 'farm' && Object.hasOwn(CROPS, seed.id)) return CROPS[seed.id as CropId].name;
  return seed.id;
}

/**
 * A friend's Vườn Mây while visiting (G5, plans/vuon-may.md §5.7, §13.2): look-only, floor by
 * floor, with the bugs sitting on their pots. A common bug can be caught for them (both of us
 * get one: ours is a ladybug); a rare one stays for the owner.
 */
export function FriendSky({
  sky,
  now,
  helpsLeft,
  helpsMax,
  busy,
  onCatch,
}: {
  sky: FriendSkyData | null | undefined;
  now: number;
  helpsLeft: number;
  helpsMax: number;
  busy: boolean;
  onCatch: (uid: string, stage: number) => void;
}) {
  if (!sky) return <p className="fj-note">{f().none}</p>;
  const pot = (p: FriendSkyPot) => {
    const known = Object.hasOwn(POTS, p.pot) ? POTS[p.pot as PotId] : null;
    const pl = p.plant;
    return (
      <li key={p.uid} className="sk-fpot">
        {known && <img className="sk-potimg" src={known.src} alt="" width={44} height={44} />}
        <div>
          <strong>
            {known ? t.sky.pots[p.pot as PotId] : p.pot}{' '}
            <span className="sk-stars" aria-label={`${p.stars}/5`}>
              {'★'.repeat(p.stars)}
            </span>
          </strong>
          <small>
            {t.sky.tiers[POT_TIERS[Math.max(0, Math.min(4, p.tier))]!]} ·{' '}
            {!pl
              ? f().idle
              : pl.readyAt > now
                ? f().growing(cropName(pl.seed), formatDuration(pl.readyAt - now))
                : f().ripe(cropName(pl.seed))}
          </small>
          {p.bugs.length > 0 && (
            <div className="sk-row">
              {p.bugs.map((b) =>
                b.catchable ? (
                  <button
                    key={b.stage}
                    type="button"
                    className="sk-btn sk-btn--small"
                    disabled={busy || helpsLeft <= 0}
                    onClick={() => onCatch(p.uid, b.stage)}
                  >
                    {f().catch(t.sky.bugs[b.bug])}
                  </button>
                ) : (
                  <small key={b.stage} className="sk-note">
                    {t.sky.bugs[b.bug]} · {f().onlyCommon}
                  </small>
                ),
              )}
            </div>
          )}
        </div>
      </li>
    );
  };
  return (
    <div className="sk-sheet sk-friend">
      <p className="sk-status">{f().score(sky.score)}</p>
      <p className="sk-note">{f().rule(helpsLeft, helpsMax)}</p>
      {sky.floors
        .map((row, i) => ({ row, i }))
        .reverse()
        .map(({ row, i }) => (
          <section key={i} className="sk-set">
            <h3>{f().floor(i + 1)}</h3>
            <ul className="sk-fpots">
              {row.filter((p): p is FriendSkyPot => !!p).map(pot)}
              {row.every((p) => !p) && <li className="sk-note">{f().empty}</li>}
            </ul>
          </section>
        ))}
    </div>
  );
}
