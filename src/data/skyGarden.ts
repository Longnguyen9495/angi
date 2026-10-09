import potManifest from './skyGardenPots.json';

/*
 * Vườn Mây (plans/vuon-may.md §0, §0.14): the pots and the sets they belong to, static data only.
 * G1 is a motion demo; prices, odds, recipes and the save model (§0.4–§0.9) come with G2.
 *
 * Pot images: assets/sky-garden/pots/<id>.png → scripts/sky-garden/prepare-pots.mjs →
 * public/images/sky-garden/pots/<id>@1x.webp (and @2x when the source is big enough), with the
 * soil opening of each pot in skyGardenPots.json. Names live in t.sky.pots / t.sky.sets.
 */

export type PotTier = 0 | 1 | 2 | 3 | 4;
/** Đất nung, Sứ, Ngọc, Hoàng kim, Huyền thoại (§4.2). */
export const POT_TIERS = ['clay', 'porcelain', 'jade', 'gold', 'legend'] as const;
export type PotTierId = (typeof POT_TIERS)[number];

/** The 17 sets (prompts/sky-garden-playground-100.md), in collection order. */
export const POT_SET_IDS = [
  'clay',
  'produce',
  'table',
  'market',
  'sea',
  'festival',
  'orchard',
  'drinks',
  'street',
  'noodle',
  'rice',
  'sweets',
  'kitchen',
  'dalat',
  'village',
  'toys',
  'palace',
  'spare',
] as const;
export type PotSetId = (typeof POT_SET_IDS)[number];

/** Every pot planned, drawn or not; only drawn ones (in the manifest) exist in the game. */
export const ALL_POT_IDS = [
  'clay_jar',
  'clay_basin',
  'clay_lotus_rim',
  'clay_ring',
  'clay_handles',
  'clay_square',
  'pumpkin',
  'corn',
  'cabbage',
  'eggplant',
  'watermelon',
  'red_apple',
  'pho_bowl',
  'teapot',
  'banh_chung',
  'banh_xeo',
  'spring_rolls',
  'canh_chua',
  'bamboo_basket',
  'bamboo',
  'non_la',
  'shoulder_pole',
  'rice_basket',
  'sauce_jar',
  'coconut',
  'crab',
  'porcelain_fish',
  'seashell',
  'cuttlefish',
  'basket_boat',
  'mooncake',
  'golden_dragon',
  'peach_blossom',
  'lotus',
  'lantern',
  'li_xi',
  'dragon_fruit',
  'mango',
  'durian',
  'rambutan',
  'mangosteen',
  'pomelo',
  'phin',
  'egg_coffee',
  'sugarcane',
  'iced_tea',
  'soy_milk',
  'avocado_smoothie',
  'banh_mi',
  'banh_trang',
  'xoi_la',
  'banh_bao',
  'goi_cuon',
  'sweet_potato',
  'bun_bo_hue',
  'bun_cha',
  'mi_quang',
  'hu_tieu',
  'cao_lau',
  'banh_canh',
  'com_tam',
  'xoi_gac',
  'com_lam',
  'com_nieu',
  'banh_cuon',
  'com_hen',
  'che_ba_mau',
  'banh_flan',
  'banh_bo',
  'banh_da_lon',
  'che_troi_nuoc',
  'kem_dua',
  'rice_cooker',
  'clay_stove',
  'mortar',
  'copper_tray',
  'rice_sieve',
  'fish_sauce',
  'hydrangea',
  'wild_sunflower',
  'mimosa',
  'lavender',
  'strawberry',
  'pine_cone',
  'village_gate',
  'thatched_house',
  'water_wheel',
  'straw_stack',
  'village_well',
  'banyan',
  'star_lantern',
  'rattle_drum',
  'pinwheel',
  'kite',
  'spinning_top',
  'marbles',
  'cloud_palace',
  'rainbow',
  'crescent_moon',
  'shooting_star',
  'paper_crane',
  'sky_gem',
  'redfruit',
] as const;
export type PotId = (typeof ALL_POT_IDS)[number];

export interface PotSetDef {
  id: PotSetId;
  /** Tier every pot of the set starts at (Q3: the produce set is jade). */
  baseTier: PotTier;
  /** Its six pots as planned, drawn or not. */
  planned: PotId[];
  /** Pots drawn so far (art processed into the manifest), in display order. */
  pots: PotId[];
  /**
   * Six different pots drawn (Q7): only a complete set may give the "Đủ bộ" floor effect or the
   * set reward. Incomplete sets stay incomplete; no stand-in art is shipped to fill them.
   */
  complete: boolean;
}

/** Pots per set, matching the six slots of a floor. */
export const SET_SIZE = 6;
/** Slots on every floor (D2), whatever the screen layout. */
export const SLOTS_PER_FLOOR = 6;

interface ManifestPot {
  id: string;
  has2x: boolean;
  anchor: SoilAnchor | null;
}

const manifest = new Map((potManifest.pots as ManifestPot[]).map((p) => [p.id, p] as const));

/** Pots listed in the manifest with a soil anchor: drawn, processed, plantable. */
export function manifestHas(id: PotId): boolean {
  return !!manifest.get(id)?.anchor;
}

/**
 * A set as planned; its pots are the drawn ones. A pot appears (shop, rewards, collection) the
 * day its picture is processed (npm run sky:pots), never before: no stand-in art fills a set.
 */
function set(id: PotSetId, baseTier: PotTier, planned: PotId[]): PotSetDef {
  const pots = planned.filter(manifestHas);
  return {
    id,
    baseTier,
    planned,
    pots,
    complete: id !== 'spare' && planned.length === SET_SIZE && pots.length === SET_SIZE,
  };
}

export const POT_SETS: PotSetDef[] = [
  set('clay', 0, [
    'clay_jar',
    'clay_basin',
    'clay_lotus_rim',
    'clay_ring',
    'clay_handles',
    'clay_square',
  ]),
  set('produce', 2, ['pumpkin', 'corn', 'cabbage', 'eggplant', 'watermelon', 'red_apple']),
  set('table', 3, ['pho_bowl', 'teapot', 'banh_chung', 'banh_xeo', 'spring_rolls', 'canh_chua']),
  set('market', 1, [
    'bamboo_basket',
    'bamboo',
    'non_la',
    'shoulder_pole',
    'rice_basket',
    'sauce_jar',
  ]),
  set('sea', 2, ['coconut', 'crab', 'porcelain_fish', 'seashell', 'cuttlefish', 'basket_boat']),
  set('festival', 4, ['mooncake', 'golden_dragon', 'peach_blossom', 'lotus', 'lantern', 'li_xi']),
  set('orchard', 2, ['dragon_fruit', 'mango', 'durian', 'rambutan', 'mangosteen', 'pomelo']),
  set('drinks', 1, ['phin', 'egg_coffee', 'sugarcane', 'iced_tea', 'soy_milk', 'avocado_smoothie']),
  set('street', 1, ['banh_mi', 'banh_trang', 'xoi_la', 'banh_bao', 'goi_cuon', 'sweet_potato']),
  set('noodle', 3, ['bun_bo_hue', 'bun_cha', 'mi_quang', 'hu_tieu', 'cao_lau', 'banh_canh']),
  set('rice', 2, ['com_tam', 'xoi_gac', 'com_lam', 'com_nieu', 'banh_cuon', 'com_hen']),
  set('sweets', 3, [
    'che_ba_mau',
    'banh_flan',
    'banh_bo',
    'banh_da_lon',
    'che_troi_nuoc',
    'kem_dua',
  ]),
  set('kitchen', 1, [
    'rice_cooker',
    'clay_stove',
    'mortar',
    'copper_tray',
    'rice_sieve',
    'fish_sauce',
  ]),
  set('dalat', 2, ['hydrangea', 'wild_sunflower', 'mimosa', 'lavender', 'strawberry', 'pine_cone']),
  set('village', 1, [
    'village_gate',
    'thatched_house',
    'water_wheel',
    'straw_stack',
    'village_well',
    'banyan',
  ]),
  set('toys', 3, ['star_lantern', 'rattle_drum', 'pinwheel', 'kite', 'spinning_top', 'marbles']),
  set('palace', 4, [
    'cloud_palace',
    'rainbow',
    'crescent_moon',
    'shooting_star',
    'paper_crane',
    'sky_gem',
  ]),
  set('spare', 2, ['redfruit']),
];

/** Pots in the game (drawn). */
export const POT_IDS: PotId[] = POT_SETS.flatMap((s) => s.pots);
const drawn = new Set<PotId>(POT_IDS);
/** A pot is in the game: drawn and processed. */
export function potDrawn(id: PotId): boolean {
  return drawn.has(id);
}

/** Soil opening of a pot image: ellipse centre and radii, in 0..1 of the square picture. */
export interface SoilAnchor {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface PotDef {
  id: PotId;
  set: PotSetId;
  tier: PotTier;
  /** 256 px picture; `src2x` (512 px) only when the source art was big enough. */
  src: string;
  src2x: string | null;
  silhouette: string;
  anchor: SoilAnchor;
}

const POT_BASE = '/images/sky-garden/pots/';

/** Where a pot without a detected opening would plant (never used by the 20 current pots). */
const FALLBACK_ANCHOR: SoilAnchor = { cx: 0.5, cy: 0.33, rx: 0.18, ry: 0.05 };

export const POTS = Object.fromEntries(
  POT_SETS.flatMap((s) =>
    s.pots.map((id): [PotId, PotDef] => {
      const m = manifest.get(id);
      return [
        id,
        {
          id,
          set: s.id,
          tier: s.baseTier,
          src: `${POT_BASE}${id}@1x.webp`,
          src2x: m?.has2x ? `${POT_BASE}${id}@2x.webp` : null,
          silhouette: `${POT_BASE}${id}-silhouette.webp`,
          anchor: m?.anchor ?? FALLBACK_ANCHOR,
        },
      ];
    }),
  ),
) as Record<PotId, PotDef>;

/**
 * How a plant sits in a pot (the scene and scripts/sky-garden/contact-sheet.mjs use the same
 * numbers): its width is `width` × the soil opening's width, and its bottom edge sits `sink`
 * soil half-heights below the opening's centre, so the roots are in the soil.
 */
export const PLANT_FIT = { width: 1.0, sink: 0.6 } as const;
