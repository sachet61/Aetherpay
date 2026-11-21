import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  User,
  ChevronDown,
} from 'lucide-react';
import { SwiftSweepsLogo } from '../common/SwiftSweepsLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { WheelGlyph } from '../customer/WheelGlyph';
import { CustomerMobileDrawer } from './CustomerMobileDrawer';
import { AdminMobileDrawer } from './AdminMobileDrawer';
import { AgentMobileDrawer } from './AgentMobileDrawer';
import { useWheelAvailability } from '../../hooks/useWheelAvailability';

interface TopNavbarProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onSwitchUser: (userId: string) => void;
  onLogout?: () => void;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  spinAvailable?: boolean;
  onOpenWheel?: () => void;
  onOverlayChange?: (isOpen: boolean) => void;
  isMobileDrawerOpen?: boolean;
  onOpenMobileDrawer?: () => void;
  onCloseMobileDrawer?: () => void;
  showNotifications?: boolean;
  onToggleNotifications?: () => void;
  onCloseNotifications?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentUser,
  wallet,
  onSwitchUser,
  onLogout,
  activeTab,
  onNavigateTab,
  spinAvailable,
  onOpenWheel,
  onOverlayChange,
  isMobileDrawerOpen: controlledMobileDrawerOpen,
  onOpenMobileDrawer,
  onCloseMobileDrawer,
  showNotifications: controlledShowNotifications,
  onToggleNotifications,
  onCloseNotifications,
}) => {
  const wheelContext = useWheelAvailability();
  const effectiveSpinAvailable = spinAvailable ?? wheelContext.spinAvailable;
  const effectiveOpenWheel = onOpenWheel ?? wheelContext.openWheelModal;
  const [internalShowNotifications, setInternalShowNotifications] = useState(false);
  const [internalIsMobileDrawerOpen, setInternalIsMobileDrawerOpen] = useState(false);
  const showNotifications = controlledShowNotifications ?? internalShowNotifications;
  const isMobileDrawerOpen = controlledMobileDrawerOpen ?? internalIsMobileDrawerOpen;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [, setStateTick] = useState(0);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const openMobileDrawer = useCallback(() => {
    if (onOpenMobileDrawer) {
      onOpenMobileDrawer();
    } else {
      setInternalIsMobileDrawerOpen(true);
    }
  }, [onOpenMobileDrawer]);

  const closeMobileDrawer = useCallback(() => {
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    } else {
      setInternalIsMobileDrawerOpen(false);
    }
  }, [onCloseMobileDrawer]);

  const toggleNotifications = useCallback(() => {
    if (onToggleNotifications) {
      onToggleNotifications();
    } else {
      setInternalShowNotifications((prev) => !prev);
    }
  }, [onToggleNotifications]);

  const closeNotifications = useCallback(() => {
    if (onCloseNotifications) {
      onCloseNotifications();
    } else {
      setInternalShowNotifications(false);
    }
  }, [onCloseNotifications]);

  useEffect(() => {
    onOverlayChange?.(showNotifications || isMobileDrawerOpen);
  }, [showNotifications, isMobileDrawerOpen, onOverlayChange]);

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
        if (showNotifications) closeNotifications();
        if (isMobileDrawerOpen) closeMobileDrawer();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, isMobileDrawerOpen, closeNotifications, closeMobileDrawer]);

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
    closeMobileDrawer();
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 xl:gap-4 px-3 sm:px-6 h-16">
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

            {(isAgent || isAdmin) && (
              <div className="hidden xl:block h-5 w-px bg-slate-800 shrink-0" aria-hidden="true" />
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
                  className={
                    activeTab === 'chat'
                      ? customerNavLinkClass(true)
                      : 'px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border bg-[#111A2E] border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 font-medium'
                  }
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
          <div className="flex items-center gap-2 shrink-0">
            {/* PWA App Install (keeps single Bell in navbar; push alerts live in Notifications drawer) */}
            <PWAInstallButton currentUser={currentUser} showPushButton={false} />

            {/* Permanent Wheel of Luck header button (Customers only, immediately left of Bell) */}
            {isCustomer && (
              <button
                type="button"
                onClick={effectiveOpenWheel}
                data-testid="header-wheel-button"
                aria-label={effectiveSpinAvailable ? 'Wheel of Luck, spin ready' : 'Wheel of Luck'}
                title={effectiveSpinAvailable ? 'Wheel of Luck, spin ready' : 'Wheel of Luck'}
                className={`relative flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-[#0E1726] border transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D] ${
                  effectiveSpinAvailable
                    ? 'border-amber-500/45 text-amber-300 hover:border-amber-400 hover:bg-[#131C2E]'
                    : 'border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <span className="relative inline-flex items-center justify-center w-5 h-5">
                  <WheelGlyph active={effectiveSpinAvailable} className="w-5 h-5" />
                  {effectiveSpinAvailable && (
                    <span
                      data-testid="header-wheel-dot"
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0E1726]"
                    />
                  )}
                </span>
              </button>
            )}

            {/* Notifications button */}
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-lg bg-[#0E1726] border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]"
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
              onClick={openMobileDrawer}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[#0E1726] border border-amber-500/30 text-amber-300 hover:text-white hover:border-amber-500/60 transition-colors active:scale-95 shrink-0"
              title="Navigation Menu"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Redesigned Customer Mobile Side Drawer */}
      {isCustomer && (
        <CustomerMobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={closeMobileDrawer}
          currentUser={currentUser}
          wallet={wallet}
          activeTab={activeTab}
          onNavigateTab={onNavigateTab}
          onLogout={onLogout}
          spinAvailable={effectiveSpinAvailable}
          onOpenWheel={effectiveOpenWheel}
        />
      )}

      {/* Redesigned Admin Mobile Side Drawer (Admin role only) */}
      {isAdmin && (
        <AdminMobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={closeMobileDrawer}
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigateTab={onNavigateTab}
          onLogout={onLogout}
        />
      )}

      {/* Redesigned Support Agent Mobile Side Drawer (Agent role only) */}
      {isAgent && (
        <AgentMobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={closeMobileDrawer}
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigateTab={onNavigateTab}
          onLogout={onLogout}
        />
      )}

      {/* Notifications Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeNotifications} />
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
                  onClick={closeNotifications}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
                  aria-label="Close notifications"
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
                      closeNotifications();
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
