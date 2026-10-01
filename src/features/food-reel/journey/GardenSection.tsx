import { Basket, Drop } from '@phosphor-icons/react';
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { CropVisual, ProduceImage } from '../../../components/ui/CropVisual';
import {
  ANIMALS,
  CROPS,
  CROP_LIST,
  RECIPE_LIST,
  WATERING,
  PRODUCE_IDS,
  FARM_PLOT_COUNT,
  MAX_PLOT_COUNT,
  PLOT_UNLOCK_LEVELS,
  XP,
  produceName,
} from '../../../data/game';
import type { AnimalId, CropId, RecipeId } from '../../../data/types';
import type { FarmPlace, FarmSceneApi, FarmView, PlaceInfo } from '../../farm-anim/FarmScene';
import { nextStep } from '../../../domain/nextStep';
import { cropSprite, decorSprite, produceSprite } from '../../../data/sprites';
import {
  STAGE_LABEL,
  animalStage,
  biteDelay,
  catchFor,
  fishingLeft,
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
  recipeAvailable,
  recipeProgress,
} from '../../../domain/selectors';
import { FarmPlotCard, type CookIdea, type PlotCardMode } from './FarmPlotCard';
import { useSeedDrag } from './seedDrag';
// Scene overlay styles (plot card, seed strip) load with the garden, not with the lazy scene.
import '../../farm-anim/farm-anim.css';
import { currentTime, formatDuration } from '../../../domain/time';
import { burstSoil, flyTo, sprinkle } from '../../../motion/effects';
import { t } from '../../../i18n';
import { useFeedback, useGame, useUi } from '../../../state/hooks';
import { NextStepCard } from './NextStepCard';

const m = t.journey.garden;

// The living painted farm above the plots (loaded on its own, never blocks the garden).
const FarmScene = lazy(() => import('../../farm-anim/FarmScene'));

/** If the farm scene throws, the guest keeps a working garden. */
class SceneBoundary extends Component<
  { onFail: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type DayPart = 'morning' | 'noon' | 'evening' | 'night';

/** Garden light follows the guest's local clock. */
function dayPart(now: number): DayPart {
  const h = new Date(now).getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}

type PlotCardState = {
  id: number;
  harvested?: CropId;
  at: { x: number; y: number; below: boolean };
};

const BLOCK_NOTE: Record<WaterBlock, string> = {
  'not-growing': '',
  wet: m.blockWet,
  'empty-can': m.blockEmptyCan,
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
  onGo,
}: {
  onCook: (recipe: RecipeId) => void;
  onOrders: () => void;
  /** Jump to another Journey section (the 3D kitchen and barn link out). */
  onGo?: (section: 'cong-thuc' | 'don-co-ba' | 'cho-que') => void;
}) {
  const { state, dispatch, now, reduced } = useGame();
  const [sceneFailed, setSceneFailed] = useState(false);
  const scene = useRef<FarmSceneApi | null>(null);
  const casting = useRef(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [placeCard, setPlaceCard] = useState<'farmhouse' | 'market' | null>(null);
  // The plot whose card is open on the scene; `harvested` after a harvest from the card.
  const [plotCard, setPlotCardState] = useState<PlotCardState | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const setPlotCard = (c: { id: number; harvested?: CropId } | null) => {
    // Anchor over the plot, kept inside the scene box (measured now, not during render).
    const p = c ? scene.current?.plotScreen(c.id) : null;
    const w = wrapRef.current?.clientWidth ?? 800;
    setPlotCardState(
      c && p
        ? { ...c, at: { x: Math.max(Math.min(138, w / 2), Math.min(w - Math.min(138, w / 2), p.x)), y: p.y, below: p.y < 280 } }
        : null,
    );
    scene.current?.select(c?.id ?? null);
    if (c) setPlaceCard(null);
  };
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
  const pantry = PRODUCE_IDS.filter((id) => state.ingredients[id] > 0).map((id) => ({
    id,
    produceName: produceName(id),
  }));
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
      message: m.cropUnlocked(c.name.toLowerCase(), c.seedName.toLowerCase()),
      tone: 'reward',
    });
    dispatch({ type: 'ACK_CROP_UNLOCK' });
  }, [cropUnlock, toast, dispatch]);

  useEffect(() => {
    if (pouring === null) return;
    const timer = setTimeout(() => setPouring(null), reduced ? 0 : POUR_MS);
    return () => clearTimeout(timer);
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
      message: m.harvested([...counts].map(([n, q]) => `${n} ×${q}`).join(', ')),
      tone: 'reward',
    });
  };

  const plantAt = (plotId: number, seed: CropId | null = activeSeed) => {
    if (!seed || state.seeds[seed] <= 0) return;
    dispatch({ type: 'PLANT_FROM_TRAY', crop: seed, plotId, now: currentTime() });
    setFresh(plotId);
    const fx = particlesOf(plotId);
    if (fx) burstSoil(fx, 6, reduced);
    announce(m.planted(CROPS[seed].seedName.toLowerCase(), plotId));
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
    announce(m.watered(plotId, CROPS[plot.crop!].name, leftAfter));
    if (leftAfter <= 0) setWatering(false);
  };

  const animalAct = (animal: AnimalId, act: 'feed' | 'collect') => {
    const def = ANIMALS[animal];
    dispatch({
      type: act === 'feed' ? 'FEED_ANIMAL' : 'COLLECT_ANIMAL',
      animal,
      now: currentTime(),
    });
    announce(
      act === 'feed'
        ? m.fed(def.name.toLowerCase(), def.hours)
        : m.collected(def.yield, produceName(def.product).toLowerCase()),
    );
  };

  const catchAt = (castAt: number) => {
    const kind = catchFor(castAt);
    dispatch({ type: 'CATCH', castAt, now: currentTime() });
    announce(m.caught(produceName(kind).toLowerCase(), XP.catch));
  };

  // The game as the painted farm shows it: 9 plots (locked ones open with levels), animal bubbles.
  const farmView: FarmView = {
    watering,
    plots: Array.from({ length: MAX_PLOT_COUNT }, (_, i) => {
      const id = i + 1;
      const plot = state.plots.find((p) => p.id === id);
      const unlockLevel =
        id > FARM_PLOT_COUNT ? (PLOT_UNLOCK_LEVELS[id - FARM_PLOT_COUNT - 1] ?? null) : null;
      if (!plot)
        return {
          id,
          unlocked: false,
          unlockLevel,
          crop: null,
          stage: 'empty',
          image: null,
          wet: false,
          thirsty: false,
          label: m.farmPlotLocked(id, String(unlockLevel ?? '?')),
        };
      const stage = plotStage(plot, now);
      const growing = isGrowing(stage);
      const block = growing ? waterBlock(state, plot, now) : 'not-growing';
      const crop = plot.crop ? CROPS[plot.crop] : null;
      let label: string;
      if (!crop)
        label = activeSeed
          ? m.farmPlotPlant(id, CROPS[activeSeed].seedName.toLowerCase())
          : m.farmPlotNoSeed(id);
      else if (stage === 'ready') label = m.farmPlotHarvest(id, crop.name);
      else {
        label = m.farmPlotGrowing(id, crop.name, formatDuration((plot.readyAt ?? now) - now));
        label +=
          block === null
            ? m.farmTapToWater
            : block !== 'not-growing'
              ? ` · ${BLOCK_NOTE[block].toLowerCase()}`
              : '';
      }
      return {
        id,
        unlocked: true,
        unlockLevel: null,
        crop: plot.crop,
        stage,
        image: plot.crop && stage !== 'empty' ? cropSprite(plot.crop, stage) : null,
        wet: isWet(plot, now),
        thirsty: watering && growing && block === null,
        label,
      };
    }),
    cow: animalBubble('cow'),
    chicken: animalBubble('chicken'),
  };

  function animalBubble(id: AnimalId): FarmView['cow'] {
    const def = ANIMALS[id];
    const stage = animalStage(state, id, now);
    if (stage === 'locked')
      return { kind: 'locked', icon: null, label: m.animalLockedBubble(def.name, def.unlockLevel) };
    if (stage === 'ready')
      return {
        kind: 'ready',
        icon: produceSprite(def.product),
        label: m.collectBubble(produceName(def.product)),
      };
    if (stage === 'busy') return { kind: 'busy', icon: null, label: def.name };
    return {
      kind: 'hungry',
      icon: produceSprite(def.feed),
      label: m.feedBubble(produceName(def.feed)),
    };
  }

  /** A tap on a plot of the painted field: plant, water or harvest, whichever fits. */
  /** A tap on a plot of the painted field opens its card (seeds, water, harvest, cook). */
  const onPlot = (id: number) => {
    setPlotCard(plotCard?.id === id ? null : { id });
  };

  /** Plant a seed dropped on (or tapped for) a plot. */
  const dropSeed = (id: number, crop: CropId) => {
    const plot = state.plots.find((p) => p.id === id);
    if (!plot)
      return toast({
        message: m.plotOpensAt(id, String(PLOT_UNLOCK_LEVELS[id - FARM_PLOT_COUNT - 1] ?? '?')),
      });
    if (plotStage(plot, currentTime()) !== 'empty') return setPlotCard({ id });
    setPicked(crop);
    plantAt(id, crop);
    setPlotCard({ id });
  };
  const seedDrag = useSeedDrag(
    () => scene.current,
    dropSeed,
    // A tap on a seed: plant it in the open empty plot, otherwise just pick it.
    (crop) => {
      const plot = plotCard && state.plots.find((p) => p.id === plotCard.id);
      if (plot && plotStage(plot, currentTime()) === 'empty') dropSeed(plot.id, crop);
      else setPicked(crop);
    },
  );

  const harvestFromCard = (id: number) => {
    const crop = state.plots.find((p) => p.id === id)?.crop ?? undefined;
    harvestAll();
    setPlotCard({ id, harvested: crop });
  };

  // What the open card shows.
  let cardMode: PlotCardMode | null = null;
  let cookIdeas: CookIdea[] = [];
  if (plotCard) {
    const plot = state.plots.find((p) => p.id === plotCard.id);
    if (plotCard.harvested) {
      const crop = plotCard.harvested;
      cardMode = { kind: 'harvested', crop, produce: produceName(crop).toLowerCase() };
      cookIdeas = RECIPE_LIST.filter(
        (r) => recipeAvailable(state, r.id) && r.ingredients.some((i) => i.crop === crop),
      )
        .map((r) => {
          const pr = recipeProgress(state, r.id);
          const missing = pr.ingredients
            .filter((i) => i.have < i.qty)
            .map((i) => produceName(i.crop).toLowerCase())
            .join(', ');
          return { id: r.id, name: r.name, canCook: pr.canCook, missing };
        })
        .sort((x, y) => Number(y.canCook) - Number(x.canCook))
        .slice(0, 3);
    } else if (!plot) {
      cardMode = {
        kind: 'locked',
        level: String(PLOT_UNLOCK_LEVELS[plotCard.id - FARM_PLOT_COUNT - 1] ?? '?'),
      };
    } else {
      const stage = plotStage(plot, now);
      const crop = plot.crop ? CROPS[plot.crop].name : '';
      if (stage === 'empty') cardMode = { kind: 'empty' };
      else if (stage === 'ready') cardMode = { kind: 'ready', crop };
      else {
        const block = waterBlock(state, plot, now);
        cardMode = {
          kind: 'growing',
          crop,
          left: formatDuration((plot.readyAt ?? now) - now),
          water: { ok: block === null, note: block ? BLOCK_NOTE[block] || m.cantWater : '', cans },
        };
      }
    }
  }
  const cardAt = plotCard?.at ?? null;

  /** A tap on the painted farm. */
  const onPlace = (place: FarmPlace, info: PlaceInfo) => {
    const at = currentTime();
    if (place === 'plot' && info.plotId !== undefined) {
      onPlot(info.plotId);
      return;
    }
    setPlotCard(null);
    if (place === 'pond') {
      if (casting.current) return;
      if (fishingLeft(state, at) <= 0) {
        toast({ message: m.noFishingLeft });
        return;
      }
      casting.current = true;
      scene.current?.cast(info.x, info.y);
      announce(m.casting);
      window.setTimeout(() => {
        casting.current = false;
        scene.current?.bite(info.x, info.y);
        catchAt(at);
      }, biteDelay(at));
      return;
    }
    if (place === 'cow' || place === 'chicken') {
      const id: AnimalId = place;
      const def = ANIMALS[id];
      const stage = animalStage(state, id, at);
      if (stage === 'locked') toast({ message: m.animalLocked(def.name, def.unlockLevel) });
      else if (stage === 'ready') animalAct(id, 'collect');
      else if (stage === 'busy') {
        const left = (state.animals[id].readyAt ?? at) - at;
        toast({ message: m.animalBusy(def.name, formatDuration(left)) });
      } else if (state.ingredients[def.feed] <= 0)
        toast({
          message: m.needFeed(produceName(def.feed).toLowerCase(), def.name.toLowerCase()),
        });
      else animalAct(id, 'feed');
      return;
    }
    // Places open a small card on the scene; the page never scrolls away on a tap.
    if (place === 'farmhouse' || place === 'market') setPlaceCard(place);
  };

  return (
    <div className={`fj-garden ${watering ? 'is-watering' : ''}`} data-daypart={part}>
      <div className="fj-garden__head">
        <p className="fj-lede">{m.lede(ready.length, emptyCount)}</p>
        <div className="fj-garden__tools">
          <button
            type="button"
            className={`fj-can-btn ${watering ? 'is-on' : ''}`}
            data-fx="splash"
            aria-pressed={watering}
            onClick={() => setWatering((w) => !w)}
            disabled={!watering && (cans === 0 || growingCount === 0)}
          >
            <Drop aria-hidden="true" size={18} weight={watering ? 'fill' : 'regular'} />
            {watering ? m.waterOff : m.waterOn}
            <span className="fj-can-btn__cans" aria-hidden="true">
              {Array.from({ length: Math.max(cans, WATERING.perDay) }, (_, i) => (
                <span key={i} className={i < cans ? 'is-full' : ''} />
              ))}
            </span>
            <span className="sr-only">{m.cansLeft(cans)}</span>
          </button>
          <button
            type="button"
            className="fr-cta fr-cta--quiet"
            data-fx="burst"
            onClick={harvestAll}
            disabled={ready.length === 0}
          >
            <Basket aria-hidden="true" size={18} />
            {m.harvestAll(ready.length)}
          </button>
        </div>
      </div>

      {watering && (
        <p className="fj-note fj-garden__mode" role="status">
          {m.waterMode(Math.round(WATERING.cut * 100))}
        </p>
      )}

      {!sceneFailed && (
        <SceneBoundary onFail={() => setSceneFailed(true)}>
          <div
            className="fj-farm-wrap"
            ref={wrapRef}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPlotCard(null);
            }}
          >
            <Suspense fallback={<div className="fa-scene fj-farm" aria-hidden="true" />}>
              <FarmScene
                className="fj-farm"
                reduced={reduced}
                farm={farmView}
                label={m.farmLabel}
                onPlace={onPlace}
                onReady={(api) => (scene.current = api)}
              />
            </Suspense>
            {placeCard && (
              <div
                className="fj-farm-card"
                role="dialog"
                aria-label={placeCard === 'market' ? m.placeMarket : m.placeHouse}
              >
                <strong>{placeCard === 'market' ? m.placeMarket : m.placeHouse}</strong>
                <p>{placeCard === 'market' ? m.placeMarketText : m.placeHouseText}</p>
                <div className="fj-farm-card__actions">
                  <button
                    type="button"
                    className="fj-farm-card__close"
                    onClick={() => setPlaceCard(null)}
                  >
                    {m.placeClose}
                  </button>
                  <button
                    type="button"
                    className="fj-farm-card__go"
                    onClick={() => {
                      setPlaceCard(null);
                      onGo?.(placeCard === 'market' ? 'cho-que' : 'cong-thuc');
                    }}
                  >
                    {m.placeGo}
                  </button>
                </div>
              </div>
            )}
            {plotCard && cardMode && cardAt && (
              <FarmPlotCard
                plotId={plotCard.id}
                at={cardAt}
                mode={cardMode}
                seeds={seeds.map((c) => ({ id: c.id, name: c.seedName, count: state.seeds[c.id] }))}
                onSeedDown={seedDrag.start}
                onWater={() => waterAt(plotCard.id)}
                onHarvest={() => harvestFromCard(plotCard.id)}
                cook={cookIdeas}
                onCook={(r) => {
                  setPlotCard(null);
                  onCook(r);
                }}
                onClose={() => setPlotCard(null)}
              />
            )}
            {seedDrag.ghost}
            {seeds.length > 0 && (
              <div className="fj-farm-seeds" role="radiogroup" aria-label={m.farmSeedsLabel}>
                {seeds.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={activeSeed === c.id}
                    className={`fj-farm-seed${activeSeed === c.id ? ' is-on' : ''}`}
                    onPointerDown={seedDrag.start(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setPicked(c.id);
                    }}
                    title={c.seedName}
                  >
                    <CropIcon crop={c.id} />
                    <span>×{state.seeds[c.id]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SceneBoundary>
      )}

      <div className="fj-field" ref={fieldRef}>
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
          aria-label={m.plotsLabel}
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
            if (stage === 'empty') stateText = activeSeed ? m.tapToPlant : m.waitingSeed;
            else if (watering && growing && block) stateText = BLOCK_NOTE[block];
            else if (watering && growing) stateText = m.tapToWater;
            else stateText = STAGE_LABEL[stage];
            if (growing && !(watering && !block)) stateText += m.timeLeft(formatDuration(left));

            const body = (
              <>
                <span className="fj-plot__no">{m.plotNo(plot.id)}</span>
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
                <span className="fj-plot__crop">{crop ? crop.name : m.empty}</span>
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
                        ? m.plantPlot(plot.id, CROPS[activeSeed].seedName.toLowerCase())
                        : m.plotNoSeed(plot.id)
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
                    aria-label={m.waterPlot(
                      plot.id,
                      crop!.name,
                      STAGE_LABEL[stage].toLowerCase(),
                      formatDuration(left),
                      block ? BLOCK_NOTE[block] : '',
                    )}
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
            <li className="fj-plot fj-plot--locked" aria-label={m.nextPlotLabel(nextPlotAt)}>
              <span className="fj-plot__no">{m.plotNo(state.plots.length + 1)}</span>
              <span className="fj-plot__bed" aria-hidden="true">
                <span className="plot__soil" />
              </span>
              <span className="fj-plot__crop">{m.comingSoon}</span>
              <span className="fj-plot__state">{m.nextPlotNote(nextPlotAt)}</span>
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
        onAnimal={animalAct}
        onPlant={(plotId, crop) => plantAt(plotId, crop)}
        onFind={spinForSeed}
      />

      {emptyCount === 0 && !watering && <p className="fj-note">{m.full}</p>}

      <div className="fj-garden__shelves">
        <div className="fj-shelf">
          <h3 className="fj-h3">{m.seedTray}</h3>
          {seeds.length === 0 ? (
            <p className="fj-note">{m.seedTrayEmpty}</p>
          ) : (
            <div className="fj-chips" role="radiogroup" aria-label={m.pickSeed}>
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
            {m.pantry}
          </h3>
          {pantry.length === 0 ? (
            <p className="fj-note">{m.pantryEmpty}</p>
          ) : (
            <ul className="fj-chips" aria-label={m.pantryLabel}>
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
