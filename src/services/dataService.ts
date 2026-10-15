import {
  UserProfile,
  UserWallet,
  WalletTransaction,
  TopUpRequest,
  WithdrawalRequest,
  GameCatalogItem,
  GameAccount,
  SupportConversation,
  ChatMessage,
  ChatTransactionData,
  AppNotification,
  AppConfig,
  AuditLog,
  ReferralSummary,
  PayoutMethodType,
  PaymentMethodType,
  WithdrawalStatus,
  CashoutFeedItem,
  WebhookLog,
  PasswordResetToken,
  UserRole,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_USERS,
  INITIAL_WALLETS,
  INITIAL_TRANSACTIONS,
  INITIAL_TOPUPS,
  INITIAL_WITHDRAWALS,
  INITIAL_GAME_CATALOG,
  INITIAL_GAME_ACCOUNTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './seedData';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  PREDEFINED_ADMINS,
} from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { resolveGameImageUrl } from '../utils/imageUtils';
import { authSessionService } from './authSessionService';
import { firebaseAuthService } from './firebaseAuthService';

const STORAGE_KEYS = {
  USERS: 'aetherpay_users',
  WALLETS: 'aetherpay_wallets',
  TRANSACTIONS: 'aetherpay_transactions',
  TOPUPS: 'aetherpay_topups',
  WITHDRAWALS: 'aetherpay_withdrawals',
  GAME_CATALOG: 'aetherpay_game_catalog',
  GAME_ACCOUNTS: 'aetherpay_game_accounts',
  CONVERSATIONS: 'aetherpay_conversations',
  MESSAGES: 'aetherpay_messages',
  NOTIFICATIONS: 'aetherpay_notifications',
  AUDIT_LOGS: 'aetherpay_audit_logs',
  CONFIG: 'aetherpay_config',
  WEBHOOK_LOGS: 'aetherpay_webhook_logs',
  FAKED_CASHOUTS: 'aetherpay_faked_cashouts',
  PASSWORD_RESET_TOKENS: 'aetherpay_password_reset_tokens',
  CURRENT_USER_ID: 'aetherpay_current_user_id',
};

class DataService {
  private isDemoMode = false;
  private cache: Record<string, any> = {
    [STORAGE_KEYS.USERS]: [...INITIAL_USERS],
    [STORAGE_KEYS.WALLETS]: { ...INITIAL_WALLETS },
    [STORAGE_KEYS.TRANSACTIONS]: [...INITIAL_TRANSACTIONS],
    [STORAGE_KEYS.TOPUPS]: [...INITIAL_TOPUPS],
    [STORAGE_KEYS.WITHDRAWALS]: [...INITIAL_WITHDRAWALS],
    [STORAGE_KEYS.GAME_CATALOG]: [...INITIAL_GAME_CATALOG],
    [STORAGE_KEYS.GAME_ACCOUNTS]: [...INITIAL_GAME_ACCOUNTS],
    [STORAGE_KEYS.CONVERSATIONS]: [...INITIAL_CONVERSATIONS],
    [STORAGE_KEYS.MESSAGES]: { ...INITIAL_MESSAGES },
    [STORAGE_KEYS.NOTIFICATIONS]: [...INITIAL_NOTIFICATIONS],
    [STORAGE_KEYS.AUDIT_LOGS]: [...INITIAL_AUDIT_LOGS],
    [STORAGE_KEYS.CONFIG]: { ...INITIAL_CONFIG },
    [STORAGE_KEYS.WEBHOOK_LOGS]: [],
    [STORAGE_KEYS.FAKED_CASHOUTS]: [],
    [STORAGE_KEYS.PASSWORD_RESET_TOKENS]: [],
  };
  private currentUserId: string | null = null;
  private firestoreListeners: (() => void)[] = [];
  private isSeeding = false;

  constructor() {
    this.initFirestore();
  }

  private initFirestore(): void {
    try {
      // 1. Config listener
      const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (snap) => {
        if (snap.exists()) {
          this.cache[STORAGE_KEYS.CONFIG] = snap.data() as AppConfig;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.CONFIG } }));
        } else {
          // If Firestore is empty, auto-seed with presets
          this.seedFirestoreWithPresets();
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'config/main');
      });
      this.firestoreListeners.push(unsubConfig);

      // 2. Users collection listener
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        if (!snap.empty) {
          const list: UserProfile[] = [];
          snap.forEach((d) => list.push(d.data() as UserProfile));
          this.cache[STORAGE_KEYS.USERS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.USERS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      });
      this.firestoreListeners.push(unsubUsers);

      // 3. Wallets collection listener
      const unsubWallets = onSnapshot(collection(db, 'wallets'), (snap) => {
        if (!snap.empty) {
          const map: Record<string, UserWallet> = {};
          snap.forEach((d) => {
            const w = d.data() as UserWallet;
            map[w.customerId || d.id] = w;
          });
          this.cache[STORAGE_KEYS.WALLETS] = map;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.WALLETS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'wallets');
      });
      this.firestoreListeners.push(unsubWallets);

      // 4. Transactions collection listener
      const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
        if (!snap.empty) {
          const list: WalletTransaction[] = [];
          snap.forEach((d) => list.push(d.data() as WalletTransaction));
          this.cache[STORAGE_KEYS.TRANSACTIONS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.TRANSACTIONS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      });
      this.firestoreListeners.push(unsubTransactions);

      // 5. Topups collection listener
      const unsubTopups = onSnapshot(collection(db, 'topups'), (snap) => {
        if (!snap.empty) {
          const list: TopUpRequest[] = [];
          snap.forEach((d) => list.push(d.data() as TopUpRequest));
          this.cache[STORAGE_KEYS.TOPUPS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.TOPUPS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'topups');
      });
      this.firestoreListeners.push(unsubTopups);

      // 6. Withdrawals collection listener
      const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
        if (!snap.empty) {
          const list: WithdrawalRequest[] = [];
          snap.forEach((d) => list.push(d.data() as WithdrawalRequest));
          this.cache[STORAGE_KEYS.WITHDRAWALS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.WITHDRAWALS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'withdrawals');
      });
      this.firestoreListeners.push(unsubWithdrawals);

      // 7. Game catalog collection listener
      const unsubCatalog = onSnapshot(collection(db, 'game_catalog'), async (snap) => {
        if (!snap.empty) {
          const list: GameCatalogItem[] = [];
          snap.forEach((d) => list.push(d.data() as GameCatalogItem));
          this.cache[STORAGE_KEYS.GAME_CATALOG] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.GAME_CATALOG } }));
        } else {
          for (const g of INITIAL_GAME_CATALOG) {
            const resolved = {
              ...g,
              iconUrl: resolveGameImageUrl(g.iconUrl),
              imageUrl: resolveGameImageUrl(g.imageUrl),
            };
            await setDoc(doc(db, 'game_catalog', g.id), JSON.parse(JSON.stringify(resolved)), { merge: true });
          }
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'game_catalog');
      });
      this.firestoreListeners.push(unsubCatalog);

      // 8. Game accounts collection listener
      const unsubAccounts = onSnapshot(collection(db, 'game_accounts'), (snap) => {
        if (!snap.empty) {
          const list: GameAccount[] = [];
          snap.forEach((d) => list.push(d.data() as GameAccount));
          this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.GAME_ACCOUNTS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'game_accounts');
      });
      this.firestoreListeners.push(unsubAccounts);

      // 9. Conversations collection listener
      const unsubConvs = onSnapshot(collection(db, 'conversations'), (snap) => {
        if (!snap.empty) {
          const list: SupportConversation[] = [];
          snap.forEach((d) => list.push(d.data() as SupportConversation));
          this.cache[STORAGE_KEYS.CONVERSATIONS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.CONVERSATIONS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'conversations');
      });
      this.firestoreListeners.push(unsubConvs);

      // 10. Messages collection listener
      const unsubMessages = onSnapshot(collection(db, 'messages'), (snap) => {
        if (!snap.empty) {
          const map: Record<string, ChatMessage[]> = {};
          snap.forEach((d) => {
            const m = d.data() as ChatMessage;
            if (m.conversationId) {
              if (!map[m.conversationId]) map[m.conversationId] = [];
              map[m.conversationId].push(m);
            }
          });
          for (const convId in map) {
            map[convId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          }
          this.cache[STORAGE_KEYS.MESSAGES] = map;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.MESSAGES } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'messages');
      });
      this.firestoreListeners.push(unsubMessages);

      // 11. Notifications collection listener
      const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snap) => {
        if (!snap.empty) {
          const list: AppNotification[] = [];
          snap.forEach((d) => list.push(d.data() as AppNotification));
          this.cache[STORAGE_KEYS.NOTIFICATIONS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.NOTIFICATIONS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      });
      this.firestoreListeners.push(unsubNotifs);

      // 12. Audit logs collection listener
      const unsubAudit = onSnapshot(collection(db, 'audit_logs'), (snap) => {
        if (!snap.empty) {
          const list: AuditLog[] = [];
          snap.forEach((d) => list.push(d.data() as AuditLog));
          this.cache[STORAGE_KEYS.AUDIT_LOGS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.AUDIT_LOGS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'audit_logs');
      });
      this.firestoreListeners.push(unsubAudit);

      // 13. Cashouts feed listener
      const unsubCashouts = onSnapshot(collection(db, 'faked_cashouts'), (snap) => {
        if (!snap.empty) {
          const list: CashoutFeedItem[] = [];
          snap.forEach((d) => list.push(d.data() as CashoutFeedItem));
          this.cache[STORAGE_KEYS.FAKED_CASHOUTS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.FAKED_CASHOUTS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'faked_cashouts');
      });
      this.firestoreListeners.push(unsubCashouts);

      // 14. Password reset tokens listener
      const unsubResetTokens = onSnapshot(collection(db, 'password_reset_tokens'), (snap) => {
        if (!snap.empty) {
          const list: PasswordResetToken[] = [];
          snap.forEach((d) => list.push(d.data() as PasswordResetToken));
          this.cache[STORAGE_KEYS.PASSWORD_RESET_TOKENS] = list;
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.PASSWORD_RESET_TOKENS } }));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'password_reset_tokens');
      });
      this.firestoreListeners.push(unsubResetTokens);

    } catch (e) {
      console.warn('Firestore initialization notice:', e);
    }
  }

  private load<T>(key: string, defaultValue: T): T {
    const val = this.cache[key];
    if (val === undefined || val === null) {
      return defaultValue;
    }
    return val as T;
  }

  private save<T>(key: string, value: T): void {
    // 1. Immediately update reactive in-memory state
    this.cache[key] = value;
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key } }));

    // 2. Persist to Firestore asynchronously
    this.persistCollectionToFirestore(key, value);
  }

  private async persistCollectionToFirestore(key: string, value: any): Promise<void> {
    try {
      if (key === STORAGE_KEYS.CONFIG) {
        await setDoc(doc(db, 'config', 'main'), JSON.parse(JSON.stringify(value)), { merge: true });
      } else if (key === STORAGE_KEYS.USERS && Array.isArray(value)) {
        for (const u of value) {
          if (u.id) {
            await setDoc(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.WALLETS && typeof value === 'object' && value !== null) {
        for (const [customerId, w] of Object.entries(value)) {
          if (customerId) {
            await setDoc(doc(db, 'wallets', customerId), JSON.parse(JSON.stringify(w)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.TRANSACTIONS && Array.isArray(value)) {
        for (const t of value.slice(0, 30)) {
          if (t.id) {
            await setDoc(doc(db, 'transactions', t.id), JSON.parse(JSON.stringify(t)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.TOPUPS && Array.isArray(value)) {
        for (const top of value) {
          if (top.id) {
            await setDoc(doc(db, 'topups', top.id), JSON.parse(JSON.stringify(top)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.WITHDRAWALS && Array.isArray(value)) {
        for (const w of value) {
          if (w.id) {
            await setDoc(doc(db, 'withdrawals', w.id), JSON.parse(JSON.stringify(w)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.GAME_CATALOG && Array.isArray(value)) {
        for (const g of value) {
          if (g.id) {
            await setDoc(doc(db, 'game_catalog', g.id), JSON.parse(JSON.stringify(g)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.GAME_ACCOUNTS && Array.isArray(value)) {
        for (const a of value) {
          if (a.id) {
            await setDoc(doc(db, 'game_accounts', a.id), JSON.parse(JSON.stringify(a)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.CONVERSATIONS && Array.isArray(value)) {
        for (const c of value) {
          if (c.id) {
            await setDoc(doc(db, 'conversations', c.id), JSON.parse(JSON.stringify(c)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.MESSAGES && typeof value === 'object' && value !== null) {
        for (const msgs of Object.values(value as Record<string, ChatMessage[]>)) {
          if (Array.isArray(msgs)) {
            for (const m of msgs.slice(-20)) {
              if (m.id) {
                await setDoc(doc(db, 'messages', m.id), JSON.parse(JSON.stringify(m)), { merge: true });
              }
            }
          }
        }
      } else if (key === STORAGE_KEYS.NOTIFICATIONS && Array.isArray(value)) {
        for (const n of value.slice(0, 30)) {
          if (n.id) {
            await setDoc(doc(db, 'notifications', n.id), JSON.parse(JSON.stringify(n)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.AUDIT_LOGS && Array.isArray(value)) {
        for (const l of value.slice(0, 30)) {
          if (l.id) {
            await setDoc(doc(db, 'audit_logs', l.id), JSON.parse(JSON.stringify(l)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.FAKED_CASHOUTS && Array.isArray(value)) {
        for (const f of value.slice(0, 30)) {
          if (f.id) {
            await setDoc(doc(db, 'faked_cashouts', f.id), JSON.parse(JSON.stringify(f)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.WEBHOOK_LOGS && Array.isArray(value)) {
        for (const w of value.slice(0, 30)) {
          if (w.id) {
            await setDoc(doc(db, 'webhook_logs', w.id), JSON.parse(JSON.stringify(w)), { merge: true });
          }
        }
      } else if (key === STORAGE_KEYS.PASSWORD_RESET_TOKENS && Array.isArray(value)) {
        for (const r of value.slice(0, 30)) {
          const docId = r.id || r.token;
          if (docId) {
            await setDoc(doc(db, 'password_reset_tokens', docId), JSON.parse(JSON.stringify(r)), { merge: true });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, key);
    }
  }

  public async seedFirestoreWithPresets(): Promise<{ success: boolean; message: string }> {
    if (this.isSeeding) return { success: true, message: 'Seeding already in progress' };
    this.isSeeding = true;
    try {
      // 1. Config
      await setDoc(doc(db, 'config', 'main'), JSON.parse(JSON.stringify(INITIAL_CONFIG)), { merge: true });

      // 2. Users
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), JSON.parse(JSON.stringify(u)), { merge: true });
      }

      // 3. Wallets
      for (const [customerId, w] of Object.entries(INITIAL_WALLETS)) {
        await setDoc(doc(db, 'wallets', customerId), JSON.parse(JSON.stringify(w)), { merge: true });
      }

      // 4. Transactions
      for (const t of INITIAL_TRANSACTIONS) {
        await setDoc(doc(db, 'transactions', t.id), JSON.parse(JSON.stringify(t)), { merge: true });
      }

      // 5. Topups
      for (const top of INITIAL_TOPUPS) {
        await setDoc(doc(db, 'topups', top.id), JSON.parse(JSON.stringify(top)), { merge: true });
      }

      // 6. Withdrawals
      for (const w of INITIAL_WITHDRAWALS) {
        await setDoc(doc(db, 'withdrawals', w.id), JSON.parse(JSON.stringify(w)), { merge: true });
      }

      // 7. Game catalog
      for (const g of INITIAL_GAME_CATALOG) {
        await setDoc(doc(db, 'game_catalog', g.id), JSON.parse(JSON.stringify(g)), { merge: true });
      }

      // 8. Game accounts
      for (const a of INITIAL_GAME_ACCOUNTS) {
        await setDoc(doc(db, 'game_accounts', a.id), JSON.parse(JSON.stringify(a)), { merge: true });
      }

      // 9. Conversations
      for (const c of INITIAL_CONVERSATIONS) {
        await setDoc(doc(db, 'conversations', c.id), JSON.parse(JSON.stringify(c)), { merge: true });
      }

      // 10. Messages
      for (const msgs of Object.values(INITIAL_MESSAGES)) {
        for (const m of msgs) {
          await setDoc(doc(db, 'messages', m.id), JSON.parse(JSON.stringify(m)), { merge: true });
        }
      }

      // 11. Notifications
      for (const n of INITIAL_NOTIFICATIONS) {
        await setDoc(doc(db, 'notifications', n.id), JSON.parse(JSON.stringify(n)), { merge: true });
      }

      // 12. Audit logs
      for (const l of INITIAL_AUDIT_LOGS) {
        await setDoc(doc(db, 'audit_logs', l.id), JSON.parse(JSON.stringify(l)), { merge: true });
      }

      // Reset in-memory cache to ensure perfect alignment
      this.cache = {
        [STORAGE_KEYS.USERS]: [...INITIAL_USERS],
        [STORAGE_KEYS.WALLETS]: { ...INITIAL_WALLETS },
        [STORAGE_KEYS.TRANSACTIONS]: [...INITIAL_TRANSACTIONS],
        [STORAGE_KEYS.TOPUPS]: [...INITIAL_TOPUPS],
        [STORAGE_KEYS.WITHDRAWALS]: [...INITIAL_WITHDRAWALS],
        [STORAGE_KEYS.GAME_CATALOG]: [...INITIAL_GAME_CATALOG],
        [STORAGE_KEYS.GAME_ACCOUNTS]: [...INITIAL_GAME_ACCOUNTS],
        [STORAGE_KEYS.CONVERSATIONS]: [...INITIAL_CONVERSATIONS],
        [STORAGE_KEYS.MESSAGES]: { ...INITIAL_MESSAGES },
        [STORAGE_KEYS.NOTIFICATIONS]: [...INITIAL_NOTIFICATIONS],
        [STORAGE_KEYS.AUDIT_LOGS]: [...INITIAL_AUDIT_LOGS],
        [STORAGE_KEYS.CONFIG]: { ...INITIAL_CONFIG },
        [STORAGE_KEYS.WEBHOOK_LOGS]: [],
        [STORAGE_KEYS.FAKED_CASHOUTS]: [],
      };
      const activeSess = authSessionService.getActiveSession();
      this.currentUserId = activeSess ? activeSess.userId : null;

      window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'all' } }));
      console.log('Firebase Firestore successfully populated with all demo presets.');
      return { success: true, message: 'All demo presets and presets have been populated to Firestore.' };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedFirestoreWithPresets');
      return { success: false, message: 'Failed to populate Firestore: ' + (error instanceof Error ? error.message : String(error)) };
    } finally {
      this.isSeeding = false;
    }
  }

  public resetToSeedData(): void {
    this.seedFirestoreWithPresets();
  }

  // Current session management - Production Enforced
  public getCurrentUser(): UserProfile | null {
    const session = authSessionService.getActiveSession();
    if (!session) {
      this.currentUserId = null;
      return null;
    }
    this.currentUserId = session.userId;
    const users = this.getUsers();
    let user = users.find((u) => u.id === session.userId || u.email.toLowerCase() === session.email.toLowerCase());
    if (!user) {
      user = {
        id: session.userId,
        email: session.email,
        displayName: session.displayName,
        role: session.role,
        referralCode: `REF_${session.userId.slice(-5)}`,
        status: 'active',
        createdAt: new Date(session.createdAt).toISOString(),
        lastLoginAt: new Date(session.lastActiveAt).toISOString(),
      };
      this.registerUser(user);
    }
    return user;
  }

  public setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'auth' } }));
  }

  public logout(): void {
    this.currentUserId = null;
    authSessionService.destroySession();
    signOut(auth).catch(() => {});
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'auth' } }));
  }

  // ==========================================
  // Production Firebase Authentication Methods
  // ==========================================

  public async loginWithFirebaseAuth(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const res = await firebaseAuthService.loginWithEmail(email, pass);
    if (res.success && res.user) {
      this.currentUserId = res.user.id;
      this.registerUser(res.user);
      authSessionService.createSessionForUser(
        res.user.id,
        res.user.email,
        res.user.displayName,
        res.user.role
      );

      this.logAudit({
        actorId: res.user.id,
        actorName: res.user.displayName,
        actorRole: res.user.role,
        action: 'USER_LOGGED_IN',
        entityType: 'user',
        entityId: res.user.id,
        details: 'User authenticated via Firebase Authentication (Google Cloud Identity).',
      });

      return { success: true, user: res.user };
    }

    return {
      success: false,
      message: res.message || 'Authentication failed. Please check your credentials.',
    };
  }

  public async registerWithFirebaseAuth(
    email: string,
    pass: string,
    displayName: string,
    phone?: string,
    referralCode?: string,
    role?: UserRole
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const res = await firebaseAuthService.registerWithEmail(
      email,
      pass,
      displayName,
      phone,
      referralCode,
      role
    );

    if (res.success && res.user) {
      this.currentUserId = res.user.id;
      this.registerUser(res.user);
      authSessionService.createSessionForUser(
        res.user.id,
        res.user.email,
        res.user.displayName,
        res.user.role
      );

      this.logAudit({
        actorId: res.user.id,
        actorName: res.user.displayName,
        actorRole: res.user.role,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: res.user.id,
        details: 'User created in Firebase Authentication with real-time verification and Firestore sync.',
      });

      return { success: true, user: res.user, message: res.message };
    }

    return {
      success: false,
      message: res.message || 'Firebase registration failed.',
    };
  }

  public async loginWithGoogle(
    intendedRole: UserRole = 'customer'
  ): Promise<{ success: boolean; user?: UserProfile; message?: string; code?: string }> {
    const res = await firebaseAuthService.loginWithGoogle(intendedRole);
    if (res.success && res.user) {
      this.currentUserId = res.user.id;
      this.registerUser(res.user);
      authSessionService.createSessionForUser(
        res.user.id,
        res.user.email,
        res.user.displayName,
        res.user.role
      );

      this.logAudit({
        actorId: res.user.id,
        actorName: res.user.displayName,
        actorRole: res.user.role,
        action: 'USER_LOGGED_IN',
        entityType: 'user',
        entityId: res.user.id,
        details: 'User authenticated via Google Sign-In with Firebase Auth.',
      });

      return { success: true, user: res.user };
    }

    return {
      success: false,
      code: res.code,
      message: res.message || 'Google sign-in failed.',
    };
  }

  public async sendVerificationEmail(): Promise<{ success: boolean; message?: string }> {
    return firebaseAuthService.sendVerificationEmail();
  }

  public async reloadAndCheckEmailVerification(): Promise<{
    verified: boolean;
    message: string;
    user: UserProfile | null;
  }> {
    const res = await firebaseAuthService.reloadAndCheckEmailVerification();
    if (res.verified && res.user) {
      // Synchronize in reactive state and storage
      const users = this.getUsers();
      const idx = users.findIndex((u) => u.id === res.user!.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], emailVerified: true };
        this.save(STORAGE_KEYS.USERS, users);
      }
      // Re-evaluate referral reward eligibility now that email is verified!
      this.checkAndAwardReferral(res.user.id, 0);
    }
    return res;
  }

  public async sendPasswordResetViaFirebase(
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    return firebaseAuthService.sendPasswordReset(email);
  }

  // ==========================================
  // Self-Service Password Reset
  // ==========================================

  public getPasswordResetTokens(): PasswordResetToken[] {
    return this.load<PasswordResetToken[]>(STORAGE_KEYS.PASSWORD_RESET_TOKENS, []);
  }

  public async requestPasswordReset(
    emailInput: string
  ): Promise<{ success: boolean; token?: string; pin?: string; expiresAt?: number; message?: string }> {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    // Delegate to firebaseAuthService which checks user existence in Firestore & sends real Firebase reset email
    const res = await firebaseAuthService.sendPasswordReset(email);
    if (!res.success) {
      return { success: false, message: res.message || 'Password reset request failed.' };
    }

    const users = this.getUsers();
    const existingUser = users.find((u) => u.email.toLowerCase() === email);

    // Audit log
    this.logAudit({
      actorId: existingUser?.id || 'system',
      actorName: existingUser?.displayName || email,
      actorRole: existingUser?.role || 'customer',
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'user',
      entityId: existingUser?.id || 'anonymous',
      details: `Official Firebase password reset email link dispatched to ${email}.`,
    });

    return {
      success: true,
      message: res.message || `An official password reset link has been dispatched to ${email}. Please check your inbox.`,
    };
  }

  public async verifyPasswordResetToken(
    tokenInput: string,
    emailInput?: string
  ): Promise<{ valid: boolean; email?: string; message?: string; remainingSeconds?: number }> {
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      return { valid: false, message: 'Please enter your password reset token or 6-digit code.' };
    }

    // 1. Check server endpoint first
    try {
      const resp = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken, email: emailInput }),
      });
      const data = await resp.json();
      if (resp.ok && data.valid) {
        return {
          valid: true,
          email: data.email,
          remainingSeconds: data.remainingSeconds,
          message: 'Token is valid.',
        };
      } else if (!resp.ok && data.message && !data.message.includes('not found')) {
        return { valid: false, message: data.message };
      }
    } catch {
      // Fallback to local tokens cache
    }

    // 2. Check local tokens cache
    const tokens = this.getPasswordResetTokens();
    const match = tokens.find(
      (t) => t.token.toLowerCase() === cleanToken.toLowerCase() || t.id.toLowerCase() === cleanToken.toLowerCase()
    );

    if (!match) {
      return { valid: false, message: 'Reset token not found or invalid.' };
    }

    if (match.used) {
      return { valid: false, message: 'This reset token has already been used.' };
    }

    if (Date.now() > match.expiresAt) {
      return { valid: false, message: 'This reset token has expired. Please request a new token.' };
    }

    if (emailInput && match.email.toLowerCase() !== emailInput.trim().toLowerCase()) {
      return { valid: false, message: 'Email does not match this reset token.' };
    }

    const remainingSeconds = Math.max(0, Math.ceil((match.expiresAt - Date.now()) / 1000));
    return {
      valid: true,
      email: match.email,
      remainingSeconds,
      message: 'Token verified successfully.',
    };
  }

  public async resetPasswordWithToken(
    tokenInput: string,
    emailInput: string,
    newPasswordInput: string
  ): Promise<{ success: boolean; message?: string }> {
    const cleanToken = tokenInput.trim();
    const email = emailInput.trim().toLowerCase();

    if (!cleanToken) {
      return { success: false, message: 'Reset token is required.' };
    }
    if (!email) {
      return { success: false, message: 'Email is required.' };
    }
    if (newPasswordInput.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters long.' };
    }
    const hasLetter = /[a-zA-Z]/.test(newPasswordInput);
    const hasNumber = /[0-9]/.test(newPasswordInput);
    if (!hasLetter || !hasNumber) {
      return { success: false, message: 'New password must contain both letters and numbers.' };
    }

    // 1. Verify token
    const verification = await this.verifyPasswordResetToken(cleanToken, email);
    if (!verification.valid) {
      return { success: false, message: verification.message || 'Invalid or expired token.' };
    }

    // 2. Update credentials in authSessionService
    const updateRes = authSessionService.updatePassword(email, newPasswordInput);
    if (!updateRes.success) {
      return { success: false, message: updateRes.message || 'Failed to update password.' };
    }

    // 3. Inform server endpoint
    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken, email, newPassword: newPasswordInput }),
      });
    } catch (e) {
      console.warn('[Self-Service Reset] Server reset password notify note:', e);
    }

    // 4. Mark token used in cache & Firestore
    const tokens = this.getPasswordResetTokens();
    const updatedTokens = tokens.map((t) => {
      if (t.token.toLowerCase() === cleanToken.toLowerCase() || t.id.toLowerCase() === cleanToken.toLowerCase()) {
        return { ...t, used: true, usedAt: Date.now() };
      }
      return t;
    });
    this.save(STORAGE_KEYS.PASSWORD_RESET_TOKENS, updatedTokens);

    // Also update directly in Firestore doc
    try {
      await updateDoc(doc(db, 'password_reset_tokens', cleanToken), {
        used: true,
        usedAt: Date.now(),
      });
    } catch {
      // Ignored if document wasn't created directly on that exact key
    }

    // 5. Audit log
    const user = this.getUsers().find((u) => u.email.toLowerCase() === email);
    this.logAudit({
      actorId: user?.id || 'system',
      actorName: user?.displayName || email,
      actorRole: user?.role || 'customer',
      action: 'PASSWORD_RESET_SUCCESSFUL',
      entityType: 'user',
      entityId: user?.id || 'anonymous',
      details: `Self-service password reset completed via verified token for ${email}.`,
    });

    return {
      success: true,
      message: 'Your password has been successfully updated! You can now sign in with your new credentials.',
    };
  }

  // Users
  public getUsers(): UserProfile[] {
    return this.load<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getUserById(userId: string): UserProfile | undefined {
    return this.getUsers().find((u) => u.id === userId);
  }

  public getUserRegisteredMethod(userId: string): {
    method: PaymentMethodType | null;
    methodName: string;
    details?: string;
  } {
    const user = this.getUserById(userId);
    const wallet = this.getWallet(userId);
    let method: PaymentMethodType | null = user?.registeredPaymentMethod || wallet?.registeredPaymentMethod || null;
    let details: string | undefined = user?.registeredPaymentDetails || wallet?.registeredPaymentDetails;

    // Fallback: check most recent topup request for this customer
    if (!method) {
      const topups = this.getTopUpRequests(userId);
      if (topups.length > 0) {
        const last = topups[0];
        method = last.method;
        details = last.providerRef || last.cryptoTxHash || last.depositAddress;
      }
    }

    const config = this.getAppConfig();
    const pm = method ? config.paymentMethods.find((m) => m.type === method) : null;
    let methodName = pm?.name || '';
    if (!methodName && method) {
      if (method === 'cashapp') methodName = 'Direct CashApp Payment';
      else if (method === 'chime') methodName = 'Chime Direct Payment';
      else if (method === 'crypto') methodName = 'Crypto Payment';
      else if (method === 'payment_link') methodName = 'Payment via Link';
      else methodName = 'Registered Payment Method';
    }

    return {
      method,
      methodName: methodName || 'None Registered',
      details,
    };
  }

  public setUserRegisteredMethod(userId: string, method: PaymentMethodType, details?: string): void {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.registeredPaymentMethod = method;
      if (details) user.registeredPaymentDetails = details;
      this.save(STORAGE_KEYS.USERS, users);
    }
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    if (wallets[userId]) {
      wallets[userId].registeredPaymentMethod = method;
      if (details) wallets[userId].registeredPaymentDetails = details;
      wallets[userId].lastUpdatedAt = new Date().toISOString();
      this.save(STORAGE_KEYS.WALLETS, wallets);
    }
  }

  public registerUser(params: {
    id?: string;
    email: string;
    displayName: string;
    phone?: string;
    role?: 'customer' | 'agent' | 'admin';
    referralCode?: string;
  }): { success: boolean; user?: UserProfile; message?: string } {
    const users = this.getUsers();
    const existing = users.find(
      (u) => (params.id && u.id === params.id) || u.email.toLowerCase() === params.email.toLowerCase() || (params.phone && u.phone === params.phone)
    );
    if (existing) {
      return { success: false, message: 'An account with this email or phone already exists.' };
    }

    let referredBy: string | undefined = undefined;
    if (params.referralCode) {
      const codeClean = params.referralCode.trim().toUpperCase();
      const referrer = users.find((u) => u.referralCode.toUpperCase() === codeClean);
      if (referrer) {
        referredBy = referrer.referralCode;
      }
    }

    const newId = params.id || `usr_customer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const generatedRefCode = `AP_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newUser: UserProfile = {
      id: newId,
      email: params.email,
      displayName: params.displayName,
      phone: params.phone,
      role: params.role || 'customer',
      referralCode: generatedRefCode,
      referredBy,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.save(STORAGE_KEYS.USERS, users);

    // Initialize clean wallet
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    wallets[newId] = {
      customerId: newId,
      currency: 'USD',
      availableBalance: 0,
      referralBonusBalance: 0,
      reservedBalance: 0,
      pendingDepositBalance: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.save(STORAGE_KEYS.WALLETS, wallets);

    // Initial welcome notification
    this.createNotification({
      userId: newId,
      title: 'Welcome to Swift Sweeps',
      message: 'Your gaming wallet and customer support portal are ready.',
      type: 'system',
      linkTab: 'dashboard',
    });

    this.setCurrentUserId(newId);
    return { success: true, user: newUser };
  }

  // Wallets & Authoritative Ledger
  public getWallet(customerId: string): UserWallet {
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    if (!wallets[customerId]) {
      wallets[customerId] = {
        customerId,
        currency: 'USD',
        availableBalance: 0,
        referralBonusBalance: 0,
        reservedBalance: 0,
        pendingDepositBalance: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
      this.save(STORAGE_KEYS.WALLETS, wallets);
    } else if (wallets[customerId].referralBonusBalance === undefined) {
      wallets[customerId].referralBonusBalance = 0;
      this.save(STORAGE_KEYS.WALLETS, wallets);
    }
    return wallets[customerId];
  }

  public getTransactions(customerId?: string): WalletTransaction[] {
    const txs = this.load<WalletTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    if (customerId) {
      return txs.filter((t) => t.customerId === customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Top-Up Workflow
  public getTopUpRequests(customerId?: string): TopUpRequest[] {
    const reqs = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
    if (customerId) {
      return reqs.filter((r) => r.customerId === customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public submitTopUp(params: {
    customerId: string;
    customerName: string;
    amount: number;
    method: PaymentMethodType;
    methodName: string;
    targetGameCatalogId?: string;
    targetGameName?: string;
    targetGameUsername?: string;
    fundingSource?: 'payment_method' | 'referral_bonus' | 'wallet_balance';
    providerRef?: string;
    receiptUrl?: string;
    receiptName?: string;
    cryptoNetwork?: string;
    cryptoTxHash?: string;
    depositAddress?: string;
    simulateInstantGateway?: boolean;
  }): TopUpRequest {
    const config = this.getAppConfig();
    const pm = config.paymentMethods.find((m) => m.type === params.method);

    // Calculate eligible bonus accurately using immutable snapshot
    let bonusAmount = 0;
    let bonusPercentage = 0;
    if (pm && pm.bonusPercentage && (!pm.bonusMinDeposit || params.amount >= pm.bonusMinDeposit)) {
      bonusPercentage = pm.bonusPercentage;
      const rawBonus = (params.amount * bonusPercentage) / 100;
      bonusAmount = pm.bonusMaxCap ? Math.min(rawBonus, pm.bonusMaxCap) : rawBonus;
    }

    const feeAmount = pm && pm.feePercentage ? (params.amount * pm.feePercentage) / 100 : 0;
    const finalWalletCredit = params.amount + bonusAmount;

    const newReqId = `req_topup_${Date.now()}`;
    const initialStatus = params.simulateInstantGateway ? 'completed' : params.method === 'manual_receipt' ? 'verifying' : 'submitted';

    const newReq: TopUpRequest = {
      id: newReqId,
      customerId: params.customerId,
      customerName: params.customerName,
      amount: params.amount,
      currency: config.currency,
      method: params.method,
      methodName: params.methodName,
      targetGameCatalogId: params.targetGameCatalogId,
      targetGameName: params.targetGameName,
      targetGameUsername: params.targetGameUsername,
      fundingSource: params.fundingSource || 'payment_method',
      providerRef: params.providerRef || (params.simulateInstantGateway ? `GW_AUTH_${Date.now().toString(36).toUpperCase()}` : undefined),
      receiptUrl: params.receiptUrl,
      receiptName: params.receiptName,
      cryptoNetwork: params.cryptoNetwork,
      cryptoTxHash: params.cryptoTxHash,
      depositAddress: params.depositAddress,
      bonusAmount,
      bonusPercentage,
      feeAmount,
      finalWalletCredit,
      status: initialStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (config.gatewaySimulator?.autoWebhookEnabled) {
      this.triggerAutomatedWebhookSimulation({
        gateway: params.methodName,
        eventType: initialStatus === 'completed' ? 'payment.succeeded' : 'payment.succeeded',
        amount: params.amount,
        customerId: params.customerId,
        customerName: params.customerName,
        requestId: newReqId,
      });
    }

    const allReqs = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
    allReqs.unshift(newReq);
    this.save(STORAGE_KEYS.TOPUPS, allReqs);

    // Update wallet balances atomically
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    const wallet = wallets[params.customerId] || {
      customerId: params.customerId,
      currency: config.currency,
      availableBalance: 0,
      reservedBalance: 0,
      pendingDepositBalance: 0,
      lastUpdatedAt: new Date().toISOString(),
    };

    // Update registered payment method on user & wallet
    this.setUserRegisteredMethod(params.customerId, params.method, params.providerRef || params.cryptoTxHash || params.depositAddress);

    if (initialStatus === 'completed') {
      // Instant direct game credit
      if (params.targetGameCatalogId) {
        const allAccounts = this.getGameAccounts();
        const gameAcc = allAccounts.find(
          (a) => a.customerId === params.customerId && a.gameCatalogId === params.targetGameCatalogId
        );
        if (gameAcc) {
          gameAcc.balance = (gameAcc.balance || 0) + finalWalletCredit;
          gameAcc.updatedAt = new Date().toISOString();
          this.save(STORAGE_KEYS.GAME_ACCOUNTS, allAccounts);
        }
      }

      // Top-up goes directly to the game server and is not treated as a withdrawable wallet balance
      wallet.lastTopUpAmount = finalWalletCredit;
      wallet.lastTopUpGame = params.targetGameName || 'Game';
      wallet.lastTopUpAt = new Date().toISOString();
      wallet.lastUpdatedAt = new Date().toISOString();
      wallets[params.customerId] = wallet;
      this.save(STORAGE_KEYS.WALLETS, wallets);

      // Record immutable ledger entry
      this.recordTransaction({
        customerId: params.customerId,
        type: 'deposit',
        amount: params.amount,
        fee: feeAmount,
        netAmount: params.amount,
        currency: config.currency,
        balanceAfter: wallet.availableBalance,
        targetGameName: params.targetGameName,
        targetGameUsername: params.targetGameUsername,
        relatedRequestId: newReqId,
        description: params.targetGameName
          ? `Direct Game Top-Up to ${params.targetGameName} (${params.targetGameUsername || 'Player'}) via ${params.methodName}`
          : `Instant ${params.methodName} Deposit to Game Processed`,
        idempotencyKey: `idemp_dep_${newReqId}`,
        status: 'completed',
      });

      if (bonusAmount > 0) {
        this.recordTransaction({
          customerId: params.customerId,
          type: 'bonus',
          amount: bonusAmount,
          fee: 0,
          netAmount: bonusAmount,
          currency: config.currency,
          balanceAfter: wallet.availableBalance,
          relatedRequestId: newReqId,
          description: `${bonusPercentage}% Deposit Promotion Bonus Credit`,
          idempotencyKey: `idemp_bns_${newReqId}`,
          status: 'completed',
        });
      }

      this.checkAndAwardReferral(params.customerId, params.amount);
    } else {
      wallet.pendingDepositBalance += params.amount;
      wallet.lastUpdatedAt = new Date().toISOString();
      wallets[params.customerId] = wallet;
      this.save(STORAGE_KEYS.WALLETS, wallets);
    }

    this.createNotification({
      userId: params.customerId,
      title: initialStatus === 'completed' ? 'Direct Game Top-Up Credited' : 'Top-Up Submitted',
      message:
        initialStatus === 'completed'
          ? `$${finalWalletCredit.toFixed(2)} loaded directly to ${params.targetGameName || 'your game'}! (Tracked as latest top-up, not wallet balance).`
          : `Your top-up of $${params.amount.toFixed(2)} for ${params.targetGameName || 'game'} (${params.methodName}) is under review.`,
      type: 'topup',
      linkTab: 'topup',
      linkRequestId: newReqId,
    });

    this.logAudit({
      actorId: params.customerId,
      actorName: params.customerName,
      actorRole: 'customer',
      action: 'TOPUP_SUBMITTED',
      entityType: 'topup',
      entityId: newReqId,
      details: `Submitted ${params.methodName} top-up for $${params.amount} (Status: ${initialStatus}).`,
    });

    // Automatically forward transaction to customer support chat for review & approval
    const conv = this.getOrCreateConversationForCustomer(params.customerId, params.customerName);
    this.sendChatMessage({
      conversationId: conv.id,
      senderId: params.customerId,
      senderName: params.customerName,
      senderRole: 'customer',
      text: `🎮 Top-Up Request #${newReqId.slice(-6)} Submitted:\n• Game: ${params.targetGameName || 'Game'} (User: ${params.targetGameUsername || params.customerName})\n• Amount: $${params.amount.toFixed(2)}${bonusAmount > 0 ? ` + $${bonusAmount.toFixed(2)} Bonus (${bonusPercentage}%)` : ''} = Total $${finalWalletCredit.toFixed(2)} Credit\n• Channel: ${params.methodName}${params.providerRef || params.cryptoTxHash ? ` (Ref: ${params.providerRef || params.cryptoTxHash})` : ''}\n\n⏳ Status: PENDING SUPPORT APPROVAL`,
      attachmentUrl: params.receiptUrl,
      attachmentName: params.receiptName,
      isInternalNote: false,
      transactionData: {
        transactionType: 'topup',
        requestId: newReqId,
        gameName: params.targetGameName,
        gameUsername: params.targetGameUsername,
        amount: params.amount,
        bonusAmount,
        bonusPercentage,
        finalCredit: finalWalletCredit,
        methodName: params.methodName,
        status: initialStatus === 'completed' ? 'completed' : 'pending',
        proofUrl: params.receiptUrl,
        proofName: params.receiptName,
        details: params.providerRef || params.cryptoTxHash,
      },
    });

    return newReq;
  }

  public approveTopUp(params: {
    requestId: string;
    reviewerId: string;
    reviewerName: string;
    notes?: string;
  }): { success: boolean; message: string } {
    const allReqs = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
    const req = allReqs.find((r) => r.id === params.requestId);
    if (!req) return { success: false, message: 'Request not found' };
    if (req.status === 'completed') return { success: false, message: 'Request is already completed (Double credit prevented).' };

    req.status = 'completed';
    req.reviewerId = params.reviewerId;
    req.reviewerName = params.reviewerName;
    req.reviewNotes = params.notes || 'Approved by customer care operator.';
    req.updatedAt = new Date().toISOString();
    this.save(STORAGE_KEYS.TOPUPS, allReqs);

    // Authoritative wallet adjustment
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    const wallet = wallets[req.customerId] || {
      customerId: req.customerId,
      currency: req.currency,
      availableBalance: 0,
      reservedBalance: 0,
      pendingDepositBalance: 0,
      lastUpdatedAt: new Date().toISOString(),
    };

    wallet.pendingDepositBalance = Math.max(0, wallet.pendingDepositBalance - req.amount);
    // Credited to game, recorded as latest top-up
    wallet.lastTopUpAmount = req.finalWalletCredit;
    wallet.lastTopUpGame = req.targetGameName || 'Game';
    wallet.lastTopUpAt = new Date().toISOString();
    wallet.lastUpdatedAt = new Date().toISOString();
    wallets[req.customerId] = wallet;
    this.save(STORAGE_KEYS.WALLETS, wallets);

    // Direct game account crediting
    if (req.targetGameCatalogId) {
      const allAccounts = this.getGameAccounts();
      const gameAcc = allAccounts.find(
        (a) => a.customerId === req.customerId && a.gameCatalogId === req.targetGameCatalogId
      );
      if (gameAcc) {
        gameAcc.balance = (gameAcc.balance || 0) + req.finalWalletCredit;
        gameAcc.updatedAt = new Date().toISOString();
        this.save(STORAGE_KEYS.GAME_ACCOUNTS, allAccounts);
      }
    }

    // Ledger records
    this.recordTransaction({
      customerId: req.customerId,
      type: 'deposit',
      amount: req.amount,
      fee: req.feeAmount,
      netAmount: req.amount,
      currency: req.currency,
      balanceAfter: wallet.availableBalance - req.bonusAmount,
      targetGameName: req.targetGameName,
      targetGameUsername: req.targetGameUsername,
      relatedRequestId: req.id,
      description: req.targetGameName
        ? `Direct Game Top-Up to ${req.targetGameName} (${req.targetGameUsername || 'Player'}) Approved`
        : `${req.methodName} Deposit Approved by Staff`,
      idempotencyKey: `idemp_dep_${req.id}`,
      status: 'completed',
    });

    if (req.bonusAmount > 0) {
      this.recordTransaction({
        customerId: req.customerId,
        type: 'bonus',
        amount: req.bonusAmount,
        fee: 0,
        netAmount: req.bonusAmount,
        currency: req.currency,
        balanceAfter: wallet.availableBalance,
        relatedRequestId: req.id,
        description: `Promo Bonus (${req.bonusPercentage}%) Credited`,
        idempotencyKey: `idemp_bns_${req.id}`,
        status: 'completed',
      });
    }

    this.checkAndAwardReferral(req.customerId, req.amount);

    this.createNotification({
      userId: req.customerId,
      title: 'Game Top-Up Approved & Loaded',
      message: `Your deposit of $${req.amount.toFixed(2)}${req.bonusAmount > 0 ? ` plus $${req.bonusAmount.toFixed(2)} bonus` : ''} was loaded directly into your ${req.targetGameName || 'game'} account! (Tracked as latest top-up).`,
      type: 'topup',
      linkTab: 'topup',
      linkRequestId: req.id,
    });

    this.logAudit({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'agent',
      action: 'TOPUP_APPROVED',
      entityType: 'topup',
      entityId: req.id,
      details: `Approved $${req.amount} deposit + $${req.bonusAmount} bonus for ${req.customerName}. Note: ${params.notes || 'None'}`,
    });

    // Update transaction card in chat thread and post confirmation
    this.updateChatTransactionStatus(req.id, 'completed', params.reviewerName, params.notes);

    return { success: true, message: 'Deposit successfully approved and credited.' };
  }

  public rejectTopUp(params: {
    requestId: string;
    reviewerId: string;
    reviewerName: string;
    reason: string;
  }): { success: boolean; message: string } {
    const allReqs = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
    const req = allReqs.find((r) => r.id === params.requestId);
    if (!req) return { success: false, message: 'Request not found' };
    if (req.status === 'completed') return { success: false, message: 'Cannot reject completed deposit.' };

    req.status = 'rejected';
    req.reviewerId = params.reviewerId;
    req.reviewerName = params.reviewerName;
    req.reviewNotes = params.reason;
    req.updatedAt = new Date().toISOString();
    this.save(STORAGE_KEYS.TOPUPS, allReqs);

    // Release pending counter
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    if (wallets[req.customerId]) {
      wallets[req.customerId].pendingDepositBalance = Math.max(0, wallets[req.customerId].pendingDepositBalance - req.amount);
      wallets[req.customerId].lastUpdatedAt = new Date().toISOString();
      this.save(STORAGE_KEYS.WALLETS, wallets);
    }

    this.createNotification({
      userId: req.customerId,
      title: 'Deposit Request Declined',
      message: `Your deposit was rejected. Reason: ${params.reason}`,
      type: 'topup',
      linkTab: 'topup',
      linkRequestId: req.id,
    });

    this.logAudit({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'agent',
      action: 'TOPUP_REJECTED',
      entityType: 'topup',
      entityId: req.id,
      details: `Declined deposit for ${req.customerName}. Reason: ${params.reason}`,
    });

    // Update transaction card in chat thread
    this.updateChatTransactionStatus(req.id, 'rejected', params.reviewerName, params.reason);

    return { success: true, message: 'Deposit rejected.' };
  }

  // Cashout / Withdrawal Workflow
  public getWithdrawalRequests(customerId?: string): WithdrawalRequest[] {
    const reqs = this.load<WithdrawalRequest[]>(STORAGE_KEYS.WITHDRAWALS, INITIAL_WITHDRAWALS);
    if (customerId) {
      return reqs.filter((r) => r.customerId === customerId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public submitWithdrawal(params: {
    customerId: string;
    customerName: string;
    amount: number;
    method?: string;
    methodName?: string;
    sourceGameCatalogId?: string;
    sourceGameName?: string;
    sourceGameUsername?: string;
    playerNotes?: string;
    payoutDetails?: WithdrawalRequest['payoutDetails'];
  }): { success: boolean; message: string; request?: WithdrawalRequest } {
    if (params.amount <= 0) {
      return { success: false, message: 'Please enter a valid cashout amount to request.' };
    }

    const customer = this.getUserById(params.customerId);
    const isEmailVerified = customer?.emailVerified ?? (auth.currentUser?.uid === params.customerId ? auth.currentUser.emailVerified : false);
    if (!isEmailVerified) {
      return {
        success: false,
        message: 'Email verification is required before requesting cashouts. Please verify your email address to unlock withdrawals.',
      };
    }

    const config = this.getAppConfig();
    const methodName = params.methodName || 'Customer Support Manual Payout';
    const newReqId = `req_wdr_${Date.now()}`;

    const newReq: WithdrawalRequest = {
      id: newReqId,
      customerId: params.customerId,
      customerName: params.customerName,
      amount: params.amount,
      currency: config.currency,
      feeAmount: 0,
      netPayout: params.amount,
      method: params.method || 'manual_support',
      methodName,
      sourceGameCatalogId: params.sourceGameCatalogId,
      sourceGameName: params.sourceGameName,
      sourceGameUsername: params.sourceGameUsername,
      playerNotes: params.playerNotes,
      payoutDetails: params.payoutDetails || { collectedBySupport: false },
      reservedAmount: params.amount,
      status: 'submitted',
      timeline: [
        {
          status: 'submitted',
          note: `Player requested $${params.amount.toFixed(2)} from ${params.sourceGameName || 'Game'}. Support will manually review game balance and request payout info in chat.`,
          timestamp: new Date().toISOString(),
          actorName: params.customerName,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allReqs = this.load<WithdrawalRequest[]>(STORAGE_KEYS.WITHDRAWALS, INITIAL_WITHDRAWALS);
    allReqs.unshift(newReq);
    this.save(STORAGE_KEYS.WITHDRAWALS, allReqs);

    // Immutable ledger record
    this.recordTransaction({
      customerId: params.customerId,
      type: 'withdrawal_hold',
      amount: params.amount,
      fee: 0,
      netAmount: params.amount,
      currency: config.currency,
      balanceAfter: 0,
      targetGameName: params.sourceGameName,
      targetGameUsername: params.sourceGameUsername,
      relatedRequestId: newReqId,
      description: `Manual Cashout Request #${newReqId} from ${params.sourceGameName || 'Game'} under Support Review`,
      idempotencyKey: `idemp_wdr_${newReqId}`,
      status: 'pending',
    });

    // Automatically initialize support chat so customer support can manually process cashout
    const lastMethodInfo = this.getUserRegisteredMethod(params.customerId);
    const lastMethodName = lastMethodInfo.methodName || 'Standard Method';
    const lastMethodDetail = lastMethodInfo.details ? ` (${lastMethodInfo.details})` : '';

    const conv = this.getOrCreateConversationForCustomer(params.customerId, params.customerName);
    this.sendChatMessage({
      conversationId: conv.id,
      senderId: params.customerId,
      senderName: params.customerName,
      senderRole: 'customer',
      text: `💸 Cashout Request #${newReqId.slice(-6)}: I want to cash out $${params.amount.toFixed(2)} from "${params.sourceGameName || 'Game'}".\nLast Top-Up Method Used: ${lastMethodName}${lastMethodDetail}.\n\n⏳ Status: PENDING SUPPORT APPROVAL`,
      isInternalNote: false,
      transactionData: {
        transactionType: 'withdrawal',
        requestId: newReqId,
        gameName: params.sourceGameName,
        gameUsername: params.sourceGameUsername,
        amount: params.amount,
        methodName: lastMethodName,
        status: 'pending',
        notes: params.playerNotes,
        details: lastMethodDetail,
      },
    });

    this.sendChatMessage({
      conversationId: conv.id,
      senderId: 'usr_admin_1',
      senderName: 'System / Treasury Desk',
      senderRole: 'system',
      text: `🚨 [Support Notice] New Cashout Request #${newReqId.slice(-6)} from ${params.customerName}:\n• Amount: $${params.amount.toFixed(2)}\n• Game: ${params.sourceGameName || 'Game'}\n• Last Payment Method Used: ${lastMethodName}${lastMethodDetail}\n• Policy: Please check game balance and send funds manually via ${lastMethodName}.`,
      isInternalNote: false,
    });

    this.createNotification({
      userId: params.customerId,
      title: 'Cashout Request Submitted',
      message: `Your $${params.amount.toFixed(2)} cashout request for ${params.sourceGameName || 'Game'} is under manual review. Support will message you for payout info.`,
      type: 'withdrawal',
      linkTab: 'chat',
      linkRequestId: newReqId,
    });

    this.logAudit({
      actorId: params.customerId,
      actorName: params.customerName,
      actorRole: 'customer',
      action: 'WITHDRAWAL_SUBMITTED',
      entityType: 'withdrawal',
      entityId: newReqId,
      details: `Submitted manual cashout request for $${params.amount} from ${params.sourceGameName || 'Game'}. Dispatched to Support Chat.`,
    });

    return { success: true, message: 'Withdrawal request created! Customer Support is reviewing your request.', request: newReq };
  }

  public updateWithdrawalStatus(params: {
    requestId: string;
    newStatus: WithdrawalStatus;
    reviewerId: string;
    reviewerName: string;
    note?: string;
    payoutReference?: string;
  }): { success: boolean; message: string } {
    const allReqs = this.load<WithdrawalRequest[]>(STORAGE_KEYS.WITHDRAWALS, INITIAL_WITHDRAWALS);
    const req = allReqs.find((r) => r.id === params.requestId);
    if (!req) return { success: false, message: 'Withdrawal request not found' };

    const oldStatus = req.status;
    if (oldStatus === 'completed' || oldStatus === 'rejected') {
      return { success: false, message: `Cannot change status of an already ${oldStatus} withdrawal.` };
    }

    req.status = params.newStatus;
    req.reviewerId = params.reviewerId;
    req.reviewerName = params.reviewerName;
    if (params.note) req.reviewNotes = params.note;
    if (params.payoutReference) req.payoutReference = params.payoutReference;
    req.updatedAt = new Date().toISOString();

    req.timeline.push({
      status: params.newStatus,
      note: params.note || `Status updated to ${params.newStatus}.`,
      timestamp: new Date().toISOString(),
      actorName: params.reviewerName,
    });

    this.save(STORAGE_KEYS.WITHDRAWALS, allReqs);

    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    const wallet = wallets[req.customerId];

    if (params.newStatus === 'completed') {
      // Deduct from reserved balance permanently
      if (wallet) {
        wallet.reservedBalance = Math.max(0, wallet.reservedBalance - req.reservedAmount);
        wallet.lastUpdatedAt = new Date().toISOString();
        this.save(STORAGE_KEYS.WALLETS, wallets);
      }

      this.recordTransaction({
        customerId: req.customerId,
        type: 'withdrawal',
        amount: req.amount,
        fee: req.feeAmount,
        netAmount: req.netPayout,
        currency: req.currency,
        balanceAfter: wallet ? wallet.availableBalance : 0,
        relatedRequestId: req.id,
        description: `Cashout Paid Out via ${req.methodName} (${params.payoutReference || 'Ref' + req.id})`,
        idempotencyKey: `idemp_wdr_final_${req.id}`,
        status: 'completed',
      });

      this.createNotification({
        userId: req.customerId,
        title: 'Withdrawal Completed',
        message: `Your $${req.netPayout.toFixed(2)} cashout was dispatched. Reference: ${params.payoutReference || 'Completed'}`,
        type: 'withdrawal',
        linkTab: 'withdrawal',
        linkRequestId: req.id,
      });

      const cfg = this.getAppConfig();
      if (cfg.gatewaySimulator?.autoWebhookEnabled) {
        this.triggerAutomatedWebhookSimulation({
          gateway: req.methodName || 'Bank Transfer',
          eventType: 'payout.settled',
          amount: req.netPayout,
          customerId: req.customerId,
          customerName: req.customerName,
          requestId: req.id,
        });
      }
    } else if (params.newStatus === 'rejected' || params.newStatus === 'cancelled') {
      // Compensating transaction: release reserved funds back to available balance!
      if (wallet) {
        wallet.reservedBalance = Math.max(0, wallet.reservedBalance - req.reservedAmount);
        wallet.availableBalance += req.reservedAmount;
        wallet.lastUpdatedAt = new Date().toISOString();
        this.save(STORAGE_KEYS.WALLETS, wallets);
      }

      // Restore source game balance if cashout originated from a specific game
      if (req.sourceGameCatalogId) {
        const allAccounts = this.getGameAccounts();
        const gameAcc = allAccounts.find(
          (a) => a.customerId === req.customerId && a.gameCatalogId === req.sourceGameCatalogId
        );
        if (gameAcc) {
          gameAcc.balance = (gameAcc.balance || 0) + req.amount;
          gameAcc.updatedAt = new Date().toISOString();
          this.save(STORAGE_KEYS.GAME_ACCOUNTS, allAccounts);
        }
      }

      this.recordTransaction({
        customerId: req.customerId,
        type: 'withdrawal_release',
        amount: req.amount,
        fee: 0,
        netAmount: req.amount,
        currency: req.currency,
        balanceAfter: wallet ? wallet.availableBalance : 0,
        relatedRequestId: req.id,
        description: `Reserved Funds Released for Cancelled/Rejected Cashout #${req.id}`,
        idempotencyKey: `idemp_wdr_release_${req.id}`,
        status: 'completed',
      });

      this.createNotification({
        userId: req.customerId,
        title: 'Withdrawal Rejected - Funds Released',
        message: `Your $${req.amount.toFixed(2)} cashout was declined. Reserved funds have been restored to your available balance. Reason: ${params.note || 'None'}`,
        type: 'withdrawal',
        linkTab: 'wallet',
        linkRequestId: req.id,
      });
    } else {
      this.createNotification({
        userId: req.customerId,
        title: 'Withdrawal Update',
        message: `Your cashout #${req.id} is now ${params.newStatus.replace('_', ' ')}.`,
        type: 'withdrawal',
        linkTab: 'withdrawal',
        linkRequestId: req.id,
      });
    }

    this.logAudit({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'agent',
      action: `WITHDRAWAL_${params.newStatus.toUpperCase()}`,
      entityType: 'withdrawal',
      entityId: req.id,
      details: `Status transitioned from ${oldStatus} to ${params.newStatus}. Note: ${params.note || 'None'}. Reference: ${params.payoutReference || 'None'}`,
    });

    // Sync chat transaction card in conversation thread
    if (params.newStatus === 'completed') {
      this.updateChatTransactionStatus(req.id, 'completed', params.reviewerName, params.note);
    } else if (params.newStatus === 'rejected' || params.newStatus === 'cancelled') {
      this.updateChatTransactionStatus(req.id, 'rejected', params.reviewerName, params.note);
    }

    return { success: true, message: `Withdrawal status updated to ${params.newStatus}.` };
  }

  // Master Game Catalog (Admin Account Managed)
  public getGameCatalog(): GameCatalogItem[] {
    const list = this.load<GameCatalogItem[]>(STORAGE_KEYS.GAME_CATALOG, INITIAL_GAME_CATALOG);
    return list.map((g) => {
      const resolvedIcon = resolveGameImageUrl(g.iconUrl || g.imageUrl);
      return {
        ...g,
        links: g.links && g.links.length > 0 ? g.links : [{ label: 'Web Play', url: g.gameUrl || 'https://games.swiftsweeps.com' }],
        iconUrl: resolvedIcon,
        imageUrl: resolvedIcon,
      };
    });
  }

  public saveGameCatalogItem(
    item: Omit<GameCatalogItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    actorId: string,
    actorName: string
  ): GameCatalogItem {
    const list = this.getGameCatalog();
    const existingIndex = item.id ? list.findIndex((g) => g.id === item.id) : -1;
    const isNew = existingIndex === -1;
    const now = new Date().toISOString();
    const resolvedIcon = resolveGameImageUrl(item.iconUrl || item.imageUrl);
    const resolvedImage = resolveGameImageUrl(item.imageUrl || item.iconUrl);

    let savedItem: GameCatalogItem;

    if (isNew) {
      const newItem: GameCatalogItem = {
        ...item,
        iconUrl: resolvedIcon,
        imageUrl: resolvedImage,
        id: item.id || `gc_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      list.unshift(newItem);
      this.save(STORAGE_KEYS.GAME_CATALOG, list);
      this.logAudit({
        actorId,
        actorName,
        actorRole: 'admin',
        action: 'GAME_CATALOG_CREATED',
        entityType: 'settings',
        entityId: newItem.id,
        details: `Admin added game "${newItem.title}" to platform catalog.`,
      });
      savedItem = newItem;
    } else {
      list[existingIndex] = {
        ...list[existingIndex],
        ...item,
        iconUrl: resolvedIcon,
        imageUrl: resolvedImage,
        updatedAt: now,
      };
      this.save(STORAGE_KEYS.GAME_CATALOG, list);
      this.logAudit({
        actorId,
        actorName,
        actorRole: 'admin',
        action: 'GAME_CATALOG_UPDATED',
        entityType: 'settings',
        entityId: item.id!,
        details: `Admin updated game "${item.title}" in platform catalog.`,
      });
      savedItem = list[existingIndex];
    }

    // Persist synchronously to Firestore so changes reflect across devices in real-time
    try {
      const docData = JSON.parse(JSON.stringify(savedItem));
      setDoc(doc(db, 'game_catalog', savedItem.id), docData, { merge: true }).catch((err) => {
        console.warn('Firestore game_catalog setDoc notice:', err);
      });
    } catch (err) {
      console.warn('Error serializing game doc for Firestore:', err);
    }

    return savedItem;
  }

  public async deleteGameCatalogItem(gameId: string, actorId: string, actorName: string): Promise<void> {
    const list = this.getGameCatalog();
    const target = list.find((g) => g.id === gameId);
    const updated = list.filter((g) => g.id !== gameId);
    this.cache[STORAGE_KEYS.GAME_CATALOG] = updated;
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.GAME_CATALOG } }));

    // Delete directly from Firestore so it is permanently deleted from database
    try {
      await deleteDoc(doc(db, 'game_catalog', gameId));
    } catch (err) {
      console.warn('Failed to delete game doc from Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `game_catalog/${gameId}`);
    }

    this.logAudit({
      actorId,
      actorName,
      actorRole: 'admin',
      action: 'GAME_CATALOG_DELETED',
      entityType: 'settings',
      entityId: gameId,
      details: `Admin removed game "${target?.title || gameId}" from platform catalog and Firestore.`,
    });
  }

  // Player Game IDs & Credentials (Fixed games, handled by Customer Support)
  public getGameAccounts(customerId?: string): GameAccount[] {
    const list = this.load<GameAccount[]>(STORAGE_KEYS.GAME_ACCOUNTS, INITIAL_GAME_ACCOUNTS);
    if (customerId) return list.filter((g) => g.customerId === customerId);
    return list;
  }

  public getPendingGameRequests(): GameAccount[] {
    const list = this.getGameAccounts();
    return list.filter((g) => g.status === 'pending_assignment' || g.status === 'pending_reset');
  }

  public requestGameCredentials(params: {
    customerId: string;
    customerName: string;
    gameCatalogId: string;
  }): { success: boolean; message: string; account?: GameAccount } {
    const catalog = this.getGameCatalog();
    const game = catalog.find((g) => g.id === params.gameCatalogId);
    if (!game) return { success: false, message: 'Game title not found in active catalog.' };

    const accounts = this.getGameAccounts();
    const existing = accounts.find((a) => a.customerId === params.customerId && a.gameCatalogId === params.gameCatalogId);

    if (existing && existing.status === 'active') {
      return { success: false, message: 'You already have active credentials for this game.' };
    }

    if (existing && (existing.status === 'pending_assignment' || existing.status === 'pending_reset')) {
      return { success: false, message: 'A request for this game is already assigned to Customer Support.' };
    }

    const now = new Date().toISOString();
    const newReq: GameAccount = {
      id: existing ? existing.id : `ga_${Date.now()}`,
      gameCatalogId: game.id,
      customerId: params.customerId,
      gameName: game.title,
      platformName: game.platform,
      username: 'Pending Assignment',
      gameUrl: game.gameUrl,
      status: 'pending_assignment',
      balance: existing ? existing.balance || 0 : 0,
      requestType: 'new_id_request',
      notes: `Player ${params.customerName} requested new credentials.`,
      createdAt: now,
      updatedAt: now,
    };

    if (existing) {
      const idx = accounts.findIndex((a) => a.id === existing.id);
      accounts[idx] = newReq;
    } else {
      accounts.unshift(newReq);
    }
    this.save(STORAGE_KEYS.GAME_ACCOUNTS, accounts);

    // Auto dispatch into support chat channel
    const conv = this.getOrCreateConversationForCustomer(params.customerId, params.customerName);
    this.sendChatMessage({
      conversationId: conv.id,
      senderId: params.customerId,
      senderName: params.customerName,
      senderRole: 'customer',
      text: `Hello Customer Support, I would like to request a Game ID and login password for "${game.title}" (${game.platform}).`,
      isInternalNote: false,
    });

    this.createNotification({
      userId: params.customerId,
      title: 'Game ID Request Forwarded',
      message: `Your request for ${game.title} has been forwarded to customer support specialists.`,
      type: 'game_account',
      linkTab: 'game_accounts',
    });

    this.logAudit({
      actorId: params.customerId,
      actorName: params.customerName,
      actorRole: 'customer',
      action: 'GAME_ID_REQUESTED',
      entityType: 'game_account',
      entityId: newReq.id,
      details: `Player requested Game ID and password for ${game.title}. Forwarded to Customer Support.`,
    });

    return { success: true, message: 'Request forwarded to Customer Support specialists.', account: newReq };
  }

  public requestGamePasswordReset(params: {
    accountId: string;
    customerId: string;
    customerName: string;
  }): { success: boolean; message: string } {
    const accounts = this.getGameAccounts();
    const acc = accounts.find((a) => a.id === params.accountId);
    if (!acc) return { success: false, message: 'Game account not found' };

    acc.status = 'pending_reset';
    acc.requestType = 'password_reset_request';
    acc.updatedAt = new Date().toISOString();
    this.save(STORAGE_KEYS.GAME_ACCOUNTS, accounts);

    // Create a support conversation or add message automatically
    const conv = this.getOrCreateConversationForCustomer(params.customerId, params.customerName);
    this.sendChatMessage({
      conversationId: conv.id,
      senderId: params.customerId,
      senderName: params.customerName,
      senderRole: 'customer',
      text: `Hello Customer Support, please update/reset my password credentials for "${acc.gameName}" (Username: ${acc.username}).`,
      isInternalNote: false,
    });

    this.createNotification({
      userId: params.customerId,
      title: 'Credential Reset Request Forwarded',
      message: `Your password reset request for ${acc.gameName} is dispatched to customer care specialists.`,
      type: 'game_account',
      linkTab: 'chat',
    });

    this.logAudit({
      actorId: params.customerId,
      actorName: params.customerName,
      actorRole: 'customer',
      action: 'GAME_PASSWORD_RESET_REQUESTED',
      entityType: 'game_account',
      entityId: acc.id,
      details: `Player requested credential reset for ${acc.gameName}. Forwarded to Customer Support.`,
    });

    return { success: true, message: 'Password reset request dispatched to customer care.' };
  }

  // Customer Support handles assigning / updating credentials
  public assignOrUpdateGameCredentials(params: {
    accountId: string;
    username: string;
    password: string;
    notes?: string;
    reviewerId: string;
    reviewerName: string;
  }): { success: boolean; message: string } {
    const accounts = this.getGameAccounts();
    const acc = accounts.find((a) => a.id === params.accountId);
    if (!acc) return { success: false, message: 'Game account not found.' };

    acc.username = params.username.trim();
    acc.password = params.password.trim();
    acc.status = 'active';
    acc.requestType = undefined;
    acc.assignedByAgentId = params.reviewerId;
    acc.assignedByAgentName = params.reviewerName;
    if (params.notes) acc.notes = params.notes;
    acc.updatedAt = new Date().toISOString();
    this.save(STORAGE_KEYS.GAME_ACCOUNTS, accounts);

    // Notify player and dispatch confirmation in support chat
    const conv = this.getOrCreateConversationForCustomer(acc.customerId, this.getUserById(acc.customerId)?.displayName || 'Player');
    this.sendChatMessage({
      conversationId: conv.id,
      senderId: params.reviewerId,
      senderName: params.reviewerName,
      senderRole: 'agent',
      text: `Your player credentials for "${acc.gameName}" are ready! Assigned Username: "${acc.username}". You can view and reveal your password anytime in your Gaming IDs portal.`,
      isInternalNote: false,
    });

    this.createNotification({
      userId: acc.customerId,
      title: 'Game Credentials Configured',
      message: `Customer support assigned your login credentials for ${acc.gameName}. Username: ${acc.username}`,
      type: 'game_account',
      linkTab: 'game_accounts',
    });

    this.logAudit({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'agent',
      action: 'GAME_CREDENTIALS_ASSIGNED',
      entityType: 'game_account',
      entityId: acc.id,
      details: `Support specialist ${params.reviewerName} configured credentials for ${acc.gameName} (User: ${acc.username})`,
    });

    return { success: true, message: `Successfully assigned credentials for ${acc.gameName}. Player notified.` };
  }

  // Real-Time Chat & Customer Support Center
  public getConversations(): SupportConversation[] {
    return this.load<SupportConversation[]>(STORAGE_KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS).sort(
      (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );
  }

  public getOrCreateConversationForCustomer(customerId: string, customerName: string): SupportConversation {
    const list = this.getConversations();
    let conv = list.find((c) => c.customerId === customerId);
    if (!conv) {
      const user = this.getUserById(customerId);
      conv = {
        id: `conv_${Date.now()}`,
        customerId,
        customerName: user?.displayName || customerName,
        customerEmail: user?.email || `${customerId}@user.com`,
        assignedAgentId: 'usr_agent_1',
        assignedAgentName: 'Sarah Lin',
        status: 'open',
        lastMessageText: 'Support channel initialized.',
        lastMessageTimestamp: new Date().toISOString(),
        unreadCountCustomer: 0,
        unreadCountStaff: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(conv);
      this.save(STORAGE_KEYS.CONVERSATIONS, list);

      // Create initial greeting message
      this.sendChatMessage({
        conversationId: conv.id,
        senderId: 'usr_agent_1',
        senderName: 'Sarah Lin',
        senderRole: 'agent',
        text: 'Welcome to Swift Sweeps Support! How can our treasury and gaming care specialists assist you today?',
        isInternalNote: false,
      });
    }
    return conv;
  }

  public getMessages(conversationId: string): ChatMessage[] {
    const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    return all[conversationId] || [];
  }

  public sendChatMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: 'customer' | 'agent' | 'admin' | 'system';
    text: string;
    attachmentUrl?: string;
    attachmentName?: string;
    isInternalNote?: boolean;
    transactionData?: ChatTransactionData;
  }): ChatMessage {
    const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    if (!all[params.conversationId]) {
      all[params.conversationId] = [];
    }

    // Deterministic Intent Parsing
    let intentAction: ChatMessage['intentAction'] = undefined;
    if (params.senderRole === 'customer') {
      const lower = params.text.toLowerCase();
      // Look for numbers like "$500" or "500"
      const numberMatch = lower.match(/(?:\$|\s|^)(\d+(?:\.\d{1,2})?)/);
      const matchedAmount = numberMatch ? parseFloat(numberMatch[1]) : undefined;

      if (lower.includes('withdraw') || lower.includes('cashout') || lower.includes('payout')) {
        intentAction = {
          type: 'open_withdrawal',
          prefilledAmount: matchedAmount,
          title: matchedAmount ? `Start Cashout for $${matchedAmount.toFixed(2)}` : 'Open Cashout Request',
        };
      } else if (lower.includes('topup') || lower.includes('top up') || lower.includes('deposit') || lower.includes('add balance')) {
        intentAction = {
          type: 'open_topup',
          prefilledAmount: matchedAmount,
          title: matchedAmount ? `Top-Up $${matchedAmount.toFixed(2)}` : 'Open Add Balance Form',
        };
      } else if (lower.includes('game') || lower.includes('gaming account') || lower.includes('password') || lower.includes('login')) {
        intentAction = {
          type: 'open_game_account',
          title: 'Manage Gaming Accounts',
        };
      } else if (lower.includes('rule') || lower.includes('policy') || lower.includes('refund') || lower.includes('fee')) {
        intentAction = {
          type: 'view_rules',
          title: 'Review Platform & Refund Policies',
        };
      }
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      text: params.text,
      attachmentUrl: params.attachmentUrl,
      attachmentName: params.attachmentName,
      isInternalNote: !!params.isInternalNote,
      intentAction,
      transactionData: params.transactionData,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    all[params.conversationId].push(newMsg);
    this.save(STORAGE_KEYS.MESSAGES, all);

    // Update conversation summary
    const conversations = this.getConversations();
    const conv = conversations.find((c) => c.id === params.conversationId);
    if (conv) {
      if (!params.isInternalNote) {
        conv.lastMessageText = params.text;
      }
      conv.lastMessageTimestamp = new Date().toISOString();
      if (params.senderRole === 'customer') {
        conv.unreadCountStaff += 1;
      } else if (!params.isInternalNote) {
        conv.unreadCountCustomer += 1;
      }
      conv.updatedAt = new Date().toISOString();
      this.save(STORAGE_KEYS.CONVERSATIONS, conversations);
    }

    return newMsg;
  }

  public updateChatTransactionStatus(
    requestId: string,
    status: 'completed' | 'rejected',
    reviewerName: string,
    notes?: string
  ): void {
    const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    let updated = false;
    let targetConvId: string | null = null;
    let txData: ChatTransactionData | null = null;

    for (const convId in all) {
      for (const msg of all[convId]) {
        if (msg.transactionData && msg.transactionData.requestId === requestId) {
          msg.transactionData.status = status;
          msg.transactionData.approvedBy = reviewerName;
          msg.transactionData.approvedAt = new Date().toISOString();
          if (notes) msg.transactionData.notes = notes;
          updated = true;
          targetConvId = convId;
          txData = msg.transactionData;
        }
      }
    }

    if (updated) {
      this.save(STORAGE_KEYS.MESSAGES, all);
      if (targetConvId && txData) {
        const isCompleted = status === 'completed';
        const typeLabel = txData.transactionType === 'topup' ? 'Top-Up' : 'Cashout';
        this.sendChatMessage({
          conversationId: targetConvId,
          senderId: 'usr_agent_system',
          senderName: 'Customer Support Desk',
          senderRole: 'agent',
          text: isCompleted
            ? `✅ Transaction Approved: ${typeLabel} #${requestId.slice(-6)} ($${txData.amount.toFixed(2)}${txData.bonusAmount ? ` + $${txData.bonusAmount.toFixed(2)} bonus` : ''}) has been verified & approved by ${reviewerName}! Status is now COMPLETED.${notes ? ` Note: ${notes}` : ''}`
            : `❌ Transaction Rejected: ${typeLabel} #${requestId.slice(-6)} was declined by ${reviewerName}.${notes ? ` Reason: ${notes}` : ''}`,
          isInternalNote: false,
        });
      }
    }
  }

  public markConversationRead(conversationId: string, role: 'customer' | 'staff'): void {
    const conversations = this.getConversations();
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      if (role === 'customer') conv.unreadCountCustomer = 0;
      else conv.unreadCountStaff = 0;
      this.save(STORAGE_KEYS.CONVERSATIONS, conversations);
    }
  }

  // Notifications
  public getNotifications(userId: string): AppNotification[] {
    const list = this.load<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    return list.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(params: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
    const list = this.load<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newNotif: AppNotification = {
      ...params,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    list.unshift(newNotif);
    this.save(STORAGE_KEYS.NOTIFICATIONS, list);
    return newNotif;
  }

  public markNotificationAsRead(notifId: string): void {
    const list = this.load<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const item = list.find((n) => n.id === notifId);
    if (item) {
      item.isRead = true;
      this.save(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const list = this.load<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    list.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
    this.save(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  // Referral Program
  public getReferralSummary(userId: string): ReferralSummary {
    const user = this.getUserById(userId);
    const config = this.getAppConfig();
    const allUsers = this.getUsers();
    const allTxs = this.getTransactions();

    const referralCode = user?.referralCode || 'REF_DEFAULT';
    const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

    const referredUsersList = allUsers.filter((u) => u.referredBy?.toUpperCase() === referralCode.toUpperCase());
    const referredSummaryUsers = referredUsersList.map((ru) => {
      // Calculate their deposit volume
      const deposits = allTxs
        .filter((t) => t.customerId === ru.id && t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // Check if referee has verified email
      const isEmailVerified = !!ru.emailVerified;

      // Check if referee has played (loaded credits into any game account)
      const hasLoadedGame = allTxs.some(
        (t) => t.customerId === ru.id && (t.type === 'adjustment' || t.type === 'bonus') && !!t.targetGameName && t.status === 'completed'
      );

      const hasEarnedReward = allTxs.some(
        (t) => t.customerId === userId && t.type === 'referral_reward' && t.description.includes(ru.displayName)
      );

      // Referral bonus is qualified ONLY if referee's email is verified AND referee has played (loaded game credits)
      const isQualified = isEmailVerified && hasLoadedGame;
      const status: 'registered' | 'qualified' | 'rewarded' = hasEarnedReward ? 'rewarded' : isQualified ? 'qualified' : 'registered';

      return {
        id: ru.id,
        displayName: ru.displayName,
        joinedAt: ru.createdAt,
        status,
        depositTotal: deposits,
        rewardEarned: hasEarnedReward ? config.referralProgram.rewardPerReferral : 0,
        emailVerified: isEmailVerified,
        hasLoadedGame,
      };
    });

    const totalRewardsEarned = referredSummaryUsers.reduce((sum, u) => sum + u.rewardEarned, 0);
    const pendingRewards = referredSummaryUsers.filter((u) => u.status === 'qualified').length * config.referralProgram.rewardPerReferral;

    return {
      referralCode,
      referralLink,
      totalReferred: referredUsersList.length,
      activeReferred: referredSummaryUsers.filter((u) => u.depositTotal > 0).length,
      totalRewardsEarned,
      pendingRewards,
      rewardPerReferral: config.referralProgram.rewardPerReferral,
      qualifyingDepositMin: config.referralProgram.qualificationDepositMin,
      referredUsers: referredSummaryUsers,
    };
  }

  public checkAndAwardReferral(customerId: string, newDepositAmount: number = 0): void {
    const customer = this.getUserById(customerId);
    if (!customer || !customer.referredBy) return;

    const config = this.getAppConfig();
    if (!config.referralProgram.enabled) return;

    const allUsers = this.getUsers();
    const referrer = allUsers.find((u) => u.referralCode.toUpperCase() === customer.referredBy?.toUpperCase());
    if (!referrer || referrer.id === customer.id) return; // Prevent self-referral

    // CRITICAL REQUIREMENT 1: Referee email must be verified
    const isEmailVerified = customer.emailVerified === true || (auth.currentUser?.uid === customer.id && auth.currentUser.emailVerified);
    if (!isEmailVerified) {
      console.log(`[Referral Engine] Referral reward for referee ${customer.displayName} withheld: email not verified.`);
      return;
    }

    // CRITICAL REQUIREMENT 2: Referee must have played (loaded credits into any game account)
    const txs = this.getTransactions(customerId);
    const hasLoadedGame = txs.some(
      (t) => (t.type === 'adjustment' || t.type === 'bonus') && !!t.targetGameName && t.status === 'completed'
    );
    if (!hasLoadedGame) {
      console.log(`[Referral Engine] Referral reward for referee ${customer.displayName} withheld: player has not loaded game credits.`);
      return;
    }

    // Check if reward already paid to referrer for this specific customer
    const referrerTxs = this.getTransactions(referrer.id);
    const alreadyAwarded = referrerTxs.some(
      (t) => t.type === 'referral_reward' && t.description.includes(customer.displayName)
    );

    if (!alreadyAwarded) {
      const reward = config.referralProgram.rewardPerReferral;
      const refWallet = this.getWallet(referrer.id);
      refWallet.referralBonusBalance = (refWallet.referralBonusBalance || 0) + reward;
      refWallet.lastUpdatedAt = new Date().toISOString();

      const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
      wallets[referrer.id] = refWallet;
      this.save(STORAGE_KEYS.WALLETS, wallets);

      this.recordTransaction({
        customerId: referrer.id,
        type: 'referral_reward',
        amount: reward,
        fee: 0,
        netAmount: reward,
        currency: config.currency,
        balanceAfter: refWallet.availableBalance,
        description: `Referral Bonus Credit: ${customer.displayName} verified email and loaded game account`,
        idempotencyKey: `idemp_ref_${referrer.id}_${customer.id}`,
        status: 'completed',
      });

      this.createNotification({
        userId: referrer.id,
        title: 'Referral Reward Credited',
        message: `Congratulations! You received a $${reward.toFixed(2)} referral reward because ${customer.displayName} verified their email and loaded game credits.`,
        type: 'referral',
        linkTab: 'referrals',
      });

      this.logAudit({
        actorId: 'system',
        actorName: 'Referral Engine',
        actorRole: 'admin',
        action: 'REFERRAL_REWARD_ISSUED',
        entityType: 'wallet',
        entityId: referrer.id,
        details: `Credited $${reward} to ${referrer.displayName} for referee ${customer.displayName} (email verified & game loaded).`,
      });
    }
  }

  // App Settings & Configuration
  public getAppConfig(): AppConfig {
    const cfg = this.load<AppConfig>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
    let dirty = false;
    if (!cfg.gatewaySimulator) {
      cfg.gatewaySimulator = INITIAL_CONFIG.gatewaySimulator;
      dirty = true;
    }
    if (!cfg.cashoutFeed) {
      cfg.cashoutFeed = INITIAL_CONFIG.cashoutFeed;
      dirty = true;
    }
    if (dirty) {
      this.save(STORAGE_KEYS.CONFIG, cfg);
    }
    return cfg;
  }

  public updateAppConfig(newConfig: AppConfig, actorId: string, actorName: string): void {
    this.save(STORAGE_KEYS.CONFIG, newConfig);
    this.logAudit({
      actorId,
      actorName,
      actorRole: 'admin',
      action: 'APP_CONFIG_UPDATED',
      entityType: 'settings',
      entityId: 'global_config',
      details: 'Updated payment methods, bonus rules, or terms.',
    });
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const list = this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    list.unshift({
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    });
    this.save(STORAGE_KEYS.AUDIT_LOGS, list);
  }

  private recordTransaction(tx: Omit<WalletTransaction, 'id' | 'createdAt'>): void {
    const all = this.load<WalletTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const newTx: WalletTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newTx);
    this.save(STORAGE_KEYS.TRANSACTIONS, all);
  }

  // Gateway Simulator & Automated Webhook Notifications
  public getWebhookLogs(): WebhookLog[] {
    return this.load<WebhookLog[]>(STORAGE_KEYS.WEBHOOK_LOGS, []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public recordWebhookLog(log: Omit<WebhookLog, 'id' | 'timestamp'>): WebhookLog {
    const list = this.getWebhookLogs();
    const newLog: WebhookLog = {
      ...log,
      id: `whk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newLog);
    if (list.length > 50) list.pop(); // Keep recent 50 logs
    this.save(STORAGE_KEYS.WEBHOOK_LOGS, list);
    return newLog;
  }

  public clearWebhookLogs(): void {
    this.save(STORAGE_KEYS.WEBHOOK_LOGS, []);
  }

  public triggerAutomatedWebhookSimulation(params: {
    gateway: string;
    eventType: 'payment.succeeded' | 'payment.failed' | 'payout.settled' | 'crypto.confirmations_reached';
    amount: number;
    customerId: string;
    customerName: string;
    requestId?: string;
  }): WebhookLog {
    const cfg = this.getAppConfig();
    const isSuccess = Math.random() * 100 >= (cfg.gatewaySimulator.failureRatePercentage || 0);

    const payload = {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: params.eventType,
      gateway: params.gateway,
      created_at: new Date().toISOString(),
      data: {
        customer_id: params.customerId,
        customer_name: params.customerName,
        amount: params.amount,
        currency: cfg.currency,
        reference_id: params.requestId || `GW_SIM_${Date.now().toString(36).toUpperCase()}`,
        status: isSuccess ? 'succeeded' : 'failed',
      },
    };

    return this.recordWebhookLog({
      gateway: params.gateway,
      eventType: params.eventType,
      payload,
      status: isSuccess ? 'delivered' : 'failed',
      responseStatus: isSuccess ? 200 : 500,
    });
  }

  // Real-Time Mixed Cashouts Feed (Real + Admin-Configured Fake Pool)
  public getFakedCashouts(): CashoutFeedItem[] {
    return this.load<CashoutFeedItem[]>(STORAGE_KEYS.FAKED_CASHOUTS, []);
  }

  public saveFakedCashouts(items: CashoutFeedItem[]): void {
    this.save(STORAGE_KEYS.FAKED_CASHOUTS, items);
  }

  public getMixedCashoutFeed(limit: number = 20): CashoutFeedItem[] {
    const cfg = this.getAppConfig();
    if (!cfg.cashoutFeed.enabled) return [];

    // 1. Gather Real Cashouts (from completed or processing withdrawals)
    const realWithdrawals = this.getWithdrawalRequests();
    const realItems: CashoutFeedItem[] = realWithdrawals
      .filter((w) => w.status === 'completed' || w.status === 'processing')
      .map((w) => ({
        id: `real_${w.id}`,
        customerName: w.customerName,
        amount: w.amount,
        currency: w.currency,
        methodName: w.methodName || 'Bank Transfer',
        gameName: 'Platform Vault',
        isFake: false,
        timestamp: w.createdAt,
      }));

    // 2. Load stored faked cashouts or generate initial seed batch
    let fakeItems = this.getFakedCashouts();
    if (fakeItems.length === 0) {
      fakeItems = this.generateInitialFakeCashouts(cfg);
      this.saveFakedCashouts(fakeItems);
    }

    // 3. Merge both sets and sort by most recent timestamp
    const combined = [...realItems, ...fakeItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return combined.slice(0, limit);
  }

  public generateInitialFakeCashouts(cfg: AppConfig): CashoutFeedItem[] {
    const pool = cfg.cashoutFeed?.namesPool?.length ? cfg.cashoutFeed.namesPool : ['Marcus_V', 'Elena_R', 'Tyler_K', 'LuckyHunter', 'ApexPro', 'Chloe_B'];
    const methods = ['Verified CashApp', 'Chime Direct', 'Crypto USDT', 'Payment via Link', 'Crypto BTC'];
    const games = ['Orion Stars Elite', 'Fire Kirin Ultra', 'Game Vault 999', 'Panda Master Pro', 'Apex Championship Arena'];
    const probableAmounts = cfg.cashoutFeed?.probableAmounts?.length
      ? cfg.cashoutFeed.probableAmounts
      : [50, 75, 100, 120, 140, 150, 180, 200, 220, 250];

    const items: CashoutFeedItem[] = [];
    const now = Date.now();
    const count = 18;

    for (let i = 0; i < count; i++) {
      const name = pool[i % pool.length];
      // Pick from probable amounts or clamp between minAmount ($50) and maxAmount ($250)
      const min = cfg.cashoutFeed?.minAmount || 50;
      const max = cfg.cashoutFeed?.maxAmount || 250;
      const candidateAmt = probableAmounts[i % probableAmounts.length];
      const finalAmt = Math.min(max, Math.max(min, candidateAmt));

      const method = methods[i % methods.length];
      const game = games[i % games.length];
      // Start from 2 hours ago (120 minutes) staggered down to 2 minutes ago
      // (count - i) spreads out across ~120 minutes
      const minutesAgo = Math.floor(((i + 1) / (count + 1)) * 120) + Math.floor(Math.random() * 4);
      const timestamp = new Date(now - minutesAgo * 60 * 1000).toISOString();

      items.push({
        id: `fake_${now}_${i}`,
        customerName: name,
        amount: finalAmt,
        currency: cfg.currency || 'USD',
        methodName: method,
        gameName: game,
        isFake: true,
        timestamp,
      });
    }

    return items;
  }

  public injectNewFakeCashout(): CashoutFeedItem | null {
    const cfg = this.getAppConfig();
    if (!cfg.cashoutFeed?.enabled) return null;

    const pool = cfg.cashoutFeed.namesPool?.length ? cfg.cashoutFeed.namesPool : ['Player_' + Math.floor(Math.random() * 1000)];
    const randomName = pool[Math.floor(Math.random() * pool.length)];
    const min = cfg.cashoutFeed.minAmount || 50;
    const max = cfg.cashoutFeed.maxAmount || 250;
    const probableAmounts = cfg.cashoutFeed.probableAmounts?.length
      ? cfg.cashoutFeed.probableAmounts
      : [50, 75, 100, 120, 140, 150, 180, 200, 220, 250];

    const pickedAmt = probableAmounts[Math.floor(Math.random() * probableAmounts.length)];
    const amount = Math.min(max, Math.max(min, pickedAmt));

    const methods = ['Verified CashApp', 'Chime Direct', 'Crypto USDT', 'Payment via Link', 'Crypto BTC'];
    const games = ['Orion Stars Elite', 'Fire Kirin Ultra', 'Game Vault 999', 'Panda Master Pro', 'Apex Championship Arena'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const game = games[Math.floor(Math.random() * games.length)];

    const newItem: CashoutFeedItem = {
      id: `fake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerName: randomName,
      amount,
      currency: cfg.currency || 'USD',
      methodName: method,
      gameName: game,
      isFake: true,
      timestamp: new Date().toISOString(), // Realtime mixed in
    };

    const currentFakes = this.getFakedCashouts();
    currentFakes.unshift(newItem);
    if (currentFakes.length > 40) currentFakes.pop();
    this.saveFakedCashouts(currentFakes);

    return newItem;
  }

  // Load funds into game account from wallet cash balance OR promotional referral balance
  public loadFundsToGame(params: {
    customerId: string;
    customerName: string;
    gameCatalogId: string;
    amount: number;
    fundingSource: 'wallet_cash' | 'referral_bonus';
  }): { success: boolean; message: string; gameAccount?: GameAccount } {
    if (params.amount <= 0) {
      return { success: false, message: 'Amount must be greater than zero.' };
    }

    const accounts = this.getGameAccounts(params.customerId);
    const targetAccount = accounts.find((a) => a.gameCatalogId === params.gameCatalogId);
    if (!targetAccount) {
      return { success: false, message: 'No game credentials found for this game. Please request Game credentials first.' };
    }

    const wallet = this.getWallet(params.customerId);

    if (params.fundingSource === 'referral_bonus') {
      if ((wallet.referralBonusBalance || 0) < params.amount) {
        return {
          success: false,
          message: `Insufficient referral bonus funds ($${(wallet.referralBonusBalance || 0).toFixed(2)}).`,
        };
      }

      // Deduct from non-withdrawable promotional referral balance
      wallet.referralBonusBalance -= params.amount;
      wallet.lastUpdatedAt = new Date().toISOString();
      const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
      wallets[params.customerId] = wallet;
      this.save(STORAGE_KEYS.WALLETS, wallets);

      // Credit directly into game account
      targetAccount.balance = (targetAccount.balance || 0) + params.amount;
      targetAccount.updatedAt = new Date().toISOString();
      const allAccounts = this.getGameAccounts();
      const idx = allAccounts.findIndex((a) => a.id === targetAccount.id);
      if (idx !== -1) {
        allAccounts[idx] = targetAccount;
        this.save(STORAGE_KEYS.GAME_ACCOUNTS, allAccounts);
      }

      // Record transaction
      this.recordTransaction({
        customerId: params.customerId,
        type: 'bonus',
        amount: params.amount,
        fee: 0,
        netAmount: params.amount,
        currency: wallet.currency,
        balanceAfter: wallet.availableBalance,
        targetGameName: targetAccount.gameName,
        targetGameUsername: targetAccount.username,
        description: `Referral Bonus Loaded to ${targetAccount.gameName} (User: ${targetAccount.username})`,
        idempotencyKey: `idemp_load_ref_${Date.now()}`,
        status: 'completed',
      });

      this.createNotification({
        userId: params.customerId,
        title: 'Referral Bonus Transferred to Game',
        message: `$${params.amount.toFixed(2)} referral reward loaded to ${targetAccount.gameName} account. Game balance: $${targetAccount.balance.toFixed(2)}`,
        type: 'game_account',
        linkTab: 'game_accounts',
      });

      this.logAudit({
        actorId: params.customerId,
        actorName: params.customerName,
        actorRole: 'customer',
        action: 'REFERRAL_LOADED_TO_GAME',
        entityType: 'game_account',
        entityId: targetAccount.id,
        details: `Loaded $${params.amount} non-cashable referral bonus directly into ${targetAccount.gameName}.`,
      });

      // Trigger referral qualification check if player was referred
      this.checkAndAwardReferral(params.customerId, params.amount);

      return {
        success: true,
        message: `Successfully loaded $${params.amount.toFixed(2)} from referral bonus to ${targetAccount.gameName}!`,
        gameAccount: targetAccount,
      };
    } else {
      // From standard wallet available cash
      if (wallet.availableBalance < params.amount) {
        return {
          success: false,
          message: `Insufficient wallet cash balance ($${wallet.availableBalance.toFixed(2)}).`,
        };
      }

      wallet.availableBalance -= params.amount;
      wallet.lastUpdatedAt = new Date().toISOString();
      const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
      wallets[params.customerId] = wallet;
      this.save(STORAGE_KEYS.WALLETS, wallets);

      targetAccount.balance = (targetAccount.balance || 0) + params.amount;
      targetAccount.updatedAt = new Date().toISOString();
      const allAccounts = this.getGameAccounts();
      const idx = allAccounts.findIndex((a) => a.id === targetAccount.id);
      if (idx !== -1) {
        allAccounts[idx] = targetAccount;
        this.save(STORAGE_KEYS.GAME_ACCOUNTS, allAccounts);
      }

      this.recordTransaction({
        customerId: params.customerId,
        type: 'adjustment',
        amount: params.amount,
        fee: 0,
        netAmount: params.amount,
        currency: wallet.currency,
        balanceAfter: wallet.availableBalance,
        targetGameName: targetAccount.gameName,
        targetGameUsername: targetAccount.username,
        description: `Wallet Balance Loaded to ${targetAccount.gameName} (User: ${targetAccount.username})`,
        idempotencyKey: `idemp_load_cash_${Date.now()}`,
        status: 'completed',
      });

      this.createNotification({
        userId: params.customerId,
        title: 'Game Loaded from Wallet',
        message: `$${params.amount.toFixed(2)} transferred to ${targetAccount.gameName}. Game balance: $${targetAccount.balance.toFixed(2)}`,
        type: 'game_account',
        linkTab: 'game_accounts',
      });

      // Trigger referral qualification check if player was referred and now satisfies playing milestone
      this.checkAndAwardReferral(params.customerId, params.amount);

      return {
        success: true,
        message: `Successfully loaded $${params.amount.toFixed(2)} from wallet to ${targetAccount.gameName}!`,
        gameAccount: targetAccount,
      };
    }
  }
}

export const dataService = new DataService();
