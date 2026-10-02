import { CropIcon } from '../../../components/ui/CropIcon';
import { ProduceImage } from '../../../components/ui/CropVisual';
import { CROP_LIST, PRODUCE_IDS, produceCategory, produceName } from '../../../data/game';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { ItemFilter, NoMatch } from './ItemFilter';
import { presentCategories, useItemFilter } from './filterItems';

const m = t.journey.garden;

/** The farm's storage: seeds waiting in the tray and produce in the pantry, searchable by group. */
export function StoragePanel() {
  const { state } = useGame();
  const filter = useItemFilter();
  const ownedSeeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0);
  const owned = PRODUCE_IDS.filter((id) => state.ingredients[id] > 0);
  // The filter only shows for long lists, and only a visible filter filters.
  const showFilter = ownedSeeds.length + owned.length > 8;
  const seeds = ownedSeeds.filter((c) => !showFilter || filter.matches(c.seedName, c.category));
  const pantry = owned.filter(
    (id) => !showFilter || filter.matches(produceName(id), produceCategory(id)),
  );
  const categories = presentCategories([
    ...ownedSeeds.map((c) => c.category),
    ...owned.map(produceCategory),
  ]);
  const filtering = filter.state.query !== '' || filter.state.category !== 'all';

  return (
    <>
      {showFilter && (
        <ItemFilter
          state={filter.state}
          onChange={filter.setState}
          categories={categories}
          label={m.pantryLabel}
        />
      )}
      <div className="fj-garden__shelves">
        <div className="fj-shelf">
          <h3 className="fj-h3">{m.seedTray}</h3>
          {ownedSeeds.length === 0 ? (
            <p className="fj-note">{m.seedTrayEmpty}</p>
          ) : seeds.length === 0 ? (
            <NoMatch />
          ) : (
            <ul className="fj-chips" aria-label={m.seedTray}>
              {seeds.map((c) => (
                <li key={c.id} className="fj-chip fj-chip--static">
                  <span className="fj-chip__face">
                    <CropIcon crop={c.id} />
                    {c.seedName}
                    <span className="fj-chip__count">×{state.seeds[c.id]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="fj-shelf">
          <h3 className="fj-h3">{m.pantry}</h3>
          {owned.length === 0 ? (
            <p className="fj-note">{m.pantryEmpty}</p>
          ) : pantry.length === 0 && filtering ? (
            <NoMatch />
          ) : (
            <ul className="fj-chips" aria-label={m.pantryLabel}>
              {pantry.map((id) => (
                <li key={id} className="fj-chip fj-chip--static">
                  <span className="fj-chip__face">
                    <ProduceImage crop={id} size={26} />
                    {produceName(id)}
                    <span key={state.ingredients[id]} className="fj-chip__count is-bump">
                      ×{state.ingredients[id]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
