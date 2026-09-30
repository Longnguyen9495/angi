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

export type OrderService = 'maps' | 'grab' | 'shopee' | 'be';

/** ShopeeFood city slugs seen on live shopeefood.vn pages. */
export const SHOPEEFOOD_CITIES = [
  { id: 'ho-chi-minh', label: 'TP. HCM' },
  { id: 'ha-noi', label: 'Hà Nội' },
  { id: 'da-nang', label: 'Đà Nẵng' },
  { id: 'hai-phong', label: 'Hải Phòng' },
  { id: 'binh-duong', label: 'Bình Dương' },
  { id: 'dong-nai', label: 'Đồng Nai' },
  { id: 'hue', label: 'Huế' },
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

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export function orderLinks(dishName: string, city: ShopeeCity = DEFAULT_CITY): OrderLink[] {
  const q = dishName.trim();
  return [
    {
      id: 'maps',
      label: 'Google Maps',
      note: 'Quán gần bạn',
      href: `https://www.google.com/maps/search/?${qs({ api: '1', query: q })}`,
    },
    {
      id: 'grab',
      label: 'GrabFood',
      note: 'Giao tận nơi',
      href: `https://food.grab.com/vn/vi/restaurants?${qs({ search: q })}`,
    },
    {
      id: 'shopee',
      label: 'ShopeeFood',
      note: 'Giao tận nơi',
      href: `https://shopeefood.vn/${city}/danh-sach-dia-diem-giao-tan-noi?${qs({ q })}`,
    },
    {
      id: 'be',
      label: 'beFood',
      note: 'Giao tận nơi',
      href: `https://food.be.com.vn/search?${qs({ keyword: q })}`,
    },
  ];
}
