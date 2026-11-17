# Graph Report - Aetherpay  (2026-11-17)

## Corpus Check
- 76 files · ~120,668 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 623 nodes · 1947 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `33858302`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- supabaseClient.ts
- dataService.ts
- types/index.ts
- App.tsx
- api/index.ts
- steps
- AuthSessionService
- dataService
- WebPushClient
- compilerOptions
- lucide-react
- UserProfile
- SupabaseAuthService
- react
- StartupSplash.tsx
- authSessionService.ts
- CustomerProfile.tsx
- CashoutFeedItem
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `DataService` - 158 edges
2. `UserProfile` - 83 edges
3. `react` - 44 edges
4. `lucide-react` - 42 edges
5. `isSupabaseConfigured()` - 40 edges
6. `dataService` - 33 edges
7. `App()` - 31 edges
8. `AuthSessionService` - 25 edges
9. `SupabaseAuthService` - 24 edges
10. `UserWallet` - 23 edges

## Surprising Connections (you probably didn't know these)
- `BackgroundNotificationPromptProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/BackgroundNotificationPrompt.tsx → src/types.ts
- `PWAInstallButtonProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/PWAInstallButton.tsx → src/types.ts
- `AdminAuditProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminAudit.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts
- `AdminDashboardProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminDashboard.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (23 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (5): DataService, isSupabaseConfigured(), ChatMessage, GameAccount, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.08
Nodes (36): ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), AdminChat(), CustomerChat(), compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage() (+28 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "supabaseClient.ts"
Cohesion: 0.08
Nodes (25): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUpProps, DEFAULT_SUPABASE_ANON_KEY (+17 more)

### Community 4 - "dataService.ts"
Cohesion: 0.12
Nodes (30): AdminAuditProps, AdminRequestsProps, RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS (+22 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "App.tsx"
Cohesion: 0.14
Nodes (21): App(), BackgroundNotificationPrompt(), LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav(), useDataService() (+13 more)

### Community 7 - "api/index.ts"
Cohesion: 0.17
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "dataService"
Cohesion: 0.18
Nodes (11): LiveCashoutFeedList(), LiveCashoutFeedListProps, AdminGameCatalogProps, PRESET_GAME_ICONS, AdminGameCredentialsProps, CustomerWithdrawal(), dataService, GameCatalogItem (+3 more)

### Community 11 - "WebPushClient"
Cohesion: 0.22
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "lucide-react"
Cohesion: 0.25
Nodes (11): lucide-react, EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), LiveCashoutTicker() (+3 more)

### Community 14 - "UserProfile"
Cohesion: 0.14
Nodes (18): EmailOtpModalProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps, CustomerMobileNavProps, StaffMobileNavProps, TopNavbarProps, AdminChatProps, AuthPageProps (+10 more)

### Community 16 - "react"
Cohesion: 0.23
Nodes (10): react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RealtimeSyncBadge(), AuthenticatedUserMenuProps, RoleSwitcher(), TopNavbar() (+2 more)

### Community 17 - "StartupSplash.tsx"
Cohesion: 0.22
Nodes (10): StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, CORE_ASSET_URLS, getCachedImagesCount(), memoryImageCache, preloadAssetPool() (+2 more)

### Community 18 - "authSessionService.ts"
Cohesion: 0.18
Nodes (10): SessionTimeoutWarningModalProps, AdminUsersProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential (+2 more)

### Community 19 - "CustomerProfile.tsx"
Cohesion: 0.29
Nodes (7): BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), CustomerProfileProps, DevicePlatform, webPushClient

### Community 21 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, version

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `App.tsx`, `dataService`, `lucide-react`, `UserProfile`, `react`, `authSessionService.ts`, `CustomerProfile.tsx`, `CashoutFeedItem`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06851612903225807 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `AuthSessionService`, `dataService`, `WebPushClient`, `lucide-react`, `SupabaseAuthService`, `react`, `authSessionService.ts`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07945566286215978 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `supabaseClient.ts`, `dataService.ts`, `App.tsx`, `dataService`, `lucide-react`, `UserProfile`, `StartupSplash.tsx`, `authSessionService.ts`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `supabaseClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08253968253968254 - nodes in this community are weakly interconnected._