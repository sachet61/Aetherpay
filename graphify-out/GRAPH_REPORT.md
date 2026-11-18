# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 106 files · ~170,582 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 941 nodes · 3100 edges · 26 communities (23 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9364f2e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- types.ts
- package.json
- App.tsx
- walletActivityUtils.ts
- types/index.ts
- AuthSessionService
- api/index.ts
- steps
- react
- AdminConfig.tsx
- react
- compilerOptions
- dataService
- sessionHydrationUtils.ts
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- AdminAudit.tsx
- AdminGameCredentials.tsx
- UserRole
- vercel.json
- sw.js
- walletActivityUtils.ts
- SessionHydrationScreen.tsx
- UserProfile

## God Nodes (most connected - your core abstractions)
1. `DataService` - 190 edges
2. `UserProfile` - 90 edges
3. `isSupabaseConfigured()` - 55 edges
4. `react` - 51 edges
5. `lucide-react` - 47 edges
6. `App()` - 38 edges
7. `dataService` - 37 edges
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 26 edges
10. `SupabaseAuthService` - 24 edges

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

## Communities (26 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (6): DataService, findRequestById(), isSupabaseConfigured(), GameAccount, PasswordResetToken, SupportConversation

### Community 1 - "types.ts"
Cohesion: 0.07
Nodes (60): AdminChatCashoutModal(), ChatTransactionCard(), GlobalChatNotificationManager(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), loadAdminChat(), loadCustomerChat() (+52 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (44): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+36 more)

### Community 3 - "App.tsx"
Cohesion: 0.16
Nodes (27): App(), LazyEmailVerificationBanner, LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav(), useDataService() (+19 more)

### Community 4 - "walletActivityUtils.ts"
Cohesion: 0.05
Nodes (59): AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps (+51 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (40): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+32 more)

### Community 7 - "api/index.ts"
Cohesion: 0.08
Nodes (61): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetAuditLogs(), handleGetChatMessages() (+53 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "react"
Cohesion: 0.31
Nodes (7): BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), loadCustomerProfile(), webPushClient

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.08
Nodes (34): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+26 more)

### Community 11 - "react"
Cohesion: 0.14
Nodes (15): lucide-react, react, AdminReferralGovernancePanel(), LazyPageFallbackProps, LegalContentProps, LiveCashoutFeedListProps, BeforeInstallPromptEvent, PWAInstallButton() (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.25
Nodes (11): EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), LiveCashoutTicker(), AuthPage() (+3 more)

### Community 14 - "sessionHydrationUtils.ts"
Cohesion: 0.39
Nodes (6): getPrefetchRouteKeysForRole(), HydrationGateInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (24): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+16 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.07
Nodes (38): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, loadAdminGameCatalog(), loadCustomerGameAccounts(), DevicePlatform (+30 more)

### Community 17 - "WebPushClient"
Cohesion: 0.22
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.20
Nodes (14): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+6 more)

### Community 20 - "UserRole"
Cohesion: 0.12
Nodes (13): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, AdminUsersProps, loadAdminUsers(), authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS (+5 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "walletActivityUtils.ts"
Cohesion: 0.13
Nodes (34): LiveCashoutFeedList(), CustomerHome(), CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerHome(), loadCustomerWallet(), ActivityStatusMeta (+26 more)

### Community 24 - "SessionHydrationScreen.tsx"
Cohesion: 0.33
Nodes (11): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, normalizeAssetUrlList(), preloadAssetPool(), preloadSingleImage() (+3 more)

### Community 26 - "UserProfile"
Cohesion: 0.10
Nodes (25): EmailOtpModalProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps, PWAInstallButtonProps, AuthenticatedUserMenuProps, CustomerMobileNavProps, StaffMobileNavProps, TopNavbarProps (+17 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `walletActivityUtils.ts`, `react`, `AdminConfig.tsx`, `react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `AdminGameCredentials.tsx`, `UserRole`, `walletActivityUtils.ts`, `UserProfile`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.062062937062937064 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `walletActivityUtils.ts`, `AuthSessionService`, `react`, `AdminConfig.tsx`, `react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `AdminAudit.tsx`, `AdminGameCredentials.tsx`, `UserRole`, `walletActivityUtils.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06722689075630252 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `walletActivityUtils.ts`, `react`, `AdminConfig.tsx`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `AdminGameCredentials.tsx`, `UserRole`, `walletActivityUtils.ts`, `SessionHydrationScreen.tsx`, `UserProfile`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05176470588235294 - nodes in this community are weakly interconnected._
- **Should `walletActivityUtils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05297334244702666 - nodes in this community are weakly interconnected._