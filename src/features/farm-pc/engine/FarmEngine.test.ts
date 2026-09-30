import { NullGraphicsDevice, Quat, type Entity, type StandardMaterial } from 'playcanvas';
import { afterEach, describe, expect, it } from 'vitest';
import type { FarmEnv, FarmPlotView, FarmView } from '../contract';
import { CORNER, validateCorner } from '../naming';
import { FARM_EVENTS } from '../scripts/events';
import { DoorOnSelect, Lamp, Pop, Sway } from '../scripts/motion';
import { startFarmEngine, type FarmEngine } from './FarmEngine';

/*
 * The real engine on PlayCanvas's NullGraphicsDevice: scene graph, scripts and
 * events run, nothing is drawn. Catches wiring bugs a mocked engine cannot.
 */

const ENV: FarmEnv = { quality: 'low', reduced: false, dayPart: 'noon' };
const IDS = [1, 2, 3, 4, 5, 6];

function plot(id: number, over: Partial<FarmPlotView> = {}): FarmPlotView {
  return { id, crop: null, stage: 'empty', growth: 1, wet: false, thirsty: false, ...over };
}

function view(over: Partial<FarmPlotView>[] = [], selected: FarmView['selected'] = null): FarmView {
  return { plots: IDS.map((id, i) => plot(id, over[i])), selected };
}

let engine: FarmEngine | null = null;

function start(env: FarmEnv = ENV) {
  const canvas = document.createElement('canvas');
  const device = new NullGraphicsDevice(canvas);
  engine = startFarmEngine(
    device,
    { canvas, env, onIntent: () => {}, onLost: () => {} },
    { loadAssets: false },
  );
  return engine;
}

/** ESM scripts on a ScriptComponent (its typings predate ESM script classes). */
function scriptOf<T>(
  e: Entity,
  type: { scriptName: string } & (abstract new (...a: never[]) => T),
): T {
  return e.script!.get(type.scriptName) as unknown as T;
}

const tick = (e: FarmEngine, seconds: number, step = 1 / 30) => {
  for (let t = 0; t < seconds; t += step) e.appForDebug.update(step);
};
const find = (e: FarmEngine, name: string) => e.root.findByName(name) as Entity;
const soilMaterial = (e: FarmEngine, id: number) =>
  (find(e, CORNER.plot(id)).children.find((c) => c.name === CORNER.soil) as Entity).render!
    .meshInstances[0]!.material as StandardMaterial;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('FarmEngine on a null device', () => {
  it('builds a corner that satisfies the naming convention', () => {
    const e = start();
    e.setView(view());
    const check = validateCorner(e.root, IDS);
    expect(check.missing).toEqual([]);
    expect(check.ok).toBe(true);
    // The procedural corner has no Editor particle templates.
    expect(check.warnings).toEqual([...CORNER.fx]);
  });

  it('reports what an incomplete scene is missing', () => {
    const e = start();
    e.setView(view());
    find(e, CORNER.barnDoor).name = 'door';
    find(e, CORNER.plot(3)).destroy();
    expect(validateCorner(e.root, IDS).missing).toEqual([CORNER.barnDoor, CORNER.plot(3)]);
  });

  it('darkens the soil of a wet plot on the mesh itself (regression)', () => {
    const e = start();
    e.setView(view());
    const dry = soilMaterial(e, 2);
    e.setView(view([{}, { wet: true }]));
    const wet = soilMaterial(e, 2);
    expect(wet).not.toBe(dry);
    expect(soilMaterial(e, 1)).toBe(dry);
    e.setView(view());
    expect(soilMaterial(e, 2)).toBe(dry);
  });

  it('builds crops into the plot anchor; only later changes pop in', () => {
    const e = start();
    e.setView(view([{ crop: 'herbs', stage: 'sprout', growth: 0.1 }]));
    const anchor = find(e, CORNER.plot(1)).children.find((c) => c.name === CORNER.crop)!;
    const first = anchor.findByName('pop') as Entity;
    expect(first).toBeTruthy();
    expect(scriptOf(first, Pop).playing).toBe(false);

    e.setView(view([{ crop: 'herbs', stage: 'young', growth: 0.5 }]));
    const next = anchor.findByName('pop') as Entity;
    expect(next).not.toBe(first);
    expect(scriptOf(next, Pop).playing).toBe(true);
    tick(e, 0.5);
    expect(scriptOf(next, Pop).playing).toBe(false);
    expect(next.getLocalScale().x).toBeCloseTo(1, 5);
  });

  it('opens the barn door while the barn is selected', () => {
    const e = start();
    e.setView(view());
    const door = scriptOf(find(e, CORNER.barnDoor), DoorOnSelect);
    expect(door.openness).toBe(0);
    e.setView(view([], { kind: 'barn' }));
    tick(e, 1.5);
    expect(door.openness).toBe(1);
    e.setView(view([], { kind: 'plot', id: 1 }));
    tick(e, 1.5);
    expect(door.openness).toBe(0);
  });

  it('lights the lamp by day part', () => {
    const e = start();
    const lampEntity = find(e, 'lamp');
    const lamp = scriptOf(lampEntity, Lamp);
    expect(lamp.level).toBe(0);
    e.setEnv({ ...ENV, dayPart: 'night' });
    expect(lamp.level).toBe(1);
    expect(lampEntity.light!.intensity).toBeCloseTo(2.2);
    e.setEnv({ ...ENV, dayPart: 'evening' });
    expect(lamp.level).toBeCloseTo(0.6);
  });

  it('sways plants, and holds them still under reduced motion', () => {
    const e = start();
    e.setView(view([{ crop: 'herbs', stage: 'ready' }]));
    const plant = (find(e, CORNER.plot(1)).findByName('pop') as Entity).children[0] as Entity;
    const rest = new Quat().copy(plant.getLocalRotation());
    tick(e, 0.7);
    expect(plant.getLocalRotation().equals(rest)).toBe(false);
    expect(scriptOf(plant, Sway)).toBeTruthy();

    e.setEnv({ ...ENV, reduced: true });
    expect(plant.getLocalRotation().equals(rest)).toBe(true);
    tick(e, 0.7);
    expect(plant.getLocalRotation().equals(rest)).toBe(true);
  });

  it('broadcasts accepted effects and pauses script time when inactive', () => {
    const e = start();
    e.setView(view([{ crop: 'herbs', stage: 'ready' }]));
    const heard: unknown[] = [];
    e.appForDebug.on(FARM_EVENTS.effect, (fx: unknown) => heard.push(fx));
    e.play({ kind: 'harvest', plotIds: [1] });
    expect(heard).toEqual([{ kind: 'harvest', plotIds: [1] }]);
    e.setActive(false);
    expect(e.appForDebug.timeScale).toBe(0);
    e.setActive(true);
    expect(e.appForDebug.timeScale).toBe(1);
  });

  it('can be destroyed twice', () => {
    const e = start();
    e.setView(view());
    e.destroy();
    expect(() => e.destroy()).not.toThrow();
    engine = null;
  });
});
