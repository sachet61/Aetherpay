# Graph Report - Aetherpay  (2026-11-19)

## Corpus Check
- 117 files · ~193,949 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1064 nodes · 3484 edges · 37 communities (34 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7b443de`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- types.ts
- types/index.ts
- AuthSessionService
- types.ts
- steps
- assetPreloader.ts
- AdminConfig.tsx
- GlobalChatNotificationManager.tsx
- compilerOptions
- dataService
- api/index.ts
- useVerificationResolution.ts
- AdminGameCatalog.tsx
- WebPushClient
- AdminAudit.tsx
- supabaseTokenManager.ts
- dataService.ts
- vercel.json
- sw.js
- dataService.ts
- CustomerChat
- CustomerProfile.tsx
- UserProfile
- AdminChatTopUpModal.tsx
- AdminChatCashoutModal.tsx
- dataService
- chatOrderUtils.ts
- NotificationSoundService
- toProxyStorageUrl
- CustomerWallet.tsx
- CustomerChat.tsx
- TopUpRequest
- AdminGameCredentials.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 195 edges
2. `UserProfile` - 93 edges
3. `isSupabaseConfigured()` - 59 edges
4. `react` - 51 edges
5. `lucide-react` - 47 edges
6. `App()` - 38 edges
7. `dataService` - 37 edges
8. `AdminChat()` - 30 edges
9. `UserWallet` - 30 edges
10. `CustomerChat()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `loadReferralProgramConfig()` --calls--> `normalizeReferralConfig()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `computeRefereeRealCashDeposits()` --calls--> `isRealCashTopUpRow()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `reconcileMissingReferralRewards()` --calls--> `calculateReferralPayouts()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `resolveUserByIdentifier()` --calls--> `normalizeReferralCodeInput()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (37 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.06
Nodes (11): DataService, findRequestById(), isSupabaseConfigured(), computeCumulativeCompletedDeposits(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken (+3 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.24
Nodes (19): AdminChatCashoutModal(), AdminChatTopUpModal(), AdminChat(), TICKET_STATUS_OPTIONS, buildGroupedMessages(), CHAT_QUICK_EMOJIS, deriveTruthfulConnectionStatus(), filterVisibleMessagesForRole() (+11 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.11
Nodes (33): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), SessionTimeoutWarningModalProps (+25 more)

### Community 4 - "types.ts"
Cohesion: 0.16
Nodes (14): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+6 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 6 - "AuthSessionService"
Cohesion: 0.12
Nodes (11): SessionHydrationScreenProps, AuthSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex(), StoredCredential (+3 more)

### Community 7 - "types.ts"
Cohesion: 0.12
Nodes (19): ChatTransactionCardProps, ChatTransactionData, GameAccountStatus, ReferralAwardStatus, ReferralLedgerEntry, ReferralPayoutTarget, ReferralProgramConfig, ReferralRewardMode (+11 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "assetPreloader.ts"
Cohesion: 0.06
Nodes (47): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, getPrefetchRouteKeysForRole(), HydrationGateInput, resolveHydrationPhaseLabel() (+39 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.07
Nodes (36): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), loadAdminConfig() (+28 more)

### Community 11 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.12
Nodes (16): GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, realtimeChatHub, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId() (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "dataService"
Cohesion: 0.22
Nodes (13): lucide-react, EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps (+5 more)

### Community 14 - "api/index.ts"
Cohesion: 0.05
Nodes (93): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+85 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 16 - "AdminGameCatalog.tsx"
Cohesion: 0.20
Nodes (11): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), loadAdminGameCatalog(), loadCustomerGameAccounts(), GameCatalogItem, GameLink (+3 more)

### Community 17 - "WebPushClient"
Cohesion: 0.15
Nodes (9): supabaseTokenManager, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv (+1 more)

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.22
Nodes (13): AdminAudit(), loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs() (+5 more)

### Community 19 - "supabaseTokenManager.ts"
Cohesion: 0.13
Nodes (13): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+5 more)

### Community 20 - "dataService.ts"
Cohesion: 0.16
Nodes (18): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+10 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.17
Nodes (25): CustomerHome(), loadCustomerHome(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedWithdrawals(), deriveLatestCompletedTopUp() (+17 more)

### Community 24 - "CustomerChat"
Cohesion: 0.19
Nodes (18): CustomerChat(), buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction() (+10 more)

### Community 25 - "CustomerProfile.tsx"
Cohesion: 0.31
Nodes (8): react, BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), loadCustomerProfile(), webPushClient

### Community 26 - "UserProfile"
Cohesion: 0.11
Nodes (26): EmailOtpModalProps, AdminChatTopUpModalProps, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, AuthenticatedUserMenuProps, RoleSwitcher(), CustomerMobileNavProps (+18 more)

### Community 27 - "AdminChatTopUpModal.tsx"
Cohesion: 0.28
Nodes (9): TopUpModalMode, fileToBase64(), StorageService, storageService, StorageUploadResult, buildProxyStorageUrl(), compressImageToWebP(), CompressionOptions (+1 more)

### Community 28 - "AdminChatCashoutModal.tsx"
Cohesion: 0.33
Nodes (6): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, StaffWithdrawalDraftResult, PayoutMethodType, WithdrawalRequest

### Community 29 - "dataService"
Cohesion: 0.15
Nodes (9): LiveCashoutFeedList(), LiveCashoutFeedListProps, AdminRequestsProps, CustomerRulesProps, CustomerWithdrawal(), loadAdminRequests(), loadCustomerRules(), loadCustomerWithdrawal() (+1 more)

### Community 30 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 32 - "toProxyStorageUrl"
Cohesion: 0.42
Nodes (7): ChatTransactionCard(), extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl(), toProxyStorageUrl(), supabaseUrl

### Community 33 - "CustomerWallet.tsx"
Cohesion: 0.28
Nodes (8): CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), filterUnifiedWalletActivity(), getActivityStatusMeta(), UnifiedWalletActivityItem, WalletActivityFilter

### Community 34 - "CustomerChat.tsx"
Cohesion: 0.50
Nodes (5): ComputedChatViewportState, computeVisualViewportState(), resolveFullscreenViewportStyle(), shouldSubmitOnTextareaKeyDown(), VisualViewportMetrics

### Community 35 - "TopUpRequest"
Cohesion: 0.54
Nodes (6): mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), TopUpRequest

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `types.ts`, `AuthSessionService`, `AdminConfig.tsx`, `GlobalChatNotificationManager.tsx`, `dataService`, `useVerificationResolution.ts`, `AdminGameCatalog.tsx`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `CustomerProfile.tsx`, `UserProfile`, `AdminChatTopUpModal.tsx`, `AdminChatCashoutModal.tsx`, `dataService`, `toProxyStorageUrl`, `CustomerWallet.tsx`, `CustomerChat.tsx`, `AdminGameCredentials.tsx`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.056364939097205635 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `types.ts`, `AuthSessionService`, `types.ts`, `AdminConfig.tsx`, `GlobalChatNotificationManager.tsx`, `dataService`, `useVerificationResolution.ts`, `AdminGameCatalog.tsx`, `WebPushClient`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `CustomerProfile.tsx`, `AdminChatTopUpModal.tsx`, `AdminChatCashoutModal.tsx`, `dataService`, `CustomerWallet.tsx`, `CustomerChat.tsx`, `AdminGameCredentials.tsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Why does `react` connect `CustomerProfile.tsx` to `AdminChat.tsx`, `package.json`, `App.tsx`, `types.ts`, `assetPreloader.ts`, `AdminConfig.tsx`, `GlobalChatNotificationManager.tsx`, `dataService`, `useVerificationResolution.ts`, `AdminGameCatalog.tsx`, `AdminAudit.tsx`, `dataService.ts`, `dataService.ts`, `UserProfile`, `AdminChatTopUpModal.tsx`, `AdminChatCashoutModal.tsx`, `dataService`, `toProxyStorageUrl`, `CustomerWallet.tsx`, `CustomerChat.tsx`, `AdminGameCredentials.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11153846153846154 - nodes in this community are weakly interconnected._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._