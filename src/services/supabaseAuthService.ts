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

class SupabaseAuthService {
  private isRecoveryMode = false;

  constructor() {
    this.initAuthListener();
    this.checkInitialUrlRecovery();
  }

  private checkInitialUrlRecovery() {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      this.isRecoveryMode = true;
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('supabase_password_recovery', {
            detail: { hash },
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
              emailVerified: Boolean(user.email_confirmed_at),
              referralCode: `REF_${user.id.slice(-5).toUpperCase()}`,
              createdAt: user.created_at || nowIso,
              lastLoginAt: nowIso,
            };
            await this.syncProfileAndWallet(userProfile);
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
            if (cleanEmail) {
              let userProfile =
                dataService.getUserById(session.user.id) ||
                dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
              if (userProfile) {
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
      const newProfile: UserProfile = {
        id: supabaseUserId,
        email: cleanEmail,
        displayName: params.displayName,
        role,
        phone: params.phone,
        status: 'active',
        emailVerified: Boolean(data.user?.email_confirmed_at),
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

      const requiresConfirmation = data.user && !data.user.email_confirmed_at && !data.session;

      return {
        success: true,
        user: newProfile,
        message: requiresConfirmation
          ? 'Account created! Please check your email inbox to confirm your address before signing in.'
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
              'Your email address has not been confirmed yet. Please check your inbox/spam for the confirmation link from Supabase, or request a new link.',
          };
        }

        // If credentials failed in Supabase, also check local demo users for instant developer convenience
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
          emailVerified: Boolean(data.user.email_confirmed_at),
          referralCode: `REF_${data.user.id.slice(-5).toUpperCase()}`,
          createdAt: data.user.created_at || nowIso,
          lastLoginAt: nowIso,
        };
        await this.syncProfileAndWallet(userProfile);
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
   * Dispatches Supabase password reset email with the active origin as the redirectTo parameter.
   * This completely resolves the localhost:3000 error when clicking the reset link.
   */
  public async sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // Explicitly pass redirectTo pointing to the current origin with hash fragment
    const redirectTo = origin ? `${origin}/#type=recovery` : undefined;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: `Password reset instructions dispatched to ${cleanEmail}. Click the link in your email to choose a new password.`,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Password reset request failed' };
    }
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

  public async resendConfirmationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: origin ? `${origin}/#auth=confirmed` : undefined,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: `Confirmation email resent to ${cleanEmail}.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to resend confirmation email.' };
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
        email_verified: profile.emailVerified ?? true,
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
