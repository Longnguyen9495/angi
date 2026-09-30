import { BookOpenText, CookingPot, SealCheck } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ProduceImage } from '../../../components/ui/CropVisual';
import { Sheet } from '../../../components/ui/Sheet';
import { cookPlan } from '../../../data/cooking';
import { RECIPES, produceName } from '../../../data/game';
import type { RecipeId } from '../../../data/types';
import { recipeProgress } from '../../../domain/selectors';
import { currentTime } from '../../../domain/time';
import { useFeedback, useGame } from '../../../state/hooks';
import { getReelDish } from '../data/reelCatalogue';

type Step = 'prep' | 'cooking' | 'done';

/** How often the countdown text refreshes; the bars and the ring animate in CSS. */
const TICK_MS = 200;

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface CookingSheetProps {
  recipeId: RecipeId | null;
  onClose: () => void;
  onOpenCookbook: () => void;
}

/**
 * The cooking scene: ingredients drop into the pot, then the dish runs through
 * its own timeline of stages (each family of dishes cooks differently) while a
 * countdown runs down, and the dish comes out. The COOK action is committed the
 * moment cooking starts, so closing the sheet mid-cook never loses or
 * duplicates the result.
 */
export function CookingSheet({ recipeId, onClose, onOpenCookbook }: CookingSheetProps) {
  return (
    <Sheet
      open={recipeId !== null}
      onClose={onClose}
      title={recipeId ? RECIPES[recipeId].name : ''}
      description="Bếp của Cô Ba"
      variant="dark"
    >
      {recipeId && (
        <CookingScene key={recipeId} recipeId={recipeId} onOpenCookbook={onOpenCookbook} />
      )}
    </Sheet>
  );
}

function CookingScene({
  recipeId,
  onOpenCookbook,
}: {
  recipeId: RecipeId;
  onOpenCookbook: () => void;
}) {
  const { state, dispatch } = useGame();
  const { announce } = useFeedback();
  const [step, setStep] = useState<Step>('prep');
  const recipe = RECIPES[recipeId];
  const dish = getReelDish(recipe.dishId);
  const canCook = recipeProgress(state, recipeId).canCook;
  const cooked = state.cooked[recipeId] ?? 0;
  const drops = recipe.ingredients.flatMap((i) =>
    Array.from({ length: i.qty }, (_, k) => ({ crop: i.crop, key: `${i.crop}-${k}` })),
  );
  const plan = useMemo(() => cookPlan(recipe), [recipe]);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (step !== 'cooking') return;
    const t = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= plan.totalMs) setStep('done');
    }, TICK_MS);
    return () => clearInterval(t);
  }, [step, plan.totalMs]);

  const start = () => {
    if (!canCook || step !== 'prep') return;
    dispatch({ type: 'COOK', recipeId, now: currentTime() });
    announce(`Đang nấu ${recipe.name}.`);
    startedAt.current = Date.now();
    setElapsed(0);
    setStep('cooking');
  };

  useEffect(() => {
    if (step === 'done') announce(`Đã nấu xong ${recipe.name}. Cộng ${recipe.xp} XP.`);
  }, [step, announce, recipe]);

  let stageIndex = 0;
  let stage = plan.stages[0];
  plan.stages.forEach((s, i) => {
    if (elapsed < s.startMs) return;
    stageIndex = i;
    stage = s;
  });
  const heat = step === 'cooking' ? (stage?.heat ?? 'low') : step === 'done' ? 'low' : 'off';

  return (
    <div
      className="fj-cook"
      data-step={step}
      data-heat={heat}
      style={{ '--total': `${plan.totalMs}ms` } as CSSProperties}
    >
      <div className="fj-cook__stage" aria-hidden="true">
        <div className="fj-cook__drops">
          {drops.map((d, i) => (
            <span
              key={d.key}
              className="fj-cook__drop"
              style={{ '--i': i, '--n': drops.length } as CSSProperties}
            >
              <ProduceImage crop={d.crop} size={54} />
            </span>
          ))}
        </div>
        <span className="fj-cook__glow" />
        <div className="fj-cook__pot">
          <span className="fj-cook__lid" />
          <span className="fj-cook__body" />
          <span className="fj-cook__bubbles">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="fj-cook__steam">
            <span />
            <span />
            <span />
          </span>
        </div>
        <span className="fj-cook__fire">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        {step === 'done' && dish && (
          <img
            className="fj-cook__dish"
            src={dish.thumbnail}
            alt=""
            width={384}
            height={384}
            decoding="async"
          />
        )}
      </div>

      {step === 'prep' && (
        <>
          <ul className="fj-cook__list" aria-label="Nguyên liệu">
            {recipe.ingredients.map((i) => (
              <li key={i.crop}>
                <ProduceImage crop={i.crop} size={30} />
                {produceName(i.crop)} ×{i.qty}
                <span className="fj-cook__have">có {state.ingredients[i.crop]}</span>
              </li>
            ))}
          </ul>
          <p className="fj-note">
            {plan.stages.length} bước · khoảng {Math.ceil(plan.totalMs / 1000)} giây
          </p>
          <button type="button" className="fr-cta" onClick={start} aria-disabled={!canCook}>
            <CookingPot aria-hidden="true" size={18} />
            {canCook ? 'Bắt đầu nấu' : 'Chưa đủ nguyên liệu'}
          </button>
        </>
      )}

      {step === 'cooking' && (
        <div className="fj-timer">
          <div className="fj-timer__head">
            <span className="fj-timer__ring" aria-hidden="true">
              {/* A CSS conic ring fed by the elapsed time — no SVG is animated. */}
              <span
                className="fj-timer__fill"
                style={{ '--p': Math.min(1, elapsed / plan.totalMs).toFixed(4) } as CSSProperties}
              />
              <span className="fj-timer__clock">{formatClock(plan.totalMs - elapsed)}</span>
            </span>
            <p className="fj-timer__now" role="status">
              <span className="fj-timer__count">
                Bước {stageIndex + 1}/{plan.stages.length}
              </span>
              <span key={stageIndex} className="fj-timer__label">
                {stage?.label}…
              </span>
            </p>
          </div>
          <ol className="fj-steps" aria-label="Các bước nấu">
            {plan.stages.map((s, i) => (
              <li
                key={s.label}
                className="fj-steps__item"
                data-state={i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'todo'}
                style={
                  {
                    '--start': `${s.startMs}ms`,
                    '--dur': `${s.durationMs}ms`,
                    '--grow': s.weight,
                  } as CSSProperties
                }
              >
                <span className="fj-steps__bar" aria-hidden="true">
                  <i />
                </span>
                <span className="fj-steps__label">{s.label}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {step === 'done' && (
        <div className="fj-cook__result">
          <p className="fr-kicker">
            <SealCheck aria-hidden="true" size={16} weight="fill" /> Đã nấu xong · +{recipe.xp} XP
          </p>
          <p className="fj-cook__fact">{recipe.fact}</p>
          <p className="fj-note">
            {cooked === 1
              ? 'Trang mới trong sổ bếp — câu chuyện của món trên reel giờ có dấu “Tự nấu”.'
              : `Bạn đã nấu món này ${cooked} lần.`}
          </p>
          <button type="button" className="fr-ghost" onClick={onOpenCookbook}>
            <BookOpenText aria-hidden="true" size={16} />
            Xem sổ bếp
          </button>
        </div>
      )}
    </div>
  );
}
