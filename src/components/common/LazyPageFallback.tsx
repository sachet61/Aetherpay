import React from 'react';
import { Loader2 } from 'lucide-react';

interface LazyPageFallbackProps {
  label?: string;
}

export const LazyPageFallback: React.FC<LazyPageFallbackProps> = ({
  label = 'Loading view...',
}) => {
  return (
    <div
      className="min-h-[320px] flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#0E1628]/60 border border-slate-800/80 p-8 text-center"
      role="status"
      aria-live="polite"
      data-testid="lazy-page-fallback"
    >
      <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
      <p className="text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
};
