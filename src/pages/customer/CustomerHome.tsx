import React from 'react';
import { UserProfile, UserWallet, GameCatalogItem } from '../../types';
import { dataService } from '../../services/dataService';
import { resolveGameImageUrl } from '../../utils/imageUtils';
import { LiveCashoutFeedList } from '../../components/common/LiveCashoutFeedList';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  MessageSquare,
  Gift,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Flame,
  KeyRound,
  Zap,
} from 'lucide-react';

interface CustomerHomeProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
}) => {
  const [copiedRef, setCopiedRef] = React.useState(false);
  const transactions = dataService.getTransactions(currentUser.id).slice(0, 5);
  const pendingTopUps = dataService.getTopUpRequests(currentUser.id).filter((r) => r.status === 'verifying' || r.status === 'submitted');
  const activeWithdrawals = dataService.getWithdrawalRequests(currentUser.id).filter((r) => r.status === 'submitted' || r.status === 'processing');
  const gameAccounts = dataService.getGameAccounts(currentUser.id);
  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);
  const referralSummary = dataService.getReferralSummary(currentUser.id);
  const conversation = dataService.getConversations().find((c) => c.customerId === currentUser.id);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralSummary.referralLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hero Welcome Banner - Gaming Portal Theme */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-r from-[#0A0F1D] via-[#111A2E] to-[#0A0F1D] shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/gaming_wallet_hero_1791685883611.jpg"
            alt="Swift Sweeps Gaming Vault"
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1D] via-[#0A0F1D]/90 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Sweeps Gaming Wallet</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-amber-400 font-bold">+20% to +30% RELOAD BONUSES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Welcome back, {currentUser.displayName}</span>
              <span className="text-xl">🎮</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Play your favorite sweeps platforms (Orion Stars, Fire Kirin, Game Vault &amp; more). Top-up with up to <strong className="text-amber-300">30% bonus</strong>, request manual support cashouts, and manage your game credentials 24/7.
            </p>
          </div>

          {/* Quick Balance Snapshot Card */}
          <div className="bg-[#0E1726]/90 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-md min-w-[290px] space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Latest Top-Up Amount</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-semibold font-mono">
                Game Loaded
              </span>
            </div>

            <div className="text-3xl font-bold text-emerald-400 font-mono tabular-nums tracking-tight">
              ${(wallet.lastTopUpAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
              <span className="text-slate-400">Target Game:</span>
              <span className="text-amber-300 font-bold">{wallet.lastTopUpGame || 'Orion Stars Elite'}</span>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug bg-[#0A0F1D]/80 p-2 rounded-lg border border-slate-800/80">
              Deposits are loaded straight into your chosen game with dynamic bonus applied!
            </p>

            {/* Non-cashable Referral Balance Badge */}
            {(wallet.referralBonusBalance || 0) > 0 && (
              <div className="pt-1">
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-between text-xs">
                  <span className="text-amber-300 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Referral Bonus (Game Only):</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    ${(wallet.referralBonusBalance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('topup')}
          className="p-4 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] border border-amber-400/40"
        >
          <div className="flex items-center gap-1">
            <ArrowDownToLine className="w-5 h-5" />
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-amber-400 font-black">+30%</span>
          </div>
          <span>Add Balance / Top-Up</span>
        </button>

        <button
          onClick={() => onNavigateTab('withdrawal')}
          className="p-4 rounded-xl bg-[#0E1726] hover:bg-[#131C2E] text-white font-bold text-sm flex flex-col items-center justify-center gap-2 border border-amber-500/20 hover:border-amber-500/40 transition-all active:scale-[0.98] shadow-md"
        >
          <ArrowUpFromLine className="w-5 h-5 text-amber-400" />
          <span>Request Cashout</span>
        </button>

        <button
          onClick={() => onNavigateTab('game_accounts')}
          className="p-4 rounded-xl bg-[#0E1726] hover:bg-[#131C2E] text-white font-bold text-sm flex flex-col items-center justify-center gap-2 border border-amber-500/20 hover:border-amber-500/40 transition-all active:scale-[0.98]"
        >
          <Gamepad2 className="w-5 h-5 text-amber-400" />
          <span>My Game IDs ({gameAccounts.length})</span>
        </button>

        <button
          onClick={() => onNavigateTab('chat')}
          className="p-4 rounded-xl bg-[#0E1726] hover:bg-[#131C2E] text-white font-bold text-sm flex flex-col items-center justify-center gap-2 border border-amber-500/20 hover:border-amber-500/40 transition-all active:scale-[0.98]"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            {conversation && conversation.unreadCountCustomer > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 rounded-full text-[9px] text-slate-950 font-bold flex items-center justify-center">
                {conversation.unreadCountCustomer}
              </span>
            )}
          </div>
          <span>24/7 Support Chat</span>
        </button>
      </div>

      {/* Featured Game Platforms Showcase (Keyhub Solutions Style) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#131C2E] text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Featured Gaming Platforms</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  DIRECT PLAY MIRRORS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Launch games directly via verified mirror links, request game logins, or load balances with up to +30% promotional bonus.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('game_accounts')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Manage All Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Game Platforms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameCatalog.map((game) => {
            const userAccount = gameAccounts.find((ga) => ga.gameCatalogId === game.id);
            const playLinks = game.links && game.links.length > 0
              ? game.links
              : [{ label: 'Web Play', url: game.gameUrl }];

            return (
              <div
                key={game.id}
                className="group rounded-2xl border border-slate-800 bg-[#0E1726]/80 hover:border-amber-500/60 transition-all p-5 shadow-lg flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Bar with Icon and Platform */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={resolveGameImageUrl(game.iconUrl || game.imageUrl)}
                      alt={game.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/Firekirin.png';
                      }}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-700 group-hover:border-amber-500 transition-colors shrink-0 shadow-md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider truncate">
                          {game.platform}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800 shrink-0">
                          +30% BONUS
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white truncate mt-0.5 group-hover:text-amber-300 transition-colors">
                        {game.title}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  {/* Multiple Links for this specific game */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                      <span>Launch / Play Mirrors:</span>
                      <span className="font-mono text-slate-500">{playLinks.length} link(s) available</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {playLinks.map((link, lIdx) => (
                        <a
                          key={lIdx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-600 text-slate-300 hover:text-indigo-200 text-[11px] font-medium flex items-center gap-1 transition-all"
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                  <button
                    onClick={() => onNavigateTab('topup', { gameCatalogId: game.id })}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Top-Up</span>
                  </button>

                  <button
                    onClick={() => onNavigateTab('withdrawal', { gameCatalogId: game.id })}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" />
                    <span>Cashout</span>
                  </button>

                  <button
                    onClick={() => onNavigateTab('game_accounts')}
                    className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-[11px] flex items-center justify-center border border-slate-800 transition-colors"
                    title={userAccount ? `Account: ${userAccount.username}` : 'Request Credentials'}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 24/7 Direct Support Callout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Direct Chat with Support Specialists (24/7 Desk)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Need cashout processing, new game passwords, or payment verification? Treasury care agents are online.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('chat')}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md shadow-cyan-600/20"
        >
          <span>Open Direct Chat</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pending Action Alerts (if any) */}
      {(pendingTopUps.length > 0 || activeWithdrawals.length > 0) && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Requests in Progress</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingTopUps.map((req) => (
              <div
                key={req.id}
                onClick={() => onNavigateTab('topup')}
                className="cursor-pointer p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="font-medium text-white flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Top-Up #{req.id.substring(req.id.length - 6)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ${req.amount.toFixed(2)} via {req.methodName}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-400 capitalize">
                  Reviewing
                </span>
              </div>
            ))}

            {activeWithdrawals.map((req) => (
              <div
                key={req.id}
                onClick={() => onNavigateTab('withdrawal')}
                className="cursor-pointer p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="font-medium text-white flex items-center gap-1.5">
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cashout #{req.id.substring(req.id.length - 6)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ${req.amount.toFixed(2)} ({req.methodName})
                  </div>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 capitalize">
                  {req.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Section: Recent Transactions & Referral Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Transactions Ledger */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Recent Activity</span>
            </h2>
            <button
              onClick={() => onNavigateTab('wallet')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Full Ledger <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No transactions recorded yet. Add your first top-up to start gaming.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'referral_reward' || tx.type === 'withdrawal_release';
                  return (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isCredit ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{tx.description}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-semibold tabular-nums ${
                            isCredit ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          Bal: ${tx.balanceAfter.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Referral Program Teaser */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              <span>Refer &amp; Earn $25</span>
            </h2>
            <button
              onClick={() => onNavigateTab('referrals')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium"
            >
              Details
            </button>
          </div>

          <div className="p-5 rounded-xl border border-amber-500/20 bg-[#0E1726] space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Invite friends to Swift Sweeps. When they deposit at least $100, you automatically receive a $25 cash reward in your wallet.
            </p>

            <div className="p-3 rounded-lg bg-[#0A0F1D] border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400">Your Shareable Code</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                  {referralSummary.referralCode}
                </span>
                <button
                  onClick={handleCopyReferral}
                  className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                >
                  {copiedRef ? <Check className="w-3 h-3 text-slate-950" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRef ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-800 text-xs">
              <div className="p-2 rounded bg-slate-950/60">
                <div className="text-slate-400 text-[10px]">Referred</div>
                <div className="font-bold text-white font-mono text-base">{referralSummary.totalReferred}</div>
              </div>
              <div className="p-2 rounded bg-slate-950/60">
                <div className="text-slate-400 text-[10px]">Earned</div>
                <div className="font-bold text-emerald-400 font-mono text-base">
                  ${referralSummary.totalRewardsEarned.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Mixed Platform Cashouts Feed */}
      <div className="pt-2">
        <LiveCashoutFeedList maxItems={6} />
      </div>
    </div>
  );
};
