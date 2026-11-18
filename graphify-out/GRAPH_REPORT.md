# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 112 files · ~176,233 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 986 nodes · 3241 edges · 28 communities (25 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d5fe36c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- types.ts
- package.json
- App.tsx
- types.ts
- types/index.ts
- AuthSessionService
- api/index.ts
- steps
- react
- AdminConfig.tsx
- react
- compilerOptions
- dataService
- dataService.ts
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- AdminAudit.tsx
- WithdrawalRequest
- UserRole
- vercel.json
- sw.js
- walletActivityUtils.ts
- UserRole
- CustomerWithdrawal.tsx
- UserProfile
- AdminUsers.tsx

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

## Communities (28 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken, ReferralSummary (+1 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (67): AdminChatCashoutModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), loadAdminChat() (+59 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (44): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+36 more)

### Community 3 - "App.tsx"
Cohesion: 0.13
Nodes (30): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal() (+22 more)

### Community 4 - "types.ts"
Cohesion: 0.11
Nodes (20): CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, GameAccountStatus, GameLink, PayoutMethodType, ReferralAwardStatus, ReferralLedgerEntry, ReferralPayoutTarget (+12 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (40): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+32 more)

### Community 7 - "api/index.ts"
Cohesion: 0.06
Nodes (77): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetAuditLogs() (+69 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "react"
Cohesion: 0.40
Nodes (4): BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, webPushClient

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.08
Nodes (36): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+28 more)

### Community 11 - "react"
Cohesion: 0.15
Nodes (16): react, AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, BeforeInstallPromptEvent, PWAInstallButton() (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.18
Nodes (14): lucide-react, EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), LiveCashoutTicker() (+6 more)

### Community 14 - "dataService.ts"
Cohesion: 0.17
Nodes (18): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+10 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.07
Nodes (40): AdminGameCatalog(), PRESET_GAME_ICONS, CustomerGameAccounts(), loadAdminGameCatalog(), loadCustomerGameAccounts(), loadCustomerHome(), GameCatalogItem, CORE_ASSET_URLS (+32 more)

### Community 17 - "WebPushClient"
Cohesion: 0.15
Nodes (9): supabase, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv (+1 more)

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.20
Nodes (14): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+6 more)

### Community 19 - "WithdrawalRequest"
Cohesion: 0.19
Nodes (12): AdminRequestsProps, loadAdminRequests(), mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), StaffTopUpDraftResult (+4 more)

### Community 20 - "UserRole"
Cohesion: 0.22
Nodes (8): SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential, UserSession

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "walletActivityUtils.ts"
Cohesion: 0.14
Nodes (31): CustomerHome(), CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity() (+23 more)

### Community 24 - "UserRole"
Cohesion: 0.16
Nodes (19): SessionHydrationScreen(), SessionHydrationScreenProps, StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput (+11 more)

### Community 25 - "CustomerWithdrawal.tsx"
Cohesion: 0.47
Nodes (4): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerWithdrawal(), loadCustomerWithdrawal()

### Community 26 - "UserProfile"
Cohesion: 0.09
Nodes (28): EmailOtpModalProps, AdminChatCashoutModalProps, AdminChatTopUpModalProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps, AuthenticatedUserMenuProps, CustomerMobileNavProps, StaffMobileNavProps (+20 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `types.ts`, `AdminConfig.tsx`, `react`, `dataService`, `dataService.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `WithdrawalRequest`, `walletActivityUtils.ts`, `UserRole`, `CustomerWithdrawal.tsx`, `UserProfile`, `AdminUsers.tsx`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.059161147902869755 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `types.ts`, `AuthSessionService`, `react`, `AdminConfig.tsx`, `react`, `dataService`, `dataService.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `AdminAudit.tsx`, `WithdrawalRequest`, `UserRole`, `walletActivityUtils.ts`, `UserRole`, `CustomerWithdrawal.tsx`, `AdminUsers.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05811027224891329 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `types.ts`, `react`, `AdminConfig.tsx`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `WithdrawalRequest`, `UserRole`, `walletActivityUtils.ts`, `UserRole`, `CustomerWithdrawal.tsx`, `UserProfile`, `AdminUsers.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05176470588235294 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13015873015873017 - nodes in this community are weakly interconnected._