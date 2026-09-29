export type RegionId = 'north' | 'central' | 'south';
export type CropId = 'rice' | 'herbs' | 'chili' | 'scallion' | 'bean' | 'tomato';
export type RecipeId = 'com-tam' | 'bun-rieu' | 'bun-bo-hue';
export type BudgetId = 'low' | 'mid' | 'high';
export type MoodId = 'quick' | 'filling' | 'light' | 'novel';
export type AvoidId = 'seafood' | 'beef' | 'pork' | 'spicy';
export type DishGroup = 'noodle-soup' | 'rice' | 'bread-roll' | 'noodle-dry' | 'pancake';

export interface Dish {
  id: string;
  name: string;
  altNames?: string[];
  image: string;
  imageAlt: string;
  /** Reel dishes from outside Vietnam use 'world' and have no map region. */
  region: RegionId | 'world';
  priceMin: number;
  priceMax: number;
  budget: BudgetId;
  group: DishGroup;
  moods: MoodId[];
  vegetarian: boolean;
  contains: AvoidId[];
  tags: string[];
  reason: string;
  seed: CropId;
  seedNote: string;
  recipe: RecipeId;
}

export interface CropDef {
  id: CropId;
  name: string;
  seedName: string;
  produceName: string;
  growHours: number;
  yield: number;
  regions: RegionId[];
  /** CSS colour used for the fruit/leaf tip of the mature plant. */
  color: string;
}

export interface RecipeDef {
  id: RecipeId;
  name: string;
  region: RegionId;
  group: DishGroup;
  ingredients: { crop: CropId; qty: number }[];
  xp: number;
  unlockNote: string;
  fact: string;
}

export interface RegionDef {
  id: RegionId;
  name: string;
  shortName: string;
  tagline: string;
  /** Number of journey stamps needed to open the region. 0 = open from start. */
  stampsToUnlock: number;
  featuredDishIds: string[];
  specialty: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
}

export type MissionKind = 'choose' | 'checkin' | 'harvest-or-cook';

export interface MissionDef {
  id: MissionKind;
  title: string;
  xp: number;
}
