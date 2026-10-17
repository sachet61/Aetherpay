import React, { useState, useEffect, useRef } from 'react';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import { UserProfile } from '../../types';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

interface EmailOtpModalProps {
  email: string;
  isOpen?: boolean;
  isStandalone?: boolean;
  onClose?: () => void;
  onSuccess: (user: UserProfile) => void;
  onBackToSignIn?: () => void;
  initialCooldown?: number;
}

export const EmailOtpModal: React.FC<EmailOtpModalProps> = ({
  email,
  isOpen = true,
  isStandalone = false,
  onClose,
  onSuccess,
  onBackToSignIn,
  initialCooldown = 60,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // If user pasted multi-digit string into one box
    const cleanVal = value.replace(/\D/g, '');
    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance to next input if filled
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits filled
    if (cleanVal && index === 5 && newDigits.every((d) => d.length === 1)) {
      triggerVerification(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePastedCode = (pasted: string) => {
    const numbersOnly = pasted.replace(/\D/g, '').slice(0, 6);
    if (!numbersOnly) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < numbersOnly.length; i++) {
      newDigits[i] = numbersOnly[i];
    }
    setDigits(newDigits);
    setErrorMessage(null);

    const focusIdx = Math.min(numbersOnly.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (numbersOnly.length === 6) {
      triggerVerification(numbersOnly);
    }
  };

  const triggerVerification = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await supabaseAuthService.verifyEmailOtp(email, code);
      if (res.success && res.user) {
        setSuccessMessage(res.message || 'Email verified successfully!');
        setTimeout(() => {
          onSuccess(res.user!);
        }, 800);
      } else {
        setErrorMessage(res.message || 'Invalid or expired 6-digit code. Please try again or request a new code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await supabaseAuthService.resendEmailOtp(email);
      if (res.success) {
        setCooldown(60);
        setSuccessMessage('A new 6-digit code has been dispatched to your email.');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.message || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="w-full max-w-md mx-auto bg-[#131C2E] border border-amber-500/25 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-slate-100">
      {/* Optional Close Button for modal mode */}
      {!isStandalone && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          Verify Your Email
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          We sent a 6-digit security code via Brevo to
        </p>
        <div className="mt-1 flex items-center justify-center gap-1.5 font-medium text-amber-300 text-sm bg-amber-500/10 py-1 px-3 rounded-lg border border-amber-500/20 max-w-xs mx-auto truncate">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{email}</span>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 6-Digit OTP Inputs */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
          Enter 6-Digit Code
        </label>
        <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={(e) => {
          e.preventDefault();
          handlePastedCode(e.clipboardData.getData('text'));
        }}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl bg-[#0A0F1D] border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 text-amber-400 outline-none transition"
              autoComplete="one-time-code"
            />
          ))}
        </div>
      </div>

      {/* Verify Button */}
      <button
        type="button"
        disabled={isLoading || digits.join('').length !== 6}
        onClick={() => triggerVerification()}
        className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99]"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifying Code...</span>
          </>
        ) : (
          <>
            <span>Verify & Continue</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Resend & Secondary Actions */}
      <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            disabled={cooldown > 0 || isResending}
            onClick={handleResend}
            className="font-semibold text-amber-400 hover:text-amber-300 disabled:text-slate-600 transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sending...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <span>Resend Code</span>
            )}
          </button>
        </div>

        <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-[11px] text-amber-200/90 leading-relaxed">
          <span className="font-semibold text-amber-300">Note:</span> Please check your <strong className="text-white">Spam or Junk folder</strong> if the OTP code is not found in your Inbox.
        </div>

        {onBackToSignIn && (
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-slate-400 hover:text-slate-200 transition underline underline-offset-4"
          >
            Return to Sign In
          </button>
        )}
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="w-full max-w-md mx-auto py-6">
        {content}
      </div>
    );
  }

  // Modal Backdrop
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md">
        {content}
      </div>
    </div>
  );
};
