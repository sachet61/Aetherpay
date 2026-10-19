import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, GameCatalogItem } from '../../types';
import { dataService } from '../../services/dataService';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import {
  Play,
  Zap,
  Lock,
  Mail,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Key,
  Clock,
  Headphones,
  Sparkles,
  TrendingUp,
  X,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ForgotPassword } from '../../components/auth/ForgotPassword';
import { ResetPassword } from '../../components/auth/ResetPassword';
import { EmailOtpModal } from '../../components/auth/EmailOtpModal';
import { SwiftSweepsLogo } from '../../components/common/SwiftSweepsLogo';
import { LiveCashoutTicker } from '../../components/common/LiveCashoutTicker';

interface AuthPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  timeoutNotice?: string | null;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, timeoutNotice }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset' | 'verify-otp'>('signin');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Selected game when a visitor clicks "Play Now" on a game card
  const [selectedGameForPlay, setSelectedGameForPlay] = useState<string | null>(null);

  // Sign In inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up inputs
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupReferral, setSignupReferral] = useState('SWIFT99');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  // Live support notice modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | 'deposit' | 'deletion' | null>(null);

  // Ref to scroll to the auth card when a user clicks "Play Now" on mobile or large screens
  const authCardRef = useRef<HTMLDivElement>(null);

  // Load game catalog directly from data service
  const [games, setGames] = useState<GameCatalogItem[]>([]);

  useEffect(() => {
    const catalog = dataService.getGameCatalog().filter((g) => g.enabled !== false);
    setGames(catalog);

    // Password recovery listener
    const handleRecovery = () => {
      setAuthMode('reset');
      setErrorMessage(null);
      setInfoMessage('Password recovery session initiated. Please set your new password below.');
    };

    window.addEventListener('supabase_password_recovery', handleRecovery);

    // Also check window hash directly on mount
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        handleRecovery();
      }
    }

    return () => window.removeEventListener('supabase_password_recovery', handleRecovery);
  }, []);

  // Live cashouts feed entries
  const recentCashouts = [
    { name: 'Marcus V.', amount: 850, game: 'Fire Kirin', method: 'CashApp', time: '2m ago' },
    { name: 'Elena R.', amount: 1420, game: 'Milky Way', method: 'Crypto', time: '5m ago' },
    { name: 'Devlin D.', amount: 500, game: 'Orion Stars', method: 'Chime', time: '9m ago' },
    { name: 'Chloe B.', amount: 2150, game: 'GameVault', method: 'CashApp', time: '14m ago' },
    { name: 'Jason K.', amount: 960, game: 'Juwa', method: 'Crypto', time: '21m ago' },
    { name: 'Sophia M.', amount: 620, game: 'Ultra Panda', method: 'Payment Link', time: '28m ago' },
  ];

  // When visitor clicks "Play Now" on any game card
  const handleSelectGameToPlay = (game: GameCatalogItem) => {
    setSelectedGameForPlay(game.title);
    setErrorMessage(null);
    setInfoMessage(`Ready to play ${game.title}! Sign in or create an account to load credits.`);
    authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Supabase Authentication Sign-In Flow
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const authRes = await supabaseAuthService.loginWithEmail(email.trim(), password);

      if (authRes.success && authRes.user) {
        onLoginSuccess(authRes.user);
        return;
      }

      if (authRes.isUnverified) {
        const targetEmail = authRes.email || email.trim();
        setOtpEmail(targetEmail);
        setShowOtpModal(true);
        setErrorMessage('Your email address is not verified yet. Please enter the 6-digit code sent to your email to verify and sign in.');
        return;
      }

      setErrorMessage(
        authRes.error || 'Invalid email or password. Please verify your credentials.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Supabase Authentication Registration Flow
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long with letters and numbers.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = signupEmail.trim();
      const res = await supabaseAuthService.registerWithEmail({
        email: cleanEmail,
        password: signupPassword,
        displayName: signupName.trim(),
        phone: signupPhone.trim() || undefined,
        referralCode: signupReferral.trim() || undefined,
      });

      if (res.success) {
        setOtpEmail(cleanEmail);
        setAuthMode('verify-otp');
        setInfoMessage('Account created! Enter the 6-digit verification code sent to your email to activate your account.');
      } else {
        setErrorMessage(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Preset credential autofill for developer testing
  const fillCredentials = (credEmail: string, credPass: string) => {
    setEmail(credEmail);
    setPassword(credPass);
    setAuthMode('signin');
    setErrorMessage(null);
    setInfoMessage(`Filled credentials for ${credEmail}. Click "Sign In" to proceed.`);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 pb-20 sm:pb-0">
      <div id="recaptcha-container"></div>

      {/* Top Header */}
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40">
        <header className="border-b border-amber-500/15 bg-[#0A0F1D]/90 backdrop-blur-md z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between max-w-7xl mx-auto w-full">
          <SwiftSweepsLogo size="md" />

          <div className="flex items-center gap-3">
            {/* Live Platform Highlights */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className="text-emerald-400 font-mono flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Instant Reloads
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-amber-400 font-mono flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Fast Cashouts
              </span>
            </div>

            {/* 24/7 Live Care Button */}
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-[#131C2E] hover:bg-[#1A263D] text-amber-200 text-xs font-semibold transition shadow-sm"
            >
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">24/7 Support</span>
              <span className="sm:hidden">Support</span>
            </button>
          </div>
        </header>

        {/* Horizontal News-Style Live Cashouts Marquee Ticker */}
        <LiveCashoutTicker />
      </div>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full flex-1 space-y-6">
        {/* Inactivity Timeout Warning if triggered */}
        {timeoutNotice && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-600 text-amber-200 text-xs flex items-center gap-3 shadow-xl">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Session Timed Out</div>
              <p className="text-xs text-amber-300/90">{timeoutNotice}</p>
            </div>
          </div>
        )}

        {/* Split View Layout: Game Showcase (Left 7 cols) & Auth Portal (Right 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Animated Game Showcase Grid (NO Category Filters) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Hero Heading */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-[#131C2E] text-amber-300 text-xs font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Featured Game Platforms</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                Play Top Sweepstakes Games
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                Hover over any game platform and click <strong className="text-amber-400">Play Now</strong> to load credits and start spinning.
              </p>
            </div>

            {/* Visual Game Catalog Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleSelectGameToPlay(game)}
                  className="group relative rounded-2xl border border-slate-800/80 bg-[#0E1726]/80 overflow-hidden shadow-lg transition-all duration-300 hover:border-amber-500/70 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  {/* Game Cover Art */}
                  <div className="relative w-full aspect-square bg-slate-950 overflow-hidden flex items-center justify-center p-3">
                    <img
                      src={game.iconUrl || game.imageUrl}
                      alt={game.title}
                      className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Hover Overlay with Action Button */}
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 text-slate-950 font-bold transform group-hover:scale-110 transition-transform mb-2">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide">Play Now</span>
                      <span className="text-[10px] text-amber-400 font-mono mt-0.5">Instant Load</span>
                    </div>
                  </div>

                  {/* Clean Title Bar */}
                  <div className="p-2.5 text-center bg-slate-950/60 border-t border-slate-800/80">
                    <span className="font-bold text-xs text-white truncate block group-hover:text-amber-400 transition-colors">
                      {game.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Fast Value Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-[#0E1726]/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Zap className="w-4 h-4" />
                  <span>Instant Reloads</span>
                </div>
                <p className="text-[11px] text-slate-400">Load credits to any platform in under 60 seconds.</p>
              </div>

              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-[#0E1726]/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Rapid Cashouts</span>
                </div>
                <p className="text-[11px] text-slate-400">CashApp, Chime, and Crypto withdrawals processed 24/7.</p>
              </div>

              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-[#0E1726]/60 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Headphones className="w-4 h-4 text-amber-400" />
                  <span>Live Care Team</span>
                </div>
                <p className="text-[11px] text-slate-400">Human support agents available round-the-clock.</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Streamlined Authentication Card */}
          <div ref={authCardRef} className="lg:col-span-5">
            <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/20 bg-[#0E1726]/95 shadow-2xl space-y-4 backdrop-blur-xl">
              {/* Card Header & Selected Game Context Banner */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white tracking-wide">
                  {authMode === 'signup'
                    ? 'Create Swift Sweeps Account'
                    : authMode === 'verify-otp'
                    ? 'Verify Email with 6-Digit Code'
                    : authMode === 'forgot'
                    ? 'Password Recovery'
                    : authMode === 'reset'
                    ? 'Update Password'
                    : 'Sign In to Play'}
                </span>

              </div>

              {/* Game Selected Trigger Notice */}
              {selectedGameForPlay && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-600/70 text-amber-200 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-2 truncate">
                    <Play className="w-4 h-4 text-amber-400 shrink-0 fill-current" />
                    <span className="truncate">
                      Selected: <strong className="text-white">{selectedGameForPlay}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGameForPlay(null)}
                    className="text-amber-400/80 hover:text-amber-100 p-1"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Tab switch between Sign In and Sign Up */}
              <div className="flex items-center p-1 bg-[#0A0F1D] rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    authMode === 'signin' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    authMode === 'signup' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
                {(authMode === 'forgot' || authMode === 'reset' || authMode === 'verify-otp') && (
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md transition-all"
                  >
                    {authMode === 'forgot' ? 'Reset' : authMode === 'reset' ? 'New Pass' : 'Verify Code'}
                  </button>
                )}
              </div>

              {/* Errors & Alerts */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}



              {infoMessage && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* Verification & Recovery Flows */}
              {authMode === 'verify-otp' ? (
                <EmailOtpModal
                  email={otpEmail || signupEmail || email}
                  isStandalone={true}
                  onSuccess={(user) => {
                    onLoginSuccess(user);
                  }}
                  onBackToSignIn={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                  }}
                />
              ) : authMode === 'forgot' ? (
                <ForgotPassword
                  initialEmail={resetEmail || email}
                  onBackToSignIn={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                  }}
                  onProceedToReset={(em, tok) => {
                    setResetEmail(em);
                    setResetToken(tok);
                    setAuthMode('reset');
                    setErrorMessage(null);
                  }}
                />
              ) : authMode === 'reset' ? (
                <ResetPassword
                  initialEmail={resetEmail || email}
                  initialToken={resetToken}
                  onBackToSignIn={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                  }}
                  onBackToForgot={() => {
                    setAuthMode('forgot');
                    setErrorMessage(null);
                  }}
                  onResetSuccess={(em) => {
                    setEmail(em);
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setInfoMessage('Password successfully updated! Please sign in with your new credentials.');
                  }}
                />
              ) : authMode === 'signin' ? (
                <div className="space-y-4">
                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300">Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(email);
                            setAuthMode('forgot');
                            setErrorMessage(null);
                            setInfoMessage(null);
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline transition font-medium"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Immediate Unverified Account Verification Trigger */}
                  <div className="pt-2 text-center border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        const targetEmail = email.trim();
                        setOtpEmail(targetEmail);
                        setShowOtpModal(true);
                        setErrorMessage(null);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline transition font-medium cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Unverified account? Enter 6-digit code or resend</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Full Name / Gamer Tag</label>
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Marcus Vance"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Create Password (8+ characters)</label>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Mobile Phone</label>
                      <input
                        type="tel"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Referral Code</label>
                      <input
                        type="text"
                        value={signupReferral}
                        onChange={(e) => setSignupReferral(e.target.value.toUpperCase())}
                        placeholder="SWIFT99"
                        className="w-full bg-[#0A0F1D] border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400 uppercase transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? 'Creating Account...' : 'Complete Registration'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}


            </div>
          </div>
        </div>
      </main>

      {/* 24/7 Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1726] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Swift Sweeps 24/7 Player Care</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our human customer care team operates 24/7/365 to handle game loads, account inquiries, and fast cashout processing.
            </p>
            <div className="p-3 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-400">Live Support Channel:</div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active 24/7 Live Desk</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Once logged in, open the live chat console in your player portal for instant real-time assistance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Simple Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0A0F1D] py-5 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">⚡</span>
            <span>Swift Sweeps &copy; {new Date().getFullYear()}</span>
            <span className="text-slate-600">·</span>
            <span>All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap justify-center">
            <button type="button" onClick={() => setActivePolicyModal('privacy')} className="hover:text-amber-400 transition underline underline-offset-2">Privacy Policy</button>
            <span>·</span>
            <button type="button" onClick={() => setActivePolicyModal('terms')} className="hover:text-amber-400 transition underline underline-offset-2">Terms & Conditions</button>
            <span>·</span>
            <button type="button" onClick={() => setActivePolicyModal('deposit')} className="hover:text-amber-400 transition underline underline-offset-2">Deposit & Bonus Policy</button>
            <span>·</span>
            <button type="button" onClick={() => setActivePolicyModal('deletion')} className="hover:text-amber-400 transition underline underline-offset-2">Data Deletion</button>
          </div>
        </div>
      </footer>

      {/* Policy Modal Viewer */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1628] border border-slate-700/80 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  {activePolicyModal === 'privacy' && 'Privacy Policy'}
                  {activePolicyModal === 'terms' && 'Terms of Service & Fair Gaming'}
                  {activePolicyModal === 'deposit' && 'Deposit & Bonus Policy'}
                  {activePolicyModal === 'deletion' && 'User Data Deletion Instructions'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
              {activePolicyModal === 'privacy' && (
                <div className="space-y-3">
                  <p>Welcome to SwiftSweeps Privacy Policy. We respect your privacy and protect your personal data when you visit our gaming platform.</p>
                  <p><strong>Information Collection:</strong> We collect identity data (username/gamer tag), contact data (email/phone), and financial ledger/transaction records.</p>
                  <p><strong>Use of Data:</strong> Your data is used exclusively to administer your gaming wallet, process deposits and withdrawals, and provide 24/7 customer support.</p>
                  <p><strong>Security:</strong> All sensitive data is transmitted securely via SSL encryption and stored in secure databases with strict access controls.</p>
                </div>
              )}
              {activePolicyModal === 'terms' && (
                <div className="space-y-3">
                  <p>Participation in games is restricted to eligible players of legal age in their respective jurisdiction.</p>
                  <p>All transactions, wagers, and bonuses are subject to platform verification and fair play guidelines. Multi-accounting or fraudulent activity will result in account suspension and forfeiture of balances.</p>
                </div>
              )}
              {activePolicyModal === 'deposit' && (
                <div className="space-y-3">
                  <p><strong>Verified Deposits:</strong> Deposits must originate from accounts registered in the customer's legal name. Third-party deposits are strictly prohibited.</p>
                  <p><strong>Payment Method Bonuses:</strong> Bonuses are dynamically linked to the selected payment method (e.g. Verified CashApp 30%, Crypto 30%, Payment via Link 20%, Chime Direct 15%).</p>
                  <p><strong>Wagering:</strong> Deposit bonuses require 1x wagering in verified gaming matches prior to cashout qualification.</p>
                </div>
              )}
              {activePolicyModal === 'deletion' && (
                <div className="space-y-3">
                  <p>In accordance with platform and GDPR data privacy regulations, you have the right to request complete deletion of your account and personal data.</p>
                  <p>To request data erasure, contact our compliance desk at privacy@swiftsweeps.com or submit a ticket through our active 24/7 support chat.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile & Tablet Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0F1D]/95 backdrop-blur-md border-t border-slate-800/80 p-2.5 px-4 flex items-center justify-between gap-2 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setAuthMode('signin');
            authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-[#0E1726] border border-amber-500/20 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode('signup');
            authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/30"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>Register</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSupportModal(true)}
          className="flex-1 py-2 px-3 rounded-xl bg-[#0E1726] border border-amber-500/20 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Headphones className="w-3.5 h-3.5 text-amber-400" />
          <span>Support</span>
        </button>
      </div>

      {/* Interactive Unverified OTP Modal */}
      {showOtpModal && (
        <EmailOtpModal
          email={otpEmail || email}
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onSuccess={(user) => {
            setShowOtpModal(false);
            onLoginSuccess(user);
          }}
          onBackToSignIn={() => {
            setShowOtpModal(false);
            setAuthMode('signin');
          }}
        />
      )}
    </div>
  );
};
