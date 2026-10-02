import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Heart,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes,
  type Icon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { getDish } from '../../data/dishes';
import { CROPS, getRecipe, REGIONS } from '../../data/game';
import type { AgainAnswer, CheckInOutcome, GuestProgress } from '../../domain/progress';
import { gameReducer } from '../../domain/reducer';
import { plotStage, recipeProgress } from '../../domain/selectors';
import { useFeedback, useGame, useUi } from '../../state/hooks';
import { Sheet } from '../ui/Sheet';
import { PhotoCapture } from './PhotoCapture';
import { currentTime } from '../../domain/time';
import { t } from '../../i18n';

const m = t.account.checkin;

const OUTCOMES: { id: CheckInOutcome; label: string; hint: string }[] = [
  { id: 'ate', label: m.outcomes.ate.label, hint: m.outcomes.ate.hint },
  { id: 'swapped', label: m.outcomes.swapped.label, hint: m.outcomes.swapped.hint },
  { id: 'skipped', label: m.outcomes.skipped.label, hint: m.outcomes.skipped.hint },
];

const RATINGS: { value: number; label: string; icon: Icon }[] = [
  { value: 1, label: m.ratings[0], icon: SmileyXEyes },
  { value: 2, label: m.ratings[1], icon: SmileySad },
  { value: 3, label: m.ratings[2], icon: SmileyMeh },
  { value: 4, label: m.ratings[3], icon: Smiley },
  { value: 5, label: m.ratings[4], icon: SmileyWink },
];

const AGAIN: { id: AgainAnswer; label: string }[] = [
  { id: 'yes', label: m.again.yes },
  { id: 'maybe', label: m.again.maybe },
  { id: 'no', label: m.again.no },
];

interface Summary {
  lines: string[];
  outcome: CheckInOutcome;
}

function buildSummary(
  before: GuestProgress,
  after: GuestProgress,
  outcome: CheckInOutcome,
): Summary {
  const lines: string[] = [];
  const xp = after.xp - before.xp;
  if (xp > 0) lines.push(m.summary.xp(xp));
  const meal = before.meal;
  const dish = meal ? getDish(meal.dishId) : undefined;
  if (meal?.plotId) {
    const b = before.plots.find((p) => p.id === meal.plotId);
    const a = after.plots.find((p) => p.id === meal.plotId);
    const now = currentTime();
    if (b && a && a.crop && plotStage(b, now) !== 'ready' && plotStage(a, now) === 'ready') {
      lines.push(m.summary.ready(CROPS[a.crop].name.toLowerCase(), a.id));
    }
  }
  if (after.stamps.eaten.length > before.stamps.eaten.length && dish) {
    lines.push(m.summary.stamp(dish.name));
  }
  for (const r of after.unlockedRegions) {
    if (!before.unlockedRegions.includes(r)) lines.push(m.summary.region(REGIONS[r].name));
  }
  if (dish) {
    const rp = recipeProgress(after, dish.recipe);
    lines.push(m.summary.recipe(getRecipe(dish.recipe).name, rp.secured, rp.total));
  }
  if (after.hiddenDishIds.length > before.hiddenDishIds.length && dish) {
    lines.push(m.summary.hidden(dish.name));
  }
  return { lines, outcome };
}

export function CheckInSheet({
  open,
  onClose,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  variant?: 'light' | 'dark';
}) {
  const { state, dispatch } = useGame();
  const { announce } = useFeedback();
  const { focusSection } = useUi();
  const [step, setStep] = useState(1);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [again, setAgain] = useState<AgainAnswer | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const meal = state.meal;
  const dish = meal ? getDish(meal.dishId) : undefined;
  const bodyRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Keep keyboard focus on the new step (or the summary) instead of a stale button.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const root = bodyRef.current;
    const target =
      root?.querySelector<HTMLElement>('.checkin-summary__lead') ??
      root?.querySelector<HTMLElement>('input:checked') ??
      root?.querySelector<HTMLElement>('input');
    target?.focus();
  }, [step, summary]);

  const close = () => {
    onClose();
    setStep(1);
    setOutcome(null);
    setRating(null);
    setAgain(null);
    setSummary(null);
  };

  const finish = (o: CheckInOutcome) => {
    if (!meal || meal.checkedIn) return;
    const action = {
      type: 'CHECK_IN' as const,
      outcome: o,
      rating: o === 'skipped' ? null : rating,
      again: o === 'skipped' ? null : again,
      now: currentTime(),
    };
    const next = gameReducer(state, action);
    dispatch(action);
    const s = buildSummary(state, next, o);
    setSummary(s);
    announce(m.doneAnnounce(s.lines.join('. ')));
  };

  const total = outcome === 'skipped' ? 1 : 3;
  const canNext =
    (step === 1 && outcome !== null) ||
    (step === 2 && rating !== null) ||
    (step === 3 && again !== null);

  const next = () => {
    if (!canNext || !outcome) return;
    if (step === 1 && outcome === 'skipped') return finish('skipped');
    if (step < 3) setStep(step + 1);
    else finish(outcome);
  };

  let body;
  if (!meal || !dish) {
    body = <p>{m.noMeal}</p>;
  } else if (summary) {
    body = (
      <div className="checkin-summary">
        <p className="checkin-summary__lead" tabIndex={-1}>
          <CheckCircle aria-hidden="true" size={22} weight="fill" />
          {summary.outcome === 'skipped' ? m.skippedLead : m.thanksLead}
        </p>
        <ul className="reward-list">
          {summary.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {summary.outcome !== 'skipped' && (
          <PhotoCapture slotKey={meal.slotKey} dishId={meal.dishId} />
        )}
      </div>
    );
  } else if (meal.checkedIn) {
    body = <p>{m.alreadyCheckedIn}</p>;
  } else {
    body = (
      <form
        className="checkin-form"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <p className="checkin-form__step">{m.step(step, total)}</p>
        {step === 1 && (
          <fieldset className="option-group">
            <legend className="option-group__legend">{m.outcomeQuestion}</legend>
            {OUTCOMES.map((o) => (
              <label key={o.id} className="option-card">
                <input
                  type="radio"
                  name="outcome"
                  value={o.id}
                  checked={outcome === o.id}
                  onChange={() => setOutcome(o.id)}
                  data-autofocus={o.id === 'ate' ? true : undefined}
                />
                <span className="option-card__face">
                  <span className="option-card__label">
                    {o.id === 'ate' ? m.outcomes.ateDish(dish.name) : o.label}
                  </span>
                  <span className="option-card__hint">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="option-group">
            <legend className="option-group__legend">{m.ratingQuestion}</legend>
            <div className="rating-row">
              {RATINGS.map((r) => {
                const RatingIcon = r.icon;
                return (
                  <label key={r.value} className="rating">
                    <input
                      type="radio"
                      name="rating"
                      value={r.value}
                      checked={rating === r.value}
                      onChange={() => setRating(r.value)}
                      data-autofocus={r.value === 3 ? true : undefined}
                    />
                    <span className="rating__face">
                      <RatingIcon aria-hidden="true" size={28} weight="light" />
                      <span className="rating__label">{r.label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {step === 3 && (
          <fieldset className="option-group">
            <legend className="option-group__legend">
              <Heart aria-hidden="true" size={18} /> {m.againQuestion}
            </legend>
            {AGAIN.map((a) => (
              <label key={a.id} className="option-card option-card--compact">
                <input
                  type="radio"
                  name="again"
                  value={a.id}
                  checked={again === a.id}
                  onChange={() => setAgain(a.id)}
                />
                <span className="option-card__face">
                  <span className="option-card__label">{a.label}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <div className="checkin-form__nav">
          {step > 1 && (
            <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft aria-hidden="true" size={18} />
              {m.back}
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={!canNext}>
            {step === total || (step === 1 && outcome === 'skipped') ? m.finish : m.next}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </form>
    );
  }

  return (
    <Sheet
      variant={variant}
      open={open}
      onClose={close}
      title={m.title}
      description={dish ? m.description(dish.name) : undefined}
      footer={
        summary ? (
          <>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                close();
                focusSection('khu-vuon');
              }}
            >
              {m.viewGarden}
            </button>
            <button type="button" className="btn btn--ghost" onClick={close}>
              {m.close}
            </button>
          </>
        ) : undefined
      }
    >
      <div ref={bodyRef}>{body}</div>
    </Sheet>
  );
}
