import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SwiftSweepsLogo } from './SwiftSweepsLogo';
import { ShieldCheck } from 'lucide-react';
import {
  PreloadTarget,
  preloadAssetPool,
  resolveTargetAssetPlan,
  scheduleDeferredAssetPreload,
} from '../../utils/assetPreloader';

interface StartupSplashProps {
  onComplete?: () => void;
  forceShow?: boolean;
  target?: PreloadTarget;
  catalogIconUrls?: string[];
}

const MIN_SETTLE_DURATION_MS = 420;
const MAX_WAIT_DURATION_MS = 4500;

export const StartupSplash: React.FC<StartupSplashProps> = ({
  onComplete,
  forceShow = false,
  target = 'auth',
  catalogIconUrls,
}) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    try {
      const alreadyShown = sessionStorage.getItem('swiftsweeps_splash_shown');
      return !alreadyShown;
    } catch {
      return true;
    }
  });

  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [statusText, setStatusText] = useState('LOADING GAME PLATFORMS...');
  const assetPercentRef = useRef(0);
  const assetsSettledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const assetPlan = useMemo(
    () => resolveTargetAssetPlan(target, catalogIconUrls),
    [target, catalogIconUrls]
  );

  // Start preloading required display assets immediately; warm remaining off-screen assets in idle time
  useEffect(() => {
    let active = true;
    let cancelDeferred: (() => void) | null = null;
    assetsSettledRef.current = assetPlan.requiredUrls.length === 0;
    assetPercentRef.current = assetPlan.requiredUrls.length === 0 ? 100 : 0;

    void preloadAssetPool(
      assetPlan.requiredUrls,
      (loaded, total, percent) => {
        if (!active) return;
        assetPercentRef.current = percent;
        if (loaded >= total) {
          assetsSettledRef.current = true;
        }
      },
      6
    ).then(() => {
      if (!active) return;
      assetPercentRef.current = 100;
      assetsSettledRef.current = true;
      if (assetPlan.backgroundUrls.length > 0) {
        cancelDeferred = scheduleDeferredAssetPreload(assetPlan.backgroundUrls, 2);
      }
    });

    return () => {
      active = false;
      if (cancelDeferred) {
        cancelDeferred();
      }
    };
  }, [assetPlan]);

  useEffect(() => {
    if (!visible) {
      onCompleteRef.current?.();
      return;
    }

    const startTime = Date.now();
    let displayProgress = 0;
    let exitTimeout: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const readyToFinish =
        elapsed >= MIN_SETTLE_DURATION_MS &&
        (assetsSettledRef.current || elapsed >= MAX_WAIT_DURATION_MS);

      const targetProgress = readyToFinish
        ? 100
        : Math.max(
            assetPercentRef.current,
            Math.min(18, Math.floor((elapsed / 900) * 18))
          );

      // Smoothly ease visual progress toward actual target without jumping backward
      if (displayProgress < targetProgress) {
        const step = Math.max(2, Math.ceil((targetProgress - displayProgress) * 0.35));
        displayProgress = Math.min(targetProgress, displayProgress + step);
      }

      setProgress(displayProgress);

      if (displayProgress < 40) {
        setStatusText('LOADING GAME PLATFORMS...');
      } else if (displayProgress < 95) {
        setStatusText('PREPARING PORTAL ASSETS...');
      } else {
        setStatusText('PORTAL READY');
      }

      if (readyToFinish && displayProgress >= 100) {
        clearInterval(interval);
        setFadingOut(true);
        try {
          sessionStorage.setItem('swiftsweeps_splash_shown', 'true');
        } catch {
          // ignore session storage restrictions
        }
        exitTimeout = setTimeout(() => {
          setVisible(false);
          onCompleteRef.current?.();
        }, 380);
      }
    }, 30);

    return () => {
      clearInterval(interval);
      if (exitTimeout !== null) {
        clearTimeout(exitTimeout);
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      data-testid="startup-splash"
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B14] select-none transition-all duration-300 ease-out motion-reduce:transition-none ${
        fadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-hidden={fadingOut}
    >
      {/* Background radial gold aura effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] bg-gradient-to-tr from-amber-600/15 via-yellow-500/20 to-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative ambient subtle grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Center Cinematic Logo Container */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-sm sm:max-w-md w-full">
        {/* Glowing Logo Frame */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-600/20 rounded-3xl blur-xl transition-all duration-700" />
          <div className="relative p-3 rounded-2xl bg-[#0E1628]/80 border border-amber-500/30 shadow-2xl shadow-amber-500/10 backdrop-blur-md">
            <SwiftSweepsLogo size="xl" showText={true} />
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-[280px] sm:max-w-[340px] flex flex-col items-center gap-2.5">
          {/* Track */}
          <div className="relative w-full h-1.5 sm:h-2 bg-slate-900/90 rounded-full overflow-hidden border border-amber-500/25 p-[1px] shadow-inner">
            {/* Animated Metallic Gold Fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-75 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Unified Status Text & Percentage */}
          <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono tracking-wider text-amber-400/90 pt-1">
            <span className="truncate">{statusText}</span>
            <span className="font-bold tabular-nums shrink-0 ml-2 text-amber-300">
              {progress}%
            </span>
          </div>
        </div>

        {/* Security / Verification Footnote */}
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 font-mono tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>256-BIT ENCRYPTED &bull; INSTANT PAYOUT GATEWAY</span>
        </div>
      </div>
    </div>
  );
};
