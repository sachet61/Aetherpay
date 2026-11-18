import { UserRole } from '../types';

export interface HydrationGateInput {
  currentUserId?: string | null;
  isHydrating: boolean;
  hydratedUserId?: string | null;
  bypassedUserId?: string | null;
  hydrationError?: string | null;
  supabaseConfigured: boolean;
}

export function shouldShowSessionHydrationGate(input: HydrationGateInput): boolean {
  if (!input.currentUserId) return false;
  if (!input.supabaseConfigured) return false;
  if (input.bypassedUserId && input.bypassedUserId === input.currentUserId) {
    return false;
  }
  if (input.isHydrating) return true;
  if (input.hydrationError) return true;
  return input.hydratedUserId !== input.currentUserId;
}

export interface SilentRefreshInput {
  targetUserId?: string | null;
  lastHydratedUserId?: string | null;
  lastHydrationError?: string | null;
  force?: boolean;
}

/**
 * When the active user session is already hydrated with no prior error and not explicitly forced,
 * resume/focus auth events must run as a silent delta refresh rather than triggering the blocking
 * SessionHydrationScreen (which unmounts active forms like file uploaders on mobile resume).
 */
export function shouldRunSilentBackgroundRefresh(input: SilentRefreshInput): boolean {
  if (!input.targetUserId) return false;
  if (input.force) return false;
  if (input.lastHydrationError) return false;
  return Boolean(input.lastHydratedUserId && input.lastHydratedUserId === input.targetUserId);
}

export interface HydrationPhaseLabelInput {
  role?: UserRole;
  elapsedMs: number;
  timedOut: boolean;
  errorMessage?: string | null;
}

export function resolveHydrationPhaseLabel(input: HydrationPhaseLabelInput): string {
  if (input.errorMessage) {
    return 'Account sync encountered an issue. You can retry or continue.';
  }
  if (input.timedOut) {
    return 'Sync is taking longer than expected. You can retry or continue to your workspace.';
  }

  const isStaff = input.role === 'admin' || input.role === 'agent';
  if (input.elapsedMs < 1200) {
    return isStaff
      ? 'Verifying staff session and workspace access...'
      : 'Verifying session and loading wallet ledger...';
  }
  if (input.elapsedMs < 4000) {
    return isStaff
      ? 'Syncing queues, conversations, and player gaming IDs...'
      : 'Syncing deposits, withdrawals, gaming IDs, and chat...';
  }
  return 'Finalizing encrypted account data...';
}

export function getPrefetchRouteKeysForRole(
  role?: UserRole,
  activeTab?: string
): string[] {
  const keys = new Set<string>();
  if (activeTab) {
    keys.add(activeTab);
  }
  if (role === 'customer') {
    keys.add('dashboard');
    keys.add('wallet');
  } else if (role === 'agent') {
    keys.add('ops_chat');
    keys.add('ops_requests');
  } else if (role === 'admin') {
    keys.add('ops_dashboard');
    keys.add('ops_requests');
    keys.add('ops_chat');
  }
  return Array.from(keys);
}
