import { Coins, SealCheck, Storefront } from '@phosphor-icons/react';
import { useState } from 'react';
import { ProduceImage } from '../../../components/ui/CropVisual';
import { CropIcon } from '../../../components/ui/CropIcon';
import { CROP_LIST, DECOR_LIST, MARKET, PRODUCE_IDS, produceName } from '../../../data/game';
import { decorSprite } from '../../../data/sprites';
import { cropAvailable } from '../../../domain/selectors';
import { currentTime } from '../../../domain/time';
import { t } from '../../../i18n';
import { useFeedback, useGame } from '../../../state/hooks';

type Tab = 'sell' | 'seeds' | 'decor';

const m = t.journey.market;

const TABS: { id: Tab; label: string }[] = [
  { id: 'sell', label: m.tabs.sell },
  { id: 'seeds', label: m.tabs.seeds },
  { id: 'decor', label: m.tabs.decor },
];

/** Chợ quê: sell spare produce for xu, spend xu on seeds and garden decorations. */
export function MarketSection() {
  const { state, dispatch } = useGame();
  const { announce } = useFeedback();
  const [tab, setTab] = useState<Tab>('sell');
  const pantry = PRODUCE_IDS.filter((id) => state.ingredients[id] > 0).map((id) => ({
    id,
    produceName: produceName(id),
  }));
  const seeds = CROP_LIST.filter((c) => cropAvailable(state, c.id));

  return (
    <div className="fj-market">
      <div className="fj-market__head">
        <p className="fj-market__purse" aria-live="polite">
          <Coins aria-hidden="true" size={20} weight="fill" />
          <span className="fj-market__coins">{state.coins}</span> {m.coins}
        </p>
        <div className="fj-chips" role="tablist" aria-label={m.stallsLabel}>
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              className="fj-market__tab"
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'sell' &&
        (pantry.length === 0 ? (
          <p className="fj-note">{m.pantryEmpty}</p>
        ) : (
          <ul className="fj-stall">
            {pantry.map((c) => (
              <li key={c.id} className="fj-stall__item">
                <ProduceImage crop={c.id} size={56} />
                <span className="fj-stall__name">{c.produceName}</span>
                <span className="fj-stall__meta">{m.inPantry(state.ingredients[c.id])}</span>
                <button
                  type="button"
                  className="fr-ghost fr-ghost--compact"
                  onClick={() => {
                    dispatch({ type: 'SELL', crop: c.id, now: currentTime() });
                    announce(m.sold(c.produceName.toLowerCase(), MARKET.sell(c.id)));
                  }}
                >
                  {m.sell(MARKET.sell(c.id))}
                </button>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'seeds' && (
        <ul className="fj-stall">
          {seeds.map((c) => {
            const price = MARKET.seed(c.id);
            const afford = state.coins >= price;
            return (
              <li key={c.id} className="fj-stall__item">
                <span className="fj-stall__seed">
                  <CropIcon crop={c.id} size={40} />
                </span>
                <span className="fj-stall__name">{c.seedName}</span>
                <span className="fj-stall__meta">{m.seedMeta(c.growHours, state.seeds[c.id])}</span>
                <button
                  type="button"
                  className="fr-ghost fr-ghost--compact"
                  aria-disabled={!afford}
                  onClick={() => {
                    if (!afford) return;
                    dispatch({ type: 'BUY_SEED', crop: c.id, now: currentTime() });
                    announce(m.boughtSeed(c.seedName.toLowerCase()));
                  }}
                >
                  {m.buy(price)}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'decor' && (
        <ul className="fj-stall">
          {DECOR_LIST.map((d) => {
            const owned = state.decor.includes(d.id);
            const afford = state.coins >= d.price;
            return (
              <li key={d.id} className={`fj-stall__item ${owned ? 'is-owned' : ''}`}>
                <img
                  className="fj-stall__decor"
                  src={decorSprite(d.id)}
                  alt=""
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                />
                <span className="fj-stall__name">{d.name}</span>
                <span className="fj-stall__meta">{d.note}</span>
                {owned ? (
                  <span className="fj-order__done">
                    <SealCheck aria-hidden="true" size={16} weight="fill" /> {m.owned}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="fr-ghost fr-ghost--compact"
                    aria-disabled={!afford}
                    onClick={() => {
                      if (!afford) return;
                      dispatch({ type: 'BUY_DECOR', decor: d.id, now: currentTime() });
                      announce(m.boughtDecor(d.name.toLowerCase()));
                    }}
                  >
                    <Storefront aria-hidden="true" size={14} /> {m.buy(d.price)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
