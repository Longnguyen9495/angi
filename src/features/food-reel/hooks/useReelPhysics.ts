import { useCallback, useEffect, useRef, useState } from 'react';
import { ReelEngine, type EngineCallbacks, type FrameState } from '../engine/ReelEngine';

type FrameListener = (frame: FrameState, now: number) => void;

/**
 * Owns the ReelEngine and a single requestAnimationFrame loop. Frame
 * listeners write styles straight to DOM nodes, so React only re-renders when
 * the centred item changes — never once per frame.
 */
export function useReelPhysics(opts: {
  initial: number;
  reduced: boolean;
  running: boolean;
  callbacks: EngineCallbacks;
}) {
  const { initial, reduced, running, callbacks } = opts;
  const [engine] = useState(() => new ReelEngine(initial, reduced));
  const listeners = useRef(new Set<FrameListener>());

  useEffect(() => {
    engine.setCallbacks(callbacks);
  }, [engine, callbacks]);

  useEffect(() => {
    engine.setReduced(reduced);
  }, [engine, reduced]);

  useEffect(() => {
    if (!running) return;
    let id = 0;
    let active = !document.hidden;
    // One clock for everything: commands (spinTo, drag) also use performance.now().
    const loop = () => {
      const now = performance.now();
      const frame = engine.step(now);
      listeners.current.forEach((l) => l(frame, now));
      if (active) id = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      const visible = !document.hidden;
      if (visible && !active) {
        active = true;
        id = requestAnimationFrame(loop);
      } else if (!visible) {
        active = false;
        cancelAnimationFrame(id);
      }
    };
    if (active) id = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      cancelAnimationFrame(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [engine, running]);

  const subscribe = useCallback((fn: FrameListener) => {
    const set = listeners.current;
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  }, []);

  return { engine, subscribe };
}
