import React from 'react';
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';

interface CustomerMobileNavProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  currentUser: UserProfile;
}

export const CustomerMobileNav: React.FC<CustomerMobileNavProps> = ({
  activeTab,
  onNavigateTab,
  currentUser,
}) => {
  // Check unread support messages for current customer
  const conv = dataService.getConversations().find((c) => c.customerId === currentUser.id);
  const unreadChatCount = conv?.unreadCountCustomer || 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-safe">
      <div className="max-w-xl mx-auto px-0 sm:px-4 sm:mb-4 pointer-events-auto">
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

            {/* Slot 3: CENTER Elevated Support Chat (Floating Android Action Button) */}
            <div className="relative flex flex-col items-center justify-center select-none">
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

                  {/* Unread badge count or indicator */}
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
      </div>
    </div>
  );
};
