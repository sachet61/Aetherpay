# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 91 files · ~138,506 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 780 nodes · 2490 edges · 25 communities (22 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fc00c8a`
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
- react
- CashoutFeedItem
- useVerificationResolution.ts
- AdminGameCatalog.tsx
- webPushClient.ts
- react
- CustomerProfile.tsx
- lucide-react
- vercel.json
- UserWallet
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
- `BackgroundNotificationPromptProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/BackgroundNotificationPrompt.tsx → src/types.ts
- `EmailVerificationBannerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/EmailVerificationBanner.tsx → src/types.ts
- `PWAInstallButtonProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/PWAInstallButton.tsx → src/types.ts
- `AdminChatProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminChat.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (25 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (7): DataService, findRequestById(), isSupabaseConfigured(), ChatMessage, PasswordResetToken, PaymentMethodType, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.07
Nodes (53): @supabase/supabase-js@^2.49.1, @supabase/supabase-js, AdminChatCashoutModal(), AdminChatTopUpModal(), ChatTransactionCard(), ChatTransactionCardProps, AdminChat(), AdminChatProps (+45 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.07
Nodes (51): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), GlobalChatNotificationManager(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps (+43 more)

### Community 4 - "walletActivityUtils.ts"
Cohesion: 0.10
Nodes (41): CustomerHome(), CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests() (+33 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "dataService.ts"
Cohesion: 0.12
Nodes (25): AdminRequestsProps, loadAdminRequests(), RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS (+17 more)

### Community 7 - "api/index.ts"
Cohesion: 0.15
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "AuthSessionService"
Cohesion: 0.11
Nodes (13): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, AuthSessionService, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS (+5 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.13
Nodes (12): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, loadAdminConfig(), getSupabaseConfig() (+4 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "react"
Cohesion: 0.18
Nodes (14): react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RealtimeSyncBadge(), AuthenticatedUserMenuProps, RoleSwitcher(), TopNavbar() (+6 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "AdminGameCatalog.tsx"
Cohesion: 0.24
Nodes (8): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, loadAdminGameCatalog(), GameLink, resolveGameImageUrl()

### Community 17 - "webPushClient.ts"
Cohesion: 0.08
Nodes (25): StartupSplashProps, NotificationSoundService, notificationSoundService, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), CORE_ASSET_URLS, getCachedImagesCount() (+17 more)

### Community 18 - "react"
Cohesion: 0.21
Nodes (13): EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps (+5 more)

### Community 19 - "CustomerProfile.tsx"
Cohesion: 0.21
Nodes (8): BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), CustomerProfileProps, CustomerTopUpProps, storageService, webPushClient

### Community 20 - "lucide-react"
Cohesion: 0.43
Nodes (5): lucide-react, LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerWithdrawal(), CustomerWithdrawalProps

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "UserWallet"
Cohesion: 0.23
Nodes (9): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, TopUpModalMode, AdminGameCredentialsProps, GameAccount, GameCatalogItem (+1 more)

### Community 26 - "UserProfile"
Cohesion: 0.17
Nodes (9): GlobalChatNotificationManagerProps, CustomerMobileNavProps, StaffMobileNavProps, AdminAuditProps, AdminUsersProps, AuthPageProps, CustomerHomeProps, SupabaseAuthResult (+1 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `walletActivityUtils.ts`, `dataService.ts`, `AuthSessionService`, `supabaseClient.ts`, `react`, `CashoutFeedItem`, `useVerificationResolution.ts`, `AdminGameCatalog.tsx`, `react`, `CustomerProfile.tsx`, `lucide-react`, `UserWallet`, `UserProfile`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.0664488017429194 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `walletActivityUtils.ts`, `dataService.ts`, `AuthSessionService`, `supabaseClient.ts`, `WebPushClient`, `react`, `useVerificationResolution.ts`, `AdminGameCatalog.tsx`, `webPushClient.ts`, `react`, `CustomerProfile.tsx`, `lucide-react`, `UserWallet`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06590151795631248 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `walletActivityUtils.ts`, `dataService.ts`, `AuthSessionService`, `supabaseClient.ts`, `useVerificationResolution.ts`, `AdminGameCatalog.tsx`, `webPushClient.ts`, `react`, `CustomerProfile.tsx`, `lucide-react`, `UserWallet`, `UserProfile`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06554019457245264 - nodes in this community are weakly interconnected._