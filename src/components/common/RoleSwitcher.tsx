import React, { useState } from 'react';
import { UserProfile, UserRole, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  Shield,
  Headphones,
  User,
  ChevronDown,
  LogOut,
  CheckCircle2,
  Phone,
  Wallet,
  ExternalLink,
  IdCard,
} from 'lucide-react';

interface AuthenticatedUserMenuProps {
  currentUser: UserProfile;
  wallet?: UserWallet;
  onLogout?: () => void;
  onSwitchUser?: (userId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const RoleSwitcher: React.FC<AuthenticatedUserMenuProps> = ({
  currentUser,
  wallet,
  onLogout,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeWallet = wallet || dataService.getWallet(currentUser.id);

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
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
            Administrator
          </span>
        );
      case 'agent':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
            Support Agent
          </span>
        );
      default:
        return currentUser.emailVerified ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            Verified Player
          </span>
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
    <div className="relative inline-block text-left z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-colors text-xs font-medium text-slate-200 cursor-pointer"
        title="Account Details"
      >
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isVerified ? 'bg-emerald-400' : 'bg-amber-400'
              } opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isVerified ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-5 h-5 rounded-full object-cover border border-amber-500/30 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            getRoleIcon(currentUser.role)
          )}
          <span className="font-semibold text-slate-100">{currentUser.displayName.split(' ')[0]}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3.5 z-[70] animate-in fade-in zoom-in-95 duration-100 space-y-3">
            {/* Header profile info */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active Account
                </span>
                {getRoleBadge(currentUser.role)}
              </div>

              <div className="flex items-center gap-3">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-10 h-10 rounded-xl object-cover border border-amber-500/30 shrink-0 shadow"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-white shrink-0">
                    {currentUser.displayName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{currentUser.displayName}</div>
                  <div className="text-xs font-mono text-slate-400 truncate">{currentUser.email}</div>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>User ID</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {currentUser.id.length > 12 ? `${currentUser.id.slice(0, 10)}...` : currentUser.id}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Phone</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {currentUser.phone || 'Not linked'}
                  </span>
                </div>

                {currentUser.role === 'customer' && activeWallet && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Wallet Balance</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${activeWallet.availableBalance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Link to Full Profile */}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (currentUser.role === 'customer') {
                    onNavigateTab('profile');
                  } else {
                    onNavigateTab('ops_users');
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-slate-200 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-colors font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentUser.role === 'customer' ? 'View Full Profile' : 'User Governance'}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {/* Clean Sign Out Action */}
            {onLogout && (
              <div className="pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 text-rose-300 bg-rose-950/30 hover:bg-rose-950/70 border border-rose-900/40 hover:border-rose-800 transition-colors font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
