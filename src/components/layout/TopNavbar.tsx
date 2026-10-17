import React, { useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { dataService } from '../../services/dataService';
import { Bell, Wallet, CheckCircle2, X, LogOut, Shield, Headphones, Gamepad2, Settings, Users } from 'lucide-react';
import { SwiftSweepsLogo } from '../common/SwiftSweepsLogo';

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
  const notifications = dataService.getNotifications(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isCustomer = currentUser.role === 'customer';
  const isAgent = currentUser.role === 'agent';
  const isAdmin = currentUser.role === 'admin';

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

  return (
    <>


      <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-4 sm:px-6 py-3.5 bg-[#0A0F1D]/95 backdrop-blur-md border-b border-amber-500/15">
        {/* Zone 1: Wordmark & Role-Enforced Portal Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateTab(getPortalHomeTab())}
            className="transition-transform active:scale-95 text-left"
            aria-label="Swift Sweeps Home"
          >
            <SwiftSweepsLogo size="sm" />
          </button>

          {/* Strict Role Indicator */}
          {isCustomer && (
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[#131C2E] text-amber-300 border border-amber-500/20 font-semibold">
              Player Portal
            </span>
          )}

          {isAgent && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-semibold">
              <Headphones className="w-3 h-3 text-cyan-400" />
              <span>Customer Support Console</span>
            </span>
          )}

          {isAdmin && (
            <>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-semibold">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Administration Console</span>
              </span>

              {/* Mobile Quick Fees & Bonuses Button */}
              <button
                onClick={() => onNavigateTab('ops_config')}
                className={`md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                  activeTab === 'ops_config'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
                }`}
                title="Fees, Bonuses & Payment Gateway Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[11px]">Fees &amp; Bonuses</span>
              </button>
            </>
          )}
        </div>

        {/* Zone 2: Navigation Links Strict by Role (No mode flipping) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-400">
          {/* CUSTOMER NAVIGATION */}
          {isCustomer && (
            <>
              <button
                onClick={() => onNavigateTab('dashboard')}
                className={`transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigateTab('wallet')}
                className={`transition-colors whitespace-nowrap ${activeTab === 'wallet' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Wallet &amp; Ledger
              </button>
              <button
                onClick={() => onNavigateTab('topup')}
                className={`transition-colors whitespace-nowrap ${activeTab === 'topup' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Top-Up
              </button>
              <button
                onClick={() => onNavigateTab('withdrawal')}
                className={`transition-colors whitespace-nowrap ${activeTab === 'withdrawal' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Cashout
              </button>
              <button
                onClick={() => onNavigateTab('game_accounts')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'game_accounts' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Gaming IDs</span>
              </button>
              <button
                onClick={() => onNavigateTab('chat')}
                className={`transition-colors whitespace-nowrap ${activeTab === 'chat' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Support Chat
              </button>
            </>
          )}

          {/* CUSTOMER SUPPORT STAFF NAVIGATION */}
          {isAgent && (
            <>
              <button
                onClick={() => onNavigateTab('ops_chat')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ops_chat' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                <span>Support Inbox</span>
                {unreadStaffMessages > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 flex items-center justify-center">
                    {unreadStaffMessages}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigateTab('ops_game_credentials')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ops_game_credentials' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                <span>Game IDs &amp; Passwords</span>
                {pendingGameRequests > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-[10px] font-bold text-white">
                    {pendingGameRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigateTab('ops_requests')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ops_requests' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                <span>Requests Queue</span>
                {pendingOpsRequests > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-bold text-amber-400 border border-amber-700/50">
                    {pendingOpsRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigateTab('ops_dashboard')}
                className={`transition-colors whitespace-nowrap ${
                  activeTab === 'ops_dashboard' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                Overview
              </button>
            </>
          )}

          {/* ADMINISTRATOR NAVIGATION (HIGHER ACCESS) */}
          {isAdmin && (
            <>
              <button
                onClick={() => onNavigateTab('ops_dashboard')}
                className={`transition-colors whitespace-nowrap ${
                  activeTab === 'ops_dashboard' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                Overview
              </button>

              <button
                onClick={() => onNavigateTab('ops_game_catalog')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'ops_game_catalog' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
                title="Master catalog of games shown to players (Admin exclusive)"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Game Catalog</span>
              </button>

              <button
                onClick={() => onNavigateTab('ops_game_credentials')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ops_game_credentials' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                <span>Game IDs</span>
                {pendingGameRequests > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-600 text-[10px] font-bold text-white flex items-center justify-center">
                    {pendingGameRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigateTab('ops_requests')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ops_requests' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                <span>Requests</span>
                {pendingOpsRequests > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-bold text-amber-400 border border-amber-700/50">
                    {pendingOpsRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigateTab('ops_chat')}
                className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ops_chat' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                <span>Support Inbox</span>
                {unreadStaffMessages > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 flex items-center justify-center">
                    {unreadStaffMessages}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigateTab('ops_config')}
                className={`transition-colors whitespace-nowrap ${
                  activeTab === 'ops_config' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
                title="Fees, bonus rules & platform settings (Admin exclusive)"
              >
                Fees &amp; Bonuses
              </button>

              <button
                onClick={() => onNavigateTab('ops_audit')}
                className={`transition-colors whitespace-nowrap ${
                  activeTab === 'ops_audit' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
                }`}
                title="System-wide security audit logs (Admin exclusive)"
              >
                Audit Logs
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Balance (if customer), Notifications, Account Switcher & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {isCustomer && (
            <div
              onClick={() => onNavigateTab('topup')}
              className="cursor-pointer hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1726] border border-amber-500/20 hover:border-amber-500/40 transition-colors"
              title="Latest amount loaded directly to your registered game account"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Latest Top-Up</div>
                <div className="text-xs font-bold text-amber-400 font-mono tabular-nums">
                  ${(wallet.lastTopUpAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Notifications button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg bg-[#0E1726] border border-amber-500/20 text-slate-300 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-amber-400/80" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black rounded-full text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User Account / Demo Profile Switcher */}
          <RoleSwitcher currentUser={currentUser} onSwitchUser={onSwitchUser} onLogout={onLogout} />

          {/* Explicit Sign Out Action Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
              title="Sign Out of Session"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

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
