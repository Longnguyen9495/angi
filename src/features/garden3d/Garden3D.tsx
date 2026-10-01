import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  Coins,
  MapTrifold,
  Minus,
  Plus,
  X,
} from '@phosphor-icons/react';
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CropIcon } from '../../components/ui/CropIcon';
import {
  ANIMALS,
  ANIMAL_LIST,
  CATCHES,
  CROPS,
  DECOR,
  FISHING,
  PRODUCE_IDS,
  WATERING,
  produceName,
} from '../../data/game';
import type { AnimalId, CropId, DecorId } from '../../data/types';
import type { GuestProgress } from '../../domain/progress';
import {
  STAGE_LABEL,
  animalStage,
  biteDelay,
  catchFor,
  fishingLeft,
  level,
  isGrowing,
  nextPlotLevel,
  plotStage,
  readyPlots,
  waterBlock,
  waterLeft,
  type AnimalStage,
} from '../../domain/selectors';
import { formatDuration } from '../../domain/time';
import { t } from '../../i18n';
import {
  BUILDINGS,
  decorSpots,
  freeCells,
  isPlaceable,
  plotPosition,
  type BuildingId,
  type PlaceableDecor,
} from './layout';
import { QUALITY, QUALITY_LABEL, deviceQuality, type Quality } from './quality';
import { Buildings } from './scene/Buildings';
import { CameraRig, type CameraHandle } from './scene/CameraRig';
import { Chef } from './scene/Chef';
import { CellMarkers, Decor3D, Fence } from './scene/Decor3D';
import { Effects, FX_MS, type FxEvent, type FxKind } from './scene/Effects';
import { Island } from './scene/Island';
import { Plots } from './scene/Plots';
import type { FishingPhase } from './scene/Pond';
import { Sky } from './scene/Sky';
import { Windmill } from './scene/Windmill';
import { hourOf, skyAt } from './sky';
import './garden3d.css';

type Selection = { kind: 'plot'; id: number } | { kind: 'building'; id: BuildingId } | null;

const QUALITY_KEY = 'bv.garden3d.quality';

function readQuality(): Quality {
  try {
    const q = localStorage.getItem(QUALITY_KEY);
    if (q === 'low' || q === 'medium' || q === 'high') return q;
  } catch {
    /* storage blocked: fall through */
  }
  return deviceQuality();
}

const BUILDING_NAME: Record<BuildingId, string> = t.farm.garden3d.buildings;

const ANIMAL_UNIT: Record<AnimalId, (n: number) => string> = t.farm.garden3d.animal.units;

const copy = t.farm.garden3d;
const common = t.farm.common;

export interface Garden3DProps {
  state: GuestProgress;
  now: number;
  reduced: boolean;
  watering: boolean;
  activeSeed: CropId | null;
  seeds: CropId[];
  onPickSeed: (crop: CropId) => void;
  onPlant: (plotId: number, crop: CropId) => void;
  onWater: (plotId: number) => void;
  onHarvest: () => void;
  onToggleWatering: () => void;
  onAnimal: (animal: AnimalId, act: 'feed' | 'collect') => void;
  /** A bite was hooked at the pond for the cast made at `castAt` (ms). */
  onCatch: (castAt: number) => void;
  onPlaceDecor: (decor: DecorId, x: number, z: number, rot: number) => void;
  onStoreDecor: (decor: DecorId) => void;
  onGo: (section: 'cong-thuc' | 'don-co-ba' | 'cho-que') => void;
  /** Back to the flat garden (also used when WebGL gives up). */
  onFlat: (reason: 'user' | 'lost') => void;
}

export default function Garden3D(props: Garden3DProps) {
  const { state, now, reduced, watering } = props;
  const [quality, setQualityState] = useState<Quality>(readQuality);
  const q = QUALITY[quality];
  const [sel, setSel] = useState<Selection>(null);
  const [arranging, setArranging] = useState(false);
  const [picked, setPicked] = useState<PlaceableDecor | null>(null);
  const [fx, setFx] = useState<FxEvent[]>([]);
  const [visible, setVisible] = useState(true);
  const fxId = useRef(1);
  const [fishing, setFishing] = useState<{ phase: FishingPhase; castAt: number }>({
    phase: 'idle',
    castAt: 0,
  });
  const fishTimers = useRef<number[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const cam = useRef<CameraHandle>(null);

  const setQuality = (v: Quality) => {
    setQualityState(v);
    try {
      localStorage.setItem(QUALITY_KEY, v);
    } catch {
      /* not remembered — fine */
    }
  };

  const clearFishTimers = () => {
    fishTimers.current.forEach((id) => window.clearTimeout(id));
    fishTimers.current = [];
  };
  useEffect(() => clearFishTimers, []);
  const later = (ms: number, run: () => void) => {
    fishTimers.current.push(window.setTimeout(run, ms));
  };

  // Stop drawing while the garden is scrolled out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), {
      rootMargin: '120px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const burst = useCallback((kind: FxKind, x: number, z: number) => {
    const id = fxId.current++;
    setFx((list) => [...list.slice(-5), { id, kind, x, z }]);
    setTimeout(() => setFx((list) => list.filter((e) => e.id !== id)), FX_MS);
  }, []);

  const look = useMemo(() => skyAt(Math.round(hourOf(now) * 12) / 12), [now]);
  const ready = readyPlots(state.plots, now);
  const cans = waterLeft(state, now);
  const animals = useMemo(
    () =>
      Object.fromEntries(ANIMAL_LIST.map((a) => [a.id, animalStage(state, a.id, now)])) as Record<
        AnimalId,
        AnimalStage
      >,
    [state, now],
  );
  const wateringIds = useMemo(() => {
    const ids = new Set<number>();
    if (!watering) return ids;
    for (const p of state.plots) {
      if (isGrowing(plotStage(p, now)) && waterBlock(state, p, now) === null) ids.add(p.id);
    }
    return ids;
  }, [watering, state, now]);
  const spots = useMemo(
    () => decorSpots(state.decor, state.decorLayout),
    [state.decor, state.decorLayout],
  );
  const cells = useMemo(() => {
    if (!arranging || !picked) return [];
    const taken = Object.entries(spots)
      .filter(([id]) => id !== picked)
      .map(([, p]) => p!);
    return freeCells(state.plots.length, taken);
  }, [arranging, picked, spots, state.plots.length]);
  const stored = state.decor.filter((d): d is PlaceableDecor => isPlaceable(d) && !spots[d]);
  const placeable = state.decor.some(isPlaceable);

  const plotIndex = (id: number) => state.plots.findIndex((p) => p.id === id);
  const plotXZ = (id: number) => plotPosition(Math.max(0, plotIndex(id)));

  const plant = (plotId: number, crop: CropId) => {
    const [x, z] = plotXZ(plotId);
    props.onPlant(plotId, crop);
    burst('plant', x, z);
  };
  const water = (plotId: number) => {
    const [x, z] = plotXZ(plotId);
    props.onWater(plotId);
    burst('water', x, z);
  };
  const harvest = () => {
    for (const p of ready) {
      const [x, z] = plotXZ(p.id);
      burst('harvest', x, z);
    }
    props.onHarvest();
    setSel(null);
  };
  const animal = (id: AnimalId, act: 'feed' | 'collect') => {
    props.onAnimal(id, act);
    burst(act === 'collect' ? 'collect' : 'plant', BUILDINGS[id].x, BUILDINGS[id].z);
  };

  const selectPlot = (plotId: number) => {
    if (arranging) return;
    const plot = state.plots.find((p) => p.id === plotId);
    if (!plot) return;
    const stage = plotStage(plot, now);
    // Watering mode: a tap waters straight away.
    if (watering && isGrowing(stage)) {
      if (waterBlock(state, plot, now) === null) water(plotId);
      else setSel({ kind: 'plot', id: plotId });
      return;
    }
    setSel({ kind: 'plot', id: plotId });
    const [x, z] = plotPosition(Math.max(0, state.plots.indexOf(plot)));
    cam.current?.focus(x, z);
  };
  /** Cast: a bite comes after a short wait; it slips away if not hooked in time. */
  const cast = () => {
    if (fishing.phase !== 'idle' || fishingLeft(state, Date.now()) <= 0) return;
    clearFishTimers();
    const castAt = Date.now();
    setFishing({ phase: 'waiting', castAt });
    later(biteDelay(castAt), () => {
      setFishing({ phase: 'bite', castAt });
      later(FISHING.windowMs, () => {
        setFishing({ phase: 'missed', castAt });
        later(1600, () => setFishing({ phase: 'idle', castAt: 0 }));
      });
    });
  };
  /** Pull the rod: hooks the fish during a bite, otherwise just reels in. */
  const reel = () => {
    clearFishTimers();
    if (fishing.phase === 'bite') {
      props.onCatch(fishing.castAt);
      burst('collect', BUILDINGS.pond.x - 0.7, BUILDINGS.pond.z);
      setFishing({ phase: 'caught', castAt: fishing.castAt });
      later(1800, () => setFishing({ phase: 'idle', castAt: 0 }));
    } else {
      setFishing({ phase: 'idle', castAt: 0 });
    }
  };

  const selectBuilding = (id: BuildingId) => {
    if (arranging) return;
    // Tapping the pond while something bites hooks it.
    if (id === 'pond' && fishing.phase === 'bite') {
      reel();
      setSel({ kind: 'building', id });
      return;
    }
    setSel({ kind: 'building', id });
    cam.current?.focus(BUILDINGS[id].x, BUILDINGS[id].z);
  };

  const place = (x: number, z: number) => {
    if (!picked) return;
    const rot = state.decorLayout[picked]?.rot ?? 0;
    props.onPlaceDecor(picked, x, z, rot);
    burst('plant', x, z);
  };
  const rotate = () => {
    if (!picked) return;
    const s = spots[picked];
    if (s) props.onPlaceDecor(picked, s.x, s.z, (s.rot + 1) % 4);
  };
  const putBack = (id: PlaceableDecor) => {
    const taken = Object.values(spots);
    const cell = freeCells(state.plots.length, taken)[0];
    if (cell) props.onPlaceDecor(id, cell.x, cell.z, 0);
    setPicked(id);
  };

  const card = renderCard();

  function renderCard() {
    if (arranging) {
      return (
        <div className="g3d-card" role="region" aria-label={copy.arrange.label}>
          <div className="g3d-card__head">
            <p className="g3d-card__kicker">{copy.arrange.kicker}</p>
            <h3 className="g3d-card__title">
              {picked ? DECOR[picked].name : copy.arrange.pickTitle}
            </h3>
          </div>
          <p className="g3d-card__text">{picked ? copy.arrange.moveHint : copy.arrange.pickHint}</p>
          {stored.length > 0 && (
            <div className="g3d-card__chips">
              {stored.map((d) => (
                <button key={d} type="button" className="g3d-chip" onClick={() => putBack(d)}>
                  {copy.arrange.putBack(DECOR[d].name)}
                </button>
              ))}
            </div>
          )}
          <div className="g3d-card__actions">
            {picked && spots[picked] && (
              <>
                <button type="button" className="g3d-btn" onClick={rotate}>
                  <ArrowsClockwise size={16} aria-hidden="true" /> {copy.arrange.rotate}
                </button>
                <button
                  type="button"
                  className="g3d-btn"
                  onClick={() => {
                    props.onStoreDecor(picked);
                    setPicked(null);
                  }}
                >
                  {copy.arrange.store}
                </button>
              </>
            )}
            <button
              type="button"
              className="g3d-btn g3d-btn--primary"
              onClick={() => {
                setArranging(false);
                setPicked(null);
              }}
            >
              {copy.arrange.done}
            </button>
          </div>
        </div>
      );
    }
    if (!sel) return null;
    const close = (
      <button
        type="button"
        className="g3d-card__close"
        onClick={() => setSel(null)}
        aria-label={copy.close}
      >
        <X size={16} aria-hidden="true" />
      </button>
    );

    if (sel.kind === 'plot') {
      const plot = state.plots.find((p) => p.id === sel.id);
      if (!plot) return null;
      const stage = plotStage(plot, now);
      const crop = plot.crop ? CROPS[plot.crop] : null;
      const left = plot.readyAt !== null ? plot.readyAt - now : 0;
      const block = isGrowing(stage) ? waterBlock(state, plot, now) : null;
      return (
        <div className="g3d-card" role="region" aria-label={common.plot(plot.id)}>
          <div className="g3d-card__head">
            <p className="g3d-card__kicker">{common.plot(plot.id)}</p>
            <h3 className="g3d-card__title">{crop ? crop.name : common.emptyPlot}</h3>
            {close}
          </div>
          {stage === 'empty' ? (
            props.seeds.length === 0 ? (
              <p className="g3d-card__text">{copy.plot.seedsEmpty}</p>
            ) : (
              <>
                <div className="g3d-card__chips" role="radiogroup" aria-label={common.chooseSeed}>
                  {props.seeds.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={props.activeSeed === c}
                      className={`g3d-chip ${props.activeSeed === c ? 'is-on' : ''}`}
                      onClick={() => props.onPickSeed(c)}
                    >
                      <CropIcon crop={c} />
                      {common.seedChip(CROPS[c].seedName, state.seeds[c])}
                    </button>
                  ))}
                </div>
                <div className="g3d-card__actions">
                  <button
                    type="button"
                    className="g3d-btn g3d-btn--primary"
                    disabled={!props.activeSeed}
                    onClick={() => {
                      if (props.activeSeed) plant(plot.id, props.activeSeed);
                      setSel(null);
                    }}
                  >
                    {common.sow(props.activeSeed ? CROPS[props.activeSeed].seedName : null)}
                  </button>
                </div>
              </>
            )
          ) : stage === 'ready' ? (
            <>
              <p className="g3d-card__text">{common.ripe}</p>
              <div className="g3d-card__actions">
                <button type="button" className="g3d-btn g3d-btn--primary" onClick={harvest}>
                  {common.harvest(ready.length)}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="g3d-card__text">
                {common.growing(STAGE_LABEL[stage], formatDuration(left))}
                {block === 'wet' && copy.plot.wet}
                {block === 'empty-can' && copy.plot.emptyCan}
              </p>
              <div className="g3d-card__actions">
                <button
                  type="button"
                  className="g3d-btn g3d-btn--water"
                  disabled={block !== null}
                  onClick={() => water(plot.id)}
                >
                  {common.water(Math.round(WATERING.cut * 100), cans)}
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    const id = sel.id;
    let body: ReactNode;
    if (id === 'kitchen') {
      body = (
        <>
          <p className="g3d-card__text">{copy.kitchen.text}</p>
          <div className="g3d-card__actions">
            <button
              type="button"
              className="g3d-btn g3d-btn--primary"
              onClick={() => props.onGo('cong-thuc')}
            >
              {copy.kitchen.recipes}
            </button>
            <button type="button" className="g3d-btn" onClick={() => props.onGo('don-co-ba')}>
              {copy.kitchen.orders}
            </button>
          </div>
        </>
      );
    } else if (id === 'barn') {
      const stock = PRODUCE_IDS.filter((p) => state.ingredients[p] > 0);
      body = (
        <>
          <p className="g3d-card__text">
            {stock.length === 0
              ? copy.barn.empty
              : stock
                  .map((p) => common.stockItem(produceName(p), state.ingredients[p]))
                  .join(' · ')}
          </p>
          <div className="g3d-card__actions">
            <button type="button" className="g3d-btn" onClick={() => props.onGo('cho-que')}>
              {common.goMarket}
            </button>
            {placeable && (
              <button
                type="button"
                className="g3d-btn"
                onClick={() => {
                  setSel(null);
                  setArranging(true);
                }}
              >
                {copy.arrange.label}
              </button>
            )}
          </div>
        </>
      );
    } else if (id === 'well') {
      body = (
        <>
          <p className="g3d-card__text">
            {copy.well.text(cans, WATERING.perDay, Math.round(WATERING.cut * 100))}
          </p>
          <div className="g3d-card__actions">
            <button
              type="button"
              className="g3d-btn g3d-btn--water"
              disabled={!watering && cans === 0}
              onClick={() => {
                props.onToggleWatering();
                setSel(null);
              }}
            >
              {watering ? copy.well.stop : copy.well.start}
            </button>
          </div>
        </>
      );
    } else if (id === 'pond') {
      const left = fishingLeft(state, now);
      const kind = fishing.castAt ? CATCHES[catchFor(fishing.castAt)].name : '';
      const pond = copy.pond;
      const text: Record<FishingPhase, string> = {
        idle: left > 0 ? pond.idle(left, FISHING.perDay) : pond.done,
        waiting: pond.waiting,
        bite: pond.bite,
        caught: pond.caught(kind),
        missed: pond.missed,
      };
      body = (
        <>
          <p className="g3d-card__text">{text[fishing.phase]}</p>
          <div className="g3d-card__actions">
            {fishing.phase === 'idle' && (
              <button
                type="button"
                className="g3d-btn g3d-btn--primary"
                disabled={left <= 0}
                onClick={cast}
              >
                {pond.cast}
              </button>
            )}
            {(fishing.phase === 'waiting' || fishing.phase === 'bite') && (
              <button
                type="button"
                className={`g3d-btn ${fishing.phase === 'bite' ? 'g3d-btn--primary g3d-btn--pulse' : ''}`}
                onClick={reel}
              >
                {fishing.phase === 'bite' ? pond.hook : pond.reelIn}
              </button>
            )}
          </div>
        </>
      );
    } else {
      const def = ANIMALS[id];
      const st = animals[id];
      const a = state.animals[id];
      const feedName = produceName(def.feed);
      const unit = ANIMAL_UNIT[id](def.yield);
      body = (
        <>
          <p className="g3d-card__text">
            {st === 'locked' && copy.animal.locked(def.unlockLevel)}
            {st === 'hungry' &&
              (state.ingredients[def.feed] > 0
                ? copy.animal.feedHint(feedName, def.hours, def.yield, unit)
                : copy.animal.needFeed(feedName))}
            {st === 'busy' && copy.animal.busy(formatDuration((a.readyAt ?? now) - now))}
            {st === 'ready' && copy.animal.ready(def.yield, unit)}
          </p>
          <div className="g3d-card__actions">
            {st === 'hungry' && (
              <button
                type="button"
                className="g3d-btn g3d-btn--primary"
                disabled={state.ingredients[def.feed] <= 0}
                onClick={() => animal(id, 'feed')}
              >
                {copy.animal.feed}
              </button>
            )}
            {st === 'ready' && (
              <button
                type="button"
                className="g3d-btn g3d-btn--primary"
                onClick={() => animal(id, 'collect')}
              >
                {copy.animal.collect(produceName(def.product))}
              </button>
            )}
          </div>
        </>
      );
    }
    return (
      <div className="g3d-card" role="region" aria-label={BUILDING_NAME[id]}>
        <div className="g3d-card__head">
          <p className="g3d-card__kicker">{common.building}</p>
          <h3 className="g3d-card__title">{BUILDING_NAME[id]}</h3>
          {close}
        </div>
        {body}
      </div>
    );
  }

  const frameloop = !visible ? 'never' : reduced ? 'demand' : 'always';

  return (
    <div
      className={`g3d ${watering ? 'is-watering' : ''} ${arranging ? 'is-arranging' : ''}`}
      ref={wrap}
    >
      <div className="g3d__stage" aria-hidden="true">
        <Canvas
          frameloop={frameloop}
          dpr={q.dpr}
          shadows={q.shadows ? 'soft' : false}
          camera={{ fov: 38, near: 0.5, far: 200, position: [0, 14, 17] }}
          gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              props.onFlat('lost');
            });
            // ?g3d-debug exposes renderer stats (draw calls, triangles) for measuring tiers.
            if (window.location.search.includes('g3d-debug')) {
              (window as unknown as { __g3dInfo: unknown }).__g3dInfo = gl.info;
            }
          }}
          onPointerMissed={() => {
            if (!arranging) setSel(null);
          }}
        >
          <Sky
            look={look}
            clouds={q.clouds}
            shadowSize={q.shadows ? q.shadowSize : 0}
            reduced={reduced}
          />
          <Island grass={q.grass} reduced={reduced} />
          <Plots
            plots={state.plots}
            now={now}
            selectedPlot={sel?.kind === 'plot' ? sel.id : null}
            plants={q.plantsPerPlot}
            reduced={reduced}
            wateringIds={wateringIds}
            nextPlotLevel={nextPlotLevel(state)}
            onSelect={selectPlot}
          />
          <Buildings
            selected={sel?.kind === 'building' ? sel.id : null}
            animals={animals}
            watering={watering}
            steam={!reduced}
            fishing={fishing.phase}
            onSelect={selectBuilding}
          />
          {state.decor.includes('fence') && <Fence plotCount={state.plots.length} />}
          <Decor3D
            spots={spots}
            night={look.night}
            lights={q.lights}
            arranging={arranging}
            picked={picked}
            onPick={setPicked}
          />
          {arranging && picked && <CellMarkers cells={cells} onPlace={place} />}
          <Windmill reduced={reduced} />
          <Chef reduced={reduced} />
          {!reduced && <Effects events={fx} />}
          <CameraRig handle={cam} reduced={reduced} />
        </Canvas>
      </div>

      <GardenHud state={state} />

      <div className="g3d__tools">
        <button
          type="button"
          className="g3d-icon"
          onClick={() => cam.current?.zoom(0.8)}
          aria-label={common.zoomIn}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="g3d-icon"
          onClick={() => cam.current?.zoom(1.25)}
          aria-label={common.zoomOut}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="g3d-icon"
          onClick={() => cam.current?.reset()}
          aria-label={common.resetView}
        >
          <ArrowCounterClockwise size={16} aria-hidden="true" />
        </button>
        <label className="g3d-quality">
          <span className="sr-only">{common.quality}</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
            {(Object.keys(QUALITY) as Quality[]).map((k) => (
              <option key={k} value={k}>
                {QUALITY_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="g3d-icon g3d-icon--wide"
          onClick={() => props.onFlat('user')}
        >
          <MapTrifold size={16} aria-hidden="true" /> {common.flat}
        </button>
      </div>

      {watering && !card && (
        <p className="g3d-hint" role="status">
          {copy.wateringHint(cans)}
        </p>
      )}
      {!watering && !card && ready.length > 0 && (
        <button type="button" className="g3d-hint g3d-hint--action" onClick={harvest}>
          {copy.harvestHint(ready.length)}
        </button>
      )}

      <div className="g3d__panel" aria-live="polite">
        {card}
      </div>

      {/* Keyboard and screen-reader route to everything on the island. */}
      <ul className="g3d__sr" aria-label={copy.srList}>
        {state.plots.map((p) => {
          const stage = plotStage(p, now);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => setSel({ kind: 'plot', id: p.id })}>
                {common.srPlot(p.id, p.crop ? CROPS[p.crop].name : null, STAGE_LABEL[stage])}
              </button>
            </li>
          );
        })}
        {(Object.keys(BUILDINGS) as BuildingId[]).map((b) => (
          <li key={b}>
            <button type="button" onClick={() => setSel({ kind: 'building', id: b })}>
              {BUILDING_NAME[b]}
            </button>
          </li>
        ))}
        {placeable && (
          <li>
            <button type="button" onClick={() => setArranging(true)}>
              {copy.arrange.label}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Game HUD: level badge, XP toward the next level and coins (from the shared progress). */
function GardenHud({ state }: { state: GuestProgress }) {
  const lv = level(state.xp);
  const pct = Math.round((lv.into / lv.span) * 100);
  return (
    <div className="g3d-hud" aria-label={copy.hud(lv.level, lv.into, lv.span, state.coins)}>
      <span className="g3d-hud__level" aria-hidden="true">
        {lv.level}
      </span>
      <span className="g3d-hud__xp" aria-hidden="true">
        <span className="g3d-hud__label">{copy.hudLevel(lv.level)}</span>
        <span className="g3d-hud__bar">
          <span className="g3d-hud__fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </span>
        <span className="g3d-hud__label g3d-hud__label--sub">
          {lv.into}/{lv.span} XP
        </span>
      </span>
      <span className="g3d-hud__coins" aria-hidden="true" key={state.coins}>
        <Coins size={16} weight="fill" /> {state.coins}
      </span>
    </div>
  );
}
