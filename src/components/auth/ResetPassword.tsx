import React, { useState } from 'react';
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

  // Password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch && token.trim().length > 0;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid account email.');
      return;
    }

    if (!token.trim()) {
      setErrorMessage('Please enter your reset token or 6-digit PIN.');
      return;
    }

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
      const res = await dataService.resetPasswordWithToken(token.trim(), email.trim(), newPassword);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.message || 'Failed to update password. Please check your token.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Set New Password</h2>
          <p className="text-xs text-slate-400">Verify your token and securely establish credentials</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isSuccess ? (
        <form onSubmit={handleReset} className="space-y-3.5">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Account Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Token */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Reset Token or 6-Digit PIN</label>
              {onBackToForgot && (
                <button
                  type="button"
                  onClick={onBackToForgot}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Need a token?
                </button>
              )}
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="RST-XXXXX-XXXX or 123456"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-2 gap-1.5 text-[10px]">
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
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Updating & Encrypting...' : 'Update Password'}
            <ArrowRight className="w-4 h-4" />
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
              Your credentials have been securely hashed and updated for <strong className="text-white">{email}</strong>.
              You may now sign in using your newly configured password.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onResetSuccess(email)}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            Sign In with New Password
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
