import React from 'react';
import { Wifi } from 'lucide-react';

export const RealtimeSyncBadge: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[10px] text-emerald-400 font-mono">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <Wifi className="w-3 h-3 text-emerald-400" />
      <span>Live</span>
    </div>
  );
};
