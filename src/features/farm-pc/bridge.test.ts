import { describe, expect, it } from 'vitest';
import { CROPS, WATERING } from '../../data/game';
import { createInitialProgress, type GuestProgress } from '../../domain/progress';
import { gameReducer } from '../../domain/reducer';
import { HOUR_MS } from '../../domain/time';
import { CommandGate, buildFarmView, planCommand, viewKey } from './bridge';
import { readRenderer, RENDERER_KEY } from './renderer';

const T0 = new Date('2026-09-30T08:00:00').getTime();

/** A fresh guest with empty plots (the starter garden comes half-planted). */
function empty(): GuestProgress {
  const s = createInitialProgress(T0);
  return {
    ...s,
    plots: s.plots.map((p) => ({ ...p, crop: null, plantedAt: null, readyAt: null })),
  };
}

function withSeeds(n = 2): GuestProgress {
  const s = empty();
  return { ...s, seeds: { ...s.seeds, herbs: n } };
}

/** Plans the command and, if accepted, applies it through the real reducer. */
function apply(state: GuestProgress, now: number, cmd: Parameters<typeof planCommand>[2]) {
  const plan = planCommand(state, now, cmd);
  return { plan, next: plan.ok ? gameReducer(state, plan.action) : state };
}

describe('farm view (domain → engine)', () => {
  it('describes every plot from real progress, nothing else', () => {
    const s = withSeeds();
    const { next } = apply(s, T0, { kind: 'plant', plotId: 2, crop: 'herbs' });
    // One minute in: herbs germinate in a few minutes, so still a sprout.
    const view = buildFarmView(next, T0 + 60_000, { kind: 'plot', id: 2 }, false);
    expect(view.plots).toHaveLength(next.plots.length);
    expect(view.plots[1]).toMatchObject({ id: 2, crop: 'herbs', stage: 'sprout', thirsty: false });
    expect(view.plots[0]).toMatchObject({ id: 1, crop: null, stage: 'empty' });
    expect(view.selected).toEqual({ kind: 'plot', id: 2 });
    // Only presentation data crosses the bridge: no ledger, coins, seeds or ids of dishes.
    expect(Object.keys(view).sort()).toEqual(['plots', 'selected']);
  });

  it('marks thirsty plots only in watering mode and only when watering is allowed', () => {
    const { next } = apply(withSeeds(), T0, { kind: 'plant', plotId: 1, crop: 'herbs' });
    const at = T0 + 10 * 60_000;
    expect(buildFarmView(next, at, null, true).plots[0]!.thirsty).toBe(true);
    expect(buildFarmView(next, at, null, false).plots[0]!.thirsty).toBe(false);
    const watered = apply(next, at, { kind: 'water', plotId: 1 }).next;
    const v = buildFarmView(watered, at + 1000, null, true).plots[0]!;
    expect(v.thirsty).toBe(false);
    expect(v.wet).toBe(true);
  });

  it('keeps the same key while nothing visible changes (no per-tick pushes)', () => {
    const { next } = apply(withSeeds(), T0, { kind: 'plant', plotId: 1, crop: 'herbs' });
    const a = viewKey(buildFarmView(next, T0 + 1000, null, false));
    const b = viewKey(buildFarmView(next, T0 + 2000, null, false));
    expect(a).toBe(b);
  });
});

describe('commands (engine intent → domain)', () => {
  it('plants through PLANT_FROM_TRAY and spends exactly one seed', () => {
    const s = withSeeds(2);
    const { plan, next } = apply(s, T0, { kind: 'plant', plotId: 1, crop: 'herbs' });
    expect(plan).toMatchObject({ ok: true, action: { type: 'PLANT_FROM_TRAY', plotId: 1 } });
    expect(plan.ok && plan.effect).toEqual({ kind: 'plant', plotIds: [1] });
    expect(next.seeds.herbs).toBe(1);
    expect(next.plots[0]!.crop).toBe('herbs');
  });

  it('refuses a repeated plant on the same plot, and without seeds', () => {
    const { next } = apply(withSeeds(2), T0, { kind: 'plant', plotId: 1, crop: 'herbs' });
    expect(planCommand(next, T0 + 5, { kind: 'plant', plotId: 1, crop: 'herbs' })).toEqual({
      ok: false,
      reason: 'occupied',
    });
    expect(planCommand(empty(), T0, { kind: 'plant', plotId: 1, crop: 'herbs' })).toEqual({
      ok: false,
      reason: 'no-seed',
    });
    expect(planCommand(next, T0, { kind: 'plant', plotId: 99, crop: 'herbs' })).toEqual({
      ok: false,
      reason: 'no-plot',
    });
  });

  it('waters once, then blocks while the soil is wet, and respects the daily cans', () => {
    let s = withSeeds(4);
    for (const id of [1, 2, 3, 4])
      s = apply(s, T0, { kind: 'plant', plotId: id, crop: 'herbs' }).next;
    const at = T0 + 60_000;
    const first = apply(s, at, { kind: 'water', plotId: 1 });
    expect(first.plan.ok).toBe(true);
    expect(first.next.water.used).toBe(1);
    expect(planCommand(first.next, at + 1, { kind: 'water', plotId: 1 })).toEqual({
      ok: false,
      reason: 'wet',
    });
    let t = first.next;
    for (const id of [2, 3]) t = apply(t, at, { kind: 'water', plotId: id }).next;
    expect(t.water.used).toBe(WATERING.perDay);
    expect(planCommand(t, at, { kind: 'water', plotId: 4 })).toEqual({
      ok: false,
      reason: 'empty-can',
    });
  });

  it('cannot water an empty or ripe plot', () => {
    const s = withSeeds();
    expect(planCommand(s, T0, { kind: 'water', plotId: 1 })).toEqual({
      ok: false,
      reason: 'not-growing',
    });
  });

  it('harvests every ripe plot once; a second harvest pays nothing', () => {
    let s = withSeeds(2);
    s = apply(s, T0, { kind: 'plant', plotId: 1, crop: 'herbs' }).next;
    s = apply(s, T0, { kind: 'plant', plotId: 3, crop: 'herbs' }).next;
    const ripe = T0 + CROPS.herbs.growHours * HOUR_MS + 1;
    const { plan, next } = apply(s, ripe, { kind: 'harvest' });
    expect(plan.ok && plan.effect).toEqual({ kind: 'harvest', plotIds: [1, 3] });
    expect(next.ingredients.herbs).toBe(2 * CROPS.herbs.yield);
    const xp = next.xp;
    expect(planCommand(next, ripe + 1, { kind: 'harvest' })).toEqual({
      ok: false,
      reason: 'nothing-ready',
    });
    // Even replaying the old action against the new state changes nothing.
    const replay = plan.ok ? gameReducer(next, plan.action) : next;
    expect(replay.ingredients.herbs).toBe(2 * CROPS.herbs.yield);
    expect(replay.xp).toBe(xp);
  });
});

describe('command gate (double tap before React re-renders)', () => {
  it('lets one command through per progress version', () => {
    const gate = new CommandGate();
    const v1 = withSeeds();
    expect(gate.enter(v1)).toBe(true);
    expect(gate.enter(v1)).toBe(false);
    const v2 = { ...v1 };
    expect(gate.enter(v2)).toBe(true);
    gate.release();
    expect(gate.enter(v2)).toBe(true);
  });
});

describe('renderer flag', () => {
  it('defaults to the classic renderer and remembers an explicit query choice', () => {
    expect(readRenderer('')).toBe('three');
    expect(readRenderer('?renderer=playcanvas')).toBe('playcanvas');
    expect(localStorage.getItem(RENDERER_KEY)).toBe('playcanvas');
    expect(readRenderer('')).toBe('playcanvas');
    expect(readRenderer('?renderer=three')).toBe('three');
    expect(readRenderer('?renderer=bogus')).toBe('three');
  });
});
