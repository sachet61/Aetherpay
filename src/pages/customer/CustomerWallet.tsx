import React, { useState } from 'react';
import { UserProfile, UserWallet, WalletTransaction, TransactionType } from '../../types';
import { dataService } from '../../services/dataService';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Gift,
  Shield,
  Sparkles,
} from 'lucide-react';

interface CustomerWalletProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string) => void;
}

export const CustomerWallet: React.FC<CustomerWalletProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const allTransactions = dataService.getTransactions(currentUser.id);

  const filteredTransactions = allTransactions.filter((tx) => {
    if (filterType !== 'all') {
      if (filterType === 'deposit' && tx.type !== 'deposit' && tx.type !== 'bonus') return false;
      if (filterType === 'withdrawal' && tx.type !== 'withdrawal' && tx.type !== 'withdrawal_hold' && tx.type !== 'withdrawal_release') return false;
      if (filterType === 'reward' && tx.type !== 'referral_reward') return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q) ||
        (tx.relatedRequestId && tx.relatedRequestId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Type', 'Description', 'Amount', 'Fee', 'Net Amount', 'Balance After', 'Status'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      new Date(tx.createdAt).toISOString(),
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.fee.toFixed(2),
      tx.netAmount.toFixed(2),
      tx.balanceAfter.toFixed(2),
      tx.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SwiftSweeps_Ledger_${currentUser.displayName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Wallet &amp; Financial Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative immutable transaction record maintained by certified treasury engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('topup')}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Top-Up Games</span>
          </button>
          <button
            onClick={() => onNavigateTab('withdrawal')}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
            <span>Cashout</span>
          </button>
        </div>
      </div>

      {/* Financial Health Snapshot Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Withdrawable Cash</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            ${wallet.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Immediately withdrawable to bank/crypto</div>
        </div>

        <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-950/20 shadow-md">
          <div className="flex items-center justify-between text-xs text-amber-300 mb-2">
            <span>Referral Bonus (Game Only)</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono tabular-nums">
            ${(wallet.referralBonusBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-2">Non-cashable. Use to load directly to games</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-[#0E1726] shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Reserved for Cashout</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
            ${wallet.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Held safely in vault while payout is processed</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-[#0E1726] shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Deposits</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-200 font-mono tabular-nums">
            ${wallet.pendingDepositBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Awaiting treasury review or chain confirmation</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0E1726] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Interactive Segmented Filter Controls (allowed per constitution) */}
        <div className="flex items-center gap-1 p-1 bg-[#0A0F1D] rounded-lg overflow-x-auto border border-slate-800">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'deposit', label: 'Deposits & Bonuses' },
            { id: 'withdrawal', label: 'Withdrawals & Holds' },
            { id: 'reward', label: 'Referral Rewards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                filterType === tab.id ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Download CSV statement"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Authoritative Ledger Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div>No matching transactions found.</div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-indigo-400 underline"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Date &amp; ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">Fee</th>
                  <th className="py-3 px-4 text-right">Net Change</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => {
                  const isCredit =
                    tx.type === 'deposit' ||
                    tx.type === 'bonus' ||
                    tx.type === 'referral_reward' ||
                    tx.type === 'withdrawal_release';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-300">
                          {new Date(tx.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">{tx.id}</div>
                      </td>

                      <td className="py-3.5 px-4 capitalize font-medium text-slate-300">
                        {tx.type.replace('_', ' ')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-200">
                        <div>{tx.description}</div>
                        {tx.relatedRequestId && (
                          <div className="text-[10px] font-mono text-indigo-400 mt-0.5">
                            Ref: {tx.relatedRequestId}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                        ${tx.amount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {tx.fee > 0 ? `$${tx.fee.toFixed(2)}` : '—'}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono font-semibold tabular-nums ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-100">
                        ${tx.balanceAfter.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-mono capitalize ${
                            tx.status === 'completed'
                              ? 'text-emerald-400'
                              : tx.status === 'pending'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedTx(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Transaction Details</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-slate-200">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-200">{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Type:</span>
                <span className="capitalize font-medium text-white">{selectedTx.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Description:</span>
                <span className="text-slate-200 text-right">{selectedTx.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Gross Amount:</span>
                <span className="font-mono text-white font-bold">${selectedTx.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Fee Deducted:</span>
                <span className="font-mono text-slate-400">${selectedTx.fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Wallet Balance After:</span>
                <span className="font-mono text-emerald-400 font-bold">${selectedTx.balanceAfter.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="font-mono text-slate-500 text-[10px]">{selectedTx.idempotencyKey}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
