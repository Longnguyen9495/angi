import { flyTo } from '../../motion/effects';

/** The dock's pantry ("Kho") button: products land there. */
export function pantryTarget(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-farm-dock="storage"]');
}

/**
 * Flies a product picture from a viewport point to the pantry button. Decoration only: the
 * pantry was updated by the reducer before this runs. Nothing happens under reduced motion or
 * when the dock is not on screen. A picture not loaded yet flies once it has decoded.
 */
export function flyToPantry(
  src: string,
  from: { x: number; y: number },
  opts: { reduced: boolean; delay?: number; size?: number },
): void {
  const target = pantryTarget();
  if (opts.reduced || !target) return;
  const size = opts.size ?? 34;
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  const go = () => {
    if (!document.contains(target)) return;
    Object.assign(img.style, {
      position: 'fixed',
      left: `${from.x - size / 2}px`,
      top: `${from.y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      pointerEvents: 'none',
    });
    document.body.appendChild(img);
    // flyTo clones the node at its rect; the source itself is only a measuring stand-in.
    flyTo(img, target, {
      reduced: false,
      duration: 640,
      onLand: () =>
        target.animate?.(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
          { duration: 260, easing: 'ease-out' },
        ),
    });
    img.remove();
  };
  const ready = img.complete || typeof img.decode !== 'function' ? Promise.resolve() : img.decode();
  const wait = opts.delay ?? 0;
  ready.then(
    () => (wait ? window.setTimeout(go, wait) : go()),
    () => {},
  );
}
