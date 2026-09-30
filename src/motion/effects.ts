/** Hard cap on temporary particle nodes per burst (storyboard: 6–10). */
export const MAX_PARTICLES = 10;

export interface EffectHandle {
  cancel: () => void;
}

const noop: EffectHandle = { cancel() {} };

function canAnimate(el: Element): el is HTMLElement {
  return typeof (el as HTMLElement).animate === 'function';
}

/**
 * Soil crumbs as plain <span>s animated with the Web Animations API
 * (transform + opacity only). Nodes remove themselves on finish or cancel.
 */
export function burstSoil(container: HTMLElement, count = 8, reduced = false): EffectHandle {
  if (reduced || !canAnimate(container)) return noop;
  const n = Math.min(Math.max(0, count), MAX_PARTICLES);
  const nodes: HTMLSpanElement[] = [];
  const anims: Animation[] = [];
  for (let i = 0; i < n; i++) {
    const dot = document.createElement('span');
    dot.className = 'soil-particle';
    dot.setAttribute('aria-hidden', 'true');
    container.appendChild(dot);
    nodes.push(dot);
    // Fan the crumbs across the upper half-circle, alternating near/far.
    const angle = Math.PI * (0.1 + (0.8 * i) / Math.max(1, n - 1));
    const dist = 22 + (i % 3) * 9;
    const dx = Math.cos(angle) * dist * (i % 2 ? 1 : -1);
    const dy = -Math.sin(angle) * dist * 0.9;
    const a = dot.animate(
      [
        { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx.toFixed(1)}px), ${dy.toFixed(1)}px) scale(0.9)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${(dx * 1.2).toFixed(1)}px), ${(dy * 0.2 + 6).toFixed(1)}px) scale(0.6)`,
          opacity: 0,
        },
      ],
      { duration: 460 + (i % 3) * 40, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
    );
    a.onfinish = () => dot.remove();
    anims.push(a);
  }
  return {
    cancel() {
      anims.forEach((a) => a.cancel());
      nodes.forEach((d) => d.remove());
    },
  };
}

/**
 * Flies a copy of `source` onto `target` using a fixed-position ghost node.
 * The real state has already been committed; this is purely decorative.
 */
export function flyTo(
  source: HTMLElement,
  target: HTMLElement,
  opts: { duration?: number; reduced?: boolean; onLand?: () => void } = {},
): EffectHandle {
  const { duration = 560, reduced = false, onLand } = opts;
  if (reduced || !canAnimate(source)) {
    onLand?.();
    return noop;
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.add('fly-ghost');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // A lifted midpoint gives the arc; rotation sells the "tossed seed".
  const lift = Math.min(-40, dy * 0.3 - 40);
  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    ghost.remove();
    onLand?.();
  };
  const anim = ghost.animate(
    [
      { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
      {
        transform: `translate(${dx * 0.5}px, ${lift}px) rotate(160deg) scale(1.05)`,
        opacity: 1,
        offset: 0.45,
      },
      { transform: `translate(${dx}px, ${dy}px) rotate(320deg) scale(0.55)`, opacity: 0.9 },
    ],
    { duration, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' },
  );
  anim.onfinish = land;
  return {
    cancel() {
      anim.cancel();
      land();
    },
  };
}

/** Restarts a one-shot CSS animation class (e.g. a single tray pulse). */
export function pulseOnce(el: HTMLElement | null, className = 'is-pulsing', reduced = false) {
  if (!el || reduced) return;
  el.classList.remove(className);
  // Force reflow so the same class can replay.
  void el.offsetWidth;
  el.classList.add(className);
  const clear = () => el.classList.remove(className);
  el.addEventListener('animationend', clear, { once: true });
}

/**
 * Water drops falling from a watering can's spout onto the soil. Same rules as
 * burstSoil: plain <span>s, transform + opacity only, capped, self-removing.
 */
export function sprinkle(container: HTMLElement, count = 8, reduced = false): EffectHandle {
  if (reduced || !canAnimate(container)) return noop;
  const n = Math.min(Math.max(0, count), MAX_PARTICLES);
  const nodes: HTMLSpanElement[] = [];
  const anims: Animation[] = [];
  for (let i = 0; i < n; i++) {
    const drop = document.createElement('span');
    drop.className = 'water-drop';
    drop.setAttribute('aria-hidden', 'true');
    container.appendChild(drop);
    nodes.push(drop);
    // Drops leave the spout in a narrow fan and land spread over the soil.
    const dx = (i - (n - 1) / 2) * 7 + ((i * 13) % 5) - 2;
    const fall = 46 + (i % 3) * 6;
    const a = drop.animate(
      [
        { transform: 'translate(0, 0) scale(0.6, 0.8)', opacity: 0 },
        {
          transform: `translate(${(dx * 0.3).toFixed(1)}px, 8px) scale(0.8, 1.2)`,
          opacity: 1,
          offset: 0.2,
        },
        {
          transform: `translate(${dx.toFixed(1)}px, ${fall}px) scale(1, 1.3)`,
          opacity: 0.9,
          offset: 0.85,
        },
        { transform: `translate(${dx.toFixed(1)}px, ${fall + 2}px) scale(1.8, 0.4)`, opacity: 0 },
      ],
      {
        duration: 520,
        delay: 160 + i * 55,
        easing: 'cubic-bezier(.5,0,.9,.6)',
        fill: 'both',
      },
    );
    a.onfinish = () => drop.remove();
    anims.push(a);
  }
  return {
    cancel() {
      anims.forEach((a) => a.cancel());
      nodes.forEach((d) => d.remove());
    },
  };
}
