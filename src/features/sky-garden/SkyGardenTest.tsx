import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { PLACEHOLDERS } from './art';
import type { BugKind } from './demo';
import { MIN_TAP, type FocusShape, type ViewMode } from './layout';
import { SkyScene, type DayPart, type SkyStats } from './SkyScene';
import './sky-garden.css';

/*
 * /sky-garden-test: the Vườn Mây motion demo (G1, plans/vuon-may.md §0.3). Made-up garden, nothing
 * saved. A slim game bar (bugs caught, picked, back to the whole tower) and a demo panel to try
 * the two phone layouts of Q4, the beanstalk intro, bugs, the hours and reduced motion.
 */

const PARTS: DayPart[] = ['dawn', 'day', 'dusk', 'night'];
const BUGS: BugKind[] = ['ladybug', 'bee', 'butterfly', 'firefly'];
type Motion = 'auto' | 'on' | 'off';

export function SkyGardenTest() {
  const d = t.sky.demo;
  const p = d.panel;
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bag = useRef<HTMLSpanElement>(null);
  const [scene, setScene] = useState<SkyScene | null>(null);
  const [stats, setStats] = useState<SkyStats | null>(null);
  const [caught, setCaught] = useState(0);
  const [picked, setPicked] = useState(0);
  const [mode, setMode] = useState<ViewMode>('overview');
  const [floor, setFloor] = useState<number | null>(null);
  const [shape, setShape] = useState<FocusShape>('row');
  const [part, setPart] = useState<DayPart>('day');
  const [motion, setMotion] = useState<Motion>('auto');
  const [drafts, setDrafts] = useState(true);
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('sky-garden/panel') !== '0';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.title = d.title;
  }, [d.title]);

  useEffect(() => {
    try {
      localStorage.setItem('sky-garden/panel', open ? '1' : '0');
    } catch {
      /* private mode: the panel just opens next time */
    }
  }, [open]);

  useEffect(() => {
    if (!canvas.current) return;
    const s = new SkyScene(canvas.current, {
      labels: { draft: d.draft },
      onStats: setStats,
      onCaught: (_kind, total) => setCaught(total),
      onHarvest: setPicked,
      onMode: (m, f) => {
        setMode(m);
        setFloor(f);
      },
      bagAt: () => {
        const b = bag.current?.getBoundingClientRect();
        const h = host.current?.getBoundingClientRect();
        return b && h
          ? { x: b.left - h.left + b.width / 2, y: b.top - h.top + b.height / 2 }
          : { x: 28, y: 28 };
      },
    });
    setScene(s);
    // For scripts/sky-garden/shots.mjs (QA screenshots); this demo page only.
    const w = window as unknown as { __skyGarden?: SkyScene };
    w.__skyGarden = s;
    return () => {
      s.destroy();
      if (w.__skyGarden === s) delete w.__skyGarden;
      setScene(null);
    };
  }, [d.draft]);

  const view = useCallback(
    (next: 'overview' | FocusShape) => {
      if (!scene) return;
      if (next === 'overview') scene.setMode('overview');
      else {
        scene.setShape(next);
        setShape(next);
        if (mode === 'overview') scene.setMode('focus');
      }
    },
    [scene, mode],
  );

  const pickPart = (next: DayPart) => {
    scene?.setDayPart(next);
    setPart(next);
  };
  const pickMotion = (next: Motion) => {
    scene?.setReducedMotion(next === 'auto' ? null : next === 'on');
    setMotion(next);
  };
  const toggleDrafts = () => {
    scene?.setDraftMarks(!drafts);
    setDrafts(!drafts);
  };

  const tapOk = stats ? stats.cell >= MIN_TAP : true;

  return (
    <div className={`sg-root${open ? ' has-panel' : ''}`}>
      <div className="sg-scene" ref={host}>
        <canvas ref={canvas} className="sg-canvas" aria-label={t.sky.name} />
      </div>

      <header className="sg-bar">
        <strong className="sg-bar__title">{t.sky.name}</strong>
        <span className="sg-bar__chip" ref={bag}>
          {d.caught(caught)}
        </span>
        <span className="sg-bar__chip">{d.harvested(picked)}</span>
      </header>

      <p className="sg-hint" aria-live="polite">
        {mode === 'overview' ? d.tapFloor : `${d.floor((floor ?? 0) + 1)} · ${d.tapPot}`}
      </p>

      <nav className="sg-actions">
        {mode === 'focus' && (
          <>
            <button type="button" className="sg-btn" onClick={() => view('overview')}>
              {d.tower}
            </button>
            <button type="button" className="sg-btn" onClick={() => scene?.harvestFloor()}>
              {d.harvestFloor}
            </button>
          </>
        )}
        <a className="sg-btn sg-btn--ghost" href="/farm-animation-test">
          {d.down}
        </a>
      </nav>

      {!open && (
        <button type="button" className="sg-panel-toggle" onClick={() => setOpen(true)}>
          {p.show}
        </button>
      )}

      {open && (
        <aside className="sg-panel" aria-label={p.heading}>
          <header className="sg-panel__head">
            <h1>{p.heading}</h1>
            <button type="button" className="sg-panel__x" onClick={() => setOpen(false)}>
              {p.hide}
            </button>
          </header>
          <p className="sg-panel__note">{d.note}</p>
          {stats && (
            <p className="sg-panel__stats">
              {p.stats(stats.fps, stats.objects)}
              <br />
              {p.viewport(stats.viewW, stats.viewH, stats.cell)}
              <br />
              <span className={tapOk ? 'is-ok' : 'is-small'}>{tapOk ? p.tapOk : p.tapSmall}</span>
            </p>
          )}

          <h2>{p.view}</h2>
          <div className="sg-panel__row">
            <Choice on={mode === 'overview'} onClick={() => view('overview')} label={p.overview} />
            <Choice
              on={mode === 'focus' && shape === 'row'}
              onClick={() => view('row')}
              label={p.focusRow}
            />
            <Choice
              on={mode === 'focus' && shape === 'grid'}
              onClick={() => view('grid')}
              label={p.focusGrid}
            />
          </div>

          <h2>{p.intro}</h2>
          <div className="sg-panel__row">
            <Choice onClick={() => scene?.replayIntro(true)} label={p.introFull} />
            <Choice onClick={() => scene?.replayIntro(false)} label={p.introQuick} />
          </div>

          <h2>{p.bugs}</h2>
          <div className="sg-panel__row">
            {BUGS.map((b) => (
              <Choice key={b} onClick={() => scene?.spawnBug(b)} label={t.sky.bugs[b]} />
            ))}
          </div>
          <div className="sg-panel__row">
            <Choice onClick={() => scene?.ripenAll()} label={p.ripen} />
          </div>

          <h2>{p.day}</h2>
          <div className="sg-panel__row">
            {PARTS.map((x) => (
              <Choice key={x} on={part === x} onClick={() => pickPart(x)} label={p.parts[x]} />
            ))}
          </div>

          <h2>{p.motion}</h2>
          <div className="sg-panel__row">
            <Choice
              on={motion === 'auto'}
              onClick={() => pickMotion('auto')}
              label={p.motionAuto}
            />
            <Choice on={motion === 'on'} onClick={() => pickMotion('on')} label={p.motionOn} />
            <Choice on={motion === 'off'} onClick={() => pickMotion('off')} label={p.motionOff} />
          </div>

          <label className="sg-panel__check">
            <input type="checkbox" checked={drafts} onChange={toggleDrafts} /> {p.drafts}
          </label>

          <h2>{p.placeholders}</h2>
          <ul className="sg-panel__list">
            {PLACEHOLDERS.map((id) => (
              <li key={id}>{p.placeholderNames[id]}</li>
            ))}
          </ul>
          <p className="sg-panel__note">{p.borrowed}</p>
        </aside>
      )}
    </div>
  );
}

function Choice({ label, onClick, on }: { label: string; onClick: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      className={`sg-chip${on ? ' is-on' : ''}`}
      aria-pressed={on === undefined ? undefined : on}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
