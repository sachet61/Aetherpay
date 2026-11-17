# Graph Report - Aetherpay  (2026-11-17)

## Corpus Check
- 82 files · ~130,426 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 693 nodes · 2244 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `29ffb451`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- supabaseClient.ts
- dataService.ts
- types/index.ts
- UserProfile
- api/index.ts
- steps
- AuthSessionService
- WebPushClient
- compilerOptions
- walletActivityUtils.ts
- useVerificationResolution.ts
- StartupSplash.tsx
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `DataService` - 170 edges
2. `UserProfile` - 84 edges
3. `isSupabaseConfigured()` - 48 edges
4. `react` - 45 edges
5. `lucide-react` - 42 edges
6. `dataService` - 34 edges
7. `App()` - 33 edges
8. `AuthSessionService` - 26 edges
9. `UserWallet` - 25 edges
10. `SupabaseAuthService` - 24 edges

## Surprising Connections (you probably didn't know these)
- `GlobalChatNotificationManagerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/GlobalChatNotificationManager.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts
- `App()` --calls--> `AdminChat()`  [EXTRACTED]
  src/App.tsx → src/pages/admin/AdminChat.tsx
- `App()` --calls--> `AdminConfig()`  [EXTRACTED]
  src/App.tsx → src/pages/admin/AdminConfig.tsx
- `App()` --calls--> `CustomerChat()`  [EXTRACTED]
  src/App.tsx → src/pages/customer/CustomerChat.tsx

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (17 total, 1 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (8): DataService, findRequestById(), isSupabaseConfigured(), GameAccount, PasswordResetToken, PaymentMethodType, SupportConversation, WithdrawalStatus

### Community 1 - "AdminChat.tsx"
Cohesion: 0.09
Nodes (34): ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManagerProps, AdminChat(), CustomerChat(), compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage() (+26 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (39): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+31 more)

### Community 3 - "supabaseClient.ts"
Cohesion: 0.09
Nodes (23): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_JWKS_URL (+15 more)

### Community 4 - "dataService.ts"
Cohesion: 0.09
Nodes (29): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString() (+21 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "UserProfile"
Cohesion: 0.05
Nodes (88): lucide-react, react, react-dom, App(), LazyEmailVerificationBanner, EmailOtpModal(), EmailOtpModalProps, ForgotPassword() (+80 more)

### Community 7 - "api/index.ts"
Cohesion: 0.11
Nodes (25): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+17 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "AuthSessionService"
Cohesion: 0.13
Nodes (9): AuthSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex(), StoredCredential, UserSession (+1 more)

### Community 11 - "WebPushClient"
Cohesion: 0.22
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "walletActivityUtils.ts"
Cohesion: 0.18
Nodes (24): CATEGORY_LABELS, CustomerWallet(), ActivityStatusMeta, buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits(), deriveLatestCompletedTopUp(), extractLinkedRequestId(), filterUnifiedWalletActivity() (+16 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.08
Nodes (22): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), SupabaseAuthService (+14 more)

### Community 17 - "StartupSplash.tsx"
Cohesion: 0.23
Nodes (9): StartupSplashProps, CORE_ASSET_URLS, getCachedImagesCount(), memoryImageCache, preloadAssetPool(), preloadSingleImage(), DEFAULT_GAME_ICON, LOCAL_GAME_IMAGES (+1 more)

### Community 21 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, version

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `UserProfile`, `AuthSessionService`, `walletActivityUtils.ts`, `useVerificationResolution.ts`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06764533176746917 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `AuthSessionService`, `WebPushClient`, `walletActivityUtils.ts`, `useVerificationResolution.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09114183307731695 - nodes in this community are weakly interconnected._
- **Why does `react` connect `UserProfile` to `AdminChat.tsx`, `package.json`, `supabaseClient.ts`, `walletActivityUtils.ts`, `useVerificationResolution.ts`, `StartupSplash.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06201550387596899 - nodes in this community are weakly interconnected._
- **Should `supabaseClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0873440285204991 - nodes in this community are weakly interconnected._