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
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isStaff = currentUserRole === 'agent' || currentUserRole === 'admin';
  const isTopUp = transaction.transactionType === 'topup';
  const isPending = transaction.status === 'pending';
  const isCompleted = transaction.status === 'completed';
  const isRejected = transaction.status === 'rejected' || transaction.status === 'cancelled';

  const handleApprove = () => {
    if (!isStaff || isProcessing) return;
    setIsProcessing(true);

    try {
      if (isTopUp) {
        const res = dataService.approveTopUp({
          requestId: transaction.requestId,
          reviewerId: currentUserId,
          reviewerName: currentUserName,
          notes: 'Approved & credited directly via Customer Support Chat',
        });
        if (res.success) {
          setActionFeedback('Transaction approved & game credited!');
          if (onStatusChanged) onStatusChanged();
        } else {
          alert(res.message);
        }
      } else {
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
      }
    } catch (e: any) {
      alert(e.message || 'Error updating transaction');
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
              ${transaction.amount.toFixed(2)}
            </div>
            {isTopUp && transaction.bonusAmount && transaction.bonusAmount > 0 ? (
              <span className="text-[9px] text-amber-300 font-medium block">
                +${transaction.bonusAmount.toFixed(2)} ({transaction.bonusPercentage}% Bonus)
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
                  ${(transaction.finalCredit ?? (transaction.amount + (transaction.bonusAmount || 0))).toFixed(2)}
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
                onClick={() => setShowScreenshotModal(true)}
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
              onClick={() => setShowScreenshotModal(true)}
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
              {transaction.approvedAt && ` on ${new Date(transaction.approvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
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
