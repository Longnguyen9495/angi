import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { PerspectiveCamera, Vector3, type Camera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraHandle {
  zoom: (factor: number) => void;
  reset: () => void;
  /** Glide the look-at point toward (x, z) — used when something is selected. */
  focus: (x: number, z: number) => void;
}

// Look slightly below the lawn so the island's thickness shows under it.
const TARGET = new Vector3(0, -0.5, -0.1);
const MIN_DIST = 8;
const MAX_DIST = 30;

/** Default distance: portrait screens need to stand further back to fit the island's width. */
/** Portrait screens get a wider lens so the island's width still fits. */
function fovFor(aspect: number): number {
  return aspect < 0.9 ? 52 : 38;
}

/** Stand far enough back that the buildings on both sides (±7.6 with perspective) fit the frame. */
function homeDistance(aspect: number): number {
  const half = Math.atan(Math.tan(((fovFor(aspect) / 2) * Math.PI) / 180) * aspect);
  // Portrait frames the width of the play area (buildings), not the whole rim.
  const need = aspect < 0.9 ? 7.0 : 8.2;
  return Math.min(MAX_DIST, Math.max(19, need / Math.tan(half)));
}

function applyLens(cam: Camera, aspect: number) {
  if (cam instanceof PerspectiveCamera) {
    cam.fov = fovFor(aspect);
    cam.updateProjectionMatrix();
  }
}

function homePosition(aspect: number): Vector3 {
  const d = homeDistance(aspect);
  // ~50° down from the horizon, a little turned so the buildings read in 3D.
  // Low enough to see building fronts and the island's thickness.
  const polar = aspect < 0.9 ? 0.86 : 1.0;
  const azim = 0.18;
  return new Vector3(
    TARGET.x + d * Math.sin(polar) * Math.sin(azim),
    TARGET.y + d * Math.cos(polar),
    TARGET.z + d * Math.sin(polar) * Math.cos(azim),
  );
}

/**
 * Orbit camera tuned for a page that also scrolls:
 * - one finger sideways turns the island, up/down scrolls the page (canvas has touch-action: pan-y);
 * - two fingers pinch-zoom; the mouse wheel zooms only with Ctrl (else the page scrolls);
 * - no panning, a floor on the tilt so the island's underside stays a backdrop.
 */
export function CameraRig({ handle, reduced }: { handle: Ref<CameraHandle>; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControls | null>(null);
  const goal = useRef<{ pos: Vector3 | null; target: Vector3 | null }>({ pos: null, target: null });

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.copy(TARGET);
    c.enablePan = false;
    c.enableDamping = !reduced;
    c.dampingFactor = 0.08;
    c.rotateSpeed = 0.6;
    c.zoomSpeed = 0.8;
    c.minDistance = MIN_DIST;
    c.maxDistance = MAX_DIST;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 1.22;
    const redraw = () => invalidate();
    c.addEventListener('change', redraw);
    controls.current = c;

    // Plain wheel scrolls the page; Ctrl/⌘ + wheel (and trackpad pinch, which sends ctrlKey) zooms.
    const el = gl.domElement;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
    };
    el.addEventListener('wheel', wheel, { capture: true });
    return () => {
      el.removeEventListener('wheel', wheel, { capture: true });
      c.removeEventListener('change', redraw);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate, reduced]);

  // Re-frame when the canvas changes shape (rotation, resize).
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    applyLens(camera, aspect);
    camera.position.copy(homePosition(aspect));
    controls.current?.target.copy(TARGET);
    controls.current?.update();
    invalidate();
  }, [aspect, camera, invalidate]);

  useImperativeHandle(
    handle,
    () => ({
      zoom(factor) {
        const c = controls.current;
        if (!c) return;
        const dir = camera.position.clone().sub(c.target);
        const d = Math.min(MAX_DIST, Math.max(MIN_DIST, dir.length() * factor));
        goal.current.pos = c.target.clone().add(dir.setLength(d));
        invalidate();
      },
      reset() {
        goal.current = { pos: homePosition(aspect), target: TARGET.clone() };
        invalidate();
      },
      focus(x, z) {
        const c = controls.current;
        if (!c) return;
        // Only nudge toward the thing: keep most of the island in view.
        const t = new Vector3(x * 0.35, TARGET.y, TARGET.z + (z - TARGET.z) * 0.35);
        const shift = t.clone().sub(c.target);
        goal.current = { pos: camera.position.clone().add(shift), target: t };
        invalidate();
      },
    }),
    [aspect, camera, invalidate],
  );

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const g = goal.current;
    const k = reduced ? 1 : 0.12;
    let moving = false;
    if (g.pos) {
      camera.position.lerp(g.pos, k);
      if (camera.position.distanceTo(g.pos) < 0.02) g.pos = null;
      else moving = true;
    }
    if (g.target) {
      c.target.lerp(g.target, k);
      if (c.target.distanceTo(g.target) < 0.02) g.target = null;
      else moving = true;
    }
    c.update();
    if (moving) invalidate();
  });

  return null;
}
