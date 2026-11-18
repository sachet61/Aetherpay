import {
  DEFAULT_GAME_ICON,
  DEFERRED_GAME_IMAGE_PATHS,
  HERO_BANNER_IMAGE,
  PRIORITY_GAME_IMAGE_PATHS,
} from './imageUtils';
import { FAVICON_PNG_URL, NOTIFICATION_BADGE_URL, PWA_ICON_192_URL } from './pwaAssets';

// Global memory cache pool holding preloaded HTMLImageElement references
// This guarantees the browser keeps decoded image bitmaps hot in memory
const memoryImageCache = new Map<string, HTMLImageElement>();

// Priority pool loaded immediately during StartupSplash (top 8 visible games + core brand + hero banner)
export const CRITICAL_ASSET_URLS: string[] = [
  FAVICON_PNG_URL,
  PWA_ICON_192_URL,
  NOTIFICATION_BADGE_URL,
  HERO_BANNER_IMAGE,
  DEFAULT_GAME_ICON,
  ...PRIORITY_GAME_IMAGE_PATHS,
];

// Remaining games (#9-#20) warmed gently in idle visible time
export const DEFERRED_ASSET_URLS: string[] = [...DEFERRED_GAME_IMAGE_PATHS];

// Combined asset registry kept for full-pool compatibility
export const CORE_ASSET_URLS: string[] = [
  ...CRITICAL_ASSET_URLS,
  ...DEFERRED_ASSET_URLS,
];

/**
 * Deduplicates and filters a list of URLs into unique non-empty strings.
 */
export function normalizeAssetUrlList(urls: string[]): string[] {
  return Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.trim().length > 0)));
}

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
      memoryImageCache.set(url, img);
      resolve(img);
    };

    img.src = url;
  });
}

/**
 * Preloads an array of image URLs with bounded concurrency, reporting live progress
 */
export async function preloadAssetPool(
  urls: string[] = CRITICAL_ASSET_URLS,
  onProgress?: (loaded: number, total: number, percent: number) => void,
  concurrency = 4
): Promise<{ successCount: number; total: number }> {
  if (typeof window === 'undefined' || urls.length === 0) {
    if (onProgress) onProgress(0, 0, 100);
    return { successCount: 0, total: 0 };
  }

  const uniqueUrls = normalizeAssetUrlList(urls);
  const total = uniqueUrls.length;
  if (total === 0) {
    if (onProgress) onProgress(0, 0, 100);
    return { successCount: 0, total: 0 };
  }

  let loadedCount = 0;
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), total);

  const runWorker = async () => {
    while (nextIndex < total) {
      const currentIdx = nextIndex++;
      const url = uniqueUrls[currentIdx];
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
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return { successCount: loadedCount, total };
}

/**
 * Schedules deferred background preloading during idle time while the tab is visible.
 * Returns a cleanup callback to cancel pending timers/listeners safely on unmount.
 */
export function scheduleDeferredAssetPreload(
  urls: string[] = DEFERRED_ASSET_URLS,
  concurrency = 2
): () => void {
  if (typeof window === 'undefined' || urls.length === 0) {
    return () => {};
  }

  const queue = normalizeAssetUrlList(urls).filter((url) => !isImageCached(url));
  if (queue.length === 0) {
    return () => {};
  }

  let cancelled = false;
  let running = false;
  let cursor = 0;
  let idleHandle: number | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const isVisible = () =>
    typeof document === 'undefined' || document.visibilityState !== 'hidden';

  const pump = async () => {
    if (cancelled || running || !isVisible() || cursor >= queue.length) {
      return;
    }
    running = true;

    const batch = queue.slice(cursor, cursor + concurrency);
    cursor += batch.length;

    await Promise.all(batch.map((url) => preloadSingleImage(url)));
    running = false;

    if (!cancelled && cursor < queue.length && isVisible()) {
      scheduleNext();
    }
  };

  const scheduleNext = () => {
    if (cancelled || cursor >= queue.length || !isVisible()) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof win.requestIdleCallback === 'function') {
      idleHandle = win.requestIdleCallback(() => {
        void pump();
      }, { timeout: 1500 });
    } else {
      timeoutHandle = setTimeout(() => {
        void pump();
      }, 250);
    }
  };

  const handleVisibilityChange = () => {
    if (!cancelled && isVisible() && cursor < queue.length && !running) {
      scheduleNext();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Defer past initial interactive paint
  timeoutHandle = setTimeout(() => {
    scheduleNext();
  }, 600);

  return () => {
    cancelled = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    const win = window as Window & { cancelIdleCallback?: (id: number) => void };
    if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(idleHandle);
    }
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  };
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
