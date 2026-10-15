import React, { useState, useEffect } from 'react';
import { authSessionService } from '../../services/authSessionService';
import { Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutWarningModalProps {
  onLogout: (reason: string) => void;
}

export const SessionTimeoutWarningModal: React.FC<SessionTimeoutWarningModalProps> = ({ onLogout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  useEffect(() => {
    // Record user activity
    const handleActivity = () => {
      authSessionService.recordActivity();
      if (showWarning) {
        setShowWarning(false);
      }
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    // Polling interval to check remaining inactivity time
    const interval = setInterval(() => {
      const remainingMs = authSessionService.getInactivityRemainingMs();
      if (remainingMs <= 0) {
        setShowWarning(false);
        onLogout('inactivity');
      } else if (remainingMs <= 120000) { // 2 minutes remaining
        setShowWarning(true);
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [onLogout, showWarning]);

  if (!showWarning) return null;

  const handleStayActive = () => {
    authSessionService.recordActivity();
    setShowWarning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-600/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-white">Inactivity Warning</h3>
          <p className="text-xs text-slate-300">
            For security, your session will automatically lock in:
          </p>
          <div className="text-2xl font-black font-mono text-amber-400 py-1">
            {Math.floor(secondsRemaining / 60)}:
            {(secondsRemaining % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleStayActive}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In</span>
          </button>
          <button
            type="button"
            onClick={() => onLogout('manual')}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
