import { useState, type CSSProperties } from 'react';
import type { Ingredient, ReelDish } from '../foodReel.types';
import { t } from '../../../i18n';
import { orbitPositions } from '../utils';

interface NodePos {
  x: number;
  y: number;
}

function IngredientNode({
  ing,
  pos,
  anchor,
  index,
  active,
  onActive,
}: {
  ing: Ingredient;
  pos: NodePos;
  anchor: NodePos;
  index: number;
  active: boolean;
  onActive: (id: string | null) => void;
}) {
  const dx = anchor.x - pos.x;
  const dy = anchor.y - pos.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const descId = `fr-ing-${ing.id}`;
  return (
    <li
      className={`fr-orbit__node ${active ? 'is-active' : ''}`}
      style={
        {
          '--x': `${pos.x.toFixed(1)}px`,
          '--y': `${pos.y.toFixed(1)}px`,
          '--i': index,
        } as CSSProperties
      }
    >
      {/* A DOM hairline (never SVG) from the label to its spot on the dish. */}
      <span
        className="fr-orbit__line"
        aria-hidden="true"
        style={{ width: `${length.toFixed(1)}px`, transform: `rotate(${angle.toFixed(1)}deg)` }}
      />
      <span
        className="fr-orbit__dot"
        aria-hidden="true"
        style={{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` }}
      />
      <button
        type="button"
        className="fr-orbit__chip"
        aria-describedby={active ? descId : undefined}
        aria-expanded={active}
        onPointerEnter={() => onActive(ing.id)}
        onFocus={() => onActive(ing.id)}
        onClick={() => onActive(active ? null : ing.id)}
      >
        <span className="fr-orbit__no" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        {ing.name}
      </button>
      {active && ing.description && (
        <p id={descId} className="fr-orbit__desc" role="note">
          {ing.description}
        </p>
      )}
    </li>
  );
}

interface IngredientOrbitProps {
  dish: ReelDish;
  size: number;
  onKeepOpen: (open: boolean) => void;
}

/** Scene D (desktop): ingredient layers orbiting the centre dish. */
export function IngredientOrbit({ dish, size, onKeepOpen }: IngredientOrbitProps) {
  const [active, setActive] = useState<string | null>(null);
  const list = dish.ingredients.slice(0, 7);
  const pos = orbitPositions(list.length, size);
  return (
    <div
      className="fr-orbit"
      style={{ '--fr-size': `${size}px` } as CSSProperties}
      onPointerEnter={() => onKeepOpen(true)}
      onPointerLeave={() => {
        setActive(null);
        onKeepOpen(false);
      }}
      onFocus={() => onKeepOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onKeepOpen(false);
      }}
    >
      <p className="sr-only">{t.reel.ingredients.of(dish.name)}</p>
      <ul className="fr-orbit__list" aria-label={t.reel.ingredients.of(dish.name)}>
        {list.map((ing, i) => (
          <IngredientNode
            key={ing.id}
            ing={ing}
            index={i}
            pos={pos[i]!}
            anchor={{ x: (ing.anchor!.x - 0.5) * size, y: (ing.anchor!.y - 0.5) * size }}
            active={active === ing.id}
            onActive={setActive}
          />
        ))}
      </ul>
    </div>
  );
}

/** Scene D (touch/tablet): tap-first ingredient rail under the dish. */
export function IngredientRail({ dish, inline = false }: { dish: ReelDish; inline?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const current = dish.ingredients.find((i) => i.id === active);
  return (
    <div className={`fr-rail ${inline ? 'fr-rail--inline' : ''}`}>
      <ul className="fr-rail__list" aria-label={t.reel.ingredients.of(dish.name)}>
        {dish.ingredients.map((ing) => (
          <li key={ing.id}>
            <button
              type="button"
              className={`fr-rail__chip ${active === ing.id ? 'is-active' : ''}`}
              aria-pressed={active === ing.id}
              onClick={() => setActive(active === ing.id ? null : ing.id)}
            >
              {ing.name}
            </button>
          </li>
        ))}
      </ul>
      <p className="fr-rail__desc" aria-live="polite">
        {current ? current.description : ''}
      </p>
    </div>
  );
}
