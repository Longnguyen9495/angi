import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CataloguePayload } from '../foodReel.types';
import {
  applyCatalogue,
  catalogueVersion,
  getReelDish,
  loadLiveCatalogue,
  reelCount,
} from './reelCatalogue';
import snapshot from './catalogue.snapshot.json';
import { normalizeYoutubeVideos } from './youtubeVideos';

const original = snapshot as CataloguePayload;

afterEach(() => {
  applyCatalogue(original);
  vi.unstubAllGlobals();
});

describe('YouTube catalogue compatibility', () => {
  const valid = {
    videoId: 'abcdefghijk',
    title: 'Phở',
    channelId: `UC${'a'.repeat(22)}`,
    channelTitle: 'Bếp',
    publishedAt: '2026-01-01T00:00:00Z',
    duration: 'PT3M',
    thumbnail: 'https://evil.example',
  };
  it('keeps old snapshots and original local video intact', () => {
    const first = original.items[0]!;
    const video = { src: '/original.mp4', poster: '/poster.jpg', credit: 'Gốc' };
    applyCatalogue({ ...original, items: [{ ...first, video, youtubeVideos: undefined }] });
    expect(getReelDish(first.id)?.video).toEqual(video);
    expect(getReelDish(first.id)?.youtubeVideos).toEqual([]);
    applyCatalogue({ ...original, items: [{ ...first, video, youtubeVideos: [valid] }] });
    expect(getReelDish(first.id)?.video).toEqual(video);
    expect(getReelDish(first.id)?.youtubeVideos?.[0]?.thumbnail).toBe(
      'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    );
  });
  it('ignores malformed optional metadata without losing the dish', () => {
    for (const input of [
      null,
      {},
      'bad',
      [
        null,
        {},
        { ...valid, videoId: '../evil' },
        { ...valid, channelId: 'bad' },
        { ...valid, title: 42 },
        { ...valid, duration: 'bad' },
        { ...valid, publishedAt: 'bad' },
      ],
    ]) {
      expect(normalizeYoutubeVideos(input)).toEqual([]);
      expect(
        applyCatalogue({
          ...original,
          items: [{ ...original.items[0]!, youtubeVideos: input as never }],
        }),
      ).toBe(true);
      expect(getReelDish(original.items[0]!.id)?.youtubeVideos).toEqual([]);
    }
  });
  it('deduplicates valid IDs, caps at five and derives URLs', () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ ...valid, videoId: `abcdefghij${i}` }));
    const normalized = normalizeYoutubeVideos([list[0], ...list]);
    expect(normalized).toHaveLength(5);
    expect(new Set(normalized.map((v) => v.videoId)).size).toBe(5);
    expect(normalized[4]?.thumbnail).toBe('https://i.ytimg.com/vi/abcdefghij4/hqdefault.jpg');
  });
});

describe('catalogue store', () => {
  it('starts from the bundled snapshot exported from the database', () => {
    expect(reelCount()).toBe(original.count);
    expect(catalogueVersion()).toBe(original.version);
  });

  it('rejects an unusable payload and keeps the current catalogue', () => {
    expect(applyCatalogue({ version: 'x', count: 0, items: [] })).toBe(false);
    expect(applyCatalogue({ items: [{ id: 'broken' }] } as unknown as CataloguePayload)).toBe(
      false,
    );
    expect(reelCount()).toBe(original.count);
  });

  it('swaps in the live catalogue from /api/dishes', async () => {
    const first = original.items[0]!;
    const live: CataloguePayload = {
      version: 'live-1',
      count: 1,
      items: [{ ...first, name: 'Món sửa từ admin' }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(live), { status: 200 })),
    );
    expect(await loadLiveCatalogue()).toBe('live');
    expect(reelCount()).toBe(1);
    expect(getReelDish(first.id)?.name).toBe('Món sửa từ admin');
    expect(catalogueVersion()).toBe('live-1');
  });

  it('falls back to the snapshot when the API fails or is slow', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('oops', { status: 500 })),
    );
    expect(await loadLiveCatalogue()).toBe('snapshot');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_, reject) =>
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('x', 'AbortError')),
            ),
          ),
      ),
    );
    expect(await loadLiveCatalogue(20)).toBe('snapshot');
    expect(reelCount()).toBe(original.count);
  });

  it('reports an empty database instead of showing the snapshot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ version: 'x', count: 0, items: [] }), { status: 200 }),
      ),
    );
    expect(await loadLiveCatalogue()).toBe('empty');
  });
});

describe('catalogue translations', () => {
  const first = original.items[0]!;
  const translated: CataloguePayload = {
    version: 't',
    count: 1,
    items: [
      {
        ...first,
        translations: { en: { name: 'Broken rice', subtitle: '  ', story: 'A Saigon classic.' } },
        ingredients: first.ingredients.map((ing, i) =>
          i === 0
            ? { ...ing, translations: { en: { name: 'Grilled pork' } } }
            : { ...ing, translations: undefined },
        ),
      },
    ],
  };

  it('keeps Vietnamese when the page is in Vietnamese', () => {
    applyCatalogue(translated);
    const d = getReelDish(first.id)!;
    expect(d.name).toBe(first.name);
    expect(d.nameVi).toBe(first.name);
    expect(d.ingredients[0]?.name).toBe(first.ingredients[0]?.name);
  });

  it('applies the English translation field by field, falling back to Vietnamese', async () => {
    vi.resetModules();
    localStorage.setItem('an-gi/locale', 'en');
    try {
      const en = await import('./reelCatalogue');
      expect(en.applyCatalogue(translated)).toBe(true);
      const d = en.getReelDish(first.id)!;
      expect(d.name).toBe('Broken rice');
      expect(d.nameVi).toBe(first.name);
      expect(d.subtitle).toBe(first.subtitle);
      expect(d.story).toBe('A Saigon classic.');
      expect(d.ingredients[0]?.name).toBe('Grilled pork');
      expect(d.ingredients[0]?.nameVi).toBe(first.ingredients[0]?.name);
      expect(d.ingredients[0]?.description).toBe(first.ingredients[0]?.description);
      expect(d.ingredients[1]?.name).toBe(first.ingredients[1]?.name);
      expect(en.REGION_LABEL.north).toBe('Northern Vietnam');
      const game = en.getReelGameDish(first.id)!;
      expect(game.name).toBe('Broken rice');
      expect(game.seedNote).toContain('Broken rice');
    } finally {
      vi.resetModules();
    }
  });
});
