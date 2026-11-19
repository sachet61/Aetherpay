import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UserProfile,
  UserWallet,
  WheelEligibilityState,
  WheelSpinResponse,
  WheelStatusResponse,
} from '../../types';
import { dataService } from '../../services/dataService';
import {
  DEFAULT_WHEEL_OF_LUCK_CONFIG,
  buildLatestSpinCardViewModel,
  computeServerAnchoredRemainingMs,
  computeWheelTargetRotation,
  deriveWheelUiState,
  formatCountdownDuration,
  formatWheelSliceLines,
} from '../../utils/wheelOfLuckUtils';
import { WheelSpinResultModal } from './WheelSpinResultModal';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Gamepad2,
  Gift,
  History,
  Loader2,
  PartyPopper,
  RefreshCw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';

interface WheelOfLuckModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  wallet: UserWallet;
  wheelStatus: WheelStatusResponse | null;
  statusFetchedAtMs?: number;
  isLoadingStatus: boolean;
  statusError: string | null;
  onStatusUpdated: (next: WheelStatusResponse) => void;
  onRefreshStatus: () => Promise<void>;
  onNavigateTab: (tab: string, meta?: any) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function renderSliceVectorIcon(rewardAmount: number, disabledSlice: boolean) {
  const strokeColor = disabledSlice ? '#94A3B8' : '#FEF3C7';
  const fillAccent = rewardAmount >= 50 ? '#FBBF24' : rewardAmount >= 20 ? '#C4B5FD' : '#FDE68A';

  if (rewardAmount <= 0) {
    // Clean circular refresh icon
    return (
      <g transform="translate(0, -118)" fill="none" stroke={strokeColor} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -6 -2 A 6.5 6.5 0 1 1 -5 4" />
        <polyline points="-8 -5 -6 -1.5 -2.5 -2.5" />
      </g>
    );
  }

  if (rewardAmount >= 50) {
    // Crown icon for Grand Play
    return (
      <g transform="translate(0, -118)" fill={fillAccent} stroke="#78350F" strokeWidth="1.1" strokeLinejoin="round">
        <path d="M -8 5 L -9 -4 L -4 0 L 0 -6 L 4 0 L 9 -4 L 8 5 Z" />
        <rect x="-8" y="6" width="16" height="2.2" rx="1" />
      </g>
    );
  }

  if (rewardAmount >= 20) {
    // Faceted gem icon
    return (
      <g transform="translate(0, -118)" stroke={strokeColor} strokeWidth="1.4" strokeLinejoin="round">
        <polygon points="-5,-6 5,-6 9,-1 0,8 -9,-1" fill="rgba(255,255,255,0.18)" />
        <polyline points="-9,-1 9,-1" fill="none" />
        <polyline points="-5,-6 0,8 5,-6" fill="none" />
      </g>
    );
  }

  if (rewardAmount >= 10) {
    // Stacked coins icon
    return (
      <g transform="translate(0, -118)" fill="rgba(253,230,138,0.22)" stroke={fillAccent} strokeWidth="1.5">
        <ellipse cx="0" cy="-3.5" rx="7" ry="3" />
        <path d="M -7 -3.5 L -7 0.5 C -7 2.2 7 2.2 7 0.5 L 7 -3.5" />
        <path d="M -7 0.5 L -7 4.5 C -7 6.2 7 6.2 7 4.5 L 7 0.5" />
      </g>
    );
  }

  // Gift box icon for standard Free Play slices
  return (
    <g transform="translate(0, -118)" fill="rgba(255,255,255,0.16)" stroke={strokeColor} strokeWidth="1.4" strokeLinejoin="round">
      <rect x="-7" y="-2" width="14" height="9" rx="1.5" />
      <rect x="-8" y="-5" width="16" height="3.2" rx="1" />
      <line x1="0" y1="-5" x2="0" y2="7" />
      <path d="M 0 -5 C -3 -9 -6 -7 -3 -5" fill="none" />
      <path d="M 0 -5 C 3 -9 6 -7 3 -5" fill="none" />
    </g>
  );
}

export const WheelOfLuckModal: React.FC<WheelOfLuckModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  wallet,
  wheelStatus,
  statusFetchedAtMs,
  isLoadingStatus,
  statusError,
  onStatusUpdated,
  onRefreshStatus,
  onNavigateTab,
}) => {
  const config = wheelStatus?.config || dataService.getAppConfig().wheelOfLuck || DEFAULT_WHEEL_OF_LUCK_CONFIG;
  const segments = config.segments.length >= 2 ? config.segments : DEFAULT_WHEEL_OF_LUCK_CONFIG.segments;

  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<WheelSpinResponse | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const spinTimeoutRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const preSpinBalanceRef = useRef<number | null>(null);
  const autoExpiredRefreshRef = useRef<string | null>(null);
  const fallbackAnchorRef = useRef<number>(Date.now());

  useEffect(() => {
    if (statusFetchedAtMs && Number.isFinite(statusFetchedAtMs)) {
      fallbackAnchorRef.current = statusFetchedAtMs;
    } else if (wheelStatus) {
      fallbackAnchorRef.current = Date.now();
    }
  }, [statusFetchedAtMs, wheelStatus]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    return undefined;
  }, []);

  const eligibility: WheelEligibilityState | null = wheelStatus?.eligibility ?? null;
  const effectiveFetchedAtMs = statusFetchedAtMs ?? fallbackAnchorRef.current;

  const liveFreePlayBalance = Number(
    wheelStatus?.freePlayBalance ?? wallet.freePlayBalance ?? 0
  );
  const freePlayBalance =
    isSpinning && preSpinBalanceRef.current !== null
      ? preSpinBalanceRef.current
      : liveFreePlayBalance;

  useEffect(() => {
    if (!isOpen) {
      setIsResultModalOpen(false);
      return;
    }
    setSpinError(null);
    setNowMs(Date.now());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isResultModalOpen) {
          setIsResultModalOpen(false);
          return;
        }
        if (!isSpinning) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSpinning, isResultModalOpen, onClose]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
    };
  }, []);

  // Anchored purely against server-reported remainingMs + client elapsed delta
  // so client clock skew never triggers premature unlocks or "00h 00m 00s".
  const liveRemainingMs = useMemo(
    () =>
      computeServerAnchoredRemainingMs({
        eligibility,
        fetchedAtClientMs: effectiveFetchedAtMs,
        nowMs,
      }),
    [eligibility, effectiveFetchedAtMs, nowMs]
  );

  const wheelUi = useMemo(
    () =>
      deriveWheelUiState({
        enabled: Boolean(config.enabled),
        isLoading: isLoadingStatus,
        hasStatus: Boolean(wheelStatus),
        statusError,
        isSpinning,
        eligibility,
        remainingMs: liveRemainingMs,
      }),
    [config.enabled, isLoadingStatus, wheelStatus, statusError, isSpinning, eligibility, liveRemainingMs]
  );

  useEffect(() => {
    if (!isOpen || wheelUi.uiState !== 'cooldown') return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, wheelUi.uiState]);

  // If a real server cooldown ticks to zero while the modal is open, re-verify
  // once with the backend rather than displaying 00h 00m 00s or unlocking locally.
  useEffect(() => {
    const nextAt = eligibility?.nextEligibleAt;
    if (
      isOpen &&
      wheelUi.uiState === 'unavailable' &&
      nextAt &&
      !isLoadingStatus &&
      !statusError &&
      autoExpiredRefreshRef.current !== nextAt
    ) {
      autoExpiredRefreshRef.current = nextAt;
      void onRefreshStatus();
    }
  }, [isOpen, wheelUi.uiState, eligibility?.nextEligibleAt, isLoadingStatus, statusError, onRefreshStatus]);

  if (!isOpen) return null;

  const canSpinNow = wheelUi.canSpin;
  const spinAnimationDurationMs = prefersReducedMotion ? 260 : 4550;

  const handleSpinClick = async () => {
    if (inFlightRef.current || isSpinning || !canSpinNow) return;
    inFlightRef.current = true;
    preSpinBalanceRef.current = liveFreePlayBalance;
    setSpinError(null);
    setSpinResult(null);
    setIsResultModalOpen(false);
    setIsSpinning(true);

    const idempotencyKey = `wspin_${currentUser.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await dataService.spinWheelOfLuck(idempotencyKey);

    if (!res.success || !res.data) {
      inFlightRef.current = false;
      preSpinBalanceRef.current = null;
      setIsSpinning(false);
      setSpinError(res.error || 'Unable to complete spin. Please try again.');
      if (res.eligibility && wheelStatus) {
        onStatusUpdated({
          ...wheelStatus,
          eligibility: res.eligibility,
        });
      }
      return;
    }

    const spinData = res.data;
    const targetRotation = computeWheelTargetRotation({
      currentRotationDeg: wheelRotation,
      segmentIndex: spinData.segmentIndex,
      segmentCount: segments.length,
      extraSpins: prefersReducedMotion ? 3 : 6,
    });

    setWheelRotation(targetRotation);

    if (spinTimeoutRef.current !== null) {
      window.clearTimeout(spinTimeoutRef.current);
    }
    spinTimeoutRef.current = window.setTimeout(() => {
      spinTimeoutRef.current = null;
      inFlightRef.current = false;
      preSpinBalanceRef.current = null;
      setIsSpinning(false);
      setSpinResult(spinData);
      setIsResultModalOpen(true);

      const previousSpins = wheelStatus?.recentSpins || [];
      const nextSpins = [
        spinData.spin,
        ...previousSpins.filter((s) => s.id !== spinData.spin.id),
      ].slice(0, 10);

      onStatusUpdated({
        config,
        eligibility: spinData.eligibility,
        freePlayBalance: spinData.freePlayBalance,
        availableBalance: spinData.availableBalance,
        referralBonusBalance: spinData.referralBonusBalance,
        recentSpins: nextSpins,
        latestSpin: spinData.spin,
      });
    }, spinAnimationDurationMs);
  };

  const confirmedSpinResult = !isSpinning ? spinResult : null;
  const lastKnownSpin = confirmedSpinResult?.spin || wheelStatus?.latestSpin || null;
  const latestSpinVm = lastKnownSpin
    ? buildLatestSpinCardViewModel({
        spin: lastKnownSpin,
        simulatedWinDisplay: confirmedSpinResult?.simulatedWinDisplay ?? null,
      })
    : null;
  const recentSpins = wheelStatus?.recentSpins || [];
  const sliceAngle = 360 / segments.length;
  const rimStudCount = 16;
  const activeErrorMessage = spinError || statusError;

  const statusBadge = (() => {
    switch (wheelUi.uiState) {
      case 'loading':
        return {
          label: 'Checking...',
          className: 'bg-slate-900 border-slate-700 text-slate-300',
        };
      case 'spinning':
        return {
          label: 'Spinning',
          className: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        };
      case 'eligible':
        return {
          label: 'Available',
          className: 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300',
        };
      case 'cooldown':
        return {
          label: 'Cooldown',
          className: 'bg-amber-950/80 border-amber-600/50 text-amber-300',
        };
      case 'disabled':
        return {
          label: 'Disabled',
          className: 'bg-slate-900 border-slate-700 text-slate-400',
        };
      case 'error':
        return {
          label: 'Error',
          className: 'bg-rose-950/80 border-rose-700/60 text-rose-300',
        };
      default:
        return {
          label: eligibility?.nextEligibleAt ? 'Verifying...' : 'Unavailable',
          className: 'bg-slate-900 border-slate-700 text-slate-300',
        };
    }
  })();

  const compactSliceScale = segments.length > 12 ? 0.72 : segments.length > 8 ? 0.84 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          if (!isSpinning) onClose();
        }}
      />

      <div className="relative z-10 w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0A0F1D] shadow-2xl">
        {/* Non-overlapping Top Modal Header (strictly outside scrollable body so wheel never clips underneath) */}
        <div className="shrink-0 z-20 px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-slate-800/90 bg-[#0E1726]">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="wheel-modal-title"
                  className="text-sm sm:text-lg font-extrabold text-white leading-tight break-words"
                >
                  {config.title}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-snug mt-0.5 break-words">
                  {config.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden sm:block px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/35 text-right">
                <div className="text-[9px] uppercase tracking-wider font-mono text-emerald-300/85">
                  Free-Play Balance
                </div>
                <div className="text-base font-extrabold font-mono text-emerald-400 tabular-nums">
                  ${freePlayBalance.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                disabled={isSpinning}
                onClick={onClose}
                aria-label="Close Wheel of Luck modal"
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="sm:hidden mt-2 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/35 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-300/90">
              Free-Play Balance
            </span>
            <span className="text-sm font-extrabold font-mono text-emerald-400 tabular-nums">
              ${freePlayBalance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Dedicated Scrollable Modal Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3.5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Simulated Promotional Showcase Strip (Strictly Display-Only) */}
          {config.simulatedWinDisplay?.enabled && config.simulatedWinDisplay.amount > 0 && (
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-gradient-to-r from-amber-950/55 via-[#141D33] to-indigo-950/45 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-amber-200 break-words">
                      {config.simulatedWinDisplay.label || 'Featured Showcase Prize (Simulated Demo)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300 uppercase tracking-wide shrink-0">
                      SIMULATED — NOT CREDITED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Promotional display teaser only — actual credited winnings match the landed wheel slice.
                  </p>
                </div>
              </div>
              <div className="font-mono text-base sm:text-xl font-extrabold text-amber-300 tabular-nums shrink-0 sm:text-right pl-10 sm:pl-0">
                ${config.simulatedWinDisplay.amount.toFixed(2)}
              </div>
            </div>
          )}

          {/* Main 2-Column Stage: Left Wheel | Right Status & Result Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            {/* Left Column: Isolated Wheel Stage cleanly positioned below header */}
            <div className="lg:col-span-6 relative z-10 isolate flex flex-col items-center justify-center pt-5 pb-1 sm:py-2">
              <div className="relative w-[236px] h-[236px] min-[375px]:w-[260px] min-[375px]:h-[260px] sm:w-[324px] sm:h-[324px] mx-auto flex items-center justify-center shrink-0">
                {/* Subtle Warm Ambient Halo (kept contained inside wheel bounds) */}
                <div
                  aria-hidden="true"
                  className="absolute inset-6 rounded-full bg-amber-500/15 blur-2xl pointer-events-none"
                />

                {/* Fixed 12 O'Clock Metallic Gold Pointer (above bezel, inside isolated wheel context) */}
                <div
                  aria-hidden="true"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_4px_10px_rgba(245,158,11,0.55)]"
                >
                  <svg width="32" height="30" viewBox="0 0 34 32">
                    <defs>
                      <linearGradient id="wheelPointerGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FEF08A" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#B45309" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="17,30 3,4 31,4"
                      fill="url(#wheelPointerGold)"
                      stroke="#451A03"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <circle cx="17" cy="9" r="3" fill="#FFFBEB" opacity="0.85" />
                  </svg>
                </div>

                {/* Static Outer Gold Bezel + Rim Studs */}
                <svg
                  aria-hidden="true"
                  viewBox="-176 -176 352 352"
                  className="absolute inset-0 w-full h-full z-20 pointer-events-none"
                >
                  <defs>
                    <linearGradient id="wheelBezelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDE68A" />
                      <stop offset="35%" stopColor="#F59E0B" />
                      <stop offset="70%" stopColor="#B45309" />
                      <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="0"
                    cy="0"
                    r="164"
                    fill="none"
                    stroke="url(#wheelBezelGold)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="158"
                    fill="none"
                    stroke="#451A03"
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  {Array.from({ length: rimStudCount }).map((_, idx) => {
                    const angle = (idx * 360) / rimStudCount;
                    const pos = polarToCartesian(0, 0, 164, angle);
                    return (
                      <circle
                        key={idx}
                        cx={pos.x}
                        cy={pos.y}
                        r="3"
                        fill={idx % 2 === 0 ? '#FEF9C3' : '#FCD34D'}
                        stroke="#78350F"
                        strokeWidth="0.9"
                      />
                    );
                  })}
                </svg>

                {/* Rotating Prize Disc (Compositor-Only Transform) */}
                <div className="relative w-[91%] h-[91%] rounded-full overflow-hidden shadow-[0_0_28px_rgba(0,0,0,0.65)] z-10">
                  <svg
                    viewBox="-156 -156 312 312"
                    className="w-full h-full rounded-full bg-slate-950 will-change-transform"
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isSpinning
                        ? prefersReducedMotion
                          ? 'transform 0.25s ease-out'
                          : 'transform 4.5s cubic-bezier(0.12, 0.85, 0.2, 1)'
                        : 'transform 0.3s ease-out',
                    }}
                    aria-label="Wheel of Luck prize wheel"
                  >
                    <defs>
                      <radialGradient id="wheelSliceSheen" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
                        <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
                      </radialGradient>
                      <filter id="wheelLabelShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#020617" floodOpacity="0.8" />
                      </filter>
                    </defs>

                    {segments.map((seg, idx) => {
                      const startAngle = idx * sliceAngle;
                      const endAngle = startAngle + sliceAngle;
                      const midAngle = startAngle + sliceAngle / 2;
                      const path = describeSectorPath(0, 0, 156, startAngle, endAngle);
                      const disabledSlice = seg.enabled === false;
                      const lines = formatWheelSliceLines(seg);

                      return (
                        <g key={seg.id || idx} opacity={disabledSlice ? 0.42 : 1}>
                          <path
                            d={path}
                            fill={seg.color || '#1E293B'}
                            stroke="#F59E0B"
                            strokeOpacity="0.55"
                            strokeWidth="1.5"
                          />
                          <path d={path} fill="url(#wheelSliceSheen)" pointerEvents="none" />
                          <g
                            transform={`rotate(${midAngle}) scale(${compactSliceScale})`}
                            filter="url(#wheelLabelShadow)"
                          >
                            {renderSliceVectorIcon(Number(seg.rewardAmount || 0), disabledSlice)}
                            <text
                              x="0"
                              y="-91"
                              fill="#FFFFFF"
                              fontSize={lines.primary.length > 6 ? '12.5' : '15'}
                              fontWeight="800"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                            >
                              {lines.primary}
                            </text>
                            <text
                              x="0"
                              y="-74"
                              fill="#E2E8F0"
                              fontSize="9.5"
                              fontWeight="600"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                            >
                              {lines.secondary}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Prominent Central Interactive Spin / Lock Hub */}
                <button
                  type="button"
                  onClick={handleSpinClick}
                  disabled={!canSpinNow}
                  aria-label={
                    isSpinning
                      ? 'Spinning Wheel of Luck'
                      : canSpinNow
                      ? 'Spin Daily Wheel Now'
                      : `Wheel Spin Unavailable (${statusBadge.label})`
                  }
                  className={`absolute z-30 w-16 h-16 min-[375px]:w-[74px] min-[375px]:h-[74px] sm:w-24 sm:h-24 rounded-full border-[3px] sm:border-[3.5px] flex flex-col items-center justify-center transition-all shadow-[0_8px_24px_rgba(0,0,0,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    canSpinNow
                      ? 'border-amber-400 bg-gradient-to-b from-[#1A2540] via-[#0F172A] to-[#080D1A] text-amber-300 hover:scale-105 hover:border-amber-300 active:scale-95 cursor-pointer'
                      : 'border-amber-600/50 bg-[#0B1221] text-slate-400 cursor-not-allowed opacity-95'
                  }`}
                >
                  {isSpinning ? (
                    <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400 animate-spin" />
                  ) : canSpinNow ? (
                    <Crown className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400 mb-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mb-0.5" />
                  )}
                  <span className="text-[11px] sm:text-sm font-extrabold tracking-widest uppercase">
                    {isSpinning ? 'WAIT' : canSpinNow ? 'SPIN' : wheelUi.uiState === 'cooldown' ? 'WAIT' : 'LOCK'}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Compact Responsive Side Panel (Daily Spin Status + Your Last Spin / Result) */}
            <div className="lg:col-span-6 space-y-3.5 sm:space-y-4 min-w-0">
              {/* Card 1: Daily Spin Status */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0E1726] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Daily Spin Status</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold shrink-0 ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* State Body */}
                {wheelUi.uiState === 'loading' && (
                  <div className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    <span>Verifying your 24-hour spin eligibility...</span>
                  </div>
                )}

                {wheelUi.uiState === 'error' && activeErrorMessage && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs space-y-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-snug break-words">{activeErrorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onRefreshStatus()}
                      className="w-full py-2.5 rounded-lg bg-rose-900/75 hover:bg-rose-800/85 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Status</span>
                    </button>
                  </div>
                )}

                {wheelUi.uiState === 'eligible' && (
                  <div className="p-3 rounded-xl bg-emerald-950/45 border border-emerald-500/35 flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-emerald-300">Spin available now!</div>
                      <div className="text-[11px] sm:text-xs text-slate-300">
                        Come back in 24h for your next spin.
                      </div>
                    </div>
                  </div>
                )}

                {wheelUi.uiState === 'spinning' && (
                  <div className="p-3 rounded-xl bg-amber-950/45 border border-amber-500/40 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-spin shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-amber-200">Spinning the Wheel of Luck...</div>
                      <div className="text-[11px] sm:text-xs text-slate-300">
                        Crediting your server-selected Free-Play slice.
                      </div>
                    </div>
                  </div>
                )}

                {wheelUi.uiState === 'cooldown' && (
                  <div className="p-3 rounded-xl bg-[#0A0F1D] border border-amber-500/25 space-y-1">
                    <div className="text-[11px] text-slate-400">Next Daily Spin Unlocks In:</div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-amber-300 tabular-nums">
                      {formatCountdownDuration(liveRemainingMs)}
                    </div>
                    {eligibility?.nextEligibleAt && (
                      <div className="text-[11px] font-mono text-slate-400 break-words">
                        Available at {new Date(eligibility.nextEligibleAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {wheelUi.uiState === 'disabled' && (
                  <div className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 text-xs text-slate-300">
                    {eligibility?.reason || 'Wheel of Luck is currently paused by administration.'}
                  </div>
                )}

                {wheelUi.uiState === 'unavailable' && (
                  <div className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-300">
                    <span className="break-words">
                      {eligibility?.nextEligibleAt
                        ? 'Verifying updated eligibility...'
                        : eligibility?.reason || 'Unable to confirm spin eligibility right now.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onRefreshStatus()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold shrink-0 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Spin Error when otherwise eligible */}
                {spinError && wheelUi.uiState !== 'error' && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="break-words">{spinError}</span>
                  </div>
                )}

                {/* Primary Spin Action CTA (omitted in error state so there is one unambiguous Retry action) */}
                {wheelUi.uiState !== 'error' && (
                  <button
                    type="button"
                    disabled={!canSpinNow}
                    onClick={handleSpinClick}
                    className="w-full min-h-[44px] py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-45 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                  >
                    {isSpinning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Spinning Wheel...</span>
                      </>
                    ) : wheelUi.uiState === 'disabled' ? (
                      <span>Wheel Currently Disabled</span>
                    ) : wheelUi.uiState === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Checking Eligibility...</span>
                      </>
                    ) : canSpinNow ? (
                      <>
                        <Gift className="w-4 h-4" />
                        <span>Spin Daily Wheel Now</span>
                      </>
                    ) : wheelUi.showCountdown ? (
                      <>
                        <Clock className="w-4 h-4" />
                        <span className="tabular-nums">
                          Come Back in {formatCountdownDuration(liveRemainingMs)}
                        </span>
                      </>
                    ) : (
                      <span>Spin Unavailable</span>
                    )}
                  </button>
                )}
              </div>

              {/* Card 2: Your Last Spin / Newly Landed Result (Clean Vertical Stacked Layout) */}
              <div
                data-testid={confirmedSpinResult ? 'wheel-spin-result' : undefined}
                className="p-3.5 sm:p-5 rounded-2xl bg-[#0E1726] border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{confirmedSpinResult ? 'Latest Spin Result' : 'Your Last Spin'}</span>
                  </span>
                  {recentSpins.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setHistoryExpanded((prev) => !prev)}
                      className="min-h-[32px] text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                    >
                      <span>{historyExpanded ? 'Hide History' : `History (${recentSpins.length})`}</span>
                      {historyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {latestSpinVm ? (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      latestSpinVm.isWinningSpin
                        ? 'bg-[#0A0F1D] border-emerald-500/35'
                        : 'bg-[#0A0F1D] border-slate-800'
                    }`}
                  >
                    {/* Line 1: Outcome & Landed Slice (full width, no truncation collisions) */}
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
                        {latestSpinVm.outcomeHeadline}
                      </div>
                    </div>

                    {/* Line 2: Actual Reward Amount */}
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-slate-400">Actual Reward</span>
                      <span className="text-xl font-extrabold font-mono text-amber-300 tabular-nums shrink-0">
                        ${latestSpinVm.actualRewardAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Line 3: Reward Type & Credit Status */}
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-slate-400 shrink-0">Reward Type</span>
                        <span className="font-semibold text-slate-200 text-right break-words">
                          {latestSpinVm.rewardTypeLabel}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] font-medium ${
                          latestSpinVm.isWinningSpin ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {latestSpinVm.creditStatusLabel}
                      </div>
                    </div>

                    {/* Line 4: Simulated Display Amount (strictly separated, if applicable) */}
                    {latestSpinVm.showSimulatedDisplay && (
                      <div className="p-2.5 rounded-lg bg-slate-950/90 border border-amber-500/25 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400">Simulated Display</span>
                          <span className="text-[10px] font-mono font-extrabold text-amber-300 uppercase tracking-wide">
                            {latestSpinVm.simulatedBadgeLabel}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-200 tabular-nums">
                            ${latestSpinVm.simulatedDisplayAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            $0.00 balance impact
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Line 5: Spin Timestamp */}
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 break-words">
                      Spun on: {new Date(latestSpinVm.createdAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 text-xs text-slate-400 text-center leading-relaxed">
                    No previous spins recorded yet. Spin once every 24 hours to earn instant Free-Play credits!
                  </div>
                )}

                {historyExpanded && recentSpins.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 divide-y divide-slate-800/60">
                    {recentSpins.slice(0, 5).map((spin) => (
                      <div key={spin.id} className="py-2 flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-white break-words">{spin.segmentLabel}</span>
                          <span className="text-[10px] font-mono text-slate-500 ml-2">
                            {new Date(spin.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold tabular-nums shrink-0 ${
                            spin.rewardAmount > 0 ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {spin.rewardAmount > 0 ? `+$${spin.rewardAmount.toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Celebration / Action Footer Strip (Only displays spin success after confirmed credit) */}
          <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#141A33] via-[#171E3B] to-[#111827] border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                {confirmedSpinResult ? (
                  <PartyPopper className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                ) : (
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-amber-200 break-words">
                  {confirmedSpinResult
                    ? confirmedSpinResult.actualRewardAmount > 0
                      ? 'Enjoy your Free Play!'
                      : 'Daily spin complete!'
                    : freePlayBalance > 0
                    ? 'Free-Play Balance Ready to Use'
                    : 'Non-Cashable Promotional Free Play'}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                  {confirmedSpinResult
                    ? confirmedSpinResult.actualRewardAmount > 0
                      ? `Credited $${confirmedSpinResult.actualRewardAmount.toFixed(2)} directly to your Free-Play Balance.`
                      : 'No Free-Play credits won this round — come back in 24 hours.'
                    : freePlayBalance > 0
                    ? `Load up to $${freePlayBalance.toFixed(2)} directly into any active Game ID.`
                    : 'Free-Play credits can be loaded into active Game IDs and remain non-cashable.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {freePlayBalance > 0 ? (
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    onClose();
                    onNavigateTab('game_accounts');
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md whitespace-nowrap"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Load Free-Play (${freePlayBalance.toFixed(2)})</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={onClose}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-white font-bold text-xs transition-colors whitespace-nowrap"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Confirmed Spin Result Modal */}
      <WheelSpinResultModal
        isOpen={isResultModalOpen && Boolean(confirmedSpinResult)}
        spinResult={confirmedSpinResult}
        onDone={() => setIsResultModalOpen(false)}
        onLoadFreePlay={() => {
          setIsResultModalOpen(false);
          onClose();
          onNavigateTab('game_accounts');
        }}
      />
    </div>
  );
};
