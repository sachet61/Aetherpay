import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trophy,
  XCircle,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { requestReauthSignIn } from '../../services/supabaseTokenManager';
import type { ReferralAwardStatus, ReferralLedgerEntry, TopReferrerEntry, UserProfile } from '../../types';

interface AdminReferralGovernancePanelProps {
  currentUser: UserProfile;
}

const STATUS_TABS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'held_for_review', label: 'Held for Review' },
  { id: 'rewarded', label: 'Rewarded' },
  { id: 'pending_deposit', label: 'Pending Deposit' },
  { id: 'registered', label: 'Registered' },
  { id: 'capped', label: 'Capped' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_DISPLAY: Record<ReferralAwardStatus, { label: string; cls: string }> = {
  registered: { label: 'Registered', cls: 'bg-slate-800 text-slate-300 border-slate-700' },
  pending_deposit: { label: 'Awaiting Deposit', cls: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/70' },
  processing: { label: 'Processing', cls: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/70' },
  held_for_review: { label: 'Held for Review', cls: 'bg-amber-950/70 text-amber-300 border-amber-700/70' },
  rewarded: { label: 'Rewarded', cls: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70' },
  rejected: { label: 'Rejected', cls: 'bg-rose-950/70 text-rose-300 border-rose-800/70' },
  capped: { label: 'Capped', cls: 'bg-slate-800 text-amber-300 border-amber-800/50' },
};

const FLAG_LABELS: Record<string, string> = {
  shared_ip: 'Shared IP',
  shared_device: 'Shared Device',
  self_referral: 'Self-Referral',
  duplicate_email: 'Duplicate Email',
  duplicate_phone: 'Duplicate Phone',
};

export const AdminReferralGovernancePanel: React.FC<AdminReferralGovernancePanelProps> = ({
  currentUser,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [awards, setAwards] = useState<ReferralLedgerEntry[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrerEntry[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    heldCount: number;
    rewardedCount: number;
    dailyPaidToday: number;
  }>({ totalCount: 0, heldCount: 0, rewardedCount: 0, dailyPaidToday: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorRequiresReauth, setErrorRequiresReauth] = useState(false);
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [busyAwardId, setBusyAwardId] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadLedger = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    setErrorMsg(null);
    setErrorRequiresReauth(false);
    const res = await dataService.fetchAdminReferralLedger({
      status: statusFilter,
      search: searchTerm.trim() || undefined,
      limit: 100,
    });
    if (res.success) {
      setAwards(res.awards);
      setTopReferrers(res.topReferrers);
      if (res.stats) setStats(res.stats);
    } else {
      setErrorMsg(res.error || 'Unable to load referral ledger.');
      setErrorRequiresReauth(Boolean(res.requiresReauth || res.code === 'TOKEN_EXPIRED'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadLedger(true);
  }, [statusFilter]);

  useEffect(() => {
    const onState = (e: any) => {
      const key = e?.detail?.key;
      const tables: string[] = Array.isArray(e?.detail?.tables) ? e.detail.tables : [];
      if (key === 'referrals_updated' || tables.includes('referral_awards')) {
        void loadLedger(false);
      }
    };
    window.addEventListener('aetherpay_state_changed', onState);
    return () => window.removeEventListener('aetherpay_state_changed', onState);
  }, [statusFilter, searchTerm]);

  const handleReviewDecision = async (awardId: string, decision: 'approve' | 'reject') => {
    if (!isAdmin) return;
    setBusyAwardId(awardId);
    setActionMsg(null);
    const res = await dataService.reviewHeldReferral({
      awardId,
      decision,
      reviewNotes: (reviewNotesMap[awardId] || '').trim() || undefined,
    });
    setBusyAwardId(null);
    if (res.success) {
      setActionMsg({
        type: 'success',
        text: res.message || `Referral ${decision === 'approve' ? 'approved & credited' : 'rejected'}.`,
      });
      void loadLedger(false);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Unable to complete review action.' });
    }
  };

  const handleReconcileMissing = async () => {
    if (!isAdmin || isReconciling) return;
    setIsReconciling(true);
    setActionMsg(null);
    const res = await dataService.reconcileReferralRewards();
    setIsReconciling(false);
    if (res.success) {
      setActionMsg({
        type: 'success',
        text:
          (res.reconciledAwards || 0) > 0
            ? `Reconciled ${res.reconciledAwards} referral award(s) across ${res.creditedLegs || 0} wallet leg(s) ($${(res.totalCreditedAmount || 0).toFixed(2)}).`
            : `Audit complete across ${res.checkedAwards || 0} rewarded record(s). All wallet credits are already synced.`,
      });
      void loadLedger(false);
    } else {
      setActionMsg({ type: 'error', text: res.error || 'Failed to reconcile missing referral rewards.' });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <span>Referral Governance, Fraud Review &amp; Leaderboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
            {stats.totalCount} tracked · {stats.heldCount} held for review · {stats.rewardedCount} rewarded · ${stats.dailyPaidToday.toFixed(2)} paid today
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              type="button"
              disabled={isReconciling}
              onClick={() => void handleReconcileMissing()}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 disabled:opacity-50 text-xs text-amber-300 font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {isReconciling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Award className="w-3.5 h-3.5" />
              )}
              <span>Reconcile Missing Rewards</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadLedger(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-rose-800/70 bg-rose-950/40 text-xs text-rose-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {errorRequiresReauth && (
            <button
              type="button"
              onClick={() => requestReauthSignIn(errorMsg || undefined)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] whitespace-nowrap shrink-0"
            >
              Sign In Again
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Referrers Leaderboard (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Top Referrers</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">{topReferrers.length} active</span>
          </div>

          {isLoading ? (
            <div className="py-8 flex items-center justify-center text-xs text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading leaderboard...</span>
            </div>
          ) : topReferrers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No qualified referrals paid yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {topReferrers.slice(0, 8).map((entry, idx) => (
                <div key={entry.referrerId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{entry.displayName}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {entry.referralCode || entry.email || entry.referrerId.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="font-bold text-emerald-400">${entry.totalReferrerPaid.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">
                      {entry.qualifiedCount}/{entry.totalReferred} paid
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral Ledger & Fraud Hold Queue (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    statusFilter === t.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loadLedger(true);
              }}
              className="relative flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter player or code..."
                  className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium whitespace-nowrap shrink-0"
              >
                Go
              </button>
            </form>
          </div>

          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-xs text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading referral ledger...</span>
            </div>
          ) : awards.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No referral ledger entries match this filter.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {awards.map((award) => {
                const badge = STATUS_DISPLAY[award.status] || STATUS_DISPLAY.registered;
                const isHeld = award.status === 'held_for_review';
                return (
                  <div
                    key={award.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{award.refereeName || award.refereeId}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className="font-semibold text-amber-300">
                            {award.referrerName || award.referrerId}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ({award.referralCodeUsed})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Source: {award.source.replace(/_/g, ' ')} · Deposit: $
                          {award.qualifyingDepositAmount.toFixed(2)} · Target:{' '}
                          {award.payoutTarget === 'available_balance' ? 'Cashable Wallet' : 'Game Bonus'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">
                          ${award.referrerRewardAmount.toFixed(2)} / ${award.refereeRewardAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {award.fraudFlags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-amber-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Signals:</span>
                        <span>
                          {award.fraudFlags.map((f) => FLAG_LABELS[f] || f).join(' · ')}
                        </span>
                      </div>
                    )}

                    {(award.staffReason || award.reviewNotes) && (
                      <div className="text-[11px] text-slate-400">
                        {award.staffReason ? `Reason: ${award.staffReason}` : award.reviewNotes}
                      </div>
                    )}

                    {isHeld && (
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-2">
                        {isAdmin ? (
                          <>
                            <input
                              type="text"
                              value={reviewNotesMap[award.id] || ''}
                              onChange={(e) =>
                                setReviewNotesMap((prev) => ({ ...prev, [award.id]: e.target.value }))
                              }
                              placeholder="Optional admin review note..."
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={busyAwardId === award.id}
                                onClick={() => void handleReviewDecision(award.id, 'approve')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1 whitespace-nowrap shrink-0"
                              >
                                {busyAwardId === award.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Award className="w-3.5 h-3.5" />
                                )}
                                <span>Approve &amp; Pay</span>
                              </button>
                              <button
                                type="button"
                                disabled={busyAwardId === award.id}
                                onClick={() => void handleReviewDecision(award.id, 'reject')}
                                className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 disabled:opacity-50 text-rose-200 font-semibold text-xs flex items-center gap-1 whitespace-nowrap shrink-0"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Awaiting Administrator anti-fraud review decision.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
