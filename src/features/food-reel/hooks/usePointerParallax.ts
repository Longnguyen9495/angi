import { useEffect, type RefObject } from 'react';

/**
 * Writes the pointer position as CSS variables (--px, --py in −1…1) on the
 * root element, at most once per frame. CSS turns them into 1–2% background
 * drift and a ≤5° tilt of the centre dish. Off for touch and reduced motion.
 */
export function usePointerParallax(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
      return;
    }
    let frame = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
}
