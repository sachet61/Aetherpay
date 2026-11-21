# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 147 files · ~239,421 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1327 nodes · 4417 edges · 43 communities (38 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b650c2b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- AdminChat.tsx
- package.json
- App.tsx
- AdminAudit.tsx
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
- react
- lucide-react
- WebPushClient
- storageService.ts
- CustomerProfile.tsx
- handler
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- useVerificationResolution.ts
- imageUtils.test.ts
- UserRole
- AuthSessionService
- types.ts
- api/index.ts
- supabaseClient.ts
- pushUtils.ts
- OfficialPartner
- pwaAssets.ts
- UserProfile
- ui-audit/package.json
- chatOrderUtils.ts
- handleGetChatMessages
- NotificationSoundService
- webPushNotifications.test.ts
- LegalContent.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 214 edges
2. `UserProfile` - 100 edges
3. `react` - 65 edges
4. `isSupabaseConfigured()` - 60 edges
5. `lucide-react` - 57 edges
6. `App()` - 47 edges
7. `dataService` - 43 edges
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

## Communities (43 total, 5 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (11): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken (+3 more)

### Community 1 - "AdminChat.tsx"
Cohesion: 0.24
Nodes (19): AdminChatCashoutModal(), AdminChatTopUpModal(), AdminChat(), TICKET_STATUS_OPTIONS, buildGroupedMessages(), CHAT_QUICK_EMOJIS, deriveTruthfulConnectionStatus(), filterVisibleMessagesForRole() (+11 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (36): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies, tsx@^4.19.2 (+28 more)

### Community 3 - "App.tsx"
Cohesion: 0.09
Nodes (40): App(), LazyEmailVerificationBanner, BackgroundNotificationPrompt(), LazyPageFallback(), LazyPageFallbackProps, SessionTimeoutWarningModal(), CustomerMobileNav(), StaffMobileNav() (+32 more)

### Community 4 - "AdminAudit.tsx"
Cohesion: 0.06
Nodes (39): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminAudit() (+31 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.13
Nodes (43): AdminOfficialPartnersTab(), SortMode, OfficialPartnerDrawer(), PLATFORMS, OfficialPartnersPreviewModal(), getPlatformDisplayName(), PartnerIcon(), PlatformBadge() (+35 more)

### Community 7 - "audit.mjs"
Cohesion: 0.15
Nodes (26): AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES, DESKTOP_VIEWPORT, __dirname, discoverRoutesForRole() (+18 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "officialPartnerHandlers.ts"
Cohesion: 0.20
Nodes (21): ensurePartnerIconsBucket(), handleCreateOfficialPartner(), handleDeleteOfficialPartner(), handleGetOfficialPartners(), handleReorderOfficialPartners(), handleUpdateOfficialPartner(), handleUploadOfficialPartnerIcon(), hasValidImageMagicBytes() (+13 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.10
Nodes (23): TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), loadAdminConfig(), loadCustomerTopUp() (+15 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (64): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+56 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "CustomerChat"
Cohesion: 0.16
Nodes (23): CustomerChat(), buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction() (+15 more)

### Community 14 - "GlobalChatNotificationManager.tsx"
Cohesion: 0.11
Nodes (18): @supabase/supabase-js@^2.49.1, @supabase/supabase-js, GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, realtimeChatHub, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote() (+10 more)

### Community 15 - "react"
Cohesion: 0.16
Nodes (16): react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RoleSwitcher(), WheelGlyph(), WheelGlyphProps, WheelPopup() (+8 more)

### Community 16 - "lucide-react"
Cohesion: 0.15
Nodes (19): lucide-react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner() (+11 more)

### Community 18 - "storageService.ts"
Cohesion: 0.21
Nodes (13): TopUpModalMode, fileToBase64(), StorageService, storageService, StorageUploadResult, buildProxyStorageUrl(), extractStorageLocation(), safeDecodeURIComponent() (+5 more)

### Community 19 - "CustomerProfile.tsx"
Cohesion: 0.13
Nodes (16): BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, SessionTimeoutWarningModalProps, CustomerProfile(), loadCustomerProfile(), authSessionService, INACTIVITY_TIMEOUT_MS (+8 more)

### Community 20 - "handler"
Cohesion: 0.19
Nodes (12): buildProxyStorageUrl(), deactivateVercelPushSubscription(), ensureStorageBuckets(), extractStorageLocationFromUrl(), handlePushSubscribe(), handlePushUnsubscribe(), handler(), handleStorageFileProxy() (+4 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.06
Nodes (72): PolicyAndPartnerCmsCard(), CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest() (+64 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.13
Nodes (44): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+36 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.29
Nodes (11): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, resolveHydrationPhaseLabel(), isImageCached(), preloadAssetPool() (+3 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 27 - "imageUtils.test.ts"
Cohesion: 0.14
Nodes (24): AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, loadAdminGameCatalog(), CORE_ASSET_URLS, CRITICAL_ASSET_URLS, DEFERRED_ASSET_URLS, memoryImageCache (+16 more)

### Community 28 - "UserRole"
Cohesion: 0.36
Nodes (6): prefetchPagesForSession(), getPrefetchRouteKeysForRole(), HydrationGateInput, shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput

### Community 30 - "types.ts"
Cohesion: 0.15
Nodes (18): CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, GamePlatformCard(), GamePlatformCardProps, CustomerReferrals(), getStepBadge(), GameCatalogItem, GameLink (+10 more)

### Community 31 - "api/index.ts"
Cohesion: 0.11
Nodes (22): ALLOWED_AUDIT_ENTITY_TYPES, decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, fetchSupabaseJwksKeys(), handleGetAuditLogs(), handlePostAuditLog(), isMissingColumnError(), isTransientAuthUpstreamFailure() (+14 more)

### Community 32 - "supabaseClient.ts"
Cohesion: 0.15
Nodes (17): ChatTransactionCard(), ChatTransactionCardProps, toDirectSupabaseStorageUrl(), DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_JWKS_URL, DEFAULT_SUPABASE_SERVICE_ROLE_KEY, DEFAULT_SUPABASE_URL, isPlaceholder() (+9 more)

### Community 33 - "pushUtils.ts"
Cohesion: 0.14
Nodes (17): getWebPushClient(), handlePushNotify(), handlePushStatus(), sendVercelPushNotification(), deactivatePushSubscriptionsInList(), hashEndpointId(), isStaffRole(), NormalizedPushSubscription (+9 more)

### Community 34 - "OfficialPartner"
Cohesion: 0.27
Nodes (5): OfficialPartnerDrawerProps, OfficialPartnersPreviewModalProps, OfficialPartner, OfficialPartnerInput, isHtmlFallbackResponse()

### Community 35 - "pwaAssets.ts"
Cohesion: 0.18
Nodes (14): BrowserNotificationEnv, BrowserNotificationResult, dispatchBrowserNotification(), resolveSwRegistration(), APPLE_TOUCH_ICON_URL, DEFAULT_NOTIFICATION_ICON_URL, LEGACY_BADGE_URLS, LEGACY_ICON_URLS (+6 more)

### Community 36 - "UserProfile"
Cohesion: 0.08
Nodes (30): AdminOfficialPartnersTabProps, AdminChatCashoutModalProps, AdminChatTopUpModalProps, AuthenticatedUserMenuProps, SessionHydrationScreenProps, WheelOfLuckModalProps, CustomerMobileNavProps, StaffMobileNavProps (+22 more)

### Community 37 - "ui-audit/package.json"
Cohesion: 0.15
Nodes (15): jszip, playwright, sharp, dependencies, jszip@^3.10.1, playwright@^1.52.0, sharp@^0.34.1, description (+7 more)

### Community 38 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 39 - "handleGetChatMessages"
Cohesion: 0.36
Nodes (10): enrichMessageRowForClient(), handleGetChatMessages(), handlePostChatSend(), handleUpdateConversationStatus(), isInternalNoteMessageRow(), normalizeStorageUrlForChat(), parseJsonObject(), resolveVerifiedCallerRole() (+2 more)

### Community 41 - "webPushNotifications.test.ts"
Cohesion: 0.22
Nodes (4): executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `AdminChat.tsx`, `App.tsx`, `AdminAudit.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `CustomerChat`, `GlobalChatNotificationManager.tsx`, `react`, `lucide-react`, `storageService.ts`, `CustomerProfile.tsx`, `dataService.ts`, `useVerificationResolution.ts`, `imageUtils.test.ts`, `types.ts`, `supabaseClient.ts`, `OfficialPartner`, `UserProfile`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.053606649760495916 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminChat.tsx`, `package.json`, `App.tsx`, `AdminAudit.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `CustomerChat`, `GlobalChatNotificationManager.tsx`, `lucide-react`, `storageService.ts`, `CustomerProfile.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `imageUtils.test.ts`, `types.ts`, `supabaseClient.ts`, `UserProfile`, `LegalContent.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `AdminChat.tsx`, `AdminAudit.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `CustomerChat`, `GlobalChatNotificationManager.tsx`, `react`, `lucide-react`, `WebPushClient`, `storageService.ts`, `CustomerProfile.tsx`, `dataService.ts`, `useVerificationResolution.ts`, `imageUtils.test.ts`, `AuthSessionService`, `types.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09292929292929293 - nodes in this community are weakly interconnected._
- **Should `AdminAudit.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05683060109289618 - nodes in this community are weakly interconnected._