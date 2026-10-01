import { REGIONS } from '../../../data/game';
import { level, nextLockedRegion, regionProgress, stampCount } from '../../../domain/selectors';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { reelCount, reelDishes } from '../data/reelCatalogue';

/** The four numbers the guest accumulates, stated plainly with what each is for. */
const m = t.journey.stats;

export function JourneyStats() {
  const { state } = useGame();
  const lv = level(state.xp);
  const stamps = stampCount(state);
  const next = nextLockedRegion(state);
  const nextNeed = next ? regionProgress(state, next).stampsNeeded : 0;
  const known = new Set([...state.stamps.discovered, ...state.stamps.eaten]);
  const explored = reelDishes().filter((d) => known.has(d.id)).length;

  return (
    <dl className="fj-stats">
      <div className="fj-stat">
        <dt>{m.level}</dt>
        <dd className="fj-stat__value">{String(lv.level).padStart(2, '0')}</dd>
        <dd className="fj-stat__meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${lv.into / lv.span})` }} />
        </dd>
        <dd className="fj-stat__note">{m.levelNote(lv.into, lv.span, lv.level + 1)}</dd>
      </div>
      <div className="fj-stat">
        <dt>{m.streak}</dt>
        <dd className="fj-stat__value">{state.streak.count}</dd>
        <dd className="fj-stat__note">{m.streakNote(state.streak.restPasses)}</dd>
      </div>
      <div className="fj-stat">
        <dt>{m.stamps}</dt>
        <dd className="fj-stat__value">{stamps}</dd>
        <dd className="fj-stat__note">
          {next ? m.stampsNote(nextNeed, REGIONS[next].name) : m.allRegionsOpen}
        </dd>
      </div>
      <div className="fj-stat">
        <dt>{m.explored}</dt>
        <dd className="fj-stat__value">
          {explored}
          <span className="fj-stat__of">/{reelCount()}</span>
        </dd>
        <dd className="fj-stat__note">{m.exploredNote}</dd>
      </div>
    </dl>
  );
}
