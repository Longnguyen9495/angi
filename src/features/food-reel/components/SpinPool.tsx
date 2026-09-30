import {
  Basket,
  BookmarkSimple,
  Check,
  MagnifyingGlass,
  PencilSimple,
} from '@phosphor-icons/react';
import { useDeferredValue, useMemo, useState } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { Sheet } from '../../../components/ui/Sheet';
import { CROPS } from '../../../data/game';
import type { CropId } from '../../../data/types';
import {
  formatReelPrice,
  POOL_MIN,
  poolDishes,
  reelDishes,
  REGION_LABEL,
} from '../data/reelCatalogue';
import type { ReelRegion } from '../foodReel.types';
import { useCanHover } from '../hooks/useViewport';
import { fold } from '../utils';

interface PoolSwitchProps {
  pooled: boolean;
  /** Set while spinning over the dishes that grant this seed (opened from the Journey). */
  crop?: CropId | null;
  /** Dishes in the Rổ that still exist in the catalogue. */
  size: number;
  /** Dishes still in play (fewer than `size` after "Loại & quay tiếp"). */
  left: number;
  total: number;
  disabled: boolean;
  onAll: () => void;
  onPool: () => void;
  onEdit: () => void;
}

/** Dock control: spin over everything, or only over the guest's Rổ quay. */
export function PoolSwitch({
  pooled,
  crop = null,
  size,
  left,
  total,
  disabled,
  onAll,
  onPool,
  onEdit,
}: PoolSwitchProps) {
  const usable = size >= POOL_MIN;
  if (crop) {
    return (
      <div className="fr-pool" role="group" aria-label="Quay trong">
        <button
          type="button"
          className="fr-pool__opt"
          aria-pressed={false}
          disabled={disabled}
          onClick={onAll}
        >
          Tất cả <span className="fr-pool__n">{total}</span>
        </button>
        <span className="fr-pool__opt fr-pool__opt--crop" aria-current="true">
          <CropIcon crop={crop} size={14} />
          {CROPS[crop].seedName} <span className="fr-pool__n">{left}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="fr-pool" role="group" aria-label="Quay trong">
      <button
        type="button"
        className="fr-pool__opt"
        aria-pressed={!pooled}
        disabled={disabled}
        onClick={onAll}
      >
        Tất cả <span className="fr-pool__n">{total}</span>
      </button>
      <button
        type="button"
        className="fr-pool__opt"
        aria-pressed={pooled}
        disabled={disabled}
        onClick={usable ? onPool : onEdit}
      >
        <Basket aria-hidden="true" size={14} />
        {usable ? (
          <>
            Rổ{' '}
            <span className="fr-pool__n">{pooled && left < size ? `${left}/${size}` : size}</span>
          </>
        ) : (
          'Chọn vài món'
        )}
      </button>
      {usable && (
        <button
          type="button"
          className="fr-pool__edit"
          aria-label="Sửa rổ quay"
          disabled={disabled}
          onClick={onEdit}
        >
          <PencilSimple aria-hidden="true" size={14} />
        </button>
      )}
    </div>
  );
}

type Filter = ReelRegion | 'all' | 'veg' | 'picked';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'picked', label: 'Trong rổ' },
  { id: 'north', label: REGION_LABEL.north },
  { id: 'central', label: REGION_LABEL.central },
  { id: 'south', label: REGION_LABEL.south },
  { id: 'world', label: REGION_LABEL.world },
  { id: 'veg', label: 'Món chay' },
];

interface PoolPickerProps {
  open: boolean;
  onClose: () => void;
  pool: string[];
  saved: string[];
  onToggle: (id: string) => void;
  onChange: (ids: string[]) => void;
  /** Closes the sheet, switches to the Rổ and spins. */
  onSpin: () => void;
}

/** Sheet for building the Rổ quay: search, quick filters and a tap-to-tick grid. */
export function PoolPicker({
  open,
  onClose,
  pool,
  saved,
  onToggle,
  onChange,
  onSpin,
}: PoolPickerProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const canHover = useCanHover();
  const q = fold(useDeferredValue(query).trim());
  const picked = useMemo(() => new Set(pool), [pool]);
  const size = poolDishes(pool).length;
  const savedDishes = poolDishes(saved);
  const savedMissing = savedDishes.filter((d) => !picked.has(d.id));

  const list = useMemo(
    () =>
      reelDishes().filter((d) => {
        if (filter === 'picked' && !picked.has(d.id)) return false;
        if (filter === 'veg' && !d.vegetarian) return false;
        if (filter !== 'all' && filter !== 'picked' && filter !== 'veg' && d.region !== filter)
          return false;
        return !q || fold(`${d.name} ${d.subtitle}`).includes(q);
      }),
    [filter, picked, q],
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rổ quay"
      description={`Chọn từ ${POOL_MIN} món trở lên — reel sẽ chỉ quay giữa các món này.`}
      variant="dark"
      fullOnMobile
      footer={
        <>
          <p className="fr-picker__count" aria-live="polite">
            {size === 0 ? (
              'Chưa chọn món'
            ) : (
              <>
                <span className="fr-hide-sm">Đã chọn </span>
                {size} món
              </>
            )}
          </p>
          {size > 0 && (
            <button type="button" className="fr-ghost" onClick={() => onChange([])}>
              Bỏ hết
            </button>
          )}
          <button
            type="button"
            className="fr-cta"
            aria-disabled={size < POOL_MIN}
            onClick={() => {
              if (size >= POOL_MIN) onSpin();
            }}
          >
            <Basket aria-hidden="true" size={18} />
            {size < POOL_MIN ? `Thêm ${POOL_MIN - size} món` : `Quay ${size} món`}
          </button>
        </>
      }
    >
      <div className="fr-picker">
        {/* Search and filters stay pinned while the dish grid scrolls. */}
        <div className="fr-picker__bar">
          <label className="fr-picker__search">
            <MagnifyingGlass aria-hidden="true" size={18} />
            <span className="sr-only">Tìm món</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm món: phở, bún, cơm…"
              autoComplete="off"
              // Touch screens: don't pop the keyboard over the list on open.
              data-autofocus={canHover || undefined}
            />
          </label>

          <div className="fr-picker__filters" role="radiogroup" aria-label="Lọc món">
            {FILTERS.map((f) => (
              <label key={f.id} className="fj-chip">
                <input
                  type="radio"
                  name="fr-picker-filter"
                  checked={filter === f.id}
                  onChange={() => setFilter(f.id)}
                />
                <span className="fj-chip__face">
                  {f.label}
                  {f.id === 'picked' && size > 0 && <span className="fj-chip__count">{size}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        {savedMissing.length > 0 && (
          <button
            type="button"
            className="fr-ghost fr-picker__saved"
            onClick={() => onChange([...pool, ...savedMissing.map((d) => d.id)])}
          >
            <BookmarkSimple aria-hidden="true" size={16} />
            Thêm {savedMissing.length} món đã lưu
          </button>
        )}

        {list.length === 0 ? (
          <p className="fr-panel-note">Không có món nào khớp.</p>
        ) : (
          <ul className="fr-picker__grid" aria-label="Món có thể thêm vào rổ">
            {list.map((d) => {
              const on = picked.has(d.id);
              return (
                <li key={d.id}>
                  <label className={`fr-pick ${on ? 'is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => onToggle(d.id)} />
                    <span className="fr-pick__media">
                      <img
                        src={d.thumbnail}
                        alt=""
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="fr-pick__tick" aria-hidden="true">
                        <Check size={14} weight="bold" />
                      </span>
                    </span>
                    <span className="fr-pick__name">{d.name}</span>
                    <span className="fr-pick__meta">
                      {REGION_LABEL[d.region]} · {formatReelPrice(d.price)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
