import test from 'node:test';
import assert from 'node:assert/strict';
import { createRealtimeChatHub } from './realtimeChatHub';

function createMockSupabase() {
  const channels = new Map<string, any>();
  let removeCalls = 0;

  const client = {
    channel(topic: string) {
      if (channels.has(topic)) {
        return channels.get(topic);
      }

      const handlers: {
        broadcast: Array<(msg: any) => void>;
        postgres: Array<(payload: any) => void>;
      } = { broadcast: [], postgres: [] };
      let subscribed = false;
      let statusCb: ((s: string) => void) | null = null;
      const sentPayloads: any[] = [];

      const ch = {
        topic,
        state: 'closed',
        on(type: string, _filter: any, cb: (payload: any) => void) {
          if (subscribed && type === 'postgres_changes') {
            throw new Error(`cannot add postgres_changes callbacks for realtime:${topic} after subscribe().`);
          }
          if (type === 'broadcast') handlers.broadcast.push(cb);
          if (type === 'postgres_changes') handlers.postgres.push(cb);
          return ch;
        },
        subscribe(cb?: (status: string) => void) {
          subscribed = true;
          ch.state = 'joined';
          statusCb = cb || null;
          cb?.('SUBSCRIBED');
          return ch;
        },
        async send(arg: any) {
          sentPayloads.push(arg);
          return 'ok';
        },
        // Test helpers
        _emitBroadcast(payload: any) {
          for (const cb of handlers.broadcast) cb({ payload });
        },
        _emitPostgres(newRow: any) {
          for (const cb of handlers.postgres) cb({ new: newRow });
        },
        _getSentPayloads() {
          return sentPayloads;
        },
        _isSubscribed() {
          return subscribed;
        },
        _triggerStatus(s: string) {
          statusCb?.(s);
        },
      };

      channels.set(topic, ch);
      return ch;
    },
    removeChannel(ch: any) {
      removeCalls += 1;
      channels.delete(ch.topic);
      return Promise.resolve('ok');
    },
  };

  return {
    client: client as any,
    getChannel: (topic: string) => channels.get(topic),
    getRemoveCalls: () => removeCalls,
  };
}

test('multiple components subscribing to the same topic never call .on() after .subscribe()', () => {
  const mock = createMockSupabase();
  const hub = createRealtimeChatHub(() => mock.client);

  const receivedA: string[] = [];
  const receivedB: string[] = [];

  const unsubA = hub.subscribeChatRoom(
    'chat_conv_usr_1',
    {
      postgresFilter: {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.conv_usr_1',
      },
    },
    {
      onBroadcast: (p) => receivedA.push(`b:${p.id}`),
      onPostgresChange: (p) => receivedA.push(`db:${p.new.id}`),
    }
  );

  // Second component mounts (e.g. CustomerChat while GlobalChatNotificationManager is active)
  const unsubB = hub.subscribeChatRoom(
    'chat_conv_usr_1',
    {
      postgresFilter: {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.conv_usr_1',
      },
    },
    {
      onBroadcast: (p) => receivedB.push(`b:${p.id}`),
      onPostgresChange: (p) => receivedB.push(`db:${p.new.id}`),
    }
  );

  assert.equal(hub.getActiveRefCount('chat_conv_usr_1'), 2);

  const ch = mock.getChannel('chat_conv_usr_1');
  ch._emitBroadcast({ id: 'm1' });
  ch._emitPostgres({ id: 'm2' });

  assert.deepEqual(receivedA, ['b:m1', 'db:m2']);
  assert.deepEqual(receivedB, ['b:m1', 'db:m2']);

  // Unmounting CustomerChat leaves GlobalChatNotificationManager intact
  unsubB();
  assert.equal(hub.getActiveRefCount('chat_conv_usr_1'), 1);
  assert.equal(mock.getRemoveCalls(), 0);

  ch._emitBroadcast({ id: 'm3' });
  assert.deepEqual(receivedA, ['b:m1', 'db:m2', 'b:m3']);
  assert.deepEqual(receivedB, ['b:m1', 'db:m2']);

  // Unmounting last subscriber cleans up the Supabase channel
  unsubA();
  assert.equal(hub.getActiveRefCount('chat_conv_usr_1'), 0);
  assert.equal(mock.getRemoveCalls(), 1);
});

test('upgrades broadcast-only channel cleanly if a later subscriber requires postgres_changes', () => {
  const mock = createMockSupabase();
  const hub = createRealtimeChatHub(() => mock.client);

  const receivedA: string[] = [];
  const receivedB: string[] = [];

  const unsubA = hub.subscribeChatRoom(
    'room_admin_support',
    {},
    {
      onBroadcast: (p) => receivedA.push(p.id),
    }
  );

  const unsubB = hub.subscribeChatRoom(
    'room_admin_support',
    {
      postgresFilter: {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
    },
    {
      onBroadcast: (p) => receivedB.push(`b:${p.id}`),
      onPostgresChange: (p) => receivedB.push(`db:${p.new.id}`),
    }
  );

  assert.equal(mock.getRemoveCalls(), 1);
  assert.equal(hub.getActiveRefCount('room_admin_support'), 2);

  const ch = mock.getChannel('room_admin_support');
  ch._emitBroadcast({ id: 'm10' });
  ch._emitPostgres({ id: 'm11' });

  assert.deepEqual(receivedA, ['m10']);
  assert.deepEqual(receivedB, ['b:m10', 'db:m11']);

  unsubA();
  unsubB();
  assert.equal(hub.getActiveRefCount('room_admin_support'), 0);
});

test('broadcastMessage reuses existing joined channel without spawning duplicates', async () => {
  const mock = createMockSupabase();
  const hub = createRealtimeChatHub(() => mock.client);

  const unsub = hub.subscribeChatRoom('chat_conv_usr_2', {}, {});
  await hub.broadcastMessage('chat_conv_usr_2', { id: 'msg_99' });

  const ch = mock.getChannel('chat_conv_usr_2');
  assert.equal(ch._getSentPayloads().length, 1);
  assert.deepEqual(ch._getSentPayloads()[0].payload, { id: 'msg_99' });

  unsub();
});
