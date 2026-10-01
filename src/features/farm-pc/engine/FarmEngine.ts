import {
  ADDRESS_CLAMP_TO_EDGE,
  AppBase,
  AppOptions,
  Asset,
  BLEND_NORMAL,
  BoundingBox,
  BoxGeometry,
  CameraFrame,
  CameraComponentSystem,
  CULLFACE_NONE,
  Color,
  ConeGeometry,
  ContainerHandler,
  MaterialHandler,
  RenderHandler,
  ModelHandler,
  JsonHandler,
  BinaryHandler,
  CylinderGeometry,
  DEVICETYPE_WEBGL2,
  Entity,
  EnvLighting,
  FILLMODE_NONE,
  FOG_LINEAR,
  GAMMA_SRGB,
  LightComponentSystem,
  Mesh,
  MeshInstance,
  PIXELFORMAT_RGBA8,
  PlaneGeometry,
  RESOLUTION_AUTO,
  Ray,
  RenderComponentSystem,
  ScriptComponentSystem,
  SHADOW_PCF3_32F,
  SHADOW_PCF5_32F,
  SSAOTYPE_LIGHTING,
  SphereGeometry,
  StandardMaterial,
  TONEMAP_NEUTRAL,
  Texture,
  TextureHandler,
  TorusGeometry,
  Vec2,
  Vec3 as V3,
  createGraphicsDevice,
  type ContainerResource,
  type GraphicsDevice,
  type Geometry,
  type CameraComponent,
  type Material,
} from 'playcanvas';
import { CROPS } from '../../../data/game';
import type { CropId } from '../../../data/types';
import type { PlotStage } from '../../../domain/selectors';
import { QUALITY } from '../../garden3d/quality';
import type {
  CreateFarmEngine,
  FarmEffect,
  FarmEngineHandle,
  FarmEngineOptions,
  FarmEnv,
  FarmPlotView,
  FarmSelection,
  FarmView,
} from '../contract';
import {
  BARN,
  BED,
  CAMERA,
  LIGHTING,
  PALETTE,
  PATH_STONES,
  PROPS,
  TREE,
  TUFTS,
  bedCell,
  bedSize,
  type CameraConfig,
  type Vec3,
} from '../sceneLayout';
import { cliffGeometry, groundGeometry, groundHeight, prismGeometry } from './geometry';
import { CORNER } from '../naming';
import { loadCorner, type LoadedCorner } from './sceneLoader';
import { emitEffect, emitEnv, emitView } from '../scripts/events';
import { DoorOnSelect, Lamp, Pop, Sway } from '../scripts/motion';
import { ENV_BACKDROP, ENV_HDR, TEX_SETS, texUrl, type TexMap, type TexSetId } from './textures';

/*
 * PlayCanvas adapter for the farm corner. It owns only presentation state
 * (camera, selection ring, particles, GPU resources). It never reads or writes
 * progress: React hands it a FarmView and it reports taps as FarmIntents.
 */

type Prim = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane';

/** A photo texture on a material: which set, how often it repeats, the colour it should read as. */
interface TexUse {
  set: TexSetId;
  tiling: readonly [number, number];
  /** Keep the constant gloss (wet soil) instead of the map's roughness. */
  keepGloss?: boolean;
}

interface TexMat {
  m: StandardMaterial;
  use: TexUse;
  /** Diffuse multiplier once the map is on (target ÷ texture mean). */
  mapped: Color;
}

/** Grass is recoloured through vertex colours: palette ÷ (texture mean × this boost). */
const GRASS_BOOST = 1.4;
export const GRASS_BASE: Vec3 = [
  TEX_SETS.leafy_grass.avg[0] * GRASS_BOOST,
  TEX_SETS.leafy_grass.avg[1] * GRASS_BOOST,
  TEX_SETS.leafy_grass.avg[2] * GRASS_BOOST,
];
const CLIFF_BASE: Vec3 = TEX_SETS.rock_boulder_dry.avg;
/** Backdrop plane distance in front of the camera (inside farClip, beyond the fog-free island). */
const BACKDROP_DIST = 70;
const PATH_TEX: TexUse = { set: 'rock_boulder_dry', tiling: [0.5, 0.5] };
const LEAF_TEX: TexUse = { set: 'leafy_grass', tiling: [2, 2] };

/** Gameplay framing from an authored camera: orbit the point it looks at on the ground (y = 0). */
function framingFrom(cam: CameraComponent): CameraConfig | null {
  const p = cam.entity.getPosition();
  const f = cam.entity.forward;
  if (f.y > -0.05) return null;
  const t = -p.y / f.y;
  const target = new V3(p.x + f.x * t, 0, p.z + f.z * t);
  const d = p.distance(target);
  const k = d / CAMERA.distance;
  return {
    ...CAMERA,
    target: [target.x, target.y, target.z],
    distance: d,
    pitch: Math.asin(p.y / d),
    yaw: Math.atan2(p.x - target.x, p.z - target.z),
    fov: cam.fov,
    zoom: { min: CAMERA.zoom.min * k, max: CAMERA.zoom.max * k },
  };
}

/** Garden crop models carry their stage size; this only adds the garden's gentle per-stage scale. */
const MODEL_STAGE_SCALE: Record<PlotStage, number> = {
  empty: 0,
  sprout: 0.9,
  young: 0.8,
  flowering: 0.95,
  ready: 1,
};
/** Three plants along the bed's ridges, as in src/features/garden3d/scene/Plots.tsx. */
const MODEL_SPOTS: readonly (readonly [number, number])[] = [
  [-0.38, -0.47],
  [0.36, 0],
  [-0.08, 0.47],
];

interface PlotNode {
  root: Entity;
  soil: Entity;
  /** Empty attach point named `crop` (convention); the crop model goes inside. */
  anchor: Entity;
  crop: Entity | null;
  cropKey: string;
  /** The crop is an exported garden model (not the primitive placeholder). */
  model?: boolean;
  /** Authored soil keeps its own (vertex-painted) look; watering darkens a copy. */
  soilMats?: { dry: Material[]; wet: Material[] };
  thirsty: Entity;
  ripe: Entity;
}

interface Particle {
  e: Entity;
  vel: V3;
  life: number;
}

interface Burst {
  t: number;
  dur: number;
  parts: Particle[];
  gravity: number;
}

const STAGE_SCALE: Record<PlotStage, number> = {
  empty: 0,
  sprout: 0.42,
  young: 0.72,
  flowering: 0.9,
  ready: 1,
};

const BLADE_CROPS = new Set<CropId>(['rice', 'scallion', 'lemongrass', 'garlic']);
const BUSH_CROPS = new Set<CropId>(['herbs']);

function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Entities built from meshInstances carry their material on the instance;
 * RenderComponent.material is a different (unused) object for them.
 */
function matOf(e: Entity): StandardMaterial {
  return e.render!.meshInstances[0]!.material as StandardMaterial;
}

function setMat(e: Entity, m: StandardMaterial) {
  for (const mi of e.render!.meshInstances) mi.material = m;
}

function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class FarmEngine implements FarmEngineHandle {
  private readonly app: AppBase;
  private readonly device: GraphicsDevice;
  private readonly canvas: HTMLCanvasElement;
  private readonly opts: FarmEngineOptions;
  private env: FarmEnv;
  private destroyed = false;
  private readonly sceneAbort = new AbortController();
  private loadedCorner: LoadedCorner | null = null;
  /** Every authored plot of the loaded scene by plot ID; locked ones stay hidden. */
  private readonly scenePlots = new Map<number, PlotNode>();
  private proceduralWorld: Entity | null = null;
  /** Settles even on export errors: the procedural presentation remains available. */
  sceneReady: Promise<void> = Promise.resolve();
  sceneError: unknown = null;
  private active = true;

  private readonly mats = new Map<string, StandardMaterial>();
  private readonly meshes: Mesh[] = [];
  private readonly textures: Texture[] = [];
  private readonly texMats: TexMat[] = [];
  private readonly texCache = new Map<string, Texture>();
  private readonly assets: Asset[] = [];
  private readonly shapes = new Map<Prim, Mesh>();
  private frame: CameraFrame | null = null;
  /** Every first-load file (settled either way), for the loading veil. */
  private readonly loading: Promise<unknown>[] = [];
  private backdrop!: Entity;

  private camera!: Entity;
  private sun!: Entity;
  /** `corner-root`: everything the naming convention covers lives under it. */
  private world!: Entity;
  private readonly placeholders = new Map<string, Entity[]>();
  /** Views received; crops built after the first one pop in. */
  private views = 0;
  private bed: Entity | null = null;
  private bedCount = 0;
  private readonly plots = new Map<number, PlotNode>();
  private ring!: Entity;
  private ringScale = 1;
  /** Pull the camera back on tall/narrow canvases so the whole corner stays in view. */
  private fit = 1;
  private blobMat!: StandardMaterial;
  private readonly bursts: Burst[] = [];
  private view: FarmView | null = null;
  private time = 0;

  /** Framing in use: the code corner's CAMERA, or one derived from a loaded scene's camera. */
  private camCfg: CameraConfig = CAMERA;
  /** Exported garden crop models by `crop-stage`; null while loading or after a failed load. */
  private readonly cropModels = new Map<string, ContainerResource | null>();
  private filesEnabled = false;
  private readonly cam = {
    yaw: CAMERA.yaw,
    dist: CAMERA.distance,
    target: new V3(...CAMERA.target),
    goalYaw: CAMERA.yaw,
    goalDist: CAMERA.distance,
    goalTarget: new V3(...CAMERA.target),
  };
  private drag: { x: number; y: number; yaw: number; moved: boolean; id: number } | null = null;
  private readonly picks: { sel: Exclude<FarmSelection, null>; box: BoundingBox }[] = [];

  /** For ?g3d-debug and tests only. */
  get appForDebug(): AppBase {
    return this.app;
  }

  /** corner-root, for naming checks in tests. */
  get root(): Entity {
    return this.world;
  }

  constructor(app: AppBase, device: GraphicsDevice, opts: FarmEngineOptions) {
    this.app = app;
    this.device = device;
    this.canvas = opts.canvas;
    this.opts = opts;
    this.env = opts.env;
  }

  /* ------------------------------------------------------------ setup */

  build() {
    const scene = this.app.scene;
    scene.fog.type = FOG_LINEAR;
    scene.fog.start = 24;
    scene.fog.end = 60;

    this.camera = new Entity('camera');
    this.camera.addComponent('camera', {
      fov: CAMERA.fov,
      nearClip: 0.5,
      farClip: 80,
      toneMapping: TONEMAP_NEUTRAL,
      gammaCorrection: GAMMA_SRGB,
    });
    this.app.root.addChild(this.camera);
    this.world = new Entity(CORNER.root);
    this.app.root.addChild(this.world);

    // Cloud backdrop: an unlit plane that travels with the camera (sky only, never the farm).
    const bg = new StandardMaterial();
    bg.diffuse = new Color(0, 0, 0);
    bg.emissive = new Color(0.82, 0.9, 0.93);
    bg.useLighting = false;
    bg.useFog = false;
    bg.useSkybox = false;
    bg.cull = CULLFACE_NONE;
    bg.update();
    this.mats.set('backdrop', bg);
    this.backdrop = this.prim(
      'plane',
      bg,
      [0, 0, -BACKDROP_DIST],
      [1, 1, 1],
      [90, 0, 0],
      this.camera,
      false,
    );

    this.sun = new Entity(CORNER.sun);
    this.sun.addComponent('light', {
      type: 'directional',
      shadowDistance: 24,
      normalOffsetBias: 0.06,
      shadowBias: 0.2,
    });
    this.world.addChild(this.sun);

    this.blobMat = this.makeBlobMaterial();
    this.buildIsland();
    this.buildPath();
    this.buildBarn();
    this.buildTree();
    this.buildTufts();

    // Thin outline ring (the stock torus is too fat and reads as a disc).
    this.ring = this.meshEntity(
      new TorusGeometry({ tubeRadius: 0.045, ringRadius: 0.5, segments: 48, sides: 8 }),
      this.mat('select', PALETTE.select, { glow: 0.55 }),
      this.world,
      false,
    );
    this.ring.enabled = false;

    this.applyEnv(this.env, true);
    this.updateCamera(1, true);
    this.app.on('update', this.onUpdate);
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onCancel);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
  }

  loadVersionedScene(url: string) {
    const timer = window.setTimeout(() => this.sceneAbort.abort(), 10_000);
    this.sceneReady = loadCorner(this.app, url, this.sceneAbort.signal)
      .then((loaded) => {
        if (this.destroyed) {
          loaded.dispose();
          return;
        }
        try {
          // The scene authors every plot up to the maximum; the domain may own fewer.
          if (this.view && this.view.plots.some((p) => !loaded.plotIds.includes(p.id))) {
            throw new Error('Domain plot missing from scene');
          }
          const corner = (
            loaded.hierarchy.name === CORNER.root
              ? loaded.hierarchy
              : loaded.hierarchy.findByName(CORNER.root)
          ) as Entity;
          const nodes = new Map<number, PlotNode>();
          loaded.plotIds.forEach((id) => {
            const root = corner.findByName(CORNER.plot(id)) as Entity;
            const soil = root.children.find((c) => c.name === CORNER.soil) as Entity;
            const anchor = root.children.find((c) => c.name === CORNER.crop) as Entity;
            if (!soil.render?.meshInstances.length || anchor.children.length)
              throw new Error('Soil render / empty crop anchor required');
            const dryMats = soil.render.meshInstances.map((mi) => mi.material);
            const soilMats = {
              dry: dryMats,
              wet: dryMats.map((m) => {
                const wet = (m as StandardMaterial).clone();
                // Same darkening as the garden's wet tint (#8a8078), a little sheen.
                wet.diffuse = new Color(
                  wet.diffuse.r * 0.54,
                  wet.diffuse.g * 0.5,
                  wet.diffuse.b * 0.47,
                );
                wet.gloss = 0.55;
                wet.update();
                return wet;
              }),
            };
            const thirsty = new Entity('thirsty');
            const ripe = new Entity('ripe');
            root.addChild(thirsty);
            root.addChild(ripe);
            this.prim(
              'sphere',
              this.mat('thirsty', PALETTE.thirsty, { glow: 0.5 }),
              [0, 1, 0],
              [0.16, 0.16, 0.16],
              [0, 0, 0],
              thirsty,
              false,
            );
            this.prim(
              'sphere',
              this.mat('ripe', PALETTE.select, { glow: 0.6 }),
              [0.35, 1, 0],
              [0.16, 0.16, 0.16],
              [0, 0, 0],
              ripe,
              false,
            );
            thirsty.enabled = ripe.enabled = false;
            nodes.set(id, { root, soil, anchor, crop: null, cropKey: '', thirsty, ripe, soilMats });
          });
          const sun = corner.findByName(CORNER.sun) as Entity;
          if (!sun.light) throw new Error('Scene sun requires light component');
          const door = corner.findByName(CORNER.barnDoor) as Entity;
          // The export may already bind farmDoor (attached from its script data).
          if (!door.script) door.addComponent('script');
          if (!door.script!.has('farmDoor'))
            door.script!.create(DoorOnSelect, { properties: { openAngle: -105 } });
          const sceneCam = loaded.hierarchy.findComponent('camera') as CameraComponent | null;
          const framing = sceneCam ? framingFrom(sceneCam) : null;
          // Authored cameras (and helpers parented to them, like a cloud backdrop) stay off:
          // the engine's own camera and backdrop render the scene.
          for (const camera of loaded.hierarchy.findComponents('camera'))
            (camera as CameraComponent).entity.enabled = false;
          this.proceduralWorld = this.world;
          this.proceduralWorld.enabled = false;
          this.app.root.addChild(loaded.hierarchy);
          this.app.systems.fire('initialize', loaded.hierarchy);
          this.app.systems.fire('postInitialize', loaded.hierarchy);
          this.app.systems.fire('postPostInitialize', loaded.hierarchy);
          this.loadedCorner = loaded;
          this.world = corner;
          this.sun = sun;
          this.world.addChild(this.ring);
          this.picks.length = 0;
          const hit = corner.findByName(CORNER.barnHit) as Entity;
          const box = new BoundingBox();
          box.setFromTransformedAabb(
            new BoundingBox(new V3(), new V3(0.5, 0.5, 0.5)),
            hit.getWorldTransform(),
          );
          this.picks.push({ sel: { kind: 'barn' }, box });
          this.scenePlots.clear();
          nodes.forEach((node, id) => this.scenePlots.set(id, node));
          this.bindScenePlots(this.view ? this.view.plots.map((p) => p.id) : loaded.plotIds);
          if (framing) this.useFraming(framing);
          this.applyEnv(this.env, false);
          if (this.view) this.setView(this.view);
        } catch (error) {
          loaded.dispose();
          this.sceneError = error;
        }
      })
      .catch((error: unknown) => {
        if (!this.destroyed) this.sceneError = error;
      })
      .finally(() => window.clearTimeout(timer));
  }

  /** Shows the scene plots the domain owns (in view order) and hides the locked rest. */
  private bindScenePlots(ids: readonly number[]) {
    this.plots.clear();
    this.picks.splice(0, this.picks.length, ...this.picks.filter((p) => p.sel.kind !== 'plot'));
    for (const [id, node] of this.scenePlots) node.root.enabled = ids.includes(id);
    ids.forEach((id, i) => {
      const node = this.scenePlots.get(id)!;
      this.plots.set(i, node);
      // Tap area: the authored soil's footprint (scene beds differ in size from the code bed).
      const soil = this.worldBox(node.soil);
      const half = soil
        ? new V3(soil.halfExtents.x, 0.45, soil.halfExtents.z)
        : new V3(BED.cell / 2, 0.45, BED.cell / 2);
      const at = (soil?.center ?? node.root.getPosition()).clone();
      this.picks.push({
        sel: { kind: 'plot', id },
        box: new BoundingBox(new V3(at.x, node.root.getPosition().y + 0.3, at.z), half),
      });
    });
    this.bedCount = ids.length;
  }

  /** Switches camera framing (and fog/far clip, which scale with it) and snaps to it. */
  private useFraming(cfg: CameraConfig) {
    this.camCfg = cfg;
    const k = cfg.distance / CAMERA.distance;
    this.camera.camera!.fov = cfg.fov;
    this.camera.camera!.farClip = 80 * Math.max(1, k);
    this.app.scene.fog.start = 24 * k;
    this.app.scene.fog.end = 60 * k;
    this.cam.yaw = this.cam.goalYaw = cfg.yaw;
    this.cam.dist = this.cam.goalDist = cfg.distance;
    this.cam.target.set(...cfg.target);
    this.cam.goalTarget.set(...cfg.target);
    this.resize();
  }

  private fallbackScene() {
    if (!this.loadedCorner || !this.proceduralWorld) return;
    this.proceduralWorld.addChild(this.ring);
    this.loadedCorner.dispose();
    this.loadedCorner = null;
    this.world = this.proceduralWorld;
    this.world.enabled = true;
    this.proceduralWorld = null;
    this.sun = this.world.findByName(CORNER.sun) as Entity;
    this.bed = this.world.findByName(CORNER.bed) as Entity | null;
    this.bedCount = -1;
    this.plots.clear();
    this.scenePlots.clear();
    this.useFraming(CAMERA);
    this.picks.length = 0;
    this.picks.push({
      sel: { kind: 'barn' },
      box: new BoundingBox(new V3(BARN.x, 1.2, BARN.z), new V3(1.7, 1.4, 1.6)),
    });
    this.applyEnv(this.env, false);
  }

  private mat(
    key: string,
    c: Vec3,
    o: { gloss?: number; vertex?: boolean; glow?: number; tex?: TexUse } = {},
  ): StandardMaterial {
    const t = o.tex ? `${o.tex.set}@${o.tex.tiling.join('x')}${o.tex.keepGloss ? 'g' : ''}` : '';
    const k = `${key}:${c.join(',')}:${o.gloss ?? ''}:${o.vertex ? 1 : 0}:${o.glow ?? 0}:${t}`;
    const cached = this.mats.get(k);
    if (cached) return cached;
    const m = new StandardMaterial();
    m.useMetalness = true;
    m.metalness = 0;
    m.gloss = o.gloss ?? 0.22;
    // Until (or unless) its photo loads, a textured material shows the flat palette colour `c`.
    m.diffuse = new Color(c[0], c[1], c[2]);
    if (o.vertex) m.diffuseVertexColor = true;
    if (o.glow) {
      m.emissive = new Color(c[0], c[1], c[2]);
      m.emissiveIntensity = o.glow;
    }
    m.update();
    this.mats.set(k, m);
    if (o.tex) {
      const a = TEX_SETS[o.tex.set].avg;
      this.texMats.push({
        m,
        use: o.tex,
        mapped: new Color(c[0] / a[0], c[1] / a[1], c[2] / a[2]),
      });
    }
    return m;
  }

  /** Puts loaded photo maps on every material that asked for them (normal/ARM skipped on Nhẹ). */
  private applyMaps() {
    const full = this.env.quality !== 'low';
    for (const { m, use, mapped } of this.texMats) {
      const diff = this.texCache.get(`${use.set}_diff`);
      if (!diff) continue;
      const tiling = new Vec2(use.tiling[0], use.tiling[1]);
      m.diffuseMap = diff;
      m.diffuseMapTiling = tiling;
      m.diffuse = mapped;
      const nor = full ? this.texCache.get(`${use.set}_nor`) : undefined;
      const arm = full ? this.texCache.get(`${use.set}_arm`) : undefined;
      m.normalMap = nor ?? null;
      m.normalMapTiling = tiling;
      m.bumpiness = 0.9;
      // ARM: R = ambient occlusion, G = roughness (inverted into gloss).
      m.aoMap = arm ?? null;
      m.aoMapChannel = 'r';
      m.aoMapTiling = tiling;
      const rough = use.keepGloss ? undefined : arm;
      m.glossMap = rough ?? null;
      m.glossMapChannel = 'g';
      m.glossMapTiling = tiling;
      m.glossInvert = !!rough;
      if (rough) m.gloss = 1;
      m.update();
    }
    this.requestFrame();
  }

  private loadTexture(url: string, srgb: boolean, mipmaps = true): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const a = new Asset(url, 'texture', { url }, { srgb, mipmaps });
      this.assets.push(a);
      a.once('load', (loaded: Asset) => resolve(loaded.resource as Texture));
      a.once('error', (err: unknown) => reject(err));
      this.app.assets.add(a);
      this.app.assets.load(a);
    });
  }

  /**
   * Photo textures and image-based light arrive after first paint. A failed
   * file only costs that detail: the flat palette stays, gameplay is untouched.
   */
  loadAssets() {
    this.filesEnabled = true;
    this.loadProps();
    const sets = [...new Set(this.texMats.map((t) => t.use.set))];
    const maps: [TexMap, boolean][] = [
      ['diff', true],
      ['nor', false],
      ['arm', false],
    ];
    const jobs = sets.flatMap((id) =>
      maps.map(([map, srgb]) =>
        this.loadTexture(texUrl(id, map), srgb).then((tex) => {
          if (this.destroyed) return;
          tex.anisotropy = this.env.quality === 'high' ? 8 : 4;
          this.texCache.set(`${id}_${map}`, tex);
        }),
      ),
    );
    this.track(
      Promise.allSettled(jobs).then(() => {
        if (!this.destroyed) this.applyMaps();
      }),
    );

    const hdr = this.loadTexture(ENV_HDR(), false, false)
      .then((hdr) => {
        if (this.destroyed) return;
        const source = EnvLighting.generateLightingSource(hdr);
        const atlas = EnvLighting.generateAtlas(source);
        source.destroy();
        this.textures.push(atlas);
        this.app.scene.envAtlas = atlas;
        this.applyEnv(this.env, false);
      })
      .catch(() => {
        /* no IBL: the constant ambient light stays */
      });
    this.track(hdr);

    const backdrop = this.loadTexture(ENV_BACKDROP(), true)
      .then((tex) => {
        if (this.destroyed) return;
        const m = matOf(this.backdrop);
        // The file is already the cropped cloud band, so it maps 0–1 across the plane.
        m.emissiveMap = tex;
        m.emissiveIntensity = 1.15;
        m.update();
        this.applyEnv(this.env, false);
      })
      .catch(() => {
        /* the plain sky colour stays */
      });
    this.track(backdrop);
  }

  private track(job: Promise<unknown>) {
    this.loading.push(job.catch(() => undefined));
  }

  /**
   * Resolves once first-load files (textures, IBL, props, scene export) have
   * settled and a couple of frames have drawn, so shaders are compiled before
   * the veil lifts. Never rejects: a missing file only costs that detail.
   */
  async whenLoaded(onProgress?: (done: number, total: number) => void): Promise<void> {
    const jobs = [...this.loading, this.sceneReady.catch(() => undefined)];
    let done = 0;
    onProgress?.(0, jobs.length);
    await Promise.all(jobs.map((j) => j.then(() => onProgress?.(++done, jobs.length))));
    for (let i = 0; i < 2 && !this.destroyed; i++) {
      await new Promise<void>((resolve) => {
        this.app.once('frameend', () => resolve());
        this.requestFrame();
        // A paused app (scrolled away, reduced motion) still settles.
        window.setTimeout(resolve, 250);
      });
    }
  }

  /**
   * CC0 GLB props replace the placeholder shapes once loaded; a failed file
   * keeps the placeholder. Each model is scaled to its spot's size and stood
   * on the ground.
   */
  private loadProps() {
    const barn = this.world.findByName(CORNER.barn) as Entity | null;
    for (const spot of PROPS) {
      const url = `${import.meta.env.BASE_URL}models/farm/props/${spot.id}.glb`;
      const a = new Asset(spot.id, 'container', { url });
      this.assets.push(a);
      a.once('load', (loaded: Asset) => {
        if (this.destroyed) return;
        const res = loaded.resource as ContainerResource;
        const model = res.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
        const holder = new Entity(`prop-${spot.id}`);
        const parent = spot.at === 'barn' && barn ? barn : this.world;
        parent.addChild(holder);
        holder.setLocalEulerAngles(spot.tilt ?? 0, spot.rot, 0);
        holder.addChild(model);
        // Measure, scale to size, then sit the lowest point on the ground at (x, z).
        const box = this.worldBox(model);
        if (!box) return holder.destroy();
        const he = box.halfExtents;
        const k = spot.size / (2 * Math.max(he.x, he.y, he.z));
        holder.setLocalScale(k, k, k);
        holder.setLocalPosition(spot.x, 0, spot.z);
        const placed = this.worldBox(model)!;
        const wp = holder.getPosition();
        const ground = groundHeight(placed.center.x, placed.center.z);
        holder.setPosition(wp.x, wp.y + ground - (placed.center.y - placed.halfExtents.y), wp.z);
        for (const e of spot.replaces ? (this.placeholders.get(spot.replaces) ?? []) : []) {
          e.enabled = false;
        }
        this.requestFrame();
      });
      a.once('error', () => {
        /* placeholder stays */
      });
      this.track(
        new Promise<void>((resolve) => {
          a.once('load', () => resolve());
          a.once('error', () => resolve());
        }),
      );
      this.app.assets.add(a);
      this.app.assets.load(a);
    }
  }

  /**
   * The garden's model for a crop stage, loaded on first ask (from the export of
   * src/features/garden3d); null until it arrives, then plots showing it rebuild.
   */
  private cropModel(crop: string, stage: string): ContainerResource | null {
    const key = `${crop}-${stage}`;
    if (this.cropModels.has(key)) return this.cropModels.get(key)!;
    this.cropModels.set(key, null);
    if (!this.filesEnabled) return null;
    const url = `${import.meta.env.BASE_URL}models/farm/garden/crops/crop-${key}.glb`;
    const a = new Asset(`crop-${key}`, 'container', { url });
    this.assets.push(a);
    a.once('load', (loaded: Asset) => {
      if (this.destroyed) return;
      this.cropModels.set(key, loaded.resource as ContainerResource);
      for (const n of this.plots.values()) if (n.cropKey === `${crop}:${stage}`) n.cropKey = '';
      if (this.view) this.setView(this.view);
    });
    a.once('error', () => {
      /* the primitive placeholder stays */
    });
    this.app.assets.add(a);
    this.app.assets.load(a);
    return null;
  }

  /** World-space bounds of every mesh under `e`, or null if it has none. */
  private worldBox(e: Entity): BoundingBox | null {
    // getWorldTransform first: it brings unsynced ancestors along. syncHierarchy alone
    // would bake a stale parent transform into `e` and clear its dirty flag for good.
    e.getWorldTransform();
    e.syncHierarchy();
    let box: BoundingBox | null = null;
    for (const r of e.findComponents('render') as unknown as { meshInstances: MeshInstance[] }[]) {
      for (const mi of r.meshInstances) {
        if (box) box.add(mi.aabb);
        else {
          box = new BoundingBox();
          box.copy(mi.aabb);
        }
      }
    }
    return box;
  }

  /** Shared unit meshes with tangents (the stock primitives have none, so normal maps fail). */
  private shape(type: Prim): Mesh {
    let mesh = this.shapes.get(type);
    if (mesh) return mesh;
    const o = { calculateTangents: true };
    const geom =
      type === 'box'
        ? new BoxGeometry(o)
        : type === 'sphere'
          ? new SphereGeometry({ ...o, latitudeBands: 16, longitudeBands: 20 })
          : type === 'cylinder'
            ? new CylinderGeometry({ ...o, radius: 0.5, height: 1, capSegments: 18 })
            : type === 'cone'
              ? new ConeGeometry({ ...o, baseRadius: 0.5, peakRadius: 0, height: 1 })
              : new PlaneGeometry(o);
    mesh = Mesh.fromGeometry(this.device, geom);
    this.meshes.push(mesh);
    this.shapes.set(type, mesh);
    return mesh;
  }

  /** Soft round contact shadow drawn once into a 64² canvas: no file, no path. */
  private makeBlobMaterial(): StandardMaterial {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
    }
    const tex = new Texture(this.device, {
      width: size,
      height: size,
      format: PIXELFORMAT_RGBA8,
      addressU: ADDRESS_CLAMP_TO_EDGE,
      addressV: ADDRESS_CLAMP_TO_EDGE,
    });
    tex.setSource(c);
    this.textures.push(tex);
    const m = new StandardMaterial();
    m.diffuse = new Color(0.08, 0.06, 0.04);
    m.useLighting = false;
    m.useFog = false;
    m.opacityMap = tex;
    m.opacityMapChannel = 'a';
    m.opacity = 0.5;
    m.blendType = BLEND_NORMAL;
    m.depthWrite = false;
    m.update();
    this.mats.set('blob', m);
    return m;
  }

  private prim(
    type: Prim,
    material: StandardMaterial,
    pos: Vec3,
    scale: Vec3,
    rot: Vec3 = [0, 0, 0],
    parent: Entity = this.world,
    shadows = true,
  ): Entity {
    const e = new Entity();
    e.addComponent('render', {
      meshInstances: [new MeshInstance(this.shape(type), material)],
      castShadows: shadows,
      receiveShadows: true,
    });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
    e.setLocalScale(scale[0], scale[1], scale[2]);
    parent.addChild(e);
    return e;
  }

  private meshEntity(
    geom: Geometry | Mesh,
    material: StandardMaterial,
    parent: Entity,
    shadows = true,
  ) {
    let mesh: Mesh;
    if (geom instanceof Mesh) mesh = geom;
    else {
      mesh = Mesh.fromGeometry(this.device, geom);
      this.meshes.push(mesh);
    }
    const e = new Entity();
    e.addComponent('render', {
      meshInstances: [new MeshInstance(mesh, material)],
      castShadows: shadows,
      receiveShadows: true,
    });
    parent.addChild(e);
    return e;
  }

  /** Bed soil; wet soil is darker and keeps a sheen instead of the map's roughness. */
  private soilMat(wet: boolean) {
    return wet
      ? this.mat('soilWet', PALETTE.soilWet, {
          gloss: 0.55,
          tex: { set: 'brown_mud_02', tiling: [1, 1], keepGloss: true },
        })
      : this.mat('soil', PALETTE.soil, {
          gloss: 0.08,
          tex: { set: 'brown_mud_02', tiling: [1, 1] },
        });
  }

  private blob(x: number, z: number, w: number, d: number, rotY = 0, parent = this.world) {
    return this.prim(
      'plane',
      this.blobMat,
      [x, groundHeight(x, z) + 0.015, z],
      [w, 1, d],
      [0, rotY, 0],
      parent,
      false,
    );
  }

  private buildIsland() {
    this.meshEntity(
      groundGeometry(GRASS_BASE),
      this.mat('ground', GRASS_BASE, {
        vertex: true,
        gloss: 0.12,
        tex: { set: 'leafy_grass', tiling: [1, 1] },
      }),
      this.world,
      false,
    );
    this.meshEntity(
      cliffGeometry(CLIFF_BASE),
      this.mat('cliff', CLIFF_BASE, {
        vertex: true,
        gloss: 0.15,
        tex: { set: 'rock_boulder_dry', tiling: [1, 1] },
      }),
      this.world,
      true,
    );
    // A few rim rocks break the edge silhouette.
    const r = rand(7);
    const rockTex: TexUse = { set: 'rock_boulder_dry', tiling: [0.7, 0.7] };
    const rock = [
      this.mat('rock', PALETTE.rock, { tex: rockTex }),
      this.mat('rock2', PALETTE.stoneWarm, { tex: rockTex }),
    ];
    for (let i = 0; i < 9; i++) {
      const t = 0.3 + i * 0.68 + r() * 0.3;
      const rad = 5.9 + r() * 0.35;
      const s = 0.35 + r() * 0.35;
      this.prim(
        'sphere',
        rock[i % 2]!,
        [Math.cos(t) * rad, -0.25 - r() * 0.3, Math.sin(t) * rad],
        [s * 1.4, s, s * 1.1],
        [r() * 30, r() * 180, 0],
      );
    }
  }

  private buildPath() {
    const mats = [
      this.mat('stone', PALETTE.stone, { gloss: 0.3, tex: PATH_TEX }),
      this.mat('stoneWarm', PALETTE.stoneWarm, { gloss: 0.3, tex: PATH_TEX }),
    ];
    PATH_STONES.forEach(([x, z, rad, turn], i) => {
      const y = groundHeight(x, z);
      this.prim(
        'cylinder',
        mats[i % 2]!,
        [x, y + 0.03, z],
        [rad * 2.1, 0.09, rad * 1.6],
        [0, (turn * 180) / Math.PI, 0],
      );
      this.blob(x, z, rad * 2.8, rad * 2.3, (turn * 180) / Math.PI);
    });
  }

  private buildBarn() {
    const { x, z, rot, width: w, depth: d, wall, ridge } = BARN;
    const root = new Entity(CORNER.barn);
    root.setLocalPosition(x, 0, z);
    root.setLocalEulerAngles(0, (rot * 180) / Math.PI, 0);
    this.world.addChild(root);
    this.blob(0, 0, w + 1.6, d + 1.5, 0, root);

    const planks = (tiling: readonly [number, number]): TexUse => ({
      set: 'brown_planks_05',
      tiling,
    });
    // Boards ≈ 18 cm: one texture repeat per ~1.55 m of wall height.
    const wood = this.mat('wood', PALETTE.wood, { tex: planks([1.7, 1]) });
    const dark = this.mat('woodDark', PALETTE.woodDark, { tex: planks([0.35, 1]) });
    const light = this.mat('woodLight', PALETTE.woodLight, { tex: planks([1.7, 0.7]) });
    // Keep most of the clay's own colour; only a slight fade towards the palette.
    const roof = this.mat('roof', [0.62, 0.33, 0.18], {
      gloss: 0.3,
      tex: { set: 'clay_roof_tiles_02', tiling: [2.4, 1.3] },
    });
    const roofDark = this.mat('roofDark', PALETTE.roofDark, {
      gloss: 0.3,
      tex: { set: 'clay_roof_tiles_02', tiling: [3, 0.4] },
    });
    const stone = this.mat('plinth', PALETTE.stone, {
      gloss: 0.3,
      tex: { set: 'rock_boulder_dry', tiling: [2, 0.3] },
    });

    // Stone plinth, plank walls, corner posts and a top beam.
    this.prim('box', stone, [0, 0.1, 0], [w + 0.18, 0.2, d + 0.18], [0, 0, 0], root);
    this.prim('box', wood, [0, 0.2 + wall / 2, 0], [w, wall, d], [0, 0, 0], root);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.prim(
          'box',
          dark,
          [(sx * w) / 2, 0.2 + wall / 2, (sz * d) / 2],
          [0.16, wall + 0.04, 0.16],
          [0, 0, 0],
          root,
        );
      }
    }
    this.prim('box', dark, [0, 0.2 + wall, d / 2 + 0.02], [w + 0.1, 0.14, 0.1], [0, 0, 0], root);
    // Gable fill under the roof.
    const gable = this.meshEntity(prismGeometry(), light, root);
    gable.setLocalPosition(0, 0.2 + wall, 0);
    gable.setLocalScale(w - 0.02, ridge, d - 0.02);

    // Terracotta roof: two thick panels with tile ribs and a ridge cap.
    // Each panel pivots at the ridge and runs down past the wall (eave overhang).
    const slope = Math.hypot(d / 2, ridge) + 0.34;
    const ang = (Math.atan2(ridge, d / 2) * 180) / Math.PI;
    for (const side of [-1, 1]) {
      const panel = new Entity();
      panel.setLocalPosition(0, 0.2 + wall + ridge, 0);
      panel.setLocalEulerAngles(side * ang, 0, 0);
      root.addChild(panel);
      this.prim(
        'box',
        roof,
        [0, 0.06, (side * slope) / 2],
        [w + 0.55, 0.12, slope],
        [0, 0, 0],
        panel,
      );
    }
    this.prim(
      'cylinder',
      roofDark,
      [0, 0.2 + wall + ridge + 0.04, 0],
      [0.2, w + 0.6, 0.2],
      [0, 0, 90],
      root,
    );

    // Door with frame and cross brace, sign board, a lantern for the evening.
    const front = d / 2 + 0.03;
    // The door hangs on a hinge at its left edge so DoorOnSelect can swing it.
    const door = new Entity(CORNER.barnDoor);
    door.setLocalPosition(0.1 - 0.48, 0, front);
    root.addChild(door);
    const dy = 0.2 + 0.62;
    this.prim('box', dark, [0.48, dy, 0], [0.96, 1.24, 0.05], [0, 0, 0], door);
    this.prim('box', light, [0.48, dy, 0.03], [0.82, 1.1, 0.04], [0, 0, 0], door, false);
    this.prim('box', dark, [0.48, dy, 0.06], [0.1, 1.28, 0.03], [0, 0, 42], door, false);
    this.prim('box', dark, [0.48, dy, 0.06], [0.1, 1.28, 0.03], [0, 0, -42], door, false);
    this.prim(
      'box',
      this.mat('doorway', [0.08, 0.06, 0.05]),
      [0.1, dy, front - 0.02],
      [0.92, 1.2, 0.02],
      [0, 0, 0],
      root,
      false,
    );
    door.addComponent('script');
    door.script!.create(DoorOnSelect, { properties: { openAngle: -105 } });
    this.prim(
      'box',
      light,
      [-0.78, 0.2 + wall - 0.3, front + 0.02],
      [0.62, 0.3, 0.05],
      [0, 0, 0],
      root,
    );
    const lampGlow = this.prim(
      'sphere',
      this.mat('lamp', PALETTE.lamp, { glow: 0.15 }),
      [0.78, 0.2 + wall - 0.25, front + 0.1],
      [0.16, 0.2, 0.16],
      [0, 0, 0],
      root,
      false,
    );
    lampGlow.name = 'lamp-glow';
    const lamp = new Entity('lamp');
    lamp.addComponent('light', {
      type: 'omni',
      range: 3.2,
      intensity: 0,
      castShadows: false,
      color: new Color(...PALETTE.lamp),
    });
    lamp.setLocalPosition(0.78, 0.2 + wall - 0.1, front + 0.5);
    root.addChild(lamp);
    lamp.addComponent('script');
    lamp.script!.create(Lamp, { properties: { glow: lampGlow, intensity: 2.2 } });

    // Storytelling props until the CC0 models arrive: crates, a sack, a clay jar.
    const crate = this.prim(
      'box',
      wood,
      [w / 2 + 0.45, 0.25, d / 2 - 0.2],
      [0.5, 0.5, 0.5],
      [0, 12, 0],
      root,
    );
    const crateTop = this.prim(
      'box',
      light,
      [w / 2 + 0.42, 0.66, d / 2 - 0.25],
      [0.36, 0.32, 0.36],
      [0, -9, 0],
      root,
    );
    const sack = this.prim(
      'sphere',
      this.mat('sack', PALETTE.plaster),
      [w / 2 + 0.35, 0.24, d / 2 + 0.45],
      [0.46, 0.5, 0.4],
      [0, 20, 0],
      root,
    );
    const jar = this.prim(
      'sphere',
      this.mat('jar', PALETTE.roof, { gloss: 0.4 }),
      [-w / 2 - 0.35, 0.28, d / 2 - 0.1],
      [0.5, 0.56, 0.5],
      [0, 0, 0],
      root,
    );
    const jarRim = this.prim(
      'cylinder',
      this.mat('jarRim', PALETTE.roofDark),
      [-w / 2 - 0.35, 0.56, d / 2 - 0.1],
      [0.3, 0.06, 0.3],
      [0, 0, 0],
      root,
    );
    this.blob(w / 2 + 0.45, d / 2 + 0.1, 1.3, 1.6, 0, root);
    this.placeholders.set('crate', [crate, crateTop]);
    this.placeholders.set('sack', [sack]);
    this.placeholders.set('jar', [jar, jarRim]);

    // Tap volume, named by the convention (an Editor scene provides the same box).
    const hit = new Entity(CORNER.barnHit);
    hit.setLocalPosition(0, 1.2, 0);
    hit.setLocalScale(3.4, 2.8, 3.2);
    root.addChild(hit);

    this.picks.push({
      sel: { kind: 'barn' },
      box: new BoundingBox(new V3(x, 1.2, z), new V3(1.7, 1.4, 1.6)),
    });
  }

  private buildTree() {
    const { x, z, trunk, canopy } = TREE;
    const root = new Entity(CORNER.tree);
    root.setLocalPosition(x, groundHeight(x, z), z);
    this.world.addChild(root);
    this.blob(0, 0, canopy * 2.6, canopy * 2.2, 0, root);
    const bark = this.mat('bark', PALETTE.bark, { tex: { set: 'bark_brown_02', tiling: [1, 2] } });
    const tg = new ConeGeometry({
      baseRadius: 0.22,
      peakRadius: 0.11,
      height: 1,
      heightSegments: 1,
      capSegments: 10,
      calculateTangents: true,
    });
    const trunkE = this.meshEntity(tg, bark, root);
    trunkE.setLocalPosition(0, trunk / 2, 0);
    trunkE.setLocalScale(1, trunk, 1);
    this.prim('cylinder', bark, [0.2, trunk * 0.72, 0], [0.09, 0.6, 0.09], [0, 0, -48], root);
    this.prim('cylinder', bark, [-0.18, trunk * 0.8, 0.05], [0.08, 0.5, 0.08], [0, 20, 44], root);
    // Distinct canopy clumps with gaps, mid-green rather than near-black.
    const clumps: [number, number, number, number, Vec3][] = [
      [0, trunk + 0.55, 0, 1.0, PALETTE.leaf],
      [0.62, trunk + 0.25, 0.15, 0.72, PALETTE.leafLight],
      [-0.6, trunk + 0.3, 0.2, 0.7, PALETTE.leaf],
      [0.1, trunk + 0.2, -0.55, 0.74, PALETTE.leafDeep],
      [0.05, trunk + 1.05, 0.1, 0.62, PALETTE.leafLight],
      [-0.25, trunk + 0.05, 0.55, 0.52, PALETTE.leafLight],
    ];
    clumps.forEach(([cx, cy, cz, s, col], i) => {
      const clump = this.prim(
        'sphere',
        // Leafy photo on the clumps breaks the smooth spheres into foliage.
        this.mat(`leaf${i % 3}`, col, { gloss: 0.18, tex: LEAF_TEX }),
        [cx, cy, cz],
        [s * canopy * 1.25, s * canopy * 1.0, s * canopy * 1.2],
        [0, i * 37, 0],
        root,
      );
      clump.addComponent('script');
      clump.script!.create(Sway, { properties: { amplitude: 1.6, speed: 0.14, phase: i * 1.3 } });
    });
  }

  private buildTufts() {
    const r = rand(11);
    const grass = [
      this.mat('tuft', PALETTE.grassLight, { tex: LEAF_TEX }),
      this.mat('tuft2', PALETTE.grassDeep, { tex: LEAF_TEX }),
    ];
    const flower = [
      this.mat('fl1', PALETTE.flower, { glow: 0.05 }),
      this.mat('fl2', [0.98, 0.8, 0.35]),
      this.mat('fl3', [0.95, 0.66, 0.7]),
    ];
    for (const [tx, tz, s] of TUFTS) {
      const y = groundHeight(tx, tz);
      for (let i = 0; i < 4; i++) {
        const ox = (r() - 0.5) * 0.7 * s;
        const oz = (r() - 0.5) * 0.5 * s;
        this.prim(
          'sphere',
          grass[i % 2]!,
          [tx + ox, y + 0.08, tz + oz],
          [0.42 * s, 0.24 * s, 0.36 * s],
          [0, r() * 180, 0],
          this.world,
          false,
        );
      }
      for (let i = 0; i < 3; i++) {
        this.prim(
          'sphere',
          flower[i % 3]!,
          [tx + (r() - 0.5) * 0.6 * s, y + 0.22 * s, tz + (r() - 0.5) * 0.4 * s],
          [0.08, 0.06, 0.08],
          [0, 0, 0],
          this.world,
          false,
        );
      }
      this.blob(tx, tz, 1.1 * s, 0.8 * s);
    }
  }

  /* --------------------------------------------------------------- bed */

  private buildBed(ids: readonly number[]) {
    const count = ids.length;
    this.bed?.destroy();
    this.plots.clear();
    this.picks.splice(0, this.picks.length, ...this.picks.filter((p) => p.sel.kind !== 'plot'));
    const { w, d } = bedSize(count);
    const bed = new Entity(CORNER.bed);
    this.world.addChild(bed);
    this.bed = bed;
    this.bedCount = count;
    const wood = this.mat('bedWood', PALETTE.wood, {
      tex: { set: 'brown_planks_05', tiling: [2.5, 0.2] },
    });
    const dark = this.mat('woodDark', PALETTE.woodDark, {
      tex: { set: 'brown_planks_05', tiling: [0.35, 1] },
    });
    const soil = this.soilMat(false);
    const h = BED.height;
    const f = BED.frame;
    this.blob(BED.x, BED.z, w + 0.9, d + 0.9, 0, bed);
    this.prim(
      'box',
      soil,
      [BED.x, h / 2 - 0.02, BED.z],
      [w - f, h - 0.04, d - f],
      [0, 0, 0],
      bed,
      false,
    );
    // Thick boards with a darker top edge so the frame reads at phone size.
    for (const s of [-1, 1]) {
      this.prim('box', wood, [BED.x, h / 2, BED.z + (s * (d - f)) / 2], [w, h, f], [0, 0, 0], bed);
      this.prim(
        'box',
        wood,
        [BED.x + (s * (w - f)) / 2, h / 2, BED.z],
        [f, h, d - f * 2],
        [0, 0, 0],
        bed,
      );
      this.prim(
        'box',
        dark,
        [BED.x, h + 0.01, BED.z + (s * (d - f)) / 2],
        [w + 0.02, 0.03, f + 0.02],
        [0, 0, 0],
        bed,
        false,
      );
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.prim(
          'box',
          dark,
          [BED.x + (sx * (w - f)) / 2, h * 0.75, BED.z + (sz * (d - f)) / 2],
          [f + 0.06, h * 1.5, f + 0.06],
          [0, 0, 0],
          bed,
        );
      }
    }
    const markerMat = this.mat('thirsty', PALETTE.thirsty, { glow: 0.5 });
    const ripeMat = this.mat('ripe', PALETTE.select, { glow: 0.6 });
    for (let i = 0; i < count; i++) {
      const c = bedCell(i, count);
      const root = new Entity(CORNER.plot(ids[i]!));
      root.setLocalPosition(c.x, h, c.z);
      bed.addChild(root);
      const anchor = new Entity(CORNER.crop);
      root.addChild(anchor);
      const soilTile = this.prim(
        'box',
        soil,
        [0, 0.02, 0],
        [BED.cell, 0.06, BED.cell],
        [0, 0, 0],
        root,
        false,
      );
      // Three soft mounded rows per cell: worked soil, not slots cut into a tile.
      for (const fz of [-0.3, 0, 0.3]) {
        this.prim(
          'sphere',
          this.mat('ridge', [0.33, 0.23, 0.15], {
            gloss: 0.05,
            tex: { set: 'brown_mud_02', tiling: [1, 0.3] },
          }),
          [0, 0.05, fz],
          [BED.cell * 0.9, 0.09, 0.24],
          [0, 0, 0],
          root,
          false,
        );
      }
      // A drop (not a ring) so "needs water" never looks like "selected".
      const thirsty = new Entity('thirsty');
      thirsty.setLocalPosition(-0.36, 0.95, -0.36);
      root.addChild(thirsty);
      this.prim('sphere', markerMat, [0, 0, 0], [0.16, 0.16, 0.16], [0, 0, 0], thirsty, false);
      this.prim('cone', markerMat, [0, 0.1, 0], [0.13, 0.16, 0.13], [0, 0, 0], thirsty, false);
      thirsty.enabled = false;
      const ripe = this.prim(
        'sphere',
        ripeMat,
        [0.36, 0.95, -0.36],
        [0.17, 0.17, 0.17],
        [0, 0, 0],
        root,
        false,
      );
      ripe.enabled = false;
      soilTile.name = CORNER.soil;
      this.plots.set(i, { root, soil: soilTile, anchor, crop: null, cropKey: '', thirsty, ripe });
    }
  }

  private buildCrop(node: PlotNode, p: FarmPlotView) {
    node.crop?.destroy();
    node.crop = null;
    node.cropKey = `${p.crop}:${p.stage}`;
    if (!p.crop || p.stage === 'empty') return;
    const group = new Entity('crop-model');
    node.anchor.addChild(group);
    node.crop = group;
    // Pop scales this wrapper; the stage/growth scale stays on `group`.
    const pop = new Entity('pop');
    group.addChild(pop);
    const count = QUALITY[this.env.quality].plantsPerPlot;
    const r = rand(node.root.name.length * 31 + p.id * 97);
    const leaf = this.mat('cropLeaf', PALETTE.cropLeaf, { gloss: 0.25 });
    const leafDark = this.mat('leafDeep', PALETTE.leafDeep, { gloss: 0.2 });
    const fruitCol = hexToRgb(CROPS[p.crop].color);
    const fruit = this.mat(`fruit-${p.crop}`, fruitCol, { gloss: 0.45 });
    const flower = this.mat('fl1', PALETTE.flower, { glow: 0.05 });
    const blade = BLADE_CROPS.has(p.crop);
    const bush = BUSH_CROPS.has(p.crop);
    // Scene corners use the garden's crop models; the code corner keeps its primitives.
    const model = this.loadedCorner ? this.cropModel(p.crop, p.stage) : null;
    node.model = Boolean(model);
    if (model) {
      const spots = count >= 3 ? MODEL_SPOTS : ([[0, 0]] as const);
      spots.forEach(([sx, sz], i) => {
        const plant = new Entity('plant');
        plant.setLocalPosition(sx, 0, sz);
        plant.setLocalEulerAngles(0, ((i * 2.1 + p.id) * 180) / Math.PI, 0);
        const k = spots.length > 1 ? (i === 0 ? 1.05 : 0.92) : 1;
        plant.setLocalScale(k, k, k);
        plant.addChild(model.instantiateRenderEntity({ castShadows: true }));
        pop.addChild(plant);
      });
    }
    for (let i = 0; i < (model ? 0 : count); i++) {
      const plant = new Entity('plant');
      const px = count === 1 ? 0 : (i - (count - 1) / 2) * 0.3;
      plant.setLocalPosition(px, 0.06, (r() - 0.5) * 0.18);
      const yaw = r() * 360;
      plant.setLocalEulerAngles(0, yaw, 0);
      pop.addChild(plant);
      if (blade) {
        const ripeBlade = p.stage === 'ready' ? fruit : leaf;
        for (let b = 0; b < 5; b++) {
          const a = b * 72 + r() * 20;
          this.prim(
            'cone',
            b % 2 ? ripeBlade : leafDark,
            [0, 0.32, 0],
            [0.07, 0.7, 0.05],
            [14 + r() * 10, a, 0],
            plant,
          );
        }
        if (p.stage === 'ready' && p.crop === 'garlic') {
          this.prim('sphere', fruit, [0, 0.06, 0], [0.22, 0.16, 0.22], [0, 0, 0], plant);
        }
      } else {
        this.prim('cylinder', leafDark, [0, 0.18, 0], [0.04, 0.36, 0.04], [0, 0, 0], plant);
        const leaves = bush ? 7 : 5;
        for (let l = 0; l < leaves; l++) {
          const a = (l / leaves) * Math.PI * 2;
          const y = 0.18 + (l % 3) * 0.1;
          this.prim(
            'sphere',
            l % 2 ? leaf : leafDark,
            [Math.cos(a) * 0.12, y, Math.sin(a) * 0.12],
            [0.2, 0.07, 0.12],
            [0, (-a * 180) / Math.PI, 18],
            plant,
          );
        }
        if (p.stage === 'flowering') {
          for (let fl = 0; fl < 3; fl++) {
            this.prim(
              'sphere',
              flower,
              [(r() - 0.5) * 0.22, 0.42 + r() * 0.06, (r() - 0.5) * 0.22],
              [0.06, 0.05, 0.06],
              [0, 0, 0],
              plant,
              false,
            );
          }
        }
        if (p.stage === 'ready' && !bush) {
          for (let fr = 0; fr < 3; fr++) {
            const a = fr * 2.1 + r();
            this.prim(
              'sphere',
              fruit,
              [Math.cos(a) * 0.14, 0.28 + r() * 0.1, Math.sin(a) * 0.14],
              [0.12, 0.13, 0.12],
              [0, 0, 0],
              plant,
            );
          }
        }
      }
    }
    // Wind on each plant; a pop-in for crops that change after the first view.
    pop.children.forEach((plant, i) => {
      const e = plant as Entity;
      e.addComponent('script');
      e.script!.create(Sway, { properties: { amplitude: 4, speed: 0.26, phase: i * 1.9 + p.id } });
    });
    pop.addComponent('script');
    pop.script!.create(Pop, { properties: { playOnStart: this.views > 0 } });
    this.scaleCrop(node, p);
  }

  private scaleCrop(node: PlotNode, p: FarmPlotView) {
    if (!node.crop) return;
    if (node.model) {
      const s = MODEL_STAGE_SCALE[p.stage] * (p.stage === 'ready' ? 1 : 0.92 + 0.08 * p.growth);
      node.crop.setLocalScale(s, s, s);
      return;
    }
    const base = STAGE_SCALE[p.stage];
    // 1.3: plants must read at the gameplay camera, not only when zoomed in.
    const s = 1.3 * (p.stage === 'ready' ? 1 : base * (0.88 + 0.12 * p.growth));
    node.crop.setLocalScale(s, s, s);
  }

  /* ------------------------------------------------------------ public */

  setView(view: FarmView) {
    if (this.destroyed) return;
    this.view = view;
    const changed =
      view.plots.length !== this.bedCount ||
      view.plots.some((p, i) => this.plots.get(i)?.root.name !== CORNER.plot(p.id));
    if (this.loadedCorner && view.plots.some((p) => !this.scenePlots.has(p.id)))
      this.fallbackScene();
    else if (this.loadedCorner && changed) this.bindScenePlots(view.plots.map((p) => p.id));
    if (!this.loadedCorner && (changed || this.bedCount < 0)) {
      this.buildBed(view.plots.map((p) => p.id));
      view.plots.forEach((_, i) => {
        const c = bedCell(i, view.plots.length);
        this.picks.push({
          sel: { kind: 'plot', id: view.plots[i]!.id },
          box: new BoundingBox(
            new V3(c.x, BED.height + 0.3, c.z),
            new V3(BED.cell / 2, 0.45, BED.cell / 2),
          ),
        });
      });
    }
    const dry = this.soilMat(false);
    const wet = this.soilMat(true);
    view.plots.forEach((p, i) => {
      const node = this.plots.get(i);
      if (!node) return;
      if (node.cropKey !== `${p.crop}:${p.stage}`) this.buildCrop(node, p);
      else this.scaleCrop(node, p);
      if (node.soilMats) {
        const mats = p.wet ? node.soilMats.wet : node.soilMats.dry;
        node.soil.render!.meshInstances.forEach((mi, k) => (mi.material = mats[k]!));
      } else setMat(node.soil, p.wet ? wet : dry);
      node.thirsty.enabled = p.thirsty;
      node.ripe.enabled = p.stage === 'ready';
    });
    this.placeRing(view.selected);
    this.views++;
    emitView(this.app, view);
    this.requestFrame();
  }

  setEnv(env: FarmEnv) {
    if (this.destroyed) return;
    const prev = this.env;
    this.env = env;
    this.applyEnv(env, prev.quality !== env.quality);
    if (prev.quality !== env.quality) this.applyMaps();
    // Plants per plot follow quality: rebuild crops.
    if (prev.quality !== env.quality && this.view) {
      for (const n of this.plots.values()) n.cropKey = '';
      this.setView(this.view);
    }
  }

  play(effect: FarmEffect) {
    if (this.destroyed) return;
    emitEffect(this.app, effect);
    if (this.env.reduced || !this.view) return;
    for (const id of effect.plotIds) {
      const i = this.view.plots.findIndex((p) => p.id === id);
      if (i < 0) continue;
      const c = bedCell(i, this.view.plots.length);
      const pos = this.loadedCorner ? this.plots.get(i)?.root.getPosition() : undefined;
      this.spawnBurst(
        effect.kind,
        pos?.x ?? c.x,
        pos ? pos.y + 0.1 : BED.height + 0.1,
        pos?.z ?? c.z,
      );
    }
    this.requestFrame();
  }

  setActive(active: boolean) {
    if (this.destroyed || this.active === active) return;
    this.active = active;
    // Scripts stop advancing while hidden; nothing grows from frames spent off-screen.
    this.app.timeScale = active ? 1 : 0;
    this.app.autoRender = active && !this.env.reduced;
    if (active) this.requestFrame();
  }

  resize() {
    if (this.destroyed) return;
    let cap = QUALITY[this.env.quality].dpr[1];
    // Post effects scale with pixels: phones stop at 1.5× even on Đẹp.
    if (window.matchMedia?.('(pointer: coarse)').matches) cap = Math.min(cap, 1.5);
    this.device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, cap);
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.app.resizeCanvas(w, h);
    this.fit = Math.max(1, 1.35 / (w / h)) ** 0.85;
    const bh = 2 * BACKDROP_DIST * Math.tan(((this.camCfg.fov / 2) * Math.PI) / 180) * 1.08;
    this.backdrop.setLocalScale(bh * (w / h), 1, bh);
    this.updateCamera(0, true);
    this.requestFrame();
  }

  zoom(factor: number) {
    this.cam.goalDist = Math.min(
      this.camCfg.zoom.max,
      Math.max(this.camCfg.zoom.min, this.cam.goalDist * factor),
    );
    this.requestFrame();
  }

  resetCamera() {
    this.cam.goalYaw = this.camCfg.yaw;
    this.cam.goalDist = this.camCfg.distance;
    this.cam.goalTarget.set(...this.camCfg.target);
    this.requestFrame();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sceneAbort.abort();
    this.loadedCorner?.dispose();
    this.loadedCorner = null;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.app.off('update', this.onUpdate);
    this.bursts.length = 0;
    this.frame?.destroy();
    this.frame = null;
    for (const a of this.assets) {
      this.app.assets.remove(a);
      a.unload();
    }
    // Entities first (they reference meshes/materials), then our own GPU resources.
    this.app.root.children.slice().forEach((c) => c.destroy());
    for (const m of this.mats.values()) m.destroy();
    this.mats.clear();
    for (const m of this.meshes) m.destroy();
    for (const t of this.textures) t.destroy();
    this.app.destroy();
  }

  /* ----------------------------------------------------------- internals */

  private requestFrame() {
    if (!this.destroyed) this.app.renderNextFrame = true;
  }

  private applyEnv(env: FarmEnv, qualityChanged: boolean) {
    const L = LIGHTING[env.dayPart];
    const q = QUALITY[env.quality];
    const light = this.sun.light!;
    light.color = new Color(...L.sun);
    light.intensity = L.sunIntensity;
    this.sun.setEulerAngles(90 - L.sunAngles[0], L.sunAngles[1], 0);
    if (qualityChanged) {
      light.castShadows = q.shadows;
      light.shadowResolution = q.shadowSize || 512;
      light.shadowType = env.quality === 'high' ? SHADOW_PCF5_32F : SHADOW_PCF3_32F;
      // Fake contact shadows carry grounding alone on the light tier.
      this.blobMat.opacity = q.shadows ? 0.42 : 0.62;
      this.blobMat.update();
      this.resize();
      this.applyFrame(env);
    }
    const scene = this.app.scene;
    scene.ambientLight = new Color(...L.ambient);
    scene.skyboxIntensity = L.ibl;
    const bg = matOf(this.backdrop);
    const sky = bg.emissiveMap ? L.backdrop : L.sky;
    bg.emissive = new Color(sky[0], sky[1], sky[2]);
    bg.update();
    scene.fog.color = new Color(...L.sky);
    this.camera.camera!.clearColor = new Color(L.sky[0], L.sky[1], L.sky[2], 1);
    emitEnv(this.app, env);
    this.app.autoRender = this.active && !env.reduced;
    this.requestFrame();
  }

  /**
   * Vừa/Đẹp render through CameraFrame: ambient occlusion in the creases,
   * a whisper of bloom for the lamp, gentle grading and vignette. Nhẹ keeps
   * the plain forward render (fake contact shadows only).
   */
  private applyFrame(env: FarmEnv) {
    if (env.quality === 'low') {
      this.frame?.destroy();
      this.frame = null;
      return;
    }
    if (!this.frame) this.frame = new CameraFrame(this.app, this.camera.camera!);
    const f = this.frame;
    const high = env.quality === 'high';
    f.rendering.toneMapping = TONEMAP_NEUTRAL;
    // A retina buffer is already supersampled: 2× MSAA is plenty there.
    f.rendering.samples = this.device.maxPixelRatio > 1.25 ? 2 : 4;
    f.ssao.type = SSAOTYPE_LIGHTING;
    f.ssao.intensity = 0.55;
    f.ssao.radius = 30;
    // Half-resolution AO: soft creases look the same at a quarter of the cost.
    f.ssao.scale = 0.5;
    f.ssao.samples = high ? 12 : 8;
    f.ssao.blurEnabled = true;
    // The lamp glow is a whisper; only the top tier pays for the blur chain.
    f.bloom.intensity = high ? 0.01 : 0;
    f.bloom.blurLevel = 8;
    f.grading.enabled = true;
    f.grading.saturation = 0.88;
    f.grading.contrast = 1.06;
    f.grading.brightness = 1;
    f.vignette.intensity = 0.28;
    f.vignette.inner = 0.6;
    f.vignette.outer = 1.3;
    f.vignette.curvature = 0.6;
    f.update();
  }

  private placeRing(sel: FarmSelection) {
    if (!sel || !this.view) {
      this.ring.enabled = false;
      this.cam.goalTarget.set(...this.camCfg.target);
      return;
    }
    let x: number;
    let z: number;
    let y: number;
    let s: number;
    if (sel.kind === 'plot') {
      const i = this.view.plots.findIndex((p) => p.id === sel.id);
      if (i < 0) {
        this.ring.enabled = false;
        return;
      }
      const c = bedCell(i, this.view.plots.length);
      x = c.x;
      z = c.z;
      y = BED.height + 0.1;
      s = BED.cell * 1.08;
    } else {
      x = BARN.x;
      z = BARN.z;
      y = 0.06;
      s = 3.6;
    }
    this.ring.enabled = true;
    if (this.loadedCorner) {
      const target =
        sel.kind === 'plot'
          ? this.world.findByName(CORNER.plot(sel.id))
          : this.world.findByName(CORNER.barnHit);
      if (target) {
        const pos = target.getPosition();
        x = pos.x;
        z = pos.z;
        y = sel.kind === 'plot' ? pos.y + 0.1 : 0.06;
      }
    }
    this.ring.setPosition(x, y, z);
    this.ringScale = s;
    this.ring.setLocalScale(s, 1, s);
    // Lean the camera gently towards the selection; never lose the whole corner.
    const t = this.camCfg.target;
    this.cam.goalTarget.set(t[0] + (x - t[0]) * 0.35, t[1], t[2] + (z - t[2]) * 0.35);
  }

  private spawnBurst(kind: FarmEffect['kind'], x: number, y: number, z: number) {
    const r = rand(Math.floor(this.time * 1000) + 1);
    const mat =
      kind === 'water'
        ? this.mat('water', PALETTE.water, { glow: 0.3, gloss: 0.8 })
        : kind === 'plant'
          ? this.soilMat(false)
          : this.mat('ripe', PALETTE.select, { glow: 0.6 });
    const n = kind === 'water' ? 12 : 8;
    const parts: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const e = this.prim(
        'sphere',
        mat,
        [x, y, z],
        [0.07, 0.07, 0.07],
        [0, 0, 0],
        this.app.root,
        false,
      );
      const a = r() * Math.PI * 2;
      let vel: V3;
      if (kind === 'water') {
        e.setLocalPosition(
          x + Math.cos(a) * r() * 0.4,
          y + 1.3 + r() * 0.4,
          z + Math.sin(a) * r() * 0.4,
        );
        vel = new V3(0, -2.4 - r(), 0);
      } else if (kind === 'plant') {
        vel = new V3(Math.cos(a) * 0.8, 1.4 + r() * 0.8, Math.sin(a) * 0.8);
      } else {
        vel = new V3(Math.cos(a) * 0.5, 2.2 + r(), Math.sin(a) * 0.5);
      }
      parts.push({ e, vel, life: 1 });
    }
    this.bursts.push({
      t: 0,
      dur: kind === 'water' ? 0.7 : 0.8,
      parts,
      gravity: kind === 'water' ? 0 : 4.5,
    });
  }

  private updateCamera(dt: number, snap: boolean) {
    const c = this.cam;
    const k = snap || this.env.reduced ? 1 : 1 - Math.exp(-dt * 7);
    c.yaw += (c.goalYaw - c.yaw) * k;
    c.dist += (c.goalDist - c.dist) * k;
    c.target.lerp(c.target, c.goalTarget, k);
    const cp = Math.cos(this.camCfg.pitch);
    this.camera.setPosition(
      c.target.x + Math.sin(c.yaw) * cp * c.dist * this.fit,
      c.target.y + Math.sin(this.camCfg.pitch) * c.dist * this.fit,
      c.target.z + Math.cos(c.yaw) * cp * c.dist * this.fit,
    );
    this.camera.lookAt(c.target);
    return (
      Math.abs(c.goalYaw - c.yaw) > 1e-4 ||
      Math.abs(c.goalDist - c.dist) > 1e-3 ||
      c.target.distance(c.goalTarget) > 1e-3
    );
  }

  private readonly onUpdate = (dt: number) => {
    if (this.destroyed || !this.active) return;
    this.time += dt;
    const moving = this.updateCamera(dt, false);
    if (!this.env.reduced) {
      const t = this.time;
      if (this.ring.enabled) {
        const s = this.ringScale;
        const p = 1 + Math.sin(t * 3.2) * 0.025;
        this.ring.setLocalScale(s * p, 1, s * p);
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.t += dt;
      const k = b.t / b.dur;
      for (const p of b.parts) {
        p.vel.y -= b.gravity * dt;
        const pos = p.e.getLocalPosition();
        p.e.setLocalPosition(
          pos.x + p.vel.x * dt,
          Math.max(BED.height, pos.y + p.vel.y * dt),
          pos.z + p.vel.z * dt,
        );
        const s = 0.07 * Math.max(0, 1 - k);
        p.e.setLocalScale(s, s, s);
      }
      if (k >= 1) {
        for (const p of b.parts) p.e.destroy();
        this.bursts.splice(i, 1);
      }
    }
    if (moving || this.bursts.length > 0 || this.drag?.moved) this.requestFrame();
  };

  private readonly onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.drag = {
      x: e.clientX,
      y: e.clientY,
      yaw: this.cam.goalYaw,
      moved: false,
      id: e.pointerId,
    };
  };

  private readonly onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      d.moved = true;
      this.canvas.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) {
      this.cam.goalYaw = Math.max(
        -this.camCfg.yawLimit,
        Math.min(this.camCfg.yawLimit, d.yaw - dx * 0.006),
      );
      this.requestFrame();
    }
  };

  private readonly onUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    if (!d || d.id !== e.pointerId || d.moved) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    const rect = this.canvas.getBoundingClientRect();
    this.opts.onIntent({
      type: 'select',
      target: this.pick(e.clientX - rect.left, e.clientY - rect.top),
    });
  };

  private readonly onCancel = () => {
    this.drag = null;
  };

  private readonly onContextLost = () => {
    if (!this.destroyed) this.opts.onLost();
  };

  private pick(x: number, y: number): FarmSelection {
    const cam = this.camera.camera!;
    const from = cam.screenToWorld(x, y, cam.nearClip);
    const to = cam.screenToWorld(x, y, cam.farClip);
    const ray = new Ray(from, to.sub(from).normalize());
    const hit = new V3();
    let best: FarmSelection = null;
    let bestD = Infinity;
    for (const p of this.picks) {
      if (p.box.intersectsRay(ray, hit)) {
        const dist = hit.distance(from);
        // Plots win ties with the barn behind them.
        const bias = p.sel.kind === 'plot' ? -0.5 : 0;
        if (dist + bias < bestD) {
          bestD = dist + bias;
          best = p.sel;
        }
      }
    }
    return best;
  }
}

/** Creates the engine on a canvas. Rejects if WebGL 2 is unavailable. */
/**
 * Builds the corner on an existing graphics device. `loadAssets: false` skips
 * network files (textures, HDR, props) — used by tests on a NullGraphicsDevice.
 */
export function startFarmEngine(
  device: GraphicsDevice,
  opts: FarmEngineOptions,
  { loadAssets = true }: { loadAssets?: boolean } = {},
): FarmEngine {
  const app = new AppBase(opts.canvas);
  const o = new AppOptions();
  o.graphicsDevice = device;
  o.componentSystems = [
    RenderComponentSystem,
    CameraComponentSystem,
    LightComponentSystem,
    ScriptComponentSystem,
  ];
  o.resourceHandlers = [
    TextureHandler,
    ContainerHandler,
    MaterialHandler,
    RenderHandler,
    ModelHandler,
    JsonHandler,
    BinaryHandler,
  ];
  app.init(o);
  app.setCanvasFillMode(FILLMODE_NONE);
  app.setCanvasResolution(RESOLUTION_AUTO);
  const engine = new FarmEngine(app, device, opts);
  try {
    engine.build();
    engine.resize();
    app.start();
    if (loadAssets) engine.loadAssets();
    if (opts.sceneConfigUrl) engine.loadVersionedScene(opts.sceneConfigUrl);
  } catch (err) {
    engine.destroy();
    throw err;
  }
  return engine;
}

export const createFarmEngine: CreateFarmEngine = async (opts) => {
  const device = await createGraphicsDevice(opts.canvas, {
    deviceTypes: [DEVICETYPE_WEBGL2],
    // Vừa/Đẹp anti-alias inside CameraFrame; an MSAA backbuffer would be paid twice.
    antialias: false,
    powerPreference: 'high-performance',
  });
  const engine = startFarmEngine(device as GraphicsDevice, opts);
  const app = engine.appForDebug;
  try {
    // ?g3d-debug exposes the engine for measuring (same switch as the classic renderer).
    if (window.location.search.includes('g3d-debug')) {
      (window as unknown as { __farmPc: unknown }).__farmPc = { engine, app };
    }
  } catch (err) {
    engine.destroy();
    throw err;
  }
  return engine;
};
