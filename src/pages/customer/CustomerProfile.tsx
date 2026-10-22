import React, { useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import { authSessionService } from '../../services/authSessionService';
import { EmailOtpModal } from '../../components/auth/EmailOtpModal';
import {
  User,
  Shield,
  ShieldAlert,
  AlertCircle,
  Smartphone,
  Mail,
  Calendar,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
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
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const handleOtpSuccess = (updatedUser: UserProfile) => {
    setShowOtpModal(false);
    dataService.registerUser(updatedUser);
    authSessionService.updateUserProfile(updatedUser);
    window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'user_verified' } }));
    setSuccessNote('Email address successfully verified via OTP!');
    setTimeout(() => setSuccessNote(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Profile &amp; Security Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal verification credentials, account security, and login sessions.
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
                {currentUser.emailVerified ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Tier-2 KYC Verified
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                    <ShieldAlert className="w-3 h-3" /> Unverified Player (Email Pending)
                  </span>
                )}
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
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Registered Email</span>
              </div>
              {currentUser.emailVerified ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Verified User
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800">
                  <AlertCircle className="w-3 h-3" /> Unverified Player
                </span>
              )}
            </div>
            <div className="font-medium text-white font-mono">{currentUser.email}</div>

            {!currentUser.emailVerified && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
                  title="Verify email with 6-digit OTP code"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify by OTP / Enter OTP</span>
                </button>
              </div>
            )}
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

      {showOtpModal && (
        <EmailOtpModal
          email={currentUser.email}
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onSuccess={handleOtpSuccess}
        />
      )}
    </div>
  );
};
