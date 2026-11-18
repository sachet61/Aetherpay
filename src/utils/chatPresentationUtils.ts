import type { ChatMessage, SupportConversation } from '../types';

export const CHAT_QUICK_EMOJIS = [
  '👋',
  '👍',
  '🙏',
  '✅',
  '🎉',
  '💰',
  '🎮',
  '🔥',
  '😊',
  '👌',
  '⏳',
  '🔒',
] as const;

export function isMessageInternalNote(msg?: Partial<ChatMessage> | Record<string, any> | null): boolean {
  if (!msg || typeof msg !== 'object') return false;
  const tx = (msg as any).transactionData ?? (msg as any).transaction_data;
  let parsedTx: Record<string, any> | undefined;
  if (tx && typeof tx === 'object') {
    parsedTx = tx;
  } else if (typeof tx === 'string' && tx.trim().startsWith('{')) {
    try {
      parsedTx = JSON.parse(tx);
    } catch {
      parsedTx = undefined;
    }
  }
  return Boolean(
    (msg as any).isInternalNote ||
      (msg as any).is_internal_note ||
      parsedTx?.isInternalNote ||
      parsedTx?.is_internal_note
  );
}

/**
 * Role-based message visibility filter.
 * Fails closed: only verified staff roles ('agent' | 'admin') may view internal notes.
 */
export function filterVisibleMessagesForRole(
  messages: ChatMessage[],
  viewerRole?: string | null
): ChatMessage[] {
  const isStaff = viewerRole === 'agent' || viewerRole === 'admin';
  if (isStaff) return messages;
  return (messages || []).filter((m) => !isMessageInternalNote(m));
}

export function getInitials(name?: string | null): string {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function getLocalDateKey(isoOrTs?: string | number | null): string {
  const d = isoOrTs ? new Date(isoOrTs) : new Date();
  if (Number.isNaN(d.getTime())) return 'unknown';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatChatDateDivider(isoOrTs?: string | number | null, now: Date = new Date()): string {
  const d = isoOrTs ? new Date(isoOrTs) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Messages';

  const todayKey = getLocalDateKey(now.getTime());
  const msgKey = getLocalDateKey(d.getTime());
  if (msgKey === todayKey) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (msgKey === getLocalDateKey(yesterday.getTime())) return 'Yesterday';

  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatChatTime(isoOrTs?: string | number | null): string {
  if (!isoOrTs) return '';
  const d = new Date(isoOrTs);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatConversationTimestamp(
  isoOrTs?: string | number | null,
  now: Date = new Date()
): string {
  if (!isoOrTs) return '';
  const d = new Date(isoOrTs);
  if (Number.isNaN(d.getTime())) return '';

  const todayKey = getLocalDateKey(now.getTime());
  const msgKey = getLocalDateKey(d.getTime());
  if (msgKey === todayKey) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (msgKey === getLocalDateKey(yesterday.getTime())) {
    return 'Yesterday';
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays >= 0 && diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export interface GroupedChatMessage {
  message: ChatMessage;
  showDateDivider: boolean;
  dateLabel: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function buildGroupedMessages(
  messages: ChatMessage[],
  now: Date = new Date()
): GroupedChatMessage[] {
  const list = messages || [];
  const result: GroupedChatMessage[] = [];

  for (let i = 0; i < list.length; i++) {
    const curr = list[i];
    const prev = i > 0 ? list[i - 1] : undefined;
    const next = i < list.length - 1 ? list[i + 1] : undefined;

    const currDateKey = getLocalDateKey(curr.createdAt);
    const prevDateKey = prev ? getLocalDateKey(prev.createdAt) : '';
    const nextDateKey = next ? getLocalDateKey(next.createdAt) : '';
    const showDateDivider = !prev || currDateKey !== prevDateKey;

    const currIsNote = isMessageInternalNote(curr);
    const prevIsNote = prev ? isMessageInternalNote(prev) : false;
    const nextIsNote = next ? isMessageInternalNote(next) : false;

    const currTs = Date.parse(curr.createdAt || '') || 0;
    const prevTs = prev ? Date.parse(prev.createdAt || '') || 0 : 0;
    const nextTs = next ? Date.parse(next.createdAt || '') || 0 : 0;

    const samePrevSender =
      Boolean(prev) &&
      !showDateDivider &&
      !currIsNote &&
      !prevIsNote &&
      prev?.senderRole === curr.senderRole &&
      (prev?.senderId || prev?.senderName) === (curr.senderId || curr.senderName) &&
      Math.abs(currTs - prevTs) <= GROUP_WINDOW_MS;

    const sameNextSender =
      Boolean(next) &&
      currDateKey === nextDateKey &&
      !currIsNote &&
      !nextIsNote &&
      next?.senderRole === curr.senderRole &&
      (next?.senderId || next?.senderName) === (curr.senderId || curr.senderName) &&
      Math.abs(nextTs - currTs) <= GROUP_WINDOW_MS;

    result.push({
      message: curr,
      showDateDivider,
      dateLabel: formatChatDateDivider(curr.createdAt, now),
      isFirstInGroup: !samePrevSender,
      isLastInGroup: !sameNextSender,
    });
  }

  return result;
}

export type TicketStatusValue = 'open' | 'pending' | 'resolved' | 'closed';

export function normalizeTicketStatus(status?: string | null): TicketStatusValue {
  const clean = (status || '').trim().toLowerCase();
  if (clean === 'pending' || clean === 'resolved' || clean === 'closed') {
    return clean;
  }
  return 'open';
}

export function getTicketStatusMeta(status?: string | null): {
  value: TicketStatusValue;
  label: string;
  pillClass: string;
  dotClass: string;
} {
  const value = normalizeTicketStatus(status);
  switch (value) {
    case 'pending':
      return {
        value,
        label: 'Pending',
        pillClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/20',
        dotClass: 'bg-amber-400',
      };
    case 'resolved':
      return {
        value,
        label: 'Resolved',
        pillClass: 'bg-[#5036F5]/20 text-indigo-200 border-[#5036F5]/45 hover:bg-[#5036F5]/30',
        dotClass: 'bg-indigo-400',
      };
    case 'closed':
      return {
        value,
        label: 'Closed',
        pillClass: 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800',
        dotClass: 'bg-slate-400',
      };
    case 'open':
    default:
      return {
        value: 'open',
        label: 'Open',
        pillClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25',
        dotClass: 'bg-emerald-400',
      };
  }
}

export function deriveTruthfulConnectionStatus(params: {
  browserOnline: boolean;
  syncStatus?: 'connected' | 'syncing' | 'sleeping' | 'error' | string;
  realtimeStatus?: string;
}): { isOnline: boolean; label: string; dotColorClass: string } {
  if (!params.browserOnline) {
    return { isOnline: false, label: 'Offline', dotColorClass: 'bg-slate-500' };
  }
  if (params.syncStatus === 'error' || params.realtimeStatus === 'CHANNEL_ERROR' || params.realtimeStatus === 'CLOSED') {
    return { isOnline: false, label: 'Reconnecting...', dotColorClass: 'bg-amber-400' };
  }
  if (params.syncStatus === 'syncing') {
    return { isOnline: true, label: 'Online', dotColorClass: 'bg-emerald-400' };
  }
  return { isOnline: true, label: 'Online', dotColorClass: 'bg-emerald-400' };
}

export function formatTicketTag(conversation?: Pick<SupportConversation, 'id'> | null): string {
  const id = conversation?.id || '';
  if (!id) return '#SUPPORT';
  const suffix = id.slice(-4).toUpperCase();
  return `#${suffix}`;
}
