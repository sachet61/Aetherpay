import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  FileText,
  Gift,
  LogOut,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { OfficialPartner, UserProfile, UserWallet } from '../../types';
import { dataService } from '../../services/dataService';
import {
  getCustomerFirstName,
  getDrawerPreviewPartners,
  getMessageLink,
  resolvePartnerIconUrl,
  sortOfficialPartners,
} from '../../utils/officialPartnersUtils';
import { SwiftSweepsLogo } from '../common/SwiftSweepsLogo';
import { PartnerIcon } from '../common/PartnerVisuals';
import { WheelGlyph } from '../customer/WheelGlyph';
import { useWheelAvailability } from '../../hooks/useWheelAvailability';

interface CustomerMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  wallet: UserWallet;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onLogout?: () => void;
  spinAvailable?: boolean;
  onOpenWheel?: () => void;
}

export const CustomerMobileDrawer: React.FC<CustomerMobileDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  wallet,
  activeTab,
  onNavigateTab,
  onLogout,
  spinAvailable,
  onOpenWheel,
}) => {
  const wheelContext = useWheelAvailability();
  const effectiveSpinAvailable = spinAvailable ?? wheelContext.spinAvailable;
  const effectiveOpenWheel = onOpenWheel ?? wheelContext.openWheelModal;

  const [visiblePartners, setVisiblePartners] = useState<OfficialPartner[]>(() =>
    sortOfficialPartners(
      dataService.getCachedOfficialPartners().filter((p) => p.isVisible),
      'manual'
    )
  );

  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const syncPartners = async () => {
      const res = await dataService.fetchOfficialPartners();
      if (!cancelled && res.success) {
        setVisiblePartners(
          sortOfficialPartners(
            res.partners.filter((p) => p.isVisible),
            'manual'
          )
        );
      }
    };

    void syncPartners();

    const onStateChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const key = detail?.key;
      const tables: string[] = Array.isArray(detail?.tables) ? detail.tables : [];
      if (
        key === 'official_partners_updated' ||
        key === 'delta_sync' ||
        tables.includes('official_partners')
      ) {
        void syncPartners();
      }
    };

    window.addEventListener('aetherpay_state_changed', onStateChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('aetherpay_state_changed', onStateChanged);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const rafId = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !drawerRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !drawerRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (previousFocusedRef.current?.isConnected) {
        previousFocusedRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  const previewPartners = useMemo(
    () => getDrawerPreviewPartners(visiblePartners, 3),
    [visiblePartners]
  );

  if (!isOpen || currentUser.role !== 'customer' || typeof document === 'undefined') return null;

  const firstName = getCustomerFirstName(currentUser.displayName);

  const handleSelectTab = (tab: string) => {
    onClose();
    onNavigateTab(tab);
  };

  const handleSelectWheel = () => {
    onClose();
    effectiveOpenWheel();
  };

  const handleSignOut = () => {
    onClose();
    onLogout?.();
  };

  const navItemClass = (isActive: boolean) =>
    `w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
      isActive
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 font-semibold'
        : 'text-slate-100 border-transparent hover:bg-slate-800/70 hover:text-white'
    }`;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      data-testid="customer-mobile-drawer-overlay"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
        data-testid="customer-mobile-drawer-backdrop"
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Swift Sweeps Menu"
        data-testid="customer-mobile-drawer"
        className="relative w-[78vw] max-w-[320px] bg-[#0A0F1D] border-l border-amber-500/25 h-full max-h-dvh flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200 motion-reduce:animate-none"
      >
        {/* 1. Header: Logo, "Swift Sweeps", Close (X) button */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800/80 bg-[#0E1726]/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <SwiftSweepsLogo size="sm" showText={false} />
            <span className="text-base font-extrabold tracking-tight text-white truncate">
              Swift <span className="text-amber-400">Sweeps</span>
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="customer-drawer-close"
            className="w-11 h-11 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Compact profile row: avatar and first name (one line, no Player badge, no email) */}
        <div
          data-testid="customer-drawer-profile-row"
          className="shrink-0 mx-3 mt-3 px-3 py-2.5 rounded-xl bg-[#0E1726] border border-slate-800 flex items-center gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/35 flex items-center justify-center font-bold text-amber-300 text-sm overflow-hidden shrink-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={firstName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{firstName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-sm font-bold text-white truncate">
              {firstName}
            </span>
          </div>
        </div>

        {/* 3. Menu list (scrollable only if height requires; fits cleanly on 390x844) */}
        <nav
          aria-label="Customer Navigation"
          data-testid="customer-drawer-nav"
          className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-1"
        >
          <button
            type="button"
            onClick={() => handleSelectTab('wallet')}
            data-testid="drawer-item-wallet"
            className={navItemClass(activeTab === 'wallet')}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Wallet and ledger</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('referrals')}
            data-testid="drawer-item-referrals"
            className={navItemClass(activeTab === 'referrals')}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Referrals and rewards</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleSelectWheel}
            data-testid="drawer-item-wheel"
            className={navItemClass(false)}
          >
            <span className="flex items-center gap-3 min-w-0">
              <WheelGlyph active={effectiveSpinAvailable} className="w-4 h-4 shrink-0" />
              <span className="truncate">Wheel of Luck</span>
            </span>
            {effectiveSpinAvailable && (
              <span
                data-testid="drawer-wheel-dot"
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('profile')}
            data-testid="drawer-item-profile"
            className={navItemClass(activeTab === 'profile')}
          >
            <span className="flex items-center gap-3 min-w-0">
              <User className="w-4 h-4 text-indigo-300 shrink-0" />
              <span className="truncate">Account profile</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('rules')}
            data-testid="drawer-item-rules"
            className={navItemClass(activeTab === 'rules')}
          >
            <span className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="truncate">Sweepstakes rules</span>
            </span>
          </button>
        </nav>

        {/* Pinned Bottom Section: Official partners card + Sign out */}
        <div
          data-testid="customer-drawer-pinned-footer"
          className="shrink-0 mt-auto px-3 pt-2 pb-4 pb-safe space-y-2.5 border-t border-slate-800/80 bg-[#0A0F1D]"
        >
          {/* 4. Official partners card (amber style) */}
          <div
            data-testid="drawer-official-partners-card"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a,button')) return;
              handleSelectTab('official_partners');
            }}
            className="rounded-xl bg-amber-500/10 border border-amber-500/35 hover:border-amber-400/60 p-3 space-y-2 transition-colors cursor-pointer"
          >
            <button
              type="button"
              onClick={() => handleSelectTab('official_partners')}
              data-testid="drawer-official-partners-trigger"
              className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-snug">
                  Official partners
                </div>
                <div className="text-xs text-amber-200/90 leading-snug">
                  Message them anytime
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
            </button>

            {previewPartners.length > 0 && (
              <div
                data-testid="drawer-partner-icons-row"
                className="flex items-center gap-2 pt-0.5"
              >
                {previewPartners.map((partner) => (
                  <a
                    key={partner.id}
                    href={getMessageLink(partner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onClose()}
                    aria-label={partner.name}
                    title={partner.name}
                    data-testid={`drawer-partner-link-${partner.id}`}
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#0E1726]/80 border border-amber-500/25 hover:border-amber-400/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <PartnerIcon
                      name={partner.name}
                      iconUrl={resolvePartnerIconUrl(partner.iconUrl)}
                      platform={partner.platform}
                      size="sm"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 5. Sign out (full-width danger-style button at the very bottom) */}
          {onLogout && (
            <button
              type="button"
              onClick={handleSignOut}
              data-testid="drawer-sign-out"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-200 hover:text-white bg-rose-950/60 hover:bg-rose-900/75 border border-rose-700/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <LogOut className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
};
