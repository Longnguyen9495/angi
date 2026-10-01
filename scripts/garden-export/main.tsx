/* eslint-disable react-refresh/only-export-components -- dev export tool, not part of the app */
import { createRoot, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Group, IcosahedronGeometry, Mesh, Object3D } from 'three';
import { bake, glb } from './bake';
import { exportPainted, previewPainted } from './painted';
import type { CropId } from '../../src/data/types';
import { BUILDINGS, plotPosition } from '../../src/features/garden3d/layout';
import { QUALITY } from '../../src/features/garden3d/quality';
import { bedGeometries } from '../../src/features/garden3d/scene/bedGeometry';
import { Buildings } from '../../src/features/garden3d/scene/Buildings';
import { CropModel } from '../../src/features/garden3d/scene/Crop';
import { Island } from '../../src/features/garden3d/scene/Island';
import { kitMaterial } from '../../src/features/garden3d/scene/kit';
import { Sky } from '../../src/features/garden3d/scene/Sky';
import { skyAt } from '../../src/features/garden3d/sky';

/*
 * Exports the Three.js garden (src/features/garden3d) as static GLB pieces for
 * the PlayCanvas Editor scene: the same code-built island, buildings, beds and
 * crops, so both renderers show one design. Instanced copies are baked into
 * plain meshes (one mesh per material) because Editor import drops instancing.
 * Shader-only touches (wind sway, procedural surface detail) are not exported.
 */

const CROPS: CropId[] = [
  'rice',
  'herbs',
  'chili',
  'scallion',
  'bean',
  'tomato',
  'lemongrass',
  'garlic',
  'cucumber',
  'lime',
];
const STAGES = ['sprout', 'young', 'flowering', 'ready'] as const;

extend(THREE as never);

/** Hands the R3F scene out once the tree below it has mounted. */
function Grab({ onScene }: { onScene: (scene: Object3D) => void }) {
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    setTimeout(() => onScene(scene), 100);
  }, [scene, onScene]);
  return null;
}

/** Mounts `node` in a fresh R3F root and returns its scene once effects ran. */
async function mount(node: ReactNode): Promise<{ scene: Object3D; done: () => void }> {
  // A fresh canvas per root: R3F binds one root per canvas.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const root = createRoot(canvas);
  await root.configure({
    frameloop: 'never',
    size: { width: 256, height: 256, top: 0, left: 0 },
    events: undefined,
  });
  const scene = await new Promise<Object3D>((resolve) =>
    root.render(
      <>
        {node}
        <Grab onScene={resolve} />
      </>,
    ),
  );
  return { scene, done: () => root.unmount() };
}

interface Piece {
  file: string;
  tris: number;
  /** Where the piece's origin stands in the garden (x, z, rotation y in radians). */
  at?: { x: number; z: number; rot: number };
}

async function exportAll() {
  console.log('export start');
  const files: Record<string, string> = {};
  const pieces: Piece[] = [];
  const save = async (file: string, baked: { group: Group; tris: number }, at?: Piece['at']) => {
    console.log('exported', file, baked.tris);
    files[file] = await glb(baked.group);
    pieces.push({ file, tris: baked.tris, at });
  };

  // Island: lawn, skirt, cliff, trees, bushes, tufts, flowers, flagstones; far islets apart.
  {
    const { scene, done } = await mount(<Island grass={QUALITY.high.grass} reduced />);
    const island = scene.children[0]!;
    const islets = island.children[island.children.length - 1]!;
    await save(
      'island.glb',
      bake(scene, 'island', (o) => o === islets),
    );
    await save('islets.glb', bake(islets, 'islets'));
    done();
  }

  // Buildings, each in its own local space (the Editor entity carries the placement).
  {
    const { scene, done } = await mount(
      <Buildings
        selected={null}
        animals={{ chicken: 'busy', cow: 'busy' }}
        watering={false}
        steam={false}
        onSelect={() => {}}
      />,
    );
    const top = scene.children[0]!;
    const spots = top.children.filter((c) => c.type === 'Group');
    // Spot order in Buildings.tsx: kitchen, barn, well, chicken, cow (after the footprint blobs).
    const ids = ['kitchen', 'barn', 'well', 'chicken', 'cow'] as const;
    const files = { kitchen: 'kitchen', barn: 'barn', well: 'well', chicken: 'coop', cow: 'pen' };
    const steam = (o: Object3D) =>
      o instanceof Mesh && o.geometry instanceof IcosahedronGeometry && o.material.transparent;
    for (const [i, id] of ids.entries()) {
      const spot = spots[spots.length - ids.length + i]!;
      const p = BUILDINGS[id];
      if (Math.abs(spot.position.x - p.x) > 1e-6) throw new Error(`spot order changed: ${id}`);
      await save(`${files[id]}.glb`, bake(spot, files[id], steam), p);
    }
    // Contact shadows under the buildings (first child of the Buildings group).
    await save(
      'building-shadows.glb',
      bake(top, 'building-shadows', (o) => spots.includes(o)),
    );
    done();
  }

  // One raised bed: frame + posts + grass fringe, and the soil the game re-tints.
  {
    const g = bedGeometries();
    const kit = kitMaterial();
    const fringe = kitMaterial({ sway: 0.08 });
    const frame = new Group();
    frame.add(new Mesh(g.frame, kit), new Mesh(g.posts, kit), new Mesh(g.fringe, fringe));
    await save('plot-bed.glb', bake(frame, 'plot-bed'));
    const soil = new Group();
    soil.add(new Mesh(g.base, kit), new Mesh(g.ridges, kit), new Mesh(g.clods, kit));
    await save('plot-soil.glb', bake(soil, 'plot-soil'));
  }

  // Crops: one plant per file, crop-{crop}-{stage}.
  {
    // All 40 in one root (each root costs a WebGL context); one named group per plant.
    const names = CROPS.flatMap((crop) => STAGES.map((stage) => ({ crop, stage })));
    const { scene, done } = await mount(
      <>
        {names.map(({ crop, stage }) => (
          <group key={`${crop}-${stage}`} name={`crop-${crop}-${stage}`}>
            <CropModel crop={crop} stage={stage} />
          </group>
        ))}
      </>,
    );
    for (const { crop, stage } of names) {
      const name = `crop-${crop}-${stage}`;
      await save(`crops/${name}.glb`, bake(scene.getObjectByName(name)!, name));
    }
    done();
  }

  // Clouds around and under the island (the dome, lights and stars stay in the engine).
  {
    const { scene, done } = await mount(
      <Sky look={skyAt(12)} clouds={QUALITY.high.clouds} shadowSize={0} reduced />,
    );
    let clouds: Object3D | null = null;
    scene.traverse((o) => {
      if (!clouds && o instanceof Mesh && o.geometry instanceof IcosahedronGeometry)
        clouds = o.parent!.parent!;
    });
    if (!clouds) throw new Error('clouds not found');
    await save('clouds.glb', bake(clouds, 'clouds'));
    done();
  }

  return {
    files,
    pieces,
    plots: Array.from({ length: 9 }, (_, i) => plotPosition(i)),
    buildings: BUILDINGS,
  };
}

(window as unknown as { __exportAll: typeof exportAll }).__exportAll = exportAll;
(window as unknown as { __exportPainted: typeof exportPainted }).__exportPainted = exportPainted;
(window as unknown as { __previewPainted: typeof previewPainted }).__previewPainted = previewPainted;
document.title = 'ready';
