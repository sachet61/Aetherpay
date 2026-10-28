import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole } from '../types';
import { authSessionService } from './authSessionService';
import { dataService } from './dataService';

export interface SupabaseAuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  message?: string;
  isUnverified?: boolean;
  email?: string;
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
          const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
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
              role: isParentAdminEmail ? 'admin' : ((user.user_metadata?.role as UserRole) || 'customer'),
              status: 'active',
              emailVerified: isConfirmed,
              referralCode: `REF_${user.id.slice(-5).toUpperCase()}`,
              createdAt: user.created_at || nowIso,
              lastLoginAt: nowIso,
              isParentAdmin: isParentAdminEmail ? true : undefined,
            };
            await this.syncProfileAndWallet(userProfile);
          } else {
            // Reconcile and migrate if user profile ID differs from Supabase canonical ID
            if (userProfile.id !== user.id) {
              const oldId = userProfile.id;
              userProfile.id = user.id;
              dataService.migrateUserEntityIds(oldId, user.id);
            }
            // Update emailVerified dynamically from active Supabase session
            userProfile.emailVerified = isConfirmed;
            if (isParentAdminEmail && userProfile.role !== 'admin') {
              userProfile.role = 'admin';
              userProfile.isParentAdmin = true;
            }
            dataService.registerUser(userProfile);
          }

          authSessionService.createSessionForUser(
            userProfile.id,
            userProfile.email,
            userProfile.displayName,
            userProfile.role,
            userProfile.emailVerified
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
              const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
              let userProfile =
                dataService.getUserById(session.user.id) ||
                dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
              if (userProfile) {
                if (userProfile.id !== session.user.id) {
                  const oldId = userProfile.id;
                  userProfile.id = session.user.id;
                  dataService.migrateUserEntityIds(oldId, session.user.id);
                }
                userProfile.emailVerified = isConfirmed;
                if (isParentAdminEmail && userProfile.role !== 'admin') {
                  userProfile.role = 'admin';
                  userProfile.isParentAdmin = true;
                }
                dataService.registerUser(userProfile);
                authSessionService.createSessionForUser(
                  userProfile.id,
                  userProfile.email,
                  userProfile.displayName,
                  userProfile.role,
                  userProfile.emailVerified
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
    const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
    const role: UserRole = isParentAdminEmail ? 'admin' : (params.role || 'customer');
    const nowIso = new Date().toISOString();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      // 1. Strict Duplicate Email Prevention across Supabase and local cache
      if (supabase) {
        const { data: existingDbUser } = await supabase
          .from('users')
          .select('id, email')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (existingDbUser) {
          return {
            success: false,
            error: 'An account with this email address already exists. Please log in or reset your password.',
          };
        }
      }

      const existingLocal = dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
      if (existingLocal) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please log in or reset your password.',
        };
      }

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

      // Check for empty identities array returned by Supabase when user already exists
      if (data.user?.identities && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please log in or reset your password.',
        };
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
        newProfile.role,
        newProfile.emailVerified
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
        const errLower = error.message.toLowerCase();
        if (errLower.includes('email not confirmed') || errLower.includes('email_not_confirmed') || errLower.includes('not confirmed')) {
          return {
            success: false,
            error: 'Your email address is not verified yet. Please enter your 6-digit verification code below to activate your account.',
            isUnverified: true,
            email: cleanEmail,
          };
        }

        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'User account not returned by Supabase.' };
      }

      const isConfirmed = Boolean(data.user.email_confirmed_at);
      const isParentAdminEmail = cleanEmail === 'sachet61@gmail.com';
      let userProfile =
        dataService.getUserById(data.user.id) ||
        dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);

      if (!userProfile) {
        const nowIso = new Date().toISOString();
        userProfile = {
          id: data.user.id,
          email: cleanEmail,
          displayName: data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
          role: isParentAdminEmail ? 'admin' : ((data.user.user_metadata?.role as UserRole) || 'customer'),
          status: 'active',
          emailVerified: isConfirmed,
          referralCode: `REF_${data.user.id.slice(-5).toUpperCase()}`,
          createdAt: data.user.created_at || nowIso,
          lastLoginAt: nowIso,
          isParentAdmin: isParentAdminEmail ? true : undefined,
        };
        await this.syncProfileAndWallet(userProfile);
      } else {
        if (userProfile.id !== data.user.id) {
          const oldId = userProfile.id;
          userProfile.id = data.user.id;
          dataService.migrateUserEntityIds(oldId, data.user.id);
        }
        userProfile.emailVerified = isConfirmed;
        if (isParentAdminEmail && userProfile.role !== 'admin') {
          userProfile.role = 'admin';
          userProfile.isParentAdmin = true;
        }
        dataService.registerUser(userProfile);
        if (isConfirmed && supabase && isSupabaseConfigured()) {
          Promise.resolve(
            supabase
              .from('users')
              .update({
                email_verified: true,
                ...(isParentAdminEmail ? { role: 'admin' } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq('id', userProfile.id)
          ).catch(() => {});
        }
      }

      authSessionService.createSessionForUser(
        userProfile.id,
        userProfile.email,
        userProfile.displayName,
        userProfile.role,
        userProfile.emailVerified
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
  /**
   * Dispatches Supabase password reset OTP code.
   * Checks database first to verify the email exists before sending.
   */
  public async sendPasswordReset(email: string): Promise<PasswordResetResponse> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    // 1. Authoritative check and dispatch via backend API (queries PostgreSQL 'users' table, Supabase Auth, and dispatches email)
    try {
      const resp = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (data && data.success) {
          return {
            success: true,
            message: data.message || `Password reset instructions have been dispatched to ${cleanEmail}. Please check your email inbox.`,
          };
        }
      }
      if (resp.status === 404) {
        const errorJson = await resp.json().catch(() => ({}));
        return {
          success: false,
          message: errorJson.error || 'No account found with this email address. Please check your spelling or sign up.',
        };
      }
    } catch (err) {
      console.warn('Server request-reset endpoint unavailable, falling back to direct database query:', err);
    }

    // 2. Direct fallback check in Supabase PostgreSQL 'users' table (exact email match only)
    try {
      const { data: dbUser, error: dbErr } = await supabase
        .from('users')
        .select('id, email, display_name')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      if (dbErr || !dbUser) {
        return {
          success: false,
          message: 'No account found with this email address. Please check your spelling or sign up.',
        };
      }

      // User exists in database - dispatch recovery email via Supabase Auth
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = origin ? `${origin}/#type=recovery` : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetErr) {
        return {
          success: false,
          message: resetErr.message || 'Failed to dispatch password reset email.',
        };
      }

      return {
        success: true,
        message: `Password reset instructions have been dispatched to ${cleanEmail}. Please check your email inbox.`,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: fallbackErr.message || 'Unable to verify account existence. Please try again later.',
      };
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, message: 'Both email and 6-digit recovery code are required.' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (error) {
        return { success: false, message: error.message || 'Invalid or expired 6-digit recovery code.' };
      }

      this.isRecoveryMode = true;
      return { success: true, message: 'Recovery code verified successfully! Please enter your new password.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to verify recovery code' };
    }
  }

  /**
   * Verifies a 6-digit email confirmation OTP code from Supabase (signup confirmation).
   */
  public async verifyEmailOtp(
    email: string,
    token: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, message: 'Both email and 6-digit verification code are required.' };
    }

    try {
      // 1. Verify signup OTP code in Supabase
      let { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      // 2. Fallback to type 'email' if signup type fails
      if (error && (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('type'))) {
        const emailAttempt = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email',
        });
        if (!emailAttempt.error) {
          data = emailAttempt.data;
          error = null;
        }
      }

      if (error) {
        return {
          success: false,
          message: error.message || 'Invalid or expired 6-digit verification code.',
        };
      }

      const authUser = data?.user || (await supabase.auth.getUser()).data.user;
      const userId = authUser?.id || `usr_${Date.now()}`;

      // 3. Mark profile as emailVerified in dataService
      let userProfile =
        dataService.getUserById(userId) ||
        dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);

      const nowIso = new Date().toISOString();
      if (userProfile) {
        userProfile.emailVerified = true;
        dataService.registerUser(userProfile);
        authSessionService.updateUserProfile(userProfile);
        if (supabase && isSupabaseConfigured()) {
          Promise.resolve(
            supabase
              .from('users')
              .update({ email_verified: true, updated_at: new Date().toISOString() })
              .eq('id', userProfile.id)
          ).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
      } else {
        const dName = authUser?.user_metadata?.displayName || cleanEmail.split('@')[0];
        userProfile = {
          id: userId,
          email: cleanEmail,
          displayName: dName,
          role: (authUser?.user_metadata?.role as UserRole) || 'customer',
          status: 'active',
          emailVerified: true,
          referralCode: `REF_${dName.replace(/\s+/g, '').toUpperCase()}_${Date.now().toString().slice(-4)}`,
          createdAt: nowIso,
          lastLoginAt: nowIso,
        };
        await this.syncProfileAndWallet(userProfile);
      }

      // 4. Activate session
      authSessionService.createSessionForUser(
        userProfile.id,
        userProfile.email,
        userProfile.displayName,
        userProfile.role
      );

      // Check referral qualification on email verification
      try {
        dataService.checkAndAwardReferral(userProfile.id, 0);
      } catch (refErr) {
        console.warn('Referral check notice:', refErr);
      }

      return {
        success: true,
        user: userProfile,
        message: 'Email successfully verified! Welcome to SwiftSweeps.',
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Verification failed. Please try again.' };
    }
  }

  /**
   * Resends 6-digit verification OTP code to the user's email.
   */
  public async resendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Valid email address is required.' };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (error) {
        return { success: false, message: error.message || 'Failed to resend code.' };
      }

      return {
        success: true,
        message: `A fresh 6-digit verification code was sent to ${cleanEmail}. Please check your inbox.`,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to resend verification code.' };
    }
  }

  public async resendConfirmationEmail(email: string): Promise<{
    success: boolean;
    message: string;
    actionLink?: string;
  }> {
    return this.resendEmailOtp(email);
  }

  public async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    message: string;
    actionLink?: string;
  }> {
    return this.resendEmailOtp(email);
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
      const upsertData: Record<string, any> = {
        id: profile.id,
        email: profile.email,
        display_name: profile.displayName,
        role: profile.role,
        phone: profile.phone || null,
        status: profile.status,
        referred_by: profile.referredBy || null,
        created_at: profile.createdAt,
      };
      if (profile.emailVerified === true) {
        upsertData.email_verified = true;
      }
      await supabase.from('users').upsert(upsertData);

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
