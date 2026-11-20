# Graph Report - Aetherpay  (2026-11-20)

## Corpus Check
- 131 files · ~219,784 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1198 nodes · 3911 edges · 41 communities (36 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `baf003ca`
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
- audit.mjs
- steps
- pwaAssets.ts
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- CustomerChat
- GlobalChatNotificationManager.tsx
- useVerificationResolution.ts
- dataService
- WebPushClient
- AdminAudit.tsx
- supabaseAuthService.ts
- dataService.ts
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- SupabaseAuthService
- imageUtils.test.ts
- UserRole
- toProxyStorageUrl
- AdminGameCatalog.tsx
- api/index.ts
- supabaseClient.ts
- pushUtils.ts
- authSessionService.ts
- types.ts
- UserProfile
- AuthTokenCoordinator
- chatOrderUtils.ts
- CustomerChat.tsx
- NotificationSoundService

## God Nodes (most connected - your core abstractions)
1. `DataService` - 202 edges
2. `UserProfile` - 96 edges
3. `isSupabaseConfigured()` - 60 edges
4. `react` - 56 edges
5. `lucide-react` - 51 edges
6. `App()` - 40 edges
7. `dataService` - 40 edges
8. `UserWallet` - 32 edges
9. `handler()` - 31 edges
10. `AdminChat()` - 30 edges

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

## Communities (41 total, 5 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (8): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, PasswordResetToken, SupportConversation

### Community 1 - "AdminChat.tsx"
Cohesion: 0.21
Nodes (21): AdminChatCashoutModal(), AdminChatTopUpModal(), AdminChat(), AdminChatProps, TICKET_STATUS_OPTIONS, storageService, buildGroupedMessages(), CHAT_QUICK_EMOJIS (+13 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.10
Nodes (38): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), SessionTimeoutWarningModal(), CustomerMobileNav() (+30 more)

### Community 4 - "types.ts"
Cohesion: 0.12
Nodes (19): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps (+11 more)

### Community 5 - "types/index.ts"
Cohesion: 0.05
Nodes (41): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+33 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "pwaAssets.ts"
Cohesion: 0.12
Nodes (17): GlobalChatNotificationManager(), BrowserNotificationEnv, BrowserNotificationResult, claimNotificationAlertId(), dispatchBrowserNotification(), resolveSwRegistration(), APPLE_TOUCH_ICON_URL, DEFAULT_NOTIFICATION_ICON_URL (+9 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.08
Nodes (29): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), loadAdminConfig() (+21 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (60): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+52 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "CustomerChat"
Cohesion: 0.19
Nodes (18): CustomerChat(), buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction() (+10 more)

### Community 14 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.15
Nodes (12): GlobalChatNotificationManagerProps, realtimeChatHub, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+4 more)

### Community 15 - "useVerificationResolution.ts"
Cohesion: 0.17
Nodes (22): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+14 more)

### Community 16 - "dataService"
Cohesion: 0.13
Nodes (21): lucide-react, react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps (+13 more)

### Community 17 - "WebPushClient"
Cohesion: 0.12
Nodes (14): BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), loadCustomerProfile(), arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array() (+6 more)

### Community 18 - "AdminAudit.tsx"
Cohesion: 0.23
Nodes (13): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell(), filterAuditLogs() (+5 more)

### Community 19 - "supabaseAuthService.ts"
Cohesion: 0.17
Nodes (16): AuthSessionResponse, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError(), MinimalAuthSession (+8 more)

### Community 20 - "dataService.ts"
Cohesion: 0.18
Nodes (18): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+10 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.13
Nodes (33): GamePlatformCard(), CustomerHome(), CATEGORY_LABELS, CustomerWallet(), loadCustomerHome(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft() (+25 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.13
Nodes (44): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+36 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.25
Nodes (14): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, isImageCached(), memoryImageCache, normalizeAssetUrlList() (+6 more)

### Community 27 - "imageUtils.test.ts"
Cohesion: 0.17
Nodes (16): AdminGameCatalog(), CustomerGameAccounts(), CORE_ASSET_URLS, CRITICAL_ASSET_URLS, DEFERRED_ASSET_URLS, ALIAS_LOOKUP, DEFERRED_GAME_IMAGE_PATHS, findLocalGameAsset() (+8 more)

### Community 28 - "UserRole"
Cohesion: 0.33
Nodes (7): prefetchPagesForSession(), getPrefetchRouteKeysForRole(), HydrationGateInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput

### Community 29 - "toProxyStorageUrl"
Cohesion: 0.31
Nodes (10): ChatTransactionCard(), ChatTransactionCardProps, StorageUploadResult, buildProxyStorageUrl(), extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl() (+2 more)

### Community 30 - "AdminGameCatalog.tsx"
Cohesion: 0.24
Nodes (10): GamePlatformCardProps, AdminGameCatalogProps, PRESET_GAME_ICONS, GameCatalogItem, GameLink, isSafeExternalHttpUrl(), ResolvedGameCardLinks, resolveGameCardLinks() (+2 more)

### Community 31 - "api/index.ts"
Cohesion: 0.08
Nodes (44): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+36 more)

### Community 32 - "supabaseClient.ts"
Cohesion: 0.19
Nodes (13): DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_JWKS_URL, DEFAULT_SUPABASE_SERVICE_ROLE_KEY, DEFAULT_SUPABASE_URL, isPlaceholder(), resolveSupabaseAnonKey(), resolveSupabaseJwksUrl(), resolveSupabaseServiceRoleKey() (+5 more)

### Community 33 - "pushUtils.ts"
Cohesion: 0.14
Nodes (17): getWebPushClient(), handlePushNotify(), handlePushStatus(), sendVercelPushNotification(), deactivatePushSubscriptionsInList(), hashEndpointId(), isStaffRole(), NormalizedPushSubscription (+9 more)

### Community 34 - "authSessionService.ts"
Cohesion: 0.16
Nodes (11): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential (+3 more)

### Community 35 - "types.ts"
Cohesion: 0.13
Nodes (20): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminRequestsProps, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests() (+12 more)

### Community 36 - "UserProfile"
Cohesion: 0.14
Nodes (20): AdminChatTopUpModalProps, TopUpModalMode, AuthenticatedUserMenuProps, StaffMobileNavProps, TopNavbarProps, AdminGameCredentialsProps, AuthPageProps, CustomerGameAccountsProps (+12 more)

### Community 38 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 39 - "CustomerChat.tsx"
Cohesion: 0.33
Nodes (7): CustomerChatProps, notificationSoundService, ComputedChatViewportState, computeVisualViewportState(), resolveFullscreenViewportStyle(), shouldSubmitOnTextareaKeyDown(), VisualViewportMetrics

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `types.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `GlobalChatNotificationManager.tsx`, `useVerificationResolution.ts`, `dataService`, `WebPushClient`, `AdminAudit.tsx`, `supabaseAuthService.ts`, `dataService.ts`, `dataService.ts`, `toProxyStorageUrl`, `AdminGameCatalog.tsx`, `authSessionService.ts`, `types.ts`, `UserProfile`, `CustomerChat.tsx`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05374964357000285 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `types.ts`, `AuthSessionService`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `GlobalChatNotificationManager.tsx`, `useVerificationResolution.ts`, `dataService`, `WebPushClient`, `AdminAudit.tsx`, `supabaseAuthService.ts`, `dataService.ts`, `dataService.ts`, `SupabaseAuthService`, `AdminGameCatalog.tsx`, `authSessionService.ts`, `types.ts`, `CustomerChat.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Why does `react` connect `dataService` to `AdminChat.tsx`, `package.json`, `App.tsx`, `types.ts`, `types.ts`, `UserProfile`, `authSessionService.ts`, `CustomerChat.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `GlobalChatNotificationManager.tsx`, `useVerificationResolution.ts`, `WebPushClient`, `AdminAudit.tsx`, `dataService.ts`, `assetPreloader.ts`, `toProxyStorageUrl`, `AdminGameCatalog.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._