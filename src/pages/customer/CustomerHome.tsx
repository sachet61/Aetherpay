import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OfficialPartner, ReferralSummary, UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  HERO_BANNER_IMAGE,
  TOP_PRIORITY_GAME_COUNT,
} from '../../utils/imageUtils';
import { LiveCashoutFeedList } from '../../components/common/LiveCashoutFeedList';
import { GamePlatformCard } from '../../components/customer/GamePlatformCard';
import { WheelStrip } from '../../components/customer/WheelStrip';
import { useWheelAvailability } from '../../hooks/useWheelAvailability';
import { toggleGameCardOverlay } from '../../utils/gameCardUtils';
import { getMessageLink, sortOfficialPartners } from '../../utils/officialPartnersUtils';
import { PartnerIcon, PlatformGlyph, getPlatformDisplayName } from '../../components/common/PartnerVisuals';
import {
  buildUnifiedWalletActivity,
  getActivityStatusMeta,
} from '../../services/walletActivityUtils';
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
} from 'lucide-react';

interface CustomerHomeProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string, meta?: any) => void;
  spinAvailable?: boolean;
  onOpenWheel?: () => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
  spinAvailable,
  onOpenWheel,
}) => {
  const wheelAvailability = useWheelAvailability();
  const isWheelSpinAvailable =
    currentUser.role === 'customer' && (spinAvailable ?? wheelAvailability.spinAvailable);
  const handleOpenWheel = onOpenWheel ?? wheelAvailability.openWheelModal;
  const [copiedRef, setCopiedRef] = React.useState(false);
  const hydratedAccountsForRef = useRef<string | null>(null);

  const topups = dataService.getTopUpRequests(currentUser.id);
  const withdrawals = dataService.getWithdrawalRequests(currentUser.id);
  const transactions = dataService.getTransactions(currentUser.id);
  const gameAccounts = dataService.getGameAccounts(currentUser.id);

  useEffect(() => {
    if (
      gameAccounts.length === 0 &&
      !dataService.getIsHydrating() &&
      hydratedAccountsForRef.current !== currentUser.id
    ) {
      hydratedAccountsForRef.current = currentUser.id;
      void dataService.fetchGameAccountsFromDb(currentUser.id);
    }
  }, [currentUser.id, gameAccounts.length]);

  const recentActivity = useMemo(
    () =>
      buildUnifiedWalletActivity({
        customerId: currentUser.id,
        topups,
        withdrawals,
        transactions,
      }).slice(0, 5),
    [currentUser.id, topups, withdrawals, transactions]
  );

  const pendingTopUps = topups.filter((r) => r.status === 'verifying' || r.status === 'submitted');
  const activeWithdrawals = withdrawals.filter(
    (r) => r.status === 'submitted' || r.status === 'processing' || r.status === 'pending_verification'
  );
  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);
  const [activeOverlayGameId, setActiveOverlayGameId] = useState<string | null>(null);
  const [serverReferralSummary, setServerReferralSummary] = useState<ReferralSummary | null>(null);
  const [visiblePartners, setVisiblePartners] = useState<OfficialPartner[]>(() =>
    sortOfficialPartners(dataService.getCachedOfficialPartners().filter((p) => p.isVisible))
  );
  const localReferralSummary = dataService.getReferralSummary(currentUser.id);
  const referralSummary = serverReferralSummary || localReferralSummary;
  const conversation = dataService.getConversations().find((c) => c.customerId === currentUser.id);

  useEffect(() => {
    if (!activeOverlayGameId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const overlayRoot = target?.closest('[data-game-overlay-id]');
      if (overlayRoot?.getAttribute('data-game-overlay-id') === activeOverlayGameId) {
        return;
      }
      setActiveOverlayGameId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveOverlayGameId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOverlayGameId]);

  // Sync referral summary & server evaluation when referral/wallet state updates
  useEffect(() => {
    let cancelled = false;
    const syncReferralSummary = async () => {
      const res = await dataService.fetchReferralSummaryFromServer(currentUser.id);
      if (!cancelled && res.success && res.summary) {
        setServerReferralSummary(res.summary);
      }
    };
    void syncReferralSummary();
    if (currentUser.emailVerified && currentUser.referredBy) {
      void dataService.triggerServerReferralEvaluation(currentUser.id);
    }

    const syncPartners = async () => {
      const res = await dataService.fetchOfficialPartners();
      if (!cancelled && res.success) {
        setVisiblePartners(sortOfficialPartners(res.partners.filter((p) => p.isVisible)));
      }
    };
    void syncPartners();

    const onStateChanged = (e: any) => {
      const key = e?.detail?.key;
      const tables: string[] = Array.isArray(e?.detail?.tables) ? e.detail.tables : [];
      if (
        key === 'referrals_updated' ||
        key === 'wallet_updated' ||
        key === 'user_verified' ||
        key === 'initial_compact_load' ||
        key === 'topup_approved' ||
        tables.includes('referral_awards') ||
        tables.includes('wallets') ||
        tables.includes('transactions') ||
        tables.includes('topups') ||
        tables.includes('app_config')
      ) {
        void syncReferralSummary();
      }
      if (
        key === 'official_partners_updated' ||
        key === 'delta_sync' ||
        tables.includes('official_partners')
      ) {
        void syncPartners();
      }
    };
    window.addEventListener('aetherpay_state_changed', onStateChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('aetherpay_state_changed', onStateChanged);
    };
  }, [currentUser.id, currentUser.emailVerified, currentUser.referredBy]);

  const welcomeBonus = referralSummary.welcomeBonus;
  const referrerRewardVal = referralSummary.referrerRewardValue ?? referralSummary.rewardPerReferral ?? 25;
  const refereeRewardVal = referralSummary.refereeRewardValue ?? 0;
  const referralMode = referralSummary.rewardMode || 'flat';
  const referralPayoutTargetLabel =
    referralSummary.payoutTarget === 'available_balance' ? 'withdrawable wallet' : 'game bonus balance';
  const referrerRewardText =
    referralMode === 'percent' ? `${referrerRewardVal}% bonus` : `$${referrerRewardVal.toFixed(2)} bonus`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralSummary.referralLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Hero Welcome Banner - Gaming Portal Theme */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-r from-[#0A0F1D] via-[#111A2E] to-[#0A0F1D] shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_BANNER_IMAGE}
            alt="Swift Sweeps Gaming Vault"
            width={1376}
            height={768}
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1D] via-[#0A0F1D]/90 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-2.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Sweeps Gaming Wallet</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-400 font-bold">+20% to +30% RELOAD BONUSES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hi, {(currentUser.displayName || '').trim().split(/\s+/)[0] || 'Player'}
          </h1>
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

      {/* Dashboard Wheel of Luck Reminder Strip (Only rendered when spin is available) */}
      <WheelStrip visible={isWheelSpinAvailable} onOpenWheel={handleOpenWheel} />

      {/* Referee Welcome Bonus Card (Visible when player signed up via referral or was linked by support) */}
      {welcomeBonus?.hasReferrer && (
        <div
          data-testid="welcome-bonus-card"
          className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#0E1726] via-[#111E33] to-[#0E1726] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white">Welcome Bonus</h2>
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase ${
                    welcomeBonus.status === 'rewarded'
                      ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                      : welcomeBonus.status === 'processing'
                      ? 'bg-cyan-950/80 border-cyan-600/50 text-cyan-300'
                      : welcomeBonus.status === 'held'
                      ? 'bg-amber-950/80 border-amber-600/50 text-amber-300'
                      : welcomeBonus.status === 'rejected'
                      ? 'bg-rose-950/80 border-rose-600/50 text-rose-300'
                      : 'bg-slate-900 border-slate-700 text-amber-300'
                  }`}
                >
                  {welcomeBonus.status === 'rewarded'
                    ? 'Rewarded'
                    : welcomeBonus.status === 'processing'
                    ? 'Processing'
                    : welcomeBonus.status === 'held'
                    ? 'In Review'
                    : welcomeBonus.status === 'rejected'
                    ? 'Declined'
                    : 'Pending'}
                </span>
                {welcomeBonus.referrerName && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Invited by {welcomeBonus.referrerName}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-emerald-400 tabular-nums">
                  ${(welcomeBonus.status === 'rewarded' ? welcomeBonus.creditedAmount : welcomeBonus.expectedAmount).toFixed(2)}
                </span>
                <span className="text-xs text-slate-300">
                  {welcomeBonus.status === 'rewarded'
                    ? `credited to your ${
                        welcomeBonus.payoutTarget === 'available_balance' ? 'withdrawable wallet' : 'game bonus balance'
                      }`
                    : welcomeBonus.status === 'processing'
                    ? 'qualification met — completing wallet & ledger credit'
                    : welcomeBonus.status === 'held'
                    ? 'awaiting admin verification'
                    : welcomeBonus.status === 'rejected'
                    ? 'not eligible for payout'
                    : `unlock after $${welcomeBonus.qualifyingDepositMin}+ in approved real deposits ($${welcomeBonus.depositTotal.toFixed(2)} / $${welcomeBonus.qualifyingDepositMin})`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {welcomeBonus.status === 'pending' && (
              <button
                type="button"
                onClick={() => onNavigateTab('topup')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Deposit Now</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('wallet')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Wallet Activity</span>
            </button>
          </div>
        </div>
      )}

      {/* Featured Game Platforms Showcase */}
      <div className="w-full max-w-[1200px] mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#131C2E] text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              Featured Gaming Platforms
            </h2>
          </div>

          <button
            onClick={() => onNavigateTab('game_accounts')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Manage All Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fluid Game Platforms Grid */}
        <div className="featured-games-grid">
          {gameCatalog.map((game, index) => (
            <GamePlatformCard
              key={game.id}
              game={game}
              prioritizeImage={index < TOP_PRIORITY_GAME_COUNT}
              isOverlayOpen={activeOverlayGameId === game.id}
              onToggleOverlay={(gameId) =>
                setActiveOverlayGameId((prev) => toggleGameCardOverlay(prev, gameId))
              }
              onCloseOverlay={(gameId) =>
                setActiveOverlayGameId((prev) => (prev === gameId ? null : prev))
              }
              onTopUp={(gameId) => onNavigateTab('topup', { gameCatalogId: gameId })}
              onCashout={(gameId) => onNavigateTab('withdrawal', { gameCatalogId: gameId })}
            />
          ))}
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

      {/* Lower Grid: Recent Transactions, Official Partners & Referral Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Transactions Ledger */}
        <div
          className={`order-1 space-y-3 ${
            visiblePartners.length > 0 ? 'lg:col-span-1' : 'lg:col-span-2'
          }`}
        >
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
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No deposits, withdrawals, or referral rewards recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentActivity.map((item) => {
                  const statusMeta = getActivityStatusMeta(item.status);
                  const isRejectedOrCancelled =
                    item.status === 'rejected' || item.status === 'cancelled';

                  return (
                    <button
                      key={`${item.sourceType}_${item.id}`}
                      type="button"
                      onClick={() => onNavigateTab('wallet')}
                      className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                            item.direction === 'credit'
                              ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                              : item.direction === 'debit'
                              ? 'bg-cyan-950/70 text-cyan-400 border-cyan-800/60'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {item.direction === 'credit' ? '+' : item.direction === 'debit' ? '-' : '•'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-200 truncate">{item.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">
                            {item.methodName ? `${item.methodName} · ` : ''}
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-semibold tabular-nums ${
                            isRejectedOrCancelled
                              ? 'text-slate-500 line-through'
                              : item.direction === 'credit'
                              ? 'text-emerald-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {item.direction === 'credit' && !isRejectedOrCancelled ? '+' : ''}
                          {item.direction === 'debit' && !isRejectedOrCancelled ? '-' : ''}$
                          {item.netAmount.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-mono ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Official Partners (Under Recent Activity on mobile, 3rd column on desktop) */}
        {visiblePartners.length > 0 && (
          <div className="order-2 lg:order-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Official Partners</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('official_partners')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold whitespace-nowrap"
              >
                See all ({visiblePartners.length})
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-[#0E1726] space-y-3">
              <p className="text-sm text-slate-300">Message them anytime.</p>

              <div className="space-y-2.5">
                {visiblePartners.slice(0, 3).map((partner) => (
                  <div
                    key={partner.id}
                    className="p-2.5 rounded-xl bg-[#0A0F1D] border border-slate-800 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PartnerIcon
                        name={partner.name}
                        iconUrl={partner.iconUrl}
                        platform={partner.platform}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {partner.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <PlatformGlyph platform={partner.platform} className="w-3.5 h-3.5 shrink-0" />
                          <span>{getPlatformDisplayName(partner.platform)}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={getMessageLink(partner)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center shrink-0 transition-colors"
                    >
                      Message
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Referral Program Teaser */}
        <div className="order-3 lg:order-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              <span>
                Refer &amp; Earn{' '}
                {referralMode === 'percent' ? `${referrerRewardVal}%` : `$${referrerRewardVal.toFixed(0)}`}
              </span>
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
              Invite friends to Swift Sweeps. When an email-verified friend deposits at least ${referralSummary.qualifyingDepositMin}, you earn {referrerRewardText}
              {refereeRewardVal > 0
                ? referralMode === 'percent'
                  ? ` and they get a ${refereeRewardVal}% welcome bonus`
                  : ` and they receive a $${refereeRewardVal.toFixed(2)} welcome bonus`
                : ''}{' '}
              in your {referralPayoutTargetLabel}.
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
                <div className="text-slate-400 text-[10px]">Credited Earned</div>
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
