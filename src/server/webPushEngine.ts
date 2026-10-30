import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BMTMQBhNAp_fMCWzCNh0HlPv3BHdT4ykDgCMqckNfdq7qh1eXTpiIeSA28wMGTDD4hv3-iU7J9XJ16ZbS6qHKe0';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'KHVqz-Bc2gEC03akwJu1FI54aev2AiEEL4u02zmO_nU';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@swiftsweeps.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[WebPush] VAPID configuration notice:', err);
}

export interface StoredPushSubscription {
  id: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// In-memory memory fallback
const inMemorySubscriptions = new Map<string, StoredPushSubscription>();

export async function savePushSubscription(
  sub: any,
  userId: string,
  userRole: string,
  supabaseAdmin?: SupabaseClient | null,
  userEmail?: string
): Promise<boolean> {
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh || sub?.p256dh;
  const auth = sub?.keys?.auth || sub?.auth;

  if (!endpoint || !p256dh || !auth) {
    console.warn('[WebPush] Incomplete push subscription received:', {
      hasEndpoint: !!endpoint,
      hasP256dh: !!p256dh,
      hasAuth: !!auth,
    });
    return false;
  }

  const normalizedSub = {
    endpoint,
    expirationTime: sub.expirationTime || null,
    keys: {
      p256dh: String(p256dh).trim(),
      auth: String(auth).trim(),
    },
  };

  const endpointKey = endpoint.slice(-32);
  const id = `push_${userId}_${endpointKey}`;
  const now = new Date().toISOString();

  const record: StoredPushSubscription = {
    id,
    userId,
    userEmail: userEmail || undefined,
    userRole: userRole || 'customer',
    subscription: normalizedSub,
    createdAt: now,
    updatedAt: now,
  };

  inMemorySubscriptions.set(endpoint, record);

  if (supabaseAdmin) {
    try {
      // 1. Persist to app_config row with id 'push_subscriptions' (always works in existing Supabase schema)
      const { data: existingConfig } = await supabaseAdmin
        .from('app_config')
        .select('data')
        .eq('id', 'push_subscriptions')
        .maybeSingle();

      const list: StoredPushSubscription[] = Array.isArray(existingConfig?.data)
        ? existingConfig.data.filter((item: StoredPushSubscription) => item.subscription?.endpoint !== endpoint)
        : [];

      list.push(record);

      await supabaseAdmin.from('app_config').upsert({
        id: 'push_subscriptions',
        data: list.slice(-100), // Keep the latest 100 subscriptions active
        updated_at: now,
      });

      // 2. Also attempt direct push_subscriptions table if it exists
      await supabaseAdmin
        .from('push_subscriptions')
        .upsert({
          id,
          user_id: userId,
          endpoint,
          p256dh: normalizedSub.keys.p256dh,
          auth: normalizedSub.keys.auth,
          updated_at: now,
        })
        .then(() => {}, () => {});
    } catch (err) {
      console.warn('[WebPush] Error saving push subscription to Supabase:', err);
    }
  }

  return true;
}

export async function getSubscriptionsForUser(
  targetUserId: string,
  targetRole?: string,
  supabaseAdmin?: SupabaseClient | null,
  targetEmail?: string
): Promise<StoredPushSubscription[]> {
  const result: StoredPushSubscription[] = [];
  const seenEndpoints = new Set<string>();
  const isStaffTarget =
    targetUserId === 'staff' ||
    targetRole === 'agent' ||
    targetRole === 'admin' ||
    targetUserId === 'admin' ||
    targetUserId === 'agent';

  const matchesFilter = (item: StoredPushSubscription) => {
    if (!item || !item.subscription?.endpoint) return false;
    if (isStaffTarget && (item.userRole === 'agent' || item.userRole === 'admin')) {
      return true;
    }
    if (targetUserId && item.userId === targetUserId) {
      return true;
    }
    if (targetEmail && item.userEmail && item.userEmail.toLowerCase() === targetEmail.toLowerCase()) {
      return true;
    }
    if (targetRole && item.userRole === targetRole) {
      return true;
    }
    return false;
  };

  // 1. Check in-memory first
  for (const item of inMemorySubscriptions.values()) {
    if (matchesFilter(item)) {
      if (!seenEndpoints.has(item.subscription.endpoint)) {
        seenEndpoints.add(item.subscription.endpoint);
        result.push(item);
      }
    }
  }

  // 2. Load from Supabase (app_config and push_subscriptions table)
  if (supabaseAdmin) {
    try {
      const { data: configRow } = await supabaseAdmin
        .from('app_config')
        .select('data')
        .eq('id', 'push_subscriptions')
        .maybeSingle();

      if (configRow?.data && Array.isArray(configRow.data)) {
        for (const item of configRow.data) {
          if (matchesFilter(item)) {
            if (!seenEndpoints.has(item.subscription?.endpoint)) {
              seenEndpoints.add(item.subscription.endpoint);
              result.push(item);
            }
          }
        }
      }

      // Also query push_subscriptions table if present
      const query = supabaseAdmin.from('push_subscriptions').select('*');
      if (!isStaffTarget && targetUserId) {
        query.eq('user_id', targetUserId);
      }
      const { data: dbRows } = await query.limit(50);
      if (dbRows && Array.isArray(dbRows)) {
        for (const row of dbRows) {
          if (row.endpoint && row.p256dh && row.auth && !seenEndpoints.has(row.endpoint)) {
            seenEndpoints.add(row.endpoint);
            result.push({
              id: row.id || `push_${row.user_id}`,
              userId: row.user_id,
              userRole: row.user_role || 'customer',
              subscription: {
                endpoint: row.endpoint,
                keys: {
                  p256dh: row.p256dh,
                  auth: row.auth,
                },
              },
              createdAt: row.created_at || new Date().toISOString(),
              updatedAt: row.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('[WebPush] Notice querying push subscriptions:', err);
    }
  }

  return result;
}

export async function sendPushNotification(
  targetUserId: string,
  targetRole: string | undefined,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    data?: any;
    targetEmail?: string;
  },
  supabaseAdmin?: SupabaseClient | null
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getSubscriptionsForUser(targetUserId, targetRole, supabaseAdmin, payload.targetEmail);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  const pushString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || `msg_${Date.now()}`,
    data: {
      url: payload.url || '/#chat',
      ...payload.data,
    },
  });

  await Promise.all(
    subscriptions.map(async (record) => {
      try {
        await webpush.sendNotification(record.subscription as any, pushString, {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: 'high',
          headers: {
            Urgency: 'high',
          },
        });
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(record.subscription.endpoint);
          inMemorySubscriptions.delete(record.subscription.endpoint);
        } else {
          console.warn('[WebPush] Push dispatch warning:', err?.message || err);
        }
      }
    })
  );

  // Clean up expired subscriptions from Supabase
  if (expiredEndpoints.length > 0 && supabaseAdmin) {
    try {
      const { data: configRow } = await supabaseAdmin
        .from('app_config')
        .select('data')
        .eq('id', 'push_subscriptions')
        .maybeSingle();

      if (configRow?.data && Array.isArray(configRow.data)) {
        const cleaned = configRow.data.filter(
          (item: any) => !expiredEndpoints.includes(item.subscription?.endpoint)
        );
        await supabaseAdmin.from('app_config').upsert({
          id: 'push_subscriptions',
          data: cleaned,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  return { sent, failed };
}
