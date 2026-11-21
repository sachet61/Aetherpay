import type { GameAccount, GameCatalogItem } from '../types';
import { resolveGameImageUrl } from '../utils/imageUtils';

export interface SupabaseGameCatalogRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
  min_load: number;
  bonus_pct: number;
  is_active: boolean;
  icon_url: string | null;
  image_url: string | null;
  created_at: string;
}

export function mapGameCatalogItemToDbRow(
  item: GameCatalogItem
): SupabaseGameCatalogRow {
  const icon = resolveGameImageUrl(item.iconUrl || item.imageUrl);
  const image = resolveGameImageUrl(item.imageUrl || item.iconUrl);
  return {
    id: item.id,
    title: item.title,
    category: (item.platform || 'General').trim() || 'General',
    description: item.description ? item.description.trim() : null,
    min_load: 5.0,
    bonus_pct: 0,
    is_active: item.enabled !== false,
    icon_url: icon || null,
    image_url: image || null,
    created_at: item.createdAt || new Date().toISOString(),
  };
}

export function mapDbRowToGameCatalogItem(
  row: any,
  fallbackSeedCatalog: GameCatalogItem[],
  existingCatalog: GameCatalogItem[] = []
): GameCatalogItem {
  const seedMatch = fallbackSeedCatalog.find((g) => g.id === row.id);
  const existingMatch = existingCatalog.find((g) => g.id === row.id);

  const fallbackGameUrl =
    existingMatch?.gameUrl || seedMatch?.gameUrl || '#';
  const fallbackDownloadUrl =
    existingMatch?.downloadUrl || seedMatch?.downloadUrl;
  const fallbackLinks =
    existingMatch?.links && existingMatch.links.length > 0
      ? existingMatch.links
      : seedMatch?.links && seedMatch.links.length > 0
      ? seedMatch.links
      : [{ label: 'Web Play', url: fallbackGameUrl }];

  const resolvedIcon = resolveGameImageUrl(
    row.icon_url ||
      row.image_url ||
      existingMatch?.iconUrl ||
      seedMatch?.iconUrl
  );
  const resolvedImage = resolveGameImageUrl(
    row.image_url ||
      row.icon_url ||
      existingMatch?.imageUrl ||
      seedMatch?.imageUrl
  );

  return {
    id: String(row.id),
    title: String(row.title || existingMatch?.title || seedMatch?.title || 'Untitled Game'),
    platform: String(
      row.category ||
        row.platform ||
        existingMatch?.platform ||
        seedMatch?.platform ||
        'General'
    ),
    gameUrl: fallbackGameUrl,
    downloadUrl: fallbackDownloadUrl,
    links: fallbackLinks,
    description: String(
      row.description ??
        existingMatch?.description ??
        seedMatch?.description ??
        ''
    ),
    enabled: row.is_active !== undefined ? row.is_active !== false : row.enabled !== false,
    iconUrl: resolvedIcon,
    imageUrl: resolvedImage,
    createdAt: row.created_at || existingMatch?.createdAt || seedMatch?.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || existingMatch?.updatedAt || new Date().toISOString(),
  };
}

export function mergeCatalogFromServerRows(
  rows: any[],
  fallbackSeedCatalog: GameCatalogItem[],
  existingCatalog: GameCatalogItem[] = []
): GameCatalogItem[] {
  const validRows = Array.isArray(rows) ? rows.filter((r) => r && r.id) : [];
  if (validRows.length === 0) return existingCatalog;

  return validRows.map((row) =>
    mapDbRowToGameCatalogItem(row, fallbackSeedCatalog, existingCatalog)
  );
}

export function applyGameCatalogRealtimeEvents(
  currentCatalog: GameCatalogItem[],
  events: Array<{ eventType?: string; newRow?: any; oldRow?: any }>,
  fallbackSeedCatalog: GameCatalogItem[]
): GameCatalogItem[] {
  if (!Array.isArray(events) || events.length === 0) return currentCatalog;

  const next = [...currentCatalog];

  for (const evt of events) {
    const type = String(evt.eventType || '').toUpperCase();
    if (type === 'DELETE') {
      const deletedId = evt.oldRow?.id;
      if (deletedId) {
        const idx = next.findIndex((g) => g.id === deletedId);
        if (idx !== -1) next.splice(idx, 1);
      }
      continue;
    }

    const row = evt.newRow;
    if (!row || !row.id) continue;

    const mapped = mapDbRowToGameCatalogItem(row, fallbackSeedCatalog, next);
    const existingIdx = next.findIndex((g) => g.id === mapped.id);
    if (existingIdx !== -1) {
      next[existingIdx] = mapped;
    } else {
      next.push(mapped);
    }
  }

  return next;
}

export function filterEnabledGames(catalog: GameCatalogItem[]): GameCatalogItem[] {
  if (!Array.isArray(catalog)) return [];
  return catalog.filter((g) => Boolean(g) && g.enabled !== false);
}

export function filterEnabledGameAccounts(
  accounts: GameAccount[],
  catalog: GameCatalogItem[]
): GameAccount[] {
  if (!Array.isArray(accounts)) return [];
  const enabledGames = filterEnabledGames(catalog);
  const enabledIds = new Set(enabledGames.map((g) => g.id));
  const enabledTitles = new Set(
    enabledGames.map((g) => g.title.trim().toLowerCase())
  );

  return accounts.filter((acc) => {
    if (!acc || acc.status !== 'active') return false;
    if (acc.gameCatalogId && enabledIds.has(acc.gameCatalogId)) return true;
    const normalizedTitle = (acc.gameName || '').trim().toLowerCase();
    return Boolean(normalizedTitle && enabledTitles.has(normalizedTitle));
  });
}

export function countUnsavedCatalogChanges(
  draftCatalog: GameCatalogItem[],
  persistedCatalog: GameCatalogItem[]
): number {
  const persistedById = new Map(persistedCatalog.map((g) => [g.id, g]));
  let changes = 0;

  for (const item of draftCatalog) {
    const prev = persistedById.get(item.id);
    if (!prev) {
      changes += 1;
      continue;
    }
    if (
      Boolean(item.enabled !== false) !== Boolean(prev.enabled !== false) ||
      item.title !== prev.title ||
      item.platform !== prev.platform ||
      item.description !== prev.description ||
      item.iconUrl !== prev.iconUrl ||
      item.imageUrl !== prev.imageUrl
    ) {
      changes += 1;
    }
  }

  if (draftCatalog.length !== persistedCatalog.length) {
    for (const prev of persistedCatalog) {
      if (!draftCatalog.some((d) => d.id === prev.id)) {
        changes += 1;
      }
    }
  }

  return changes;
}
