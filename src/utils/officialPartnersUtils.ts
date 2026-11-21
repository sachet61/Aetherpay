import type { OfficialPartner, OfficialPartnerInput, PartnerPlatform } from '../types';

export const PARTNER_PLATFORMS: PartnerPlatform[] = ['facebook', 'instagram', 'telegram'];

export const PLATFORM_LABELS: Record<PartnerPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  telegram: 'Telegram',
};

export const ALLOWED_PARTNER_HOSTS: Record<PartnerPlatform, readonly string[]> = {
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'm.me'],
  instagram: ['instagram.com', 'www.instagram.com', 'ig.me'],
  telegram: ['t.me', 'telegram.me'],
};

export const PARTNER_ICON_MAX_BYTES = 512 * 1024; // 512 KB
export const ALLOWED_PARTNER_ICON_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const ALLOWED_PARTNER_ICON_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export const MAX_PARTNER_NAME_LENGTH = 80;
export const MAX_PARTNER_NOTE_LENGTH = 80;

export type PartnerSortMode = 'manual' | 'name_asc' | 'platform';

const RESERVED_FACEBOOK_SEGMENTS = new Set([
  'profile.php',
  'pages',
  'groups',
  'events',
  'watch',
  'marketplace',
  'share',
  'sharer',
  'sharer.php',
  'help',
  'login',
  'policies',
  'reel',
  'reels',
  'stories',
  'gaming',
  'messages',
  'photo',
  'photo.php',
  'plugins',
  'dialog',
]);

const RESERVED_INSTAGRAM_SEGMENTS = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'tv',
  'channel',
  'about',
  'legal',
]);

const RESERVED_TELEGRAM_SEGMENTS = new Set([
  'joinchat',
  's',
  'c',
  'iv',
  'proxy',
  'socks',
  'setlanguage',
  'addstickers',
  'addemoji',
  'addtheme',
  'boost',
  'share',
]);

export function isPartnerPlatform(value: unknown): value is PartnerPlatform {
  return value === 'facebook' || value === 'instagram' || value === 'telegram';
}

export interface PartnerUrlValidationResult {
  valid: boolean;
  normalizedUrl: string | null;
  host?: string;
  error?: string;
}

export function validatePartnerUrl(
  rawUrl: unknown,
  platform: PartnerPlatform,
  options?: { required?: boolean; fieldLabel?: string }
): PartnerUrlValidationResult {
  const required = options?.required ?? true;
  const label = options?.fieldLabel || 'URL';
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';

  if (!trimmed) {
    if (!required) {
      return { valid: true, normalizedUrl: null };
    }
    return { valid: false, normalizedUrl: null, error: `${label} is required.` };
  }

  if (/\s/.test(trimmed)) {
    return { valid: false, normalizedUrl: null, error: `${label} cannot contain spaces.` };
  }

  if (!/^https:\/\//i.test(trimmed)) {
    return {
      valid: false,
      normalizedUrl: null,
      error: `${label} must start with https://`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, normalizedUrl: null, error: `Enter a valid https:// ${label.toLowerCase()}.` };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, normalizedUrl: null, error: `${label} must use https://` };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, normalizedUrl: null, error: `${label} cannot include embedded credentials.` };
  }

  const host = parsed.hostname.toLowerCase();
  const allowedHosts = ALLOWED_PARTNER_HOSTS[platform];
  if (!allowedHosts.includes(host)) {
    return {
      valid: false,
      normalizedUrl: null,
      error: `Use an official ${PLATFORM_LABELS[platform]} domain (${allowedHosts.join(', ')}).`,
    };
  }

  return {
    valid: true,
    normalizedUrl: trimmed,
    host,
  };
}

export function validatePartnerIconUrl(rawUrl: unknown): PartnerUrlValidationResult {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) {
    return { valid: true, normalizedUrl: null };
  }

  if (/\s/.test(trimmed)) {
    return { valid: false, normalizedUrl: null, error: 'Icon URL cannot contain spaces.' };
  }

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { valid: false, normalizedUrl: null, error: 'Icon URL must be a valid https:// image link.' };
  }

  if (!/^https:\/\//i.test(trimmed)) {
    return { valid: false, normalizedUrl: null, error: 'Icon URL must start with https://' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, normalizedUrl: null, error: 'Enter a valid https:// icon URL.' };
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    return { valid: false, normalizedUrl: null, error: 'Enter a valid https:// icon URL.' };
  }

  const lowerPath = parsed.pathname.toLowerCase();
  if (lowerPath.endsWith('.svg') || trimmed.toLowerCase().includes('image/svg')) {
    return { valid: false, normalizedUrl: null, error: 'SVG icons are not allowed. Use PNG, JPG, or WebP.' };
  }

  return {
    valid: true,
    normalizedUrl: trimmed,
    host: parsed.hostname.toLowerCase(),
  };
}

export function validatePartnerIconFile(
  file: Pick<File, 'name' | 'size' | 'type'> | null | undefined
): { valid: boolean; error?: string; mimeType?: string; extension?: 'png' | 'jpg' | 'webp' } {
  if (!file) {
    return { valid: false, error: 'No icon file was selected.' };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: 'Icon file is empty. Choose a PNG, JPG, or WebP file.' };
  }

  if (file.size > PARTNER_ICON_MAX_BYTES) {
    return {
      valid: false,
      error: 'Icon exceeds the 512 KB limit. Upload a smaller PNG, JPG, or WebP.',
    };
  }

  const mime = String(file.type || '').trim().toLowerCase();
  const extMatch = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const rawExt = extMatch ? extMatch[1] : '';

  if (mime === 'image/svg+xml' || rawExt === 'svg') {
    return { valid: false, error: 'SVG files are not allowed. Use PNG, JPG, or WebP.' };
  }

  if (mime && !ALLOWED_PARTNER_ICON_MIME_TYPES.has(mime)) {
    return { valid: false, error: 'Only PNG, JPG, and WebP icons are allowed.' };
  }

  if (!mime && (!rawExt || !ALLOWED_PARTNER_ICON_EXTENSIONS.has(rawExt))) {
    return { valid: false, error: 'Only PNG, JPG, and WebP icons are allowed.' };
  }

  const extension: 'png' | 'jpg' | 'webp' =
    mime === 'image/png' || rawExt === 'png'
      ? 'png'
      : mime === 'image/webp' || rawExt === 'webp'
      ? 'webp'
      : 'jpg';

  const resolvedMime =
    mime && ALLOWED_PARTNER_ICON_MIME_TYPES.has(mime)
      ? mime
      : extension === 'png'
      ? 'image/png'
      : extension === 'webp'
      ? 'image/webp'
      : 'image/jpeg';

  return {
    valid: true,
    mimeType: resolvedMime,
    extension,
  };
}

function cleanHandleSegment(raw: string): string {
  return decodeURIComponent(raw).trim().replace(/^@+/, '');
}

export function extractPlatformUsername(pageUrl: string, platform: PartnerPlatform): string | null {
  try {
    const parsed = new URL(pageUrl.trim());
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_PARTNER_HOSTS[platform].includes(host)) return null;

    const segments = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length === 0) return null;

    if (platform === 'facebook') {
      const first = cleanHandleSegment(segments[0]);
      if (!first || RESERVED_FACEBOOK_SEGMENTS.has(first.toLowerCase())) return null;
      if (host === 'm.me') {
        return /^[a-zA-Z0-9._-]+$/.test(first) ? first : null;
      }
      // facebook.com/<username> (avoid deep content routes like /foo/posts/123)
      if (segments.length > 1 && segments[1] !== '') {
        return null;
      }
      return /^[a-zA-Z0-9._-]+$/.test(first) ? first : null;
    }

    if (platform === 'instagram') {
      if (host === 'ig.me') {
        if (segments[0]?.toLowerCase() === 'm' && segments[1]) {
          const handle = cleanHandleSegment(segments[1]);
          return /^[a-zA-Z0-9._]+$/.test(handle) ? handle : null;
        }
        return null;
      }
      const first = cleanHandleSegment(segments[0]);
      if (!first || RESERVED_INSTAGRAM_SEGMENTS.has(first.toLowerCase())) return null;
      if (segments.length > 1) return null;
      return /^[a-zA-Z0-9._]+$/.test(first) ? first : null;
    }

    if (platform === 'telegram') {
      const firstRaw = segments[0];
      if (!firstRaw || firstRaw.startsWith('+')) return null;
      const first = cleanHandleSegment(firstRaw);
      if (!first || RESERVED_TELEGRAM_SEGMENTS.has(first.toLowerCase())) return null;
      // Handle t.me/s/<username> public channel preview URL cleanly? Keep strict profile-only unless handle
      if (segments.length > 1) return null;
      return /^[a-zA-Z0-9_]{3,}$/.test(first) ? first : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function getMessageLink(
  partner: Pick<OfficialPartner, 'platform' | 'pageUrl' | 'messageLink'>
): string {
  const override = typeof partner.messageLink === 'string' ? partner.messageLink.trim() : '';
  if (override) {
    const check = validatePartnerUrl(override, partner.platform, { required: false });
    if (check.valid && check.normalizedUrl) {
      return check.normalizedUrl;
    }
  }

  const pageCheck = validatePartnerUrl(partner.pageUrl, partner.platform, { required: true });
  const fallbackUrl = pageCheck.normalizedUrl || partner.pageUrl;
  const username = extractPlatformUsername(fallbackUrl, partner.platform);
  if (!username) {
    return fallbackUrl;
  }

  switch (partner.platform) {
    case 'facebook':
      return `https://m.me/${username}`;
    case 'instagram':
      return `https://ig.me/m/${username}`;
    case 'telegram':
      return `https://t.me/${username}`;
    default:
      return fallbackUrl;
  }
}

export function getPartnerDisplayDomain(pageUrl: string): string {
  try {
    const host = new URL(pageUrl.trim()).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function getPartnerInitials(name: string): string {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'OP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function resolvePartnerIconUrl(iconUrl?: string | null): string | null {
  const check = validatePartnerIconUrl(iconUrl);
  return check.valid ? check.normalizedUrl : null;
}

export interface PartnerInputValidationResult {
  valid: boolean;
  errors: Partial<Record<'name' | 'platform' | 'pageUrl' | 'messageLink' | 'iconUrl' | 'note', string>>;
  normalized?: {
    name: string;
    platform: PartnerPlatform;
    pageUrl: string;
    messageLink: string | null;
    iconUrl: string | null;
    gameId: string | null;
    note: string | null;
    isVisible: boolean;
  };
}

export function validateOfficialPartnerInput(input: OfficialPartnerInput): PartnerInputValidationResult {
  const errors: PartnerInputValidationResult['errors'] = {};

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    errors.name = 'Partner name is required.';
  } else if (name.length > MAX_PARTNER_NAME_LENGTH) {
    errors.name = `Partner name must be ${MAX_PARTNER_NAME_LENGTH} characters or less.`;
  }

  if (!isPartnerPlatform(input.platform)) {
    errors.platform = 'Choose Facebook, Instagram, or Telegram.';
  }
  const platform: PartnerPlatform = isPartnerPlatform(input.platform) ? input.platform : 'facebook';

  const pageUrlCheck = validatePartnerUrl(input.pageUrl, platform, {
    required: true,
    fieldLabel: 'Page URL',
  });
  if (!pageUrlCheck.valid) {
    errors.pageUrl = pageUrlCheck.error;
  }

  const msgLinkCheck = validatePartnerUrl(input.messageLink ?? '', platform, {
    required: false,
    fieldLabel: 'Message link',
  });
  if (!msgLinkCheck.valid) {
    errors.messageLink = msgLinkCheck.error;
  }

  const iconUrlCheck = validatePartnerIconUrl(input.iconUrl ?? '');
  if (!iconUrlCheck.valid) {
    errors.iconUrl = iconUrlCheck.error;
  }

  const rawNote = typeof input.note === 'string' ? input.note.trim() : '';
  if (rawNote.length > MAX_PARTNER_NOTE_LENGTH) {
    errors.note = `Short note must be ${MAX_PARTNER_NOTE_LENGTH} characters or less.`;
  }

  const gameId = typeof input.gameId === 'string' && input.gameId.trim() ? input.gameId.trim() : null;

  if (Object.keys(errors).length > 0 || !pageUrlCheck.normalizedUrl) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    normalized: {
      name,
      platform,
      pageUrl: pageUrlCheck.normalizedUrl,
      messageLink: msgLinkCheck.normalizedUrl,
      iconUrl: iconUrlCheck.normalizedUrl,
      gameId,
      note: rawNote || null,
      isVisible: input.isVisible !== false,
    },
  };
}

export function normalizeOfficialPartnerRow(row: any): OfficialPartner | null {
  if (!row || typeof row !== 'object' || !row.id) return null;
  const platform = isPartnerPlatform(row.platform) ? row.platform : 'facebook';
  return {
    id: String(row.id),
    name: String(row.name || '').trim(),
    iconUrl: row.icon_url ? String(row.icon_url) : row.iconUrl ? String(row.iconUrl) : null,
    platform,
    pageUrl: String(row.page_url ?? row.pageUrl ?? ''),
    messageLink:
      row.message_link != null
        ? String(row.message_link)
        : row.messageLink != null
        ? String(row.messageLink)
        : null,
    gameId: row.game_id != null ? String(row.game_id) : row.gameId != null ? String(row.gameId) : null,
    note: row.note != null ? String(row.note) : null,
    isVisible: typeof row.is_visible === 'boolean' ? row.is_visible : row.isVisible !== false,
    sortOrder: Number.isFinite(Number(row.sort_order ?? row.sortOrder))
      ? Number(row.sort_order ?? row.sortOrder)
      : 0,
    updatedBy: row.updated_by != null ? String(row.updated_by) : row.updatedBy ?? null,
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

export function sortOfficialPartners(
  partners: OfficialPartner[],
  mode: PartnerSortMode = 'manual'
): OfficialPartner[] {
  const copy = [...partners];
  if (mode === 'name_asc') {
    return copy.sort((a, b) => a.name.localeCompare(b.name) || a.sortOrder - b.sortOrder);
  }
  if (mode === 'platform') {
    return copy.sort(
      (a, b) =>
        a.platform.localeCompare(b.platform) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name)
    );
  }
  return copy.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function reorderPartnerList(
  partners: OfficialPartner[],
  sourceId: string,
  targetId: string
): OfficialPartner[] {
  if (!sourceId || !targetId || sourceId === targetId) return partners;
  const sorted = sortOfficialPartners(partners, 'manual');
  const fromIdx = sorted.findIndex((p) => p.id === sourceId);
  const toIdx = sorted.findIndex((p) => p.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return partners;

  const next = [...sorted];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.map((item, idx) => ({ ...item, sortOrder: idx }));
}

export function movePartnerByStep(
  partners: OfficialPartner[],
  partnerId: string,
  direction: 'up' | 'down'
): OfficialPartner[] {
  const sorted = sortOfficialPartners(partners, 'manual');
  const idx = sorted.findIndex((p) => p.id === partnerId);
  if (idx === -1) return partners;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sorted.length) return partners;

  const next = [...sorted];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next.map((item, index) => ({ ...item, sortOrder: index }));
}
