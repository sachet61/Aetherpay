export type AppOverlayKey = 'drawer' | 'notifications' | 'wheel' | 'more_drawer';

export interface AppHistoryState {
  tab: string;
  overlay?: AppOverlayKey;
}

export interface OverlayStateSnapshot {
  drawerOpen: boolean;
  notificationsOpen: boolean;
  wheelOpen: boolean;
  moreDrawerOpen: boolean;
}

export type PopStateDecision =
  | { kind: 'ignore_synthetic_overlay_back' }
  | { kind: 'legal_hash' }
  | {
      kind: 'sync_overlays_only';
      overlayToShow: AppOverlayKey | null;
    }
  | {
      kind: 'navigate_tab';
      destinationTab: string;
      overlayToShow: AppOverlayKey | null;
      shouldPopTabHistory: boolean;
    };

const VALID_OVERLAY_KEYS: ReadonlySet<string> = new Set<AppOverlayKey>([
  'drawer',
  'notifications',
  'wheel',
  'more_drawer',
]);

export function readOverlayFromHistoryState(state: unknown): AppOverlayKey | null {
  if (!state || typeof state !== 'object') return null;
  const candidate = (state as { overlay?: unknown }).overlay;
  if (typeof candidate === 'string' && VALID_OVERLAY_KEYS.has(candidate)) {
    return candidate as AppOverlayKey;
  }
  return null;
}

export function readTabFromHistoryState(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;
  const candidate = (state as { tab?: unknown }).tab;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return null;
}

export function buildHistoryState(tab: string, overlay?: AppOverlayKey | null): AppHistoryState {
  if (overlay) {
    return { tab, overlay };
  }
  return { tab };
}

export function getTopActiveOverlay(snapshot: OverlayStateSnapshot): AppOverlayKey | null {
  if (snapshot.wheelOpen) return 'wheel';
  if (snapshot.notificationsOpen) return 'notifications';
  if (snapshot.drawerOpen) return 'drawer';
  if (snapshot.moreDrawerOpen) return 'more_drawer';
  return null;
}

export function resolveHistoryActionOnOverlayOpen(params: {
  currentState: unknown;
  activeTab: string;
  targetOverlay: AppOverlayKey;
}): {
  method: 'push' | 'replace' | 'none';
  nextState: AppHistoryState;
} {
  const { currentState, activeTab, targetOverlay } = params;
  const currentOverlay = readOverlayFromHistoryState(currentState);
  const currentTab = readTabFromHistoryState(currentState);

  if (currentOverlay === targetOverlay && currentTab === activeTab) {
    return {
      method: 'none',
      nextState: buildHistoryState(activeTab, targetOverlay),
    };
  }

  if (currentOverlay !== null) {
    return {
      method: 'replace',
      nextState: buildHistoryState(activeTab, targetOverlay),
    };
  }

  return {
    method: 'push',
    nextState: buildHistoryState(activeTab, targetOverlay),
  };
}

export function resolveHistoryActionOnNavigate(params: {
  currentState: unknown;
  currentTab: string;
  targetTab: string;
  replace?: boolean;
  isBack?: boolean;
}): {
  method: 'push' | 'replace' | 'none';
  shouldRecordTabHistory: 'push' | 'replace' | 'none';
  nextState: AppHistoryState;
} {
  const { currentState, currentTab, targetTab, replace, isBack } = params;

  if (isBack) {
    return {
      method: 'none',
      shouldRecordTabHistory: 'none',
      nextState: buildHistoryState(targetTab),
    };
  }

  if (replace) {
    return {
      method: 'replace',
      shouldRecordTabHistory: 'replace',
      nextState: buildHistoryState(targetTab),
    };
  }

  if (targetTab !== currentTab) {
    const hasActiveOverlayInHistory = readOverlayFromHistoryState(currentState) !== null;
    return {
      method: hasActiveOverlayInHistory ? 'replace' : 'push',
      shouldRecordTabHistory: 'push',
      nextState: buildHistoryState(targetTab),
    };
  }

  return {
    method: 'none',
    shouldRecordTabHistory: 'none',
    nextState: buildHistoryState(targetTab),
  };
}

export function resolvePopStateTransition(params: {
  eventState: unknown;
  currentHash: string;
  currentTab: string;
  defaultTab: string;
  openOverlays: OverlayStateSnapshot;
  isSyntheticOverlayBack: boolean;
}): PopStateDecision {
  const {
    eventState,
    currentHash,
    currentTab,
    defaultTab,
    openOverlays,
    isSyntheticOverlayBack,
  } = params;

  if (isSyntheticOverlayBack) {
    return { kind: 'ignore_synthetic_overlay_back' };
  }

  if (
    currentHash === '#privacy' ||
    currentHash === '#data-deletion' ||
    currentHash === '#datadeletion'
  ) {
    return { kind: 'legal_hash' };
  }

  const nextOverlay = readOverlayFromHistoryState(eventState);
  const topOpenOverlay = getTopActiveOverlay(openOverlays);
  const stateTab = readTabFromHistoryState(eventState);
  const hashTab = currentHash.replace(/^#\/?/, '').trim();
  const destinationTab =
    stateTab || (hashTab && hashTab !== 'privacy' ? hashTab : defaultTab);

  // Android / browser Back while an overlay is open on the same tab:
  // Dismiss or sync the overlay without modifying activeTab or tabHistory.
  if (destinationTab === currentTab && (topOpenOverlay !== null || nextOverlay !== null)) {
    return {
      kind: 'sync_overlays_only',
      overlayToShow: nextOverlay,
    };
  }

  return {
    kind: 'navigate_tab',
    destinationTab,
    overlayToShow: nextOverlay,
    shouldPopTabHistory: destinationTab !== currentTab,
  };
}
