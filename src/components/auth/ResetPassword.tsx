import React, { useState, useEffect } from 'react';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import { dataService } from '../../services/dataService';
import {
  Lock,
  KeyRound,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';

interface ResetPasswordProps {
  initialEmail?: string;
  initialToken?: string;
  onBackToSignIn: () => void;
  onBackToForgot?: () => void;
  onResetSuccess: (email: string) => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({
  initialEmail = '',
  initialToken = '',
  onBackToSignIn,
  onBackToForgot,
  onResetSuccess,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    // Check if user came from a recovery link (hash fragment with type=recovery or access_token)
    const isRecovery =
      supabaseAuthService.getIsRecoveryMode() ||
      (typeof window !== 'undefined' &&
        (window.location.hash.includes('type=recovery') ||
          window.location.hash.includes('access_token')));

    setHasRecoverySession(Boolean(isRecovery));
  }, []);

  // Password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setErrorMessage('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords entered do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. If user entered a manual code/token and email, attempt server-side verification and reset first
      if (token.trim() && email.trim()) {
        const serverReset = await dataService.resetPasswordWithToken(token.trim(), email.trim(), newPassword);
        if (serverReset.success) {
          setIsSuccess(true);
          return;
        }

        // If server token wasn't matched, try Supabase direct OTP verify
        const verifyRes = await supabaseAuthService.verifyOtpForRecovery(email.trim(), token.trim());
        if (!verifyRes.success) {
          setErrorMessage(serverReset.message || verifyRes.message || 'Invalid or expired reset code / token.');
          setIsLoading(false);
          return;
        }
      }

      // 2. Update password directly via Supabase session
      const res = await supabaseAuthService.updateUserPassword(newPassword);

      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(
          res.message ||
            'Unable to set new password. If you followed an email link, it may have expired. Please request a fresh reset link or enter your 6-digit PIN.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while updating your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Set New Password</h2>
          <p className="text-xs text-slate-400">
            {hasRecoverySession
              ? 'Email link verified — enter your new password below'
              : 'Verify your credentials and establish a secure password'}
          </p>
        </div>
      </div>

      {hasRecoverySession && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Secure recovery session detected from your reset link.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isSuccess ? (
        <form onSubmit={handleReset} className="space-y-3.5">
          {/* Email (Optional if recovery link was clicked) */}
          {!hasRecoverySession && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Account Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* Token (Optional if email link was clicked) */}
          {!hasRecoverySession && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">6-Digit Code or Token (Optional)</label>
                {onBackToForgot && (
                  <button
                    type="button"
                    onClick={onBackToForgot}
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    Need a reset link?
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456 or token (if received)"
                  className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">New Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="p-2.5 rounded-xl bg-[#0A0F1D] border border-slate-800/80 grid grid-cols-2 gap-1.5 text-[10px]">
            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
              <Check className={`w-3 h-3 ${hasMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Min 8 characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
              <Check className={`w-3 h-3 ${hasLetter ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Contains letters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
              <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Contains numbers</span>
            </div>
            <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
              <Check className={`w-3 h-3 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating via Supabase...</span>
              </>
            ) : (
              <>
                <span>Save New Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToSignIn}
            className="w-full py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>
        </form>
      ) : (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-900/50 border border-emerald-600 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white">Password Updated Successfully!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your password has been securely updated in Supabase. You can now sign in with your new credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onResetSuccess(email)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
