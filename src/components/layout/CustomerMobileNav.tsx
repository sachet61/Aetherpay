import React from 'react';
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  Headphones,
  Clock,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';
import type { StickyWheelButtonState } from '../../utils/wheelOfLuckUtils';

interface CustomerMobileNavProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  currentUser: UserProfile;
  wheelStickyState?: StickyWheelButtonState;
  onOpenWheel?: () => void;
}

export const CustomerMobileNav: React.FC<CustomerMobileNavProps> = ({
  activeTab,
  onNavigateTab,
  currentUser,
  wheelStickyState,
  onOpenWheel,
}) => {
  const [unreadChatCount, setUnreadChatCount] = React.useState<number>(() => {
    const conv = dataService.getConversations().find((c) => c.customerId === currentUser.id);
    return conv?.unreadCountCustomer || 0;
  });

  // Dynamically sync unread count on real-time events
  React.useEffect(() => {
    const handleSync = () => {
      const conv = dataService.getConversations().find((c) => c.customerId === currentUser.id);
      setUnreadChatCount(conv?.unreadCountCustomer || 0);
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUser.id]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-safe">
      <div className="max-w-xl mx-auto px-0 sm:px-4 sm:mb-4 pointer-events-auto">
        <div className="relative">
          <nav
            aria-label="Bottom Navigation"
            className="relative bg-[#0A0F1D]/95 sm:bg-[#0E1726]/95 backdrop-blur-xl border-t sm:border border-amber-500/20 sm:rounded-3xl shadow-2xl shadow-black/90 px-2 sm:px-4"
          >
          {/* Subtle top edge specular highlight */}
          <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="grid grid-cols-5 items-center h-18 sm:h-16 relative">
            {/* Slot 1: Dashboard / Home */}
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'dashboard'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Dashboard
              </span>
            </button>

            {/* Slot 2: Add Balance / Top-Up */}
            <button
              onClick={() => onNavigateTab('topup')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  activeTab === 'topup'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <ArrowDownToLine className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'topup'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Top-Up
              </span>
            </button>

            {/* Slot 3: CENTER Elevated Support Chat (Floating Action Button with Toast Bubble) */}
            <div className="relative flex flex-col items-center justify-center select-none">
              {/* Animated Toast Bubble over Support Icon */}
              {unreadChatCount > 0 && activeTab !== 'chat' && (
                <div
                  onClick={() => onNavigateTab('chat')}
                  className="absolute -top-14 z-50 whitespace-nowrap px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-extrabold text-[11px] shadow-2xl shadow-rose-950 border border-rose-300/80 flex items-center gap-1.5 animate-bounce cursor-pointer hover:brightness-110 active:scale-95 transition-transform"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                  <span>{unreadChatCount} new {unreadChatCount === 1 ? 'message' : 'messages'}</span>
                  <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-600 border-r border-b border-rose-300/80" />
                </div>
              )}

              <button
                onClick={() => onNavigateTab('chat')}
                className={`relative -top-5 w-14 h-14 rounded-full flex items-center justify-center text-slate-950 shadow-xl transition-all active:scale-95 border-[3.5px] border-[#0A0F1D] sm:border-[#0E1726] ${
                  activeTab === 'chat'
                    ? 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 shadow-amber-500/50 ring-4 ring-amber-500/30'
                    : 'bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 shadow-amber-500/40 hover:brightness-110'
                }`}
                title="Customer Support Chat"
                aria-label="Customer Support Chat"
              >
                <div className="relative flex items-center justify-center">
                  <Headphones className="w-6 h-6 transition-transform hover:scale-105 text-slate-950 font-bold" />

                  {/* Unread badge count indicator */}
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-2.5 -right-3 min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-slate-950 shadow-md animate-pulse">
                      {unreadChatCount}
                    </span>
                  )}
                </div>
              </button>

              <span
                className={`absolute bottom-1 text-[10px] font-medium tracking-tight truncate transition-colors ${
                  activeTab === 'chat'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400'
                }`}
              >
                Support
              </span>
            </div>

            {/* Slot 4: Request Cashout */}
            <button
              onClick={() => onNavigateTab('withdrawal')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  activeTab === 'withdrawal'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <ArrowUpFromLine className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'withdrawal'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Cashout
              </span>
            </button>

            {/* Slot 5: Gaming IDs */}
            <button
              onClick={() => onNavigateTab('game_accounts')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  activeTab === 'game_accounts'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'game_accounts'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Gaming IDs
              </span>
            </button>
          </div>
          </nav>

          {/* Persistent Sticky Wheel of Luck Icon (Ready & Cooldown States) */}
          {wheelStickyState?.visible && onOpenWheel && (
            <button
              type="button"
              onClick={onOpenWheel}
              data-testid="sticky-wheel-of-luck-btn"
              data-wheel-state={wheelStickyState.state}
              aria-label={wheelStickyState.ariaLabel}
              className={`group absolute right-[max(14px,env(safe-area-inset-right))] bottom-[calc(100%+12px)] sm:right-0 sm:bottom-[calc(100%+12px)] md:left-[calc(100%+12px)] md:right-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[clamp(50px,13vw,56px)] h-[clamp(50px,13vw,56px)] sm:w-14 sm:h-14 md:w-[clamp(56px,4.2vw,64px)] md:h-[clamp(56px,4.2vw,64px)] rounded-full flex items-center justify-center bg-[#0B1221]/95 backdrop-blur-md border transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D] ${
                wheelStickyState.state === 'ready'
                  ? 'border-amber-400/85 shadow-[0_0_20px_rgba(245,158,11,0.38)] hover:border-amber-300 hover:shadow-[0_0_26px_rgba(245,158,11,0.55)]'
                  : 'border-amber-500/50 shadow-[0_0_14px_rgba(245,158,11,0.18)] hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.32)]'
              }`}
            >
              {/* Desktop Hover/Focus Tooltip */}
              <span
                role="tooltip"
                className="pointer-events-none hidden md:flex items-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 rounded-lg bg-[#0E1726]/98 border border-amber-500/40 text-amber-100 text-[11px] font-semibold tracking-tight whitespace-nowrap shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-150"
              >
                <span>{wheelStickyState.tooltipLabel}</span>
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0E1726] border-r border-b border-amber-500/40"
                />
              </span>

              {/* Circular Gold Prize Wheel Graphic (scales proportionally with button) */}
              <svg
                viewBox="0 0 44 44"
                className={`w-[82%] h-[82%] transition-transform duration-300 group-hover:rotate-12 ${
                  wheelStickyState.state === 'cooldown' ? 'opacity-90' : 'opacity-100'
                }`}
                aria-hidden="true"
              >
                <circle cx="22" cy="22" r="20" fill="#0B1221" stroke="#F59E0B" strokeWidth="1.5" />
                <g stroke="#0B1221" strokeWidth="0.9">
                  <path d="M22,22 L22,4 A18,18 0 0,1 34.73,9.27 Z" fill="#F59E0B" />
                  <path d="M22,22 L34.73,9.27 A18,18 0 0,1 40,22 Z" fill="#4F46E5" />
                  <path d="M22,22 L40,22 A18,18 0 0,1 34.73,34.73 Z" fill="#10B981" />
                  <path d="M22,22 L34.73,34.73 A18,18 0 0,1 22,40 Z" fill="#D97706" />
                  <path d="M22,22 L22,40 A18,18 0 0,1 9.27,34.73 Z" fill="#0EA5E9" />
                  <path d="M22,22 L9.27,34.73 A18,18 0 0,1 4,22 Z" fill="#7C3AED" />
                  <path d="M22,22 L4,22 A18,18 0 0,1 9.27,9.27 Z" fill="#14B8A6" />
                  <path d="M22,22 L9.27,9.27 A18,18 0 0,1 22,4 Z" fill="#E11D48" />
                </g>
                <circle cx="22" cy="22" r="17.5" fill="none" stroke="#FDE68A" strokeOpacity="0.45" strokeWidth="0.7" />
                <circle cx="22" cy="22" r="5" fill="#FBBF24" stroke="#0B1221" strokeWidth="1.3" />
                <circle cx="22" cy="22" r="2" fill="#0B1221" />
                <polygon points="22,6 19.2,1 24.8,1" fill="#FDE047" stroke="#0B1221" strokeWidth="0.65" />
              </svg>

              {/* Readiness / Cooldown / Error Indicator */}
              {wheelStickyState.state === 'ready' ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-emerald-500 text-slate-950 border-2 border-[#0A0F1D] text-[10px] font-black leading-none flex items-center justify-center shadow-md"
                >
                  {wheelStickyState.badgeText || '1'}
                </span>
              ) : wheelStickyState.state === 'error' ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white border-2 border-[#0A0F1D] text-[10px] font-black leading-none flex items-center justify-center shadow-md"
                >
                  !
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 w-[20px] h-[20px] rounded-full bg-[#0E1726] text-amber-300 border border-amber-500/75 flex items-center justify-center shadow-md"
                >
                  <Clock className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
