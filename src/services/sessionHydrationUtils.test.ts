import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowSessionHydrationGate,
  shouldRunSilentBackgroundRefresh,
  resolveHydrationPhaseLabel,
  getPrefetchRouteKeysForRole,
} from './sessionHydrationUtils';

test('shouldShowSessionHydrationGate returns false when logged out or supabase disabled', () => {
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: null,
      isHydrating: true,
      hydratedUserId: null,
      supabaseConfigured: true,
    }),
    false
  );

  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-1',
      isHydrating: true,
      hydratedUserId: null,
      supabaseConfigured: false,
    }),
    false
  );
});

test('shouldShowSessionHydrationGate stays active before initial hydration finishes and clears once hydrated', () => {
  // User just authenticated, hydration not marked complete yet -> blocks unhydrated UI
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-1',
      isHydrating: false,
      hydratedUserId: null,
      supabaseConfigured: true,
    }),
    true
  );

  // Actively hydrating -> keeps spinner up
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-1',
      isHydrating: true,
      hydratedUserId: 'user-1',
      supabaseConfigured: true,
    }),
    true
  );

  // Completed for current user with no error -> unlocks dashboard
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-1',
      isHydrating: false,
      hydratedUserId: 'user-1',
      hydrationError: null,
      supabaseConfigured: true,
    }),
    false
  );

  // Switched to another user -> blocks until new user is hydrated
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-2',
      isHydrating: false,
      hydratedUserId: 'user-1',
      supabaseConfigured: true,
    }),
    true
  );
});

test('shouldShowSessionHydrationGate surfaces errors unless user explicitly bypassed for that session', () => {
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-1',
      isHydrating: false,
      hydratedUserId: 'user-1',
      hydrationError: 'Network failure',
      supabaseConfigured: true,
    }),
    true
  );

  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-1',
      isHydrating: false,
      hydratedUserId: null,
      hydrationError: 'Network failure',
      bypassedUserId: 'user-1',
      supabaseConfigured: true,
    }),
    false
  );

  // Bypass for user-1 must not bypass user-2
  assert.equal(
    shouldShowSessionHydrationGate({
      currentUserId: 'user-2',
      isHydrating: false,
      hydratedUserId: null,
      bypassedUserId: 'user-1',
      supabaseConfigured: true,
    }),
    true
  );
});

test('resolveHydrationPhaseLabel prioritizes errors and timeouts cleanly', () => {
  assert.match(
    resolveHydrationPhaseLabel({
      role: 'customer',
      elapsedMs: 500,
      timedOut: false,
      errorMessage: 'Connection timed out',
    }),
    /issue/i
  );

  assert.match(
    resolveHydrationPhaseLabel({
      role: 'admin',
      elapsedMs: 13000,
      timedOut: true,
      errorMessage: null,
    }),
    /longer than expected/i
  );

  assert.match(
    resolveHydrationPhaseLabel({
      role: 'customer',
      elapsedMs: 2000,
      timedOut: false,
    }),
    /deposits, withdrawals, gaming IDs/i
  );

  assert.match(
    resolveHydrationPhaseLabel({
      role: 'agent',
      elapsedMs: 2000,
      timedOut: false,
    }),
    /queues, conversations/i
  );
});

test('getPrefetchRouteKeysForRole includes activeTab and role landing pages without duplicates', () => {
  assert.deepEqual(getPrefetchRouteKeysForRole('customer', 'game_accounts'), [
    'game_accounts',
    'dashboard',
    'wallet',
  ]);
  assert.deepEqual(getPrefetchRouteKeysForRole('agent', 'ops_chat'), [
    'ops_chat',
    'ops_requests',
  ]);
  assert.deepEqual(getPrefetchRouteKeysForRole('admin', 'ops_dashboard'), [
    'ops_dashboard',
    'ops_requests',
    'ops_chat',
  ]);
});

test('shouldRunSilentBackgroundRefresh skips full-screen hydration gate when current user is already hydrated', () => {
  assert.equal(
    shouldRunSilentBackgroundRefresh({
      targetUserId: 'user-1',
      lastHydratedUserId: 'user-1',
      lastHydrationError: null,
      force: false,
    }),
    true
  );

  // Initial boot or user switch must still run full hydration
  assert.equal(
    shouldRunSilentBackgroundRefresh({
      targetUserId: 'user-1',
      lastHydratedUserId: null,
      lastHydrationError: null,
      force: false,
    }),
    false
  );
  assert.equal(
    shouldRunSilentBackgroundRefresh({
      targetUserId: 'user-2',
      lastHydratedUserId: 'user-1',
      lastHydrationError: null,
      force: false,
    }),
    false
  );

  // Forced retry or prior hydration error must allow full hydration
  assert.equal(
    shouldRunSilentBackgroundRefresh({
      targetUserId: 'user-1',
      lastHydratedUserId: 'user-1',
      lastHydrationError: null,
      force: true,
    }),
    false
  );
  assert.equal(
    shouldRunSilentBackgroundRefresh({
      targetUserId: 'user-1',
      lastHydratedUserId: 'user-1',
      lastHydrationError: 'Timeout',
      force: false,
    }),
    false
  );
});
