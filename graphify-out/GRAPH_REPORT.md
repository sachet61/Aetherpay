# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 96 files · ~147,360 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .webmanifest 1)

## Summary
- 828 nodes · 2692 edges · 25 communities (19 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `924bdc96`
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
- react
- supabaseClient.ts
- lucide-react
- compilerOptions
- dataService
- sessionHydrationUtils.ts
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- AdminAudit.tsx
- AdminGameCredentials.tsx
- AdminUsers.tsx
- vercel.json
- sw.js
- CustomerRules.tsx
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
- `BackgroundNotificationPromptProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/common/BackgroundNotificationPrompt.tsx → src/types.ts
- `AdminAuditProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminAudit.tsx → src/types.ts
- `AdminConfigProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminConfig.tsx → src/types.ts
- `AdminDashboardProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminDashboard.tsx → src/types.ts
- `AdminGameCredentialsProps` --references--> `UserProfile`  [EXTRACTED]
  src/pages/admin/AdminGameCredentials.tsx → src/types.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (25 total, 6 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.07
Nodes (6): DataService, findRequestById(), isSupabaseConfigured(), GameAccount, PaymentMethodType, SupportConversation

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (59): AdminChatCashoutModal(), AdminChatTopUpModal(), TopUpModalMode, ChatTransactionCard(), GlobalChatNotificationManager(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat() (+51 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.12
Nodes (32): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), CustomerMobileNav() (+24 more)

### Community 4 - "walletActivityUtils.ts"
Cohesion: 0.05
Nodes (75): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, ChatTransactionCardProps, LiveCashoutFeedListProps, CustomerHome(), CATEGORY_LABELS, CustomerWallet() (+67 more)

### Community 5 - "types/index.ts"
Cohesion: 0.06
Nodes (34): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+26 more)

### Community 6 - "AuthSessionService"
Cohesion: 0.12
Nodes (10): SessionHydrationScreenProps, AuthSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex(), StoredCredential (+2 more)

### Community 7 - "api/index.ts"
Cohesion: 0.16
Nodes (24): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), getWebPushClient(), handleGetChatMessages(), handlePostChatSend(), handler() (+16 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "react"
Cohesion: 0.20
Nodes (12): react, EmailOtpModal(), BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, EmailVerificationBanner(), IOSPwaInstallModal(), IOSPwaInstallModalProps, SessionTimeoutWarningModalProps (+4 more)

### Community 10 - "supabaseClient.ts"
Cohesion: 0.08
Nodes (26): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUpProps, loadAdminConfig() (+18 more)

### Community 11 - "lucide-react"
Cohesion: 0.27
Nodes (9): lucide-react, BeforeInstallPromptEvent, PWAInstallButton(), RealtimeSyncBadge(), RoleSwitcher(), TopNavbar(), AdminDashboard(), AdminDashboardProps (+1 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.30
Nodes (9): ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, LiveCashoutTicker(), AuthPage(), dataService, PasswordResetResponse (+1 more)

### Community 14 - "sessionHydrationUtils.ts"
Cohesion: 0.43
Nodes (5): getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel(), shouldShowSessionHydrationGate()

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.06
Nodes (50): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminGameCatalog(), PRESET_GAME_ICONS, CustomerGameAccounts() (+42 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 26 - "UserProfile"
Cohesion: 0.09
Nodes (26): EmailOtpModalProps, AdminChatTopUpModalProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps, LiveCashoutFeedList(), PWAInstallButtonProps, AuthenticatedUserMenuProps, CustomerMobileNavProps (+18 more)

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `walletActivityUtils.ts`, `AuthSessionService`, `react`, `supabaseClient.ts`, `lucide-react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `AdminGameCredentials.tsx`, `AdminUsers.tsx`, `CustomerRules.tsx`, `UserProfile`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.06755113322277502 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `walletActivityUtils.ts`, `AuthSessionService`, `react`, `supabaseClient.ts`, `lucide-react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `AdminAudit.tsx`, `AdminGameCredentials.tsx`, `AdminUsers.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062285223367697595 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `walletActivityUtils.ts`, `supabaseClient.ts`, `lucide-react`, `dataService`, `useVerificationResolution.ts`, `assetPreloader.ts`, `AdminAudit.tsx`, `AdminGameCredentials.tsx`, `AdminUsers.tsx`, `CustomerRules.tsx`, `UserProfile`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11806543385490754 - nodes in this community are weakly interconnected._