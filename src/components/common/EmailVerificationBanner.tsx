import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert, Zap, ExternalLink, KeyRound } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';
import { EmailOtpModal } from '../auth/EmailOtpModal';

interface EmailVerificationBannerProps {
  currentUser: UserProfile;
  onStatusChanged?: (verified: boolean) => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  currentUser,
  onStatusChanged,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstantConfirming, setIsInstantConfirming] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Automatic background reconciliation: verify if user was already confirmed in Supabase
  useEffect(() => {
    if (currentUser && !currentUser.emailVerified) {
      dataService.reloadAndCheckEmailVerification().then((res) => {
        if (res.verified && onStatusChanged) {
          onStatusChanged(true);
        }
      }).catch(() => {});
    }
  }, [currentUser?.id, currentUser?.emailVerified]);

  // If already verified or dismissed, don't show
  if (currentUser.emailVerified || isDismissed) {
    return null;
  }

  const handleInstantVerify = async () => {
    if (isInstantConfirming) return;
    setIsInstantConfirming(true);
    setFeedback({ type: 'info', message: 'Confirming email directly in Supabase Auth...' });
    try {
      const res = await dataService.confirmEmailNow(currentUser.email);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Email successfully verified in Supabase! Cashouts and referral bonuses unlocked.',
        });
        if (onStatusChanged) onStatusChanged(true);
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Instant verification error. You can also click Resend Link.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.message || 'Verification error.',
      });
    } finally {
      setIsInstantConfirming(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isSending) return;
    setIsSending(true);
    setFeedback(null);
    try {
      const res = await dataService.sendVerificationEmail();
      if (res.success) {
        setCooldown(60);
        if (res.actionLink) {
          setActionLink(res.actionLink);
        }
        setFeedback({
          type: 'success',
          message: res.message || `Verification link dispatched to ${currentUser.email}. Check your inbox or click the direct link below.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to dispatch verification email from Supabase.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Error dispatching verification link.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setFeedback(null);
    try {
      const res = await dataService.reloadAndCheckEmailVerification();
      if (res.verified) {
        setFeedback({
          type: 'success',
          message: res.message || 'Email verified successfully! Cashouts and referral bonuses unlocked.',
        });
        if (onStatusChanged) onStatusChanged(true);
        setTimeout(() => setIsDismissed(true), 2000);
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Email is still unverified in Supabase. Click "Verify Now" to confirm instantly.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Error checking verification status.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/70 border border-amber-500/40 p-4 sm:p-5 shadow-2xl backdrop-blur-md transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 text-amber-400 shadow-inner">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-amber-200">Email Verification Required</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Your registered email <span className="font-mono font-semibold text-amber-200">({currentUser.email})</span> is currently unverified. Cashouts and referral earnings are locked until OTP verification is confirmed.
            </p>
            <p className="text-[11px] text-amber-300/80">
              * Please check your Spam or Junk folder if the 6-digit OTP code does not arrive in your Inbox.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-start lg:justify-end pt-1 lg:pt-0">
          {/* Enter 6-Digit Code Button */}
          <button
            type="button"
            onClick={() => setShowOtpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 active:scale-95"
            title="Enter 6-digit verification code received in email"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Enter OTP Code</span>
          </button>

          {/* Resend Supabase Email Code */}
          <button
            type="button"
            onClick={handleResend}
            disabled={isSending || cooldown > 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition disabled:opacity-50"
            title="Send official Supabase confirmation email to your inbox"
          >
            {isSending ? (
              <span>Sending...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{cooldown > 0 ? `Resend (${cooldown}s)` : 'Send Code'}</span>
              </>
            )}
          </button>

          {/* Refresh Verification Status */}
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
            title="Check Supabase for confirmed email status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss verification banner"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition ml-auto lg:ml-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action link if generated by admin/server */}
      {actionLink && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 bg-amber-950/40 p-2.5 rounded-xl border border-amber-600/30">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <Mail className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="font-semibold">Direct Verification Link:</span>
            <span className="font-mono text-[11px] text-slate-300 truncate max-w-xs">{actionLink}</span>
          </div>
          <a
            href={actionLink}
            target="_self"
            className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
          >
            <span>Open Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {feedback && (
        <div
          className={`mt-3 pt-2.5 border-t border-amber-800/40 text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'text-emerald-300'
              : feedback.type === 'info'
              ? 'text-sky-300'
              : 'text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : feedback.type === 'info' ? (
            <RefreshCw className="w-4 h-4 shrink-0 text-sky-400 animate-spin" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {showOtpModal && (
        <EmailOtpModal
          email={currentUser.email}
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onSuccess={(user) => {
            setShowOtpModal(false);
            if (onStatusChanged) onStatusChanged(true);
          }}
        />
      )}
    </div>
  );
};
