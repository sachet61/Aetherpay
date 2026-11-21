# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 150 files · ~241,775 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1347 nodes · 4508 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9951a11`
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
- supabaseAuthService.ts
- react
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
- UserRole
- CustomerReferrals.tsx
- AdminGameCredentials.tsx
- api/index.ts
- dataService.ts
- AdminRequests.tsx
- uiCopyUtils.ts
- UserRole
- UserProfile
- WithdrawalRequest
- LegalContent.tsx

## God Nodes (most connected - your core abstractions)
1. `DataService` - 215 edges
2. `UserProfile` - 102 edges
3. `react` - 66 edges
4. `isSupabaseConfigured()` - 60 edges
5. `lucide-react` - 58 edges
6. `App()` - 52 edges
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

## Communities (39 total, 5 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken, SupportConversation (+1 more)

### Community 1 - "types.ts"
Cohesion: 0.12
Nodes (16): AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, GameAccountStatus, PayoutMethodType (+8 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.10
Nodes (37): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, CustomerMobileNav(), StaffMobileNav(), useDataService(), WheelAvailabilityProvider() (+29 more)

### Community 4 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.14
Nodes (11): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+3 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.06
Nodes (76): AdminOfficialPartnersTab(), SortMode, OfficialPartnerDrawer(), OfficialPartnerDrawerProps, PLATFORMS, OfficialPartnersPreviewModal(), OfficialPartnersPreviewModalProps, getPlatformDisplayName() (+68 more)

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
Nodes (45): TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, CustomerTopUp() (+37 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (64): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+56 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "AdminChat.tsx"
Cohesion: 0.05
Nodes (76): AdminChatCashoutModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat() (+68 more)

### Community 14 - "supabaseAuthService.ts"
Cohesion: 0.39
Nodes (6): PasswordResetResponse, SupabaseAuthResult, supabase, coordinator, emitSessionExpiredNotice(), supabaseTokenManager

### Community 15 - "react"
Cohesion: 0.26
Nodes (9): react, BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, BeforeInstallPromptEvent, PWAInstallButtonProps, CustomerProfile() (+1 more)

### Community 16 - "lucide-react"
Cohesion: 0.21
Nodes (13): lucide-react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner() (+5 more)

### Community 17 - "WebPushClient"
Cohesion: 0.14
Nodes (8): arrayBufferToBase64(), DevicePlatform, urlBase64ToUint8Array(), WebPushClient, executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.23
Nodes (10): AdminReferralGovernancePanel(), RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard(), AdminDashboardProps, AdminUsers(), AdminUsersProps, loadAdminDashboard() (+2 more)

### Community 19 - "AdminAudit.tsx"
Cohesion: 0.19
Nodes (15): AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv(), escapeCsvCell() (+7 more)

### Community 20 - "dataService"
Cohesion: 0.31
Nodes (6): LiveCashoutFeedList(), LiveCashoutFeedListProps, CustomerMobileNavProps, CustomerWithdrawal(), loadCustomerWithdrawal(), dataService

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.15
Nodes (30): CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits() (+22 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.14
Nodes (42): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+34 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.07
Nodes (46): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, AdminGameCatalog(), AdminGameCatalogProps, PRESET_GAME_ICONS, loadAdminGameCatalog(), GameLink (+38 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 28 - "UserRole"
Cohesion: 0.24
Nodes (10): SessionHydrationScreenProps, UserSession, getPrefetchRouteKeysForRole(), HydrationGateInput, HydrationPhaseLabelInput, resolveHydrationPhaseLabel(), shouldRunSilentBackgroundRefresh(), shouldShowSessionHydrationGate() (+2 more)

### Community 29 - "CustomerReferrals.tsx"
Cohesion: 0.50
Nodes (4): CustomerReferrals(), getStepBadge(), loadCustomerReferrals(), ReferralSummary

### Community 31 - "api/index.ts"
Cohesion: 0.05
Nodes (78): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+70 more)

### Community 32 - "dataService.ts"
Cohesion: 0.18
Nodes (18): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_CONVERSATIONS, INITIAL_GAME_ACCOUNTS, INITIAL_GAME_CATALOG (+10 more)

### Community 34 - "uiCopyUtils.ts"
Cohesion: 0.24
Nodes (14): PolicyAndPartnerCmsCard(), decodeBasicHtmlEntities(), escapeHtmlText(), formatCashoutChatMessage(), formatCompactDollar(), formatCredentialsReadyChatMessage(), formatGameIdRequestChatMessage(), formatGamePasswordResetChatMessage() (+6 more)

### Community 35 - "UserRole"
Cohesion: 0.22
Nodes (8): SessionTimeoutWarningModal(), SessionTimeoutWarningModalProps, authSessionService, INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS, PREDEFINED_ADMINS, SEED_CREDENTIALS, StoredCredential

### Community 36 - "UserProfile"
Cohesion: 0.15
Nodes (20): AdminOfficialPartnersTabProps, AdminChatCashoutModalProps, AdminChatTopUpModalProps, AuthenticatedUserMenuProps, WheelOfLuckModalProps, CustomerMobileDrawerProps, StaffMobileNavProps, TopNavbarProps (+12 more)

### Community 37 - "WithdrawalRequest"
Cohesion: 0.35
Nodes (9): mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString(), StaffTopUpDraftResult, StaffWithdrawalDraftResult, TopUpRequest (+1 more)

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `types.ts`, `App.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `supabaseAuthService.ts`, `react`, `lucide-react`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `dataService`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `CustomerReferrals.tsx`, `AdminGameCredentials.tsx`, `dataService.ts`, `AdminRequests.tsx`, `uiCopyUtils.ts`, `UserProfile`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.053535785571713713 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `types.ts`, `package.json`, `App.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `lucide-react`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `dataService`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `CustomerReferrals.tsx`, `AdminGameCredentials.tsx`, `AdminRequests.tsx`, `uiCopyUtils.ts`, `UserRole`, `UserProfile`, `LegalContent.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `types.ts`, `package.json`, `App.tsx`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `react`, `AdminDashboard.tsx`, `AdminAudit.tsx`, `dataService`, `dataService.ts`, `assetPreloader.ts`, `CustomerReferrals.tsx`, `AdminGameCredentials.tsx`, `AdminRequests.tsx`, `uiCopyUtils.ts`, `UserRole`, `UserProfile`, `LegalContent.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._