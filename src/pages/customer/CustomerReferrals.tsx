import React, { useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Gamepad2,
  Sparkles,
  Info,
} from 'lucide-react';

interface CustomerReferralsProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string) => void;
}

export const CustomerReferrals: React.FC<CustomerReferralsProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
}) => {
  const [copied, setCopied] = useState(false);
  const summary = dataService.getReferralSummary(currentUser.id);
  const rewardTransactions = dataService
    .getTransactions(currentUser.id)
    .filter((t) => t.type === 'referral_reward');

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Referral Program &amp; Rewards</h1>
        <p className="text-xs text-slate-400 mt-1">
          Invite fellow gamers to Swift Sweeps. Earn ${summary.rewardPerReferral}.00 promotional credits usable to top-up any game account.
        </p>
      </div>

      {/* Non-cashable / Game Top-Up Rule Callout */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-900/60 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Your Referral Bonus Balance:</span>
              <span className="font-mono font-bold text-emerald-400 text-base">
                ${(wallet.referralBonusBalance || 0).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
              Referral amounts are promotional credits for game top-ups (non-withdrawable for cashout). They load straight into your assigned Game IDs.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('game_accounts')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-md shadow-amber-500/20"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Top-Up Games Now</span>
        </button>
      </div>

      {/* Share Box Card */}
      <div className="p-6 rounded-2xl border border-amber-500/20 bg-[#0E1726] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Your Personal Invitation Link</div>
            <p className="text-xs text-slate-300 mt-0.5">
              Referees who sign up through your link and deposit ${summary.qualifyingDepositMin}+ trigger an automatic reward.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-[#0A0F1D] hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="truncate font-mono text-slate-300 select-all">
            {summary.referralLink}
          </div>
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
          <div className="text-[10px] text-slate-400 mt-1">Registered players</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Active Qualified</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {summary.activeReferred}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Deposited ${summary.qualifyingDepositMin}+</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Rewards Earned</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            ${summary.totalRewardsEarned.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Paid directly to wallet</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Pending Payout</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
            ${summary.pendingRewards.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Under verification</div>
        </div>
      </div>

      {/* Referred Friends Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">Referred Players &amp; Progress</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
          {summary.referredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No referred players yet. Share your code to start earning bonuses.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold">
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Deposits Completed</th>
                    <th className="py-3 px-4 text-right">Reward Status</th>
                    <th className="py-3 px-4 text-right">Your Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summary.referredUsers.map((ru) => (
                    <tr key={ru.id} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-semibold text-white">{ru.displayName}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {new Date(ru.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                        ${ru.depositTotal.toFixed(2)} / ${summary.qualifyingDepositMin}.00
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-[10px] font-mono capitalize ${
                            ru.status === 'rewarded'
                              ? 'text-emerald-400'
                              : ru.status === 'qualified'
                              ? 'text-cyan-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {ru.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-white">
                        {ru.rewardEarned > 0 ? `+$${ru.rewardEarned.toFixed(2)}` : '$0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
