# Graph Report - Aetherpay  (2026-11-19)

## Corpus Check
- 128 files · ~216,486 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1153 nodes · 3826 edges · 35 communities (32 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d06fc02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- types.ts
- types/index.ts
- AuthSessionService
- types.ts
- steps
- assetPreloader.ts
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- react
- handler
- useVerificationResolution.ts
- dataService
- WebPushClient
- AdminAudit.tsx
- authTokenUtils.ts
- dataService.ts
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- UserWallet
- TopUpRequest
- UserRole
- CustomerRules.tsx
- api/index.ts
- pushUtils.ts
- authSessionService.ts
- types.ts
- UserProfile

## God Nodes (most connected - your core abstractions)
1. `DataService` - 202 edges
2. `UserProfile` - 96 edges
3. `isSupabaseConfigured()` - 60 edges
4. `react` - 56 edges
5. `lucide-react` - 51 edges
6. `App()` - 40 edges
7. `dataService` - 40 edges
8. `UserWallet` - 32 edges
9. `handler()` - 31 edges
10. `AdminChat()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `loadReferralProgramConfig()` --calls--> `normalizeReferralConfig()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `computeRefereeRealCashDeposits()` --calls--> `isRealCashTopUpRow()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralEvaluate()` --calls--> `checkReferralBudgetCaps()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralEvaluate()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (35 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken, ReferralSummary (+1 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.06
Nodes (72): AdminChatCashoutModal(), AdminChatTopUpModal(), ChatTransactionCard(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), compareMessagesChronologically(), extractAttachmentMetadata() (+64 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (36): dependencies, lucide-react@^1.16.0, react@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies, tsx@^4.19.2 (+28 more)

### Community 3 - "App.tsx"
Cohesion: 0.13
Nodes (31): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), GlobalChatNotificationManager(), LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav() (+23 more)

### Community 4 - "types.ts"
Cohesion: 0.14
Nodes (17): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, AdminDashboard(), AdminDashboardProps, AdminUsers() (+9 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "types.ts"
Cohesion: 0.20
Nodes (15): ReferralLedgerEntry, ReferralPayoutTarget, ReferralProgramConfig, checkReferralBudgetCaps(), clampNonNegativeNumber(), computeTopReferrers(), DEFAULT_REFERRAL_CONFIG, evaluateReferralFraudSignals() (+7 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "assetPreloader.ts"
Cohesion: 0.05
Nodes (52): GamePlatformCardProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, loadAdminGameCatalog(), loadCustomerGameAccounts() (+44 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.06
Nodes (47): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminChatTopUpModalProps, TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+39 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (59): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+51 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "react"
Cohesion: 0.15
Nodes (17): lucide-react, react, BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, LazyPageFallbackProps, LegalContentProps, BeforeInstallPromptEvent (+9 more)

### Community 14 - "handler"
Cohesion: 0.16
Nodes (20): buildProxyStorageUrl(), deactivateVercelPushSubscription(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), handleGetChatMessages(), handlePostChatSend(), handlePushUnsubscribe() (+12 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "dataService"
Cohesion: 0.18
Nodes (15): react-dom@^19.0.0, react-dom, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps (+7 more)

### Community 17 - "WebPushClient"
Cohesion: 0.23
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.20
Nodes (14): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+6 more)

### Community 19 - "authTokenUtils.ts"
Cohesion: 0.14
Nodes (11): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+3 more)

### Community 20 - "dataService.ts"
Cohesion: 0.17
Nodes (18): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+10 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.15
Nodes (29): CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits() (+21 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.22
Nodes (27): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+19 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.33
Nodes (11): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, normalizeAssetUrlList(), preloadAssetPool(), preloadSingleImage() (+3 more)

### Community 26 - "UserWallet"
Cohesion: 0.16
Nodes (16): LiveCashoutFeedList(), LiveCashoutFeedListProps, AuthenticatedUserMenuProps, GamePlatformCard(), TopNavbarProps, CustomerHome(), CustomerHomeProps, CustomerProfileProps (+8 more)

### Community 27 - "TopUpRequest"
Cohesion: 0.44
Nodes (7): mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), StaffTopUpDraftResult, TopUpRequest

### Community 28 - "UserRole"
Cohesion: 0.23
Nodes (9): SessionHydrationScreenProps, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput (+1 more)

### Community 31 - "api/index.ts"
Cohesion: 0.10
Nodes (24): ALLOWED_AUDIT_ENTITY_TYPES, decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, fetchSupabaseJwksKeys(), handleGetAuditLogs(), handlePostAuditLog(), handlePushSubscribe(), isMissingColumnError() (+16 more)

### Community 33 - "pushUtils.ts"
Cohesion: 0.14
Nodes (17): getWebPushClient(), handlePushNotify(), handlePushStatus(), sendVercelPushNotification(), deactivatePushSubscriptionsInList(), hashEndpointId(), isStaffRole(), NormalizedPushSubscription (+9 more)

### Community 34 - "authSessionService.ts"
Cohesion: 0.22
Nodes (8): SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential, UserSession

### Community 35 - "types.ts"
Cohesion: 0.11
Nodes (19): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, ChatTransactionCardProps, AdminRequestsProps, loadAdminRequests(), StaffWithdrawalDraftResult, ChatTransactionData (+11 more)

### Community 36 - "UserProfile"
Cohesion: 0.12
Nodes (16): GlobalChatNotificationManagerProps, PWAInstallButtonProps, CustomerMobileNavProps, StaffMobileNavProps, AdminChatProps, AdminGameCredentialsProps, AuthPageProps, CustomerChatProps (+8 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `types.ts`, `types.ts`, `UserProfile`, `assetPreloader.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `react`, `useVerificationResolution.ts`, `dataService`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `UserWallet`, `UserRole`, `CustomerRules.tsx`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.055136733185513674 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `authSessionService.ts`, `types.ts`, `types.ts`, `AuthSessionService`, `assetPreloader.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `react`, `useVerificationResolution.ts`, `dataService`, `WebPushClient`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `UserWallet`, `UserRole`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05695644507141598 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `types.ts`, `types.ts`, `authSessionService.ts`, `UserProfile`, `assetPreloader.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `useVerificationResolution.ts`, `dataService`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `assetPreloader.ts`, `UserWallet`, `CustomerRules.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13445378151260504 - nodes in this community are weakly interconnected._