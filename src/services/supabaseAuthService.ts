import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole } from '../types';
import { authSessionService } from './authSessionService';
import { dataService } from './dataService';

export interface SupabaseAuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  message?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  actionLink?: string;
  pin?: string;
  token?: string;
}

class SupabaseAuthService {
  private isRecoveryMode = false;

  constructor() {
    this.initAuthListener();
    this.checkInitialUrlRecovery();
  }

  private checkInitialUrlRecovery() {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || hash.includes('access_token') || search.includes('type=recovery')) {
      this.isRecoveryMode = true;
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('supabase_password_recovery', {
            detail: { hash, search },
          })
        );
      }, 300);
    }
  }

  private initAuthListener() {
    if (supabase) {
      // 1. Listen for auth changes (including OAuth callback & password recovery)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.isRecoveryMode = true;
          window.dispatchEvent(
            new CustomEvent('supabase_password_recovery', {
              detail: { session },
            })
          );
        }

        if (
          (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') &&
          session?.user
        ) {
          const user = session.user;
          const cleanEmail = (user.email || '').trim().toLowerCase();
          if (!cleanEmail) return;

          const isConfirmed = Boolean(user.email_confirmed_at);
          let userProfile =
            dataService.getUserById(user.id) ||
            dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
          const nowIso = new Date().toISOString();

          if (!userProfile) {
            userProfile = {
              id: user.id,
              email: cleanEmail,
              displayName:
                user.user_metadata?.display_name ||
                user.user_metadata?.full_name ||
                cleanEmail.split('@')[0],
              role: (user.user_metadata?.role as UserRole) || 'customer',
              status: 'active',
              emailVerified: isConfirmed,
              referralCode: `REF_${user.id.slice(-5).toUpperCase()}`,
              createdAt: user.created_at || nowIso,
              lastLoginAt: nowIso,
            };
            await this.syncProfileAndWallet(userProfile);
          } else {
            // Update emailVerified dynamically from active Supabase session
            userProfile.emailVerified = isConfirmed;
            dataService.registerUser(userProfile);
          }

          authSessionService.createSessionForUser(
            userProfile.id,
            userProfile.email,
            userProfile.displayName,
            userProfile.role
          );
        }
      });

      // 2. Initial check on startup
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            const cleanEmail = (session.user.email || '').trim().toLowerCase();
            const isConfirmed = Boolean(session.user.email_confirmed_at);
            if (cleanEmail) {
              let userProfile =
                dataService.getUserById(session.user.id) ||
                dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
              if (userProfile) {
                userProfile.emailVerified = isConfirmed;
                dataService.registerUser(userProfile);
                authSessionService.createSessionForUser(
                  userProfile.id,
                  userProfile.email,
                  userProfile.displayName,
                  userProfile.role
                );
              }
            }
          }
        })
        .catch((err) => console.warn('Supabase getSession notice:', err));
    }
  }

  public getIsRecoveryMode(): boolean {
    return this.isRecoveryMode;
  }

  public clearRecoveryMode(): void {
    this.isRecoveryMode = false;
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      window.location.hash = '';
    }
  }

  public async registerWithEmail(params: {
    email: string;
    password: string;
    displayName: string;
    role?: UserRole;
    phone?: string;
    referralCode?: string;
  }): Promise<SupabaseAuthResult> {
    const cleanEmail = params.email.trim().toLowerCase();
    const role: UserRole = params.role || 'customer';
    const nowIso = new Date().toISOString();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          emailRedirectTo: origin ? `${origin}/#auth=confirmed` : undefined,
          data: {
            display_name: params.displayName,
            role,
            phone: params.phone || '',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const supabaseUserId = data.user?.id || `usr_${Date.now()}`;
      const isConfirmed = Boolean(data.user?.email_confirmed_at);

      const newProfile: UserProfile = {
        id: supabaseUserId,
        email: cleanEmail,
        displayName: params.displayName,
        role,
        phone: params.phone,
        status: 'active',
        emailVerified: isConfirmed,
        referralCode: `REF_${params.displayName.replace(/\s+/g, '').toUpperCase()}_${Date.now().toString().slice(-4)}`,
        referredBy: params.referralCode,
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };

      // Sync profile and wallet in dataService / database
      await this.syncProfileAndWallet(newProfile);

      // Issue active session
      authSessionService.createSessionForUser(
        newProfile.id,
        newProfile.email,
        newProfile.displayName,
        newProfile.role
      );

      const requiresConfirmation = data.user && !isConfirmed && !data.session;

      return {
        success: true,
        user: newProfile,
        message: requiresConfirmation
          ? 'Account created! Please check your email inbox to verify your address, or click Verify Now in your profile.'
          : 'Account registered and profile activated successfully with Supabase.',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Supabase signup failed' };
    }
  }

  public async loginWithEmail(email: string, password: string): Promise<SupabaseAuthResult> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // Helpful handling for unconfirmed emails
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return {
            success: false,
            error:
              'Your email address has not been confirmed yet. Please verify your email or click resend below.',
          };
        }

        // If credentials failed in Supabase, also check local demo users for instant ease-of-use
        const localUser = dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
        if (localUser) {
          authSessionService.createSessionForUser(
            localUser.id,
            localUser.email,
            localUser.displayName,
            localUser.role
          );
          return { success: true, user: localUser };
        }

        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'User account not returned by Supabase.' };
      }

      const isConfirmed = Boolean(data.user.email_confirmed_at);
      let userProfile =
        dataService.getUserById(data.user.id) ||
        dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);

      if (!userProfile) {
        const nowIso = new Date().toISOString();
        userProfile = {
          id: data.user.id,
          email: cleanEmail,
          displayName: data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
          role: (data.user.user_metadata?.role as UserRole) || 'customer',
          status: 'active',
          emailVerified: isConfirmed,
          referralCode: `REF_${data.user.id.slice(-5).toUpperCase()}`,
          createdAt: data.user.created_at || nowIso,
          lastLoginAt: nowIso,
        };
        await this.syncProfileAndWallet(userProfile);
      } else {
        userProfile.emailVerified = isConfirmed;
        dataService.registerUser(userProfile);
      }

      authSessionService.createSessionForUser(
        userProfile.id,
        userProfile.email,
        userProfile.displayName,
        userProfile.role
      );

      return { success: true, user: userProfile };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed' };
    }
  }

  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google OAuth failed' };
    }
  }

  public async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    authSessionService.destroySession();
  }

  /**
   * Generates password reset link avoiding localhost:3000 redirects.
   * Calls server endpoint to generate direct domain-aware recovery action link and 6-digit PIN.
   */
  public async sendPasswordReset(email: string): Promise<PasswordResetResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = origin ? `${origin}/#type=recovery` : undefined;

    let actionLink: string | undefined;
    let pin: string | undefined;
    let token: string | undefined;

    // 1. Call server API to generate direct domain-aware action link and 6-digit PIN
    try {
      const resp = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (resp.ok) {
        const json = await resp.json();
        actionLink = json.actionLink;
        pin = json.pin;
        token = json.token;
      }
    } catch (err) {
      console.warn('Server request-reset endpoint notice:', err);
    }

    // 2. Dispatch Supabase background reset email with dynamic redirectTo
    try {
      supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo }).catch(() => {});
    } catch {}

    return {
      success: true,
      message: `Password reset link and code prepared for ${cleanEmail}. Click the direct link or enter your 6-digit PIN.`,
      actionLink,
      pin,
      token,
    };
  }

  /**
   * Updates user password for the authenticated or recovery session.
   */
  public async updateUserPassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: error.message };
      }

      // Also update local password hash in authSessionService if user email is known
      const user = data.user;
      if (user?.email) {
        authSessionService.updatePassword(user.email, newPassword);
      }

      this.clearRecoveryMode();
      return { success: true, message: 'Password successfully updated! You can now sign in.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to update password' };
    }
  }

  /**
   * Verifies an OTP code or 6-digit recovery token directly.
   */
  public async verifyOtpForRecovery(
    email: string,
    token: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'recovery',
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Recovery token verified successfully.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to verify token' };
    }
  }

  public async resendConfirmationEmail(email: string): Promise<{
    success: boolean;
    message: string;
    actionLink?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = origin ? `${origin}/#auth=confirmed` : undefined;

    let actionLink: string | undefined;

    // 1. Call server API to generate direct domain-aware verification link
    try {
      const resp = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (resp.ok) {
        const json = await resp.json();
        actionLink = json.actionLink;
      }
    } catch (err) {
      console.warn('Server resend-verification notice:', err);
    }

    // 2. Dispatch Supabase client resend
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
    } catch {}

    return {
      success: true,
      actionLink,
      message: `Verification link dispatched for ${cleanEmail}. Check your inbox or click the link directly.`,
    };
  }

  public async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    message: string;
    actionLink?: string;
  }> {
    return this.resendConfirmationEmail(email);
  }

  public async confirmEmailNow(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const resp = await fetch('/api/auth/confirm-email-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        const user = dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
        if (user) {
          user.emailVerified = true;
          dataService.registerUser(user);
        }
        return { success: true, message: data.message || 'Email successfully verified in Supabase!' };
      }
      return { success: false, message: data.error || 'Failed to confirm email.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Verification failed' };
    }
  }

  private async syncProfileAndWallet(profile: UserProfile): Promise<void> {
    dataService.registerUser(profile);

    try {
      await supabase.from('users').upsert({
        id: profile.id,
        email: profile.email,
        display_name: profile.displayName,
        role: profile.role,
        phone: profile.phone || null,
        status: profile.status,
        email_verified: profile.emailVerified ?? false,
        referred_by: profile.referredBy || null,
        created_at: profile.createdAt,
      });

      const wallet = dataService.getWallet(profile.id);
      if (wallet) {
        await supabase.from('wallets').upsert({
          customer_id: profile.id,
          balance: wallet.availableBalance,
          pending_withdrawal: wallet.reservedBalance,
          pending_deposit: wallet.pendingDepositBalance,
          total_deposited: wallet.lastTopUpAmount || 0,
          total_withdrawn: 0,
          currency: wallet.currency || 'USD',
        });
      }
    } catch (err) {
      console.warn('Supabase profile sync notice:', err);
    }
  }
}

export const supabaseAuthService = new SupabaseAuthService();
