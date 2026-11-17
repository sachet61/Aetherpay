# Graph Report - Aetherpay  (2026-11-17)

## Corpus Check
- 84 files · ~136,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 712 nodes · 2348 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c2c6a25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- App.tsx
- package.json
- supabaseClient.ts
- dataService.ts
- types/index.ts
- ChatMessage
- api/index.ts
- steps
- AuthSessionService
- supabaseClient.ts
- WebPushClient
- compilerOptions
- index.test.ts
- CashoutFeedItem
- useVerificationResolution.ts
- AdminConfig.tsx
- StartupSplash.tsx
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `DataService` - 174 edges
2. `UserProfile` - 88 edges
3. `isSupabaseConfigured()` - 50 edges
4. `react` - 47 edges
5. `lucide-react` - 44 edges
6. `dataService` - 36 edges
7. `App()` - 33 edges
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 26 edges
10. `SupabaseAuthService` - 24 edges

## Surprising Connections (you probably didn't know these)
- `EmailOtpModalProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/auth/EmailOtpModal.tsx → src/types.ts
- `BackgroundNotificationPromptProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/BackgroundNotificationPrompt.tsx → src/types.ts
- `PWAInstallButtonProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/PWAInstallButton.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts
- `AuthPageProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/auth/AuthPage.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (20 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (19): EmailVerificationBannerProps, GlobalChatNotificationManagerProps, CustomerMobileNavProps, StaffMobileNavProps, AdminAuditProps, AdminChatProps, AdminDashboardProps, AdminGameCatalogProps (+11 more)

### Community 1 - "App.tsx"
Cohesion: 0.05
Nodes (87): lucide-react, react, App(), LazyEmailVerificationBanner, AdminChatCashoutModal(), AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS (+79 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7, devDependencies (+30 more)

### Community 3 - "supabaseClient.ts"
Cohesion: 0.21
Nodes (4): TelegramBotConfigCard(), TelegramService, telegramService, TelegramStatus

### Community 4 - "dataService.ts"
Cohesion: 0.07
Nodes (60): CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest() (+52 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "ChatMessage"
Cohesion: 0.22
Nodes (9): ChatTransactionCardProps, compareMessagesChronologically(), isBotGreetingMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), sortAndDeduplicateMessages(), ChatMessage, ChatTransactionData (+1 more)

### Community 7 - "api/index.ts"
Cohesion: 0.19
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.17
Nodes (14): @supabase/supabase-js@^2.49.1, @supabase/supabase-js, DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_JWKS_URL, DEFAULT_SUPABASE_SERVICE_ROLE_KEY, DEFAULT_SUPABASE_URL, isPlaceholder(), resolveSupabaseAnonKey() (+6 more)

### Community 11 - "WebPushClient"
Cohesion: 0.11
Nodes (8): BeforeInstallPromptEvent, PWAInstallButtonProps, NotificationSoundService, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, webPushClient

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "index.test.ts"
Cohesion: 0.18
Nodes (5): ChannelEntry, ChatRoomListener, createRealtimeChatHub(), PostgresFilterConfig, supabase

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.05
Nodes (43): EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), LiveCashoutTicker() (+35 more)

### Community 16 - "AdminConfig.tsx"
Cohesion: 0.36
Nodes (7): PolicyAndPartnerCmsCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, getSupabaseConfig(), testSupabaseConnection()

### Community 17 - "StartupSplash.tsx"
Cohesion: 0.22
Nodes (10): StartupSplash(), StartupSplashProps, CORE_ASSET_URLS, getCachedImagesCount(), memoryImageCache, preloadAssetPool(), preloadSingleImage(), DEFAULT_GAME_ICON (+2 more)

### Community 21 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, version

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `App.tsx`, `dataService.ts`, `ChatMessage`, `CashoutFeedItem`, `useVerificationResolution.ts`, `AdminConfig.tsx`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06114461017666349 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `DataService` to `App.tsx`, `dataService.ts`, `AuthSessionService`, `WebPushClient`, `useVerificationResolution.ts`, `AdminConfig.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05012881064834693 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App.tsx` to `package.json`, `supabaseClient.ts`, `dataService.ts`, `WebPushClient`, `useVerificationResolution.ts`, `AdminConfig.tsx`, `StartupSplash.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `dataService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._