import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Gamepad2,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import { SwiftSweepsLogo } from '../common/SwiftSweepsLogo';
import {
  ADMIN_DRAWER_FEATURED_ITEM,
  canRenderAdminDrawer,
  getAdminDrawerListItems,
  getAdminFirstName,
} from './adminMobileDrawerConfig';

interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onLogout?: () => void;
}

export const AdminMobileDrawer: React.FC<AdminMobileDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeTab,
  onNavigateTab,
  onLogout,
}) => {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !canRenderAdminDrawer(currentUser.role)) return;

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
  }, [isOpen, currentUser.role, onClose]);

  const listItems = useMemo(() => getAdminDrawerListItems(), []);

  if (!isOpen || !canRenderAdminDrawer(currentUser.role) || typeof document === 'undefined') {
    return null;
  }

  const firstName = getAdminFirstName(currentUser.displayName);

  const handleSelectTab = (tab: string) => {
    onClose();
    onNavigateTab(tab);
  };

  const handleSignOut = () => {
    onClose();
    onLogout?.();
  };

  const navItemClass = (isActive: boolean) =>
    `w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      isActive
        ? 'bg-slate-800/90 text-white border-slate-600 font-semibold'
        : 'text-slate-100 border-transparent hover:bg-slate-800/70 hover:text-white'
    }`;

  const renderItemIcon = (kind: 'catalog' | 'partners' | 'audit') => {
    switch (kind) {
      case 'catalog':
        return <Gamepad2 className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />;
      case 'partners':
        return <MessageCircle className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />;
      case 'audit':
        return <Shield className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />;
    }
  };

  const isConfigActive = activeTab === ADMIN_DRAWER_FEATURED_ITEM.id;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      data-testid="admin-mobile-drawer-overlay"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
        data-testid="admin-mobile-drawer-backdrop"
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Swift Sweeps Admin Menu"
        data-testid="admin-mobile-drawer"
        className="relative w-[78vw] max-w-[320px] bg-[#0A0F1D] border-l border-slate-800 h-full max-h-dvh flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200 motion-reduce:animate-none"
      >
        {/* 1. Header: Logo, "Swift Sweeps", Close (X) button */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800/80 bg-[#0E1726]/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <SwiftSweepsLogo size="sm" showText={false} />
            <span className="text-base font-extrabold tracking-tight text-white truncate">
              Swift Sweeps
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="admin-drawer-close"
            className="w-11 h-11 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Compact profile row: avatar, first name, "Admin" badge (one line, no email) */}
        <div
          data-testid="admin-drawer-profile-row"
          className="shrink-0 mx-3 mt-3 px-3 py-2.5 rounded-xl bg-[#0E1726] border border-slate-800 flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-100 text-sm overflow-hidden shrink-0">
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

          <span className="shrink-0 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700">
            Admin
          </span>
        </div>

        {/* 3 & 4. Scrollable middle: Featured Config card (only amber element) + Short list */}
        <nav
          aria-label="Admin Navigation"
          data-testid="admin-drawer-nav"
          className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5"
        >
          {/* 3. Featured card (amber style): "Fees and bonuses" with Settings icon and "Config" tag */}
          <button
            type="button"
            onClick={() => handleSelectTab(ADMIN_DRAWER_FEATURED_ITEM.id)}
            data-testid="admin-drawer-item-config"
            aria-current={isConfigActive ? 'page' : undefined}
            className={`w-full min-h-[48px] flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-left border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              isConfigActive
                ? 'bg-amber-500/20 border-amber-400/80 text-white'
                : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-400/70 text-white'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Settings className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold text-white truncate">
                {ADMIN_DRAWER_FEATURED_ITEM.label}
              </span>
            </span>
            <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/40">
              {ADMIN_DRAWER_FEATURED_ITEM.tag}
            </span>
          </button>

          {/* 4. Short list below the card */}
          <div className="space-y-1">
            {listItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  data-testid={`admin-drawer-item-${item.kind}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={navItemClass(isActive)}
                >
                  {renderItemIcon(item.kind)}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* 5. Sign out: full-width danger-style button pinned at the bottom */}
        {onLogout && (
          <div
            data-testid="admin-drawer-pinned-footer"
            className="shrink-0 mt-auto px-3 pt-2.5 pb-4 pb-safe border-t border-slate-800/80 bg-[#0A0F1D]"
          >
            <button
              type="button"
              onClick={handleSignOut}
              data-testid="admin-drawer-sign-out"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-200 hover:text-white bg-rose-950/60 hover:bg-rose-900/75 border border-rose-700/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <LogOut className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
};
