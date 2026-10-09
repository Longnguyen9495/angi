import { BookOpenText, CookingPot, SealCheck } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ProduceImage } from '../../../components/ui/CropVisual';
import { Sheet } from '../../../components/ui/Sheet';
import { cookPlan } from '../../../data/cooking';
import { getRecipe, produceName } from '../../../data/game';
import type { RecipeId } from '../../../data/types';
import { recipeProgress } from '../../../domain/selectors';
import { currentTime } from '../../../domain/time';
import { t } from '../../../i18n';
import { useFeedback, useGame } from '../../../state/hooks';
import { getReelDish } from '../data/reelCatalogue';
import { DishPuzzle } from './DishPuzzle';
import { PUZZLE_PIECES } from './puzzle';

type Step = 'prep' | 'cooking' | 'done';

/** How often the countdown text refreshes; the bars and the ring animate in CSS. */
const TICK_MS = 200;
const m = t.journey.cooking;

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
 * its own timeline of stages (each recipe has its own steps and heat) while a
 * countdown runs down, and the dish comes out. The COOK action is committed the
 * moment cooking starts, so closing the sheet mid-cook never loses or
 * duplicates the result.
 */
export function CookingSheet({ recipeId, onClose, onOpenCookbook }: CookingSheetProps) {
  return (
    <Sheet
      open={recipeId !== null}
      onClose={onClose}
      title={recipeId ? getRecipe(recipeId).name : ''}
      description={m.description}
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
  const recipe = getRecipe(recipeId);
  const dish = getReelDish(recipe.dishId);
  const canCook = recipeProgress(state, recipeId).canCook;
  const cooked = state.cooked[recipeId] ?? 0;
  const plan = cookPlan(recipe);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (step !== 'cooking') return;
    const timer = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= plan.totalMs) setStep('done');
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [step, plan.totalMs]);

  const start = () => {
    if (!canCook || step !== 'prep') return;
    dispatch({ type: 'COOK', recipeId, now: currentTime() });
    announce(m.started(recipe.name));
    startedAt.current = currentTime();
    setElapsed(0);
    setStep('cooking');
  };

  useEffect(() => {
    if (step === 'done') announce(m.finished(recipe.name, recipe.xp));
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
          {recipe.ingredients.map((d, i) => (
            <span
              key={d.crop}
              className="fj-cook__drop"
              style={{ '--i': i, '--n': recipe.ingredients.length } as CSSProperties}
            >
              <ProduceImage crop={d.crop} size={48} />
              {d.qty > 1 && <b className="fj-cook__badge">×{d.qty}</b>}
            </span>
          ))}
        </div>
        <span className="fj-cook__halo" />
        <span className="fj-cook__glow" />
        <span className="fj-cook__hob" />
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
          <ul className="fj-cook__list" aria-label={m.ingredients}>
            {recipe.ingredients.map((i) => {
              const have = state.ingredients[i.crop] ?? 0;
              return (
                <li key={i.crop} className="fj-cook__item" data-short={have < i.qty || undefined}>
                  <span className="fj-cook__thumb">
                    <ProduceImage crop={i.crop} size={36} />
                  </span>
                  <span className="fj-cook__name">{produceName(i.crop)}</span>
                  <span className="fj-cook__qty">×{i.qty}</span>
                  <span className="fj-cook__have">{m.have(have)}</span>
                </li>
              );
            })}
          </ul>
          <p className="fj-note fj-cook__plan">
            {m.plan(plan.stages.length, Math.ceil(plan.totalMs / 1000))}
          </p>
          <button
            type="button"
            className="fr-cta fj-cook__start"
            onClick={start}
            aria-disabled={!canCook}
          >
            <CookingPot aria-hidden="true" size={18} />
            {canCook ? m.start : m.notEnough}
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
              <span className="fj-timer__count">{m.step(stageIndex + 1, plan.stages.length)}</span>
              <span key={stageIndex} className="fj-timer__label">
                {stage?.label}…
              </span>
            </p>
          </div>
          <ol className="fj-steps" aria-label={m.stepsLabel}>
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
            <SealCheck aria-hidden="true" size={16} weight="fill" /> {m.done(recipe.xp)}
          </p>
          <span className="fj-cook__puzzle">
            <DishPuzzle recipe={recipe} cooked={cooked} fresh={cooked <= PUZZLE_PIECES} />
          </span>
          <p className="fj-cook__fact">{recipe.fact}</p>
          <p className="fj-note">{cooked === 1 ? m.firstPage : m.cookedTimes(cooked)}</p>
          {cooked <= PUZZLE_PIECES && (
            <p className="fj-note fj-cook__piece">{m.newPiece(cooked, PUZZLE_PIECES)}</p>
          )}
          <button type="button" className="fr-ghost" onClick={onOpenCookbook}>
            <BookOpenText aria-hidden="true" size={16} />
            {m.openCookbook}
          </button>
        </div>
      )}
    </div>
  );
}
