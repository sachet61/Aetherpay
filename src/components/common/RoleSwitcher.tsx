import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { authSessionService } from '../../services/authSessionService';
import { Shield, Headphones, User, ChevronDown, LogOut, CheckCircle2, Clock, Key } from 'lucide-react';

interface AuthenticatedUserMenuProps {
  currentUser: UserProfile;
  onLogout?: () => void;
  onSwitchUser?: (userId: string) => void;
}

export const RoleSwitcher: React.FC<AuthenticatedUserMenuProps> = ({ currentUser, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const session = authSessionService.getActiveSession();

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-amber-400" />;
      case 'agent':
        return <Headphones className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <User className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">Administrator</span>;
      case 'agent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">Support Agent</span>;
      default:
        return currentUser.emailVerified ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">Verified Player</span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Unverified Player
          </span>
        );
    }
  };

  const isVerified = currentUser.role !== 'customer' || Boolean(currentUser.emailVerified);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-colors text-xs font-medium text-slate-200"
        title="Authenticated Session Details"
      >
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isVerified ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          {getRoleIcon(currentUser.role)}
          <span className="font-semibold text-slate-100">{currentUser.displayName.split(' ')[0]}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3">
            {/* Header info */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> AUTHENTICATED SESSION
                </span>
                {getRoleBadge(currentUser.role)}
              </div>

              <div>
                <div className="font-bold text-sm text-white">{currentUser.displayName}</div>
                <div className="text-xs font-mono text-slate-400">{currentUser.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Key className="w-3 h-3 text-indigo-400" />
                  <span>Cookie Token</span>
                </div>
                <div className="flex items-center gap-1 text-right justify-end">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>15m Auto-Timeout</span>
                </div>
              </div>
            </div>

            {/* Session Token Info */}
            {session && (
              <div className="px-2 text-[10px] font-mono text-slate-500 space-y-0.5">
                <div className="truncate">Session: {session.sessionId}</div>
                <div>Status: Active (Encrypted)</div>
              </div>
            )}

            {/* Security Sign Out Action */}
            {onLogout && (
              <div className="pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between text-rose-300 bg-rose-950/30 hover:bg-rose-950/70 border border-rose-900/40 hover:border-rose-800 transition-colors font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out &amp; Invalidate Session</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-normal">Destroys Cookie</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
