import { Basket } from '@phosphor-icons/react';
import { useState } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { CropVisual } from '../../../components/ui/CropVisual';
import { CROPS, CROP_LIST } from '../../../data/game';
import type { CropId } from '../../../data/types';
import { STAGE_LABEL, firstEmptyPlot, plotStage, readyPlots } from '../../../domain/selectors';
import { currentTime, formatDuration } from '../../../domain/time';
import { useFeedback, useGame } from '../../../state/hooks';

/** Six plots, the seed tray and the pantry. Crops never wither. */
export function GardenSection() {
  const { state, dispatch, now } = useGame();
  const { toast, announce } = useFeedback();
  const [picked, setPicked] = useState<CropId | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);

  const seeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0);
  const activeSeed = picked && state.seeds[picked] > 0 ? picked : (seeds[0]?.id ?? null);
  const ready = readyPlots(state.plots, now);
  const emptyCount = state.plots.filter((p) => p.crop === null).length;
  const pendingMealSeed =
    !!state.meal && !state.meal.planted && state.seeds[state.meal.seedCrop] > 0;
  const target = pendingMealSeed ? firstEmptyPlot(state.plots) : undefined;
  const pantry = CROP_LIST.filter((c) => state.ingredients[c.id] > 0);

  const harvestAll = () => {
    if (ready.length === 0) return;
    const counts = new Map<string, number>();
    for (const p of ready) {
      const name = CROPS[p.crop!].produceName;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    dispatch({ type: 'HARVEST_ALL', now: currentTime() });
    toast({
      message: `Đã thu hoạch: ${[...counts].map(([n, q]) => `${n} ×${q}`).join(', ')}.`,
      tone: 'success',
    });
  };

  const plantAt = (plotId: number) => {
    if (!activeSeed) return;
    dispatch({ type: 'PLANT_FROM_TRAY', crop: activeSeed, plotId, now: currentTime() });
    setFresh(plotId);
    announce(`Đã gieo ${CROPS[activeSeed].seedName.toLowerCase()} vào ô ${plotId}.`);
  };

  return (
    <div className="fj-garden">
      <div className="fj-garden__head">
        <p className="fj-lede">
          {ready.length} ô sẵn sàng · {emptyCount} ô trống. Check-in sau bữa làm cây của bữa đó lớn
          ngay.
        </p>
        <button
          type="button"
          className="fr-cta fr-cta--quiet"
          onClick={harvestAll}
          disabled={ready.length === 0}
        >
          <Basket aria-hidden="true" size={18} />
          Thu hoạch tất cả{ready.length > 0 ? ` (${ready.length})` : ''}
        </button>
      </div>

      <ul className="fj-plots" aria-label="Các ô đất">
        {state.plots.map((plot) => {
          const stage = plotStage(plot, now);
          const crop = plot.crop ? CROPS[plot.crop] : null;
          const left = plot.readyAt !== null ? plot.readyAt - now : 0;
          const growing = stage === 'sprout' || stage === 'young';
          const cls = [
            'fj-plot',
            `fj-plot--${stage}`,
            target?.id === plot.id ? 'is-target' : '',
            fresh === plot.id ? 'is-fresh' : '',
          ].join(' ');
          const body = (
            <>
              <span className="fj-plot__no">Ô {plot.id}</span>
              <span className="fj-plot__bed" aria-hidden="true">
                <span className="plot__soil" />
                <CropVisual crop={plot.crop} stage={stage} />
              </span>
              <span className="fj-plot__crop">{crop ? crop.name : 'Trống'}</span>
              <span className="fj-plot__state">
                {stage === 'empty' ? (activeSeed ? 'Chạm để gieo' : 'Chờ hạt') : STAGE_LABEL[stage]}
                {growing ? ` · còn ${formatDuration(left)}` : ''}
              </span>
            </>
          );
          return (
            <li key={plot.id}>
              {stage === 'empty' ? (
                <button
                  type="button"
                  className={cls}
                  onClick={() => plantAt(plot.id)}
                  disabled={!activeSeed}
                  aria-label={
                    activeSeed
                      ? `Ô ${plot.id}, trống. Gieo ${CROPS[activeSeed].seedName.toLowerCase()}`
                      : `Ô ${plot.id}, trống. Khay chưa có hạt`
                  }
                >
                  {body}
                </button>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {emptyCount === 0 && (
        <p className="fj-note">
          Ô đất đầy — thu hoạch các ô sẵn sàng để có chỗ gieo tiếp. Cây không bao giờ héo.
        </p>
      )}

      <div className="fj-garden__shelves">
        <div className="fj-shelf">
          <h3 className="fj-h3">Khay hạt giống</h3>
          {seeds.length === 0 ? (
            <p className="fj-note">Khay trống. Mỗi món bạn chốt gửi lại một hạt liên quan.</p>
          ) : (
            <div className="fj-chips" role="radiogroup" aria-label="Chọn hạt để gieo">
              {seeds.map((c) => (
                <label key={c.id} className="fj-chip">
                  <input
                    type="radio"
                    name="fj-seed"
                    value={c.id}
                    checked={activeSeed === c.id}
                    onChange={() => setPicked(c.id)}
                  />
                  <span className="fj-chip__face">
                    <CropIcon crop={c.id} />
                    {c.seedName}
                    <span className="fj-chip__count">×{state.seeds[c.id]}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="fj-shelf">
          <h3 className="fj-h3">Kho nguyên liệu</h3>
          {pantry.length === 0 ? (
            <p className="fj-note">Chưa có nguyên liệu — thu hoạch ô sẵn sàng để nhận.</p>
          ) : (
            <ul className="fj-chips" aria-label="Nguyên liệu trong kho">
              {pantry.map((c) => (
                <li key={c.id} className="fj-chip fj-chip--static">
                  <span className="fj-chip__face">
                    <CropIcon crop={c.id} />
                    {c.produceName}
                    <span className="fj-chip__count">×{state.ingredients[c.id]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
