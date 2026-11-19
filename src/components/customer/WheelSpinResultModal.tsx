import React from 'react';
import { WheelSpinResponse } from '../../types';
import {
  buildLatestSpinCardViewModel,
  buildWheelWinPresentation,
} from '../../utils/wheelOfLuckUtils';
import {
  CheckCircle2,
  Gamepad2,
  Gift,
  PartyPopper,
  Trophy,
  X,
} from 'lucide-react';

interface WheelSpinResultModalProps {
  isOpen: boolean;
  spinResult: WheelSpinResponse | null;
  onDone: () => void;
  onLoadFreePlay?: () => void;
}

export const WheelSpinResultModal: React.FC<WheelSpinResultModalProps> = ({
  isOpen,
  spinResult,
  onDone,
  onLoadFreePlay,
}) => {
  if (!isOpen || !spinResult) return null;

  const actualReward = Number(spinResult.actualRewardAmount ?? spinResult.spin?.rewardAmount ?? 0);
  const isWin = actualReward > 0;
  const freePlayBalance = Number(spinResult.freePlayBalance ?? 0);

  const presentation = buildWheelWinPresentation({
    actualRewardAmount: actualReward,
    simulatedWinEnabled: Boolean(spinResult.simulatedWinDisplay?.enabled),
    simulatedWinAmount: Number(spinResult.simulatedWinDisplay?.amount ?? 0),
    simulatedWinLabel: spinResult.simulatedWinDisplay?.label,
  });

  const resultVm = buildLatestSpinCardViewModel({
    spin: {
      segmentLabel: spinResult.spin?.segmentLabel,
      rewardAmount: actualReward,
      simulatedWinAmount: Number(spinResult.simulatedWinDisplay?.amount ?? spinResult.spin?.simulatedWinAmount ?? 0),
      createdAt: spinResult.spin?.createdAt,
    },
    simulatedWinDisplay: spinResult.simulatedWinDisplay,
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-spin-result-modal-title"
      data-testid="wheel-spin-result-modal"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onDone}
      />

      <div className="relative z-10 w-full max-w-md max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-2xl border border-amber-500/45 bg-[#0E1726] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-800 bg-[#0A0F1D]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                isWin
                  ? 'bg-amber-500/15 border-amber-500/45 text-amber-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              {isWin ? <PartyPopper className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3
                id="wheel-spin-result-modal-title"
                className="text-base sm:text-lg font-extrabold text-white leading-snug"
              >
                {isWin ? 'Free-Play Reward Credited!' : 'Daily Spin Complete'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 break-words">
                Backend Selected Slice: <span className="font-semibold text-amber-300">{resultVm.segmentLabel}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDone}
            aria-label="Close spin result modal"
            className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmed Actual Reward Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isWin
                ? 'bg-[#0A0F1D] border-emerald-500/40'
                : 'bg-[#0A0F1D] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/90">
              <span className="text-xs font-medium text-slate-400">Actual Reward Selected</span>
              <span className="text-2xl font-extrabold font-mono text-amber-300 tabular-nums">
                ${actualReward.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Reward Type</span>
              <span className="font-semibold text-slate-200 text-right">{resultVm.rewardTypeLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Credited to Free-Play</span>
              <span
                className={`font-mono font-bold tabular-nums text-right ${
                  isWin ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {isWin ? `+$${actualReward.toFixed(2)} Confirmed` : '$0.00 Confirmed'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/90 text-xs">
              <span className="text-slate-300 font-semibold">Updated Free-Play Balance</span>
              <span className="text-base font-extrabold font-mono text-emerald-400 tabular-nums">
                ${freePlayBalance.toFixed(2)}
              </span>
            </div>

            <div className="flex items-start gap-2 pt-1 text-[11px] text-emerald-300/90 leading-snug">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {isWin
                  ? `$${actualReward.toFixed(2)} has been verified and credited to your Free-Play Balance.`
                  : `This spin landed on ${resultVm.segmentLabel}. No Free-Play credits were added; your Free-Play Balance remains $${freePlayBalance.toFixed(2)}.`}
              </span>
            </div>
          </div>

          {/* Strictly Separated Simulated Display Block */}
          {presentation.promotionalDisplay.visible && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/25 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Promotional Showcase</span>
                </div>
                <span className="text-[10px] font-mono font-extrabold tracking-wide text-amber-300 uppercase">
                  SIMULATED — NOT CREDITED
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-slate-400 break-words">
                  {presentation.promotionalDisplay.label}
                </span>
                <span className="font-mono font-bold text-slate-300 tabular-nums shrink-0">
                  ${presentation.promotionalDisplay.amount.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Simulated promotional display only — never credited to your Free-Play or cash balance ($0.00 balance impact).
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onDone}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              Done
            </button>
            {freePlayBalance > 0 && onLoadFreePlay && (
              <button
                type="button"
                onClick={onLoadFreePlay}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Load Free-Play (${freePlayBalance.toFixed(2)})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
