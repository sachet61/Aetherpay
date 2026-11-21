import {
  ALLOWED_PARTNER_ICON_MIME_TYPES,
  PARTNER_ICON_MAX_BYTES,
  isPartnerPlatform,
  normalizeOfficialPartnerRow,
  validateOfficialPartnerInput,
} from '../src/utils/officialPartnersUtils.js';
import type { OfficialPartner, OfficialPartnerInput } from '../src/types';

export interface OfficialPartnerCallerProfile {
  id: string;
  email?: string;
  displayName: string;
  role: 'admin' | 'agent' | 'customer' | 'anonymous' | string;
  verifiedByJwt: boolean;
  jwtRejected?: boolean;
}

export interface OfficialPartnerAuditInput {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface OfficialPartnerHandlerDeps {
  adminClient: any;
  resolveCaller: (
    adminClient: any,
    context?: { headers?: Record<string, any>; viewerUserId?: string }
  ) => Promise<OfficialPartnerCallerProfile>;
  writeAudit: (adminClient: any, input: OfficialPartnerAuditInput) => Promise<any>;
}

const PARTNER_SELECT_COLUMNS =
  'id, name, icon_url, platform, page_url, message_link, game_id, note, is_visible, sort_order, updated_by, updated_at';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function setNoStoreHeaders(res: any) {
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }
}

function isMissingPartnerTableError(err: any): boolean {
  const code = String(err?.code || '').trim();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('official_partners') && (msg.includes('does not exist') || msg.includes('schema cache'))
  );
}

function toNullableUuid(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = String(val).trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function hasValidImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function looksLikeSvgPayload(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 256).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
}

async function requireAuthenticatedCaller(
  deps: OfficialPartnerHandlerDeps,
  req: any,
  res: any,
  viewerUserId?: string
): Promise<OfficialPartnerCallerProfile | null> {
  const caller = await deps.resolveCaller(deps.adminClient, {
    headers: req?.headers,
    viewerUserId,
  });
  if (caller.jwtRejected) {
    res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    return null;
  }
  if (!caller.id || caller.role === 'anonymous') {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  return caller;
}

async function requireAdminCaller(
  deps: OfficialPartnerHandlerDeps,
  req: any,
  res: any,
  viewerUserId?: string
): Promise<OfficialPartnerCallerProfile | null> {
  const caller = await requireAuthenticatedCaller(deps, req, res, viewerUserId);
  if (!caller) return null;
  if (caller.role !== 'admin') {
    res.status(403).json({
      error: 'Access Denied: Only Platform Administrators can manage Official Partners.',
    });
    return null;
  }
  return caller;
}

export async function ensurePartnerIconsBucket(adminClient: any): Promise<void> {
  if (!adminClient?.storage) return;
  const bucketOptions = {
    public: true,
    fileSizeLimit: PARTNER_ICON_MAX_BYTES,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  };

  try {
    const { data: existingBuckets } = await adminClient.storage.listBuckets();
    const exists = (existingBuckets || []).find((b: any) => b.name === 'partner-icons');
    if (!exists) {
      await adminClient.storage.createBucket('partner-icons', bucketOptions).catch(() => {});
    } else if (typeof adminClient.storage.updateBucket === 'function') {
      await adminClient.storage.updateBucket('partner-icons', bucketOptions).catch(() => {});
    }
  } catch {
    // Non-fatal; subsequent upload surfaces any real storage error cleanly
  }
}

export async function handleGetOfficialPartners(
  deps: OfficialPartnerHandlerDeps,
  parsedUrl: URL,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const viewerUserId = parsedUrl.searchParams.get('userId') || undefined;
    const caller = await requireAuthenticatedCaller(deps, req, res, viewerUserId);
    if (!caller) return;

    const includeHidden =
      parsedUrl.searchParams.get('includeHidden') === '1' ||
      parsedUrl.searchParams.get('scope') === 'admin';

    if (includeHidden && caller.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied: Only Administrators can view hidden partners.',
      });
    }

    let query = deps.adminClient
      .from('official_partners')
      .select(PARTNER_SELECT_COLUMNS);

    if (!includeHidden) {
      query = query.eq('is_visible', true);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(200);

    if (error) {
      if (isMissingPartnerTableError(error)) {
        return res.status(503).json({
          error: 'Official Partners database table is not provisioned yet. Apply the Official Partners SQL migration first.',
          code: 'PARTNERS_SCHEMA_MISSING',
        });
      }
      return res.status(500).json({ error: error.message || 'Failed to load official partners.' });
    }

    const partners: OfficialPartner[] = (data || [])
      .map((row: any) => normalizeOfficialPartnerRow(row))
      .filter((p: OfficialPartner | null): p is OfficialPartner => Boolean(p));

    return res.status(200).json({
      success: true,
      partners,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load official partners.' });
  }
}

export async function handleCreateOfficialPartner(
  deps: OfficialPartnerHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await requireAdminCaller(deps, req, res, body?.actingUserId);
    if (!caller) return;

    const input: OfficialPartnerInput = {
      name: body?.name,
      iconUrl: body?.iconUrl ?? body?.icon_url ?? null,
      platform: body?.platform,
      pageUrl: body?.pageUrl ?? body?.page_url,
      messageLink: body?.messageLink ?? body?.message_link ?? null,
      gameId: body?.gameId ?? body?.game_id ?? null,
      note: body?.note ?? null,
      isVisible: typeof body?.isVisible === 'boolean' ? body.isVisible : body?.is_visible !== false,
    };

    const validation = validateOfficialPartnerInput(input);
    if (!validation.valid || !validation.normalized) {
      const firstError =
        Object.values(validation.errors).find(Boolean) || 'Invalid official partner details.';
      return res.status(400).json({
        error: firstError,
        fieldErrors: validation.errors,
      });
    }

    const { data: maxRows, error: maxErr } = await deps.adminClient
      .from('official_partners')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    if (maxErr) {
      if (isMissingPartnerTableError(maxErr)) {
        return res.status(503).json({
          error: 'Official Partners database table is not provisioned yet.',
          code: 'PARTNERS_SCHEMA_MISSING',
        });
      }
      return res.status(500).json({ error: maxErr.message || 'Failed to compute partner sort order.' });
    }

    const currentMax = Number.isFinite(Number(maxRows?.[0]?.sort_order))
      ? Number(maxRows[0].sort_order)
      : -1;
    const nextSortOrder = currentMax + 1;
    const nowIso = new Date().toISOString();
    const norm = validation.normalized;

    const { data: inserted, error: insertErr } = await deps.adminClient
      .from('official_partners')
      .insert({
        name: norm.name,
        icon_url: norm.iconUrl,
        platform: norm.platform,
        page_url: norm.pageUrl,
        message_link: norm.messageLink,
        game_id: norm.gameId,
        note: norm.note,
        is_visible: norm.isVisible,
        sort_order: nextSortOrder,
        updated_by: toNullableUuid(caller.id),
        updated_at: nowIso,
      })
      .select(PARTNER_SELECT_COLUMNS)
      .single();

    if (insertErr || !inserted) {
      return res.status(400).json({ error: insertErr?.message || 'Failed to create official partner.' });
    }

    const partner = normalizeOfficialPartnerRow(inserted)!;
    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'PARTNER_CREATED',
      entityType: 'official_partner',
      entityId: partner.id,
      details: `Created official partner "${partner.name}" (${partner.platform}) with visibility=${partner.isVisible}.`,
    });

    return res.status(201).json({ success: true, partner });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create official partner.' });
  }
}

export async function handleUpdateOfficialPartner(
  deps: OfficialPartnerHandlerDeps,
  partnerId: string,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await requireAdminCaller(deps, req, res, body?.actingUserId);
    if (!caller) return;

    if (!UUID_REGEX.test(String(partnerId || '').trim())) {
      return res.status(400).json({ error: 'Invalid official partner identifier.' });
    }

    const { data: existingRow, error: fetchErr } = await deps.adminClient
      .from('official_partners')
      .select(PARTNER_SELECT_COLUMNS)
      .eq('id', partnerId)
      .maybeSingle();

    if (fetchErr) {
      if (isMissingPartnerTableError(fetchErr)) {
        return res.status(503).json({
          error: 'Official Partners database table is not provisioned yet.',
          code: 'PARTNERS_SCHEMA_MISSING',
        });
      }
      return res.status(500).json({ error: fetchErr.message || 'Failed to fetch official partner.' });
    }

    if (!existingRow) {
      return res.status(404).json({ error: 'Official partner not found.' });
    }

    const existing = normalizeOfficialPartnerRow(existingRow)!;

    const hasOwn = (k: string) => Object.prototype.hasOwnProperty.call(body || {}, k);
    const mergedInput: OfficialPartnerInput = {
      name: hasOwn('name') ? body.name : existing.name,
      iconUrl: hasOwn('iconUrl')
        ? body.iconUrl
        : hasOwn('icon_url')
        ? body.icon_url
        : existing.iconUrl,
      platform: hasOwn('platform') ? body.platform : existing.platform,
      pageUrl: hasOwn('pageUrl')
        ? body.pageUrl
        : hasOwn('page_url')
        ? body.page_url
        : existing.pageUrl,
      messageLink: hasOwn('messageLink')
        ? body.messageLink
        : hasOwn('message_link')
        ? body.message_link
        : existing.messageLink,
      gameId: hasOwn('gameId')
        ? body.gameId
        : hasOwn('game_id')
        ? body.game_id
        : existing.gameId,
      note: hasOwn('note') ? body.note : existing.note,
      isVisible: hasOwn('isVisible')
        ? Boolean(body.isVisible)
        : hasOwn('is_visible')
        ? Boolean(body.is_visible)
        : existing.isVisible,
    };

    if (!isPartnerPlatform(mergedInput.platform)) {
      return res.status(400).json({ error: 'Platform must be facebook, instagram, or telegram.' });
    }

    const validation = validateOfficialPartnerInput(mergedInput);
    if (!validation.valid || !validation.normalized) {
      const firstError =
        Object.values(validation.errors).find(Boolean) || 'Invalid official partner details.';
      return res.status(400).json({
        error: firstError,
        fieldErrors: validation.errors,
      });
    }

    const norm = validation.normalized;
    const { data: updatedRow, error: updateErr } = await deps.adminClient
      .from('official_partners')
      .update({
        name: norm.name,
        icon_url: norm.iconUrl,
        platform: norm.platform,
        page_url: norm.pageUrl,
        message_link: norm.messageLink,
        game_id: norm.gameId,
        note: norm.note,
        is_visible: norm.isVisible,
        updated_by: toNullableUuid(caller.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', partnerId)
      .select(PARTNER_SELECT_COLUMNS)
      .single();

    if (updateErr || !updatedRow) {
      return res.status(400).json({ error: updateErr?.message || 'Failed to update official partner.' });
    }

    const partner = normalizeOfficialPartnerRow(updatedRow)!;
    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'PARTNER_UPDATED',
      entityType: 'official_partner',
      entityId: partner.id,
      details: `Updated official partner "${partner.name}" (${partner.platform}, visible=${partner.isVisible}).`,
    });

    return res.status(200).json({ success: true, partner });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update official partner.' });
  }
}

export async function handleReorderOfficialPartners(
  deps: OfficialPartnerHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await requireAdminCaller(deps, req, res, body?.actingUserId);
    if (!caller) return;

    const rawIds: unknown[] = Array.isArray(body?.orderedIds) ? body.orderedIds : [];
    const orderedIds = rawIds.map((id) => String(id || '').trim()).filter(Boolean);

    if (orderedIds.length === 0 || orderedIds.length > 200) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array of partner IDs.' });
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return res.status(400).json({ error: 'orderedIds cannot contain duplicates.' });
    }
    if (orderedIds.some((id) => !UUID_REGEX.test(id))) {
      return res.status(400).json({ error: 'All partner IDs must be valid UUIDs.' });
    }

    const nowIso = new Date().toISOString();
    const updatedByUuid = toNullableUuid(caller.id);

    for (let index = 0; index < orderedIds.length; index++) {
      const id = orderedIds[index];
      const { error } = await deps.adminClient
        .from('official_partners')
        .update({
          sort_order: index,
          updated_by: updatedByUuid,
          updated_at: nowIso,
        })
        .eq('id', id);

      if (error) {
        if (isMissingPartnerTableError(error)) {
          return res.status(503).json({
            error: 'Official Partners database table is not provisioned yet.',
            code: 'PARTNERS_SCHEMA_MISSING',
          });
        }
        return res.status(500).json({ error: error.message || 'Failed to save partner order.' });
      }
    }

    const { data: refreshed, error: listErr } = await deps.adminClient
      .from('official_partners')
      .select(PARTNER_SELECT_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(200);

    if (listErr) {
      return res.status(500).json({ error: listErr.message || 'Order updated but failed to reload partners.' });
    }

    const partners: OfficialPartner[] = (refreshed || [])
      .map((row: any) => normalizeOfficialPartnerRow(row))
      .filter((p: OfficialPartner | null): p is OfficialPartner => Boolean(p));

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'PARTNER_REORDERED',
      entityType: 'official_partner',
      entityId: orderedIds[0],
      details: `Reordered ${orderedIds.length} official partners.`,
    });

    return res.status(200).json({ success: true, partners });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to reorder official partners.' });
  }
}

export async function handleDeleteOfficialPartner(
  deps: OfficialPartnerHandlerDeps,
  partnerId: string,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await requireAdminCaller(deps, req, res, body?.actingUserId);
    if (!caller) return;

    if (!UUID_REGEX.test(String(partnerId || '').trim())) {
      return res.status(400).json({ error: 'Invalid official partner identifier.' });
    }

    const { data: existing, error: fetchErr } = await deps.adminClient
      .from('official_partners')
      .select('id, name, platform')
      .eq('id', partnerId)
      .maybeSingle();

    if (fetchErr) {
      if (isMissingPartnerTableError(fetchErr)) {
        return res.status(503).json({
          error: 'Official Partners database table is not provisioned yet.',
          code: 'PARTNERS_SCHEMA_MISSING',
        });
      }
      return res.status(500).json({ error: fetchErr.message || 'Failed to locate partner.' });
    }

    if (!existing) {
      return res.status(404).json({ error: 'Official partner not found.' });
    }

    const { error: delErr } = await deps.adminClient
      .from('official_partners')
      .delete()
      .eq('id', partnerId);

    if (delErr) {
      return res.status(500).json({ error: delErr.message || 'Failed to delete official partner.' });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'PARTNER_DELETED',
      entityType: 'official_partner',
      entityId: partnerId,
      details: `Deleted official partner "${existing.name}" (${existing.platform}).`,
    });

    return res.status(200).json({ success: true, id: partnerId });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete official partner.' });
  }
}

export async function handleUploadOfficialPartnerIcon(
  deps: OfficialPartnerHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await requireAdminCaller(deps, req, res, body?.actingUserId);
    if (!caller) return;

    const rawMime = String(body?.contentType || '').trim().toLowerCase();
    const rawName = String(body?.fileName || '').trim().toLowerCase();
    const fileBase64 = String(body?.fileBase64 || '').trim();

    if (!fileBase64) {
      return res.status(400).json({ error: 'Icon image data is required.' });
    }

    if (rawMime === 'image/svg+xml' || rawName.endsWith('.svg')) {
      return res.status(400).json({ error: 'SVG icons are not allowed. Use PNG, JPG, or WebP.' });
    }

    if (!ALLOWED_PARTNER_ICON_MIME_TYPES.has(rawMime)) {
      return res.status(400).json({ error: 'Only PNG, JPG, and WebP icons are allowed.' });
    }

    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (!buffer.length) {
      return res.status(400).json({ error: 'Uploaded icon file is empty.' });
    }

    if (buffer.length > PARTNER_ICON_MAX_BYTES) {
      return res.status(400).json({
        error: 'Icon exceeds the 512 KB maximum size limit.',
      });
    }

    if (looksLikeSvgPayload(buffer) || !hasValidImageMagicBytes(buffer, rawMime)) {
      return res.status(400).json({
        error: 'File contents do not match a valid PNG, JPG, or WebP image.',
      });
    }

    await ensurePartnerIconsBucket(deps.adminClient);

    const ext = rawMime === 'image/png' ? 'png' : rawMime === 'image/webp' ? 'webp' : 'jpg';
    const safePrefix = String(body?.fileName || 'partner_icon')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'partner_icon';
    const filePath = `icons/${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { data, error } = await deps.adminClient.storage
      .from('partner-icons')
      .upload(filePath, buffer, {
        contentType: rawMime,
        upsert: true,
        cacheControl: '604800',
      });

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to store partner icon.' });
    }

    const storedPath = data?.path || filePath;
    const { data: urlData } = deps.adminClient.storage
      .from('partner-icons')
      .getPublicUrl(storedPath);

    return res.status(200).json({
      success: true,
      url: urlData?.publicUrl || '',
      path: storedPath,
      size: buffer.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Partner icon upload failed.' });
  }
}
