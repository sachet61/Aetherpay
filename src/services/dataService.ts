import {
  UserProfile,
  UserWallet,
  WalletTransaction,
  TopUpRequest,
  WithdrawalRequest,
  GameCatalogItem,
  GameAccount,
  GameAccountStatus,
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
import { resolveGameImageUrl } from '../utils/imageUtils';
import { authSessionService, PREDEFINED_ADMINS } from './authSessionService';
import { supabase, isSupabaseConfigured, testSupabaseConnection } from './supabaseClient';
import { supabaseAuthService } from './supabaseAuthService';
import { webPushClient } from './webPushClient';

export type RealtimeSyncStatus = 'connected' | 'syncing' | 'sleeping' | 'disconnected' | 'reconnecting';

export interface SyncHealthInfo {
  status: RealtimeSyncStatus;
  lastSyncAt: string | null;
  egressReductionActive: boolean;
  dormantPaused: boolean;
}

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
  FAKED_CASHOUTS: 'aetherpay_faked_cashouts',
  PASSWORD_RESET_TOKENS: 'aetherpay_password_reset_tokens',
  WEBHOOK_LOGS: 'aetherpay_webhook_logs',
  CURRENT_USER_ID: 'aetherpay_current_user_id',
};

class DataService {
  private isDemoMode = false;
  private cache: Record<string, any> = {
    [STORAGE_KEYS.USERS]: [],
    [STORAGE_KEYS.WALLETS]: {},
    [STORAGE_KEYS.TRANSACTIONS]: [],
    [STORAGE_KEYS.TOPUPS]: [],
    [STORAGE_KEYS.WITHDRAWALS]: [],
    [STORAGE_KEYS.GAME_CATALOG]: [...INITIAL_GAME_CATALOG],
    [STORAGE_KEYS.GAME_ACCOUNTS]: [],
    [STORAGE_KEYS.CONVERSATIONS]: [],
    [STORAGE_KEYS.MESSAGES]: {},
    [STORAGE_KEYS.NOTIFICATIONS]: [],
    [STORAGE_KEYS.AUDIT_LOGS]: [],
    [STORAGE_KEYS.CONFIG]: { ...INITIAL_CONFIG },
    [STORAGE_KEYS.FAKED_CASHOUTS]: [],
    [STORAGE_KEYS.PASSWORD_RESET_TOKENS]: [],
  };
  private currentUserId: string | null = null;
  private isQuotaExceeded = false;
  private pollingIntervals: number[] = [];
  private isSeeding = false;
  private lastPolledMessageTime: string | null = null;
  private syncStatus: RealtimeSyncStatus = 'disconnected';
  private lastSyncTimestamp: string | null = null;
  private realtimeChannel: any = null;
  private mutationQueue: Array<{ table: string; eventType: string; newRow: any; oldRow: any }> = [];
  private mutationDebounceTimer: number | null = null;
  private isVisibilityListenerAttached = false;
  private isSyncingDelta = false;
  private conversationAliasMap: Map<string, string> = new Map();

  constructor() {
    this.cleanLegacyStorage();
    this.loadFromLocalStorage();
    // Enforce invariant: Strictly 1 Game ID per game platform per user
    const initialAccounts = this.cache[STORAGE_KEYS.GAME_ACCOUNTS] as GameAccount[];
    if (Array.isArray(initialAccounts) && initialAccounts.length > 0) {
      const clean = this.deduplicateGameAccounts(initialAccounts);
      this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = clean;
      this.saveToLocalStorage(STORAGE_KEYS.GAME_ACCOUNTS, clean);
    }
    // Enforce invariant: Strictly 1 persistent conversation per customer across all agents & admins
    const initialConvs = this.cache[STORAGE_KEYS.CONVERSATIONS] as SupportConversation[];
    if (Array.isArray(initialConvs) && initialConvs.length > 0) {
      const cleanConvs = this.deduplicateAndMergeConversations(initialConvs);
      this.cache[STORAGE_KEYS.CONVERSATIONS] = cleanConvs;
      this.saveToLocalStorage(STORAGE_KEYS.CONVERSATIONS, cleanConvs);
    }
    this.attachVisibilityListener();
    this.initPersistence();
  }

  private cleanLegacyStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Invariant: Users directory is NEVER cached to browser localStorage
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem('aetherpay_users');

      const CLEAN_FLAG = 'swift_sweeps_prod_clean_v6';
      if (!localStorage.getItem(CLEAN_FLAG)) {
        console.log('[SwiftSweeps] Performing clean-slate migration: clearing legacy storage...');
        const keysToClean = [
          'aetherpay_users',
          'aetherpay_wallets',
          'aetherpay_transactions',
          'aetherpay_topups',
          'aetherpay_withdrawals',
          'aetherpay_game_accounts',
          'aetherpay_conversations',
          'aetherpay_messages',
          'aetherpay_notifications',
          'aetherpay_audit_logs',
          'aetherpay_faked_cashouts',
          'aetherpay_webhook_logs',
          'aetherpay_mock_users',
          'aetherpay_user_credentials',
        ];
        for (const k of keysToClean) {
          localStorage.removeItem(k);
        }
        localStorage.setItem(CLEAN_FLAG, 'true');
      }

      // Purge legacy staff conversations from browser cache (e.g. haudemaxe@gmail.com)
      const STAFF_CONV_CLEAN_FLAG = 'swift_sweeps_staff_conv_clean_v1';
      if (!localStorage.getItem(STAFF_CONV_CLEAN_FLAG)) {
        try {
          const rawConvs = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
          if (rawConvs) {
            const parsed = JSON.parse(rawConvs);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((c: any) => {
                const email = (c.customerEmail || '').toLowerCase();
                return email !== 'haudemaxe@gmail.com' && email !== 'sachet61@gmail.com';
              });
              localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(cleaned));
            }
          }
        } catch {}
        localStorage.setItem(STAFF_CONV_CLEAN_FLAG, 'true');
      }

      // Purge any legacy automated bot greetings from cached messages and greeting flags
      const BOT_GREETINGS_PURGE_FLAG = 'swift_sweeps_bot_greeting_purged_v2';
      if (!localStorage.getItem(BOT_GREETINGS_PURGE_FLAG)) {
        try {
          const rawMsgs = localStorage.getItem(STORAGE_KEYS.MESSAGES);
          if (rawMsgs) {
            const parsed = JSON.parse(rawMsgs);
            if (parsed && typeof parsed === 'object') {
              for (const [convId, msgList] of Object.entries(parsed)) {
                if (Array.isArray(msgList)) {
                  parsed[convId] = msgList.filter((m: any) => {
                    const text = (m?.text || '').toLowerCase();
                    const isBotGreeting =
                      text.includes('welcome to swift sweeps support') ||
                      text.includes('treasury and gaming care specialists assist you today') ||
                      (m?.senderName === 'Sarah Lin' && text.includes('welcome'));
                    return !isBotGreeting;
                  });
                }
              }
              localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(parsed));
            }
          }
          // Remove all greeting flags
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('swiftsweeps_greeting_sent_')) {
              keysToRemove.push(k);
            }
          }
          for (const k of keysToRemove) {
            localStorage.removeItem(k);
          }
        } catch {}
        localStorage.setItem(BOT_GREETINGS_PURGE_FLAG, 'true');
      }
    } catch (e) {
      console.warn('Storage wipe notice:', e);
    }
  }

  private loadFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        // Invariant: NEVER load user records from localStorage
        if (key === STORAGE_KEYS.USERS) continue;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            this.cache[key] = JSON.parse(stored);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage load notice:', e);
    }
  }

  private saveToLocalStorage(key: string, value: any): void {
    if (typeof localStorage === 'undefined') return;
    // Invariant: NEVER persist user directory records into browser localStorage
    if (key === STORAGE_KEYS.USERS) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Ignore quota errors on local storage
    }
  }

  public getSyncHealth(): SyncHealthInfo {
    return {
      status: this.syncStatus,
      lastSyncAt: this.lastSyncTimestamp,
      egressReductionActive: true,
      dormantPaused: this.syncStatus === 'sleeping',
    };
  }

  private attachVisibilityListener(): void {
    if (typeof document === 'undefined' || this.isVisibilityListenerAttached) return;
    this.isVisibilityListenerAttached = true;
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
  }

  private handleVisibilityChange(): void {
    if (typeof document === 'undefined') return;

    if (document.visibilityState === 'hidden') {
      console.log('[SwiftSweeps] Browser tab backgrounded. Suspending queries — 0 egress transmitted.');
      this.syncStatus = 'sleeping';
      this.lastSyncTimestamp = new Date().toISOString();
      window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
      return;
    }

    if (document.visibilityState === 'visible') {
      console.log('[SwiftSweeps] Browser tab active. Realtime WebSocket stream maintaining live state with 0 polling egress.');
      this.syncStatus = 'connected';
      window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));

      const now = Date.now();
      const lastSync = this.lastSyncTimestamp ? new Date(this.lastSyncTimestamp).getTime() : 0;
      const hoursDormant = (now - lastSync) / (1000 * 60 * 60);

      // Only run a compact refresh if the user returns after a dormant overnight session (>12 hours)
      if (!this.lastSyncTimestamp || hoursDormant > 12) {
        console.log('[SwiftSweeps] Tab dormant for >12h. Running targeted initial compact load.');
        this.initialCompactLoad();
      }
    }
  }

  private initPersistence(): void {
    if (isSupabaseConfigured() && supabase) {
      console.log('[SwiftSweeps] Supabase PostgreSQL mode active. Initializing Realtime stream.');
      this.initSupabaseRealtimeSync();
      this.initialCompactLoad();
    } else {
      console.log('[SwiftSweeps] Supabase credentials pending in .env. Running in in-memory mode with LocalStorage persistence.');
    }
  }

  private initSupabaseRealtimeSync(): void {
    if (!supabase || !isSupabaseConfigured()) return;
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {}
    }

    this.syncStatus = 'syncing';
    window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));

    const channel = supabase.channel('swiftsweeps_realtime_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p) => {
        this.queueRealtimeMutation('messages', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (p) => {
        this.queueRealtimeMutation('conversations', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topups' }, (p) => {
        this.queueRealtimeMutation('topups', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, (p) => {
        this.queueRealtimeMutation('withdrawals', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, (p) => {
        this.queueRealtimeMutation('wallets', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_accounts' }, (p) => {
        this.queueRealtimeMutation('game_accounts', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (p) => {
        this.queueRealtimeMutation('users', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faked_cashouts' }, (p) => {
        this.queueRealtimeMutation('faked_cashouts', p.eventType, p.new, p.old);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, (p) => {
        this.queueRealtimeMutation('app_config', p.eventType, p.new, p.old);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.syncStatus = 'connected';
          // Rely purely on Realtime events; do NOT burst REST sync queries upon subscription
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.syncStatus = 'reconnecting';
        }
        window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
      });

    this.realtimeChannel = channel;
  }

  private queueRealtimeMutation(table: string, eventType: string, newRow: any, oldRow: any): void {
    this.mutationQueue.push({ table, eventType, newRow, oldRow });
    if (this.mutationDebounceTimer !== null) {
      window.clearTimeout(this.mutationDebounceTimer);
    }
    this.mutationDebounceTimer = window.setTimeout(() => {
      this.flushRealtimeMutations();
    }, 300);
  }

  private flushRealtimeMutations(): void {
    if (this.mutationQueue.length === 0) return;
    const queued = [...this.mutationQueue];
    this.mutationQueue = [];
    this.mutationDebounceTimer = null;

    const tablesModified = new Set<string>();
    const rowsByTable: Record<string, any[]> = {};
    for (const item of queued) {
      if (!rowsByTable[item.table]) rowsByTable[item.table] = [];
      if (item.newRow && Object.keys(item.newRow).length > 0) {
        rowsByTable[item.table].push(item.newRow);
      }
    }

    if (rowsByTable['messages']?.length) {
      this.applyMessageRows(rowsByTable['messages']);
      tablesModified.add('messages');
    }
    if (rowsByTable['conversations']?.length) {
      this.applyConversationRows(rowsByTable['conversations'], false);
      tablesModified.add('conversations');
    }
    if (rowsByTable['topups']?.length) {
      this.applyTopupRows(rowsByTable['topups'], false);
      tablesModified.add('topups');
    }
    if (rowsByTable['withdrawals']?.length) {
      this.applyWithdrawalRows(rowsByTable['withdrawals'], false);
      tablesModified.add('withdrawals');
    }
    if (rowsByTable['wallets']?.length) {
      this.applyWalletRows(rowsByTable['wallets']);
      tablesModified.add('wallets');
    }
    if (rowsByTable['game_accounts']?.length) {
      this.applyGameAccountRows(rowsByTable['game_accounts'], false);
      tablesModified.add('game_accounts');
    }
    if (rowsByTable['users']?.length) {
      this.applyUserRows(rowsByTable['users']);
      tablesModified.add('users');
    }
    if (rowsByTable['faked_cashouts']?.length) {
      this.applyCashoutRows(rowsByTable['faked_cashouts'], false);
      tablesModified.add('faked_cashouts');
    }
    if (rowsByTable['app_config']?.length) {
      const latest = rowsByTable['app_config'][rowsByTable['app_config'].length - 1];
      if (latest?.data) {
        this.applyAppConfig(latest.data);
        tablesModified.add('app_config');
      }
    }

    if (tablesModified.size > 0) {
      window.dispatchEvent(
        new CustomEvent('aetherpay_state_changed', {
          detail: { key: 'realtime_batch', tables: Array.from(tablesModified) },
        })
      );
    }
    this.lastSyncTimestamp = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
  }

  public async initialCompactLoad(): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return;
    this.syncStatus = 'syncing';
    window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));

    try {
      const activeSession = authSessionService.getActiveSession();
      const user = this.getCurrentUser() || (activeSession ? {
        id: activeSession.userId,
        email: activeSession.email,
        displayName: activeSession.displayName,
        role: activeSession.role,
      } as any : null);
      const isAdmin = user?.role === 'admin' || user?.role === 'agent';
      const currentUserId = user?.id;

      // Always load app config (single row)
      const appConfigPromise = supabase.from('app_config').select('data').eq('id', 'main').maybeSingle();

      // Load public live ticker cashouts (limit 15)
      const cashoutsPromise = supabase.from('faked_cashouts').select('*').order('timestamp', { ascending: false }).limit(15);

      // Load game catalog if not in local cache
      let catPromise: Promise<any> = Promise.resolve({ data: null });
      if (!this.cache[STORAGE_KEYS.GAME_CATALOG] || (this.cache[STORAGE_KEYS.GAME_CATALOG] as any[]).length === 0) {
        catPromise = Promise.resolve(
          supabase.from('game_catalog').select('*').order('created_at', { ascending: true }).limit(30)
        );
      }

      if (isAdmin) {
        // Staff/Admin session: bounded administrative queue queries (Users fetched on-demand on tab open)
        const [appConfigRes, cashoutsRes, catRes, topupsRes, withdrawalsRes, walletsRes, convsRes, gameAccsRes] =
          await Promise.all([
            appConfigPromise,
            cashoutsPromise,
            catPromise,
            supabase.from('topups').select('*').order('created_at', { ascending: false }).limit(25),
            supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).limit(25),
            supabase.from('wallets').select('*').limit(50),
            supabase.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(25),
            supabase.from('game_accounts').select('*').order('created_at', { ascending: false }).limit(100),
          ]);

        if (appConfigRes?.data?.data) this.applyAppConfig(appConfigRes.data.data);
        if (cashoutsRes.data) this.applyCashoutRows(cashoutsRes.data, true);
        if (catRes?.data && catRes.data.length > 0) this.applyCatalogRows(catRes.data);
        if (topupsRes.data) this.applyTopupRows(topupsRes.data, true);
        if (withdrawalsRes.data) this.applyWithdrawalRows(withdrawalsRes.data, true);
        if (walletsRes.data) this.applyWalletRows(walletsRes.data);
        if (convsRes.data) this.applyConversationRows(convsRes.data, true);
        if (gameAccsRes?.data) this.applyGameAccountRows(gameAccsRes.data, false);
      } else if (currentUserId) {
        // Customer session: strictly scoped to CURRENT user only (no global table downloads)
        const [appConfigRes, cashoutsRes, catRes, userRes, walletRes, topupsRes, withdrawalsRes, gameAccsRes, convRes] =
          await Promise.all([
            appConfigPromise,
            cashoutsPromise,
            catPromise,
            supabase.from('users').select('*').eq('id', currentUserId).maybeSingle(),
            supabase.from('wallets').select('*').eq('customer_id', currentUserId).maybeSingle(),
            supabase.from('topups').select('*').eq('customer_id', currentUserId).order('created_at', { ascending: false }).limit(20),
            supabase.from('withdrawals').select('*').eq('customer_id', currentUserId).order('created_at', { ascending: false }).limit(20),
            supabase.from('game_accounts').select('*').eq('customer_id', currentUserId).limit(20),
            supabase.from('conversations').select('*').eq('customer_id', currentUserId).order('created_at', { ascending: true }),
          ]);

        if (appConfigRes?.data?.data) this.applyAppConfig(appConfigRes.data.data);
        if (cashoutsRes.data) this.applyCashoutRows(cashoutsRes.data, true);
        if (catRes?.data && catRes.data.length > 0) this.applyCatalogRows(catRes.data);
        if (userRes?.data) {
          const dbUser = userRes.data;
          const isConfirmed = Boolean(dbUser.email_verified);
          const users = this.getUsers();
          let local = users.find((u) => u.id === dbUser.id || u.email.toLowerCase() === dbUser.email?.toLowerCase());
          if (local) {
            local.emailVerified = isConfirmed;
            if (dbUser.display_name) local.displayName = dbUser.display_name;
            if (dbUser.role) local.role = dbUser.role;
            if (dbUser.phone) local.phone = dbUser.phone;
          } else {
            local = {
              id: dbUser.id,
              email: dbUser.email,
              displayName: dbUser.display_name || dbUser.email?.split('@')[0] || 'Player',
              role: dbUser.role || 'customer',
              phone: dbUser.phone,
              avatarUrl: dbUser.avatar_url,
              status: dbUser.status || 'active',
              emailVerified: isConfirmed,
              referralCode: dbUser.referral_code || `REF_${dbUser.id.slice(-5).toUpperCase()}`,
              referredBy: dbUser.referred_by,
              createdAt: dbUser.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            users.push(local);
          }
          this.cache[STORAGE_KEYS.USERS] = users;
          authSessionService.updateUserProfile(local);
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_profile_synced', user: local } }));
        }
        if (walletRes.data) this.applyWalletRows([walletRes.data]);
        if (topupsRes.data) this.applyTopupRows(topupsRes.data, true);
        if (withdrawalsRes.data) this.applyWithdrawalRows(withdrawalsRes.data, true);
        if (gameAccsRes.data) this.applyGameAccountRows(gameAccsRes.data, false);
        if (convRes?.data && convRes.data.length > 0) {
          this.applyConversationRows(convRes.data, false);
          // Hydrate customer's active chat messages capped at 40
          const convIds = convRes.data.map((c: any) => c.id);
          const activeConv = this.getOrCreateConversationForCustomer(currentUserId, user?.displayName || 'Player');
          const allTargetIds = Array.from(new Set([...convIds, activeConv.id, `conv_${currentUserId}`].filter(Boolean)));
          let msgQuery = supabase.from('messages').select('*');
          if (allTargetIds.length === 1) {
            msgQuery = msgQuery.eq('conversation_id', allTargetIds[0]);
          } else {
            msgQuery = msgQuery.in('conversation_id', allTargetIds);
          }
          const { data: msgData } = await msgQuery
            .order('created_at', { ascending: false })
            .limit(40);
          if (msgData) this.applyMessageRows(msgData);
        }
      } else {
        // Unauthenticated visitor: only public app config, catalog, and ticker
        const [appConfigRes, cashoutsRes, catRes] = await Promise.all([
          appConfigPromise,
          cashoutsPromise,
          catPromise,
        ]);
        if (appConfigRes?.data?.data) this.applyAppConfig(appConfigRes.data.data);
        if (cashoutsRes.data) this.applyCashoutRows(cashoutsRes.data, true);
        if (catRes?.data && catRes.data.length > 0) this.applyCatalogRows(catRes.data);
      }

      this.lastSyncTimestamp = new Date().toISOString();
      this.syncStatus = 'connected';
      window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'initial_compact_load' } }));
      window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
    } catch (e) {
      console.warn('Initial compact load notice:', e);
      this.syncStatus = 'connected';
      window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
    }
  }

  public async syncDelta(): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return;
    if (this.isSyncingDelta) return;
    this.isSyncingDelta = true;
    this.syncStatus = 'syncing';
    window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));

    try {
      const user = this.getCurrentUser();
      const isAdmin = user?.role === 'admin' || user?.role === 'agent';
      const currentUserId = user?.id;

      let changed = false;

      if (!isAdmin && currentUserId) {
        // Customer: only refresh user's own wallet and recent requests
        const [walletRes, topupsRes, withdrawalsRes] = await Promise.all([
          supabase.from('wallets').select('*').eq('customer_id', currentUserId).maybeSingle(),
          supabase.from('topups').select('*').eq('customer_id', currentUserId).order('created_at', { ascending: false }).limit(10),
          supabase.from('withdrawals').select('*').eq('customer_id', currentUserId).order('created_at', { ascending: false }).limit(10),
        ]);

        if (walletRes.data) {
          this.applyWalletRows([walletRes.data]);
          changed = true;
        }
        if (topupsRes.data && topupsRes.data.length > 0) {
          this.applyTopupRows(topupsRes.data, false);
          changed = true;
        }
        if (withdrawalsRes.data && withdrawalsRes.data.length > 0) {
          this.applyWithdrawalRows(withdrawalsRes.data, false);
          changed = true;
        }
      } else if (isAdmin) {
        // Admin: refresh recent topups and withdrawals queue
        const [topupsRes, withdrawalsRes] = await Promise.all([
          supabase.from('topups').select('*').order('created_at', { ascending: false }).limit(15),
          supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).limit(15),
        ]);

        if (topupsRes.data && topupsRes.data.length > 0) {
          this.applyTopupRows(topupsRes.data, false);
          changed = true;
        }
        if (withdrawalsRes.data && withdrawalsRes.data.length > 0) {
          this.applyWithdrawalRows(withdrawalsRes.data, false);
          changed = true;
        }
      }

      this.lastSyncTimestamp = new Date().toISOString();
      this.syncStatus = 'connected';
      if (changed) {
        window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'delta_sync' } }));
      }
      window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
    } catch (e) {
      console.warn('Delta sync notice:', e);
      this.syncStatus = 'connected';
      window.dispatchEvent(new CustomEvent('aetherpay_sync_state_changed', { detail: this.getSyncHealth() }));
    } finally {
      this.isSyncingDelta = false;
    }
  }

  // Backward compatible on-demand poll methods (now route to targeted delta sync)
  public async pollSupabaseChat(): Promise<void> {
    return this.syncDelta();
  }

  public async pollSupabaseGeneral(): Promise<void> {
    return this.syncDelta();
  }

  // Conversation-specific direct fetch for 100% reliable message hydration with query capping
  public async fetchMessagesForConversation(
    conversationId: string,
    options?: { beforeCreatedAt?: string; limit?: number }
  ): Promise<ChatMessage[]> {
    if (!conversationId) return [];
    const targetConvId = this.resolveCanonicalConvId(conversationId);
    const localMsgs = this.getMessages(targetConvId);

    if (!supabase || !isSupabaseConfigured()) {
      return localMsgs;
    }

    try {
      const limit = options?.limit || 50;

      // Identify all related conversation IDs for this customer to retrieve complete thread history
      const candidateIds = new Set<string>([conversationId, targetConvId].filter(Boolean));
      const conv = this.getConversations().find((c) => c.id === conversationId || c.id === targetConvId);
      const customerId = conv?.customerId || (conversationId.startsWith('conv_') ? conversationId.replace('conv_', '') : undefined);
      if (customerId) {
        candidateIds.add(`conv_${customerId}`);
        for (const c of this.getConversations()) {
          if (c.customerId === customerId) {
            candidateIds.add(c.id);
          }
        }
        try {
          const { data: dbConvs } = await supabase
            .from('conversations')
            .select('id')
            .eq('customer_id', customerId)
            .limit(10);
          if (dbConvs && dbConvs.length > 0) {
            for (const row of dbConvs) {
              candidateIds.add(row.id);
            }
          }
        } catch {}
      }
      const queryIds = Array.from(candidateIds);

      let query = supabase
        .from('messages')
        .select('*');

      if (queryIds.length === 1) {
        query = query.eq('conversation_id', queryIds[0]);
      } else {
        query = query.in('conversation_id', queryIds);
      }

      if (options?.beforeCreatedAt) {
        query = query.lt('created_at', options.beforeCreatedAt);
      }

      // Order descending to fetch the newest records up to limit, capped strictly to prevent high egress
      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data, error } = await query;

      if (error) {
        console.warn('fetchMessagesForConversation notice:', error);
        return localMsgs;
      }

      if (data && data.length > 0) {
        const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
        const msgMap = new Map<string, ChatMessage>();

        for (const cid of queryIds) {
          const currentList = all[cid] || [];
          for (const m of currentList) {
            msgMap.set(m.id, m);
          }
        }

        for (const row of data) {
          const item: ChatMessage = {
            id: row.id,
            conversationId: targetConvId,
            senderId: row.sender_id,
            senderName: row.sender_name,
            senderRole: row.sender_role || 'customer',
            text: row.content || '',
            attachmentUrl: row.attachment_url,
            attachmentName: row.attachment_name,
            isInternalNote: false,
            transactionData: row.transaction_data || undefined,
            createdAt: row.created_at || new Date().toISOString(),
            isRead: true,
          };
          msgMap.set(item.id, item);
        }

        const sorted = Array.from(msgMap.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Unconditionally filter out automated greetings and canned bot messages
        const merged = sorted.filter((m) => {
          if (!m.text) return true;
          const text = m.text.toLowerCase();
          const isBotGreeting =
            text.includes('welcome to swift sweeps support') ||
            text.includes('treasury and gaming care specialists assist you today') ||
            (m.senderName === 'Sarah Lin' && text.includes('welcome'));
          return !isBotGreeting;
        });

        for (const cid of queryIds) {
          all[cid] = merged;
        }
        all[targetConvId] = merged;
        all[conversationId] = merged;

        this.cache[STORAGE_KEYS.MESSAGES] = all;
        this.saveToLocalStorage(STORAGE_KEYS.MESSAGES, all);
        window.dispatchEvent(
          new CustomEvent('aetherpay_state_changed', {
            detail: { key: 'conversation_messages_fetched', conversationId: targetConvId, count: merged.length },
          })
        );
        return merged;
      }
    } catch (e) {
      console.warn('fetchMessagesForConversation exception:', e);
    }

    return localMsgs;
  }

  // On-demand pagination for older messages
  public async fetchOlderMessages(
    conversationId: string,
    beforeCreatedAt: string,
    limit: number = 50
  ): Promise<{ newCount: number; hasMore: boolean }> {
    if (!supabase || !isSupabaseConfigured() || !conversationId || !beforeCreatedAt) {
      return { newCount: 0, hasMore: false };
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', beforeCreatedAt)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        console.warn('fetchOlderMessages notice:', error);
        return { newCount: 0, hasMore: false };
      }

      if (data.length > 0) {
        const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
        const currentList = all[conversationId] || [];
        const msgMap = new Map<string, ChatMessage>();

        for (const m of currentList) {
          msgMap.set(m.id, m);
        }

        for (const row of data) {
          const item: ChatMessage = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            senderRole: row.sender_role || 'customer',
            text: row.content || '',
            attachmentUrl: row.attachment_url,
            attachmentName: row.attachment_name,
            isInternalNote: false,
            transactionData: row.transaction_data || undefined,
            createdAt: row.created_at || new Date().toISOString(),
            isRead: true,
          };
          msgMap.set(item.id, item);
        }

        const merged = Array.from(msgMap.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        all[conversationId] = merged;
        this.cache[STORAGE_KEYS.MESSAGES] = all;
        this.saveToLocalStorage(STORAGE_KEYS.MESSAGES, all);
        window.dispatchEvent(
          new CustomEvent('aetherpay_state_changed', {
            detail: { key: 'conversation_messages_fetched', conversationId, count: data.length },
          })
        );
      }

      return { newCount: data.length, hasMore: data.length === limit };
    } catch (e) {
      console.warn('fetchOlderMessages exception:', e);
      return { newCount: 0, hasMore: false };
    }
  }

  // On-demand pagination for older topups
  public async fetchOlderTopups(options?: {
    beforeCreatedAt?: string;
    customerId?: string;
    limit?: number;
  }): Promise<{ newCount: number; hasMore: boolean }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { newCount: 0, hasMore: false };
    }
    const limit = options?.limit || 25;
    try {
      let query = supabase
        .from('topups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.beforeCreatedAt) {
        query = query.lt('created_at', options.beforeCreatedAt);
      }
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.warn('fetchOlderTopups notice:', error);
        return { newCount: 0, hasMore: false };
      }

      if (data.length > 0) {
        this.applyTopupRows(data, false);
        window.dispatchEvent(
          new CustomEvent('aetherpay_state_changed', {
            detail: { key: 'topups_fetched', count: data.length },
          })
        );
      }
      return { newCount: data.length, hasMore: data.length === limit };
    } catch (e) {
      console.warn('fetchOlderTopups exception:', e);
      return { newCount: 0, hasMore: false };
    }
  }

  // On-demand pagination for older withdrawals
  public async fetchOlderWithdrawals(options?: {
    beforeCreatedAt?: string;
    customerId?: string;
    limit?: number;
  }): Promise<{ newCount: number; hasMore: boolean }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { newCount: 0, hasMore: false };
    }
    const limit = options?.limit || 25;
    try {
      let query = supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.beforeCreatedAt) {
        query = query.lt('created_at', options.beforeCreatedAt);
      }
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.warn('fetchOlderWithdrawals notice:', error);
        return { newCount: 0, hasMore: false };
      }

      if (data.length > 0) {
        this.applyWithdrawalRows(data, false);
        window.dispatchEvent(
          new CustomEvent('aetherpay_state_changed', {
            detail: { key: 'withdrawals_fetched', count: data.length },
          })
        );
      }
      return { newCount: data.length, hasMore: data.length === limit };
    } catch (e) {
      console.warn('fetchOlderWithdrawals exception:', e);
      return { newCount: 0, hasMore: false };
    }
  }

  // Row application helpers supporting soft-delete tracking
  private applyUserRows(rows: any[]): void {
    const currentUsers = this.getUsers();
    const userMap = new Map<string, UserProfile>();
    for (const u of currentUsers) {
      userMap.set(u.id, u);
    }
    for (const dbU of rows) {
      if (dbU.deleted_at) {
        userMap.delete(dbU.id);
        continue;
      }
      const existing =
        userMap.get(dbU.id) ||
        currentUsers.find((u) => u.email.toLowerCase() === (dbU.email || '').toLowerCase());
      const merged: UserProfile = {
        id: dbU.id,
        email: dbU.email,
        displayName: dbU.display_name || existing?.displayName || dbU.email?.split('@')[0] || 'User',
        role: (dbU.role as any) || existing?.role || 'customer',
        phone: dbU.phone || existing?.phone,
        avatarUrl: dbU.avatar_url || existing?.avatarUrl,
        status: dbU.status || 'active',
        emailVerified: Boolean(dbU.email_verified),
        referralCode: existing?.referralCode || `REF_${dbU.id.slice(-5).toUpperCase()}`,
        referredBy: dbU.referred_by || existing?.referredBy,
        createdAt: dbU.created_at || existing?.createdAt || new Date().toISOString(),
        lastLoginAt: existing?.lastLoginAt || new Date().toISOString(),
      };
      if (existing && existing.id !== dbU.id) {
        userMap.delete(existing.id);
      }
      userMap.set(dbU.id, merged);
    }
    const updatedUsers = Array.from(userMap.values());
    this.cache[STORAGE_KEYS.USERS] = updatedUsers;
    this.saveToLocalStorage(STORAGE_KEYS.USERS, updatedUsers);
  }

  private applyTopupRows(rows: any[], replaceAll: boolean = false): void {
    const current = replaceAll ? [] : (this.cache[STORAGE_KEYS.TOPUPS] as TopUpRequest[]) || [];
    const topupMap = new Map<string, TopUpRequest>();
    for (const t of current) {
      topupMap.set(t.id, t);
    }
    for (const t of rows) {
      if (t.deleted_at) {
        topupMap.delete(t.id);
        continue;
      }
      topupMap.set(t.id, {
        id: t.id,
        customerId: t.customer_id,
        customerName: t.customer_name,
        amount: Number(t.amount),
        currency: 'USD',
        bonusAmount: Number(t.bonus_amount || 0),
        bonusPercentage: 0,
        feeAmount: 0,
        finalWalletCredit: Number(t.amount) + Number(t.bonus_amount || 0),
        method: (t.payment_method_id as any) || 'payment_link',
        methodName: t.payment_method_name || 'Payment Link',
        status: t.status || 'submitted',
        receiptUrl: t.proof_url || undefined,
        targetGameName: t.target_game_name || undefined,
        targetGameCatalogId: t.target_game_account_id || undefined,
        reviewerId: t.reviewer_id || undefined,
        reviewerName: t.reviewer_name || undefined,
        reviewNotes: t.review_notes || undefined,
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
      });
    }
    const updated = Array.from(topupMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    this.cache[STORAGE_KEYS.TOPUPS] = updated;
    this.saveToLocalStorage(STORAGE_KEYS.TOPUPS, updated);
  }

  private applyWithdrawalRows(rows: any[], replaceAll: boolean = false): void {
    const current = replaceAll ? [] : (this.cache[STORAGE_KEYS.WITHDRAWALS] as WithdrawalRequest[]) || [];
    const withMap = new Map<string, WithdrawalRequest>();
    for (const w of current) {
      withMap.set(w.id, w);
    }
    for (const w of rows) {
      if (w.deleted_at) {
        withMap.delete(w.id);
        continue;
      }
      withMap.set(w.id, {
        id: w.id,
        customerId: w.customer_id,
        customerName: w.customer_name,
        amount: Number(w.amount),
        currency: 'USD',
        feeAmount: Number(w.fee || 0),
        netPayout: Number(w.net_amount || w.amount),
        reservedAmount: Number(w.amount),
        method: w.payout_method_id || 'bank_transfer',
        methodName: w.payout_method_name || 'Bank Transfer',
        payoutDetails: w.payout_details || {},
        status: w.status || 'submitted',
        reviewerId: w.reviewer_id || undefined,
        reviewerName: w.reviewer_name || undefined,
        reviewNotes: w.review_notes || undefined,
        payoutReference: w.transaction_hash || undefined,
        timeline: [],
        createdAt: w.created_at,
        updatedAt: w.updated_at || w.created_at,
      });
    }
    const updated = Array.from(withMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    this.cache[STORAGE_KEYS.WITHDRAWALS] = updated;
    this.saveToLocalStorage(STORAGE_KEYS.WITHDRAWALS, updated);
  }

  private applyWalletRows(rows: any[]): void {
    const walletMap = { ...((this.cache[STORAGE_KEYS.WALLETS] as Record<string, UserWallet>) || {}) };
    for (const w of rows) {
      const existing = walletMap[w.customer_id];
      const completedTopups = this.getTopUpRequests(w.customer_id).filter((t) => t.status === 'completed');
      const latestTopup = completedTopups[0];
      const derivedTopUpAmount =
        existing?.lastTopUpAmount ||
        latestTopup?.finalWalletCredit ||
        latestTopup?.amount ||
        Number(w.total_deposited || 0);
      const derivedTopUpGame = existing?.lastTopUpGame || latestTopup?.targetGameName;
      const derivedTopUpAt = existing?.lastTopUpAt || latestTopup?.updatedAt || latestTopup?.createdAt;

      walletMap[w.customer_id] = {
        customerId: w.customer_id,
        currency: w.currency || 'USD',
        availableBalance: Number(w.balance || 0),
        referralBonusBalance: existing?.referralBonusBalance || 0,
        reservedBalance: Number(w.pending_withdrawal || 0),
        pendingDepositBalance: Number(w.pending_deposit || 0),
        lastTopUpAmount: derivedTopUpAmount,
        lastTopUpGame: derivedTopUpGame,
        lastTopUpAt: derivedTopUpAt,
        lastUpdatedAt: w.updated_at || new Date().toISOString(),
      };
    }
    this.cache[STORAGE_KEYS.WALLETS] = walletMap;
    this.saveToLocalStorage(STORAGE_KEYS.WALLETS, walletMap);
  }

  private applyGameAccountRows(rows: any[], replaceAll: boolean = false): void {
    const current = replaceAll ? [] : (this.cache[STORAGE_KEYS.GAME_ACCOUNTS] as GameAccount[]) || [];
    const accMap = new Map<string, GameAccount>();
    for (const a of current) {
      accMap.set(a.id, a);
    }
    for (const ga of rows) {
      if (ga.deleted_at) {
        accMap.delete(ga.id);
        continue;
      }
      accMap.set(ga.id, {
        id: ga.id,
        gameCatalogId: ga.game_id,
        customerId: ga.customer_id,
        gameName: ga.game_title,
        platformName: 'Sweepstakes',
        username: ga.username,
        password: ga.password,
        status: ga.status || 'active',
        notes: ga.pin || '',
        createdAt: ga.created_at || new Date().toISOString(),
        updatedAt: ga.updated_at || ga.created_at || new Date().toISOString(),
      });
    }
    const updated = this.deduplicateGameAccounts(Array.from(accMap.values()));
    this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = updated;
    this.saveToLocalStorage(STORAGE_KEYS.GAME_ACCOUNTS, updated);
    window.dispatchEvent(
      new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.GAME_ACCOUNTS } })
    );
  }

  // Fetch Game Accounts directly from Supabase / server proxy on demand
  public async fetchGameAccountsFromDb(customerId?: string): Promise<GameAccount[]> {
    try {
      if (supabase && isSupabaseConfigured()) {
        let query = supabase.from('game_accounts').select('*').order('created_at', { ascending: false });
        if (customerId) {
          query = query.eq('customer_id', customerId);
        }
        const { data, error } = await query.limit(100);
        if (!error && data && Array.isArray(data) && data.length > 0) {
          this.applyGameAccountRows(data, false);
          return this.getGameAccounts(customerId);
        }
      }

      // Resilient fallback to Server Route (Service Role)
      const url = customerId ? `/api/game-accounts?customerId=${encodeURIComponent(customerId)}` : '/api/game-accounts';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.accounts && Array.isArray(json.accounts)) {
          this.applyGameAccountRows(json.accounts, false);
          return this.getGameAccounts(customerId);
        }
      }
    } catch (err) {
      console.warn('[dataService] fetchGameAccountsFromDb notice:', err);
    }
    return this.getGameAccounts(customerId);
  }

  // Direct Staff Provisioning of Game Credentials for any Player & Game
  public async provisionGameAccountDirectly(params: {
    customerId: string;
    gameId: string;
    gameTitle: string;
    username: string;
    password: string;
    pin?: string;
    reviewerId: string;
    reviewerName: string;
  }): Promise<{ success: boolean; message: string; account?: GameAccount }> {
    try {
      // 1. Call authoritative server endpoint
      const res = await fetch('/api/game-accounts/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();

      if (res.ok && data.account) {
        this.applyGameAccountRows([data.account], false);
      } else {
        // Direct local/client fallback
        const accountId = `ga_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const localAcc: GameAccount = {
          id: accountId,
          customerId: params.customerId,
          gameCatalogId: params.gameId,
          gameName: params.gameTitle,
          platformName: 'Sweepstakes',
          username: params.username.trim(),
          password: params.password.trim(),
          notes: params.pin || undefined,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const allAccs = this.getGameAccounts();
        allAccs.push(localAcc);
        const deduplicated = this.deduplicateGameAccounts(allAccs);
        this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = deduplicated;
        this.saveToLocalStorage(STORAGE_KEYS.GAME_ACCOUNTS, deduplicated);
        window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.GAME_ACCOUNTS } }));

        if (supabase && isSupabaseConfigured()) {
          supabase.from('game_accounts').upsert({
            id: localAcc.id,
            customer_id: localAcc.customerId,
            game_id: localAcc.gameCatalogId,
            game_title: localAcc.gameName,
            username: localAcc.username,
            password: localAcc.password,
            pin: localAcc.notes || null,
            status: 'active',
            created_at: localAcc.createdAt,
            updated_at: localAcc.updatedAt,
          }).then(() => {}, () => {});
        }
      }

      // 2. Dispatch Push Alert to Customer Phone / PWA
      if (typeof window !== 'undefined') {
        webPushClient.dispatchPushAlert({
          recipientId: params.customerId,
          recipientRole: 'customer',
          title: '🔑 Game Credentials Assigned!',
          body: `Your credentials for ${params.gameTitle} are ready (Username: ${params.username}). Tap to play!`,
          url: '/#games',
          tag: `game_direct_${Date.now()}`,
          actionType: 'game',
        }).catch(() => {});
      }

      // 3. Post to player's support conversation
      try {
        const player = this.getUserById(params.customerId);
        if (player) {
          const conv = this.getOrCreateConversationForCustomer(player.id, player.displayName);
          this.sendChatMessage({
            conversationId: conv.id,
            senderId: params.reviewerId,
            senderName: params.reviewerName,
            senderRole: 'agent',
            text: `🔑 Your player credentials for "${params.gameTitle}" are ready!\n\n• Username: "${params.username}"\n• Password: "${params.password}"\n\nYou can access and reveal your credentials anytime in your Gaming IDs portal. Good luck!`,
            isInternalNote: false,
          });
        }
      } catch (err) {}

      return { success: true, message: `Successfully provisioned credentials for ${params.gameTitle}!` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to provision game account' };
    }
  }

  private applyCatalogRows(rows: any[]): void {
    const updated = rows.map((g: any) => ({
      id: g.id,
      title: g.title,
      platform: g.category || 'General',
      gameUrl: '#',
      description: g.description || '',
      enabled: g.is_active !== false,
      iconUrl: g.icon_url,
      imageUrl: g.image_url,
      createdAt: g.created_at || new Date().toISOString(),
      updatedAt: g.created_at || new Date().toISOString(),
    }));
    this.cache[STORAGE_KEYS.GAME_CATALOG] = updated;
    this.saveToLocalStorage(STORAGE_KEYS.GAME_CATALOG, updated);
  }

  private applyCashoutRows(rows: any[], replaceAll: boolean = false): void {
    const mapped = rows.map((c: any) => ({
      id: c.id,
      customerName: c.customer_name,
      amount: Number(c.amount),
      currency: c.currency,
      methodName: c.method_name,
      gameName: c.game_name,
      isFake: c.is_fake,
      timestamp: c.timestamp,
    }));
    if (replaceAll) {
      this.cache[STORAGE_KEYS.FAKED_CASHOUTS] = mapped;
    } else {
      const existing = (this.cache[STORAGE_KEYS.FAKED_CASHOUTS] as any[]) || [];
      const map = new Map<string, any>();
      for (const m of existing) map.set(m.id, m);
      for (const m of mapped) map.set(m.id, m);
      this.cache[STORAGE_KEYS.FAKED_CASHOUTS] = Array.from(map.values()).slice(0, 50);
    }
    this.saveToLocalStorage(STORAGE_KEYS.FAKED_CASHOUTS, this.cache[STORAGE_KEYS.FAKED_CASHOUTS]);
  }

  private applyConversationRows(rows: any[], replaceAll: boolean = false): void {
    const currentList = replaceAll ? [] : this.getConversations();
    const convMap = new Map<string, SupportConversation>();
    for (const c of currentList) {
      convMap.set(c.id, c);
    }
    for (const c of rows) {
      const user = this.getUserById(c.customer_id) || (c.customer_email ? this.getUserByEmail(c.customer_email) : undefined);
      // Invariant: Support agents and administrators must never have customer support tickets
      if (user && (user.role === 'agent' || user.role === 'admin')) {
        continue;
      }
      convMap.set(c.id, {
        id: c.id,
        customerId: c.customer_id,
        customerName: c.customer_name || user?.displayName || 'Customer',
        customerEmail: user?.email || c.customer_email || `${c.customer_id}@player.com`,
        assignedAgentId: c.agent_id || undefined,
        assignedAgentName: c.agent_name || undefined,
        status: c.status || 'open',
        lastMessageText: c.last_message || '',
        lastMessageTimestamp: c.last_message_at || new Date().toISOString(),
        unreadCountCustomer: 0,
        unreadCountStaff: 0,
        createdAt: c.created_at || new Date().toISOString(),
        updatedAt: c.last_message_at || c.created_at || new Date().toISOString(),
      });
    }
    const mergedList = Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );
    const cleanList = this.deduplicateAndMergeConversations(mergedList);
    this.cache[STORAGE_KEYS.CONVERSATIONS] = cleanList;
    this.saveToLocalStorage(STORAGE_KEYS.CONVERSATIONS, cleanList);
  }

  private applyMessageRows(rows: any[]): void {
    const currentMsgs = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    const msgMap: Record<string, ChatMessage[]> = { ...currentMsgs };

    for (const m of rows) {
      const item: ChatMessage = {
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role || 'customer',
        text: m.content || '',
        isInternalNote: false,
        isRead: true,
        attachmentUrl: m.attachment_url,
        attachmentName: m.attachment_name,
        transactionData: m.transaction_data || undefined,
        createdAt: m.created_at || new Date().toISOString(),
      };
      const canonicalId = this.resolveCanonicalConvId(m.conversation_id);
      const targetIds = Array.from(new Set([m.conversation_id, canonicalId].filter(Boolean)));
      for (const tid of targetIds) {
        if (!msgMap[tid]) {
          msgMap[tid] = [];
        }
        const idx = msgMap[tid].findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          msgMap[tid][idx] = item;
        } else {
          msgMap[tid].push(item);
        }
      }
    }

    this.cache[STORAGE_KEYS.MESSAGES] = msgMap;
    this.saveToLocalStorage(STORAGE_KEYS.MESSAGES, msgMap);
  }

  private applyAppConfig(data: any): void {
    const currentConfig = this.getAppConfig();
    this.cache[STORAGE_KEYS.CONFIG] = {
      ...currentConfig,
      ...data,
    };
    this.saveToLocalStorage(STORAGE_KEYS.CONFIG, this.cache[STORAGE_KEYS.CONFIG]);
  }

  private load<T>(key: string, defaultValue: T): T {
    const val = this.cache[key];
    if (val === undefined || val === null) {
      return defaultValue;
    }
    return val as T;
  }

  private save<T>(key: string, value: T): void {
    let finalValue = value;
    if (key === STORAGE_KEYS.GAME_ACCOUNTS && Array.isArray(value)) {
      finalValue = this.deduplicateGameAccounts(value as unknown as GameAccount[]) as unknown as T;
    }
    // 1. Immediately update reactive in-memory state
    this.cache[key] = finalValue;
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key } }));

    // 2. Persist to LocalStorage for offline and preview state preservation
    this.saveToLocalStorage(key, finalValue);

    // 3. Persist to Supabase PostgreSQL asynchronously if configured
    this.persistToSupabase(key, finalValue);
  }

  private async persistToSupabase(key: string, value: any): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      if (key === STORAGE_KEYS.CONFIG) {
        await supabase.from('app_config').upsert({ id: 'main', data: value });
      } else if (key === STORAGE_KEYS.USERS && Array.isArray(value) && value.length > 0) {
        const currentUser = this.getCurrentUser();
        const target = currentUser ? (value.find((u: UserProfile) => u.id === currentUser.id) || value[0]) : value[0];
        if (target && target.id) {
          let safeRole = target.role;
          try {
            const { data: dbUser } = await supabase.from('users').select('role').eq('id', target.id).maybeSingle();
            if (dbUser?.role) {
              safeRole = dbUser.role;
            }
          } catch {}

          await supabase.from('users').upsert({
            id: target.id,
            email: target.email,
            display_name: target.displayName,
            role: safeRole,
            phone: target.phone || null,
            avatar_url: target.avatarUrl || null,
            status: target.status || 'active',
            email_verified: Boolean(target.emailVerified),
            referred_by: target.referredBy || null,
            created_at: target.createdAt || new Date().toISOString(),
          });
        }
      } else if (key === STORAGE_KEYS.WALLETS && typeof value === 'object' && value !== null) {
        const currentUserId = this.getCurrentUser()?.id;
        const allWallets = Object.values(value as Record<string, UserWallet>);
        const target = currentUserId ? (value[currentUserId] || allWallets[0]) : allWallets[0];
        if (target && target.customerId) {
          await supabase.from('wallets').upsert({
            customer_id: target.customerId,
            balance: target.availableBalance || 0,
            pending_withdrawal: target.reservedBalance || 0,
            pending_deposit: target.pendingDepositBalance || 0,
            total_deposited: target.lastTopUpAmount || 0,
            total_withdrawn: 0,
            currency: target.currency || 'USD',
          });
        }
      } else if (key === STORAGE_KEYS.TRANSACTIONS && Array.isArray(value) && value.length > 0) {
        const t = value[0];
        if (t && t.id) {
          await supabase.from('transactions').upsert({
            id: t.id,
            customer_id: t.customerId,
            amount: t.amount,
            type: t.type,
            status: t.status,
            description: t.description,
            reference_id: t.relatedRequestId || null,
            game_name: t.targetGameName || null,
            created_at: t.createdAt,
          });
        }
      } else if (key === STORAGE_KEYS.TOPUPS && Array.isArray(value) && value.length > 0) {
        const topupsToUpsert = (value as TopUpRequest[]).slice(0, 10).map((top) => ({
          id: top.id,
          customer_id: top.customerId,
          customer_name: top.customerName,
          amount: top.amount,
          bonus_amount: top.bonusAmount || 0,
          payment_method_id: top.method || 'payment_link',
          payment_method_name: top.methodName || 'Payment Link',
          status: top.status,
          proof_url: top.receiptUrl || null,
          target_game_name: top.targetGameName || null,
          target_game_account_id: top.targetGameCatalogId || null,
          customer_notes: null,
          reviewer_id: top.reviewerId || null,
          reviewer_name: top.reviewerName || null,
          review_notes: top.reviewNotes || null,
          created_at: top.createdAt,
          updated_at: top.updatedAt,
        }));
        await supabase.from('topups').upsert(topupsToUpsert);
      } else if (key === STORAGE_KEYS.WITHDRAWALS && Array.isArray(value) && value.length > 0) {
        const withdrawalsToUpsert = (value as WithdrawalRequest[]).slice(0, 10).map((w) => ({
          id: w.id,
          customer_id: w.customerId,
          customer_name: w.customerName,
          amount: w.amount,
          fee: w.feeAmount || 0,
          net_amount: w.netPayout,
          payout_method_id: w.method || 'bank_transfer',
          payout_method_name: w.methodName || 'Bank Transfer',
          payout_details: w.payoutDetails || {},
          status: w.status,
          reviewer_id: w.reviewerId || null,
          reviewer_name: w.reviewerName || null,
          review_notes: w.reviewNotes || null,
          transaction_hash: w.payoutReference || null,
          created_at: w.createdAt,
          updated_at: w.updatedAt,
        }));
        await supabase.from('withdrawals').upsert(withdrawalsToUpsert);
      } else if (key === STORAGE_KEYS.GAME_CATALOG && Array.isArray(value) && value.length > 0) {
        const g = value[0];
        if (g && g.id) {
          await supabase.from('game_catalog').upsert({
            id: g.id,
            title: g.title,
            category: g.platform || 'General',
            description: g.description || null,
            min_load: 5.0,
            bonus_pct: 0.0,
            is_active: g.enabled !== false,
            icon_url: g.iconUrl || null,
            image_url: g.imageUrl || null,
            created_at: g.createdAt || new Date().toISOString(),
          });
        }
      } else if (key === STORAGE_KEYS.GAME_ACCOUNTS && Array.isArray(value) && value.length > 0) {
        const accountsToUpsert = (value as GameAccount[]).slice(0, 15).map((a) => ({
          id: a.id,
          customer_id: a.customerId,
          game_id: a.gameCatalogId,
          game_title: a.gameName,
          username: a.username,
          password: a.password || '',
          pin: a.notes || null,
          status: a.status,
          created_at: a.createdAt,
          updated_at: a.updatedAt,
        }));
        await supabase.from('game_accounts').upsert(accountsToUpsert);
      } else if (key === STORAGE_KEYS.CONVERSATIONS && Array.isArray(value) && value.length > 0) {
        const currentUserId = this.getCurrentUser()?.id;
        const c = currentUserId
          ? ((value as SupportConversation[]).find((x) => x.customerId === currentUserId) || value[0])
          : value[0];
        if (c && c.id && c.customerId) {
          await supabase.from('conversations').upsert({
            id: c.id,
            customer_id: c.customerId,
            customer_name: c.customerName,
            agent_id: c.assignedAgentId || null,
            agent_name: c.assignedAgentName || null,
            status: c.status,
            last_message: c.lastMessageText,
            last_message_at: c.lastMessageTimestamp,
            created_at: c.createdAt,
          });
        }
      } else if (key === STORAGE_KEYS.MESSAGES) {
        // Individual messages are already persisted directly in sendChatMessage() without triggering query bursts
      } else if (key === STORAGE_KEYS.FAKED_CASHOUTS) {
        // Client-side simulated ticker cashouts remain purely local and are never synced to Supabase
      }
    } catch (err) {
      console.warn('Supabase async persist notice:', err);
    }
  }

  public async migrateAllToSupabase(): Promise<{
    success: boolean;
    counts: Record<string, number>;
    message: string;
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        counts: {},
        message:
          'Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables or .env file before running migration.',
      };
    }

    try {
      const counts: Record<string, number> = {};

      // 1. Users
      const users = this.getUsers();
      if (users.length > 0) {
        const rows = users.map((u) => ({
          id: u.id,
          email: u.email,
          display_name: u.displayName,
          role: u.role,
          phone: u.phone || null,
          avatar_url: u.avatarUrl || null,
          status: u.status || 'active',
          email_verified: Boolean(u.emailVerified),
          referred_by: u.referredBy || null,
          created_at: u.createdAt || new Date().toISOString(),
        }));
        const { error } = await supabase.from('users').upsert(rows);
        if (!error) counts['users'] = rows.length;
      }

      // 2. Wallets
      const wallets = Object.values(this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS));
      if (wallets.length > 0) {
        const rows = wallets.map((w) => ({
          customer_id: w.customerId,
          balance: w.availableBalance || 0,
          pending_withdrawal: w.reservedBalance || 0,
          pending_deposit: w.pendingDepositBalance || 0,
          total_deposited: w.lastTopUpAmount || 0,
          total_withdrawn: 0,
          currency: w.currency || 'USD',
        }));
        const { error } = await supabase.from('wallets').upsert(rows);
        if (!error) counts['wallets'] = rows.length;
      }

      // 3. Transactions
      const txs = this.load<WalletTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
      if (txs.length > 0) {
        const rows = txs.map((t) => ({
          id: t.id,
          customer_id: t.customerId,
          amount: t.amount,
          type: t.type,
          status: t.status,
          description: t.description,
          reference_id: t.relatedRequestId || null,
          game_name: t.targetGameName || null,
          created_at: t.createdAt,
        }));
        const { error } = await supabase.from('transactions').upsert(rows);
        if (!error) counts['transactions'] = rows.length;
      }

      // 4. Topups
      const topups = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
      if (topups.length > 0) {
        const rows = topups.map((top) => ({
          id: top.id,
          customer_id: top.customerId,
          customer_name: top.customerName,
          amount: top.amount,
          bonus_amount: top.bonusAmount || 0,
          payment_method_id: top.method || 'payment_link',
          payment_method_name: top.methodName || 'Payment Link',
          status: top.status,
          proof_url: top.receiptUrl || null,
          target_game_name: top.targetGameName || null,
          target_game_account_id: top.targetGameCatalogId || null,
          customer_notes: null,
          reviewer_id: top.reviewerId || null,
          reviewer_name: top.reviewerName || null,
          review_notes: top.reviewNotes || null,
          created_at: top.createdAt,
          updated_at: top.updatedAt,
        }));
        const { error } = await supabase.from('topups').upsert(rows);
        if (!error) counts['topups'] = rows.length;
      }

      // 5. Withdrawals
      const withdrawals = this.load<WithdrawalRequest[]>(STORAGE_KEYS.WITHDRAWALS, INITIAL_WITHDRAWALS);
      if (withdrawals.length > 0) {
        const rows = withdrawals.map((w) => ({
          id: w.id,
          customer_id: w.customerId,
          customer_name: w.customerName,
          amount: w.amount,
          fee: w.feeAmount || 0,
          net_amount: w.netPayout,
          payout_method_id: w.method || 'bank_transfer',
          payout_method_name: w.methodName || 'Bank Transfer',
          payout_details: w.payoutDetails || {},
          status: w.status,
          reviewer_id: w.reviewerId || null,
          reviewer_name: w.reviewerName || null,
          review_notes: w.reviewNotes || null,
          transaction_hash: w.payoutReference || null,
          created_at: w.createdAt,
          updated_at: w.updatedAt,
        }));
        const { error } = await supabase.from('withdrawals').upsert(rows);
        if (!error) counts['withdrawals'] = rows.length;
      }

      // 6. Game Catalog
      const games = this.load<GameCatalogItem[]>(STORAGE_KEYS.GAME_CATALOG, INITIAL_GAME_CATALOG);
      if (games.length > 0) {
        const rows = games.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.platform || 'General',
          description: g.description || null,
          min_load: 5.0,
          bonus_pct: 0,
          is_active: g.enabled !== false,
          icon_url: g.iconUrl || null,
          image_url: g.imageUrl || null,
          created_at: g.createdAt || new Date().toISOString(),
        }));
        const { error } = await supabase.from('game_catalog').upsert(rows);
        if (!error) counts['game_catalog'] = rows.length;
      }

      // 7. Conversations & Messages
      const convs = this.load<SupportConversation[]>(STORAGE_KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS);
      if (convs.length > 0) {
        const rows = convs.map((c) => ({
          id: c.id,
          customer_id: c.customerId,
          customer_name: c.customerName,
          agent_id: c.assignedAgentId || null,
          agent_name: c.assignedAgentName || null,
          status: c.status,
          last_message: c.lastMessageText || '',
          last_message_at: c.lastMessageTimestamp || new Date().toISOString(),
          created_at: c.createdAt,
        }));
        const { error } = await supabase.from('conversations').upsert(rows);
        if (!error) counts['conversations'] = rows.length;
      }

      const allMsgs: any[] = [];
      const msgDict = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
      for (const mList of Object.values(msgDict)) {
        allMsgs.push(...mList);
      }
      if (allMsgs.length > 0) {
        const rows = allMsgs.map((m) => ({
          id: m.id,
          conversation_id: m.conversationId,
          sender_id: m.senderId,
          sender_name: m.senderName,
          sender_role: m.senderRole,
          content: m.text || '',
          transaction_data: m.transactionData || null,
          created_at: m.createdAt,
        }));
        const { error } = await supabase.from('messages').upsert(rows);
        if (!error) counts['messages'] = rows.length;
      }

      // 8. App Config
      const cfg = this.load<AppConfig>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
      await supabase.from('app_config').upsert({ id: 'main', data: cfg });
      counts['app_config'] = 1;

      const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

      this.logAudit({
        actorId: 'admin_migrator',
        actorName: 'Supabase Migration Tool',
        actorRole: 'admin',
        action: 'SUPABASE_DATA_MIGRATED',
        entityType: 'settings',
        entityId: 'supabase_migration',
        details: `Successfully migrated ${totalItems} records across ${Object.keys(counts).length} tables into Supabase.`,
      });

      return {
        success: true,
        counts,
        message: `Successfully migrated ${totalItems} records across ${Object.keys(counts).length} tables into Supabase PostgreSQL!`,
      };
    } catch (err: any) {
      console.error('Migration error:', err);
      return {
        success: false,
        counts: {},
        message: 'Migration failed: ' + (err?.message || String(err)),
      };
    }
  }

  public async seedDatabaseWithPresets(): Promise<{ success: boolean; message: string }> {
    if (this.isSeeding) return { success: true, message: 'Seeding already in progress' };
    this.isSeeding = true;
    try {
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

      // Migrate to Supabase
      await this.migrateAllToSupabase();

      window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'all' } }));
      return { success: true, message: 'All demo presets and presets have been populated to Supabase.' };
    } catch (error) {
      console.warn('Supabase sync notice:', error instanceof Error ? error.message : String(error));
      return { success: false, message: 'Active storage is running via Supabase PostgreSQL & Local Storage resilience mode.' };
    } finally {
      this.isSeeding = false;
    }
  }

  // Alias for backward compatibility
  public async seedFirestoreWithPresets(): Promise<{ success: boolean; message: string }> {
    return this.seedDatabaseWithPresets();
  }

  public resetToSeedData(): void {
    // Reset in-memory cache & local storage
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
      [STORAGE_KEYS.PASSWORD_RESET_TOKENS]: [],
    };
    for (const [key, val] of Object.entries(this.cache)) {
      this.saveToLocalStorage(key, val);
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'all' } }));

    if (isSupabaseConfigured() && supabase) {
      this.migrateAllToSupabase().catch((e) => console.warn('Supabase reset sync note:', e));
    }
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
        emailVerified: Boolean(session.emailVerified),
        createdAt: new Date(session.createdAt).toISOString(),
        lastLoginAt: new Date(session.lastActiveAt).toISOString(),
      };
      this.registerUser(user);
    } else if (session.emailVerified && !user.emailVerified) {
      user.emailVerified = true;
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
    supabaseAuthService.logout().catch(() => {});
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'auth' } }));
  }

  // ==========================================
  // Production Supabase Authentication Methods
  // ==========================================

  public async loginWithSupabaseAuth(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const supaRes = await supabaseAuthService.loginWithEmail(email, pass);
    if (supaRes.success && supaRes.user) {
      this.currentUserId = supaRes.user.id;
      this.logAudit({
        actorId: supaRes.user.id,
        actorName: supaRes.user.displayName,
        actorRole: supaRes.user.role,
        action: 'USER_LOGGED_IN',
        entityType: 'user',
        entityId: supaRes.user.id,
        details: 'User authenticated successfully via Supabase Auth / Local Session.',
      });
      return { success: true, user: supaRes.user };
    }

    return {
      success: false,
      message: supaRes.error || 'Authentication failed. Please check your credentials.',
    };
  }

  // Alias for backward compatibility
  public async loginWithFirebaseAuth(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    return this.loginWithSupabaseAuth(email, pass);
  }

  public async registerWithSupabaseAuth(
    email: string,
    pass: string,
    displayName: string,
    phone?: string,
    referralCode?: string,
    role?: UserRole
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const supaRes = await supabaseAuthService.registerWithEmail({
      email,
      password: pass,
      displayName,
      phone,
      referralCode,
      role,
    });
    if (supaRes.success && supaRes.user) {
      this.currentUserId = supaRes.user.id;
      this.logAudit({
        actorId: supaRes.user.id,
        actorName: supaRes.user.displayName,
        actorRole: supaRes.user.role,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: supaRes.user.id,
        details: 'User registered successfully with Supabase Auth profile initialized.',
      });
      return { success: true, user: supaRes.user, message: supaRes.message };
    }

    return {
      success: false,
      message: supaRes.error || 'Registration failed.',
    };
  }

  // Alias for backward compatibility
  public async registerWithFirebaseAuth(
    email: string,
    pass: string,
    displayName: string,
    phone?: string,
    referralCode?: string,
    role?: UserRole
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    return this.registerWithSupabaseAuth(email, pass, displayName, phone, referralCode, role);
  }

  public async loginWithGoogle(
    intendedRole: UserRole = 'customer'
  ): Promise<{ success: boolean; user?: UserProfile; message?: string; code?: string }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: 'Redirecting to Google Sign-In via Supabase...' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Google OAuth failed' };
      }
    }

    // Local / demo fallback
    const demoUser = this.getUsers().find((u) => u.role === intendedRole);
    if (demoUser) {
      this.currentUserId = demoUser.id;
      authSessionService.createSessionForUser(
        demoUser.id,
        demoUser.email,
        demoUser.displayName,
        demoUser.role
      );
      return { success: true, user: demoUser };
    }

    return {
      success: false,
      message: 'Google Sign-In is configured with Supabase Auth (VITE_SUPABASE_URL).',
    };
  }

  public async sendVerificationEmail(): Promise<{ success: boolean; message?: string; actionLink?: string }> {
    const user = this.getCurrentUser();
    if (!user) {
      return { success: false, message: 'No active user found.' };
    }
    return supabaseAuthService.resendVerificationEmail(user.email);
  }

  public async reloadAndCheckEmailVerification(): Promise<{
    verified: boolean;
    message: string;
    user: UserProfile | null;
  }> {
    const user = this.getCurrentUser();
    if (!user) {
      return { verified: false, message: 'No active session found', user: null };
    }

    // 1. Check with Supabase backend server API
    try {
      const resp = await fetch('/api/auth/check-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.exists) {
          user.emailVerified = Boolean(data.verified);
          this.registerUser(user);
          authSessionService.updateUserProfile(user);
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
          return {
            verified: Boolean(data.verified),
            message: data.verified
              ? 'Email address confirmed and verified in Supabase! Cashouts and referral bonuses are now unlocked.'
              : 'Email address is still unconfirmed in Supabase. Check your inbox or click Instant Verify.',
            user,
          };
        }
      }
    } catch (err) {
      console.warn('Check verification network notice:', err);
    }

    // 2. Client-side Supabase session & database check fallback
    if (supabase && isSupabaseConfigured()) {
      try {
        const [{ data: authData }, { data: dbUser }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('users').select('id, email_verified').eq('id', user.id).maybeSingle(),
        ]);

        const supaUser = authData?.user;
        const isAuthConfirmed = supaUser && supaUser.email?.toLowerCase() === user.email.toLowerCase() && Boolean(supaUser.email_confirmed_at);
        const isDbConfirmed = Boolean(dbUser?.email_verified);
        const isConfirmed = isAuthConfirmed || isDbConfirmed;

        if (isConfirmed) {
          user.emailVerified = true;
          this.registerUser(user);
          authSessionService.updateUserProfile(user);
          window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
          return {
            verified: true,
            message: 'Email address confirmed and verified! Cashouts and referral bonuses are now unlocked.',
            user,
          };
        }
      } catch (e) {
        console.warn('Supabase client verification check notice:', e);
      }
    }

    return {
      verified: Boolean(user.emailVerified),
      message: user.emailVerified
        ? 'Email address confirmed and verified!'
        : 'Email address is unverified. Please check your email inbox.',
      user,
    };
  }

  public async confirmEmailNow(email?: string): Promise<{ success: boolean; message: string }> {
    const targetEmail = (email || this.getCurrentUser()?.email || '').trim().toLowerCase();
    if (!targetEmail) {
      return { success: false, message: 'Valid email address is required.' };
    }
    const res = await supabaseAuthService.confirmEmailNow(targetEmail);
    if (res.success) {
      const u = this.getUsers().find((usr) => usr.email.toLowerCase() === targetEmail);
      if (u) {
        u.emailVerified = true;
        this.registerUser(u);
        authSessionService.updateUserProfile(u);
      }
      const cur = this.getCurrentUser();
      if (cur && cur.email.toLowerCase() === targetEmail) {
        cur.emailVerified = true;
        this.registerUser(cur);
        authSessionService.updateUserProfile(cur);
      }
      window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
    }
    return res;
  }

  public async sendPasswordResetViaSupabase(
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    return supabaseAuthService.sendPasswordReset(email);
  }

  // Alias for backward compatibility
  public async sendPasswordResetViaFirebase(
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.sendPasswordResetViaSupabase(email);
  }

  // ==========================================
  // Self-Service Password Reset
  // ==========================================

  public getPasswordResetTokens(): PasswordResetToken[] {
    return this.load<PasswordResetToken[]>(STORAGE_KEYS.PASSWORD_RESET_TOKENS, []);
  }

  public savePasswordResetToken(tokenRecord: PasswordResetToken): void {
    const tokens = this.getPasswordResetTokens();
    const filtered = tokens.filter((t) => t.token !== tokenRecord.token && t.id !== tokenRecord.id);
    filtered.unshift(tokenRecord);
    this.save(STORAGE_KEYS.PASSWORD_RESET_TOKENS, filtered);
  }

  public async requestPasswordReset(
    emailInput: string
  ): Promise<{ success: boolean; token?: string; pin?: string; expiresAt?: number; message?: string }> {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    const res = await supabaseAuthService.sendPasswordReset(email);
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
      details: `Password reset instructions sent to ${email} via Supabase Auth.`,
    });

    return {
      success: true,
      message: res.message || `Password reset link dispatched to ${email}.`,
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

    // 4. Mark token used in cache & Supabase
    const tokens = this.getPasswordResetTokens();
    const updatedTokens = tokens.map((t) => {
      if (t.token.toLowerCase() === cleanToken.toLowerCase() || t.id.toLowerCase() === cleanToken.toLowerCase()) {
        return { ...t, used: true, usedAt: Date.now() };
      }
      return t;
    });
    this.save(STORAGE_KEYS.PASSWORD_RESET_TOKENS, updatedTokens);

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

  // Users: In-memory runtime session store only (0 localStorage caching)
  public getUsers(): UserProfile[] {
    return Array.isArray(this.cache[STORAGE_KEYS.USERS]) ? this.cache[STORAGE_KEYS.USERS] : [];
  }

  // Pure on-demand database fetch for Users & Staff Governance (0 local storage caching)
  public async fetchLiveUsersDirectory(actingUser?: UserProfile | null): Promise<{
    success: boolean;
    users: UserProfile[];
    error?: string;
  }> {
    try {
      const activeUser = actingUser || this.getCurrentUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeUser) {
        headers['x-user-id'] = activeUser.id;
        headers['x-user-role'] = activeUser.role;
      }
      const resp = await fetch('/api/admin/users', {
        method: 'GET',
        headers,
      });

      if (!resp.ok) {
        // If API route fails or is unavailable on Vercel (e.g. 500, 404, or serverless cold-start timeout),
        // query live Supabase PostgreSQL directly to ensure the user directory is always available
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data: dbUsers, error: dbErr } = await supabase
              .from('users')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(100);

            if (!dbErr && dbUsers && dbUsers.length > 0) {
              const userIds = dbUsers.map((u: any) => u.id);
              const { data: dbWallets } = await supabase.from('wallets').select('*').in('customer_id', userIds);
              const { data: dbGameAccs } = await supabase.from('game_accounts').select('*').in('customer_id', userIds);

              const walletsMap: Record<string, any> = {};
              (dbWallets || []).forEach((w: any) => {
                walletsMap[w.customer_id] = {
                  customerId: w.customer_id,
                  currency: w.currency || 'USD',
                  availableBalance: Number(w.balance ?? w.available_balance ?? 0),
                  referralBonusBalance: Number(w.referral_bonus_balance ?? 0),
                  reservedBalance: Number(w.pending_withdrawal ?? w.reserved_balance ?? 0),
                  pendingDepositBalance: Number(w.pending_deposit ?? w.pending_deposit_balance ?? 0),
                  lastUpdatedAt: w.updated_at || w.last_updated_at || new Date().toISOString(),
                };
              });

              const gameAccountsMap: Record<string, any[]> = {};
              (dbGameAccs || []).forEach((g: any) => {
                if (!gameAccountsMap[g.customer_id]) gameAccountsMap[g.customer_id] = [];
                gameAccountsMap[g.customer_id].push({
                  id: g.id,
                  customerId: g.customer_id,
                  gameCatalogId: g.game_id || g.game_catalog_id,
                  gameName: g.game_title || g.game_name,
                  username: g.username || g.game_username,
                  password: g.password || g.game_password,
                  status: g.status || 'active',
                  notes: g.pin || g.notes || '',
                  createdAt: g.created_at,
                });
              });

              const aggregated = dbUsers.map((u: any) => ({
                id: u.id,
                email: u.email,
                displayName: u.display_name || u.email?.split('@')[0] || 'User',
                phone: u.phone,
                role: u.role || 'customer',
                status: u.status || 'active',
                emailVerified: Boolean(u.email_verified),
                avatarUrl: u.avatar_url,
                referralCode: u.referral_code,
                referredBy: u.referred_by,
                registeredPaymentMethod: u.registered_payment_method,
                registeredPaymentDetails: u.registered_payment_details,
                isParentAdmin: u.email?.toLowerCase() === 'sachet61@gmail.com' || Boolean(u.is_parent_admin),
                promotedBy: u.promoted_by,
                promotedByName: u.promoted_by_name,
                promotedAt: u.promoted_at,
                createdAt: u.created_at,
                lastLoginAt: u.last_login_at || u.updated_at,
                wallet: walletsMap[u.id] || {
                  customerId: u.id,
                  currency: 'USD',
                  availableBalance: 0,
                  referralBonusBalance: 0,
                  reservedBalance: 0,
                  pendingDepositBalance: 0,
                },
                gameAccounts: gameAccountsMap[u.id] || [],
                gameAccountsCount: (gameAccountsMap[u.id] || []).length,
              }));

              this.cache[STORAGE_KEYS.USERS] = aggregated;
              return { success: true, users: aggregated };
            }
          } catch (directErr: any) {
            console.warn('[Direct Supabase Query Notice]:', directErr);
          }
        }

        const errData = await resp.json().catch(() => ({}));
        return {
          success: false,
          users: [],
          error: errData.error || `Server returned HTTP ${resp.status}`,
        };
      }

      const data = await resp.json();
      if (data.success && Array.isArray(data.users)) {
        // Keep in-memory cache updated strictly for current active session; NEVER write to localStorage
        this.cache[STORAGE_KEYS.USERS] = data.users;
        return { success: true, users: data.users };
      }

      return {
        success: false,
        users: [],
        error: data.error || 'Failed to parse user directory response from server.',
      };
    } catch (err: any) {
      return {
        success: false,
        users: [],
        error: err.message || 'Network error fetching user directory.',
      };
    }
  }

  public getUserById(userId: string): UserProfile | undefined {
    if (!userId) return undefined;
    const users = this.getUsers();
    const found = users.find((u) => u.id === userId || u.email?.toLowerCase() === userId.toLowerCase());
    if (found) return found;

    // Try fetching from Supabase if not in cache yet
    if (supabase && isSupabaseConfigured()) {
      (async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .or(`id.eq.${userId},email.ilike.${userId}`)
            .maybeSingle();

          if (data) {
            const u: UserProfile = {
              id: data.id,
              email: data.email,
              displayName: data.display_name || data.email?.split('@')[0] || 'Player',
              role: data.role || 'customer',
              phone: data.phone,
              avatarUrl: data.avatar_url,
              status: data.status || 'active',
              emailVerified: Boolean(data.email_verified),
              referralCode: `REF_${data.id.slice(-5).toUpperCase()}`,
              referredBy: data.referred_by,
              createdAt: data.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            const cur = this.getUsers();
            if (!cur.some((x) => x.id === u.id)) {
              this.cache[STORAGE_KEYS.USERS] = [...cur, u];
              window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'users' } }));
            }
          }
        } catch {
          // Ignore background fetch error
        }
      })();
    }

    return undefined;
  }

  public getUserByEmail(email: string): UserProfile | undefined {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    return this.getUsers().find((u) => u.email?.toLowerCase() === clean);
  }

  public isProtectedParentAdmin(emailOrId?: string, user?: UserProfile): boolean {
    if (!emailOrId && !user) return false;
    const clean = (emailOrId || user?.email || '').trim().toLowerCase();
    if (clean === 'sachet61@gmail.com') return true;
    if (user && user.role !== 'admin') return false;
    if (user?.isParentAdmin && user.role === 'admin') return true;
    if (!emailOrId) return false;

    const foundUser = this.getUserById(emailOrId) || this.getUserByEmail(emailOrId);
    if (foundUser && foundUser.role !== 'admin' && clean !== 'sachet61@gmail.com') return false;

    return (
      clean === 'sachet61@gmail.com' ||
      clean === 'admin@swiftsweeps.com' ||
      clean === 'admin@aetherpay.com' ||
      clean === 'nduphasetwo@gmail.com' ||
      clean === 'blithesweeps@gmail.com' ||
      clean === 'usr_admin_master'
    );
  }

  public async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    actingUser: UserProfile
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    if (actingUser.role !== 'admin') {
      return {
        success: false,
        message: 'Access Denied: Support Agents have read-only permissions. Only Administrators can promote or alter user roles.',
      };
    }

    const targetUser = this.getUserById(targetUserId) || this.getUserByEmail(targetUserId);
    if (!targetUser) {
      return { success: false, message: 'User not found in system directory.' };
    }

    const isParentAdmin =
      this.isProtectedParentAdmin(targetUser.email, targetUser) ||
      this.isProtectedParentAdmin(targetUser.id, targetUser) ||
      targetUser.isParentAdmin;

    if (isParentAdmin) {
      if (newRole !== 'admin') {
        return {
          success: false,
          message: 'Security Guard: Newly appointed administrators cannot demote the Parent Admin. The primary platform administrator role is permanently protected.',
        };
      }
    }

    if (actingUser.id === targetUser.id && newRole !== 'admin') {
      return {
        success: false,
        message: 'Self-Demotion Guard: You cannot demote your own administrator account. Another admin must perform this action.',
      };
    }

    try {
      // 1. Synchronize to server API and Supabase
      const resp = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRole,
          actingUserId: actingUser.id,
          actingUserRole: actingUser.role,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 403) {
          return {
            success: false,
            message: errorData.error || 'Security Guard: Newly appointed administrators cannot demote the Parent Admin.',
          };
        }
      }
    } catch (e) {
      console.warn('Server role sync notice:', e);
    }

    targetUser.role = newRole;
    targetUser.promotedBy = actingUser.id;
    targetUser.promotedByName = actingUser.displayName;
    targetUser.promotedAt = new Date().toISOString();

    const allUsers = this.getUsers().map((u) =>
      u.id === targetUser.id ? { ...u, role: newRole, promotedBy: actingUser.id, promotedByName: actingUser.displayName, promotedAt: targetUser.promotedAt } : u
    );
    this.cache[STORAGE_KEYS.USERS] = allUsers;

    if (supabase && isSupabaseConfigured()) {
      await supabase.from('users').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', targetUser.id);
    }

    if (newRole === 'agent' || newRole === 'admin') {
      // Purge any customer support conversation belonging to this newly elevated staff member
      const convs = (this.cache[STORAGE_KEYS.CONVERSATIONS] as SupportConversation[] || []).filter(
        (c) => c.customerId !== targetUser.id && (!c.customerEmail || c.customerEmail.toLowerCase() !== targetUser.email.toLowerCase())
      );
      this.cache[STORAGE_KEYS.CONVERSATIONS] = convs;
      this.saveToLocalStorage(STORAGE_KEYS.CONVERSATIONS, convs);

      // Clean up from Supabase PostgreSQL
      if (supabase && isSupabaseConfigured()) {
        (async () => {
          try {
            const { data: userConvs } = await supabase
              .from('conversations')
              .select('id')
              .or(`customer_id.eq.${targetUser.id},customer_email.eq.${targetUser.email}`);
            if (userConvs && userConvs.length > 0) {
              const ids = userConvs.map((c: any) => c.id);
              await supabase.from('messages').delete().in('conversation_id', ids);
              await supabase.from('conversations').delete().in('id', ids);
              console.log(`[Staff Inbox Guard] Purged customer conversation for elevated user ${targetUser.email}`);
            }
          } catch (e) {
            console.warn('Supabase conversation purge error:', e);
          }
        })();
      }
    }

    authSessionService.updateUserProfile(targetUser);

    this.logAudit({
      actorId: actingUser.id,
      actorName: actingUser.displayName,
      actorRole: actingUser.role,
      action: 'USER_ROLE_UPDATED',
      entityType: 'user',
      entityId: targetUser.id,
      details: `Role for ${targetUser.displayName} (${targetUser.email}) changed to ${newRole.toUpperCase()} by ${actingUser.displayName}.`,
    });

    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_role_updated', userId: targetUser.id, newRole } }));
    return {
      success: true,
      message: `Role successfully updated to ${newRole.toUpperCase()} for ${targetUser.displayName}.`,
      user: targetUser,
    };
  }

  public async deleteUserCompletely(
    targetUserId: string,
    actingUser: UserProfile
  ): Promise<{ success: boolean; message: string }> {
    if (actingUser.role !== 'admin') {
      return { success: false, message: 'Access Denied: Only administrators can delete users.' };
    }

    const targetUser = this.getUserById(targetUserId) || this.getUserByEmail(targetUserId);
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    if (this.isProtectedParentAdmin(targetUser.email) || this.isProtectedParentAdmin(targetUser.id)) {
      return { success: false, message: 'Security Guard: Cannot delete the permanent Super/Parent Administrator.' };
    }

    try {
      // 1. Call server API to delete from Supabase Auth and all SQL tables
      const resp = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (!resp.ok) {
        return { success: false, message: data.error || 'Failed to delete user on server.' };
      }

      // 2. Remove from local caches
      const users = this.getUsers().filter((u) => u.id !== targetUser.id && u.email !== targetUser.email);
      this.cache[STORAGE_KEYS.USERS] = users;
      this.saveToLocalStorage(STORAGE_KEYS.USERS, users);

      // Clean wallets
      const wallets = { ...this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, {}) };
      delete wallets[targetUser.id];
      this.cache[STORAGE_KEYS.WALLETS] = wallets;
      this.saveToLocalStorage(STORAGE_KEYS.WALLETS, wallets);

      // Clean game accounts
      const accounts = this.getGameAccounts().filter((a) => a.customerId !== targetUser.id);
      this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = accounts;
      this.saveToLocalStorage(STORAGE_KEYS.GAME_ACCOUNTS, accounts);

      // Clean topups & withdrawals
      const topups = this.getTopUpRequests().filter((t) => t.customerId !== targetUser.id);
      this.cache[STORAGE_KEYS.TOPUPS] = topups;
      this.saveToLocalStorage(STORAGE_KEYS.TOPUPS, topups);

      const withdrawals = this.getWithdrawalRequests().filter((w) => w.customerId !== targetUser.id);
      this.cache[STORAGE_KEYS.WITHDRAWALS] = withdrawals;
      this.saveToLocalStorage(STORAGE_KEYS.WITHDRAWALS, withdrawals);

      // Clean conversations
      const convs = this.getConversations().filter((c) => c.customerId !== targetUser.id);
      this.cache[STORAGE_KEYS.CONVERSATIONS] = convs;
      this.saveToLocalStorage(STORAGE_KEYS.CONVERSATIONS, convs);

      this.logAudit({
        actorId: actingUser.id,
        actorName: actingUser.displayName,
        actorRole: actingUser.role,
        action: 'USER_DELETED',
        entityType: 'user',
        entityId: targetUser.id,
        details: `Administrator ${actingUser.displayName} permanently deleted user ${targetUser.email} (${targetUser.displayName}) and purged all related records.`,
      });

      window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_deleted' } }));
      return { success: true, message: `User ${targetUser.displayName} (${targetUser.email}) and all associated records have been completely purged.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error executing complete user deletion.' };
    }
  }

  public getCmsPolicies(): {
    cashoutPolicyHtml: string;
    privacyPolicyHtml: string;
    termsPolicyHtml: string;
    supportedPartners: Array<{
      id: string;
      platform: 'facebook' | 'instagram' | 'telegram' | 'whatsapp' | 'other';
      label: string;
      url: string;
      active: boolean;
    }>;
  } {
    const config = this.getAppConfig();
    const policies = (config as any).policies || {};
    return {
      cashoutPolicyHtml:
        policies.cashoutPolicyHtml ||
        `<p>All withdrawals require verified identification and prior deposit history through the matching payout channel.</p><p><strong>Important Warning:</strong> Please review your cashtag before submission. Once sent the amount cannot be refunded.</p><p>Standard processing window is 15-45 minutes during operational desk hours.</p>`,
      privacyPolicyHtml:
        policies.privacyPolicyHtml ||
        `<p>Swift Sweeps respects your privacy and complies with industry data security standards. We never sell or share player personal records with unauthorized third parties.</p>`,
      termsPolicyHtml:
        policies.termsPolicyHtml ||
        `<p>Participation in games is restricted to eligible players of legal age in their respective jurisdiction. Wagering and bonus turnover terms apply.</p>`,
      supportedPartners: (config as any).supportedPartners || [
        { id: 'p_fb', platform: 'facebook', label: 'Official Facebook Page', url: 'https://facebook.com', active: true },
        { id: 'p_ig', platform: 'instagram', label: 'Official Instagram Community', url: 'https://instagram.com', active: true },
        { id: 'p_tg', platform: 'telegram', label: 'Official VIP Telegram Channel', url: 'https://t.me', active: true },
      ],
    };
  }

  public updateCmsPolicies(updated: Partial<{
    cashoutPolicyHtml: string;
    privacyPolicyHtml: string;
    termsPolicyHtml: string;
    supportedPartners: any[];
  }>): { success: boolean; message: string } {
    const config = this.getAppConfig();
    (config as any).policies = {
      ...this.getCmsPolicies(),
      ...updated,
    };
    if (updated.supportedPartners) {
      (config as any).supportedPartners = updated.supportedPartners;
    }
    this.save(STORAGE_KEYS.CONFIG, config);
    return { success: true, message: 'Policy & Partner settings saved successfully!' };
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
    emailVerified?: boolean;
    status?: string;
  }): { success: boolean; user?: UserProfile; message?: string } {
    const users = this.getUsers();
    const existing = users.find(
      (u) => (params.id && u.id === params.id) || u.email.toLowerCase() === params.email.toLowerCase() || (params.phone && u.phone === params.phone)
    );
    if (existing) {
      if (params.emailVerified !== undefined) {
        existing.emailVerified = params.emailVerified;
      }
      if (params.displayName) existing.displayName = params.displayName;
      if (params.role) existing.role = params.role;
      if (params.phone) existing.phone = params.phone;
      return { success: true, user: existing, message: 'User already exists, profile synchronized.' };
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
      emailVerified: Boolean(params.emailVerified),
      referralCode: generatedRefCode,
      referredBy,
      status: (params.status as any) || 'active',
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

    // Initial welcome notification (only once per user)
    const welcomeKey = `welcome_shown_${newId}`;
    if (typeof window !== 'undefined' && !localStorage.getItem(welcomeKey)) {
      this.createNotification({
        userId: newId,
        title: 'Welcome to Swift Sweeps',
        message: 'Your gaming wallet and customer support portal are ready.',
        type: 'system',
        linkTab: 'dashboard',
      });
      localStorage.setItem(welcomeKey, 'true');
    }

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

    const w = wallets[customerId];
    // Dynamic reconciliation: Ensure latest top-up metrics are populated from completed top-up history
    if (!w.lastTopUpAmount || w.lastTopUpAmount === 0 || !w.lastTopUpGame) {
      const completedTopups = this.getTopUpRequests(customerId).filter((t) => t.status === 'completed');
      if (completedTopups.length > 0) {
        const latest = completedTopups[0];
        w.lastTopUpAmount = latest.finalWalletCredit || latest.amount;
        if (!w.lastTopUpGame) {
          w.lastTopUpGame = latest.targetGameName || 'Game';
        }
        if (!w.lastTopUpAt) {
          w.lastTopUpAt = latest.updatedAt || latest.createdAt;
        }
      }
    }

    return w;
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

  public getPendingRequests(): Array<TopUpRequest | WithdrawalRequest> {
    const topups = this.getTopUpRequests().filter((t) => t.status === 'pending' || t.status === 'submitted' || t.status === 'verifying');
    const withdrawals = this.getWithdrawalRequests().filter((w) => w.status === 'pending' || w.status === 'submitted' || w.status === 'processing');
    return [...topups, ...withdrawals];
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

    // Calculate eligible bonus accurately based on payment method config
    let bonusPercentage = 0;
    if (pm && pm.bonusPercentage) {
      bonusPercentage = pm.bonusPercentage;
    } else {
      bonusPercentage =
        params.method === 'cashapp' ? 30 :
        params.method === 'crypto' ? 30 :
        params.method === 'payment_link' ? 20 :
        params.method === 'chime' ? 15 : 20;
    }

    const bonusAmount = params.amount > 0 ? Number(((params.amount * bonusPercentage) / 100).toFixed(2)) : 0;
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
    verifiedAmount?: number;
  }): { success: boolean; message: string } {
    const allReqs = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
    const req = allReqs.find((r) => r.id === params.requestId);
    if (!req) return { success: false, message: 'Request not found' };
    if (req.status === 'completed') return { success: false, message: 'Request is already completed (Double credit prevented).' };

    if (!req.bonusPercentage || req.bonusPercentage === 0) {
      req.bonusPercentage =
        req.method === 'cashapp' ? 30 :
        req.method === 'crypto' ? 30 :
        req.method === 'payment_link' ? 20 :
        req.method === 'chime' ? 15 : 20;
    }

    const effectiveVerifiedAmt = (params.verifiedAmount !== undefined && params.verifiedAmount > 0) ? params.verifiedAmount : req.amount;
    req.amount = effectiveVerifiedAmt;
    const bonusPct = req.bonusPercentage || 20;
    req.bonusAmount = Number(((req.amount * bonusPct) / 100).toFixed(2));
    req.finalWalletCredit = Number((req.amount + req.bonusAmount).toFixed(2));

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

    // Direct game account crediting & credential verification
    const allAccounts = this.getGameAccounts();
    const gameAcc = allAccounts.find(
      (a) =>
        a.customerId === req.customerId &&
        (a.gameCatalogId === req.targetGameCatalogId ||
          a.gameName.toLowerCase() === req.targetGameName?.toLowerCase())
    );
    const hasActiveCredentials = Boolean(gameAcc && gameAcc.status === 'active' && gameAcc.username);

    if (hasActiveCredentials && gameAcc) {
      gameAcc.balance = (gameAcc.balance || 0) + req.finalWalletCredit;
      gameAcc.updatedAt = new Date().toISOString();
      this.save(STORAGE_KEYS.GAME_ACCOUNTS, allAccounts);
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
    this.updateChatTransactionStatus(req.id, 'completed', params.reviewerName, params.notes, {
      amount: req.amount,
      bonusAmount: req.bonusAmount,
      finalCredit: req.finalWalletCredit,
    });

    // Dispatch chat confirmation with Game ID & password or reminder
    try {
      const conv = this.getOrCreateConversationForCustomer(req.customerId, req.customerName);
      if (hasActiveCredentials && gameAcc) {
        this.sendChatMessage({
          conversationId: conv.id,
          senderId: params.reviewerId,
          senderName: params.reviewerName,
          senderRole: 'agent',
          text: `🎉 Verified Deposit Approved & Loaded!\n\n💵 Deposit Base: $${req.amount.toFixed(2)}${req.bonusAmount > 0 ? ` (+ $${req.bonusAmount.toFixed(2)} bonus = $${req.finalWalletCredit.toFixed(2)} total credits)` : ''}\n🎯 Target Game: ${req.targetGameName || 'Game'}\n\n🔑 Your Active Game Credentials:\nUsername: "${gameAcc.username}"\nPassword: "${gameAcc.password || '•••••'}"\n\nYour game credits have been loaded. Good luck and have fun!`,
          isInternalNote: false,
        });
      } else {
        this.sendChatMessage({
          conversationId: conv.id,
          senderId: params.reviewerId,
          senderName: params.reviewerName,
          senderRole: 'agent',
          text: `🎉 Verified Deposit Approved & Credited!\n\n💵 Deposit Base: $${req.amount.toFixed(2)}${req.bonusAmount > 0 ? ` (+ $${req.bonusAmount.toFixed(2)} bonus = $${req.finalWalletCredit.toFixed(2)} total credits)` : ''}\n🎯 Target Game: ${req.targetGameName || 'Game'}\n\n⚠️ IMPORTANT ACTION REQUIRED: We noticed you do not have an active Game ID for "${req.targetGameName || 'this game'}" yet.\n👉 Please open your "Game IDs & Passwords" portal and tap "Request Game ID & Password" so our desk can create and provision your credentials right away!`,
          isInternalNote: false,
        });
      }
    } catch (chatErr) {
      console.warn('Top-up approval chat dispatch warning:', chatErr);
    }

    // High-priority Web Push Notification to customer phone / PWA (Messenger style)
    if (typeof window !== 'undefined') {
      webPushClient
        .dispatchPushAlert({
          recipientId: req.customerId,
          recipientRole: 'customer',
          title: '🎉 Deposit Approved & Loaded!',
          body: `$${req.amount.toFixed(2)}${req.bonusAmount > 0 ? ` (+ $${req.bonusAmount.toFixed(2)} bonus = $${req.finalWalletCredit.toFixed(2)} total)` : ''} loaded to ${req.targetGameName || 'your game'}.`,
          url: '/#games',
          tag: `topup_${req.id}`,
          actionType: 'deposit',
        })
        .catch(() => {});
    }

    if (supabase && isSupabaseConfigured()) {
      supabase.from('topups').update({
        status: 'completed',
        amount: req.amount,
        bonus_amount: req.bonusAmount,
        reviewer_id: params.reviewerId,
        reviewer_name: params.reviewerName,
        review_notes: req.reviewNotes,
        updated_at: req.updatedAt,
      }).eq('id', req.id).then(() => {}, (err) => console.warn('Supabase topup approve sync error:', err));

      supabase.from('wallets').update({
        total_deposited: (wallet.availableBalance || 0) + req.amount,
        updated_at: new Date().toISOString(),
      }).eq('customer_id', req.customerId).then(() => {}, (err) => console.warn('Supabase wallet topup sync error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'topup_approved', requestId: req.id } }));

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

    if (supabase && isSupabaseConfigured()) {
      supabase.from('topups').update({
        status: 'rejected',
        reviewer_id: params.reviewerId,
        reviewer_name: params.reviewerName,
        review_notes: params.reason,
        updated_at: req.updatedAt,
      }).eq('id', req.id).then(() => {}, (err) => console.warn('Supabase topup reject sync error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'topup_rejected', requestId: req.id } }));

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
    const isEmailVerified = Boolean(customer?.emailVerified);
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
      });
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
      if (typeof window !== 'undefined') {
        webPushClient
          .dispatchPushAlert({
            recipientId: req.customerId,
            recipientRole: 'customer',
            title: '💸 Payout Sent & Completed!',
            body: `Your cashout of $${req.amount.toFixed(2)} has been sent! ${params.payoutReference ? `Ref: ${params.payoutReference}` : ''}`,
            url: '/#wallet',
            tag: `wdr_comp_${req.id}`,
            actionType: 'payout',
          })
          .catch(() => {});
      }
    } else if (params.newStatus === 'rejected' || params.newStatus === 'cancelled') {
      this.updateChatTransactionStatus(req.id, 'rejected', params.reviewerName, params.note);
    } else if (params.newStatus === 'processing') {
      if (typeof window !== 'undefined') {
        webPushClient
          .dispatchPushAlert({
            recipientId: req.customerId,
            recipientRole: 'customer',
            title: '⏳ Cashout In Processing',
            body: `Your cashout of $${req.amount.toFixed(2)} is being processed by the payout operator.`,
            url: '/#wallet',
            tag: `wdr_proc_${req.id}`,
            actionType: 'payout',
          })
          .catch(() => {});
      }
    }

    if (supabase && isSupabaseConfigured()) {
      supabase.from('withdrawals').update({
        status: params.newStatus,
        reviewer_id: params.reviewerId,
        reviewer_name: params.reviewerName,
        review_notes: req.reviewNotes,
        transaction_hash: req.payoutReference,
        updated_at: req.updatedAt,
      }).eq('id', req.id).then(() => {}, (err) => console.warn('Supabase withdrawal status sync error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'withdrawal_updated', requestId: req.id } }));

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

    // Persist to Supabase if configured
    try {
      if (supabase) {
        supabase
          .from('game_catalog')
          .upsert({
            id: savedItem.id,
            title: savedItem.title,
            platform: savedItem.platform,
            enabled: savedItem.enabled,
          })
          .then(
            () => {},
            (err) => console.warn('Supabase game_catalog sync notice:', err)
          );
      }
    } catch {}

    return savedItem;
  }

  public async deleteGameCatalogItem(gameId: string, actorId: string, actorName: string): Promise<void> {
    const list = this.getGameCatalog();
    const target = list.find((g) => g.id === gameId);
    const updated = list.filter((g) => g.id !== gameId);
    this.cache[STORAGE_KEYS.GAME_CATALOG] = updated;
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.GAME_CATALOG } }));

    // Delete from Supabase if configured
    try {
      if (supabase) {
        supabase.from('game_catalog').delete().eq('id', gameId).then(
          () => {},
          () => {}
        );
      }
    } catch {}

    this.logAudit({
      actorId,
      actorName,
      actorRole: 'admin',
      action: 'GAME_CATALOG_DELETED',
      entityType: 'settings',
      entityId: gameId,
      details: `Admin removed game "${target?.title || gameId}" from platform catalog and Supabase.`,
    });
  }

  /**
   * Enforces the fundamental invariant: A user CANNOT have multiple IDs for the same game.
   * Exactly 1 GameAccount per game per customer.
   * If duplicates exist, merges them:
   * - Consolidates game credit balances so player never loses funds.
   * - Prefers the active account with real credentials.
   * - Replaces duplicate rows with the single canonical account.
   */
  public deduplicateGameAccounts(accounts: GameAccount[]): GameAccount[] {
    if (!Array.isArray(accounts)) return [];

    // Group accounts per customerId
    const customerMap = new Map<string, GameAccount[]>();
    for (const a of accounts) {
      if (!a || !a.customerId) continue;
      const list = customerMap.get(a.customerId) || [];
      list.push(a);
      customerMap.set(a.customerId, list);
    }

    const cleanedAccounts: GameAccount[] = [];

    for (const [, userAccList] of customerMap.entries()) {
      // Buckets of distinct games for this customer
      const gameBuckets: GameAccount[] = [];

      for (const candidate of userAccList) {
        const candCatalog = candidate.gameCatalogId?.trim().toLowerCase() || '';
        const candTitle = candidate.gameName?.trim().toLowerCase() || '';

        // Match if catalog ID matches or game name matches
        const existingIdx = gameBuckets.findIndex((b) => {
          const bCatalog = b.gameCatalogId?.trim().toLowerCase() || '';
          const bTitle = b.gameName?.trim().toLowerCase() || '';
          if (candCatalog && bCatalog && candCatalog === bCatalog) return true;
          if (candTitle && bTitle && candTitle === bTitle) return true;
          return false;
        });

        if (existingIdx === -1) {
          gameBuckets.push({ ...candidate });
        } else {
          // Merge duplicates into the single bucket
          const existing = gameBuckets[existingIdx];
          const candIsActive = candidate.status === 'active' && Boolean(candidate.username) && candidate.username !== 'Pending Assignment';
          const existIsActive = existing.status === 'active' && Boolean(existing.username) && existing.username !== 'Pending Assignment';

          const primary = (candIsActive && !existIsActive) ? candidate : existing;
          const secondary = (primary === candidate) ? existing : candidate;

          const mergedBalance = Number(((existing.balance || 0) + (candidate.balance || 0)).toFixed(2));
          const bestUsername = (primary.username && primary.username !== 'Pending Assignment')
            ? primary.username
            : (secondary.username && secondary.username !== 'Pending Assignment')
            ? secondary.username
            : primary.username;

          const bestPassword = primary.password || secondary.password || '';
          const bestStatus: GameAccountStatus = (primary.status === 'active' || secondary.status === 'active') ? 'active' : primary.status;

          gameBuckets[existingIdx] = {
            ...primary,
            id: existing.id, // Preserve stable ID
            balance: mergedBalance,
            username: bestUsername,
            password: bestPassword,
            status: bestStatus,
            gameCatalogId: primary.gameCatalogId || secondary.gameCatalogId,
            gameName: primary.gameName || secondary.gameName,
            platformName: primary.platformName || secondary.platformName,
            notes: primary.notes || secondary.notes,
            updatedAt: new Date().toISOString(),
          };
        }
      }

      cleanedAccounts.push(...gameBuckets);
    }

    return cleanedAccounts;
  }

  // Player Game IDs & Credentials (Fixed games, handled by Customer Support)
  public getGameAccounts(customerId?: string): GameAccount[] {
    const rawList = this.load<GameAccount[]>(STORAGE_KEYS.GAME_ACCOUNTS, INITIAL_GAME_ACCOUNTS);
    const cleaned = this.deduplicateGameAccounts(rawList);
    // If raw list had duplicates, self-heal immediately
    if (cleaned.length !== rawList.length) {
      this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = cleaned;
      this.saveToLocalStorage(STORAGE_KEYS.GAME_ACCOUNTS, cleaned);
    }
    if (customerId) return cleaned.filter((g) => g.customerId === customerId);
    return cleaned;
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
    const existing = accounts.find(
      (a) =>
        a.customerId === params.customerId &&
        (a.gameCatalogId === params.gameCatalogId || a.gameName.toLowerCase().trim() === game.title.toLowerCase().trim())
    );

    if (existing && existing.status === 'active') {
      return {
        success: false,
        message: `You already have active credentials for ${game.title} (Username: ${existing.username}). Only 1 ID per game is permitted.`,
      };
    }

    if (existing && (existing.status === 'pending_assignment' || existing.status === 'pending_reset')) {
      return { success: false, message: `A request for ${game.title} is already queued for Customer Support.` };
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

  // Authoritative Provisioning / Updating of a Player's Game Credentials
  // Guarantees: Strictly 1 Game ID per game per user
  public provisionGameAccount(params: {
    customerId: string;
    customerName?: string;
    gameCatalogId: string;
    gameName?: string;
    platformName?: string;
    gameUrl?: string;
    username: string;
    password?: string;
    notes?: string;
    reviewerId: string;
    reviewerName: string;
    status?: GameAccountStatus;
  }): { success: boolean; message: string; account: GameAccount } {
    const catalog = this.getGameCatalog();
    const game = catalog.find((g) => g.id === params.gameCatalogId);
    const gameTitle = game?.title || params.gameName || 'Game';
    const platform = game?.platform || params.platformName || 'Sweepstakes';
    const gameUrl = game?.gameUrl || params.gameUrl || '';

    const allAccounts = this.getGameAccounts();
    const existing = allAccounts.find(
      (a) =>
        a.customerId === params.customerId &&
        ((params.gameCatalogId && a.gameCatalogId === params.gameCatalogId) ||
          a.gameName.toLowerCase().trim() === gameTitle.toLowerCase().trim())
    );

    const now = new Date().toISOString();
    let targetAccount: GameAccount;

    if (existing) {
      // Update existing single account
      existing.username = params.username.trim();
      if (params.password) existing.password = params.password.trim();
      existing.status = params.status || 'active';
      existing.requestType = undefined;
      existing.assignedByAgentId = params.reviewerId;
      existing.assignedByAgentName = params.reviewerName;
      if (params.notes) existing.notes = params.notes;
      existing.updatedAt = now;
      targetAccount = existing;
    } else {
      // Create new single account
      targetAccount = {
        id: `ga_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gameCatalogId: params.gameCatalogId,
        customerId: params.customerId,
        gameName: gameTitle,
        platformName: platform,
        username: params.username.trim(),
        password: params.password ? params.password.trim() : undefined,
        gameUrl,
        status: params.status || 'active',
        balance: 0,
        notes: params.notes,
        assignedByAgentId: params.reviewerId,
        assignedByAgentName: params.reviewerName,
        createdAt: now,
        updatedAt: now,
      };
      allAccounts.unshift(targetAccount);
    }

    const deduplicated = this.deduplicateGameAccounts(allAccounts);
    this.save(STORAGE_KEYS.GAME_ACCOUNTS, deduplicated);

    // Notify player in chat & notification
    const conv = this.getOrCreateConversationForCustomer(
      params.customerId,
      params.customerName || this.getUserById(params.customerId)?.displayName || 'Player'
    );
    this.sendChatMessage({
      conversationId: conv.id,
      senderId: params.reviewerId,
      senderName: params.reviewerName,
      senderRole: 'agent',
      text: `🎮 Credentials Configured for "${gameTitle}" (${platform})!\n• Username: "${params.username.trim()}"\n• Password: "${params.password ? params.password.trim() : '•••••'}"\nYour credentials are active in your Gaming IDs portal.`,
      isInternalNote: false,
    });

    this.createNotification({
      userId: params.customerId,
      title: 'Game Credentials Configured',
      message: `Login credentials configured for ${gameTitle}. Username: ${params.username.trim()}`,
      type: 'game_account',
      linkTab: 'game_accounts',
    });

    this.logAudit({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'agent',
      action: 'GAME_CREDENTIALS_ASSIGNED',
      entityType: 'game_account',
      entityId: targetAccount.id,
      details: `${existing ? 'Updated' : 'Assigned'} credentials for ${gameTitle} (User: ${params.username.trim()}) for player ${params.customerId}. Enforced 1 ID per game rule.`,
    });

    if (supabase && isSupabaseConfigured()) {
      supabase.from('game_accounts').upsert({
        id: targetAccount.id,
        customer_id: targetAccount.customerId,
        game_id: targetAccount.gameCatalogId,
        game_title: targetAccount.gameName,
        username: targetAccount.username,
        password: targetAccount.password || '',
        pin: targetAccount.notes || null,
        status: targetAccount.status,
        created_at: targetAccount.createdAt,
        updated_at: targetAccount.updatedAt,
      }).then(() => {}, (err) => console.warn('Supabase game account upsert sync error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'game_account_provisioned', accountId: targetAccount.id } }));

    return {
      success: true,
      message: existing
        ? `Updated credentials for ${gameTitle}. Player's single ID maintained.`
        : `Successfully provisioned credentials for ${gameTitle}. Player notified.`,
      account: targetAccount,
    };
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

    const deduplicated = this.deduplicateGameAccounts(accounts);
    this.save(STORAGE_KEYS.GAME_ACCOUNTS, deduplicated);

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

    if (typeof window !== 'undefined') {
      webPushClient
        .dispatchPushAlert({
          recipientId: acc.customerId,
          recipientRole: 'customer',
          title: '🔑 Game Credentials Assigned!',
          body: `Your login for ${acc.gameName} is ready (Username: ${acc.username}). Tap to view and start playing!`,
          url: '/#games',
          tag: `game_acc_${acc.id}`,
          actionType: 'game',
        })
        .catch(() => {});
    }

    this.logAudit({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'agent',
      action: 'GAME_CREDENTIALS_ASSIGNED',
      entityType: 'game_account',
      entityId: acc.id,
      details: `Support specialist ${params.reviewerName} configured credentials for ${acc.gameName} (User: ${acc.username}). Single ID per game enforced.`,
    });

    if (supabase && isSupabaseConfigured()) {
      supabase.from('game_accounts').update({
        username: acc.username,
        password: acc.password,
        status: acc.status,
        pin: acc.notes || null,
        updated_at: acc.updatedAt,
      }).eq('id', acc.id).then(() => {}, (err) => console.warn('Supabase game account assign sync error:', err));
    }
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'game_credentials_assigned', accountId: acc.id } }));

    return { success: true, message: `Successfully assigned credentials for ${acc.gameName}. Player notified.` };
  }

  // Delete a game account
  public deleteGameAccount(
    accountId: string,
    actorId?: string,
    actorName?: string
  ): { success: boolean; message: string } {
    const all = this.getGameAccounts();
    const target = all.find((a) => a.id === accountId);
    if (!target) return { success: false, message: 'Game account not found.' };

    const remaining = all.filter((a) => a.id !== accountId);
    this.save(STORAGE_KEYS.GAME_ACCOUNTS, remaining);

    this.logAudit({
      actorId: actorId || 'system',
      actorName: actorName || 'System',
      actorRole: 'admin',
      action: 'GAME_ACCOUNT_DELETED',
      entityType: 'game_account',
      entityId: accountId,
      details: `Deleted game account ID "${target.username}" for game "${target.gameName}" (Customer: ${target.customerId}).`,
    });

    return { success: true, message: `Successfully deleted game account for ${target.gameName}.` };
  }

  // Data Migration for user account ID reconciliation (e.g. Supabase recreation / session matching)
  public migrateUserEntityIds(oldId: string, newId: string): void {
    if (!oldId || !newId || oldId === newId) return;
    console.log(`[SwiftSweeps] Migrating user data from old ID ${oldId} to canonical ID ${newId}`);

    // 1. Users
    const users = this.getUsers();
    let usersUpdated = false;
    for (const u of users) {
      if (u.id === oldId) {
        u.id = newId;
        usersUpdated = true;
      }
    }
    if (usersUpdated) {
      this.cache[STORAGE_KEYS.USERS] = users;
      this.saveToLocalStorage(STORAGE_KEYS.USERS, users);
    }

    // 2. Wallets
    const wallets = this.load<Record<string, UserWallet>>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    if (wallets[oldId]) {
      wallets[newId] = {
        ...wallets[oldId],
        customerId: newId,
      };
      delete wallets[oldId];
      this.cache[STORAGE_KEYS.WALLETS] = wallets;
      this.saveToLocalStorage(STORAGE_KEYS.WALLETS, wallets);
    }

    // 3. Conversations
    const convs = this.getConversations();
    let convsUpdated = false;
    for (const c of convs) {
      if (c.customerId === oldId) {
        c.customerId = newId;
        convsUpdated = true;
      }
    }
    if (convsUpdated) {
      this.cache[STORAGE_KEYS.CONVERSATIONS] = convs;
      this.saveToLocalStorage(STORAGE_KEYS.CONVERSATIONS, convs);
    }

    // 4. Messages
    const msgs = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    let msgsUpdated = false;
    for (const convId of Object.keys(msgs)) {
      for (const m of msgs[convId]) {
        if (m.senderId === oldId) {
          m.senderId = newId;
          msgsUpdated = true;
        }
      }
    }
    if (msgsUpdated) {
      this.cache[STORAGE_KEYS.MESSAGES] = msgs;
      this.saveToLocalStorage(STORAGE_KEYS.MESSAGES, msgs);
    }

    // 5. Game Accounts
    const accounts = this.load<GameAccount[]>(STORAGE_KEYS.GAME_ACCOUNTS, INITIAL_GAME_ACCOUNTS);
    let accountsUpdated = false;
    for (const a of accounts) {
      if (a.customerId === oldId) {
        a.customerId = newId;
        accountsUpdated = true;
      }
    }
    if (accountsUpdated) {
      this.cache[STORAGE_KEYS.GAME_ACCOUNTS] = accounts;
      this.saveToLocalStorage(STORAGE_KEYS.GAME_ACCOUNTS, accounts);
    }

    // 6. Top-Ups & Withdrawals
    const topups = this.load<TopUpRequest[]>(STORAGE_KEYS.TOPUPS, INITIAL_TOPUPS);
    let topupsUpdated = false;
    for (const t of topups) {
      if (t.customerId === oldId) {
        t.customerId = newId;
        topupsUpdated = true;
      }
    }
    if (topupsUpdated) {
      this.cache[STORAGE_KEYS.TOPUPS] = topups;
      this.saveToLocalStorage(STORAGE_KEYS.TOPUPS, topups);
    }

    const withdrawals = this.load<WithdrawalRequest[]>(STORAGE_KEYS.WITHDRAWALS, INITIAL_WITHDRAWALS);
    let wdrUpdated = false;
    for (const w of withdrawals) {
      if (w.customerId === oldId) {
        w.customerId = newId;
        wdrUpdated = true;
      }
    }
    if (wdrUpdated) {
      this.cache[STORAGE_KEYS.WITHDRAWALS] = withdrawals;
      this.saveToLocalStorage(STORAGE_KEYS.WITHDRAWALS, withdrawals);
    }

    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_migrated' } }));
  }

  // Real-Time Chat & Customer Support Center (Invariant: Strictly 1 persistent conversation per customer)
  public resolveCanonicalConvId(convId: string): string {
    if (!convId) return '';
    return this.conversationAliasMap.get(convId) || convId;
  }

  private getCustomerGroupKey(c: SupportConversation): string {
    const user = this.getUserById(c.customerId) || (c.customerEmail ? this.getUsers().find((u) => u.email.toLowerCase() === c.customerEmail?.toLowerCase()) : undefined);
    if (user) {
      return `usr_${user.id}`;
    }
    if (c.customerEmail && c.customerEmail.trim()) {
      return `email_${c.customerEmail.trim().toLowerCase()}`;
    }
    if (c.customerId && c.customerId.trim()) {
      return `id_${c.customerId.trim().toLowerCase()}`;
    }
    if (c.customerName && c.customerName.trim()) {
      return `name_${c.customerName.trim().toLowerCase()}`;
    }
    return `conv_${c.id}`;
  }

  public deduplicateAndMergeConversations(rawList?: SupportConversation[]): SupportConversation[] {
    const list = rawList || (this.cache[STORAGE_KEYS.CONVERSATIONS] as SupportConversation[]) || [];
    if (!Array.isArray(list) || list.length === 0) return [];

    const messagesDict = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    let messagesUpdated = false;

    // Group conversations by customer
    const groups = new Map<string, SupportConversation[]>();
    for (const c of list) {
      const key = this.getCustomerGroupKey(c);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(c);
    }

    const deduplicated: SupportConversation[] = [];
    const duplicateIdsToDeleteInDb: string[] = [];
    const messagesToReassignInDb: { fromIds: string[]; toId: string }[] = [];

    for (const [, convs] of groups.entries()) {
      if (convs.length === 1) {
        deduplicated.push(convs[0]);
        continue;
      }

      // Multiple conversations found for this single customer: prefer thread with messages, then earliest created
      convs.sort((a, b) => {
        const countA = (messagesDict[a.id] || []).length;
        const countB = (messagesDict[b.id] || []).length;
        if (countA !== countB) return countB - countA;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      const canonical = { ...convs[0] };
      const duplicates = convs.slice(1);
      const dupIds: string[] = [];

      // Collect all messages across canonical and duplicates
      const canonicalMsgs: ChatMessage[] = [...(messagesDict[canonical.id] || [])];

      let maxUnreadStaff = canonical.unreadCountStaff || 0;
      let maxUnreadCustomer = canonical.unreadCountCustomer || 0;
      let hasOpenStatus = canonical.status === 'open';

      for (const dup of duplicates) {
        dupIds.push(dup.id);
        this.conversationAliasMap.set(dup.id, canonical.id);

        if (dup.status === 'open') hasOpenStatus = true;
        maxUnreadStaff = Math.max(maxUnreadStaff, dup.unreadCountStaff || 0);
        maxUnreadCustomer = Math.max(maxUnreadCustomer, dup.unreadCountCustomer || 0);

        const dupMsgs = messagesDict[dup.id] || [];
        if (dupMsgs.length > 0) {
          for (const m of dupMsgs) {
            canonicalMsgs.push({
              ...m,
              conversationId: canonical.id,
            });
          }
          delete messagesDict[dup.id];
          messagesUpdated = true;
        }
      }

      // Deduplicate messages by id and sort chronologically
      const seenMsgIds = new Set<string>();
      const cleanMsgs: ChatMessage[] = [];
      for (const m of canonicalMsgs) {
        if (!seenMsgIds.has(m.id)) {
          seenMsgIds.add(m.id);
          cleanMsgs.push(m);
        }
      }
      cleanMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      messagesDict[canonical.id] = cleanMsgs;
      messagesUpdated = true;

      // Update canonical conversation attributes
      canonical.status = hasOpenStatus ? 'open' : canonical.status;
      canonical.unreadCountStaff = maxUnreadStaff;
      canonical.unreadCountCustomer = maxUnreadCustomer;

      if (cleanMsgs.length > 0) {
        const lastMsg = cleanMsgs[cleanMsgs.length - 1];
        canonical.lastMessageText = lastMsg.text || canonical.lastMessageText;
        canonical.lastMessageTimestamp = lastMsg.createdAt || canonical.lastMessageTimestamp;
        canonical.updatedAt = lastMsg.createdAt || canonical.updatedAt;
      }

      // Reconcile user profile if available
      const user = this.getUserById(canonical.customerId) || (canonical.customerEmail ? this.getUsers().find((u) => u.email.toLowerCase() === canonical.customerEmail?.toLowerCase()) : undefined);
      if (user) {
        canonical.customerId = user.id;
        canonical.customerName = user.displayName;
        canonical.customerEmail = user.email;
      }

      // Invariant: Support agents and administrators must never have customer support tickets
      if (user && (user.role === 'agent' || user.role === 'admin')) {
        duplicateIdsToDeleteInDb.push(canonical.id, ...dupIds);
        delete messagesDict[canonical.id];
        messagesUpdated = true;
        continue;
      }

      deduplicated.push(canonical);
      duplicateIdsToDeleteInDb.push(...dupIds);
      messagesToReassignInDb.push({ fromIds: dupIds, toId: canonical.id });
    }

    if (messagesUpdated) {
      this.cache[STORAGE_KEYS.MESSAGES] = messagesDict;
      this.saveToLocalStorage(STORAGE_KEYS.MESSAGES, messagesDict);
    }

    deduplicated.sort(
      (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    this.cache[STORAGE_KEYS.CONVERSATIONS] = deduplicated;
    this.saveToLocalStorage(STORAGE_KEYS.CONVERSATIONS, deduplicated);

    // Asynchronously update Supabase database to maintain single persistent thread invariant
    if (duplicateIdsToDeleteInDb.length > 0 && supabase && isSupabaseConfigured()) {
      (async () => {
        try {
          for (const item of messagesToReassignInDb) {
            if (item.fromIds.length > 0) {
              await supabase
                .from('messages')
                .update({ conversation_id: item.toId })
                .in('conversation_id', item.fromIds);
            }
          }
          await supabase
            .from('messages')
            .delete()
            .in('conversation_id', duplicateIdsToDeleteInDb);
          await supabase
            .from('conversations')
            .delete()
            .in('id', duplicateIdsToDeleteInDb);
        } catch (dbErr) {
          console.warn('[SwiftSweeps] Supabase conversation consolidation sync notice:', dbErr);
        }
      })();
    }

    return deduplicated;
  }

  public hydrateForSession(user?: UserProfile): void {
    const activeSession = authSessionService.getActiveSession();
    const sessionUser = activeSession ? ({
      id: activeSession.userId,
      email: activeSession.email,
      displayName: activeSession.displayName,
      role: activeSession.role,
    } as any) : null;
    const target = user || this.getCurrentUser() || sessionUser;
    if (target?.role === 'admin' || target?.role === 'agent') {
      this.initialCompactLoad();
    }
  }

  public async fetchConversations(): Promise<SupportConversation[]> {
    if (!supabase || !isSupabaseConfigured()) {
      return this.getConversations();
    }
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        this.applyConversationRows(data, false);
        window.dispatchEvent(
          new CustomEvent('aetherpay_state_changed', {
            detail: { key: 'conversations_fetched', count: data.length },
          })
        );
      }
      return this.getConversations();
    } catch (err) {
      console.warn('[DataService] fetchConversations notice:', err);
      return this.getConversations();
    }
  }

  public getConversations(): SupportConversation[] {
    const raw = this.load<SupportConversation[]>(STORAGE_KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS);
    const deduplicated = this.deduplicateAndMergeConversations(raw);
    const currentUser = this.getCurrentUser();
    return deduplicated.filter((c) => {
      const u = this.getUserById(c.customerId) || (c.customerEmail ? this.getUserByEmail(c.customerEmail) : undefined);
      if (u && (u.role === 'agent' || u.role === 'admin')) return false;
      if (currentUser && (currentUser.role === 'agent' || currentUser.role === 'admin')) {
        if (c.customerId === currentUser.id || (c.customerEmail && c.customerEmail.toLowerCase() === currentUser.email?.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  public getOrCreateConversationForCustomer(customerId: string, customerName: string): SupportConversation {
    const user = this.getUserById(customerId) || this.getUserByEmail(customerId);
    if (user && (user.role === 'agent' || user.role === 'admin')) {
      // Support staff accounts must not have active player support channels
      return {
        id: `conv_${customerId}`,
        customerId,
        customerName: user.displayName || customerName,
        customerEmail: user.email,
        assignedAgentId: null,
        assignedAgentName: 'Live Support Desk',
        status: 'closed',
        lastMessageText: '',
        lastMessageTimestamp: new Date().toISOString(),
        unreadCountCustomer: 0,
        unreadCountStaff: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const list = this.getConversations();
    const userEmail = user?.email?.toLowerCase();
    const cleanCustomerName = customerName?.trim().toLowerCase();

    // 1. First look by customerId
    let conv = list.find((c) => c.customerId === customerId);

    // 2. If not found by ID, look by email (handles ID migrations / account recreation)
    if (!conv && userEmail) {
      conv = list.find((c) => c.customerEmail && c.customerEmail.toLowerCase() === userEmail);
    }

    // 3. Look by customer name
    if (!conv && cleanCustomerName) {
      conv = list.find((c) => c.customerName && c.customerName.trim().toLowerCase() === cleanCustomerName);
    }

    // 4. Look by conv ID alias (e.g. conv_haude_maxe)
    if (!conv && cleanCustomerName) {
      const idAlias = `conv_${cleanCustomerName.replace(/\s+/g, '_')}`;
      conv = list.find((c) => c.id.toLowerCase() === idAlias);
    }

    // 5. Look if any registered user has matching name/id to link
    if (!conv && user) {
      conv = list.find((c) => {
        const cUser = this.getUserById(c.customerId);
        return cUser && cUser.id === user.id;
      });
    }

    // 6. Look by deterministic canonical ID
    if (!conv) {
      conv = list.find((c) => c.id === `conv_${customerId}`);
    }

    if (conv) {
      let needsSave = false;
      if (conv.customerId !== customerId) {
        conv.customerId = customerId;
        needsSave = true;
      }
      if (user?.displayName && conv.customerName !== user.displayName) {
        conv.customerName = user.displayName;
        needsSave = true;
      }
      if (user?.email && conv.customerEmail !== user.email) {
        conv.customerEmail = user.email;
        needsSave = true;
      }
      if (needsSave) {
        this.save(STORAGE_KEYS.CONVERSATIONS, list);
      }
    }

    if (!conv) {
      const canonicalId = `conv_${customerId}`;
      conv = {
        id: canonicalId,
        customerId,
        customerName: user?.displayName || customerName,
        customerEmail: user?.email || `${customerId}@user.com`,
        assignedAgentId: null,
        assignedAgentName: 'Live Support Desk',
        status: 'open',
        lastMessageText: '',
        lastMessageTimestamp: new Date().toISOString(),
        unreadCountCustomer: 0,
        unreadCountStaff: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(conv);
      this.save(STORAGE_KEYS.CONVERSATIONS, list);
    }

    // Ensure conversation is immediately recorded in Supabase PostgreSQL
    if (supabase && isSupabaseConfigured()) {
      supabase
        .from('conversations')
        .upsert({
          id: conv.id,
          customer_id: conv.customerId,
          customer_name: conv.customerName,
          agent_id: conv.assignedAgentId || null,
          agent_name: conv.assignedAgentName || null,
          status: conv.status,
          last_message: conv.lastMessageText,
          last_message_at: conv.lastMessageTimestamp,
          created_at: conv.createdAt,
        })
        .then(
          () => {},
          (err) => console.warn('Supabase conv sync notice:', err)
        );
    }

    return conv;
  }

  public getMessages(conversationId: string): ChatMessage[] {
    const targetId = this.resolveCanonicalConvId(conversationId);
    const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    const rawList = all[targetId] || all[conversationId] || [];

    // Unconditionally filter out automated greetings and canned bot messages
    return rawList.filter((m) => {
      if (!m.text) return true;
      const text = m.text.toLowerCase();
      const isBotGreeting =
        text.includes('welcome to swift sweeps support') ||
        text.includes('treasury and gaming care specialists assist you today') ||
        (m.senderName === 'Sarah Lin' && text.includes('welcome'));
      return !isBotGreeting;
    });
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
    const targetConvId = this.resolveCanonicalConvId(params.conversationId);
    const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    if (!all[targetConvId]) {
      all[targetConvId] = [];
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
      conversationId: targetConvId,
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

    all[targetConvId].push(newMsg);
    this.save(STORAGE_KEYS.MESSAGES, all);

    // Update conversation summary
    const conversations = this.getConversations();
    const conv = conversations.find((c) => c.id === targetConvId);
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

    // Broadcast live via Supabase Realtime (both room-specific and staff channel)
    try {
      if (supabase && isSupabaseConfigured()) {
        // 1. Room specific broadcast
        const channel = supabase.channel(`room_${targetConvId}`);
        if ((channel as any).state === 'joined') {
          channel
            .send({
              type: 'broadcast',
              event: 'new_chat_message',
              payload: newMsg,
            })
            .catch((err) => console.warn('Realtime broadcast notice:', err));
        } else {
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channel
                .send({
                  type: 'broadcast',
                  event: 'new_chat_message',
                  payload: newMsg,
                })
                .catch(() => {});
            }
          });
        }

        // 2. Global staff admin notification channel
        const staffChannel = supabase.channel('room_admin_support');
        if ((staffChannel as any).state === 'joined') {
          staffChannel
            .send({
              type: 'broadcast',
              event: 'new_chat_message',
              payload: newMsg,
            })
            .catch(() => {});
        } else {
          staffChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              staffChannel
                .send({
                  type: 'broadcast',
                  event: 'new_chat_message',
                  payload: newMsg,
                })
                .catch(() => {});
            }
          });
        }

        // 3. Persist to messages table with correct PostgreSQL schema columns (content, not text)
        supabase
          .from('messages')
          .upsert({
            id: newMsg.id,
            conversation_id: newMsg.conversationId,
            sender_id: newMsg.senderId,
            sender_name: newMsg.senderName,
            sender_role: newMsg.senderRole,
            content: newMsg.text,
            transaction_data: newMsg.transactionData || null,
            created_at: newMsg.createdAt,
          })
          .then(
            () => {},
            (err) => console.warn('Supabase message persist notice:', err)
          );
      }
    } catch (e) {
      console.warn('Realtime chat dispatch notice:', e);
    }

    // Zero-Egress Telegram Alert: send customer name when a customer posts a message (debounced on server)
    if (params.senderRole === 'customer') {
      try {
        fetch('/api/telegram/notify-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: params.senderName || 'Customer',
            conversationId: targetConvId,
          }),
        }).catch((err) => console.warn('Telegram notify-message notice:', err));
      } catch (err) {
        console.warn('Telegram notify dispatch notice:', err);
      }
    }

    // Instant Web Push Notification: delivers alerts even when browser is minimized or app is closed
    if (!params.isInternalNote && typeof window !== 'undefined') {
      try {
        const recipientRole = params.senderRole === 'customer' ? 'agent' : 'customer';
        const recipientId =
          params.senderRole === 'customer'
            ? conv?.assignedAgentId || 'staff'
            : conv?.customerId || '';

        if (recipientId) {
          webPushClient
            .notifyRecipientViaPush({
              recipientId,
              recipientRole,
              senderName: params.senderName,
              messageText: params.text,
              conversationId: targetConvId,
            })
            .catch((err) => console.warn('Background push dispatch notice:', err));
        }
      } catch (err) {
        console.warn('Push notify dispatch notice:', err);
      }
    }

    window.dispatchEvent(
      new CustomEvent('aetherpay_state_changed', {
        detail: { key: 'chat_message', message: newMsg, conversationId: targetConvId },
      })
    );

    return newMsg;
  }

  public appendIncomingMessage(msg: ChatMessage): void {
    if (!msg || !msg.conversationId || !msg.id) return;
    const targetConvId = this.resolveCanonicalConvId(msg.conversationId);
    msg.conversationId = targetConvId;

    const all = this.load<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES);
    if (!all[targetConvId]) {
      all[targetConvId] = [];
    }
    if (!all[targetConvId].some((m) => m.id === msg.id)) {
      all[targetConvId].push(msg);
      this.cache[STORAGE_KEYS.MESSAGES] = all;
      this.saveToLocalStorage(STORAGE_KEYS.MESSAGES, all);

      // Also ensure conversation summary has latest message and increment unread counts
      const conversations = this.getConversations();
      const conv = conversations.find((c) => c.id === targetConvId);
      if (conv) {
        if (!msg.isInternalNote) {
          conv.lastMessageText = msg.text;
        }
        conv.lastMessageTimestamp = msg.createdAt;
        conv.updatedAt = msg.createdAt;
        if (msg.senderRole === 'customer') {
          conv.unreadCountStaff = (conv.unreadCountStaff || 0) + 1;
        } else if (!msg.isInternalNote) {
          conv.unreadCountCustomer = (conv.unreadCountCustomer || 0) + 1;
        }
        this.save(STORAGE_KEYS.CONVERSATIONS, conversations);
      }

      window.dispatchEvent(
        new CustomEvent('aetherpay_state_changed', {
          detail: { key: 'chat_incoming', message: msg, conversationId: targetConvId },
        })
      );
    }
  }

  public updateChatTransactionStatus(
    requestId: string,
    status: 'completed' | 'rejected',
    reviewerName: string,
    notes?: string,
    updatedValues?: { amount?: number; bonusAmount?: number; finalCredit?: number }
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
          if (updatedValues) {
            if (updatedValues.amount !== undefined) msg.transactionData.amount = updatedValues.amount;
            if (updatedValues.bonusAmount !== undefined) msg.transactionData.bonusAmount = updatedValues.bonusAmount;
            if (updatedValues.finalCredit !== undefined) msg.transactionData.finalCredit = updatedValues.finalCredit;
          }
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
    const targetConvId = this.resolveCanonicalConvId(conversationId);
    const conversations = this.getConversations();
    const conv = conversations.find((c) => c.id === targetConvId);
    if (conv) {
      if (role === 'customer') conv.unreadCountCustomer = 0;
      else conv.unreadCountStaff = 0;
      this.save(STORAGE_KEYS.CONVERSATIONS, conversations);
      window.dispatchEvent(
        new CustomEvent('aetherpay_state_changed', {
          detail: { key: 'chat_read', conversationId: targetConvId, role },
        })
      );
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
    const isEmailVerified = customer.emailVerified === true;
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
      cfg.cashoutFeed = { ...INITIAL_CONFIG.cashoutFeed };
      dirty = true;
    } else {
      if (cfg.cashoutFeed.enabled === undefined) {
        cfg.cashoutFeed.enabled = true;
        dirty = true;
      }
      if (!cfg.cashoutFeed.namesPool || cfg.cashoutFeed.namesPool.length === 0) {
        cfg.cashoutFeed.namesPool = [...INITIAL_CONFIG.cashoutFeed.namesPool];
        dirty = true;
      }
      if (!cfg.cashoutFeed.probableAmounts || cfg.cashoutFeed.probableAmounts.length === 0) {
        cfg.cashoutFeed.probableAmounts = [...INITIAL_CONFIG.cashoutFeed.probableAmounts];
        dirty = true;
      }
      if (!cfg.cashoutFeed.minAmount) {
        cfg.cashoutFeed.minAmount = 50;
        dirty = true;
      }
      if (!cfg.cashoutFeed.maxAmount) {
        cfg.cashoutFeed.maxAmount = 250;
        dirty = true;
      }
    }
    if (dirty) {
      this.save(STORAGE_KEYS.CONFIG, cfg);
    }
    return cfg;
  }

  public updateAppConfig(newConfig: AppConfig, actorId?: string, actorName?: string): void {
    this.save(STORAGE_KEYS.CONFIG, newConfig);
    if (actorId && actorName) {
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

  // Real-Time Mixed Cashouts Feed (Real + Admin-Configured Fake Pool)
  public getFakedCashouts(): CashoutFeedItem[] {
    return this.load<CashoutFeedItem[]>(STORAGE_KEYS.FAKED_CASHOUTS, []);
  }

  public saveFakedCashouts(items: CashoutFeedItem[]): void {
    this.cache[STORAGE_KEYS.FAKED_CASHOUTS] = items;
    this.saveToLocalStorage(STORAGE_KEYS.FAKED_CASHOUTS, items);
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: STORAGE_KEYS.FAKED_CASHOUTS } }));
  }

  public getMixedCashoutFeed(limit: number = 20): CashoutFeedItem[] {
    const cfg = this.getAppConfig();
    if (cfg.cashoutFeed?.enabled === false) return [];

    // 1. Gather Real Cashouts (from completed or processing withdrawals)
    const realWithdrawals = this.getWithdrawalRequests();
    const realItems: CashoutFeedItem[] = realWithdrawals
      .filter((w) => w.status === 'completed' || w.status === 'processing')
      .map((w) => ({
        id: `real_${w.id}`,
        playerHandle: w.customerName,
        customerName: w.customerName,
        amount: w.amount,
        currency: w.currency,
        methodName: w.methodName || 'Bank Transfer',
        gameName: w.sourceGameName || 'Platform Vault',
        isFake: false,
        timestamp: w.updatedAt || w.createdAt || new Date().toISOString(),
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
        playerHandle: name,
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
    if (cfg.cashoutFeed?.enabled === false) return null;

    const pool = cfg.cashoutFeed?.namesPool?.length ? cfg.cashoutFeed.namesPool : ['Marcus_V', 'Elena_R', 'Tyler_K', 'LuckyHunter', 'ApexPro', 'Chloe_B'];
    const randomName = pool[Math.floor(Math.random() * pool.length)];
    const min = cfg.cashoutFeed?.minAmount || 50;
    const max = cfg.cashoutFeed?.maxAmount || 250;
    const probableAmounts = cfg.cashoutFeed?.probableAmounts?.length
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
      playerHandle: randomName,
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

    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'cashout_feed_updated' } }));
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
