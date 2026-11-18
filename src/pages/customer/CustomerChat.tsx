import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
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
  ChevronDown,
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
import { validateImageFile } from '../../utils/uploadUtils';
import { toProxyStorageUrl, toDirectSupabaseStorageUrl } from '../../services/storageUrlUtils';
import { supabaseUrl } from '../../services/supabaseClient';
import {
  computeVisualViewportState,
  resolveFullscreenViewportStyle,
  shouldSubmitOnTextareaKeyDown,
  type ComputedChatViewportState,
} from '../../utils/chatViewportUtils';
import {
  buildScrollSnapshotKey,
  computeDistanceFromBottom,
  computePrependScrollTop,
  computeRestoredScrollTop,
  decideMessageUpdateScrollAction,
  isScrolledNearBottom,
  loadConversationScrollSnapshot,
  saveConversationScrollSnapshot,
} from '../../utils/chatScrollUtils';

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

  const canonicalConvId = `conv_${currentUser.id}`;
  const scrollSnapshotKey = buildScrollSnapshotKey(currentUser.id, canonicalConvId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prevMessagesRef = useRef<ChatMessage[]>([]);
  const hasAnchoredInitialRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const wasNearBottomRef = useRef(true);
  const justSentByMeRef = useRef(false);
  const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const programmaticScrollRef = useRef(false);
  const smoothScrollingToBottomUntilRef = useRef(0);

  const [newMessagesBelowCount, setNewMessagesBelowCount] = useState(0);
  const [isScrolledFarUp, setIsScrolledFarUp] = useState(false);

  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, number>>({});
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [viewportState, setViewportState] = useState<ComputedChatViewportState>({
    isKeyboardOpen: false,
    containerHeightPx: null,
    offsetTopPx: 0,
  });

  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);

  const [soundEnabled, setSoundEnabled] = useState(() => notificationSoundService.isSoundEnabled());
  const [desktopEnabled, setDesktopEnabled] = useState(() => notificationSoundService.isDesktopEnabled());
  const [notifPermission, setNotifPermission] = useState(() => notificationSoundService.getPermissionStatus());

  const applyProgrammaticScrollTop = useCallback((el: HTMLDivElement, targetTop: number) => {
    programmaticScrollRef.current = true;
    el.scrollTop = targetTop;
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, []);

  const clearSmoothScrollLock = useCallback(() => {
    smoothScrollingToBottomUntilRef.current = 0;
  }, []);

  const handleJumpToLatest = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setNewMessagesBelowCount(0);
    setIsScrolledFarUp(false);
    wasNearBottomRef.current = true;
    userHasScrolledRef.current = true;
    smoothScrollingToBottomUntilRef.current = Date.now() + 600;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    saveConversationScrollSnapshot(scrollSnapshotKey, {
      scrollTop: Math.max(0, el.scrollHeight - el.clientHeight),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
  }, [scrollSnapshotKey]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (programmaticScrollRef.current) return;

    const nearBottom = isScrolledNearBottom(el);
    if (Date.now() < smoothScrollingToBottomUntilRef.current) {
      if (nearBottom) {
        smoothScrollingToBottomUntilRef.current = 0;
      } else {
        return;
      }
    }

    userHasScrolledRef.current = true;
    wasNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setNewMessagesBelowCount(0);
    }
    const distance = computeDistanceFromBottom(el);
    setIsScrolledFarUp(distance > 280);
    saveConversationScrollSnapshot(scrollSnapshotKey, el);
  }, [scrollSnapshotKey]);

  const handleLoadOlderMessages = async () => {
    if (!conversation?.id || loadingOlder || messages.length === 0) return;
    const el = messagesContainerRef.current;
    if (el) {
      prependAnchorRef.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
      };
    }
    setLoadingOlder(true);
    try {
      const oldestTimestamp = messages[0].createdAt;
      const oldestId = messages[0].id;
      const res = await dataService.fetchOlderMessages(conversation.id, oldestTimestamp, 50, oldestId);
      if (!res.hasMore) {
        setHasMoreOlder(false);
      }
      if (res.newCount === 0) {
        prependAnchorRef.current = null;
      }
    } catch {
      prependAnchorRef.current = null;
    } finally {
      setLoadingOlder(false);
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

  // Track visualViewport for soft-keyboard safe resizing on mobile browsers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let prevKeyboardOpen = false;
    const updateViewport = () => {
      const vv = window.visualViewport;
      const next = computeVisualViewportState({
        innerHeight: window.innerHeight,
        visualHeight: vv?.height ?? null,
        visualOffsetTop: vv?.offsetTop ?? 0,
      });
      setViewportState((prev) => {
        if (
          prev.isKeyboardOpen === next.isKeyboardOpen &&
          prev.containerHeightPx === next.containerHeightPx &&
          prev.offsetTopPx === next.offsetTopPx
        ) {
          return prev;
        }
        return next;
      });
      if (next.isKeyboardOpen && !prevKeyboardOpen && wasNearBottomRef.current) {
        requestAnimationFrame(() => {
          const el = messagesContainerRef.current;
          if (el && wasNearBottomRef.current) {
            applyProgrammaticScrollTop(el, el.scrollHeight);
          }
        });
      }
      prevKeyboardOpen = next.isKeyboardOpen;
    };

    updateViewport();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateViewport);
    vv?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && messagesContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        const el = messagesContainerRef.current;
        if (el && hasAnchoredInitialRef.current && wasNearBottomRef.current) {
          applyProgrammaticScrollTop(el, el.scrollHeight);
        }
      });
      resizeObserver.observe(messagesContainerRef.current);
    }

    return () => {
      vv?.removeEventListener('resize', updateViewport);
      vv?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      resizeObserver?.disconnect();
    };
  }, [applyProgrammaticScrollTop]);

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
    const convId = `conv_${currentUser.id}`;
    hasAnchoredInitialRef.current = false;
    userHasScrolledRef.current = false;
    wasNearBottomRef.current = true;
    justSentByMeRef.current = false;
    prependAnchorRef.current = null;
    prevMessagesRef.current = [];
    setNewMessagesBelowCount(0);
    setIsScrolledFarUp(false);

    const conv = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
    conv.id = convId;
    setConversation(conv);
    setMessages(filterVisibleMessagesForRole(dataService.getMessages(convId), 'customer'));
    dataService.markConversationRead(convId, 'customer');

    let isUnmounted = false;
    dataService.fetchMessagesForConversation(convId, { limit: 50 }).then((freshMsgs) => {
      if (isUnmounted) return;
      setMessages(filterVisibleMessagesForRole(freshMsgs || [], 'customer'));
    });

    const handleSync = () => {
      const updated = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
      if (updated) {
        updated.id = convId;
        setConversation(updated);
        setMessages(filterVisibleMessagesForRole(dataService.getMessages(convId), 'customer'));
      }
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);

    const unsubRoom = realtimeChatHub.subscribeChatRoom(
      `chat_${convId}`,
      {
        postgresFilter: {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
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
        },
        onPostgresChange: (payload) => {
          const row: any = payload?.new;
          if (!row || !row.id) return;
          const incoming = mapDbMessageRowToChatMessage(row, convId);
          if (isMessageInternalNote(incoming)) return;
          dataService.appendIncomingMessage(incoming);
          setMessages((prev) =>
            filterVisibleMessagesForRole(sortAndDeduplicateMessages([...prev, incoming], true), 'customer')
          );
        },
      }
    );

    let lastCatchUpTime = 0;
    const performCatchUp = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastCatchUpTime < 800) return;
      lastCatchUpTime = now;
      dataService.fetchMessagesForConversation(convId, { limit: 50 }).then((fresh) => {
        if (isUnmounted) return;
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
    const handlePageHide = () => {
      if (messagesContainerRef.current) {
        saveConversationScrollSnapshot(scrollSnapshotKey, messagesContainerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isUnmounted = true;
      if (messagesContainerRef.current) {
        saveConversationScrollSnapshot(scrollSnapshotKey, messagesContainerRef.current);
      }
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      unsubRoom();
    };
  }, [currentUser.id, currentUser.displayName, scrollSnapshotKey]);

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
    justSentByMeRef.current = true;

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
        justSentByMeRef.current = false;
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
      justSentByMeRef.current = false;
      setSendError(err?.message || 'Unable to send message. Your draft is preserved.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      shouldSubmitOnTextareaKeyDown({
        key: e.key,
        shiftKey: e.shiftKey,
        isComposing: e.nativeEvent.isComposing,
      })
    ) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    setUploadError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Unsupported image file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

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

  // Intentional scroll & restoration handler (no forced scrollIntoView on re-renders or catch-up fetches)
  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    const prevList = prevMessagesRef.current;
    prevMessagesRef.current = visibleMessages;
    if (!el) return;

    const savedSnapshot = hasAnchoredInitialRef.current
      ? null
      : loadConversationScrollSnapshot(scrollSnapshotKey);

    const decision = decideMessageUpdateScrollAction({
      prevMessages: prevList,
      nextMessages: visibleMessages,
      hasAnchoredInitial: hasAnchoredInitialRef.current,
      userHasScrolled: userHasScrolledRef.current,
      wasNearBottom: wasNearBottomRef.current,
      justSentByMe: justSentByMeRef.current,
      isPrependingOlder: Boolean(prependAnchorRef.current),
      savedSnapshot,
    });

    if (decision.type === 'preserve-prepend') {
      const anchor = prependAnchorRef.current;
      prependAnchorRef.current = null;
      if (anchor) {
        const nextTop = computePrependScrollTop({
          prevScrollTop: anchor.scrollTop,
          prevScrollHeight: anchor.scrollHeight,
          newScrollHeight: el.scrollHeight,
        });
        applyProgrammaticScrollTop(el, nextTop);
      }
      wasNearBottomRef.current = isScrolledNearBottom(el);
      setIsScrolledFarUp(computeDistanceFromBottom(el) > 280);
      return;
    }

    if (decision.type === 'restore-saved') {
      hasAnchoredInitialRef.current = true;
      const nextTop = computeRestoredScrollTop({
        snapshot: decision.snapshot,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      });
      applyProgrammaticScrollTop(el, nextTop);
      wasNearBottomRef.current = isScrolledNearBottom(el);
      setIsScrolledFarUp(computeDistanceFromBottom(el) > 280);
      return;
    }

    if (decision.type === 'scroll-bottom-instant') {
      hasAnchoredInitialRef.current = true;
      applyProgrammaticScrollTop(el, el.scrollHeight);
      wasNearBottomRef.current = true;
      setNewMessagesBelowCount(0);
      setIsScrolledFarUp(false);
      return;
    }

    if (decision.type === 'scroll-bottom-smooth') {
      justSentByMeRef.current = false;
      wasNearBottomRef.current = true;
      setNewMessagesBelowCount(0);
      setIsScrolledFarUp(false);
      smoothScrollingToBottomUntilRef.current = Date.now() + 600;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      saveConversationScrollSnapshot(scrollSnapshotKey, {
        scrollTop: Math.max(0, el.scrollHeight - el.clientHeight),
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      });
      return;
    }

    if (decision.type === 'show-new-indicator') {
      setNewMessagesBelowCount((prev) => prev + decision.newlyAddedCount);
      setIsScrolledFarUp(computeDistanceFromBottom(el) > 280);
      return;
    }

    justSentByMeRef.current = false;
    prependAnchorRef.current = null;
  }, [visibleMessages, scrollSnapshotKey, applyProgrammaticScrollTop]);

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
    if (messagesContainerRef.current) {
      saveConversationScrollSnapshot(scrollSnapshotKey, messagesContainerRef.current);
    }
    if (onGoBack) {
      onGoBack();
    } else {
      onNavigateTab('dashboard');
    }
  };

  const shellInlineStyle = resolveFullscreenViewportStyle(viewportState);

  return (
    <div
      data-testid="customer-fullscreen-chat"
      style={shellInlineStyle}
      className="fixed inset-0 z-40 w-full flex flex-col overflow-hidden bg-[#080E1D]"
    >
      {/* COMPACT FULL-WIDTH CHAT HEADER */}
      <header className="w-full bg-[#101A30] border-b border-[#1E2942] chat-pt-safe shrink-0 z-20">
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleExit}
              className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-[#080E1D] border border-[#1E2942] hover:border-slate-600 text-slate-200 hover:text-white transition-colors shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
              title="Back"
              aria-label="Back to previous page"
            >
              <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#5035F5] text-white flex items-center justify-center shadow-sm">
                <Headphones className="w-5 h-5" />
              </div>
              <span
                aria-hidden="true"
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#101A30] ${connectionStatus.dotColorClass}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  Support Team
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0 ${
                    connectionStatus.isOnline ? 'text-emerald-400' : 'text-[#8B99B8]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${connectionStatus.dotColorClass}`} />
                  <span>{connectionStatus.label}</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#8B99B8] truncate">
                {conversation?.assignedAgentName &&
                conversation.assignedAgentName !== 'Live Support Desk'
                  ? `Swift Sweeps Customer Care · ${conversation.assignedAgentName}`
                  : 'Swift Sweeps Customer Care'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop & Tablet alert toggles + ticket badge */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="hidden lg:inline-flex items-center px-2.5 py-1.5 rounded-xl bg-[#080E1D] border border-[#1E2942] text-[11px] font-mono tabular-nums text-[#8B99B8] whitespace-nowrap shrink-0">
                {formatTicketTag(conversation)}
              </span>

              <button
                type="button"
                onClick={handleToggleSound}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5] ${
                  soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/15'
                    : 'bg-[#080E1D] border-[#1E2942] text-[#8B99B8] hover:text-white'
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
                className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5] ${
                  desktopEnabled
                    ? 'bg-[#5035F5]/15 border-[#5035F5]/45 text-indigo-200 hover:bg-[#5035F5]/25'
                    : 'bg-[#080E1D] border-[#1E2942] text-[#8B99B8] hover:text-white'
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

              <button
                type="button"
                onClick={() => onNavigateTab('dashboard')}
                className="w-9 h-9 rounded-xl bg-[#080E1D] border border-[#1E2942] hover:border-slate-600 text-[#8B99B8] hover:text-white transition-colors flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
                title="Close support chat"
                aria-label="Close support chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile three-dot menu */}
            <div ref={menuContainerRef} className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setShowMobileMenu((prev) => !prev)}
                className="w-10 h-10 rounded-xl bg-[#080E1D] border border-[#1E2942] text-slate-200 hover:text-white transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
                aria-label="Chat options"
                aria-expanded={showMobileMenu}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#101A30] border border-[#1E2942] shadow-2xl p-1.5 z-40 space-y-1 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-mono tabular-nums text-[#8B99B8] border-b border-[#1E2942] flex items-center justify-between">
                    <span>Ticket</span>
                    <span className="text-slate-200">{formatTicketTag(conversation)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleSound();
                      setShowMobileMenu(false);
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-[#121E33] text-left flex items-center justify-between text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-[#8B99B8]" />}
                      <span>Sound Chime</span>
                    </span>
                    <span className="text-[11px] text-[#8B99B8]">{soundEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleDesktopNotifs();
                      setShowMobileMenu(false);
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-[#121E33] text-left flex items-center justify-between text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      {desktopEnabled ? <Bell className="w-3.5 h-3.5 text-indigo-300" /> : <BellOff className="w-3.5 h-3.5 text-[#8B99B8]" />}
                      <span>Desktop Alerts</span>
                    </span>
                    <span className="text-[11px] text-[#8B99B8]">{desktopEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      onNavigateTab('dashboard');
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl hover:bg-rose-950/40 text-left flex items-center gap-2 text-rose-300"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Exit to Dashboard</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* QUICK ACTIONS ROW (Horizontally scrollable below header) */}
      <div
        data-testid="customer-chat-quick-actions"
        className="w-full bg-[#0C1428] border-b border-[#1E2942] shrink-0"
      >
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[11px] font-medium text-[#8B99B8] whitespace-nowrap shrink-0">
            Quick Actions:
          </span>

          <button
            type="button"
            onClick={() => {
              setInputText('Hello Support, I would like to request a balance Top-Up.');
              textareaRef.current?.focus();
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#101A30] hover:bg-[#172442] border border-[#1E2942] text-emerald-300 flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Request Top-Up</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputText('Hello Support, I would like to request a Cashout withdrawal.');
              textareaRef.current?.focus();
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#101A30] hover:bg-[#172442] border border-[#1E2942] text-[#F5C51B] flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-[#F5C51B] shrink-0" />
            <span>Request Cashout</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (gameCatalog.length > 0) setSelectedGameId(gameCatalog[0].id);
              setShowGameRequestModal(true);
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#101A30] hover:bg-[#172442] border border-[#1E2942] text-indigo-200 flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Request Game ID &amp; Password</span>
          </button>
        </div>
      </div>

      {/* MESSAGES SCROLL REGION (Independently scrollable, fills all remaining vertical space) */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-[#080E1D]">
        <div
          ref={messagesContainerRef}
          data-testid="customer-chat-messages"
          onScroll={handleMessagesScroll}
          onWheel={clearSmoothScrollLock}
          onTouchStart={clearSmoothScrollLock}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y touch-scroll bg-[#080E1D]"
        >
          <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 min-h-full flex flex-col min-w-0">
            {visibleMessages.length >= 25 && hasMoreOlder && (
              <div className="flex justify-center pb-4 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadOlderMessages}
                  disabled={loadingOlder}
                  className="px-3.5 py-1.5 rounded-full bg-[#101A30] hover:bg-[#172442] border border-[#1E2942] text-[#8B99B8] hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingOlder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5035F5]" />
                      <span>Loading older messages...</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-[#5035F5]" />
                      <span>Load Older Messages</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {groupedMessages.length === 0 ? (
              <div className="my-auto py-8 flex flex-col items-center justify-center text-center px-4">
                <div className="w-14 h-14 rounded-full bg-[#5035F5]/15 border border-[#5035F5]/40 text-indigo-300 flex items-center justify-center mb-3.5">
                  <Headphones className="w-7 h-7" />
                </div>
                <h2 className="text-base font-bold text-white">Welcome to Swift Sweeps Support</h2>
                <p className="text-xs sm:text-sm text-[#8B99B8] max-w-sm mt-1.5 leading-relaxed">
                  Send a message below or choose a quick action above to connect directly with our customer care team.
                </p>
              </div>
            ) : (
              <div className="space-y-1 min-w-0">
                {groupedMessages.map(({ message: msg, showDateDivider, dateLabel, isFirstInGroup, isLastInGroup }) => {
                  const isMe = msg.senderRole === 'customer';
                  const timeStr = formatChatTime(msg.createdAt);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-[#1E2942]" />
                          <span className="px-3 py-1 rounded-full bg-[#101A30] border border-[#1E2942] text-[11px] font-medium text-[#8B99B8]">
                            {dateLabel}
                          </span>
                          <div className="flex-1 h-px bg-[#1E2942]" />
                        </div>
                      )}

                      <div
                        data-message-id={msg.id}
                        className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'} ${
                          isFirstInGroup ? 'mt-3' : 'mt-1'
                        }`}
                      >
                        {isFirstInGroup && (
                          <div
                            className={`flex items-center gap-1.5 text-[11px] text-[#8B99B8] mb-1 ${
                              isMe ? 'pr-9 sm:pr-10' : 'pl-9 sm:pl-10'
                            }`}
                          >
                            <span className="font-medium text-slate-300">
                              {isMe ? 'You' : msg.senderName || 'Support Team'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{timeStr}</span>
                          </div>
                        )}

                        <div
                          className={`flex items-end gap-2 max-w-[90%] sm:max-w-[78%] min-w-0 ${
                            isMe ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Avatar column (Support Team on left, Customer avatar/initials on right) */}
                          <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center self-start mt-0.5">
                            {isFirstInGroup ? (
                              isMe ? (
                                currentUser.avatarUrl && !avatarLoadFailed ? (
                                  <img
                                    src={currentUser.avatarUrl}
                                    alt={currentUser.displayName}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-[#1E2942]"
                                    referrerPolicy="no-referrer"
                                    onError={() => setAvatarLoadFailed(true)}
                                  />
                                ) : (
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A2444] border border-[#2A3960] text-indigo-200 text-[10px] sm:text-[11px] font-bold flex items-center justify-center">
                                    {userInitials}
                                  </div>
                                )
                              ) : (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5035F5] text-white flex items-center justify-center shadow-sm">
                                  <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                              )
                            ) : null}
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`min-w-0 max-w-full px-3.5 py-2.5 text-[13.5px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-sm ${
                              isMe
                                ? `bg-[#5035F5] text-white ${
                                    isFirstInGroup ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl'
                                  }`
                                : `bg-[#121E33] border border-[#1E2942] text-white ${
                                    isFirstInGroup ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl'
                                  }`
                            }`}
                          >
                            {msg.text && <p className="break-words [overflow-wrap:anywhere]">{msg.text}</p>}

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
                                <div className="px-2 py-1 text-[10px] text-slate-300 font-mono truncate bg-[#080E1D]/85 flex items-center justify-between">
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
                            <div className="mt-2.5 p-2.5 rounded-xl bg-[#080E1D]/90 border border-slate-700/70 text-white space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] text-[#F5C51B] font-bold uppercase tracking-wider">
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
                                className="w-full py-1.5 px-3 rounded-lg bg-[#5035F5] hover:bg-[#5E45FF] text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
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
                        <span className="text-[10px] text-[#8B99B8] mt-1 pr-9 sm:pr-10">Sending...</span>
                      )}
                      {isMe && isLastInGroup && msg.deliveryStatus === 'sent' && (
                        <span className="text-[10px] text-[#8B99B8] mt-0.5 pr-9 sm:pr-10 inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-indigo-400" />
                          <span>Sent</span>
                        </span>
                      )}
                      {isMe && msg.deliveryStatus === 'failed' && (
                        <button
                          type="button"
                          onClick={() => void dataService.retryChatMessage(`conv_${currentUser.id}`, msg.id)}
                          className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1 pr-9 sm:pr-10"
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
          </div>
        </div>

        {(newMessagesBelowCount > 0 || isScrolledFarUp) && (
          <div className="pointer-events-none absolute bottom-3 right-3 sm:right-6 z-20 flex justify-end">
            <button
              type="button"
              data-testid="customer-chat-jump-latest"
              onClick={handleJumpToLatest}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[#5035F5] hover:bg-[#5E45FF] text-white text-xs font-semibold px-3.5 py-2 shadow-xl border border-indigo-400/40 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              aria-label={
                newMessagesBelowCount > 0
                  ? `Jump to ${newMessagesBelowCount} new messages`
                  : 'Jump to latest messages'
              }
            >
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              <span>
                {newMessagesBelowCount > 0
                  ? `${newMessagesBelowCount} new message${newMessagesBelowCount > 1 ? 's' : ''}`
                  : 'Jump to latest'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM COMPOSER SHELL (Safe area aware; adjusts when mobile keyboard opens) */}
      <div
        data-testid="customer-chat-composer"
        className={`w-full bg-[#101A30] border-t border-[#1E2942] shrink-0 z-20 ${
          viewportState.isKeyboardOpen ? 'pb-1' : 'chat-pb-safe'
        }`}
      >
        {/* Upload or Send Error Banner */}
        {(uploadError || sendError) && (
          <div className="border-b border-rose-800/60 bg-rose-950/75">
            <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-rose-200">
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
          </div>
        )}

        {/* Attachment Preview Chip */}
        {attachmentName && (
          <div className="border-b border-[#1E2942] bg-[#0B1326]">
            <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-indigo-200">
              <div className="flex items-center gap-2 min-w-0">
                {attachmentUrl ? (
                  <img
                    src={attachmentUrl}
                    alt={attachmentName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg object-cover border border-[#1E2942] shrink-0"
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
                className="p-1.5 rounded-lg text-[#8B99B8] hover:text-white hover:bg-[#121E33] transition-colors shrink-0"
                aria-label="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* COMPOSER FORM */}
        <form
          onSubmit={handleSendMessage}
          className="max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 sm:py-2.5"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-end gap-2">
            <div
              ref={emojiContainerRef}
              className="relative flex-1 min-w-0 flex items-end gap-1 rounded-2xl bg-[#080E1D] border border-[#1E2942] focus-within:border-[#5035F5] transition-colors px-1.5 py-1"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment || isSending}
                className="w-10 h-10 rounded-xl text-[#8B99B8] hover:text-white hover:bg-[#101A30] transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
                title="Attach payment receipt or image"
                aria-label="Attach image"
              >
                {isUploadingAttachment ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#5035F5]" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                enterKeyHint="send"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (failedPendingMsgId) {
                    setFailedPendingMsgId(null);
                  }
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Type a message..."
                aria-label="Type a message"
                className="flex-1 min-w-0 bg-transparent border-0 py-2 px-1 text-[15px] sm:text-sm text-white placeholder-[#77839F] resize-none max-h-[120px] overflow-y-auto focus:outline-none leading-relaxed"
              />

              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="w-10 h-10 rounded-xl text-[#8B99B8] hover:text-white hover:bg-[#101A30] transition-colors shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5035F5]"
                title="Add emoji"
                aria-label="Add emoji"
                aria-expanded={showEmojiPicker}
              >
                <Smile className="w-4 h-4" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 right-0 w-56 p-2 rounded-2xl bg-[#101A30] border border-[#1E2942] shadow-2xl grid grid-cols-6 gap-1 z-40">
                  {CHAT_QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => `${prev}${emoji}`);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#1A2847] text-base leading-none flex items-center justify-center transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSending || isUploadingAttachment || (!inputText.trim() && !attachmentUrl)}
              className="w-12 h-12 sm:w-11 sm:h-11 rounded-2xl bg-[#5035F5] hover:bg-[#5E45FF] disabled:opacity-45 text-white transition-colors shadow-sm shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
                className="p-1 rounded-lg text-xs text-[#77839F] hover:text-white transition-colors"
                aria-label="Close game account request modal"
                title="Close"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Close image viewer"
              aria-label="Close image viewer"
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
