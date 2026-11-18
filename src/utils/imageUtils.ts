// Image utilities for versioned WebP local game assets, banners, and legacy path normalization

export interface LocalGameAsset {
  id: string;
  name: string;
  filename: string;
  path: string;
  aliases: string[];
}

export const HERO_BANNER_IMAGE = '/images/banners/gaming-wallet-hero-v2.webp';
export const DEFAULT_GAME_ICON = '/images/games/firekirin-v2.webp';
export const TOP_PRIORITY_GAME_COUNT = 8;

export const LOCAL_GAME_IMAGES: LocalGameAsset[] = [
  {
    id: 'gc_firekirin',
    name: 'Fire Kirin',
    filename: 'firekirin-v2.webp',
    path: '/images/games/firekirin-v2.webp',
    aliases: ['firekirin', 'fire-kirin'],
  },
  {
    id: 'gc_milkyway',
    name: 'Milky Way',
    filename: 'milkyway-v2.webp',
    path: '/images/games/milkyway-v2.webp',
    aliases: ['milkyway', 'milky-way'],
  },
  {
    id: 'gc_juwa',
    name: 'Juwa',
    filename: 'juwa-v2.webp',
    path: '/images/games/juwa-v2.webp',
    aliases: ['juwa', 'juwa777'],
  },
  {
    id: 'gc_gamevault',
    name: 'GameVault',
    filename: 'gamevault-v2.webp',
    path: '/images/games/gamevault-v2.webp',
    aliases: ['gamevault', 'game-vault'],
  },
  {
    id: 'gc_orionstars',
    name: 'Orion Stars',
    filename: 'orionstars-v2.webp',
    path: '/images/games/orionstars-v2.webp',
    aliases: ['orionstars', 'orion-stars'],
  },
  {
    id: 'gc_vegassweeps',
    name: 'Vegas Sweeps (777)',
    filename: 'vegassweeps-v2.webp',
    path: '/images/games/vegassweeps-v2.webp',
    aliases: ['vegassweeps', 'vegas-sweeps', 'vegas777'],
  },
  {
    id: 'gc_cashmachine',
    name: 'Cash Machine',
    filename: 'cashmachine-v2.webp',
    path: '/images/games/cashmachine-v2.webp',
    aliases: ['cashmachine', 'cash-machine'],
  },
  {
    id: 'gc_riversweeps',
    name: 'River Sweeps',
    filename: 'riversweeps-v2.webp',
    path: '/images/games/riversweeps-v2.webp',
    aliases: ['riversweeps', 'river-sweeps', 'river'],
  },
  {
    id: 'gc_ultrapanda',
    name: 'Ultra Panda',
    filename: 'ultrapanda-v2.webp',
    path: '/images/games/ultrapanda-v2.webp',
    aliases: ['ultrapanda', 'ultra-panda'],
  },
  {
    id: 'gc_pandamaster',
    name: 'Panda Master',
    filename: 'pandamaster-v2.webp',
    path: '/images/games/pandamaster-v2.webp',
    aliases: ['pandamaster', 'panda-master'],
  },
  {
    id: 'gc_vblink',
    name: 'Vblink',
    filename: 'vblink-v2.webp',
    path: '/images/games/vblink-v2.webp',
    aliases: ['vblink', 'vblink777'],
  },
  {
    id: 'gc_gameroom',
    name: 'Gameroom',
    filename: 'gameroom-v2.webp',
    path: '/images/games/gameroom-v2.webp',
    aliases: ['gameroom', 'gameroom777'],
  },
  {
    id: 'gc_winstar',
    name: 'Winstar',
    filename: 'winstar-v2.webp',
    path: '/images/games/winstar-v2.webp',
    aliases: ['winstar', 'winstar-slots', 'winstarslots'],
  },
  {
    id: 'gc_casinoroyale',
    name: 'Casino Royale',
    filename: 'casinoroyale-v2.webp',
    path: '/images/games/casinoroyale-v2.webp',
    aliases: ['casinoroyale', 'casino-royale', 'casinoroyal', 'casino-royal'],
  },
  {
    id: 'gc_mafia',
    name: 'Mafia',
    filename: 'mafia-v2.webp',
    path: '/images/games/mafia-v2.webp',
    aliases: ['mafia', 'mafia777'],
  },
  {
    id: 'gc_egame',
    name: 'E-Game',
    filename: 'egame-v2.webp',
    path: '/images/games/egame-v2.webp',
    aliases: ['egame', 'e-game'],
  },
  {
    id: 'gc_yolo',
    name: 'YOLO',
    filename: 'yolo-v2.webp',
    path: '/images/games/yolo-v2.webp',
    aliases: ['yolo', 'yolo777'],
  },
  {
    id: 'gc_casinoignite',
    name: 'Casino Ignite',
    filename: 'casinoignite-v2.webp',
    path: '/images/games/casinoignite-v2.webp',
    aliases: ['casinoignite', 'casino-ignite'],
  },
  {
    id: 'gc_vegasx',
    name: 'VegasX',
    filename: 'vegasx-v2.webp',
    path: '/images/games/vegasx-v2.webp',
    aliases: ['vegasx', 'vegas-x'],
  },
  {
    id: 'gc_gamblinggalaxy',
    name: 'Gambling Galaxy',
    filename: 'gamblinggalaxy-v2.webp',
    path: '/images/games/gamblinggalaxy-v2.webp',
    aliases: ['gamblinggalaxy', 'gambling-galaxy'],
  },
];

export const PRIORITY_GAME_IMAGE_PATHS: string[] = LOCAL_GAME_IMAGES
  .slice(0, TOP_PRIORITY_GAME_COUNT)
  .map((item) => item.path);

export const DEFERRED_GAME_IMAGE_PATHS: string[] = LOCAL_GAME_IMAGES
  .slice(TOP_PRIORITY_GAME_COUNT)
  .map((item) => item.path);

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|gif|svg)$/i, '')
    .replace(/-v\d+$/i, '')
    .replace(/[-_\s()]/g, '');
}

const ALIAS_LOOKUP = new Map<string, LocalGameAsset>();
for (const asset of LOCAL_GAME_IMAGES) {
  ALIAS_LOOKUP.set(normalizeToken(asset.filename), asset);
  ALIAS_LOOKUP.set(normalizeToken(asset.name), asset);
  for (const alias of asset.aliases) {
    ALIAS_LOOKUP.set(normalizeToken(alias), asset);
  }
}

export function findLocalGameAsset(urlOrName?: string | null): LocalGameAsset | undefined {
  if (!urlOrName || typeof urlOrName !== 'string') return undefined;
  const trimmed = urlOrName.trim();
  if (!trimmed) return undefined;

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const lastSegment = withoutQuery.split('/').pop() || withoutQuery;
  const normalized = normalizeToken(lastSegment);
  return ALIAS_LOOKUP.get(normalized);
}

/**
 * Resolves any game image representation to an optimized WebP URL or valid remote/uploaded asset URL.
 * Handles:
 *  - `/images/games/<slug>-v2.webp` -> untouched
 *  - Legacy `/src/images/...`, `/images/*.png`, `/images/*.jpeg`, kebab-case aliases -> `/images/games/<slug>-v2.webp`
 *  - Bare filenames or platform names like `Firekirin.png`, `winstar-slots.png`, `river.png` -> `/images/games/<slug>-v2.webp`
 *  - Payment QR paths `/images/qr/...` -> `/images/qr/...`
 *  - External HTTPS/HTTP URLs, data URIs, blob URIs -> untouched
 */
export function resolveGameImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_GAME_ICON;
  }

  const clean = url.trim();

  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('data:') ||
    clean.startsWith('blob:')
  ) {
    return clean;
  }

  // Normalize /src/images/ prefix from legacy builds
  const normalizedPath = clean.startsWith('/src/images/')
    ? clean.replace('/src/images/', '/images/')
    : clean.startsWith('src/images/')
      ? clean.replace('src/images/', '/images/')
      : clean.startsWith('images/')
        ? `/${clean}`
        : clean;

  // Never remap admin QR uploads or banner paths
  if (normalizedPath.startsWith('/images/qr/') || normalizedPath.startsWith('/images/banners/')) {
    return normalizedPath;
  }

  // Map any known legacy path, alias, or bare filename to its canonical versioned WebP asset
  const isLocalImageScope =
    normalizedPath.startsWith('/images/') || !normalizedPath.startsWith('/');
  if (isLocalImageScope) {
    const matched = findLocalGameAsset(normalizedPath);
    if (matched) {
      return matched.path;
    }
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath;
  }

  return `/images/${normalizedPath}`;
}

export function isLocalGameAssetSelected(currentUrl: string | undefined | null, asset: LocalGameAsset): boolean {
  if (!currentUrl) return false;
  const resolvedCurrent = resolveGameImageUrl(currentUrl);
  return resolvedCurrent === asset.path;
}
