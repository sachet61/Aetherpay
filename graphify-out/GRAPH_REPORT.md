# Graph Report - Aetherpay  (2026-11-17)

## Corpus Check
- 81 files · ~124,748 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 665 nodes · 2128 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0583316f`
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
- useVerificationResolution.ts
- react
- StartupSplash.tsx
- react
- CustomerProfile.tsx
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `DataService` - 166 edges
2. `UserProfile` - 84 edges
3. `isSupabaseConfigured()` - 48 edges
4. `react` - 45 edges
5. `lucide-react` - 42 edges
6. `dataService` - 34 edges
7. `App()` - 33 edges
8. `AuthSessionService` - 26 edges
9. `SupabaseAuthService` - 24 edges
10. `UserWallet` - 23 edges

## Surprising Connections (you probably didn't know these)
- `EmailOtpModalProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/auth/EmailOtpModal.tsx → src/types.ts
- `BackgroundNotificationPromptProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/BackgroundNotificationPrompt.tsx → src/types.ts
- `EmailVerificationBannerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/EmailVerificationBanner.tsx → src/types.ts
- `GlobalChatNotificationManagerProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/GlobalChatNotificationManager.tsx → src/types.ts
- `PWAInstallButtonProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/PWAInstallButton.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (22 total, 2 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (8): DataService, findRequestById(), isSupabaseConfigured(), ChatMessage, GameAccount, PasswordResetToken, PaymentMethodType, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.07
Nodes (48): ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManagerProps, AdminChat(), CustomerChat(), compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage() (+40 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7, devDependencies (+30 more)

### Community 3 - "supabaseClient.ts"
Cohesion: 0.14
Nodes (11): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, getSupabaseConfig(), testSupabaseConnection() (+3 more)

### Community 4 - "dataService.ts"
Cohesion: 0.10
Nodes (30): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString() (+22 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "App.tsx"
Cohesion: 0.11
Nodes (20): App(), LazyEmailVerificationBanner, GlobalChatNotificationManager(), LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), SessionTimeoutWarningModalProps, CustomerMobileNav() (+12 more)

### Community 7 - "api/index.ts"
Cohesion: 0.11
Nodes (27): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+19 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "AuthSessionService"
Cohesion: 0.14
Nodes (9): AuthSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex(), StoredCredential, UserSession (+1 more)

### Community 10 - "dataService"
Cohesion: 0.14
Nodes (15): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, AdminGameCredentials(), AdminGameCredentialsProps, AdminRequests(), AdminRequestsProps, CustomerGameAccounts() (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "lucide-react"
Cohesion: 0.21
Nodes (13): EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps (+5 more)

### Community 14 - "UserProfile"
Cohesion: 0.13
Nodes (15): TopNavbarProps, AdminChatProps, AuthPageProps, CustomerChatProps, CustomerHomeProps, CustomerProfileProps, CustomerReferrals(), CustomerReferralsProps (+7 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.08
Nodes (22): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), SupabaseAuthService (+14 more)

### Community 16 - "react"
Cohesion: 0.19
Nodes (11): BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RealtimeSyncBadge(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps (+3 more)

### Community 17 - "StartupSplash.tsx"
Cohesion: 0.24
Nodes (8): CORE_ASSET_URLS, getCachedImagesCount(), memoryImageCache, preloadAssetPool(), preloadSingleImage(), DEFAULT_GAME_ICON, LOCAL_GAME_IMAGES, LocalGameAsset

### Community 18 - "react"
Cohesion: 0.30
Nodes (8): react, LiveCashoutFeedList(), LiveCashoutFeedListProps, AuthenticatedUserMenuProps, RoleSwitcher(), useVerificationResolution(), CustomerHome(), CustomerWithdrawal()

### Community 19 - "CustomerProfile.tsx"
Cohesion: 0.36
Nodes (7): lucide-react, BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), webPushClient

### Community 21 - "vercel.json"
Cohesion: 0.50
Nodes (3): framework, rewrites, version

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `App.tsx`, `dataService`, `lucide-react`, `UserProfile`, `useVerificationResolution.ts`, `react`, `react`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.07041699449252557 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `supabaseClient.ts`, `dataService.ts`, `App.tsx`, `AuthSessionService`, `dataService`, `WebPushClient`, `lucide-react`, `useVerificationResolution.ts`, `react`, `react`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `AdminChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06626706626706627 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `supabaseClient.ts`, `App.tsx`, `dataService`, `lucide-react`, `UserProfile`, `useVerificationResolution.ts`, `react`, `CustomerProfile.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `supabaseClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._