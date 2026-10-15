import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/dataService';
import {
  KeyRound,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface ForgotPasswordProps {
  initialEmail?: string;
  onBackToSignIn: () => void;
  onProceedToReset?: (email: string, token: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  initialEmail = '',
  onBackToSignIn,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await dataService.requestPasswordReset(cleanEmail);
      if (res.success) {
        setIsSuccess(true);
        setCooldown(60);
      } else {
        setErrorMessage(res.message || 'Unable to request password reset. Please check the email entered.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await dataService.requestPasswordReset(email.trim().toLowerCase());
      if (res.success) {
        setCooldown(60);
      } else {
        setErrorMessage(res.message || 'Failed to resend reset email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Password Reset</h2>
          <p className="text-xs text-slate-400">Official recovery link dispatched to your inbox</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Enter your account email. We will check our records and dispatch a secure password reset link to your verified inbox.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Account Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking Account &amp; Sending...</span>
              </>
            ) : (
              <>
                <span>Send Password Reset Email</span>
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
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password Reset Email Dispatched!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We have sent a secure password reset link to <strong className="text-white">{email}</strong>.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Please check your inbox (and spam or junk folder). Click the link in the email to choose a new password.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>The link is securely generated and expires automatically.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Email'}</span>
            </button>

            <button
              type="button"
              onClick={onBackToSignIn}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
