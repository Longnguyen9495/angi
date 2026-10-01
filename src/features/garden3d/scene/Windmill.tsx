import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import { ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from 'three';
import { LANDMARKS } from '../layout';
import { tileRoof } from './architecture';
import { box, kitMaterial, prop } from './kit';
import { C } from './materials';

/*
 * A small village windmill behind the plots: stone footing, a tapered timber
 * tower, a tiled cap and four lattice sails that turn slowly (still when the
 * guest prefers reduced motion). Pure scenery — it is not tapped.
 */

const HUB_Y = 2.05;

function towerGeometry() {
  return prop('windmill-tower', (k) => {
    k.add(new CylinderGeometry(0.62, 0.7, 0.32, 10), C.rockWarm, {
      at: [0, 0.16, 0],
      rough: 0.05,
      vary: 0.1,
      ao: 0.4,
      flat: true,
    });
    k.add(new CylinderGeometry(0.42, 0.56, 1.55, 8), C.wall, {
      at: [0, 1.1, 0],
      vary: 0.04,
      ao: 0.25,
    });
    // Timber bands and corner posts give the plaster tower its frame.
    for (const y of [0.42, 1.1, 1.82])
      k.add(
        new CylinderGeometry(0.565 - (y - 0.4) * 0.09, 0.57 - (y - 0.4) * 0.09, 0.06, 8),
        C.woodDark,
        {
          at: [0, y, 0],
        },
      );
    for (let i = 0; i < 8; i += 2) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      k.add(box(0.06, 1.5, 0.06), C.woodDark, {
        at: [Math.cos(a) * 0.49, 1.1, Math.sin(a) * 0.49],
        rot: [Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09],
      });
    }
    k.add(box(0.3, 0.5, 0.06), C.wood, { at: [0, 0.6, 0.53], ao: 0.2 });
    k.add(box(0.2, 0.2, 0.05), '#5f97b7', { at: [0, 1.45, 0.47] });
    k.add(box(0.26, 0.04, 0.08), C.woodDark, { at: [0, 1.34, 0.48] });
    // Cap: a little tiled roof turned to the wind, a hub block in front.
    tileRoof(k, { w: 1.0, depth: 1.0, rise: 0.42, y: 1.88, seed: 41, tile: 0.14 });
    k.add(box(0.36, 0.26, 0.32), C.woodDark, { at: [0, HUB_Y, 0.42] });
    // Sacks of rice by the door, the reason the mill is here.
    for (const [x, z, s] of [
      [0.5, 0.55, 1],
      [0.72, 0.38, 0.85],
    ] as [number, number, number][])
      k.add(new SphereGeometry(0.17 * s, 8, 6), '#e8dcc0', {
        at: [x, 0.15 * s, z],
        scale: [1, 1.2, 0.9],
        ao: 0.35,
      });
  });
}

function sailsGeometry() {
  return prop('windmill-sails', (k) => {
    k.add(new CylinderGeometry(0.07, 0.09, 0.14, 8), C.woodDark, {
      rot: [Math.PI / 2, 0, 0],
    });
    k.add(new ConeGeometry(0.06, 0.1, 8), C.copper, { at: [0, 0, 0.11], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      // Stock (arm) plus a lattice of cloth-covered panels on one side.
      k.add(box(0.05, 1.25, 0.04), C.woodDark, { at: [s * 0.66, c * 0.66, 0.04], rot: [0, 0, -a] });
      k.add(box(0.26, 0.88, 0.015), '#f3ead2', {
        at: [s * 0.78 + c * 0.15, c * 0.78 - s * 0.15, 0.05],
        rot: [0, 0, -a],
        vary: 0.05,
      });
      for (const t of [0.42, 0.7, 0.98])
        k.add(box(0.3, 0.025, 0.025), C.wood, {
          at: [s * t + c * 0.15, c * t - s * 0.15, 0.065],
          rot: [0, 0, -a],
        });
    }
  });
}

export const Windmill = memo(function Windmill({ reduced }: { reduced: boolean }) {
  const tower = useMemo(() => towerGeometry(), []);
  const sails = useMemo(() => sailsGeometry(), []);
  const turn = useRef<Group>(null);
  useFrame((_, dt) => {
    if (!reduced && turn.current) turn.current.rotation.z -= Math.min(dt, 0.1) * 0.45;
  });
  const p = LANDMARKS.windmill;
  const matte = kitMaterial();
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
      <mesh geometry={tower} material={matte} castShadow receiveShadow />
      <group ref={turn} position={[0, HUB_Y, 0.62]} rotation={[0, 0, 0.4]}>
        <mesh geometry={sails} material={matte} castShadow />
      </group>
    </group>
  );
});
