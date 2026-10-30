import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { webPushClient } from '../../services/webPushClient';
import { IOSPwaInstallModal } from './IOSPwaInstallModal';
import { Bell, BellRing, Smartphone, X, CheckCircle, Volume2, Sparkles } from 'lucide-react';

interface BackgroundNotificationPromptProps {
  currentUser: UserProfile;
}

export const BackgroundNotificationPrompt: React.FC<BackgroundNotificationPromptProps> = ({ currentUser }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('swiftsweeps_push_prompt_dismissed') === 'true';
    }
    return false;
  });
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isIOS = webPushClient.isIOS();
  const isStandalone = webPushClient.isStandalone();
  const isAndroid = webPushClient.isAndroid();

  useEffect(() => {
    if (typeof window === 'undefined' || !webPushClient.isPushSupported()) return;

    setPermission(webPushClient.getPermission());

    webPushClient.hasActiveSubscription().then((active) => {
      setIsSubscribed(active);
      if (active || Notification.permission === 'granted') {
        webPushClient.autoSyncIfGranted(currentUser).catch(() => {});
      }
    });
  }, [currentUser]);

  const handleEnableNotifications = async () => {
    // If iOS Safari running in regular browser (not installed PWA), show install guide
    if (isIOS && !isStandalone) {
      setShowIOSModal(true);
      return;
    }

    setIsLoading(true);
    setFeedbackMsg(null);

    const res = await webPushClient.subscribeToPushNotifications(currentUser);
    setIsLoading(false);

    if (res.success) {
      setIsSubscribed(true);
      setPermission('granted');
      setFeedbackMsg({
        text: 'Background alerts activated! Your device will now receive heads-up notifications with sound & vibration.',
        type: 'success',
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
    } else {
      setFeedbackMsg({
        text: res.error || 'Could not enable notifications. Please verify browser permissions.',
        type: 'error',
      });
    }
  };

  const handleSendTestAlert = async () => {
    setIsLoading(true);
    const res = await webPushClient.sendTestAlert(currentUser);
    setIsLoading(false);

    if (res.success) {
      setFeedbackMsg({
        text: 'Test alert sent! Minimize your browser or lock your screen now to see the heads-up banner.',
        type: 'success',
      });
    } else {
      setFeedbackMsg({
        text: res.message,
        type: 'error',
      });
    }
    setTimeout(() => setFeedbackMsg(null), 7000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('swiftsweeps_push_prompt_dismissed', 'true');
    }
  };

  // If already granted & subscribed and not showing feedback, do not show persistent banner
  if (permission === 'granted' && isSubscribed && !feedbackMsg) {
    return null;
  }

  // If permission was explicitly denied or dismissed for this session and no feedback
  if ((permission === 'denied' || isDismissed) && !feedbackMsg) {
    return null;
  }

  return (
    <>
      <div className="relative z-30 bg-gradient-to-r from-[#0E1726] via-[#131F37] to-[#0E1726] border-y border-amber-500/30 px-3 sm:px-6 py-2.5 text-slate-100 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          {/* Left info badge */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              {permission === 'granted' ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4 animate-bounce" />}
            </div>

            <div className="flex-1 min-w-0">
              {feedbackMsg ? (
                <p className={feedbackMsg.type === 'success' ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                  {feedbackMsg.text}
                </p>
              ) : isIOS && !isStandalone ? (
                <div>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    <span>iPhone &amp; iPad Alerts:</span>
                  </span>
                  <p className="text-slate-300 text-xs">
                    Add to Home Screen to receive Messenger-style background alerts, sound &amp; vibration.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Instant Background Notifications:</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {webPushClient.getBrowserName()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-0.5">
                    Receive heads-up banners with sound &amp; vibration for messages, cashouts &amp; deposits when minimized or closed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {permission === 'granted' ? (
              <button
                onClick={handleSendTestAlert}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-semibold text-xs transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Sending...' : 'Send Test Alert'}</span>
              </button>
            ) : isIOS && !isStandalone ? (
              <button
                onClick={() => setShowIOSModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>See How to Enable</span>
              </button>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Enabling...' : 'Turn On Alerts'}</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
              title="Dismiss"
              aria-label="Dismiss notification prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Home Screen Guide Modal */}
      <IOSPwaInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
    </>
  );
};
