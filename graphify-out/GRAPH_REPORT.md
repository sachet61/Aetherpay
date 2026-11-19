# Graph Report - Aetherpay  (2026-11-19)

## Corpus Check
- 117 files · ~193,311 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1063 nodes · 3483 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `269bc403`
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
- referralHandlers.ts
- steps
- GlobalChatNotificationManager.tsx
- AdminConfig.tsx
- lucide-react
- compilerOptions
- dataService
- api/index.ts
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- AdminAudit.tsx
- supabaseTokenManager.ts
- dataService.ts
- vercel.json
- sw.js
- dataService.ts
- UserRole
- CustomerProfile.tsx
- UserProfile
- SessionHydrationScreen.tsx
- AdminChatTopUpModal.tsx
- auditLogs.test.ts
- pushUtils.ts
- sessionHydrationUtils.ts
- getWebPushClient
- LazyPageFallback.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 195 edges
2. `UserProfile` - 93 edges
3. `isSupabaseConfigured()` - 59 edges
4. `react` - 51 edges
5. `lucide-react` - 47 edges
6. `App()` - 38 edges
7. `dataService` - 37 edges
8. `AdminChat()` - 30 edges
9. `UserWallet` - 30 edges
10. `CustomerChat()` - 27 edges

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

## Communities (34 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (8): DataService, findRequestById(), isSupabaseConfigured(), AppConfig, CashoutFeedItem, ChatMessage, PasswordResetToken, SupportConversation

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (72): AdminChatCashoutModal(), AdminChatTopUpModal(), ChatTransactionCard(), ChatTransactionCardProps, AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), compareMessagesChronologically() (+64 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (36): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies, tsx@^4.19.2 (+28 more)

### Community 3 - "App.tsx"
Cohesion: 0.10
Nodes (37): App(), LazyEmailVerificationBanner, LegalContent(), LegalContentProps, LiveCashoutTicker(), SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav() (+29 more)

### Community 4 - "types.ts"
Cohesion: 0.15
Nodes (16): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, AdminDashboard(), AdminDashboardProps, AdminUsers() (+8 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "referralHandlers.ts"
Cohesion: 0.13
Nodes (44): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+36 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.08
Nodes (28): GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+20 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.05
Nodes (43): @supabase/supabase-js@^2.49.1, @supabase/supabase-js, PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+35 more)

### Community 11 - "lucide-react"
Cohesion: 0.35
Nodes (7): lucide-react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RealtimeSyncBadge(), RoleSwitcher(), TopNavbar()

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.15
Nodes (14): react, EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, LiveCashoutFeedListProps, AuthPageProps (+6 more)

### Community 14 - "api/index.ts"
Cohesion: 0.09
Nodes (43): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+35 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (24): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+16 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.13
Nodes (24): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), loadAdminGameCatalog(), GameLink, CORE_ASSET_URLS, CRITICAL_ASSET_URLS (+16 more)

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.20
Nodes (14): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+6 more)

### Community 19 - "supabaseTokenManager.ts"
Cohesion: 0.13
Nodes (13): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+5 more)

### Community 20 - "dataService.ts"
Cohesion: 0.14
Nodes (20): AdminRequestsProps, RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS (+12 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.10
Nodes (41): LiveCashoutFeedList(), CustomerHome(), CATEGORY_LABELS, CustomerWallet(), loadCustomerHome(), loadCustomerWallet(), mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest() (+33 more)

### Community 24 - "UserRole"
Cohesion: 0.16
Nodes (10): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential, UserSession (+2 more)

### Community 25 - "CustomerProfile.tsx"
Cohesion: 0.16
Nodes (14): EmailOtpModal(), BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, EmailVerificationBanner(), EmailVerificationBannerProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile() (+6 more)

### Community 26 - "UserProfile"
Cohesion: 0.15
Nodes (18): AuthenticatedUserMenuProps, CustomerMobileNavProps, StaffMobileNavProps, TopNavbarProps, AdminChatProps, CustomerChatProps, CustomerGameAccountsProps, CustomerHomeProps (+10 more)

### Community 27 - "SessionHydrationScreen.tsx"
Cohesion: 0.33
Nodes (11): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, normalizeAssetUrlList(), preloadAssetPool(), preloadSingleImage() (+3 more)

### Community 28 - "AdminChatTopUpModal.tsx"
Cohesion: 0.23
Nodes (9): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, TopUpModalMode, AdminGameCredentialsProps, GameAccount, GameCatalogItem (+1 more)

### Community 29 - "auditLogs.test.ts"
Cohesion: 0.21
Nodes (6): handleGetAuditLogs(), handlePostAuditLog(), isMissingColumnError(), normalizeServerAuditRow(), sanitizePostgrestLikeTerm(), writeServerAuditLog()

### Community 30 - "pushUtils.ts"
Cohesion: 0.31
Nodes (8): deactivatePushSubscriptionsInList(), hashEndpointId(), NormalizedPushSubscription, normalizePushSubscriptionPayload(), normalizePushUserRole(), PushSubscriptionRecord, rebindPushSubscriptionList(), RESERVED_NON_USER_IDS

### Community 31 - "sessionHydrationUtils.ts"
Cohesion: 0.33
Nodes (7): prefetchPagesForSession(), getPrefetchRouteKeysForRole(), HydrationGateInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput

### Community 32 - "getWebPushClient"
Cohesion: 0.67
Nodes (3): getWebPushClient(), web-push@^3.6.7, web-push

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `types.ts`, `GlobalChatNotificationManager.tsx`, `AdminConfig.tsx`, `lucide-react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `UserRole`, `CustomerProfile.tsx`, `UserProfile`, `AdminChatTopUpModal.tsx`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05558176100628931 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `types.ts`, `AuthSessionService`, `GlobalChatNotificationManager.tsx`, `AdminConfig.tsx`, `lucide-react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `UserRole`, `CustomerProfile.tsx`, `AdminChatTopUpModal.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05995415270675366 - nodes in this community are weakly interconnected._
- **Why does `react` connect `dataService` to `types.ts`, `package.json`, `App.tsx`, `types.ts`, `LazyPageFallback.tsx`, `GlobalChatNotificationManager.tsx`, `AdminConfig.tsx`, `lucide-react`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `UserRole`, `CustomerProfile.tsx`, `UserProfile`, `SessionHydrationScreen.tsx`, `AdminChatTopUpModal.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._