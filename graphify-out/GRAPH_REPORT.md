# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 156 files · ~242,187 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1373 nodes · 4591 edges · 39 communities (35 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3854f883`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- types.ts
- package.json
- App.tsx
- AdminAudit.tsx
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- CustomerHome.tsx
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- AdminChat.tsx
- react
- CustomerProfile.tsx
- lucide-react
- WebPushClient
- AdminOfficialPartnersTab.tsx
- CustomerTopUp.tsx
- ref_node_test
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- useVerificationResolution.ts
- AuthSessionService
- storageService.ts
- AgentMobileDrawer.tsx
- OfficialPartner
- api/index.ts
- chatOrderUtils.ts
- TelegramService
- ref_node_assert
- UserRole
- UserProfile
- ChatTransactionCard.tsx
- NotificationSoundService

## God Nodes (most connected - your core abstractions)
1. `DataService` - 214 edges
2. `UserProfile` - 106 edges
3. `react` - 68 edges
4. `lucide-react` - 60 edges
5. `isSupabaseConfigured()` - 60 edges
6. `App()` - 53 edges
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

## Communities (39 total, 4 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (10): DataService, findRequestById(), isSupabaseConfigured(), AuditLog, CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken (+2 more)

### Community 1 - "types.ts"
Cohesion: 0.16
Nodes (12): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerWithdrawal(), CustomerWithdrawalProps, loadCustomerWithdrawal(), GameAccountStatus, ReferralRewardMode, ReferralWelcomeBonus (+4 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.07
Nodes (56): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionTimeoutWarningModal(), CustomerMobileNav() (+48 more)

### Community 4 - "AdminAudit.tsx"
Cohesion: 0.05
Nodes (42): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminAudit() (+34 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.16
Nodes (22): OfficialPartnerDrawer(), PLATFORMS, PartnerPlatform, ALLOWED_PARTNER_HOSTS, ALLOWED_PARTNER_ICON_EXTENSIONS, cleanHandleSegment(), extractPlatformUsername(), getMessageLink() (+14 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "CustomerHome.tsx"
Cohesion: 0.13
Nodes (26): AdminChatTopUpModalProps, GamePlatformCard(), GamePlatformCardProps, WheelStrip(), AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerGameAccounts() (+18 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.12
Nodes (22): TelegramBotConfigCard(), AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, loadAdminConfig(), storageService, DEFAULT_SUPABASE_ANON_KEY (+14 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (67): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+59 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "AdminChat.tsx"
Cohesion: 0.18
Nodes (30): AdminChatCashoutModal(), ChatTransactionCard(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), buildGroupedMessages(), CHAT_QUICK_EMOJIS, deriveTruthfulConnectionStatus() (+22 more)

### Community 14 - "react"
Cohesion: 0.16
Nodes (19): react, BeforeInstallPromptEvent, PWAInstallButton(), PWAInstallButtonProps, RoleSwitcher(), WheelGlyph(), WheelGlyphProps, WheelPopup() (+11 more)

### Community 15 - "CustomerProfile.tsx"
Cohesion: 0.15
Nodes (15): BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, CustomerProfile(), loadCustomerProfile(), supabaseTokenManager, arrayBufferToBase64() (+7 more)

### Community 16 - "lucide-react"
Cohesion: 0.15
Nodes (18): lucide-react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner() (+10 more)

### Community 18 - "AdminOfficialPartnersTab.tsx"
Cohesion: 0.28
Nodes (18): AdminOfficialPartnersTab(), SortMode, OfficialPartnersPreviewModal(), getPlatformDisplayName(), PartnerIcon(), PlatformBadge(), PlatformGlyph(), VerifiedPartnerTick() (+10 more)

### Community 19 - "CustomerTopUp.tsx"
Cohesion: 0.20
Nodes (14): AdminChatTopUpModal(), TopUpModalMode, CustomerTopUp(), loadCustomerTopUp(), PaymentMethodType, ALLOWED_IMAGE_EXTENSIONS, clearTopUpDraft(), getTopUpDraftStorageKey() (+6 more)

### Community 20 - "ref_node_test"
Cohesion: 0.18
Nodes (12): ConversationScrollSnapshot, countNewlyAppendedMessages(), decideMessageUpdateScrollAction(), DEFAULT_NEAR_BOTTOM_THRESHOLD_PX, inMemoryScrollMap, loadConversationScrollSnapshot(), MessageSummary, readStoredSnapshotMap() (+4 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.05
Nodes (77): PolicyAndPartnerCmsCard(), AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminRequestsProps, CATEGORY_LABELS, CustomerWallet(), loadAdminRequests() (+69 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.14
Nodes (42): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+34 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.06
Nodes (53): GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, SessionHydrationScreen(), StartupSplash(), StartupSplashProps, SwiftSweepsLogo(), SwiftSweepsLogoProps, AdminMobileDrawer() (+45 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 28 - "storageService.ts"
Cohesion: 0.32
Nodes (8): fileToBase64(), StorageService, StorageUploadResult, buildProxyStorageUrl(), toProxyStorageUrl(), compressImageToWebP(), CompressionOptions, validateImageFile()

### Community 29 - "AgentMobileDrawer.tsx"
Cohesion: 0.30
Nodes (11): AgentMobileDrawer(), AgentMobileDrawerProps, AGENT_ADMIN_ONLY_TABS, AGENT_DRAWER_REMOVED_TABS, AGENT_OFFICIAL_PARTNERS_ROUTE, AGENT_RULES_ROUTE, AgentDrawerNavItem, canRenderAgentDrawer() (+3 more)

### Community 30 - "OfficialPartner"
Cohesion: 0.27
Nodes (5): OfficialPartnerDrawerProps, OfficialPartnersPreviewModalProps, OfficialPartner, OfficialPartnerInput, isHtmlFallbackResponse()

### Community 31 - "api/index.ts"
Cohesion: 0.05
Nodes (80): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+72 more)

### Community 32 - "chatOrderUtils.ts"
Cohesion: 0.41
Nodes (10): compareMessagesChronologically(), extractAttachmentMetadata(), isBotGreetingMessage(), mapDbMessageRowToChatMessage(), mergeAuthoritativeMessages(), mergeSingleMessage(), normalizeTransactionDataUrls(), resolveCanonicalConversationId() (+2 more)

### Community 33 - "TelegramService"
Cohesion: 0.24
Nodes (3): TelegramService, telegramService, TelegramStatus

### Community 34 - "ref_node_assert"
Cohesion: 0.24
Nodes (5): realtimeChatHub, ChannelEntry, ChatRoomListener, createRealtimeChatHub(), PostgresFilterConfig

### Community 35 - "UserRole"
Cohesion: 0.16
Nodes (11): SessionHydrationScreenProps, SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential (+3 more)

### Community 36 - "UserProfile"
Cohesion: 0.13
Nodes (21): AdminOfficialPartnersTabProps, AuthenticatedUserMenuProps, CustomerMobileDrawerProps, CustomerMobileNavProps, StaffMobileNavProps, TopNavbarProps, AdminChatProps, CustomerChatProps (+13 more)

### Community 37 - "ChatTransactionCard.tsx"
Cohesion: 0.33
Nodes (7): ChatTransactionCardProps, extractStorageLocation(), safeDecodeURIComponent(), StorageLocation, toDirectSupabaseStorageUrl(), supabaseUrl, ChatTransactionData

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `AdminAudit.tsx`, `officialPartnersUtils.ts`, `CustomerHome.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `react`, `CustomerProfile.tsx`, `lucide-react`, `AdminOfficialPartnersTab.tsx`, `CustomerTopUp.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `OfficialPartner`, `UserRole`, `UserProfile`, `ChatTransactionCard.tsx`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05304559693699965 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `AdminAudit.tsx`, `CustomerHome.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `react`, `CustomerProfile.tsx`, `lucide-react`, `WebPushClient`, `AdminOfficialPartnersTab.tsx`, `CustomerTopUp.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `AuthSessionService`, `AgentMobileDrawer.tsx`, `UserRole`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `AdminAudit.tsx`, `officialPartnersUtils.ts`, `CustomerHome.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `CustomerProfile.tsx`, `lucide-react`, `AdminOfficialPartnersTab.tsx`, `CustomerTopUp.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `AgentMobileDrawer.tsx`, `TelegramService`, `UserRole`, `UserProfile`, `ChatTransactionCard.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06993006993006994 - nodes in this community are weakly interconnected._
- **Should `AdminAudit.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05432692307692308 - nodes in this community are weakly interconnected._