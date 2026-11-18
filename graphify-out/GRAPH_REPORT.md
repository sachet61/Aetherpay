# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 94 files · ~146,555 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 822 nodes · 2677 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b1958a8`
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
- NotificationSoundService
- supabaseClient.ts
- compilerOptions
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- vercel.json
- sw.js
- UserProfile

## God Nodes (most connected - your core abstractions)
1. `DataService` - 176 edges
2. `UserProfile` - 88 edges
3. `isSupabaseConfigured()` - 52 edges
4. `react` - 50 edges
5. `lucide-react` - 46 edges
6. `App()` - 38 edges
7. `dataService` - 36 edges
8. `UserWallet` - 29 edges
9. `AuthSessionService` - 26 edges
10. `SupabaseAuthService` - 24 edges

## Surprising Connections (you probably didn't know these)
- `EmailVerificationBannerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/EmailVerificationBanner.tsx → src/types.ts
- `AdminAuditProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminAudit.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts
- `AdminRequestsProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminRequests.tsx → src/types.ts
- `HydrationPhaseLabelInput` --references--> `UserRole`  [EXTRACTED]
  src/services/sessionHydrationUtils.ts → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (18 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (7): DataService, findRequestById(), isSupabaseConfigured(), GameAccount, PasswordResetToken, PaymentMethodType, SupportConversation

### Community 1 - "types.ts"
Cohesion: 0.05
Nodes (78): lucide-react, react, AdminChatCashoutModal(), CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModal(), TopUpModalMode, ChatTransactionCard() (+70 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.08
Nodes (43): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), CustomerMobileNav() (+35 more)

### Community 4 - "walletActivityUtils.ts"
Cohesion: 0.06
Nodes (66): AdminRequestsProps, CustomerHome(), CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadAdminRequests(), loadCustomerWallet(), RealtimeSyncStatus (+58 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "AuthSessionService"
Cohesion: 0.11
Nodes (12): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, AuthSessionService, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS (+4 more)

### Community 7 - "api/index.ts"
Cohesion: 0.11
Nodes (30): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+22 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.13
Nodes (12): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, loadAdminConfig(), getSupabaseConfig() (+4 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.07
Nodes (34): EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps, LiveCashoutTicker() (+26 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.06
Nodes (50): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminGameCatalog(), PRESET_GAME_ICONS, CustomerGameAccounts() (+42 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 26 - "UserProfile"
Cohesion: 0.07
Nodes (39): EmailOtpModalProps, AdminChatCashoutModalProps, AdminChatTopUpModalProps, BackgroundNotificationPromptProps, GlobalChatNotificationManagerProps, LiveCashoutFeedList(), BeforeInstallPromptEvent, PWAInstallButton() (+31 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `walletActivityUtils.ts`, `AuthSessionService`, `supabaseClient.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `UserProfile`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06665951051953628 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `App.tsx`, `walletActivityUtils.ts`, `AuthSessionService`, `supabaseClient.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053973013493253376 - nodes in this community are weakly interconnected._
- **Why does `react` connect `types.ts` to `package.json`, `App.tsx`, `walletActivityUtils.ts`, `AuthSessionService`, `supabaseClient.ts`, `useVerificationResolution.ts`, `assetPreloader.ts`, `UserProfile`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07617051013277429 - nodes in this community are weakly interconnected._