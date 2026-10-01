import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { CropIcon } from '../../../components/ui/CropIcon';
import type { CropId } from '../../../data/types';
import type { FarmSceneApi } from '../../farm-anim/FarmScene';

/**
 * Drag a seed from a chip and drop it on a plot of the painted farm. A press that doesn't move
 * counts as a tap (the caller decides what a tap does). While dragging, the plot under the seed
 * lights up in the scene.
 */
export function useSeedDrag(
  api: () => FarmSceneApi | null,
  onDrop: (plotId: number, crop: CropId) => void,
  onTap: (crop: CropId) => void,
) {
  const [ghost, setGhost] = useState<{ crop: CropId; x: number; y: number } | null>(null);
  const drag = useRef<{ crop: CropId; x0: number; y0: number; moved: boolean } | null>(null);
  const handlers = useRef({ onDrop, onTap, api });
  useEffect(() => {
    handlers.current = { onDrop, onTap, api };
  });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
      d.moved = true;
      setGhost({ crop: d.crop, x: e.clientX, y: e.clientY });
      handlers.current
        .api()
        ?.dropTarget(handlers.current.api()?.plotAtClient(e.clientX, e.clientY) ?? null);
    };
    const up = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      setGhost(null);
      const scene = handlers.current.api();
      scene?.dropTarget(null);
      if (!d.moved) return handlers.current.onTap(d.crop);
      const plot = scene?.plotAtClient(e.clientX, e.clientY) ?? null;
      if (plot !== null) handlers.current.onDrop(plot, d.crop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const start = (crop: CropId) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    drag.current = { crop, x0: e.clientX, y0: e.clientY, moved: false };
  };

  const ghostEl = ghost
    ? createPortal(
        <span className="fj-seed-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <CropIcon crop={ghost.crop} />
        </span>,
        document.body,
      )
    : null;

  return { start, ghost: ghostEl, dragging: ghost !== null };
}
