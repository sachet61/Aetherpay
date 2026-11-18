import { PaymentMethodType } from '../types';

export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB pre-compression limit

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'heic',
  'heif',
  'bmp',
  'svg',
]);

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates user-selected image files before canvas compression / upload.
 * Supports mobile browsers (Android Chrome / WebViews) that occasionally omit `file.type`.
 */
export function validateImageFile(
  file: Pick<File, 'name' | 'size' | 'type'> | null | undefined,
  maxBytes: number = MAX_IMAGE_UPLOAD_BYTES
): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file was selected.' };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes). Please select another screenshot.' };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${maxMb} MB.`,
    };
  }

  const mime = String(file.type || '').trim().toLowerCase();
  const extMatch = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  const isMimeImage = mime.startsWith('image/');
  const isExtImage = ext !== '' && ALLOWED_IMAGE_EXTENSIONS.has(ext);

  // If browser reports a non-image MIME (like application/pdf or video/mp4), reject explicitly
  if (mime && !isMimeImage) {
    return {
      valid: false,
      error: 'Unsupported file type. Please choose a PNG, JPG, or WebP screenshot.',
    };
  }

  // If MIME is empty (common in Android file pickers), verify extension
  if (!mime && !isExtImage) {
    return {
      valid: false,
      error: 'Unsupported file format. Please choose a PNG, JPG, or WebP image.',
    };
  }

  return { valid: true };
}

export interface TopUpDraftState {
  fundingMode: 'gateway_payment' | 'referral_rewards';
  selectedGameCatalogId: string;
  selectedMethodType: PaymentMethodType;
  selectedCryptoCoin: 'BTC' | 'ETH' | 'USDT';
  referralAmount: string;
  screenshotUrl: string | null;
  screenshotName: string;
  updatedAt: number;
}

export const TOPUP_DRAFT_PREFIX = 'ss_topup_draft_v1_';
const TOPUP_DRAFT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function getTopUpDraftStorageKey(userId: string): string {
  return `${TOPUP_DRAFT_PREFIX}${userId}`;
}

export function loadTopUpDraft(
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null | undefined,
  userId: string | undefined,
  nowMs: number = Date.now()
): TopUpDraftState | null {
  if (!storage || !userId) return null;
  const key = getTopUpDraftStorageKey(userId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TopUpDraftState>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.updatedAt === 'number' && nowMs - parsed.updatedAt > TOPUP_DRAFT_TTL_MS) {
      storage.removeItem(key);
      return null;
    }

    const screenshotUrl =
      typeof parsed.screenshotUrl === 'string' && parsed.screenshotUrl.length <= 200_000
        ? parsed.screenshotUrl
        : null;

    return {
      fundingMode:
        parsed.fundingMode === 'referral_rewards' ? 'referral_rewards' : 'gateway_payment',
      selectedGameCatalogId:
        typeof parsed.selectedGameCatalogId === 'string' ? parsed.selectedGameCatalogId : '',
      selectedMethodType:
        typeof parsed.selectedMethodType === 'string'
          ? (parsed.selectedMethodType as PaymentMethodType)
          : 'cashapp',
      selectedCryptoCoin:
        parsed.selectedCryptoCoin === 'BTC' ||
        parsed.selectedCryptoCoin === 'ETH' ||
        parsed.selectedCryptoCoin === 'USDT'
          ? parsed.selectedCryptoCoin
          : 'USDT',
      referralAmount: typeof parsed.referralAmount === 'string' ? parsed.referralAmount : '25',
      screenshotUrl,
      screenshotName:
        screenshotUrl && typeof parsed.screenshotName === 'string' ? parsed.screenshotName : '',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : nowMs,
    };
  } catch {
    return null;
  }
}

export function saveTopUpDraft(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  userId: string | undefined,
  draft: Omit<TopUpDraftState, 'updatedAt'> & { updatedAt?: number }
): void {
  if (!storage || !userId) return;
  const key = getTopUpDraftStorageKey(userId);
  try {
    // Avoid exceeding sessionStorage quotas by refusing giant raw data URLs
    const safeUrl =
      draft.screenshotUrl && draft.screenshotUrl.length <= 200_000 ? draft.screenshotUrl : null;
    const payload: TopUpDraftState = {
      fundingMode: draft.fundingMode,
      selectedGameCatalogId: draft.selectedGameCatalogId,
      selectedMethodType: draft.selectedMethodType,
      selectedCryptoCoin: draft.selectedCryptoCoin,
      referralAmount: draft.referralAmount,
      screenshotUrl: safeUrl,
      screenshotName: safeUrl ? draft.screenshotName : '',
      updatedAt: draft.updatedAt ?? Date.now(),
    };
    storage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / private-browsing errors
  }
}

export function clearTopUpDraft(
  storage: Pick<Storage, 'removeItem'> | null | undefined,
  userId: string | undefined
): void {
  if (!storage || !userId) return;
  try {
    storage.removeItem(getTopUpDraftStorageKey(userId));
  } catch {
    // Ignore storage access errors
  }
}
