import {
  ArrowCounterClockwise,
  Basket,
  Drop,
  Minus,
  Plant,
  Plus,
  Square,
  Warehouse,
  X,
} from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CropIcon } from '../../components/ui/CropIcon';
import { CROPS, PRODUCE_IDS, WATERING, produceName } from '../../data/game';
import type { CropId } from '../../data/types';
import type { GuestProgress } from '../../domain/progress';
import {
  STAGE_LABEL,
  isGrowing,
  plotGrowth,
  plotStage,
  readyPlots,
  waterBlock,
  waterLeft,
} from '../../domain/selectors';
import { currentTime, formatDuration } from '../../domain/time';
import { useFeedback } from '../../state/hooks';
import { QUALITY, QUALITY_LABEL, deviceQuality, type Quality } from '../garden3d/quality';
import { BLOCK_TEXT, CommandGate, buildFarmView, planCommand, viewKey } from './bridge';
import type {
  CreateFarmEngine,
  DayPart,
  FarmCommand,
  FarmEngineHandle,
  FarmEnv,
  FarmIntent,
  FarmSelection,
} from './contract';
import './farm-pc.css';

/** Same key as the classic 3D garden: one quality choice per device. */
const QUALITY_KEY = 'bv.garden3d.quality';
const LOAD_TIMEOUT_MS = 15_000;
/** If a command somehow did not change progress, let the next one through anyway. */
const GATE_RELEASE_MS = 1500;

function readQuality(): Quality {
  try {
    const q = localStorage.getItem(QUALITY_KEY);
    if (q === 'low' || q === 'medium' || q === 'high') return q;
  } catch {
    /* storage blocked */
  }
  return deviceQuality();
}

type Status =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; reason: 'load' | 'timeout' | 'lost' };

const ERROR_TEXT: Record<'load' | 'timeout' | 'lost', string> = {
  load: 'Không tải được cảnh 3D (máy có thể chưa hỗ trợ WebGL 2 hoặc mạng bị gián đoạn).',
  timeout: 'Cảnh 3D tải quá lâu.',
  lost: 'Trình duyệt vừa tạm dừng đồ hoạ 3D.',
};

export interface FarmPlayCanvasProps {
  state: GuestProgress;
  now: number;
  reduced: boolean;
  dayPart: DayPart;
  watering: boolean;
  activeSeed: CropId | null;
  seeds: CropId[];
  onPickSeed: (crop: CropId) => void;
  /** The existing GardenSection handlers: they dispatch, announce and toast. */
  onPlant: (plotId: number, crop: CropId) => void;
  onWater: (plotId: number) => void;
  onHarvest: () => void;
  onMarket?: () => void;
  onFlat: () => void;
  /** Leave the experiment: back to the React Three Fiber island. */
  onClassic: () => void;
  /** Test seam; production lazy-loads engine/FarmEngine. */
  createEngine?: CreateFarmEngine;
}

/**
 * React host for the PlayCanvas corner (experiment). One engine per mount;
 * progress stays in GameProvider and every change goes through the reducer.
 */
export default function FarmPlayCanvas(props: FarmPlayCanvasProps) {
  const { state, now, reduced, dayPart, watering } = props;
  const { announce } = useFeedback();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<FarmSelection>(null);
  const [quality, setQualityState] = useState<Quality>(readQuality);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [gate] = useState(() => new CommandGate());
  const stage = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const engine = useRef<FarmEngineHandle | null>(null);
  const lastView = useRef('');
  const visible = useRef({ onScreen: true, tab: true });

  const env = useMemo<FarmEnv>(() => ({ quality, reduced, dayPart }), [quality, reduced, dayPart]);
  const view = useMemo(
    () => buildFarmView(state, now, selected, watering),
    [state, now, selected, watering],
  );

  const setQuality = (q: Quality) => {
    setQualityState(q);
    try {
      localStorage.setItem(QUALITY_KEY, q);
    } catch {
      /* not remembered */
    }
  };

  /** Action bar → domain. The engine only hears about accepted results. */
  const run = (cmd: FarmCommand): boolean => {
    const plan = planCommand(state, currentTime(), cmd);
    if (!plan.ok) {
      setNotice({ tone: 'warn', text: BLOCK_TEXT[plan.reason] });
      announce(BLOCK_TEXT[plan.reason]);
      return false;
    }
    if (!gate.enter(state)) {
      setNotice({ tone: 'warn', text: BLOCK_TEXT.busy });
      return false;
    }
    window.setTimeout(() => gate.release(), GATE_RELEASE_MS);
    if (cmd.kind === 'plant') props.onPlant(cmd.plotId, cmd.crop);
    else if (cmd.kind === 'water') props.onWater(cmd.plotId);
    else props.onHarvest();
    engine.current?.play(plan.effect);
    setNotice({
      tone: 'ok',
      text:
        cmd.kind === 'plant'
          ? `Đã gieo ${CROPS[cmd.crop].seedName.toLowerCase()} vào ô ${cmd.plotId}.`
          : cmd.kind === 'water'
            ? `Đã tưới ô ${cmd.plotId}.`
            : `Đã thu hoạch ${plan.effect.plotIds.length} ô về kho.`,
    });
    if (cmd.kind === 'harvest') setSelected(null);
    return true;
  };

  const onIntent = (intent: FarmIntent) => {
    const t = intent.target;
    setNotice(null);
    // Watering mode keeps the classic garden's one-tap watering.
    if (watering && t?.kind === 'plot') {
      const plot = state.plots.find((p) => p.id === t.id);
      if (plot && isGrowing(plotStage(plot, now)) && waterBlock(state, plot, now) === null) {
        run({ kind: 'water', plotId: t.id });
      }
    }
    setSelected(t);
  };

  // Latest-callback refs so the engine, created once, always calls current handlers.
  const intentRef = useRef(onIntent);
  useLayoutEffect(() => {
    intentRef.current = onIntent;
  });
  const envRef = useRef(env);
  useLayoutEffect(() => {
    envRef.current = env;
  }, [env]);

  // Engine lifecycle: a fresh canvas per attempt (a lost context cannot be reused).
  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    let cancelled = false;
    let handle: FarmEngineHandle | null = null;
    const canvas = document.createElement('canvas');
    canvas.className = 'fpc__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    setStatus({ kind: 'loading' });
    const timer = window.setTimeout(() => {
      if (handle || cancelled) return;
      cancelled = true;
      setStatus({ kind: 'error', reason: 'timeout' });
    }, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const create = props.createEngine ?? (await import('./engine/FarmEngine')).createFarmEngine;
        if (cancelled) return;
        const h = await create({
          canvas,
          env: envRef.current,
          onIntent: (i) => intentRef.current(i),
          onLost: () => {
            if (cancelled) return;
            cancelled = true;
            engine.current = null;
            handle?.destroy();
            handle = null;
            setStatus({ kind: 'error', reason: 'lost' });
          },
        });
        if (cancelled) {
          h.destroy();
          return;
        }
        handle = h;
        engine.current = h;
        lastView.current = '';
        h.setActive(visible.current.onScreen && visible.current.tab);
        setStatus({ kind: 'ready' });
      } catch {
        if (!cancelled) setStatus({ kind: 'error', reason: 'load' });
      } finally {
        window.clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (engine.current === handle) engine.current = null;
      handle?.destroy();
      canvas.remove();
    };
    // createEngine is a test seam, fixed for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Domain → engine, only when something visible changed.
  useEffect(() => {
    const h = engine.current;
    if (status.kind !== 'ready' || !h) return;
    const key = viewKey(view);
    if (key === lastView.current) return;
    lastView.current = key;
    h.setView(view);
  }, [view, status]);

  useEffect(() => {
    if (status.kind === 'ready') engine.current?.setEnv(env);
  }, [env, status]);

  // Pause when scrolled away or the tab is hidden; resize with the box and DPR.
  useEffect(() => {
    const el = wrap.current;
    const box = stage.current;
    if (!el || !box) return;
    const sync = () => engine.current?.setActive(visible.current.onScreen && visible.current.tab);
    const onVis = () => {
      visible.current.tab = !document.hidden;
      sync();
    };
    const onResize = () => engine.current?.resize();
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([e]) => {
          visible.current.onScreen = !!e?.isIntersecting;
          sync();
        },
        { rootMargin: '120px' },
      );
      io.observe(el);
    }
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(box);
    }
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    return () => {
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const selectFromList = (sel: FarmSelection) => {
    setNotice(null);
    setSelected(sel);
    // Keyboard users land on the actions for what they picked.
    window.requestAnimationFrame(() =>
      bar.current?.querySelector<HTMLElement>('button:not([disabled]), [role="radio"]')?.focus(),
    );
  };

  const ready = readyPlots(state.plots, now);
  const cans = waterLeft(state, now);
  const loading = status.kind === 'loading';

  return (
    <div
      className={`fpc ${watering ? 'is-watering' : ''}`}
      ref={wrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && selected) {
          e.stopPropagation();
          setSelected(null);
        }
      }}
    >
      <div className="fpc__stage" ref={stage} aria-hidden="true" />

      <div className="fpc__top">
        <span className="fpc__badge">PlayCanvas · thử nghiệm</span>
        <div className="fpc__tools">
          <button
            type="button"
            className="fpc-icon"
            onClick={() => engine.current?.zoom(0.85)}
            aria-label="Phóng to"
            disabled={status.kind !== 'ready'}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="fpc-icon"
            onClick={() => engine.current?.zoom(1.18)}
            aria-label="Thu nhỏ"
            disabled={status.kind !== 'ready'}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="fpc-icon"
            onClick={() => engine.current?.resetCamera()}
            aria-label="Về góc nhìn ban đầu"
            disabled={status.kind !== 'ready'}
          >
            <ArrowCounterClockwise size={16} aria-hidden="true" />
          </button>
          <label className="fpc-quality">
            <span className="sr-only">Chất lượng hình</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              {(Object.keys(QUALITY) as Quality[]).map((k) => (
                <option key={k} value={k}>
                  {QUALITY_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="fpc-icon fpc-icon--wide" onClick={props.onFlat}>
            <Square size={16} aria-hidden="true" /> 2D
          </button>
        </div>
      </div>

      {loading && (
        <div className="fpc__veil" role="status">
          <span className="fpc__spinner" aria-hidden="true" />
          Đang dựng góc vườn…
        </div>
      )}

      {status.kind === 'error' && (
        <div className="fpc__veil fpc__veil--error" role="alert">
          <p className="fpc__veil-title">{ERROR_TEXT[status.reason]}</p>
          <p className="fpc__veil-text">
            Tiến độ vườn vẫn an toàn — chọn cách xem khác hoặc thử lại.
          </p>
          <div className="fpc__veil-actions">
            <button
              type="button"
              className="fpc-btn fpc-btn--primary"
              onClick={() => setAttempt((a) => a + 1)}
            >
              Thử lại
            </button>
            <button type="button" className="fpc-btn" onClick={props.onFlat}>
              Dùng vườn 2D
            </button>
            <button type="button" className="fpc-btn" onClick={props.onClassic}>
              Dùng 3D cũ
            </button>
          </div>
        </div>
      )}

      <div className="fpc__bar" ref={bar} role="region" aria-label="Thao tác góc vườn">
        <ActionBar
          {...props}
          selected={selected}
          ready={ready.length}
          cans={cans}
          disabled={status.kind !== 'ready'}
          notice={notice}
          onClose={() => setSelected(null)}
          run={run}
        />
      </div>

      {/* Everything on the canvas is reachable from here without pointing. */}
      <ul className="fpc__sr" aria-label="Góc vườn 3D">
        {state.plots.map((p) => {
          const st = plotStage(p, now);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => selectFromList({ kind: 'plot', id: p.id })}>
                Ô {p.id}:{' '}
                {p.crop ? `${CROPS[p.crop].name}, ${STAGE_LABEL[st].toLowerCase()}` : 'trống'}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => selectFromList({ kind: 'barn' })}>
            Nhà kho
          </button>
        </li>
      </ul>
    </div>
  );
}

interface ActionBarProps extends FarmPlayCanvasProps {
  selected: FarmSelection;
  ready: number;
  cans: number;
  disabled: boolean;
  notice: { tone: 'ok' | 'warn'; text: string } | null;
  onClose: () => void;
  run: (cmd: FarmCommand) => boolean;
}

/** Context action bar: shows only what fits the current selection. */
function ActionBar(p: ActionBarProps) {
  const { state, now, selected, ready, cans, disabled, notice } = p;
  const noticeEl = notice && (
    <p className={`fpc-notice fpc-notice--${notice.tone}`}>{notice.text}</p>
  );
  const close = (
    <button type="button" className="fpc-close" onClick={p.onClose} aria-label="Bỏ chọn">
      <X size={16} aria-hidden="true" />
    </button>
  );
  const harvestBtn = ready > 0 && (
    <button
      type="button"
      className="fpc-btn fpc-btn--primary"
      disabled={disabled}
      onClick={() => p.run({ kind: 'harvest' })}
    >
      <Basket size={18} aria-hidden="true" />
      {ready > 1 ? `Thu hoạch cả ${ready} ô` : 'Thu hoạch'}
    </button>
  );

  if (!selected) {
    const empty = state.plots.filter((pl) => pl.crop === null).length;
    return (
      <>
        <div className="fpc-bar__head">
          <p className="fpc-bar__kicker">Góc vườn</p>
          <h3 className="fpc-bar__title">Chạm vào luống hoặc nhà kho</h3>
        </div>
        <p className="fpc-bar__stats">
          <span>{ready} ô chín</span>
          <span>{empty} ô trống</span>
          <span>
            {cans}/{WATERING.perDay} lượt tưới
          </span>
        </p>
        {noticeEl}
        {harvestBtn && <div className="fpc-bar__actions">{harvestBtn}</div>}
      </>
    );
  }

  if (selected.kind === 'barn') {
    const stock = PRODUCE_IDS.filter((id) => state.ingredients[id] > 0);
    return (
      <>
        <div className="fpc-bar__head">
          <p className="fpc-bar__kicker">
            <Warehouse size={14} aria-hidden="true" /> Công trình
          </p>
          <h3 className="fpc-bar__title">Nhà kho</h3>
          {close}
        </div>
        <p className="fpc-bar__text">
          {stock.length === 0
            ? 'Kho còn trống — thu hoạch ô chín để có nguyên liệu.'
            : stock.map((id) => `${produceName(id)} ×${state.ingredients[id]}`).join(' · ')}
        </p>
        {noticeEl}
        {p.onMarket && (
          <div className="fpc-bar__actions">
            <button type="button" className="fpc-btn" onClick={p.onMarket}>
              Ra chợ quê
            </button>
          </div>
        )}
      </>
    );
  }

  const plot = state.plots.find((pl) => pl.id === selected.id);
  if (!plot) return null;
  const stage = plotStage(plot, now);
  const crop = plot.crop ? CROPS[plot.crop] : null;
  const head = (
    <div className="fpc-bar__head">
      <p className="fpc-bar__kicker">Ô {plot.id}</p>
      <h3 className="fpc-bar__title">{crop ? crop.name : 'Ô trống'}</h3>
      {close}
    </div>
  );

  if (stage === 'empty') {
    if (p.seeds.length === 0) {
      return (
        <>
          {head}
          <p className="fpc-bar__text fpc-bar__text--locked">
            Khay hạt trống. Mỗi món bạn chốt gửi lại một hạt giống.
          </p>
          {noticeEl}
        </>
      );
    }
    const seed = p.activeSeed;
    return (
      <>
        {head}
        <div className="fpc-chips" role="radiogroup" aria-label="Chọn hạt">
          {p.seeds.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={seed === c}
              className={`fpc-chip ${seed === c ? 'is-on' : ''}`}
              onClick={() => p.onPickSeed(c)}
            >
              <CropIcon crop={c} />
              {CROPS[c].seedName} ×{state.seeds[c]}
            </button>
          ))}
        </div>
        {noticeEl}
        <div className="fpc-bar__actions">
          <button
            type="button"
            className="fpc-btn fpc-btn--primary"
            disabled={disabled || !seed}
            onClick={() => seed && p.run({ kind: 'plant', plotId: plot.id, crop: seed })}
          >
            <Plant size={18} aria-hidden="true" />
            Gieo {seed ? CROPS[seed].seedName.toLowerCase() : ''}
          </button>
        </div>
      </>
    );
  }

  if (stage === 'ready') {
    return (
      <>
        {head}
        <p className="fpc-bar__text">Chín rồi! Thu về kho để nấu hoặc giao đơn.</p>
        {noticeEl}
        <div className="fpc-bar__actions">{harvestBtn}</div>
      </>
    );
  }

  const block = waterBlock(state, plot, now);
  const left = (plot.readyAt ?? now) - now;
  const pct = Math.round(plotGrowth(plot, now) * 100);
  return (
    <>
      {head}
      <p className="fpc-bar__text">
        {STAGE_LABEL[stage]} · còn {formatDuration(left)}
      </p>
      <div
        className="fpc-grow"
        role="progressbar"
        aria-label="Tiến độ lớn"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {block && (
        <p className="fpc-bar__text fpc-bar__text--locked">
          {block === 'wet' ? 'Đất còn ẩm — tưới lại sau 1 giờ.' : 'Hết lượt tưới hôm nay.'}
        </p>
      )}
      {noticeEl}
      <div className="fpc-bar__actions">
        <button
          type="button"
          className="fpc-btn fpc-btn--water"
          disabled={disabled || block !== null}
          onClick={() => p.run({ kind: 'water', plotId: plot.id })}
        >
          <Drop size={18} aria-hidden="true" />
          Tưới (−{Math.round(WATERING.cut * 100)}%) · còn {cans}
        </button>
      </div>
    </>
  );
}
