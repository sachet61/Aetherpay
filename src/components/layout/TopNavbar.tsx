import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { dataService } from '../../services/dataService';
import {
  Bell,
  Wallet,
  Check,
  X,
  LogOut,
  Shield,
  Headphones,
  Gamepad2,
  Settings,
  Users,
  Menu,
  LayoutDashboard,
  MessageSquare,
  KeyRound,
  Inbox,
  ArrowDownToLine,
  ArrowUpFromLine,
  User,
  Gift,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { SwiftSweepsLogo } from '../common/SwiftSweepsLogo';
import { RealtimeSyncBadge } from '../common/RealtimeSyncBadge';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface TopNavbarProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onSwitchUser: (userId: string) => void;
  onLogout?: () => void;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentUser,
  wallet,
  onSwitchUser,
  onLogout,
  activeTab,
  onNavigateTab,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [, setStateTick] = useState(0);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSync = () => setStateTick((prev) => prev + 1);
    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMoreMenu(false);
        setShowNotifications(false);
        setIsMobileDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const notifications = dataService.getNotifications(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isCustomer = currentUser.role === 'customer';
  const isAgent = currentUser.role === 'agent';
  const isAdmin = currentUser.role === 'admin';

  // Customer unread chat messages
  const customerConv = isCustomer
    ? dataService.getConversations().find((c) => c.customerId === currentUser.id)
    : null;
  const unreadCustomerMessages = customerConv?.unreadCountCustomer || 0;

  // Real-time badge indicators for operations
  const unreadStaffMessages = !isCustomer
    ? dataService.getConversations().reduce((sum, c) => sum + c.unreadCountStaff, 0)
    : 0;

  const pendingGameRequests = !isCustomer
    ? dataService.getPendingGameRequests().length
    : 0;

  const pendingOpsRequests = !isCustomer
    ? dataService.getTopUpRequests().filter((t) => t.status === 'submitted' || t.status === 'verifying').length +
      dataService.getWithdrawalRequests().filter((w) => w.status === 'submitted' || w.status === 'processing').length
    : 0;

  const handleMarkAllRead = () => {
    dataService.markAllNotificationsAsRead(currentUser.id);
  };

  const getPortalHomeTab = () => {
    if (isCustomer) return 'dashboard';
    if (isAgent) return 'ops_chat';
    return 'ops_dashboard';
  };

  const handleDrawerNavigate = (tab: string) => {
    setIsMobileDrawerOpen(false);
    setShowMoreMenu(false);
    onNavigateTab(tab);
  };

  const handleDesktopNavigate = (tab: string) => {
    setShowMoreMenu(false);
    onNavigateTab(tab);
  };

  const isAdminSecondaryActive =
    activeTab === 'ops_game_catalog' ||
    activeTab === 'ops_config' ||
    activeTab === 'ops_audit';

  const staffNavLinkClass = (isActive: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
      isActive
        ? 'bg-indigo-500/15 text-white border-indigo-500/40 font-semibold'
        : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/60 font-medium'
    }`;

  const customerNavLinkClass = (isActive: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
      isActive
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 font-semibold'
        : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/60 font-medium'
    }`;

  return (
    <>
      <header className="relative z-50 bg-[#0A0F1D]/95 backdrop-blur-md border-b border-slate-800/80 max-w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 xl:gap-6 px-3 sm:px-6 h-16">
          {/* Zone 1: Brand Identity & Portal Role Context */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => handleDesktopNavigate(getPortalHomeTab())}
              className="transition-transform active:scale-95 text-left shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
              aria-label="Swift Sweeps Home"
            >
              <SwiftSweepsLogo size="sm" />
            </button>

            <div className="hidden xl:block h-5 w-px bg-slate-800 shrink-0" aria-hidden="true" />

            {isCustomer && (
              <span className="hidden xl:inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#131C2E] text-amber-300 border border-amber-500/25 whitespace-nowrap shrink-0">
                Player Portal
              </span>
            )}

            {isAgent && (
              <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 whitespace-nowrap shrink-0">
                <Headphones className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Support Console</span>
              </span>
            )}

            {isAdmin && (
              <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-950/50 text-amber-300 border border-amber-700/40 whitespace-nowrap shrink-0">
                <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Admin</span>
              </span>
            )}

            <div className="hidden xl:inline-flex shrink-0">
              <RealtimeSyncBadge />
            </div>
          </div>

          {/* Zone 2: Primary Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center justify-center gap-1 min-w-0 flex-1"
          >
            {/* CUSTOMER NAVIGATION */}
            {isCustomer && (
              <>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('dashboard')}
                  className={customerNavLinkClass(activeTab === 'dashboard')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('wallet')}
                  className={customerNavLinkClass(activeTab === 'wallet')}
                >
                  <span className="xl:hidden">Wallet</span>
                  <span className="hidden xl:inline">Wallet &amp; Ledger</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('topup')}
                  className={customerNavLinkClass(activeTab === 'topup')}
                >
                  Top-Up
                </button>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('withdrawal')}
                  className={customerNavLinkClass(activeTab === 'withdrawal')}
                >
                  Cashout
                </button>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('game_accounts')}
                  className={customerNavLinkClass(activeTab === 'game_accounts')}
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Gaming IDs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('chat')}
                  className={customerNavLinkClass(activeTab === 'chat')}
                >
                  <span>Support Chat</span>
                  {unreadCustomerMessages > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                      {unreadCustomerMessages}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* CUSTOMER SUPPORT STAFF NAVIGATION */}
            {isAgent && (
              <>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_chat')}
                  className={staffNavLinkClass(activeTab === 'ops_chat')}
                >
                  <span>Support Inbox</span>
                  {unreadStaffMessages > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 tabular-nums flex items-center justify-center">
                      {unreadStaffMessages}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_game_credentials')}
                  className={staffNavLinkClass(activeTab === 'ops_game_credentials')}
                  title="Assign and manage player Game IDs & Passwords"
                >
                  <span>Game IDs</span>
                  {pendingGameRequests > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 tabular-nums flex items-center justify-center">
                      {pendingGameRequests}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_requests')}
                  className={staffNavLinkClass(activeTab === 'ops_requests')}
                  title="Deposit & Cashout Requests Queue"
                >
                  <span>Requests</span>
                  {pendingOpsRequests > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-indigo-500 text-[10px] font-bold text-white tabular-nums flex items-center justify-center">
                      {pendingOpsRequests}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_users')}
                  className={staffNavLinkClass(activeTab === 'ops_users')}
                  title="View customer profiles, game accounts & details (Agent read-only)"
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>User Directory</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_dashboard')}
                  className={staffNavLinkClass(activeTab === 'ops_dashboard')}
                >
                  Overview
                </button>
              </>
            )}

            {/* ADMINISTRATOR NAVIGATION */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_dashboard')}
                  className={staffNavLinkClass(activeTab === 'ops_dashboard')}
                >
                  Overview
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_requests')}
                  className={staffNavLinkClass(activeTab === 'ops_requests')}
                >
                  <span>Requests</span>
                  {pendingOpsRequests > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-indigo-500 text-[10px] font-bold text-white tabular-nums flex items-center justify-center">
                      {pendingOpsRequests}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_chat')}
                  className={staffNavLinkClass(activeTab === 'ops_chat')}
                >
                  <span>Support Inbox</span>
                  {unreadStaffMessages > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 tabular-nums flex items-center justify-center">
                      {unreadStaffMessages}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_game_credentials')}
                  className={staffNavLinkClass(activeTab === 'ops_game_credentials')}
                >
                  <span>Game IDs</span>
                  {pendingGameRequests > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 tabular-nums flex items-center justify-center">
                      {pendingGameRequests}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDesktopNavigate('ops_users')}
                  className={`${staffNavLinkClass(activeTab === 'ops_users')} hidden xl:inline-flex`}
                  title="Manage users, view profiles, and govern staff roles"
                >
                  <span>Users &amp; Roles</span>
                </button>

                {/* Compact "More" Menu for Secondary Admin Links */}
                <div className="relative shrink-0" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu((prev) => !prev)}
                    aria-expanded={showMoreMenu}
                    aria-haspopup="menu"
                    className={
                      isAdminSecondaryActive
                        ? staffNavLinkClass(true)
                        : activeTab === 'ops_users'
                        ? 'px-2.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border bg-indigo-500/15 text-white border-indigo-500/40 font-semibold xl:bg-transparent xl:text-slate-300 xl:border-transparent xl:font-medium xl:hover:text-white xl:hover:bg-slate-800/60'
                        : staffNavLinkClass(false)
                    }
                  >
                    <span>More</span>
                    {(isAdminSecondaryActive || activeTab === 'ops_users') && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 ${
                          activeTab === 'ops_users' ? 'xl:hidden' : ''
                        }`}
                      />
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
                        showMoreMenu ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </button>

                  {showMoreMenu && (
                    <div
                      role="menu"
                      aria-label="More Admin Sections"
                      className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0E1726] border border-slate-700/80 shadow-2xl p-1.5 z-[70] space-y-0.5"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDesktopNavigate('ops_users')}
                        className={`xl:hidden w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors border ${
                          activeTab === 'ops_users'
                            ? 'bg-indigo-500/15 text-white border-indigo-500/35'
                            : 'text-slate-200 border-transparent hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">Users &amp; Roles</div>
                            <div className="text-[11px] text-slate-400 truncate">Accounts &amp; staff permissions</div>
                          </div>
                        </div>
                        {activeTab === 'ops_users' && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDesktopNavigate('ops_game_catalog')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors border ${
                          activeTab === 'ops_game_catalog'
                            ? 'bg-indigo-500/15 text-white border-indigo-500/35'
                            : 'text-slate-200 border-transparent hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">Game Catalog</div>
                            <div className="text-[11px] text-slate-400 truncate">Games visible to players</div>
                          </div>
                        </div>
                        {activeTab === 'ops_game_catalog' && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDesktopNavigate('ops_config')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors border ${
                          activeTab === 'ops_config'
                            ? 'bg-indigo-500/15 text-white border-indigo-500/35'
                            : 'text-slate-200 border-transparent hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Settings className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">Fees &amp; Bonuses</div>
                            <div className="text-[11px] text-slate-400 truncate">Rates, rewards &amp; gateways</div>
                          </div>
                        </div>
                        {activeTab === 'ops_config' && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDesktopNavigate('ops_audit')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors border ${
                          activeTab === 'ops_audit'
                            ? 'bg-indigo-500/15 text-white border-indigo-500/35'
                            : 'text-slate-200 border-transparent hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">Audit Logs</div>
                            <div className="text-[11px] text-slate-400 truncate">Security &amp; admin activity</div>
                          </div>
                        </div>
                        {activeTab === 'ops_audit' && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Zone 3: Notifications, Account Controls & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isCustomer && (
              <button
                type="button"
                onClick={() => handleDesktopNavigate('topup')}
                className="cursor-pointer hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1726] border border-amber-500/20 hover:border-amber-500/40 transition-colors"
                title="Latest amount loaded directly to your registered game account"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Latest Top-Up</div>
                  <div className="text-xs font-bold text-amber-400 font-mono tabular-nums">
                    ${(wallet.lastTopUpAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </button>
            )}

            {/* PWA App Install (keeps single Bell in navbar; push alerts live in Notifications drawer) */}
            <PWAInstallButton currentUser={currentUser} showPushButton={false} />

            {/* Notifications button */}
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#0E1726] border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white transition-colors shrink-0"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-amber-400/90" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px] tabular-nums flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block h-5 w-px bg-slate-800/90 mx-0.5 shrink-0" aria-hidden="true" />

            {/* User Account Details & Navigation */}
            <div className="hidden sm:block shrink-0">
              <RoleSwitcher
                currentUser={currentUser}
                wallet={wallet}
                onSwitchUser={onSwitchUser}
                onLogout={onLogout}
                onNavigateTab={onNavigateTab}
              />
            </div>

            {/* Sign Out Action Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg bg-[#0E1726] border border-slate-800 hover:border-rose-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                title="Sign Out of Session"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Hamburger Menu Button (Mobile & Tablet below lg) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[#0E1726] border border-amber-500/30 text-amber-300 hover:text-white hover:border-amber-500/60 transition-colors active:scale-95 shrink-0"
              title="Navigation Menu"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Side Drawer (Available on mobile & tablet) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="relative w-full max-w-[300px] sm:max-w-xs bg-[#0A0F1D] border-l border-amber-500/20 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80 bg-[#0E1726]/60">
              <SwiftSweepsLogo size="sm" />
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Summary Card */}
            <div className="p-3.5 mx-3 mt-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs overflow-hidden shrink-0">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{currentUser.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[130px] font-mono">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    Admin
                  </span>
                )}
                {isAgent && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Support
                  </span>
                )}
                {isCustomer && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Player
                  </span>
                )}
              </div>

              {isCustomer && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Wallet Balance:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${wallet.availableBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Sign Out Action (Immediately visible without scrolling) */}
            {onLogout && (
              <div className="px-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 transition-colors cursor-pointer shadow-sm"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Navigation Items (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {isAdmin && (
                <>
                  <div className="px-2 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Admin Management
                  </div>

                  <button
                    onClick={() => handleDrawerNavigate('ops_dashboard')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_dashboard' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Overview Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_users')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_users' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Users &amp; Roles</span>
                  </button>

                  {/* Fees & Bonuses Link placed below Users & Roles */}
                  <button
                    onClick={() => handleDrawerNavigate('ops_config')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'ops_config'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>Fees &amp; Bonuses</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50">
                      Config
                    </span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_game_catalog')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_game_catalog' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    <span>Game Catalog</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_game_credentials')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_game_credentials' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="w-4 h-4" />
                      <span>Game IDs &amp; Credentials</span>
                    </div>
                    {pendingGameRequests > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-600 text-[10px] font-bold text-white flex items-center justify-center">
                        {pendingGameRequests}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_requests')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_requests' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Inbox className="w-4 h-4" />
                      <span>Requests Queue</span>
                    </div>
                    {pendingOpsRequests > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-400 border border-amber-700/50">
                        {pendingOpsRequests}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_chat')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_chat' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>Support Live Inbox</span>
                    </div>
                    {unreadStaffMessages > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 flex items-center justify-center">
                        {unreadStaffMessages}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_audit')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_audit' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Security Audit Logs</span>
                  </button>
                </>
              )}

              {/* AGENT NAVIGATION */}
              {isAgent && (
                <>
                  <div className="px-2 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Support Operations
                  </div>

                  <button
                    onClick={() => handleDrawerNavigate('ops_chat')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_chat' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span>Support Live Inbox</span>
                    </div>
                    {unreadStaffMessages > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 flex items-center justify-center">
                        {unreadStaffMessages}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_game_credentials')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_game_credentials' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="w-4 h-4" />
                      <span>Game IDs &amp; Passwords</span>
                    </div>
                    {pendingGameRequests > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-600 text-[10px] font-bold text-white flex items-center justify-center">
                        {pendingGameRequests}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_requests')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_requests' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Inbox className="w-4 h-4" />
                      <span>Requests Queue</span>
                    </div>
                    {pendingOpsRequests > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-400 border border-amber-700/50">
                        {pendingOpsRequests}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_users')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_users' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>User Directory</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('ops_dashboard')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'ops_dashboard' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Overview Dashboard</span>
                  </button>
                </>
              )}

              {/* CUSTOMER NAVIGATION */}
              {isCustomer && (
                <>
                  <div className="px-2 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Player Portal
                  </div>

                  <button
                    onClick={() => handleDrawerNavigate('dashboard')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'dashboard' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    <span>Home Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('wallet')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'wallet' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Wallet &amp; Ledger</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('topup')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'topup' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <ArrowDownToLine className="w-4 h-4 text-amber-400" />
                    <span>Instant Top-Up</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('withdrawal')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'withdrawal' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <ArrowUpFromLine className="w-4 h-4 text-indigo-400" />
                    <span>Request Cashout</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('game_accounts')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'game_accounts' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    <span>Gaming IDs &amp; Pins</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('chat')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'chat' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Headphones className="w-4 h-4 text-cyan-400" />
                      <span>Live Support Chat</span>
                    </div>
                    {unreadCustomerMessages > 0 && (
                      <span className="min-w-4 h-4 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                        {unreadCustomerMessages}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('profile')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'profile' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Account Profile</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('referrals')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'referrals' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Gift className="w-4 h-4 text-pink-400" />
                    <span>Referrals &amp; Rewards</span>
                  </button>

                  <button
                    onClick={() => handleDrawerNavigate('rules')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeTab === 'rules' ? 'bg-amber-500/15 text-amber-400 font-bold' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Sweepstakes Rules</span>
                  </button>
                </>
              )}
            </div>


          </aside>
        </div>
      )}

      {/* Notifications Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-4 flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-3">
              <PWAInstallButton currentUser={currentUser} className="w-full justify-start" />
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No notifications yet.</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      dataService.markNotificationAsRead(notif.id);
                      if (notif.linkTab) onNavigateTab(notif.linkTab);
                      setShowNotifications(false);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      notif.isRead
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                        : 'bg-slate-800/60 border-indigo-700/50 hover:border-indigo-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-white">{notif.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
