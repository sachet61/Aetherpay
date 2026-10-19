import React, { useState, useEffect } from 'react';
import { dataService, RealtimeSyncStatus, SyncHealthInfo } from '../../services/dataService';
import { Radio, RefreshCw, Moon, Zap, ShieldCheck } from 'lucide-react';

interface RealtimeSyncBadgeProps {
  compact?: boolean;
}

export const RealtimeSyncBadge: React.FC<RealtimeSyncBadgeProps> = ({ compact = false }) => {
  const [health, setHealth] = useState<SyncHealthInfo>(() => dataService.getSyncHealth());
  const [showTooltip, setShowTooltip] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const handleSyncStateChange = (e: any) => {
      if (e.detail) {
        setHealth(e.detail);
      } else {
        setHealth(dataService.getSyncHealth());
      }
    };

    window.addEventListener('aetherpay_sync_state_changed', handleSyncStateChange);
    return () => {
      window.removeEventListener('aetherpay_sync_state_changed', handleSyncStateChange);
    };
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManualSyncing(true);
    await dataService.syncDelta();
    setTimeout(() => setIsManualSyncing(false), 600);
  };

  const getStatusConfig = (status: RealtimeSyncStatus) => {
    switch (status) {
      case 'connected':
        return {
          label: 'Realtime Live',
          shortLabel: 'Live',
          badgeClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
          dotClass: 'bg-emerald-400 shadow-emerald-400/50',
          icon: <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />,
          desc: 'Connected to Supabase Realtime WebSocket stream. Egress reduction active (~98% savings).',
        };
      case 'syncing':
        return {
          label: 'Catching Up...',
          shortLabel: 'Syncing',
          badgeClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
          dotClass: 'bg-amber-400 animate-ping',
          icon: <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />,
          desc: 'Targeted delta catch-up query running for recent mutations.',
        };
      case 'sleeping':
        return {
          label: 'Sleeping',
          shortLabel: 'Sleeping',
          badgeClass: 'bg-slate-900/90 border-slate-700/60 text-slate-400',
          dotClass: 'bg-slate-500',
          icon: <Moon className="w-3 h-3 text-slate-400" />,
          desc: 'Browser tab is in background. All queries and sync suspended (0 egress transmitted).',
        };
      case 'reconnecting':
      case 'disconnected':
      default:
        return {
          label: 'Reconnecting...',
          shortLabel: 'Offline',
          badgeClass: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
          dotClass: 'bg-rose-400',
          icon: <RefreshCw className="w-3 h-3 text-rose-400 animate-spin" />,
          desc: 'Re-establishing WebSocket stream with Supabase.',
        };
    }
  };

  const cfg = getStatusConfig(health.status);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono font-medium transition-all cursor-pointer ${cfg.badgeClass}`}
        title="Click for Realtime Sync & Egress Savings Details"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
        <span className="hidden sm:inline">{cfg.label}</span>
        <span className="sm:hidden">{cfg.shortLabel}</span>
      </button>

      {/* Floating Info Tooltip / Card */}
      {showTooltip && (
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Realtime Engine</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              -98% Egress
            </span>
          </div>

          <div className="py-2.5 space-y-1.5 text-[11px] leading-relaxed text-slate-300">
            <p>{cfg.desc}</p>
            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60 font-mono text-[10px]">
              <span>Last Sync:</span>
              <span className="text-slate-200">
                {health.lastSyncAt ? new Date(health.lastSyncAt).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
              <span>Background Pause:</span>
              <span className="text-emerald-400 font-semibold">Active (0 B)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="w-full mt-1 py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-amber-400 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'Checking Updates...' : 'Manual Catch-Up'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
