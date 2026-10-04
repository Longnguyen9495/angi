import { describe, expect, it } from 'vitest';
import { CURATED_STORIES, STORY_ALIASES, findDishStory, getDishNarrative } from './dishStories';
import { getReelDish, reelDishes } from './reelCatalogue';

const words = (paragraphs: string[]) => paragraphs.join(' ').split(/\s+/).length;

describe('dish stories', () => {
  it('gives every catalogue dish a full story', () => {
    const missing = reelDishes()
      .filter((dish) => !findDishStory(dish.id))
      .map((dish) => dish.id);
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(CURATED_STORIES))('%s is detailed and well-formed', (id, story) => {
    expect(getReelDish(id), `${id} is not in the catalogue`).toBeDefined();
    expect(story.homeland.trim()).not.toBe('');
    expect(story.era.trim()).not.toBe('');
    expect(story.tagline.length).toBeGreaterThan(20);
    expect(story.tagline.length).toBeLessThanOrEqual(200);
    expect(story.origin.length).toBeGreaterThanOrEqual(3);
    expect(words(story.origin)).toBeGreaterThan(150);
    expect(story.timeline.length).toBeGreaterThanOrEqual(3);
    for (const step of story.timeline) {
      expect(step.when.trim()).not.toBe('');
      expect(step.what.trim()).not.toBe('');
    }
    expect(story.meaning.length).toBeGreaterThanOrEqual(2);
    expect(words(story.meaning)).toBeGreaterThan(100);
    expect(story.symbols.length).toBeGreaterThanOrEqual(3);
    expect(story.tasting.length).toBeGreaterThanOrEqual(2);
    expect(story.facts.length).toBeGreaterThanOrEqual(3);
    if (story.reference) expect(new URL(story.reference.url).protocol).toBe('https:');
    expect(JSON.stringify(story)).not.toMatch(/undefined|TODO|lorem/i);
  });

  it('never repeats a paragraph between dishes', () => {
    const seen = new Map<string, string>();
    for (const [id, story] of Object.entries(CURATED_STORIES)) {
      for (const p of [...story.origin, ...story.meaning, ...story.tasting]) {
        expect(seen.get(p), `${id} repeats a paragraph`).toBeUndefined();
        seen.set(p, id);
      }
    }
  });

  it('maps catalogue duplicates only through explicit aliases', () => {
    for (const [alias, target] of Object.entries(STORY_ALIASES)) {
      expect(getReelDish(alias), alias).toBeDefined();
      expect(CURATED_STORIES[target], target).toBeDefined();
      expect(findDishStory(alias)).toBe(CURATED_STORIES[target]);
    }
  });

  it('does not borrow a history for a dish without a story', () => {
    const base = getReelDish('pho-bo')!;
    const story = getDishNarrative({
      ...base,
      id: 'pho-bo-new',
      name: 'Món mới',
      nameVi: 'Món mới',
    });
    expect(story.coverage).toBe('catalogue');
    expect(story.timeline).toEqual([]);
    expect(story.facts).toEqual([]);
    expect(JSON.stringify(story)).not.toContain(CURATED_STORIES['pho-bo']!.origin[0]);
    expect(story.origin.join(' ')).toContain('Món mới');
  });
});
