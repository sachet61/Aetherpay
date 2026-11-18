// Versioned PWA icon & Android notification badge URLs (-v2 breaks WebAPK/CDN caches)
export const PWA_ICON_192_URL = '/pwa-192x192-v2.png';
export const PWA_ICON_512_URL = '/pwa-512x512-v2.png';
export const PWA_MASKABLE_512_URL = '/pwa-maskable-512x512-v2.png';
export const APPLE_TOUCH_ICON_URL = '/apple-touch-icon-v2.png';
export const FAVICON_PNG_URL = '/favicon-v2.png';
export const NOTIFICATION_BADGE_URL = '/notification-badge-v2.png';
export const DEFAULT_NOTIFICATION_ICON_URL = PWA_ICON_192_URL;

const LEGACY_ICON_URLS = new Set(['/pwa-192x192.png', '/pwa-512x512.png', '/favicon.png']);
const LEGACY_BADGE_URLS = new Set(['/favicon.png', '/pwa-192x192.png']);

export function resolveNotificationIconUrl(rawIcon?: string | null): string {
  if (!rawIcon || LEGACY_ICON_URLS.has(rawIcon.trim())) {
    return DEFAULT_NOTIFICATION_ICON_URL;
  }
  return rawIcon.trim();
}

export function resolveNotificationBadgeUrl(rawBadge?: string | null): string {
  if (!rawBadge || LEGACY_BADGE_URLS.has(rawBadge.trim())) {
    return NOTIFICATION_BADGE_URL;
  }
  return rawBadge.trim();
}
