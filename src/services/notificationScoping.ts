import { ChatMessage, UserProfile } from '../types';

export function resolveCanonicalConversationId(conversationId: string): string {
  const trimmed = String(conversationId || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('conv_') ? trimmed : `conv_${trimmed}`;
}

function isRowInternalNote(row: any): boolean {
  if (!row || typeof row !== 'object') return false;
  let tx = row.transaction_data ?? row.transactionData;
  if (typeof tx === 'string') {
    try {
      tx = JSON.parse(tx);
    } catch {
      tx = null;
    }
  }
  return Boolean(
    row.is_internal_note ||
      row.isInternalNote ||
      tx?.isInternalNote ||
      tx?.is_internal_note
  );
}

const PUBLIC_REALTIME_TABLES = new Set(['faked_cashouts', 'app_config']);

/**
 * Filters raw Supabase Realtime postgres_changes rows strictly by the active logged-in user.
 * - When logged out (`activeUser === null`): drops all private/user tables completely.
 * - When logged in as customer: keeps ONLY rows owned by `activeUser.id` (and drops internal notes).
 * - When logged in as agent/admin: allows staff tables (still gating `audit_logs` to admin).
 */
export function filterRealtimeRowsForUser(
  table: string,
  rows: any[] | undefined,
  activeUser: Pick<UserProfile, 'id' | 'role'> | null | undefined
): any[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (PUBLIC_REALTIME_TABLES.has(table)) {
    return rows;
  }

  if (!activeUser || !activeUser.id) {
    return [];
  }

  const isStaff = activeUser.role === 'agent' || activeUser.role === 'admin';
  if (isStaff) {
    if (table === 'audit_logs' && activeUser.role !== 'admin') {
      return [];
    }
    return rows;
  }

  // Customer strict isolation
  const uid = activeUser.id;
  const canonicalConvId = `conv_${uid}`;

  switch (table) {
    case 'messages':
      return rows.filter((r) => {
        if (!r || isRowInternalNote(r)) return false;
        const convId = String(r.conversation_id || '').trim();
        return convId === canonicalConvId || convId === uid;
      });
    case 'conversations':
      return rows.filter((r) => {
        if (!r) return false;
        return r.customer_id === uid || r.id === canonicalConvId || r.id === uid;
      });
    case 'topups':
    case 'withdrawals':
    case 'transactions':
    case 'wallets':
    case 'game_accounts':
      return rows.filter((r) => Boolean(r && r.customer_id === uid));
    case 'users':
      return rows.filter((r) => Boolean(r && r.id === uid));
    case 'referral_awards':
      return rows.filter((r) => Boolean(r && (r.referrer_id === uid || r.referred_user_id === uid)));
    case 'audit_logs':
      return [];
    default:
      return [];
  }
}

/**
 * Determines whether an incoming ChatMessage belongs to the currently authenticated user's session
 * and should be cached or trigger UI/sound/desktop alerts.
 */
export function shouldAcceptIncomingChatMessage(
  msg: Partial<ChatMessage> | null | undefined,
  activeUser: Pick<UserProfile, 'id' | 'role'> | null | undefined,
  options?: { forNotificationAlert?: boolean }
): boolean {
  if (!msg || !msg.id || !msg.conversationId) return false;
  if (!activeUser || !activeUser.id) return false;

  const isCustomer = activeUser.role === 'customer';
  const isStaff = activeUser.role === 'agent' || activeUser.role === 'admin';
  if (!isCustomer && !isStaff) return false;

  const canonicalMsgConv = resolveCanonicalConversationId(msg.conversationId);

  if (isCustomer) {
    if (canonicalMsgConv !== `conv_${activeUser.id}`) return false;
    if (msg.isInternalNote) return false;
    if (options?.forNotificationAlert) {
      if (msg.senderId === activeUser.id || msg.senderRole === 'customer') return false;
    }
    return true;
  }

  // Staff user
  if (options?.forNotificationAlert) {
    if (msg.senderId === activeUser.id) return false;
    if (msg.senderRole !== 'customer') return false;
    return true;
  }
  return true;
}

export const globalNotificationAlertIds = new Set<string>();

