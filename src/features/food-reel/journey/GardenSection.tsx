import { Basket, Drop } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { CropVisual, ProduceImage } from '../../../components/ui/CropVisual';
import { CROPS, CROP_LIST, WATERING } from '../../../data/game';
import type { CropId, RecipeId } from '../../../data/types';
import { nextStep } from '../../../domain/nextStep';
import { decorSprite } from '../../../data/sprites';
import {
  STAGE_LABEL,
  firstEmptyPlot,
  isGrowing,
  isWet,
  nextPlotLevel,
  plotGrowth,
  plotStage,
  readyPlots,
  waterBlock,
  waterLeft,
  type WaterBlock,
} from '../../../domain/selectors';
import { currentTime, formatDuration } from '../../../domain/time';
import { burstSoil, flyTo, sprinkle } from '../../../motion/effects';
import { useFeedback, useGame, useUi } from '../../../state/hooks';
import { NextStepCard } from './NextStepCard';

type DayPart = 'morning' | 'noon' | 'evening' | 'night';

/** Garden light follows the guest's local clock. */
function dayPart(now: number): DayPart {
  const h = new Date(now).getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}

const BLOCK_NOTE: Record<WaterBlock, string> = {
  'not-growing': '',
  wet: 'Đất còn ẩm',
  'empty-can': 'Hết nước hôm nay',
};

/** How long the can hovers over a plot while pouring. */
const POUR_MS = 1100;

/**
 * Six plots, the watering can, the seed tray and the pantry. Crops sway, grow
 * visibly, fly into the pantry at harvest — and never wither.
 */
export function GardenSection({
  onCook,
  onOrders,
}: {
  onCook: (recipe: RecipeId) => void;
  onOrders: () => void;
}) {
  const { state, dispatch, now, reduced } = useGame();
  const { toast, announce } = useFeedback();
  const { spinForSeed } = useUi();
  const [justHarvested, setJustHarvested] = useState(0);
  const [picked, setPicked] = useState<CropId | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [watering, setWatering] = useState(false);
  const [pouring, setPouring] = useState<number | null>(null);
  const beds = useRef(new Map<number, HTMLElement>());
  const pantryRef = useRef<HTMLHeadingElement>(null);

  const seeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0);
  const activeSeed = picked && state.seeds[picked] > 0 ? picked : (seeds[0]?.id ?? null);
  const ready = readyPlots(state.plots, now);
  const emptyCount = state.plots.filter((p) => p.crop === null).length;
  const growingCount = state.plots.filter((p) => {
    return isGrowing(plotStage(p, now));
  }).length;
  const pendingMealSeed =
    !!state.meal && !state.meal.planted && state.seeds[state.meal.seedCrop] > 0;
  const target = pendingMealSeed ? firstEmptyPlot(state.plots) : undefined;
  const pantry = CROP_LIST.filter((c) => state.ingredients[c.id] > 0);
  const cans = waterLeft(state, now);
  const part = dayPart(now);
  const nextPlotAt = nextPlotLevel(state);
  // One row up to eight tiles (plots + the "coming soon" plot), two rows beyond that.
  const tiles = state.plots.length + (nextPlotAt !== null ? 1 : 0);
  const plotCols = tiles <= 8 ? tiles : Math.ceil(tiles / 2);

  // A level-up opened a new crop (and gifted a seed): say so once.
  const cropUnlock = state.recentCropUnlock;
  useEffect(() => {
    if (!cropUnlock) return;
    const c = CROPS[cropUnlock];
    toast({
      message: `Lên cấp! Mở khoá ${c.name.toLowerCase()} — tặng 1 ${c.seedName.toLowerCase()} vào khay.`,
      tone: 'success',
    });
    dispatch({ type: 'ACK_CROP_UNLOCK' });
  }, [cropUnlock, toast, dispatch]);

  useEffect(() => {
    if (pouring === null) return;
    const t = setTimeout(() => setPouring(null), reduced ? 0 : POUR_MS);
    return () => clearTimeout(t);
  }, [pouring, reduced]);

  const particlesOf = (plotId: number) =>
    beds.current.get(plotId)?.querySelector<HTMLElement>('.fj-plot__fx') ?? null;

  const harvestAll = () => {
    if (ready.length === 0) return;
    const counts = new Map<string, number>();
    const pantryEl = pantryRef.current;
    ready.forEach((p, i) => {
      const name = CROPS[p.crop!].produceName;
      counts.set(name, (counts.get(name) ?? 0) + 1);
      // Visual only: the crop is cloned before the state change removes it.
      const cropEl = beds.current.get(p.id)?.querySelector<HTMLElement>('.crop');
      if (cropEl && pantryEl) flyTo(cropEl, pantryEl, { reduced, duration: 620 + i * 90 });
      const fx = particlesOf(p.id);
      if (fx) burstSoil(fx, 6, reduced);
    });
    dispatch({ type: 'HARVEST_ALL', now: currentTime() });
    setJustHarvested((n) => n + 1);
    toast({
      message: `Đã thu hoạch: ${[...counts].map(([n, q]) => `${n} ×${q}`).join(', ')}.`,
      tone: 'success',
    });
  };

  const plantAt = (plotId: number, seed: CropId | null = activeSeed) => {
    if (!seed || state.seeds[seed] <= 0) return;
    dispatch({ type: 'PLANT_FROM_TRAY', crop: seed, plotId, now: currentTime() });
    setFresh(plotId);
    const fx = particlesOf(plotId);
    if (fx) burstSoil(fx, 6, reduced);
    announce(`Đã gieo ${CROPS[seed].seedName.toLowerCase()} vào ô ${plotId}.`);
  };

  const waterAt = (plotId: number) => {
    const plot = state.plots.find((p) => p.id === plotId);
    const at = currentTime();
    if (!plot || waterBlock(state, plot, at) !== null) return;
    dispatch({ type: 'WATER', plotId, now: at });
    setPouring(plotId);
    const fx = particlesOf(plotId);
    if (fx) sprinkle(fx, 8, reduced);
    const leftAfter = cans - 1;
    announce(
      `Đã tưới ô ${plotId}. ${CROPS[plot.crop!].name} lớn nhanh hơn. Còn ${leftAfter} lượt tưới hôm nay.`,
    );
    if (leftAfter <= 0) setWatering(false);
  };

  return (
    <div className={`fj-garden ${watering ? 'is-watering' : ''}`} data-daypart={part}>
      <div className="fj-garden__head">
        <p className="fj-lede">
          {ready.length} ô sẵn sàng · {emptyCount} ô trống. Tưới để cây lớn nhanh hơn — không tưới
          cây vẫn lớn, không bao giờ héo.
        </p>
        <div className="fj-garden__tools">
          <button
            type="button"
            className={`fj-can-btn ${watering ? 'is-on' : ''}`}
            aria-pressed={watering}
            onClick={() => setWatering((w) => !w)}
            disabled={!watering && (cans === 0 || growingCount === 0)}
          >
            <Drop aria-hidden="true" size={18} weight={watering ? 'fill' : 'regular'} />
            {watering ? 'Xong, cất bình' : 'Tưới cây'}
            <span className="fj-can-btn__cans" aria-hidden="true">
              {Array.from({ length: Math.max(cans, WATERING.perDay) }, (_, i) => (
                <span key={i} className={i < cans ? 'is-full' : ''} />
              ))}
            </span>
            <span className="sr-only">, còn {cans} lượt hôm nay</span>
          </button>
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
      </div>

      {watering && (
        <p className="fj-note fj-garden__mode" role="status">
          Chế độ tưới: chạm vào ô đang lớn. Mỗi lần tưới rút ngắn {Math.round(WATERING.cut * 100)}%
          thời gian còn lại; mỗi ô tưới lại sau 1 giờ.
        </p>
      )}

      <div className="fj-field">
        <span className="fj-field__sky" aria-hidden="true" />
        {part === 'night' && !reduced && (
          <span className="fj-fireflies" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} />
            ))}
          </span>
        )}
        {ready.length > 0 && !reduced && <span className="fj-butterfly" aria-hidden="true" />}

        {state.decor.length > 0 && (
          <div className="fj-yard" aria-hidden="true">
            {state.decor.includes('fence') && <span className="fj-yard__fence" />}
            {(['scarecrow', 'jar', 'lantern'] as const)
              .filter((d) => state.decor.includes(d))
              .map((d) => (
                <img
                  key={d}
                  className={`fj-yard__item fj-yard__item--${d}`}
                  src={decorSprite(d)}
                  alt=""
                  width={256}
                  height={256}
                  decoding="async"
                />
              ))}
          </div>
        )}
        <ul
          className="fj-plots"
          aria-label="Các ô đất"
          style={{ '--plot-cols': plotCols } as CSSProperties}
        >
          {state.plots.map((plot) => {
            const stage = plotStage(plot, now);
            const crop = plot.crop ? CROPS[plot.crop] : null;
            const left = plot.readyAt !== null ? plot.readyAt - now : 0;
            const growing = isGrowing(stage);
            const wet = isWet(plot, now);
            const block = growing ? waterBlock(state, plot, now) : 'not-growing';
            const cls = [
              'fj-plot',
              `fj-plot--${stage}`,
              target?.id === plot.id ? 'is-target' : '',
              fresh === plot.id ? 'is-fresh' : '',
              wet ? 'is-wet' : '',
              pouring === plot.id ? 'is-pouring' : '',
              watering && growing && !block ? 'is-thirsty' : '',
            ].join(' ');
            const style = {
              '--sway-delay': `${(-plot.id * 0.73).toFixed(2)}s`,
              '--grow': plotGrowth(plot, now).toFixed(3),
            } as CSSProperties;

            let stateText: string;
            if (stage === 'empty') stateText = activeSeed ? 'Chạm để gieo' : 'Chờ hạt';
            else if (watering && growing && block) stateText = BLOCK_NOTE[block];
            else if (watering && growing) stateText = 'Chạm để tưới';
            else stateText = STAGE_LABEL[stage];
            if (growing && !(watering && !block)) stateText += ` · còn ${formatDuration(left)}`;

            const body = (
              <>
                <span className="fj-plot__no">Ô {plot.id}</span>
                <span
                  className="fj-plot__bed"
                  aria-hidden="true"
                  ref={(el) => {
                    if (el) beds.current.set(plot.id, el);
                    else beds.current.delete(plot.id);
                  }}
                >
                  <span className="plot__soil" />
                  {crop && (
                    // Keyed by stage so each new stage pops in once.
                    <span key={stage} className="fj-plot__plant">
                      <CropVisual crop={plot.crop} stage={stage} />
                    </span>
                  )}
                  {pouring === plot.id && <span className="fj-can" />}
                  <span className="fj-plot__fx" />
                </span>
                <span className="fj-plot__crop">{crop ? crop.name : 'Trống'}</span>
                {growing && (
                  <span className="fj-plot__grow" aria-hidden="true">
                    <span />
                  </span>
                )}
                <span className="fj-plot__state">{stateText}</span>
              </>
            );

            const plantable = !watering && stage === 'empty';
            const waterable = watering && growing;
            return (
              <li key={plot.id} style={style}>
                {plantable ? (
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
                ) : waterable ? (
                  <button
                    type="button"
                    className={cls}
                    onClick={() => waterAt(plot.id)}
                    aria-disabled={block !== null}
                    aria-label={`Tưới ô ${plot.id}, ${crop!.name}, ${STAGE_LABEL[stage].toLowerCase()}, còn ${formatDuration(left)}${block ? `. ${BLOCK_NOTE[block]}` : ''}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
          {nextPlotAt !== null && (
            <li className="fj-plot fj-plot--locked" aria-label={`Ô đất mới mở ở cấp ${nextPlotAt}`}>
              <span className="fj-plot__no">Ô {state.plots.length + 1}</span>
              <span className="fj-plot__bed" aria-hidden="true">
                <span className="plot__soil" />
              </span>
              <span className="fj-plot__crop">Sắp mở</span>
              <span className="fj-plot__state">Lên cấp {nextPlotAt} để mở rộng vườn</span>
            </li>
          )}
        </ul>
      </div>

      <NextStepCard
        key={justHarvested}
        step={nextStep(state, now)}
        highlight={justHarvested > 0}
        onCook={onCook}
        onOrders={onOrders}
        onHarvest={harvestAll}
        onPlant={(plotId, crop) => plantAt(plotId, crop)}
        onFind={spinForSeed}
      />

      {emptyCount === 0 && !watering && (
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
          <h3 className="fj-h3" ref={pantryRef}>
            Kho nguyên liệu
          </h3>
          {pantry.length === 0 ? (
            <p className="fj-note">Chưa có nguyên liệu — thu hoạch ô sẵn sàng để nhận.</p>
          ) : (
            <ul className="fj-chips" aria-label="Nguyên liệu trong kho">
              {pantry.map((c) => (
                <li key={c.id} className="fj-chip fj-chip--static">
                  <span className="fj-chip__face">
                    <ProduceImage crop={c.id} size={26} />
                    {c.produceName}
                    <span key={state.ingredients[c.id]} className="fj-chip__count is-bump">
                      ×{state.ingredients[c.id]}
                    </span>
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
