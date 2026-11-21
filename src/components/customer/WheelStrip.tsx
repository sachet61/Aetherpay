import React from 'react';
import { WheelGlyph } from './WheelGlyph';

interface WheelStripProps {
  visible: boolean;
  onOpenWheel: () => void;
}

export const WheelStrip: React.FC<WheelStripProps> = ({
  visible,
  onOpenWheel,
}) => {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onOpenWheel}
      data-testid="dashboard-wheel-strip"
      className="w-full min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl bg-[#0E1726] hover:bg-[#131C2E] border border-amber-500/35 hover:border-amber-400/70 flex items-center justify-between gap-3 text-left transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <WheelGlyph active className="w-6 h-6 shrink-0" />
        <span className="hidden sm:inline text-sm font-semibold text-white truncate">
          Your daily spin is ready
        </span>
        <span className="sm:hidden text-sm font-semibold text-white truncate">
          Spin ready
        </span>
      </span>

      <span className="shrink-0 inline-flex items-center justify-center min-h-[36px] px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm whitespace-nowrap transition-colors">
        Spin now
      </span>
    </button>
  );
};
