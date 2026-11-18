import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeVisualViewportState,
  shouldSubmitOnTextareaKeyDown,
} from './chatViewportUtils';

test('computeVisualViewportState stays inactive when viewport is full height or missing', () => {
  assert.deepEqual(
    computeVisualViewportState({ innerHeight: 844, visualHeight: null }),
    { isKeyboardOpen: false, containerHeightPx: null, offsetTopPx: 0 }
  );

  assert.deepEqual(
    computeVisualViewportState({ innerHeight: 844, visualHeight: 844, visualOffsetTop: 0 }),
    { isKeyboardOpen: false, containerHeightPx: null, offsetTopPx: 0 }
  );

  // Small mobile address bar fluctuations (< 120px) must not trigger keyboard mode
  assert.deepEqual(
    computeVisualViewportState({ innerHeight: 844, visualHeight: 780, visualOffsetTop: 0 }),
    { isKeyboardOpen: false, containerHeightPx: null, offsetTopPx: 0 }
  );
});

test('computeVisualViewportState detects open mobile keyboard and clamps offsetTop cleanly', () => {
  assert.deepEqual(
    computeVisualViewportState({ innerHeight: 844, visualHeight: 512, visualOffsetTop: 18 }),
    { isKeyboardOpen: true, containerHeightPx: 512, offsetTopPx: 18 }
  );

  assert.deepEqual(
    computeVisualViewportState({ innerHeight: 844, visualHeight: 490.4, visualOffsetTop: -4 }),
    { isKeyboardOpen: true, containerHeightPx: 490, offsetTopPx: 0 }
  );
});

test('shouldSubmitOnTextareaKeyDown handles Enter, Shift+Enter, and IME composition properly', () => {
  assert.equal(shouldSubmitOnTextareaKeyDown({ key: 'Enter', shiftKey: false }), true);
  assert.equal(shouldSubmitOnTextareaKeyDown({ key: 'Enter', shiftKey: true }), false);
  assert.equal(
    shouldSubmitOnTextareaKeyDown({ key: 'Enter', shiftKey: false, isComposing: true }),
    false
  );
  assert.equal(shouldSubmitOnTextareaKeyDown({ key: 'a', shiftKey: false }), false);
});
