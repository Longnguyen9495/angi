import { t } from '../i18n';
import type {
  AvoidId,
  BudgetId,
  AnimalId,
  AnimalProduct,
  Catch,
  CropDef,
  CropId,
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

export const CROPS: Record<CropId, CropDef> = {
  rice: {
    id: 'rice',
    name: t.data.crops.rice.name,
    seedName: t.data.crops.rice.seedName,
    produceName: t.data.crops.rice.produceName,
    growHours: 5,
    yield: 3,
    regions: ['north', 'central', 'south'],
    color: '#d9b44a',
  },
  herbs: {
    id: 'herbs',
    name: t.data.crops.herbs.name,
    seedName: t.data.crops.herbs.seedName,
    produceName: t.data.crops.herbs.produceName,
    growHours: 3,
    yield: 3,
    regions: ['north', 'central', 'south'],
    color: '#4f9a4a',
  },
  chili: {
    id: 'chili',
    name: t.data.crops.chili.name,
    seedName: t.data.crops.chili.seedName,
    produceName: t.data.crops.chili.produceName,
    growHours: 4,
    yield: 3,
    regions: ['central', 'south'],
    color: '#c8412b',
  },
  scallion: {
    id: 'scallion',
    name: t.data.crops.scallion.name,
    seedName: t.data.crops.scallion.seedName,
    produceName: t.data.crops.scallion.produceName,
    growHours: 3,
    yield: 3,
    regions: ['north', 'south'],
    color: '#7cb35a',
  },
  bean: {
    id: 'bean',
    name: t.data.crops.bean.name,
    seedName: t.data.crops.bean.seedName,
    produceName: t.data.crops.bean.produceName,
    growHours: 4,
    yield: 3,
    regions: ['north', 'central'],
    color: '#8f9a3c',
  },
  tomato: {
    id: 'tomato',
    name: t.data.crops.tomato.name,
    seedName: t.data.crops.tomato.seedName,
    produceName: t.data.crops.tomato.produceName,
    growHours: 5,
    yield: 3,
    regions: ['north', 'south'],
    color: '#d6452f',
  },
  lemongrass: {
    id: 'lemongrass',
    name: t.data.crops.lemongrass.name,
    seedName: t.data.crops.lemongrass.seedName,
    produceName: t.data.crops.lemongrass.produceName,
    growHours: 4,
    yield: 3,
    regions: ['central', 'south'],
    color: '#b9c96a',
    unlock: { level: 2 },
  },
  garlic: {
    id: 'garlic',
    name: t.data.crops.garlic.name,
    seedName: t.data.crops.garlic.seedName,
    produceName: t.data.crops.garlic.produceName,
    growHours: 5,
    yield: 3,
    regions: ['north', 'central'],
    color: '#efe6d2',
    unlock: { level: 3 },
  },
  cucumber: {
    id: 'cucumber',
    name: t.data.crops.cucumber.name,
    seedName: t.data.crops.cucumber.seedName,
    produceName: t.data.crops.cucumber.produceName,
    growHours: 4,
    yield: 3,
    regions: ['north', 'south'],
    color: '#5f9a3a',
    unlock: { level: 4 },
  },
  lime: {
    id: 'lime',
    name: t.data.crops.lime.name,
    seedName: t.data.crops.lime.seedName,
    produceName: t.data.crops.lime.produceName,
    growHours: 6,
    yield: 3,
    regions: ['north', 'central', 'south'],
    color: '#8cc43f',
    unlock: { level: 5 },
  },
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

// ——— Animals: fed with garden produce, they give egg and milk. Never sick, never lost. ———

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

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: {
    id: 'chicken',
    name: t.data.animals.chicken,
    feed: 'rice',
    product: 'egg',
    yield: 2,
    hours: 3,
    unlockLevel: 2,
  },
  cow: {
    id: 'cow',
    name: t.data.animals.cow,
    feed: 'herbs',
    product: 'milk',
    yield: 1,
    hours: 5,
    unlockLevel: 4,
  },
};

export const ANIMAL_LIST: AnimalDef[] = Object.values(ANIMALS);

const ANIMAL_PRODUCE: Record<AnimalProduct, { name: string; animal: AnimalId }> = {
  egg: { name: t.data.animalProduce.egg, animal: 'chicken' },
  milk: { name: t.data.animalProduce.milk, animal: 'cow' },
};

// ——— The pond: a few casts a day; what bites is fish or shrimp. Nothing is ever lost. ———

export interface CatchDef {
  id: Catch;
  name: string;
  /** Share of bites that are this catch (weights sum to 1). */
  chance: number;
}

export const CATCHES: Record<Catch, CatchDef> = {
  fish: { id: 'fish', name: t.data.catches.fish, chance: 0.65 },
  shrimp: { id: 'shrimp', name: t.data.catches.shrimp, chance: 0.35 },
};

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
  'egg',
  'milk',
  'fish',
  'shrimp',
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

/** Display name of anything in the pantry. */
export function produceName(id: ProduceId): string {
  if (isCrop(id)) return CROPS[id].produceName;
  return isCatch(id) ? CATCHES[id].name : ANIMAL_PRODUCE[id].name;
}

/** Level at which a pantry item can first be obtained (crops by unlock, products by their animal). */
export function produceUnlockLevel(id: ProduceId): number {
  if (isCrop(id)) return CROPS[id].unlock?.level ?? 1;
  return isCatch(id) ? 1 : ANIMALS[ANIMAL_PRODUCE[id].animal].unlockLevel;
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
  sell: (item: ProduceId): number =>
    // A plot gives three of a crop, so one crop sells for less than an egg or a fish.
    isCrop(item) ? (CROPS[item].unlock ? 3 : 2) : item === 'shrimp' ? 9 : 7,
  /** What one seed costs. */
  seed: (crop: CropId): number => (CROPS[crop].unlock ? 10 : 6),
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
