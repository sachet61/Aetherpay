# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 114 files · ~185,670 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1016 nodes · 3356 edges · 25 communities (22 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6dc17ffb`
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
- GlobalChatNotificationManager.tsx
- AdminConfig.tsx
- react
- compilerOptions
- dataService
- CustomerWithdrawal.tsx
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- auditLogUtils.ts
- CustomerRules.tsx
- vercel.json
- sw.js
- dataService.ts
- UserRole
- UserProfile

## God Nodes (most connected - your core abstractions)
1. `DataService` - 192 edges
2. `UserProfile` - 93 edges
3. `isSupabaseConfigured()` - 59 edges
4. `react` - 51 edges
5. `lucide-react` - 47 edges
6. `App()` - 38 edges
7. `dataService` - 37 edges
8. `AdminChat()` - 30 edges
9. `UserWallet` - 29 edges
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

## Communities (25 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (14): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken (+6 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (76): AdminChatCashoutModal(), AdminChatTopUpModal(), TopUpModalMode, ChatTransactionCard(), ChatTransactionCardProps, AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat() (+68 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.13
Nodes (31): App(), LazyEmailVerificationBanner, LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav(), useDataService() (+23 more)

### Community 4 - "types.ts"
Cohesion: 0.11
Nodes (18): AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, CustomerReferrals(), CustomerReferralsProps, getStepBadge(), loadCustomerReferrals() (+10 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "api/index.ts"
Cohesion: 0.06
Nodes (91): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetAuditLogs() (+83 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.08
Nodes (24): GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+16 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.07
Nodes (36): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), loadAdminConfig() (+28 more)

### Community 11 - "react"
Cohesion: 0.15
Nodes (18): lucide-react, react, AdminReferralGovernancePanel(), BackgroundNotificationPrompt(), IOSPwaInstallModal(), IOSPwaInstallModalProps, LazyPageFallbackProps, LegalContentProps (+10 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.21
Nodes (13): EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps (+5 more)

### Community 14 - "CustomerWithdrawal.tsx"
Cohesion: 0.38
Nodes (5): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerWithdrawal(), CustomerWithdrawalProps, loadCustomerWithdrawal()

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.10
Nodes (36): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminGameCatalog(), PRESET_GAME_ICONS, CustomerGameAccounts() (+28 more)

### Community 17 - "WebPushClient"
Cohesion: 0.16
Nodes (8): arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 18 - "auditLogUtils.ts"
Cohesion: 0.24
Nodes (9): AdminAudit(), AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs(), normalizeAuditActorRole(), sortAuditLogsDesc() (+1 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.07
Nodes (58): CustomerHome(), CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo (+50 more)

### Community 24 - "UserRole"
Cohesion: 0.11
Nodes (17): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, AdminUsersProps, loadAdminUsers(), authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS (+9 more)

### Community 26 - "UserProfile"
Cohesion: 0.07
Nodes (30): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, BackgroundNotificationPromptProps, PWAInstallButtonProps, AuthenticatedUserMenuProps, CustomerMobileNavProps (+22 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `types.ts`, `GlobalChatNotificationManager.tsx`, `AdminConfig.tsx`, `react`, `dataService`, `CustomerWithdrawal.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `CustomerRules.tsx`, `dataService.ts`, `UserRole`, `UserProfile`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05279299014238773 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `types.ts`, `AuthSessionService`, `GlobalChatNotificationManager.tsx`, `AdminConfig.tsx`, `react`, `dataService`, `CustomerWithdrawal.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `dataService.ts`, `UserRole`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05946313285762827 - nodes in this community are weakly interconnected._
- **Why does `AuthSessionService` connect `AuthSessionService` to `App.tsx`, `react`, `dataService`, `useVerificationResolution.ts`, `WebPushClient`, `dataService.ts`, `UserRole`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13445378151260504 - nodes in this community are weakly interconnected._