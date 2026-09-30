import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import {
  CROPS,
  DAILY_MISSIONS,
  RECIPES,
  REGIONS,
  REGION_ORDER,
  FARM_PLOT_COUNT,
  PLOT_UNLOCK_LEVELS,
  WATERING,
  XP_PER_LEVEL,
} from '../data/game';
import type { CropId, MissionKind, RecipeId, RegionId } from '../data/types';
import type { GuestProgress, Plot } from './progress';
import { dateKey } from './time';

export type PlotStage = 'empty' | 'sprout' | 'young' | 'flowering' | 'ready';

export const STAGE_LABEL: Record<PlotStage, string> = {
  empty: 'Ô trống',
  sprout: 'Mầm non',
  young: 'Đang lớn',
  flowering: 'Ra hoa',
  ready: 'Sẵn sàng thu hoạch',
};

/** Planted and not ripe yet: the stages that can still be watered. */
export function isGrowing(stage: PlotStage): boolean {
  return stage === 'sprout' || stage === 'young' || stage === 'flowering';
}

export function plotStage(plot: Plot, now: number): PlotStage {
  if (!plot.crop || plot.plantedAt === null || plot.readyAt === null) return 'empty';
  if (now >= plot.readyAt) return 'ready';
  const total = Math.max(1, plot.readyAt - plot.plantedAt);
  const t = (now - plot.plantedAt) / total;
  if (t < 0.3) return 'sprout';
  return t < 0.65 ? 'young' : 'flowering';
}

/** Share of the grow time already done, 0 → 1 (1 for ready or empty plots). */
export function plotGrowth(plot: Plot, now: number): number {
  if (plot.plantedAt === null || plot.readyAt === null) return 1;
  const total = Math.max(1, plot.readyAt - plot.plantedAt);
  return Math.min(1, Math.max(0, (now - plot.plantedAt) / total));
}

/** Soil stays dark for a while after watering or post-meal rain. */
export function isWet(plot: Plot, now: number): boolean {
  return plot.wateredAt !== null && now - plot.wateredAt < WATERING.cooldownMs;
}

/** Cans left today (the day rolls over at local midnight). */
export function waterLeft(p: GuestProgress, now: number): number {
  if (p.water.date !== dateKey(now)) return WATERING.perDay;
  return Math.max(0, WATERING.perDay + p.water.bonus - p.water.used);
}

export type WaterBlock = 'not-growing' | 'wet' | 'empty-can';

/** Why a plot cannot be watered right now, or null when it can. */
export function waterBlock(p: GuestProgress, plot: Plot, now: number): WaterBlock | null {
  const stage = plotStage(plot, now);
  if (!isGrowing(stage)) return 'not-growing';
  if (isWet(plot, now)) return 'wet';
  if (waterLeft(p, now) <= 0) return 'empty-can';
  return null;
}

export function firstEmptyPlot(plots: Plot[]): Plot | undefined {
  return plots.find((p) => p.crop === null);
}

export function readyPlots(plots: Plot[], now: number): Plot[] {
  return plots.filter((p) => plotStage(p, now) === 'ready');
}

export function totalSeeds(p: GuestProgress): number {
  return Object.values(p.seeds).reduce((a, b) => a + b, 0);
}

export interface IngredientProgress {
  crop: CropId;
  qty: number;
  have: number;
  growing: number;
}

export interface RecipeProgress {
  id: RecipeId;
  secured: number;
  total: number;
  canCook: boolean;
  ingredients: IngredientProgress[];
}

/**
 * Recipe progress counts harvested ingredients plus crops still in the ground,
 * so planting a seed moves the bar immediately — transparently labelled "đang lớn".
 */
export function recipeProgress(p: GuestProgress, id: RecipeId): RecipeProgress {
  const recipe = RECIPES[id];
  const ingredients = recipe.ingredients.map(({ crop, qty }) => ({
    crop,
    qty,
    have: p.ingredients[crop],
    growing: p.plots.filter((pl) => pl.crop === crop).length,
  }));
  const secured = ingredients.reduce((s, i) => s + Math.min(i.qty, i.have + i.growing), 0);
  const total = ingredients.reduce((s, i) => s + i.qty, 0);
  return {
    id,
    secured,
    total,
    canCook: ingredients.every((i) => i.have >= i.qty),
    ingredients,
  };
}

/** Starter recipes are always open; the others open with their region on the map. */
export function recipeAvailable(p: GuestProgress, id: RecipeId): boolean {
  const r = RECIPES[id];
  return !!r.starter || p.unlockedRegions.includes(r.region);
}

/** The base crops are always open; the others open by level. */
export function cropAvailable(p: GuestProgress, crop: CropId): boolean {
  return !CROPS[crop].unlock || p.unlockedCrops.includes(crop);
}

/** Crops whose level has been reached but that are not recorded as unlocked yet. */
export function newlyUnlockableCrops(p: GuestProgress): CropId[] {
  const lv = level(p.xp).level;
  return (Object.keys(CROPS) as CropId[]).filter((c) => {
    const u = CROPS[c].unlock;
    return !!u && lv >= u.level && !p.unlockedCrops.includes(c);
  });
}

/** Plots the guest should have at their level (never fewer than they already have). */
export function newPlotCount(p: GuestProgress): number {
  const lv = level(p.xp).level;
  const earned = FARM_PLOT_COUNT + PLOT_UNLOCK_LEVELS.filter((l) => lv >= l).length;
  return Math.max(p.plots.length, earned);
}

/** Level at which the next plot opens, or null when the garden is at full size. */
export function nextPlotLevel(p: GuestProgress): number | null {
  const lv = level(p.xp).level;
  return PLOT_UNLOCK_LEVELS.find((l) => l > lv) ?? null;
}

export function stampCount(p: GuestProgress): number {
  return p.stamps.discovered.length + p.stamps.eaten.length;
}

export interface RegionProgress {
  id: RegionId;
  unlocked: boolean;
  discovered: number;
  eaten: number;
  total: number;
  stampsNeeded: number;
}

/** Dishes of a region that can be chosen today (the 128-dish Food Reel catalogue). */
export function regionDishIds(region: RegionId | 'world'): string[] {
  return reelGameDishes()
    .filter((d) => d.region === region)
    .map((d) => d.id);
}

export function regionProgress(p: GuestProgress, id: RegionId): RegionProgress {
  const region = REGIONS[id];
  const ids = regionDishIds(id);
  return {
    id,
    unlocked: p.unlockedRegions.includes(id),
    discovered: ids.filter((d) => p.stamps.discovered.includes(d) || p.stamps.eaten.includes(d))
      .length,
    eaten: ids.filter((d) => p.stamps.eaten.includes(d)).length,
    total: ids.length,
    stampsNeeded: Math.max(0, region.stampsToUnlock - stampCount(p)),
  };
}

export function dishStatus(p: GuestProgress, dishId: string): 'eaten' | 'discovered' | 'unknown' {
  if (p.stamps.eaten.includes(dishId)) return 'eaten';
  if (p.stamps.discovered.includes(dishId)) return 'discovered';
  return 'unknown';
}

/** Regions whose stamp threshold is met but are not yet recorded as unlocked. */
export function newlyUnlockable(p: GuestProgress): RegionId[] {
  const stamps = stampCount(p);
  return REGION_ORDER.filter(
    (r) => !p.unlockedRegions.includes(r) && stamps >= REGIONS[r].stampsToUnlock,
  );
}

/** The next locked region, in unlock order, for teaser copy. */
export function nextLockedRegion(p: GuestProgress): RegionId | null {
  const locked = REGION_ORDER.filter((r) => !p.unlockedRegions.includes(r)).sort(
    (a, b) => REGIONS[a].stampsToUnlock - REGIONS[b].stampsToUnlock,
  );
  return locked[0] ?? null;
}

export function level(xp: number): { level: number; into: number; span: number } {
  return { level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL, span: XP_PER_LEVEL };
}

export function missionsToday(p: GuestProgress, now: number): { id: MissionKind; done: boolean }[] {
  const today = dateKey(now);
  const done = p.missions.date === today ? p.missions.done : [];
  return DAILY_MISSIONS.map((m) => ({ id: m.id, done: done.includes(m.id) }));
}

export function cropName(id: CropId): string {
  return CROPS[id].name;
}
