import {
  ArrowLeft,
  Basket,
  CaretLeft,
  CaretRight,
  ChefHat,
  Cloud,
  CloudRain,
  CookingPot,
  Coins,
  DotsThreeOutline,
  Drop,
  Lightbulb,
  Moon,
  Package,
  Storefront,
  Sun,
  SunHorizon,
  BowlFood,
  X,
} from '@phosphor-icons/react';
import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ANIMALS,
  CROPS,
  CROP_LIST,
  RECIPE_LIST,
  WATERING,
  FARM_PLOT_COUNT,
  MAX_PLOT_COUNT,
  PLOT_UNLOCK_LEVELS,
  XP,
  produceName,
} from '../../../data/game';
import type { AnimalId, CropId, RecipeId } from '../../../data/types';
import type {
  CameraView,
  FarmPlace,
  FarmSceneApi,
  FarmView,
  PlaceInfo,
} from '../../farm-anim/FarmScene';
import { nextStep } from '../../../domain/nextStep';
import { canFulfill, orderDone, todaysOrders } from '../../../domain/orders';
import { gameReducer, type Action } from '../../../domain/reducer';
import type { GuestProgress } from '../../../domain/progress';
import { cropSprite, produceSprite } from '../../../data/sprites';
import {
  STAGE_LABEL,
  animalStage,
  biteDelay,
  catchFor,
  fishingLeft,
  harvestsLeft,
  isGrowing,
  isWet,
  level,
  plotStage,
  readyPlots,
  waterBlock,
  waterLeft,
  type WaterBlock,
  recipeAvailable,
  recipeProgress,
} from '../../../domain/selectors';
import { FarmPlotCard, type CookIdea, type PlotCardMode, type PlotExtra } from './FarmPlotCard';
import { SeedTray } from './SeedTray';
import { useSeedDrag } from './seedDrag';
// Scene overlay styles (plot card, seed strip) load with the game, not with the lazy scene.
import '../../farm-anim/farm-anim.css';
import './farm-game.css';
import { HOUR_MS, currentTime, formatDuration, slotKey } from '../../../domain/time';
import { t } from '../../../i18n';
import { claimableCount } from '../../../domain/quests';
import { ranchBadge } from '../../ranch/badge';
import { useAccount, useFeedback, useGame, useUi } from '../../../state/hooks';
import { NextStepCard } from './NextStepCard';
import { Atmosphere } from './Atmosphere';
import { dayPart, skyOverride, weatherAt } from './sky';

const m = t.journey.garden;
const g = t.journey.game;

// The living painted farm (loaded on its own; the HUD is usable before it arrives).
const FarmScene = lazy(() => import('../../farm-anim/FarmScene'));

/** Below this scene width a plot's card docks above the tray instead of floating on the plot. */
const DOCK_CARD_BELOW = 720;

/** Areas of the farm that open as an in-game panel. */
export type PanelId =
  | 'meal'
  | 'storage'
  | 'kitchen'
  | 'orders'
  | 'market'
  | 'map'
  | 'missions'
  | 'friends'
  | 'stats'
  | 'ranch';

/** If the farm scene throws, the guest keeps the HUD, the tray and every panel. */
class SceneBoundary extends Component<
  { onFail: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const SKY_ICON = {
  morning: <SunHorizon size={18} weight="fill" />,
  noon: <Sun size={18} weight="fill" />,
  evening: <SunHorizon size={18} weight="fill" />,
  night: <Moon size={18} weight="fill" />,
};
const WEATHER_ICON = {
  cloudy: <Cloud size={18} weight="fill" />,
  rain: <CloudRain size={18} weight="fill" />,
};

type PlotCardState = {
  id: number;
  harvested?: CropId;
  at: { x: number; y: number; below: boolean } | null;
};

const BLOCK_NOTE: Record<WaterBlock, string> = {
  'not-growing': '',
  wet: m.blockWet,
  'empty-can': m.blockEmptyCan,
};

/**
 * The farm as a game that fills the screen: the painted island (drag to look around on phones),
 * a HUD on top, the seed tray and tools above a dock of farm areas. Planting, watering,
 * harvesting, feeding and fishing all happen on the island; cooking, storage, orders and the
 * market open as panels over it, never as a page to scroll.
 */
export function FarmGame({
  onCook,
  onPanel,
  onBack,
  panel,
}: {
  onCook: (recipe: RecipeId) => void;
  onPanel: (panel: PanelId) => void;
  onBack: () => void;
  /** The panel open over the farm (its dock button shows as current). */
  panel: PanelId | null;
}) {
  const { state, dispatch, now, reduced, quality } = useGame();
  const [sceneFailed, setSceneFailed] = useState(false);
  const scene = useRef<FarmSceneApi | null>(null);
  const casting = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  // How much of the stage is covered at its horizontal centre (the seed tray on phones, the
  // dock on wide screens), so the island sits above it and its flat bottom stays hidden.
  const [insetBottom, setInsetBottom] = useState(0);
  useEffect(() => {
    const measure = () => {
      const stage = wrapRef.current?.getBoundingClientRect();
      if (!stage) return;
      const mid = stage.left + stage.width / 2;
      let top = stage.bottom;
      for (const el of [trayRef.current, dockRef.current]) {
        // On phones the tray is a solid sheet and covers it all; on wide screens it is a clear
        // box spanning the width and what covers the centre is its seed strip.
        const sheet =
          !!el &&
          el === trayRef.current &&
          getComputedStyle(el).backgroundColor.replace(/\s/g, '') !== 'rgba(0,0,0,0)';
        const box = (
          el === trayRef.current && !sheet ? el?.querySelector('.fg-seeds') : el
        )?.getBoundingClientRect();
        if (box && box.height > 0 && box.left <= mid && box.right >= mid)
          top = Math.min(top, box.top);
      }
      setInsetBottom(Math.max(0, stage.bottom - top));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (trayRef.current) ro.observe(trayRef.current);
    if (dockRef.current) ro.observe(dockRef.current);
    return () => ro.disconnect();
  }, []);
  const [cam, setCam] = useState<CameraView>({ canPan: false, side: 'field' });
  const [panned, setPanned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(true);
  // The plot whose card is open on the scene; `harvested` after a harvest from the card.
  const [plotCard, setPlotCardState] = useState<PlotCardState | null>(null);
  const setPlotCard = (c: { id: number; harvested?: CropId } | null) => {
    // Phones: the card docks at the bottom. Wider: anchored over the plot, kept inside the scene.
    const w = wrapRef.current?.clientWidth ?? 800;
    const p = c && w >= DOCK_CARD_BELOW ? scene.current?.plotScreen(c.id) : null;
    setPlotCardState(
      c
        ? {
            ...c,
            at: p
              ? {
                  x: Math.max(Math.min(138, w / 2), Math.min(w - Math.min(138, w / 2), p.x)),
                  y: p.y,
                  below: p.y < 300,
                }
              : null,
          }
        : null,
    );
    scene.current?.select(c?.id ?? null);
    if (c) setMenuOpen(false);
  };
  const { toast, announce } = useFeedback();
  const { spinForSeed } = useUi();
  const [justHarvested, setJustHarvested] = useState(0);
  const [picked, setPicked] = useState<CropId | null>(null);
  const [watering, setWatering] = useState(false);

  const seeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0);
  const activeSeed = picked && state.seeds[picked] > 0 ? picked : (seeds[0]?.id ?? null);
  const ready = readyPlots(state.plots, now);
  const growingCount = state.plots.filter((p) => isGrowing(plotStage(p, now))).length;
  const cans = waterLeft(state, now);
  // The sky follows the clock; the weather rolls every few hours (`?sky=night,rain` pins both).
  const sky = skyOverride();
  const part = sky.part ?? dayPart(now);
  const weather = sky.weather ?? weatherAt(now);
  const lv = level(state.xp);
  const cookable = RECIPE_LIST.filter(
    (r) => recipeAvailable(state, r.id) && recipeProgress(state, r.id).canCook,
  ).length;
  const deliverable = todaysOrders(state, now).filter(
    (o) => !orderDone(state, o) && canFulfill(state, o),
  ).length;
  const meal = state.meal?.slotKey === slotKey(now) ? state.meal : null;
  const mealPending = !!meal && !meal.checkedIn;
  const { friends } = useAccount();
  const claimable = claimableCount(state, now);
  const ranchReady = ranchBadge(state, now);
  // Friends whose garden has a long-ripe plot we may still pick from today.
  const ripeFriends =
    friends && friends.stealsLeft > 0
      ? friends.friends.filter((f) => f.stealable > 0 && !f.stoleToday).length
      : 0;

  // Toasts are drawn as in-game banners while the farm is open (see farm-game.css).
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.farmGame = 'on';
    return () => {
      delete root.dataset.farmGame;
    };
  }, []);

  const cardOpenForTick = plotCard !== null;
  const [cardTick, setCardTick] = useState(0);
  useEffect(() => {
    if (!cardOpenForTick) return;
    const id = window.setInterval(() => setCardTick(currentTime()), 5000);
    return () => window.clearInterval(id);
  }, [cardOpenForTick]);

  // Phones: notices sit just above the seed tray, or above the plot card while it is docked
  // at the bottom, so a harvest notice never hides the card it came from (farm-game.css).
  // Placed again for each card (another plot, or the same one after its harvest).
  const cardKey = plotCard ? `${plotCard.id}:${plotCard.harvested ?? ''}` : '';
  useEffect(() => {
    const root = document.documentElement;
    const place = () => {
      const tops = [trayRef.current, document.querySelector('.fj-plot-card.is-docked')]
        .filter((el): el is Element => el !== null)
        .map((el) => el.getBoundingClientRect().top)
        .filter((top) => top > 0);
      if (tops.length === 0) {
        root.style.removeProperty('--fg-toast-bottom');
        return;
      }
      root.style.setProperty(
        '--fg-toast-bottom',
        `${Math.round(innerHeight - Math.min(...tops) + 8)}px`,
      );
    };
    place();
    // Again once the card has slid in, whenever the tray or card changes size (a harvest
    // adds what to cook), and the moment a notice appears.
    const late = window.setTimeout(place, 350);
    window.addEventListener('resize', place);
    const sized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    const card = document.querySelector('.fj-plot-card');
    for (const el of [trayRef.current, card]) if (el) sized?.observe(el);
    const region = document.querySelector('.toast-region');
    const added = typeof MutationObserver === 'undefined' ? null : new MutationObserver(place);
    if (region) added?.observe(region, { childList: true });
    // A card that docks to the bottom (or leaves it) without changing size.
    if (card) added?.observe(card, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.clearTimeout(late);
      window.removeEventListener('resize', place);
      sized?.disconnect();
      added?.disconnect();
    };
  }, [cardKey]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--fg-toast-bottom');
    },
    [],
  );

  // A level-up opened a new crop (and gifted a seed): say so once.
  const cropUnlock = state.recentCropUnlock;
  useEffect(() => {
    if (!cropUnlock) return;
    const c = CROPS[cropUnlock];
    toast({
      message: m.cropUnlocked(c.name.toLowerCase(), c.seedName.toLowerCase()),
      tone: 'reward',
    });
    dispatch({ type: 'ACK_CROP_UNLOCK' });
  }, [cropUnlock, toast, dispatch]);

  // Escape closes the topmost thing on the farm (a sheet above handles itself).
  const overlays = useRef({ menuOpen, plotCard: plotCard !== null });
  useEffect(() => {
    overlays.current = { menuOpen, plotCard: plotCard !== null };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('.sheet-layer, .fg-panel')) return;
      if (overlays.current.menuOpen) setMenuOpen(false);
      else if (overlays.current.plotCard) {
        setPlotCardState(null);
        scene.current?.select(null);
      } else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /** Recipes this crop goes into (cookable first, at most three), in state `s`. */
  const cookIdeasFor = (crop: CropId, s: GuestProgress = state): CookIdea[] =>
    RECIPE_LIST.filter(
      (r) => recipeAvailable(s, r.id) && r.ingredients.some((i) => i.crop === crop),
    )
      .map((r) => {
        const pr = recipeProgress(s, r.id);
        const missing = pr.ingredients
          .filter((i) => i.have < i.qty)
          .map((i) => produceName(i.crop).toLowerCase())
          .join(', ');
        return { id: r.id, name: r.name, canCook: pr.canCook, missing };
      })
      .sort((x, y) => Number(y.canCook) - Number(x.canCook))
      .slice(0, 3);

  /**
   * Pick every ripe plot, or just `plotId`. A single plot picked with a tap (`suggestCook`)
   * also names a dish to cook with it, worked out on the pantry as it will be after the
   * harvest: a Cook button when it can be cooked now, otherwise what is still missing.
   */
  const harvestAll = (plotId?: number, suggestCook = false) => {
    // Ripe as of this moment, not the once-a-minute clock: a card that has just turned to
    // "Thu hoạch" on its 5 s tick must find its plot ripe here too.
    const at = currentTime();
    const ripe = readyPlots(state.plots, at);
    const picked = plotId === undefined ? ripe : ripe.filter((p) => p.id === plotId);
    if (picked.length === 0) return false;
    const counts = new Map<string, number>();
    // What lands in the pantry: each plot gives its yield (one less if a friend picked from it).
    picked.forEach((p) => {
      const def = CROPS[p.crop!];
      const got = Math.max(1, def.yield - (p.stolen ? 1 : 0));
      counts.set(def.produceName, (counts.get(def.produceName) ?? 0) + got);
    });
    const action: Action =
      plotId === undefined
        ? { type: 'HARVEST_ALL', now: at }
        : { type: 'HARVEST_PLOT', plotId, now: at };
    const best =
      suggestCook && picked.length === 1
        ? cookIdeasFor(picked[0]!.crop!, gameReducer(state, action))[0]
        : undefined;
    dispatch(action);
    setJustHarvested((n) => n + 1);
    const message = m.harvested([...counts].map(([n, q]) => `${n} ×${q}`).join(', '));
    if (best?.canCook)
      toast({
        message: `${message} ${m.cookReady(best.name)}`,
        tone: 'reward',
        action: { label: m.cardCook, onClick: () => onCook(best.id) },
        duration: 7000,
      });
    else
      toast({
        message: best ? `${message} ${m.cookMissing(best.name, best.missing)}` : message,
        tone: 'reward',
      });
    return true;
  };

  const plantAt = (plotId: number, seed: CropId | null = activeSeed) => {
    if (!seed || state.seeds[seed] <= 0) return;
    dispatch({ type: 'PLANT_FROM_TRAY', crop: seed, plotId, now: currentTime() });
    announce(m.planted(CROPS[seed].seedName.toLowerCase(), plotId));
  };

  const waterAt = (plotId: number) => {
    const plot = state.plots.find((p) => p.id === plotId);
    const at = currentTime();
    if (!plot || waterBlock(state, plot, at) !== null) return;
    dispatch({ type: 'WATER', plotId, now: at });
    const leftAfter = cans - 1;
    announce(m.watered(plotId, CROPS[plot.crop!].name, leftAfter));
    if (leftAfter <= 0) setWatering(false);
  };

  const animalAct = (animal: AnimalId, act: 'feed' | 'collect') => {
    const def = ANIMALS[animal];
    dispatch({
      type: act === 'feed' ? 'FEED_ANIMAL' : 'COLLECT_ANIMAL',
      animal,
      now: currentTime(),
    });
    const message =
      act === 'feed'
        ? m.fed(def.name.toLowerCase(), formatDuration(def.hours * HOUR_MS))
        : m.collected(def.yield, produceName(def.product).toLowerCase());
    announce(message);
    toast({ message, tone: act === 'collect' ? 'reward' : 'success' });
  };

  const catchAt = (castAt: number) => {
    const kind = catchFor(castAt, lv.level);
    dispatch({ type: 'CATCH', castAt, now: currentTime() });
    const message = m.caught(produceName(kind).toLowerCase(), XP.catch);
    announce(message);
    toast({ message, tone: 'reward' });
  };

  // The game as the painted farm shows it: 9 plots (locked ones open with levels), animal bubbles.
  const farmView: FarmView = {
    watering,
    plots: Array.from({ length: MAX_PLOT_COUNT }, (_, i) => {
      const id = i + 1;
      const plot = state.plots.find((p) => p.id === id);
      const unlockLevel =
        id > FARM_PLOT_COUNT ? (PLOT_UNLOCK_LEVELS[id - FARM_PLOT_COUNT - 1] ?? null) : null;
      if (!plot)
        return {
          id,
          unlocked: false,
          unlockLevel,
          crop: null,
          stage: 'empty',
          image: null,
          wet: false,
          thirsty: false,
          label: m.farmPlotLocked(id, String(unlockLevel ?? '?')),
        };
      const stage = plotStage(plot, now);
      const growing = isGrowing(stage);
      const block = growing ? waterBlock(state, plot, now) : 'not-growing';
      const crop = plot.crop ? CROPS[plot.crop] : null;
      let label: string;
      if (!crop)
        label = activeSeed
          ? m.farmPlotPlant(id, CROPS[activeSeed].seedName.toLowerCase())
          : m.farmPlotNoSeed(id);
      else if (stage === 'ready') label = m.farmPlotHarvest(id, crop.name);
      else {
        label = m.farmPlotGrowing(id, crop.name, formatDuration((plot.readyAt ?? now) - now));
        label +=
          block === null
            ? m.farmTapToWater
            : block !== 'not-growing'
              ? ` · ${BLOCK_NOTE[block].toLowerCase()}`
              : '';
      }
      return {
        id,
        unlocked: true,
        unlockLevel: null,
        crop: plot.crop,
        stage,
        image: plot.crop && stage !== 'empty' ? cropSprite(plot.crop, stage) : null,
        wet: isWet(plot, now),
        thirsty: watering && growing && block === null,
        needsWater: growing && block === null,
        label,
        // Plot animations: the kind (a tree stays after a harvest), the harvest cycle (one
        // flight per harvest) and the produce that flies to the pantry.
        kind: crop?.kind,
        harvests: plot.harvests ?? 0,
        left: harvestsLeft(plot),
        cycle: plot.plantedAt,
        produce: plot.crop ? produceSprite(plot.crop) : null,
        yield: crop?.yield,
        // An empty plot invites a sowing while there are seeds (not in watering mode).
        seedImage: !plot.crop && activeSeed && !watering ? produceSprite(activeSeed) : null,
      };
    }),
    cow: animalBubble('cow'),
    chicken: animalBubble('chicken'),
  };

  function animalBubble(id: AnimalId): FarmView['cow'] {
    const def = ANIMALS[id];
    const stage = animalStage(state, id, now);
    if (stage === 'locked')
      return { kind: 'locked', icon: null, label: m.animalLockedBubble(def.name, def.unlockLevel) };
    if (stage === 'ready')
      return {
        kind: 'ready',
        icon: produceSprite(def.product),
        label: m.collectBubble(produceName(def.product)),
      };
    if (stage === 'busy') return { kind: 'busy', icon: null, label: def.name };
    return {
      kind: 'hungry',
      icon: produceSprite(def.feed),
      label: m.feedBubble(produceName(def.feed)),
    };
  }

  /**
   * A tap on a plot: a ripe one is picked straight away (on the plot or its bubble); a tap on
   * the water-drop bubble, or on the plot with the can out, waters it. Anything else opens
   * its card (seeds, time left, a lock).
   */
  const onPlot = (id: number, mark?: PlaceInfo['mark']) => {
    const plot = state.plots.find((p) => p.id === id);
    const at = currentTime();
    const stage = plot ? plotStage(plot, at) : null;
    if (plot && stage === 'ready') {
      setPlotCard(null);
      harvestAll(id, true);
      return;
    }
    if (plot && stage === 'empty' && mark === 'plant' && activeSeed) {
      setPlotCard(null);
      plantAt(id);
      return;
    }
    if (plot && stage && isGrowing(stage) && (mark === 'water' || watering)) {
      const block = waterBlock(state, plot, at);
      if (block === null) {
        setPlotCard(null);
        waterAt(id);
      } else toast({ message: BLOCK_NOTE[block] || m.cantWater });
      return;
    }
    setPlotCard(plotCard?.id === id ? null : { id });
  };

  /** Plant a seed dropped on (or tapped for) a plot. */
  const dropSeed = (id: number, crop: CropId) => {
    const plot = state.plots.find((p) => p.id === id);
    if (!plot)
      return toast({
        message: m.plotOpensAt(id, String(PLOT_UNLOCK_LEVELS[id - FARM_PLOT_COUNT - 1] ?? '?')),
      });
    if (plotStage(plot, currentTime()) !== 'empty') return setPlotCard({ id });
    setPicked(crop);
    plantAt(id, crop);
    setPlotCard({ id });
  };
  const seedDrag = useSeedDrag(
    () => scene.current,
    dropSeed,
    // A tap on a seed: plant it in the open empty plot, otherwise just pick it.
    (crop) => {
      const plot = plotCard && state.plots.find((p) => p.id === plotCard.id);
      if (plot && plotStage(plot, currentTime()) === 'empty') dropSeed(plot.id, crop);
      else setPicked(crop);
    },
  );

  const harvestFromCard = (id: number) => {
    const crop = state.plots.find((p) => p.id === id)?.crop ?? undefined;
    if (harvestAll(id)) setPlotCard({ id, harvested: crop });
  };

  // What the open card shows.
  let cardMode: PlotCardMode | null = null;
  // The farm's clock ticks once a minute; an open card follows a 5 s one, so a crop that
  // ripens while its card is open turns to "Thu hoạch" right away.
  const cardNow = Math.max(now, cardTick);
  let cookIdeas: CookIdea[] = [];
  if (plotCard) {
    const plot = state.plots.find((p) => p.id === plotCard.id);
    if (plotCard.harvested) {
      const crop = plotCard.harvested;
      cardMode = { kind: 'harvested', crop, produce: produceName(crop).toLowerCase() };
      cookIdeas = cookIdeasFor(crop);
    } else if (!plot) {
      cardMode = {
        kind: 'locked',
        level: String(PLOT_UNLOCK_LEVELS[plotCard.id - FARM_PLOT_COUNT - 1] ?? '?'),
      };
    } else {
      const stage = plotStage(plot, cardNow);
      const def = plot.crop ? CROPS[plot.crop] : null;
      const crop = def?.name ?? '';
      // Fruit trees and mushroom blocks: harvests, next fruiting, flushes left (and a way out).
      const extra: PlotExtra | undefined =
        def?.kind === 'tree'
          ? {
              type: 'tree',
              harvests: plot.harvests ?? 0,
              again: formatDuration((def.regrowHours ?? def.growHours) * 3_600_000),
            }
          : def?.kind === 'mushroom'
            ? { type: 'mushroom', left: harvestsLeft(plot) }
            : undefined;
      if (stage === 'empty') cardMode = { kind: 'empty' };
      else if (stage === 'ready') cardMode = { kind: 'ready', crop, extra };
      else {
        const block = waterBlock(state, plot, cardNow);
        cardMode = {
          kind: 'growing',
          crop,
          left: formatDuration((plot.readyAt ?? cardNow) - cardNow),
          water: { ok: block === null, note: block ? BLOCK_NOTE[block] || m.cantWater : '', cans },
          extra,
        };
      }
    }
  }

  /** A tap on the painted farm. */
  const onPlace = (place: FarmPlace, info: PlaceInfo) => {
    const at = currentTime();
    if (place === 'plot' && info.plotId !== undefined) {
      onPlot(info.plotId, info.mark);
      return;
    }
    setPlotCard(null);
    setMenuOpen(false);
    if (place === 'pond') {
      if (casting.current) return;
      if (fishingLeft(state, at) <= 0) {
        toast({ message: m.noFishingLeft });
        return;
      }
      casting.current = true;
      scene.current?.cast(info.x, info.y);
      announce(m.casting);
      window.setTimeout(() => {
        casting.current = false;
        scene.current?.bite(info.x, info.y);
        catchAt(at);
      }, biteDelay(at));
      return;
    }
    if (place === 'cow' || place === 'chicken') {
      const id: AnimalId = place;
      const def = ANIMALS[id];
      const stage = animalStage(state, id, at);
      if (stage === 'locked') toast({ message: m.animalLocked(def.name, def.unlockLevel) });
      else if (stage === 'ready') animalAct(id, 'collect');
      else if (stage === 'busy') {
        const left = (state.animals[id].readyAt ?? at) - at;
        toast({ message: m.animalBusy(def.name, formatDuration(left)) });
      } else if (state.ingredients[def.feed] <= 0)
        toast({
          message: m.needFeed(produceName(def.feed).toLowerCase(), def.name.toLowerCase()),
        });
      else animalAct(id, 'feed');
      return;
    }
    // The farmhouse is the kitchen, the market stall is the market: straight in.
    if (place === 'farmhouse') onPanel('kitchen');
    if (place === 'market') onPanel('market');
  };

  const open = (p: PanelId) => {
    setMenuOpen(false);
    setPlotCard(null);
    onPanel(p);
  };

  const step = nextStep(state, now);
  const dock: { id: PanelId; label: string; icon: ReactNode; badge?: number; dot?: boolean }[] = [
    { id: 'meal', label: g.dock.meal, icon: <BowlFood size={22} />, dot: mealPending },
    { id: 'storage', label: g.dock.storage, icon: <Package size={22} /> },
    { id: 'kitchen', label: g.dock.kitchen, icon: <CookingPot size={22} />, badge: cookable },
    { id: 'orders', label: g.dock.orders, icon: <ChefHat size={22} />, badge: deliverable },
    { id: 'market', label: g.dock.market, icon: <Storefront size={22} /> },
  ];
  const more: { id: PanelId; label: string; badge?: number }[] = [
    { id: 'ranch', label: t.ranch.menu, badge: ranchReady },
    { id: 'map', label: g.dock.map },
    { id: 'missions', label: g.dock.missions, badge: claimable },
    { id: 'friends', label: g.dock.friends, badge: ripeFriends },
    { id: 'stats', label: g.dock.stats },
  ];

  return (
    <div
      className={`fg${watering ? ' is-watering' : ''}${panel ? ' has-panel' : ''}`}
      data-daypart={part}
    >
      {/* tabIndex -1 lets reward actions ("Xem khu vườn") land focus on the farm. */}
      <h2 id="khu-vuon-title" className="sr-only" tabIndex={-1}>
        {t.journey.scene.sections.garden.title}
      </h2>

      <div className="fg-stage" ref={wrapRef}>
        {sceneFailed ? (
          <p className="fg-stage__failed">{t.farm.anim.title}</p>
        ) : (
          <SceneBoundary onFail={() => setSceneFailed(true)}>
            <Suspense
              fallback={
                <div className="fa-scene fg-scene" aria-hidden="true">
                  <p className="fa-loading">{t.reel.journey.loading}</p>
                </div>
              }
            >
              <FarmScene
                className="fg-scene"
                insetBottom={insetBottom}
                mode="game"
                focus="field"
                reduced={reduced}
                quality={quality}
                flyTarget='[data-farm-dock="storage"]'
                farm={farmView}
                label={m.farmLabel}
                onPlace={onPlace}
                onReady={(api) => (scene.current = api)}
                onCamera={setCam}
                sky={{ part, weather }}
                onPanStart={() => {
                  setPanned(true);
                  if (plotCard) setPlotCard(null);
                }}
              />
            </Suspense>
          </SceneBoundary>
        )}
        <Atmosphere part={part} weather={weather} reduced={reduced} />
        {plotCard && cardMode && (
          <FarmPlotCard
            plotId={plotCard.id}
            at={plotCard.at}
            mode={cardMode}
            seeds={seeds.map((c) => ({ id: c.id, name: c.seedName, count: state.seeds[c.id] }))}
            onSeedDown={seedDrag.start}
            onWater={() => waterAt(plotCard.id)}
            onHarvest={() => harvestFromCard(plotCard.id)}
            cook={cookIdeas}
            onCook={(r) => {
              setPlotCard(null);
              onCook(r);
            }}
            onClear={() => dispatch({ type: 'CLEAR_PLOT', plotId: plotCard.id })}
            onClose={() => setPlotCard(null)}
          />
        )}
        {seedDrag.ghost}
      </div>

      <header className="fg-hud">
        <button
          type="button"
          className="fg-round"
          onClick={onBack}
          aria-label={t.reel.journey.back}
        >
          <ArrowLeft size={20} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fg-chip fg-chip--level"
          onClick={() => open('stats')}
          aria-label={g.levelLabel(lv.level, lv.into, lv.span)}
        >
          <span className="fg-chip__lv" aria-hidden="true">
            {lv.level}
          </span>
          <span className="fg-chip__xp" aria-hidden="true">
            <span style={{ transform: `scaleX(${lv.into / lv.span})` }} />
          </span>
        </button>
        <span className="fg-hud__spacer" />
        <span
          className="fg-chip fg-chip--sky"
          role="img"
          aria-label={g.sky(g.daypart[part], g.weather[weather])}
          data-part={part}
        >
          <span aria-hidden="true">{SKY_ICON[part]}</span>
          {weather !== 'clear' && <span aria-hidden="true">{WEATHER_ICON[weather]}</span>}
        </span>
        <button
          type="button"
          className="fg-chip"
          onClick={() => open('market')}
          aria-label={g.coins(state.coins)}
        >
          <Coins size={18} weight="fill" aria-hidden="true" className="fg-coin" />
          <span aria-hidden="true">{state.coins}</span>
        </button>
        <span className="fg-chip fg-chip--cans" aria-label={m.cansLeft(cans)} role="img">
          <Drop size={18} weight="fill" aria-hidden="true" />
          <span aria-hidden="true">{cans}</span>
        </span>
        <button
          type="button"
          className="fg-round"
          aria-expanded={menuOpen}
          aria-controls="fg-menu"
          aria-label={g.menu}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <DotsThreeOutline size={20} weight="fill" aria-hidden="true" />
          {claimable + ripeFriends + ranchReady > 0 && (
            <span className="fg-dot" aria-hidden="true" />
          )}
        </button>
        {menuOpen && (
          <ul id="fg-menu" className="fg-menu" data-game-overlay>
            {more.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => open(it.id)}>
                  {it.label}
                  {it.badge ? (
                    <span className="fg-menu__badge" aria-hidden="true">
                      {it.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className={`fg-quest${questOpen ? '' : ' is-closed'}`}>
        {questOpen ? (
          <>
            <NextStepCard
              key={justHarvested}
              step={step}
              highlight={justHarvested > 0}
              onCook={onCook}
              onOrders={() => open('orders')}
              onHarvest={() => harvestAll()}
              onAnimal={animalAct}
              onPlant={(plotId, crop) => plantAt(plotId, crop)}
              onFind={spinForSeed}
            />
            <button
              type="button"
              className="fg-quest__toggle"
              onClick={() => setQuestOpen(false)}
              aria-label={g.questHide}
            >
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="fg-round fg-quest__open"
            onClick={() => setQuestOpen(true)}
            aria-label={g.questShow}
          >
            <Lightbulb size={20} weight="fill" aria-hidden="true" />
          </button>
        )}
      </div>

      {cam.canPan && (
        <>
          {cam.side === 'barn' && (
            <button
              type="button"
              className="fg-pan fg-pan--left"
              onClick={() => scene.current?.panToPlace('field')}
              aria-label={g.toFieldLabel}
            >
              <CaretLeft size={16} weight="bold" aria-hidden="true" />
              {g.toField}
            </button>
          )}
          {cam.side === 'field' && (
            <button
              type="button"
              className="fg-pan fg-pan--right"
              onClick={() => scene.current?.panToPlace('barn')}
              aria-label={g.toBarnLabel}
            >
              {g.toBarn}
              <CaretRight size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          {!panned && (
            <p className="fg-hint fg-hint--drag" aria-hidden="true">
              {g.dragHint}
            </p>
          )}
        </>
      )}

      {watering && (
        <p className="fg-hint" role="status">
          {m.waterMode(Math.round(WATERING.cut * 100))}
        </p>
      )}

      <div className="fg-tray" ref={trayRef}>
        <SeedTray
          seeds={seeds}
          counts={state.seeds}
          active={activeSeed}
          onDragStart={seedDrag.start}
          onPick={setPicked}
        />
        <div className="fg-tools">
          <button
            type="button"
            className={`fg-tool fg-tool--water${watering ? ' is-on' : ''}`}
            aria-pressed={watering}
            onClick={() => {
              setWatering((w) => !w);
              setPlotCard(null);
            }}
            disabled={!watering && (cans === 0 || growingCount === 0)}
          >
            <Drop aria-hidden="true" size={22} weight={watering ? 'fill' : 'regular'} />
            <span className="fg-tool__label">{watering ? m.waterOff : m.waterOn}</span>
            <span className="sr-only">{m.cansLeft(cans)}</span>
          </button>
          <button
            type="button"
            className={`fg-tool fg-tool--harvest${ready.length ? ' is-ready' : ''}`}
            onClick={() => harvestAll()}
            disabled={ready.length === 0}
            aria-label={m.harvestAll(ready.length)}
          >
            <Basket aria-hidden="true" size={22} weight={ready.length ? 'fill' : 'regular'} />
            <span className="fg-tool__label" aria-hidden="true">
              {g.harvest}
            </span>
            {ready.length > 0 && (
              <span className="fg-badge" aria-hidden="true">
                {ready.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav className="fg-dock" aria-label={g.dockLabel} ref={dockRef}>
        {dock.map((d) => (
          <button
            key={d.id}
            type="button"
            className="fg-dock__item"
            data-farm-dock={d.id}
            aria-current={panel === d.id ? 'true' : undefined}
            onClick={() => open(d.id)}
          >
            <span className="fg-dock__icon" aria-hidden="true">
              {d.icon}
              {d.badge ? <span className="fg-badge">{d.badge}</span> : null}
              {d.dot && !d.badge ? <span className="fg-dot" /> : null}
            </span>
            <span className="fg-dock__label">{d.label}</span>
          </button>
        ))}
      </nav>

      <PlotList
        watering={watering}
        activeSeed={activeSeed}
        onPlant={(id) => plantAt(id)}
        onWater={waterAt}
      />
    </div>
  );
}

/**
 * The plots as buttons, for keyboards and screen readers (the painted field is a canvas).
 * Hidden until something inside takes focus, then shown as a strip over the farm.
 */
function PlotList({
  watering,
  activeSeed,
  onPlant,
  onWater,
}: {
  watering: boolean;
  activeSeed: CropId | null;
  onPlant: (plotId: number) => void;
  onWater: (plotId: number) => void;
}) {
  const { state, now } = useGame();
  return (
    <ul className="fg-plots" aria-label={g.plotsTitle}>
      {state.plots.map((plot) => {
        const stage = plotStage(plot, now);
        const crop = plot.crop ? CROPS[plot.crop] : null;
        const growing = isGrowing(stage);
        const block = growing ? waterBlock(state, plot, now) : 'not-growing';
        const left = formatDuration(plot.readyAt !== null ? plot.readyAt - now : 0);
        if (!watering && stage === 'empty')
          return (
            <li key={plot.id}>
              <button
                type="button"
                onClick={() => onPlant(plot.id)}
                disabled={!activeSeed}
                aria-label={
                  activeSeed
                    ? m.plantPlot(plot.id, CROPS[activeSeed].seedName.toLowerCase())
                    : m.plotNoSeed(plot.id)
                }
              >
                {m.plotNo(plot.id)} · {m.empty}
              </button>
            </li>
          );
        if (watering && growing)
          return (
            <li key={plot.id}>
              <button
                type="button"
                onClick={() => onWater(plot.id)}
                aria-disabled={block !== null}
                aria-label={m.waterPlot(
                  plot.id,
                  crop!.name,
                  STAGE_LABEL[stage].toLowerCase(),
                  left,
                  block ? BLOCK_NOTE[block] : '',
                )}
              >
                {m.plotNo(plot.id)} · {crop!.name}
              </button>
            </li>
          );
        return (
          <li key={plot.id}>
            {m.plotNo(plot.id)} · {crop ? crop.name : m.empty} · {STAGE_LABEL[stage]}
          </li>
        );
      })}
    </ul>
  );
}
