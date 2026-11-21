# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 158 files · ~244,990 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1387 nodes · 4675 edges · 46 communities (43 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9557a12b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- dataService.ts
- package.json
- App.tsx
- AdminReferralGovernancePanel.tsx
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- AdminChat.tsx
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- CustomerChat
- CustomerHome.tsx
- react
- referralUtils.ts
- WebPushClient
- AdminDashboard.tsx
- storageService.ts
- dataService
- vercel.json
- sw.js
- walletActivityUtils.ts
- referralHandlers.ts
- pwaAssets.ts
- useVerificationResolution.ts
- AuthSessionService
- SessionHydrationScreen.tsx
- AgentMobileDrawer.tsx
- uploadUtils.ts
- api/index.ts
- AdminChatTopUpModal.tsx
- GlobalChatNotificationManager.tsx
- assetPreloader.ts
- UserRole
- UserProfile
- auditLogs.test.ts
- AdminMobileDrawer.tsx
- chatOrderUtils.ts
- ref_node_assert
- ChatTransactionCard.tsx
- NotificationSoundService
- webPushNotifications.test.ts
- pushUtils.ts
- CustomerChat.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 217 edges
2. `UserProfile` - 106 edges
3. `react` - 68 edges
4. `isSupabaseConfigured()` - 65 edges
5. `lucide-react` - 60 edges
6. `App()` - 53 edges
7. `dataService` - 43 edges
8. `handler()` - 37 edges
9. `UserWallet` - 34 edges
10. `AdminChat()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `loadReferralProgramConfig()` --calls--> `normalizeReferralConfig()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `computeRefereeRealCashDeposits()` --calls--> `isRealCashTopUpRow()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralAttribute()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralEvaluate()` --calls--> `checkReferralBudgetCaps()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts
- `handlePostReferralEvaluate()` --calls--> `evaluateReferralFraudSignals()`  [EXTRACTED]
  api/referralHandlers.ts → src/utils/referralUtils.ts

## Import Cycles
- 2-file cycle: `src/services/dataService.ts -> src/services/supabaseAuthService.ts -> src/services/dataService.ts`

## Communities (46 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, SupportConversation, formatCredentialsReadyChatMessage(), formatWheelHttpError() (+1 more)

### Community 1 - "dataService.ts"
Cohesion: 0.10
Nodes (33): AdminRequestsProps, RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests() (+25 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.05
Nodes (67): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal() (+59 more)

### Community 4 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.14
Nodes (10): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+2 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.06
Nodes (83): ensurePartnerIconsBucket(), handleCreateOfficialPartner(), handleDeleteOfficialPartner(), handleGetOfficialPartners(), handleReorderOfficialPartners(), handleUpdateOfficialPartner(), handleUploadOfficialPartnerIcon(), hasValidImageMagicBytes() (+75 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "AdminChat.tsx"
Cohesion: 0.23
Nodes (20): AdminChatCashoutModal(), AdminChatTopUpModal(), AdminChat(), AdminChatProps, TICKET_STATUS_OPTIONS, buildGroupedMessages(), CHAT_QUICK_EMOJIS, deriveTruthfulConnectionStatus() (+12 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.05
Nodes (51): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminAudit(), AdminAuditProps, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps (+43 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (64): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+56 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "CustomerChat"
Cohesion: 0.19
Nodes (18): CustomerChat(), buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction() (+10 more)

### Community 14 - "CustomerHome.tsx"
Cohesion: 0.21
Nodes (13): GamePlatformCard(), GamePlatformCardProps, isSafeExternalHttpUrl(), ResolvedGameCardLinks, resolveGameCardLinks(), toggleGameCardOverlay(), ALIAS_LOOKUP, DEFAULT_GAME_ICON (+5 more)

### Community 15 - "react"
Cohesion: 0.16
Nodes (19): lucide-react, react, EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner() (+11 more)

### Community 16 - "referralUtils.ts"
Cohesion: 0.18
Nodes (16): ReferralLedgerEntry, ReferralPayoutTarget, ReferralProgramConfig, ReferralRewardMode, checkReferralBudgetCaps(), clampNonNegativeNumber(), computeTopReferrers(), DEFAULT_REFERRAL_CONFIG (+8 more)

### Community 17 - "WebPushClient"
Cohesion: 0.23
Nodes (3): arrayBufferToBase64(), urlBase64ToUint8Array(), WebPushClient

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.11
Nodes (22): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+14 more)

### Community 19 - "storageService.ts"
Cohesion: 0.32
Nodes (8): fileToBase64(), StorageService, StorageUploadResult, buildProxyStorageUrl(), toProxyStorageUrl(), compressImageToWebP(), CompressionOptions, validateImageFile()

### Community 20 - "dataService"
Cohesion: 0.16
Nodes (21): LiveCashoutFeedList(), LiveCashoutFeedListProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerWithdrawal(), dataService, applyGameCatalogRealtimeEvents() (+13 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "walletActivityUtils.ts"
Cohesion: 0.13
Nodes (33): CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits() (+25 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.21
Nodes (28): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+20 more)

### Community 25 - "pwaAssets.ts"
Cohesion: 0.18
Nodes (14): BrowserNotificationEnv, BrowserNotificationResult, dispatchBrowserNotification(), resolveSwRegistration(), APPLE_TOUCH_ICON_URL, DEFAULT_NOTIFICATION_ICON_URL, LEGACY_BADGE_URLS, LEGACY_ICON_URLS (+6 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 28 - "SessionHydrationScreen.tsx"
Cohesion: 0.30
Nodes (12): SessionHydrationScreen(), SessionHydrationScreenProps, StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, normalizeAssetUrlList(), preloadAssetPool() (+4 more)

### Community 29 - "AgentMobileDrawer.tsx"
Cohesion: 0.30
Nodes (11): AgentMobileDrawer(), AgentMobileDrawerProps, AGENT_ADMIN_ONLY_TABS, AGENT_DRAWER_REMOVED_TABS, AGENT_OFFICIAL_PARTNERS_ROUTE, AGENT_RULES_ROUTE, AgentDrawerNavItem, canRenderAgentDrawer() (+3 more)

### Community 30 - "uploadUtils.ts"
Cohesion: 0.25
Nodes (11): CustomerTopUp(), PaymentMethodType, ALLOWED_IMAGE_EXTENSIONS, clearTopUpDraft(), getTopUpDraftStorageKey(), ImageValidationResult, loadTopUpDraft(), MAX_IMAGE_UPLOAD_BYTES (+3 more)

### Community 31 - "api/index.ts"
Cohesion: 0.09
Nodes (45): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+37 more)

### Community 32 - "AdminChatTopUpModal.tsx"
Cohesion: 0.23
Nodes (9): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, TopUpModalMode, AdminGameCredentialsProps, GameAccount, GameCatalogItem (+1 more)

### Community 33 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.26
Nodes (10): GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+2 more)

### Community 34 - "assetPreloader.ts"
Cohesion: 0.23
Nodes (9): CORE_ASSET_URLS, CRITICAL_ASSET_URLS, DEFERRED_ASSET_URLS, isImageCached(), memoryImageCache, TargetAssetPlan, DEFERRED_GAME_IMAGE_PATHS, PRIORITY_GAME_IMAGE_PATHS (+1 more)

### Community 35 - "UserRole"
Cohesion: 0.24
Nodes (7): INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential, UserSession, UserRole

### Community 36 - "UserProfile"
Cohesion: 0.12
Nodes (25): EmailOtpModalProps, BackgroundNotificationPromptProps, EmailVerificationBannerProps, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, AuthenticatedUserMenuProps, RoleSwitcher() (+17 more)

### Community 37 - "auditLogs.test.ts"
Cohesion: 0.21
Nodes (6): handleGetAuditLogs(), handlePostAuditLog(), isMissingColumnError(), normalizeServerAuditRow(), sanitizePostgrestLikeTerm(), writeServerAuditLog()

### Community 38 - "AdminMobileDrawer.tsx"
Cohesion: 0.36
Nodes (9): AdminMobileDrawer(), AdminMobileDrawerProps, ADMIN_DRAWER_FEATURED_ITEM, ADMIN_DRAWER_REMOVED_TABS, ADMIN_OFFICIAL_PARTNERS_ROUTE, AdminDrawerNavItem, canRenderAdminDrawer(), getAdminDrawerListItems() (+1 more)

### Community 39 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 40 - "ref_node_assert"
Cohesion: 0.22
Nodes (5): realtimeChatHub, ChannelEntry, ChatRoomListener, createRealtimeChatHub(), PostgresFilterConfig

### Community 41 - "ChatTransactionCard.tsx"
Cohesion: 0.31
Nodes (8): ChatTransactionCard(), ChatTransactionCardProps, extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl(), supabaseUrl, ChatTransactionData

### Community 43 - "webPushNotifications.test.ts"
Cohesion: 0.22
Nodes (4): executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 44 - "pushUtils.ts"
Cohesion: 0.31
Nodes (8): deactivatePushSubscriptionsInList(), hashEndpointId(), NormalizedPushSubscription, normalizePushSubscriptionPayload(), normalizePushUserRole(), PushSubscriptionRecord, rebindPushSubscriptionList(), RESERVED_NON_USER_IDS

### Community 45 - "CustomerChat.tsx"
Cohesion: 0.42
Nodes (6): CustomerChatProps, ComputedChatViewportState, computeVisualViewportState(), resolveFullscreenViewportStyle(), shouldSubmitOnTextareaKeyDown(), VisualViewportMetrics

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChatTopUpModal.tsx`, `GlobalChatNotificationManager.tsx`, `dataService.ts`, `App.tsx`, `UserProfile`, `UserRole`, `officialPartnersUtils.ts`, `ChatTransactionCard.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `CustomerChat.tsx`, `CustomerHome.tsx`, `react`, `AdminDashboard.tsx`, `dataService`, `walletActivityUtils.ts`, `useVerificationResolution.ts`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05318482422554821 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `dataService.ts`, `officialPartnersUtils.ts`, `AdminChat.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `CustomerHome.tsx`, `react`, `WebPushClient`, `AdminDashboard.tsx`, `dataService`, `walletActivityUtils.ts`, `useVerificationResolution.ts`, `AuthSessionService`, `AgentMobileDrawer.tsx`, `AdminChatTopUpModal.tsx`, `GlobalChatNotificationManager.tsx`, `UserRole`, `AdminMobileDrawer.tsx`, `CustomerChat.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `dataService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1048780487804878 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `dataService.ts`, `package.json`, `App.tsx`, `officialPartnersUtils.ts`, `AdminChat.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `CustomerHome.tsx`, `AdminDashboard.tsx`, `dataService`, `walletActivityUtils.ts`, `useVerificationResolution.ts`, `SessionHydrationScreen.tsx`, `AgentMobileDrawer.tsx`, `AdminChatTopUpModal.tsx`, `GlobalChatNotificationManager.tsx`, `UserProfile`, `AdminMobileDrawer.tsx`, `ChatTransactionCard.tsx`, `CustomerChat.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.054612054612054615 - nodes in this community are weakly interconnected._