import { AuditLog, UserRole } from '../types';

export type AuditEntityFilter =
  | 'all'
  | 'topup'
  | 'withdrawal'
  | 'wallet'
  | 'game_account'
  | 'settings'
  | 'user'
  | 'chat'
  | 'auth';

export interface AuditFilterOptions {
  entityType?: string;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
}

const VALID_ROLES = new Set<UserRole>(['customer', 'agent', 'admin']);

export function normalizeAuditActorRole(rawRole: unknown): UserRole {
  const normalized = String(rawRole || '').trim().toLowerCase() as UserRole;
  return VALID_ROLES.has(normalized) ? normalized : 'customer';
}

export function normalizeAuditLogRow(raw: any): AuditLog | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || '').trim();
  if (!id) return null;

  const actorId = String(raw.actor_id ?? raw.actorId ?? raw.user_id ?? raw.userId ?? 'system').trim() || 'system';
  const actorName =
    String(raw.actor_name ?? raw.actorName ?? raw.user_email ?? raw.userEmail ?? 'System').trim() || 'System';
  const actorRole = normalizeAuditActorRole(raw.actor_role ?? raw.actorRole ?? (actorId === 'system' ? 'admin' : 'customer'));
  const action = String(raw.action || 'UNKNOWN_ACTION').trim() || 'UNKNOWN_ACTION';
  const entityTypeRaw = String(raw.entity_type ?? raw.entityType ?? 'settings').trim().toLowerCase();
  const allowedEntities = new Set(['topup', 'withdrawal', 'wallet', 'game_account', 'settings', 'user', 'chat', 'auth']);
  const entityType = (allowedEntities.has(entityTypeRaw) ? entityTypeRaw : 'settings') as AuditLog['entityType'];
  const entityId = String(raw.entity_id ?? raw.entityId ?? '').trim();
  const details = String(raw.details ?? '').trim();
  const rawTs = raw.timestamp ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString();
  const parsedMs = Date.parse(String(rawTs));
  const timestamp = Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : new Date().toISOString();

  return {
    id,
    actorId,
    actorName,
    actorRole,
    action,
    entityType,
    entityId,
    details,
    timestamp,
  };
}

export function sortAuditLogsDesc(logs: AuditLog[]): AuditLog[] {
  return [...logs].sort((a, b) => {
    const tA = Date.parse(a.timestamp || '') || 0;
    const tB = Date.parse(b.timestamp || '') || 0;
    if (tB !== tA) return tB - tA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

export function mergeAuditLogs(
  existing: AuditLog[],
  incoming: AuditLog[],
  options?: { replace?: boolean; maxItems?: number }
): AuditLog[] {
  const byId = new Map<string, AuditLog>();
  if (!options?.replace) {
    for (const item of existing || []) {
      if (item?.id) byId.set(item.id, item);
    }
  }
  for (const item of incoming || []) {
    if (item?.id) byId.set(item.id, item);
  }
  const sorted = sortAuditLogsDesc(Array.from(byId.values()));
  if (options?.maxItems && options.maxItems > 0 && sorted.length > options.maxItems) {
    return sorted.slice(0, options.maxItems);
  }
  return sorted;
}

export function filterAuditLogs(logs: AuditLog[], filters: AuditFilterOptions): AuditLog[] {
  const entityType = (filters.entityType || 'all').trim().toLowerCase();
  const q = (filters.searchTerm || '').trim().toLowerCase();
  const fromMs = filters.fromDate ? Date.parse(`${filters.fromDate}T00:00:00.000Z`) : NaN;
  const toMs = filters.toDate ? Date.parse(`${filters.toDate}T23:59:59.999Z`) : NaN;

  return (logs || []).filter((log) => {
    if (entityType !== 'all' && String(log.entityType || '').toLowerCase() !== entityType) {
      return false;
    }

    const logMs = Date.parse(log.timestamp || '');
    if (Number.isFinite(fromMs) && (!Number.isFinite(logMs) || logMs < fromMs)) {
      return false;
    }
    if (Number.isFinite(toMs) && (!Number.isFinite(logMs) || logMs > toMs)) {
      return false;
    }

    if (q) {
      const haystack = [
        log.id,
        log.action,
        log.actorName,
        log.actorId,
        log.actorRole,
        log.entityType,
        log.entityId,
        log.details,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildAuditCsv(logs: AuditLog[]): string {
  const headers = ['Log ID', 'Timestamp', 'Actor ID', 'Actor Name', 'Actor Role', 'Action', 'Entity Type', 'Entity ID', 'Details'];
  const rows = (logs || []).map((l) => [
    escapeCsvCell(l.id),
    escapeCsvCell(new Date(l.timestamp).toISOString()),
    escapeCsvCell(l.actorId),
    escapeCsvCell(l.actorName),
    escapeCsvCell(l.actorRole),
    escapeCsvCell(l.action),
    escapeCsvCell(l.entityType),
    escapeCsvCell(l.entityId),
    escapeCsvCell(l.details),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
