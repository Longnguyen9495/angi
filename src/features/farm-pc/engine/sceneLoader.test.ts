import { NullGraphicsDevice, type Asset, type Entity, type StandardMaterial } from 'playcanvas';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startFarmEngine, type FarmEngine } from './FarmEngine';
import { adaptSceneConfig, loadCorner, readSceneConfig } from './sceneLoader';
import { extractBindings } from '../scripts/bindings';
import { Sway, Pop, DoorOnSelect, Lamp, PlayFx } from '../scripts/motion';
import editorScene from '../../../../storage/playcanvas-mcp/corner-v2-export/2608607.json';
import editorConfig from '../../../../storage/playcanvas-mcp/corner-v2-export/config.json';

let engine: FarmEngine | undefined;
afterEach(() => {
  engine?.destroy();
  engine = undefined;
  vi.unstubAllGlobals();
});
const view = (wet = false) => ({
  plots: [
    { id: 1, crop: 'herbs' as const, stage: 'ready' as const, growth: 1, wet, thirsty: false },
  ],
  selected: { kind: 'barn' as const },
});
function fixture() {
  const entities: Record<string, unknown> = {};
  const add = (
    name: string,
    parent: string | null,
    components = {},
    position = [0, 0, 0],
    scale = [1, 1, 1],
  ) => {
    entities[name] = {
      name,
      resource_id: name,
      parent,
      children: [],
      position,
      rotation: [0, 0, 0],
      scale,
      components,
    };
    if (parent) (entities[parent] as { children: string[] }).children.push(name);
  };
  add('corner-root', null);
  add('barn', 'corner-root');
  add('barn-hit', 'barn', {}, [3, 1, 0], [3, 2, 3]);
  add('barn-door', 'barn');
  add('tree', 'corner-root');
  add('sun', 'corner-root', { light: { type: 'directional' } });
  add('bed', 'corner-root');
  add('plot-1', 'bed', {}, [1, 0.3, 2]);
  add('soil', 'plot-1', { render: { type: 'box' } });
  add('crop', 'plot-1');
  return { entities };
}
function start(data = fixture(), configOverrides = {}) {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        engineVersion: '2.22.6',
        scene: 'scene.json',
        plotIds: [1],
        assets: { 123: { name: 'inline', type: 'json', data: {} } },
        ...configOverrides,
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => data });
  vi.stubGlobal('fetch', fetcher);
  const canvas = document.createElement('canvas');
  engine = startFarmEngine(
    new NullGraphicsDevice(canvas),
    {
      canvas,
      env: { quality: 'low', reduced: true, dayPart: 'noon' },
      onIntent: vi.fn(),
      onLost: vi.fn(),
      sceneConfigUrl: '/farm-scenes/v1/config.json',
    },
    { loadAssets: false },
  );
  engine.setView(view());
  return engine;
}
describe('versioned scene with real NullGraphicsDevice parser', () => {
  it('resolves only explicit safe scene versions', () => {
    expect(readSceneConfig('')).toBeUndefined();
    expect(readSceneConfig('?scene=../bad')).toBeUndefined();
    expect(readSceneConfig('?scene=v1')).toContain('farm-scenes/v1/config.json');
  });
  it('registers assets and binds dynamic soil/crop and barn selection', async () => {
    const e = start();
    const old = e.root;
    await e.sceneReady;
    expect(e.sceneError).toBeNull();
    expect(e.root).not.toBe(old);
    expect(old.enabled).toBe(false);
    expect(e.appForDebug.assets.get(123)).toBeTruthy();
    const soil = e.root.findByName('soil') as Entity;
    const dry = soil.render!.meshInstances[0]!.material;
    e.setView(view(true));
    expect(soil.render!.meshInstances[0]!.material).not.toBe(dry);
    expect((soil.render!.meshInstances[0]!.material as StandardMaterial).gloss).toBe(0.55);
    expect(e.root.findByName('crop-model')).toBeTruthy();
    e.appForDebug.update(1 / 30);
    const door = e.root.findByName('barn-door') as Entity;
    expect((door.script!.get('farmDoor') as unknown as { openness: number })?.openness).toBe(1);
    e.setView({ plots: [], selected: null });
    expect(e.root).toBe(old);
    expect(old.enabled).toBe(true);
    expect(e.appForDebug.assets.get(123)).toBeUndefined();
  });
  it('falls back without destroying the active corner on invalid naming', async () => {
    const data = fixture();
    (data.entities['barn-door'] as { name: string }).name = 'wrong';
    const e = start(data);
    const old = e.root;
    await e.sceneReady;
    expect(e.sceneError).toBeTruthy();
    expect(e.root).toBe(old);
    expect(e.appForDebug.assets.get(123)).toBeUndefined();
    expect(e.root.findByName('crop-model')).toBeTruthy();
  });
  it('adapts the downloaded Editor config without rewriting asset dependencies', () => {
    const adapted = adaptSceneConfig(editorConfig);
    expect(adapted.scene).toBe('2608607.json');
    expect(adapted.assets).toBe(editorConfig.assets);
    expect(Object.keys(editorConfig.assets)).toHaveLength(301);
  });
  it('loads Editor format with inferred domain plot IDs', async () => {
    const e = start(fixture(), {
      schemaVersion: undefined,
      application_properties: { externalScripts: [], libraries: [] },
      scenes: [{ name: 'corner', url: '2608607.json' }],
      plotIds: undefined,
    });
    await e.sceneReady;
    expect(e.sceneError).toBeNull();
    expect(e.appForDebug.assets.get(123)).toBeTruthy();
  });
  it('rejects unknown bindings without replacing fallback', async () => {
    const data = fixture();
    (data.entities['tree'] as { components: object }).components = {
      script: { order: ['untrusted'], scripts: { untrusted: { enabled: true } } },
    };
    const e = start(data);
    const old = e.root;
    await e.sceneReady;
    expect(String(e.sceneError)).toContain('Unknown scene script: untrusted');
    expect(e.root).toBe(old);
    expect(e.appForDebug.assets.get(123)).toBeUndefined();
  });
  it('parses the raw exported hierarchy and reports the explicit script asset exemption', async () => {
    const e = start();
    await e.sceneReady;
    const load = vi.spyOn(e.appForDebug.assets, 'load').mockImplementation((asset) => {
      asset.loaded = true;
      asset.fire('load', asset);
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => editorConfig })
        .mockResolvedValueOnce({ ok: true, json: async () => editorScene }),
    );
    const corner = await loadCorner(
      e.appForDebug,
      '/farm-scenes/raw/config.json',
      new AbortController().signal,
    );
    expect(corner.plotIds).toEqual([1, 2, 3, 4, 5, 6]);
    expect(corner.scriptAssetPolicy).toBe('host-imported-farm-scripts-only');
    expect(corner.exemptScriptAssetIds).toEqual([309265356, 309300378]);
    expect(load.mock.calls.every(([asset]) => asset.type !== 'script')).toBe(true);
    expect(
      (corner.hierarchy.findByName('barn-door') as Entity)?.script?.get('farmDoor'),
    ).toBeInstanceOf(DoorOnSelect);
    corner.dispose();
    corner.dispose();
    expect(e.appForDebug.assets.get(309263420)).toBeUndefined();
  });
  it('extracts every raw binding without mutating the downloaded scene', () => {
    const before = JSON.stringify(editorScene);
    const extracted = extractBindings(editorScene);
    expect(extracted.bindings.length).toBeGreaterThan(10);
    expect(JSON.stringify(editorScene)).toBe(before);
    expect(Object.values(extracted.data.entities).every((e) => !e.components.script)).toBe(true);
    expect(
      extracted.bindings
        .flatMap((b) => b.scripts)
        .filter((s) => s.name === 'farmFx')
        .map((s) => s.properties.kind),
    ).toEqual(['water', 'plant', 'harvest']);
  });
  it('attaches all imported classes in authored order with attributes and GUID glow', async () => {
    const data = fixture();
    (data.entities.tree as { components: object }).components = {
      script: {
        enabled: true,
        order: ['farmPop', 'farmSway', 'farmDoor', 'farmLamp', 'farmFx'],
        scripts: {
          farmPop: { enabled: false, attributes: { duration: 0.8, from: 0.4, playOnStart: false } },
          farmSway: { attributes: { amplitude: 1.6, speed: 0.14, phase: 3.9 } },
          farmDoor: { attributes: { openAngle: -75, target: 'barn' } },
          farmLamp: { attributes: { intensity: 3, glow: 'soil' } },
          farmFx: { attributes: { kind: 'sparkle', lift: 0.7 } },
        },
      },
    };
    const e = start(data, {
      assets: Object.fromEntries(
        Object.entries(editorConfig.assets).filter(([, a]) => a.type === 'script'),
      ),
    });
    const register = vi.spyOn(e.appForDebug.scripts, 'add');
    await e.sceneReady;
    expect(e.sceneError).toBeNull();
    const tree = e.root.findByName('tree') as Entity;
    expect(tree.script!.scripts.map((s) => s.constructor)).toEqual([
      Pop,
      Sway,
      DoorOnSelect,
      Lamp,
      PlayFx,
    ]);
    expect(tree.script!.get('farmSway')).toMatchObject({ amplitude: 1.6, speed: 0.14, phase: 3.9 });
    expect(tree.script!.get('farmPop')).toMatchObject({ enabled: false, duration: 0.8 });
    expect((tree.script!.get('farmLamp') as unknown as Lamp).glow).toBe(e.root.findByName('soil'));
    expect(tree.script!.get('farmFx')).toMatchObject({ kind: 'harvest', lift: 0.7 });
    expect(register).not.toHaveBeenCalled();
    expect(e.appForDebug.assets.get(309265356)).toBeUndefined();
    expect(e.appForDebug.assets.get(309300378)).toBeUndefined();
  });
  it.each([
    { file: { url: 'files/safe.json', variants: { small: { url: 'https://evil.invalid/file' } } } },
    { data: { nested: [{ uri: '../escape.json' }] } },
    { file: { url: 'files/%252e%252e/escape.json' } },
  ])('rejects unsafe nested asset URLs before loading', async (extra) => {
    const e = start(fixture(), { assets: { 123: { name: 'unsafe', type: 'json', ...extra } } });
    await e.sceneReady;
    expect(e.sceneError).toBeTruthy();
    expect(e.appForDebug.assets.get(123)).toBeUndefined();
  });
  it.each([true, false])(
    'resolves optional glow by unique name and preserves component enabled=%s',
    async (enabled) => {
      const data = fixture();
      (data.entities.soil as { name: string }).name = 'soil';
      (data.entities.tree as { components: object }).components = {
        script: {
          enabled,
          order: ['farmLamp'],
          scripts: { farmLamp: { attributes: { glow: 'barn-door', intensity: 4 } } },
        },
      };
      const e = start(data);
      await e.sceneReady;
      expect(e.sceneError).toBeNull();
      const tree = e.root.findByName('tree') as Entity;
      expect(tree.script!.enabled).toBe(enabled);
      expect(tree.script!.get('farmLamp')).toMatchObject({
        glow: e.root.findByName('barn-door'),
        intensity: 4,
      });
    },
  );
  it('rejects an unresolved glow reference', async () => {
    const data = fixture();
    (data.entities.tree as { components: object }).components = {
      script: { order: ['farmLamp'], scripts: { farmLamp: { attributes: { glow: 'missing' } } } },
    };
    const e = start(data);
    await e.sceneReady;
    expect(String(e.sceneError)).toContain('Unresolved lamp glow');
    expect(e.appForDebug.assets.get(123)).toBeUndefined();
  });
  it('rejects unknown script asset metadata', async () => {
    const e = start(fixture(), {
      assets: { 123: { name: 'bad', type: 'script', data: { scripts: { arbitrary: {} } } } },
    });
    await e.sceneReady;
    expect(String(e.sceneError)).toContain('Untrusted script asset');
  });
  it('rejects mismatched order and invalid attributes', () => {
    for (const script of [
      { order: [], scripts: { farmSway: {} } },
      { order: ['farmSway', 'farmSway'], scripts: { farmSway: {} } },
      { order: ['farmSway'], scripts: { farmSway: { attributes: { amplitude: 'bad' } } } },
      { order: ['farmPop'], scripts: { farmPop: { attributes: { initialize: 'bad' } } } },
    ]) {
      const data = fixture();
      (data.entities.tree as { components: object }).components = { script };
      expect(() => extractBindings(data as Parameters<typeof extractBindings>[0])).toThrow();
    }
  });
  it('unloads an asset that completes after abort and keeps disposal idempotent', async () => {
    const e = start();
    await e.sceneReady;
    let pending!: Asset;
    vi.spyOn(e.appForDebug.assets, 'load').mockImplementation((asset) => {
      pending = asset;
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            engineVersion: '2.22.6',
            scene: 'scene.json',
            plotIds: [1],
            assets: { 456: { name: 'late', type: 'json', file: { url: 'late.json' } } },
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => fixture() }),
    );
    const controller = new AbortController();
    const promise = loadCorner(e.appForDebug, '/farm-scenes/v1/config.json', controller.signal);
    await vi.waitFor(() => expect(pending).toBeTruthy());
    const unload = vi.spyOn(pending, 'unload');
    controller.abort();
    await expect(promise).rejects.toThrow();
    expect(e.appForDebug.assets.get(456)).toBeUndefined();
    pending.resource = { late: true };
    pending.loaded = true;
    pending.fire('load', pending);
    expect(pending.resource).toBeUndefined();
    expect(unload).toHaveBeenCalledTimes(2);
  });
  it('rejects incompatible versions', async () => {
    const e = start(fixture(), { engineVersion: '2.0.0' });
    await e.sceneReady;
    expect(e.sceneError).toBeTruthy();
  });
  it('does not parse or attach hierarchy after destruction during fetch', async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    );
    const canvas = document.createElement('canvas');
    engine = startFarmEngine(
      new NullGraphicsDevice(canvas),
      {
        canvas,
        env: { quality: 'low', reduced: true, dayPart: 'noon' },
        onIntent: vi.fn(),
        onLost: vi.fn(),
        sceneConfigUrl: '/farm-scenes/v1/config.json',
      },
      { loadAssets: false },
    );
    engine.destroy();
    resolve({ ok: true, json: async () => ({}) });
    await expect(engine.sceneReady).resolves.toBeUndefined();
  });
});
