export interface FlightHandle {
  finished: Promise<void>;
  cancel: () => void;
}

const done: FlightHandle = { finished: Promise.resolve(), cancel() {} };

function usable(r: DOMRect | null | undefined): r is DOMRect {
  return !!r && r.width > 1 && r.height > 1;
}

/**
 * Shared-element "flight": a fixed-position image laid out at the destination
 * rect and animated from the inverse transform (FLIP). Only transform, opacity
 * and border-radius change. The ghost is always removed, even when cancelled.
 */
export function flyImage(opts: {
  src: string;
  from: DOMRect | null | undefined;
  to: DOMRect | null | undefined;
  duration: number;
  radiusFrom?: string;
  radiusTo?: string;
  easing?: string;
}): FlightHandle {
  const { src, from, to, duration } = opts;
  if (!usable(from) || !usable(to) || typeof document.body.animate !== 'function') return done;

  const ghost = document.createElement('img');
  ghost.src = src;
  ghost.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.className = 'fr-flight';
  Object.assign(ghost.style, {
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
  });
  document.body.appendChild(ghost);

  const sx = from.width / to.width;
  const sy = from.height / to.height;
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const anim = ghost.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        borderRadius: opts.radiusFrom ?? '50%',
      },
      { transform: 'none', borderRadius: opts.radiusTo ?? '28px' },
    ],
    { duration, easing: opts.easing ?? 'cubic-bezier(.7,0,.18,1)', fill: 'forwards' },
  );

  let settled = false;
  let resolveFn: () => void = () => {};
  const finished = new Promise<void>((resolve) => {
    resolveFn = resolve;
  });
  const finish = () => {
    if (settled) return;
    settled = true;
    ghost.remove();
    resolveFn();
  };
  anim.onfinish = finish;
  anim.oncancel = finish;
  return {
    finished,
    cancel() {
      anim.cancel();
      finish();
    },
  };
}
