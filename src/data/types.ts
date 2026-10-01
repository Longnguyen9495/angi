export type RegionId = 'north' | 'central' | 'south';
export type CropId =
  | 'rice'
  | 'herbs'
  | 'chili'
  | 'scallion'
  | 'bean'
  | 'tomato'
  | 'lemongrass'
  | 'garlic'
  | 'cucumber'
  | 'lime';
/** Animal products: they fill the pantry like crops but are not grown in plots. */
export type AnimalProduct = 'egg' | 'milk';
/** Caught at the pond: they fill the pantry like crops but come from fishing. */
export type Catch = 'fish' | 'shrimp';
/** Anything that can sit in the pantry and go into a recipe. */
export type ProduceId = CropId | AnimalProduct | Catch;
export type AnimalId = 'chicken' | 'cow';
export type RecipeId =
  | 'com-tam'
  | 'bun-rieu'
  | 'bun-bo-hue'
  | 'goi-cuon'
  | 'banh-xeo'
  | 'bo-luc-lac'
  | 'mi-quang'
  | 'com-ga-hoi-an'
  | 'nem-nuong'
  | 'pho-bo'
  | 'bun-cha'
  | 'banh-cuon'
  | 'banh-mi-chao'
  | 'canh-chua-ca';
export type DecorId = 'scarecrow' | 'lantern' | 'jar' | 'fence';
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
  /** Crops beyond the starting six open at a level (and gift one seed). */
  unlock?: { level: number };
}

export interface RecipeDef {
  id: RecipeId;
  name: string;
  /** The reel dish this recipe cooks (photo for the cookbook and the result card). */
  dishId: string;
  region: RegionId;
  group: DishGroup;
  ingredients: { crop: ProduceId; qty: number }[];
  xp: number;
  unlockNote: string;
  fact: string;
  /** Starter recipes are open from day one; the rest open with their region on the map. */
  starter?: boolean;
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
