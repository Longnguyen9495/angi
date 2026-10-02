export type RegionId = 'north' | 'central' | 'south';
/** Vegetables, grains and spices: planted once, harvested once. */
export type VegId =
  | 'rice'
  | 'herbs'
  | 'chili'
  | 'scallion'
  | 'bean'
  | 'tomato'
  | 'lemongrass'
  | 'garlic'
  | 'cucumber'
  | 'napa'
  | 'cabbage'
  | 'cauliflower'
  | 'eggplant'
  | 'pumpkin'
  | 'wintermelon'
  | 'bittermelon'
  | 'radish'
  | 'beet'
  | 'carrot'
  | 'potato'
  | 'sweetpotato'
  | 'taro'
  | 'shallot'
  | 'ginger'
  | 'peanut'
  | 'corn';
/** Fruit trees and fruiting plants: planted once, they stay and fruit again and again. */
export type TreeId =
  | 'lime'
  | 'strawberry'
  | 'pineapple'
  | 'banana'
  | 'papaya'
  | 'guava'
  | 'orange'
  | 'mandarin'
  | 'mango'
  | 'dragonfruit'
  | 'coconut'
  | 'lychee'
  | 'rambutan'
  | 'jackfruit'
  | 'durian';
/** Mushrooms: a spawn block that gives a few flushes, then is spent. */
export type MushroomId = 'button' | 'oyster' | 'shiitake' | 'enoki' | 'woodear';
/** Everything planted in a plot from a seed, sapling or spawn block. */
export type CropId = VegId | TreeId | MushroomId;
export type CropKind = 'veg' | 'tree' | 'mushroom';
/** Animal products: they fill the pantry like crops but are not grown in plots. */
export type AnimalProduct =
  'egg' | 'milk' | 'duckegg' | 'quailegg' | 'gooseegg' | 'goatmilk' | 'wool' | 'rabbitwool';
/** From the beehive. */
export type BeeProduct = 'honey' | 'honeycomb';
/** Caught at the pond (fishing) or brought back by the fishing boat. */
export type Catch =
  | 'fish'
  | 'shrimp'
  | 'carp'
  | 'crab'
  | 'mackerel'
  | 'scad'
  | 'squid'
  | 'octopus'
  | 'clam'
  | 'bloodcockle'
  | 'scallop';
/** Anything that can sit in the pantry and go into a recipe. */
export type ProduceId = CropId | AnimalProduct | BeeProduct | Catch;
export type AnimalId = 'chicken' | 'cow' | 'duck' | 'quail' | 'goose' | 'goat' | 'sheep' | 'rabbit';
/** Groups for the pantry, the market and the seed tray (search and filters). */
export type ItemCategory =
  | 'leafy'
  | 'fruitveg'
  | 'root'
  | 'grain'
  | 'spice'
  | 'fruit'
  | 'mushroom'
  | 'egg'
  | 'dairy'
  | 'fiber'
  | 'bee'
  | 'freshwater'
  | 'seafood';
/** The hand-written recipes (src/data/game.ts); each has its own copy in t.data.recipes. */
export type BuiltinRecipeId =
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
/**
 * A built-in recipe, or one made from a catalogue dish that has a `cook` (its id is the
 * dish id, see registerRecipes in src/data/game.ts).
 */
export type RecipeId = BuiltinRecipeId | (string & {});
/** How hot the fire burns during a cooking step — drives flame, bubbles and pot shake. */
export type Heat = 'low' | 'mid' | 'high';
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
  kind: CropKind;
  category: ItemCategory;
  name: string;
  seedName: string;
  produceName: string;
  /** Hours from planting to the first harvest. */
  growHours: number;
  /** Hours from planting until it has germinated (the sprout stage ends). */
  sproutHours: number;
  /** Trees and mushrooms: hours from one harvest to the next. */
  regrowHours?: number;
  /** Mushrooms: harvests before the spawn block is spent (trees: unlimited). */
  flushes?: number;
  /** Crops per harvest. */
  yield: number;
  /** Market prices (xu); absent on the first ten crops, which keep their old formula. */
  price?: { seed: number; sell: number };
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
  /** Older ids of that dish, used when a catalogue still has one of them (built-in recipes). */
  dishAliases?: string[];
  /** Dishes from abroad ('world') open once a second region of the map is open. */
  region: RegionId | 'world';
  group: DishGroup;
  ingredients: { crop: ProduceId; qty: number }[];
  xp: number;
  unlockNote: string;
  fact: string;
  /** Starter recipes are open from day one; the rest open with their region on the map. */
  starter?: boolean;
  /** Steps from the catalogue (made from a dish); built-in recipes keep theirs in src/data/cooking.ts. */
  steps?: { label: string; heat: Heat; weight: number }[];
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
