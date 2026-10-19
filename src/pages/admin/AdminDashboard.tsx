import React from 'react';
import { UserProfile } from '../../types';
import { dataService } from '../../services/dataService';
import { RealtimeSyncBadge } from '../../components/common/RealtimeSyncBadge';
import {
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Users,
  AlertCircle,
  ArrowRight,
  Filter,
  Gamepad2,
  KeyRound,
  Shield,
  Headphones,
  Settings,
  FileSpreadsheet,
} from 'lucide-react';

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

  const topups = dataService.getTopUpRequests();
  const withdrawals = dataService.getWithdrawalRequests();
  const conversations = dataService.getConversations();
  const auditLogs = dataService.getAuditLogs().slice(0, 6);
  const users = dataService.getUsers().filter((u) => u.role === 'customer');
  const pendingGameRequests = dataService.getPendingGameRequests();
  const catalog = dataService.getGameCatalog();

  // Metrics
  const pendingTopUps = topups.filter((t) => t.status === 'submitted' || t.status === 'verifying');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'submitted' || w.status === 'processing');
  const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unreadCountStaff, 0);
  const completedVolume = topups
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isAdmin ? 'Platform Administration Command' : 'Customer Support Command Desk'}
            </h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                isAdmin
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                  : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
              }`}
            >
              {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <Headphones className="w-3 h-3 text-cyan-400" />}
              <span>{isAdmin ? 'Super Admin Privileges' : 'Customer Support Specialist'}</span>
            </span>
            <RealtimeSyncBadge />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Full platform authority: Master game catalog, financial fees, audit logs, and operational queues.'
              : 'Support operations: Answer player tickets, fulfill game ID & password requests, and verify deposits.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingGameRequests.length > 0 && (
            <button
              onClick={() => onNavigateTab('ops_game_credentials')}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-600/20"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{pendingGameRequests.length} Game ID Request{pendingGameRequests.length > 1 ? 's' : ''}</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('ops_requests')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
          >
            <span>Open Queue ({pendingTopUps.length + pendingWithdrawals.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role-Specific Quick Capabilities Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Capability 1: Game Credentials Desk */}
        <div
          onClick={() => onNavigateTab('ops_game_credentials')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 transition-colors flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">Game IDs &amp; Passwords</h3>
              {pendingGameRequests.length > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800/60 font-mono">
                  {pendingGameRequests.length} pending
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Customer Support assigns player login credentials
            </p>
          </div>
        </div>

        {/* Capability 2: Support Inbox */}
        <div
          onClick={() => onNavigateTab('ops_chat')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-cyan-500/50 transition-colors flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">Live Support Inbox</h3>
              {unreadMessagesCount > 0 && (
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800/60 font-mono">
                  {unreadMessagesCount} unread
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Real-time messaging with players
            </p>
          </div>
        </div>

        {/* Capability 3: Admin Game Catalog (or Queue if agent) */}
        {isAdmin ? (
          <div
            onClick={() => onNavigateTab('ops_game_catalog')}
            className="cursor-pointer p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 hover:border-amber-500/50 transition-colors flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300">Master Game Catalog</h3>
                <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider">Admin Only</span>
              </div>
              <p className="text-[11px] text-amber-200/70 truncate">
                Configure {catalog.length} games shown to players
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigateTab('ops_requests')}
            className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 transition-colors flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center shrink-0">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white">Deposit &amp; Cashout Queue</h3>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Verify payment proofs &amp; process cashouts
              </p>
            </div>
          </div>
        )}

        {/* Capability 4: User Directory & Staff Role Governance */}
        <div
          onClick={() => onNavigateTab('ops_users')}
          className={`cursor-pointer p-4 rounded-xl border transition-colors flex items-center gap-3.5 ${
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">
                {isAdmin ? 'Users & Governance' : 'User Directory'}
              </h3>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                  isAdmin ? 'text-amber-400 bg-amber-950/80' : 'text-cyan-400 bg-cyan-950/80'
                }`}
              >
                {isAdmin ? 'Role Admin' : 'Read-Only'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {isAdmin
                ? 'Manage roles (Agent / Admin). Parent Admin locked.'
                : 'Inspect customer profiles, balances & game IDs'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('ops_requests', { filter: 'topup' })}
          className="cursor-pointer p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md hover:border-indigo-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Deposits</span>
            <ArrowDownToLine className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono tabular-nums">
            {pendingTopUps.length}
          </div>
          <div className="text-[11px] text-indigo-400 mt-2 font-mono">
            ${pendingTopUps.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} awaiting verification
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('ops_requests', { filter: 'withdrawal' })}
          className="cursor-pointer p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Cashouts</span>
            <ArrowUpFromLine className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {pendingWithdrawals.length}
          </div>
          <div className="text-[11px] text-amber-400 mt-2 font-mono">
            ${pendingWithdrawals.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} reserved in vault
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('ops_game_credentials')}
          className="cursor-pointer p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Game ID Requests</span>
            <KeyRound className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {pendingGameRequests.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Awaiting Customer Support assignment
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Players</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono tabular-nums">
            {users.length}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 font-mono">
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

        {/* Right Column: Live Audit Trail or Support Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>{isAdmin ? 'System Audit Trail' : 'Recent Support Activity'}</span>
            </h2>
            {isAdmin && (
              <button
                onClick={() => onNavigateTab('ops_audit')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Full Audit Log &rarr;
              </button>
            )}
          </div>

          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-3">
            {auditLogs.map((log) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
