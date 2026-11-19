# Graph Report - Aetherpay  (2026-11-19)

## Corpus Check
- 124 files · ~215,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1140 nodes · 3778 edges · 30 communities (26 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `96e04a18`
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
- referralUtils.ts
- steps
- assetPreloader.ts
- AdminConfig.tsx
- referralHandlers.ts
- compilerOptions
- dataService
- api/index.ts
- useVerificationResolution.ts
- handler
- WebPushClient
- AdminAudit.tsx
- supabaseTokenManager.ts
- SupabaseAuthService
- vercel.json
- sw.js
- dataService.ts
- pushUtils.ts
- react
- UserProfile
- CustomerProfile.tsx
- wheelOfLuckUtils.ts
- AdminGameCredentials.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 201 edges
2. `UserProfile` - 95 edges
3. `isSupabaseConfigured()` - 60 edges
4. `react` - 54 edges
5. `lucide-react` - 50 edges
6. `dataService` - 39 edges
7. `App()` - 38 edges
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

## Communities (30 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (13): AdminChatTopUpModalProps, DataService, findRequestById(), isSupabaseConfigured(), computeCumulativeCompletedDeposits(), CashoutFeedItem, ChatMessage, GameAccount (+5 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.06
Nodes (76): AdminChatCashoutModal(), AdminChatTopUpModal(), TopUpModalMode, ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, AdminChat() (+68 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.13
Nodes (31): App(), LazyEmailVerificationBanner, LazyPageFallback(), LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav() (+23 more)

### Community 4 - "types.ts"
Cohesion: 0.11
Nodes (22): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, AdminDashboard(), AdminDashboardProps, AdminUsers() (+14 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "referralUtils.ts"
Cohesion: 0.20
Nodes (15): ReferralLedgerEntry, ReferralPayoutTarget, ReferralProgramConfig, checkReferralBudgetCaps(), clampNonNegativeNumber(), computeTopReferrers(), DEFAULT_REFERRAL_CONFIG, evaluateReferralFraudSignals() (+7 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "assetPreloader.ts"
Cohesion: 0.05
Nodes (58): SessionHydrationScreen(), SessionHydrationScreenProps, StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminGameCatalog(), AdminGameCatalogProps (+50 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.07
Nodes (36): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), loadAdminConfig() (+28 more)

### Community 11 - "referralHandlers.ts"
Cohesion: 0.22
Nodes (27): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+19 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.23
Nodes (12): EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps, LiveCashoutTicker() (+4 more)

### Community 14 - "api/index.ts"
Cohesion: 0.10
Nodes (24): ALLOWED_AUDIT_ENTITY_TYPES, decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, fetchSupabaseJwksKeys(), handleGetAuditLogs(), handlePostAuditLog(), handlePushSubscribe(), isMissingColumnError() (+16 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.15
Nodes (24): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+16 more)

### Community 16 - "handler"
Cohesion: 0.16
Nodes (20): buildProxyStorageUrl(), deactivateVercelPushSubscription(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), handleGetChatMessages(), handlePostChatSend(), handlePushUnsubscribe() (+12 more)

### Community 17 - "WebPushClient"
Cohesion: 0.16
Nodes (8): arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.09
Nodes (23): AdminAudit(), loadAdminAudit(), filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+15 more)

### Community 19 - "supabaseTokenManager.ts"
Cohesion: 0.11
Nodes (15): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+7 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.07
Nodes (57): CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest() (+49 more)

### Community 24 - "pushUtils.ts"
Cohesion: 0.14
Nodes (17): getWebPushClient(), handlePushNotify(), handlePushStatus(), sendVercelPushNotification(), deactivatePushSubscriptionsInList(), hashEndpointId(), isStaffRole(), NormalizedPushSubscription (+9 more)

### Community 25 - "react"
Cohesion: 0.13
Nodes (17): lucide-react, react, BackgroundNotificationPrompt(), IOSPwaInstallModal(), IOSPwaInstallModalProps, LazyPageFallbackProps, LiveCashoutFeedListProps, BeforeInstallPromptEvent (+9 more)

### Community 26 - "UserProfile"
Cohesion: 0.08
Nodes (28): EmailOtpModalProps, AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, BackgroundNotificationPromptProps, AuthenticatedUserMenuProps, CustomerMobileNavProps, StaffMobileNavProps (+20 more)

### Community 27 - "CustomerProfile.tsx"
Cohesion: 0.16
Nodes (11): SessionTimeoutWarningModalProps, CustomerProfile(), CustomerProfileProps, loadCustomerProfile(), authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS (+3 more)

### Community 29 - "wheelOfLuckUtils.ts"
Cohesion: 0.08
Nodes (59): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+51 more)

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `types.ts`, `AdminGameCredentials.tsx`, `assetPreloader.ts`, `AdminConfig.tsx`, `dataService`, `useVerificationResolution.ts`, `AdminAudit.tsx`, `dataService.ts`, `react`, `UserProfile`, `CustomerProfile.tsx`, `wheelOfLuckUtils.ts`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05461847389558233 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `types.ts`, `AdminGameCredentials.tsx`, `AuthSessionService`, `assetPreloader.ts`, `AdminConfig.tsx`, `dataService`, `useVerificationResolution.ts`, `WebPushClient`, `AdminAudit.tsx`, `SupabaseAuthService`, `dataService.ts`, `react`, `CustomerProfile.tsx`, `wheelOfLuckUtils.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05694980694980695 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `types.ts`, `AdminGameCredentials.tsx`, `assetPreloader.ts`, `AdminConfig.tsx`, `dataService`, `useVerificationResolution.ts`, `AdminAudit.tsx`, `dataService.ts`, `UserProfile`, `CustomerProfile.tsx`, `wheelOfLuckUtils.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._