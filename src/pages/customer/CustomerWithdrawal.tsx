import React, { useState } from 'react';
import { UserProfile, UserWallet, WithdrawalRequest } from '../../types';
import { dataService } from '../../services/dataService';
import { useVerificationResolution } from '../../hooks/useVerificationResolution';
import { LiveCashoutFeedList } from '../../components/common/LiveCashoutFeedList';
import {
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Gamepad2,
  ShieldCheck,
  Lock,
  DollarSign,
  QrCode,
  Coins,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';

interface CustomerWithdrawalProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string, meta?: any) => void;
  prefilledAmount?: number;
  preselectedGameCatalogId?: string;
}

export const CustomerWithdrawal: React.FC<CustomerWithdrawalProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
  prefilledAmount,
  preselectedGameCatalogId,
}) => {
  const verificationUi = useVerificationResolution(currentUser);
  const gameCatalog = dataService.getGameCatalog();
  const registeredGameAccounts = dataService
    .getGameAccounts(currentUser.id)
    .filter((g) => g.status === 'active');

  // Check which method the last payment was made through
  const registeredInfo = dataService.getUserRegisteredMethod(currentUser.id);
  const lastPaymentMethod = registeredInfo.method;
  const lastPaymentMethodName = registeredInfo.methodName;

  const [selectedGameId, setSelectedGameId] = useState<string>(() => {
    if (preselectedGameCatalogId) {
      const match = registeredGameAccounts.find(
        (g) => g.gameCatalogId === preselectedGameCatalogId || g.id === preselectedGameCatalogId
      );
      if (match) return match.id;
      return preselectedGameCatalogId;
    }
    return registeredGameAccounts[0]?.id || gameCatalog[0]?.id || '';
  });
  const [amount, setAmount] = useState<string>(prefilledAmount ? String(prefilledAmount) : '100');
  const [playerNotes, setPlayerNotes] = useState('');

  // Destination handle
  const [payoutAccountHandle, setPayoutAccountHandle] = useState(registeredInfo.details || '');
  const [cashtagAcknowledged, setCashtagAcknowledged] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTrackingReq, setSelectedTrackingReq] = useState<WithdrawalRequest | null>(null);

  const selectedGameAccount = registeredGameAccounts.find((g) => g.id === selectedGameId);
  const selectedCatalogGame = gameCatalog.find((g) => g.id === selectedGameId);
  const selectedGameTitle = selectedGameAccount?.gameName || selectedCatalogGame?.title || 'Selected Game';

  const parsedAmount = parseFloat(amount) || 0;
  const withdrawalHistory = dataService.getWithdrawalRequests(currentUser.id);
  const showLiveFeed = Boolean(dataService.getAppConfig().cashoutFeed?.enabled);
  const trackingCardRef = React.useRef<HTMLDivElement>(null);

  const handleSelectTrackingReq = (req: WithdrawalRequest) => {
    setSelectedTrackingReq(req);
    setTimeout(() => {
      trackingCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount to withdraw.');
      return;
    }

    if (!verificationUi.isVerified) {
      setErrorMessage(
        verificationUi.showCashoutButtonSpinner
          ? 'Checking your account verification status. Please wait a moment.'
          : 'Email verification required. Please verify your email before requesting a cashout.'
      );
      return;
    }

    if (!cashtagAcknowledged) {
      setErrorMessage('Please confirm you have reviewed your payout cashtag and understand it cannot be refunded once sent.');
      return;
    }

    if (!lastPaymentMethod) {
      setErrorMessage(
        'No previous deposit detected. To prevent unauthorized withdrawals, you must complete at least one top-up to establish a verified cashout channel.'
      );
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const payoutDetails = {
        methodType: lastPaymentMethod,
        cashtag: lastPaymentMethod === 'cashapp' ? payoutAccountHandle : undefined,
        chimeHandle: lastPaymentMethod === 'chime' ? payoutAccountHandle : undefined,
        cryptoAddress: lastPaymentMethod === 'crypto' ? payoutAccountHandle : undefined,
        linkAccountRef: lastPaymentMethod === 'payment_link' ? payoutAccountHandle : undefined,
        collectedBySupport: true,
      };

      const res = dataService.submitWithdrawal({
        customerId: currentUser.id,
        customerName: currentUser.displayName,
        amount: parsedAmount,
        sourceGameCatalogId: selectedGameAccount?.gameCatalogId || selectedGameId,
        sourceGameName: selectedGameTitle,
        sourceGameUsername: selectedGameAccount?.username || currentUser.displayName,
        playerNotes: playerNotes.trim() || undefined,
        method: lastPaymentMethod,
        methodName: lastPaymentMethodName,
        payoutDetails,
      });

      setIsSubmitting(false);
      if (res.success && res.request) {
        setSuccessMessage(
          `Cashout #${res.request.id.slice(-6)} submitted for $${parsedAmount.toFixed(2)} (${selectedGameTitle}). Opening Live Chat...`
        );
        setSelectedTrackingReq(res.request);

        // Redirect to support chat after brief delay so player can chat with support
        setTimeout(() => {
          onNavigateTab('chat');
        }, 1500);
      } else {
        setErrorMessage(res.message);
      }
    }, 600);
  };

  const handleCancelSubmitted = async (reqId: string) => {
    const res = await dataService.updateWithdrawalStatusAsync({
      requestId: reqId,
      newStatus: 'cancelled',
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
      note: 'Customer cancelled cashout request before processing commenced.',
    });
    if (res.success) {
      setSelectedTrackingReq(null);
      setSuccessMessage('Withdrawal request cancelled successfully.');
    } else {
      setErrorMessage(res.message);
    }
  };

  const renderTrackingCard = () =>
    selectedTrackingReq ? (
      <div
        ref={trackingCardRef}
        className="p-5 rounded-2xl border border-amber-500/20 bg-[#0E1726] shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="font-bold text-white text-xs flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Tracking Cashout #{selectedTrackingReq.id.slice(-6)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
              {selectedTrackingReq.status.replace('_', ' ')}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTrackingReq(null)}
              aria-label="Close tracking card"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Game Account:</span>
            <span className="font-medium text-white">{selectedTrackingReq.sourceGameName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Requested Amount:</span>
            <span className="font-mono font-bold text-emerald-400">${selectedTrackingReq.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Channel:</span>
            <span className="font-medium text-white">{selectedTrackingReq.methodName || selectedTrackingReq.method}</span>
          </div>
        </div>

        {selectedTrackingReq.status === 'submitted' && (
          <button
            type="button"
            onClick={() => handleCancelSubmitted(selectedTrackingReq.id)}
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition-colors mt-2"
          >
            Cancel Request
          </button>
        )}
      </div>
    ) : null;

  return (
    <div className={`space-y-6 ${showLiveFeed ? 'max-w-5xl' : 'max-w-3xl'} mx-auto pb-24 md:pb-8`}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ArrowUpFromLine className="w-6 h-6 text-emerald-400" />
          <span>Cashout</span>
        </h1>
      </div>

      {/* Compact Payout Channel Banner */}
      <div
        className={`px-4 py-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 ${
          lastPaymentMethod
            ? 'bg-[#0E1726] border-amber-500/25 text-slate-200'
            : 'bg-amber-950/40 border-amber-800 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-300">
            Payout channel:{' '}
            <strong className="text-white">
              {lastPaymentMethod ? lastPaymentMethodName : 'Not set'}
            </strong>
            {lastPaymentMethod ? (
              <span className="text-slate-400"> (auto-matched to last deposit)</span>
            ) : (
              <span className="text-amber-200/90"> (complete a deposit first)</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!lastPaymentMethod && (
            <button
              type="button"
              onClick={() => onNavigateTab('topup')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              Deposit First &rarr;
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateTab('chat')}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            Need help? Open Live Chat
          </button>
        </div>
      </div>

      <div className={showLiveFeed ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'space-y-5'}>
        {/* Cashout - Game - Amount Form */}
        <div className={showLiveFeed ? 'lg:col-span-7 space-y-5' : 'space-y-5'}>
          <form onSubmit={handleWithdrawalSubmit} className="p-6 rounded-2xl border border-slate-800 bg-[#0E1726] space-y-5 shadow-xl">
            {/* 1. Game Selection */}
            <div className="space-y-2 p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <span>Choose Game for Cashout</span>
              </label>

              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-[#0A0F1D] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
              >
                {registeredGameAccounts.length > 0 ? (
                  registeredGameAccounts.map((ga) => (
                    <option key={ga.id} value={ga.id}>
                      {ga.gameName}
                    </option>
                  ))
                ) : (
                  gameCatalog.map((gc) => (
                    <option key={gc.id} value={gc.id}>
                      {gc.title}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-slate-400">
                Cashout requested from: <strong className="text-amber-300">{selectedGameTitle}</strong>
              </p>
            </div>

            {/* 2. Amount Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Amount to Cashout ($ USD)
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter cashout amount"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Quick preset buttons in $50-$250 range */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[50, 75, 100, 150, 200, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>



            {/* Optional Player Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Notes for Support Operator (Optional)
              </label>
              <textarea
                rows={2}
                value={playerNotes}
                onChange={(e) => setPlayerNotes(e.target.value)}
                placeholder="e.g., Please send to my primary Cashtag, verified game balance..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Non-Refundable Cashtag Warning Notice */}
            <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/50 text-xs text-amber-200 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="font-semibold text-white leading-relaxed text-xs">
                  ⚠️ Please review your cashtag before submission. Once sent the amount cannot be refunded.
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer pt-1 text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={cashtagAcknowledged}
                  onChange={(e) => setCashtagAcknowledged(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-[11px] font-medium text-slate-300">
                  I have carefully checked my payout handle ({payoutAccountHandle || 'payout details'}) and understand it cannot be refunded or recalled once sent.
                </span>
              </label>
            </div>

            {/* Email Verification Warning for Cashouts (only shown once confirmed unverified) */}
            {verificationUi.showCashoutWarning && (
              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong className="text-white">Email Verification Required:</strong> Cashouts are disabled until your email address (<span className="font-semibold text-white">{currentUser.email}</span>) is verified. Please check the top banner to verify.
                </div>
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !lastPaymentMethod || !verificationUi.isVerified || !cashtagAcknowledged}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {verificationUi.showCashoutButtonSpinner ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Verification Status...</span>
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="w-4 h-4" />
                  <span>
                    {verificationUi.showCashoutWarning
                      ? 'Verify Email to Request Cashout'
                      : !cashtagAcknowledged
                      ? 'Confirm'
                      : isSubmitting
                      ? 'Initiating Support Cashout...'
                      : `Request Cashout ($${parsedAmount.toFixed(2)}) & Open Support Chat`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column when Live Feed enabled, or stacked Tracking Card in single-column mode */}
        {showLiveFeed ? (
          <div className="lg:col-span-5 space-y-5">
            {renderTrackingCard()}
            <LiveCashoutFeedList />
          </div>
        ) : (
          renderTrackingCard()
        )}
      </div>

      {/* Cashout History */}
      {withdrawalHistory.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Recent Cashout History</span>
          </h2>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-2.5">
            {withdrawalHistory.slice(0, 5).map((wdr) => (
              <div
                key={wdr.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {wdr.sourceGameName || 'Game'}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{wdr.methodName || wdr.method}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold text-white bg-slate-800/90 border border-slate-700 shrink-0 tabular-nums">
                    ${wdr.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(wdr.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                        wdr.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : wdr.status === 'rejected' || wdr.status === 'cancelled'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {wdr.status.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTrackingReq(wdr)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700"
                  >
                    Track
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Game</th>
                  <th className="pb-2">Channel</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {withdrawalHistory.slice(0, 5).map((wdr) => (
                  <tr key={wdr.id} className="text-slate-300">
                    <td className="py-2.5 text-[11px] text-slate-400">
                      {new Date(wdr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 font-sans font-medium text-white">{wdr.sourceGameName || 'Game'}</td>
                    <td className="py-2.5 font-sans text-slate-300">{wdr.methodName || wdr.method}</td>
                    <td className="py-2.5 text-white font-bold">${wdr.amount.toFixed(2)}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                          wdr.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : wdr.status === 'rejected' || wdr.status === 'cancelled'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {wdr.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => handleSelectTrackingReq(wdr)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-sans font-semibold"
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
