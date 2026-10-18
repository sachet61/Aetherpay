import React, { useState } from 'react';
import {
  Gamepad2,
  ArrowUpFromLine,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ShieldCheck,
  AlertCircle,
  X,
  CreditCard,
  User,
  Sparkles,
  ZoomIn,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { ChatTransactionData } from '../../types';
import { dataService } from '../../services/dataService';

interface ChatTransactionCardProps {
  transaction: ChatTransactionData;
  currentUserRole: 'customer' | 'agent' | 'admin';
  currentUserId: string;
  currentUserName: string;
  onStatusChanged?: () => void;
}

export const ChatTransactionCard: React.FC<ChatTransactionCardProps> = ({
  transaction,
  currentUserRole,
  currentUserId,
  currentUserName,
  onStatusChanged,
}) => {
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [verifiedAmount, setVerifiedAmount] = useState(
    transaction.amount > 0 ? String(transaction.amount) : ''
  );
  const [internalNotes, setInternalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isStaff = currentUserRole === 'agent' || currentUserRole === 'admin';
  const isTopUp = transaction.transactionType === 'topup';
  const isPending = transaction.status === 'pending';
  const isCompleted = transaction.status === 'completed';
  const isRejected = transaction.status === 'rejected' || transaction.status === 'cancelled';

  // Look up top-up request from data service for full metadata
  const topUpReq = isTopUp
    ? dataService.getTopUpRequests().find((r) => r.id === transaction.requestId)
    : undefined;

  // Determine bonus percentage
  const bonusPct =
    transaction.bonusPercentage ??
    topUpReq?.bonusPercentage ??
    (transaction.methodName?.toLowerCase().includes('cashapp')
      ? 30
      : transaction.methodName?.toLowerCase().includes('crypto')
      ? 30
      : transaction.methodName?.toLowerCase().includes('link')
      ? 20
      : transaction.methodName?.toLowerCase().includes('chime')
      ? 15
      : 20);

  // Check customer game credentials
  const customerId = topUpReq?.customerId || '';
  const customerAccounts = customerId ? dataService.getGameAccounts(customerId) : [];
  const targetGameAccount = customerAccounts.find(
    (a) =>
      (topUpReq?.targetGameCatalogId && a.gameCatalogId === topUpReq.targetGameCatalogId) ||
      (topUpReq?.targetGameName && a.gameName.toLowerCase() === topUpReq.targetGameName.toLowerCase()) ||
      (transaction.gameName && a.gameName.toLowerCase() === transaction.gameName.toLowerCase())
  );
  const hasActiveGameId = Boolean(
    targetGameAccount && targetGameAccount.status === 'active' && targetGameAccount.username
  );

  // Parse entered amount and calculate live bonus
  const parsedAmt = parseFloat(verifiedAmount) || 0;
  const liveBonusAmt = (parsedAmt * bonusPct) / 100;
  const liveTotalCredit = parsedAmt + liveBonusAmt;

  const handleOpenReviewModal = () => {
    setVerifiedAmount(transaction.amount > 0 ? String(transaction.amount) : '');
    setShowReviewModal(true);
  };

  const handleApprove = () => {
    if (!isStaff || isProcessing) return;

    // For Top-Ups: Always open the Review & Amount Entry modal so staff can inspect proof and enter amount
    if (isTopUp) {
      handleOpenReviewModal();
      return;
    }

    // For Withdrawals (cashouts have predefined amounts)
    setIsProcessing(true);
    try {
      const res = dataService.updateWithdrawalStatus({
        requestId: transaction.requestId,
        newStatus: 'completed',
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        note: 'Approved & paid out directly via Customer Support Chat',
        payoutReference: `CHAT_AUTH_${Date.now().toString(36).toUpperCase()}`,
      });
      if (res.success) {
        setActionFeedback('Cashout marked as completed!');
        if (onStatusChanged) onStatusChanged();
      } else {
        alert(res.message);
      }
    } catch (e: any) {
      alert(e.message || 'Error updating transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTopUpApproval = () => {
    if (!isStaff || isProcessing) return;

    const num = parseFloat(verifiedAmount);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid deposit amount greater than $0 based on the payment receipt.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = dataService.approveTopUp({
        requestId: transaction.requestId,
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        notes: internalNotes.trim() || 'Verified and approved via chat receipt review',
        verifiedAmount: num,
      });

      if (res.success) {
        setShowReviewModal(false);
        const finalCalculatedCredit = num + (num * bonusPct) / 100;
        setActionFeedback(
          `Deposit of $${num.toFixed(2)} (+${bonusPct}% bonus = $${finalCalculatedCredit.toFixed(2)}) approved & credited to ${transaction.gameName || 'game'}!`
        );
        if (onStatusChanged) onStatusChanged();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Error approving top-up');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff || isProcessing) return;
    setIsProcessing(true);

    try {
      if (isTopUp) {
        const res = dataService.rejectTopUp({
          requestId: transaction.requestId,
          reviewerId: currentUserId,
          reviewerName: currentUserName,
          reason: rejectReason.trim() || 'Declined by customer care specialist in chat.',
        });
        if (res.success) {
          setShowRejectInput(false);
          setShowReviewModal(false);
          setActionFeedback('Transaction declined.');
          if (onStatusChanged) onStatusChanged();
        } else {
          alert(res.message);
        }
      } else {
        const res = dataService.updateWithdrawalStatus({
          requestId: transaction.requestId,
          newStatus: 'rejected',
          reviewerId: currentUserId,
          reviewerName: currentUserName,
          note: rejectReason.trim() || 'Declined by customer care specialist in chat.',
        });
        if (res.success) {
          setShowRejectInput(false);
          setShowReviewModal(false);
          setActionFeedback('Cashout request rejected.');
          if (onStatusChanged) onStatusChanged();
        } else {
          alert(res.message);
        }
      }
    } catch (e: any) {
      alert(e.message || 'Error declining transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="mt-2.5 w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-3.5 shadow-xl text-left select-text">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                isTopUp
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              {isTopUp ? <Gamepad2 className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{isTopUp ? 'Game Top-Up Request' : 'Game Cashout Request'}</span>
                <span className="font-mono text-[10px] text-slate-400">
                  #{transaction.requestId.slice(-6)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Forwarded to Support Desk</div>
            </div>
          </div>

          {/* Status Badge */}
          {isPending && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
              <Clock className="w-3 h-3" />
              <span>PENDING APPROVAL</span>
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>COMPLETED</span>
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <XCircle className="w-3 h-3" />
              <span>DECLINED</span>
            </span>
          )}
        </div>

        {/* Transaction Details Grid */}
        <div className="py-2.5 grid grid-cols-2 gap-2 text-[11px]">
          {/* Game */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Game Platform</span>
            <span className="font-bold text-white truncate block">
              {transaction.gameName || 'Selected Game'}
            </span>
            {transaction.gameUsername && (
              <span className="text-[10px] text-amber-300 font-mono block truncate">
                ID: {transaction.gameUsername}
              </span>
            )}
          </div>

          {/* Amount & Bonus */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">
              {isTopUp ? 'Deposit & Bonus' : 'Requested Cashout'}
            </span>
            <div className="font-bold text-emerald-400 font-mono text-xs">
              {isTopUp && transaction.amount === 0 && isPending ? (
                <span className="text-amber-400 font-sans text-[11px] font-semibold">
                  Awaiting Staff Amount
                </span>
              ) : (
                `$${transaction.amount.toFixed(2)}`
              )}
            </div>
            {isTopUp && transaction.bonusAmount && transaction.bonusAmount > 0 ? (
              <span className="text-[9px] text-amber-300 font-medium block">
                +${transaction.bonusAmount.toFixed(2)} ({transaction.bonusPercentage}% Bonus)
              </span>
            ) : isTopUp && isPending ? (
              <span className="text-[9px] text-amber-300 font-medium block">
                +{bonusPct}% Promotional Bonus
              </span>
            ) : null}
          </div>

          {/* Payment Method */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 col-span-2 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block">Payment Method</span>
              <span className="font-semibold text-slate-200">
                {transaction.methodName || 'Support Manual'}
              </span>
              {transaction.details && (
                <span className="text-[10px] text-slate-400 font-mono block truncate max-w-xs">
                  {transaction.details}
                </span>
              )}
            </div>

            {/* Total Game Credits Credited */}
            {isTopUp && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total Game Credits</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {transaction.amount === 0 && isPending
                    ? 'Verify from Proof'
                    : `$${(transaction.finalCredit ?? (transaction.amount + (transaction.bonusAmount || 0))).toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Proof Screenshot Attachment */}
        {transaction.proofUrl && (
          <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={transaction.proofUrl}
                alt="Proof"
                className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0 cursor-pointer hover:opacity-80"
                onClick={handleOpenReviewModal}
              />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Payment Receipt Attached</span>
                <span className="text-[11px] font-mono text-slate-300 truncate block">
                  {transaction.proofName || 'payment_proof.png'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenReviewModal}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>View Proof</span>
            </button>
          </div>
        )}

        {/* Audit status when already reviewed */}
        {isCompleted && (
          <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Verified &amp; Approved by {transaction.approvedBy || 'Customer Support'}
              {transaction.approvedAt &&
                ` on ${new Date(transaction.approvedAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </span>
          </div>
        )}

        {isRejected && (
          <div className="mt-2.5 p-2 rounded-xl bg-rose-950/40 border border-rose-800/40 text-[10px] text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              Declined by {transaction.approvedBy || 'Customer Support'}
              {transaction.notes && `: ${transaction.notes}`}
            </span>
          </div>
        )}

        {/* Action feedback banner */}
        {actionFeedback && (
          <div className="mt-2 text-center text-[10px] font-semibold text-emerald-400 py-1 bg-emerald-950/60 rounded-lg">
            {actionFeedback}
          </div>
        )}

        {/* PENDING ACTIONS */}
        {isPending && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            {isStaff ? (
              /* Staff approval buttons */
              <div>
                {!showRejectInput ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleApprove}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isTopUp ? 'Approve & Credit Game' : 'Approve & Process Cashout'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setShowRejectInput(true)}
                      className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 font-semibold text-xs transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmReject} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for declining..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="py-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Confirm Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(false)}
                        className="py-1 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                  Support specialist must verify receipt before approving. Once approved, credits load instantly.
                </p>
              </div>
            ) : (
              /* Customer waiting banner */
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/40 text-[10px] text-amber-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
                <span>
                  Awaiting Customer Support approval. Our care specialists are verifying your transaction and will update you directly in this chat.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Review Proof & Credit Game Modal */}
      {showReviewModal && isTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Review Proof &amp; Credit Game</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Request #{transaction.requestId.slice(-6)} &bull; {topUpReq?.customerName || transaction.gameUsername || 'Player'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Attached Proof Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Payment Receipt Screenshot</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {transaction.proofName || topUpReq?.receiptName || 'receipt.png'}
                </span>
              </div>

              {transaction.proofUrl ? (
                <div className="relative group rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center p-2">
                  <img
                    src={transaction.proofUrl}
                    alt="Proof"
                    className="max-h-56 w-auto object-contain rounded-lg shadow-sm"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowScreenshotModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                      <span>Full Screen Zoom</span>
                    </button>
                    {transaction.proofUrl && (
                      <a
                        href={transaction.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Open New Tab</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                  No payment proof image attached.
                </div>
              )}
            </div>

            {/* Target Game and Method Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Target Game Platform</span>
                <span className="font-bold text-white text-xs block">
                  {transaction.gameName || topUpReq?.targetGameName || 'Game'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Payment Method</span>
                <span className="font-bold text-slate-200 text-xs block">
                  {transaction.methodName || topUpReq?.methodName || 'Payment Channel'}
                </span>
              </div>
            </div>

            {/* Verified Deposit Amount Input & Real-Time Bonus Calculator */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enter Verified Deposit Amount ($ USD)</span>
                </label>
                <span className="text-[10px] text-amber-400 font-mono font-medium">Read from Receipt</span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  autoFocus
                  placeholder="e.g. 50.00"
                  value={verifiedAmount}
                  onChange={(e) => setVerifiedAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-1.5">
                {[20, 25, 50, 100, 200, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setVerifiedAmount(String(preset))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
                  >
                    ${preset}
                  </button>
                ))}
              </div>

              {/* Calculation Preview */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Base Verified Deposit:</span>
                  <span className="font-mono text-white font-semibold">
                    ${parsedAmt.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Promotional Method Bonus (+{bonusPct}%):</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    +${liveBonusAmt.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-800/60 pt-1.5">
                  <span className="text-white">Total Game Credits to Load:</span>
                  <span className="font-mono text-emerald-300 text-sm">
                    ${liveTotalCredit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Game Credentials Verification Card */}
            {hasActiveGameId && targetGameAccount ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Active Game ID &amp; Password Verified</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30">
                    Auto-Chat Dispatch
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Game ID / Username:</span>
                    <span className="text-white font-bold truncate block">{targetGameAccount.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Password:</span>
                    <span className="text-amber-300 font-bold truncate block">
                      {targetGameAccount.password || '••••••'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-200/80 leading-relaxed">
                  ✓ On clicking credit, these credentials along with the loaded total credit (${liveTotalCredit.toFixed(2)}) confirmation will be dispatched automatically to the customer in this chat.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No Active Game ID for {transaction.gameName || 'this game'}</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-500/30">
                    Auto-Reminder
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  ⚠️ Player does not have provisioned credentials for this game platform yet. On credit, our system will automatically notify the customer in chat to request their Game ID so staff can provision credentials.
                </p>
              </div>
            )}

            {/* Internal Audit Note */}
            <div className="space-y-1 text-xs">
              <label className="text-[11px] text-slate-400">Internal Audit Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Receipt verified from CashApp feed"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing || !verifiedAmount || parseFloat(verifiedAmount) <= 0}
                onClick={handleConfirmTopUpApproval}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'Crediting Game...'
                    : `Confirm & Credit Game ($${liveTotalCredit.toFixed(2)})`}
                </span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setShowReviewModal(false);
                  setShowRejectInput(true);
                }}
                className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Decline
              </button>

              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="py-3 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size proof screenshot modal */}
      {showScreenshotModal && transaction.proofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Payment Verification Screenshot</span>
              </div>
              <button
                onClick={() => setShowScreenshotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-black flex items-center justify-center">
              <img
                src={transaction.proofUrl}
                alt="Proof Full"
                className="max-h-[68vh] object-contain w-auto rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="font-mono text-[11px]">{transaction.proofName || 'Receipt'}</span>
              <button
                onClick={() => setShowScreenshotModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
