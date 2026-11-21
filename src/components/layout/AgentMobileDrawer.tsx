import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, LogOut, MessageCircle, X } from 'lucide-react';
import type { UserProfile } from '../../types';
import { SwiftSweepsLogo } from '../common/SwiftSweepsLogo';
import {
  canRenderAgentDrawer,
  getAgentDrawerListItems,
  getAgentFirstName,
} from './agentMobileDrawerConfig';

interface AgentMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onLogout?: () => void;
}

export const AgentMobileDrawer: React.FC<AgentMobileDrawerProps> = ({
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
    if (!isOpen || !canRenderAgentDrawer(currentUser.role)) return;

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

  const listItems = useMemo(() => getAgentDrawerListItems(), []);

  if (!isOpen || !canRenderAgentDrawer(currentUser.role) || typeof document === 'undefined') {
    return null;
  }

  const firstName = getAgentFirstName(currentUser.displayName);

  const handleSelectTab = (tab: string) => {
    onClose();
    onNavigateTab(tab);
  };

  const handleSignOut = () => {
    onClose();
    onLogout?.();
  };

  const navItemClass = (isActive: boolean) =>
    `w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
      isActive
        ? 'bg-slate-800/90 text-white border-slate-600 font-semibold'
        : 'text-slate-100 border-transparent hover:bg-slate-800/70 hover:text-white'
    }`;

  const renderItemIcon = (kind: 'partners' | 'rules') => {
    switch (kind) {
      case 'partners':
        return <MessageCircle className="w-4 h-4 text-cyan-300 shrink-0" aria-hidden="true" />;
      case 'rules':
        return <FileText className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      data-testid="agent-mobile-drawer-overlay"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
        data-testid="agent-mobile-drawer-backdrop"
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Swift Sweeps Support Menu"
        data-testid="agent-mobile-drawer"
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
            data-testid="agent-drawer-close"
            className="w-11 h-11 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Compact profile row: avatar, first name, "Support" badge (one line, no email) */}
        <div
          data-testid="agent-drawer-profile-row"
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

          <span className="shrink-0 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-cyan-950 text-cyan-200 border border-cyan-700/60">
            Support
          </span>
        </div>

        {/* 3. Short list */}
        <nav
          aria-label="Support Navigation"
          data-testid="agent-drawer-nav"
          className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1"
        >
          {listItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                data-testid={`agent-drawer-item-${item.kind}`}
                aria-current={isActive ? 'page' : undefined}
                className={navItemClass(isActive)}
              >
                {renderItemIcon(item.kind)}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 4. Sign out: full-width danger-style button pinned at the bottom */}
        {onLogout && (
          <div
            data-testid="agent-drawer-pinned-footer"
            className="shrink-0 mt-auto px-3 pt-2.5 pb-4 pb-safe border-t border-slate-800/80 bg-[#0A0F1D]"
          >
            <button
              type="button"
              onClick={handleSignOut}
              data-testid="agent-drawer-sign-out"
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
