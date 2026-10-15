import React, { useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  User,
  Shield,
  Smartphone,
  Mail,
  Calendar,
  KeyRound,
  CheckCircle2,
  Lock,
  LogOut,
  RefreshCw,
} from 'lucide-react';

interface CustomerProfileProps {
  currentUser: UserProfile;
  wallet: UserWallet;
  onNavigateTab: (tab: string) => void;
  onSwitchUser: (userId: string) => void;
  onLogout?: () => void;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  currentUser,
  wallet,
  onNavigateTab,
  onSwitchUser,
  onLogout,
}) => {
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const handleSimulateSendOTP = () => {
    setOtpSent(true);
    setSuccessNote('Demo OTP code [998822] generated. Enter it to verify.');
    setTimeout(() => setSuccessNote(null), 5000);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode === '998822' || otpCode.length === 6) {
      setPhoneVerified(true);
      setOtpSent(false);
      setSuccessNote('Phone number verified successfully with 2FA protection active!');
      setTimeout(() => setSuccessNote(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Profile &amp; Security Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal verification credentials, two-factor authentication, and login sessions.
        </p>
      </div>

      {successNote && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successNote}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-white font-bold text-xl font-mono">
              {currentUser.displayName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{currentUser.displayName}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="font-mono text-indigo-400">ID: {currentUser.id}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Tier-2 KYC Verified
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Available Vault</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">
              ${wallet.availableBalance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Registered Email</span>
            </div>
            <div className="font-medium text-white font-mono">{currentUser.email}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mobile Phone Number</span>
            </div>
            <div className="font-medium text-white font-mono flex items-center justify-between">
              <span>{currentUser.phone || '+1 (555) 234-8901'}</span>
              <span className="text-[10px] text-emerald-400 font-bold">Verified</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Account Created</span>
            </div>
            <div className="font-medium text-white font-mono">
              {new Date(currentUser.createdAt).toLocaleDateString([], {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Referral Attribution</span>
            </div>
            <div className="font-medium text-white font-mono">
              {currentUser.referredBy ? `Attributed to ${currentUser.referredBy}` : 'Organic Player'}
            </div>
          </div>
        </div>
      </div>

      {/* Security & 2FA Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Security &amp; Phone OTP Verification</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Phone number SMS verification protects cashout requests from unauthorized access. In demo mode, simulated OTP codes are instantly provided.
        </p>

        {!otpSent ? (
          <button
            onClick={handleSimulateSendOTP}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
          >
            Re-verify Phone via SMS OTP
          </button>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              placeholder="Enter 6-digit OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs"
            >
              Verify OTP
            </button>
          </form>
        )}
      </div>

      {/* Account Operations & Reset */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Session &amp; Testing Controls</h3>
        <p className="text-xs text-slate-400">
          Sign out of your player session or reset all demo balances and requests back to initial factory state.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out of Player Session</span>
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm('Reset all demo state to original seeded data?')) {
                dataService.resetToSeedData();
              }
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data to Initial Seed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
