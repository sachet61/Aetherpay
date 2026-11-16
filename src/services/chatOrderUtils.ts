import type { ChatMessage } from '../types';

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
  const url =
    row?.attachment_url ||
    row?.attachmentUrl ||
    row?.transaction_data?.attachmentUrl ||
    row?.transaction_data?.proofUrl ||
    row?.transaction_data?.proof_url ||
    row?.transaction_data?.receiptUrl ||
    row?.transaction_data?.receipt_url ||
    row?.transaction_data?.imageUrl ||
    row?.transaction_data?.image_url ||
    row?.transactionData?.attachmentUrl ||
    row?.transactionData?.proofUrl ||
    row?.transactionData?.receiptUrl ||
    row?.proof_url ||
    undefined;

  const name =
    row?.attachment_name ||
    row?.attachmentName ||
    row?.transaction_data?.attachmentName ||
    row?.transaction_data?.proofName ||
    row?.transaction_data?.fileName ||
    row?.transactionData?.attachmentName ||
    row?.transactionData?.proofName ||
    (url ? 'Attached image' : undefined);

  return { url, name };
}

export function mapDbMessageRowToChatMessage(row: any, overrideConversationId?: string): ChatMessage {
  const { url, name } = extractAttachmentMetadata(row);
  const txData = row?.transaction_data ?? row?.transactionData ?? undefined;
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
    transactionData: txData,
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

function mergeSingleMessage(existing: ChatMessage | undefined, incoming: ChatMessage): ChatMessage {
  if (!existing) return incoming;
  // Prefer confirmed ('sent') status over transient optimistic ('sending'/'failed') status
  const resolvedStatus =
    incoming.deliveryStatus === 'sent' || existing.deliveryStatus === 'sent'
      ? 'sent'
      : incoming.deliveryStatus || existing.deliveryStatus;

  return {
    ...existing,
    ...incoming,
    conversationId: incoming.conversationId || existing.conversationId,
    attachmentUrl: incoming.attachmentUrl || existing.attachmentUrl,
    attachmentName: incoming.attachmentName || existing.attachmentName,
    transactionData: incoming.transactionData || existing.transactionData,
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
  canonicalConvId?: string
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  for (const local of localMsgs) {
    if (!local || !local.id) continue;
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
