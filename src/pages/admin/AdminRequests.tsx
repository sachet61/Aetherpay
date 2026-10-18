import React, { useState } from 'react';
import { UserProfile, TopUpRequest, WithdrawalRequest, GameAccount, WithdrawalStatus } from '../../types';
import { dataService } from '../../services/dataService';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AdminRequestsProps {
  currentUser: UserProfile;
  initialFilter?: string;
  highlightId?: string;
}

export const AdminRequests: React.FC<AdminRequestsProps> = ({
  currentUser,
  initialFilter,
  highlightId,
}) => {
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'topup' | 'withdrawal' | 'game_account'>(
    initialFilter === 'topup'
      ? 'topup'
      : initialFilter === 'withdrawal'
      ? 'withdrawal'
      : initialFilter === 'game_account'
      ? 'game_account'
      : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected request for action modals
  const [actionTopUp, setActionTopUp] = useState<TopUpRequest | null>(null);
  const [actionWithdrawal, setActionWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [actionGameAccount, setActionGameAccount] = useState<GameAccount | null>(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  // Form input states for actions
  const [rejectReason, setRejectReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [verifiedAmount, setVerifiedAmount] = useState('');

  // Game ID assignment inputs
  const [assignedUsername, setAssignedUsername] = useState('');
  const [assignedPassword, setAssignedPassword] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const allTopUps = dataService.getTopUpRequests();
  const allWithdrawals = dataService.getWithdrawalRequests();
  const allGameAccounts = dataService.getGameAccounts();

  // Combine requests into a normalized queue
  interface UnifiedRequestItem {
    id: string;
    type: 'topup' | 'withdrawal' | 'game_account';
    customerId: string;
    customerName: string;
    amount?: number;
    methodName: string;
    status: string;
    createdAt: string;
    original: TopUpRequest | WithdrawalRequest | GameAccount;
  }

  const unifiedList: UnifiedRequestItem[] = [];

  if (requestTypeFilter === 'all' || requestTypeFilter === 'topup') {
    allTopUps.forEach((t) => {
      unifiedList.push({
        id: t.id,
        type: 'topup',
        customerId: t.customerId,
        customerName: t.customerName,
        amount: t.amount,
        methodName: t.targetGameName ? `${t.methodName} → ${t.targetGameName}` : t.methodName,
        status: t.status,
        createdAt: t.createdAt,
        original: t,
      });
    });
  }

  if (requestTypeFilter === 'all' || requestTypeFilter === 'withdrawal') {
    allWithdrawals.forEach((w) => {
      unifiedList.push({
        id: w.id,
        type: 'withdrawal',
        customerId: w.customerId,
        customerName: w.customerName,
        amount: w.amount,
        methodName: w.methodName || 'Bank Transfer',
        status: w.status,
        createdAt: w.createdAt,
        original: w,
      });
    });
  }

  if (requestTypeFilter === 'all' || requestTypeFilter === 'game_account') {
    allGameAccounts.forEach((g) => {
      const player = dataService.getUserById(g.customerId);
      unifiedList.push({
        id: g.id,
        type: 'game_account',
        customerId: g.customerId,
        customerName: player?.displayName || 'Player',
        methodName: `${g.gameName} (${g.platformName})`,
        status: g.status,
        createdAt: g.createdAt,
        original: g,
      });
    });
  }

  // Filter & sort by recency
  const filteredList = unifiedList
    .filter((item) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (
            item.status !== 'submitted' &&
            item.status !== 'verifying' &&
            item.status !== 'processing' &&
            item.status !== 'pending_assignment' &&
            item.status !== 'pending_reset'
          )
            return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.customerName.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.methodName.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Top-Up Handlers
  const handleApproveTopUp = (req: TopUpRequest) => {
    const customAmt = verifiedAmount.trim() ? parseFloat(verifiedAmount) : undefined;
    const res = dataService.approveTopUp({
      requestId: req.id,
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
      notes: internalNote.trim() || undefined,
      verifiedAmount: customAmt && customAmt > 0 ? customAmt : undefined,
    });

    if (res.success) {
      const finalAmt = customAmt && customAmt > 0
        ? customAmt + (customAmt * (req.bonusPercentage || 0)) / 100
        : req.finalWalletCredit;
      setFeedbackMsg({
        text: `Approved deposit #${req.id}. Credited $${finalAmt.toFixed(2)} to ${req.customerName}.`,
        type: 'success',
      });
      setActionTopUp(null);
      setInternalNote('');
      setVerifiedAmount('');
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  const handleRejectTopUp = (req: TopUpRequest) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    const res = dataService.rejectTopUp({
      requestId: req.id,
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
      reason: rejectReason.trim(),
    });

    if (res.success) {
      setFeedbackMsg({ text: `Rejected deposit #${req.id}. Player notified.`, type: 'success' });
      setActionTopUp(null);
      setRejectReason('');
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  // Withdrawal Handlers
  const handleUpdateWithdrawalStatus = (req: WithdrawalRequest, newStatus: WithdrawalStatus) => {
    if ((newStatus === 'rejected' || newStatus === 'cancelled') && !rejectReason.trim()) {
      alert('Please provide a reason for rejecting the cashout.');
      return;
    }

    const res = dataService.updateWithdrawalStatus({
      requestId: req.id,
      newStatus,
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
      note: newStatus === 'rejected' ? rejectReason.trim() : internalNote.trim() || undefined,
      payoutReference: payoutRef.trim() || undefined,
    });

    if (res.success) {
      setFeedbackMsg({
        text: `Withdrawal #${req.id} moved to ${newStatus}. ${
          newStatus === 'rejected' ? 'Reserved funds restored to customer.' : ''
        }`,
        type: 'success',
      });
      setActionWithdrawal(null);
      setRejectReason('');
      setPayoutRef('');
      setInternalNote('');
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  // Game Account Handlers (Customer Support handles assigning/updating)
  const handleOpenAssignModal = (acc: GameAccount) => {
    const player = dataService.getUserById(acc.customerId);
    const cleanPlayerName = (player?.displayName || 'Player').replace(/\s+/g, '');
    const cleanGameTag = acc.gameName.split(' ')[0];

    setActionGameAccount(acc);
    setAssignedUsername(acc.username !== 'Pending Assignment' ? acc.username : `${cleanPlayerName}_${cleanGameTag}`);
    setAssignedPassword(acc.password || `GamePass#${Math.floor(1000 + Math.random() * 9000)}!`);
    setInternalNote(acc.notes || '');
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAssignedPassword(`${res}!`);
  };

  const handleSaveGameCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionGameAccount) return;
    if (!assignedUsername.trim() || !assignedPassword.trim()) {
      alert('Please enter both a username and password.');
      return;
    }

    const res = dataService.assignOrUpdateGameCredentials({
      accountId: actionGameAccount.id,
      username: assignedUsername.trim(),
      password: assignedPassword.trim(),
      notes: internalNote.trim() || undefined,
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
    });

    if (res.success) {
      setFeedbackMsg({ text: res.message, type: 'success' });
      setActionGameAccount(null);
      setAssignedUsername('');
      setAssignedPassword('');
      setInternalNote('');
    } else {
      setFeedbackMsg({ text: res.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Unified Operations Request Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review, approve, and process player deposits, treasury cashouts, and assign game IDs &amp; credentials.
          </p>
        </div>

        <button
          onClick={() => {
            const log = dataService.triggerAutomatedWebhookSimulation({
              gateway: 'Automated Gateway Webhook',
              eventType: 'payment.succeeded',
              amount: 500,
              customerId: currentUser.id,
              customerName: currentUser.displayName,
            });
            setFeedbackMsg({
              text: `Simulated gateway webhook callback received (${log.gateway} -> ${log.eventType}). Response: ${log.responseStatus} OK.`,
              type: 'success',
            });
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-600/50 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Simulate Gateway Webhook</span>
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-[10px] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Type Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
            <button
              onClick={() => setRequestTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                requestTypeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setRequestTypeFilter('topup')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                requestTypeFilter === 'topup' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Top-Ups
            </button>
            <button
              onClick={() => setRequestTypeFilter('withdrawal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                requestTypeFilter === 'withdrawal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cashouts
            </button>
            <button
              onClick={() => setRequestTypeFilter('game_account')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                requestTypeFilter === 'game_account' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Game ID Requests
            </button>
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Only Pending Action</option>
            <option value="submitted">Submitted</option>
            <option value="verifying">Verifying</option>
            <option value="processing">Processing</option>
            <option value="pending_assignment">Pending Game ID Assignment</option>
            <option value="pending_reset">Pending Password Reset</option>
            <option value="active">Active Credentials</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player, game, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No requests found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Request / Time</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Details / Game</th>
                  <th className="py-3 px-4 text-right">Value / ID</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Staff Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((item) => {
                  const isTopUp = item.type === 'topup';
                  const isWithdrawal = item.type === 'withdrawal';
                  const isGameAccount = item.type === 'game_account';
                  const isHighlighted = item.id === highlightId;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isHighlighted ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-300 font-semibold">{item.id}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-white">{item.customerName}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isTopUp
                              ? 'text-indigo-400'
                              : isWithdrawal
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {isTopUp ? (
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          ) : isWithdrawal ? (
                            <ArrowUpFromLine className="w-3.5 h-3.5" />
                          ) : (
                            <Gamepad2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isTopUp ? 'Deposit' : isWithdrawal ? 'Cashout' : 'Game ID'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">{item.methodName}</td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-white">
                        {item.amount !== undefined ? (
                          `$${item.amount.toFixed(2)}`
                        ) : isGameAccount ? (
                          <span className="text-[11px] font-mono text-slate-400">
                            {(item.original as GameAccount).username}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-mono capitalize px-2 py-0.5 rounded-full ${
                            item.status === 'completed' || item.status === 'active'
                              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                              : item.status === 'rejected' || item.status === 'cancelled'
                              ? 'text-rose-400 bg-rose-950/60 border border-rose-800/40'
                              : 'text-amber-400 bg-amber-950/60 border border-amber-800/40'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isTopUp ? (
                          <button
                            onClick={() => {
                              const r = item.original as TopUpRequest;
                              setActionTopUp(r);
                              setVerifiedAmount(r.amount ? String(r.amount) : '');
                              setRejectReason('');
                              setInternalNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px]"
                          >
                            Review
                          </button>
                        ) : isWithdrawal ? (
                          <button
                            onClick={() => {
                              setActionWithdrawal(item.original as WithdrawalRequest);
                              setRejectReason('');
                              setPayoutRef('');
                              setInternalNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                          >
                            Process
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignModal(item.original as GameAccount)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] flex items-center gap-1 mx-auto"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Assign / Update</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Game Credentials Assignment Modal (For Customer Support) */}
      {actionGameAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActionGameAccount(null)} />
          <form
            onSubmit={handleSaveGameCredentials}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>Configure Player Credentials for {actionGameAccount.gameName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionGameAccount(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Player:</span>
                <span className="font-semibold text-white">
                  {dataService.getUserById(actionGameAccount.customerId)?.displayName || 'Player'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Game &amp; Platform:</span>
                <span className="text-indigo-400 font-medium">
                  {actionGameAccount.gameName} ({actionGameAccount.platformName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Request Type:</span>
                <span className="capitalize font-mono text-amber-400">
                  {actionGameAccount.requestType?.replace('_', ' ') || 'Direct Update'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Assigned Username / In-Game ID</label>
                <input
                  type="text"
                  value={assignedUsername}
                  onChange={(e) => setAssignedUsername(e.target.value)}
                  placeholder="e.g. VanceVanguard or PlayerTag#NA1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Assigned Login Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={assignedPassword}
                  onChange={(e) => setAssignedPassword(e.target.value)}
                  placeholder="e.g. SecretPassword#2026!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold tracking-wider focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Internal Notes / Tournament Server ID</label>
                <input
                  type="text"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="e.g. Tier-1 NA competitive slot assigned"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
              When you click assign, the credentials are immediately updated on the player's gaming card, an in-app notification is dispatched, and a confirmation note is sent into their support chat.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionGameAccount(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-lg shadow-cyan-600/20"
              >
                Assign &amp; Notify Player
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top-Up Action Modal */}
      {actionTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActionTopUp(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-indigo-400" />
                <span>Verify Deposit #{actionTopUp.id}</span>
              </h3>
              <button onClick={() => setActionTopUp(null)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Player:</span>
                <span className="font-semibold text-white">{actionTopUp.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Target Game Platform:</span>
                <span className="font-semibold text-amber-300">{actionTopUp.targetGameName || 'Standard Game'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-slate-200">{actionTopUp.methodName}</span>
              </div>

              {actionTopUp.providerRef && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Player Reference / Notes:</span>
                  <span className="font-mono text-white">{actionTopUp.providerRef}</span>
                </div>
              )}

              {actionTopUp.cryptoTxHash && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Crypto TXID:</span>
                  <span className="font-mono text-indigo-400 truncate max-w-[200px]">{actionTopUp.cryptoTxHash}</span>
                </div>
              )}

              {/* Uploaded Screenshot Proof Preview */}
              {actionTopUp.receiptUrl ? (
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => setViewReceiptUrl(actionTopUp.receiptUrl || null)}
                    className="w-full py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 hover:border-indigo-500 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span>Inspect Payment Proof ({actionTopUp.receiptName || 'receipt.jpg'})</span>
                  </button>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-slate-950 text-slate-500 text-center text-[11px]">
                  No screenshot uploaded by player.
                </div>
              )}

              {/* Verified Deposit Amount & Dynamic Bonus Calculator */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">
                    Verified Deposit Amount ($ USD)
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono font-medium">Verify from Proof</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={verifiedAmount}
                    onChange={(e) => setVerifiedAmount(e.target.value)}
                    placeholder="Enter verified amount"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {(() => {
                  const numAmt = parseFloat(verifiedAmount) || (actionTopUp.amount || 0);
                  const bonusPct = actionTopUp.bonusPercentage || 0;
                  const bonusAmt = (numAmt * bonusPct) / 100;
                  const totalCredit = numAmt + bonusAmt;
                  return (
                    <div className="space-y-1 pt-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Calculated Bonus ({bonusPct}%):</span>
                        <span className="font-mono text-emerald-400">+${bonusAmt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-slate-800 pt-1">
                        <span className="text-white">Total Credit to Issue:</span>
                        <span className="font-mono text-indigo-300 text-sm">${totalCredit.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Automatic Game ID & Password Status Check */}
              {(() => {
                const customerGameAccounts = dataService.getGameAccounts(actionTopUp.customerId);
                const targetGameAccount = customerGameAccounts.find(
                  (a) => a.gameCatalogId === actionTopUp.targetGameCatalogId || a.gameName.toLowerCase() === actionTopUp.targetGameName?.toLowerCase()
                );
                const hasActiveGameId = targetGameAccount && targetGameAccount.status === 'active';

                if (hasActiveGameId) {
                  return (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Active Game ID Confirmed: <strong className="text-white font-mono">{targetGameAccount.username}</strong></span>
                      </div>
                      <p className="text-[11px] text-emerald-200/70">
                        Player has verified credentials for {actionTopUp.targetGameName || 'this game'}. Credits can be loaded immediately.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>No Active Game ID for {actionTopUp.targetGameName || 'this game'}</span>
                    </div>
                    <p className="text-[11px] text-amber-200/70">
                      Player does not have provisioned credentials for this game platform yet. Please assign a Game ID or alert customer care.
                    </p>
                  </div>
                );
              })()}
            </div>

            {actionTopUp.status !== 'completed' && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Internal Audit Note</label>
                  <input
                    type="text"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="e.g. Bank statement ref matched Chase feed"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Rejection Reason (if declining)</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Unreadable receipt screenshot or mismatching amount"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleRejectTopUp(actionTopUp)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs transition-colors"
                  >
                    Reject Deposit
                  </button>
                  <button
                    onClick={() => handleApproveTopUp(actionTopUp)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Approve &amp; Credit Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Action Modal */}
      {actionWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActionWithdrawal(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpFromLine className="w-4 h-4 text-amber-400" />
                <span>Process Cashout #{actionWithdrawal.id}</span>
              </h3>
              <button onClick={() => setActionWithdrawal(null)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Player:</span>
                <span className="font-semibold text-white">{actionWithdrawal.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Requested Amount:</span>
                <span className="font-mono text-white">${actionWithdrawal.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Processing Fee:</span>
                <span className="font-mono text-slate-400">-${actionWithdrawal.feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Net Payout to Dispatch:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">${actionWithdrawal.netPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Current Status:</span>
                <span className="capitalize font-mono text-white">{actionWithdrawal.status.replace('_', ' ')}</span>
              </div>

              {/* Beneficiary Details */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300">Payout Destination Details:</div>
                {actionWithdrawal.payoutDetails?.bankName && (
                  <div className="text-slate-400 font-mono text-[11px]">
                    Bank: {actionWithdrawal.payoutDetails.bankName} · Acc: {actionWithdrawal.payoutDetails.accountNumber} · Routing: {actionWithdrawal.payoutDetails.routingOrSwift}
                  </div>
                )}
                {actionWithdrawal.payoutDetails?.cryptoAddress && (
                  <div className="text-slate-400 font-mono text-[11px]">
                    Net: {actionWithdrawal.payoutDetails.cryptoNetwork} · Addr: {actionWithdrawal.payoutDetails.cryptoAddress}
                  </div>
                )}
              </div>
            </div>

            {actionWithdrawal.status !== 'completed' && actionWithdrawal.status !== 'rejected' && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold text-xs">Payment Method: {actionWithdrawal.methodName || actionWithdrawal.method || 'Standard Cashout'}</div>
                    <div className="text-[11px] text-slate-400">
                      {actionWithdrawal.payoutDetails?.cashtag && `Cashtag: ${actionWithdrawal.payoutDetails.cashtag}`}
                      {actionWithdrawal.payoutDetails?.chimeHandle && `Chime: ${actionWithdrawal.payoutDetails.chimeHandle}`}
                      {actionWithdrawal.payoutDetails?.cryptoAddress && `Crypto Address (${actionWithdrawal.payoutDetails.cryptoCurrency || 'USDT'}): ${actionWithdrawal.payoutDetails.cryptoAddress}`}
                      {actionWithdrawal.payoutDetails?.linkAccountRef && `Account/Ref: ${actionWithdrawal.payoutDetails.linkAccountRef}`}
                      {!actionWithdrawal.payoutDetails?.cashtag && !actionWithdrawal.payoutDetails?.chimeHandle && !actionWithdrawal.payoutDetails?.cryptoAddress && !actionWithdrawal.payoutDetails?.linkAccountRef && (actionWithdrawal.playerNotes || 'Collected via Live Chat')}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 font-bold">
                    ${actionWithdrawal.netPayout.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Payout Wire / Chain Dispatch Reference</label>
                  <input
                    type="text"
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    placeholder="e.g. CASHTAG-TX-1092, CHIME-CONF-8821, or Tronscan TXID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Rejection Reason (if declining cashout)</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Incomplete KYC or banking name mismatch"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleUpdateWithdrawalStatus(actionWithdrawal, 'rejected')}
                    className="py-2 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs"
                  >
                    Reject &amp; Release
                  </button>
                  <button
                    onClick={() => handleUpdateWithdrawalStatus(actionWithdrawal, 'processing')}
                    className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                  >
                    Mark Processing
                  </button>
                  <button
                    onClick={() => handleUpdateWithdrawalStatus(actionWithdrawal, 'completed')}
                    className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Complete Payout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Preview Lightbox */}
      {viewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
            <div className="p-3 bg-slate-950 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-semibold text-white">Payment Receipt Inspection</span>
              <button onClick={() => setViewReceiptUrl(null)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img
                src={viewReceiptUrl}
                alt="Receipt Inspection"
                className="max-h-[60vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
