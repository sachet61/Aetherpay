import React, { useState, useEffect } from 'react';
import { CashoutFeedItem } from '../../types';
import { dataService } from '../../services/dataService';
import { ArrowUpRight, Flame, Sparkles } from 'lucide-react';

interface LiveCashoutTickerProps {
  className?: string;
  compact?: boolean;
}

export const LiveCashoutTicker: React.FC<LiveCashoutTickerProps> = ({
  className = '',
}) => {
  const [feed, setFeed] = useState<CashoutFeedItem[]>([]);

  const loadFeed = () => {
    // Retrieve existing records maintained in admin settings and database
    const items = dataService.getMixedCashoutFeed(30);
    setFeed(items);
  };

  useEffect(() => {
    loadFeed();

    // Listen for real database/admin updates without generating random artificial payouts
    const handleStateChange = () => loadFeed();
    window.addEventListener('aetherpay_state_changed', handleStateChange);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleStateChange);
    };
  }, []);

  const config = dataService.getAppConfig();
  if (!config.cashoutFeed?.enabled || feed.length === 0) return null;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Duplicate the list to ensure a seamless, uninterrupted infinite CSS marquee loop
  const marqueeItems = [...feed, ...feed];

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0A0F1D] border-y border-amber-500/20 py-2 select-none pause-marquee-hover z-20 ${className}`}
      aria-label="Live Cashouts Ticker"
    >
      <div className="flex items-center w-full">
        {/* Left Fixed Badge: Professional News-Style Live Broadcast Tag */}
        <div className="relative z-10 shrink-0 flex items-center gap-2 pl-3 sm:pl-4 pr-3 py-1 bg-gradient-to-r from-[#0A0F1D] via-[#0E1528] to-[#0E1528] border-r border-amber-500/30 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-amber-400 uppercase font-mono">
              LIVE CASHOUTS
            </span>
          </div>
        </div>

        {/* Gradient edge masks for high-end cinematic fading */}
        <div className="absolute left-[130px] sm:left-[150px] top-0 bottom-0 w-8 bg-gradient-to-r from-[#0A0F1D] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-l from-[#0A0F1D] to-transparent z-10 pointer-events-none" />

        {/* Continuous Horizontal Scrolling News Marquee Track */}
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee flex items-center">
            {marqueeItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-2.5 px-4 text-xs shrink-0 group transition-colors duration-150"
              >
                {/* Player Name */}
                <span className="font-semibold text-slate-200 group-hover:text-white">
                  {item.customerName}
                </span>

                <span className="text-slate-500 text-[11px]">cashed out</span>

                {/* Amount */}
                <span className="inline-flex items-center font-mono font-bold text-emerald-400 tabular-nums">
                  ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <ArrowUpRight className="w-3 h-3 ml-0.5 text-emerald-400" />
                </span>

                {/* Game Title or Vault Tag */}
                <span className="text-[10px] sm:text-[11px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded shadow-xs">
                  {item.gameName || 'Platform Vault'}
                </span>

                {/* Relative Time */}
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatTimeAgo(item.timestamp)}
                </span>

                {/* Glowing news ticker separator */}
                <span className="text-amber-500/40 text-[9px] font-bold ml-1.5">
                  ✦
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
