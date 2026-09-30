/*
 * Check-in photos live only on this device, in IndexedDB — never uploaded,
 * never synced. Each photo is re-encoded through a canvas before it is stored,
 * which drops every EXIF field (GPS position included) and shrinks it.
 */

const DB_NAME = 'hanh-trinh-bep-viet-photos';
const STORE = 'photos';
/** Longest edge after compression; plenty for a phone screen. */
export const PHOTO_MAX_EDGE = 1080;
const QUALITY = 0.8;

export interface MealPhoto {
  slotKey: string;
  dishId: string;
  blob: Blob;
  width: number;
  height: number;
  at: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Trình duyệt này không lưu được ảnh.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'slotKey' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Không mở được kho ảnh.'));
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Lỗi kho ảnh.'));
    });
  } finally {
    db.close();
  }
}

/** Fit (w, h) inside a square of `max` px, never upscaling. */
export function fitWithin(w: number, h: number, max = PHOTO_MAX_EDGE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/**
 * Decodes the camera file (honouring its orientation), draws it smaller onto a
 * canvas and re-encodes it as JPEG. The output carries no metadata at all.
 */
export async function compressPhoto(
  file: Blob,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error('Tệp này không phải ảnh.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { w, h } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không xử lý được ảnh trên trình duyệt này.');
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('Không nén được ảnh.');
    return { blob, width: w, height: h };
  } finally {
    bitmap.close();
  }
}

export async function savePhoto(photo: MealPhoto): Promise<void> {
  await tx('readwrite', (s) => s.put(photo));
}

export async function listPhotos(): Promise<MealPhoto[]> {
  const all = await tx<MealPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<MealPhoto[]>);
  return all.sort((a, b) => b.at - a.at);
}

export async function deletePhoto(slotKey: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(slotKey));
}

export async function clearPhotos(): Promise<void> {
  await tx('readwrite', (s) => s.clear());
}
