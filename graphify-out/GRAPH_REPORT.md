# Graph Report - Aetherpay  (2026-11-19)

## Corpus Check
- 125 files · ~215,883 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1144 nodes · 3795 edges · 38 communities (33 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83a47422`
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
- pwaAssets.ts
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- react
- api/index.ts
- verificationStateUtils.ts
- AdminGameCatalog.tsx
- WebPushClient
- AdminAudit.tsx
- supabaseTokenManager.ts
- dataService.ts
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- UserProfile
- SupabaseAuthService
- UserRole
- dataService
- AuthTokenCoordinator
- auditLogs.test.ts
- useVerificationResolution.ts
- pushUtils.ts
- authSessionService.ts
- types.ts
- CustomerReferrals.tsx
- CustomerMobileNav.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 202 edges
2. `UserProfile` - 96 edges
3. `isSupabaseConfigured()` - 60 edges
4. `react` - 55 edges
5. `lucide-react` - 50 edges
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
- `reconcileMissingReferralRewards()` --calls--> `calculateReferralPayouts()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `resolveUserByIdentifier()` --calls--> `normalizeReferralCodeInput()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (38 total, 5 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (7): DataService, findRequestById(), isSupabaseConfigured(), computeCumulativeCompletedDeposits(), CashoutFeedItem, PasswordResetToken, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.05
Nodes (85): AdminChatCashoutModal(), AdminChatTopUpModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, AdminChat(), AdminChatProps (+77 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (42): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies (+34 more)

### Community 3 - "App.tsx"
Cohesion: 0.09
Nodes (40): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), SessionTimeoutWarningModalProps, CustomerMobileNav() (+32 more)

### Community 4 - "types.ts"
Cohesion: 0.15
Nodes (16): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, PWAInstallButton(), RealtimeSyncBadge(), RealtimeSyncBadgeProps (+8 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "types.ts"
Cohesion: 0.15
Nodes (14): handlePostAdminReferralConfig(), ReferralAwardStatus, ReferralLedgerEntry, ReferralPayoutTarget, ReferralProgramConfig, ReferralRewardMode, TopReferrerEntry, clampNonNegativeNumber() (+6 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "pwaAssets.ts"
Cohesion: 0.11
Nodes (19): BrowserNotificationEnv, BrowserNotificationResult, dispatchBrowserNotification(), resolveSwRegistration(), APPLE_TOUCH_ICON_URL, DEFAULT_NOTIFICATION_ICON_URL, FAVICON_PNG_URL, LEGACY_BADGE_URLS (+11 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.07
Nodes (36): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), loadAdminConfig() (+28 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (60): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+52 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "react"
Cohesion: 0.12
Nodes (24): lucide-react, react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps (+16 more)

### Community 14 - "api/index.ts"
Cohesion: 0.08
Nodes (47): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+39 more)

### Community 15 - "verificationStateUtils.ts"
Cohesion: 0.22
Nodes (12): getDefaultStorage(), mergeVerifiedStatus(), normalizeEmailKey(), parseCacheMap(), readVerifiedCache(), StorageReader, StorageWriter, VERIFICATION_GRACE_DELAY_MS (+4 more)

### Community 16 - "AdminGameCatalog.tsx"
Cohesion: 0.14
Nodes (19): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), loadAdminGameCatalog(), GameLink, CORE_ASSET_URLS, CRITICAL_ASSET_URLS (+11 more)

### Community 17 - "WebPushClient"
Cohesion: 0.23
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.22
Nodes (12): AdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs(), mergeAuditLogs() (+4 more)

### Community 19 - "supabaseTokenManager.ts"
Cohesion: 0.17
Nodes (15): AuthSessionResponse, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError(), MinimalAuthSession (+7 more)

### Community 20 - "dataService.ts"
Cohesion: 0.18
Nodes (18): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+10 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.13
Nodes (33): CustomerHome(), CATEGORY_LABELS, CustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedWithdrawals() (+25 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.19
Nodes (32): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+24 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.25
Nodes (14): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, isImageCached(), memoryImageCache, normalizeAssetUrlList() (+6 more)

### Community 26 - "UserProfile"
Cohesion: 0.16
Nodes (20): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, TopUpModalMode, AuthenticatedUserMenuProps, TopNavbarProps, AdminGameCredentialsProps (+12 more)

### Community 28 - "UserRole"
Cohesion: 0.21
Nodes (10): SessionHydrationScreenProps, prefetchPagesForSession(), getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate() (+2 more)

### Community 29 - "dataService"
Cohesion: 0.16
Nodes (8): LiveCashoutFeedList(), LiveCashoutFeedListProps, StaffMobileNavProps, AdminAuditProps, CustomerRulesProps, CustomerWithdrawal(), loadCustomerRules(), dataService

### Community 31 - "auditLogs.test.ts"
Cohesion: 0.21
Nodes (6): handleGetAuditLogs(), handlePostAuditLog(), isMissingColumnError(), normalizeServerAuditRow(), sanitizePostgrestLikeTerm(), writeServerAuditLog()

### Community 32 - "useVerificationResolution.ts"
Cohesion: 0.35
Nodes (10): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+2 more)

### Community 33 - "pushUtils.ts"
Cohesion: 0.31
Nodes (8): deactivatePushSubscriptionsInList(), hashEndpointId(), NormalizedPushSubscription, normalizePushSubscriptionPayload(), normalizePushUserRole(), PushSubscriptionRecord, rebindPushSubscriptionList(), RESERVED_NON_USER_IDS

### Community 34 - "authSessionService.ts"
Cohesion: 0.25
Nodes (7): authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential, UserSession

### Community 35 - "types.ts"
Cohesion: 0.19
Nodes (14): AdminRequestsProps, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), GameAccountStatus, ReferralWelcomeBonus (+6 more)

### Community 36 - "CustomerReferrals.tsx"
Cohesion: 0.67
Nodes (3): CustomerReferrals(), getStepBadge(), ReferralSummary

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `types.ts`, `types.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `react`, `verificationStateUtils.ts`, `AdminGameCatalog.tsx`, `AdminAudit.tsx`, `supabaseTokenManager.ts`, `dataService.ts`, `dataService.ts`, `UserProfile`, `UserRole`, `dataService`, `useVerificationResolution.ts`, `types.ts`, `CustomerReferrals.tsx`, `CustomerMobileNav.tsx`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05613354037267081 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `types.ts`, `AuthSessionService`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `react`, `AdminGameCatalog.tsx`, `WebPushClient`, `supabaseTokenManager.ts`, `dataService.ts`, `dataService.ts`, `SupabaseAuthService`, `UserRole`, `dataService`, `useVerificationResolution.ts`, `authSessionService.ts`, `types.ts`, `CustomerReferrals.tsx`, `CustomerMobileNav.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050747442958300554 - nodes in this community are weakly interconnected._
- **Why does `AuthTokenCoordinator` connect `AuthTokenCoordinator` to `supabaseTokenManager.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05357142857142857 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._