import React, { useState } from 'react';
import { UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import { authSessionService } from '../../services/authSessionService';
import { EmailOtpModal } from '../../components/auth/EmailOtpModal';
import { IOSPwaInstallModal } from '../../components/common/IOSPwaInstallModal';
import { webPushClient } from '../../services/webPushClient';
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
  Bell,
  BellRing,
  Sparkles,
  Camera,
  Loader2,
} from 'lucide-react';
import { storageService } from '../../services/storageService';

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
  const [isPushActive, setIsPushActive] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const res = await storageService.uploadAvatar(file, currentUser.id);
      setIsUploadingAvatar(false);

      if (res.success && res.url) {
        const updatedUser: UserProfile = {
          ...currentUser,
          avatarUrl: res.url,
        };
        dataService.registerUser(updatedUser);
        authSessionService.updateUserProfile(updatedUser);
        window.dispatchEvent(new CustomEvent('aetherpay_state_changed', { detail: { key: 'avatar_updated' } }));
        setSuccessNote('Profile picture uploaded and compressed via WebP transform!');
        setTimeout(() => setSuccessNote(null), 5000);
      } else {
        alert(res.error || 'Failed to update profile picture.');
      }
    } catch (err: any) {
      setIsUploadingAvatar(false);
      alert(err.message || 'Error uploading profile picture.');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined' && webPushClient.isPushSupported()) {
      webPushClient.hasActiveSubscription().then((active) => {
        setIsPushActive(active || Notification.permission === 'granted');
        if (active || Notification.permission === 'granted') {
          webPushClient.autoSyncIfGranted(currentUser).catch(() => {});
        }
      });
    }
  }, [currentUser]);

  const handleEnablePush = async () => {
    if (webPushClient.isIOS() && !webPushClient.isStandalone()) {
      setShowIOSGuide(true);
      return;
    }
    setPushLoading(true);
    setPushStatusMsg(null);
    const res = await webPushClient.subscribeToPushNotifications(currentUser);
    setPushLoading(false);
    if (res.success) {
      setIsPushActive(true);
      setPushStatusMsg({
        text: `Background alerts activated successfully on ${webPushClient.getBrowserName()}!`,
      });
    } else {
      setPushStatusMsg({ text: res.error || 'Failed to activate notifications', isError: true });
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    setPushStatusMsg(null);
    const res = await webPushClient.sendTestAlert(currentUser);
    setPushLoading(false);
    if (res.success) {
      setPushStatusMsg({ text: res.message });
    } else {
      setPushStatusMsg({ text: res.message, isError: true });
    }
  };

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
            <div className="relative group">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-white font-bold text-xl font-mono overflow-hidden cursor-pointer relative shadow-lg group-hover:border-indigo-400 transition-all"
                title="Click to change profile picture"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{currentUser.displayName.charAt(0)}</span>
                )}

                {/* Camera Overlay on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-300">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  ) : (
                    <Camera className="w-5 h-5 drop-shadow" />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md border-2 border-slate-900 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                title="Upload Photo"
              >
                {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
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

      {/* Background Push Notifications Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Background Push Notifications</h3>
              <p className="text-xs text-slate-400">
                Messenger-style heads-up alerts on Android &amp; iPhone even when app is closed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isPushActive
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800'
              }`}
            >
              {isPushActive ? `${webPushClient.getBrowserName()} • Active` : 'Not Enabled'}
            </span>
          </div>
        </div>

        {pushStatusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium ${
              pushStatusMsg.isError
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}
          >
            {pushStatusMsg.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-400 leading-relaxed">
            Delivers instant alerts with sound and vibration for chat replies, payout approvals, deposit credits, and gaming credentials.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {isPushActive ? (
              <button
                type="button"
                onClick={handleTestPush}
                disabled={pushLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{pushLoading ? 'Sending...' : 'Send Test Alert'}</span>
              </button>
            ) : webPushClient.isIOS() && !webPushClient.isStandalone() ? (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone Setup Guide</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{pushLoading ? 'Activating...' : 'Turn On Alerts'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <IOSPwaInstallModal isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)} />

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
