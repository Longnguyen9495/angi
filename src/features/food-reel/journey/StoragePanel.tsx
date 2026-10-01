import { CropIcon } from '../../../components/ui/CropIcon';
import { ProduceImage } from '../../../components/ui/CropVisual';
import { CROP_LIST, PRODUCE_IDS, produceName } from '../../../data/game';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';

const m = t.journey.garden;

/** The farm's storage: seeds waiting in the tray and produce in the pantry. */
export function StoragePanel() {
  const { state } = useGame();
  const seeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0);
  const pantry = PRODUCE_IDS.filter((id) => state.ingredients[id] > 0);

  return (
    <div className="fj-garden__shelves">
      <div className="fj-shelf">
        <h3 className="fj-h3">{m.seedTray}</h3>
        {seeds.length === 0 ? (
          <p className="fj-note">{m.seedTrayEmpty}</p>
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
        {pantry.length === 0 ? (
          <p className="fj-note">{m.pantryEmpty}</p>
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
  );
}
