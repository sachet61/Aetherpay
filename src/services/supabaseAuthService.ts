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
  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    if (isSupabaseConfigured() && supabase) {
      // 1. Listen for auth changes (including OAuth callback redirect completion)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') && session?.user) {
          const user = session.user;
          const cleanEmail = (user.email || '').trim().toLowerCase();
          if (!cleanEmail) return;

          let userProfile = dataService.getUserById(user.id) || dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
          const nowIso = new Date().toISOString();

          if (!userProfile) {
            userProfile = {
              id: user.id,
              email: cleanEmail,
              displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || cleanEmail.split('@')[0],
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
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const cleanEmail = (session.user.email || '').trim().toLowerCase();
          if (cleanEmail) {
            let userProfile = dataService.getUserById(session.user.id) || dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
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
      }).catch((err) => console.warn('Supabase getSession initial check notice:', err));
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

    // 1. If Supabase is configured, register with Supabase Auth
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
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
          emailVerified: true,
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

        return {
          success: true,
          user: newProfile,
          message: 'Account registered successfully with Supabase Auth.',
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Supabase signup failed' };
      }
    }

    // 2. Fallback / Template Mode: Create profile in dataService
    const existing = dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newProfile: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      displayName: params.displayName,
      role,
      phone: params.phone,
      status: 'active',
      emailVerified: true,
      referralCode: `REF_${params.displayName.replace(/\s+/g, '').toUpperCase()}_${Date.now().toString().slice(-4)}`,
      referredBy: params.referralCode,
      createdAt: nowIso,
      lastLoginAt: nowIso,
    };

    dataService.registerUser(newProfile);

    authSessionService.createSessionForUser(
      newProfile.id,
      newProfile.email,
      newProfile.displayName,
      newProfile.role
    );

    return {
      success: true,
      user: newProfile,
      message: 'Account registered and profile activated.',
    };
  }

  public async loginWithEmail(email: string, password: string): Promise<SupabaseAuthResult> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. If Supabase is configured, verify with Supabase Auth
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          // If Supabase user not found, also check local demo users for instant ease-of-use
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

        let userProfile = dataService.getUserById(data.user.id) || dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
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

    // 2. Fallback / Template Mode: Local user matching
    const user = dataService.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'No user account found with this email.' };
    }

    authSessionService.createSessionForUser(
      user.id,
      user.email,
      user.displayName,
      user.role
    );

    return { success: true, user };
  }

  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
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
        return { success: false, error: err?.message || 'Google sign-in failed' };
      }
    }
    return { success: false, error: 'Supabase is not configured for Google OAuth.' };
  }

  public async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    authSessionService.destroySession();
  }

  public async sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: `Password reset instructions sent to ${cleanEmail} via Supabase.` };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Reset failed' };
      }
    }

    return {
      success: true,
      message: `Password reset link simulated for ${cleanEmail}. (Configure VITE_SUPABASE_URL to send automated emails).`,
    };
  }

  private async syncProfileAndWallet(profile: UserProfile): Promise<void> {
    dataService.registerUser(profile);

    if (isSupabaseConfigured() && supabase) {
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
}

export const supabaseAuthService = new SupabaseAuthService();
