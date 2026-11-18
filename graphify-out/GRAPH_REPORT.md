# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 92 files · ~140,740 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 800 nodes · 2568 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5413bda`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- walletActivityUtils.ts
- types/index.ts
- api/index.ts
- steps
- supabaseClient.ts
- compilerOptions
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- vercel.json
- sw.js
- dataService.ts

## God Nodes (most connected - your core abstractions)
1. `DataService` - 175 edges
2. `UserProfile` - 88 edges
3. `isSupabaseConfigured()` - 51 edges
4. `react` - 50 edges
5. `lucide-react` - 46 edges
6. `App()` - 38 edges
7. `dataService` - 36 edges
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 26 edges
10. `SupabaseAuthService` - 24 edges

## Surprising Connections (you probably didn't know these)
- `AdminChatProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminChat.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts
- `AdminGameCatalogProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminGameCatalog.tsx → src/types.ts
- `CustomerChatProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/customer/CustomerChat.tsx → src/types.ts
- `SupabaseAuthResult` --references--> `UserProfile`  [EXTRACTED]
  src/services/supabaseAuthService.ts → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (16 total, 2 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (8): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, PasswordResetToken, PaymentMethodType, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.07
Nodes (40): AdminChatCashoutModal(), AdminChatTopUpModal(), ChatTransactionCard(), ChatTransactionCardProps, AdminChat(), AdminChatProps, CustomerChat(), CustomerChatProps (+32 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.07
Nodes (47): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), GlobalChatNotificationManager(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps (+39 more)

### Community 4 - "walletActivityUtils.ts"
Cohesion: 0.10
Nodes (42): LiveCashoutFeedList(), CustomerHome(), CATEGORY_LABELS, CustomerWallet(), loadCustomerHome(), loadCustomerWallet(), mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest() (+34 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 7 - "api/index.ts"
Cohesion: 0.16
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.08
Nodes (24): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, loadAdminConfig(), DEFAULT_SUPABASE_ANON_KEY (+16 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.05
Nodes (38): SessionHydrationScreenProps, clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser() (+30 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.06
Nodes (50): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS (+42 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 26 - "dataService.ts"
Cohesion: 0.05
Nodes (81): lucide-react, react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps (+73 more)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `walletActivityUtils.ts`, `supabaseClient.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `dataService.ts`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06063218390804598 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `dataService.ts` to `DataService`, `AdminChat.tsx`, `walletActivityUtils.ts`, `supabaseClient.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07163561076604555 - nodes in this community are weakly interconnected._
- **Why does `react` connect `dataService.ts` to `AdminChat.tsx`, `package.json`, `App.tsx`, `walletActivityUtils.ts`, `supabaseClient.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06957047791893527 - nodes in this community are weakly interconnected._