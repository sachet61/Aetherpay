import React from 'react';
import { X, Share2, PlusSquare, Bell, Smartphone, CheckCircle2 } from 'lucide-react';

interface IOSPwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSPwaInstallModal: React.FC<IOSPwaInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0F172A] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/90 relative text-slate-100 flex flex-col gap-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
          aria-label="Close guide"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-amber-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Enable Background Alerts on iPhone
            </h3>
            <p className="text-xs text-slate-400">
              Receive Messenger-style heads-up alerts & sound
            </p>
          </div>
        </div>

        {/* Apple Requirement Explanation */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
          <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Apple WebKit requires Swift Sweeps to be added to your <strong>Home Screen</strong> before allowing background notifications with sound and vibrations.
          </span>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 pt-1">
          {/* Step 1 */}
          <div className="flex items-start gap-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
              1
            </div>
            <div className="flex-1 text-xs">
              <div className="text-white font-semibold flex items-center gap-1.5 mb-0.5">
                <span>Tap the Safari Share button</span>
                <span className="inline-flex items-center justify-center p-1 bg-slate-800 rounded text-amber-400">
                  <Share2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-slate-400 leading-normal">
                Look at the bottom toolbar of Safari and tap the square icon with an arrow pointing up.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
              2
            </div>
            <div className="flex-1 text-xs">
              <div className="text-white font-semibold flex items-center gap-1.5 mb-0.5">
                <span>Select &quot;Add to Home Screen&quot;</span>
                <span className="inline-flex items-center justify-center p-1 bg-slate-800 rounded text-amber-400">
                  <PlusSquare className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-slate-400 leading-normal">
                Scroll down the Safari share menu and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> at top right.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
              3
            </div>
            <div className="flex-1 text-xs">
              <div className="text-white font-semibold flex items-center gap-1.5 mb-0.5">
                <span>Launch &amp; Allow Notifications</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-slate-400 leading-normal">
                Open Swift Sweeps from your Home Screen and tap <strong>Allow Notifications</strong>. You will now get alerts even when closed!
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99]"
        >
          Got It, Let&apos;s Do It
        </button>
      </div>
    </div>
  );
};
