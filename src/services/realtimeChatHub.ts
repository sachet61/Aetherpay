import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface PostgresFilterConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
}

export interface ChatRoomListener {
  onBroadcast?: (payload: any) => void;
  onPostgresChange?: (payload: any) => void;
  onStatus?: (status: string) => void;
}

interface ChannelEntry {
  topic: string;
  channel: RealtimeChannel;
  postgresFilter?: PostgresFilterConfig;
  listeners: Set<ChatRoomListener>;
  lastStatus: string;
  isJoined: boolean;
}

/**
 * Factory for a ref-counted, collision-free Supabase Realtime channel hub.
 * Prevents "cannot add postgres_changes callbacks after subscribe()" by
 * guaranteeing each topic registers all `.on(...)` handlers strictly before `.subscribe()`,
 * and shares a single live WebSocket subscription across multiple UI components.
 */
export function createRealtimeChatHub(getClient: () => SupabaseClient | null) {
  const entries = new Map<string, ChannelEntry>();

  const buildAndSubscribeEntry = (
    client: SupabaseClient,
    topic: string,
    postgresFilter: PostgresFilterConfig | undefined,
    existingListeners?: Set<ChatRoomListener>
  ): ChannelEntry => {
    const listeners = existingListeners || new Set<ChatRoomListener>();
    const channel = client.channel(topic);

    const entry: ChannelEntry = {
      topic,
      channel,
      postgresFilter,
      listeners,
      lastStatus: 'SUBSCRIBING',
      isJoined: false,
    };

    channel.on('broadcast', { event: 'new_chat_message' }, (msg: any) => {
      const payload = msg?.payload;
      for (const listener of Array.from(entry.listeners)) {
        try {
          listener.onBroadcast?.(payload);
        } catch (err) {
          console.warn(`[RealtimeChatHub] Broadcast listener error on ${topic}:`, err);
        }
      }
    });

    if (postgresFilter) {
      channel.on('postgres_changes', postgresFilter as any, (payload: any) => {
        for (const listener of Array.from(entry.listeners)) {
          try {
            listener.onPostgresChange?.(payload);
          } catch (err) {
            console.warn(`[RealtimeChatHub] Postgres listener error on ${topic}:`, err);
          }
        }
      });
    }

    entries.set(topic, entry);

    channel.subscribe((status: string) => {
      entry.lastStatus = status;
      entry.isJoined = status === 'SUBSCRIBED';
      for (const listener of Array.from(entry.listeners)) {
        try {
          listener.onStatus?.(status);
        } catch {
          // Ignore listener status callback errors
        }
      }
    });

    return entry;
  };

  const subscribeChatRoom = (
    topic: string,
    options: { postgresFilter?: PostgresFilterConfig },
    listener: ChatRoomListener
  ): (() => void) => {
    const client = getClient();
    if (!client || !topic) {
      return () => {};
    }

    let entry = entries.get(topic);

    if (!entry) {
      entry = buildAndSubscribeEntry(client, topic, options.postgresFilter);
      entry.listeners.add(listener);
    } else if (options.postgresFilter && !entry.postgresFilter) {
      // Upgrade channel cleanly so postgres_changes callbacks are registered BEFORE subscribe()
      const preservedListeners = new Set(entry.listeners);
      preservedListeners.add(listener);
      entries.delete(topic);
      try {
        client.removeChannel(entry.channel);
      } catch {
        // Ignore cleanup errors
      }
      entry = buildAndSubscribeEntry(client, topic, options.postgresFilter, preservedListeners);
    } else {
      entry.listeners.add(listener);
      if (entry.isJoined) {
        try {
          listener.onStatus?.('SUBSCRIBED');
        } catch {
          // Ignore
        }
      }
    }

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;

      const currentEntry = entries.get(topic);
      if (!currentEntry) return;

      currentEntry.listeners.delete(listener);
      if (currentEntry.listeners.size === 0) {
        entries.delete(topic);
        try {
          client.removeChannel(currentEntry.channel);
        } catch {
          // Ignore removeChannel errors on teardown
        }
      }
    };
  };

  const broadcastMessage = async (topic: string, payload: any): Promise<void> => {
    const client = getClient();
    if (!client || !topic) return;

    const existing = entries.get(topic);
    if (existing) {
      if (existing.isJoined || (existing.channel as any).state === 'joined') {
        await existing.channel
          .send({
            type: 'broadcast',
            event: 'new_chat_message',
            payload,
          })
          .catch(() => {});
      }
      return;
    }

    // No active subscriber on this client (e.g. customer sending to room_admin_support).
    // Use an ephemeral channel and clean it up immediately after sending so it never blocks future subscriptions.
    const tempChannel = client.channel(topic);
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        // Only remove if no active subscriber took over this topic
        if (!entries.has(topic)) {
          try {
            client.removeChannel(tempChannel);
          } catch {
            // Ignore
          }
        }
        resolve();
      };

      const timeout = setTimeout(finish, 3000);
      tempChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          tempChannel
            .send({
              type: 'broadcast',
              event: 'new_chat_message',
              payload,
            })
            .catch(() => {})
            .finally(() => {
              clearTimeout(timeout);
              finish();
            });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          finish();
        }
      });
    });
  };

  const getActiveRefCount = (topic: string): number => {
    return entries.get(topic)?.listeners.size ?? 0;
  };

  return {
    subscribeChatRoom,
    broadcastMessage,
    getActiveRefCount,
  };
}
