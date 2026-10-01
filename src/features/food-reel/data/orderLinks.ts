/*
 * "Tìm quán & đặt món": hand the chosen dish over to a map or a delivery app,
 * pre-filled with its name. Every URL shape here was checked against the live
 * site (2026-09-30), not guessed:
 * - Google Maps: the documented Maps URLs API (opens the app on phones).
 * - GrabFood: /restaurants?search= — the page reads it as its search keyword.
 * - ShopeeFood: /<city>/danh-sach-dia-diem-giao-tan-noi?q= — the route its own
 *   search box pushes; the city slug is required.
 * - beFood: /search?keyword= — the form linked from its own home page.
 */
import { locale, t } from '../../../i18n';

export type OrderService = 'maps' | 'grab' | 'shopee' | 'be';

/** ShopeeFood city slugs seen on live shopeefood.vn pages. */
export const SHOPEEFOOD_CITIES = [
  { id: 'ho-chi-minh', label: t.reel.order.cities['ho-chi-minh'] },
  { id: 'ha-noi', label: t.reel.order.cities['ha-noi'] },
  { id: 'da-nang', label: t.reel.order.cities['da-nang'] },
  { id: 'hai-phong', label: t.reel.order.cities['hai-phong'] },
  { id: 'binh-duong', label: t.reel.order.cities['binh-duong'] },
  { id: 'dong-nai', label: t.reel.order.cities['dong-nai'] },
  { id: 'hue', label: t.reel.order.cities.hue },
] as const;

export type ShopeeCity = (typeof SHOPEEFOOD_CITIES)[number]['id'];
export const DEFAULT_CITY: ShopeeCity = 'ho-chi-minh';

export function isShopeeCity(v: unknown): v is ShopeeCity {
  return SHOPEEFOOD_CITIES.some((c) => c.id === v);
}

export interface OrderLink {
  id: OrderService;
  label: string;
  note: string;
  href: string;
}

/** GrabFood serves its pages in Vietnamese or English; other languages get English. */
const grabLang = () => (locale === 'vi' ? 'vi' : 'en');

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export function orderLinks(dishName: string, city: ShopeeCity = DEFAULT_CITY): OrderLink[] {
  const q = dishName.trim();
  return [
    {
      id: 'maps',
      label: 'Google Maps',
      note: t.reel.order.nearby,
      href: `https://www.google.com/maps/search/?${qs({ api: '1', query: q })}`,
    },
    {
      id: 'grab',
      label: 'GrabFood',
      note: t.reel.order.delivery,
      href: `https://food.grab.com/vn/${grabLang()}/restaurants?${qs({ search: q })}`,
    },
    {
      id: 'shopee',
      label: 'ShopeeFood',
      note: t.reel.order.delivery,
      href: `https://shopeefood.vn/${city}/danh-sach-dia-diem-giao-tan-noi?${qs({ q })}`,
    },
    {
      id: 'be',
      label: 'beFood',
      note: t.reel.order.delivery,
      href: `https://food.be.com.vn/search?${qs({ keyword: q })}`,
    },
  ];
}
