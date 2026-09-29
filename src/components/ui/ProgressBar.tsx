interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  /** Visible text next to the bar, e.g. "2/3 nguyên liệu". Always shown: colour is never the only cue. */
  valueText: string;
  tone?: 'primary' | 'north' | 'central' | 'south' | 'accent';
  /** Optional second segment (e.g. crops still growing) drawn hatched. */
  pending?: number;
  size?: 'sm' | 'md';
  hideLabel?: boolean;
}

/** Fill uses transform: scaleX so the tween never triggers layout. */
export function ProgressBar({
  value,
  max,
  label,
  valueText,
  tone = 'primary',
  pending = 0,
  size = 'md',
  hideLabel = false,
}: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const solid = Math.min(1, Math.max(0, value / safeMax));
  const hatched = Math.min(1, Math.max(0, (value + pending) / safeMax));
  return (
    <div className={`progress progress--${tone} progress--${size}`}>
      <div className={`progress__meta ${hideLabel ? 'sr-only-label' : ''}`}>
        <span className="progress__label">{label}</span>
        <span className="progress__value">{valueText}</span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(safeMax, value + pending)}
        aria-valuetext={valueText}
      >
        {pending > 0 && (
          <span
            className="progress__fill progress__fill--pending"
            style={{ transform: `scaleX(${hatched})` }}
          />
        )}
        <span className="progress__fill" style={{ transform: `scaleX(${solid})` }} />
      </div>
    </div>
  );
}
