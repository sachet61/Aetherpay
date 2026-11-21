import React, { useState } from 'react';
import { UserProfile, GameCatalogItem, GameAccount, UserWallet, OfficialPartner } from '../../types';
import { dataService } from '../../services/dataService';
import {
  DEFAULT_GAME_ICON,
  TOP_PRIORITY_GAME_COUNT,
  resolveGameImageUrl,
} from '../../utils/imageUtils';
import { isSafeExternalHttpUrl } from '../../utils/gameCardUtils';
import { getMessageLink, sortOfficialPartners } from '../../utils/officialPartnersUtils';
import { PlatformGlyph } from '../../components/common/PartnerVisuals';
import {
  Gamepad2,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Send,
  ArrowDownToLine,
  MoreHorizontal,
} from 'lucide-react';

interface CustomerGameAccountsProps {
  currentUser: UserProfile;
  wallet?: UserWallet;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const CustomerGameAccounts: React.FC<CustomerGameAccountsProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const catalog = dataService.getGameCatalog().filter((g) => g.enabled);
  const [playerAccounts, setPlayerAccounts] = useState<GameAccount[]>(() =>
    dataService.getGameAccounts(currentUser.id)
  );
  const [visiblePartners, setVisiblePartners] = useState<OfficialPartner[]>(() =>
    sortOfficialPartners(dataService.getCachedOfficialPartners().filter((p) => p.isVisible))
  );

  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;
    // 1. Initial on-demand hydration from database
    dataService
      .fetchGameAccountsFromDb(currentUser.id)
      .then((accs) => {
        if (!mounted) return;
        if (accs) setPlayerAccounts(accs);
        setIsHydrating(false);
      })
      .catch(() => {
        if (mounted) setIsHydrating(false);
      });

    const loadPartners = () => {
      void dataService.fetchOfficialPartners().then((res) => {
        if (mounted && res.success) {
          setVisiblePartners(sortOfficialPartners(res.partners.filter((p) => p.isVisible)));
        }
      });
    };
    loadPartners();

    // 2. Realtime state listeners
    const handleSync = (e?: any) => {
      const key = e?.detail?.key;
      const tables: string[] = Array.isArray(e?.detail?.tables) ? e.detail.tables : [];
      if (!key || key === 'aetherpay_game_accounts' || key === 'game_credentials_assigned' || key === 'delta_sync') {
        setPlayerAccounts(dataService.getGameAccounts(currentUser.id));
      }
      if (key === 'official_partners_updated' || key === 'delta_sync' || tables.includes('official_partners')) {
        loadPartners();
      }
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      mounted = false;
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUser.id]);

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState<GameCatalogItem | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<GameAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuGameId, setOpenMenuGameId] = useState<string | null>(null);
  const [openMenuUpward, setOpenMenuUpward] = useState(false);

  React.useEffect(() => {
    if (!openMenuGameId) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-game-card-menu]')) {
        setOpenMenuGameId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuGameId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuGameId]);

  const togglePasswordVisibility = (accountId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        return;
      }
    }
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmRequestGameId = () => {
    if (!showRequestConfirmModal) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const res = dataService.requestGameCredentials({
        customerId: currentUser.id,
        customerName: currentUser.displayName,
        gameCatalogId: showRequestConfirmModal.id,
      });

      setIsSubmitting(false);
      setShowRequestConfirmModal(null);

      if (res.success) {
        setNotificationMsg({
          text: `Request for "${showRequestConfirmModal.title}" dispatched to Customer Support! A specialist will assign your login ID & password shortly.`,
          type: 'success',
        });
        setTimeout(() => setNotificationMsg(null), 5000);
      } else {
        setNotificationMsg({ text: res.message, type: 'info' });
        setTimeout(() => setNotificationMsg(null), 4000);
      }
    }, 400);
  };

  const handleConfirmResetPassword = () => {
    if (!showResetConfirmModal) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const res = dataService.requestGamePasswordReset({
        accountId: showResetConfirmModal.id,
        customerId: currentUser.id,
        customerName: currentUser.displayName,
      });

      setIsSubmitting(false);
      const gameTitle = showResetConfirmModal.gameName;
      setShowResetConfirmModal(null);

      if (res.success) {
        setNotificationMsg({
          text: `Password update request for "${gameTitle}" forwarded to Customer Support. An operator is updating your credentials.`,
          type: 'success',
        });
        setTimeout(() => setNotificationMsg(null), 5000);
      }
    }, 400);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-[calc(env(safe-area-inset-bottom,0px)+9.5rem)] md:pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gaming IDs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Active logins appear first. Request an ID for any game to play.
          </p>
        </div>
        {isHydrating && playerAccounts.length === 0 && (
          <span className="text-[11px] text-slate-400 font-medium">Checking saved IDs...</span>
        )}
      </div>

      {notificationMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : notificationMsg.type === 'error'
              ? 'bg-rose-950/60 border-rose-800 text-rose-300'
              : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
          }`}
        >
          {notificationMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Dynamic List of Games from Admin Catalog - Priority Sorted: Active IDs First, Pending Second, Available to Request Third */}
      {(() => {
        const sortedCatalog = [...catalog].sort((a, b) => {
          const accA = playerAccounts.find((acc) => acc.gameCatalogId === a.id || acc.gameName.toLowerCase() === a.title.toLowerCase());
          const accB = playerAccounts.find((acc) => acc.gameCatalogId === b.id || acc.gameName.toLowerCase() === b.title.toLowerCase());
          const getScore = (acc?: GameAccount) => {
            if (acc?.status === 'active') return 0;
            if (acc?.status === 'pending_assignment' || acc?.status === 'pending_reset') return 1;
            return 2;
          };
          const scoreDiff = getScore(accA) - getScore(accB);
          if (scoreDiff !== 0) return scoreDiff;
          return a.title.localeCompare(b.title);
        });

        if (sortedCatalog.length === 0) {
          return (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 text-center space-y-1.5">
              <Gamepad2 className="w-6 h-6 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-white">No games available right now</div>
              <p className="text-xs text-slate-400">Enabled platforms will appear here once configured.</p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-3.5 sm:gap-4">
            {sortedCatalog.map((game, index) => {
              const account = playerAccounts.find(
                (a) => a.gameCatalogId === game.id || a.gameName.toLowerCase() === game.title.toLowerCase()
              );

              const isRevealed = account ? !!revealedPasswords[account.id] : false;
              const hasActiveCredentials = Boolean(account && account.status === 'active');
              const isPendingAssignment = Boolean(account && account.status === 'pending_assignment');
              const isPendingReset = Boolean(account && account.status === 'pending_reset');
              const hasDownloadLink = isSafeExternalHttpUrl(game.downloadUrl);
              const hasResetAction = Boolean(hasActiveCredentials && account);
              const hasMenuActions = hasDownloadLink || hasResetAction;
              const isMenuOpen = openMenuGameId === game.id;
              const linkedPartner = visiblePartners.find((p) => p.gameId === game.id);

              return (
                <div
                  key={game.id}
                  data-testid={`gaming-id-card-${game.id}`}
                  data-account-state={
                    hasActiveCredentials
                      ? 'active'
                      : isPendingAssignment
                      ? 'pending_assignment'
                      : isPendingReset
                      ? 'pending_reset'
                      : 'unrequested'
                  }
                  className={`p-3.5 sm:p-4 rounded-2xl border shadow-lg transition-colors flex flex-col justify-between gap-3 ${
                    isMenuOpen ? 'relative z-30' : 'relative'
                  } ${
                    hasActiveCredentials
                      ? 'bg-slate-900 border-emerald-500/25 hover:border-emerald-500/45'
                      : isPendingAssignment || isPendingReset
                      ? 'bg-amber-950/15 border-amber-700/50'
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Consistent Header Lockup with Status Attached Next to Game Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                        <img
                          src={resolveGameImageUrl(game.imageUrl || game.iconUrl)}
                          alt={game.title}
                          width={44}
                          height={44}
                          loading={index < TOP_PRIORITY_GAME_COUNT ? 'eager' : 'lazy'}
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.dataset.fallbackApplied) return;
                            img.dataset.fallbackApplied = '1';
                            img.src = DEFAULT_GAME_ICON;
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="text-sm font-bold text-white leading-tight truncate">
                            {game.title}
                          </h3>

                          {hasActiveCredentials ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              <span>Ready to Play</span>
                            </span>
                          ) : isPendingAssignment ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Setup Pending</span>
                            </span>
                          ) : isPendingReset ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Password Resetting</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/80 whitespace-nowrap">
                              No ID Yet
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="text-[11px] text-indigo-400 font-medium truncate">
                            {game.platform}
                          </div>
                          {linkedPartner && (
                            <a
                              href={getMessageLink(linkedPartner)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0 transition-colors"
                              title={`Message ${linkedPartner.name}`}
                            >
                              <PlatformGlyph platform={linkedPartner.platform} className="w-3 h-3 shrink-0" />
                              <span>Message partner</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Credentials or Compact Pending Strip (Omitted cleanly for unrequested games) */}
                    {hasActiveCredentials && account && (
                      <div className="px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-800/90 divide-y divide-slate-800/80 text-xs">
                        <div className="py-2 grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2 min-w-0">
                          <span className="text-slate-300 font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>Username</span>
                          </span>
                          <span className="font-mono font-semibold text-white select-all truncate">
                            {account.username}
                          </span>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(account.username, `user_${account.id}`)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/90 inline-flex items-center justify-center transition-colors"
                              title="Copy Username"
                              aria-label={`Copy username for ${game.title}`}
                            >
                              {copiedField === `user_${account.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="py-2 grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2 min-w-0">
                          <span className="text-slate-300 font-medium flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>Password</span>
                          </span>

                          <span className="font-mono text-xs select-all truncate">
                            {isRevealed ? (
                              <span className="text-emerald-400 font-semibold tracking-wider">
                                {account.password || 'Pass#Default'}
                              </span>
                            ) : (
                              <span className="text-slate-400 tracking-wider">••••••••</span>
                            )}
                          </span>

                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(account.id)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/90 inline-flex items-center justify-center transition-colors"
                              title={isRevealed ? 'Hide Password' : 'Show Password'}
                              aria-label={`${isRevealed ? 'Hide' : 'Show'} password for ${game.title}`}
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3.5 h-3.5 text-slate-200" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopy(account.password || 'Pass#Default', `pass_${account.id}`)}
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/90 inline-flex items-center justify-center transition-colors"
                              title="Copy Password"
                              aria-label={`Copy password for ${game.title}`}
                            >
                              {copiedField === `pass_${account.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isPendingAssignment && (
                      <div className="px-3 py-2 rounded-xl bg-amber-950/35 border border-amber-700/40 text-[11px] text-amber-200 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Support is preparing your login credentials.</span>
                      </div>
                    )}

                    {isPendingReset && (
                      <div className="px-3 py-2 rounded-xl bg-cyan-950/35 border border-cyan-700/40 text-[11px] text-cyan-200 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Support is issuing your new password.</span>
                      </div>
                    )}
                  </div>

                  {/* Consistent Action Hierarchy: Proportional Primary / Secondary / Overflow Menu */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-slate-800/80">
                    {hasActiveCredentials && account ? (
                      <>
                        <a
                          href={game.gameUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>Launch Game</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => onNavigateTab('topup', { gameCatalogId: game.id })}
                          className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-indigo-600/25 whitespace-nowrap"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                          <span>Top-Up</span>
                        </button>
                      </>
                    ) : isPendingAssignment || isPendingReset ? (
                      <>
                        <div className="flex-1" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => onNavigateTab('chat')}
                          className="flex-1 min-w-[136px] h-10 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-indigo-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span>View Ticket</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => setShowRequestConfirmModal(game)}
                          className="flex-1 min-w-[136px] h-10 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-indigo-600/25 whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Request ID</span>
                        </button>
                      </>
                    )}

                    {hasMenuActions && (
                      <div className="relative shrink-0" data-game-card-menu>
                        <button
                          type="button"
                          aria-label={`More actions for ${game.title}`}
                          aria-expanded={isMenuOpen}
                          aria-haspopup="menu"
                          onClick={(e) => {
                            if (isMenuOpen) {
                              setOpenMenuGameId(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setOpenMenuUpward(window.innerHeight - rect.bottom < 140);
                            setOpenMenuGameId(game.id);
                          }}
                          className="w-10 h-10 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white inline-flex items-center justify-center transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            role="menu"
                            aria-label={`${game.title} secondary actions`}
                            className={`absolute right-0 w-44 rounded-xl bg-[#0E1726] border border-slate-700 shadow-2xl p-1.5 z-40 space-y-0.5 ${
                              openMenuUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                            }`}
                          >
                            {hasDownloadLink && (
                              <a
                                role="menuitem"
                                href={game.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenMenuGameId(null)}
                                className="w-full px-2.5 py-2 rounded-lg text-xs text-emerald-400 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                                <span>Download App</span>
                              </a>
                            )}
                            {hasResetAction && account && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuGameId(null);
                                  setShowResetConfirmModal(account);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-amber-400 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                              >
                                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                <span>Reset Password</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Confirmation Modal for Requesting New Game ID */}
      {showRequestConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowRequestConfirmModal(null)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-indigo-400" />
                <span>Request Game ID &amp; Password</span>
              </h3>
              <button
                onClick={() => setShowRequestConfirmModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Would you like Customer Support to provision a tournament account and password for{' '}
              <strong className="text-white font-semibold">{showRequestConfirmModal.title}</strong> ({showRequestConfirmModal.platform})?
            </p>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs leading-relaxed space-y-1">
              <div className="font-semibold">Forwarding to Customer Support</div>
              <div>
                This action creates an expedited ticket with our support specialists. Once assigned, your username and password will appear directly on this card.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRequestGameId}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? 'Forwarding...' : 'Forward to Support'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Password Reset */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowResetConfirmModal(null)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Request Password Update</span>
              </h3>
              <button
                onClick={() => setShowResetConfirmModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Request customer support to rotate your login password for{' '}
              <strong className="text-white font-mono">{showResetConfirmModal.username}</strong> on{' '}
              <strong className="text-white">{showResetConfirmModal.gameName}</strong>?
            </p>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs leading-relaxed">
              Our customer care operators will update your password and post the confirmation directly into your support channel.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmResetPassword}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                {isSubmitting ? 'Dispatching...' : 'Dispatch Reset Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
