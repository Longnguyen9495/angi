import { t } from '../i18n';
import type {
  AvoidId,
  BudgetId,
  AnimalId,
  AnimalProduct,
  Catch,
  BeeProduct,
  CropDef,
  CropId,
  CropKind,
  ItemCategory,
  MushroomId,
  TreeId,
  VegId,
  DecorId,
  DishGroup,
  ProduceId,
  MoodId,
  NpcDef,
  RecipeDef,
  RecipeId,
  RegionDef,
  RegionId,
} from './types';

const CROP_TEXT = t.data.crops;
const ALL_REGIONS: RegionId[] = ['north', 'central', 'south'];

/** The first ten crops: their numbers are kept as they were (saves and recipes rely on them). */
function classic(
  id: CropId,
  kind: CropKind,
  category: ItemCategory,
  growHours: number,
  regions: RegionId[],
  color: string,
  unlockLevel?: number,
): CropDef {
  return {
    id,
    kind,
    category,
    ...CROP_TEXT[id],
    growHours,
    // A tree stays after its harvest and fruits again after the same time.
    ...(kind === 'tree' ? { regrowHours: growHours } : {}),
    yield: 3,
    regions,
    color,
    ...(unlockLevel ? { unlock: { level: unlockLevel } } : {}),
  };
}

/**
 * Balance rules for the crops added with the farm item pack (no hand-picked numbers):
 * - vegetables: grow hours = base of the group + level/2; yield 3; sell 2 + level/4 xu, and a
 *   seed costs what its harvest sells for (growing pays in XP, recipes and orders);
 * - fruit trees: first fruit after 2 + 1.5 × level hours, then again after 60 % of that;
 *   2 fruit a harvest; a sapling costs 10 + 5 × level, fruit sells for 3 + level/3;
 * - mushrooms: first flush after 1 + 0.75 × level hours, then every 3 hours, 3 flushes of 2;
 *   a spawn block costs 8 + 3 × level, mushrooms sell for 3 + level/4.
 */
const VEG_BASE_HOURS: Partial<Record<ItemCategory, number>> = {
  leafy: 2,
  fruitveg: 3,
  root: 3,
  grain: 4,
  spice: 3,
};

function veg(id: VegId, category: ItemCategory, level: number, color: string): CropDef {
  const sell = 2 + Math.floor(level / 4);
  return {
    id,
    kind: 'veg',
    category,
    ...CROP_TEXT[id],
    growHours: (VEG_BASE_HOURS[category] ?? 3) + Math.round(level / 2),
    yield: 3,
    regions: ALL_REGIONS,
    color,
    unlock: { level },
    price: { seed: sell * 3, sell },
  };
}

function tree(id: TreeId, level: number, color: string): CropDef {
  const growHours = Math.round(2 + 1.5 * level);
  return {
    id,
    kind: 'tree',
    category: 'fruit',
    ...CROP_TEXT[id],
    growHours,
    regrowHours: Math.round(growHours * 0.6),
    yield: 2,
    regions: ALL_REGIONS,
    color,
    unlock: { level },
    price: { seed: 10 + 5 * level, sell: 3 + Math.floor(level / 3) },
  };
}

function mushroom(id: MushroomId, level: number, color: string): CropDef {
  return {
    id,
    kind: 'mushroom',
    category: 'mushroom',
    ...CROP_TEXT[id],
    growHours: Math.round(1 + 0.75 * level),
    regrowHours: 3,
    flushes: 3,
    yield: 2,
    regions: ALL_REGIONS,
    color,
    unlock: { level },
    price: { seed: 8 + 3 * level, sell: 3 + Math.floor(level / 4) },
  };
}

export const CROPS: Record<CropId, CropDef> = {
  rice: classic('rice', 'veg', 'grain', 5, ALL_REGIONS, '#d9b44a'),
  herbs: classic('herbs', 'veg', 'spice', 3, ALL_REGIONS, '#4f9a4a'),
  chili: classic('chili', 'veg', 'spice', 4, ['central', 'south'], '#c8412b'),
  scallion: classic('scallion', 'veg', 'spice', 3, ['north', 'south'], '#7cb35a'),
  bean: classic('bean', 'veg', 'grain', 4, ['north', 'central'], '#8f9a3c'),
  tomato: classic('tomato', 'veg', 'fruitveg', 5, ['north', 'south'], '#d6452f'),
  lemongrass: classic('lemongrass', 'veg', 'spice', 4, ['central', 'south'], '#b9c96a', 2),
  garlic: classic('garlic', 'veg', 'spice', 5, ['north', 'central'], '#efe6d2', 3),
  cucumber: classic('cucumber', 'veg', 'fruitveg', 4, ['north', 'south'], '#5f9a3a', 4),
  lime: classic('lime', 'tree', 'fruit', 6, ALL_REGIONS, '#8cc43f', 5),

  napa: veg('napa', 'leafy', 2, '#b7d77a'),
  radish: veg('radish', 'root', 2, '#f1efe6'),
  cabbage: veg('cabbage', 'leafy', 3, '#9cc76a'),
  eggplant: veg('eggplant', 'fruitveg', 3, '#6b2f7a'),
  carrot: veg('carrot', 'root', 3, '#e8762d'),
  bittermelon: veg('bittermelon', 'fruitveg', 4, '#6fa53a'),
  potato: veg('potato', 'root', 4, '#d9b26a'),
  shallot: veg('shallot', 'spice', 4, '#b65d7a'),
  cauliflower: veg('cauliflower', 'leafy', 5, '#f2ecd6'),
  sweetpotato: veg('sweetpotato', 'root', 5, '#b4466a'),
  peanut: veg('peanut', 'grain', 5, '#d8b07a'),
  pumpkin: veg('pumpkin', 'fruitveg', 6, '#e7832b'),
  beet: veg('beet', 'root', 6, '#a3243f'),
  corn: veg('corn', 'grain', 6, '#f0c23a'),
  wintermelon: veg('wintermelon', 'fruitveg', 7, '#a9c98a'),
  ginger: veg('ginger', 'spice', 7, '#d6a65a'),
  taro: veg('taro', 'root', 8, '#9b7a8f'),

  strawberry: tree('strawberry', 5, '#d8323a'),
  pineapple: tree('pineapple', 6, '#e2b13a'),
  banana: tree('banana', 7, '#f1d046'),
  papaya: tree('papaya', 7, '#ef8f32'),
  guava: tree('guava', 8, '#a9d16a'),
  orange: tree('orange', 9, '#f08a24'),
  mandarin: tree('mandarin', 9, '#f39a2e'),
  mango: tree('mango', 10, '#f3c33b'),
  dragonfruit: tree('dragonfruit', 10, '#d8336f'),
  coconut: tree('coconut', 11, '#8a6b3d'),
  lychee: tree('lychee', 12, '#d0404a'),
  rambutan: tree('rambutan', 12, '#d8282e'),
  jackfruit: tree('jackfruit', 13, '#c9b04a'),
  durian: tree('durian', 14, '#d6c34a'),

  button: mushroom('button', 3, '#efe3cf'),
  oyster: mushroom('oyster', 4, '#d9cbb6'),
  shiitake: mushroom('shiitake', 6, '#8a5a3a'),
  enoki: mushroom('enoki', 8, '#f4ead2'),
  woodear: mushroom('woodear', 9, '#5a3a2e'),
};

/** The six crops every guest starts with; the rest open by level. */
export const BASE_CROPS: CropId[] = ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'];

export const CROP_LIST: CropDef[] = Object.values(CROPS);

/** Recipes grow in size on purpose: 2 → 3 → 4 ingredients. */
export const RECIPES: Record<RecipeId, RecipeDef> = {
  'com-tam': {
    id: 'com-tam',
    name: 'Cơm tấm sườn',
    dishId: 'com-tam',
    region: 'south',
    group: 'rice',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'scallion', qty: 2 },
    ],
    xp: 30,
    starter: true,
    unlockNote: t.data.recipes['com-tam'].unlockNote,
    fact: t.data.recipes['com-tam'].fact,
  },
  'bun-rieu': {
    id: 'bun-rieu',
    name: 'Bún riêu cua',
    dishId: 'bun-rieu',
    region: 'north',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'tomato', qty: 2 },
      { crop: 'bean', qty: 2 },
    ],
    xp: 45,
    starter: true,
    unlockNote: t.data.recipes['bun-rieu'].unlockNote,
    fact: t.data.recipes['bun-rieu'].fact,
  },
  'bun-bo-hue': {
    id: 'bun-bo-hue',
    name: 'Bún bò Huế',
    dishId: 'bun-bo-hue',
    region: 'central',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'chili', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'scallion', qty: 2 },
    ],
    xp: 60,
    starter: true,
    unlockNote: t.data.recipes['bun-bo-hue'].unlockNote,
    fact: t.data.recipes['bun-bo-hue'].fact,
  },
  // ——— Nam Bộ ———
  'goi-cuon': {
    id: 'goi-cuon',
    name: 'Gỏi cuốn tôm thịt',
    dishId: 'goi-cuon',
    region: 'south',
    group: 'bread-roll',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'shrimp', qty: 1 },
    ],
    xp: 45,
    unlockNote: t.data.recipes['goi-cuon'].unlockNote,
    fact: t.data.recipes['goi-cuon'].fact,
  },
  'banh-xeo': {
    id: 'banh-xeo',
    name: 'Bánh xèo',
    dishId: 'banh-xeo',
    region: 'south',
    group: 'pancake',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'bean', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'scallion', qty: 2 },
    ],
    xp: 55,
    unlockNote: t.data.recipes['banh-xeo'].unlockNote,
    fact: t.data.recipes['banh-xeo'].fact,
  },
  'bo-luc-lac': {
    id: 'bo-luc-lac',
    name: 'Bò lúc lắc',
    dishId: 'bo-luc-lac',
    region: 'south',
    group: 'rice',
    ingredients: [
      { crop: 'tomato', qty: 2 },
      { crop: 'garlic', qty: 2 },
      { crop: 'cucumber', qty: 2 },
      { crop: 'scallion', qty: 2 },
    ],
    xp: 65,
    unlockNote: t.data.recipes['bo-luc-lac'].unlockNote,
    fact: t.data.recipes['bo-luc-lac'].fact,
  },
  // ——— Trung Bộ ———
  'mi-quang': {
    id: 'mi-quang',
    name: 'Mì Quảng',
    dishId: 'mi-quang',
    region: 'central',
    group: 'noodle-dry',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'bean', qty: 2 },
      { crop: 'herbs', qty: 2 },
    ],
    xp: 45,
    unlockNote: t.data.recipes['mi-quang'].unlockNote,
    fact: t.data.recipes['mi-quang'].fact,
  },
  'com-ga-hoi-an': {
    id: 'com-ga-hoi-an',
    name: 'Cơm gà Hội An',
    dishId: 'com-ga-hoi-an',
    region: 'central',
    group: 'rice',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'scallion', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'lime', qty: 2 },
    ],
    xp: 60,
    unlockNote: t.data.recipes['com-ga-hoi-an'].unlockNote,
    fact: t.data.recipes['com-ga-hoi-an'].fact,
  },
  'nem-nuong': {
    id: 'nem-nuong',
    name: 'Nem nướng Ninh Hòa',
    dishId: 'nem-nuong',
    region: 'central',
    group: 'bread-roll',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'garlic', qty: 2 },
      { crop: 'cucumber', qty: 2 },
    ],
    xp: 60,
    unlockNote: t.data.recipes['nem-nuong'].unlockNote,
    fact: t.data.recipes['nem-nuong'].fact,
  },
  // ——— Bắc Bộ ———
  'pho-bo': {
    id: 'pho-bo',
    name: 'Phở bò',
    dishId: 'pho-bo',
    region: 'north',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'scallion', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'lime', qty: 2 },
    ],
    xp: 60,
    unlockNote: t.data.recipes['pho-bo'].unlockNote,
    fact: t.data.recipes['pho-bo'].fact,
  },
  'bun-cha': {
    id: 'bun-cha',
    name: 'Bún chả Hà Nội',
    dishId: 'bun-cha',
    region: 'north',
    group: 'noodle-dry',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'herbs', qty: 2 },
      { crop: 'garlic', qty: 2 },
      { crop: 'chili', qty: 2 },
    ],
    xp: 60,
    unlockNote: t.data.recipes['bun-cha'].unlockNote,
    fact: t.data.recipes['bun-cha'].fact,
  },
  'banh-cuon': {
    id: 'banh-cuon',
    name: 'Bánh cuốn Thanh Trì',
    dishId: 'banh-cuon',
    region: 'north',
    group: 'bread-roll',
    ingredients: [
      { crop: 'rice', qty: 2 },
      { crop: 'scallion', qty: 2 },
      { crop: 'bean', qty: 2 },
    ],
    xp: 45,
    unlockNote: t.data.recipes['banh-cuon'].unlockNote,
    fact: t.data.recipes['banh-cuon'].fact,
  },
  // ——— From the animals ———
  'banh-mi-chao': {
    id: 'banh-mi-chao',
    name: 'Bánh mì chảo',
    dishId: 'banh-mi-chao',
    region: 'south',
    group: 'pancake',
    ingredients: [
      { crop: 'egg', qty: 1 },
      { crop: 'milk', qty: 1 },
      { crop: 'tomato', qty: 2 },
    ],
    xp: 50,
    unlockNote: t.data.recipes['banh-mi-chao'].unlockNote,
    fact: t.data.recipes['banh-mi-chao'].fact,
  },
  'canh-chua-ca': {
    id: 'canh-chua-ca',
    name: 'Canh chua cá',
    dishId: 'canh-chua-ca',
    region: 'south',
    group: 'rice',
    ingredients: [
      { crop: 'fish', qty: 1 },
      { crop: 'tomato', qty: 2 },
      { crop: 'herbs', qty: 2 },
    ],
    xp: 45,
    unlockNote: t.data.recipes['canh-chua-ca'].unlockNote,
    fact: t.data.recipes['canh-chua-ca'].fact,
  },
};

// ——— Animals: fed with garden produce, they give eggs, milk or wool. Never sick, never lost. ———

export interface AnimalDef {
  id: AnimalId;
  name: string;
  /** What one feeding costs, from the pantry. */
  feed: CropId;
  product: AnimalProduct;
  /** Products collected per cycle. */
  yield: number;
  hours: number;
  unlockLevel: number;
}

const animal = (
  id: AnimalId,
  feed: CropId,
  product: AnimalProduct,
  yieldN: number,
  hours: number,
  unlockLevel: number,
): AnimalDef => ({
  id,
  name: t.data.animals[id],
  feed,
  product,
  yield: yieldN,
  hours,
  unlockLevel,
});

/**
 * Hen and cow keep their numbers. The others follow one rule: the later an animal opens, the
 * longer its cycle and the more its product sells for; each eats a crop open before it.
 */
export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: animal('chicken', 'rice', 'egg', 2, 3, 2),
  duck: animal('duck', 'rice', 'duckegg', 2, 4, 3),
  cow: animal('cow', 'herbs', 'milk', 1, 5, 4),
  quail: animal('quail', 'rice', 'quailegg', 3, 3, 5),
  goat: animal('goat', 'napa', 'goatmilk', 1, 5, 6),
  goose: animal('goose', 'herbs', 'gooseegg', 1, 6, 7),
  sheep: animal('sheep', 'cabbage', 'wool', 1, 8, 8),
  rabbit: animal('rabbit', 'carrot', 'rabbitwool', 1, 8, 9),
};

export const ANIMAL_LIST: AnimalDef[] = Object.values(ANIMALS);

const ANIMAL_PRODUCE: Record<
  AnimalProduct,
  { name: string; animal: AnimalId; category: ItemCategory; sell: number }
> = {
  egg: { name: t.data.animalProduce.egg, animal: 'chicken', category: 'egg', sell: 7 },
  duckegg: { name: t.data.animalProduce.duckegg, animal: 'duck', category: 'egg', sell: 7 },
  quailegg: { name: t.data.animalProduce.quailegg, animal: 'quail', category: 'egg', sell: 6 },
  gooseegg: { name: t.data.animalProduce.gooseegg, animal: 'goose', category: 'egg', sell: 10 },
  milk: { name: t.data.animalProduce.milk, animal: 'cow', category: 'dairy', sell: 7 },
  goatmilk: { name: t.data.animalProduce.goatmilk, animal: 'goat', category: 'dairy', sell: 8 },
  wool: { name: t.data.animalProduce.wool, animal: 'sheep', category: 'fiber', sell: 10 },
  rabbitwool: {
    name: t.data.animalProduce.rabbitwool,
    animal: 'rabbit',
    category: 'fiber',
    sell: 12,
  },
};

// ——— The beehive: no feeding; it fills on its own and is emptied for honey and comb. ———

export const HIVE = {
  unlockLevel: 6,
  hours: 8,
  yield: { honey: 2, honeycomb: 1 } as Record<BeeProduct, number>,
} as const;

const BEE_PRODUCE: Record<BeeProduct, { name: string; sell: number }> = {
  honey: { name: t.data.beeProduce.honey, sell: 12 },
  honeycomb: { name: t.data.beeProduce.honeycomb, sell: 9 },
};

// ——— The pond (casts in the garden) and the fishing boat (sent out, comes back later). ———

export interface CatchDef {
  id: Catch;
  name: string;
  /** Relative weight among the catches open at the guest's level. */
  chance: number;
  source: 'pond' | 'boat';
  category: ItemCategory;
  unlockLevel: number;
  sell: number;
}

const catchDef = (
  id: Catch,
  source: CatchDef['source'],
  chance: number,
  unlockLevel: number,
  sell: number,
): CatchDef => ({
  id,
  name: t.data.catches[id],
  chance,
  source,
  category: source === 'pond' ? 'freshwater' : 'seafood',
  unlockLevel,
  sell,
});

export const CATCHES: Record<Catch, CatchDef> = {
  fish: catchDef('fish', 'pond', 0.65, 1, 7),
  shrimp: catchDef('shrimp', 'pond', 0.35, 1, 9),
  carp: catchDef('carp', 'pond', 0.25, 3, 8),
  crab: catchDef('crab', 'pond', 0.15, 5, 10),
  mackerel: catchDef('mackerel', 'boat', 1, 5, 10),
  scad: catchDef('scad', 'boat', 1, 5, 8),
  clam: catchDef('clam', 'boat', 1, 5, 8),
  squid: catchDef('squid', 'boat', 0.8, 6, 10),
  bloodcockle: catchDef('bloodcockle', 'boat', 0.7, 7, 9),
  scallop: catchDef('scallop', 'boat', 0.6, 8, 11),
  octopus: catchDef('octopus', 'boat', 0.5, 9, 12),
};

/** The boat: one trip at a time; it brings back a few of the sea catches open at the guest's level. */
export const BOAT = {
  unlockLevel: 5,
  hours: 4,
  catches: 2,
} as const;

/**
 * Fishing is a bonus like watering: a limited number of catches per local day
 * (a missed bite costs nothing), timings for the bite mini-game in the garden.
 */
export const FISHING = {
  perDay: 5,
  /** Wait before a bite, picked between these (ms). */
  biteMinMs: 1800,
  biteMaxMs: 5200,
  /** How long the bobber stays under before the fish slips away (ms). */
  windowMs: 2000,
  /** A catch must be reported within this long of its cast (ms). */
  maxCastMs: 60_000,
} as const;

export const PRODUCE_IDS: ProduceId[] = [
  ...(Object.keys(CROPS) as CropId[]),
  ...(Object.keys(ANIMAL_PRODUCE) as AnimalProduct[]),
  ...(Object.keys(BEE_PRODUCE) as BeeProduct[]),
  ...(Object.keys(CATCHES) as Catch[]),
];

export function isCrop(id: ProduceId): id is CropId {
  return id in CROPS;
}

export function isCatch(id: ProduceId): id is Catch {
  return id in CATCHES;
}

export function isAnimalProduct(id: ProduceId): id is AnimalProduct {
  return id in ANIMAL_PRODUCE;
}

export function isBeeProduct(id: ProduceId): id is BeeProduct {
  return id in BEE_PRODUCE;
}

/** Display name of anything in the pantry. */
export function produceName(id: ProduceId): string {
  if (isCrop(id)) return CROPS[id].produceName;
  if (isCatch(id)) return CATCHES[id].name;
  return isBeeProduct(id) ? BEE_PRODUCE[id].name : ANIMAL_PRODUCE[id].name;
}

/** Group of anything in the pantry (filters in the pantry and the market). */
export function produceCategory(id: ProduceId): ItemCategory {
  if (isCrop(id)) return CROPS[id].category;
  if (isCatch(id)) return CATCHES[id].category;
  return isBeeProduct(id) ? 'bee' : ANIMAL_PRODUCE[id].category;
}

/** Level at which a pantry item can first be obtained (crops by unlock, products by their source). */
export function produceUnlockLevel(id: ProduceId): number {
  if (isCrop(id)) return CROPS[id].unlock?.level ?? 1;
  if (isCatch(id)) return CATCHES[id].unlockLevel;
  return isBeeProduct(id) ? HIVE.unlockLevel : ANIMALS[ANIMAL_PRODUCE[id].animal].unlockLevel;
}

/** Market price of one of anything in the pantry (crops keep the first ten's old formula). */
export function sellPrice(id: ProduceId): number {
  if (isCrop(id)) return CROPS[id].price?.sell ?? (CROPS[id].unlock ? 3 : 2);
  if (isCatch(id)) return CATCHES[id].sell;
  return isBeeProduct(id) ? BEE_PRODUCE[id].sell : ANIMAL_PRODUCE[id].sell;
}

export function animalOf(id: AnimalProduct): AnimalId {
  return ANIMAL_PRODUCE[id].animal;
}

export const RECIPE_LIST: RecipeDef[] = Object.values(RECIPES);

export const REGIONS: Record<RegionId, RegionDef> = {
  north: {
    id: 'north',
    name: t.data.regions.north.name,
    shortName: t.data.regions.north.shortName,
    tagline: t.data.regions.north.tagline,
    stampsToUnlock: 4,
    featuredDishIds: ['pho-bo', 'bun-cha', 'bun-rieu', 'banh-cuon', 'com-dau-phu-sot-ca'],
    specialty: t.data.regions.north.specialty,
  },
  central: {
    id: 'central',
    name: t.data.regions.central.name,
    shortName: t.data.regions.central.shortName,
    tagline: t.data.regions.central.tagline,
    stampsToUnlock: 2,
    featuredDishIds: ['bun-bo-hue', 'mi-quang', 'com-ga-hoi-an', 'banh-beo', 'com-chay-hue'],
    specialty: t.data.regions.central.specialty,
  },
  south: {
    id: 'south',
    name: t.data.regions.south.name,
    shortName: t.data.regions.south.shortName,
    tagline: t.data.regions.south.tagline,
    stampsToUnlock: 0,
    featuredDishIds: [
      'com-tam',
      'hu-tieu-nam-vang',
      'banh-mi-thit',
      'goi-cuon-chay',
      'canh-chua-ca',
      'banh-xeo',
      'lau-nam-chay',
    ],
    specialty: t.data.regions.south.specialty,
  },
};

/** Display order on the map: north → south, like the shape of the country. */
export const REGION_ORDER: RegionId[] = ['north', 'central', 'south'];
export const STARTING_REGION: RegionId = 'south';

export const CHEF: NpcDef = {
  id: 'co-ba',
  name: t.data.chef.name,
  role: t.data.chef.role,
};

export const XP = {
  chooseDish: 10,
  checkinAte: 20,
  checkinSwapped: 15,
  checkinSkipped: 5,
  harvestPerPlot: 5,
  collectAnimal: 4,
  friendHelp: 3,
  /** Picking one from a friend's ripe plot. */
  steal: 2,
  checkinPhoto: 5,
  catch: 3,
} as const;

/**
 * Watering is a bonus, never a chore: an unwatered crop still ripens on time and
 * nothing ever withers. Each can shortens what is left of the grow time.
 */
export const WATERING = {
  /** Cans per local day; a check-in after a real meal adds one more. */
  perDay: 3,
  /** Share of the remaining grow time one watering removes. */
  cut: 0.25,
  /** A plot can be watered again only after this long. */
  cooldownMs: 60 * 60 * 1000,
} as const;

/**
 * Chợ quê: spare produce sells for xu, xu buy seeds of any open crop and
 * decorations for the garden. Prices favour growing over trading.
 */
export const MARKET = {
  /** What the market pays for one produce. */
  // A plot gives three of a crop, so one crop sells for less than an egg or a fish.
  sell: (item: ProduceId): number => sellPrice(item),
  /** What one seed (sapling, spawn block) costs; the first ten keep their old prices. */
  seed: (crop: CropId): number => CROPS[crop].price?.seed ?? (CROPS[crop].unlock ? 10 : 6),
} as const;

export interface DecorDef {
  id: DecorId;
  name: string;
  price: number;
  note: string;
}

export const DECOR: Record<DecorId, DecorDef> = {
  scarecrow: {
    id: 'scarecrow',
    name: t.data.decor.scarecrow.name,
    price: 40,
    note: t.data.decor.scarecrow.note,
  },
  lantern: {
    id: 'lantern',
    name: t.data.decor.lantern.name,
    price: 30,
    note: t.data.decor.lantern.note,
  },
  jar: { id: 'jar', name: t.data.decor.jar.name, price: 25, note: t.data.decor.jar.note },
  fence: { id: 'fence', name: t.data.decor.fence.name, price: 35, note: t.data.decor.fence.note },
};

export const DECOR_LIST: DecorDef[] = Object.values(DECOR);

export const XP_PER_LEVEL = 100;
export const FARM_PLOT_COUNT = 6;
/** One more plot at each of these levels (6 → 9). */
export const PLOT_UNLOCK_LEVELS = [3, 5, 7] as const;
export const MAX_PLOT_COUNT = FARM_PLOT_COUNT + PLOT_UNLOCK_LEVELS.length;

export const BUDGET_OPTIONS: { id: BudgetId | 'any'; label: string; hint: string }[] = (
  ['low', 'mid', 'high', 'any'] as const
).map((id) => ({ id, ...t.data.budgets[id] }));

export const MOOD_OPTIONS: { id: MoodId; label: string }[] = (
  ['quick', 'filling', 'light', 'novel'] as const
).map((id) => ({ id, label: t.data.moods[id] }));

export const AVOID_OPTIONS: { id: AvoidId; label: string }[] = (
  ['seafood', 'beef', 'pork', 'spicy'] as const
).map((id) => ({ id, label: t.data.avoid[id] }));

export const GROUP_LABEL: Record<DishGroup, string> = {
  'noodle-soup': t.data.groups.noodleSoup,
  'noodle-dry': t.data.groups.noodleDry,
  rice: t.data.groups.rice,
  'bread-roll': t.data.groups.breadRoll,
  pancake: t.data.groups.pancake,
};
