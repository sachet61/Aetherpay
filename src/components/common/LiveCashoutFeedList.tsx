import React, { useState, useEffect } from 'react';
import { CashoutFeedItem } from '../../types';
import { dataService } from '../../services/dataService';
import { Flame, CheckCircle2, ShieldCheck, ArrowUpRight, Clock } from 'lucide-react';

interface LiveCashoutFeedListProps {
  maxItems?: number;
  showTitle?: boolean;
}

export const LiveCashoutFeedList: React.FC<LiveCashoutFeedListProps> = ({
  maxItems = 8,
  showTitle = true,
}) => {
  const [items, setItems] = useState<CashoutFeedItem[]>([]);

  const refreshList = () => {
    setItems(dataService.getMixedCashoutFeed(maxItems));
  };

  useEffect(() => {
    refreshList();
    const handleState = () => refreshList();
    window.addEventListener('aetherpay_state_changed', handleState);
    return () => window.removeEventListener('aetherpay_state_changed', handleState);
  }, [maxItems]);

  const config = dataService.getAppConfig();
  if (!config.cashoutFeed?.enabled) return null;

  const formatTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden space-y-0">
      {showTitle && (
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Recent Platform Cashouts</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Verified player payouts dispatched from vault</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Live Settlement</span>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-800/60">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-mono font-bold shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {item.customerName}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  <span>{item.methodName}</span>
                  {item.gameName && (
                    <>
                      <span>·</span>
                      <span className="text-slate-500">{item.gameName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                +${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-end gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span>{formatTime(item.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
