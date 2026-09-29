import type {
  AvoidId,
  BudgetId,
  CropDef,
  CropId,
  DishGroup,
  MissionDef,
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
};

export const CROP_LIST: CropDef[] = Object.values(CROPS);

/** Recipes grow in size on purpose: 2 → 3 → 4 ingredients. */
export const RECIPES: Record<RecipeId, RecipeDef> = {
  'com-tam': {
    id: 'com-tam',
    name: 'Cơm tấm sườn',
    region: 'south',
    group: 'rice',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'scallion', qty: 1 },
    ],
    xp: 30,
    unlockNote: 'Công thức khởi đầu — mở sẵn cho mọi khách.',
    fact: 'Cơm tấm vốn nấu từ hạt gạo vỡ trong lúc xay xát, nay thành đặc sản Sài Gòn.',
  },
  'bun-rieu': {
    id: 'bun-rieu',
    name: 'Bún riêu cua',
    region: 'north',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'tomato', qty: 1 },
      { crop: 'bean', qty: 1 },
    ],
    xp: 45,
    unlockNote: 'Mở sẵn — cần ba nguyên liệu.',
    fact: 'Riêu được làm từ cua đồng giã nhỏ, lọc lấy nước rồi đun cho gạch cua kết lại.',
  },
  'bun-bo-hue': {
    id: 'bun-bo-hue',
    name: 'Bún bò Huế',
    region: 'central',
    group: 'noodle-soup',
    ingredients: [
      { crop: 'rice', qty: 1 },
      { crop: 'chili', qty: 1 },
      { crop: 'herbs', qty: 1 },
      { crop: 'scallion', qty: 1 },
    ],
    xp: 60,
    unlockNote: 'Mở sẵn — công thức bốn nguyên liệu.',
    fact: 'Nước dùng bún bò Huế thơm nhờ sả và mắm ruốc, sợi bún to hơn bún thường.',
  },
};

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
} as const;

export const XP_PER_LEVEL = 100;
export const FARM_PLOT_COUNT = 6;

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
