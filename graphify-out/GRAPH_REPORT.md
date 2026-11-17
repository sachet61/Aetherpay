# Graph Report - Aetherpay  (2026-11-17)

## Corpus Check
- 78 files · ~123,057 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 638 nodes · 2023 edges · 25 communities (21 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f1e30b9`
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
- dependencies
- vercel.json
- vite.config.ts
- scripts

## God Nodes (most connected - your core abstractions)
1. `DataService` - 165 edges
2. `UserProfile` - 83 edges
3. `isSupabaseConfigured()` - 48 edges
4. `react` - 44 edges
5. `lucide-react` - 42 edges
6. `dataService` - 33 edges
7. `App()` - 31 edges
8. `AuthSessionService` - 25 edges
9. `SupabaseAuthService` - 24 edges
10. `UserWallet` - 23 edges

## Surprising Connections (you probably didn't know these)
- `EmailOtpModalProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/auth/EmailOtpModal.tsx → src/types.ts
- `EmailVerificationBannerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/EmailVerificationBanner.tsx → src/types.ts
- `GlobalChatNotificationManagerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/GlobalChatNotificationManager.tsx → src/types.ts
- `PWAInstallButtonProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/PWAInstallButton.tsx → src/types.ts
- `AdminChatProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminChat.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (25 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (8): DataService, findRequestById(), isSupabaseConfigured(), ChatMessage, GameAccount, PasswordResetToken, PaymentMethodType, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.06
Nodes (52): @supabase/supabase-js@^2.49.1, @supabase/supabase-js, ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManagerProps, AdminChat(), AdminChatProps, CustomerChat() (+44 more)

### Community 2 - "package.json"
Cohesion: 0.14
Nodes (19): devDependencies, tsx@^4.19.2, @types/node@^22.13.0, @types/react@^19.0.8, @types/react-dom@^19.0.3, @types/web-push@^3.6.4, typescript@^5.7.3, @vitejs/plugin-react@^4.3.4 (+11 more)

### Community 3 - "supabaseClient.ts"
Cohesion: 0.13
Nodes (13): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUpProps, storageService (+5 more)

### Community 4 - "dataService.ts"
Cohesion: 0.09
Nodes (30): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString() (+22 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "App.tsx"
Cohesion: 0.15
Nodes (19): App(), GlobalChatNotificationManager(), LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), StartupSplash(), CustomerMobileNav(), StaffMobileNav() (+11 more)

### Community 7 - "api/index.ts"
Cohesion: 0.17
Nodes (21): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+13 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 10 - "dataService"
Cohesion: 0.16
Nodes (17): LiveCashoutFeedList(), LiveCashoutFeedListProps, PRESET_GAME_ICONS, AdminGameCredentialsProps, AdminRequestsProps, CustomerGameAccounts(), CustomerGameAccountsProps, CustomerHome() (+9 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "lucide-react"
Cohesion: 0.20
Nodes (12): EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps (+4 more)

### Community 14 - "UserProfile"
Cohesion: 0.11
Nodes (20): BackgroundNotificationPromptProps, AuthenticatedUserMenuProps, CustomerMobileNavProps, StaffMobileNavProps, TopNavbarProps, AdminAuditProps, AdminGameCatalogProps, AdminUsersProps (+12 more)

### Community 16 - "react"
Cohesion: 0.26
Nodes (9): react, PWAInstallButton(), RealtimeSyncBadge(), RoleSwitcher(), SwiftSweepsLogo(), SwiftSweepsLogoProps, TopNavbar(), AdminDashboard() (+1 more)

### Community 17 - "StartupSplash.tsx"
Cohesion: 0.29
Nodes (7): StartupSplashProps, CORE_ASSET_URLS, getCachedImagesCount(), memoryImageCache, preloadAssetPool(), preloadSingleImage(), DEFAULT_GAME_ICON

### Community 18 - "authSessionService.ts"
Cohesion: 0.25
Nodes (7): SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential

### Community 19 - "CustomerProfile.tsx"
Cohesion: 0.22
Nodes (11): lucide-react, BackgroundNotificationPrompt(), IOSPwaInstallModal(), IOSPwaInstallModalProps, BeforeInstallPromptEvent, PWAInstallButtonProps, CustomerProfile(), arrayBufferToBase64() (+3 more)

### Community 20 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, web-push@^3.6.7, react-dom, tailwindcss (+1 more)

### Community 21 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, version

### Community 23 - "vite.config.ts"
Cohesion: 0.29
Nodes (4): @tailwindcss/vite@^4.0.0, vite@^6.1.0, @tailwindcss/vite, vite

### Community 24 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, start

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `App.tsx`, `dataService`, `lucide-react`, `UserProfile`, `react`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06946031746031746 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `App.tsx`, `AuthSessionService`, `dataService`, `WebPushClient`, `lucide-react`, `SupabaseAuthService`, `react`, `authSessionService.ts`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05826330532212885 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `supabaseClient.ts`, `App.tsx`, `dataService`, `lucide-react`, `UserProfile`, `StartupSplash.tsx`, `authSessionService.ts`, `CustomerProfile.tsx`, `dependencies`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `supabaseClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._