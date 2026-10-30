import React, { useState, useEffect, useRef } from 'react';
import { useDataService } from './hooks/useDataService';
import { dataService } from './services/dataService';
import { authSessionService } from './services/authSessionService';
import { TopNavbar } from './components/layout/TopNavbar';
import { CustomerMobileNav } from './components/layout/CustomerMobileNav';
import { StaffMobileNav } from './components/layout/StaffMobileNav';
import { LegalContent } from './components/common/LegalContent';

// Auth & Guest Landing
import { AuthPage } from './pages/auth/AuthPage';
import { SessionTimeoutWarningModal } from './components/common/SessionTimeoutWarningModal';
import { StartupSplash } from './components/common/StartupSplash';
import { LiveCashoutTicker } from './components/common/LiveCashoutTicker';
import { GlobalChatNotificationManager } from './components/common/GlobalChatNotificationManager';
import { BackgroundNotificationPrompt } from './components/common/BackgroundNotificationPrompt';


// Customer Pages
import { CustomerHome } from './pages/customer/CustomerHome';
import { CustomerWallet } from './pages/customer/CustomerWallet';
import { CustomerTopUp } from './pages/customer/CustomerTopUp';
import { CustomerWithdrawal } from './pages/customer/CustomerWithdrawal';
import { CustomerGameAccounts } from './pages/customer/CustomerGameAccounts';
import { CustomerChat } from './pages/customer/CustomerChat';
import { CustomerReferrals } from './pages/customer/CustomerReferrals';
import { CustomerRules } from './pages/customer/CustomerRules';
import { CustomerProfile } from './pages/customer/CustomerProfile';
import { EmailVerificationBanner } from './components/common/EmailVerificationBanner';

// Staff / Operations Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRequests } from './pages/admin/AdminRequests';
import { AdminChat } from './pages/admin/AdminChat';
import { AdminGameCatalog } from './pages/admin/AdminGameCatalog';
import { AdminGameCredentials } from './pages/admin/AdminGameCredentials';
import { AdminConfig } from './pages/admin/AdminConfig';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminUsers } from './pages/admin/AdminUsers';

import {
  Gamepad2,
  Gift,
  FileText,
  User,
  X,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  const { currentUser, wallet, switchUser, logout } = useDataService();

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

  const handleLogout = (reason?: string) => {
    logout();
    if (reason === 'inactivity') {
      setTimeoutNotice('Your session has timed out due to 15 minutes of inactivity. Please enter your credentials to resume.');
    } else {
      setTimeoutNotice(null);
    }
  };

  // Sync tab when user changes (e.g. login/switch)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'customer' && activeTab.startsWith('ops_')) {
        setActiveTab('dashboard');
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      } else if (currentUser.role !== 'customer' && !activeTab.startsWith('ops_')) {
        const next = currentUser.role === 'agent' ? 'ops_chat' : 'ops_dashboard';
        setActiveTab(next);
        window.history.replaceState({ tab: next }, '', `#${next}`);
      }
    }
  }, [currentUser?.id, currentUser?.role]);

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
        <StartupSplash />
        <AuthPage
          key="auth"
          onLoginSuccess={(user) => {
            setTimeoutNotice(null);
            const defaultTab = getDefaultTab(user.role);
            setActiveTab(defaultTab);
            window.history.replaceState({ tab: defaultTab }, '', `#${defaultTab}`);
            tabHistoryRef.current = [defaultTab];
          }}
          timeoutNotice={timeoutNotice}
        />
      </>
    );
  }

  const activeWallet = wallet || dataService.getWallet(currentUser.id);

  const handleSwitchUser = (userId: string) => {
    switchUser(userId);
    const targetUser = dataService.getUserById(userId);
    if (targetUser) {
      setIsMobileChatActive(false);
      const defaultTab = getDefaultTab(targetUser.role);
      setActiveTab(defaultTab);
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

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      {/* Branded Startup Loading Screen with Logo Glow & Animated Progress Bar */}
      <StartupSplash />

      <div
        className={`min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 ${
          isCustomer
            ? 'pb-32 sm:pb-28'
            : isMobileChatActive
            ? 'pb-0'
            : 'pb-24 md:pb-12'
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

        {/* Top Navbar with strict role-based views (No staff/customer mode toggle) */}
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

        {/* Messenger-Style High-Priority Background Push Alert Prompt (Android & iOS PWA) */}
        <BackgroundNotificationPrompt currentUser={currentUser} />

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto">
          {/* Prominent Email Verification Banner for Unverified Customers */}
          {isCustomer && (
            <EmailVerificationBanner
              currentUser={currentUser}
              onStatusChanged={(verified) => {
                const updated = { ...currentUser, emailVerified: verified };
                dataService.registerUser(updated);
                authSessionService.updateUserProfile(updated);
                window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
              }}
            />
          )}

        {/* CUSTOMER PORTAL VIEWS */}
        {isCustomer && (
          <>
            {activeTab === 'dashboard' && (
              <CustomerHome
                currentUser={currentUser}
                wallet={activeWallet}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'wallet' && (
              <CustomerWallet
                currentUser={currentUser}
                wallet={activeWallet}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'topup' && (
              <CustomerTopUp
                currentUser={currentUser}
                wallet={activeWallet}
                onNavigateTab={handleNavigateTab}
                prefilledAmount={tabMeta?.prefilledAmount}
                preselectedGameCatalogId={tabMeta?.gameCatalogId}
              />
            )}

            {activeTab === 'withdrawal' && (
              <CustomerWithdrawal
                currentUser={currentUser}
                wallet={activeWallet}
                onNavigateTab={handleNavigateTab}
                prefilledAmount={tabMeta?.prefilledAmount}
                preselectedGameCatalogId={tabMeta?.gameCatalogId}
              />
            )}

            {activeTab === 'game_accounts' && (
              <CustomerGameAccounts
                currentUser={currentUser}
                wallet={activeWallet}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'chat' && (
              <CustomerChat
                currentUser={currentUser}
                onNavigateTab={handleNavigateTab}
                onGoBack={handleGoBack}
              />
            )}

            {activeTab === 'referrals' && (
              <CustomerReferrals
                currentUser={currentUser}
                wallet={activeWallet}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'rules' && (
              <CustomerRules onNavigateTab={handleNavigateTab} />
            )}

            {activeTab === 'privacy' && (
              <LegalContent initialTab="privacy" onBack={handleGoBack} />
            )}

            {activeTab === 'data_deletion' && (
              <LegalContent initialTab="deletion" onBack={handleGoBack} />
            )}

            {activeTab === 'profile' && (
              <CustomerProfile
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
              <AdminDashboard
                currentUser={currentUser}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {/* Master Game Catalog - Handled by Admin Account */}
            {activeTab === 'ops_game_catalog' && (
              <AdminGameCatalog currentUser={currentUser} />
            )}

            {/* Player Game IDs & Passwords - Handled by Customer Support & Admin */}
            {activeTab === 'ops_game_credentials' && (
              <AdminGameCredentials currentUser={currentUser} />
            )}

            {/* Requests Queue */}
            {activeTab === 'ops_requests' && (
              <AdminRequests
                currentUser={currentUser}
                initialFilter={tabMeta?.filter}
                highlightId={tabMeta?.highlight}
              />
            )}

            {/* Customer Support Inbox */}
            {activeTab === 'ops_chat' && (
              <AdminChat
                currentUser={currentUser}
                onNavigateTab={handleNavigateTab}
                onGoBack={handleGoBack}
                highlightConvId={tabMeta?.highlightConvId}
                onActiveChatChange={(isOpen) => setIsMobileChatActive(isOpen)}
              />
            )}

            {/* User Directory & Staff Governance */}
            {activeTab === 'ops_users' && (
              <AdminUsers
                currentUser={currentUser}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {/* Admin Exclusive: Fees & Bonuses */}
            {activeTab === 'ops_config' && (
              isAdmin ? (
                <AdminConfig currentUser={currentUser} />
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
                <AdminAudit currentUser={currentUser} />
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
      </main>

      {/* Persistent Android-Style Bottom Navigation for Customer */}
      {isCustomer && (
        <CustomerMobileNav
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          currentUser={currentUser}
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
                  <div className="text-[10px] text-slate-400">Earn $25 cash rewards</div>
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
