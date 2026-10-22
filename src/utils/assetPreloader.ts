import { LOCAL_GAME_IMAGES, DEFAULT_GAME_ICON } from './imageUtils';

// Global memory cache pool holding preloaded HTMLImageElement references
// This guarantees the browser keeps decoded image bitmaps hot in memory
const memoryImageCache = new Map<string, HTMLImageElement>();

export const CORE_ASSET_URLS: string[] = [
  ...LOCAL_GAME_IMAGES.map((item) => item.path),
  DEFAULT_GAME_ICON,
  '/favicon.png',
];

/**
 * Preloads a single image and stores it in the in-memory cache pool
 */
export function preloadSingleImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({} as HTMLImageElement);
      return;
    }

    const existing = memoryImageCache.get(url);
    if (existing && existing.complete) {
      resolve(existing);
      return;
    }

    const img = new Image();
    img.decoding = 'async';

    img.onload = () => {
      memoryImageCache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      // Still store to prevent continuous re-attempts
      memoryImageCache.set(url, img);
      resolve(img);
    };

    img.src = url;
  });
}

/**
 * Preloads an array of image URLs in parallel, reporting live progress
 */
export async function preloadAssetPool(
  urls: string[] = CORE_ASSET_URLS,
  onProgress?: (loaded: number, total: number, percent: number) => void
): Promise<{ successCount: number; total: number }> {
  if (typeof window === 'undefined' || urls.length === 0) {
    if (onProgress) onProgress(0, 0, 100);
    return { successCount: 0, total: 0 };
  }

  // De-duplicate URLs
  const uniqueUrls = Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.trim().length > 0)));
  const total = uniqueUrls.length;
  let loadedCount = 0;

  const promises = uniqueUrls.map(async (url) => {
    try {
      await preloadSingleImage(url);
    } catch {
      // safe fallback
    } finally {
      loadedCount++;
      if (onProgress) {
        const percent = Math.min(100, Math.floor((loadedCount / total) * 100));
        onProgress(loadedCount, total, percent);
      }
    }
  });

  await Promise.all(promises);

  return { successCount: loadedCount, total };
}

/**
 * Returns whether an image URL is already in the memory cache
 */
export function isImageCached(url: string): boolean {
  const cached = memoryImageCache.get(url);
  return !!cached && cached.complete;
}

/**
 * Returns total count of cached images in memory
 */
export function getCachedImagesCount(): number {
  return memoryImageCache.size;
}
