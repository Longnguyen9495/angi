import { CaretUp, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import type { CropDef, CropId, CropKind } from '../../../data/types';
import { t } from '../../../i18n';

const m = t.journey.game.tray;
const KINDS: CropKind[] = ['veg', 'tree', 'mushroom'];

/** Quick seeds next to the chosen one (phones show fewer, see farm-game.css). */
const QUICK = 5;

/**
 * The seed tray on the farm: the chosen seed, large with its name and count, a few quick
 * picks, and "all seeds" opening a grid grouped by kind. Every seed can be tapped (pick, or
 * plant into the open plot) or dragged onto a plot, as before.
 */
export function SeedTray({
  seeds,
  counts,
  active,
  onDragStart,
  onPick,
}: {
  seeds: CropDef[];
  counts: Record<CropId, number>;
  active: CropId | null;
  onDragStart: (crop: CropId) => (e: ReactPointerEvent) => void;
  onPick: (crop: CropId) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Close the grid on Escape or a press outside it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  if (seeds.length === 0) return null;
  const chosen = seeds.find((c) => c.id === active) ?? seeds[0]!;
  // Quick picks: the most plentiful others, so the useful ones are a tap away.
  const quick = seeds
    .filter((c) => c.id !== chosen.id)
    .sort((a, b) => counts[b.id] - counts[a.id])
    .slice(0, QUICK);

  const seed = (c: CropDef, variant: 'chosen' | 'quick' | 'grid') => (
    <button
      key={c.id}
      type="button"
      role="radio"
      aria-checked={c.id === chosen.id}
      aria-label={m.seedLabel(c.seedName, counts[c.id])}
      className={`fg-seed fg-seed--${variant}${c.id === chosen.id ? ' is-on' : ''}`}
      onPointerDown={onDragStart(c.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(c.id);
          if (variant === 'grid') setOpen(false);
        }
      }}
      onClick={() => variant === 'grid' && setOpen(false)}
      title={c.seedName}
    >
      <CropIcon crop={c.id} size={variant === 'chosen' ? 34 : variant === 'grid' ? 40 : 28} />
      {variant !== 'quick' && <span className="fg-seed__name">{c.name}</span>}
      <span className="fg-seed__count">×{counts[c.id]}</span>
    </button>
  );

  return (
    <div className="fg-seedtray" ref={box}>
      <div className="fg-seeds" role="radiogroup" aria-label={t.journey.garden.farmSeedsLabel}>
        {seed(chosen, 'chosen')}
        {quick.map((c) => seed(c, 'quick'))}
        {seeds.length > 1 && (
          <button
            type="button"
            className="fg-seed fg-seed--all"
            aria-expanded={open}
            aria-controls="fg-seedgrid"
            onClick={() => setOpen((o) => !o)}
          >
            <CaretUp size={16} weight="bold" aria-hidden="true" />
            <span>{m.all(seeds.length)}</span>
          </button>
        )}
      </div>

      {open && (
        <div
          id="fg-seedgrid"
          className="fg-seedgrid"
          role="dialog"
          aria-label={m.pickerTitle}
          data-game-overlay
        >
          <div className="fg-seedgrid__head">
            <p className="fg-seedgrid__title">{m.pickerTitle}</p>
            <p className="fg-seedgrid__hint">{m.pickerHint}</p>
            <button
              type="button"
              className="fg-round fg-seedgrid__close"
              aria-label={t.journey.game.close}
              onClick={() => setOpen(false)}
            >
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          {KINDS.map((kind) => {
            const list = seeds.filter((c) => c.kind === kind);
            if (list.length === 0) return null;
            return (
              <section key={kind} className="fg-seedgrid__group" aria-label={m.kinds[kind]}>
                <h3 className="fg-seedgrid__kind">{m.kinds[kind]}</h3>
                <div className="fg-seedgrid__list" role="radiogroup" aria-label={m.kinds[kind]}>
                  {list.map((c) => seed(c, 'grid'))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
