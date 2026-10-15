// Image utilities for local game assets and remote icons

export interface LocalGameAsset {
  id: string;
  name: string;
  filename: string;
  path: string;
}

export const LOCAL_GAME_IMAGES: LocalGameAsset[] = [
  { id: 'gc_firekirin', name: 'Fire Kirin', filename: 'Firekirin.png', path: '/images/Firekirin.png' },
  { id: 'gc_milkyway', name: 'Milky Way', filename: 'MilkyWay.png', path: '/images/MilkyWay.png' },
  { id: 'gc_juwa', name: 'Juwa', filename: 'Juwa.png', path: '/images/Juwa.png' },
  { id: 'gc_gamevault', name: 'GameVault', filename: 'GameVault.png', path: '/images/GameVault.png' },
  { id: 'gc_orionstars', name: 'Orion Stars', filename: 'OrionStars.png', path: '/images/OrionStars.png' },
  { id: 'gc_vegassweeps', name: 'Vegas Sweeps (777)', filename: 'VegasSweeps.png', path: '/images/VegasSweeps.png' },
  { id: 'gc_cashmachine', name: 'Cash Machine', filename: 'CashMachine.png', path: '/images/CashMachine.png' },
  { id: 'gc_riversweeps', name: 'River Sweeps', filename: 'RiverSweeps.png', path: '/images/RiverSweeps.png' },
  { id: 'gc_ultrapanda', name: 'Ultra Panda', filename: 'UltraPanda.png', path: '/images/UltraPanda.png' },
  { id: 'gc_pandamaster', name: 'Panda Master', filename: 'PandaMaster.png', path: '/images/PandaMaster.png' },
  { id: 'gc_vblink', name: 'Vblink', filename: 'Vblink.png', path: '/images/Vblink.png' },
  { id: 'gc_gameroom', name: 'Gameroom', filename: 'Gameroom.png', path: '/images/Gameroom.png' },
  { id: 'gc_winstar', name: 'Winstar', filename: 'Winstar.png', path: '/images/Winstar.png' },
  { id: 'gc_casinoroyale', name: 'Casino Royale', filename: 'CasinoRoyale.png', path: '/images/CasinoRoyale.png' },
  { id: 'gc_mafia', name: 'Mafia', filename: 'Mafia.png', path: '/images/Mafia.png' },
  { id: 'gc_egame', name: 'E-Game', filename: 'Egame.png', path: '/images/Egame.png' },
  { id: 'gc_yolo', name: 'YOLO', filename: 'Yolo.png', path: '/images/Yolo.png' },
  { id: 'gc_casinoignite', name: 'Casino Ignite', filename: 'CasinoIgnite.jpeg', path: '/images/CasinoIgnite.jpeg' },
  { id: 'gc_vegasx', name: 'VegasX', filename: 'vegasx.png', path: '/images/vegasx.png' },
  { id: 'gc_gamblinggalaxy', name: 'Gambling Galaxy', filename: 'gamblinggalaxy.png', path: '/images/gamblinggalaxy.png' },
];

export const DEFAULT_GAME_ICON = '/images/Firekirin.png';

/**
 * Resolves any game image representation to a working URL.
 * Handles:
 *  - `/src/images/Firekirin.png` or `src/images/Firekirin.png` -> `/images/Firekirin.png`
 *  - `/images/Firekirin.png` or `images/Firekirin.png` -> `/images/Firekirin.png`
 *  - Bare filenames like `Firekirin.png` or `casinoignite.jpeg` -> `/images/...`
 *  - External HTTPS/HTTP URLs or data URIs -> untouched
 */
export function resolveGameImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_GAME_ICON;
  }

  const clean = url.trim();

  // If already an absolute http/https or data URI, return as is
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }

  // Handle /src/images/... or src/images/...
  if (clean.startsWith('/src/images/')) {
    return clean.replace('/src/images/', '/images/');
  }
  if (clean.startsWith('src/images/')) {
    return clean.replace('src/images/', '/images/');
  }

  // Handle /images/... or images/...
  if (clean.startsWith('/images/')) {
    return clean;
  }
  if (clean.startsWith('images/')) {
    return `/${clean}`;
  }

  // Check if it matches any known local filename case-insensitively
  const matched = LOCAL_GAME_IMAGES.find(
    (item) => item.filename.toLowerCase() === clean.toLowerCase() ||
              item.filename.toLowerCase().replace(/\.[^/.]+$/, '') === clean.toLowerCase().replace(/\.[^/.]+$/, '')
  );
  if (matched) {
    return matched.path;
  }

  // If starts with / return as is, else prepend /images/
  if (clean.startsWith('/')) {
    return clean;
  }

  return `/images/${clean}`;
}
