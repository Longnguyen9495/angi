import type { AnimalId, CropId, DecorId, ProduceId } from './types';
import type { PlotStage } from '../domain/selectors';

/*
 * Every farm item image in one place. The images are cut from the farm item sheet on its grid
 * (scripts/farm-items/cut.mjs) and mapped to items in scripts/farm-items/catalog.json, which
 * also records how sure each species reading is and which drawings are still missing.
 */
const ITEMS = '/images/farm-items/';

/** A plant in a plot, per growth stage; 'produce' is the harvested item. */
export function cropSprite(crop: CropId, stage: Exclude<PlotStage, 'empty'> | 'produce'): string {
  return `${ITEMS}${crop}-${stage}.webp`;
}

/** Pantry image for anything in the pantry (crops, eggs, milk, wool, honey, catches). */
export function produceSprite(id: ProduceId): string {
  return `${ITEMS}${id}-produce.webp`;
}

/** An animal, young or grown. */
export function animalSprite(id: AnimalId, age: 'young' | 'adult' = 'adult'): string {
  return `${ITEMS}animal-${id}${age === 'young' ? '-young' : ''}.webp`;
}

/** The beehive as it fills (1 → 3), a single bee (for flights), the boat at the jetty. */
export function hiveSprite(step: 1 | 2 | 3): string {
  return `${ITEMS}hive-${step}.webp`;
}
export const BEE_SPRITE = `${ITEMS}bee.webp`;
export const BOAT_SPRITE = `${ITEMS}boat-scene.webp`;

/** Garden decorations bought at the market. */
export function decorSprite(id: DecorId): string {
  return `/images/garden/decor-${id}.webp`;
}
