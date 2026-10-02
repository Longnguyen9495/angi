import { MagnifyingGlass } from '@phosphor-icons/react';
import { useId } from 'react';
import type { FilterState } from './filterItems';
import type { ItemCategory } from '../../../data/types';
import { t } from '../../../i18n';

const m = t.journey.itemFilter;
const CATEGORY_NAME = t.data.categories;

export function ItemFilter({
  state,
  onChange,
  categories,
  label,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
  /** Groups present in the list, in display order. */
  categories: ItemCategory[];
  label: string;
}) {
  const id = useId();
  return (
    <div className="fj-filter" role="search" aria-label={label}>
      <label className="fj-filter__search" htmlFor={id}>
        <MagnifyingGlass size={16} aria-hidden="true" />
        <span className="sr-only">{m.search}</span>
        <input
          id={id}
          type="search"
          value={state.query}
          placeholder={m.placeholder}
          onChange={(e) => onChange({ ...state, query: e.target.value })}
        />
      </label>
      {categories.length > 1 && (
        <div className="fj-filter__groups" role="group" aria-label={m.groups}>
          {(['all', ...categories] as const).map((c) => (
            <button
              key={c}
              type="button"
              className="fj-filter__group"
              aria-pressed={state.category === c}
              onClick={() => onChange({ ...state, category: c })}
            >
              {c === 'all' ? m.all : CATEGORY_NAME[c]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Empty result after filtering (not an empty pantry). */
export function NoMatch() {
  return <p className="fj-note">{m.noMatch}</p>;
}
