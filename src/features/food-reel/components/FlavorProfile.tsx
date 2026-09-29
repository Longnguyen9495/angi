import type { CSSProperties } from 'react';
import type { Flavor } from '../foodReel.types';

const ROWS: { key: keyof Flavor; label: string }[] = [
  { key: 'spicy', label: 'Cay' },
  { key: 'sweet', label: 'Ngọt' },
  { key: 'rich', label: 'Béo' },
  { key: 'fresh', label: 'Thanh' },
  { key: 'crunchy', label: 'Giòn' },
];

/** Five-step scales with numbers — never colour alone. */
export function FlavorProfile({ flavor }: { flavor: Flavor }) {
  return (
    <dl className="fr-flavor">
      {ROWS.map(({ key, label }, i) => (
        <div key={key} className="fr-flavor__row" style={{ '--i': i } as CSSProperties}>
          <dt className="fr-flavor__label">{label}</dt>
          <dd className="fr-flavor__value">
            <span className="fr-flavor__pips" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`fr-flavor__pip ${n <= flavor[key] ? 'is-on' : ''}`} />
              ))}
            </span>
            <span className="fr-flavor__num">{flavor[key]}/5</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
