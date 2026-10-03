import { CaretDown, CheckCircle, Circle, Gift, Medal, TreasureChest } from '@phosphor-icons/react';
import { useState } from 'react';
import { getDish } from '../../../data/dishes';
import {
  ACHIEVEMENT_GROUPS,
  STREAK_CHESTS,
  badgeReward,
  badgeTitle,
  badges,
  dailyQuests,
  weeklyQuests,
  type AchievementGroup,
  type BadgeView,
  type QuestReward,
  type QuestView,
} from '../../../domain/quests';
import { currentTime } from '../../../domain/time';
import { t } from '../../../i18n';
import { useFeedback, useGame } from '../../../state/hooks';

const m = t.journey.missions;
const OUTCOME = m.outcome;

function rewardParts(r: QuestReward): string[] {
  return [
    r.xp > 0 ? m.reward.xp(r.xp) : '',
    r.coins > 0 ? m.reward.coins(r.coins) : '',
    r.seeds > 0 ? m.reward.seeds(r.seeds) : '',
    r.water > 0 ? m.reward.water(r.water) : '',
  ].filter(Boolean);
}

/** Days left in the Monday-start week, today included. */
function daysLeftInWeek(now: number): number {
  return 7 - ((new Date(now).getDay() + 6) % 7);
}

/**
 * Quests: the streak chest, today's quests, this week's, and the achievements. A finished
 * quest waits for a tap on "Nhận" so the reward is seen, not silently added.
 */
export function MissionsSection() {
  const { state, now, dispatch } = useGame();
  const { toast } = useFeedback();

  const paid = (r: QuestReward) =>
    toast({ message: m.got(rewardParts(r).join(' · ')), tone: 'reward' });

  const claim = (v: QuestView) => {
    dispatch({ type: 'CLAIM_QUEST', id: v.def.id, now: currentTime() });
    paid(v.def.reward);
  };
  const claimBadge = (b: BadgeView) => {
    dispatch({ type: 'CLAIM_BADGE', id: b.def.id, now: currentTime() });
    paid(badgeReward(b.claimed + 1, b.def.id));
  };

  const chest = state.quests.chest;
  const nextChest = Object.keys(STREAK_CHESTS)
    .map(Number)
    .find((n) => n > state.streak.count);

  return (
    <div className="fj-quests">
      {chest ? (
        <div className="fj-chest is-ready">
          <TreasureChest size={34} weight="duotone" aria-hidden="true" />
          <div>
            <p className="fj-chest__title">{m.chestTitle(chest.streak)}</p>
            <p className="fj-note">{m.chestBody}</p>
            <p className="fj-chest__reward">
              {rewardParts(STREAK_CHESTS[chest.streak]!).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            className="fr-cta"
            onClick={() => {
              dispatch({ type: 'OPEN_CHEST', now: currentTime() });
              paid(STREAK_CHESTS[chest.streak]!);
            }}
          >
            {m.openChest}
          </button>
        </div>
      ) : (
        nextChest !== undefined && (
          <p className="fj-chest__next">
            <TreasureChest size={18} aria-hidden="true" />
            {m.chestNext(nextChest, nextChest - state.streak.count)}
          </p>
        )
      )}

      <section aria-labelledby="fj-q-daily">
        <div className="fj-quests__head">
          <h3 className="fj-h3" id="fj-q-daily">
            {m.daily}
          </h3>
          <p className="fj-note">{m.dailyNote}</p>
        </div>
        <QuestList list={dailyQuests(state, now)} onClaim={claim} />
      </section>

      <section aria-labelledby="fj-q-weekly">
        <div className="fj-quests__head">
          <h3 className="fj-h3" id="fj-q-weekly">
            {m.weekly}
          </h3>
          <p className="fj-note">{m.weeklyNote(daysLeftInWeek(now))}</p>
        </div>
        <QuestList list={weeklyQuests(state, now)} onClaim={claim} />
      </section>

      <BadgeShelves list={badges(state)} onClaim={claimBadge} />
    </div>
  );
}

/** Ready to claim first, then in progress (closest to its next tier first), then maxed. */
function badgeOrder(a: BadgeView, b: BadgeView): number {
  const rank = (v: BadgeView) => (v.ready ? 0 : v.next === null ? 2 : 1);
  const share = (v: BadgeView) => (v.next ? v.value / v.next : 0);
  return rank(a) - rank(b) || share(b) - share(a);
}

/**
 * The achievements in four shelves (meals, garden, ranch & market, friends & the farm).
 * A shelf opens by itself when it holds something to claim; the others stay folded.
 */
function BadgeShelves({ list, onClaim }: { list: BadgeView[]; onClaim: (b: BadgeView) => void }) {
  const [open, setOpen] = useState<Partial<Record<AchievementGroup, boolean>>>({});
  const done = list.filter((b) => b.next === null).length;
  // A shelf that opened by itself stays open once something in it is claimed.
  const claim = (b: BadgeView) => {
    setOpen((o) => ({ ...o, [b.def.group]: true }));
    onClaim(b);
  };
  return (
    <section aria-labelledby="fj-q-badges" className="fj-shelves">
      <div className="fj-quests__head">
        <h3 className="fj-h3" id="fj-q-badges">
          {m.badges}
        </h3>
        <p className="fj-note">{m.badgesDone(done, list.length)}</p>
      </div>
      {ACHIEVEMENT_GROUPS.map((g) => {
        const items = list.filter((b) => b.def.group === g).sort(badgeOrder);
        const ready = items.filter((b) => b.ready).length;
        const isOpen = open[g] ?? ready > 0;
        const id = `fj-shelf-${g}`;
        return (
          <div key={g} className={`fj-shelf${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="fj-shelf__head"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen((o) => ({ ...o, [g]: !isOpen }))}
            >
              <span className="fj-shelf__name">{m.groups[g]}</span>
              <span className="fj-shelf__meta">
                {ready > 0 && <span className="fj-shelf__ready">{m.badgesReady(ready)}</span>}
                {items.filter((b) => b.next === null).length}/{items.length}
              </span>
              <CaretDown size={16} aria-hidden="true" className="fj-shelf__caret" />
            </button>
            {isOpen && (
              <ul className="fj-badges" id={id}>
                {items.map((b) => (
                  <BadgeCard key={b.def.id} b={b} onClaim={claim} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

function BadgeCard({ b, onClaim }: { b: BadgeView; onClaim: (b: BadgeView) => void }) {
  const title = badgeTitle(b.def.id);
  const total = b.def.tiers.length;
  const goal = b.next ?? b.def.tiers[total - 1]!;
  return (
    <li className={`fj-badge${b.ready ? ' is-ready' : ''}${b.claimed > 0 ? ' has-tier' : ''}`}>
      <Medal size={26} weight={b.claimed > 0 ? 'fill' : 'regular'} aria-hidden="true" />
      <div className="fj-badge__text">
        <p className="fj-badge__name">
          {title.name}
          <span className="fj-dots" role="img" aria-label={m.tier(b.claimed, total)}>
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={i < b.claimed ? 'is-on' : ''} />
            ))}
          </span>
        </p>
        <p className="fj-note">
          {b.next === null ? m.maxed : title.goal(goal)}
          {b.next !== null && ` · ${m.progress(Math.min(b.value, goal), goal)}`}
        </p>
        {b.next !== null && (
          <Meter value={Math.min(b.value, goal)} max={goal} label={title.goal(goal)} />
        )}
      </div>
      {b.ready && (
        <button type="button" className="fr-cta" onClick={() => onClaim(b)}>
          {m.claim}
        </button>
      )}
    </li>
  );
}

function QuestList({ list, onClaim }: { list: QuestView[]; onClaim: (v: QuestView) => void }) {
  return (
    <ul className="fj-missions">
      {list.map((v) => (
        <li key={v.def.id} className={`fj-mission is-${v.status}`}>
          {v.status === 'claimed' ? (
            <CheckCircle aria-hidden="true" size={22} weight="fill" />
          ) : v.status === 'ready' ? (
            <Gift aria-hidden="true" size={22} weight="fill" />
          ) : (
            <Circle aria-hidden="true" size={22} />
          )}
          <span className="fj-mission__body">
            <span className="fj-mission__title">{v.title}</span>
            <span className="fj-mission__xp">{rewardParts(v.def.reward).join(' · ')}</span>
            {v.status === 'open' && v.def.target > 1 && (
              <Meter value={v.progress} max={v.def.target} label={v.title} />
            )}
          </span>
          {v.status === 'ready' ? (
            <button type="button" className="fr-cta fj-mission__claim" onClick={() => onClaim(v)}>
              {m.claim}
            </button>
          ) : (
            <span className="fj-mission__count">
              {v.status === 'claimed' ? m.claimed : m.progress(v.progress, v.def.target)}
            </span>
          )}
          <span className="sr-only">{v.status === 'open' ? m.notDone : m.done}</span>
        </li>
      ))}
    </ul>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span
      className="fj-meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <i style={{ width: `${(value / max) * 100}%` }} />
    </span>
  );
}

export function MealLog() {
  const { state } = useGame();
  if (state.history.length === 0) {
    return <p className="fj-note">{m.logEmpty}</p>;
  }
  return (
    <ol className="fj-log">
      {state.history.slice(0, 6).map((h) => {
        const d = new Date(h.at);
        return (
          <li key={`${h.slotKey}-${h.at}`} className="fj-log__row">
            <span className="fj-log__date">
              {m.logDate(
                String(d.getDate()).padStart(2, '0'),
                String(d.getMonth() + 1).padStart(2, '0'),
              )}
            </span>
            <span className="fj-log__dish">{getDish(h.dishId)?.name ?? h.dishId}</span>
            <span className="fj-log__meta">
              {OUTCOME[h.outcome]}
              {h.rating ? ` · ${h.rating}/5` : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
