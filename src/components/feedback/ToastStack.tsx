import { X } from '@phosphor-icons/react';
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { ToastInput, ToastTone } from '../../state/context';
import { t as tr } from '../../i18n';
import { motionReduced } from './motion';
import './toast.css';

/** How a toast leaves: fade down, or flung sideways by a swipe. */
export type ToastLeave = 'out' | 'left' | 'right';

export interface ToastItem extends ToastInput {
  id: number;
  tone: ToastTone;
  ms: number;
  paused: boolean;
  leaving: ToastLeave | null;
}

const KICKER: Record<ToastTone, string> = {
  info: tr.account.toast.kicker.info,
  success: tr.account.toast.kicker.success,
  warning: tr.account.toast.kicker.warning,
  error: tr.account.toast.kicker.error,
  reward: tr.account.toast.kicker.reward,
};

const SPARKS = 10;
/** A swipe this far (px) or this fast (px/ms) dismisses. */
const SWIPE_DIST = 90;
const SWIPE_SPEED = 0.6;

const RING = 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18';

/**
 * Static glyphs (the project never animates SVG nodes): the ring and the mark
 * sit in separate HTML spans, and CSS reveals or moves those spans.
 */
function ToneIcon({ tone }: { tone: ToastTone }) {
  const glyph = (cls: string, body: ReactNode) => (
    <span className={`toast__glyph ${cls}`}>
      <svg viewBox="0 0 24 24">{body}</svg>
    </span>
  );
  let parts: ReactNode;
  switch (tone) {
    case 'success':
      parts = (
        <>
          {glyph('toast__glyph--ring', <path d={RING} />)}
          {glyph('toast__glyph--mark', <path d="M8 12.4l2.7 2.7L16.2 9.6" />)}
        </>
      );
      break;
    case 'error':
      parts = (
        <>
          {glyph('toast__glyph--ring', <path d={RING} />)}
          {glyph('toast__glyph--mark', <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />)}
        </>
      );
      break;
    case 'warning':
      parts = (
        <>
          {glyph('toast__glyph--ring', <path d="M12 3.6L21 19.4H3Z" />)}
          {glyph('toast__glyph--mark', <path d="M12 9.8v4.2M12 16.9h.01" />)}
        </>
      );
      break;
    case 'reward':
      parts = glyph(
        'toast__glyph--star',
        <path d="M12 2.8c.7 4.6 3 6.9 7.6 7.6-4.6.7-6.9 3-7.6 7.6-.7-4.6-3-6.9-7.6-7.6 4.6-.7 6.9-3 7.6-7.6Z" />,
      );
      break;
    default:
      parts = (
        <>
          {glyph('toast__glyph--ring', <path d={RING} />)}
          {glyph('toast__glyph--mark', <path d="M12 11v5.2M12 7.9h.01" />)}
        </>
      );
  }
  return (
    <span className="toast__icon" aria-hidden="true">
      {parts}
      {tone === 'reward' &&
        Array.from({ length: SPARKS }, (_, i) => (
          <i
            key={i}
            className="toast__spark"
            style={
              {
                '--a': `${i * (360 / SPARKS) + 8}deg`,
                '--d': `${20 + (i % 3) * 7}px`,
              } as CSSProperties
            }
          />
        ))}
    </span>
  );
}

interface CardProps {
  t: ToastItem;
  onDismiss: (id: number, how?: ToastLeave) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}

function ToastCard({ t, onDismiss, onPause, onResume }: CardProps) {
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; dx: number; at: number; pointer: number } | null>(null);

  const release = (dismiss: boolean) => {
    const node = el.current;
    const d = drag.current;
    drag.current = null;
    if (!node || !d) return;
    node.classList.remove('is-dragging');
    if (dismiss) {
      onDismiss(t.id, d.dx > 0 ? 'right' : 'left');
      return;
    }
    // Spring back to rest.
    node.classList.add('is-snapping');
    node.style.translate = '';
    node.style.opacity = '';
    window.setTimeout(() => node.classList.remove('is-snapping'), 260);
  };

  return (
    <div
      ref={el}
      className={`toast toast--${t.tone}${t.paused ? ' is-paused' : ''}`}
      data-leave={t.leaving ?? undefined}
      style={{ '--toast-ms': `${t.ms}ms` } as CSSProperties}
      aria-hidden={t.leaving ? true : undefined}
      onPointerEnter={() => onPause(t.id)}
      onPointerLeave={() => {
        if (!drag.current) onResume(t.id);
      }}
      onFocus={() => onPause(t.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onResume(t.id);
      }}
      onPointerDown={(e) => {
        if (t.leaving || (e.target as HTMLElement).closest('button')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        e.currentTarget.classList.add('is-dragging');
        drag.current = { x: e.clientX, dx: 0, at: performance.now(), pointer: e.pointerId };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.pointer !== e.pointerId) return;
        d.dx = e.clientX - d.x;
        // Rubber band: free to the sides, the card fades as it travels.
        e.currentTarget.style.translate = `${d.dx}px 0`;
        e.currentTarget.style.opacity = String(1 - Math.min(1, Math.abs(d.dx) / 260) * 0.75);
      }}
      onPointerUp={() => {
        const d = drag.current;
        if (!d) return;
        const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.at);
        release(Math.abs(d.dx) > SWIPE_DIST || (Math.abs(d.dx) > 24 && speed > SWIPE_SPEED));
        onResume(t.id);
      }}
      onPointerCancel={() => release(false)}
    >
      <ToneIcon tone={t.tone} />
      <div className="toast__body">
        <span className="toast__kicker">{KICKER[t.tone]}</span>
        <p className="toast__msg">{t.message}</p>
      </div>
      <div className="toast__side">
        {t.action && (
          <button
            type="button"
            className="toast__action"
            onClick={() => {
              t.action?.onClick();
              onDismiss(t.id);
            }}
          >
            {t.action.label}
          </button>
        )}
        <button
          type="button"
          className="toast__close"
          aria-label={tr.account.toast.dismiss}
          onClick={() => onDismiss(t.id)}
        >
          <X aria-hidden="true" size={15} weight="bold" />
        </button>
      </div>
      <span className="toast__timer" aria-hidden="true" />
    </div>
  );
}

interface StackProps {
  toasts: ToastItem[];
  onDismiss: (id: number, how?: ToastLeave) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}

/**
 * The visible stack. Cards that move because a neighbour arrived or left
 * glide to their new place (FLIP on the slot, so it never fights the card's
 * own enter/exit keyframes).
 */
export function ToastStack({ toasts, ...handlers }: StackProps) {
  const slots = useRef(new Map<number, HTMLDivElement>());
  const tops = useRef(new Map<number, number>());

  useLayoutEffect(() => {
    const next = new Map<number, number>();
    const still = motionReduced();
    slots.current.forEach((slot, id) => {
      const top = slot.offsetTop;
      next.set(id, top);
      const prev = tops.current.get(id);
      if (still || prev === undefined || prev === top || typeof slot.animate !== 'function') return;
      slot.animate([{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }], {
        duration: 380,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    });
    tops.current = next;
  });

  return (
    <div className="toast-region" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-slot"
          ref={(node) => {
            if (node) slots.current.set(t.id, node);
            else slots.current.delete(t.id);
          }}
        >
          <ToastCard t={t} {...handlers} />
        </div>
      ))}
    </div>
  );
}
