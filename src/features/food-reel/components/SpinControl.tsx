import { ArrowsClockwise } from '@phosphor-icons/react';
import type { Ref } from 'react';
import { t } from '../../../i18n';

interface SpinControlProps {
  busy: boolean;
  onSpin: () => void;
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** The single primary CTA of the idle scene. */
export function SpinControl({ busy, onSpin, label = t.reel.spin.label, ref }: SpinControlProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={`fr-spin ${busy ? 'is-busy' : ''}`}
      onClick={() => {
        if (!busy) onSpin();
      }}
      aria-disabled={busy}
    >
      <span className="fr-spin__ring" aria-hidden="true" />
      <ArrowsClockwise className="fr-spin__icon" aria-hidden="true" size={20} />
      <span className="fr-spin__label">{busy ? t.reel.spin.busy : label}</span>
    </button>
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
