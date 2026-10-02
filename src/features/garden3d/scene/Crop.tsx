import { useFrame } from '@react-three/fiber';
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  BufferAttribute,
  ImageLoader,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
  type Group,
} from 'three';
import { CROPS } from '../../../data/game';
import { cropSprite } from '../../../data/sprites';
import type { CropId } from '../../../data/types';
import type { PlotStage } from '../../../domain/selectors';

export type Stage = Exclude<PlotStage, 'empty'>;

/*
 * Plants are the same painted per-stage images as the 2D farm, standing in the beds as
 * camera-facing cut-outs (cylindrical billboards: they turn only around the vertical axis, so
 * they never lean back as the camera tilts). Each image already carries its own size and a soil
 * mound at the bottom, so every image is drawn at one fixed world size per pixel — a sprout is
 * never blown up to a grown plant's height. Trees get a larger scale than vegetables.
 */

/** World units per image pixel (images are ~60–90 px). */
const PX: Record<'veg' | 'tree' | 'mushroom', number> = {
  veg: 0.014,
  tree: 0.021,
  mushroom: 0.013,
};

/** Sway amplitude (radians around the base): trees move less, mushroom blocks not at all. */
const SWING: Record<'veg' | 'tree' | 'mushroom', number> = {
  veg: 0.055,
  tree: 0.028,
  mushroom: 0,
};

/** One unit quad with its origin at the bottom centre (the plant's foot). */
const QUAD = (() => {
  const g = new PlaneGeometry(1, 1);
  g.translate(0, 0.5, 0);
  // Normals tipped up toward the viewer: the cut-out is lit like the ground it stands on (day,
  // dusk and night alike) instead of flaring or going black as it turns to face the camera.
  const n = g.attributes.normal as BufferAttribute;
  const up = new Vector3(0, 0.8, 0.6).normalize();
  for (let i = 0; i < n.count; i++) n.setXYZ(i, up.x, up.y, up.z);
  return g;
})();

/* ---------- One texture + material per image, shared and reference counted ---------- */

interface Sprite {
  key: string;
  tex: Texture;
  mat: MeshStandardMaterial;
  /** Image size in pixels (0 until loaded). */
  w: number;
  h: number;
  refs: number;
  listeners: Set<() => void>;
}

const sprites = new Map<string, Sprite>();
const loader = new ImageLoader();

/** The stage image, then stand-ins for the few stages not drawn yet (see catalog.json). */
function candidates(crop: CropId, stage: Stage): string[] {
  const order: (Stage | 'produce')[] = [stage, stage === 'sprout' ? 'young' : 'sprout', 'produce'];
  return order.map((s) => cropSprite(crop, s));
}

function load(s: Sprite, urls: string[]) {
  const [url, ...rest] = urls;
  if (!url) return;
  loader.load(
    url,
    (img) => {
      s.tex.image = img;
      s.tex.needsUpdate = true;
      s.w = img.naturalWidth || img.width;
      s.h = img.naturalHeight || img.height;
      s.mat.visible = true;
      s.mat.needsUpdate = true;
      s.listeners.forEach((f) => f());
    },
    undefined,
    () => load(s, rest),
  );
}

function spriteFor(crop: CropId, stage: Stage): Sprite {
  const key = `${crop}-${stage}`;
  let s = sprites.get(key);
  if (s) return s;
  const tex = new Texture();
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new MeshStandardMaterial({
    map: tex,
    roughness: 1,
    metalness: 0,
    // Cut-out, not blended: writes depth, needs no sorting, and the shadow pass reuses the
    // alpha so shadows have the plant's shape. Coverage smooths the edges under MSAA.
    alphaTest: 0.45,
    alphaToCoverage: true,
    side: 2,
  });
  mat.visible = false;
  s = { key, tex, mat, w: 0, h: 0, refs: 0, listeners: new Set() };
  sprites.set(key, s);
  load(s, candidates(crop, stage));
  return s;
}

function retain(s: Sprite) {
  s.refs++;
  sprites.set(s.key, s);
}

function release(s: Sprite) {
  s.refs--;
  if (s.refs > 0) return;
  // GPU copies go; the decoded image stays on the object in case it is shown again.
  s.tex.dispose();
  s.mat.dispose();
  if (sprites.get(s.key) === s) sprites.delete(s.key);
}

/* ---------- One frame callback for every billboard ---------- */

interface Billboard {
  /** Turned to face the camera. */
  face: Group;
  /** Tilted for the sway. */
  sway: Group;
  phase: number;
  swing: number;
}

const at = new Vector3();

class Billboards {
  private items = new Set<Billboard>();
  add(b: Billboard) {
    this.items.add(b);
    return () => {
      this.items.delete(b);
    };
  }
  /** Face every billboard to the camera (turning around Y only) and sway it about its foot. */
  update(camera: { x: number; z: number }, t: number, still: boolean) {
    for (const b of this.items) {
      b.face.getWorldPosition(at);
      b.face.rotation.y = Math.atan2(camera.x - at.x, camera.z - at.z);
      b.sway.rotation.z = still || !b.swing ? 0 : Math.sin(t * 1.6 + b.phase) * b.swing;
    }
  }
}

const BillboardSet = createContext<Billboards | null>(null);

/**
 * Hosts the crop billboards below it: turns them all to the camera and sways them, in a
 * single frame callback. Parents of a billboard may move and scale it but not rotate it.
 */
export function CropBillboards({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const set = useMemo(() => new Billboards(), []);
  useFrame(({ camera, clock }) => set.update(camera.position, clock.elapsedTime, reduced));
  return <BillboardSet.Provider value={set}>{children}</BillboardSet.Provider>;
}

/** One plant of `crop` at `stage`, its foot at the local origin. */
export const CropSprite = memo(function CropSprite({
  crop,
  stage,
  phase,
}: {
  crop: CropId;
  stage: Stage;
  /** Sway phase, so neighbouring plants don't move in step. */
  phase: number;
}) {
  const set = useContext(BillboardSet);
  const face = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const sprite = useMemo(() => spriteFor(crop, stage), [crop, stage]);
  const kind = CROPS[crop].kind;

  useEffect(() => {
    retain(sprite);
    return () => release(sprite);
  }, [sprite]);

  // Re-render once the image has arrived (its size sets the quad's).
  const w = useSyncExternalStore(
    (f) => {
      sprite.listeners.add(f);
      return () => sprite.listeners.delete(f);
    },
    () => sprite.w,
  );

  useEffect(() => {
    if (!set || !face.current || !sway.current) return;
    return set.add({ face: face.current, sway: sway.current, phase, swing: SWING[kind] });
  }, [set, phase, kind]);

  const k = PX[kind];
  return (
    <group ref={face}>
      <group ref={sway}>
        {w > 0 && (
          <mesh geometry={QUAD} material={sprite.mat} scale={[w * k, sprite.h * k, 1]} castShadow />
        )}
      </group>
    </group>
  );
});
