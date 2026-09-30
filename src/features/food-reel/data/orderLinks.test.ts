import { describe, expect, it } from 'vitest';
import { orderLinks } from './orderLinks';

describe('order links', () => {
  it('open each service with the dish name as the search', () => {
    const links = Object.fromEntries(
      orderLinks('Bún bò Huế', 'da-nang').map((l) => [l.id, l.href]),
    );
    const q = (href: string, key: string) => new URL(href).searchParams.get(key);
    expect(new URL(links.maps!).origin + new URL(links.maps!).pathname).toBe(
      'https://www.google.com/maps/search/',
    );
    expect(q(links.maps!, 'api')).toBe('1');
    expect(q(links.maps!, 'query')).toBe('Bún bò Huế');
    expect(q(links.grab!, 'search')).toBe('Bún bò Huế');
    expect(new URL(links.shopee!).pathname).toBe('/da-nang/danh-sach-dia-diem-giao-tan-noi');
    expect(q(links.shopee!, 'q')).toBe('Bún bò Huế');
    expect(q(links.be!, 'keyword')).toBe('Bún bò Huế');
  });
});
