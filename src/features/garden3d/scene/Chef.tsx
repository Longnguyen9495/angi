import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { CHEF_PATH } from '../layout';
import { C, mat } from './materials';

const SPEED = 0.7; // units per second
const PAUSE = 2.2; // seconds she stops at each waypoint (to look at the plots)

/** The loop as timed segments: walk each leg, then pause. */
const SEGS = (() => {
  let acc = 0;
  return CHEF_PATH.map((a, i) => {
    const b = CHEF_PATH[(i + 1) % CHEF_PATH.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const seg = { a, b, len, start: acc };
    acc += len / SPEED + PAUSE;
    return seg;
  });
})();
const LOOP = SEGS.reduce((s, x) => s + x.len / SPEED + PAUSE, 0);

/** Cô Ba strolls her loop: kitchen → along the plots → the well → back. */
export function Chef({ reduced }: { reduced: boolean }) {
  const body = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const legs2 = useRef<Group>(null);

  useFrame(({ clock }) => {
    const g = body.current;
    if (!g) return;
    if (reduced) {
      g.position.set(CHEF_PATH[0]![0], 0, CHEF_PATH[0]![1]);
      return;
    }
    const t = clock.elapsedTime % LOOP;
    let seg = SEGS[0]!;
    for (const s of SEGS) if (s.start <= t) seg = s;
    const local = t - seg.start;
    const walkTime = seg.len / SPEED;
    const walking = local < walkTime;
    const k = walking ? local / walkTime : 1;
    const x = seg.a[0] + (seg.b[0] - seg.a[0]) * k;
    const z = seg.a[1] + (seg.b[1] - seg.a[1]) * k;
    const heading = Math.atan2(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
    g.position.set(x, walking ? Math.abs(Math.sin(local * 9)) * 0.05 : 0, z);
    // Turn smoothly toward where she's going.
    let d = heading - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * 0.12;
    const swing = walking ? Math.sin(local * 9) * 0.5 : 0;
    if (legs.current) legs.current.rotation.x = swing;
    if (legs2.current) legs2.current.rotation.x = -swing;
  });

  return (
    <group ref={body} scale={0.9}>
      <group ref={legs} position={[-0.09, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]} material={mat('#3b3a37')}>
          <cylinderGeometry args={[0.05, 0.05, 0.32, 5]} />
        </mesh>
      </group>
      <group ref={legs2} position={[0.09, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]} material={mat('#3b3a37')}>
          <cylinderGeometry args={[0.05, 0.05, 0.32, 5]} />
        </mesh>
      </group>
      {/* Áo bà ba + tạp dề */}
      <mesh position={[0, 0.58, 0]} material={mat(C.copper)} castShadow>
        <cylinderGeometry args={[0.17, 0.24, 0.55, 8]} />
      </mesh>
      <mesh position={[0, 0.52, 0.13]} material={mat(C.white)}>
        <boxGeometry args={[0.26, 0.36, 0.04]} />
      </mesh>
      <mesh position={[0, 0.98, 0]} material={mat('#f0c7a0')} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.98, -0.06]} material={mat('#2b2420')}>
        <sphereGeometry args={[0.15, 10, 8]} />
      </mesh>
      {/* Nón lá */}
      <mesh position={[0, 1.13, 0]} material={mat('#e9d49a')} castShadow>
        <coneGeometry args={[0.36, 0.22, 12]} />
      </mesh>
      {/* Cái rổ */}
      <mesh position={[0.25, 0.5, 0.05]} material={mat(C.wood)}>
        <cylinderGeometry args={[0.13, 0.09, 0.1, 8]} />
      </mesh>
    </group>
  );
}
