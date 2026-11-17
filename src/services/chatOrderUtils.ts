import type { ChatMessage } from '../types';
import { parseTransactionDataField, toProxyStorageUrl } from './storageUrlUtils';

export function isBotGreetingMessage(content?: string, senderName?: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  return (
    lower.includes('welcome to swift sweeps support') ||
    lower.includes('treasury and gaming care specialists assist you today') ||
    (senderName === 'Sarah Lin' && lower.includes('welcome'))
  );
}

export function resolveCanonicalConversationId(conversationId?: string, customerId?: string): string {
  if (customerId && customerId.trim()) {
    return `conv_${customerId.trim()}`;
  }
  const raw = (conversationId || '').trim();
  if (!raw) return '';
  if (raw.startsWith('conv_cust_')) {
    return `conv_${raw.slice('conv_cust_'.length)}`;
  }
  return raw.startsWith('conv_') ? raw : `conv_${raw}`;
}

export function extractAttachmentMetadata(row: any): { url?: string; name?: string } {
  const txData = parseTransactionDataField(row?.transaction_data ?? row?.transactionData);
  const rawUrl =
    row?.attachment_url ||
    row?.attachmentUrl ||
    txData?.attachmentUrl ||
    txData?.attachment_url ||
    txData?.proofUrl ||
    txData?.proof_url ||
    txData?.receiptUrl ||
    txData?.receipt_url ||
    txData?.imageUrl ||
    txData?.image_url ||
    row?.proof_url ||
    undefined;

  const url = typeof rawUrl === 'string' && rawUrl.trim()
    ? toProxyStorageUrl(rawUrl) || rawUrl.trim()
    : undefined;

  const name =
    row?.attachment_name ||
    row?.attachmentName ||
    txData?.attachmentName ||
    txData?.attachment_name ||
    txData?.proofName ||
    txData?.proof_name ||
    txData?.fileName ||
    (url ? 'Attached image' : undefined);

  return { url, name };
}

function normalizeTransactionDataUrls(txData: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!txData) return undefined;
  const normalized: Record<string, any> = { ...txData };
  for (const field of ['attachmentUrl', 'proofUrl', 'receiptUrl', 'imageUrl'] as const) {
    if (typeof normalized[field] === 'string' && normalized[field].trim()) {
      normalized[field] = toProxyStorageUrl(normalized[field]) || normalized[field].trim();
    }
  }
  return normalized;
}

export function mapDbMessageRowToChatMessage(row: any, overrideConversationId?: string): ChatMessage {
  const { url, name } = extractAttachmentMetadata(row);
  const rawTxData = parseTransactionDataField(row?.transaction_data ?? row?.transactionData);
  const txData = normalizeTransactionDataUrls(rawTxData);
  const resolvedConvId = overrideConversationId || resolveCanonicalConversationId(row?.conversation_id || row?.conversationId);

  return {
    id: row.id,
    conversationId: resolvedConvId,
    senderId: row.sender_id ?? row.senderId,
    senderName: row.sender_name ?? row.senderName ?? 'User',
    senderRole: row.sender_role ?? row.senderRole ?? 'customer',
    text: row.content ?? row.text ?? '',
    attachmentUrl: url,
    attachmentName: name,
    isInternalNote: Boolean(row.is_internal_note ?? row.isInternalNote ?? txData?.isInternalNote ?? false),
    transactionData: txData as any,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    isRead: true,
    deliveryStatus: 'sent',
  };
}

export function compareMessagesChronologically(a: ChatMessage, b: ChatMessage): number {
  const timeA = Date.parse(a.createdAt || '') || 0;
  const timeB = Date.parse(b.createdAt || '') || 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function mergeSingleMessage(existing: ChatMessage | undefined, incoming: ChatMessage): ChatMessage {
  if (!existing) return incoming;
  // Prefer confirmed ('sent') status over transient optimistic ('sending'/'failed') status
  const resolvedStatus =
    incoming.deliveryStatus === 'sent' || existing.deliveryStatus === 'sent'
      ? 'sent'
      : incoming.deliveryStatus || existing.deliveryStatus;

  const mergedTxData =
    existing.transactionData || incoming.transactionData
      ? {
          ...(existing.transactionData || {}),
          ...(incoming.transactionData || {}),
          ...((incoming.transactionData as any)?.attachmentUrl || (existing.transactionData as any)?.attachmentUrl
            ? {
                attachmentUrl:
                  (incoming.transactionData as any)?.attachmentUrl ||
                  (existing.transactionData as any)?.attachmentUrl,
              }
            : {}),
          ...((incoming.transactionData as any)?.proofUrl || (existing.transactionData as any)?.proofUrl
            ? {
                proofUrl:
                  (incoming.transactionData as any)?.proofUrl ||
                  (existing.transactionData as any)?.proofUrl,
              }
            : {}),
        }
      : undefined;

  return {
    ...existing,
    ...incoming,
    conversationId: incoming.conversationId || existing.conversationId,
    attachmentUrl: incoming.attachmentUrl || existing.attachmentUrl,
    attachmentName: incoming.attachmentName || existing.attachmentName,
    transactionData: mergedTxData as any,
    intentAction: existing.intentAction || incoming.intentAction,
    deliveryStatus: resolvedStatus,
    deliveryError: resolvedStatus === 'sent' ? undefined : incoming.deliveryError ?? existing.deliveryError,
  };
}

export function sortAndDeduplicateMessages(messages: ChatMessage[], filterBots: boolean = true): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const msg of messages) {
    if (!msg || !msg.id) continue;
    if (filterBots && isBotGreetingMessage(msg.text ?? msg.content, msg.senderName)) {
      continue;
    }
    const existing = map.get(msg.id);
    map.set(msg.id, mergeSingleMessage(existing, msg));
  }
  return Array.from(map.values()).sort(compareMessagesChronologically);
}

export function mergeAuthoritativeMessages(
  localMsgs: ChatMessage[],
  remoteMsgs: ChatMessage[],
  canonicalConvId?: string,
  options?: { pruneToServerSnapshot?: boolean; pageLimit?: number }
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  const shouldPrune = Boolean(options?.pruneToServerSnapshot);
  const pageLimit = options?.pageLimit;
  const isCompleteHistory = shouldPrune && (pageLimit ? remoteMsgs.length < pageLimit : remoteMsgs.length === 0);

  let oldestRemoteTime = Infinity;
  if (shouldPrune && !isCompleteHistory && remoteMsgs.length > 0) {
    for (const remote of remoteMsgs) {
      const ts = Date.parse(remote?.createdAt || '');
      if (Number.isFinite(ts) && ts < oldestRemoteTime) {
        oldestRemoteTime = ts;
      }
    }
  }

  for (const local of localMsgs) {
    if (!local || !local.id) continue;
    if (shouldPrune) {
      const isPendingOrFailed = local.deliveryStatus === 'sending' || local.deliveryStatus === 'failed';
      const localTs = Date.parse(local.createdAt || '') || 0;
      const isOlderPaginated = !isCompleteHistory && oldestRemoteTime < Infinity && localTs < oldestRemoteTime;
      if (!isPendingOrFailed && !isOlderPaginated) {
        continue;
      }
    }
    const normalized: ChatMessage = canonicalConvId
      ? { ...local, conversationId: canonicalConvId }
      : local;
    map.set(normalized.id, mergeSingleMessage(map.get(normalized.id), normalized));
  }

  for (const remote of remoteMsgs) {
    if (!remote || !remote.id) continue;
    const normalized: ChatMessage = {
      ...remote,
      conversationId: canonicalConvId || remote.conversationId,
      deliveryStatus: 'sent',
      deliveryError: undefined,
    };
    map.set(normalized.id, mergeSingleMessage(map.get(normalized.id), normalized));
  }

  return sortAndDeduplicateMessages(Array.from(map.values()), true);
}
