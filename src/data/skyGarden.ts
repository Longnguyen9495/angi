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

export type PotSetId = 'clay' | 'produce' | 'table' | 'market' | 'sea' | 'festival' | 'spare';

export type PotId =
  | 'pumpkin'
  | 'corn'
  | 'cabbage'
  | 'eggplant'
  | 'watermelon'
  | 'red_apple'
  | 'pho_bowl'
  | 'teapot'
  | 'banh_chung'
  | 'bamboo_basket'
  | 'bamboo'
  | 'coconut'
  | 'crab'
  | 'porcelain_fish'
  | 'seashell'
  | 'mooncake'
  | 'golden_dragon'
  | 'peach_blossom'
  | 'lotus'
  | 'redfruit';

export interface PotSetDef {
  id: PotSetId;
  /** Tier every pot of the set starts at (Q3: the produce set is jade). */
  baseTier: PotTier;
  /** Pots drawn so far, in display order. */
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

function set(id: PotSetId, baseTier: PotTier, pots: PotId[]): PotSetDef {
  return { id, baseTier, pots, complete: id !== 'spare' && pots.length === SET_SIZE };
}

/** The sets of §0.14, in collection order. The clay starter set is still to be drawn. */
export const POT_SETS: PotSetDef[] = [
  set('clay', 0, []),
  set('produce', 2, ['pumpkin', 'corn', 'cabbage', 'eggplant', 'watermelon', 'red_apple']),
  set('table', 3, ['pho_bowl', 'teapot', 'banh_chung']),
  set('market', 1, ['bamboo_basket', 'bamboo']),
  set('sea', 2, ['coconut', 'crab', 'porcelain_fish', 'seashell']),
  set('festival', 4, ['mooncake', 'golden_dragon', 'peach_blossom', 'lotus']),
  set('spare', 2, ['redfruit']),
];

export const POT_IDS: PotId[] = POT_SETS.flatMap((s) => s.pots);

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

interface ManifestPot {
  id: string;
  has2x: boolean;
  anchor: SoilAnchor | null;
}

const manifest = new Map((potManifest.pots as ManifestPot[]).map((p) => [p.id, p] as const));

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

/** Pots listed in the manifest (for tests: every pot must have art and an anchor). */
export function manifestHas(id: PotId): boolean {
  return !!manifest.get(id)?.anchor;
}

/**
 * How a plant sits in a pot (the scene and scripts/sky-garden/contact-sheet.mjs use the same
 * numbers): its width is `width` × the soil opening's width, and its bottom edge sits `sink`
 * soil half-heights below the opening's centre, so the roots are in the soil.
 */
export const PLANT_FIT = { width: 1.0, sink: 0.6 } as const;
