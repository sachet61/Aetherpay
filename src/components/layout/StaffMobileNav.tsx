import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  ArrowDownToLine,
  KeyRound,
  Users,
  Search,
  X,
  ArrowRight,
  Shield,
  Wallet,
  Settings,
  Gamepad2,
  FileText,
  Percent,
  Sliders,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';

interface StaffMobileNavProps {
  activeTab: string;
  onNavigateTab: (tab: string, meta?: any) => void;
  currentUser: UserProfile;
}

export const StaffMobileNav: React.FC<StaffMobileNavProps> = ({
  activeTab,
  onNavigateTab,
  currentUser,
}) => {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalTab, setModalTab] = useState<'tools' | 'players'>('tools');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser.role === 'admin';

  // Live real-time counters
  const unreadMessagesCount = dataService
    .getConversations()
    .reduce((sum, c) => sum + c.unreadCountStaff, 0);

  const pendingGameRequestsCount = dataService.getPendingGameRequests().length;

  const pendingOpsRequestsCount =
    dataService
      .getTopUpRequests()
      .filter((t) => t.status === 'submitted' || t.status === 'verifying').length +
    dataService
      .getWithdrawalRequests()
      .filter((w) => w.status === 'submitted' || w.status === 'processing').length;

  const customers = dataService.getUsers().filter((u) => u.role === 'customer');

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const handleOpenCustomerChat = (cust: UserProfile) => {
    const conv = dataService.getOrCreateConversationForCustomer(cust.id, cust.displayName);
    setShowAdminModal(false);
    onNavigateTab('ops_chat', { highlightConvId: conv.id });
  };

  const handleNavigateAdmin = (tab: string) => {
    setShowAdminModal(false);
    onNavigateTab(tab);
  };

  const isAdminActive = ['ops_config', 'ops_game_catalog', 'ops_audit'].includes(activeTab);

  return (
    <>
      {/* Fixed Bottom Tab Bar for Staff */}
      <nav
        aria-label="Staff mobile navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0F1D]/95 backdrop-blur-md border-t border-amber-500/20 md:hidden pb-safe shadow-2xl"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-center">
          {/* 1. Dashboard Overview */}
          <button
            onClick={() => onNavigateTab('ops_dashboard')}
            className={`flex flex-col items-center justify-center h-full min-w-[44px] min-h-[44px] transition-colors ${
              activeTab === 'ops_dashboard'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-1" />
            <span className="text-[10px] tracking-tight">Overview</span>
          </button>

          {/* 2. Requests Queue */}
          <button
            onClick={() => onNavigateTab('ops_requests')}
            className={`relative flex flex-col items-center justify-center h-full min-w-[44px] min-h-[44px] transition-colors ${
              activeTab === 'ops_requests'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ArrowDownToLine className="w-5 h-5 mb-1" />
              {pendingOpsRequestsCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-sm">
                  {pendingOpsRequestsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Requests</span>
          </button>

          {/* 3. Support Chats (Center Hero Icon) */}
          <button
            onClick={() => onNavigateTab('ops_chat')}
            className="flex flex-col items-center justify-center h-full min-w-[44px] min-h-[44px] transition-colors group"
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center -mt-4 shadow-lg transition-transform active:scale-95 relative ${
                activeTab === 'ops_chat'
                  ? 'bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 text-slate-950 shadow-amber-500/30'
                  : 'bg-[#0E1726] border border-amber-500/30 text-amber-200 hover:border-amber-400'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center ring-2 ring-slate-950">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-1 ${
                activeTab === 'ops_chat'
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400'
              }`}
            >
              Chats
            </span>
          </button>

          {/* 4. Game IDs Desk */}
          <button
            onClick={() => onNavigateTab('ops_game_credentials')}
            className={`relative flex flex-col items-center justify-center h-full min-w-[44px] min-h-[44px] transition-colors ${
              activeTab === 'ops_game_credentials'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <KeyRound className="w-5 h-5 mb-1" />
              {pendingGameRequestsCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-sm">
                  {pendingGameRequestsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Game IDs</span>
          </button>

          {/* 5. Admin & Tools Menu (Shows Admin Tools if Admin, else Players directory) */}
          <button
            onClick={() => {
              setModalTab(isAdmin ? 'tools' : 'players');
              setShowAdminModal(true);
            }}
            className={`flex flex-col items-center justify-center h-full min-w-[44px] min-h-[44px] transition-colors ${
              isAdminActive
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAdmin ? (
              <Settings className="w-5 h-5 mb-1" />
            ) : (
              <Users className="w-5 h-5 mb-1" />
            )}
            <span className="text-[10px] tracking-tight">
              {isAdmin ? 'Admin Tools' : 'Players'}
            </span>
          </button>
        </div>
      </nav>

      {/* Admin Tools & Player Directory Bottom Sheet */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowAdminModal(false)}
          />
          <div className="relative w-full max-h-[88vh] bg-[#0E1726] border-t border-amber-500/20 rounded-t-3xl p-5 z-10 flex flex-col space-y-3 pb-safe animate-in slide-in-from-bottom duration-200 shadow-2xl">
            {/* Grab handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-1" />

            {/* Header & Mode Switcher */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 p-1 bg-[#0A0F1D] border border-slate-800 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setModalTab('tools')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        modalTab === 'tools'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Admin Settings
                    </button>
                    <button
                      onClick={() => setModalTab('players')}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        modalTab === 'players'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Players ({customers.length})
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Player Directory</h3>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: ADMIN TOOLS (FEES, BONUSES, GAME CATALOG, AUDIT) */}
            {modalTab === 'tools' && isAdmin && (
              <div className="flex-1 overflow-y-auto space-y-2.5 py-1 max-h-[56vh]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 px-1">
                  Platform Administration Controls
                </div>

                {/* 1. Fees & Bonuses Settings */}
                <div
                  onClick={() => handleNavigateAdmin('ops_config')}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 active:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <span>Fees, Bonuses &amp; Gateways</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950">
                          SETTINGS
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Set deposit bonus % (Link 20%, CashApp 30%, Chime 15%, Crypto 30%), payout rules &amp; live cashout ticker.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0" />
                </div>

                {/* 2. Live Player Cashout Feed Settings */}
                <div
                  onClick={() => handleNavigateAdmin('ops_config')}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 active:border-indigo-500 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <span>Live Cashout Ticker ($50–$250)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Customize player names pool, amount range ($50-$250), probable cashouts &amp; interval speeds.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                </div>

                {/* 3. Master Game Catalog */}
                <div
                  onClick={() => handleNavigateAdmin('ops_game_catalog')}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 active:border-cyan-500 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <span>Game Catalog &amp; Mirrors</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Add &amp; update games, enable multiple play links (Web, APK, iOS), names &amp; icons.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                </div>

                {/* 4. Security Audit Logs */}
                <div
                  onClick={() => handleNavigateAdmin('ops_audit')}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 active:border-slate-600 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs">Security Audit Logs</div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Immutable ledger verification, administrative actions &amp; login audit history.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
                </div>
              </div>
            )}

            {/* TAB 2: PLAYER DIRECTORY SEARCH */}
            {(modalTab === 'players' || !isAdmin) && (
              <>
                {/* Instant Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search player name, email, phone, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Customers List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-1 max-h-[50vh]">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No players match your search.
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const wallet = dataService.getWallet(cust.id);
                      const linkedGames = dataService.getGameAccounts(cust.id);
                      return (
                        <div
                          key={cust.id}
                          onClick={() => handleOpenCustomerChat(cust)}
                          className="p-3 rounded-2xl bg-[#0A0F1D] border border-slate-800/80 active:border-amber-500 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer hover:border-amber-500/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">
                              {cust.displayName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate flex items-center gap-1.5">
                                <span>{cust.displayName}</span>
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/40">
                                  ${wallet.availableBalance.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {cust.email}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{linkedGames.length} Games</span>
                                {cust.phone && <span>· {cust.phone}</span>}
                              </div>
                            </div>
                          </div>

                          <button className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 flex items-center gap-1 transition-colors">
                            <span>Chat</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
