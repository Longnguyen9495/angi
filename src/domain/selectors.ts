import type { UpgradeId } from '../data/game';
import { t } from '../i18n';
import { reelGameDishes } from '../features/food-reel/data/reelCatalogue';
import {
  ANIMALS,
  BOAT,
  CATCHES,
  HIVE,
  CROPS,
  getRecipe,
  REGIONS,
  REGION_ORDER,
  FARM_PLOT_COUNT,
  FISHING,
  PLOT_UNLOCK_LEVELS,
  LAND_PRICES,
  WATERING,
  levelForXp,
  xpForLevel,
  animalOf,
  isAnimalProduct,
  isMeat,
  isBeeProduct,
  isCatch,
  isCrop,
} from '../data/game';
import type { AnimalId, Catch, CropId, ProduceId, RecipeId, RegionId } from '../data/types';
import type { GuestProgress, Plot } from './progress';
import { dateKey } from './time';

export type PlotStage = 'empty' | 'sprout' | 'young' | 'flowering' | 'ready';

export const STAGE_LABEL: Record<PlotStage, string> = {
  empty: t.domain.plotStage.empty,
  sprout: t.domain.plotStage.sprout,
  young: t.domain.plotStage.young,
  flowering: t.domain.plotStage.flowering,
  ready: t.domain.plotStage.ready,
};

/** Planted and not ripe yet: the stages that can still be watered. */
export function isGrowing(stage: PlotStage): boolean {
  return stage === 'sprout' || stage === 'young' || stage === 'flowering';
}

export function plotStage(plot: Plot, now: number): PlotStage {
  if (!plot.crop || plot.plantedAt === null || plot.readyAt === null) return 'empty';
  if (now >= plot.readyAt) return 'ready';
  // After a harvest a tree stays grown and flowers again; a mushroom block fruits again.
  if ((plot.harvests ?? 0) > 0) return CROPS[plot.crop].kind === 'tree' ? 'flowering' : 'young';
  const total = Math.max(1, plot.readyAt - plot.plantedAt);
  const t = (now - plot.plantedAt) / total;
  // Each crop germinates in its own time (share of its grow time; watering shortens both).
  const def = CROPS[plot.crop];
  const sprout = Math.min(0.6, def.sproutHours / def.growHours);
  if (t < sprout) return 'sprout';
  return t < sprout + (1 - sprout) * 0.5 ? 'young' : 'flowering';
}

/** Harvests left in a planting (Infinity for trees and one-off crops' single harvest is 1). */
export function harvestsLeft(plot: Plot): number {
  if (!plot.crop) return 0;
  const def = CROPS[plot.crop];
  if (def.kind === 'tree') return Infinity;
  if (def.kind === 'mushroom') return Math.max(0, (def.flushes ?? 1) - (plot.harvests ?? 0));
  return 1;
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
/** Level of a farm building (0 = not upgraded). */
export function upgradeLevel(p: GuestProgress, id: UpgradeId): number {
  return p.upgrades?.[id] ?? 0;
}

/** What one collection from an animal gives: its yield, plus one per level of the barn. */
export function animalYield(p: GuestProgress, id: AnimalId): number {
  return ANIMALS[id].yield + upgradeLevel(p, 'barn');
}

/** Honey from one full hive: the base, plus one per level of the hive. */
export function hiveHoney(p: GuestProgress): number {
  return HIVE.yield.honey + upgradeLevel(p, 'hive');
}

/** Watering cans a day: the base, plus one per level of the well. */
export function cansPerDay(p: GuestProgress): number {
  return WATERING.perDay + upgradeLevel(p, 'well');
}

export function waterLeft(p: GuestProgress, now: number): number {
  if (p.water.date !== dateKey(now)) return cansPerDay(p);
  return Math.max(0, cansPerDay(p) + p.water.bonus - p.water.used);
}

/** Catches left today at the pond (the day rolls over at local midnight). */
export function fishingLeft(p: GuestProgress, now: number): number {
  if (p.fishing.date !== dateKey(now)) return FISHING.perDay;
  return Math.max(0, FISHING.perDay - p.fishing.used);
}

/** Integer hash of a time → [0, 1). */
function unit(at: number, salt = 0): number {
  let h = (Math.floor(at) + salt * 0x9e3779b1) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Weighted pick among the catches of a source open at `lv`. */
function pickCatch(source: 'pond' | 'boat', lv: number, t: number): Catch {
  const open = (Object.keys(CATCHES) as Catch[]).filter(
    (c) => CATCHES[c].source === source && CATCHES[c].unlockLevel <= lv,
  );
  const total = open.reduce((s, c) => s + CATCHES[c].chance, 0);
  let acc = 0;
  for (const c of open) {
    acc += CATCHES[c].chance / total;
    if (t < acc) return c;
  }
  return open[open.length - 1] ?? 'fish';
}

/**
 * What bites on a cast: decided by the cast time (and the guest's level, which opens more
 * species) alone — deterministic, so the garden can show it and the reducer grants the same.
 * At level 1–2 it is fish or shrimp exactly as before.
 */
export function catchFor(castAt: number, lv = 1): Catch {
  return pickCatch('pond', lv, unit(castAt));
}

/** What the boat brings back from the trip sent at `sentAt` (same answer every time). */
/** What a trip brings back: BOAT.catches, plus one per level of the boat (the first ones never change). */
export function boatCatch(sentAt: number, lv: number, extra = 0): Catch[] {
  return Array.from({ length: BOAT.catches + extra }, (_, i) =>
    pickCatch('boat', lv, unit(sentAt, i + 1)),
  );
}

export type HiveStage = 'locked' | 'idle' | 'filling-1' | 'filling-2' | 'ready';

export function hiveUnlocked(p: GuestProgress): boolean {
  return level(p.xp).level >= HIVE.unlockLevel;
}

/** The hive's look: it fills in two steps, then can be emptied. */
export function hiveStage(p: GuestProgress, now: number): HiveStage {
  if (!hiveUnlocked(p)) return 'locked';
  const h = p.hive;
  if (h.readyAt === null || h.startedAt === null) return 'idle';
  if (now >= h.readyAt) return 'ready';
  return (now - h.startedAt) / Math.max(1, h.readyAt - h.startedAt) < 0.5
    ? 'filling-1'
    : 'filling-2';
}

export type BoatStage = 'locked' | 'docked' | 'away' | 'back';

export function boatUnlocked(p: GuestProgress): boolean {
  return level(p.xp).level >= BOAT.unlockLevel;
}

export function boatStage(p: GuestProgress, now: number): BoatStage {
  if (!boatUnlocked(p)) return 'locked';
  if (p.boat.returnAt === null) return 'docked';
  return now >= p.boat.returnAt ? 'back' : 'away';
}

/** Wait before the bite for a cast, between FISHING.biteMinMs and biteMaxMs. */
export function biteDelay(castAt: number): number {
  const t = (Math.floor(castAt / 7) % 997) / 997;
  return Math.round(FISHING.biteMinMs + t * (FISHING.biteMaxMs - FISHING.biteMinMs));
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
  crop: ProduceId;
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
  const recipe = getRecipe(id);
  const ingredients = recipe.ingredients.map(({ crop, qty }) => ({
    crop,
    qty,
    have: p.ingredients[crop],
    // Crops in the ground, or an animal busy producing it, count as "đang lớn".
    growing: isCrop(crop)
      ? p.plots
          .filter((pl) => pl.crop === crop)
          .reduce((n, pl) => n + CROPS[crop].yield - (pl.stolen ? 1 : 0), 0)
      : isAnimalProduct(crop) && p.animals[animalOf(crop)].readyAt !== null
        ? ANIMALS[animalOf(crop)].yield
        : 0,
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
  const r = getRecipe(id);
  if (r.starter) return true;
  // Dishes from abroad open with a second region: the guest has started to travel.
  return r.region === 'world'
    ? p.unlockedRegions.length >= 2
    : p.unlockedRegions.includes(r.region);
}

/** The base crops are always open; the others open by level. */
export function cropAvailable(p: GuestProgress, crop: CropId): boolean {
  return !CROPS[crop].unlock || p.unlockedCrops.includes(crop);
}

/** A pantry item can be obtained: its crop is open, or its source is unlocked. */
export function produceAvailable(p: GuestProgress, id: ProduceId): boolean {
  if (isCrop(id)) return cropAvailable(p, id);
  // Meat is always to be had: the market sells it before the animal opens.
  if (isMeat(id)) return true;
  if (isAnimalProduct(id)) return animalUnlocked(p, animalOf(id));
  if (isBeeProduct(id)) return hiveUnlocked(p);
  return isCatch(id) ? level(p.xp).level >= CATCHES[id].unlockLevel : true;
}

export function animalUnlocked(p: GuestProgress, id: AnimalId): boolean {
  return level(p.xp).level >= ANIMALS[id].unlockLevel;
}

export type AnimalStage = 'locked' | 'hungry' | 'busy' | 'ready';

export function animalStage(p: GuestProgress, id: AnimalId, now: number): AnimalStage {
  if (!animalUnlocked(p, id)) return 'locked';
  const a = p.animals[id];
  if (a.readyAt === null) return 'hungry';
  return now >= a.readyAt ? 'ready' : 'busy';
}

/** Crops whose level has been reached but that are not recorded as unlocked yet. */
export function newlyUnlockableCrops(p: GuestProgress): CropId[] {
  const lv = level(p.xp).level;
  return (Object.keys(CROPS) as CropId[]).filter((c) => {
    const u = CROPS[c].unlock;
    return !!u && lv >= u.level && !p.unlockedCrops.includes(c);
  });
}

/** Most plots the guest may hold at their level (each beyond the first four is bought). */
export function plotsAllowed(xp: number): number {
  const lv = level(xp).level;
  return FARM_PLOT_COUNT + PLOT_UNLOCK_LEVELS.filter((l) => lv >= l).length;
}

/**
 * The next plot to clear: its id, the level it needs and its price, and whether the guest
 * can clear it now. Null when the garden is at full size.
 */
export function nextLand(
  p: GuestProgress,
): { id: number; level: number; price: number; open: boolean; affordable: boolean } | null {
  const i = p.plots.length - FARM_PLOT_COUNT;
  const need = PLOT_UNLOCK_LEVELS[i];
  const price = LAND_PRICES[i];
  if (need === undefined || price === undefined) return null;
  const open = level(p.xp).level >= need;
  return { id: p.plots.length + 1, level: need, price, open, affordable: open && p.coins >= price };
}

/** Level at which the next plot can be cleared, or null when the garden is at full size. */
export function nextPlotLevel(p: GuestProgress): number | null {
  return nextLand(p)?.level ?? null;
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
  const lv = levelForXp(xp);
  const start = xpForLevel(lv);
  return { level: lv, into: xp - start, span: xpForLevel(lv + 1) - start };
}

export function cropName(id: CropId): string {
  return CROPS[id].name;
}
