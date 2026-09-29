import { CROPS, RECIPES } from '../../../data/game';
import type { AvoidId, BudgetId, CropId, Dish, DishGroup, RecipeId } from '../../../data/types';
import type {
  CatalogueItem,
  CataloguePayload,
  Ingredient,
  ReelDish,
  ReelRegion,
  ReelTone,
} from '../foodReel.types';
import snapshot from './catalogue.snapshot.json';

/*
 * The dish catalogue lives in MariaDB (managed at /admin) and is served by
 * GET /api/dishes. The app starts from a bundled snapshot exported at build
 * time and swaps in the live catalogue before first render (see main.tsx),
 * so it still works if the API is unreachable.
 */

/** [deep background, mid surface, accent] per culinary tone. */
export const TONE_PALETTE: Record<ReelTone, [string, string, string]> = {
  amber: ['#17110a', '#3a2614', '#d7a85d'],
  copper: ['#170e0a', '#3d1f12', '#c9663d'],
  herb: ['#0d1410', '#23382c', '#9fbf7a'],
  crimson: ['#170b0a', '#3f1512', '#dd6247'],
  ivory: ['#13120f', '#2e2a23', '#f4ede1'],
  ocean: ['#0a1113', '#15313a', '#7fb6b8'],
  gold: ['#16120a', '#3b2d12', '#e0b24f'],
};

export const REGION_LABEL: Record<ReelRegion, string> = {
  north: 'Bắc Bộ',
  central: 'Trung Bộ',
  south: 'Nam Bộ',
  world: 'Thế giới',
};

const REGIONS = new Set<string>(Object.keys(REGION_LABEL));
const TONES = new Set<string>(Object.keys(TONE_PALETTE));
const CROP_IDS = new Set<string>(Object.keys(CROPS));
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Deterministic spots spread over the plate area of a square dish photo. */
function anchorFor(i: number): { x: number; y: number } {
  const r = 0.14 + 0.2 * Math.sqrt((i + 0.5) / 7);
  const a = i * GOLDEN + 0.6;
  return { x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r };
}

function toReelDish(item: CatalogueItem, index: number): ReelDish {
  const region = (REGIONS.has(item.region) ? item.region : 'world') as ReelRegion;
  const tone = (TONES.has(item.tone) ? item.tone : 'amber') as ReelTone;
  const ingredients: Ingredient[] = item.ingredients.map((ing, i) => ({
    id: ing.id,
    name: ing.name,
    description: ing.description,
    anchor: anchorFor(i),
    crop: ing.crop && CROP_IDS.has(ing.crop) ? (ing.crop as CropId) : undefined,
  }));
  return {
    id: item.id,
    index,
    sourceImageId: item.sourceImageId ?? index,
    slug: item.id,
    name: item.name,
    subtitle: item.subtitle,
    price: item.price,
    vegetarian: item.vegetarian,
    region,
    image: item.image,
    thumbnail: item.thumbnail,
    video: item.video
      ? { src: item.video.src, poster: item.video.poster, credit: item.video.credit ?? undefined }
      : undefined,
    ingredients,
    flavor: item.flavor,
    story: item.story,
    tone,
    palette: TONE_PALETTE[tone],
    credit: item.credit,
  };
}

function isCatalogueItem(x: unknown): x is CatalogueItem {
  const d = x as CatalogueItem;
  return (
    !!d &&
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    typeof d.image === 'string' &&
    typeof d.thumbnail === 'string' &&
    Array.isArray(d.ingredients) &&
    d.ingredients.length > 0 &&
    typeof d.flavor === 'object'
  );
}

let dishes: ReelDish[] = [];
let byId = new Map<string, ReelDish>();
let gameDishes: Dish[] = [];
let gameById = new Map<string, Dish>();
let version = '';

/** Replaces the whole catalogue. Returns false (keeping the current one) if the payload is unusable. */
export function applyCatalogue(payload: CataloguePayload): boolean {
  const items = Array.isArray(payload?.items) ? payload.items.filter(isCatalogueItem) : [];
  if (items.length === 0) return false;
  dishes = items.map(toReelDish);
  byId = new Map(dishes.map((d) => [d.id, d]));
  gameDishes = dishes.map(toGameDish);
  gameById = new Map(gameDishes.map((d) => [d.id, d]));
  version = String(payload.version ?? '');
  return true;
}

/**
 * Fetches the live catalogue from the API. Resolves to where the data came
 * from; never rejects. Only an unreachable API falls back to the snapshot —
 * a database that answers with no dishes resolves to 'empty'.
 */
export async function loadLiveCatalogue(timeoutMs = 1500): Promise<'live' | 'snapshot' | 'empty'> {
  if (typeof fetch !== 'function') return 'snapshot';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/dishes', {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return 'snapshot';
    const payload = (await res.json()) as CataloguePayload;
    if (Array.isArray(payload?.items) && payload.items.length === 0) return 'empty';
    return applyCatalogue(payload) ? 'live' : 'snapshot';
  } catch {
    return 'snapshot';
  } finally {
    clearTimeout(timer);
  }
}

export const reelDishes = (): readonly ReelDish[] => dishes;
export const reelCount = (): number => dishes.length;
export const catalogueVersion = (): string => version;

export function getReelDish(id: string | null | undefined): ReelDish | undefined {
  return id ? byId.get(id) : undefined;
}

export function getReelDishBySlug(slug: string): ReelDish | undefined {
  return byId.get(slug);
}

/** Maps an unbounded virtual reel index onto the catalogue. */
export function dishAt(virtualIndex: number): ReelDish {
  const n = dishes.length;
  return dishes[((Math.round(virtualIndex) % n) + n) % n]!;
}

export function formatReelPrice(price: number): string {
  return `${price}k`;
}

// ——— Adapter into the Journey game domain ———

const SEAFOOD = /^(tom|muc|cua|ca-|hai-san|mam-tom|mam-ca|ngheu|so-|oc-|ghe|rong-bien)/;
const BEEF = /^(thit-bo|bo-|nuoc-dung-bo)/;
const PORK =
  /^(suon|bi-heo|cha-trung|thit-heo|cha-nuong|gio-heo|cha-lua|moc$|long-heo|xa-xiu|thit-bam|bacon|pepperoni|xuc-xich|pa-te|nem-thit|hoanh-thanh|heo)/;

function budgetOf(price: number): BudgetId {
  if (price < 40) return 'low';
  if (price <= 70) return 'mid';
  return 'high';
}

function groupOf(name: string): DishGroup {
  const n = name.toLowerCase();
  if (
    /^(bánh mì|burger|sandwich|taco|burrito|gỏi cuốn|bánh cuộn|bánh cuốn|kimbap|quesadilla|falafel|phở cuốn|nem)/.test(
      n,
    )
  )
    return 'bread-roll';
  if (/^(bánh xèo|pizza|bánh)/.test(n)) return 'pancake';
  if (
    /^(phở|bún|hủ tiếu|bánh canh|bánh đa|miến|cháo|lẩu|ramen|udon|mì tom|mì vịt|mì bò|mì hoành|mì xá|mì lạnh|canh)/.test(
      n,
    )
  )
    return 'noodle-soup';
  if (/^(mì|nui|pad thai|gnocchi|lasagna|mac)/.test(n)) return 'noodle-dry';
  return 'rice';
}

function recipeFor(crop: CropId, region: ReelRegion): RecipeId {
  const candidates = (Object.keys(RECIPES) as RecipeId[]).filter((id) =>
    RECIPES[id].ingredients.some((i) => i.crop === crop),
  );
  return candidates.find((id) => RECIPES[id].region === region) ?? candidates[0] ?? 'com-tam';
}

function tagsOf(d: ReelDish): string[] {
  const t: string[] = [];
  if (d.flavor.spicy >= 3) t.push('Cay');
  if (d.flavor.rich >= 4) t.push('Đậm béo');
  if (d.flavor.fresh >= 4) t.push('Thanh mát');
  if (d.flavor.crunchy >= 4) t.push('Giòn');
  if (d.flavor.sweet >= 4) t.push('Ngọt dịu');
  if (d.vegetarian) t.push('Món chay');
  return t.length ? t.slice(0, 3) : [REGION_LABEL[d.region]];
}

/**
 * Converts a reel dish into the game's Dish shape so choosing it grants a
 * related seed through the same idempotent reducer as the classic flow.
 */
export function toGameDish(d: ReelDish): Dish {
  const seeded = d.ingredients.find((i) => i.crop);
  const seed: CropId = seeded?.crop ?? 'herbs';
  const seedFrom = seeded?.name ?? 'Rau thơm';
  const crop = CROPS[seed];
  const ids = d.ingredients.map((i) => i.id);
  const contains: AvoidId[] = [];
  if (ids.some((i) => SEAFOOD.test(i))) contains.push('seafood');
  if (ids.some((i) => BEEF.test(i))) contains.push('beef');
  if (ids.some((i) => PORK.test(i))) contains.push('pork');
  if (d.flavor.spicy >= 3) contains.push('spicy');
  return {
    id: d.id,
    name: d.name,
    image: d.image.replace(/^\//, ''),
    imageAlt: `${d.name} — ${d.subtitle}`,
    region: d.region,
    priceMin: d.price,
    priceMax: d.price + Math.max(5, Math.round((d.price * 0.2) / 5) * 5),
    budget: budgetOf(d.price),
    group: groupOf(d.name),
    moods: [],
    vegetarian: d.vegetarian,
    contains,
    tags: tagsOf(d),
    reason: d.story,
    seed,
    seedNote: `${seedFrom} trong ${d.name} gắn với cây ${crop.name.toLowerCase()} — bạn nhận ${crop.seedName.toLowerCase()}.`,
    recipe: recipeFor(seed, d.region),
  };
}

export const reelGameDishes = (): readonly Dish[] => gameDishes;
export const getReelGameDish = (id: string): Dish | undefined => gameById.get(id);

// Start from the bundled snapshot; loadLiveCatalogue() may replace it at boot.
applyCatalogue(snapshot as CataloguePayload);
