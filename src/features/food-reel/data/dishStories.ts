import type { ReelDish } from '../foodReel.types';
import { STORIES_EAST_ASIA } from './stories/east-asia';
import { STORIES_MORE_ASIA } from './stories/more-asia';
import { STORIES_MORE_CENTRAL } from './stories/more-central';
import { STORIES_MORE_NORTH } from './stories/more-north';
import { STORIES_MORE_SOUTH } from './stories/more-south';
import { STORIES_MORE_WEST } from './stories/more-west';
import { STORIES_NORTH_CENTRAL } from './stories/north-central';
import { STORIES_SOUTH } from './stories/south';
import type { DishStory, StoryMilestone, StorySymbol } from './stories/types';
import { STORIES_WORLD } from './stories/world';

export type { DishStory, StoryMilestone, StorySymbol };

export interface StorySource {
  label: string;
  url?: string;
  status: 'catalogue' | 'reference';
}

export interface DishNarrative {
  version: 2;
  language: 'vi';
  coverage: 'curated' | 'catalogue';
  homeland?: string;
  era?: string;
  tagline?: string;
  origin: string[];
  timeline: StoryMilestone[];
  meaning: string[];
  symbols: StorySymbol[];
  tasting: string[];
  facts: string[];
  saying?: DishStory['saying'];
  sources: StorySource[];
}

/** Editorial stories keyed by exact catalogue ID. */
export const CURATED_STORIES: Readonly<Record<string, DishStory>> = {
  ...STORIES_NORTH_CENTRAL,
  ...STORIES_SOUTH,
  ...STORIES_EAST_ASIA,
  ...STORIES_WORLD,
  ...STORIES_MORE_NORTH,
  ...STORIES_MORE_CENTRAL,
  ...STORIES_MORE_SOUTH,
  ...STORIES_MORE_ASIA,
  ...STORIES_MORE_WEST,
};

/**
 * Catalogue duplicates of the same dish (a second photo / listing). Declared
 * explicitly: a similar name alone never inherits another dish's history.
 */
export const STORY_ALIASES: Readonly<Record<string, string>> = {
  'banh-mi-thit-nuong-2': 'banh-mi-thit-nuong',
  'bun-bo-hue-2': 'bun-bo-hue',
  'bun-mam-2': 'bun-mam',
  'com-chay-thap-cam-2': 'com-chay-thap-cam',
  'hu-tieu-nam-vang-2': 'hu-tieu-nam-vang',
  'lau-nam-chay-2': 'lau-nam-chay',
  'mi-y-sot-bo-bam-2': 'mi-y-sot-bo-bam',
  'pizza-hai-san-2': 'pizza-hai-san',
};

export function findDishStory(id: string): DishStory | undefined {
  return CURATED_STORIES[id] ?? CURATED_STORIES[STORY_ALIASES[id] ?? ''];
}

export function getDishNarrative(dish: ReelDish): DishNarrative {
  const story = findDishStory(dish.id);
  const name = dish.nameVi || dish.name;
  const catalogue: StorySource = {
    label: `Mô tả và thành phần của ${name} trong thực đơn ứng dụng`,
    status: 'catalogue',
  };
  if (story) {
    return {
      version: 2,
      language: 'vi',
      coverage: 'curated',
      homeland: story.homeland,
      era: story.era,
      tagline: story.tagline,
      origin: story.origin,
      timeline: story.timeline,
      meaning: story.meaning,
      symbols: story.symbols,
      tasting: story.tasting,
      facts: story.facts,
      saying: story.saying,
      sources: story.reference
        ? [{ ...story.reference, status: 'reference' }, catalogue]
        : [catalogue],
    };
  }
  // A dish added in admin before its story is written: describe only what the
  // catalogue knows, never a borrowed history.
  const ingredients = dish.ingredients.map((i) => i.nameVi || i.name).join(', ');
  return {
    version: 2,
    language: 'vi',
    coverage: 'catalogue',
    origin: [
      dish.story || `${name} là món mới trong thực đơn.`,
      `Câu chuyện nguồn gốc của ${name} đang được biên soạn và sẽ sớm có mặt tại đây.`,
    ],
    timeline: [],
    meaning: ingredients ? [`${name} được làm từ ${ingredients}.`] : [],
    symbols: [],
    tasting: [
      `Hãy nếm ${name} trước khi thêm gia vị để cảm nhận vị nguyên bản, rồi điều chỉnh theo khẩu vị của bạn.`,
    ],
    facts: [],
    sources: [catalogue],
  };
}
