import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, googleProvider, db, PREDEFINED_ADMINS } from './firebase';
import { UserProfile, UserRole } from '../types';

// Predefined seed credentials for automated first-time migration to Firebase Auth
export const SEED_ACCOUNTS_MAP: Record<
  string,
  { pass: string; role: UserRole; name: string }
> = {
  'admin@aetherpay.com': { pass: 'Admin@123456', role: 'admin', name: 'Dev Admin' },
  'sachet61@gmail.com': { pass: 'Admin@123456', role: 'admin', name: 'Sachet (Admin Owner)' },
  'alex.cross@aetherpay.com': { pass: 'Admin@123456', role: 'admin', name: 'Alexander Cross' },
  'sarah.lin@aetherpay.com': { pass: 'Agent@123456', role: 'agent', name: 'Sarah Lin' },
  'marcus.vance@example.com': { pass: 'Player@123456', role: 'customer', name: 'Marcus Vance' },
  'elena.rostova@example.com': { pass: 'Player@123456', role: 'customer', name: 'Elena Rostova' },
  'devlin.drake@example.com': { pass: 'Player@123456', role: 'customer', name: 'Devlin Drake' },
  'blithesweeps@gmail.com': { pass: 'Admin@123456', role: 'admin', name: 'Admin (Blithe Sweeps)' },
};

export function parseFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters long and contain letters and numbers.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completion. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this domain and retry.';
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
      return `Domain unauthorized: "${currentHost}" is not in your Firebase Authorized Domains list. Please add "${currentHost}" in Firebase Console > Authentication > Settings > Authorized domains.`;
    }
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not yet enabled in Firebase Console. Please go to Build > Authentication > Sign-in method in Firebase Console to enable it.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

class FirebaseAuthService {
  private activeUserProfile: UserProfile | null = null;
  private listeners: ((profile: UserProfile | null) => void)[] = [];

  constructor() {
    this.initObserver();
  }

  private initObserver() {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await this.syncUserProfile(fbUser);
          this.activeUserProfile = profile;
          this.notifyListeners(profile);
        } catch (err) {
          console.warn('[FirebaseAuthService] Error syncing user on auth state change:', err);
        }
      } else {
        this.activeUserProfile = null;
        this.notifyListeners(null);
      }
    });
  }

  private notifyListeners(profile: UserProfile | null) {
    for (const listener of this.listeners) {
      try {
        listener(profile);
      } catch (err) {
        console.error('[FirebaseAuthService] Listener error:', err);
      }
    }
  }

  public subscribe(listener: (profile: UserProfile | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.activeUserProfile);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  public getActiveProfile(): UserProfile | null {
    return this.activeUserProfile;
  }

  /**
   * Syncs or initializes the Firestore `/users/{uid}` document
   */
  public async syncUserProfile(
    fbUser: FirebaseUser,
    additionalData?: Partial<UserProfile>
  ): Promise<UserProfile> {
    const userRef = doc(db, 'users', fbUser.uid);
    let existing: UserProfile | null = null;

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        existing = snap.data() as UserProfile;
      }
    } catch (err) {
      console.warn('[FirebaseAuthService] Could not fetch firestore user document:', err);
    }

    const email = (fbUser.email || additionalData?.email || '').toLowerCase().trim();
    const isAdmin = PREDEFINED_ADMINS.some((a) => a.toLowerCase() === email);
    const demoInfo = SEED_ACCOUNTS_MAP[email];

    const determinedRole: UserRole =
      additionalData?.role ||
      existing?.role ||
      demoInfo?.role ||
      (isAdmin ? 'admin' : 'customer');

    const profile: UserProfile = {
      id: fbUser.uid,
      email: email,
      displayName:
        fbUser.displayName ||
        additionalData?.displayName ||
        existing?.displayName ||
        demoInfo?.name ||
        email.split('@')[0] ||
        'AetherPay User',
      phone: fbUser.phoneNumber || additionalData?.phone || existing?.phone || undefined,
      role: determinedRole,
      referralCode:
        existing?.referralCode ||
        additionalData?.referralCode ||
        `REF_${fbUser.uid.slice(-6).toUpperCase()}`,
      referredBy: additionalData?.referredBy || existing?.referredBy,
      status: existing?.status || 'active',
      emailVerified: fbUser.emailVerified,
      registeredPaymentMethod:
        existing?.registeredPaymentMethod || additionalData?.registeredPaymentMethod,
      registeredPaymentDetails:
        existing?.registeredPaymentDetails || additionalData?.registeredPaymentDetails,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    try {
      await setDoc(userRef, JSON.parse(JSON.stringify(profile)), { merge: true });
    } catch (err) {
      console.warn('[FirebaseAuthService] Warning saving profile to Firestore:', err);
    }

    this.activeUserProfile = profile;
    return profile;
  }

  /**
   * Pure Firebase Auth Sign-Up with Email and Password
   */
  public async registerWithEmail(
    emailInput: string,
    passwordInput: string,
    displayNameInput: string,
    phoneInput?: string,
    referralCodeInput?: string,
    roleInput?: UserRole
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const email = emailInput.trim().toLowerCase();
    const displayName = displayNameInput.trim() || email.split('@')[0];

    try {
      // 1. Create account directly in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, passwordInput);
      const fbUser = cred.user;

      // 2. Set Firebase Auth display name
      try {
        await updateProfile(fbUser, { displayName });
      } catch (e) {
        console.warn('Update profile note:', e);
      }

      // 3. Trigger real-time email verification link
      try {
        await sendEmailVerification(fbUser);
      } catch (e) {
        console.warn('Email verification send note:', e);
      }

      // 4. Sync profile to Firestore
      const userProfile = await this.syncUserProfile(fbUser, {
        displayName,
        phone: phoneInput?.trim() || undefined,
        referredBy: referralCodeInput?.trim() || undefined,
        role: roleInput,
      });

      return {
        success: true,
        user: userProfile,
        message: 'Account successfully registered with Firebase Authentication!',
      };
    } catch (error: any) {
      console.error('[FirebaseAuthService] Registration error:', error);
      return {
        success: false,
        message: parseFirebaseAuthError(error),
      };
    }
  }

  /**
   * Pure Firebase Auth Login with Email & Password
   * Supports auto-provisioning demo accounts in Firebase Auth on first login!
   */
  public async loginWithEmail(
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const email = emailInput.trim().toLowerCase();

    try {
      // 1. Attempt standard Firebase Auth sign-in
      const cred = await signInWithEmailAndPassword(auth, email, passwordInput);
      const userProfile = await this.syncUserProfile(cred.user);
      return { success: true, user: userProfile };
    } catch (error: any) {
      const code = error?.code;

      // 2. Auto-provision demo accounts if this is a known preset demo account!
      const demoAccount = SEED_ACCOUNTS_MAP[email];
      if (demoAccount && (code === 'auth/user-not-found' || code === 'auth/invalid-credential')) {
        console.info(`[FirebaseAuthService] Auto-provisioning demo account in Firebase Auth: ${email}`);
        try {
          const autoCred = await createUserWithEmailAndPassword(
            auth,
            email,
            passwordInput || demoAccount.pass
          );
          try {
            await updateProfile(autoCred.user, { displayName: demoAccount.name });
          } catch {}

          const profile = await this.syncUserProfile(autoCred.user, {
            displayName: demoAccount.name,
            role: demoAccount.role,
          });

          return {
            success: true,
            user: profile,
            message: 'Demo account registered and initialized in Firebase Authentication.',
          };
        } catch (createErr: any) {
          // If creation also failed (e.g. password mismatch with existing auth account)
          console.warn('[FirebaseAuthService] Demo auto-provision note:', createErr);
        }
      }

      return {
        success: false,
        message: parseFirebaseAuthError(error),
      };
    }
  }

  /**
   * Google Sign-In with Popup
   */
  public async loginWithGoogle(
    intendedRole: UserRole = 'customer'
  ): Promise<{ success: boolean; user?: UserProfile; message?: string; code?: string }> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userProfile = await this.syncUserProfile(cred.user, {
        role: intendedRole,
      });
      return {
        success: true,
        user: userProfile,
        message: 'Successfully authenticated with Google!',
      };
    } catch (error: any) {
      console.error('[FirebaseAuthService] Google Sign-In error:', error);
      return {
        success: false,
        code: error?.code,
        message: parseFirebaseAuthError(error),
      };
    }
  }

  /**
   * Resend Real-Time Email Verification Link
   */
  public async sendVerificationEmail(): Promise<{ success: boolean; message?: string }> {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, message: 'No active authenticated user session.' };
    }
    if (user.emailVerified) {
      return { success: true, message: 'Your email address is already verified!' };
    }

    try {
      await sendEmailVerification(user);
      return {
        success: true,
        message: `Verification link sent to ${user.email}. Please check your inbox or spam folder.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: parseFirebaseAuthError(error),
      };
    }
  }

  /**
   * Reload current Firebase Auth user, re-check verification, and sync Firestore
   */
  public async reloadAndCheckEmailVerification(): Promise<{
    verified: boolean;
    message: string;
    user: UserProfile | null;
  }> {
    const user = auth.currentUser;
    if (!user) {
      return { verified: false, message: 'No active authenticated session.', user: null };
    }

    try {
      await user.reload();
      const isVerified = user.emailVerified;
      const userRef = doc(db, 'users', user.uid);

      if (isVerified) {
        await updateDoc(userRef, { emailVerified: true }).catch((err) =>
          console.warn('[FirebaseAuthService] Could not update emailVerified in firestore:', err)
        );
      }

      const updatedProfile = await this.syncUserProfile(user, {
        emailVerified: isVerified,
      });

      this.activeUserProfile = updatedProfile;
      this.notifyListeners(updatedProfile);

      return {
        verified: isVerified,
        message: isVerified
          ? 'Email address confirmed and verified! Cashouts and referral bonuses are now unlocked.'
          : 'Email is not yet verified. Please click the link sent to your inbox and check again.',
        user: updatedProfile,
      };
    } catch (error: any) {
      return {
        verified: false,
        message: parseFirebaseAuthError(error),
        user: this.activeUserProfile,
      };
    }
  }

  /**
   * Self-Service Password Reset via Firebase Auth with Database Existence Check
   */
  public async sendPasswordReset(
    emailInput: string
  ): Promise<{ success: boolean; message?: string }> {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    try {
      // 1. Verify that this email is registered in Firestore users or predefined demo accounts
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(usersQuery);
      const existsInFirestore = !snap.empty;
      const existsInSeed = !!SEED_ACCOUNTS_MAP[email];

      if (!existsInFirestore && !existsInSeed) {
        return {
          success: false,
          message: `No account was found with the email address "${email}". Please verify the address or register for a new account.`,
        };
      }

      // 2. Dispatch official Firebase password reset email link
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: `An official password reset link has been dispatched to ${email}. Please check your inbox and follow the link to establish your new password.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: parseFirebaseAuthError(error),
      };
    }
  }

  /**
   * Sign Out
   */
  public async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut note:', e);
    }
    this.activeUserProfile = null;
    this.notifyListeners(null);
  }
}

export const firebaseAuthService = new FirebaseAuthService();
