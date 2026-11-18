# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 109 files · ~174,424 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 971 nodes · 3204 edges · 27 communities (26 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `70f82854`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- types.ts
- package.json
- App.tsx
- dataService.ts
- types/index.ts
- AuthSessionService
- api/index.ts
- steps
- WithdrawalRequest
- AdminConfig.tsx
- TopNavbar.tsx
- compilerOptions
- react
- UserWallet
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- AdminAudit.tsx
- GameAccount
- CustomerWallet.tsx
- vercel.json
- sw.js
- walletActivityUtils.ts
- SessionHydrationScreen.tsx
- notificationScoping.ts
- UserProfile

## God Nodes (most connected - your core abstractions)
1. `DataService` - 191 edges
2. `UserProfile` - 93 edges
3. `isSupabaseConfigured()` - 58 edges
4. `react` - 51 edges
5. `lucide-react` - 47 edges
6. `App()` - 38 edges
7. `dataService` - 37 edges
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 27 edges
10. `WebPushClient` - 26 edges

## Surprising Connections (you probably didn't know these)
- `loadReferralProgramConfig()` --calls--> `normalizeReferralConfig()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `computeRefereeRealCashDeposits()` --calls--> `isRealCashTopUpRow()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `resolveUserByIdentifier()` --calls--> `normalizeReferralCodeInput()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `normalizeReferralCodeInput()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (27 total, 1 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, SupportConversation, mergeAuditLogs() (+1 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (70): AdminChatCashoutModal(), AdminChatTopUpModal(), TopUpModalMode, ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), AdminChat(), TICKET_STATUS_OPTIONS (+62 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (43): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+35 more)

### Community 3 - "App.tsx"
Cohesion: 0.15
Nodes (28): react-dom, App(), LazyEmailVerificationBanner, LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav() (+20 more)

### Community 4 - "dataService.ts"
Cohesion: 0.12
Nodes (28): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+20 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (40): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+32 more)

### Community 6 - "AuthSessionService"
Cohesion: 0.12
Nodes (11): SessionHydrationScreenProps, AuthSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex(), StoredCredential (+3 more)

### Community 7 - "api/index.ts"
Cohesion: 0.06
Nodes (84): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetAuditLogs() (+76 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "WithdrawalRequest"
Cohesion: 0.28
Nodes (9): loadAdminRequests(), mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), TopUpRequest, WithdrawalRequest (+1 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.09
Nodes (25): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), CustomerTopUpProps (+17 more)

### Community 11 - "TopNavbar.tsx"
Cohesion: 0.14
Nodes (16): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "react"
Cohesion: 0.11
Nodes (25): lucide-react, react, EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, BackgroundNotificationPrompt() (+17 more)

### Community 14 - "UserWallet"
Cohesion: 0.29
Nodes (8): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerHomeProps, CustomerWithdrawal(), CustomerWithdrawalProps, loadCustomerHome(), loadCustomerWithdrawal(), UserWallet

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.08
Nodes (24): AuthenticatedUserMenuProps, clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser() (+16 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.11
Nodes (27): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, loadAdminGameCatalog(), loadCustomerGameAccounts(), GameLink (+19 more)

### Community 17 - "WebPushClient"
Cohesion: 0.10
Nodes (15): notificationSoundService, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, APPLE_TOUCH_ICON_URL, DEFAULT_NOTIFICATION_ICON_URL, LEGACY_BADGE_URLS (+7 more)

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.25
Nodes (9): AdminAudit(), AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs(), normalizeAuditActorRole(), sortAuditLogsDesc() (+1 more)

### Community 19 - "GameAccount"
Cohesion: 0.25
Nodes (8): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, loadAdminGameCredentials(), GameAccount, GameCatalogItem, PayoutMethodType

### Community 20 - "CustomerWallet.tsx"
Cohesion: 0.28
Nodes (8): CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), filterUnifiedWalletActivity(), getActivityStatusMeta(), UnifiedWalletActivityItem, WalletActivityFilter

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "walletActivityUtils.ts"
Cohesion: 0.17
Nodes (26): CustomerHome(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits(), computeCumulativeCompletedWithdrawals(), deriveLatestCompletedTopUp() (+18 more)

### Community 24 - "SessionHydrationScreen.tsx"
Cohesion: 0.19
Nodes (17): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, getPrefetchRouteKeysForRole(), HydrationGateInput, resolveHydrationPhaseLabel() (+9 more)

### Community 25 - "notificationScoping.ts"
Cohesion: 0.48
Nodes (5): filterRealtimeRowsForUser(), isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage()

### Community 26 - "UserProfile"
Cohesion: 0.08
Nodes (22): EmailOtpModalProps, BackgroundNotificationPromptProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps, CustomerMobileNavProps, StaffMobileNavProps, AdminAuditProps, AdminChatProps (+14 more)

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `dataService.ts`, `AuthSessionService`, `WithdrawalRequest`, `AdminConfig.tsx`, `TopNavbar.tsx`, `react`, `UserWallet`, `useVerificationResolution.ts`, `assetPreloader.ts`, `GameAccount`, `CustomerWallet.tsx`, `UserProfile`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05635733290332984 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `dataService.ts`, `AuthSessionService`, `WithdrawalRequest`, `AdminConfig.tsx`, `TopNavbar.tsx`, `react`, `UserWallet`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `GameAccount`, `CustomerWallet.tsx`, `notificationScoping.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056158385684370836 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `dataService.ts`, `WithdrawalRequest`, `AdminConfig.tsx`, `TopNavbar.tsx`, `UserWallet`, `useVerificationResolution.ts`, `assetPreloader.ts`, `GameAccount`, `CustomerWallet.tsx`, `SessionHydrationScreen.tsx`, `UserProfile`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._
- **Should `dataService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11693548387096774 - nodes in this community are weakly interconnected._