import type { CropId } from '../../data/types';

export type ReelRegion = 'north' | 'central' | 'south' | 'world';
export type ReelTone = 'amber' | 'copper' | 'herb' | 'crimson' | 'ivory' | 'ocean' | 'gold';

/** One dish as served by GET /api/dishes (and the bundled snapshot). */
export interface YoutubeVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  thumbnail: string;
}

/** Per-language overrides keyed by locale code (e.g. 'en'); blank fields fall back to Vietnamese. */
export type DishTranslations = Record<string, { name?: string; subtitle?: string; story?: string }>;
export type IngredientTranslations = Record<string, { name?: string; description?: string }>;

export interface CatalogueIngredient {
  id: string;
  name: string;
  description: string;
  crop: string | null;
  translations?: IngredientTranslations;
}

export interface CatalogueItem {
  id: string;
  position: number;
  sourceImageId: number | null;
  name: string;
  subtitle: string;
  price: number;
  vegetarian: boolean;
  region: string;
  tone: string;
  story: string;
  flavor: Flavor;
  image: string;
  thumbnail: string;
  credit: string;
  video: { src: string; poster: string; credit: string | null } | null;
  youtubeVideos?: YoutubeVideo[];
  ingredients: CatalogueIngredient[];
  translations?: DishTranslations;
}

export interface CataloguePayload {
  version: string;
  count: number;
  items: CatalogueItem[];
}

export interface Ingredient {
  id: string;
  /** Name in the active language. */
  name: string;
  /** The original Vietnamese name. */
  nameVi?: string;
  description?: string;
  image?: string;
  /** Approximate spot on the dish photo (0–1), used to draw the hint line. */
  anchor?: { x: number; y: number };
  crop?: CropId;
}

export interface ReelVideo {
  src: string;
  /** Optional WebM source, listed first when present. */
  webm?: string;
  poster: string;
  duration?: number;
  credit?: string;
}

export interface Flavor {
  spicy: number;
  sweet: number;
  rich: number;
  fresh: number;
  crunchy: number;
}

export interface ReelDish {
  id: string;
  index: number;
  sourceImageId: number;
  slug: string;
  /** Name in the active language (falls back to Vietnamese). */
  name: string;
  /** The original Vietnamese name — for search and Vietnamese-only rules. */
  nameVi?: string;
  subtitle: string;
  price: number;
  vegetarian: boolean;
  region: ReelRegion;
  image: string;
  thumbnail: string;
  video?: ReelVideo;
  youtubeVideos?: YoutubeVideo[];
  ingredients: Ingredient[];
  flavor: Flavor;
  story: string;
  tone: ReelTone;
  palette: [string, string, string];
  credit: string;
}

export type ReelPhase =
  | 'booting'
  | 'idle'
  | 'dragging'
  | 'spinning'
  | 'settling'
  | 'selected'
  | 'opening-detail'
  | 'detail'
  | 'closing-detail'
  | 'confirming'
  | 'chosen';

/** Pre-computed spin: the winner is decided before any frame is drawn. */
export interface SpinPlan {
  seed: number;
  from: number;
  target: number;
  winnerIndex: number;
  durationMs: number;
}

export type ReelEvent =
  | { type: 'ASSETS_READY' }
  | { type: 'DRAG_START' }
  | { type: 'DRAG_MOVE'; delta: number }
  | { type: 'DRAG_END'; velocity: number; index: number }
  | { type: 'NAVIGATE'; index: number }
  | { type: 'SPIN'; seed: number }
  | { type: 'DECELERATE' }
  | { type: 'SETTLE'; dishId: string }
  | { type: 'UNLOCK' }
  | { type: 'OPEN_DETAIL'; dishId?: string }
  | { type: 'DETAIL_OPENED' }
  | { type: 'CLOSE_DETAIL'; then?: 'spin' }
  | { type: 'DETAIL_CLOSED' }
  | { type: 'CONFIRM_DISH' }
  | { type: 'CONFIRMED' }
  | { type: 'CONFIRM_FAILED' }
  | { type: 'RESET' };

export interface ReelState {
  phase: ReelPhase;
  /** Virtual (unbounded) index of the item at the camera centre. */
  index: number;
  spin: SpinPlan | null;
  spinCount: number;
  winnerId: string | null;
  /** Selected overlay accepts clicks only after the settle choreography. */
  ready: boolean;
  detailId: string | null;
  /** Phase to return to when the detail closes. */
  returnPhase: 'idle' | 'selected';
  pendingSpin: boolean;
  chosenId: string | null;
}
