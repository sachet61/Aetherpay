# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 112 files · ~182,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 994 nodes · 3273 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d3ef12a0`
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
- CustomerReferrals.tsx
- AdminConfig.tsx
- react
- compilerOptions
- dataService
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- auditLogUtils.ts
- CustomerProfile.tsx
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
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 27 edges
10. `WebPushClient` - 27 edges

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

## Communities (24 total, 2 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (14): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken (+6 more)

### Community 1 - "types.ts"
Cohesion: 0.07
Nodes (54): AdminChatCashoutModal(), ChatTransactionCard(), ChatTransactionCardProps, AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), compareMessagesChronologically(), extractAttachmentMetadata() (+46 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.13
Nodes (31): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), GlobalChatNotificationManager(), LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav() (+23 more)

### Community 4 - "types.ts"
Cohesion: 0.12
Nodes (16): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, AdminDashboard(), AdminDashboardProps, AdminRequestsProps (+8 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "api/index.ts"
Cohesion: 0.05
Nodes (93): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetAuditLogs() (+85 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "CustomerReferrals.tsx"
Cohesion: 0.50
Nodes (4): CustomerReferrals(), CustomerReferralsProps, getStepBadge(), loadCustomerReferrals()

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.06
Nodes (47): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+39 more)

### Community 11 - "react"
Cohesion: 0.13
Nodes (16): lucide-react, react, LazyPageFallbackProps, LegalContentProps, LiveCashoutFeedListProps, BeforeInstallPromptEvent, PWAInstallButton(), RealtimeSyncBadge() (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.24
Nodes (11): EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps, LiveCashoutTicker() (+3 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (24): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+16 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.05
Nodes (56): SessionHydrationScreen(), SessionHydrationScreenProps, StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminGameCatalog(), AdminGameCatalogProps (+48 more)

### Community 17 - "WebPushClient"
Cohesion: 0.23
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 18 - "auditLogUtils.ts"
Cohesion: 0.24
Nodes (9): AdminAudit(), AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs(), normalizeAuditActorRole(), sortAuditLogsDesc() (+1 more)

### Community 20 - "CustomerProfile.tsx"
Cohesion: 0.14
Nodes (15): BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, SessionTimeoutWarningModalProps, CustomerProfile(), CustomerProfileProps, loadCustomerProfile(), authSessionService (+7 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.06
Nodes (65): LiveCashoutFeedList(), CustomerHome(), CustomerHomeProps, CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerHome(), loadCustomerWallet() (+57 more)

### Community 24 - "UserRole"
Cohesion: 0.18
Nodes (9): AdminUsersProps, loadAdminUsers(), getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput (+1 more)

### Community 26 - "UserProfile"
Cohesion: 0.09
Nodes (24): EmailOtpModalProps, AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, GlobalChatNotificationManagerProps, PWAInstallButtonProps, AuthenticatedUserMenuProps (+16 more)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `types.ts`, `CustomerReferrals.tsx`, `AdminConfig.tsx`, `react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `CustomerProfile.tsx`, `dataService.ts`, `UserRole`, `UserProfile`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.0543058395819132 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `types.ts`, `AuthSessionService`, `CustomerReferrals.tsx`, `AdminConfig.tsx`, `react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `CustomerProfile.tsx`, `dataService.ts`, `UserRole`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06621067031463748 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `types.ts`, `CustomerReferrals.tsx`, `AdminConfig.tsx`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `CustomerProfile.tsx`, `dataService.ts`, `UserRole`, `UserProfile`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13445378151260504 - nodes in this community are weakly interconnected._