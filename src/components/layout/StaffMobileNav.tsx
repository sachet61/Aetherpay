import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  MessageSquare,
  KeyRound,
  Users,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';

interface StaffMobileNavProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  currentUser: UserProfile;
}

export const StaffMobileNav: React.FC<StaffMobileNavProps> = ({
  activeTab,
  onNavigateTab,
  currentUser: _currentUser,
}) => {
  // Count pending requests and unread customer messages
  const pendingRequests = dataService
    .getPendingRequests()
    .filter((r) => r.status === 'pending').length;

  const convs = dataService.getConversations();
  const unreadChatCount = convs.reduce((acc, c) => acc + (c.unreadCountAgent || 0), 0);

  const navItems = [
    {
      id: 'ops_dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'ops_requests',
      label: 'Requests',
      icon: Inbox,
      badge: pendingRequests,
    },
    {
      id: 'ops_chat',
      label: 'Live Chat',
      icon: MessageSquare,
      badge: unreadChatCount,
    },
    {
      id: 'ops_game_credentials',
      label: 'Accounts',
      icon: KeyRound,
      badge: 0,
    },
    {
      id: 'ops_users',
      label: 'Users',
      icon: Users,
      badge: 0,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-safe md:hidden">
      <div className="max-w-xl mx-auto px-0 sm:px-4 sm:mb-4 pointer-events-auto">
        <nav
          aria-label="Staff Bottom Navigation"
          className="relative bg-[#0A0F1D]/95 sm:bg-[#0E1726]/95 backdrop-blur-xl border-t sm:border border-amber-500/20 sm:rounded-3xl shadow-2xl shadow-black/90 px-2 sm:px-4"
        >
          <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="grid grid-cols-5 items-center h-16 relative">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigateTab(item.id)}
                  className="group min-h-[48px] flex flex-col items-center justify-center text-center transition-all active:scale-95 select-none relative"
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all relative ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-tight mt-0.5 truncate transition-colors ${
                      isActive
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
