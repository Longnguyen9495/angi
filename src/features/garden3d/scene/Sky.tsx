import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  MeshStandardMaterial,
  Color,
  DirectionalLight,
  Group,
  Points,
  ShaderMaterial,
} from 'three';
import { rng } from '../layout';
import type { SkyLook } from '../sky';

/** A big inside-out sphere with a vertical gradient (no textures, one draw call). */
function Dome({ look }: { look: SkyLook }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new Color() }, bottom: { value: new Color() } },
        vertexShader: /* glsl */ `
          varying float vH;
          void main() {
            vH = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 bottom;
          varying float vH;
          void main() {
            float t = smoothstep(-0.75, 0.55, vH);
            gl_FragColor = vec4(mix(bottom, top, t), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  useLayoutEffect(() => {
    mat.uniforms.top!.value.set(look.top);
    mat.uniforms.bottom!.value.set(look.bottom);
  }, [mat, look.top, look.bottom]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[80, 24, 12]} />
    </mesh>
  );
}

const cloudMats = new Map<string, MeshStandardMaterial>();

/** Soft, smooth-shaded, slightly self-lit so clouds stay ivory on the shadow side. */
function cloudMaterial(color: string) {
  let m = cloudMats.get(color);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
      emissive: color,
      emissiveIntensity: 0.28,
    });
    cloudMats.set(color, m);
  }
  return m;
}

/** Puffy clouds drifting slowly around (and under) the island. */
function Clouds({ count, color, reduced }: { count: number; color: string; reduced: boolean }) {
  const group = useRef<Group>(null);
  const clouds = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.4;
      const d = 24 + r() * 12;
      // Keep clouds out of the camera side above the island (they would block the view).
      const front = Math.sin(a) > 0.35;
      const below = front || i % 3 === 0;
      return {
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        y: below ? -5 - r() * 4 : 1 + r() * 6,
        s: 1.4 + r() * 1.8,
        puffs: 3 + Math.floor(r() * 3),
        seed: i,
      };
    });
  }, [count]);
  useFrame((_, dt) => {
    if (!reduced && group.current) group.current.rotation.y += dt * 0.006;
  });
  return (
    <group ref={group}>
      {clouds.map((c) => {
        const r = rng(100 + c.seed);
        return (
          <group key={c.seed} position={[c.x, c.y, c.z]} scale={c.s}>
            {Array.from({ length: c.puffs }, (_, k) => (
              <mesh
                key={k}
                position={[(k - c.puffs / 2) * 0.9, r() * 0.35, (r() - 0.5) * 0.6]}
                scale={0.7 + r() * 0.6}
                material={cloudMaterial(color)}
              >
                <icosahedronGeometry args={[1, 2]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Stars as points on the dome; fade in with the night. */
function Stars({ visible }: { visible: boolean }) {
  const geo = useMemo(() => {
    const r = rng(77);
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const y = 0.08 + r() * 0.92;
      const rr = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * rr * 70, y * 70, Math.sin(a) * rr * 70], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return g;
  }, []);
  if (!visible) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial
        color="#fff6dc"
        size={1.6}
        sizeAttenuation={false}
        fog={false}
        transparent
        opacity={0.85}
      />
    </points>
  );
}

/** Fireflies over the grass at night — additive dots bobbing on their own paths. */
function Fireflies({ reduced }: { reduced: boolean }) {
  const ref = useRef<Points>(null);
  const seeds = useMemo(() => {
    const r = rng(91);
    return Array.from({ length: 28 }, () => ({
      x: (r() - 0.5) * 13,
      z: (r() - 0.5) * 13,
      y: 0.4 + r() * 1.4,
      p: r() * 10,
      s: 0.3 + r() * 0.5,
    }));
  }, []);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(seeds.length * 3), 3));
    return g;
  }, [seeds]);
  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const t = reduced ? 0 : clock.elapsedTime;
    const attr = pts.geometry.attributes.position as BufferAttribute;
    seeds.forEach((f, i) => {
      attr.setXYZ(
        i,
        f.x + Math.sin(t * f.s + f.p) * 0.8,
        f.y + Math.sin(t * f.s * 1.7 + f.p) * 0.3,
        f.z + Math.cos(t * f.s * 0.8 + f.p) * 0.8,
      );
    });
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#ffe28a"
        size={0.16}
        transparent
        opacity={0.9}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** Sun (or moon) light, soft fill, fog colour — all driven by the local hour. */
function Lights({ look, shadowSize }: { look: SkyLook; shadowSize: number }) {
  const sun = useRef<DirectionalLight>(null);
  // One key light from the upper left of the default view (camera looks from +z),
  // drifting a little with the hour so mornings and evenings still read differently.
  const pos = useMemo<[number, number, number]>(() => {
    const d = 24;
    const el = Math.min(1.15, Math.max(0.32, look.elevation));
    const sw = look.azimuth * 0.3;
    return [
      -Math.cos(el) * d * Math.cos(sw),
      Math.sin(el) * d,
      Math.cos(el) * d * (0.55 + Math.sin(sw) * 0.4),
    ];
  }, [look.azimuth, look.elevation]);
  useLayoutEffect(() => {
    const s = sun.current;
    if (!s || !shadowSize) return;
    s.shadow.mapSize.set(shadowSize, shadowSize);
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.035;
    const cam = s.shadow.camera;
    cam.left = -12;
    cam.right = 12;
    cam.top = 12;
    cam.bottom = -12;
    cam.near = 2;
    cam.far = 60;
    cam.updateProjectionMatrix();
    s.shadow.needsUpdate = true;
  }, [shadowSize]);
  return (
    <>
      <fog attach="fog" args={[look.fog, 32, 80]} />
      {/* Sky fill from above, cool bounce from below: shadows never go flat black. */}
      <hemisphereLight
        args={[
          look.night ? '#5a6690' : '#d9ecff',
          look.night ? '#241d18' : '#5f6a55',
          look.ambient * (look.night ? 1.9 : 1.25),
        ]}
      />
      <ambientLight intensity={look.ambient * 0.18} color={look.night ? '#8a90c0' : '#fff4e2'} />
      <directionalLight
        ref={sun}
        position={pos}
        color={look.sun}
        intensity={look.sunIntensity * 2.1}
        castShadow={shadowSize > 0}
      />
    </>
  );
}

/** Everything around the island that the hour changes. */
export function Sky({
  look,
  clouds,
  shadowSize,
  reduced,
}: {
  look: SkyLook;
  clouds: number;
  shadowSize: number;
  reduced: boolean;
}) {
  return (
    <>
      <Dome look={look} />
      <Lights look={look} shadowSize={shadowSize} />
      <Clouds count={clouds} color={look.cloud} reduced={reduced} />
      <Stars visible={look.night} />
      {look.night && <Fireflies reduced={reduced} />}
    </>
  );
}
