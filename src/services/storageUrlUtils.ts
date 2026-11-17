export interface StorageLocation {
  bucket: string;
  path: string;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Parses a JSONB field that may arrive as either an object or a serialized JSON string.
 */
export function parseTransactionDataField(raw: unknown): Record<string, any> | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, any>;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Extracts Supabase Storage bucket & object path from:
 * - Proxy URLs: /api/storage/file?bucket=...&path=... or /api/storage/file?url=...
 * - Supabase Storage URLs: .../storage/v1/object/(public|sign|authenticated)/<bucket>/<path>?...
 */
export function extractStorageLocation(rawUrl?: string | null, depth: number = 0): StorageLocation | null {
  if (!rawUrl || typeof rawUrl !== 'string' || depth > 2) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return null;
  }

  // 1. Proxy URL format (/api/storage/file?...)
  if (trimmed.includes('/api/storage/file')) {
    try {
      const parsed = new URL(trimmed, 'https://localhost');
      const paramPath = (parsed.searchParams.get('path') || '').replace(/^\/+/, '');
      const paramBucket = (parsed.searchParams.get('bucket') || 'chat_attachments').trim();
      const paramUrl = (parsed.searchParams.get('url') || '').trim();

      if (paramPath) {
        return {
          bucket: safeDecodeURIComponent(paramBucket) || 'chat_attachments',
          path: safeDecodeURIComponent(paramPath).split('?')[0].split('#')[0],
        };
      }
      if (paramUrl) {
        return extractStorageLocation(paramUrl, depth + 1);
      }
    } catch {
      return null;
    }
  }

  // 2. Supabase Storage object URL format (public, sign, authenticated)
  const match = trimmed.match(/\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i);
  if (match) {
    const bucket = safeDecodeURIComponent(match[1]).trim();
    const path = safeDecodeURIComponent(match[2]).replace(/^\/+/, '').trim();
    if (bucket && path) {
      return { bucket, path };
    }
  }

  return null;
}

/**
 * Builds a canonical same-origin proxy URL served by /api/storage/file.
 */
export function buildProxyStorageUrl(bucket: string, path: string): string {
  const cleanBucket = (bucket || 'chat_attachments').trim();
  const cleanPath = (path || '').replace(/^\/+/, '').trim();
  return `/api/storage/file?bucket=${encodeURIComponent(cleanBucket)}&path=${encodeURIComponent(cleanPath)}`;
}

/**
 * Normalizes any Supabase Storage URL (or nested proxy URL) into a same-origin
 * /api/storage/file?bucket=...&path=... proxy URL.
 * External non-Supabase URLs and data: URIs are returned unchanged.
 */
export function toProxyStorageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  const loc = extractStorageLocation(trimmed);
  if (loc) {
    return buildProxyStorageUrl(loc.bucket, loc.path);
  }
  return trimmed;
}

/**
 * Converts a proxy URL or storage URL back into a direct Supabase public URL (secondary fallback).
 */
export function toDirectSupabaseStorageUrl(rawUrl?: string | null, supabaseBaseUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string' || !supabaseBaseUrl) return undefined;
  const loc = extractStorageLocation(rawUrl);
  if (!loc) return undefined;

  const base = supabaseBaseUrl.trim().replace(/\/+$/, '');
  if (!base.startsWith('http')) return undefined;

  const encodedPath = loc.path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base}/storage/v1/object/public/${encodeURIComponent(loc.bucket)}/${encodedPath}`;
}
