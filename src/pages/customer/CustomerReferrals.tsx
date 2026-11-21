import React, { useEffect, useState } from 'react';
import { ReferralSummary, UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Clock,
  ShieldCheck,
  Gamepad2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldAlert,
  XCircle,
  Wallet,
  ArrowDownToLine,
} from 'lucide-react';

interface CustomerReferralsProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string) => void;
}

const getStepBadge = (done: boolean, pendingLabel: string, doneLabel: string) => (
  <div className="flex items-center gap-1.5">
    {done ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    ) : (
      <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
    )}
    <span className={`text-[11px] font-medium ${done ? 'text-emerald-300' : 'text-slate-400'}`}>
      {done ? doneLabel : pendingLabel}
    </span>
  </div>
);

export const CustomerReferrals: React.FC<CustomerReferralsProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
}) => {
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<ReferralSummary>(() =>
    dataService.getReferralSummary(currentUser.id)
  );
  const [isHydrating, setIsHydrating] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const hydrateSummary = async (showSpinner = false) => {
    if (showSpinner) setIsHydrating(true);
    const res = await dataService.fetchReferralSummaryFromServer(currentUser.id);
    if (res.success && res.summary) {
      setSummary(res.summary);
      setSyncError(null);
    } else {
      setSummary(dataService.getReferralSummary(currentUser.id));
      if (res.error) setSyncError(res.error);
    }
    setIsHydrating(false);
  };

  useEffect(() => {
    void hydrateSummary(true);
    // Evaluate eligibility on view in case verification/deposits completed before returning
    void dataService.triggerServerReferralEvaluation(currentUser.id);
  }, [currentUser.id]);

  useEffect(() => {
    const onStateChanged = (e: any) => {
      const key = e?.detail?.key;
      const tables: string[] = Array.isArray(e?.detail?.tables) ? e.detail.tables : [];
      if (
        key === 'referrals_updated' ||
        key === 'wallet_updated' ||
        key === 'aetherpay_state_changed' ||
        tables.includes('referral_awards') ||
        tables.includes('wallets') ||
        tables.includes('transactions') ||
        tables.includes('users') ||
        tables.includes('app_config') ||
        tables.includes('topups')
      ) {
        void hydrateSummary(false);
      }
    };
    window.addEventListener('aetherpay_state_changed', onStateChanged);
    return () => window.removeEventListener('aetherpay_state_changed', onStateChanged);
  }, [currentUser.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Swift Sweeps',
          text: `Use my invite code ${summary.referralCode} to get started on Swift Sweeps Gaming Wallet!`,
          url: summary.referralLink,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const rewardMode = summary.rewardMode || 'flat';
  const referrerValue = summary.referrerRewardValue ?? summary.rewardPerReferral ?? 25;
  const refereeValue = summary.refereeRewardValue ?? 0;
  const payoutTarget = summary.payoutTarget || 'referral_bonus';
  const maxReferrals = summary.maxReferralsPerUser ?? 50;
  const programEnabled = summary.programEnabled !== false;

  const rewardHeadline =
    rewardMode === 'percent'
      ? `Earn ${referrerValue}% of each qualified friend's real deposit`
      : `Earn $${referrerValue.toFixed(2)} per qualified friend`;

  const friendBonusText =
    refereeValue > 0
      ? rewardMode === 'percent'
        ? ` plus a ${refereeValue}% welcome bonus for your friend`
        : ` and your friend receives $${refereeValue.toFixed(2)}`
      : '';

  const creditDestinationLabel =
    payoutTarget === 'available_balance'
      ? 'Credited directly to your Cashable Wallet (Available Balance)'
      : 'Credited as Game Load Bonus (non-withdrawable; loads straight into your assigned Game IDs)';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Referral Program &amp; Rewards</h1>
          <p className="text-xs text-slate-400 mt-1">
            Invite verified friends (${summary.qualifyingDepositMin}+ deposit).
          </p>
        </div>
        {isHydrating && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Syncing ledger...</span>
          </div>
        )}
      </div>

      {!programEnabled && (
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-600/40 flex items-center gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Automatic referral rewards are currently paused by platform administration. Existing progress and pending reviews remain preserved.
          </span>
        </div>
      )}

      {syncError && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Live server sync warning: {syncError}</span>
        </div>
      )}

      {/* Referee Welcome Bonus Card */}
      {summary.welcomeBonus?.hasReferrer && (
        <div
          data-testid="referrals-welcome-bonus-card"
          className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">Your Welcome Referral Bonus</span>
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase ${
                  summary.welcomeBonus.status === 'rewarded'
                    ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                    : summary.welcomeBonus.status === 'processing'
                    ? 'bg-cyan-950/80 border-cyan-600/50 text-cyan-300'
                    : summary.welcomeBonus.status === 'held'
                    ? 'bg-amber-950/80 border-amber-600/50 text-amber-300'
                    : summary.welcomeBonus.status === 'rejected'
                    ? 'bg-rose-950/80 border-rose-600/50 text-rose-300'
                    : 'bg-slate-900 border-slate-700 text-amber-300'
                }`}
              >
                {summary.welcomeBonus.status === 'rewarded'
                  ? 'Rewarded'
                  : summary.welcomeBonus.status === 'processing'
                  ? 'Processing'
                  : summary.welcomeBonus.status === 'held'
                  ? 'Held for Review'
                  : summary.welcomeBonus.status === 'rejected'
                  ? 'Rejected'
                  : 'Pending'}
              </span>
            </div>
            <div className="text-xs text-slate-300">
              <span className="font-mono font-bold text-emerald-400 mr-1.5">
                $
                {(summary.welcomeBonus.status === 'rewarded'
                  ? summary.welcomeBonus.creditedAmount
                  : summary.welcomeBonus.expectedAmount
                ).toFixed(2)}
              </span>
              {summary.welcomeBonus.status === 'rewarded'
                ? `credited to your ${
                    summary.welcomeBonus.payoutTarget === 'available_balance'
                      ? 'withdrawable wallet'
                      : 'game bonus balance'
                  }${summary.welcomeBonus.referrerName ? ` via ${summary.welcomeBonus.referrerName}` : ''}.`
                : summary.welcomeBonus.status === 'processing'
                ? 'deposit qualified — completing wallet credit & activity entry.'
                : `approved deposits: $${summary.welcomeBonus.depositTotal.toFixed(2)} / $${summary.welcomeBonus.qualifyingDepositMin}.`}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summary.welcomeBonus.status === 'pending' && (
              <button
                type="button"
                onClick={() => onNavigateTab('topup')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Make Deposit</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('wallet')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Wallet Activity</span>
            </button>
          </div>
        </div>
      )}

      {/* Rules & Wallet Credit Callout */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-900/60 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">
                {payoutTarget === 'available_balance'
                  ? 'Available Wallet Balance:'
                  : 'Your Referral Bonus Balance:'}
              </span>
              <span className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                $
                {(payoutTarget === 'available_balance'
                  ? wallet.availableBalance || 0
                  : wallet.referralBonusBalance || 0
                ).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
              {creditDestinationLabel}. Free bonus or promo game loads do not count toward deposit qualification. Cap: {maxReferrals} paid referrals per account.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('game_accounts')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 whitespace-nowrap shadow-md shadow-amber-500/20"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Top-Up Games Now</span>
        </button>
      </div>

      {/* Share Box Card */}
      <div className="p-6 rounded-2xl border border-amber-500/20 bg-[#0E1726] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Your Personal Invitation Link
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Friends who register using your link, verify their email, and complete ${summary.qualifyingDepositMin}+ in approved real deposits qualify automatically (one-time payout per friend).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-[#0A0F1D] hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="truncate font-mono text-slate-300 select-all">{summary.referralLink}</div>
          <div className="text-[11px] font-mono text-amber-400 font-bold shrink-0">
            Code: {summary.referralCode}
          </div>
        </div>
      </div>

      {/* Referral KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-amber-500/20 bg-[#0E1726] shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Total Friends</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {summary.totalReferred}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Linked players</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Qualified Paid</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {summary.activeReferred}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Verified + ${summary.qualifyingDepositMin}+ real cash
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Rewards Earned</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            ${summary.totalRewardsEarned.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {payoutTarget === 'available_balance' ? 'Paid to cashable wallet' : 'Paid to game bonus'}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Pending / Held</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
            ${summary.pendingRewards.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {(summary.heldRewardsCount || 0) > 0
              ? `${summary.heldRewardsCount} under Admin review`
              : 'Awaiting qualification'}
          </div>
        </div>
      </div>

      {/* Step-by-Step Progress Tracker per Referred Friend */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Referred Friends &amp; Qualification Tracker</h2>
          <span className="text-[11px] font-mono text-slate-400">
            {summary.activeReferred}/{maxReferrals} limit used
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
          {summary.referredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No referred players yet. Share your invitation link to track every friend&apos;s verification and deposit progress here.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {summary.referredUsers.map((ru) => {
                const isRewarded = ru.status === 'rewarded';
                const isProcessing = ru.status === 'processing';
                const isHeld = ru.status === 'held_for_review';
                const isRejected = ru.status === 'rejected';
                const isCapped = ru.status === 'capped';
                const emailDone = Boolean(ru.emailVerified);
                const depositDone =
                  Boolean(ru.hasRealDepositMet) || ru.depositTotal >= summary.qualifyingDepositMin;
                const depositPct =
                  summary.qualifyingDepositMin > 0
                    ? Math.min(100, Math.round((ru.depositTotal / summary.qualifyingDepositMin) * 100))
                    : 100;

                return (
                  <div key={ru.id} className="p-4 space-y-3 hover:bg-slate-800/20 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white text-sm">{ru.displayName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Joined{' '}
                          {new Date(ru.joinedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {ru.source === 'manual_link_and_reward' || ru.source === 'manual_link'
                            ? ' · Staff linked'
                            : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <span
                          className={`px-2.5 py-1 rounded border text-[11px] font-mono font-semibold ${
                            isRewarded
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                              : isProcessing
                              ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/70'
                              : isHeld
                              ? 'bg-amber-950/70 text-amber-300 border-amber-700/70'
                              : isRejected
                              ? 'bg-rose-950/70 text-rose-300 border-rose-800/70'
                              : isCapped
                              ? 'bg-slate-800 text-amber-300 border-amber-800/50'
                              : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          {isRewarded
                            ? 'Rewarded'
                            : isProcessing
                            ? 'Processing'
                            : isHeld
                            ? 'Held for Admin Review'
                            : isRejected
                            ? 'Rejected'
                            : isCapped
                            ? 'Cap Reached'
                            : emailDone
                            ? 'Pending Real Deposit'
                            : 'Awaiting Email Verification'}
                        </span>

                        <div className="font-mono font-bold tabular-nums text-sm text-white">
                          {ru.rewardEarned > 0 ? (
                            <span className="text-emerald-400">+${ru.rewardEarned.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-500">$0.00</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4-Step Qualification Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {getStepBadge(true, 'Signed Up', '1. Signed Up')}
                      {getStepBadge(emailDone, '2. Verify Email', '2. Email Verified')}
                      <div className="space-y-1">
                        {getStepBadge(
                          depositDone,
                          `3. Deposit $${ru.depositTotal.toFixed(0)}/$${summary.qualifyingDepositMin}`,
                          `3. Deposited $${ru.depositTotal.toFixed(0)}`
                        )}
                        <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all ${
                              depositDone ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${depositPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isRewarded ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                        ) : isHeld ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : isRejected ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span
                          className={`text-[11px] font-medium ${
                            isRewarded
                              ? 'text-emerald-300'
                              : isProcessing
                              ? 'text-cyan-300'
                              : isHeld
                              ? 'text-amber-300'
                              : isRejected
                              ? 'text-rose-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {isRewarded
                            ? '4. Bonus Credited'
                            : isProcessing
                            ? '4. Crediting Wallet'
                            : isHeld
                            ? '4. Under Admin Review'
                            : isRejected
                            ? '4. Reward Rejected'
                            : isCapped
                            ? '4. Limit Reached'
                            : '4. Payout Pending'}
                        </span>
                      </div>
                    </div>

                    {(isHeld || (isRejected && ru.reviewNotes)) && (
                      <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          {isHeld
                            ? 'Flagged by anti-fraud security checks. An Administrator is reviewing this referral before releasing rewards.'
                            : `Review note: ${ru.reviewNotes}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

