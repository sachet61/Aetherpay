import React from 'react';
import {
  MessageSquare,
  KeyRound,
  FileText,
  Users,
  LayoutDashboard,
  Shield,
  Headphones,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { dataService } from '../../services/dataService';

interface StaffMobileNavProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  currentUser: UserProfile;
}

export const StaffMobileNav: React.FC<StaffMobileNavProps> = ({
  activeTab,
  onNavigateTab,
  currentUser,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isAgent = currentUser.role === 'agent';

  // Badge counters
  const unreadMessages = dataService.getConversations().reduce(
    (sum, c) => sum + (c.unreadCountStaff || 0),
    0
  );
  const pendingGameRequests = dataService.getPendingGameRequests().length;
  const pendingRequests =
    dataService.getTopUpRequests().filter((t) => t.status === 'submitted' || t.status === 'verifying').length +
    dataService.getWithdrawalRequests().filter((w) => w.status === 'submitted' || w.status === 'processing').length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-safe">
      <div className="max-w-xl mx-auto px-0 sm:px-4 sm:mb-4 pointer-events-auto">
        <nav
          aria-label="Staff Bottom Navigation"
          className="relative bg-[#0A0F1D]/95 sm:bg-[#0E1726]/95 backdrop-blur-xl border-t sm:border border-amber-500/20 sm:rounded-3xl shadow-2xl shadow-black/90 px-2 sm:px-4"
        >
          {/* Subtle top edge specular highlight */}
          <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="grid grid-cols-5 items-center h-18 sm:h-16 relative">
            {/* Slot 1: Support Chat */}
            <button
              onClick={() => onNavigateTab('ops_chat')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none relative"
            >
              <div
                className={`p-1.5 rounded-xl transition-all relative ${
                  activeTab === 'ops_chat'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-105" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'ops_chat'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Support
              </span>
            </button>

            {/* Slot 2: Game IDs */}
            <button
              onClick={() => onNavigateTab('ops_game_credentials')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none relative"
            >
              <div
                className={`p-1.5 rounded-xl transition-all relative ${
                  activeTab === 'ops_game_credentials'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-5 h-5 transition-transform group-hover:scale-105" />
                {pendingGameRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                    {pendingGameRequests}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'ops_game_credentials'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Game IDs
              </span>
            </button>

            {/* Slot 3: Requests Queue */}
            <button
              onClick={() => onNavigateTab('ops_requests')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none relative"
            >
              <div
                className={`p-1.5 rounded-xl transition-all relative ${
                  activeTab === 'ops_requests'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <FileText className="w-5 h-5 transition-transform group-hover:scale-105" />
                {pendingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-800 text-amber-400 border border-amber-600 font-bold text-[9px] rounded-full flex items-center justify-center">
                    {pendingRequests}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'ops_requests'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Requests
              </span>
            </button>

            {/* Slot 4: Users Directory & Governance */}
            <button
              onClick={() => onNavigateTab('ops_users')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  activeTab === 'ops_users'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Users className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'ops_users'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {isAdmin ? 'Users & Roles' : 'Directory'}
              </span>
            </button>

            {/* Slot 5: Overview Dashboard */}
            <button
              onClick={() => onNavigateTab('ops_dashboard')}
              className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none"
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  activeTab === 'ops_dashboard'
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                  activeTab === 'ops_dashboard'
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Overview
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};
