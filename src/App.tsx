import React, { useState, useEffect, useRef, Suspense } from 'react';
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
import { useWheelOfLuckStatus } from './hooks/useWheelOfLuckStatus';

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

  // Synchronize browser history and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentHash(hash);
      const clean = hash.replace(/^#\/?/, '').trim();
      if (clean && clean !== 'privacy' && clean !== 'data-deletion' && clean !== 'datadeletion' && clean !== activeTab) {
        setActiveTab(clean);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Synchronize browser popstate events (Back / Forward buttons & mobile swipe-back gestures)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentWindowHash = window.location.hash;
      setCurrentHash(currentWindowHash);

      if (currentWindowHash === '#privacy' || currentWindowHash === '#data-deletion' || currentWindowHash === '#datadeletion') {
        return;
      }

      const stateTab = event.state?.tab;
      const hashTab = currentWindowHash.replace(/^#\/?/, '').trim();
      const destinationTab = stateTab || (hashTab && hashTab !== 'privacy' ? hashTab : getDefaultTab(currentUser?.role));

      if (destinationTab) {
        if (tabHistoryRef.current.length > 1) {
          tabHistoryRef.current.pop();
        }
        setActiveTab(destinationTab);
        setTabMeta(null);
        if (destinationTab !== 'ops_chat') {
          setIsMobileChatActive(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser?.role]);

  // Ensure initial activeTab is properly recorded in history.state on mount
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      const stateTab = window.history.state?.tab;
      if (!stateTab || stateTab !== activeTab) {
        window.history.replaceState({ tab: activeTab }, '', `#${activeTab}`);
      }
    }
  }, [currentUser?.id, activeTab]);

  const [tabMeta, setTabMeta] = useState<any>(null);
  const [showMobileMoreDrawer, setShowMobileMoreDrawer] = useState(false);
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

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
            setBypassedHydrationUserId(null);
            void dataService.hydrateForSession(user);
            setTimeoutNotice(null);
            setSessionExpiredNotice(null);
            const defaultTab = getDefaultTab(user.role);
            setActiveTab(defaultTab);
            prefetchPagesForSession(user.role, defaultTab);
            window.history.replaceState({ tab: defaultTab }, '', `#${defaultTab}`);
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
    setBypassedHydrationUserId(null);
    switchUser(userId);
    const targetUser = dataService.getUserById(userId);
    if (targetUser) {
      setIsMobileChatActive(false);
      const defaultTab = getDefaultTab(targetUser.role);
      setActiveTab(defaultTab);
      prefetchPagesForSession(targetUser.role, defaultTab);
      window.history.replaceState({ tab: defaultTab }, '', `#${defaultTab}`);
      tabHistoryRef.current = [defaultTab];
    }
  };

  const handleNavigateTab = (
    tab: string,
    meta?: any,
    options?: { replace?: boolean; isBack?: boolean }
  ) => {
    if (tab === 'menu') {
      setShowMobileMoreDrawer(true);
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

    setTabMeta(meta || null);
    setActiveTab(targetTab);

    // Synchronize browser history and hash
    if (!options?.isBack && typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState({ tab: targetTab }, '', `#${targetTab}`);
        if (tabHistoryRef.current.length > 0) {
          tabHistoryRef.current[tabHistoryRef.current.length - 1] = targetTab;
        } else {
          tabHistoryRef.current.push(targetTab);
        }
      } else if (targetTab !== activeTab) {
        window.history.pushState({ tab: targetTab }, '', `#${targetTab}`);
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

  return (
    <>
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
            ? 'min-h-screen bg-[#0A0F1D] pb-36 sm:pb-28'
            : isStaffOpsChatTab
            ? isMobileChatActive
              ? 'h-viewport-dynamic bg-[#070D20] overflow-hidden pb-0'
              : 'h-viewport-dynamic bg-[#0A0F1D] overflow-hidden pb-[74px] md:pb-0'
            : 'min-h-screen bg-[#0A0F1D] pb-24 md:pb-12'
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

      {/* Persistent Android-Style Bottom Navigation & Sticky Wheel of Luck for Customer (Hidden during full-screen support chat) */}
      {isCustomer && !isCustomerChatOpen && (
        <CustomerMobileNav
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          currentUser={currentUser}
          wheelStickyState={wheelOfLuck.stickyWheelState}
          onOpenWheel={wheelOfLuck.openWheelModal}
        />
      )}

      {isCustomer && (
        <WheelOfLuckModal
          isOpen={wheelOfLuck.wheelModalOpen}
          onClose={wheelOfLuck.closeWheelModal}
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
            onClick={() => setShowMobileMoreDrawer(false)}
          />
          <div className="relative w-full bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 z-10 space-y-4 pb-safe animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">More Services</h3>
              <button
                onClick={() => setShowMobileMoreDrawer(false)}
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
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
