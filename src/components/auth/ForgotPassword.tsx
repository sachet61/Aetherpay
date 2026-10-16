import React, { useState, useEffect } from 'react';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import {
  KeyRound,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface ForgotPasswordProps {
  onBackToSignIn: () => void;
  onProceedToReset?: (email: string, token: string) => void;
  initialEmail?: string;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBackToSignIn,
  onProceedToReset,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      const res = await supabaseAuthService.sendPasswordReset(cleanEmail);
      if (res.success) {
        setIsSuccess(true);
        setCooldown(60);
        if (res.actionLink) setActionLink(res.actionLink);
        if (res.pin) setPin(res.pin);
        if (res.token) setToken(res.token);
      } else {
        setErrorMessage(res.message || 'Unable to request password reset. Please verify your email address.');
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
      const res = await supabaseAuthService.sendPasswordReset(email.trim().toLowerCase());
      if (res.success) {
        setCooldown(60);
        if (res.actionLink) setActionLink(res.actionLink);
        if (res.pin) setPin(res.pin);
        if (res.token) setToken(res.token);
      } else {
        setErrorMessage(res.message || 'Failed to resend reset email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Password Recovery</h2>
          <p className="text-xs text-slate-400">Secure link & in-app verification code</p>
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
            Enter your account email. Supabase Auth will dispatch a verified password reset link that redirects back to this application with zero localhost errors.
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
                className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Dispatching via Supabase...</span>
              </>
            ) : (
              <>
                <span>Send Password Reset Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {onProceedToReset && (
            <button
              type="button"
              onClick={() => onProceedToReset(email, '')}
              className="w-full py-2 text-center text-xs text-amber-400 hover:text-amber-300 hover:underline"
            >
              Already clicked an email link or have a token? Set new password →
            </button>
          )}

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
              <span>Password Reset Link &amp; Code Dispatched!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We have generated a secure password reset link for <strong className="text-white">{email}</strong>.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Check your inbox. Clicking the link redirects directly back here without localhost errors. You can also use the direct link or in-app code below.
            </p>
          </div>

          {/* Direct In-App PIN Code */}
          {pin && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">In-App 6-Digit Reset PIN:</span>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy PIN'}</span>
                </button>
              </div>
              <div className="text-center py-2 bg-[#0A0F1D] rounded-xl border border-amber-500/30 text-amber-300 font-mono font-bold tracking-widest text-lg">
                {pin}
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Valid for 15 minutes. Enter this code on the next screen to set your new password instantly.
              </p>
            </div>
          )}

          {/* Direct Action Link */}
          {actionLink && (
            <div className="p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-200 font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-400" /> Direct Reset Link
                </span>
                <a
                  href={actionLink}
                  target="_self"
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                >
                  <span>Open Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="font-mono text-[10px] text-slate-400 truncate max-w-full">
                {actionLink}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0A0F1D] border border-slate-800/80 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>The link and code are authenticated via Supabase and expire automatically.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Email'}</span>
            </button>

            {onProceedToReset && (
              <button
                type="button"
                onClick={() => onProceedToReset(email, pin || token || '')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Enter Code / Password</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onBackToSignIn}
            className="w-full py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      )}
    </div>
  );
};
