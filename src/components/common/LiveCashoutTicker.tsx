import React, { useState, useEffect } from 'react';
import { CashoutFeedItem } from '../../types';
import { dataService } from '../../services/dataService';
import { Flame, CheckCircle2, ArrowUpRight, Zap } from 'lucide-react';

export const LiveCashoutTicker: React.FC = () => {
  const [items, setItems] = useState<CashoutFeedItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const refreshFeed = () => {
    const list = dataService.getMixedCashoutFeed(25);
    setItems(list);
  };

  useEffect(() => {
    refreshFeed();

    // Listen to real-time events from state changes and new injected payouts
    const handleUpdate = () => refreshFeed();
    window.addEventListener('aetherpay_state_changed', handleUpdate);
    window.addEventListener('cashout_feed_updated', handleUpdate);

    // Periodic check to inject new simulated payouts and keep marquee fresh
    const interval = setInterval(() => {
      if (!isPaused) {
        try {
          dataService.injectNewFakeCashout();
        } catch {
          // fallback if not available
        }
        refreshFeed();
      }
    }, 9000);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleUpdate);
      window.removeEventListener('cashout_feed_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [isPaused]);

  const config = dataService.getAppConfig();
  if (config.cashoutFeed?.enabled === false || items.length === 0) {
    return null;
  }

  // Duplicate items for continuous seamless horizontal ticker loop
  const displayItems = [...items, ...items];

  return (
    <div
      className="relative w-full bg-slate-950/90 border-b border-emerald-500/20 backdrop-blur-md overflow-hidden z-10 py-1.5 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center">
        {/* Live Badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-950/90 to-slate-900 border-r border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide z-10 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="hidden sm:inline font-mono tracking-wider">LIVE PAYOUTS</span>
        </div>

        {/* Marquee Track */}
        <div className="flex overflow-hidden w-full mask-gradient">
          <div
            className={`flex items-center gap-6 whitespace-nowrap animate-marquee ${
              isPaused ? '[animation-play-state:paused]' : ''
            }`}
          >
            {displayItems.map((item, idx) => {
              const name = item.customerName || item.playerHandle || 'Verified Player';
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 text-xs transition-all shadow-sm group"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="font-medium text-slate-200 group-hover:text-white">
                    {name}
                  </span>
                  <span className="text-[11px] text-slate-400">won on</span>
                  <span className="font-semibold text-amber-300 text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {item.gameName}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 flex items-center">
                    +${Number(item.amount).toFixed(2)}
                    <ArrowUpRight className="w-3 h-3 ml-0.5 text-emerald-400 opacity-70" />
                  </span>
                  {item.method && (
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                      {item.method}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
