import type {
  AvoidId,
  BudgetId,
  AnimalId,
  AnimalProduct,
  CropDef,
  CropId,
  DecorId,
  DishGroup,
  MissionDef,
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
    name: 'Lúa',
    seedName: 'Hạt lúa',
    produceName: 'Gạo',
    growHours: 5,
    yield: 1,
    regions: ['north', 'central', 'south'],
    color: '#d9b44a',
  },
  herbs: {
    id: 'herbs',
    name: 'Rau thơm',
    seedName: 'Hạt rau thơm',
    produceName: 'Rau thơm',
    growHours: 3,
    yield: 1,
    regions: ['north', 'central', 'south'],
    color: '#4f9a4a',
  },
  chili: {
    id: 'chili',
    name: 'Ớt',
    seedName: 'Hạt ớt',
    produceName: 'Ớt',
    growHours: 4,
    yield: 1,
    regions: ['central', 'south'],
    color: '#c8412b',
  },
  scallion: {
    id: 'scallion',
    name: 'Hành',
    seedName: 'Củ hành giống',
    produceName: 'Hành',
    growHours: 3,
    yield: 1,
    regions: ['north', 'south'],
    color: '#7cb35a',
  },
  bean: {
    id: 'bean',
    name: 'Đậu',
    seedName: 'Hạt đậu',
    produceName: 'Đậu',
    growHours: 4,
    yield: 1,
    regions: ['north', 'central'],
    color: '#8f9a3c',
  },
  tomato: {
    id: 'tomato',
    name: 'Cà chua',
    seedName: 'Hạt cà chua',
    produceName: 'Cà chua',
    growHours: 5,
    yield: 1,
    regions: ['north', 'south'],
    color: '#d6452f',
  },
  lemongrass: {
    id: 'lemongrass',
    name: 'Sả',
    seedName: 'Gốc sả giống',
    produceName: 'Sả',
    growHours: 4,
    yield: 1,
    regions: ['central', 'south'],
    color: '#b9c96a',
    unlock: { level: 2 },
  },
  garlic: {
    id: 'garlic',
    name: 'Tỏi',
    seedName: 'Tép tỏi giống',
    produceName: 'Tỏi',
    growHours: 5,
    yield: 1,
    regions: ['north', 'central'],
    color: '#efe6d2',
    unlock: { level: 3 },
  },
  cucumber: {
    id: 'cucumber',
    name: 'Dưa leo',
    seedName: 'Hạt dưa leo',
    produceName: 'Dưa leo',
    growHours: 4,
    yield: 1,
    regions: ['north', 'south'],
    color: '#5f9a3a',
    unlock: { level: 4 },
  },
  lime: {
    id: 'lime',
    name: 'Chanh',
    seedName: 'Cây chanh giống',
    produceName: 'Chanh',
    growHours: 6,
    yield: 1,
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
      { crop: 'rice', qty: 1 },
      { crop: 'scallion', qty: 1 },
    ],
    xp: 30,
    starter: true,
    unlockNote: 'Công thức khởi đầu — mở sẵn cho mọi khách.',
    fact: 'Cơm tấm vốn nấu từ hạt gạo vỡ trong lúc xay xát, nay thành đặc sản Sài Gòn.',
  },
  'bun-rieu': {
    id: 'bun-rieu',
    name: 'Bún riêu cua',
    dishId: 'bun-rieu',
    region: 'north',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'tomato', qty: 1 },
      { crop: 'bean', qty: 1 },
    ],
    xp: 45,
    starter: true,
    unlockNote: 'Mở sẵn — cần ba nguyên liệu.',
    fact: 'Riêu được làm từ cua đồng giã nhỏ, lọc lấy nước rồi đun cho gạch cua kết lại.',
  },
  'bun-bo-hue': {
    id: 'bun-bo-hue',
    name: 'Bún bò Huế',
    dishId: 'bun-bo-hue',
    region: 'central',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'chili', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'scallion', qty: 1 },
    ],
    xp: 60,
    starter: true,
    unlockNote: 'Mở sẵn — công thức bốn nguyên liệu.',
    fact: 'Nước dùng bún bò Huế thơm nhờ sả và mắm ruốc, sợi bún to hơn bún thường.',
  },
  // ——— Nam Bộ ———
  'goi-cuon': {
    id: 'goi-cuon',
    name: 'Gỏi cuốn tôm thịt',
    dishId: 'goi-cuon',
    region: 'south',
    group: 'bread-roll',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'bean', qty: 1 },
    ],
    xp: 45,
    unlockNote: 'Mở cùng Nam Bộ.',
    fact: 'Gỏi cuốn không chiên: bánh tráng chỉ nhúng nước, cuốn tôm, thịt, bún và rau sống.',
  },
  'banh-xeo': {
    id: 'banh-xeo',
    name: 'Bánh xèo',
    dishId: 'banh-xeo',
    region: 'south',
    group: 'pancake',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'bean', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'scallion', qty: 1 },
    ],
    xp: 55,
    unlockNote: 'Mở cùng Nam Bộ.',
    fact: 'Tên bánh xèo lấy từ tiếng bột gạo xèo lên khi đổ vào chảo nóng.',
  },
  'bo-luc-lac': {
    id: 'bo-luc-lac',
    name: 'Bò lúc lắc',
    dishId: 'bo-luc-lac',
    region: 'south',
    group: 'rice',
    ingredients: [
      { crop: 'tomato', qty: 1 },
      { crop: 'garlic', qty: 1 },
      { crop: 'cucumber', qty: 1 },
      { crop: 'scallion', qty: 1 },
    ],
    xp: 65,
    unlockNote: 'Mở cùng Nam Bộ — cần tỏi và dưa leo.',
    fact: 'Thịt bò cắt hạt lựu được lắc đều trên chảo thật nóng, nên có tên "lúc lắc".',
  },
  // ——— Trung Bộ ———
  'mi-quang': {
    id: 'mi-quang',
    name: 'Mì Quảng',
    dishId: 'mi-quang',
    region: 'central',
    group: 'noodle-dry',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'bean', qty: 1 },
      { crop: 'herbs', qty: 1 },
    ],
    xp: 45,
    unlockNote: 'Mở cùng Trung Bộ.',
    fact: 'Mì Quảng chỉ chan xâm xấp nước nhưng rất đậm, ăn kèm bánh tráng nướng và đậu phộng.',
  },
  'com-ga-hoi-an': {
    id: 'com-ga-hoi-an',
    name: 'Cơm gà Hội An',
    dishId: 'com-ga-hoi-an',
    region: 'central',
    group: 'rice',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'scallion', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'lime', qty: 1 },
    ],
    xp: 60,
    unlockNote: 'Mở cùng Trung Bộ — cần chanh.',
    fact: 'Gạo được nấu bằng nước luộc gà và chút nghệ nên hạt cơm vàng và thơm.',
  },
  'nem-nuong': {
    id: 'nem-nuong',
    name: 'Nem nướng Ninh Hòa',
    dishId: 'nem-nuong',
    region: 'central',
    group: 'bread-roll',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'garlic', qty: 1 },
      { crop: 'cucumber', qty: 1 },
    ],
    xp: 60,
    unlockNote: 'Mở cùng Trung Bộ — cần tỏi và dưa leo.',
    fact: 'Nem được nướng trên than hoa rồi cuốn cùng rau sống, dưa leo và chấm nước sốt gan.',
  },
  // ——— Bắc Bộ ———
  'pho-bo': {
    id: 'pho-bo',
    name: 'Phở bò',
    dishId: 'pho-bo',
    region: 'north',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'scallion', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'lime', qty: 1 },
    ],
    xp: 60,
    unlockNote: 'Mở cùng Bắc Bộ — cần chanh.',
    fact: 'Nước phở trong nhờ xương bò ninh nhỏ lửa nhiều giờ cùng gừng, hành nướng và hoa hồi.',
  },
  'bun-cha': {
    id: 'bun-cha',
    name: 'Bún chả Hà Nội',
    dishId: 'bun-cha',
    region: 'north',
    group: 'noodle-dry',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'garlic', qty: 1 },
      { crop: 'chili', qty: 1 },
    ],
    xp: 60,
    unlockNote: 'Mở cùng Bắc Bộ — cần tỏi.',
    fact: 'Chả được nướng trên than hoa, thả vào bát nước chấm chua ngọt có tỏi ớt ngâm.',
  },
  'banh-cuon': {
    id: 'banh-cuon',
    name: 'Bánh cuốn Thanh Trì',
    dishId: 'banh-cuon',
    region: 'north',
    group: 'bread-roll',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'scallion', qty: 1 },
      { crop: 'bean', qty: 1 },
    ],
    xp: 45,
    unlockNote: 'Mở cùng Bắc Bộ.',
    fact: 'Lá bánh được tráng trên khuôn vải căng trên nồi nước sôi, mỏng đến mức nhìn xuyên được.',
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
      { crop: 'tomato', qty: 1 },
    ],
    xp: 50,
    unlockNote: 'Mở cùng Nam Bộ — cần trứng gà và sữa bò trong vườn.',
    fact: 'Chảo gang nóng xèo xèo: trứng ốp la, pa tê và xíu mại ăn kèm ổ bánh mì giòn, một kiểu điểm tâm của Sài Gòn.',
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
    name: 'Gà mái',
    feed: 'rice',
    product: 'egg',
    yield: 2,
    hours: 3,
    unlockLevel: 2,
  },
  cow: {
    id: 'cow',
    name: 'Bò sữa',
    feed: 'herbs',
    product: 'milk',
    yield: 1,
    hours: 5,
    unlockLevel: 4,
  },
};

export const ANIMAL_LIST: AnimalDef[] = Object.values(ANIMALS);

const ANIMAL_PRODUCE: Record<AnimalProduct, { name: string; animal: AnimalId }> = {
  egg: { name: 'Trứng gà', animal: 'chicken' },
  milk: { name: 'Sữa bò', animal: 'cow' },
};

export const PRODUCE_IDS: ProduceId[] = [...(Object.keys(CROPS) as CropId[]), 'egg', 'milk'];

export function isCrop(id: ProduceId): id is CropId {
  return id in CROPS;
}

/** Display name of anything in the pantry. */
export function produceName(id: ProduceId): string {
  return isCrop(id) ? CROPS[id].produceName : ANIMAL_PRODUCE[id].name;
}

/** Level at which a pantry item can first be obtained (crops by unlock, products by their animal). */
export function produceUnlockLevel(id: ProduceId): number {
  return isCrop(id)
    ? (CROPS[id].unlock?.level ?? 1)
    : ANIMALS[ANIMAL_PRODUCE[id].animal].unlockLevel;
}

export function animalOf(id: AnimalProduct): AnimalId {
  return ANIMAL_PRODUCE[id].animal;
}

export const RECIPE_LIST: RecipeDef[] = Object.values(RECIPES);

export const REGIONS: Record<RegionId, RegionDef> = {
  north: {
    id: 'north',
    name: 'Bắc Bộ',
    shortName: 'Bắc',
    tagline: 'Nước dùng thanh, vị cân bằng',
    stampsToUnlock: 4,
    featuredDishIds: ['pho-bo', 'bun-cha', 'bun-rieu', 'banh-cuon', 'com-dau-phu-sot-ca'],
    specialty: 'Phở bò tái chín',
  },
  central: {
    id: 'central',
    name: 'Trung Bộ',
    shortName: 'Trung',
    tagline: 'Đậm đà, cay nồng, nhiều món nhỏ',
    stampsToUnlock: 2,
    featuredDishIds: ['bun-bo-hue', 'mi-quang', 'com-ga-hoi-an', 'banh-beo', 'com-chay-hue'],
    specialty: 'Bún bò Huế',
  },
  south: {
    id: 'south',
    name: 'Nam Bộ',
    shortName: 'Nam',
    tagline: 'Ngọt thanh, nhiều rau, phóng khoáng',
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
    specialty: 'Cơm tấm sườn bì chả',
  },
};

/** Display order on the map: north → south, like the shape of the country. */
export const REGION_ORDER: RegionId[] = ['north', 'central', 'south'];
export const STARTING_REGION: RegionId = 'south';

export const CHEF: NpcDef = {
  id: 'co-ba',
  name: 'Cô Ba Bếp',
  role: 'Đầu bếp dẫn đường',
};

export const DAILY_MISSIONS: MissionDef[] = [
  { id: 'choose', title: 'Chốt một món', xp: 10 },
  { id: 'checkin', title: 'Check-in một bữa', xp: 15 },
  { id: 'harvest-or-cook', title: 'Thu hoạch hoặc nấu một món', xp: 10 },
];

export const XP = {
  chooseDish: 10,
  checkinAte: 20,
  checkinSwapped: 15,
  checkinSkipped: 5,
  harvestPerPlot: 5,
  collectAnimal: 4,
  friendHelp: 3,
  checkinPhoto: 5,
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
  sell: (item: ProduceId): number => (isCrop(item) ? (CROPS[item].unlock ? 6 : 4) : 7),
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
    name: 'Bù nhìn nón lá',
    price: 40,
    note: 'Đứng gác khu vườn, đội nón lá.',
  },
  lantern: { id: 'lantern', name: 'Đèn lồng đỏ', price: 30, note: 'Sáng lên khi trời tối.' },
  jar: { id: 'jar', name: 'Chum nước sành', price: 25, note: 'Chum hứng nước mưa cạnh luống.' },
  fence: { id: 'fence', name: 'Hàng rào tre', price: 35, note: 'Rào tre bao quanh khu vườn.' },
};

export const DECOR_LIST: DecorDef[] = Object.values(DECOR);

export const XP_PER_LEVEL = 100;
export const FARM_PLOT_COUNT = 6;
/** One more plot at each of these levels (6 → 9). */
export const PLOT_UNLOCK_LEVELS = [3, 5, 7] as const;
export const MAX_PLOT_COUNT = FARM_PLOT_COUNT + PLOT_UNLOCK_LEVELS.length;

export const BUDGET_OPTIONS: { id: BudgetId | 'any'; label: string; hint: string }[] = [
  { id: 'low', label: 'Dưới 40k', hint: 'Tiết kiệm' },
  { id: 'mid', label: '40–70k', hint: 'Vừa túi' },
  { id: 'high', label: 'Trên 70k', hint: 'Thoải mái' },
  { id: 'any', label: 'Sao cũng được', hint: 'Mọi mức giá' },
];

export const MOOD_OPTIONS: { id: MoodId; label: string }[] = [
  { id: 'quick', label: 'Nhanh' },
  { id: 'filling', label: 'No' },
  { id: 'light', label: 'Nhẹ' },
  { id: 'novel', label: 'Đổi vị' },
];

export const AVOID_OPTIONS: { id: AvoidId; label: string }[] = [
  { id: 'seafood', label: 'Hải sản' },
  { id: 'beef', label: 'Thịt bò' },
  { id: 'pork', label: 'Thịt heo' },
  { id: 'spicy', label: 'Đồ cay' },
];

export const GROUP_LABEL: Record<DishGroup, string> = {
  'noodle-soup': 'Món nước',
  'noodle-dry': 'Bún/mì khô',
  rice: 'Cơm',
  'bread-roll': 'Bánh mì & cuốn',
  pancake: 'Bánh',
};
