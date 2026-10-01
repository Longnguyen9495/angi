import type { CSSProperties } from 'react';
import { t } from '../../../i18n';
import type { Flavor } from '../foodReel.types';

const ROWS: { key: keyof Flavor; label: string }[] = [
  { key: 'spicy', label: t.reel.flavor.spicy },
  { key: 'sweet', label: t.reel.flavor.sweet },
  { key: 'rich', label: t.reel.flavor.rich },
  { key: 'fresh', label: t.reel.flavor.fresh },
  { key: 'crunchy', label: t.reel.flavor.crunchy },
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
