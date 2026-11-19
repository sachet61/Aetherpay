import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { dataService } from '../../services/dataService';
import { RealtimeSyncBadge } from '../../components/common/RealtimeSyncBadge';
import { AdminReferralGovernancePanel } from '../../components/admin/AdminReferralGovernancePanel';
import {
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  MessageSquare,
  CheckCircle2,
  Users,
  ArrowRight,
  Gamepad2,
  KeyRound,
  Shield,
  Headphones,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { requestReauthSignIn } from '../../services/supabaseTokenManager';

interface AdminDashboardProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const isAgent = currentUser.role === 'agent';
  const isAdmin = currentUser.role === 'admin';
  const [auditError, setAuditError] = useState<string | null>(null);

  const [auditRequiresReauth, setAuditRequiresReauth] = useState(false);
  const [isRetryingAudit, setIsRetryingAudit] = useState(false);

  const loadDashboardAuditLogs = async () => {
    if (!isAdmin) return;
    setIsRetryingAudit(true);
    const res = await dataService.fetchAuditLogsFromServer({ limit: 25 });
    setIsRetryingAudit(false);
    if (res.error) {
      setAuditError(res.error);
      setAuditRequiresReauth(Boolean(res.requiresReauth || res.code === 'TOKEN_EXPIRED'));
    } else {
      setAuditError(null);
      setAuditRequiresReauth(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (dataService.getAuditLogs().length === 0) {
      void loadDashboardAuditLogs();
    } else {
      setAuditError(null);
      setAuditRequiresReauth(false);
    }

    const onStateChanged = (e: Event) => {
      const key = (e as CustomEvent)?.detail?.key;
      if (
        (key === 'aetherpay_audit_logs' || key === 'hydration_finished') &&
        dataService.getAuditLogs().length > 0
      ) {
        setAuditError(null);
        setAuditRequiresReauth(false);
      }
    };
    window.addEventListener('aetherpay_state_changed', onStateChanged);
    return () => window.removeEventListener('aetherpay_state_changed', onStateChanged);
  }, [isAdmin, currentUser.id]);

  const topups = dataService.getTopUpRequests();
  const withdrawals = dataService.getWithdrawalRequests();
  const conversations = dataService.getConversations();
  const auditLogs = isAdmin ? dataService.getAuditLogs().slice(0, 6) : [];
  const users = dataService.getUsers().filter((u) => u.role === 'customer');
  const pendingGameRequests = dataService.getPendingGameRequests();
  const catalog = dataService.getGameCatalog();

  // Metrics
  const pendingTopUps = topups.filter((t) => t.status === 'submitted' || t.status === 'verifying');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'submitted' || w.status === 'processing');
  const totalQueueCount = pendingTopUps.length + pendingWithdrawals.length;
  const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unreadCountStaff, 0);
  const completedVolume = topups
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hero Banner */}
      <section
        aria-label={isAdmin ? 'Admin Overview' : 'Customer Support Command Desk'}
        className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-[#0F172A] via-[#0E1526] to-[#131B31] p-5 sm:p-6 shadow-lg"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="min-w-0 space-y-2.5">
            {/* Role & System Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide ${
                  isAdmin
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/25'
                }`}
              >
                {isAdmin ? (
                  <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <Headphones className="w-3 h-3 text-cyan-400 shrink-0" />
                )}
                <span>{isAdmin ? 'Super Admin' : 'Support Specialist'}</span>
              </span>

              <RealtimeSyncBadge label="Live Sync" />

              {totalQueueCount === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-slate-800/80 text-slate-300 border border-slate-700/70 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>All queues clear</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-indigo-500/15 text-indigo-200 border border-indigo-500/35 tabular-nums whitespace-nowrap">
                  <Clock className="w-3 h-3 text-indigo-300 shrink-0" />
                  <span>
                    {totalQueueCount} pending review{totalQueueCount === 1 ? '' : 's'}
                  </span>
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-tight">
                {isAdmin ? 'Admin Overview' : 'Customer Support Command Desk'}
              </h1>
              <p className="text-sm text-slate-300/90 mt-1.5 max-w-2xl leading-relaxed">
                {isAdmin
                  ? 'Manage games, player access, requests, fees, and audit activity.'
                  : 'Answer player tickets, fulfill game ID & password requests, and verify deposits.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {pendingGameRequests.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('ops_game_credentials')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-md shadow-amber-500/15 whitespace-nowrap shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums">
                  {pendingGameRequests.length} Game ID Request{pendingGameRequests.length > 1 ? 's' : ''}
                </span>
              </button>
            )}

            {totalQueueCount === 0 ? (
              <button
                type="button"
                onClick={() => onNavigateTab('ops_requests')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 font-medium text-xs inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>View Queue</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('ops_requests')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-md shadow-indigo-600/20 whitespace-nowrap shrink-0"
              >
                <span className="tabular-nums">Open Queue ({totalQueueCount})</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Role-Specific Quick Capabilities Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Capability 1: Game Credentials Desk */}
        <button
          type="button"
          onClick={() => onNavigateTab('ops_game_credentials')}
          className="text-left w-full cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 transition-colors flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-white truncate">Game IDs &amp; Passwords</h3>
              {pendingGameRequests.length > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono tabular-nums shrink-0">
                  {pendingGameRequests.length} pending
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Assign player login credentials
            </p>
          </div>
        </button>

        {/* Capability 2: Support Inbox */}
        <button
          type="button"
          onClick={() => onNavigateTab('ops_chat')}
          className="text-left w-full cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-cyan-500/50 transition-colors flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-white truncate">Live Support Inbox</h3>
              {unreadMessagesCount > 0 && (
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/60 font-mono tabular-nums shrink-0">
                  {unreadMessagesCount} unread
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Real-time messaging with players
            </p>
          </div>
        </button>

        {/* Capability 3: Admin Game Catalog (or Queue if agent) */}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onNavigateTab('ops_game_catalog')}
            className="text-left w-full cursor-pointer p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 hover:border-amber-500/50 transition-colors flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-amber-300 truncate">Game Catalog</h3>
              </div>
              <p className="text-[11px] text-amber-200/75 truncate mt-0.5 tabular-nums">
                Configure {catalog.length} active games
              </p>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigateTab('ops_requests')}
            className="text-left w-full cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 transition-colors flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center shrink-0">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-white truncate">Deposit &amp; Cashout Queue</h3>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Verify payment proofs &amp; process cashouts
              </p>
            </div>
          </button>
        )}

        {/* Capability 4: User Directory & Staff Role Governance */}
        <button
          type="button"
          onClick={() => onNavigateTab('ops_users')}
          className={`text-left w-full cursor-pointer p-4 rounded-xl border transition-colors flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 ${
            isAdmin
              ? 'border-amber-900/40 bg-amber-950/20 hover:border-amber-500/50'
              : 'border-slate-800 bg-slate-900/90 hover:border-cyan-500/50'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isAdmin ? 'bg-amber-950 text-amber-400' : 'bg-cyan-950 text-cyan-400'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-white truncate">
                {isAdmin ? 'Users & Roles' : 'User Directory'}
              </h3>
              {!isAdmin && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase shrink-0 text-cyan-300 bg-cyan-950/80">
                  Read-Only
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {isAdmin
                ? 'Player accounts & role permissions'
                : 'Inspect customer profiles & balances'}
            </p>
          </div>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('ops_requests', { filter: 'topup' })}
          className="text-left w-full cursor-pointer p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md hover:border-indigo-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Deposits</span>
            <ArrowDownToLine className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="text-3xl font-bold text-white font-mono tabular-nums">
            {pendingTopUps.length}
          </div>
          <div className="text-[11px] text-indigo-400 mt-2 font-mono tabular-nums">
            ${pendingTopUps.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} awaiting verification
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('ops_requests', { filter: 'withdrawal' })}
          className="text-left w-full cursor-pointer p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md hover:border-amber-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Cashouts</span>
            <ArrowUpFromLine className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {pendingWithdrawals.length}
          </div>
          <div className="text-[11px] text-amber-400 mt-2 font-mono tabular-nums">
            ${pendingWithdrawals.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} reserved in vault
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('ops_game_credentials')}
          className="text-left w-full cursor-pointer p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md hover:border-amber-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Game ID Requests</span>
            <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {pendingGameRequests.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Awaiting Customer Support assignment
          </div>
        </button>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Players</span>
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-3xl font-bold text-white font-mono tabular-nums">
            {users.length}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 font-mono tabular-nums">
            ${completedVolume.toLocaleString()} total deposit volume
          </div>
        </div>
      </div>

      {/* 2-Column Section: Urgent Action Queue & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Urgent Action Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Priority Action Queue</span>
            </h2>
            <button
              onClick={() => onNavigateTab('ops_requests')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All ({pendingTopUps.length + pendingWithdrawals.length}) &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {pendingTopUps.length === 0 && pendingWithdrawals.length === 0 && pendingGameRequests.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900 text-xs text-slate-500">
                All queues clear! No pending treasury reviews or player requests right now.
              </div>
            ) : (
              <>
                {/* Pending Game ID Requests */}
                {pendingGameRequests.slice(0, 2).map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl border border-amber-800/60 bg-amber-950/20 flex items-center justify-between gap-3 text-xs hover:border-amber-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center font-bold">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white">
                          {dataService.getUserById(acc.customerId)?.displayName || 'Player'}
                        </div>
                        <div className="text-[11px] text-amber-300">
                          Requested ID for: <span className="font-bold">{acc.gameName}</span> ({acc.platformName})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab('ops_game_credentials')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                    >
                      Assign Credentials
                    </button>
                  </div>
                ))}

                {pendingTopUps.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold">
                        <ArrowDownToLine className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{req.customerName}</div>
                        <div className="text-[11px] text-slate-400">
                          Deposit: <span className="font-mono text-emerald-400">${req.amount.toFixed(2)}</span> via {req.methodName}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab('ops_requests', { highlight: req.id })}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                    >
                      Review Receipt
                    </button>
                  </div>
                ))}

                {pendingWithdrawals.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center font-bold">
                        <ArrowUpFromLine className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{req.customerName}</div>
                        <div className="text-[11px] text-slate-400">
                          Cashout: <span className="font-mono text-amber-400">${req.amount.toFixed(2)}</span> ({req.methodName})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab('ops_requests', { highlight: req.id })}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Process Wire
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Admin-Only System Audit Trail or Agent Operations Summary */}
        <div className="lg:col-span-5 space-y-4">
          {isAdmin ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>System Audit Trail</span>
                </h2>
                <button
                  onClick={() => onNavigateTab('ops_audit')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Full Audit Log &rarr;
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-3">
                {auditError ? (
                  <div className="py-4 px-2 text-center space-y-3">
                    <div className="text-xs text-rose-400">{auditError}</div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={isRetryingAudit}
                        onClick={() => void loadDashboardAuditLogs()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRetryingAudit ? 'animate-spin' : ''}`} />
                        <span>Retry</span>
                      </button>
                      {auditRequiresReauth && (
                        <button
                          type="button"
                          onClick={() => requestReauthSignIn(auditError)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold inline-flex items-center gap-1.5"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Sign In Again</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center">
                    No audit events recorded yet.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="pb-3 border-b border-slate-800/80 last:border-b-0 last:pb-0 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-indigo-400 font-semibold">{log.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{log.details}</p>
                      <div className="text-[10px] text-slate-500">By: {log.actorName} ({log.actorRole})</div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-cyan-400" />
                  <span>Support Desk Summary</span>
                </h2>
                <button
                  onClick={() => onNavigateTab('ops_chat')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Open Inbox &rarr;
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Unread Player Messages</span>
                  <span className="font-mono font-bold text-cyan-400">{unreadMessagesCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Pending Game ID Assignments</span>
                  <span className="font-mono font-bold text-amber-400">{pendingGameRequests.length}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Open Treasury Queue Items</span>
                  <span className="font-mono font-bold text-indigo-400">{pendingTopUps.length + pendingWithdrawals.length}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Referral Governance, Fraud Review Queue & Top Referrers Leaderboard */}
      <AdminReferralGovernancePanel currentUser={currentUser} />
    </div>
  );
};
