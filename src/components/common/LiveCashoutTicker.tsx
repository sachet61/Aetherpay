import React, { useState, useEffect, useRef } from 'react';
import { CashoutFeedItem } from '../../types';
import { dataService } from '../../services/dataService';
import { Flame, CheckCircle2, ArrowUpRight, Zap } from 'lucide-react';

export const LiveCashoutTicker: React.FC = () => {
  const [items, setItems] = useState<CashoutFeedItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshList = () => {
    const list = dataService.getMixedCashoutFeed(15);
    setItems(list);
  };

  useEffect(() => {
    refreshList();

    // Listen for state changes (e.g. withdrawal approved, cashout injected)
    const handleState = () => refreshList();
    window.addEventListener('aetherpay_state_changed', handleState);

    // Active live ticker: Automatically inject simulated live payouts at configured intervals
    const config = dataService.getAppConfig();
    const intervalSec = Math.max(4, Math.min(30, config.cashoutFeed?.intervalSeconds || 7));

    const tickerTimer = setInterval(() => {
      // Injects a fresh live cashout and notifies listeners
      dataService.injectNewFakeCashout();
    }, intervalSec * 1000);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleState);
      clearInterval(tickerTimer);
    };
  }, []);

  const config = dataService.getAppConfig();
  if (config.cashoutFeed?.enabled === false) return null;

  // Duplicate items array to make the infinite continuous marquee loop seamless
  const displayItems = items.length > 0 ? [...items, ...items] : [];

  return (
    <div
      className="relative bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border-y border-emerald-500/25 py-2.5 px-3 overflow-hidden select-none shadow-md backdrop-blur-sm z-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Live Badge */}
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-mono">Live Payouts</span>
        </div>

        {/* Ticker Track */}
        <div className="relative flex-1 overflow-hidden mask-gradient-x" ref={containerRef}>
          {displayItems.length === 0 ? (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Vault payouts stream connecting...</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-8 whitespace-nowrap will-change-transform ${
                isPaused ? 'animate-none' : 'animate-marquee'
              }`}
              style={{
                display: 'inline-flex',
                animation: isPaused ? 'none' : 'marquee 45s linear infinite',
              }}
            >
              {displayItems.map((item, index) => {
                const displayName = item.playerHandle || item.customerName || 'Player';
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="inline-flex items-center gap-2 text-xs bg-slate-950/40 px-3 py-1 rounded-full border border-slate-800/80 hover:border-emerald-500/40 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-bold text-white tracking-wide">{displayName}</span>
                    <span className="text-slate-400 text-[11px]">cashed out</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm tracking-tight flex items-center">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400 inline -mr-0.5" />
                      ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {item.gameName && (
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-800/60 px-1.5 py-0.5 rounded">
                        {item.gameName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Global CSS for seamless continuous horizontal marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
