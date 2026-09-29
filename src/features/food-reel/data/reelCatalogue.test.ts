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

const original = snapshot as CataloguePayload;

afterEach(() => {
  applyCatalogue(original);
  vi.unstubAllGlobals();
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
});
