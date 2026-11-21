# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 153 files · ~241,520 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1359 nodes · 4545 edges · 41 communities (37 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24d725b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- CustomerGameAccounts.tsx
- package.json
- App.tsx
- AdminReferralGovernancePanel.tsx
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- ref_node_assert
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- AdminChat.tsx
- react
- CustomerChat.tsx
- lucide-react
- WebPushClient
- AdminDashboard.tsx
- AdminAudit.tsx
- dataService
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- useVerificationResolution.ts
- AuthSessionService
- dataService.ts
- AdminOfficialPartnersTab.tsx
- SupabaseAuthService
- api/index.ts
- storageService.ts
- supabaseClient.ts
- OfficialPartner
- supabaseAuthService.ts
- types.ts
- chatOrderUtils.ts
- toProxyStorageUrl
- CustomerMobileDrawer.tsx
- NotificationSoundService

## God Nodes (most connected - your core abstractions)
1. `DataService` - 214 edges
2. `UserProfile` - 104 edges
3. `react` - 67 edges
4. `isSupabaseConfigured()` - 60 edges
5. `lucide-react` - 59 edges
6. `App()` - 52 edges
7. `dataService` - 43 edges
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

## Communities (41 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken, SupportConversation (+1 more)

### Community 1 - "CustomerGameAccounts.tsx"
Cohesion: 0.13
Nodes (23): PlatformGlyph(), AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts(), loadAdminGameCatalog(), GameLink, isSafeExternalHttpUrl() (+15 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.07
Nodes (58): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), CustomerMobileNav() (+50 more)

### Community 4 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.14
Nodes (10): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+2 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.14
Nodes (24): OfficialPartnerDrawer(), PLATFORMS, PartnerPlatform, ALLOWED_PARTNER_HOSTS, ALLOWED_PARTNER_ICON_EXTENSIONS, ALLOWED_PARTNER_ICON_MIME_TYPES, cleanHandleSegment(), extractPlatformUsername() (+16 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "ref_node_assert"
Cohesion: 0.13
Nodes (14): GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, realtimeChatHub, filterRealtimeRowsForUser(), globalNotificationAlertIds, isRowInternalNote(), PUBLIC_REALTIME_TABLES, resolveCanonicalConversationId() (+6 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.07
Nodes (38): PolicyAndPartnerCmsCard(), TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp(), CustomerTopUpProps (+30 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (62): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+54 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "AdminChat.tsx"
Cohesion: 0.17
Nodes (26): AdminChatCashoutModal(), AdminChatTopUpModal(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), storageService, buildGroupedMessages(), CHAT_QUICK_EMOJIS (+18 more)

### Community 14 - "react"
Cohesion: 0.15
Nodes (20): lucide-react, react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RoleSwitcher(), GamePlatformCard(), WheelGlyph() (+12 more)

### Community 15 - "CustomerChat.tsx"
Cohesion: 0.19
Nodes (17): buildScrollSnapshotKey(), computeDistanceFromBottom(), computePrependScrollTop(), computeRestoredScrollTop(), ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction(), DEFAULT_NEAR_BOTTOM_THRESHOLD_PX (+9 more)

### Community 16 - "lucide-react"
Cohesion: 0.16
Nodes (17): EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner(), EmailVerificationBannerProps (+9 more)

### Community 17 - "WebPushClient"
Cohesion: 0.12
Nodes (13): BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient (+5 more)

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.14
Nodes (16): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+8 more)

### Community 19 - "AdminAudit.tsx"
Cohesion: 0.20
Nodes (14): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+6 more)

### Community 20 - "dataService"
Cohesion: 0.47
Nodes (4): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerWithdrawal(), loadCustomerWithdrawal()

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.10
Nodes (41): CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests() (+33 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.14
Nodes (42): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+34 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.07
Nodes (42): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminMobileDrawer(), AdminMobileDrawerProps, ADMIN_DRAWER_FEATURED_ITEM (+34 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.16
Nodes (22): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+14 more)

### Community 28 - "dataService.ts"
Cohesion: 0.18
Nodes (17): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+9 more)

### Community 29 - "AdminOfficialPartnersTab.tsx"
Cohesion: 0.33
Nodes (14): AdminOfficialPartnersTab(), SortMode, OfficialPartnersPreviewModal(), getPlatformDisplayName(), PartnerIcon(), PlatformBadge(), VerifiedPartnerTick(), CustomerOfficialPartners() (+6 more)

### Community 31 - "api/index.ts"
Cohesion: 0.05
Nodes (78): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+70 more)

### Community 32 - "storageService.ts"
Cohesion: 0.33
Nodes (7): fileToBase64(), StorageService, StorageUploadResult, buildProxyStorageUrl(), compressImageToWebP(), CompressionOptions, validateImageFile()

### Community 33 - "supabaseClient.ts"
Cohesion: 0.19
Nodes (13): DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_JWKS_URL, DEFAULT_SUPABASE_SERVICE_ROLE_KEY, DEFAULT_SUPABASE_URL, isPlaceholder(), resolveSupabaseAnonKey(), resolveSupabaseJwksUrl(), resolveSupabaseServiceRoleKey() (+5 more)

### Community 34 - "OfficialPartner"
Cohesion: 0.24
Nodes (6): OfficialPartnerDrawerProps, OfficialPartnersPreviewModalProps, OfficialPartner, OfficialPartnerInput, formatWheelHttpError(), isHtmlFallbackResponse()

### Community 35 - "supabaseAuthService.ts"
Cohesion: 0.15
Nodes (15): SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential, UserSession (+7 more)

### Community 36 - "types.ts"
Cohesion: 0.07
Nodes (41): AdminOfficialPartnersTabProps, AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, TopUpModalMode, AuthenticatedUserMenuProps, SessionHydrationScreenProps (+33 more)

### Community 37 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 38 - "toProxyStorageUrl"
Cohesion: 0.38
Nodes (8): ChatTransactionCard(), ChatTransactionCardProps, extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl(), toProxyStorageUrl(), ChatTransactionData

### Community 39 - "CustomerMobileDrawer.tsx"
Cohesion: 0.33
Nodes (8): CustomerMobileDrawer(), CustomerMobileDrawerProps, CustomerRules(), CustomerRulesProps, getCustomerFirstName(), getDrawerPreviewPartners(), resolvePartnerIconUrl(), sortOfficialPartners()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `CustomerGameAccounts.tsx`, `App.tsx`, `officialPartnersUtils.ts`, `ref_node_assert`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `react`, `CustomerChat.tsx`, `lucide-react`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `dataService`, `dataService.ts`, `useVerificationResolution.ts`, `dataService.ts`, `AdminOfficialPartnersTab.tsx`, `OfficialPartner`, `supabaseAuthService.ts`, `types.ts`, `toProxyStorageUrl`, `CustomerMobileDrawer.tsx`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.0549150036954915 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `types.ts` to `DataService`, `CustomerGameAccounts.tsx`, `ref_node_assert`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `react`, `CustomerChat.tsx`, `lucide-react`, `WebPushClient`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `dataService`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `AuthSessionService`, `dataService.ts`, `AdminOfficialPartnersTab.tsx`, `SupabaseAuthService`, `supabaseAuthService.ts`, `CustomerMobileDrawer.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `CustomerGameAccounts.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `CustomerGameAccounts.tsx`, `package.json`, `App.tsx`, `officialPartnersUtils.ts`, `ref_node_assert`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `CustomerChat.tsx`, `lucide-react`, `WebPushClient`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `dataService`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `dataService.ts`, `AdminOfficialPartnersTab.tsx`, `supabaseAuthService.ts`, `types.ts`, `toProxyStorageUrl`, `CustomerMobileDrawer.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06760316066725197 - nodes in this community are weakly interconnected._