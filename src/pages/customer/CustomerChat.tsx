import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, ChatMessage, SupportConversation } from '../../types';
import { dataService } from '../../services/dataService';
import { realtimeChatHub } from '../../services/chatRealtime';
import { mapDbMessageRowToChatMessage, sortAndDeduplicateMessages } from '../../services/chatOrderUtils';
import {
  CHAT_QUICK_EMOJIS,
  buildGroupedMessages,
  deriveTruthfulConnectionStatus,
  filterVisibleMessagesForRole,
  formatChatTime,
  formatTicketTag,
  getInitials,
  isMessageInternalNote,
} from '../../utils/chatPresentationUtils';
import { ChatTransactionCard } from '../../components/chat/ChatTransactionCard';
import {
  Send,
  Paperclip,
  Headphones,
  Check,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronUp,
  RefreshCw,
  LogOut,
  Gamepad2,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  ZoomIn,
  MoreVertical,
  Smile,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { notificationSoundService } from '../../services/notificationSoundService';
import { storageService } from '../../services/storageService';
import { toProxyStorageUrl, toDirectSupabaseStorageUrl } from '../../services/storageUrlUtils';
import { supabaseUrl } from '../../services/supabaseClient';

interface CustomerChatProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: string, meta?: any) => void;
  onGoBack?: () => void;
}

export const CustomerChat: React.FC<CustomerChatProps> = ({
  currentUser,
  onNavigateTab,
  onGoBack,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [showGameRequestModal, setShowGameRequestModal] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedPendingMsgId, setFailedPendingMsgId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncHealth, setSyncHealth] = useState(() => dataService.getSyncHealth());
  const [realtimeStatus, setRealtimeStatus] = useState<string>('SUBSCRIBING');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, number>>({});
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);

  const [soundEnabled, setSoundEnabled] = useState(() => notificationSoundService.isSoundEnabled());
  const [desktopEnabled, setDesktopEnabled] = useState(() => notificationSoundService.isDesktopEnabled());
  const [notifPermission, setNotifPermission] = useState(() => notificationSoundService.getPermissionStatus());

  const handleLoadOlderMessages = async () => {
    if (!conversation?.id || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestTimestamp = messages[0].createdAt;
    const oldestId = messages[0].id;
    const res = await dataService.fetchOlderMessages(conversation.id, oldestTimestamp, 50, oldestId);
    setLoadingOlder(false);
    if (!res.hasMore) {
      setHasMoreOlder(false);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    notificationSoundService.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) {
      notificationSoundService.playIncomingMessageSound();
    }
  };

  const handleToggleDesktopNotifs = async () => {
    if (notifPermission !== 'granted') {
      const granted = await notificationSoundService.requestDesktopPermission();
      setNotifPermission(notificationSoundService.getPermissionStatus());
      setDesktopEnabled(granted);
      if (granted) {
        notificationSoundService.playIncomingMessageSound();
        notificationSoundService.showDesktopNotification('Swift Sweeps Support Notifications Active', {
          body: 'You will receive live desktop alerts when specialists send messages.',
        });
      }
    } else {
      const next = !desktopEnabled;
      notificationSoundService.setDesktopEnabled(next);
      setDesktopEnabled(next);
    }
  };

  // Auto-resize composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputText]);

  // Close popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showEmojiPicker && emojiContainerRef.current && !emojiContainerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
      if (showMobileMenu && menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker, showMobileMenu]);

  // Track genuine browser + sync health
  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    const onSyncChange = (e: any) => {
      if (e?.detail) setSyncHealth(e.detail);
      else setSyncHealth(dataService.getSyncHealth());
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('aetherpay_sync_state_changed', onSyncChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('aetherpay_sync_state_changed', onSyncChange);
    };
  }, []);

  // Initialize or load conversation
  useEffect(() => {
    const canonicalConvId = `conv_${currentUser.id}`;
    const conv = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
    conv.id = canonicalConvId;
    setConversation(conv);
    setMessages(filterVisibleMessagesForRole(dataService.getMessages(canonicalConvId), 'customer'));
    dataService.markConversationRead(canonicalConvId, 'customer');

    dataService.fetchMessagesForConversation(canonicalConvId, { limit: 50 }).then((freshMsgs) => {
      setMessages(filterVisibleMessagesForRole(freshMsgs || [], 'customer'));
    });

    const handleSync = () => {
      const updated = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
      if (updated) {
        updated.id = canonicalConvId;
        setConversation(updated);
        setMessages(filterVisibleMessagesForRole(dataService.getMessages(canonicalConvId), 'customer'));
      }
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);

    const unsubRoom = realtimeChatHub.subscribeChatRoom(
      `chat_${canonicalConvId}`,
      {
        postgresFilter: {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${canonicalConvId}`,
        },
      },
      {
        onStatus: (status) => setRealtimeStatus(status),
        onBroadcast: (payload) => {
          if (!payload || !payload.id) return;
          if (isMessageInternalNote(payload)) return;
          dataService.appendIncomingMessage(payload);
          setMessages((prev) =>
            filterVisibleMessagesForRole(sortAndDeduplicateMessages([...prev, payload], true), 'customer')
          );
          if (payload.senderRole === 'agent' || payload.senderRole === 'admin') {
            notificationSoundService.playIncomingMessageSound();
          }
        },
        onPostgresChange: (payload) => {
          const row: any = payload?.new;
          if (!row || !row.id) return;
          const incoming = mapDbMessageRowToChatMessage(row, canonicalConvId);
          if (isMessageInternalNote(incoming)) return;
          dataService.appendIncomingMessage(incoming);
          setMessages((prev) =>
            filterVisibleMessagesForRole(sortAndDeduplicateMessages([...prev, incoming], true), 'customer')
          );

          if (incoming.senderRole === 'agent' || incoming.senderRole === 'admin') {
            notificationSoundService.playIncomingMessageSound();
            if (document.hidden) {
              notificationSoundService.showDesktopNotification(
                `Support: ${incoming.senderName}`,
                { body: incoming.text }
              );
            }
          }
        },
      }
    );

    let lastCatchUpTime = 0;
    const performCatchUp = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastCatchUpTime < 800) return;
      lastCatchUpTime = now;
      dataService.fetchMessagesForConversation(canonicalConvId, { limit: 50 }).then((fresh) => {
        if (fresh && fresh.length > 0) {
          setMessages(filterVisibleMessagesForRole(fresh, 'customer'));
        }
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        performCatchUp();
      }
    };
    const handleFocus = () => performCatchUp();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      unsubRoom();
    };
  }, [currentUser.id, currentUser.displayName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;
    if (!inputText.trim() && !attachmentUrl) return;

    const canonicalConvId = `conv_${currentUser.id}`;
    const pendingText = inputText.trim();
    const pendingAttachmentUrl = attachmentUrl || undefined;
    const pendingAttachmentName = attachmentName || undefined;

    setIsSending(true);
    setSendError(null);
    setShowEmojiPicker(false);

    try {
      let confirmed: ChatMessage | null = null;
      if (failedPendingMsgId) {
        confirmed = await dataService.retryChatMessage(canonicalConvId, failedPendingMsgId);
      }
      if (!confirmed) {
        confirmed = await dataService.sendChatMessageConfirmed({
          conversationId: canonicalConvId,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          senderRole: 'customer',
          text: pendingText,
          attachmentUrl: pendingAttachmentUrl,
          attachmentName: pendingAttachmentName,
          isInternalNote: false,
        });
      }

      setMessages((prev) =>
        filterVisibleMessagesForRole(sortAndDeduplicateMessages([...prev, confirmed!], true), 'customer')
      );

      if (confirmed.deliveryStatus === 'failed') {
        setFailedPendingMsgId(confirmed.id);
        setSendError(confirmed.deliveryError || 'Message failed to send. Your draft is preserved.');
      } else {
        setInputText('');
        setAttachmentName(null);
        setAttachmentUrl(null);
        setUploadError(null);
        setFailedPendingMsgId(null);
      }
    } catch (err: any) {
      setSendError(err?.message || 'Unable to send message. Your draft is preserved.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    setUploadError(null);
    setIsUploadingAttachment(true);
    try {
      const result = await storageService.uploadChatAttachment(file, conversation.id);
      if (result.success && result.url) {
        setAttachmentUrl(result.url);
        setAttachmentName(result.name || file.name);
      } else {
        setUploadError(result.error || 'Failed to upload image. Your message draft is preserved.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmGameRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId || !conversation) return;
    const game = gameCatalog.find((g) => g.id === selectedGameId);
    if (!game) return;

    dataService.requestGameCredentials({
      customerId: currentUser.id,
      customerName: currentUser.displayName,
      gameCatalogId: game.id,
    });

    setShowGameRequestModal(false);
  };

  const visibleMessages = useMemo(
    () => filterVisibleMessagesForRole(messages, 'customer'),
    [messages]
  );

  const groupedMessages = useMemo(
    () => buildGroupedMessages(visibleMessages),
    [visibleMessages]
  );

  const connectionStatus = useMemo(
    () =>
      deriveTruthfulConnectionStatus({
        browserOnline,
        syncStatus: syncHealth.status,
        realtimeStatus,
      }),
    [browserOnline, syncHealth.status, realtimeStatus]
  );

  const userInitials = useMemo(() => getInitials(currentUser.displayName), [currentUser.displayName]);

  const handleExit = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      onNavigateTab('dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100dvh-13.5rem)] sm:h-[calc(100dvh-11.5rem)] md:h-[calc(100dvh-10rem)] min-h-[430px]">
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-800/80 bg-[#070D20] overflow-hidden shadow-2xl">
        {/* CHAT HEADER */}
        <header className="px-3 sm:px-5 py-3 bg-[#10182D] border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={handleExit}
              className="p-2 rounded-xl bg-[#0B1224] border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
              title="Back"
              aria-label="Back to previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#5036F5] text-white flex items-center justify-center shadow-sm">
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#10182D] ${connectionStatus.dotColorClass}`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                  Support Team
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${connectionStatus.dotColorClass}`} />
                  <span>{connectionStatus.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-[#77839F] truncate">
                {conversation?.assignedAgentName &&
                conversation.assignedAgentName !== 'Live Support Desk'
                  ? `Specialist: ${conversation.assignedAgentName}`
                  : 'Swift Sweeps Customer Care'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop & Tablet alert toggles */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSound}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5] ${
                  soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/15'
                    : 'bg-[#0B1224] border-slate-800 text-[#77839F] hover:text-slate-200'
                }`}
                title={soundEnabled ? 'Sound alerts on' : 'Sound alerts muted'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">{soundEnabled ? 'Sound' : 'Muted'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleDesktopNotifs}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5] ${
                  desktopEnabled
                    ? 'bg-[#5036F5]/15 border-[#5036F5]/40 text-indigo-200 hover:bg-[#5036F5]/25'
                    : 'bg-[#0B1224] border-slate-800 text-[#77839F] hover:text-slate-200'
                }`}
                title={desktopEnabled ? 'Desktop notifications active' : 'Enable desktop notifications'}
              >
                {desktopEnabled ? (
                  <Bell className="w-3.5 h-3.5 text-indigo-300" />
                ) : (
                  <BellOff className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">{desktopEnabled ? 'Alerts' : 'Alerts Off'}</span>
              </button>

              <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-lg bg-[#0B1224] border border-slate-800/80 text-[11px] font-mono text-[#77839F]">
                {formatTicketTag(conversation)}
              </span>

              <button
                type="button"
                onClick={() => onNavigateTab('dashboard')}
                className="p-2 rounded-xl bg-[#0B1224] border border-slate-800 hover:border-slate-700 text-[#77839F] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                title="Close support chat"
                aria-label="Close support chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile overflow menu */}
            <div ref={menuContainerRef} className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setShowMobileMenu((prev) => !prev)}
                className="p-2 rounded-xl bg-[#0B1224] border border-slate-800/80 text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                aria-label="Chat options"
                aria-expanded={showMobileMenu}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#10182D] border border-slate-700/80 shadow-2xl p-1.5 z-40 space-y-1 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-mono text-[#77839F] border-b border-slate-800/80 flex items-center justify-between">
                    <span>Ticket</span>
                    <span className="text-slate-200">{formatTicketTag(conversation)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleSound();
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center justify-between text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-[#77839F]" />}
                      <span>Sound Chime</span>
                    </span>
                    <span className="text-[11px] text-[#77839F]">{soundEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleDesktopNotifs();
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center justify-between text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      {desktopEnabled ? <Bell className="w-3.5 h-3.5 text-indigo-300" /> : <BellOff className="w-3.5 h-3.5 text-[#77839F]" />}
                      <span>Desktop Alerts</span>
                    </span>
                    <span className="text-[11px] text-[#77839F]">{desktopEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      onNavigateTab('dashboard');
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-rose-950/40 text-left flex items-center gap-2 text-rose-300"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Exit to Dashboard</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* QUICK REQUESTS STRIP */}
        <div className="px-3 sm:px-5 py-2 bg-[#0B1224] border-b border-slate-800/70 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs shrink-0">
          <span className="text-[11px] font-medium text-[#77839F] shrink-0">Quick Actions:</span>

          <button
            type="button"
            onClick={() => {
              setInputText('Hello Support, I would like to request a balance Top-Up.');
              textareaRef.current?.focus();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#10182D] hover:bg-[#15203B] border border-slate-800 text-emerald-300 flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Request Top-Up</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputText('Hello Support, I would like to request a Cashout withdrawal.');
              textareaRef.current?.focus();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#10182D] hover:bg-[#15203B] border border-slate-800 text-slate-200 flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-400" />
            <span>Request Cashout</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (gameCatalog.length > 0) setSelectedGameId(gameCatalog[0].id);
              setShowGameRequestModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#10182D] hover:bg-[#15203B] border border-slate-800 text-indigo-200 flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-[#5538F8]" />
            <span>Request Game ID &amp; Password</span>
          </button>
        </div>

        {/* MESSAGES SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y touch-scroll px-3 sm:px-5 py-4 bg-[#070D20]">
          {visibleMessages.length >= 25 && hasMoreOlder && (
            <div className="flex justify-center pb-4">
              <button
                type="button"
                onClick={handleLoadOlderMessages}
                disabled={loadingOlder}
                className="px-3.5 py-1.5 rounded-full bg-[#10182D] hover:bg-[#15203B] border border-slate-800 text-[#77839F] hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {loadingOlder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5538F8]" />
                    <span>Loading older messages...</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-[#5538F8]" />
                    <span>Load Older Messages</span>
                  </>
                )}
              </button>
            </div>
          )}

          {groupedMessages.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[#5036F5]/20 border border-[#5036F5]/40 text-indigo-300 flex items-center justify-center mb-3">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Welcome to Swift Sweeps Support</h3>
              <p className="text-xs text-[#77839F] max-w-sm mt-1 leading-relaxed">
                Send a message below or choose a quick request above to connect directly with our customer care team.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedMessages.map(({ message: msg, showDateDivider, dateLabel, isFirstInGroup, isLastInGroup }) => {
                const isMe = msg.senderRole === 'customer';
                const timeStr = formatChatTime(msg.createdAt);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-slate-800/80" />
                        <span className="px-3 py-1 rounded-full bg-[#10182D] border border-slate-800/80 text-[11px] font-medium text-[#77839F]">
                          {dateLabel}
                        </span>
                        <div className="flex-1 h-px bg-slate-800/80" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                        isFirstInGroup ? 'mt-3' : 'mt-1'
                      }`}
                    >
                      {isFirstInGroup && (
                        <div
                          className={`flex items-center gap-1.5 text-[11px] text-[#77839F] mb-1 ${
                            isMe ? 'pr-9' : 'pl-9'
                          }`}
                        >
                          <span className="font-medium text-slate-300">
                            {isMe ? 'You' : msg.senderName || 'Support Team'}
                          </span>
                          <span>·</span>
                          <span>{timeStr}</span>
                        </div>
                      )}

                      <div
                        className={`flex items-end gap-2 max-w-[92%] sm:max-w-[80%] ${
                          isMe ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {/* Avatar column (shown on first message in group, invisible spacer otherwise) */}
                        <div className="w-7 h-7 shrink-0 flex items-center justify-center self-start mt-0.5">
                          {isFirstInGroup ? (
                            isMe ? (
                              <div className="w-7 h-7 rounded-full bg-[#1A2444] border border-slate-700/70 text-indigo-200 text-[10px] font-bold flex items-center justify-center">
                                {userInitials}
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#5036F5] text-white flex items-center justify-center shadow-sm">
                                <Headphones className="w-3.5 h-3.5" />
                              </div>
                            )
                          ) : null}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                            isMe
                              ? `bg-[#5036F5] text-[#F8FAFC] ${
                                  isFirstInGroup ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl'
                                }`
                              : `bg-[#111B30] border border-slate-800/75 text-[#F8FAFC] ${
                                  isFirstInGroup ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl'
                                }`
                          }`}
                        >
                          {msg.text && <p>{msg.text}</p>}

                          {/* Forwarded Transaction Card */}
                          {msg.transactionData && msg.transactionData.transactionType && (
                            <ChatTransactionCard
                              transaction={msg.transactionData}
                              currentUserRole={currentUser.role}
                              currentUserId={currentUser.id}
                              currentUserName={currentUser.displayName}
                              onStatusChanged={() => {
                                if (conversation) {
                                  setMessages(
                                    filterVisibleMessagesForRole(
                                      dataService.getMessages(conversation.id),
                                      'customer'
                                    )
                                  );
                                }
                              }}
                            />
                          )}

                          {/* Image Attachment preview */}
                          {(() => {
                            const rawImgUrl =
                              msg.attachmentUrl ||
                              (msg.transactionData as any)?.attachmentUrl ||
                              (msg.transactionData as any)?.proofUrl ||
                              (msg.transactionData as any)?.receiptUrl;
                            const effectiveImgUrl = rawImgUrl ? toProxyStorageUrl(rawImgUrl) || rawImgUrl : undefined;
                            const fallbackDirectUrl = rawImgUrl
                              ? toDirectSupabaseStorageUrl(rawImgUrl, supabaseUrl)
                              : undefined;
                            const effectiveImgName =
                              msg.attachmentName ||
                              (msg.transactionData as any)?.attachmentName ||
                              (msg.transactionData as any)?.proofName ||
                              'Attachment image';

                            if (!effectiveImgUrl) return null;
                            const retrySeed = failedImageKeys[msg.id] || 0;
                            const hasFailed = retrySeed < 0;
                            const renderSrc =
                              retrySeed > 0
                                ? `${effectiveImgUrl}${effectiveImgUrl.includes('?') ? '&' : '?'}r=${retrySeed}`
                                : effectiveImgUrl;

                            return (
                              <div
                                onClick={() => {
                                  if (hasFailed) {
                                    setFailedImageKeys((prev) => ({ ...prev, [msg.id]: Date.now() }));
                                    return;
                                  }
                                  setLightboxImage({
                                    url: effectiveImgUrl,
                                    name: effectiveImgName,
                                  });
                                }}
                                className="mt-2 rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 cursor-pointer group relative"
                                title={hasFailed ? 'Click to retry loading image' : 'Click to view full image'}
                              >
                                {hasFailed ? (
                                  <div className="p-4 flex flex-col items-center justify-center gap-1.5 text-center bg-[#0B1224] text-slate-300">
                                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[11px] font-medium">Image failed to load · Tap to retry</span>
                                  </div>
                                ) : (
                                  <img
                                    key={`${msg.id}_${retrySeed}`}
                                    src={renderSrc}
                                    alt={effectiveImgName}
                                    className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (
                                        target.dataset.retried !== 'direct' &&
                                        fallbackDirectUrl &&
                                        target.src !== fallbackDirectUrl
                                      ) {
                                        target.dataset.retried = 'direct';
                                        target.src = fallbackDirectUrl;
                                        return;
                                      }
                                      setFailedImageKeys((prev) => ({ ...prev, [msg.id]: -1 }));
                                    }}
                                  />
                                )}
                                {!hasFailed && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <ZoomIn className="w-5 h-5 drop-shadow-md" />
                                  </div>
                                )}
                                <div className="px-2 py-1 text-[10px] text-slate-300 font-mono truncate bg-[#070D20]/85 flex items-center justify-between">
                                  <span className="truncate">{effectiveImgName}</span>
                                  <span className="text-[10px] text-indigo-300 font-sans ml-1.5 shrink-0">
                                    {hasFailed ? 'Tap to retry' : 'Expand'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Deterministic Smart Chat Intent Action */}
                          {msg.intentAction && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-[#070D20]/90 border border-slate-700/70 text-[#F8FAFC] space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                                <Sparkles className="w-3 h-3" />
                                <span>Quick Action</span>
                              </div>
                              <div className="text-[11px] text-slate-300">
                                {msg.intentAction.type === 'open_withdrawal' &&
                                  `Proceed to withdraw ${
                                    msg.intentAction.prefilledAmount
                                      ? `$${msg.intentAction.prefilledAmount.toFixed(2)}`
                                      : 'funds'
                                  }.`}
                                {msg.intentAction.type === 'open_topup' &&
                                  `Proceed to top-up ${
                                    msg.intentAction.prefilledAmount
                                      ? `$${msg.intentAction.prefilledAmount.toFixed(2)}`
                                      : 'balance'
                                  }.`}
                                {msg.intentAction.type === 'open_game_account' &&
                                  'Manage your platform gaming accounts.'}
                                {msg.intentAction.type === 'view_rules' &&
                                  'View platform policy and cashout terms.'}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.intentAction?.type === 'open_withdrawal') {
                                    onNavigateTab('withdrawal', {
                                      prefilledAmount: msg.intentAction.prefilledAmount,
                                    });
                                  } else if (msg.intentAction?.type === 'open_topup') {
                                    onNavigateTab('topup', {
                                      prefilledAmount: msg.intentAction.prefilledAmount,
                                    });
                                  } else if (msg.intentAction?.type === 'open_game_account') {
                                    onNavigateTab('game_accounts');
                                  } else {
                                    onNavigateTab('rules');
                                  }
                                }}
                                className="w-full py-1.5 px-3 rounded-lg bg-[#5036F5] hover:bg-[#5538F8] text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
                              >
                                <span>{msg.intentAction.title || 'Open'}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delivery Status Indicator */}
                      {isMe && msg.deliveryStatus === 'sending' && (
                        <span className="text-[10px] text-[#77839F] mt-1 pr-9">Sending...</span>
                      )}
                      {isMe && isLastInGroup && msg.deliveryStatus === 'sent' && (
                        <span className="text-[10px] text-[#77839F] mt-0.5 pr-9 inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-indigo-400" />
                          <span>Sent</span>
                        </span>
                      )}
                      {isMe && msg.deliveryStatus === 'failed' && (
                        <button
                          type="button"
                          onClick={() => void dataService.retryChatMessage(`conv_${currentUser.id}`, msg.id)}
                          className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1 pr-9"
                          title={msg.deliveryError || 'Message failed to save'}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Failed to send · Tap to Retry</span>
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Upload or Send Error Banner */}
        {(uploadError || sendError) && (
          <div className="px-4 py-2 bg-rose-950/75 border-t border-rose-800/60 flex items-center justify-between gap-2 text-xs text-rose-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{sendError || uploadError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setSendError(null);
              }}
              className="text-rose-200 hover:text-white font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Attachment Preview Chip */}
        {attachmentName && (
          <div className="px-4 py-2 bg-[#0B1224] border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-indigo-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {attachmentUrl ? (
                <img
                  src={attachmentUrl}
                  alt={attachmentName}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              <span className="font-mono truncate">{attachmentName}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachmentName(null);
                setAttachmentUrl(null);
              }}
              className="p-1 rounded-lg text-[#77839F] hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
              aria-label="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* COMPOSER */}
        <form
          onSubmit={handleSendMessage}
          className="px-3 sm:px-4 py-3 bg-[#10182D] border-t border-slate-800/80 shrink-0"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0 flex items-end gap-1.5 rounded-2xl bg-[#0B1224] border border-slate-800/90 focus-within:border-[#5036F5] transition-colors px-2 py-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment || isSending}
                className="p-2 rounded-xl text-[#77839F] hover:text-white hover:bg-[#10182D] transition-colors disabled:opacity-50 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                title="Attach payment receipt or image"
                aria-label="Attach image"
              >
                {isUploadingAttachment ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#5538F8]" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (failedPendingMsgId) {
                    setFailedPendingMsgId(null);
                  }
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Type a message..."
                className="flex-1 min-w-0 bg-transparent border-0 py-2 px-1 text-xs sm:text-[13px] text-[#F8FAFC] placeholder-[#77839F] resize-none max-h-[120px] focus:outline-none leading-relaxed"
              />

              <div ref={emojiContainerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2 rounded-xl text-[#77839F] hover:text-white hover:bg-[#10182D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                  title="Add emoji"
                  aria-label="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 w-52 p-2 rounded-2xl bg-[#10182D] border border-slate-700/80 shadow-2xl grid grid-cols-6 gap-1 z-40">
                    {CHAT_QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInputText((prev) => `${prev}${emoji}`);
                          setShowEmojiPicker(false);
                          textareaRef.current?.focus();
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#1E2949] text-base leading-none flex items-center justify-center transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending || isUploadingAttachment || (!inputText.trim() && !attachmentUrl)}
              className="p-3 rounded-2xl bg-[#5036F5] hover:bg-[#5538F8] disabled:opacity-45 text-white transition-colors shadow-sm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              aria-label="Send message"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL: Request Game ID from inside chat */}
      {showGameRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowGameRequestModal(false)}
          />
          <form
            onSubmit={handleConfirmGameRequest}
            className="relative w-full max-w-md bg-[#10182D] border border-slate-700/80 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#5538F8]" />
                <span>Request Game ID &amp; Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGameRequestModal(false)}
                className="text-xs text-[#77839F] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select which game you would like Customer Care to provision credentials for:
            </p>

            <div className="space-y-2">
              <label className="text-slate-300 font-semibold text-xs">Game Title</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-[#070D20] border border-slate-800 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#5036F5]"
                required
              >
                {gameCatalog.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.platform})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-[#5036F5]/10 border border-[#5036F5]/30 text-xs text-indigo-200 leading-relaxed">
              This request will be forwarded immediately to the Customer Support specialist on duty. They will assign your username &amp; password and reply right here in chat!
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGameRequestModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white font-bold text-xs transition-colors"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIGHTBOX MODAL: Full Resolution Image Viewer */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Close image viewer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-w-full max-h-[82vh] object-contain rounded-xl border border-slate-700/80 shadow-2xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                const directUrl = toDirectSupabaseStorageUrl(lightboxImage.url, supabaseUrl);
                if (!target.dataset.retried && directUrl && target.src !== directUrl) {
                  target.dataset.retried = 'true';
                  target.src = directUrl;
                }
              }}
            />
            <div className="mt-2 text-xs font-mono text-slate-300 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700">
              {lightboxImage.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
