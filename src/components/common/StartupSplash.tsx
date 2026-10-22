import React, { useState, useEffect, useRef } from 'react';
import { SwiftSweepsLogo } from './SwiftSweepsLogo';
import { ShieldCheck, Database, Layers } from 'lucide-react';
import { preloadAssetPool, CORE_ASSET_URLS, getCachedImagesCount } from '../../utils/assetPreloader';

interface StartupSplashProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({
  onComplete,
  forceShow = false,
}) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    try {
      // Check if already shown in the current browser session
      const alreadyShown = sessionStorage.getItem('swiftsweeps_splash_shown');
      return !alreadyShown;
    } catch {
      return true;
    }
  });

  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [statusText, setStatusText] = useState('INITIALIZING SECURE VAULT...');
  const [cachedAssets, setCachedAssets] = useState(0);
  const preloadProgressRef = useRef(0);

  // Background preload initiates immediately on mount to fill the client cache pool
  useEffect(() => {
    preloadAssetPool(CORE_ASSET_URLS, (loaded, total, percent) => {
      preloadProgressRef.current = percent;
      setCachedAssets(loaded);
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      if (onComplete) onComplete();
      return;
    }

    const startTime = Date.now();
    const minDuration = 1600; // 1.6s animation for crisp cinematic startup

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const timePercent = Math.min(100, Math.floor((elapsed / minDuration) * 100));
      const assetPercent = preloadProgressRef.current;

      // Smooth blended progress between timer and real asset preloading
      const currentProgress = Math.min(
        100,
        Math.max(timePercent, Math.floor((timePercent * 0.4) + (assetPercent * 0.6)))
      );
      setProgress(currentProgress);

      if (currentProgress < 25) {
        setStatusText('INITIALIZING SECURE VAULT...');
      } else if (currentProgress < 70) {
        setStatusText(`CACHING PLATFORMS & ASSETS (${preloadProgressRef.current}%)...`);
      } else if (currentProgress < 95) {
        setStatusText('SYNCHRONIZING 24/7 LIVE CASHOUT FEED...');
      } else {
        setStatusText('SYSTEM READY & ASSETS CACHED');
      }

      if (elapsed >= minDuration && currentProgress >= 100) {
        clearInterval(interval);
        // Start smooth fade-out exit transition
        setFadingOut(true);
        try {
          sessionStorage.setItem('swiftsweeps_splash_shown', 'true');
        } catch {
          // ignore session storage restrictions
        }
        setTimeout(() => {
          setVisible(false);
          if (onComplete) onComplete();
        }, 400); // 400ms CSS fade-out duration
      }
    }, 25);

    return () => clearInterval(interval);
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B14] select-none transition-all duration-400 ease-out ${
        fadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-hidden={fadingOut}
    >
      {/* Background radial gold aura effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] bg-gradient-to-tr from-amber-600/15 via-yellow-500/20 to-amber-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative ambient subtle grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Center Cinematic Logo Container */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-sm sm:max-w-md w-full">
        {/* Glowing Logo Frame */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-600/20 rounded-3xl blur-xl transition-all duration-700 animate-pulse" />
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
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Real-time Status Text & Percentage */}
          <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono tracking-wider text-amber-400/90 pt-1">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
              <span className="truncate">{statusText}</span>
            </span>
            <span className="font-bold tabular-nums shrink-0 ml-2 text-amber-300">
              {progress}%
            </span>
          </div>

          {/* Asset Cache Metric Indicator */}
          {cachedAssets > 0 && (
            <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Client Memory Cache: {cachedAssets} / {CORE_ASSET_URLS.length} assets ready</span>
            </div>
          )}
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
