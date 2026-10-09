import { useState, type ReactNode } from 'react';
import { CROPS, WATERING } from '../../../data/game';
import {
  BALLOON,
  BUGS,
  DEW_PER_DAY,
  FLOORS,
  MACHINES,
  POT_PRICES,
  SET_REWARD,
  SHARDS_PER_POT,
  SHARD_POTS,
  SKY_CROPS,
  SKY_CROP_IDS,
  SKY_GOOD_PRICE,
  SKY_ITEMS,
  SKY_RECIPES,
  SKY_RECIPE_IDS,
  STAR_LUCK,
  STAR_STEPS,
  type BugId,
  type MachineId,
  type SkyCropId,
  type SkyGoodId,
  type SkyRecipeId,
} from '../../../data/skyEconomy';
import { POT_SETS, POT_TIERS, POTS, type PotId, type PotSetId } from '../../../data/skyGarden';
import type { CropId } from '../../../data/types';
import type { Action } from '../../../domain/reducer';
import { cropAvailable, waterLeft } from '../../../domain/selectors';
import {
  balloonBoxes,
  cropOpen,
  floorCombo,
  resonance,
  nextFloor,
  ownsSet,
  potPlace,
  potStats,
  recipeOpen,
  skyDay,
  slotCount,
  slotPrice,
  STAT_IDS,
  type SkyPot,
  type SkyState,
} from '../../../domain/sky';
import type { GuestProgress } from '../../../domain/progress';
import { currentTime, dateKey, formatDuration } from '../../../domain/time';
import { t } from '../../../i18n';
import { Sheet } from '../../../components/ui/Sheet';

/*
 * The sheets of the Vườn Mây game: a slot (place, plant, water, catch, pick), a pot's stars and
 * tier, a machine, the cloud store, the shop, the collection and the balloon. Everything goes
 * through the game's actions (src/domain/skyReducer.ts); stars and tiers through the server.
 */

const g = () => t.sky.game;

export type SkySheet =
  | { kind: 'slot'; floor: number; slot: number }
  | { kind: 'pot'; uid: string }
  | { kind: 'machine'; machine: MachineId }
  | { kind: 'store' }
  | { kind: 'shop' }
  | { kind: 'sets' }
  | { kind: 'balloon' };

interface Ctx {
  state: GuestProgress;
  sky: SkyState;
  now: number;
  act: (a: Action) => void;
  open: (s: SkySheet | null) => void;
  /** Move mode: the pot that the next slot tap moves. */
  moving: string | null;
  setMoving: (uid: string | null) => void;
}

function PotImage({ pot, size = 44 }: { pot: PotId; size?: number }) {
  return <img className="sk-potimg" src={POTS[pot].src} alt="" width={size} height={size} />;
}

function tierName(pot: SkyPot) {
  return t.sky.tiers[POT_TIERS[pot.tier]];
}

function StatsLine({ stats }: { stats: Record<string, number> }) {
  const parts = STAT_IDS.filter((k) => stats[k]! > 0).map(
    (k) => `${t.sky.stats[k]} +${(stats[k]! / 100).toFixed(stats[k]! % 100 ? 1 : 0)}%`,
  );
  return <p className="sk-note">{parts.length ? parts.join(' · ') : g().pot.noStats}</p>;
}

function Row({ children }: { children: ReactNode }) {
  return <div className="sk-row">{children}</div>;
}

// ——— Slot ———

export function SlotSheet({ ctx, floor, slot }: { ctx: Ctx; floor: number; slot: number }) {
  const { sky, state, now, act, open, setMoving } = ctx;
  const s = g().slot;
  const uid = sky.slots[floor]?.[slot] ?? null;
  const pot = uid ? sky.pots[uid] : null;
  const title = s.title(floor + 1, slot + 1);
  const close = () => open(null);
  let body: ReactNode;

  if (slot >= slotCount(sky, floor)) {
    const price = slotPrice(sky, floor);
    const next = slot === slotCount(sky, floor);
    body = (
      <>
        <p className="sk-note">{s.locked}</p>
        {next && price !== null ? (
          <button
            type="button"
            className="sk-btn"
            disabled={state.coins < price}
            onClick={() => act({ type: 'SKY_BUY_SLOT', floor, now: currentTime() })}
          >
            {s.buy(price)}
          </button>
        ) : (
          <p className="sk-note">{s.buyFirst}</p>
        )}
      </>
    );
  } else if (!pot) {
    const free = Object.values(sky.pots).filter((p) => !potPlace(sky, p.uid));
    body = (
      <>
        <h3>{s.choosePot}</h3>
        {free.length === 0 && <p className="sk-note">{s.noPots}</p>}
        <div className="sk-grid">
          {free.map((p) => (
            <button
              key={p.uid}
              type="button"
              className="sk-card"
              onClick={() => {
                act({ type: 'SKY_PLACE_POT', uid: p.uid, floor, slot, now: currentTime() });
                close();
              }}
            >
              <PotImage pot={p.pot} />
              <span>{t.sky.pots[p.pot]}</span>
              <small>{g().pot.tierStars(tierName(p), p.stars)}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sk-btn sk-btn--ghost"
          onClick={() => open({ kind: 'shop' })}
        >
          {s.toShop}
        </button>
      </>
    );
  } else {
    const plant = pot.plant;
    const combo = floorCombo(sky, floor);
    const header = (
      <div className="sk-pothead">
        <PotImage pot={pot.pot} size={64} />
        <div>
          <strong>{t.sky.pots[pot.pot]}</strong>
          <small>
            {g().pot.set(t.sky.sets[POTS[pot.pot].set])} ·{' '}
            {g().pot.tierStars(tierName(pot), pot.stars)}
          </small>
          <StatsLine stats={plant ? plant.stats : potStats(sky, pot.uid)} />
          {combo ? (
            <small className="sk-combo">{g().pot.combo(t.sky.combos[combo])}</small>
          ) : (
            resonance(sky, pot.uid) > 0 && (
              <small className="sk-combo">{g().pot.resonance(resonance(sky, pot.uid))}</small>
            )
          )}
        </div>
      </div>
    );
    if (!plant) {
      const skySeeds = SKY_CROP_IDS.filter((c) => cropOpen(sky, c));
      const farm = (Object.keys(CROPS) as CropId[]).filter(
        (c) => CROPS[c].kind === 'veg' && cropAvailable(state, c) && state.seeds[c] > 0,
      );
      const plantSky = (id: SkyCropId) => {
        const now2 = currentTime();
        if ((sky.seeds[id] ?? 0) <= 0) act({ type: 'SKY_BUY_SEED', crop: id, now: now2 });
        act({ type: 'SKY_PLANT', uid: pot.uid, seed: { kind: 'sky', id }, now: now2 + 1 });
        close();
      };
      body = (
        <>
          {header}
          <h3>{s.skySeeds}</h3>
          <div className="sk-list">
            {skySeeds.map((id) => {
              const have = sky.seeds[id] ?? 0;
              const def = SKY_CROPS[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="sk-item"
                  disabled={have <= 0 && state.coins < def.seed}
                  onClick={() => plantSky(id)}
                >
                  <span>{s.seedFor(t.sky.crops[id], def.growMin)}</span>
                  <b>{have > 0 ? s.plant(have) : s.buyPlant(def.seed)}</b>
                </button>
              );
            })}
          </div>
          {farm.length > 0 && (
            <>
              <h3>{s.farmSeeds}</h3>
              <div className="sk-list">
                {farm.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="sk-item"
                    onClick={() => {
                      act({
                        type: 'SKY_PLANT',
                        uid: pot.uid,
                        seed: { kind: 'farm', id: c },
                        now: currentTime(),
                      });
                      close();
                    }}
                  >
                    <span>{CROPS[c].name}</span>
                    <b>{s.plant(state.seeds[c])}</b>
                  </button>
                ))}
              </div>
            </>
          )}
          <Row>
            <button
              type="button"
              className="sk-btn sk-btn--ghost"
              onClick={() => open({ kind: 'pot', uid: pot.uid })}
            >
              {s.stars}
            </button>
            <button
              type="button"
              className="sk-btn sk-btn--ghost"
              onClick={() => {
                setMoving(pot.uid);
                close();
              }}
            >
              {s.move}
            </button>
            <button
              type="button"
              className="sk-btn sk-btn--ghost"
              onClick={() => {
                act({ type: 'SKY_STORE_POT', uid: pot.uid, now: currentTime() });
                close();
              }}
            >
              {s.store}
            </button>
          </Row>
        </>
      );
    } else {
      const ready = now >= plant.readyAt;
      const cropName =
        plant.seed.kind === 'sky' ? t.sky.crops[plant.seed.id] : CROPS[plant.seed.id].name;
      const wet = plant.wateredAt !== null && now - plant.wateredAt < WATERING.cooldownMs;
      const cans = waterLeft(state, now);
      const bugs = plant.bugs
        .map((b, i) => ({ bug: b, stage: i }))
        .filter(
          (x): x is { bug: BugId; stage: number } => !!x.bug && !plant.caught.includes(x.stage),
        );
      body = (
        <>
          {header}
          <p className="sk-status">
            <strong>{cropName}</strong> ·{' '}
            {ready ? s.ready : s.growing(formatDuration(plant.readyAt - now))}
          </p>
          {!ready && (
            <div className="sk-meter">
              <span
                style={{
                  transform: `scaleX(${Math.min(1, (now - plant.plantedAt) / Math.max(1, plant.readyAt - plant.plantedAt))})`,
                }}
              />
            </div>
          )}
          {bugs.length > 0 && (
            <>
              <h3>{s.bugsHere}</h3>
              <Row>
                {bugs.map((b) => (
                  <button
                    key={b.stage}
                    type="button"
                    className="sk-btn"
                    onClick={() =>
                      act({ type: 'SKY_CATCH', uid: pot.uid, stage: b.stage, now: currentTime() })
                    }
                  >
                    {s.catch(t.sky.bugs[b.bug])}
                  </button>
                ))}
              </Row>
            </>
          )}
          <Row>
            {ready ? (
              <button
                type="button"
                className="sk-btn"
                data-autofocus
                onClick={() => {
                  act({ type: 'SKY_HARVEST', uid: pot.uid, now: currentTime() });
                  close();
                }}
              >
                {s.harvest}
              </button>
            ) : (
              <button
                type="button"
                className="sk-btn"
                disabled={wet || cans <= 0}
                onClick={() => act({ type: 'SKY_WATER', uid: pot.uid, now: currentTime() })}
              >
                {s.water} · {g().hud.cans(cans)}
              </button>
            )}
            <button
              type="button"
              className="sk-btn sk-btn--ghost"
              onClick={() => open({ kind: 'pot', uid: pot.uid })}
            >
              {s.stars}
            </button>
            <button
              type="button"
              className="sk-btn sk-btn--ghost"
              onClick={() => {
                setMoving(pot.uid);
                close();
              }}
            >
              {s.move}
            </button>
          </Row>
          {wet && !ready && <p className="sk-note">{s.wet}</p>}
          {cans <= 0 && !ready && <p className="sk-note">{s.noWater}</p>}
        </>
      );
    }
  }
  return (
    <Sheet open onClose={close} title={title} variant="dark">
      <div className="sk-sheet">{body}</div>
    </Sheet>
  );
}

// ——— Pot: stars and tier ———

export function PotSheet({
  ctx,
  uid,
  onStar,
  onTier,
  busy,
}: {
  ctx: Ctx;
  uid: string;
  onStar: (uid: string, clover: boolean) => void;
  onTier: (uid: string, feed: string) => void;
  busy: boolean;
}) {
  const { sky, state, open } = ctx;
  const st = g().star;
  const [clover, setClover] = useState(false);
  const [feed, setFeed] = useState<string | null>(null);
  const pot = sky.pots[uid];
  if (!pot) return null;
  const step = STAR_STEPS[pot.stars];
  const close = () => open(null);
  const count = (cls: string) =>
    (Object.keys(BUGS) as BugId[])
      .filter((b) => BUGS[b].cls === cls)
      .reduce((n, b) => n + (sky.bugs[b] ?? 0), 0);
  const cloverHave = sky.items.clover ?? 0;
  const sure = pot.tries + 1 >= STAR_LUCK.sureTry;
  const rate = step
    ? Math.min(100, Math.round((step.rateBp + pot.luck + (clover ? STAR_LUCK.cloverBp : 0)) / 100))
    : 0;
  const enough =
    !!step &&
    count('common') >= step.common &&
    count('rare') >= step.rare &&
    count('firefly') >= step.firefly &&
    state.coins >= step.coins;
  const feeds = Object.values(sky.pots).filter(
    (p) => p.uid !== uid && POTS[p.pot].set === POTS[pot.pot].set && p.stars === 0 && !p.plant,
  );
  return (
    <Sheet open onClose={close} title={st.title(t.sky.pots[pot.pot])} variant="dark">
      <div className="sk-sheet">
        <div className="sk-pothead">
          <PotImage pot={pot.pot} size={72} />
          <div>
            <strong className="sk-stars">
              {'★'.repeat(pot.stars)}
              {'☆'.repeat(5 - pot.stars)}
            </strong>
            <small>{g().pot.tierStars(tierName(pot), pot.stars)}</small>
            <StatsLine stats={potStats(sky, uid)} />
          </div>
        </div>
        {step ? (
          <>
            <h3>{st.need}</h3>
            <ul className="sk-needs">
              <li className={count('common') >= step.common ? 'ok' : ''}>
                {st.common(step.common)}
              </li>
              {step.rare > 0 && (
                <li className={count('rare') >= step.rare ? 'ok' : ''}>{st.rare(step.rare)}</li>
              )}
              {step.firefly > 0 && (
                <li className={count('firefly') >= step.firefly ? 'ok' : ''}>
                  {st.firefly(step.firefly)}
                </li>
              )}
              <li className={state.coins >= step.coins ? 'ok' : ''}>{st.coins(step.coins)}</li>
            </ul>
            <p className="sk-note">{sure ? st.sure : st.rate(rate)}</p>
            {cloverHave > 0 && (
              <label className="sk-check">
                <input type="checkbox" checked={clover} onChange={() => setClover(!clover)} />{' '}
                {st.clover(cloverHave)}
              </label>
            )}
            <button
              type="button"
              className="sk-btn"
              disabled={!enough || busy}
              onClick={() => onStar(uid, clover && cloverHave > 0)}
            >
              {busy ? st.working : st.go}
            </button>
            {!enough && <p className="sk-note">{st.notEnough}</p>}
          </>
        ) : (
          <>
            <p className="sk-note">{st.max}</p>
            <h3>{st.tierTitle}</h3>
            {pot.tier >= 4 ? (
              <p className="sk-note">{st.maxTier}</p>
            ) : (
              <>
                <p className="sk-note">{st.tierBody}</p>
                {feeds.length === 0 ? (
                  <p className="sk-note">{st.tierNone}</p>
                ) : (
                  <>
                    <h3>{st.tierPick}</h3>
                    <div className="sk-grid">
                      {feeds.map((p) => (
                        <button
                          key={p.uid}
                          type="button"
                          className={`sk-card${feed === p.uid ? ' is-on' : ''}`}
                          aria-pressed={feed === p.uid}
                          onClick={() => setFeed(p.uid)}
                        >
                          <PotImage pot={p.pot} />
                          <span>{t.sky.pots[p.pot]}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="sk-btn"
                      disabled={!feed || (sky.bugs.goldbeetle ?? 0) < 1 || busy}
                      onClick={() => feed && onTier(uid, feed)}
                    >
                      {busy ? st.working : st.tierGo}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

// ——— Machine ———

function inputName(i: (typeof SKY_RECIPES)[SkyRecipeId]['inputs'][number]) {
  return 'good' in i ? t.sky.goods[i.good] : t.sky.farmInputs[i.farm];
}

export function MachineSheet({ ctx, machine }: { ctx: Ctx; machine: MachineId }) {
  const { sky, state, now, act, open } = ctx;
  const m = g().machine;
  const jobs = sky.jobs[machine] ?? [];
  const ready = jobs.find((j) => now >= j.readyAt);
  const day = skyDay(sky, now);
  const recipes = SKY_RECIPE_IDS.filter((r) => SKY_RECIPES[r].machine === machine);
  const have = (i: (typeof SKY_RECIPES)[SkyRecipeId]['inputs'][number]) =>
    'good' in i ? (sky.goods[i.good] ?? 0) : state.ingredients[i.farm];
  return (
    <Sheet open onClose={() => open(null)} title={t.sky.machineNames[machine]} variant="dark">
      <div className="sk-sheet">
        {jobs.length === 0 && <p className="sk-note">{m.idle}</p>}
        {jobs.map((j) => (
          <p key={j.startedAt} className="sk-status">
            {now >= j.readyAt
              ? m.done(t.sky.recipes[j.recipe])
              : m.running(t.sky.recipes[j.recipe], formatDuration(j.readyAt - now))}
          </p>
        ))}
        {ready && (
          <button
            type="button"
            className="sk-btn"
            data-autofocus
            onClick={() => act({ type: 'SKY_COLLECT_JOB', machine, now: currentTime() })}
          >
            {m.collect}
          </button>
        )}
        {machine === 'still' && (
          <p className="sk-note">{m.dewLeft(Math.max(0, DEW_PER_DAY - day.dew))}</p>
        )}
        <h3>{m.recipes}</h3>
        <div className="sk-list">
          {recipes.map((id) => {
            const r = SKY_RECIPES[id];
            const open2 = recipeOpen(sky, id);
            const can =
              open2 &&
              jobs.length < MACHINES[machine].slots &&
              r.inputs.every((i) => have(i) >= i.qty);
            return (
              <div key={id} className="sk-recipe">
                <div>
                  <strong>{t.sky.recipes[id]}</strong>
                  <small>
                    {r.inputs.map((i) => `${inputName(i)} ${m.have(have(i), i.qty)}`).join(' · ')} ·{' '}
                    {m.takes(r.minutes)}
                  </small>
                  {!open2 && (
                    <small>{m.locked(Math.max(r.floor ?? 0, MACHINES[machine].floor))}</small>
                  )}
                </div>
                <button
                  type="button"
                  className="sk-btn sk-btn--small"
                  disabled={!can}
                  onClick={() =>
                    act({ type: 'SKY_START_JOB', machine, recipe: id, now: currentTime() })
                  }
                >
                  {jobs.length >= MACHINES[machine].slots ? m.busy : m.start}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

// ——— Cloud store ———

export function StoreSheet({ ctx }: { ctx: Ctx }) {
  const { sky, act, open } = ctx;
  const s = g().store;
  const [tab, setTab] = useState<'goods' | 'seeds' | 'bugs' | 'items' | 'pots'>('goods');
  const goods = (Object.keys(sky.goods) as SkyGoodId[]).filter((k) => (sky.goods[k] ?? 0) > 0);
  const seeds = (Object.keys(sky.seeds) as SkyCropId[]).filter((k) => (sky.seeds[k] ?? 0) > 0);
  const bugs = (Object.keys(sky.bugs) as BugId[]).filter((k) => (sky.bugs[k] ?? 0) > 0);
  const items = SKY_ITEMS.filter((k) => (sky.items[k] ?? 0) > 0);
  const pots = Object.values(sky.pots);
  const shards = sky.items.shard ?? 0;
  return (
    <Sheet open onClose={() => open(null)} title={s.title} variant="dark" fullOnMobile>
      <div className="sk-sheet">
        <div className="sk-tabs" role="tablist">
          {(['goods', 'seeds', 'bugs', 'items', 'pots'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'is-on' : ''}
              onClick={() => setTab(k)}
            >
              {s[k]}
            </button>
          ))}
        </div>
        {tab === 'goods' &&
          (goods.length ? (
            <div className="sk-list">
              {goods.map((k) => {
                const n = sky.goods[k] ?? 0;
                return (
                  <div key={k} className="sk-recipe">
                    <div>
                      <strong>{t.sky.goods[k]}</strong>
                      <small>×{n}</small>
                    </div>
                    <button
                      type="button"
                      className="sk-btn sk-btn--small"
                      onClick={() => act({ type: 'SKY_SELL', good: k, qty: 1, now: currentTime() })}
                    >
                      {s.sell(SKY_GOOD_PRICE[k])}
                    </button>
                    {n > 1 && (
                      <button
                        type="button"
                        className="sk-btn sk-btn--small sk-btn--ghost"
                        onClick={() =>
                          act({ type: 'SKY_SELL', good: k, qty: n, now: currentTime() })
                        }
                      >
                        {s.sellAll(n, n * SKY_GOOD_PRICE[k])}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="sk-note">{s.empty}</p>
          ))}
        {tab === 'seeds' && <Counts list={seeds.map((k) => [t.sky.crops[k], sky.seeds[k] ?? 0])} />}
        {tab === 'bugs' && <Counts list={bugs.map((k) => [t.sky.bugs[k], sky.bugs[k] ?? 0])} />}
        {tab === 'items' && (
          <>
            <Counts list={items.map((k) => [t.sky.items[k], sky.items[k] ?? 0])} />
            {shards >= SHARDS_PER_POT &&
              SHARD_POTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="sk-btn sk-btn--ghost"
                  onClick={() => act({ type: 'SKY_SHARD_POT', pot: p, now: currentTime() })}
                >
                  {s.shardPot(SHARDS_PER_POT)} · {t.sky.pots[p]}
                </button>
              ))}
          </>
        )}
        {tab === 'pots' && (
          <div className="sk-grid">
            {pots.map((p) => {
              const place = potPlace(sky, p.uid);
              return (
                <button
                  key={p.uid}
                  type="button"
                  className="sk-card"
                  onClick={() => open({ kind: 'pot', uid: p.uid })}
                >
                  <PotImage pot={p.pot} />
                  <span>{t.sky.pots[p.pot]}</span>
                  <small>
                    {g().pot.tierStars(tierName(p), p.stars)} ·{' '}
                    {place ? s.placed(place[0] + 1) : s.stored}
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Counts({ list }: { list: [string, number][] }) {
  if (!list.length) return <p className="sk-note">{g().store.empty}</p>;
  return (
    <ul className="sk-counts">
      {list.map(([name, n]) => (
        <li key={name}>
          <span>{name}</span>
          <b>×{n}</b>
        </li>
      ))}
    </ul>
  );
}

// ——— Shop ———

export function ShopSheet({ ctx, level }: { ctx: Ctx; level: number }) {
  const { sky, state, act, open } = ctx;
  const s = g().shop;
  const n = nextFloor(sky);
  const def = n ? FLOORS[n - 1]! : null;
  const cloud = sky.items.cloudseed ?? 0;
  const dew = sky.items.dew ?? 0;
  const gems = sky.items.gem ?? 0;
  const canOpen =
    !!def &&
    level >= def.level &&
    state.coins >= def.coins &&
    cloud >= def.cloudseed &&
    dew >= def.dew;
  return (
    <Sheet open onClose={() => open(null)} title={s.title} variant="dark" fullOnMobile>
      <div className="sk-sheet">
        {def && n ? (
          <div className="sk-floorbuy">
            <h3>{s.next(n)}</h3>
            <ul className="sk-needs">
              <li className={level >= def.level ? 'ok' : ''}>{s.needLevel(def.level)}</li>
              {def.coins > 0 && (
                <li className={state.coins >= def.coins ? 'ok' : ''}>{s.needCoins(def.coins)}</li>
              )}
              {def.cloudseed > 0 && (
                <li className={cloud >= def.cloudseed ? 'ok' : ''}>{s.needCloud(def.cloudseed)}</li>
              )}
              {def.dew > 0 && <li className={dew >= def.dew ? 'ok' : ''}>{s.needDew(def.dew)}</li>}
            </ul>
            {def.gem > 0 && <p className="sk-note">{s.gemReward(def.gem)}</p>}
            <button
              type="button"
              className="sk-btn"
              disabled={!canOpen}
              onClick={() => act({ type: 'SKY_OPEN_FLOOR', now: currentTime() })}
            >
              {s.open}
            </button>
          </div>
        ) : (
          <p className="sk-note">{s.allOpen}</p>
        )}
        <h3>{s.seeds}</h3>
        <div className="sk-list">
          {SKY_CROP_IDS.map((id) => {
            const c = SKY_CROPS[id];
            const open2 = cropOpen(sky, id);
            return (
              <div key={id} className="sk-recipe">
                <div>
                  <strong>{t.sky.crops[id]}</strong>
                  <small>
                    {open2
                      ? s.seedYield(
                          c.yield
                            .map(
                              (y) =>
                                `${y.qty} ${'good' in y ? t.sky.goods[y.good] : t.sky.items[y.item]}`,
                            )
                            .join(', '),
                          c.growMin,
                        )
                      : s.fromFloor(c.floor)}
                  </small>
                </div>
                <button
                  type="button"
                  className="sk-btn sk-btn--small"
                  disabled={!open2 || state.coins < c.seed}
                  onClick={() => act({ type: 'SKY_BUY_SEED', crop: id, now: currentTime() })}
                >
                  {s.priceCoin(c.seed)}
                </button>
              </div>
            );
          })}
        </div>
        <h3>{s.pots}</h3>
        <div className="sk-grid">
          {(Object.keys(POTS) as PotId[]).map((p) => {
            const price = POT_PRICES[p];
            const ok =
              !!price &&
              sky.floors >= price.floor &&
              (price.currency === 'coin' ? state.coins : gems) >= price.price;
            return (
              <button
                key={p}
                type="button"
                className="sk-card"
                disabled={!ok}
                onClick={() => act({ type: 'SKY_BUY_POT', pot: p, now: currentTime() })}
              >
                <PotImage pot={p} />
                <span>{t.sky.pots[p]}</span>
                <small>
                  {!price
                    ? s.eventOnly
                    : sky.floors < price.floor
                      ? s.fromFloor(price.floor)
                      : price.currency === 'coin'
                        ? s.priceCoin(price.price)
                        : s.priceGem(price.price)}
                </small>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

// ——— Collection ———

export function SetsSheet({ ctx }: { ctx: Ctx }) {
  const { sky, act, open } = ctx;
  const s = g().sets;
  return (
    <Sheet open onClose={() => open(null)} title={s.title} variant="dark" fullOnMobile>
      <div className="sk-sheet">
        {POT_SETS.filter((x) => x.pots.length > 0).map((set) => {
          const owned = set.pots.filter((p) =>
            Object.values(sky.pots).some((x) => x.pot === p),
          ).length;
          const claimed = sky.sets.includes(set.id as PotSetId);
          return (
            <section key={set.id} className="sk-set">
              <h3>
                {t.sky.sets[set.id]} <small>{s.owned(owned, set.pots.length)}</small>
              </h3>
              <div className="sk-setrow">
                {set.pots.map((p) => {
                  const has = Object.values(sky.pots).some((x) => x.pot === p);
                  return (
                    <img
                      key={p}
                      src={has ? POTS[p].src : POTS[p].silhouette}
                      alt={t.sky.pots[p]}
                      title={t.sky.pots[p]}
                      width={48}
                      height={48}
                    />
                  );
                })}
              </div>
              {!set.complete ? (
                <p className="sk-note">{s.incomplete}</p>
              ) : claimed ? (
                <p className="sk-note">{s.claimed}</p>
              ) : ownsSet(sky, set.id) ? (
                <button
                  type="button"
                  className="sk-btn"
                  onClick={() => act({ type: 'SKY_CLAIM_SET', set: set.id, now: currentTime() })}
                >
                  {s.claim(SET_REWARD.gem, SET_REWARD.coins)}
                </button>
              ) : (
                <p className="sk-note">{s.notYet}</p>
              )}
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

// ——— Balloon ———

export function BalloonSheet({ ctx }: { ctx: Ctx }) {
  const { sky, now, act, open } = ctx;
  const s = g().balloon;
  const date = dateKey(now);
  const boxes = balloonBoxes(date);
  const today =
    sky.balloon?.date === date ? sky.balloon : { date, packed: [] as number[], done: false };
  return (
    <Sheet open onClose={() => open(null)} title={s.title} variant="dark">
      <div className="sk-sheet">
        {sky.floors < BALLOON.floor ? (
          <p className="sk-note">{s.locked}</p>
        ) : (
          <>
            <p className="sk-note">{s.body}</p>
            {sky.balloonStreak.count > 0 && (
              <p className="sk-note">{s.streak(sky.balloonStreak.count)}</p>
            )}
            {today.done && <p className="sk-status">{s.done}</p>}
            <div className="sk-list">
              {boxes.map((b, i) => {
                const packed = today.packed.includes(i);
                const have = sky.goods[b.good] ?? 0;
                return (
                  <div key={i} className="sk-recipe">
                    <div>
                      <strong>{s.box(i + 1)}</strong>
                      <small>
                        {t.sky.goods[b.good]} {g().machine.have(have, b.qty)}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="sk-btn sk-btn--small"
                      disabled={packed || have < b.qty}
                      onClick={() => act({ type: 'SKY_PACK_BOX', box: i, now: currentTime() })}
                    >
                      {packed ? s.packed : s.pack}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

export type { Ctx as SkySheetCtx };
