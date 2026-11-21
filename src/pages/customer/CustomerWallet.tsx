import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  buildUnifiedWalletActivity,
  filterUnifiedWalletActivity,
  getActivityStatusMeta,
  UnifiedWalletActivityItem,
  WalletActivityFilter,
} from '../../services/walletActivityUtils';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Download,
  Clock,
  Shield,
  Sparkles,
  X,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';

interface CustomerWalletProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string) => void;
}

const CATEGORY_LABELS: Record<UnifiedWalletActivityItem['category'], string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  referral: 'Referral',
  other: 'Bonus / Transfer',
};

export const CustomerWallet: React.FC<CustomerWalletProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<WalletActivityFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<UnifiedWalletActivityItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
  }, [filterType, searchTerm]);

  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem]);

  const isHydrating = dataService.getIsHydrating();
  const topups = dataService.getTopUpRequests(currentUser.id);
  const withdrawals = dataService.getWithdrawalRequests(currentUser.id);
  const transactions = dataService.getTransactions(currentUser.id);

  const unifiedActivity = useMemo(
    () =>
      buildUnifiedWalletActivity({
        customerId: currentUser.id,
        topups,
        withdrawals,
        transactions,
      }),
    [currentUser.id, topups, withdrawals, transactions]
  );

  const categoryCounts = useMemo(
    () => ({
      all: unifiedActivity.length,
      deposit: unifiedActivity.filter((i) => i.category === 'deposit').length,
      withdrawal: unifiedActivity.filter((i) => i.category === 'withdrawal').length,
      referral: unifiedActivity.filter((i) => i.category === 'referral').length,
    }),
    [unifiedActivity]
  );

  const filteredItems = useMemo(
    () =>
      filterUnifiedWalletActivity(unifiedActivity, {
        category: filterType,
        searchTerm,
      }),
    [unifiedActivity, filterType, searchTerm]
  );

  const handleExportCSV = () => {
    const headers = [
      'Activity ID',
      'Created At',
      'Updated At',
      'Category',
      'Title',
      'Game',
      'Method',
      'Base Amount',
      'Bonus Amount',
      'Fee Amount',
      'Final / Net Amount',
      'Status',
      'Reference / Payout Ref',
      'Reviewer',
      'Review Notes',
    ];
    const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = filteredItems.map((item) => [
      escapeCsv(item.id),
      escapeCsv(new Date(item.createdAt).toISOString()),
      escapeCsv(new Date(item.updatedAt).toISOString()),
      escapeCsv(CATEGORY_LABELS[item.category]),
      escapeCsv(item.title),
      escapeCsv(item.targetGameName || ''),
      escapeCsv(item.methodName || ''),
      item.baseAmount.toFixed(2),
      item.bonusAmount.toFixed(2),
      item.feeAmount.toFixed(2),
      item.netAmount.toFixed(2),
      escapeCsv(getActivityStatusMeta(item.status).label),
      escapeCsv(item.payoutReference || item.referenceId || ''),
      escapeCsv(item.reviewerName || ''),
      escapeCsv(item.reviewNotes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `SwiftSweeps_Activity_${currentUser.displayName.replace(/\s+/g, '_')}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Wallet &amp; Activity History</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('topup')}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Top-Up Games</span>
          </button>
          <button
            type="button"
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
            ${(wallet.reservedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Held safely in vault while payout is processed</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-[#0E1726] shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Deposits</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-200 font-mono tabular-nums">
            ${(wallet.pendingDepositBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Awaiting treasury review or chain confirmation</div>
        </div>
      </div>

      {/* Wheel of Luck Free-Play Balance Strip */}
      {(wallet.freePlayBalance || 0) > 0 && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Wheel of Luck Free-Play Balance</span>
                <span className="font-mono text-emerald-400 font-extrabold">
                  ${(wallet.freePlayBalance || 0).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/75">
                Non-cashable promotional credits. Load directly into any active Game ID to play.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('game_accounts')}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap shrink-0 transition-colors"
          >
            Load Free-Play to Game
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0E1726] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          className="flex items-center gap-1 p-1 bg-[#0A0F1D] rounded-lg overflow-x-auto border border-slate-800"
          role="tablist"
          aria-label="Wallet activity categories"
        >
          {(
            [
              { id: 'all', label: `All Activity (${categoryCounts.all})` },
              { id: 'deposit', label: `Deposits (${categoryCounts.deposit})` },
              { id: 'withdrawal', label: `Withdrawals (${categoryCounts.withdrawal})` },
              { id: 'referral', label: `Referrals (${categoryCounts.referral})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filterType === tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search wallet activity"
              placeholder="Search ID, game, method, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Download CSV statement"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Unified Activity Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        {isHydrating && unifiedActivity.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2.5">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            <span>Loading your deposits, withdrawals, and referral activity...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2.5">
            <div>
              {unifiedActivity.length === 0
                ? 'No deposits, withdrawals, or referral transactions recorded yet.'
                : 'No activity records match your current filter or search query.'}
            </div>
            {(searchTerm || filterType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                className="text-amber-400 hover:text-amber-300 underline font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {filteredItems.slice(0, visibleCount).map((item) => {
                const statusMeta = getActivityStatusMeta(item.status);
                const isRejectedOrCancelled =
                  item.status === 'rejected' || item.status === 'cancelled';

                return (
                  <div
                    key={`${item.sourceType}_${item.id}_mobile`}
                    className="p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{item.title}</div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">
                          {CATEGORY_LABELS[item.category]}
                          {item.targetGameName ? ` · ${item.targetGameName}` : ''}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950 ${
                          isRejectedOrCancelled
                            ? 'text-slate-500 line-through'
                            : item.direction === 'credit'
                            ? 'text-emerald-400'
                            : item.direction === 'debit'
                            ? 'text-slate-100'
                            : 'text-amber-300'
                        }`}
                      >
                        {item.direction === 'credit' && !isRejectedOrCancelled ? '+' : ''}
                        {item.direction === 'debit' && !isRejectedOrCancelled ? '-' : ''}$
                        {item.netAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Date &amp; Ref</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Details &amp; Notes</th>
                    <th className="py-3 px-4 text-right">Base</th>
                    <th className="py-3 px-4 text-right">Bonus / Fee</th>
                    <th className="py-3 px-4 text-right">Final / Net</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.slice(0, visibleCount).map((item) => {
                    const statusMeta = getActivityStatusMeta(item.status);
                    const isRejectedOrCancelled =
                      item.status === 'rejected' || item.status === 'cancelled';

                    const categoryTextClass =
                      item.category === 'deposit'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30'
                        : item.category === 'withdrawal'
                        ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30'
                        : item.category === 'referral'
                        ? 'text-amber-300 border-amber-500/30 bg-amber-950/30'
                        : 'text-slate-300 border-slate-700 bg-slate-950';

                    return (
                      <tr
                        key={`${item.sourceType}_${item.id}`}
                        onClick={() => setSelectedItem(item)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-slate-200">
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                            {item.id}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase tracking-wide ${categoryTextClass}`}
                          >
                            {CATEGORY_LABELS[item.category]}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-200 min-w-[210px]">
                          <div className="font-semibold text-white">{item.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                          {(item.payoutReference || (item.referenceId && item.referenceId !== item.id)) && (
                            <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                              Ref: {item.payoutReference || item.referenceId}
                            </div>
                          )}
                          {item.reviewNotes && (
                            <div
                              className={`text-[10px] mt-1 flex items-start gap-1 ${
                                isRejectedOrCancelled ? 'text-rose-300' : 'text-slate-400'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{item.reviewNotes}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                          ${item.baseAmount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          {item.bonusAmount > 0 ? (
                            <span className="text-amber-300">+${item.bonusAmount.toFixed(2)} bonus</span>
                          ) : item.feeAmount > 0 ? (
                            <span className="text-rose-300">-${item.feeAmount.toFixed(2)} fee</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td
                          className={`py-3.5 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            isRejectedOrCancelled
                              ? 'text-slate-500 line-through'
                              : item.direction === 'credit'
                              ? 'text-emerald-400'
                              : item.direction === 'debit'
                              ? 'text-slate-100'
                              : 'text-amber-300'
                          }`}
                        >
                          {item.direction === 'credit' && !isRejectedOrCancelled ? '+' : ''}
                          {item.direction === 'debit' && !isRejectedOrCancelled ? '-' : ''}$
                          {item.netAmount.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                            aria-label={`View details for ${item.title} ${item.id}`}
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {filteredItems.length > visibleCount && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 25)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <span>Load More Activity (+25)</span>
            </button>
          </div>
        )}
      </div>

      {/* Activity Audit Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0E1726] border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                  {CATEGORY_LABELS[selectedItem.category]} Audit Record
                </div>
                <h3 id="activity-modal-title" className="text-base font-bold text-white mt-0.5">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close activity details"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold ${
                    getActivityStatusMeta(selectedItem.status).badgeClass
                  }`}
                >
                  {getActivityStatusMeta(selectedItem.status).label}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono text-slate-200 text-right break-all">{selectedItem.id}</span>
              </div>

              {selectedItem.referenceId && selectedItem.referenceId !== selectedItem.id && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Reference ID:</span>
                  <span className="font-mono text-cyan-400 text-right break-all">
                    {selectedItem.referenceId}
                  </span>
                </div>
              )}

              {selectedItem.payoutReference && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Payout Hash / Ref:</span>
                  <span className="font-mono text-emerald-400 text-right break-all">
                    {selectedItem.payoutReference}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Created:</span>
                <span className="font-mono text-slate-200">
                  {new Date(selectedItem.createdAt).toLocaleString()}
                </span>
              </div>

              {selectedItem.updatedAt && selectedItem.updatedAt !== selectedItem.createdAt && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Last Updated:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(selectedItem.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedItem.targetGameName && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">
                    {selectedItem.category === 'withdrawal' ? 'Source Game:' : 'Target Game:'}
                  </span>
                  <span className="text-amber-300 font-semibold text-right">
                    {selectedItem.targetGameName}
                    {selectedItem.targetGameUsername ? ` (${selectedItem.targetGameUsername})` : ''}
                  </span>
                </div>
              )}

              {selectedItem.methodName && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Method:</span>
                  <span className="text-slate-200 text-right">{selectedItem.methodName}</span>
                </div>
              )}

              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Base Amount:</span>
                <span className="font-mono text-white font-bold tabular-nums">
                  ${selectedItem.baseAmount.toFixed(2)}
                </span>
              </div>

              {selectedItem.bonusAmount > 0 && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Bonus Applied:</span>
                  <span className="font-mono text-amber-300 font-semibold tabular-nums">
                    +${selectedItem.bonusAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {selectedItem.feeAmount > 0 && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Fee Deducted:</span>
                  <span className="font-mono text-rose-300 tabular-nums">
                    -${selectedItem.feeAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">
                  {selectedItem.category === 'deposit'
                    ? 'Total Credited:'
                    : selectedItem.category === 'withdrawal'
                    ? 'Net Payout:'
                    : 'Net Amount:'}
                </span>
                <span className="font-mono text-emerald-400 font-bold tabular-nums">
                  ${selectedItem.netAmount.toFixed(2)}
                </span>
              </div>

              {selectedItem.balanceAfter !== undefined && selectedItem.balanceAfter > 0 && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Wallet Balance After:</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    ${selectedItem.balanceAfter.toFixed(2)}
                  </span>
                </div>
              )}

              {selectedItem.reviewerName && (
                <div className="flex justify-between gap-4 py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Reviewed By:</span>
                  <span className="text-slate-200">{selectedItem.reviewerName}</span>
                </div>
              )}

              {selectedItem.reviewNotes && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    selectedItem.status === 'rejected' || selectedItem.status === 'cancelled'
                      ? 'bg-rose-950/50 border-rose-800/70 text-rose-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[10px] uppercase tracking-wider opacity-80">
                    {selectedItem.status === 'rejected' ? 'Rejection / Review Note' : 'Staff / Request Notes'}
                  </div>
                  <p className="leading-relaxed">{selectedItem.reviewNotes}</p>
                </div>
              )}

              {selectedItem.timeline && selectedItem.timeline.length > 0 && (
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Status Timeline
                  </div>
                  <div className="space-y-2">
                    {selectedItem.timeline.map((entry, idx) => (
                      <div key={idx} className="text-[11px] border-l-2 border-amber-500/40 pl-2.5">
                        <div className="flex items-center justify-between text-slate-300 font-medium">
                          <span className="capitalize">{entry.status.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-400">{entry.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedItem(null)}
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
