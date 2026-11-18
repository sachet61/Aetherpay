import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScrollSnapshotKey,
  computeDistanceFromBottom,
  isScrolledNearBottom,
  computePrependScrollTop,
  computeRestoredScrollTop,
  countNewlyAppendedMessages,
  decideMessageUpdateScrollAction,
  type ConversationScrollSnapshot,
  type MessageSummary,
} from './chatScrollUtils';

const makeMessages = (start: number, count: number): MessageSummary[] =>
  Array.from({ length: count }, (_, idx) => {
    const num = start + idx;
    return {
      id: `m_${num}`,
      createdAt: new Date(1_700_000_000_000 + num * 60_000).toISOString(),
    };
  });

test('isScrolledNearBottom and computeDistanceFromBottom calculate bounds accurately', () => {
  assert.equal(
    computeDistanceFromBottom({ scrollTop: 1400, scrollHeight: 2000, clientHeight: 600 }),
    0
  );
  assert.equal(
    isScrolledNearBottom({ scrollTop: 1320, scrollHeight: 2000, clientHeight: 600 }, 96),
    true
  );
  assert.equal(
    isScrolledNearBottom({ scrollTop: 1200, scrollHeight: 2000, clientHeight: 600 }, 96),
    false
  );
  // Short conversations fit without scrolling
  assert.equal(
    isScrolledNearBottom({ scrollTop: 0, scrollHeight: 400, clientHeight: 600 }, 96),
    true
  );
});

test('computePrependScrollTop maintains visual reading offset when older messages prepend', () => {
  assert.equal(
    computePrependScrollTop({
      prevScrollTop: 24,
      prevScrollHeight: 1500,
      newScrollHeight: 2450,
    }),
    974
  );
});

test('computeRestoredScrollTop restores distance from bottom or clamps safely', () => {
  const readingHistory: ConversationScrollSnapshot = {
    scrollTop: 320,
    distanceFromBottom: 680,
    wasAtBottom: false,
    savedAt: 1000,
  };
  assert.equal(
    computeRestoredScrollTop({
      snapshot: readingHistory,
      scrollHeight: 2200,
      clientHeight: 600,
    }),
    920
  );

  const atBottom: ConversationScrollSnapshot = {
    scrollTop: 1400,
    distanceFromBottom: 0,
    wasAtBottom: true,
    savedAt: 1000,
  };
  assert.equal(
    computeRestoredScrollTop({
      snapshot: atBottom,
      scrollHeight: 2200,
      clientHeight: 600,
    }),
    1600
  );
});

test('decideMessageUpdateScrollAction anchors once on initial open and restores saved offset on revisit', () => {
  const msgs = makeMessages(1, 20);

  // First visit (no saved snapshot): anchors to bottom once
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: [],
      nextMessages: msgs,
      hasAnchoredInitial: false,
      userHasScrolled: false,
      wasNearBottom: true,
      justSentByMe: false,
      isPrependingOlder: false,
      savedSnapshot: null,
    }),
    { type: 'scroll-bottom-instant' }
  );

  // Revisit while previously scrolled up: restores saved position without forcing to bottom
  const saved: ConversationScrollSnapshot = {
    scrollTop: 280,
    distanceFromBottom: 720,
    wasAtBottom: false,
    savedAt: 123,
  };
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: [],
      nextMessages: msgs,
      hasAnchoredInitial: false,
      userHasScrolled: false,
      wasNearBottom: false,
      justSentByMe: false,
      isPrependingOlder: false,
      savedSnapshot: saved,
    }),
    { type: 'restore-saved', snapshot: saved }
  );

  // If user already scrolled manually before async load finished, never hijack scroll
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: [],
      nextMessages: msgs,
      hasAnchoredInitial: false,
      userHasScrolled: true,
      wasNearBottom: false,
      justSentByMe: false,
      isPrependingOlder: false,
      savedSnapshot: null,
    }),
    { type: 'none' }
  );
});

test('decideMessageUpdateScrollAction ignores re-renders/catch-up refreshes and preserves prepended older messages', () => {
  const msgs = makeMessages(20, 30);

  // Async refresh returning identical latest message does NOT force scroll
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: msgs,
      nextMessages: [...msgs],
      hasAnchoredInitial: true,
      userHasScrolled: true,
      wasNearBottom: false,
      justSentByMe: false,
      isPrependingOlder: false,
    }),
    { type: 'none' }
  );

  // Prepending older messages preserves reading anchor
  const olderPlusCurrent = [...makeMessages(1, 19), ...msgs];
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: msgs,
      nextMessages: olderPlusCurrent,
      hasAnchoredInitial: true,
      userHasScrolled: true,
      wasNearBottom: false,
      justSentByMe: false,
      isPrependingOlder: true,
    }),
    { type: 'preserve-prepend' }
  );
});

test('decideMessageUpdateScrollAction scrolls only if near bottom or sent by user, otherwise shows new-message indicator', () => {
  const prev = makeMessages(1, 20);
  const next = makeMessages(1, 22);

  assert.equal(countNewlyAppendedMessages(prev, next), 2);

  // User is scrolled up reading older messages -> do not hijack scroll, surface indicator
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: prev,
      nextMessages: next,
      hasAnchoredInitial: true,
      userHasScrolled: true,
      wasNearBottom: false,
      justSentByMe: false,
      isPrependingOlder: false,
    }),
    { type: 'show-new-indicator', newlyAddedCount: 2 }
  );

  // User is at bottom -> smooth scroll to follow live chat
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: prev,
      nextMessages: next,
      hasAnchoredInitial: true,
      userHasScrolled: true,
      wasNearBottom: true,
      justSentByMe: false,
      isPrependingOlder: false,
    }),
    { type: 'scroll-bottom-smooth' }
  );

  // User sent a message while scrolled up -> smooth scroll to their newly sent message
  assert.deepEqual(
    decideMessageUpdateScrollAction({
      prevMessages: prev,
      nextMessages: makeMessages(1, 21),
      hasAnchoredInitial: true,
      userHasScrolled: true,
      wasNearBottom: false,
      justSentByMe: true,
      isPrependingOlder: false,
    }),
    { type: 'scroll-bottom-smooth' }
  );
});

test('buildScrollSnapshotKey scopes snapshots per user so role/account switches never leak scroll offsets', () => {
  assert.notEqual(
    buildScrollSnapshotKey('cust_1', 'conv_cust_1'),
    buildScrollSnapshotKey('staff_1', 'conv_cust_1')
  );
});
