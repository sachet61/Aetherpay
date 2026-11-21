# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 148 files · ~240,031 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1332 nodes · 4460 edges · 43 communities (38 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b3e96f1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- AdminReferralGovernancePanel.tsx
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- officialPartnerHandlers.ts
- CustomerTopUp.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- CustomerChat
- GlobalChatNotificationManager.tsx
- CustomerMobileDrawer.tsx
- react
- WebPushClient
- storageService.ts
- AdminAudit.tsx
- handler
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- useVerificationResolution.ts
- AuthSessionService
- UserRole
- toProxyStorageUrl
- AdminGameCatalog.tsx
- api/index.ts
- dataService.ts
- pushUtils.ts
- uiCopyUtils.ts
- UserRole
- UserProfile
- WithdrawalRequest
- chatOrderUtils.ts
- handleGetChatMessages
- NotificationSoundService
- LegalContent.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 215 edges
2. `UserProfile` - 102 edges
3. `react` - 66 edges
4. `isSupabaseConfigured()` - 60 edges
5. `lucide-react` - 58 edges
6. `App()` - 47 edges
7. `dataService` - 44 edges
8. `handler()` - 37 edges
9. `UserWallet` - 34 edges
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

## Communities (43 total, 5 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (10): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken, SupportConversation (+2 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.24
Nodes (19): AdminChatCashoutModal(), AdminChatTopUpModal(), AdminChat(), TICKET_STATUS_OPTIONS, buildGroupedMessages(), CHAT_QUICK_EMOJIS, deriveTruthfulConnectionStatus(), filterVisibleMessagesForRole() (+11 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies (+30 more)

### Community 3 - "App.tsx"
Cohesion: 0.10
Nodes (39): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, LiveCashoutTicker(), CustomerMobileNav(), StaffMobileNav(), useDataService() (+31 more)

### Community 4 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.07
Nodes (30): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+22 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.10
Nodes (46): AdminOfficialPartnersTab(), SortMode, OfficialPartnerDrawer(), OfficialPartnerDrawerProps, PLATFORMS, OfficialPartnersPreviewModal(), OfficialPartnersPreviewModalProps, getPlatformDisplayName() (+38 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "officialPartnerHandlers.ts"
Cohesion: 0.20
Nodes (21): ensurePartnerIconsBucket(), handleCreateOfficialPartner(), handleDeleteOfficialPartner(), handleGetOfficialPartners(), handleReorderOfficialPartners(), handleUpdateOfficialPartner(), handleUploadOfficialPartnerIcon(), hasValidImageMagicBytes() (+13 more)

### Community 10 - "CustomerTopUp.tsx"
Cohesion: 0.13
Nodes (15): CustomerTopUp(), loadCustomerTopUp(), TelegramService, telegramService, TelegramStatus, PaymentMethodType, ALLOWED_IMAGE_EXTENSIONS, clearTopUpDraft() (+7 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (67): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+59 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "CustomerChat"
Cohesion: 0.16
Nodes (23): CustomerChat(), buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction() (+15 more)

### Community 14 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.13
Nodes (15): GlobalChatNotificationManager(), realtimeChatHub, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId(), shouldAcceptIncomingChatMessage() (+7 more)

### Community 15 - "CustomerMobileDrawer.tsx"
Cohesion: 0.14
Nodes (21): BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RoleSwitcher(), SwiftSweepsLogo(), SwiftSweepsLogoProps, WheelGlyph(), WheelGlyphProps (+13 more)

### Community 16 - "react"
Cohesion: 0.14
Nodes (22): lucide-react, react, EmailOtpModal(), ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, BackgroundNotificationPrompt() (+14 more)

### Community 17 - "WebPushClient"
Cohesion: 0.16
Nodes (8): arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 18 - "storageService.ts"
Cohesion: 0.26
Nodes (9): TopUpModalMode, fileToBase64(), StorageService, storageService, StorageUploadResult, buildProxyStorageUrl(), compressImageToWebP(), CompressionOptions (+1 more)

### Community 19 - "AdminAudit.tsx"
Cohesion: 0.20
Nodes (15): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+7 more)

### Community 20 - "handler"
Cohesion: 0.19
Nodes (12): buildProxyStorageUrl(), deactivateVercelPushSubscription(), ensureStorageBuckets(), extractStorageLocationFromUrl(), handlePushSubscribe(), handlePushUnsubscribe(), handler(), handleStorageFileProxy() (+4 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.13
Nodes (32): CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits() (+24 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.08
Nodes (64): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+56 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.07
Nodes (39): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, resolveHydrationPhaseLabel(), CORE_ASSET_URLS, CRITICAL_ASSET_URLS, DEFERRED_ASSET_URLS, isImageCached() (+31 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 28 - "UserRole"
Cohesion: 0.36
Nodes (6): prefetchPagesForSession(), getPrefetchRouteKeysForRole(), HydrationGateInput, shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput

### Community 29 - "toProxyStorageUrl"
Cohesion: 0.33
Nodes (9): ChatTransactionCard(), ChatTransactionCardProps, extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl(), toProxyStorageUrl(), supabaseUrl (+1 more)

### Community 30 - "AdminGameCatalog.tsx"
Cohesion: 0.20
Nodes (15): GamePlatformCard(), GamePlatformCardProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, GameCatalogItem, GameLink, isSafeExternalHttpUrl() (+7 more)

### Community 31 - "api/index.ts"
Cohesion: 0.11
Nodes (22): ALLOWED_AUDIT_ENTITY_TYPES, decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, fetchSupabaseJwksKeys(), handleGetAuditLogs(), handlePostAuditLog(), isMissingColumnError(), isTransientAuthUpstreamFailure() (+14 more)

### Community 32 - "dataService.ts"
Cohesion: 0.17
Nodes (19): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+11 more)

### Community 33 - "pushUtils.ts"
Cohesion: 0.14
Nodes (17): getWebPushClient(), handlePushNotify(), handlePushStatus(), sendVercelPushNotification(), deactivatePushSubscriptionsInList(), hashEndpointId(), isStaffRole(), NormalizedPushSubscription (+9 more)

### Community 34 - "uiCopyUtils.ts"
Cohesion: 0.26
Nodes (13): PolicyAndPartnerCmsCard(), decodeBasicHtmlEntities(), escapeHtmlText(), formatCashoutChatMessage(), formatCompactDollar(), formatGameIdRequestChatMessage(), formatGamePasswordResetChatMessage(), formatInlineMarkdownToHtml() (+5 more)

### Community 35 - "UserRole"
Cohesion: 0.16
Nodes (12): SessionHydrationScreenProps, SessionTimeoutWarningModal(), SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS (+4 more)

### Community 36 - "UserProfile"
Cohesion: 0.07
Nodes (38): AdminOfficialPartnersTabProps, EmailOtpModalProps, AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, GlobalChatNotificationManagerProps, AuthenticatedUserMenuProps (+30 more)

### Community 37 - "WithdrawalRequest"
Cohesion: 0.47
Nodes (7): mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), TopUpRequest, WithdrawalRequest

### Community 38 - "chatOrderUtils.ts"
Cohesion: 0.38
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 39 - "handleGetChatMessages"
Cohesion: 0.36
Nodes (10): enrichMessageRowForClient(), handleGetChatMessages(), handlePostChatSend(), handleUpdateConversationStatus(), isInternalNoteMessageRow(), normalizeStorageUrlForChat(), parseJsonObject(), resolveVerifiedCallerRole() (+2 more)

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `AdminReferralGovernancePanel.tsx`, `officialPartnersUtils.ts`, `CustomerTopUp.tsx`, `wheelOfLuckUtils.ts`, `CustomerChat`, `GlobalChatNotificationManager.tsx`, `CustomerMobileDrawer.tsx`, `react`, `storageService.ts`, `AdminAudit.tsx`, `dataService.ts`, `referralHandlers.ts`, `useVerificationResolution.ts`, `toProxyStorageUrl`, `AdminGameCatalog.tsx`, `dataService.ts`, `uiCopyUtils.ts`, `UserProfile`, `chatOrderUtils.ts`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.052690898844744996 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `AdminReferralGovernancePanel.tsx`, `officialPartnersUtils.ts`, `CustomerTopUp.tsx`, `wheelOfLuckUtils.ts`, `CustomerChat`, `GlobalChatNotificationManager.tsx`, `CustomerMobileDrawer.tsx`, `storageService.ts`, `AdminAudit.tsx`, `dataService.ts`, `referralHandlers.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `toProxyStorageUrl`, `AdminGameCatalog.tsx`, `uiCopyUtils.ts`, `UserRole`, `UserProfile`, `LegalContent.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `AdminReferralGovernancePanel.tsx`, `officialPartnersUtils.ts`, `CustomerTopUp.tsx`, `wheelOfLuckUtils.ts`, `CustomerChat`, `GlobalChatNotificationManager.tsx`, `CustomerMobileDrawer.tsx`, `react`, `WebPushClient`, `storageService.ts`, `AdminAudit.tsx`, `dataService.ts`, `referralHandlers.ts`, `useVerificationResolution.ts`, `AuthSessionService`, `AdminGameCatalog.tsx`, `dataService.ts`, `UserRole`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10104529616724739 - nodes in this community are weakly interconnected._
- **Should `AdminReferralGovernancePanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06775510204081632 - nodes in this community are weakly interconnected._