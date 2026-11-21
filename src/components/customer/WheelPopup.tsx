import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { WheelGlyph } from './WheelGlyph';

interface WheelPopupProps {
  isOpen: boolean;
  onSpinNow: () => void;
  onDismiss: () => void;
}

export const WheelPopup: React.FC<WheelPopupProps> = ({
  isOpen,
  onSpinNow,
  onDismiss,
}) => {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const spinButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusedRef = useRef<HTMLElement | null>(null);
  const transitionToWheelRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    transitionToWheelRef.current = false;
    previousFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const rafId = window.requestAnimationFrame(() => {
      spinButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (!transitionToWheelRef.current && previousFocusedRef.current?.isConnected) {
        previousFocusedRef.current.focus();
      }
    };
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const handleSpinNowClick = () => {
    transitionToWheelRef.current = true;
    onSpinNow();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      data-testid="wheel-popup-dialog"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-[80vw] max-w-[360px] sm:w-full sm:max-w-[400px] rounded-2xl bg-[#0E1726] border border-amber-500/35 p-6 shadow-2xl text-center motion-reduce:transition-none"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          data-testid="wheel-popup-close"
          className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center pt-2">
          <div className="relative w-20 h-20 flex items-center justify-center mb-4">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl pointer-events-none"
            />
            <WheelGlyph active className="relative w-16 h-16" />
          </div>

          <h2
            id={headingId}
            className="text-lg font-extrabold text-white tracking-tight mb-5"
          >
            Your daily spin is ready
          </h2>

          <div className="w-full space-y-2">
            <button
              ref={spinButtonRef}
              type="button"
              onClick={handleSpinNowClick}
              data-testid="wheel-popup-spin-now"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1726]"
            >
              Spin now
            </button>

            <button
              type="button"
              onClick={onDismiss}
              data-testid="wheel-popup-not-now"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
