# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 143 files · ~237,869 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1305 nodes · 4354 edges · 42 communities (38 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27ac77f8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- types.ts
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- officialPartnerHandlers.ts
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- CustomerChat
- GlobalChatNotificationManager.tsx
- ref_node_test
- react
- AuthSessionService
- storageService.ts
- supabaseAuthService.ts
- handler
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
- OfficialPartner
- useVerificationResolution.ts
- UserProfile
- AuthTokenCoordinator
- chatOrderUtils.ts
- handleGetChatMessages
- NotificationSoundService
- AuthPage.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 214 edges
2. `UserProfile` - 100 edges
3. `react` - 61 edges
4. `isSupabaseConfigured()` - 60 edges
5. `lucide-react` - 56 edges
6. `dataService` - 43 edges
7. `App()` - 41 edges
8. `handler()` - 37 edges
9. `UserWallet` - 32 edges
10. `AdminChat()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `handleCreateOfficialPartner()` --calls--> `validateOfficialPartnerInput()`  [EXTRACTED]
  api/officialPartnerHandlers.ts → src/utils/officialPartnersUtils.ts
- `handleUpdateOfficialPartner()` --calls--> `validateOfficialPartnerInput()`  [EXTRACTED]
  api/officialPartnerHandlers.ts → src/utils/officialPartnersUtils.ts
- `handleGetOfficialPartners()` --calls--> `normalizeOfficialPartnerRow()`  [EXTRACTED]
  api/officialPartnerHandlers.ts → src/utils/officialPartnersUtils.ts
- `handleCreateOfficialPartner()` --calls--> `normalizeOfficialPartnerRow()`  [EXTRACTED]
  api/officialPartnerHandlers.ts → src/utils/officialPartnersUtils.ts
- `handleUpdateOfficialPartner()` --calls--> `isPartnerPlatform()`  [EXTRACTED]
  api/officialPartnerHandlers.ts → src/utils/officialPartnersUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (42 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (10): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken (+2 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.19
Nodes (24): AdminChatCashoutModal(), TICKET_STATUS_OPTIONS, CustomerChat(), notificationSoundService, buildGroupedMessages(), CHAT_QUICK_EMOJIS, deriveTruthfulConnectionStatus(), filterVisibleMessagesForRole() (+16 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.09
Nodes (39): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal() (+31 more)

### Community 4 - "types.ts"
Cohesion: 0.12
Nodes (20): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+12 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.13
Nodes (41): AdminOfficialPartnersTab(), SortMode, OfficialPartnerDrawer(), PLATFORMS, OfficialPartnersPreviewModal(), getPlatformDisplayName(), PartnerIcon(), PlatformBadge() (+33 more)

### Community 7 - "audit.mjs"
Cohesion: 0.05
Nodes (56): jszip, playwright, sharp, BrowserNotificationEnv, BrowserNotificationResult, dispatchBrowserNotification(), resolveSwRegistration(), APPLE_TOUCH_ICON_URL (+48 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "officialPartnerHandlers.ts"
Cohesion: 0.20
Nodes (21): ensurePartnerIconsBucket(), handleCreateOfficialPartner(), handleDeleteOfficialPartner(), handleGetOfficialPartners(), handleReorderOfficialPartners(), handleUpdateOfficialPartner(), handleUploadOfficialPartnerIcon(), hasValidImageMagicBytes() (+13 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.06
Nodes (51): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminAudit(), AdminAuditProps, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+43 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (58): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+50 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "CustomerChat"
Cohesion: 0.19
Nodes (18): AdminChat(), buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction() (+10 more)

### Community 14 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.15
Nodes (13): GlobalChatNotificationManager(), realtimeChatHub, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+5 more)

### Community 15 - "ref_node_test"
Cohesion: 0.23
Nodes (11): deriveVerificationUiState(), getDefaultStorage(), mergeVerifiedStatus(), normalizeEmailKey(), parseCacheMap(), readVerifiedCache(), StorageReader, StorageWriter (+3 more)

### Community 16 - "react"
Cohesion: 0.11
Nodes (21): lucide-react, react, EmailOtpModal(), ResetPasswordProps, EmailVerificationBanner(), IOSPwaInstallModal(), IOSPwaInstallModalProps, LiveCashoutFeedList() (+13 more)

### Community 17 - "AuthSessionService"
Cohesion: 0.07
Nodes (18): SessionTimeoutWarningModalProps, AuthSessionService, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, sha256Hex() (+10 more)

### Community 18 - "storageService.ts"
Cohesion: 0.25
Nodes (11): AdminChatTopUpModal(), TopUpModalMode, fileToBase64(), StorageService, storageService, StorageUploadResult, buildProxyStorageUrl(), toProxyStorageUrl() (+3 more)

### Community 19 - "supabaseAuthService.ts"
Cohesion: 0.17
Nodes (16): AuthSessionResponse, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError(), MinimalAuthSession (+8 more)

### Community 20 - "handler"
Cohesion: 0.19
Nodes (12): buildProxyStorageUrl(), deactivateVercelPushSubscription(), ensureStorageBuckets(), extractStorageLocationFromUrl(), handlePushSubscribe(), handlePushUnsubscribe(), handler(), handleStorageFileProxy() (+4 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.07
Nodes (58): CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest() (+50 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.13
Nodes (44): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+36 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.25
Nodes (14): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, isImageCached(), memoryImageCache, normalizeAssetUrlList() (+6 more)

### Community 27 - "imageUtils.test.ts"
Cohesion: 0.16
Nodes (18): AdminGameCatalog(), PRESET_GAME_ICONS, loadAdminGameCatalog(), CORE_ASSET_URLS, CRITICAL_ASSET_URLS, DEFERRED_ASSET_URLS, ALIAS_LOOKUP, DEFAULT_GAME_ICON (+10 more)

### Community 28 - "UserRole"
Cohesion: 0.23
Nodes (9): SessionHydrationScreenProps, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput (+1 more)

### Community 29 - "toProxyStorageUrl"
Cohesion: 0.31
Nodes (8): ChatTransactionCard(), ChatTransactionCardProps, extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl(), supabaseUrl, ChatTransactionData

### Community 30 - "AdminGameCatalog.tsx"
Cohesion: 0.26
Nodes (11): AdminChatTopUpModalProps, GamePlatformCard(), GamePlatformCardProps, CustomerGameAccounts(), CustomerHome(), GameCatalogItem, GameLink, isSafeExternalHttpUrl() (+3 more)

### Community 31 - "api/index.ts"
Cohesion: 0.11
Nodes (22): ALLOWED_AUDIT_ENTITY_TYPES, decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, fetchSupabaseJwksKeys(), handleGetAuditLogs(), handlePostAuditLog(), isMissingColumnError(), isTransientAuthUpstreamFailure() (+14 more)

### Community 32 - "supabaseClient.ts"
Cohesion: 0.21
Nodes (12): DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_JWKS_URL, DEFAULT_SUPABASE_SERVICE_ROLE_KEY, DEFAULT_SUPABASE_URL, isPlaceholder(), resolveSupabaseAnonKey(), resolveSupabaseJwksUrl(), resolveSupabaseServiceRoleKey() (+4 more)

### Community 33 - "pushUtils.ts"
Cohesion: 0.14
Nodes (17): getWebPushClient(), handlePushNotify(), handlePushStatus(), sendVercelPushNotification(), deactivatePushSubscriptionsInList(), hashEndpointId(), isStaffRole(), NormalizedPushSubscription (+9 more)

### Community 34 - "OfficialPartner"
Cohesion: 0.27
Nodes (5): OfficialPartnerDrawerProps, OfficialPartnersPreviewModalProps, OfficialPartner, OfficialPartnerInput, isHtmlFallbackResponse()

### Community 35 - "useVerificationResolution.ts"
Cohesion: 0.29
Nodes (11): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+3 more)

### Community 36 - "UserProfile"
Cohesion: 0.08
Nodes (34): AdminOfficialPartnersTabProps, EmailOtpModalProps, AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, BackgroundNotificationPromptProps, EmailVerificationBannerProps, GlobalChatNotificationManagerProps (+26 more)

### Community 38 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 39 - "handleGetChatMessages"
Cohesion: 0.36
Nodes (10): enrichMessageRowForClient(), handleGetChatMessages(), handlePostChatSend(), handleUpdateConversationStatus(), isInternalNoteMessageRow(), normalizeStorageUrlForChat(), parseJsonObject(), resolveVerifiedCallerRole() (+2 more)

### Community 41 - "AuthPage.tsx"
Cohesion: 0.43
Nodes (6): ForgotPassword(), ForgotPasswordProps, ResetPassword(), LiveCashoutTicker(), AuthPage(), supabaseAuthService

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `types.ts`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `GlobalChatNotificationManager.tsx`, `react`, `storageService.ts`, `supabaseAuthService.ts`, `dataService.ts`, `imageUtils.test.ts`, `UserRole`, `toProxyStorageUrl`, `AdminGameCatalog.tsx`, `OfficialPartner`, `useVerificationResolution.ts`, `UserProfile`, `AuthPage.tsx`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05270037839697282 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `useVerificationResolution.ts`, `types.ts`, `officialPartnersUtils.ts`, `AuthPage.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `GlobalChatNotificationManager.tsx`, `react`, `AuthSessionService`, `storageService.ts`, `supabaseAuthService.ts`, `dataService.ts`, `SupabaseAuthService`, `imageUtils.test.ts`, `UserRole`, `AdminGameCatalog.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `types.ts`, `UserProfile`, `officialPartnersUtils.ts`, `useVerificationResolution.ts`, `AuthPage.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `GlobalChatNotificationManager.tsx`, `AuthSessionService`, `storageService.ts`, `dataService.ts`, `assetPreloader.ts`, `imageUtils.test.ts`, `toProxyStorageUrl`, `AdminGameCatalog.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09393939393939393 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._