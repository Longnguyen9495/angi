import { useEffect, useRef, useState } from 'react';
import { ANIMAL_LIST, BOAT, CATCHES, HIVE, produceName } from '../../data/game';
import { produceSprite, animalSprite } from '../../data/sprites';
import type { AnimalId, ProduceId } from '../../data/types';
import {
  animalStage,
  boatCatch,
  boatStage,
  hiveStage,
  level,
  type AnimalStage,
} from '../../domain/selectors';
import { HOUR_MS, currentTime, formatDuration } from '../../domain/time';
import { t } from '../../i18n';
import { useFeedback, useGame } from '../../state/hooks';
import { BoatStage } from './boat';
import { flyToPantry } from './fly';
import { HiveStage } from './hive';
import { sprite } from './images';
import { PondStage, type PondKind } from './pond';
import { RanchScene } from './scene';
import { YardStage, type PenAnimal } from './yard';
import './ranch.css';

const r = t.ranch;
const garden = t.journey.garden;

interface Engine {
  scene: RanchScene;
  yard: YardStage;
  hive: HiveStage;
  pond: PondStage;
  boat: BoatStage;
}

const POND_KINDS = (Object.values(CATCHES) as { id: string; source: string; unlockLevel: number }[])
  .filter((c) => c.source === 'pond')
  .sort((a, b) => a.unlockLevel - b.unlockLevel) as {
  id: PondKind;
  source: 'pond';
  unlockLevel: number;
}[];

function penAnimal(id: AnimalId, state: PenAnimal['state']): PenAnimal {
  const def = ANIMAL_LIST.find((d) => d.id === id)!;
  return {
    id,
    state,
    sprite: animalSprite(id, 'adult'),
    product: produceSprite(def.product),
    feed: produceSprite(def.feed),
  };
}

/** "2 mật ong và 1 sáp ong": counts the same item once. */
function listItems(items: ProduceId[]): string {
  const counts = new Map<ProduceId, number>();
  items.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1));
  return [...counts].map(([id, n]) => r.qty(n, produceName(id).toLowerCase())).join(r.and);
}

/**
 * "Chuồng trại": the animals, the beehive, the pond and the fishing boat in one panel.
 * Every action dispatches first (the reducer is idempotent and pays once); the canvases and
 * the flights to the pantry are decoration that follow.
 */
export default function RanchPanel() {
  const { state, dispatch, now: gameNow, reduced, quality } = useGame();
  const { toast, announce } = useFeedback();
  const [clock, setClock] = useState(() => currentTime());
  const yardRef = useRef<HTMLCanvasElement>(null);
  const hiveRef = useRef<HTMLCanvasElement>(null);
  const pondRef = useRef<HTMLCanvasElement>(null);
  const boatRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  /** Actions already sent for the state they were sent from: a double tap never repeats one. */
  const sent = useRef(new Set<string>());

  // Countdowns and "ready" flips while the panel is open (one clock for the whole panel).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) setClock(currentTime());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // One engine (one animation loop) per mounted panel.
  useEffect(() => {
    const scene = new RanchScene({ reduced: true, quality: 'low' });
    const e: Engine = {
      scene,
      yard: new YardStage(),
      hive: new HiveStage(),
      pond: new PondStage(),
      boat: new BoatStage(),
    };
    const offs = [
      yardRef.current && scene.attach(yardRef.current, e.yard),
      hiveRef.current && scene.attach(hiveRef.current, e.hive),
      pondRef.current && scene.attach(pondRef.current, e.pond),
      boatRef.current && scene.attach(boatRef.current, e.boat),
    ];
    engine.current = e;
    return () => {
      offs.forEach((off) => off && off());
      scene.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.scene.setEnv({ reduced, quality });
  }, [reduced, quality]);

  const now = Math.max(clock, gameNow);
  const lv = level(state.xp).level;

  const animals = ANIMAL_LIST.map((def) => ({
    def,
    stage: animalStage(state, def.id, now) as AnimalStage,
    have: state.ingredients[def.feed] ?? 0,
    a: state.animals[def.id],
  })).sort(
    (x, y) =>
      Number(x.stage === 'locked') - Number(y.stage === 'locked') ||
      x.def.unlockLevel - y.def.unlockLevel,
  );
  const inPen = animals.filter((x) => x.stage !== 'locked');
  const penKey = inPen.map((x) => `${x.def.id}:${x.stage}`).join(',');
  const hiveSt = hiveStage(state, now);
  const boatSt = boatStage(state, now);
  const pondOpen = POND_KINDS.filter((k) => k.unlockLevel <= lv).map((k) => k.id);
  const pondNext = POND_KINDS.find((k) => k.unlockLevel > lv);
  const pondKey = pondOpen.join(',');

  // Feed the stages what the state says; they redraw on change.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const list = penKey ? penKey.split(',').map((x) => x.split(':')) : [];
    e.yard.setAnimals(list.map(([id, st]) => penAnimal(id as AnimalId, st as PenAnimal['state'])));
    e.scene.invalidate();
  }, [penKey]);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.hive.state = hiveSt;
    e.boat.setState(boatSt);
    e.scene.invalidate();
  }, [hiveSt, boatSt]);

  // Warm up the pictures of what the boat brought back, so their flight is never blank.
  const boatSentAt = state.boat.sentAt;
  useEffect(() => {
    if (boatSt === 'back' && boatSentAt !== null)
      boatCatch(boatSentAt, lv).forEach((id) => sprite(produceSprite(id)));
  }, [boatSt, boatSentAt, lv]);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.pond.setKinds(pondKey ? (pondKey.split(',') as PondKind[]) : []);
    e.scene.invalidate();
  }, [pondKey]);

  // A new state settles every action sent from the previous one.
  useEffect(() => {
    sent.current.clear();
  }, [state]);

  /** Runs an action once per state it was sent from (rapid taps before the re-render are dropped). */
  const once = (key: string, run: () => void) => {
    if (sent.current.has(key)) return;
    sent.current.add(key);
    run();
  };

  const say = (message: string, tone: 'reward' | 'success') => {
    announce(message);
    toast({ message, tone });
  };

  const fly = (items: ProduceId[], from: { x: number; y: number } | null) => {
    if (!from) return;
    items
      .slice(0, 4)
      .forEach((id, i) =>
        flyToPantry(
          produceSprite(id),
          { x: from.x + i * 6, y: from.y },
          { reduced, delay: i * 110 },
        ),
      );
  };

  const feed = (id: AnimalId) => {
    const x = animals.find((v) => v.def.id === id);
    if (!x || x.stage !== 'hungry' || x.have <= 0) return;
    once(`feed:${id}`, () => {
      dispatch({ type: 'FEED_ANIMAL', animal: id, now: currentTime() });
      engine.current?.yard.hop(id, 'feed');
      say(garden.fed(x.def.name.toLowerCase(), formatDuration(x.def.hours * HOUR_MS)), 'success');
    });
  };

  const collect = (id: AnimalId) => {
    const x = animals.find((v) => v.def.id === id);
    if (!x || x.stage !== 'ready') return;
    once(`collect:${id}`, () => {
      dispatch({ type: 'COLLECT_ANIMAL', animal: id, now: currentTime() });
      const e = engine.current;
      const p = e?.yard.bubblePoint(id);
      fly(
        Array.from({ length: x.def.yield }, () => x.def.product),
        e && p ? e.scene.toClient(e.yard, p.x, p.y) : null,
      );
      e?.yard.hop(id, 'collect');
      say(garden.collected(x.def.yield, produceName(x.def.product).toLowerCase()), 'reward');
    });
  };

  const hiveItems: ProduceId[] = [
    ...Array.from({ length: HIVE.yield.honey }, () => 'honey' as const),
    ...Array.from({ length: HIVE.yield.honeycomb }, () => 'honeycomb' as const),
  ];

  const startHive = () => {
    if (hiveSt !== 'idle') return;
    once('hive-start', () => {
      dispatch({ type: 'START_HIVE', now: currentTime() });
      engine.current?.hive.start();
      say(r.hive.started(formatDuration(HIVE.hours * HOUR_MS)), 'success');
    });
  };

  const collectHive = () => {
    if (hiveSt !== 'ready') return;
    once('hive-collect', () => {
      dispatch({ type: 'COLLECT_HIVE', now: currentTime() });
      const e = engine.current;
      const p = e?.hive.honeyPoint();
      fly(hiveItems, e && p ? e.scene.toClient(e.hive, p.x, p.y) : null);
      e?.hive.collect();
      say(r.hive.collected(listItems(hiveItems)), 'reward');
    });
  };

  const sendBoat = () => {
    if (boatSt !== 'docked') return;
    once('boat-send', () => {
      dispatch({ type: 'SEND_BOAT', now: currentTime() });
      say(r.boat.sent(formatDuration(BOAT.hours * HOUR_MS)), 'success');
    });
  };

  const unloadBoat = () => {
    const sentAt = state.boat.sentAt;
    if (boatSt !== 'back' || sentAt === null) return;
    once('boat-collect', () => {
      // The same catch the reducer pays (it reads the level before this collect's XP).
      const items = boatCatch(sentAt, lv);
      dispatch({ type: 'COLLECT_BOAT', now: currentTime() });
      const e = engine.current;
      const p = e?.boat.catchPoint();
      fly(items, e && p ? e.scene.toClient(e.boat, p.x, p.y) : null);
      e?.boat.unload();
      say(r.boat.unloaded(listItems(items)), 'reward');
    });
  };

  const readyN = inPen.filter((x) => x.stage === 'ready').length;
  const hungryN = inPen.filter((x) => x.stage === 'hungry').length;
  const firstLocked = animals.find((x) => x.stage === 'locked');

  const hiveText =
    hiveSt === 'locked'
      ? r.hive.locked(HIVE.unlockLevel)
      : hiveSt === 'idle'
        ? r.hive.idle
        : hiveSt === 'ready'
          ? r.hive.ready
          : r.hive.filling(formatDuration((state.hive.readyAt ?? now) - now));
  const boatText =
    boatSt === 'locked'
      ? r.boat.locked(BOAT.unlockLevel)
      : boatSt === 'docked'
        ? r.boat.docked
        : boatSt === 'back'
          ? r.boat.back
          : r.boat.away(formatDuration((state.boat.returnAt ?? now) - now));

  return (
    <div className="rn">
      <p className="fj-section__intro">{r.intro}</p>

      <section className="rn-sec" aria-labelledby="rn-pens">
        <h3 className="rn-sec__title" id="rn-pens">
          {r.pens.title}
        </h3>
        <div className="rn-stage rn-stage--yard">
          <canvas ref={yardRef} className="rn-canvas" aria-hidden="true" />
          {!inPen.length && firstLocked && (
            <p className="rn-stage__note">
              {r.pens.empty(firstLocked.def.name, firstLocked.def.unlockLevel)}
            </p>
          )}
        </div>
        {inPen.length > 0 && (
          <p className="rn-sr">{r.pens.summary(inPen.length, readyN, hungryN)}</p>
        )}
        <ul className="rn-pens">
          {animals.map(({ def, stage, have, a }) => {
            const feedName = produceName(def.feed).toLowerCase();
            const productName = produceName(def.product).toLowerCase();
            const name = def.name.toLowerCase();
            const noFeedId = `rn-nofeed-${def.id}`;
            return (
              <li key={def.id} className="rn-card" data-state={stage}>
                <img
                  className="rn-card__pic"
                  src={animalSprite(def.id, stage === 'locked' ? 'young' : 'adult')}
                  alt=""
                  loading="lazy"
                />
                <div className="rn-card__text">
                  <h4 className="rn-card__name">{def.name}</h4>
                  <p className="rn-card__state">
                    {stage === 'locked'
                      ? r.state.locked(def.unlockLevel)
                      : stage === 'hungry'
                        ? r.state.hungry
                        : stage === 'ready'
                          ? r.state.ready
                          : r.state.busy(formatDuration((a.readyAt ?? now) - now))}
                  </p>
                  {stage === 'hungry' && have <= 0 && (
                    <p className="rn-card__why" id={noFeedId}>
                      {r.noFeed(feedName)}
                    </p>
                  )}
                </div>
                {stage === 'hungry' && (
                  <button
                    type="button"
                    className="rn-btn"
                    disabled={have <= 0}
                    aria-label={r.feedLabel(name, feedName, have)}
                    aria-describedby={have <= 0 ? noFeedId : undefined}
                    onClick={() => feed(def.id)}
                  >
                    <img src={produceSprite(def.feed)} alt="" className="rn-btn__icon" />
                    <span>{r.feed(feedName, have)}</span>
                  </button>
                )}
                {stage === 'ready' && (
                  <button
                    type="button"
                    className="rn-btn rn-btn--gold"
                    aria-label={r.collectLabel(name, def.yield, productName)}
                    onClick={() => collect(def.id)}
                  >
                    <img src={produceSprite(def.product)} alt="" className="rn-btn__icon" />
                    <span>{r.collect(def.yield, productName)}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rn-sec" aria-labelledby="rn-hive">
        <h3 className="rn-sec__title" id="rn-hive">
          {r.hive.title}
        </h3>
        <div className="rn-stage rn-stage--hive" data-locked={hiveSt === 'locked' || undefined}>
          <canvas ref={hiveRef} className="rn-canvas" aria-hidden="true" />
        </div>
        <div className="rn-row">
          <p className="rn-status" data-state={hiveSt}>
            {hiveText}
          </p>
          {hiveSt === 'idle' && (
            <button type="button" className="rn-btn" onClick={startHive}>
              {r.hive.start}
            </button>
          )}
          {hiveSt === 'ready' && (
            <button
              type="button"
              className="rn-btn rn-btn--gold"
              aria-label={r.hive.collectLabel(listItems(hiveItems))}
              onClick={collectHive}
            >
              <img src={produceSprite('honey')} alt="" className="rn-btn__icon" />
              <span>{r.hive.collect}</span>
            </button>
          )}
        </div>
      </section>

      <section className="rn-sec" aria-labelledby="rn-pond">
        <h3 className="rn-sec__title" id="rn-pond">
          {r.pond.title}
        </h3>
        <div className="rn-stage rn-stage--pond">
          <canvas ref={pondRef} className="rn-canvas" aria-hidden="true" />
        </div>
        <p className="rn-status">
          {r.pond.living(pondOpen.map((k) => produceName(k).toLowerCase()).join(', '))}
          {pondNext ? ` ${r.pond.next(produceName(pondNext.id), pondNext.unlockLevel)}` : ''}
        </p>
        <p className="rn-hint">{r.pond.hint}</p>
      </section>

      <section className="rn-sec" aria-labelledby="rn-boat">
        <h3 className="rn-sec__title" id="rn-boat">
          {r.boat.title}
        </h3>
        <div className="rn-stage rn-stage--boat">
          <canvas ref={boatRef} className="rn-canvas" aria-hidden="true" />
        </div>
        <div className="rn-row">
          <p className="rn-status" data-state={boatSt}>
            {boatText}
          </p>
          {boatSt === 'docked' && (
            <button type="button" className="rn-btn" onClick={sendBoat}>
              {r.boat.send}
            </button>
          )}
          {boatSt === 'back' && (
            <button type="button" className="rn-btn rn-btn--gold" onClick={unloadBoat}>
              {r.boat.unload}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
