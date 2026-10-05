import { ArrowsClockwise } from '@phosphor-icons/react';
import type { Ref } from 'react';
import { t } from '../../../i18n';

interface SpinControlProps {
  busy: boolean;
  onSpin: () => void;
  label?: string;
  ref?: Ref<HTMLButtonElement>;
  /** Spins left (free today + bought); null until the server answers. */
  quota?: { free: number; credits: number } | null;
}

/** The single primary CTA of the idle scene. */
export function SpinControl({
  busy,
  onSpin,
  label = t.reel.spin.label,
  ref,
  quota = null,
}: SpinControlProps) {
  const left = quota ? quota.free + quota.credits : null;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`fr-spin ${busy ? 'is-busy' : ''}`}
        onClick={() => {
          if (!busy) onSpin();
        }}
        aria-disabled={busy}
        aria-describedby={quota ? 'fr-spin-quota' : undefined}
      >
        <span className="fr-spin__ring" aria-hidden="true" />
        <ArrowsClockwise className="fr-spin__icon" aria-hidden="true" size={20} />
        <span className="fr-spin__label">{busy ? t.reel.spin.busy : label}</span>
        {left !== null && (
          <span className={`fr-spin__quota${left === 0 ? ' is-empty' : ''}`} aria-hidden="true">
            {left > 99 ? '99+' : left}
          </span>
        )}
      </button>
      {quota && (
        <span id="fr-spin-quota" className="sr-only">
          {t.reel.quota.badge(quota.free, quota.credits)}
        </span>
      )}
    </>
  );
}

export function SceneCounter({ current, total }: { current: number; total: number }) {
  return (
    <p className="fr-counter" aria-label={t.reel.spin.counter(current, total)}>
      <span className="fr-counter__now">{String(current).padStart(3, '0')}</span>
      <span className="fr-counter__sep" aria-hidden="true">
        /
      </span>
      <span className="fr-counter__all">{String(total).padStart(3, '0')}</span>
    </p>
  );
}
