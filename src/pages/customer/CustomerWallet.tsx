import React from 'react';
import { UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Gamepad2, Clock, Sparkles } from 'lucide-react';

interface CustomerWalletProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const CustomerWallet: React.FC<CustomerWalletProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
}) => {
  const transactions = dataService.getTransactions(currentUser.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-[#0E1726] border border-amber-500/20 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-amber-400" />
              <span>Player Wallet &amp; Balance</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your game top-up deposits, bonus credits, and redemption cashouts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigateTab('topup')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Add Balance (+30%)</span>
            </button>
            <button
              onClick={() => onNavigateTab('withdrawal')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <ArrowUpFromLine className="w-4 h-4 text-amber-400" />
              <span>Cashout</span>
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-[#0A0F1D] border border-amber-500/30 space-y-2">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>Latest Top-Up Balance Loaded</span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              ${(wallet.lastTopUpAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400">
              Target Game: <strong className="text-amber-300">{wallet.lastTopUpGame || 'Orion Stars Elite'}</strong>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0A0F1D] border border-slate-800 space-y-2">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Referral Bonus Credits</span>
            </div>
            <div className="text-3xl font-extrabold text-amber-300 font-mono">
              ${(wallet.referralBonusBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400">
              Non-cashable game bonus earned from referrals.
            </p>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Transaction History</span>
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 bg-[#0A0F1D]/50 rounded-xl border border-slate-800">
              No transactions recorded yet. Click Add Balance to make your first top-up!
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3.5 rounded-xl bg-[#0A0F1D] border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        tx.type === 'topup' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
                        tx.type === 'withdrawal' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' :
                        'bg-blue-950 text-blue-400 border border-blue-800/60'
                      }`}>
                        {tx.type}
                      </span>
                      <span>{tx.gameName || 'Swift Sweeps Platform'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()} · Ref: {tx.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-bold text-sm ${tx.type === 'withdrawal' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
