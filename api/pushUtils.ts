export interface NormalizedPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userRole: 'admin' | 'agent' | 'customer';
  active: boolean;
  subscription: NormalizedPushSubscription;
  platform?: string;
  browser?: string;
  createdAt: string;
  updatedAt: string;
}

export function normalizePushUserRole(role: unknown): 'admin' | 'agent' | 'customer' {
  if (role === 'admin') return 'admin';
  if (role === 'agent') return 'agent';
  return 'customer';
}

export function isStaffRole(role: unknown): boolean {
  return role === 'admin' || role === 'agent';
}

// Deterministic non-cryptographic hash so endpoint IDs are stable across account switches
export function hashEndpointId(endpoint: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < endpoint.length; i++) {
    const ch = endpoint.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `push_${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`;
}

export function normalizePushSubscriptionPayload(sub: any): NormalizedPushSubscription | null {
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint.trim() : '';
  const p256dh = String(sub?.keys?.p256dh || sub?.p256dh || '').trim();
  const auth = String(sub?.keys?.auth || sub?.auth || '').trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    expirationTime: sub?.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
}

/**
 * Strictly enforces 1-to-1 device endpoint binding:
 * Evicts EVERY existing subscription record sharing `subscription.endpoint`
 * (regardless of previous userId/userRole) and binds it solely to `userId`.
 */
export function rebindPushSubscriptionList(
  existingList: any[],
  params: {
    subscription: any;
    userId: string;
    userRole: unknown;
    userEmail?: string;
    platform?: string;
    browser?: string;
    now?: string;
  }
): { list: PushSubscriptionRecord[]; record: PushSubscriptionRecord } | null {
  const userId = String(params.userId || '').trim();
  if (!userId || userId === 'anonymous') {
    return null;
  }

  const normalizedSub = normalizePushSubscriptionPayload(params.subscription);
  if (!normalizedSub) {
    return null;
  }

  const now = params.now || new Date().toISOString();
  const safeList = Array.isArray(existingList) ? existingList : [];
  const previousSameUser = safeList.find(
    (x) => x?.subscription?.endpoint === normalizedSub.endpoint && x?.userId === userId
  );

  const filtered = safeList.filter(
    (x) => x && x.subscription?.endpoint && x.subscription.endpoint !== normalizedSub.endpoint
  );

  const record: PushSubscriptionRecord = {
    id: hashEndpointId(normalizedSub.endpoint),
    userId,
    userEmail: params.userEmail ? String(params.userEmail).trim().toLowerCase() : undefined,
    userRole: normalizePushUserRole(params.userRole),
    active: true,
    subscription: normalizedSub,
    platform: params.platform ? String(params.platform).trim() : undefined,
    browser: params.browser ? String(params.browser).trim() : undefined,
    createdAt: previousSameUser?.createdAt || now,
    updatedAt: now,
  };

  const nextList = [...filtered, record].slice(-100);
  return { list: nextList, record };
}

/**
 * Revokes device endpoint binding immediately (e.g. on logout or explicit unsubscribe).
 * When `endpoint` is present, removes all records with that endpoint.
 * When `revokeAllForUser` is true and `userId` is specified without an endpoint, removes all records for that user.
 */
export function deactivatePushSubscriptionsInList(
  existingList: any[],
  params: {
    endpoint?: string;
    userId?: string;
    revokeAllForUser?: boolean;
  }
): { list: any[]; removedCount: number } {
  const safeList = Array.isArray(existingList) ? existingList : [];
  const endpoint = typeof params.endpoint === 'string' ? params.endpoint.trim() : '';
  const userId = typeof params.userId === 'string' ? params.userId.trim() : '';

  let removedCount = 0;
  const nextList = safeList.filter((item) => {
    if (!item) return false;
    const itemEndpoint = String(item?.subscription?.endpoint || '').trim();
    if (endpoint && itemEndpoint === endpoint) {
      removedCount++;
      return false;
    }
    if (!endpoint && params.revokeAllForUser && userId && item.userId === userId) {
      removedCount++;
      return false;
    }
    return true;
  });

  return { list: nextList, removedCount };
}

export function pruneExpiredPushSubscriptions(
  existingList: any[],
  goneEndpoints: Set<string>
): { list: any[]; prunedCount: number } {
  if (!goneEndpoints || goneEndpoints.size === 0) {
    return { list: Array.isArray(existingList) ? existingList : [], prunedCount: 0 };
  }
  const safeList = Array.isArray(existingList) ? existingList : [];
  let prunedCount = 0;
  const list = safeList.filter((item) => {
    const ep = String(item?.subscription?.endpoint || '').trim();
    if (ep && goneEndpoints.has(ep)) {
      prunedCount++;
      return false;
    }
    return true;
  });
  return { list, prunedCount };
}

const RESERVED_NON_USER_IDS = new Set(['anonymous', 'staff', 'customer', 'agent', 'admin']);

/**
 * Strictly selects push targets with zero role-wide customer broadcast.
 * - Staff targets match ONLY active staff ('agent' | 'admin') subscriptions.
 * - Customer targets match ONLY the exact recipient userId (never `s.userRole === 'customer'`).
 * - Always excludes `active === false`, invalid/anonymous entries, and `senderId` (unless self-test).
 */
export function selectPushTargets(
  subs: any[],
  criteria: {
    targetUserId?: string;
    targetRole?: string;
    targetEmail?: string;
    senderId?: string;
  }
): PushSubscriptionRecord[] {
  const safeSubs = Array.isArray(subs) ? subs : [];
  const targetUserId = String(criteria.targetUserId || '').trim();
  const targetRole = String(criteria.targetRole || '').trim().toLowerCase();
  const targetEmail = String(criteria.targetEmail || '').trim().toLowerCase();
  const senderId = String(criteria.senderId || '').trim();

  const isStaffTarget =
    targetUserId === 'staff' ||
    targetUserId === 'agent' ||
    targetUserId === 'admin' ||
    targetRole === 'agent' ||
    targetRole === 'admin' ||
    targetRole === 'staff';

  const seenEndpoints = new Set<string>();
  const matched: PushSubscriptionRecord[] = [];

  for (const s of safeSubs) {
    if (!s || !s.subscription?.endpoint) continue;
    if (s.active === false) continue;
    if (!s.userId || s.userId === 'anonymous') continue;
    if (senderId && s.userId === senderId && targetUserId !== senderId) continue;

    const ep = String(s.subscription.endpoint).trim();
    if (!ep || seenEndpoints.has(ep)) continue;

    let isMatch = false;
    if (isStaffTarget) {
      isMatch = s.userRole === 'agent' || s.userRole === 'admin';
    } else if (targetUserId && !RESERVED_NON_USER_IDS.has(targetUserId)) {
      isMatch = s.userId === targetUserId;
    } else if (!targetUserId && targetEmail) {
      isMatch = Boolean(s.userEmail && String(s.userEmail).trim().toLowerCase() === targetEmail);
    }

    if (isMatch) {
      seenEndpoints.add(ep);
      matched.push(s);
    }
  }

  return matched;
}
