import { describe, expect, it } from 'vitest';
import { CURATED_STORIES, getDishNarrative } from './dishStories';
import { getReelDish, reelDishes } from './reelCatalogue';

describe('dish narratives', () => {
  it('provides five-chapter data without claiming history for every catalogue dish', () => {
    for (const dish of reelDishes()) {
      const story = getDishNarrative(dish);
      expect(story.version).toBe(1);
      expect(story.origin.length).toBeGreaterThan(0);
      expect(story.culture.length).toBeGreaterThan(0);
      expect(story.tasting.length).toBeGreaterThan(0);
      expect(story.sources[0]?.status).toBe('catalogue');
      if (!CURATED_STORIES[dish.id]) {
        expect(story.coverage).toBe('catalogue');
        expect(story.origin[0]).toContain('Chưa có tư liệu');
        expect(story.origin[0]).toContain(dish.nameVi || dish.name);
      }
    }
  });
  it('uses exact existing IDs with distinct substantive editorial content', () => {
    const origins = new Set<string>();
    for (const id of Object.keys(CURATED_STORIES)) {
      const dish = getReelDish(id);
      expect(dish, id).toBeDefined();
      const story = getDishNarrative(dish!);
      expect(story.coverage).toBe('curated');
      expect(story.origin.join(' ').length).toBeGreaterThan(200);
      expect(story.culture.join(' ').length).toBeGreaterThan(200);
      expect(story.tasting.join(' ').length).toBeGreaterThan(150);
      origins.add(story.origin.join(' '));
      for (const source of story.sources.filter((s) => s.url)) {
        expect(new URL(source.url!).protocol).toBe('https:');
        expect(source.status).toBe('not-checked');
      }
    }
    expect(origins.size).toBe(Object.keys(CURATED_STORIES).length);
  });
  it('does not infer history from region, names or duplicate suffixes', () => {
    const base = getReelDish('pho-bo')!;
    const dish = {
      ...base,
      id: 'pho-bo-new',
      name: 'Món mới',
      nameVi: 'Món mới',
      story: '',
      ingredients: [],
    };
    const story = getDishNarrative(dish);
    expect(story.coverage).toBe('catalogue');
    expect(story.origin.join(' ')).not.toContain('Nam Định');
    expect(story.sources).toHaveLength(1);
    expect(story.origin.join(' ')).not.toContain('undefined');
    expect(getDishNarrative(getReelDish('bun-bo-hue-2')!).coverage).toBe('catalogue');
  });
});
