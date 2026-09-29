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
import { CROPS, RECIPES, REGIONS } from '../../data/game';
import type { AgainAnswer, CheckInOutcome, GuestProgress } from '../../domain/progress';
import { gameReducer } from '../../domain/reducer';
import { plotStage, recipeProgress } from '../../domain/selectors';
import { useFeedback, useGame, useUi } from '../../state/hooks';
import { Sheet } from '../ui/Sheet';
import { currentTime } from '../../domain/time';

const OUTCOMES: { id: CheckInOutcome; label: string; hint: string }[] = [
  { id: 'ate', label: 'Đã ăn món này', hint: 'Nhận dấu “đã ăn” cho món' },
  { id: 'swapped', label: 'Đổi sang món khác', hint: 'Vẫn tính check-in, cây vẫn lớn' },
  { id: 'skipped', label: 'Bỏ bữa', hint: 'Không sao, không mất gì' },
];

const RATINGS: { value: number; label: string; icon: Icon }[] = [
  { value: 1, label: 'Không hợp', icon: SmileyXEyes },
  { value: 2, label: 'Tạm được', icon: SmileySad },
  { value: 3, label: 'Ổn', icon: SmileyMeh },
  { value: 4, label: 'Ngon', icon: Smiley },
  { value: 5, label: 'Rất ngon', icon: SmileyWink },
];

const AGAIN: { id: AgainAnswer; label: string }[] = [
  { id: 'yes', label: 'Có, gợi ý lại nhé' },
  { id: 'maybe', label: 'Thỉnh thoảng' },
  { id: 'no', label: 'Không, ẩn món này' },
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
  if (xp > 0) lines.push(`+${xp} XP (tính cả nhiệm vụ ngày)`);
  const meal = before.meal;
  const dish = meal ? getDish(meal.dishId) : undefined;
  if (meal?.plotId) {
    const b = before.plots.find((p) => p.id === meal.plotId);
    const a = after.plots.find((p) => p.id === meal.plotId);
    const now = currentTime();
    if (b && a && a.crop && plotStage(b, now) !== 'ready' && plotStage(a, now) === 'ready') {
      lines.push(`Cây ${CROPS[a.crop].name.toLowerCase()} ở ô ${a.id} đã lớn — sẵn sàng thu hoạch`);
    }
  }
  if (after.stamps.eaten.length > before.stamps.eaten.length && dish) {
    lines.push(`+1 dấu hành trình: đã ăn ${dish.name}`);
  }
  for (const r of after.unlockedRegions) {
    if (!before.unlockedRegions.includes(r)) lines.push(`Mở vùng mới: ${REGIONS[r].name}!`);
  }
  if (dish) {
    const rp = recipeProgress(after, dish.recipe);
    lines.push(`${RECIPES[dish.recipe].name}: ${rp.secured}/${rp.total} nguyên liệu`);
  }
  if (after.hiddenDishIds.length > before.hiddenDishIds.length && dish) {
    lines.push(`Đã ẩn ${dish.name} khỏi gợi ý (bật lại trong Hồ sơ)`);
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
    announce(`Check-in xong. ${s.lines.join('. ')}.`);
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
    body = <p>Bạn chưa chốt món nào. Hãy chọn món trước, rồi quay lại check-in sau bữa.</p>;
  } else if (summary) {
    body = (
      <div className="checkin-summary">
        <p className="checkin-summary__lead" tabIndex={-1}>
          <CheckCircle aria-hidden="true" size={22} weight="fill" />
          {summary.outcome === 'skipped'
            ? 'Đã ghi nhận bỏ bữa. Cây vẫn lớn theo thời gian, không mất gì cả.'
            : 'Cảm ơn bạn! Đây là những gì bạn nhận được:'}
        </p>
        <ul className="reward-list">
          {summary.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    );
  } else if (meal.checkedIn) {
    body = <p>Bữa này đã check-in rồi. Mỗi bữa chỉ nhận thưởng check-in một lần.</p>;
  } else {
    body = (
      <form
        className="checkin-form"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <p className="checkin-form__step">
          Bước {step}/{total}
        </p>
        {step === 1 && (
          <fieldset className="option-group">
            <legend className="option-group__legend">Bữa vừa rồi của bạn thế nào?</legend>
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
                    {o.id === 'ate' ? `Đã ăn ${dish.name}` : o.label}
                  </span>
                  <span className="option-card__hint">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="option-group">
            <legend className="option-group__legend">Bạn hài lòng đến đâu?</legend>
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
              <Heart aria-hidden="true" size={18} /> Muốn gặp lại món này không?
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
              Quay lại
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={!canNext}>
            {step === total || (step === 1 && outcome === 'skipped') ? 'Hoàn tất' : 'Tiếp'}
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
      title="Check-in sau bữa"
      description={dish ? `Món đã chọn: ${dish.name}. Không cần ảnh hay viết review.` : undefined}
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
              Xem khu vườn
            </button>
            <button type="button" className="btn btn--ghost" onClick={close}>
              Đóng
            </button>
          </>
        ) : undefined
      }
    >
      <div ref={bodyRef}>{body}</div>
    </Sheet>
  );
}
