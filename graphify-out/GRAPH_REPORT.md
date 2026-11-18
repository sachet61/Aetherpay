# Graph Report - Aetherpay  (2026-11-18)

## Corpus Check
- 117 files · ~189,517 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1062 nodes · 3458 edges · 31 communities (28 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8210d3a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- types.ts
- package.json
- App.tsx
- types.ts
- types/index.ts
- supabaseAuthService.ts
- api/index.ts
- steps
- referralHandlers.ts
- AdminConfig.tsx
- CustomerProfile.tsx
- compilerOptions
- react
- CustomerHome.tsx
- useVerificationResolution.ts
- assetPreloader.ts
- WebPushClient
- auditLogUtils.ts
- dataService.ts
- AdminReferralGovernancePanel.tsx
- vercel.json
- sw.js
- walletActivityUtils.ts
- UserRole
- SessionHydrationScreen.tsx
- UserWallet
- WithdrawalRequest
- pushUtils.ts
- TopNavbar.tsx
- CashoutFeedItem

## God Nodes (most connected - your core abstractions)
1. `DataService` - 194 edges
2. `UserProfile` - 93 edges
3. `isSupabaseConfigured()` - 58 edges
4. `react` - 51 edges
5. `lucide-react` - 47 edges
6. `App()` - 38 edges
7. `dataService` - 37 edges
8. `AdminChat()` - 30 edges
9. `UserWallet` - 29 edges
10. `CustomerChat()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `loadReferralProgramConfig()` --calls--> `normalizeReferralConfig()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralEvaluate()` --calls--> `checkReferralBudgetCaps()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralEvaluate()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostManualAssignReferral()` --calls--> `checkReferralBudgetCaps()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (31 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (20): EmailOtpModalProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps, CustomerMobileNavProps, StaffMobileNavProps, AdminChatProps, AuthPageProps, CustomerChatProps (+12 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (74): AdminChatCashoutModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), compareMessagesChronologically() (+66 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (41): getWebPushClient(), dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0 (+33 more)

### Community 3 - "App.tsx"
Cohesion: 0.14
Nodes (29): App(), LazyEmailVerificationBanner, LazyPageFallback(), LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav(), useDataService() (+21 more)

### Community 4 - "types.ts"
Cohesion: 0.15
Nodes (20): ReferralAwardStatus, ReferralLedgerEntry, ReferralPayoutTarget, ReferralProgramConfig, ReferralRewardMode, ReferralWelcomeBonus, ReferredUser, TopReferrerEntry (+12 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 6 - "supabaseAuthService.ts"
Cohesion: 0.06
Nodes (28): AuthSessionService, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex(), StoredCredential (+20 more)

### Community 7 - "api/index.ts"
Cohesion: 0.08
Nodes (49): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+41 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "referralHandlers.ts"
Cohesion: 0.20
Nodes (29): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+21 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.06
Nodes (45): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+37 more)

### Community 11 - "CustomerProfile.tsx"
Cohesion: 0.26
Nodes (8): EmailOtpModal(), BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, EmailVerificationBanner(), IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), loadCustomerProfile()

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "react"
Cohesion: 0.10
Nodes (20): lucide-react, react, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, LazyPageFallbackProps, LegalContentProps (+12 more)

### Community 14 - "CustomerHome.tsx"
Cohesion: 0.14
Nodes (16): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerHome(), CustomerHomeProps, CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, CustomerWithdrawal() (+8 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "assetPreloader.ts"
Cohesion: 0.06
Nodes (45): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), CustomerGameAccountsProps, loadAdminGameCatalog(), loadCustomerGameAccounts(), GameLink (+37 more)

### Community 18 - "auditLogUtils.ts"
Cohesion: 0.24
Nodes (12): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs() (+4 more)

### Community 19 - "dataService.ts"
Cohesion: 0.15
Nodes (19): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+11 more)

### Community 20 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.18
Nodes (13): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), AdminDashboard(), AdminDashboardProps (+5 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "walletActivityUtils.ts"
Cohesion: 0.20
Nodes (23): ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits(), computeCumulativeCompletedWithdrawals(), deriveLatestCompletedTopUp(), extractLinkedRequestId() (+15 more)

### Community 24 - "UserRole"
Cohesion: 0.23
Nodes (9): SessionHydrationScreenProps, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput (+1 more)

### Community 25 - "SessionHydrationScreen.tsx"
Cohesion: 0.33
Nodes (11): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, normalizeAssetUrlList(), preloadAssetPool(), preloadSingleImage() (+3 more)

### Community 26 - "UserWallet"
Cohesion: 0.14
Nodes (16): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, AuthenticatedUserMenuProps, TopNavbarProps, CustomerProfileProps, CustomerReferrals() (+8 more)

### Community 27 - "WithdrawalRequest"
Cohesion: 0.29
Nodes (9): mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), StaffTopUpDraftResult, StaffWithdrawalDraftResult, TopUpRequest (+1 more)

### Community 28 - "pushUtils.ts"
Cohesion: 0.31
Nodes (8): deactivatePushSubscriptionsInList(), hashEndpointId(), NormalizedPushSubscription, normalizePushSubscriptionPayload(), normalizePushUserRole(), PushSubscriptionRecord, rebindPushSubscriptionList(), RESERVED_NON_USER_IDS

### Community 29 - "TopNavbar.tsx"
Cohesion: 0.33
Nodes (6): BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RoleSwitcher(), TopNavbar(), webPushClient

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `supabaseAuthService.ts`, `AdminConfig.tsx`, `CustomerProfile.tsx`, `react`, `CustomerHome.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `auditLogUtils.ts`, `dataService.ts`, `AdminReferralGovernancePanel.tsx`, `UserRole`, `UserWallet`, `WithdrawalRequest`, `TopNavbar.tsx`, `CashoutFeedItem`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05228185469149325 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `DataService` to `types.ts`, `types.ts`, `supabaseAuthService.ts`, `AdminConfig.tsx`, `CustomerProfile.tsx`, `react`, `CustomerHome.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `WebPushClient`, `auditLogUtils.ts`, `dataService.ts`, `AdminReferralGovernancePanel.tsx`, `UserRole`, `UserWallet`, `TopNavbar.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055895344886170574 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `AdminConfig.tsx`, `CustomerProfile.tsx`, `CustomerHome.tsx`, `useVerificationResolution.ts`, `assetPreloader.ts`, `auditLogUtils.ts`, `dataService.ts`, `AdminReferralGovernancePanel.tsx`, `SessionHydrationScreen.tsx`, `UserWallet`, `TopNavbar.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0595959595959596 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14393939393939395 - nodes in this community are weakly interconnected._