import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';
import { SwiftSweepsLogo } from './SwiftSweepsLogo';
import { resolveHydrationPhaseLabel } from '../../services/sessionHydrationUtils';
import {
  preloadAssetPool,
  resolveTargetAssetPlan,
  scheduleDeferredAssetPreload,
} from '../../utils/assetPreloader';

interface SessionHydrationScreenProps {
  role?: UserRole;
  displayName?: string;
  errorMessage?: string | null;
  catalogIconUrls?: string[];
  onRetry: () => void;
  onContinueAnyway: () => void;
}

const SOFT_STAGE_DELAY_MS = 1250;
const FINAL_STAGE_DELAY_MS = 4000;
const TIMEOUT_THRESHOLD_MS = 12000;

export const SessionHydrationScreen: React.FC<SessionHydrationScreenProps> = ({
  role,
  displayName,
  errorMessage,
  catalogIconUrls,
  onRetry,
  onContinueAnyway,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  // Warm customer dashboard visuals (hero banner + top game icons) concurrently while balances hydrate
  useEffect(() => {
    if (role !== 'customer') return;
    let active = true;
    let cancelDeferred: (() => void) | null = null;

    const plan = resolveTargetAssetPlan('customer_dashboard', catalogIconUrls);
    void preloadAssetPool(plan.requiredUrls, undefined, 4).then(() => {
      if (active && plan.backgroundUrls.length > 0) {
        cancelDeferred = scheduleDeferredAssetPreload(plan.backgroundUrls, 2);
      }
    });

    return () => {
      active = false;
      if (cancelDeferred) {
        cancelDeferred();
      }
    };
  }, [role, catalogIconUrls]);

  useEffect(() => {
    setElapsedMs(0);
    const t1 = window.setTimeout(() => setElapsedMs(SOFT_STAGE_DELAY_MS + 100), SOFT_STAGE_DELAY_MS);
    const t2 = window.setTimeout(() => setElapsedMs(FINAL_STAGE_DELAY_MS + 100), FINAL_STAGE_DELAY_MS);
    const t3 = window.setTimeout(() => setElapsedMs(TIMEOUT_THRESHOLD_MS + 100), TIMEOUT_THRESHOLD_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [errorMessage]);

  const timedOut = elapsedMs >= TIMEOUT_THRESHOLD_MS;
  const phaseLabel = resolveHydrationPhaseLabel({
    role,
    elapsedMs,
    timedOut,
    errorMessage,
  });
  const showRecoveryActions = Boolean(errorMessage) || timedOut;

  return (
    <div
      className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col items-center justify-center px-4 py-8"
      role="status"
      aria-live="polite"
      aria-busy={!showRecoveryActions}
      data-testid="session-hydration-screen"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0E1628] border border-slate-800 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
        <SwiftSweepsLogo size="lg" showText={true} />

        <div className="relative flex items-center justify-center w-14 h-14">
          {showRecoveryActions ? (
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-2 border-t-amber-400 border-r-amber-400/40 border-b-transparent border-l-transparent animate-spin" />
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            </>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {displayName ? `Welcome back, ${displayName}` : 'Syncing Your Account'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            {phaseLabel}
          </p>
        </div>

        {errorMessage && (
          <div className="w-full rounded-xl bg-rose-950/40 border border-rose-500/30 px-3.5 py-2.5 text-left text-xs text-rose-200">
            {errorMessage}
          </div>
        )}

        {showRecoveryActions && (
          <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Sync</span>
            </button>
            <button
              type="button"
              onClick={onContinueAnyway}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            >
              Continue Anyway
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Encrypted session &bull; Waiting for authoritative balances</span>
        </div>
      </div>
    </div>
  );
};
