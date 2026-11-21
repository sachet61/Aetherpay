# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 160 files · ~245,574 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1393 nodes · 4686 edges · 35 communities (32 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da4b34bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- types.ts
- package.json
- App.tsx
- AdminReferralGovernancePanel.tsx
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- overlayHistoryUtils.ts
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- AdminChat.tsx
- CustomerMobileDrawer.tsx
- officialPartnerHandlers.ts
- UserProfile
- WebPushClient
- AdminDashboard.tsx
- AdminAudit.tsx
- CustomerHome.tsx
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- useVerificationResolution.ts
- AuthSessionService
- UserRole
- handler
- AgentMobileDrawer.tsx
- api/index.ts
- OfficialPartner
- UserRole
- LegalContent.tsx

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

## Communities (35 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (9): DataService, mapGameCatalogItemToDbRow(), findRequestById(), isSupabaseConfigured(), CashoutFeedItem, GameAccount, PasswordResetToken, SupportConversation (+1 more)

### Community 1 - "types.ts"
Cohesion: 0.10
Nodes (23): AdminChatCashoutModalProps, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, AdminChatTopUpModalProps, AuthenticatedUserMenuProps, WheelSpinResultModalProps, CustomerMobileDrawerProps, TopNavbarProps (+15 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (36): dependencies, lucide-react@^1.16.0, react@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, devDependencies, tsx@^4.19.2 (+28 more)

### Community 3 - "App.tsx"
Cohesion: 0.11
Nodes (34): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, CustomerMobileNav(), StaffMobileNav(), useDataService(), WheelAvailabilityProvider() (+26 more)

### Community 4 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.11
Nodes (15): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+7 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.13
Nodes (41): AdminOfficialPartnersTab(), SortMode, OfficialPartnerDrawer(), PLATFORMS, OfficialPartnersPreviewModal(), getPlatformDisplayName(), PartnerIcon(), PlatformBadge() (+33 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "overlayHistoryUtils.ts"
Cohesion: 0.28
Nodes (13): AppHistoryState, AppOverlayKey, buildHistoryState(), getTopActiveOverlay(), OverlayStateSnapshot, PopStateDecision, readOverlayFromHistoryState(), readTabFromHistoryState() (+5 more)

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.06
Nodes (48): TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerProfile() (+40 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (65): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+57 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "AdminChat.tsx"
Cohesion: 0.05
Nodes (80): AdminChatCashoutModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat(), compareMessagesChronologically() (+72 more)

### Community 14 - "CustomerMobileDrawer.tsx"
Cohesion: 0.12
Nodes (27): react-dom@^19.0.0, react-dom, PWAInstallButton(), RoleSwitcher(), SwiftSweepsLogo(), SwiftSweepsLogoProps, WheelGlyph(), WheelGlyphProps (+19 more)

### Community 15 - "officialPartnerHandlers.ts"
Cohesion: 0.20
Nodes (21): ensurePartnerIconsBucket(), handleCreateOfficialPartner(), handleDeleteOfficialPartner(), handleGetOfficialPartners(), handleReorderOfficialPartners(), handleUpdateOfficialPartner(), handleUploadOfficialPartnerIcon(), hasValidImageMagicBytes() (+13 more)

### Community 16 - "UserProfile"
Cohesion: 0.08
Nodes (40): lucide-react, react, AdminOfficialPartnersTabProps, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword() (+32 more)

### Community 17 - "WebPushClient"
Cohesion: 0.16
Nodes (8): arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.18
Nodes (13): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+5 more)

### Community 19 - "AdminAudit.tsx"
Cohesion: 0.19
Nodes (15): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+7 more)

### Community 20 - "CustomerHome.tsx"
Cohesion: 0.18
Nodes (15): LiveCashoutFeedList(), LiveCashoutFeedListProps, GamePlatformCard(), GamePlatformCardProps, WheelStrip(), WheelStripProps, CustomerHome(), GameCatalogItem (+7 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.06
Nodes (73): PolicyAndPartnerCmsCard(), CATEGORY_LABELS, CustomerWallet(), CustomerWalletProps, loadCustomerWallet(), RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo (+65 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.13
Nodes (44): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+36 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.05
Nodes (56): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, CustomerWithdrawal(), CustomerWithdrawalProps (+48 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 28 - "UserRole"
Cohesion: 0.22
Nodes (9): SessionHydrationScreenProps, UserSession, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate(), SilentRefreshInput (+1 more)

### Community 29 - "handler"
Cohesion: 0.17
Nodes (18): buildProxyStorageUrl(), enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl(), handleGetChatMessages(), handlePostChatSend(), handler(), handleStorageFileProxy() (+10 more)

### Community 30 - "AgentMobileDrawer.tsx"
Cohesion: 0.30
Nodes (11): AgentMobileDrawer(), AgentMobileDrawerProps, AGENT_ADMIN_ONLY_TABS, AGENT_DRAWER_REMOVED_TABS, AGENT_OFFICIAL_PARTNERS_ROUTE, AGENT_RULES_ROUTE, AgentDrawerNavItem, canRenderAgentDrawer() (+3 more)

### Community 31 - "api/index.ts"
Cohesion: 0.07
Nodes (43): ALLOWED_AUDIT_ENTITY_TYPES, deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, fetchSupabaseJwksKeys(), getWebPushClient(), handleGetAuditLogs(), handlePostAuditLog() (+35 more)

### Community 32 - "OfficialPartner"
Cohesion: 0.27
Nodes (5): OfficialPartnerDrawerProps, OfficialPartnersPreviewModalProps, OfficialPartner, OfficialPartnerInput, isHtmlFallbackResponse()

### Community 35 - "UserRole"
Cohesion: 0.22
Nodes (8): SessionTimeoutWarningModal(), SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `OfficialPartner`, `types.ts`, `App.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `CustomerMobileDrawer.tsx`, `UserProfile`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `CustomerHome.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `UserRole`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.05396350156829199 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `DataService`, `types.ts`, `UserRole`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `CustomerMobileDrawer.tsx`, `WebPushClient`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `CustomerHome.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `AuthSessionService`, `UserRole`, `AgentMobileDrawer.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._
- **Why does `react` connect `UserProfile` to `types.ts`, `package.json`, `App.tsx`, `UserRole`, `officialPartnersUtils.ts`, `LegalContent.tsx`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `CustomerMobileDrawer.tsx`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `CustomerHome.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `AgentMobileDrawer.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11336032388663968 - nodes in this community are weakly interconnected._