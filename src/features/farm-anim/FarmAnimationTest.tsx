import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import {
  type AnimationManager,
  GROUPS,
  type GroupId,
  type SpriteInfo,
  type Stats,
} from './engine/AnimationManager';
import type { ParticleKind } from './engine/ParticleSystem';
import { PARTICLE_KINDS } from './engine/ParticleSystem';
import { DEFAULT_SETTINGS } from './engine/types';
import FarmScene from './FarmScene';
import './showcase.css';

/**
 * /farm-animation-test — the living farm full screen, with an animation showcase panel:
 * seven modes (the whole farm, or one group moving while the rest holds still), each with an
 * on/off switch, a replay and its own speed; global sliders for animation speed, wind, particle
 * density and parallax; and a sprite inspector (click anything in the scene).
 */

type Mode = 'full' | GroupId;
const MODES: Mode[] = ['full', ...GROUPS];
/** How often Particles mode plays every effect again (s). */
const PARTICLE_LOOP = 3;

export function FarmAnimationTest() {
  const s = t.farm.anim.showcase;
  const [m, setM] = useState<AnimationManager | null>(null);
  const [mode, setMode] = useState<Mode>('full');
  const [groups, setGroups] = useState<Record<GroupId, { on: boolean; speed: number }> | null>(
    null,
  );
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [stats, setStats] = useState<Stats | null>(null);
  const [picked, setPicked] = useState<SpriteInfo | null | 'none'>(null);
  const [counts, setCounts] = useState<Partial<Record<ParticleKind, number>>>({});
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('fa-show-open') !== '0';
    } catch {
      return true;
    }
  });
  const press = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    document.title = `${t.farm.anim.title} · ${s.heading}`;
  }, [s.heading]);

  useEffect(() => {
    try {
      localStorage.setItem('fa-show-open', open ? '1' : '0');
    } catch {
      /* private mode: the panel just opens next time */
    }
  }, [open]);

  // Scene ready: the crop cycle starts so Full Farm shows the field living too.
  const onManager = useCallback((next: AnimationManager | null) => {
    setM(next);
    if (!next) return;
    next.startCropDemo();
    setGroups(next.getGroups());
    setSettings({ ...next.settings });
  }, []);

  /** Mode: the chosen group moves, the others hold still (particles always run, they carry
   *  smoke, splashes and soil); Full Farm runs everything. */
  const applyMode = useCallback(
    (next: Mode) => {
      if (!m) return;
      for (const id of GROUPS)
        m.setGroup(id, { on: next === 'full' || id === next || id === 'particles' });
      if (next === 'crops') m.startCropDemo();
      if (next !== 'full' && next !== 'particles') m.replay(next);
      if (next === 'particles') m.replay('particles');
      setMode(next);
      setGroups(m.getGroups());
    },
    [m],
  );

  // Particles mode replays every effect now and then.
  useEffect(() => {
    if (!m || mode !== 'particles') return;
    const id = window.setInterval(() => m.replay('particles'), PARTICLE_LOOP * 1000);
    return () => window.clearInterval(id);
  }, [m, mode]);

  // Live particle counts (Particles mode).
  useEffect(() => {
    if (!m || mode !== 'particles') return;
    const id = window.setInterval(() => setCounts(m.particleCounts()), 400);
    return () => window.clearInterval(id);
  }, [m, mode]);

  const configure = (patch: Partial<typeof settings>) => {
    if (!m) return;
    setSettings(m.configure(patch));
  };

  const modeOn = !groups ? true : mode === 'full' ? settings.animation : groups[mode].on;
  const modeSpeed = !groups ? 1 : mode === 'full' ? groups.environment.speed : groups[mode].speed;

  const toggleMode = () => {
    if (!m || !groups) return;
    if (mode === 'full') configure({ animation: !settings.animation });
    else {
      m.setGroup(mode, { on: !groups[mode].on });
      setGroups(m.getGroups());
    }
  };
  const setModeSpeed = (v: number) => {
    if (!m) return;
    for (const id of mode === 'full' ? GROUPS : [mode]) m.setGroup(id, { speed: v });
    setGroups(m.getGroups());
  };
  const replay = () => {
    if (!m) return;
    if (mode === 'full') for (const id of GROUPS) m.replay(id);
    else m.replay(mode);
  };

  // Inspector: a click (not a drag) on the scene picks what is under it.
  const onPointerDown = (e: React.PointerEvent) => {
    press.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!m || !p || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) return;
    if ((e.target as HTMLElement).closest('.fa-show')) return;
    setPicked(m.inspect(e.clientX, e.clientY) ?? 'none');
  };

  const kinds = s.kinds as Record<string, string[] | string>;
  const pickedList =
    picked && picked !== 'none'
      ? [
          ...((kinds[picked.kind] as string[] | undefined) ?? []),
          ...(picked.fruit ? [kinds.fruit as string] : []),
        ]
      : [];

  return (
    <div
      className={`fa-root fa-root--show${open ? ' has-panel' : ''}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <FarmScene className="fa-scene--full" onManager={onManager} onStats={setStats} />

      {!open && (
        <button type="button" className="fa-show-toggle" onClick={() => setOpen(true)}>
          {s.show}
        </button>
      )}

      {open && (
        <aside className="fa-show" aria-label={s.heading}>
          <header className="fa-show__head">
            <h1>{s.heading}</h1>
            <button type="button" className="fa-show__x" onClick={() => setOpen(false)}>
              {s.hide}
            </button>
          </header>
          {stats && (
            <p className="fa-show__stats" aria-live="off">
              {s.stats(stats.fps, stats.objects, stats.wind, stats.gust)}
            </p>
          )}
          {m?.isReduced && <p className="fa-show__note">{s.reduced}</p>}

          <div className="fa-show__modes" role="group" aria-label={s.heading}>
            {MODES.map((id) => (
              <button
                key={id}
                type="button"
                className={`fa-show__mode${mode === id ? ' is-on' : ''}`}
                aria-pressed={mode === id}
                onClick={() => applyMode(id)}
                disabled={!m}
              >
                {s.modes[id]}
              </button>
            ))}
          </div>
          <p className="fa-show__hint">{s.modeHint[mode]}</p>

          <div className="fa-show__row">
            <button
              type="button"
              className={`fa-show__btn${modeOn ? ' is-on' : ''}`}
              aria-pressed={modeOn}
              onClick={toggleMode}
              disabled={!m}
            >
              {modeOn ? s.on : s.off}
            </button>
            <button type="button" className="fa-show__btn" onClick={replay} disabled={!m}>
              {s.replay}
            </button>
            <button type="button" className="fa-show__btn" onClick={() => m?.gust()} disabled={!m}>
              {s.gust}
            </button>
          </div>
          <Slider
            label={s.speed}
            min={0}
            max={2}
            step={0.05}
            value={modeSpeed}
            onChange={setModeSpeed}
            unit="×"
          />

          <hr className="fa-show__rule" />
          <Slider
            label={s.sliders.animation}
            min={0.25}
            max={2}
            step={0.05}
            value={settings.ambientSpeed}
            onChange={(v) => configure({ ambientSpeed: v })}
            unit="×"
          />
          <Slider
            label={s.sliders.wind}
            min={0}
            max={1}
            step={0.01}
            value={settings.wind}
            onChange={(v) => configure({ wind: v })}
          />
          <Slider
            label={s.sliders.density}
            min={0}
            max={2}
            step={0.05}
            value={settings.particleDensity}
            onChange={(v) => configure({ particleDensity: v })}
            unit="×"
          />
          <Slider
            label={s.sliders.parallax}
            min={0}
            max={2}
            step={0.05}
            value={settings.parallaxStrength}
            onChange={(v) => configure({ parallaxStrength: v })}
            unit="×"
          />

          {mode === 'particles' && (
            <>
              <hr className="fa-show__rule" />
              <h2>{s.particleCounts}</h2>
              <ul className="fa-show__counts">
                {PARTICLE_KINDS.map((k) => (
                  <li key={k}>
                    <code>{k}</code>
                    <b>{counts[k] ?? 0}</b>
                  </li>
                ))}
              </ul>
            </>
          )}

          <hr className="fa-show__rule" />
          <h2>{s.inspector}</h2>
          {!picked && <p className="fa-show__hint">{s.inspectHint}</p>}
          {picked === 'none' && <p className="fa-show__hint">{s.nothing}</p>}
          {picked && picked !== 'none' && (
            <div className="fa-show__sprite">
              <p>
                <span>{s.file}</span> <code>{picked.file}</code>
              </p>
              <p>
                <span>{s.group}</span> {s.modes[picked.group]} · <code>{picked.id}</code>
              </p>
              <p>
                <span>{s.animations}</span>
              </p>
              <ul>
                {pickedList.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit = '',
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <label className="fa-show__slider">
      <span>
        {label}{' '}
        <b>
          {value.toFixed(2).replace(/\.?0+$/, '') || '0'}
          {unit}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
