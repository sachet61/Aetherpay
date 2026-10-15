import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { UserProfile } from '../../types';

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
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // If already verified or dismissed, don't show
  if (currentUser.emailVerified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0 || isSending) return;
    setIsSending(true);
    setFeedback(null);
    try {
      const res = await dataService.sendVerificationEmail();
      if (res.success) {
        setCooldown(60);
        setFeedback({
          type: 'success',
          message: res.message || 'Verification link dispatched! Please check your inbox or spam folder.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to dispatch verification email.',
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
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Email is not yet verified. Please click the link sent to your inbox and check again.',
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
    <div className="mb-6 rounded-2xl bg-amber-950/70 border border-amber-800/80 p-4 shadow-xl backdrop-blur-md transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-200">Email Verification Required</span>
              <span className="text-[10px] text-amber-400/80">· Action Needed</span>
            </div>

          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-1 lg:pt-0">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : "I've Verified (Refresh)"}</span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isSending || cooldown > 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition disabled:opacity-50"
          >
            {isSending ? (
              <span>Sending...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Link'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss verification banner"
            className="p-1.5 text-amber-400/70 hover:text-amber-200 rounded-lg hover:bg-amber-900/40 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-3 pt-2.5 border-t border-amber-800/50 text-xs flex items-center gap-2 ${
            feedback.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
