import {
  CROPS,
  PRODUCE_IDS,
  RECIPES,
  RECIPE_LIST,
  registerRecipes,
  resolveBuiltinDishes,
} from '../../../data/game';
import { locale, localized, t } from '../../../i18n';
import type {
  AvoidId,
  BudgetId,
  CropId,
  Dish,
  DishGroup,
  Heat,
  ProduceId,
  RecipeDef,
  RecipeId,
} from '../../../data/types';
import type {
  CatalogueCook,
  CatalogueItem,
  CataloguePayload,
  Ingredient,
  ReelDish,
  ReelRegion,
  ReelTone,
} from '../foodReel.types';
import snapshot from './catalogue.snapshot.json';
import { normalizeYoutubeVideos } from './youtubeVideos';

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

export const REGION_LABEL: Record<ReelRegion, string> = { ...t.data.reel.regionLabel };

const REGIONS = new Set<string>(Object.keys(REGION_LABEL));
const TONES = new Set<string>(Object.keys(TONE_PALETTE));
const CROP_IDS = new Set<string>(Object.keys(CROPS));
const PRODUCE = new Set<string>(PRODUCE_IDS);
const HEATS = new Set<string>(['low', 'mid', 'high']);
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
  const text = localized(
    { name: item.name, subtitle: item.subtitle, story: item.story },
    item.translations,
  );
  const ingredients: Ingredient[] = item.ingredients.map((ing, i) => {
    const own = localized({ name: ing.name, description: ing.description }, ing.translations);
    return {
      id: ing.id,
      name: own.name,
      nameVi: ing.name,
      description: own.description,
      anchor: anchorFor(i),
      crop: ing.crop && CROP_IDS.has(ing.crop) ? (ing.crop as CropId) : undefined,
    };
  });
  return {
    id: item.id,
    index,
    sourceImageId: item.sourceImageId ?? index,
    slug: item.id,
    name: text.name,
    nameVi: item.name,
    subtitle: text.subtitle,
    price: item.price,
    vegetarian: item.vegetarian,
    region,
    image: item.image,
    thumbnail: item.thumbnail,
    // The server only stores our own uploads or allowed https hosts; anything else is dropped here too.
    video:
      item.video &&
      isMediaUrl(item.video.src) &&
      (item.video.poster === '' || isMediaUrl(item.video.poster))
        ? {
            src: item.video.src,
            poster: item.video.poster,
            credit: item.video.credit ?? undefined,
          }
        : undefined,
    youtubeVideos: normalizeYoutubeVideos(item.youtubeVideos),
    ingredients,
    flavor: item.flavor,
    story: text.story,
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
  // Recipes first: a dish's seed and recipe link point at its own recipe when it has one.
  resolveBuiltinDishes((id) => byId.has(id));
  registerRecipes(
    items.flatMap((item) => {
      const dish = byId.get(item.id);
      const r = dish && item.cook ? recipeFromCook(dish, item.cook) : null;
      return r ? [r] : [];
    }),
  );
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

/** /mon/com-tam is the short link for whichever cơm tấm the catalogue has (ids are editable). */
export function getReelDishBySlug(slug: string): ReelDish | undefined {
  return (
    byId.get(slug) ??
    (slug === 'com-tam' ? dishes.find((d) => d.id.startsWith('com-tam-')) : undefined)
  );
}

/** Maps an unbounded virtual reel index onto the catalogue. */
export function dishAt(virtualIndex: number): ReelDish {
  const n = dishes.length;
  return dishes[((Math.round(virtualIndex) % n) + n) % n]!;
}

/**
 * What the reel is currently spinning over: the whole catalogue, or a guest's
 * shortlist ("Rổ quay"). Virtual indices wrap over `count`, so a shortlist of
 * three repeats like a slot machine: A B C A B C…
 */
export interface ReelView {
  readonly count: number;
  /** True when the view is a shortlist rather than the whole catalogue. */
  readonly pooled: boolean;
  dishAt(virtualIndex: number): ReelDish;
}

/** The whole catalogue. Reads live, so a catalogue swapped in at boot is picked up. */
export const CATALOGUE_VIEW: ReelView = {
  get count() {
    return dishes.length;
  },
  pooled: false,
  dishAt,
};

/** Smallest shortlist worth spinning over. */
export const POOL_MIN = 2;

/** Dishes of `ids` that still exist, in the given order, without duplicates. */
export function poolDishes(ids: readonly string[]): ReelDish[] {
  const seen = new Set<string>();
  const out: ReelDish[] = [];
  for (const id of ids) {
    const d = byId.get(id);
    if (d && !seen.has(id)) {
      seen.add(id);
      out.push(d);
    }
  }
  return out;
}

/** A shortlist view, or the whole catalogue when fewer than POOL_MIN dishes remain. */
export function createReelView(ids: readonly string[] | null): ReelView {
  const list = ids ? poolDishes(ids) : [];
  if (list.length < POOL_MIN) return CATALOGUE_VIEW;
  const n = list.length;
  return {
    count: n,
    pooled: true,
    dishAt: (vi) => list[((Math.round(vi) % n) + n) % n]!,
  };
}

export function formatReelPrice(price: number): string {
  return t.data.reel.price(price);
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

/** About 7–8 XP per item, like the hand-written recipes (4 items 30, 8 items 60). */
function recipeXp(pieces: number): number {
  return Math.min(75, Math.max(15, Math.round((pieces * 7.5) / 5) * 5));
}

/** A same-origin path or an https URL — never javascript:, data:, http: or a protocol-relative URL. */
function isMediaUrl(url: unknown): url is string {
  return (
    typeof url === 'string' &&
    url.length < 500 &&
    ((url.startsWith('/') && !url.startsWith('//')) || url.startsWith('https://'))
  );
}

/**
 * A game recipe from a catalogue dish's `cook` (written by AI or the admin): its own steps
 * in the visitor's language, and only pantry items the game knows. Unusable → null.
 */
export function recipeFromCook(d: ReelDish, cook: CatalogueCook): RecipeDef | null {
  const seen = new Set<string>();
  const ingredients = (Array.isArray(cook.produce) ? cook.produce : []).flatMap((p) => {
    if (!PRODUCE.has(p.id) || seen.has(p.id)) return [];
    seen.add(p.id);
    return [{ crop: p.id as ProduceId, qty: Math.min(3, Math.max(1, Math.round(p.qty) || 1)) }];
  });
  const steps = (Array.isArray(cook.steps) ? cook.steps : []).flatMap((s) => {
    const label = (s.translations?.[locale] ?? '').trim() || s.label.trim();
    if (!label) return [];
    const heat = (HEATS.has(s.heat) ? s.heat : 'mid') as Heat;
    return [{ label, heat, weight: Math.min(5, Math.max(1, Math.round(s.weight) || 2)) }];
  });
  if (ingredients.length === 0 || steps.length < 3) return null;
  return {
    id: d.id,
    name: d.name,
    dishId: d.id,
    region: d.region,
    group: groupOf(d.nameVi ?? d.name),
    ingredients,
    xp: recipeXp(ingredients.reduce((n, i) => n + i.qty, 0)),
    unlockNote:
      d.region === 'world'
        ? t.data.reel.recipeNoteWorld
        : t.data.reel.recipeNote(REGION_LABEL[d.region]),
    fact: d.story,
    steps,
  };
}

/** The dish's own recipe when it has one; otherwise a recipe that uses its seed crop. */
function recipeFor(dishId: string, crop: CropId, region: ReelRegion): RecipeId {
  const own = RECIPE_LIST.find((r) => r.dishId === dishId);
  if (own) return own.id;
  const candidates = (Object.keys(RECIPES) as RecipeId[]).filter((id) =>
    RECIPES[id]?.ingredients.some((i) => i.crop === crop),
  );
  return candidates.find((id) => RECIPES[id]?.region === region) ?? candidates[0] ?? 'com-tam';
}

function tagsOf(d: ReelDish): string[] {
  const tag = t.data.reel.tags;
  const out: string[] = [];
  if (d.flavor.spicy >= 3) out.push(tag.spicy);
  if (d.flavor.rich >= 4) out.push(tag.rich);
  if (d.flavor.fresh >= 4) out.push(tag.fresh);
  if (d.flavor.crunchy >= 4) out.push(tag.crunchy);
  if (d.flavor.sweet >= 4) out.push(tag.sweet);
  if (d.vegetarian) out.push(tag.vegetarian);
  return out.length ? out.slice(0, 3) : [REGION_LABEL[d.region]];
}

/**
 * Converts a reel dish into the game's Dish shape so choosing it grants a
 * related seed through the same idempotent reducer as the classic flow.
 */
export function toGameDish(d: ReelDish): Dish {
  // A dish with its own recipe gives a seed that recipe needs (a starting crop when it can).
  const own = RECIPE_LIST.find((r) => r.dishId === d.id);
  const ownCrops = (own?.ingredients ?? [])
    .map((i) => i.crop)
    .filter((c): c is CropId => CROP_IDS.has(c));
  const ownSeed = ownCrops.find((c) => !CROPS[c].unlock) ?? ownCrops[0];
  const seeded = ownSeed
    ? d.ingredients.find((i) => i.crop === ownSeed)
    : d.ingredients.find((i) => i.crop);
  const seed: CropId = ownSeed ?? seeded?.crop ?? 'herbs';
  const seedFrom =
    seeded?.name ?? (ownSeed ? CROPS[ownSeed].produceName : t.data.reel.seedFallback);
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
    imageAlt: t.data.reel.imageAlt(d.name, d.subtitle),
    region: d.region,
    priceMin: d.price,
    priceMax: d.price + Math.max(5, Math.round((d.price * 0.2) / 5) * 5),
    budget: budgetOf(d.price),
    // Grouping rules match Vietnamese dish names.
    group: groupOf(d.nameVi ?? d.name),
    moods: [],
    vegetarian: d.vegetarian,
    contains,
    tags: tagsOf(d),
    reason: d.story,
    seed,
    seedNote: t.data.reel.seedNote(seedFrom, d.name, crop.name, crop.seedName),
    recipe: recipeFor(d.id, seed, d.region),
  };
}

export const reelGameDishes = (): readonly Dish[] => gameDishes;
export const getReelGameDish = (id: string): Dish | undefined => gameById.get(id);

// Start from the bundled snapshot; loadLiveCatalogue() may replace it at boot.
applyCatalogue(snapshot as CataloguePayload);

const snapshotThumbs = new Map(
  (snapshot as CataloguePayload).items.map((item) => [item.id, item.thumbnail]),
);

/** The bundled thumbnail for a dish — a fallback when a live image URL fails. */
export function snapshotThumbnail(id: string): string | undefined {
  return snapshotThumbs.get(id);
}
