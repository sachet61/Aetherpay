# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 92 files · ~139,893 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 794 nodes · 2545 edges · 24 communities (20 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e519a311`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- dataService.ts
- types/index.ts
- UserRole
- api/index.ts
- steps
- AuthSessionService
- supabaseClient.ts
- authSessionService.ts
- compilerOptions
- react
- AdminUsers.tsx
- useVerificationResolution.ts
- assetPreloader.ts
- webPushClient.ts
- react
- lucide-react
- CustomerRules.tsx
- vercel.json
- UserProfile

## God Nodes (most connected - your core abstractions)
1. `DataService` - 175 edges
2. `UserProfile` - 88 edges
3. `isSupabaseConfigured()` - 51 edges
4. `react` - 50 edges
5. `lucide-react` - 46 edges
6. `App()` - 37 edges
7. `dataService` - 36 edges
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 26 edges
10. `SupabaseAuthService` - 24 edges

## Surprising Connections (you probably didn't know these)
- `EmailOtpModalProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/auth/EmailOtpModal.tsx → src/types.ts
- `EmailVerificationBannerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/EmailVerificationBanner.tsx → src/types.ts
- `GlobalChatNotificationManagerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/GlobalChatNotificationManager.tsx → src/types.ts
- `PWAInstallButtonProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/PWAInstallButton.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (24 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (12): ChatTransactionCardProps, DataService, findRequestById(), isSupabaseConfigured(), mergeVerifiedStatus(), CashoutFeedItem, ChatMessage, ChatTransactionData (+4 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.08
Nodes (45): AdminChatCashoutModal(), AdminChatTopUpModal(), TopUpModalMode, ChatTransactionCard(), AdminChat(), CustomerChat(), loadAdminChat(), loadCustomerChat() (+37 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (44): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+36 more)

### Community 3 - "App.tsx"
Cohesion: 0.13
Nodes (30): App(), LazyEmailVerificationBanner, GlobalChatNotificationManager(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal() (+22 more)

### Community 4 - "dataService.ts"
Cohesion: 0.05
Nodes (82): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, LiveCashoutFeedList(), LiveCashoutFeedListProps, AdminRequestsProps, CustomerHome() (+74 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "UserRole"
Cohesion: 0.20
Nodes (11): SessionHydrationScreen(), SessionHydrationScreenProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, UserSession, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput (+3 more)

### Community 7 - "api/index.ts"
Cohesion: 0.16
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.11
Nodes (14): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUpProps, loadAdminConfig() (+6 more)

### Community 11 - "authSessionService.ts"
Cohesion: 0.25
Nodes (7): SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "react"
Cohesion: 0.23
Nodes (11): react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RealtimeSyncBadge(), AuthenticatedUserMenuProps, RoleSwitcher(), TopNavbar() (+3 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (22): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+14 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.11
Nodes (31): StartupSplash(), StartupSplashProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, loadAdminGameCatalog() (+23 more)

### Community 17 - "webPushClient.ts"
Cohesion: 0.08
Nodes (18): GlobalChatNotificationManagerProps, NotificationSoundService, notificationSoundService, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, APPLE_TOUCH_ICON_URL (+10 more)

### Community 18 - "react"
Cohesion: 0.27
Nodes (10): ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, LiveCashoutTicker(), AuthPage(), dataService, PasswordResetResponse (+2 more)

### Community 19 - "lucide-react"
Cohesion: 0.23
Nodes (11): lucide-react, EmailOtpModal(), EmailOtpModalProps, BackgroundNotificationPrompt(), EmailVerificationBanner(), EmailVerificationBannerProps, IOSPwaInstallModal(), IOSPwaInstallModalProps (+3 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 26 - "UserProfile"
Cohesion: 0.10
Nodes (14): BackgroundNotificationPromptProps, CustomerMobileNavProps, StaffMobileNavProps, AdminAuditProps, AdminChatProps, AdminDashboardProps, AdminGameCredentialsProps, AuthPageProps (+6 more)

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `dataService.ts`, `UserRole`, `supabaseClient.ts`, `react`, `AdminUsers.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `webPushClient.ts`, `react`, `lucide-react`, `CustomerRules.tsx`, `UserProfile`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06084081247047709 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `dataService.ts`, `UserRole`, `AuthSessionService`, `supabaseClient.ts`, `authSessionService.ts`, `react`, `AdminUsers.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `webPushClient.ts`, `react`, `lucide-react`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08269230769230769 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `dataService.ts`, `UserRole`, `supabaseClient.ts`, `authSessionService.ts`, `AdminUsers.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `webPushClient.ts`, `react`, `lucide-react`, `CustomerRules.tsx`, `UserProfile`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05176470588235294 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13015873015873017 - nodes in this community are weakly interconnected._