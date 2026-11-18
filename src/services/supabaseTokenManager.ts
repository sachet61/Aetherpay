import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AuthTokenCoordinator,
  SESSION_EXPIRED_USER_MESSAGE,
  type TokenResolutionResult,
} from './authTokenUtils';

let lastEmittedExpiryAt = 0;

export function emitSessionExpiredNotice(reason: string = SESSION_EXPIRED_USER_MESSAGE): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  // Throttle duplicate notifications across concurrent failing requests
  if (now - lastEmittedExpiryAt < 4000) return;
  lastEmittedExpiryAt = now;
  window.dispatchEvent(
    new CustomEvent('aetherpay_auth_session_expired', {
      detail: { reason },
    })
  );
}

export function requestReauthSignIn(reason: string = SESSION_EXPIRED_USER_MESSAGE): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('aetherpay_request_reauth', {
      detail: { reason },
    })
  );
}

const coordinator = new AuthTokenCoordinator({
  getSession: async () => {
    if (!supabase || !isSupabaseConfigured()) {
      return { data: { session: null }, error: null };
    }
    return supabase.auth.getSession();
  },
  refreshSession: async () => {
    if (!supabase || !isSupabaseConfigured()) {
      return { data: { session: null }, error: { message: 'Auth session missing!' } };
    }
    return supabase.auth.refreshSession();
  },
  onRequiresReauth: (reason) => {
    emitSessionExpiredNotice(reason);
  },
});

export const supabaseTokenManager = {
  async getAccessToken(options?: {
    forceRefresh?: boolean;
    rejectedToken?: string | null;
  }): Promise<TokenResolutionResult> {
    if (!supabase || !isSupabaseConfigured()) {
      return { token: null, refreshed: false, requiresReauth: false };
    }
    return coordinator.getAccessToken(options);
  },

  markTokenValid(token?: string | null): void {
    coordinator.markTokenValid(token);
  },

  markTokenRejected(token?: string | null): void {
    coordinator.markTokenRejected(token);
  },

  isReauthRequired(): boolean {
    return coordinator.isReauthRequired();
  },

  reset(): void {
    coordinator.reset();
    lastEmittedExpiryAt = 0;
  },
};
