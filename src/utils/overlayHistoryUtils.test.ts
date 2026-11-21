import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHistoryState,
  getTopActiveOverlay,
  readOverlayFromHistoryState,
  readTabFromHistoryState,
  resolveHistoryActionOnNavigate,
  resolveHistoryActionOnOverlayOpen,
  resolvePopStateTransition,
} from './overlayHistoryUtils';

const NO_OVERLAYS = {
  drawerOpen: false,
  notificationsOpen: false,
  wheelOpen: false,
  moreDrawerOpen: false,
};

test('readOverlayFromHistoryState and readTabFromHistoryState validate unknown inputs safely', () => {
  assert.equal(readOverlayFromHistoryState(null), null);
  assert.equal(readOverlayFromHistoryState({ tab: 'dashboard', overlay: 'invalid' }), null);
  assert.equal(readOverlayFromHistoryState({ tab: 'dashboard', overlay: 'drawer' }), 'drawer');
  assert.equal(readOverlayFromHistoryState({ tab: 'dashboard', overlay: 'notifications' }), 'notifications');
  assert.equal(readOverlayFromHistoryState({ tab: 'dashboard', overlay: 'wheel' }), 'wheel');

  assert.equal(readTabFromHistoryState(undefined), null);
  assert.equal(readTabFromHistoryState({ tab: '  ' }), null);
  assert.equal(readTabFromHistoryState({ tab: ' wallet ' }), 'wallet');
});

test('getTopActiveOverlay follows z-index priority order', () => {
  assert.equal(getTopActiveOverlay(NO_OVERLAYS), null);
  assert.equal(getTopActiveOverlay({ ...NO_OVERLAYS, moreDrawerOpen: true }), 'more_drawer');
  assert.equal(
    getTopActiveOverlay({ ...NO_OVERLAYS, moreDrawerOpen: true, drawerOpen: true }),
    'drawer'
  );
  assert.equal(
    getTopActiveOverlay({ ...NO_OVERLAYS, drawerOpen: true, notificationsOpen: true }),
    'notifications'
  );
  assert.equal(
    getTopActiveOverlay({
      drawerOpen: true,
      notificationsOpen: true,
      wheelOpen: true,
      moreDrawerOpen: true,
    }),
    'wheel'
  );
});

test('resolveHistoryActionOnOverlayOpen pushes when clean, avoids duplicate push, and replaces across overlays', () => {
  const pushDrawer = resolveHistoryActionOnOverlayOpen({
    currentState: { tab: 'dashboard' },
    activeTab: 'dashboard',
    targetOverlay: 'drawer',
  });
  assert.deepEqual(pushDrawer, {
    method: 'push',
    nextState: { tab: 'dashboard', overlay: 'drawer' },
  });

  const duplicateDrawer = resolveHistoryActionOnOverlayOpen({
    currentState: { tab: 'dashboard', overlay: 'drawer' },
    activeTab: 'dashboard',
    targetOverlay: 'drawer',
  });
  assert.equal(duplicateDrawer.method, 'none');

  // Opening Wheel directly from inside the open drawer replaces the overlay marker in place
  const drawerToWheel = resolveHistoryActionOnOverlayOpen({
    currentState: { tab: 'dashboard', overlay: 'drawer' },
    activeTab: 'dashboard',
    targetOverlay: 'wheel',
  });
  assert.deepEqual(drawerToWheel, {
    method: 'replace',
    nextState: { tab: 'dashboard', overlay: 'wheel' },
  });
});

test('resolveHistoryActionOnNavigate replaces synthetic overlay entry when navigating to a new tab', () => {
  const fromDrawerToWallet = resolveHistoryActionOnNavigate({
    currentState: { tab: 'dashboard', overlay: 'drawer' },
    currentTab: 'dashboard',
    targetTab: 'wallet',
  });
  assert.deepEqual(fromDrawerToWallet, {
    method: 'replace',
    shouldRecordTabHistory: 'push',
    nextState: { tab: 'wallet' },
  });

  const normalNavigate = resolveHistoryActionOnNavigate({
    currentState: { tab: 'dashboard' },
    currentTab: 'dashboard',
    targetTab: 'wallet',
  });
  assert.deepEqual(normalNavigate, {
    method: 'push',
    shouldRecordTabHistory: 'push',
    nextState: { tab: 'wallet' },
  });

  const sameTabFromDrawer = resolveHistoryActionOnNavigate({
    currentState: { tab: 'wallet', overlay: 'drawer' },
    currentTab: 'wallet',
    targetTab: 'wallet',
  });
  assert.deepEqual(sameTabFromDrawer, {
    method: 'none',
    shouldRecordTabHistory: 'none',
    nextState: { tab: 'wallet' },
  });
});

test('resolvePopStateTransition closes open overlay on Android Back and stays on current page', () => {
  const decision = resolvePopStateTransition({
    eventState: { tab: 'topup' },
    currentHash: '#topup',
    currentTab: 'topup',
    defaultTab: 'dashboard',
    openOverlays: { ...NO_OVERLAYS, drawerOpen: true },
    isSyntheticOverlayBack: false,
  });
  assert.deepEqual(decision, {
    kind: 'sync_overlays_only',
    overlayToShow: null,
  });
});

test('resolvePopStateTransition handles notifications and wheel modal Back cleanly', () => {
  const notifBack = resolvePopStateTransition({
    eventState: { tab: 'dashboard' },
    currentHash: '#dashboard',
    currentTab: 'dashboard',
    defaultTab: 'dashboard',
    openOverlays: { ...NO_OVERLAYS, notificationsOpen: true },
    isSyntheticOverlayBack: false,
  });
  assert.deepEqual(notifBack, {
    kind: 'sync_overlays_only',
    overlayToShow: null,
  });

  const wheelBack = resolvePopStateTransition({
    eventState: { tab: 'wallet' },
    currentHash: '#wallet',
    currentTab: 'wallet',
    defaultTab: 'dashboard',
    openOverlays: { ...NO_OVERLAYS, wheelOpen: true },
    isSyntheticOverlayBack: false,
  });
  assert.deepEqual(wheelBack, {
    kind: 'sync_overlays_only',
    overlayToShow: null,
  });
});

test('resolvePopStateTransition restores overlay on browser Forward and ignores synthetic UI dismiss pops', () => {
  const forwardToDrawer = resolvePopStateTransition({
    eventState: { tab: 'dashboard', overlay: 'drawer' },
    currentHash: '#dashboard',
    currentTab: 'dashboard',
    defaultTab: 'dashboard',
    openOverlays: NO_OVERLAYS,
    isSyntheticOverlayBack: false,
  });
  assert.deepEqual(forwardToDrawer, {
    kind: 'sync_overlays_only',
    overlayToShow: 'drawer',
  });

  const syntheticUiBack = resolvePopStateTransition({
    eventState: { tab: 'topup' },
    currentHash: '#topup',
    currentTab: 'topup',
    defaultTab: 'dashboard',
    openOverlays: NO_OVERLAYS,
    isSyntheticOverlayBack: true,
  });
  assert.deepEqual(syntheticUiBack, {
    kind: 'ignore_synthetic_overlay_back',
  });
});

test('resolvePopStateTransition handles real tab back navigation and legal hashes', () => {
  const backToDashboard = resolvePopStateTransition({
    eventState: { tab: 'dashboard' },
    currentHash: '#dashboard',
    currentTab: 'topup',
    defaultTab: 'dashboard',
    openOverlays: NO_OVERLAYS,
    isSyntheticOverlayBack: false,
  });
  assert.deepEqual(backToDashboard, {
    kind: 'navigate_tab',
    destinationTab: 'dashboard',
    overlayToShow: null,
    shouldPopTabHistory: true,
  });

  const legal = resolvePopStateTransition({
    eventState: null,
    currentHash: '#privacy',
    currentTab: 'dashboard',
    defaultTab: 'dashboard',
    openOverlays: NO_OVERLAYS,
    isSyntheticOverlayBack: false,
  });
  assert.deepEqual(legal, { kind: 'legal_hash' });
  assert.deepEqual(buildHistoryState('dashboard'), { tab: 'dashboard' });
});
