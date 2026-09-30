import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  Minus,
  Plus,
  Square,
  X,
} from '@phosphor-icons/react';
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CropIcon } from '../../components/ui/CropIcon';
import {
  ANIMALS,
  ANIMAL_LIST,
  CROPS,
  DECOR,
  PRODUCE_IDS,
  WATERING,
  produceName,
} from '../../data/game';
import type { AnimalId, CropId, DecorId } from '../../data/types';
import type { GuestProgress } from '../../domain/progress';
import {
  STAGE_LABEL,
  animalStage,
  isGrowing,
  nextPlotLevel,
  plotStage,
  readyPlots,
  waterBlock,
  waterLeft,
  type AnimalStage,
} from '../../domain/selectors';
import { formatDuration } from '../../domain/time';
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
import { Sky } from './scene/Sky';
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

const BUILDING_NAME: Record<BuildingId, string> = {
  kitchen: 'Bếp Cô Ba',
  barn: 'Nhà kho',
  well: 'Giếng nước',
  chicken: 'Chuồng gà',
  cow: 'Chuồng bò',
};

const ANIMAL_UNIT: Record<AnimalId, string> = { chicken: 'quả trứng', cow: 'bình sữa' };

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
  const selectBuilding = (id: BuildingId) => {
    if (arranging) return;
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
        <div className="g3d-card" role="region" aria-label="Sắp xếp trang trí">
          <div className="g3d-card__head">
            <p className="g3d-card__kicker">Sắp xếp</p>
            <h3 className="g3d-card__title">
              {picked ? DECOR[picked].name : 'Chọn một món trang trí'}
            </h3>
          </div>
          <p className="g3d-card__text">
            {picked
              ? 'Chạm một ô sáng trên cỏ để dời tới đó.'
              : 'Chạm vào bù nhìn, đèn lồng hay chum nước trên đảo.'}
          </p>
          {stored.length > 0 && (
            <div className="g3d-card__chips">
              {stored.map((d) => (
                <button key={d} type="button" className="g3d-chip" onClick={() => putBack(d)}>
                  Đặt lại {DECOR[d].name.toLowerCase()}
                </button>
              ))}
            </div>
          )}
          <div className="g3d-card__actions">
            {picked && spots[picked] && (
              <>
                <button type="button" className="g3d-btn" onClick={rotate}>
                  <ArrowsClockwise size={16} aria-hidden="true" /> Xoay
                </button>
                <button
                  type="button"
                  className="g3d-btn"
                  onClick={() => {
                    props.onStoreDecor(picked);
                    setPicked(null);
                  }}
                >
                  Cất vào kho
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
              Xong
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
        aria-label="Đóng"
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
        <div className="g3d-card" role="region" aria-label={`Ô ${plot.id}`}>
          <div className="g3d-card__head">
            <p className="g3d-card__kicker">Ô {plot.id}</p>
            <h3 className="g3d-card__title">{crop ? crop.name : 'Ô trống'}</h3>
            {close}
          </div>
          {stage === 'empty' ? (
            props.seeds.length === 0 ? (
              <p className="g3d-card__text">Khay hạt trống. Mỗi món bạn chốt gửi lại một hạt.</p>
            ) : (
              <>
                <div className="g3d-card__chips" role="radiogroup" aria-label="Chọn hạt">
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
                      {CROPS[c].seedName} ×{state.seeds[c]}
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
                    Gieo {props.activeSeed ? CROPS[props.activeSeed].seedName.toLowerCase() : ''}
                  </button>
                </div>
              </>
            )
          ) : stage === 'ready' ? (
            <>
              <p className="g3d-card__text">Chín rồi! Thu về kho để nấu hoặc giao đơn.</p>
              <div className="g3d-card__actions">
                <button type="button" className="g3d-btn g3d-btn--primary" onClick={harvest}>
                  Thu hoạch{ready.length > 1 ? ` cả ${ready.length} ô` : ''}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="g3d-card__text">
                {STAGE_LABEL[stage]} · còn {formatDuration(left)}
                {block === 'wet' && ' · đất còn ẩm'}
                {block === 'empty-can' && ' · hết nước hôm nay'}
              </p>
              <div className="g3d-card__actions">
                <button
                  type="button"
                  className="g3d-btn g3d-btn--water"
                  disabled={block !== null}
                  onClick={() => water(plot.id)}
                >
                  Tưới (−{Math.round(WATERING.cut * 100)}%) · còn {cans}
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
          <p className="g3d-card__text">Cô Ba nấu từ nguyên liệu trong kho. Đủ thì nấu một chạm.</p>
          <div className="g3d-card__actions">
            <button
              type="button"
              className="g3d-btn g3d-btn--primary"
              onClick={() => props.onGo('cong-thuc')}
            >
              Xem công thức
            </button>
            <button type="button" className="g3d-btn" onClick={() => props.onGo('don-co-ba')}>
              Đơn của Cô Ba
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
              ? 'Kho còn trống — thu hoạch để có nguyên liệu.'
              : stock.map((p) => `${produceName(p)} ×${state.ingredients[p]}`).join(' · ')}
          </p>
          <div className="g3d-card__actions">
            <button type="button" className="g3d-btn" onClick={() => props.onGo('cho-que')}>
              Ra chợ quê
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
                Sắp xếp trang trí
              </button>
            )}
          </div>
        </>
      );
    } else if (id === 'well') {
      body = (
        <>
          <p className="g3d-card__text">
            Còn {cans}/{WATERING.perDay} lượt tưới hôm nay. Mỗi lần rút ngắn{' '}
            {Math.round(WATERING.cut * 100)}% thời gian còn lại.
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
              {watering ? 'Cất bình tưới' : 'Múc nước tưới cây'}
            </button>
          </div>
        </>
      );
    } else {
      const def = ANIMALS[id];
      const st = animals[id];
      const a = state.animals[id];
      const feedName = produceName(def.feed);
      body = (
        <>
          <p className="g3d-card__text">
            {st === 'locked' && `Mở khi lên cấp ${def.unlockLevel}.`}
            {st === 'hungry' &&
              (state.ingredients[def.feed] > 0
                ? `Cho ăn 1 ${feedName.toLowerCase()} → ${def.hours} giờ sau có ${def.yield} ${ANIMAL_UNIT[id]}.`
                : `Cần 1 ${feedName.toLowerCase()} trong kho để cho ăn.`)}
            {st === 'busy' && `Đang ăn no · còn ${formatDuration((a.readyAt ?? now) - now)}.`}
            {st === 'ready' && `Có ${def.yield} ${ANIMAL_UNIT[id]} chờ bạn thu!`}
          </p>
          <div className="g3d-card__actions">
            {st === 'hungry' && (
              <button
                type="button"
                className="g3d-btn g3d-btn--primary"
                disabled={state.ingredients[def.feed] <= 0}
                onClick={() => animal(id, 'feed')}
              >
                Cho ăn
              </button>
            )}
            {st === 'ready' && (
              <button
                type="button"
                className="g3d-btn g3d-btn--primary"
                onClick={() => animal(id, 'collect')}
              >
                Thu {produceName(def.product).toLowerCase()}
              </button>
            )}
          </div>
        </>
      );
    }
    return (
      <div className="g3d-card" role="region" aria-label={BUILDING_NAME[id]}>
        <div className="g3d-card__head">
          <p className="g3d-card__kicker">Công trình</p>
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
          <Chef reduced={reduced} />
          {!reduced && <Effects events={fx} />}
          <CameraRig handle={cam} reduced={reduced} />
        </Canvas>
      </div>

      <div className="g3d__tools">
        <button
          type="button"
          className="g3d-icon"
          onClick={() => cam.current?.zoom(0.8)}
          aria-label="Phóng to"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="g3d-icon"
          onClick={() => cam.current?.zoom(1.25)}
          aria-label="Thu nhỏ"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="g3d-icon"
          onClick={() => cam.current?.reset()}
          aria-label="Về góc nhìn ban đầu"
        >
          <ArrowCounterClockwise size={16} aria-hidden="true" />
        </button>
        <label className="g3d-quality">
          <span className="sr-only">Chất lượng hình</span>
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
          <Square size={16} aria-hidden="true" /> 2D
        </button>
      </div>

      {watering && !card && (
        <p className="g3d-hint" role="status">
          Chạm ô có viền xanh để tưới · còn {cans} lượt
        </p>
      )}
      {!watering && !card && ready.length > 0 && (
        <button type="button" className="g3d-hint g3d-hint--action" onClick={harvest}>
          Thu hoạch {ready.length} ô chín
        </button>
      )}

      <div className="g3d__panel" aria-live="polite">
        {card}
      </div>

      {/* Keyboard and screen-reader route to everything on the island. */}
      <ul className="g3d__sr" aria-label="Khu vườn 3D">
        {state.plots.map((p) => {
          const stage = plotStage(p, now);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => setSel({ kind: 'plot', id: p.id })}>
                Ô {p.id}:{' '}
                {p.crop ? `${CROPS[p.crop].name}, ${STAGE_LABEL[stage].toLowerCase()}` : 'trống'}
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
              Sắp xếp trang trí
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
