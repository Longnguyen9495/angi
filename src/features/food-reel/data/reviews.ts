import { normalizeYoutubeVideos } from './youtubeVideos';

export type ProvinceId = 'HN' | 'HCMC';
export const provinceStorageKey = 'angi.review.province';
export function normalizeProvince(value: unknown): ProvinceId | null {
  if (typeof value !== 'string') return null;
  const key = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (['HN', 'HANOI'].includes(key)) return 'HN';
  if (['HCMC', 'HOCHIMINH', 'TPHOCHIMINH', 'TPHCM', 'SAIGON'].includes(key)) return 'HCMC';
  return null;
}
export function reviewDish(id: string): string | null {
  if (id === 'com-tam-suon-bi-cha-trung' || id === 'com-tam') return 'com-tam';
  return id === 'pho-bo' ? id : null;
}
export function readProvince(): ProvinceId | null {
  try {
    const province = normalizeProvince(localStorage.getItem(provinceStorageKey));
    if (province) localStorage.setItem(provinceStorageKey, province);
    else localStorage.removeItem(provinceStorageKey);
    return province;
  } catch {
    return null;
  }
}
export function persistProvince(province: ProvinceId) {
  try {
    localStorage.setItem(provinceStorageKey, province);
  } catch {
    /* Storage is optional. */
  }
}
export async function reviewRequest(
  path: string,
  signal: AbortSignal,
  body?: { latitude: number; longitude: number },
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = window.setTimeout(abort, 12000);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      cache: 'no-store',
      ...(body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : {}),
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        422: 'Vị trí hoặc tỉnh chưa thuộc phạm vi thử nghiệm. Hãy chọn tỉnh thủ công.',
        429: 'Đã đạt giới hạn yêu cầu. Hãy thử lại sau.',
        503: 'Dịch vụ tạm chưa sẵn sàng. Hãy chọn tỉnh thủ công hoặc thử lại sau.',
      };
      throw new Error(messages[response.status] ?? 'Không tải được dữ liệu. Hãy thử lại.');
    }
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted)
      throw new Error('Yêu cầu quá thời gian. Hãy thử lại hoặc chọn tỉnh thủ công.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
export function reviewItems(data: unknown, dish: string, province: ProvinceId) {
  const result = data as Record<string, unknown> | null;
  if (
    !result ||
    result.dishId !== dish ||
    normalizeProvince(result.provinceId) !== province ||
    result.basis !== 'title-description-only'
  ) {
    throw new Error('Dữ liệu review không khớp món, tỉnh hoặc cơ sở metadata.');
  }
  return normalizeYoutubeVideos(result.items);
}
