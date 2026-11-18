export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ConversationScrollSnapshot {
  scrollTop: number;
  distanceFromBottom: number;
  wasAtBottom: boolean;
  savedAt: number;
}

export interface MessageSummary {
  id: string;
  createdAt?: string;
}

export type ScrollDecision =
  | { type: 'none' }
  | { type: 'scroll-bottom-instant' }
  | { type: 'scroll-bottom-smooth' }
  | { type: 'preserve-prepend' }
  | { type: 'restore-saved'; snapshot: ConversationScrollSnapshot }
  | { type: 'show-new-indicator'; newlyAddedCount: number };

export const DEFAULT_NEAR_BOTTOM_THRESHOLD_PX = 96;
const SCROLL_STORAGE_KEY = 'swiftsweeps_chat_scroll_v1';
const MAX_STORED_CONVERSATIONS = 40;

const inMemoryScrollMap = new Map<string, ConversationScrollSnapshot>();

export function computeDistanceFromBottom(metrics: ScrollMetrics): number {
  const maxScrollTop = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  return Math.max(0, maxScrollTop - Math.max(0, metrics.scrollTop));
}

export function isScrolledNearBottom(
  metrics: ScrollMetrics,
  thresholdPx: number = DEFAULT_NEAR_BOTTOM_THRESHOLD_PX
): boolean {
  if (metrics.scrollHeight <= metrics.clientHeight) {
    return true;
  }
  return computeDistanceFromBottom(metrics) <= Math.max(0, thresholdPx);
}

export function computePrependScrollTop(params: {
  prevScrollTop: number;
  prevScrollHeight: number;
  newScrollHeight: number;
}): number {
  const delta = Math.max(0, params.newScrollHeight - params.prevScrollHeight);
  return Math.max(0, params.prevScrollTop + delta);
}

export function computeRestoredScrollTop(params: {
  snapshot: ConversationScrollSnapshot;
  scrollHeight: number;
  clientHeight: number;
}): number {
  const maxScrollTop = Math.max(0, params.scrollHeight - params.clientHeight);
  if (params.snapshot.wasAtBottom) {
    return maxScrollTop;
  }
  // Prefer preserving exact distance from the bottom when messages exist, clamped within bounds
  if (Number.isFinite(params.snapshot.distanceFromBottom) && params.snapshot.distanceFromBottom >= 0) {
    const byDistance = maxScrollTop - params.snapshot.distanceFromBottom;
    if (byDistance >= 0) {
      return Math.min(maxScrollTop, byDistance);
    }
  }
  return Math.min(maxScrollTop, Math.max(0, params.snapshot.scrollTop || 0));
}

export function countNewlyAppendedMessages(
  prevMessages: MessageSummary[],
  nextMessages: MessageSummary[]
): number {
  if (nextMessages.length === 0) return 0;
  if (prevMessages.length === 0) return nextMessages.length;

  const prevLast = prevMessages[prevMessages.length - 1];
  const nextLast = nextMessages[nextMessages.length - 1];
  if (prevLast.id === nextLast.id) return 0;

  const prevLastIndexInNext = nextMessages.findIndex((m) => m.id === prevLast.id);
  if (prevLastIndexInNext >= 0) {
    return Math.max(0, nextMessages.length - 1 - prevLastIndexInNext);
  }

  const prevIds = new Set(prevMessages.map((m) => m.id));
  const prevLastTs = Date.parse(prevLast.createdAt || '') || 0;
  let addedAtTail = 0;
  for (const msg of nextMessages) {
    if (prevIds.has(msg.id)) continue;
    const msgTs = Date.parse(msg.createdAt || '') || 0;
    if (msgTs >= prevLastTs) {
      addedAtTail += 1;
    }
  }
  return addedAtTail > 0 ? addedAtTail : 1;
}

export function decideMessageUpdateScrollAction(params: {
  prevMessages: MessageSummary[];
  nextMessages: MessageSummary[];
  hasAnchoredInitial: boolean;
  userHasScrolled: boolean;
  wasNearBottom: boolean;
  justSentByMe: boolean;
  isPrependingOlder: boolean;
  savedSnapshot?: ConversationScrollSnapshot | null;
}): ScrollDecision {
  const {
    prevMessages,
    nextMessages,
    hasAnchoredInitial,
    userHasScrolled,
    wasNearBottom,
    justSentByMe,
    isPrependingOlder,
    savedSnapshot,
  } = params;

  if (nextMessages.length === 0) {
    return { type: 'none' };
  }

  const prevFirstId = prevMessages[0]?.id;
  const nextFirstId = nextMessages[0]?.id;
  const prevLastId = prevMessages[prevMessages.length - 1]?.id;
  const nextLastId = nextMessages[nextMessages.length - 1]?.id;

  const isPrepended =
    isPrependingOlder ||
    (prevMessages.length > 0 &&
      nextMessages.length > prevMessages.length &&
      prevFirstId !== nextFirstId &&
      prevLastId === nextLastId);

  if (isPrepended) {
    return { type: 'preserve-prepend' };
  }

  if (!hasAnchoredInitial) {
    if (userHasScrolled) {
      return { type: 'none' };
    }
    if (savedSnapshot && !savedSnapshot.wasAtBottom) {
      return { type: 'restore-saved', snapshot: savedSnapshot };
    }
    return { type: 'scroll-bottom-instant' };
  }

  if (justSentByMe && nextLastId !== prevLastId) {
    return { type: 'scroll-bottom-smooth' };
  }

  if (prevMessages.length > 0 && nextLastId !== prevLastId) {
    const newlyAddedCount = countNewlyAppendedMessages(prevMessages, nextMessages);
    if (newlyAddedCount > 0) {
      if (wasNearBottom) {
        return { type: 'scroll-bottom-smooth' };
      }
      return { type: 'show-new-indicator', newlyAddedCount };
    }
  }

  return { type: 'none' };
}

function readStoredSnapshotMap(): Record<string, ConversationScrollSnapshot> {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredSnapshotMap(map: Record<string, ConversationScrollSnapshot>): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  try {
    const entries = Object.entries(map)
      .sort((a, b) => (b[1]?.savedAt || 0) - (a[1]?.savedAt || 0))
      .slice(0, MAX_STORED_CONVERSATIONS);
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function loadConversationScrollSnapshot(
  conversationId: string
): ConversationScrollSnapshot | null {
  if (!conversationId) return null;
  const mem = inMemoryScrollMap.get(conversationId);
  if (mem) return mem;
  const stored = readStoredSnapshotMap()[conversationId];
  if (stored && typeof stored.scrollTop === 'number' && typeof stored.wasAtBottom === 'boolean') {
    inMemoryScrollMap.set(conversationId, stored);
    return stored;
  }
  return null;
}

export function saveConversationScrollSnapshot(
  conversationId: string,
  metrics: ScrollMetrics,
  thresholdPx: number = DEFAULT_NEAR_BOTTOM_THRESHOLD_PX
): ConversationScrollSnapshot | null {
  if (!conversationId || metrics.clientHeight <= 0) return null;
  const distanceFromBottom = computeDistanceFromBottom(metrics);
  const snapshot: ConversationScrollSnapshot = {
    scrollTop: Math.max(0, Math.round(metrics.scrollTop)),
    distanceFromBottom: Math.max(0, Math.round(distanceFromBottom)),
    wasAtBottom: distanceFromBottom <= thresholdPx,
    savedAt: Date.now(),
  };
  inMemoryScrollMap.set(conversationId, snapshot);
  const map = readStoredSnapshotMap();
  map[conversationId] = snapshot;
  writeStoredSnapshotMap(map);
  return snapshot;
}

export function buildScrollSnapshotKey(userId: string, conversationId: string): string {
  if (!userId) return conversationId;
  return `${userId}::${conversationId}`;
}

export function clearConversationScrollSnapshotsForTests(): void {
  inMemoryScrollMap.clear();
}
