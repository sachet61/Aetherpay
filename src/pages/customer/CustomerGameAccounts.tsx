import React, { useState } from 'react';
import { UserProfile, GameCatalogItem, GameAccount, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import { resolveGameImageUrl } from '../../utils/imageUtils';
import {
  Gamepad2,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Send,
  ArrowDownToLine,
  Wallet,
  Coins,
} from 'lucide-react';

interface CustomerGameAccountsProps {
  currentUser: UserProfile;
  wallet?: UserWallet;
  onNavigateTab: (tab: string) => void;
}

export const CustomerGameAccounts: React.FC<CustomerGameAccountsProps> = ({
  currentUser,
  wallet: propWallet,
  onNavigateTab,
}) => {
  const wallet = propWallet || dataService.getWallet(currentUser.id);
  const catalog = dataService.getGameCatalog().filter((g) => g.enabled);
  const [playerAccounts, setPlayerAccounts] = useState<GameAccount[]>(() =>
    dataService.getGameAccounts(currentUser.id)
  );

  React.useEffect(() => {
    // 1. Initial on-demand hydration from database
    dataService.fetchGameAccountsFromDb(currentUser.id).then((accs) => {
      if (accs) setPlayerAccounts(accs);
    });

    // 2. Realtime state listeners
    const handleSync = (e?: any) => {
      if (!e?.detail?.key || e.detail.key === 'aetherpay_game_accounts' || e.detail.key === 'game_credentials_assigned' || e.detail.key === 'delta_sync') {
        setPlayerAccounts(dataService.getGameAccounts(currentUser.id));
      }
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUser.id]);

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState<GameCatalogItem | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<GameAccount | null>(null);
  const [loadFundsAccount, setLoadFundsAccount] = useState<GameAccount | null>(null);
  const [loadAmount, setLoadAmount] = useState<string>('50');
  const [fundingSource, setFundingSource] = useState<'wallet_cash' | 'referral_bonus'>(
    (wallet.referralBonusBalance || 0) > 0 ? 'referral_bonus' : 'wallet_cash'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePasswordVisibility = (accountId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmRequestGameId = () => {
    if (!showRequestConfirmModal) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const res = dataService.requestGameCredentials({
        customerId: currentUser.id,
        customerName: currentUser.displayName,
        gameCatalogId: showRequestConfirmModal.id,
      });

      setIsSubmitting(false);
      setShowRequestConfirmModal(null);

      if (res.success) {
        setNotificationMsg({
          text: `Request for "${showRequestConfirmModal.title}" dispatched to Customer Support! A specialist will assign your login ID & password shortly.`,
          type: 'success',
        });
        setTimeout(() => setNotificationMsg(null), 5000);
      } else {
        setNotificationMsg({ text: res.message, type: 'info' });
        setTimeout(() => setNotificationMsg(null), 4000);
      }
    }, 400);
  };

  const handleConfirmResetPassword = () => {
    if (!showResetConfirmModal) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const res = dataService.requestGamePasswordReset({
        accountId: showResetConfirmModal.id,
        customerId: currentUser.id,
        customerName: currentUser.displayName,
      });

      setIsSubmitting(false);
      const gameTitle = showResetConfirmModal.gameName;
      setShowResetConfirmModal(null);

      if (res.success) {
        setNotificationMsg({
          text: `Password update request for "${gameTitle}" forwarded to Customer Support. An operator is updating your credentials.`,
          type: 'success',
        });
        setTimeout(() => setNotificationMsg(null), 5000);
      }
    }, 400);
  };

  const handleConfirmLoadFunds = () => {
    if (!loadFundsAccount) return;
    const parsedAmt = parseFloat(loadAmount) || 0;
    if (parsedAmt <= 0) {
      setNotificationMsg({ text: 'Please enter a valid amount to load to game.', type: 'info' });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = dataService.loadFundsToGame({
        customerId: currentUser.id,
        customerName: currentUser.displayName,
        gameCatalogId: loadFundsAccount.gameCatalogId,
        amount: parsedAmt,
        fundingSource,
      });

      setIsSubmitting(false);
      setLoadFundsAccount(null);

      if (res.success) {
        setNotificationMsg({ text: res.message, type: 'success' });
        setTimeout(() => setNotificationMsg(null), 5000);
      } else {
        setNotificationMsg({ text: res.message, type: 'info' });
        setTimeout(() => setNotificationMsg(null), 4000);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gaming IDs &amp; Game Balances</h1>
          <p className="text-xs text-slate-400 mt-1">
            Official games catalog managed by Admin. Load referral bonuses or wallet cash directly to your Game IDs.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('chat')}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium text-xs flex items-center gap-1.5 border border-indigo-700/40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Message Customer Support</span>
        </button>
      </div>

      {notificationMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Dynamic List of Games from Admin Catalog - Priority Sorted: Active IDs First, Pending Second, Available to Request Third */}
      {(() => {
        const sortedCatalog = [...catalog].sort((a, b) => {
          const accA = playerAccounts.find((acc) => acc.gameCatalogId === a.id || acc.gameName.toLowerCase() === a.title.toLowerCase());
          const accB = playerAccounts.find((acc) => acc.gameCatalogId === b.id || acc.gameName.toLowerCase() === b.title.toLowerCase());
          const getScore = (acc?: GameAccount) => {
            if (acc?.status === 'active') return 0;
            if (acc?.status === 'pending_assignment' || acc?.status === 'pending_reset') return 1;
            return 2;
          };
          const scoreDiff = getScore(accA) - getScore(accB);
          if (scoreDiff !== 0) return scoreDiff;
          return a.title.localeCompare(b.title);
        });

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sortedCatalog.map((game) => {
              // Find matching account for current player
              const account = playerAccounts.find(
                (a) => a.gameCatalogId === game.id || a.gameName.toLowerCase() === game.title.toLowerCase()
              );

          const isRevealed = account ? !!revealedPasswords[account.id] : false;
          const hasActiveCredentials = account && account.status === 'active';
          const isPendingAssignment = account && account.status === 'pending_assignment';
          const isPendingReset = account && account.status === 'pending_reset';

          return (
            <div
              key={game.id}
              className={`p-5 rounded-2xl border bg-slate-900 shadow-xl space-y-4 transition-all flex flex-col justify-between ${
                hasActiveCredentials
                  ? 'border-slate-800 hover:border-slate-700'
                  : isPendingAssignment || isPendingReset
                  ? 'border-amber-700/60 bg-amber-950/20'
                  : 'border-slate-800/80 bg-slate-900/60'
              }`}
            >
              <div className="space-y-3">
                {/* Header Lockup */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                      <img
                        src={resolveGameImageUrl(game.imageUrl || game.iconUrl)}
                        alt={game.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/Firekirin.png';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">{game.title}</h3>
                      <div className="text-[11px] text-indigo-400 font-medium">{game.platform}</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {hasActiveCredentials ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Active ID
                    </span>
                  ) : isPendingAssignment ? (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/70 border border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Support Reviewing
                    </span>
                  ) : isPendingReset ? (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Resetting Pass
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
                      Not Requested
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {game.description}
                </p>

                {/* Player Credentials Display (When Assigned) */}
                {hasActiveCredentials && account ? (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Username:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white select-all">{account.username}</span>
                        <button
                          onClick={() => handleCopy(account.username, `user_${account.id}`)}
                          className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                          title="Copy Username"
                        >
                          {copiedField === `user_${account.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-indigo-400" />
                        <span>Login Password:</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs select-all">
                          {isRevealed ? (
                            <span className="text-emerald-400 font-bold tracking-wider">{account.password || 'Pass#Default'}</span>
                          ) : (
                            <span className="text-slate-500 font-mono">••••••••••••</span>
                          )}
                        </span>

                        <button
                          onClick={() => togglePasswordVisibility(account.id)}
                          className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                          title={isRevealed ? 'Hide Password' : 'Show Password'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-slate-300" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleCopy(account.password || 'Pass#Default', `pass_${account.id}`)}
                          className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                          title="Copy Password"
                        >
                          {copiedField === `pass_${account.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Game Account Balance Display */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 bg-slate-900/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Game Credits:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                          ${(account.balance || 0).toFixed(2)}
                        </span>
                        <button
                          onClick={() => {
                            setLoadFundsAccount(account);
                            setFundingSource((wallet.referralBonusBalance || 0) > 0 ? 'referral_bonus' : 'wallet_cash');
                          }}
                          className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>Load Funds</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                      <span>Assigned By: {account.assignedByAgentName || 'Customer Support Specialist'}</span>
                    </div>
                  </div>
                ) : isPendingAssignment ? (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 space-y-1 text-xs">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Forwarded to Customer Support</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      A customer support specialist is generating and configuring your tournament ID and password. You will receive an in-app alert when ready.
                    </p>
                  </div>
                ) : isPendingReset ? (
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 space-y-1 text-xs">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Password Reset in Progress</span>
                    </div>
                    <p className="text-[11px] text-cyan-200/80 leading-relaxed">
                      Customer support is issuing fresh credentials. Please monitor your support chat.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                    <div className="font-medium text-slate-400">No account credentials configured yet.</div>
                    <p className="text-[11px] text-slate-500">
                      Request player login details below. Our customer care desk will assign your credentials directly.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 gap-2 border-t border-slate-800/80 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={game.gameUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Game</span>
                  </a>
                  {game.downloadUrl && (
                    <a
                      href={game.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>

                {hasActiveCredentials && account ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setLoadFundsAccount(account);
                        setFundingSource((wallet.referralBonusBalance || 0) > 0 ? 'referral_bonus' : 'wallet_cash');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Top-Up Game</span>
                    </button>
                    <button
                      onClick={() => setShowResetConfirmModal(account)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Pass</span>
                    </button>
                  </div>
                ) : isPendingAssignment || isPendingReset ? (
                  <button
                    onClick={() => onNavigateTab('chat')}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>View Ticket</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRequestConfirmModal(game)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Request Game ID &amp; Password</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  })()}

      {/* Confirmation Modal for Requesting New Game ID */}
      {showRequestConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowRequestConfirmModal(null)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-indigo-400" />
                <span>Request Game ID &amp; Password</span>
              </h3>
              <button
                onClick={() => setShowRequestConfirmModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Would you like Customer Support to provision a tournament account and password for{' '}
              <strong className="text-white font-semibold">{showRequestConfirmModal.title}</strong> ({showRequestConfirmModal.platform})?
            </p>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs leading-relaxed space-y-1">
              <div className="font-semibold">Forwarding to Customer Support</div>
              <div>
                This action creates an expedited ticket with our support specialists. Once assigned, your username and password will appear directly on this card.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRequestGameId}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? 'Forwarding...' : 'Forward to Support'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Password Reset */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowResetConfirmModal(null)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Request Password Update</span>
              </h3>
              <button
                onClick={() => setShowResetConfirmModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Request customer support to rotate your login password for{' '}
              <strong className="text-white font-mono">{showResetConfirmModal.username}</strong> on{' '}
              <strong className="text-white">{showResetConfirmModal.gameName}</strong>?
            </p>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs leading-relaxed">
              Our customer care operators will update your password and post the confirmation directly into your support channel.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmResetPassword}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                {isSubmitting ? 'Dispatching...' : 'Dispatch Reset Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Loading Funds to Game */}
      {loadFundsAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setLoadFundsAccount(null)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                <span>Load Funds to {loadFundsAccount.gameName}</span>
              </h3>
              <button
                onClick={() => setLoadFundsAccount(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Transfer funds directly into your player game credentials for{' '}
              <strong className="text-white font-mono">{loadFundsAccount.username}</strong>.
            </p>

            {/* Funding Source Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Choose Funding Source</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFundingSource('referral_bonus')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    fundingSource === 'referral_bonus'
                      ? 'bg-indigo-950/80 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Referral Bonus</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
                    Avail: ${(wallet.referralBonusBalance || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Non-cashable credit</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFundingSource('wallet_cash')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    fundingSource === 'wallet_cash'
                      ? 'bg-indigo-950/80 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Wallet Cash</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
                    Avail: ${wallet.availableBalance.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Withdrawable balance</div>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300">Amount to Load ($ USD)</label>
                <button
                  type="button"
                  onClick={() => {
                    const max =
                      fundingSource === 'referral_bonus'
                        ? wallet.referralBonusBalance || 0
                        : wallet.availableBalance;
                    setLoadAmount(String(max));
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono font-medium"
                >
                  Max Available
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="5"
                  step="any"
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLoadFundsAccount(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmLoadFunds}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? 'Loading Game...' : `Load $${parseFloat(loadAmount) || 0} to Game`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
