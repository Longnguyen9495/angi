import type { PointerEvent } from 'react';

/**
 * Tactile feedback for the Journey's buttons, delegated from one listener:
 * a ripple from the press point, a springy "pop", and per-button flourishes
 * chosen by `data-fx` — "splash" (water drops) and "burst" (harvest seeds).
 * Pure DOM decoration: the spans are aria-hidden and remove themselves.
 */
const TARGETS = '.fj-nav__item, .fj-view-switch button, [data-fx]';

function spawn(
  host: HTMLElement,
  className: string,
  style: Record<string, string>,
  owner?: HTMLElement,
) {
  const el = document.createElement('span');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
  const done = () => (owner ?? el).remove();
  el.addEventListener('animationend', done, { once: true });
  // Safety net if the animation never runs (hidden tab, display: none).
  window.setTimeout(done, 1400);
  host.appendChild(el);
}

export function pressFx(e: PointerEvent<HTMLElement>, reduced: boolean) {
  if (reduced || e.button !== 0) return;
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(TARGETS);
  if (!btn || btn.disabled || !e.currentTarget.contains(btn)) return;

  const r = btn.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  // Radius that reaches the farthest corner from the press point.
  const size = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));

  btn.classList.add('fx-host');
  // The ripple is clipped to the button's shape; the particles below are not.
  const clip = document.createElement('span');
  clip.className = 'fx-clip';
  clip.setAttribute('aria-hidden', 'true');
  btn.appendChild(clip);
  spawn(
    clip,
    'fx-ripple',
    { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` },
    clip,
  );

  // Restart the pop even on rapid repeat presses.
  btn.classList.remove('fx-pop');
  void btn.offsetWidth;
  btn.classList.add('fx-pop');

  const kind = btn.dataset.fx;
  if (kind === 'splash' || kind === 'burst') {
    const n = kind === 'splash' ? 7 : 10;
    for (let i = 0; i < n; i++) {
      const spread = kind === 'splash' ? Math.PI * 0.9 : Math.PI * 2;
      const start = kind === 'splash' ? -Math.PI / 2 - spread / 2 : 0;
      const a = start + (spread * (i + 0.5)) / n + (Math.random() - 0.5) * 0.35;
      const dist = 34 + Math.random() * 30;
      // On a fixed layer: the button may disable (dim) or reflow the moment it acts.
      spawn(document.body, `fx-particle fx-particle--${kind}${i % 3 ? '' : ' is-alt'}`, {
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
        '--dx': `${Math.cos(a) * dist}px`,
        '--dy': `${Math.sin(a) * dist}px`,
        '--rot': `${Math.round(Math.random() * 360)}deg`,
        'animation-delay': `${Math.round(Math.random() * 60)}ms`,
      });
    }
  }
}
