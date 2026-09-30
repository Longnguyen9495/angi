import { ArrowSquareOut, MapPin, Moped } from '@phosphor-icons/react';
import { useId } from 'react';
import { SHOPEEFOOD_CITIES, orderLinks, type ShopeeCity } from '../data/orderLinks';

interface OrderLinksProps {
  dishName: string;
  city: ShopeeCity;
  onCity: (city: ShopeeCity) => void;
  /** Story layout is quieter: no heading kicker. */
  compact?: boolean;
}

/** Map + delivery apps, each opening a search for this dish in a new tab (or the app). */
export function OrderLinks({ dishName, city, onCity, compact = false }: OrderLinksProps) {
  const cityId = useId();
  const links = orderLinks(dishName, city);
  return (
    <section
      className={`fr-order ${compact ? 'fr-order--compact' : ''}`}
      aria-labelledby={`${cityId}-t`}
    >
      <div className="fr-order__head">
        <h3 id={`${cityId}-t`} className="fr-order__title">
          Tìm quán &amp; đặt món · {dishName}
        </h3>
        <label className="fr-order__city" htmlFor={cityId}>
          <span>ShopeeFood giao ở</span>
          <select id={cityId} value={city} onChange={(e) => onCity(e.target.value as ShopeeCity)}>
            {SHOPEEFOOD_CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="fr-order__list">
        {links.map((l) => (
          <li key={l.id}>
            <a
              className={`fr-order__link fr-order__link--${l.id}`}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="fr-order__icon" aria-hidden="true">
                {l.id === 'maps' ? (
                  <MapPin size={18} weight="fill" />
                ) : (
                  <Moped size={18} weight="fill" />
                )}
              </span>
              <span className="fr-order__text">
                <span className="fr-order__name">{l.label}</span>
                <span className="fr-order__note">{l.note}</span>
              </span>
              <ArrowSquareOut className="fr-order__out" aria-hidden="true" size={14} />
              <span className="sr-only"> (mở tab mới)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="fr-order__fine">
        Mở trang tìm kiếm của từng dịch vụ với tên món. Giá và quán do họ cung cấp.
      </p>
    </section>
  );
}
