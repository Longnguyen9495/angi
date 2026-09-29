import {
  ArrowClockwise,
  Basket,
  Bell,
  BellRinging,
  CalendarCheck,
  FastForward,
  FloppyDisk,
  MapPin,
  Plant,
  SealCheck,
  Tray,
  WarningCircle,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { getDish } from '../../data/dishes';
import { CROPS, RECIPES, REGIONS } from '../../data/game';
import type { RegionId } from '../../data/types';
import type { MealSession } from '../../domain/progress';
import { REMINDER_DELAY_MS, gameReducer } from '../../domain/reducer';
import {
  firstEmptyPlot,
  nextLockedRegion,
  readyPlots,
  recipeProgress,
  regionProgress,
  type RecipeProgress,
  type RegionProgress,
} from '../../domain/selectors';
import { formatClock, currentTime } from '../../domain/time';
import { burstSoil, flyTo, pulseOnce, type EffectHandle } from '../../motion/effects';
import { createTimeline, type Timeline } from '../../motion/timeline';
import { confirmCommand, isAbortError } from '../../services/mockApi';
import { useFeedback, useGame, useUi } from '../../state/hooks';
import { SeedToken } from '../ui/CropVisual';
import { ProgressBar } from '../ui/ProgressBar';
import { NpcTeaser } from './NpcTeaser';
import { PlantingStage } from './PlantingStage';
import { stepAtLeast, type PlantStep } from './plantSteps';

type Phase = 'ready' | 'confirming' | 'error' | 'animating' | 'done';

interface Snapshot {
  recipe: RecipeProgress;
  region: RegionProgress | null;
}

/**
 * Planting storyboard (full motion, ~1.05s):
 *   0ms drop → 380ms impact (soil squash + ≤8 crumbs) → 470ms sprout
 *   → 760ms progress bars + region pin → 1000ms chef teaser.
 * State is committed *before* the sequence starts; visuals only lag behind,
 * so skip/cancel/unmount always leave the correct final state.
 */
const PLANT_TIMELINE: { at: number; step: PlantStep }[] = [
  { at: 380, step: 'impact' },
  { at: 470, step: 'sprout' },
  { at: 760, step: 'progress' },
  { at: 1000, step: 'settled' },
];

export function RewardPanel({ meal, justChosen }: { meal: MealSession; justChosen: boolean }) {
  const { state, dispatch, reduced, now } = useGame();
  const { announce, toast } = useFeedback();
  const { openCheckIn, focusSection } = useUi();

  const dish = getDish(meal.rewardDishId) ?? getDish(meal.dishId);
  const crop = CROPS[meal.seedCrop];
  const recipe = RECIPES[dish?.recipe ?? 'com-tam'];
  const dishRegion = dish?.region ?? 'south';
  // Dishes from abroad earn stamps but have no map region to light up.
  const mapRegion: RegionId | null = dishRegion === 'world' ? null : dishRegion;
  const regionName = mapRegion ? REGIONS[mapRegion].name : 'Ẩm thực thế giới';

  const [phase, setPhase] = useState<Phase>(meal.planted ? 'done' : 'ready');
  const [step, setStep] = useState<PlantStep>(meal.planted ? 'settled' : 'waiting');
  const [before, setBefore] = useState<Snapshot | null>(null);
  const [landed, setLanded] = useState(() => !justChosen || meal.planted || reduced);
  const [justPlanted, setJustPlanted] = useState(false);

  const seedRef = useRef<HTMLSpanElement>(null);
  const trayRef = useRef<HTMLSpanElement>(null);
  const particlesRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLHeadingElement>(null);
  const run = useRef<{
    timeline: Timeline | null;
    effects: EffectHandle[];
    abort: AbortController | null;
  }>({ timeline: null, effects: [], abort: null });

  // Seed flies from the dish info into the tray; the counter ticks on landing.
  useEffect(() => {
    if (landed) return;
    const src = seedRef.current;
    const dst = trayRef.current;
    if (!src || !dst) return;
    const handle = flyTo(src, dst, {
      reduced,
      duration: 560,
      onLand: () => {
        setLanded(true);
        pulseOnce(trayRef.current, 'is-pulsing', reduced);
      },
    });
    return () => handle.cancel();
  }, [landed, reduced]);

  // Unmount/state change: stop timers, drop particles, abort pending command.
  useEffect(() => {
    const r = run.current;
    return () => {
      r.timeline?.cancel();
      r.effects.forEach((e) => e.cancel());
      r.effects = [];
      r.abort?.abort();
    };
  }, []);

  if (!dish) return null;

  const freePlot = firstEmptyPlot(state.plots);
  const readyCount = readyPlots(state.plots, now).length;
  const trayCount = Math.max(0, state.seeds[crop.id] - (landed || meal.planted ? 0 : 1));
  const targetPlot = meal.plotId ?? freePlot?.id ?? null;

  const after: Snapshot = {
    recipe: recipeProgress(state, recipe.id),
    region: mapRegion ? regionProgress(state, mapRegion) : null,
  };
  const showAfter = !before || stepAtLeast(step, 'progress');
  const shown = showAfter ? after : before;

  const plant = async () => {
    if (phase === 'confirming' || phase === 'animating' || meal.planted || !freePlot) return;
    const snapshot = { recipe: after.recipe, region: after.region };
    setBefore(snapshot);
    setPhase('confirming');
    const ctrl = new AbortController();
    run.current.abort = ctrl;
    try {
      await confirmCommand(`plant:${meal.slotKey}`, {
        fail: state.settings.simulateFailure,
        signal: ctrl.signal,
      });
    } catch (e) {
      if (isAbortError(e)) return;
      setPhase('error');
      announce('Chưa gieo được. Hạt vẫn nằm trong khay, bạn có thể thử lại.');
      return;
    }

    const action = { type: 'PLANT_MEAL_SEED' as const, now: currentTime() };
    const next = gameReducer(state, action);
    dispatch(action);
    const rp = recipeProgress(next, recipe.id);
    announce(
      `Đã gieo ${crop.seedName.toLowerCase()} vào ô ${freePlot.id}. ${recipe.name}: ${rp.secured}/${rp.total} nguyên liệu.`,
    );
    setJustPlanted(true);
    requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: true }));

    if (reduced) {
      // Reduced motion: no trajectory, no crumbs — straight to the final state.
      setStep('settled');
      setPhase('done');
      return;
    }
    setPhase('animating');
    setStep('drop');
    run.current.timeline = createTimeline(
      PLANT_TIMELINE.map(({ at, step: s }) => ({
        at,
        run: () => {
          setStep(s);
          if (s === 'impact' && particlesRef.current) {
            run.current.effects.push(burstSoil(particlesRef.current, 8, reduced));
          }
        },
      })),
      () => setPhase('done'),
    );
  };

  const skip = () => {
    run.current.timeline?.finish();
    run.current.effects.forEach((e) => e.cancel());
    run.current.effects = [];
    setStep('settled');
    setPhase('done');
  };

  const reminderSet = state.reminder?.slotKey === meal.slotKey;
  const nextRegion = nextLockedRegion(state);
  const nextRp = nextRegion ? regionProgress(state, nextRegion) : null;
  const plantedPlot = state.plots.find((p) => p.id === meal.plotId);

  const teaser: [string, string] = meal.checkedIn
    ? [
        `Bữa này đã check-in xong.`,
        plantedPlot?.crop
          ? `Cây ở ô ${meal.plotId} đã sẵn sàng thu hoạch.`
          : `Ghé khu vườn xem nhé.`,
      ]
    : [
        `Mầm ${crop.name.toLowerCase()} đã nhú rồi!`,
        nextRegion && nextRp && nextRp.stampsNeeded === 1
          ? `Check-in sau bữa để cây lớn ngay và đủ dấu mở ${REGIONS[nextRegion].name}.`
          : `Check-in sau bữa để cây lớn ngay, góp ${crop.produceName.toLowerCase()} cho ${recipe.name}.`,
      ];

  const planted = phase === 'animating' || phase === 'done';
  const seedReceivedLabel = meal.planted
    ? `Đã gieo ${crop.seedName.toLowerCase()}`
    : `Bạn nhận được ${crop.seedName.toLowerCase()}`;

  return (
    <section className="reward card" aria-labelledby="reward-title" data-phase={phase}>
      <header className="reward__head">
        <p className="reward__kicker">
          <Plant aria-hidden="true" size={18} />
          Phần thưởng của bữa này
        </p>
        <h3 id="reward-title" className="reward__title" ref={statusRef} tabIndex={-1}>
          {seedReceivedLabel}
        </h3>
      </header>

      <div className="reward__grid">
        <div className="reward__seed">
          <div className="reward__seed-row">
            <span className={`region-tag region-tag--${dishRegion}`}>
              <MapPin aria-hidden="true" size={14} weight="fill" />
              {regionName}
            </span>
            <SeedToken ref={seedRef} crop={crop.id} className="reward__seed-token" />
            <span className="reward__seed-name">{crop.seedName}</span>
          </div>
          <p className="reward__note">{dish.seedNote}</p>
          <span className="tray" ref={trayRef}>
            <Tray aria-hidden="true" size={18} />
            Khay hạt · {crop.name}: <strong className="tray__count">{trayCount}</strong>
          </span>
        </div>

        <PlantingStage
          crop={crop.id}
          cropName={crop.name}
          plotNumber={targetPlot}
          step={step}
          particlesRef={particlesRef}
          highlighted={phase === 'ready' && !!freePlot}
        />
      </div>

      {!planted && (
        <div className="reward__cta">
          {phase === 'error' && (
            <p className="inline-alert" role="alert">
              <WarningCircle aria-hidden="true" size={18} />
              Chưa gieo được — hạt vẫn nằm trong khay. Bạn thử lại nhé.
            </p>
          )}
          {freePlot ? (
            <button
              type="button"
              className="btn btn--accent btn--lg btn--block"
              onClick={plant}
              disabled={phase === 'confirming'}
              aria-busy={phase === 'confirming'}
            >
              {phase === 'error' ? (
                <ArrowClockwise aria-hidden="true" size={22} />
              ) : (
                <Plant aria-hidden="true" size={22} />
              )}
              {phase === 'confirming'
                ? 'Đang gieo…'
                : phase === 'error'
                  ? 'Thử gieo lại'
                  : 'Gieo ngay'}
            </button>
          ) : (
            <div className="inline-alert inline-alert--info">
              <p>
                <strong>Ô đất đầy.</strong> Hạt được giữ an toàn trong khay — thu hoạch để có chỗ
                gieo.
              </p>
              {readyCount > 0 ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    dispatch({ type: 'HARVEST_ALL', now: currentTime() });
                    toast({ message: `Đã thu hoạch ${readyCount} ô.`, tone: 'success' });
                  }}
                >
                  <Basket aria-hidden="true" size={18} />
                  Thu hoạch {readyCount} ô sẵn sàng
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => focusSection('khu-vuon')}
                >
                  Xem khu vườn
                </button>
              )}
            </div>
          )}
          <p className="reward__hint">
            Một chạm, vài giây. Bạn có thể bỏ qua — hạt vẫn nằm trong khay.
          </p>
        </div>
      )}

      {planted && shown && (
        <div className="reward__progress">
          <ProgressBar
            label={`Công thức ${recipe.name}`}
            value={Math.min(
              shown.recipe.total,
              shown.recipe.ingredients.reduce((s, i) => s + Math.min(i.qty, i.have), 0),
            )}
            pending={
              shown.recipe.secured -
              shown.recipe.ingredients.reduce((s, i) => s + Math.min(i.qty, i.have), 0)
            }
            max={shown.recipe.total}
            valueText={`${shown.recipe.secured}/${shown.recipe.total} nguyên liệu`}
            tone="primary"
          />
          {shown.region && mapRegion && (
            <div className={`region-strip region-strip--${mapRegion}`}>
              {/* The dish's point on the regional map lights up (pulses once). */}
              <span
                className={`pin ${showAfter ? 'is-lit' : ''} ${justPlanted && showAfter ? 'is-new' : ''}`}
                aria-hidden="true"
              />
              <ProgressBar
                label={`Khám phá ${regionName}`}
                value={shown.region.discovered}
                max={shown.region.total}
                valueText={`${shown.region.discovered}/${shown.region.total} món`}
                tone={mapRegion}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {phase === 'animating' && (
        <button type="button" className="btn btn--quiet btn--sm reward__skip" onClick={skip}>
          <FastForward aria-hidden="true" size={16} />
          Bỏ qua hiệu ứng
        </button>
      )}

      {planted && stepAtLeast(step, 'settled') && (
        <div className="reward__after">
          <NpcTeaser lines={teaser}>
            {!meal.checkedIn && (
              <ul className="npc__rewards" aria-label="Check-in sau bữa sẽ nhận">
                <li>+20 XP</li>
                <li>Cây ô {meal.plotId ?? '—'} lớn ngay</li>
                <li>+1 dấu hành trình</li>
              </ul>
            )}
          </NpcTeaser>
          <div className="reward__options">
            {!meal.checkedIn && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-pressed={reminderSet}
                onClick={() => {
                  if (reminderSet) return;
                  const at = currentTime();
                  dispatch({ type: 'SET_REMINDER', now: at });
                  toast({
                    message: `Đã hẹn: trang sẽ nhắc check-in khi bạn quay lại sau ${formatClock(at + REMINDER_DELAY_MS)}.`,
                    tone: 'success',
                  });
                }}
              >
                {reminderSet ? (
                  <BellRinging aria-hidden="true" size={18} />
                ) : (
                  <Bell aria-hidden="true" size={18} />
                )}
                {reminderSet ? 'Đã hẹn nhắc' : 'Nhắc tôi check-in sau bữa'}
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-pressed={state.journeySaved}
              onClick={() => {
                if (state.journeySaved) return;
                dispatch({ type: 'SAVE_JOURNEY' });
                toast({
                  message: 'Hành trình đã lưu trên thiết bị này — không cần tài khoản.',
                  tone: 'success',
                });
              }}
            >
              {state.journeySaved ? (
                <SealCheck aria-hidden="true" size={18} />
              ) : (
                <FloppyDisk aria-hidden="true" size={18} />
              )}
              {state.journeySaved ? 'Đã lưu hành trình' : 'Lưu hành trình'}
            </button>
            {!meal.checkedIn && (
              <button type="button" className="btn btn--link btn--sm" onClick={openCheckIn}>
                <CalendarCheck aria-hidden="true" size={18} />
                Đã ăn xong? Check-in (demo)
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
