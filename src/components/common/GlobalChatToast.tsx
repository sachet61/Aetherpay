import React, { useEffect } from 'react';
import { MessageSquare, X, ArrowRight, Shield, Headphones } from 'lucide-react';

export interface ChatToastData {
  id: string;
  conversationId: string;
  senderName: string;
  senderRole: 'customer' | 'agent' | 'admin' | 'system';
  text: string;
  timestamp: string;
}

interface GlobalChatToastProps {
  toast: ChatToastData | null;
  onClose: () => void;
  onOpenChat: (conversationId: string) => void;
}

export const GlobalChatToast: React.FC<GlobalChatToastProps> = ({
  toast,
  onClose,
  onOpenChat,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isStaff = toast.senderRole === 'admin' || toast.senderRole === 'agent';

  return (
    <aside
      aria-label="New message notification"
      className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300"
    >
      <div className="bg-[#0D1527]/95 border border-amber-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-slate-100 flex items-start gap-3.5 relative overflow-hidden group">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 animate-pulse" />

        {/* Sender Avatar / Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          {toast.senderRole === 'admin' ? (
            <Shield className="w-5 h-5 text-amber-400" />
          ) : toast.senderRole === 'agent' ? (
            <Headphones className="w-5 h-5 text-cyan-400" />
          ) : (
            <MessageSquare className="w-5 h-5 text-indigo-400" />
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-white truncate">{toast.senderName}</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                isStaff
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {isStaff ? 'Support Care' : 'Player'}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-snug">
            {toast.text}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenChat(toast.conversationId);
                onClose();
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 active:scale-95 shadow-md shadow-amber-500/20"
            >
              <span>Reply</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-slate-500">Live Care</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
