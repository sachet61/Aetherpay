import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Bell, Check } from 'lucide-react';
import { webPushClient } from '../../services/webPushClient';
import { UserProfile } from '../../types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallButtonProps {
  currentUser?: UserProfile | null;
  className?: string;
  variant?: 'navbar' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  currentUser,
  className = '',
  variant = 'navbar',
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(() => webPushClient.getPermission());
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker on initial mount
    webPushClient.registerServiceWorker();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleEnablePush = async () => {
    if (!currentUser) return;
    setIsSubscribingPush(true);
    const res = await webPushClient.subscribeToPushNotifications(currentUser);
    setIsSubscribingPush(false);
    setPushStatus(webPushClient.getPermission());
    if (res.success) {
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3000);
    }
  };

  // If already running standalone and push permission is granted, we can render a subtle indicator or nothing
  const canInstall = !isInstalled && (!!deferredPrompt || isIOS);

  if (!canInstall && pushStatus === 'granted') {
    return null;
  }

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* PWA Install Button */}
        {canInstall && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-sm active:scale-95"
            title="Install Swift Sweeps app for home screen access and instant notifications"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Background Notifications Prompt (when permission not yet granted) */}
        {currentUser && pushStatus !== 'granted' && (
          <button
            onClick={handleEnablePush}
            disabled={isSubscribingPush}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 transition-all active:scale-95 disabled:opacity-50"
            title="Enable Background Notifications to receive alerts when the browser is closed"
          >
            {pushSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 hidden md:inline">Alerts On</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">
                  {isSubscribingPush ? 'Enabling...' : 'Background Alerts'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* iOS Safari Guided Install Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#0E1628] border border-amber-500/30 p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Install Swift Sweeps on iOS</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div className="leading-relaxed">
                  In Safari, tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline text-indigo-400" /> at the bottom or top of your screen.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div className="leading-relaxed">
                  Scroll down the options and select <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div className="leading-relaxed">
                  Tap <strong className="text-white">Add</strong> in the top-right corner to launch Swift Sweeps directly from your home screen with native push alerts.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-xs text-slate-950 hover:brightness-110 transition-all shadow-md shadow-amber-500/20"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
