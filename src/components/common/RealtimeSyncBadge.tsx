import React from 'react';
import { Wifi } from 'lucide-react';

interface RealtimeSyncBadgeProps {
  label?: string;
  className?: string;
}

export const RealtimeSyncBadge: React.FC<RealtimeSyncBadgeProps> = ({
  label = 'Live',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-[11px] text-emerald-300 font-medium whitespace-nowrap shrink-0 ${className}`}
      title="Realtime server synchronization active"
    >
      <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shrink-0" />
      <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
      <span>{label}</span>
    </div>
  );
};
