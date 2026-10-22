import React from 'react';
import { TopUpRequest, WithdrawalRequest } from '../../types';
import { dataService } from '../../services/dataService';
import { Gamepad2, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ChatTransactionCardProps {
  transaction: TopUpRequest | WithdrawalRequest | any;
  currentUserRole: string;
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
  const isTopUp = transaction.gameCatalogId || transaction.paymentMethod || transaction.bonusAmount !== undefined;

  const handleApprove = () => {
    if (isTopUp) {
      dataService.updateTopUpStatus(transaction.id, 'approved', currentUserId, currentUserName);
    } else {
      dataService.updateWithdrawalStatus(transaction.id, 'approved', currentUserId, currentUserName);
    }
    onStatusChanged?.();
  };

  const handleReject = () => {
    const reason = prompt('Enter rejection reason:') || 'Rejected by staff';
    if (isTopUp) {
      dataService.updateTopUpStatus(transaction.id, 'rejected', currentUserId, currentUserName, reason);
    } else {
      dataService.updateWithdrawalStatus(transaction.id, 'rejected', currentUserId, currentUserName, reason);
    }
    onStatusChanged?.();
  };

  const statusColors = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-950 text-red-400 border-red-800';
      default:
        return 'bg-amber-950 text-amber-400 border-amber-800';
    }
  };

  return (
    <div className="mt-2.5 p-3.5 rounded-xl bg-[#0A0F1D]/90 border border-slate-700/80 space-y-2.5 text-left text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold text-white">
          {isTopUp ? <ArrowDownToLine className="w-4 h-4 text-emerald-400" /> : <ArrowUpFromLine className="w-4 h-4 text-amber-400" />}
          <span>{isTopUp ? 'Top-Up Request' : 'Cashout Request'}</span>
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${statusColors(transaction.status)}`}>
          {transaction.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
        <div>
          <span className="text-slate-400">Amount:</span> <strong className="text-emerald-400 font-mono">${(transaction.amount || 0).toFixed(2)}</strong>
        </div>
        {isTopUp && transaction.bonusAmount > 0 && (
          <div>
            <span className="text-slate-400">Bonus:</span> <strong className="text-amber-300 font-mono">+${transaction.bonusAmount.toFixed(2)}</strong>
          </div>
        )}
        {transaction.gameName && (
          <div className="col-span-2">
            <span className="text-slate-400">Game:</span> <strong className="text-amber-300">{transaction.gameName}</strong>
          </div>
        )}
        {transaction.paymentMethod && (
          <div>
            <span className="text-slate-400">Method:</span> <span className="uppercase">{transaction.paymentMethod}</span>
          </div>
        )}
        {transaction.payoutMethod && (
          <div>
            <span className="text-slate-400">Payout:</span> <span className="uppercase">{transaction.payoutMethod}</span>
          </div>
        )}
      </div>

      {transaction.proofUrl && (
        <div className="rounded-lg overflow-hidden border border-slate-800 max-h-32">
          <img src={transaction.proofUrl} alt="Payment Proof" className="w-full h-24 object-cover" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Staff Action Buttons if pending */}
      {currentUserRole !== 'customer' && (transaction.status === 'submitted' || transaction.status === 'verifying' || transaction.status === 'processing' || transaction.status === 'pending') && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleApprove}
            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve &amp; Credit</span>
          </button>
          <button
            onClick={handleReject}
            className="flex-1 py-1.5 px-3 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      )}
    </div>
  );
};
