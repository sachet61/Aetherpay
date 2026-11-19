import type { GameCatalogItem, GameLink } from '../types';

export interface ResolvedGameCardLinks {
  webPlayUrl: string;
  getAppUrl: string;
  hasWebPlayUrl: boolean;
  hasGetAppUrl: boolean;
}

export function isSafeExternalHttpUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

export function resolveGameCardLinks(
  game: Pick<GameCatalogItem, 'gameUrl' | 'downloadUrl' | 'links'>
): ResolvedGameCardLinks {
  const links: GameLink[] = Array.isArray(game.links)
    ? game.links.filter((l) => l && isSafeExternalHttpUrl(l.url))
    : [];

  const isAppLabel = (label: string) => /download|get\s*app|app|apk|ios|android/i.test(label);
  const isWebLabel = (label: string) => /web|play|browser/i.test(label) && !isAppLabel(label);

  const webLink =
    links.find((l) => isWebLabel(l.label || '')) ||
    links.find((l) => !isAppLabel(l.label || '')) ||
    links[0];

  const appLink =
    links.find((l) => isAppLabel(l.label || '')) ||
    (isSafeExternalHttpUrl(game.downloadUrl)
      ? { label: 'Get app', url: game.downloadUrl!.trim() }
      : undefined) ||
    links[1] ||
    webLink;

  const fallbackGameUrl = isSafeExternalHttpUrl(game.gameUrl) ? game.gameUrl.trim() : '';
  const fallbackDownloadUrl = isSafeExternalHttpUrl(game.downloadUrl) ? game.downloadUrl!.trim() : '';

  const resolvedWebUrl = webLink?.url?.trim() || fallbackGameUrl || fallbackDownloadUrl || '#';
  const resolvedAppUrl = appLink?.url?.trim() || fallbackDownloadUrl || resolvedWebUrl;

  return {
    webPlayUrl: resolvedWebUrl,
    getAppUrl: resolvedAppUrl,
    hasWebPlayUrl: isSafeExternalHttpUrl(resolvedWebUrl),
    hasGetAppUrl: isSafeExternalHttpUrl(resolvedAppUrl),
  };
}

export function toggleGameCardOverlay(
  currentActiveId: string | null,
  tappedId: string
): string | null {
  return currentActiveId === tappedId ? null : tappedId;
}
