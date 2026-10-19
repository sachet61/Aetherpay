import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { CashoutFeedItem } from '../../types';
import { dataService } from '../../services/dataService';
import { Flame, CheckCircle2, ArrowUpRight, Zap } from 'lucide-react';

const LiveCashoutTickerComponent: React.FC = () => {
  const [items, setItems] = useState<CashoutFeedItem[]>(() => {
    return dataService.getMixedCashoutFeed(20);
  });

  const latestListRef = useRef<CashoutFeedItem[]>(items);
  const hasPendingUpdateRef = useRef<boolean>(false);

  // Sync background updates safely without interrupting ongoing CSS animations
  const queueFreshCashouts = useCallback(() => {
    const freshList = dataService.getMixedCashoutFeed(20);
    latestListRef.current = freshList;
    hasPendingUpdateRef.current = true;
  }, []);

  useEffect(() => {
    // Listen for state changes (e.g. withdrawal approved, cashout injected)
    const handleStateChange = (e: Event) => {
      // Buffer latest cashout list without triggering mid-animation React re-renders
      queueFreshCashouts();
    };

    window.addEventListener('aetherpay_state_changed', handleStateChange);
    window.addEventListener('storage', handleStateChange);

    // Gently simulate new live payout activity in the background
    const config = dataService.getAppConfig();
    const intervalSec = Math.max(12, Math.min(30, config.cashoutFeed?.intervalSeconds || 15));

    const backgroundTimer = setInterval(() => {
      dataService.injectNewFakeCashout();
    }, intervalSec * 1000);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleStateChange);
      window.removeEventListener('storage', handleStateChange);
      clearInterval(backgroundTimer);
    };
  }, [queueFreshCashouts]);

  // Seamless update hook: swap item data when the marquee animation completes a 360-degree loop
  const handleAnimationIteration = () => {
    if (hasPendingUpdateRef.current && latestListRef.current.length > 0) {
      setItems(latestListRef.current);
      hasPendingUpdateRef.current = false;
    }
  };

  const config = dataService.getAppConfig();
  if (config.cashoutFeed?.enabled === false) return null;

  const renderTrackItems = (prefix: string) => {
    return items.map((item, index) => {
      const displayName = item.playerHandle || item.customerName || 'Player';
      return (
        <div
          key={`${prefix}-${item.id}-${index}`}
          className="inline-flex items-center gap-2 text-xs bg-slate-950/70 hover:bg-slate-900/95 px-3.5 py-1.5 rounded-full border border-slate-800/80 hover:border-emerald-500/50 transition-colors shrink-0 shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold text-white tracking-wide">{displayName}</span>
          <span className="text-slate-400 text-[11px]">cashed out</span>
          <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm tracking-tight flex items-center">
            <ArrowUpRight className="w-3 h-3 text-emerald-400 inline -mr-0.5" />
            ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {item.gameName && (
            <span className="text-[10px] text-slate-400 font-medium bg-slate-800/70 border border-slate-700/50 px-1.5 py-0.5 rounded">
              {item.gameName}
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative bg-gradient-to-r from-emerald-950/80 via-[#0A0F1D] to-emerald-950/80 border-y border-emerald-500/20 py-2 px-3 overflow-hidden select-none shadow-md backdrop-blur-md z-20 pause-marquee ticker-container">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Live Badge */}
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-mono hidden sm:inline">Live Payouts</span>
          <span className="font-mono sm:hidden">Live</span>
        </div>

        {/* Continuous Seamless Marquee Viewport */}
        <div className="relative flex-1 overflow-hidden mask-marquee-edges">
          {items.length === 0 ? (
            <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Connecting live payout stream...</span>
            </div>
          ) : (
            <div
              className="animate-marquee-seamless flex items-center"
              onAnimationIteration={handleAnimationIteration}
            >
              {/* Primary Track Half (0% to 50%) */}
              <div className="flex items-center gap-4 shrink-0 pr-4">
                {renderTrackItems('track1')}
              </div>

              {/* Exact Identical Clone Half (50% to 100%) */}
              <div className="flex items-center gap-4 shrink-0 pr-4" aria-hidden="true">
                {renderTrackItems('track2')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LiveCashoutTicker = memo(LiveCashoutTickerComponent);
