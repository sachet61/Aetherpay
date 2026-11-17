# Graph Report - Aetherpay  (2026-11-17)

## Corpus Check
- 89 files · ~137,931 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 763 nodes · 2453 edges · 28 communities (21 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3609b58`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- walletActivityUtils.ts
- types/index.ts
- dataService.ts
- api/index.ts
- steps
- AuthSessionService
- supabaseClient.ts
- WebPushClient
- compilerOptions
- UserProfile
- CashoutFeedItem
- useVerificationResolution.ts
- CustomerHome.tsx
- StartupSplash.tsx
- react
- lucide-react
- UserRole
- vercel.json
- UserWallet
- WithdrawalRequest
- AdminGameCredentials.tsx
- AdminUsers.tsx
- CustomerReferrals.tsx

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
- `BackgroundNotificationPromptProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/BackgroundNotificationPrompt.tsx → src/types.ts
- `EmailVerificationBannerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/EmailVerificationBanner.tsx → src/types.ts
- `GlobalChatNotificationManagerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/GlobalChatNotificationManager.tsx → src/types.ts
- `AdminChatProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminChat.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (28 total, 7 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (7): DataService, findRequestById(), isSupabaseConfigured(), ChatMessage, GameAccount, PasswordResetToken, PaymentMethodType

### Community 1 - "AdminChat.tsx"
Cohesion: 0.07
Nodes (44): AdminChatCashoutModal(), AdminChatTopUpModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManagerProps, AdminChat(), AdminChatProps, CustomerChat() (+36 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.14
Nodes (30): App(), LazyEmailVerificationBanner, GlobalChatNotificationManager(), LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav() (+22 more)

### Community 4 - "walletActivityUtils.ts"
Cohesion: 0.14
Nodes (32): CustomerHome(), CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft() (+24 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "dataService.ts"
Cohesion: 0.12
Nodes (25): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+17 more)

### Community 7 - "api/index.ts"
Cohesion: 0.16
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.07
Nodes (27): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUpProps, loadAdminConfig() (+19 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "UserProfile"
Cohesion: 0.10
Nodes (21): BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RealtimeSyncBadge(), RoleSwitcher(), CustomerMobileNavProps, StaffMobileNavProps, TopNavbar() (+13 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.06
Nodes (36): LiveCashoutFeedList(), LiveCashoutFeedListProps, clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator() (+28 more)

### Community 16 - "CustomerHome.tsx"
Cohesion: 0.13
Nodes (14): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, CustomerHomeProps, loadAdminGameCatalog(), loadCustomerGameAccounts() (+6 more)

### Community 17 - "StartupSplash.tsx"
Cohesion: 0.31
Nodes (7): StartupSplash(), StartupSplashProps, CORE_ASSET_URLS, getCachedImagesCount(), memoryImageCache, preloadAssetPool(), preloadSingleImage()

### Community 18 - "react"
Cohesion: 0.23
Nodes (12): react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner() (+4 more)

### Community 19 - "lucide-react"
Cohesion: 0.14
Nodes (10): lucide-react, BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, LazyPageFallbackProps, LegalContentProps, SessionTimeoutWarningModalProps (+2 more)

### Community 20 - "UserRole"
Cohesion: 0.22
Nodes (10): SessionHydrationScreen(), SessionHydrationScreenProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel() (+2 more)

### Community 21 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, version

### Community 23 - "UserWallet"
Cohesion: 0.22
Nodes (11): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, TopUpModalMode, AuthenticatedUserMenuProps, CustomerProfileProps, CustomerWithdrawalProps (+3 more)

### Community 24 - "WithdrawalRequest"
Cohesion: 0.29
Nodes (9): mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), StaffTopUpDraftResult, StaffWithdrawalDraftResult, TopUpRequest (+1 more)

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `walletActivityUtils.ts`, `dataService.ts`, `supabaseClient.ts`, `UserProfile`, `CashoutFeedItem`, `useVerificationResolution.ts`, `CustomerHome.tsx`, `react`, `lucide-react`, `UserRole`, `UserWallet`, `WithdrawalRequest`, `AdminGameCredentials.tsx`, `AdminUsers.tsx`, `CustomerReferrals.tsx`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06939625260235947 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `walletActivityUtils.ts`, `dataService.ts`, `AuthSessionService`, `supabaseClient.ts`, `WebPushClient`, `useVerificationResolution.ts`, `CustomerHome.tsx`, `react`, `lucide-react`, `UserRole`, `UserWallet`, `AdminGameCredentials.tsx`, `AdminUsers.tsx`, `CustomerReferrals.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06631578947368422 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `walletActivityUtils.ts`, `dataService.ts`, `supabaseClient.ts`, `UserProfile`, `useVerificationResolution.ts`, `CustomerHome.tsx`, `StartupSplash.tsx`, `lucide-react`, `UserRole`, `UserWallet`, `AdminGameCredentials.tsx`, `AdminUsers.tsx`, `CustomerReferrals.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13903743315508021 - nodes in this community are weakly interconnected._