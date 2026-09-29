import { REGIONS } from '../../../data/game';
import { level, nextLockedRegion, regionProgress, stampCount } from '../../../domain/selectors';
import { useGame } from '../../../state/hooks';
import { reelCount, reelDishes } from '../data/reelCatalogue';

/** The four numbers the guest accumulates, stated plainly with what each is for. */
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
        <dt>Cấp độ</dt>
        <dd className="fj-stat__value">{String(lv.level).padStart(2, '0')}</dd>
        <dd className="fj-stat__meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${lv.into / lv.span})` }} />
        </dd>
        <dd className="fj-stat__note">
          {lv.into}/{lv.span} XP tới cấp {lv.level + 1}
        </dd>
      </div>
      <div className="fj-stat">
        <dt>Chuỗi ngày</dt>
        <dd className="fj-stat__value">{state.streak.count}</dd>
        <dd className="fj-stat__note">
          {state.streak.restPasses} vé nghỉ tuần này · lỡ một ngày chỉ lùi một mốc
        </dd>
      </div>
      <div className="fj-stat">
        <dt>Dấu hành trình</dt>
        <dd className="fj-stat__value">{stamps}</dd>
        <dd className="fj-stat__note">
          {next ? `Còn ${nextNeed} dấu để mở ${REGIONS[next].name}` : 'Đã mở cả ba miền'}
        </dd>
      </div>
      <div className="fj-stat">
        <dt>Món đã khám phá</dt>
        <dd className="fj-stat__value">
          {explored}
          <span className="fj-stat__of">/{reelCount()}</span>
        </dd>
        <dd className="fj-stat__note">Gieo hạt hoặc check-in một món để ghi vào sổ</dd>
      </div>
    </dl>
  );
}
