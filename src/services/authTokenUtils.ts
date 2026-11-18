export interface MinimalAuthSession {
  access_token?: string | null;
  expires_at?: number | null;
}

export interface AuthSessionResponse {
  data: { session: MinimalAuthSession | null };
  error?: { message?: string; status?: number; code?: string } | null;
}

export interface TokenResolutionResult {
  token: string | null;
  refreshed: boolean;
  requiresReauth: boolean;
  isTransientError?: boolean;
  error?: string;
}

export interface AuthTokenCoordinatorDeps {
  getSession: () => Promise<AuthSessionResponse>;
  refreshSession: () => Promise<AuthSessionResponse>;
  nowMs?: () => number;
  expiryMarginMs?: number;
  onRequiresReauth?: (reason: string) => void;
}

const DEFAULT_EXPIRY_MARGIN_MS = 30_000;
const MIN_POST_REFRESH_MARGIN_MS = 5_000;

function decodeBase64UrlToUtf8(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);

    if (typeof atob === 'function') {
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(bytes);
      }
      return binary;
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }

    return null;
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token?: string | null): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  const decoded = decodeBase64UrlToUtf8(parts[1]);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function decodeJwtExpMs(token?: string | null): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  return exp * 1000;
}

export function isJwtExpiredOrExpiring(
  token?: string | null,
  nowMs: number = Date.now(),
  marginMs: number = DEFAULT_EXPIRY_MARGIN_MS
): boolean {
  if (!token || !token.trim()) return true;
  const expMs = decodeJwtExpMs(token);
  if (expMs === null) {
    // Non-JWT or claimless test tokens are treated as opaque; server validates them.
    return false;
  }
  return expMs <= nowMs + marginMs;
}

export function isPermanentAuthRefreshError(error: any): boolean {
  if (!error) return false;
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '').trim().toLowerCase();
  const msg = String(error?.message || error?.error_description || error || '').trim().toLowerCase();

  // Explicit network / upstream 5xx glitches are transient and retryable
  if (status >= 500) return false;
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  ) {
    return false;
  }

  if (status === 400 || status === 401 || status === 403) {
    return true;
  }

  if (
    code === 'refresh_token_not_found' ||
    code === 'session_not_found' ||
    code === 'invalid_grant' ||
    code === 'bad_jwt' ||
    code === 'user_not_found' ||
    code === 'session_expired'
  ) {
    return true;
  }

  return (
    msg.includes('invalid refresh token') ||
    msg.includes('refresh token not found') ||
    msg.includes('already used') ||
    msg.includes('session_not_found') ||
    msg.includes('session from session_id claim') ||
    msg.includes('auth session missing') ||
    msg.includes('session missing') ||
    msg.includes('user not found') ||
    msg.includes('user from sub claim') ||
    msg.includes('invalid grant') ||
    msg.includes('invalid jwt') ||
    msg.includes('jwt expired') ||
    msg.includes('refresh token') && msg.includes('revoked')
  );
}

export const SESSION_EXPIRED_USER_MESSAGE =
  'Your login session has expired or was signed out on another device. Please sign in again to continue.';

export class AuthTokenCoordinator {
  private readonly deps: AuthTokenCoordinatorDeps;
  private readonly rejectedTokens = new Set<string>();
  private inFlightRefresh: Promise<TokenResolutionResult> | null = null;
  private reauthRequired = false;

  constructor(deps: AuthTokenCoordinatorDeps) {
    this.deps = deps;
  }

  private getNow(): number {
    return this.deps.nowMs ? this.deps.nowMs() : Date.now();
  }

  private getMargin(): number {
    return typeof this.deps.expiryMarginMs === 'number'
      ? this.deps.expiryMarginMs
      : DEFAULT_EXPIRY_MARGIN_MS;
  }

  private addRejectedToken(token?: string | null): void {
    const clean = typeof token === 'string' ? token.trim() : '';
    if (!clean) return;
    if (this.rejectedTokens.size >= 20) {
      const oldest = this.rejectedTokens.values().next().value;
      if (oldest) this.rejectedTokens.delete(oldest);
    }
    this.rejectedTokens.add(clean);
  }

  public markTokenValid(token?: string | null): void {
    const clean = typeof token === 'string' ? token.trim() : '';
    if (!clean) return;
    this.rejectedTokens.delete(clean);
    this.reauthRequired = false;
  }

  public markTokenRejected(token?: string | null): void {
    this.addRejectedToken(token);
  }

  public isReauthRequired(): boolean {
    return this.reauthRequired;
  }

  public reset(): void {
    this.rejectedTokens.clear();
    this.reauthRequired = false;
    this.inFlightRefresh = null;
  }

  private isTokenUsable(token?: string | null, marginMs?: number): token is string {
    const clean = typeof token === 'string' ? token.trim() : '';
    if (!clean) return false;
    if (this.rejectedTokens.has(clean)) return false;
    return !isJwtExpiredOrExpiring(clean, this.getNow(), marginMs ?? this.getMargin());
  }

  private triggerReauth(reason: string): void {
    this.reauthRequired = true;
    try {
      this.deps.onRequiresReauth?.(reason);
    } catch {
      // Listener errors should never break auth resolution
    }
  }

  private async runSingleFlightRefresh(): Promise<TokenResolutionResult> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    this.inFlightRefresh = (async (): Promise<TokenResolutionResult> => {
      try {
        const refreshRes = await this.deps.refreshSession();
        const refreshedToken = refreshRes?.data?.session?.access_token?.trim() || null;

        if (this.isTokenUsable(refreshedToken, MIN_POST_REFRESH_MARGIN_MS)) {
          this.rejectedTokens.clear();
          this.reauthRequired = false;
          return {
            token: refreshedToken,
            refreshed: true,
            requiresReauth: false,
          };
        }

        // Check if another tab or GoTrue auto-refresh rotated the session concurrently
        let latestSessionToken: string | null = null;
        try {
          const latestRes = await this.deps.getSession();
          latestSessionToken = latestRes?.data?.session?.access_token?.trim() || null;
        } catch {
          latestSessionToken = null;
        }

        if (this.isTokenUsable(latestSessionToken, MIN_POST_REFRESH_MARGIN_MS)) {
          this.rejectedTokens.clear();
          this.reauthRequired = false;
          return {
            token: latestSessionToken,
            refreshed: true,
            requiresReauth: false,
          };
        }

        // CRITICAL: Never return a previously rejected or expired token!
        if (refreshedToken) {
          this.addRejectedToken(refreshedToken);
        }
        if (latestSessionToken) {
          this.addRejectedToken(latestSessionToken);
        }

        const refreshErr = refreshRes?.error;
        if (refreshErr && !isPermanentAuthRefreshError(refreshErr)) {
          return {
            token: null,
            refreshed: false,
            requiresReauth: false,
            isTransientError: true,
            error:
              String(refreshErr?.message || '') ||
              'Temporary network error refreshing authentication. Please try again.',
          };
        }

        const reason = SESSION_EXPIRED_USER_MESSAGE;
        this.triggerReauth(reason);
        return {
          token: null,
          refreshed: false,
          requiresReauth: true,
          error: reason,
        };
      } catch (err: any) {
        if (!isPermanentAuthRefreshError(err)) {
          return {
            token: null,
            refreshed: false,
            requiresReauth: false,
            isTransientError: true,
            error:
              String(err?.message || '') ||
              'Temporary network error refreshing authentication. Please try again.',
          };
        }
        const reason = SESSION_EXPIRED_USER_MESSAGE;
        this.triggerReauth(reason);
        return {
          token: null,
          refreshed: false,
          requiresReauth: true,
          error: reason,
        };
      } finally {
        this.inFlightRefresh = null;
      }
    })();

    return this.inFlightRefresh;
  }

  public async getAccessToken(options?: {
    forceRefresh?: boolean;
    rejectedToken?: string | null;
  }): Promise<TokenResolutionResult> {
    if (options?.rejectedToken) {
      this.addRejectedToken(options.rejectedToken);
    }

    if (options?.forceRefresh) {
      return this.runSingleFlightRefresh();
    }

    let currentToken: string | null = null;
    try {
      const sessionRes = await this.deps.getSession();
      currentToken = sessionRes?.data?.session?.access_token?.trim() || null;
    } catch {
      currentToken = null;
    }

    if (this.isTokenUsable(currentToken)) {
      this.reauthRequired = false;
      return {
        token: currentToken,
        refreshed: false,
        requiresReauth: false,
      };
    }

    // If there is a token in storage that is expiring/expired or rejected, refresh it cleanly
    if (currentToken || this.rejectedTokens.size > 0 || this.reauthRequired) {
      if (currentToken) {
        this.addRejectedToken(currentToken);
      }
      return this.runSingleFlightRefresh();
    }

    return {
      token: null,
      refreshed: false,
      requiresReauth: false,
    };
  }
}
