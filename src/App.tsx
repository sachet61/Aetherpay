import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useDataService } from './hooks/useDataService';
import { useVerificationResolution } from './hooks/useVerificationResolution';
import { writeVerifiedCache } from './services/verificationStateUtils';
import { dataService } from './services/dataService';
import { authSessionService } from './services/authSessionService';
import { resolveGameImageUrl } from './utils/imageUtils';
import { TopNavbar } from './components/layout/TopNavbar';
import { CustomerMobileNav } from './components/layout/CustomerMobileNav';
import { StaffMobileNav } from './components/layout/StaffMobileNav';
import { LegalContent } from './components/common/LegalContent';
import { WheelOfLuckModal } from './components/customer/WheelOfLuckModal';
import { WheelPopup } from './components/customer/WheelPopup';
import { WheelAvailabilityProvider } from './hooks/useWheelAvailability';
import { useWheelOfLuckStatus } from './hooks/useWheelOfLuckStatus';
import {
  getLocalDayKey,
  hasDismissedWheelPopupToday,
  markWheelPopupDismissedToday,
  shouldShowWheelPopup,
} from './utils/wheelOfLuckUtils';
import {
  type AppOverlayKey,
  type OverlayStateSnapshot,
  buildHistoryState,
  readOverlayFromHistoryState,
  resolveHistoryActionOnNavigate,
  resolveHistoryActionOnOverlayOpen,
  resolvePopStateTransition,
} from './utils/overlayHistoryUtils';

// Auth & Guest Landing
import { AuthPage } from './pages/auth/AuthPage';
import { SessionTimeoutWarningModal } from './components/common/SessionTimeoutWarningModal';
import { StartupSplash } from './components/common/StartupSplash';
import { SessionHydrationScreen } from './components/common/SessionHydrationScreen';
import { LazyPageFallback } from './components/common/LazyPageFallback';
import { LiveCashoutTicker } from './components/common/LiveCashoutTicker';
import { GlobalChatNotificationManager } from './components/common/GlobalChatNotificationManager';
import { BackgroundNotificationPrompt } from './components/common/BackgroundNotificationPrompt';
import { shouldShowSessionHydrationGate } from './services/sessionHydrationUtils';
import {
  LazyCustomerHome,
  LazyCustomerWallet,
  LazyCustomerTopUp,
  LazyCustomerWithdrawal,
  LazyCustomerGameAccounts,
  LazyCustomerChat,
  LazyCustomerReferrals,
  LazyCustomerRules,
  LazyCustomerProfile,
  LazyCustomerOfficialPartners,
  LazyAdminDashboard,
  LazyAdminRequests,
  LazyAdminChat,
  LazyAdminGameCatalog,
  LazyAdminGameCredentials,
  LazyAdminConfig,
  LazyAdminAudit,
  LazyAdminUsers,
  prefetchPagesForSession,
} from './routes/lazyPages';

const LazyEmailVerificationBanner = React.lazy(() =>
  import('./components/common/EmailVerificationBanner').then((mod) => ({
    default: mod.EmailVerificationBanner,
  }))
);

import {
  Gamepad2,
  Gift,
  FileText,
  User,
  X,
  ShieldAlert,
  MessageCircle,
} from 'lucide-react';

export default function App() {
  const { currentUser, wallet, hydrationState, switchUser, logout } = useDataService();
  const verificationUi = useVerificationResolution(currentUser);
  const wheelOfLuck = useWheelOfLuckStatus(currentUser);
  const [bypassedHydrationUserId, setBypassedHydrationUserId] = useState<string | null>(null);

  const [currentHash, setCurrentHash] = useState<string>(window.location.hash);

  const getDefaultTab = (role?: string) => {
    if (role === 'customer') return 'dashboard';
    if (role === 'agent') return 'ops_chat';
    if (role === 'admin') return 'ops_dashboard';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const fromHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (fromHash && fromHash !== 'privacy' && fromHash !== 'data-deletion' && fromHash !== 'datadeletion') {
        return fromHash;
      }
    }
    return getDefaultTab(currentUser?.role);
  });

  const tabHistoryRef = useRef<string[]>([activeTab]);
  const [tabMeta, setTabMeta] = useState<any>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMoreDrawer, setShowMobileMoreDrawer] = useState(false);
  const popupSessionDismissedRef = useRef<Set<string>>(new Set());
  const [popupDismissedVersion, setPopupDismissedVersion] = useState(0);
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const currentUserRoleRef = useRef<string | undefined>(currentUser?.role);
  currentUserRoleRef.current = currentUser?.role;
  const wheelOfLuckRef = useRef(wheelOfLuck);
  wheelOfLuckRef.current = wheelOfLuck;
  const openOverlaysRef = useRef<OverlayStateSnapshot>({
    drawerOpen: isMobileDrawerOpen,
    notificationsOpen: showNotifications,
    wheelOpen: wheelOfLuck.wheelModalOpen,
    moreDrawerOpen: showMobileMoreDrawer,
  });
  openOverlaysRef.current = {
    drawerOpen: isMobileDrawerOpen,
    notificationsOpen: showNotifications,
    wheelOpen: wheelOfLuck.wheelModalOpen,
    moreDrawerOpen: showMobileMoreDrawer,
  };

  const pendingOverlayBackRef = useRef<AppOverlayKey | null>(null);
  const pendingSyntheticBackCountRef = useRef<number>(0);

  const cancelPendingOverlayBack = useCallback(() => {
    pendingOverlayBackRef.current = null;
  }, []);

  const scheduleDismissHistoryCleanup = useCallback((overlayKey: AppOverlayKey) => {
    pendingOverlayBackRef.current = overlayKey;
    queueMicrotask(() => {
      const target = pendingOverlayBackRef.current;
      if (!target) return;
      pendingOverlayBackRef.current = null;
      if (
        typeof window !== 'undefined' &&
        readOverlayFromHistoryState(window.history.state) === target
      ) {
        pendingSyntheticBackCountRef.current += 1;
        window.history.back();
      }
    });
  }, []);

  const openOverlayWithHistory = useCallback(
    (overlayKey: AppOverlayKey) => {
      cancelPendingOverlayBack();
      if (typeof window === 'undefined') return;
      const action = resolveHistoryActionOnOverlayOpen({
        currentState: window.history.state,
        activeTab: activeTabRef.current,
        targetOverlay: overlayKey,
      });
      const urlHash = window.location.hash || `#${activeTabRef.current}`;
      if (action.method === 'push') {
        window.history.pushState(action.nextState, '', urlHash);
      } else if (action.method === 'replace') {
        window.history.replaceState(action.nextState, '', urlHash);
      }
    },
    [cancelPendingOverlayBack]
  );

  const resetAllOverlaysLocally = useCallback(() => {
    cancelPendingOverlayBack();
    setIsMobileDrawerOpen(false);
    setShowNotifications(false);
    setShowMobileMoreDrawer(false);
    wheelOfLuckRef.current.closeWheelModal();
  }, [cancelPendingOverlayBack]);

  const applyOverlayFromHistory = useCallback(
    (overlay: AppOverlayKey | null) => {
      cancelPendingOverlayBack();
      const canShowCustomerOnly = currentUserRoleRef.current === 'customer';
      setIsMobileDrawerOpen(overlay === 'drawer');
      setShowNotifications(overlay === 'notifications');
      setShowMobileMoreDrawer(canShowCustomerOnly && overlay === 'more_drawer');
      if (canShowCustomerOnly && overlay === 'wheel') {
        wheelOfLuckRef.current.openWheelModal();
      } else {
        wheelOfLuckRef.current.closeWheelModal();
      }
    },
    [cancelPendingOverlayBack]
  );

  const handleOpenMobileDrawer = useCallback(() => {
    openOverlayWithHistory('drawer');
    setIsMobileDrawerOpen(true);
    setShowNotifications(false);
    setShowMobileMoreDrawer(false);
    wheelOfLuckRef.current.closeWheelModal();
  }, [openOverlayWithHistory]);

  const handleCloseMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
    scheduleDismissHistoryCleanup('drawer');
  }, [scheduleDismissHistoryCleanup]);

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    scheduleDismissHistoryCleanup('notifications');
  }, [scheduleDismissHistoryCleanup]);

  const handleToggleNotifications = useCallback(() => {
    if (openOverlaysRef.current.notificationsOpen) {
      handleCloseNotifications();
    } else {
      openOverlayWithHistory('notifications');
      setShowNotifications(true);
      setIsMobileDrawerOpen(false);
      setShowMobileMoreDrawer(false);
      wheelOfLuckRef.current.closeWheelModal();
    }
  }, [handleCloseNotifications, openOverlayWithHistory]);

  const handleOpenWheelModal = useCallback(() => {
    if (currentUserRoleRef.current !== 'customer') return;
    openOverlayWithHistory('wheel');
    setIsMobileDrawerOpen(false);
    setShowNotifications(false);
    setShowMobileMoreDrawer(false);
    wheelOfLuckRef.current.openWheelModal();
  }, [openOverlayWithHistory]);

  const handleCloseWheelModal = useCallback(() => {
    wheelOfLuckRef.current.closeWheelModal();
    scheduleDismissHistoryCleanup('wheel');
  }, [scheduleDismissHistoryCleanup]);

  const handleCloseMoreDrawer = useCallback(() => {
    setShowMobileMoreDrawer(false);
    scheduleDismissHistoryCleanup('more_drawer');
  }, [scheduleDismissHistoryCleanup]);

  // Synchronize browser history and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentHash(hash);
      const clean = hash.replace(/^#\/?/, '').trim();
      if (
        clean &&
        clean !== 'privacy' &&
        clean !== 'data-deletion' &&
        clean !== 'datadeletion' &&
        clean !== activeTab
      ) {
        resetAllOverlaysLocally();
        setActiveTab(clean);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab, resetAllOverlaysLocally]);

  // Synchronize browser popstate events (Back / Forward buttons & mobile swipe-back gestures)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentWindowHash = window.location.hash;
      setCurrentHash(currentWindowHash);

      const isSyntheticOverlayBack = pendingSyntheticBackCountRef.current > 0;
      if (isSyntheticOverlayBack) {
        pendingSyntheticBackCountRef.current -= 1;
      }

      const decision = resolvePopStateTransition({
        eventState: event.state,
        currentHash: currentWindowHash,
        currentTab: activeTabRef.current,
        defaultTab: getDefaultTab(currentUserRoleRef.current),
        openOverlays: openOverlaysRef.current,
        isSyntheticOverlayBack,
      });

      if (decision.kind === 'ignore_synthetic_overlay_back' || decision.kind === 'legal_hash') {
        return;
      }

      if (decision.kind === 'sync_overlays_only') {
        applyOverlayFromHistory(decision.overlayToShow);
        return;
      }

      applyOverlayFromHistory(decision.overlayToShow);
      if (decision.shouldPopTabHistory && tabHistoryRef.current.length > 1) {
        tabHistoryRef.current.pop();
      }
      setActiveTab(decision.destinationTab);
      setTabMeta(null);
      if (decision.destinationTab !== 'ops_chat') {
        setIsMobileChatActive(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyOverlayFromHistory]);

  // Ensure initial activeTab is properly recorded in history.state on mount
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      const stateTab = window.history.state?.tab;
      if (!stateTab || stateTab !== activeTab) {
        const preservedOverlay = readOverlayFromHistoryState(window.history.state);
        window.history.replaceState(
          buildHistoryState(activeTab, preservedOverlay),
          '',
          `#${activeTab}`
        );
      }
    }
  }, [currentUser?.id, activeTab]);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const reason =
        typeof detail?.reason === 'string' && detail.reason.trim()
          ? detail.reason.trim()
          : 'Your login session has expired or was signed out. Please sign in again to continue.';
      setSessionExpiredNotice(reason);
    };
    const handleRequestReauth = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const reason =
        typeof detail?.reason === 'string' && detail.reason.trim()
          ? detail.reason.trim()
          : 'Your login session has expired or was signed out on another device. Please sign in again to continue.';
      setBypassedHydrationUserId(null);
      setSessionExpiredNotice(null);
      logout();
      setTimeoutNotice(reason);
    };
    window.addEventListener('aetherpay_auth_session_expired', handleSessionExpired);
    window.addEventListener('aetherpay_request_reauth', handleRequestReauth);
    return () => {
      window.removeEventListener('aetherpay_auth_session_expired', handleSessionExpired);
      window.removeEventListener('aetherpay_request_reauth', handleRequestReauth);
    };
  }, [logout]);

  const handleLogout = (reason?: string) => {
    resetAllOverlaysLocally();
    if (typeof window !== 'undefined' && readOverlayFromHistoryState(window.history.state)) {
      window.history.replaceState(
        buildHistoryState(activeTabRef.current),
        '',
        window.location.hash || `#${activeTabRef.current}`
      );
    }
    setBypassedHydrationUserId(null);
    const expiredBannerMsg = sessionExpiredNotice;
    setSessionExpiredNotice(null);
    logout();
    if (reason === 'inactivity') {
      setTimeoutNotice('Your session has timed out due to 15 minutes of inactivity. Please enter your credentials to resume.');
    } else if (reason === 'session_expired') {
      setTimeoutNotice(
        expiredBannerMsg ||
          'Your login session has expired or was signed out on another device. Please sign in again to continue.'
      );
    } else {
      setTimeoutNotice(null);
    }
  };

  // Sync tab and prefetch lazy page chunks when user or active tab changes
  useEffect(() => {
    if (currentUser) {
      let nextTab = activeTab;
      if (currentUser.role === 'customer' && activeTab.startsWith('ops_')) {
        nextTab = 'dashboard';
        setActiveTab('dashboard');
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      } else if (currentUser.role !== 'customer' && !activeTab.startsWith('ops_')) {
        nextTab = currentUser.role === 'agent' ? 'ops_chat' : 'ops_dashboard';
        setActiveTab(nextTab);
        window.history.replaceState({ tab: nextTab }, '', `#${nextTab}`);
      }
      prefetchPagesForSession(currentUser.role, nextTab);
    }
  }, [currentUser?.id, currentUser?.role, activeTab]);

  const isCustomerChatOpen = Boolean(currentUser?.role === 'customer' && activeTab === 'chat');
  const isStaffOpsChatTab = Boolean(currentUser && currentUser.role !== 'customer' && activeTab === 'ops_chat');
  const isStaffMobileFullscreenChat = Boolean(isStaffOpsChatTab && isMobileChatActive);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isCustomerChatOpen && !isStaffMobileFullscreenChat) return;
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyMinHeight = body.style.minHeight;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.minHeight = '0px';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.minHeight = prevBodyMinHeight;
    };
  }, [isCustomerChatOpen, isStaffMobileFullscreenChat]);

  const catalogIconUrls = React.useMemo(
    () =>
      dataService
        .getGameCatalog()
        .filter((g) => g.enabled !== false)
        .map((g) => resolveGameImageUrl(g.iconUrl || g.imageUrl)),
    [hydrationState.hydratedUserId]
  );

  const wheelAvailabilityValue = React.useMemo(
    () => ({
      spinAvailable: wheelOfLuck.spinAvailable,
      isLoading: wheelOfLuck.isLoadingWheel,
      openWheelModal: handleOpenWheelModal,
    }),
    [wheelOfLuck.spinAvailable, wheelOfLuck.isLoadingWheel, handleOpenWheelModal]
  );

  const handleDismissWheelPopup = React.useCallback(() => {
    if (!currentUser?.id) return;
    markWheelPopupDismissedToday(currentUser.id, getLocalDayKey(), popupSessionDismissedRef.current);
    setPopupDismissedVersion((v) => v + 1);
  }, [currentUser?.id]);

  const handleSpinNowFromPopup = React.useCallback(() => {
    if (currentUser?.id) {
      markWheelPopupDismissedToday(currentUser.id, getLocalDayKey(), popupSessionDismissedRef.current);
      setPopupDismissedVersion((v) => v + 1);
    }
    handleOpenWheelModal();
  }, [currentUser?.id, handleOpenWheelModal]);

  if (currentHash === '#privacy') {
    return <LegalContent initialTab="privacy" onBack={() => { window.location.hash = ''; setCurrentHash(''); }} />;
  }
  if (currentHash === '#data-deletion' || currentHash === '#datadeletion') {
    return <LegalContent initialTab="deletion" onBack={() => { window.location.hash = ''; setCurrentHash(''); }} />;
  }

  const isCustomer = currentUser?.role === 'customer';
  const isAgent = currentUser?.role === 'agent';
  const isAdmin = currentUser?.role === 'admin';

  // If not logged in, render dedicated Auth & Landing Portal
  if (!currentUser) {
    return (
      <>
        <StartupSplash target="auth" catalogIconUrls={catalogIconUrls} />
        <AuthPage
          key="auth"
          onLoginSuccess={(user) => {
            resetAllOverlaysLocally();
            setBypassedHydrationUserId(null);
            void dataService.hydrateForSession(user);
            setTimeoutNotice(null);
            setSessionExpiredNotice(null);
            const defaultTab = getDefaultTab(user.role);
            setActiveTab(defaultTab);
            prefetchPagesForSession(user.role, defaultTab);
            window.history.replaceState(buildHistoryState(defaultTab), '', `#${defaultTab}`);
            tabHistoryRef.current = [defaultTab];
          }}
          timeoutNotice={timeoutNotice}
        />
      </>
    );
  }

  const showHydrationGate = shouldShowSessionHydrationGate({
    currentUserId: currentUser.id,
    isHydrating: hydrationState.isHydrating,
    hydratedUserId: hydrationState.hydratedUserId,
    bypassedUserId: bypassedHydrationUserId,
    hydrationError: hydrationState.error,
    supabaseConfigured: hydrationState.isConfigured,
  });

  if (showHydrationGate) {
    return (
      <>
        <StartupSplash
          target={isCustomer ? 'customer_dashboard' : 'staff_ops'}
          catalogIconUrls={catalogIconUrls}
        />
        <SessionHydrationScreen
          role={currentUser.role}
          displayName={currentUser.displayName}
          errorMessage={hydrationState.error}
          catalogIconUrls={catalogIconUrls}
          onRetry={() => {
            setBypassedHydrationUserId(null);
            void dataService.hydrateForSession(currentUser, { force: true });
          }}
          onContinueAnyway={() => setBypassedHydrationUserId(currentUser.id)}
        />
      </>
    );
  }

  const activeWallet = wallet || dataService.getWallet(currentUser.id);

  const handleSwitchUser = (userId: string) => {
    resetAllOverlaysLocally();
    setBypassedHydrationUserId(null);
    switchUser(userId);
    const targetUser = dataService.getUserById(userId);
    if (targetUser) {
      setIsMobileChatActive(false);
      const defaultTab = getDefaultTab(targetUser.role);
      setActiveTab(defaultTab);
      prefetchPagesForSession(targetUser.role, defaultTab);
      window.history.replaceState(buildHistoryState(defaultTab), '', `#${defaultTab}`);
      tabHistoryRef.current = [defaultTab];
    }
  };

  const handleNavigateTab = (
    tab: string,
    meta?: any,
    options?: { replace?: boolean; isBack?: boolean }
  ) => {
    if (tab === 'menu') {
      openOverlayWithHistory('more_drawer');
      setShowMobileMoreDrawer(true);
      setIsMobileDrawerOpen(false);
      setShowNotifications(false);
      wheelOfLuckRef.current.closeWheelModal();
      return;
    }

    // Normalize shorthand staff tabs to ops_* routes when in staff mode
    let targetTab = tab;
    if (!isCustomer) {
      const staffTabMap: Record<string, string> = {
        dashboard: 'ops_dashboard',
        requests: 'ops_requests',
        chat: 'ops_chat',
        credentials: 'ops_game_credentials',
        game_credentials: 'ops_game_credentials',
        users: 'ops_users',
        config: 'ops_config',
        audit: 'ops_audit',
        game_catalog: 'ops_game_catalog',
      };
      if (staffTabMap[tab]) {
        targetTab = staffTabMap[tab];
      }
    }

    if (targetTab !== 'ops_chat') {
      setIsMobileChatActive(false);
    }

    // Role-based route guard: agents cannot access Admin-exclusive routes
    if (isAgent && (targetTab === 'ops_game_catalog' || targetTab === 'ops_config' || targetTab === 'ops_audit')) {
      alert('Access Restricted: This configuration area is reserved for Platform Administrators.');
      return;
    }

    const activeOverlayInHistory =
      typeof window !== 'undefined'
        ? readOverlayFromHistoryState(window.history.state)
        : null;

    resetAllOverlaysLocally();
    setTabMeta(meta || null);
    setActiveTab(targetTab);

    // Synchronize browser history and hash
    if (!options?.isBack && typeof window !== 'undefined') {
      const historyAction = resolveHistoryActionOnNavigate({
        currentState: window.history.state,
        currentTab: activeTab,
        targetTab,
        replace: options?.replace,
        isBack: options?.isBack,
      });

      if (historyAction.method === 'replace') {
        window.history.replaceState(historyAction.nextState, '', `#${targetTab}`);
      } else if (historyAction.method === 'push') {
        window.history.pushState(historyAction.nextState, '', `#${targetTab}`);
      } else if (targetTab === activeTab && activeOverlayInHistory) {
        // Navigating to the current tab while an overlay entry sits on top of history:
        // pop the synthetic overlay entry so browser history remains clean.
        scheduleDismissHistoryCleanup(activeOverlayInHistory);
      }

      if (historyAction.shouldRecordTabHistory === 'replace') {
        if (tabHistoryRef.current.length > 0) {
          tabHistoryRef.current[tabHistoryRef.current.length - 1] = targetTab;
        } else {
          tabHistoryRef.current.push(targetTab);
        }
      } else if (historyAction.shouldRecordTabHistory === 'push') {
        tabHistoryRef.current.push(targetTab);
      }
    }

    if (targetTab === 'chat' || targetTab === 'ops_chat') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Safe back navigation handler: pops previous app state or returns to role home
  const handleGoBack = () => {
    if (tabHistoryRef.current.length > 1) {
      window.history.back();
    } else {
      const fallbackTab = getDefaultTab(currentUser?.role);
      handleNavigateTab(fallbackTab, undefined, { replace: true });
    }
  };

  const localDayKey = getLocalDayKey();
  void popupDismissedVersion;
  const isWheelPopupDismissedToday = isCustomer
    ? hasDismissedWheelPopupToday(currentUser.id, localDayKey, popupSessionDismissedRef.current)
    : true;

  const isWheelPopupVisible = shouldShowWheelPopup({
    isCustomer,
    activeTab,
    spinAvailable: wheelOfLuck.spinAvailable,
    wheelModalOpen: wheelOfLuck.wheelModalOpen,
    hasOtherOpenModal: showMobileMoreDrawer || isMobileDrawerOpen || showNotifications,
    dismissedToday: isWheelPopupDismissedToday,
  });

  return (
    <WheelAvailabilityProvider value={wheelAvailabilityValue}>
      {/* Branded Startup Loading Screen tracking required assets for active workspace */}
      <StartupSplash
        target={isCustomer ? 'customer_dashboard' : 'staff_ops'}
        catalogIconUrls={catalogIconUrls}
      />

      <div
        className={`text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 ${
          isCustomerChatOpen
            ? 'h-viewport-dynamic bg-[#080E1D] overflow-hidden pb-0'
            : isCustomer
            ? 'min-h-screen bg-[#0A0F1D]'
            : isStaffOpsChatTab
            ? isMobileChatActive
              ? 'h-viewport-dynamic bg-[#070D20] overflow-hidden pb-0'
              : 'h-viewport-dynamic bg-[#0A0F1D] overflow-hidden pb-[74px] md:pb-0'
            : 'min-h-screen bg-[#0A0F1D]'
        }`}
      >
        {/* Session Inactivity Timeout Guard & Live Countdown Warning */}
        <SessionTimeoutWarningModal onLogout={handleLogout} />

        {/* Global Real-time Background Chat Notification, Audio Chime & Browser Push Manager */}
        <GlobalChatNotificationManager
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
        />

        {/* Top Navbar with strict role-based views (Hidden during full-screen customer support chat) */}
        {!isCustomerChatOpen && (
          <div className="sticky top-0 z-40">
            <TopNavbar
              currentUser={currentUser}
              wallet={activeWallet}
              onSwitchUser={handleSwitchUser}
              onLogout={() => handleLogout('manual')}
              activeTab={activeTab}
              onNavigateTab={handleNavigateTab}
              spinAvailable={wheelOfLuck.spinAvailable}
              onOpenWheel={handleOpenWheelModal}
              isMobileDrawerOpen={isMobileDrawerOpen}
              onOpenMobileDrawer={handleOpenMobileDrawer}
              onCloseMobileDrawer={handleCloseMobileDrawer}
              showNotifications={showNotifications}
              onToggleNotifications={handleToggleNotifications}
              onCloseNotifications={handleCloseNotifications}
            />
            {/* Continuous News-Style Horizontal Live Cashouts Marquee Ticker */}
            <LiveCashoutTicker />
          </div>
        )}

        {/* Messenger-Style High-Priority Background Push Alert Prompt (Hidden during full-screen chat) */}
        {!isCustomerChatOpen && <BackgroundNotificationPrompt currentUser={currentUser} />}

        {/* Main Content Viewport */}
        <main
          className={
            isCustomerChatOpen
              ? 'flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden p-0 m-0'
              : isStaffOpsChatTab
              ? 'flex-1 min-h-0 w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4 flex flex-col overflow-hidden'
              : 'flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto'
          }
        >
          {sessionExpiredNotice && !isCustomerChatOpen && (
            <div className="mb-4 p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/60 text-amber-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{sessionExpiredNotice}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleLogout('session_expired')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                >
                  Sign In Again
                </button>
                <button
                  type="button"
                  onClick={() => setSessionExpiredNotice(null)}
                  className="p-1 rounded-lg text-amber-300 hover:text-white"
                  aria-label="Dismiss session warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Lazy-Loaded Email Verification Banner for Confirmed Unverified Customers Only */}
          {isCustomer && !isCustomerChatOpen && verificationUi.shouldLoadBannerChunk && (
            <Suspense fallback={null}>
              <LazyEmailVerificationBanner
                currentUser={currentUser}
                onStatusChanged={(verified) => {
                  writeVerifiedCache(currentUser.id, currentUser.email, verified);
                  const updated = { ...currentUser, emailVerified: verified };
                  dataService.registerUser(updated);
                  authSessionService.updateUserProfile(updated);
                  window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
                }}
              />
            </Suspense>
          )}

        <Suspense fallback={<LazyPageFallback />}>
          {/* CUSTOMER PORTAL VIEWS */}
          {isCustomer && (
            <>
              {activeTab === 'dashboard' && (
                <LazyCustomerHome
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                  spinAvailable={wheelOfLuck.spinAvailable}
                  onOpenWheel={handleOpenWheelModal}
                />
              )}

              {activeTab === 'wallet' && (
                <LazyCustomerWallet
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'topup' && (
                <LazyCustomerTopUp
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                  prefilledAmount={tabMeta?.prefilledAmount}
                  preselectedGameCatalogId={tabMeta?.gameCatalogId}
                />
              )}

              {activeTab === 'withdrawal' && (
                <LazyCustomerWithdrawal
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                  prefilledAmount={tabMeta?.prefilledAmount}
                  preselectedGameCatalogId={tabMeta?.gameCatalogId}
                />
              )}

              {activeTab === 'game_accounts' && (
                <LazyCustomerGameAccounts
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'chat' && (
                <LazyCustomerChat
                  currentUser={currentUser}
                  onNavigateTab={handleNavigateTab}
                  onGoBack={handleGoBack}
                />
              )}

              {activeTab === 'referrals' && (
                <LazyCustomerReferrals
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'rules' && (
                <LazyCustomerRules onNavigateTab={handleNavigateTab} />
              )}

              {activeTab === 'privacy' && (
                <LegalContent initialTab="privacy" onBack={handleGoBack} />
              )}

              {activeTab === 'data_deletion' && (
                <LegalContent initialTab="deletion" onBack={handleGoBack} />
              )}

              {activeTab === 'profile' && (
                <LazyCustomerProfile
                  currentUser={currentUser}
                  wallet={activeWallet}
                  onNavigateTab={handleNavigateTab}
                  onSwitchUser={handleSwitchUser}
                  onLogout={logout}
                />
              )}

              {activeTab === 'official_partners' && (
                <LazyCustomerOfficialPartners
                  currentUser={currentUser}
                  onNavigateTab={handleNavigateTab}
                />
              )}
            </>
          )}

          {/* CUSTOMER SUPPORT AGENT & ADMIN OPERATIONS */}
          {!isCustomer && (
            <>
              {activeTab === 'ops_dashboard' && (
                <LazyAdminDashboard
                  currentUser={currentUser}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {/* Master Game Catalog - Handled by Admin Account */}
              {activeTab === 'ops_game_catalog' && (
                <LazyAdminGameCatalog currentUser={currentUser} />
              )}

              {/* Player Game IDs & Passwords - Handled by Customer Support & Admin */}
              {activeTab === 'ops_game_credentials' && (
                <LazyAdminGameCredentials currentUser={currentUser} />
              )}

              {/* Requests Queue */}
              {activeTab === 'ops_requests' && (
                <LazyAdminRequests
                  currentUser={currentUser}
                  initialFilter={tabMeta?.filter}
                  highlightId={tabMeta?.highlight}
                />
              )}

              {/* Customer Support Inbox */}
              {activeTab === 'ops_chat' && (
                <LazyAdminChat
                  currentUser={currentUser}
                  onNavigateTab={handleNavigateTab}
                  onGoBack={handleGoBack}
                  highlightConvId={tabMeta?.highlightConvId}
                  onActiveChatChange={(isOpen) => setIsMobileChatActive(isOpen)}
                />
              )}

              {/* User Directory & Staff Governance */}
              {activeTab === 'ops_users' && (
                <LazyAdminUsers
                  currentUser={currentUser}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {/* Admin Exclusive: Fees & Bonuses */}
              {activeTab === 'ops_config' && (
                isAdmin ? (
                  <LazyAdminConfig currentUser={currentUser} />
                ) : (
                  <div className="p-8 text-center rounded-2xl border border-amber-800 bg-amber-950/30 text-amber-300 space-y-2">
                    <ShieldAlert className="w-8 h-8 mx-auto text-amber-400" />
                    <h3 className="font-bold text-base">Admin Exclusive Area</h3>
                    <p className="text-xs text-amber-400/80">Only Platform Administrators have permission to modify system fees, bonus rates, and payment gateways.</p>
                  </div>
                )
              )}

              {/* Admin Exclusive: Audit Logs */}
              {activeTab === 'ops_audit' && (
                isAdmin ? (
                  <LazyAdminAudit currentUser={currentUser} />
                ) : (
                  <div className="p-8 text-center rounded-2xl border border-amber-800 bg-amber-950/30 text-amber-300 space-y-2">
                    <ShieldAlert className="w-8 h-8 mx-auto text-amber-400" />
                    <h3 className="font-bold text-base">Admin Exclusive Area</h3>
                    <p className="text-xs text-amber-400/80">Only Platform Administrators have permission to review full system security audit logs.</p>
                  </div>
                )
              )}
            </>
          )}
        </Suspense>
      </main>

      {/* Persistent Android-Style Bottom Navigation for Customer (Hidden during full-screen support chat) */}
      {isCustomer && !isCustomerChatOpen && (
        <CustomerMobileNav
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          currentUser={currentUser}
        />
      )}

      {isCustomer && (
        <WheelPopup
          isOpen={isWheelPopupVisible}
          onSpinNow={handleSpinNowFromPopup}
          onDismiss={handleDismissWheelPopup}
        />
      )}

      {isCustomer && (
        <WheelOfLuckModal
          isOpen={wheelOfLuck.wheelModalOpen}
          onClose={handleCloseWheelModal}
          currentUser={currentUser}
          wallet={activeWallet}
          wheelStatus={wheelOfLuck.isRetryingWheel ? null : wheelOfLuck.wheelStatus}
          statusFetchedAtMs={wheelOfLuck.wheelFetchedAtMs}
          isLoadingStatus={wheelOfLuck.isLoadingWheel}
          statusError={wheelOfLuck.wheelStatusError}
          onStatusUpdated={wheelOfLuck.handleStatusUpdated}
          onRefreshStatus={wheelOfLuck.refreshWheelStatus}
          onNavigateTab={handleNavigateTab}
        />
      )}

      {/* Persistent Android-Style Bottom Navigation for Staff (Hidden during full-screen mobile chat) */}
      {!isCustomer && !isMobileChatActive && (
        <StaffMobileNav
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          currentUser={currentUser}
        />
      )}

      {/* Mobile "More" Drawer / Bottom Sheet */}
      {showMobileMoreDrawer && isCustomer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseMoreDrawer}
          />
          <div className="relative w-full bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 z-10 space-y-4 pb-safe animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">More Services</h3>
              <button
                onClick={handleCloseMoreDrawer}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                onClick={() => {
                  setShowMobileMoreDrawer(false);
                  handleNavigateTab('game_accounts');
                }}
                className="p-3.5 rounded-xl bg-[#0A0F1D] border border-amber-500/20 text-left flex items-center gap-3 hover:border-amber-500/50 transition-colors"
              >
                <Gamepad2 className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Gaming IDs</div>
                  <div className="text-[10px] text-slate-400">Fixed games &amp; logins</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileMoreDrawer(false);
                  handleNavigateTab('referrals');
                }}
                className="p-3.5 rounded-xl bg-[#0A0F1D] border border-amber-500/20 text-left flex items-center gap-3 hover:border-amber-500/50 transition-colors"
              >
                <Gift className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Referrals</div>
                  <div className="text-[10px] text-slate-400">Invite friends &amp; earn bonuses</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileMoreDrawer(false);
                  handleNavigateTab('rules');
                }}
                className="p-3.5 rounded-xl bg-[#0A0F1D] border border-amber-500/20 text-left flex items-center gap-3 hover:border-amber-500/50 transition-colors"
              >
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Rules &amp; Policy</div>
                  <div className="text-[10px] text-slate-400">Disclosures &amp; refunds</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileMoreDrawer(false);
                  handleNavigateTab('profile');
                }}
                className="p-3.5 rounded-xl bg-[#0A0F1D] border border-amber-500/20 text-left flex items-center gap-3 hover:border-amber-500/50 transition-colors"
              >
                <User className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Profile &amp; 2FA</div>
                  <div className="text-[10px] text-slate-400">Security &amp; reset</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowMobileMoreDrawer(false);
                  handleNavigateTab('official_partners');
                }}
                className="p-3.5 min-h-[44px] rounded-xl bg-[#0A0F1D] border border-amber-500/20 text-left flex items-center gap-3 hover:border-amber-500/50 transition-colors col-span-2"
              >
                <MessageCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Official Partners</div>
                  <div className="text-[11px] text-slate-400">Message verified partner pages anytime</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </WheelAvailabilityProvider>
  );
}
