# Graph Report - Aetherpay  (2026-11-21)

## Corpus Check
- 150 files · ~241,728 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .lock 1)

## Summary
- 1347 nodes · 4504 edges · 31 communities (28 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c809663b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DataService
- dataService
- package.json
- App.tsx
- AdminReferralGovernancePanel.tsx
- types/index.ts
- officialPartnersUtils.ts
- audit.mjs
- steps
- webPushNotifications.test.ts
- AdminConfig.tsx
- wheelOfLuckUtils.ts
- compilerOptions
- AdminChat.tsx
- AdminReferralGovernancePanel.tsx
- CustomerReferrals.tsx
- lucide-react
- WebPushClient
- AdminAudit.tsx
- vercel.json
- sw.js
- dataService.ts
- referralHandlers.ts
- assetPreloader.ts
- useVerificationResolution.ts
- AuthSessionService
- types.ts
- api/index.ts
- dataService.ts
- react
- UserProfile

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

## Communities (31 total, 3 thin omitted)

### Community 0 - "DataService"
Cohesion: 0.05
Nodes (9): DataService, findRequestById(), isSupabaseConfigured(), CashoutFeedItem, ChatMessage, GameAccount, PasswordResetToken, SupportConversation (+1 more)

### Community 1 - "dataService"
Cohesion: 0.24
Nodes (7): LiveCashoutFeedList(), LiveCashoutFeedListProps, AdminRequestsProps, CustomerWithdrawal(), loadAdminRequests(), loadCustomerWithdrawal(), dataService

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, lucide-react@^1.16.0, react@^19.0.0, react-dom@^19.0.0, @supabase/supabase-js@^2.49.1, tailwindcss@^4.0.0, @tailwindcss/vite@^4.0.0, web-push@^3.6.7 (+32 more)

### Community 3 - "App.tsx"
Cohesion: 0.06
Nodes (62): App(), LazyEmailVerificationBanner, LazyPageFallback(), LazyPageFallbackProps, LegalContent(), LegalContentProps, SessionHydrationScreenProps, SessionTimeoutWarningModal() (+54 more)

### Community 4 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.14
Nodes (11): AuthSessionResponse, AuthTokenCoordinator, AuthTokenCoordinatorDeps, decodeBase64UrlToUtf8(), decodeJwtExpMs(), decodeJwtPayload(), isJwtExpiredOrExpiring(), isPermanentAuthRefreshError() (+3 more)

### Community 5 - "types/index.ts"
Cohesion: 0.04
Nodes (44): AppConfig, AppNotification, AuditLog, CashoutFeedConfig, ChatMessage, ChatTransactionData, ConversationStatus, GameAccount (+36 more)

### Community 6 - "officialPartnersUtils.ts"
Cohesion: 0.06
Nodes (77): AdminOfficialPartnersTab(), SortMode, OfficialPartnerDrawer(), OfficialPartnerDrawerProps, PLATFORMS, OfficialPartnersPreviewModal(), OfficialPartnersPreviewModalProps, getPlatformDisplayName() (+69 more)

### Community 7 - "audit.mjs"
Cohesion: 0.08
Nodes (41): jszip, playwright, sharp, AUDIT_CONFIG, buildComparisonReportHtml(), buildOrderedPngFilename(), classifyRouteStatus(), DEFAULT_APP_CANDIDATES (+33 more)

### Community 8 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, update-graph, name, on, push (+15 more)

### Community 9 - "webPushNotifications.test.ts"
Cohesion: 0.29
Nodes (4): executeSendTestAlertFlow(), NormalizedPushSubPayload, SendTestAlertEnv, SendTestAlertResult

### Community 10 - "AdminConfig.tsx"
Cohesion: 0.06
Nodes (51): TelegramBotConfigCard(), AdminChatTopUpModal(), TopUpModalMode, AdminConfig(), AdminConfigProps, QrCodeUploadBox(), QrCodeUploadBoxProps, AdminGameCatalog() (+43 more)

### Community 11 - "wheelOfLuckUtils.ts"
Cohesion: 0.07
Nodes (64): dispatchBonusLoadStaffNotification(), handleGetWheelStatus(), handlePostAdminWheelConfig(), handlePostGameCreditTransfer(), handlePostWheelSpin(), isMissingFunctionError(), isMissingTableOrColumnError(), loadAuthoritativeWheelConfig() (+56 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "AdminChat.tsx"
Cohesion: 0.05
Nodes (76): AdminChatCashoutModal(), ChatTransactionCard(), ChatTransactionCardProps, GlobalChatNotificationManager(), GlobalChatNotificationManagerProps, AdminChat(), TICKET_STATUS_OPTIONS, CustomerChat() (+68 more)

### Community 14 - "AdminReferralGovernancePanel.tsx"
Cohesion: 0.13
Nodes (19): AdminReferralGovernancePanel(), AdminReferralGovernancePanelProps, FLAG_LABELS, STATUS_DISPLAY, STATUS_TABS, RealtimeSyncBadge(), RealtimeSyncBadgeProps, AdminDashboard() (+11 more)

### Community 15 - "CustomerReferrals.tsx"
Cohesion: 0.50
Nodes (4): CustomerReferrals(), getStepBadge(), loadCustomerReferrals(), ReferralSummary

### Community 16 - "lucide-react"
Cohesion: 0.19
Nodes (15): lucide-react, EmailOtpModal(), EmailOtpModalProps, ForgotPassword(), ForgotPasswordProps, ResetPassword(), ResetPasswordProps, EmailVerificationBanner() (+7 more)

### Community 19 - "AdminAudit.tsx"
Cohesion: 0.11
Nodes (29): PolicyAndPartnerCmsCard(), AdminAudit(), AdminAuditProps, loadAdminAudit(), AuditLog, AuditEntityFilter, AuditFilterOptions, buildAuditCsv() (+21 more)

### Community 21 - "vercel.json"
Cohesion: 0.40
Nodes (4): framework, headers, rewrites, version

### Community 23 - "dataService.ts"
Cohesion: 0.14
Nodes (31): CATEGORY_LABELS, CustomerWallet(), loadCustomerWallet(), ActivityStatusMeta, buildStaffTopUpDraft(), buildStaffWithdrawalDraft(), buildUnifiedWalletActivity(), computeCumulativeCompletedDeposits() (+23 more)

### Community 24 - "referralHandlers.ts"
Cohesion: 0.14
Nodes (42): awardReferralAtomically(), computeBudgetUsage(), computeRefereeRealCashDeposits(), creditPlayerWallet(), extractClientIp(), getAwardCreditedStatus(), handleGetAdminReferralLedger(), handleGetReferralSummary() (+34 more)

### Community 25 - "assetPreloader.ts"
Cohesion: 0.08
Nodes (37): SessionHydrationScreen(), StartupSplash(), StartupSplashProps, CORE_ASSET_URLS, CRITICAL_ASSET_URLS, DEFERRED_ASSET_URLS, isImageCached(), memoryImageCache (+29 more)

### Community 26 - "useVerificationResolution.ts"
Cohesion: 0.09
Nodes (23): clearCoordinatorTimers(), coordinator, CoordinatorState, listeners, notifyListeners(), resetVerificationCoordinator(), startResolutionForUser(), useVerificationResolution() (+15 more)

### Community 30 - "types.ts"
Cohesion: 0.13
Nodes (14): CashoutModalTab, PAYOUT_CHANNEL_OPTIONS, GamePlatformCardProps, AdminGameCredentialsProps, loadAdminGameCredentials(), GameAccountStatus, GameCatalogItem, PayoutMethodType (+6 more)

### Community 31 - "api/index.ts"
Cohesion: 0.05
Nodes (78): ALLOWED_AUDIT_ENTITY_TYPES, buildProxyStorageUrl(), deactivateVercelPushSubscription(), decodeJwtPartJson(), DEFAULT_SUPABASE_SERVICE_ROLE_KEY, enrichMessageRowForClient(), ensureStorageBuckets(), extractStorageLocationFromUrl() (+70 more)

### Community 32 - "dataService.ts"
Cohesion: 0.13
Nodes (26): RealtimeSyncStatus, STORAGE_KEYS, SyncHealthInfo, mapDbTopupRowToRequest(), mapDbWithdrawalRowToRequest(), mergeTopupRequests(), mergeWithdrawalRequests(), readOptionalString() (+18 more)

### Community 35 - "react"
Cohesion: 0.12
Nodes (20): react, BackgroundNotificationPrompt(), BackgroundNotificationPromptProps, IOSPwaInstallModal(), IOSPwaInstallModalProps, BeforeInstallPromptEvent, PWAInstallButtonProps, SessionTimeoutWarningModalProps (+12 more)

### Community 36 - "UserProfile"
Cohesion: 0.14
Nodes (21): AdminOfficialPartnersTabProps, AdminChatCashoutModalProps, AdminChatTopUpModalProps, AuthenticatedUserMenuProps, WheelOfLuckModalProps, CustomerMobileDrawerProps, CustomerMobileNavProps, StaffMobileNavProps (+13 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService` to `dataService.ts`, `dataService`, `App.tsx`, `UserProfile`, `react`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `AdminReferralGovernancePanel.tsx`, `CustomerReferrals.tsx`, `lucide-react`, `AdminAudit.tsx`, `dataService.ts`, `useVerificationResolution.ts`, `types.ts`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Should `DataService` be split into smaller, more focused modules?**
  _Cohesion score 0.053535785571713713 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `dataService`, `package.json`, `App.tsx`, `UserProfile`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `AdminReferralGovernancePanel.tsx`, `CustomerReferrals.tsx`, `lucide-react`, `AdminAudit.tsx`, `dataService.ts`, `assetPreloader.ts`, `useVerificationResolution.ts`, `types.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0613107822410148 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `dataService`, `package.json`, `App.tsx`, `react`, `UserProfile`, `officialPartnersUtils.ts`, `AdminConfig.tsx`, `wheelOfLuckUtils.ts`, `AdminChat.tsx`, `AdminReferralGovernancePanel.tsx`, `CustomerReferrals.tsx`, `AdminAudit.tsx`, `dataService.ts`, `assetPreloader.ts`, `types.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06259780907668232 - nodes in this community are weakly interconnected._
- **Should `AdminReferralGovernancePanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._