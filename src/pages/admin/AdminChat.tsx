import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UserProfile,
  SupportConversation,
  ChatMessage,
} from '../../types';
import { dataService } from '../../services/dataService';
import { realtimeChatHub } from '../../services/chatRealtime';
import { mapDbMessageRowToChatMessage, sortAndDeduplicateMessages } from '../../services/chatOrderUtils';
import {
  CHAT_QUICK_EMOJIS,
  TicketStatusValue,
  buildGroupedMessages,
  deriveTruthfulConnectionStatus,
  formatChatTime,
  formatConversationTimestamp,
  formatTicketTag,
  getInitials,
  getTicketStatusMeta,
  isMessageInternalNote,
} from '../../utils/chatPresentationUtils';
import { ChatTransactionCard } from '../../components/chat/ChatTransactionCard';
import { AdminChatTopUpModal } from '../../components/chat/AdminChatTopUpModal';
import { AdminChatCashoutModal } from '../../components/chat/AdminChatCashoutModal';
import {
  Search,
  MessageSquare,
  Send,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Gamepad2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sparkles,
  Plus,
  LogOut,
  Info,
  Check,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Paperclip,
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

interface AdminChatProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: string, meta?: any) => void;
  onGoBack?: () => void;
  highlightConvId?: string;
  onActiveChatChange?: (isOpen: boolean) => void;
}

const TICKET_STATUS_OPTIONS: TicketStatusValue[] = ['open', 'pending', 'resolved', 'closed'];

export const AdminChat: React.FC<AdminChatProps> = ({
  currentUser,
  onNavigateTab,
  onGoBack,
  highlightConvId,
  onActiveChatChange,
}) => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>(highlightConvId || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedPendingMsgId, setFailedPendingMsgId] = useState<string | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncHealth, setSyncHealth] = useState(() => dataService.getSyncHealth());
  const [realtimeStatus, setRealtimeStatus] = useState<string>('SUBSCRIBING');

  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, number>>({});
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Sync highlightConvId if updated from external navigation (e.g. Directory)
  useEffect(() => {
    if (highlightConvId) {
      setSelectedConvId(highlightConvId);
      setMessages(dataService.getMessages(highlightConvId));
      dataService.markConversationRead(highlightConvId, 'staff');
    }
  }, [highlightConvId]);

  // Notify parent whether active mobile chat is open
  useEffect(() => {
    onActiveChatChange?.(!!selectedConvId);
  }, [selectedConvId, onActiveChatChange]);

  // Quick Action Modals inside the active chat
  const [showGameIdModal, setShowGameIdModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Form states for Game ID Provisioning inside chat
  const [selectedGameId, setSelectedGameId] = useState('');
  const [assignedUsername, setAssignedUsername] = useState('');
  const [assignedPassword, setAssignedPassword] = useState('');
  const [gameIdNote, setGameIdNote] = useState('');
  const [gameIdFormError, setGameIdFormError] = useState<string | null>(null);

  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [requestsVersion, setRequestsVersion] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialDesktopMountRef = useRef(false);
  const selectedConvIdRef = useRef(selectedConvId);
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  const allUsers = dataService.getUsers().filter((u) => u.role === 'customer');
  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);

  // Auto-resize composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputText]);

  // Close open popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showEmojiPicker && emojiContainerRef.current && !emojiContainerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
      if (showStatusMenu && statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setShowStatusMenu(false);
      }
      if (showHeaderMenu && headerMenuRef.current && !headerMenuRef.current.contains(target)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker, showStatusMenu, showHeaderMenu]);

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

  // Sync conversations and messages from in-memory cache without REST overhead
  const syncFromMemory = () => {
    const list = dataService.getConversations();
    // Invariant: Exclude staff (agents and administrators) from the Support Inbox queue
    const validList = list.filter((c) => {
      const u =
        dataService.getUserById(c.customerId) ||
        (c.customerEmail ? dataService.getUserByEmail(c.customerEmail) : undefined);
      if (u && (u.role === 'agent' || u.role === 'admin')) return false;
      if (
        currentUser &&
        (c.customerId === currentUser.id ||
          (c.customerEmail && c.customerEmail.toLowerCase() === currentUser.email?.toLowerCase()))
      ) {
        if (currentUser.role === 'agent' || currentUser.role === 'admin') return false;
      }
      return true;
    });
    setConversations(validList);

    let activeId = selectedConvIdRef.current;

    // Only on initial desktop mount: if no conversation was requested and desktop width, auto-select first conversation
    if (!initialDesktopMountRef.current && typeof window !== 'undefined' && window.innerWidth >= 768) {
      initialDesktopMountRef.current = true;
      if (!activeId && validList.length > 0) {
        activeId = validList[0].id;
        setSelectedConvId(activeId);
      }
    }

    // If an active conversation was selected, verify it still exists or resolve canonical alias
    if (activeId) {
      let active = validList.find((c) => c.id === activeId);
      if (!active) {
        const canonicalId = dataService.resolveCanonicalConvId(activeId);
        active = validList.find((c) => c.id === canonicalId);
        if (active && active.id !== activeId) {
          setSelectedConvId(active.id);
          activeId = active.id;
        } else if (!active) {
          setSelectedConvId('');
          activeId = '';
        }
      }
      if (active) {
        setMessages(dataService.getMessages(active.id));
      }
    }
  };

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const handleLoadOlderMessages = async () => {
    if (!selectedConvId || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestTimestamp = messages[0].createdAt;
    const oldestId = messages[0].id;
    const res = await dataService.fetchOlderMessages(selectedConvId, oldestTimestamp, 50, oldestId);
    setLoadingOlder(false);
    if (!res.hasMore) {
      setHasMoreOlder(false);
    }
  };

  useEffect(() => {
    dataService.fetchConversations().then(() => {
      syncFromMemory();
    });
    dataService.fetchLiveUsersDirectory(currentUser);
  }, []);

  useEffect(() => {
    setHasMoreOlder(true);
    syncFromMemory();

    if (selectedConvId) {
      dataService.fetchMessagesForConversation(selectedConvId, { limit: 50 }).then((fresh) => {
        setMessages(fresh || []);
      });
      const conv = dataService.getConversations().find((c) => c.id === selectedConvId);
      if (conv?.customerId) {
        dataService.syncCustomerRequests(conv.customerId).catch(() => {});
      }
    }

    const handleSync = () => {
      syncFromMemory();
      setRequestsVersion((v) => v + 1);
      if (selectedConvId) {
        setMessages(dataService.getMessages(selectedConvId));
      }
    };

    let lastCatchUpTime = 0;
    const performCatchUp = () => {
      if (!selectedConvId) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastCatchUpTime < 800) return;
      lastCatchUpTime = now;
      dataService.fetchMessagesForConversation(selectedConvId, { limit: 50 }).then((fresh) => {
        setMessages(fresh || []);
      });
      const conv = dataService.getConversations().find((c) => c.id === selectedConvId);
      if (conv?.customerId) {
        dataService.syncCustomerRequests(conv.customerId).catch(() => {});
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        performCatchUp();
      }
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', performCatchUp);
    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', performCatchUp);
    };
  }, [selectedConvId]);

  const [soundEnabled, setSoundEnabled] = useState(() => notificationSoundService.isSoundEnabled());
  const [desktopEnabled, setDesktopEnabled] = useState(() => notificationSoundService.isDesktopEnabled());
  const [notifPermission, setNotifPermission] = useState(() => notificationSoundService.getPermissionStatus());

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
        notificationSoundService.showDesktopNotification('Staff Care Notifications Active', {
          body: 'You will receive desktop alerts when players send messages.',
        });
      }
    } else {
      const next = !desktopEnabled;
      notificationSoundService.setDesktopEnabled(next);
      setDesktopEnabled(next);
    }
  };

  // Active conversation Realtime subscription on aligned canonical topic via ref-counted hub
  useEffect(() => {
    if (!selectedConvId) return;
    const canonicalConvId = dataService.resolveCanonicalConvId(selectedConvId);
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
          if (payload && payload.id) {
            dataService.appendIncomingMessage(payload);
            setMessages((prev) => sortAndDeduplicateMessages([...prev, payload], true));
            if (payload.senderRole === 'customer') {
              notificationSoundService.playIncomingMessageSound();
            }
          }
        },
        onPostgresChange: (payload) => {
          const row: any = payload?.new;
          if (row && row.id) {
            const incoming = mapDbMessageRowToChatMessage(row, canonicalConvId);
            dataService.appendIncomingMessage(incoming);
            setMessages((prev) => sortAndDeduplicateMessages([...prev, incoming], true));
            if (incoming.senderRole === 'customer') {
              notificationSoundService.playIncomingMessageSound();
            }
          }
        },
      }
    );

    return () => {
      unsubRoom();
    };
  }, [selectedConvId]);

  // Global staff Realtime subscriptions + tab visibility catch-up via ref-counted hub
  useEffect(() => {
    const handleGlobalIncoming = (incoming: ChatMessage) => {
      if (!incoming || !incoming.id) return;
      dataService.appendIncomingMessage(incoming);
      syncFromMemory();

      if (incoming.transactionData?.requestId) {
        if (incoming.transactionData.transactionType === 'withdrawal') {
          dataService.ensureWithdrawalRequest(incoming.transactionData.requestId).catch(() => {});
        } else if (incoming.transactionData.transactionType === 'topup') {
          dataService.ensureTopUpRequest(incoming.transactionData.requestId).catch(() => {});
        }
      }

      const currentActive = selectedConvIdRef.current;
      if (
        currentActive &&
        (incoming.conversationId === currentActive ||
          dataService.resolveCanonicalConvId(incoming.conversationId) ===
            dataService.resolveCanonicalConvId(currentActive))
      ) {
        setMessages((prev) => sortAndDeduplicateMessages([...prev, incoming], true));
      }

      if (incoming.senderRole === 'customer') {
        notificationSoundService.playIncomingMessageSound();
        if (document.hidden) {
          notificationSoundService.showDesktopNotification(
            `New message from ${incoming.senderName}`,
            { body: incoming.text }
          );
        }
      }
    };

    const unsubStaff = realtimeChatHub.subscribeChatRoom(
      'room_admin_support',
      {},
      {
        onBroadcast: (payload) => {
          if (payload && payload.id) {
            handleGlobalIncoming(payload);
          }
        },
      }
    );

    const unsubDbAll = realtimeChatHub.subscribeChatRoom(
      'db_admin_live_messages',
      {
        postgresFilter: {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
      },
      {
        onPostgresChange: (payload) => {
          const row: any = payload?.new;
          if (row && row.id) {
            const incoming = mapDbMessageRowToChatMessage(row);
            handleGlobalIncoming(incoming);
          }
        },
      }
    );

    let lastAdminCatchUpAt = 0;
    const performAdminCatchUp = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastAdminCatchUpAt < 800) return;
      lastAdminCatchUpAt = now;

      dataService.fetchConversations().then(() => {
        syncFromMemory();
      });

      const currentActive = selectedConvIdRef.current;
      if (currentActive) {
        const canonicalActive = dataService.resolveCanonicalConvId(currentActive);
        dataService.fetchMessagesForConversation(canonicalActive, { limit: 50 }).then((fresh) => {
          if (fresh && fresh.length > 0 && selectedConvIdRef.current) {
            setMessages(fresh);
          }
        });
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        performAdminCatchUp();
      }
    };
    const handleFocus = () => performAdminCatchUp();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubStaff();
      unsubDbAll();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedConvId]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);
  const customerProfile = activeConv
    ? dataService.getUserById(activeConv.customerId) ||
      (activeConv.customerEmail
        ? dataService.getUsers().find((u) => u.email.toLowerCase() === activeConv.customerEmail?.toLowerCase())
        : undefined)
    : undefined;
  const canonicalCustomerId = customerProfile?.id || activeConv?.customerId || '';

  const customerWallet = useMemo(() => {
    return canonicalCustomerId ? dataService.getWallet(canonicalCustomerId) : undefined;
  }, [canonicalCustomerId, requestsVersion]);

  const customerGameAccounts = useMemo(() => {
    return canonicalCustomerId ? dataService.getGameAccounts(canonicalCustomerId) : [];
  }, [canonicalCustomerId, requestsVersion]);

  const customerWithdrawals = useMemo(() => {
    return canonicalCustomerId ? dataService.getWithdrawalRequests(canonicalCustomerId) : [];
  }, [canonicalCustomerId, requestsVersion]);

  const pendingWithdrawalForCustomer = useMemo(() => {
    return customerWithdrawals.find(
      (w) => w.status === 'submitted' || w.status === 'processing'
    );
  }, [customerWithdrawals]);

  const pendingGameRequestsForCustomer = useMemo(() => {
    return customerGameAccounts.filter(
      (g) => g.status === 'pending_assignment' || g.status === 'pending_reset'
    );
  }, [customerGameAccounts]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const custUser =
        dataService.getUserById(c.customerId) ||
        (c.customerEmail ? dataService.getUserByEmail(c.customerEmail) : undefined);
      if (custUser && (custUser.role === 'agent' || custUser.role === 'admin')) return false;
      if (
        currentUser &&
        (c.customerId === currentUser.id ||
          (c.customerEmail && c.customerEmail.toLowerCase() === currentUser.email?.toLowerCase()))
      ) {
        if (currentUser.role === 'agent' || currentUser.role === 'admin') return false;
      }

      if (statusFilter === 'unread' && c.unreadCountStaff === 0) return false;
      if (statusFilter === 'pending') {
        const hasPendingGame = dataService
          .getGameAccounts(c.customerId)
          .some((g) => g.status === 'pending_assignment' || g.status === 'pending_reset');
        const hasPendingCashout = dataService
          .getWithdrawalRequests(c.customerId)
          .some((w) => w.status === 'submitted' || w.status === 'processing');
        const hasPendingTopUp = dataService
          .getTopUpRequests(c.customerId)
          .some((t) => t.status === 'submitted' || t.status === 'verifying');
        if (!hasPendingGame && !hasPendingCashout && !hasPendingTopUp) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.customerName.toLowerCase().includes(q) ||
          c.customerEmail.toLowerCase().includes(q) ||
          c.lastMessageText.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conversations, statusFilter, searchTerm, requestsVersion, currentUser]);

  const groupedMessages = useMemo(() => buildGroupedMessages(messages), [messages]);

  const connectionStatus = useMemo(
    () =>
      deriveTruthfulConnectionStatus({
        browserOnline,
        syncStatus: syncHealth.status,
        realtimeStatus,
      }),
    [browserOnline, syncHealth.status, realtimeStatus]
  );

  const activeTicketMeta = useMemo(
    () => getTicketStatusMeta(activeConv?.status),
    [activeConv?.status]
  );

  const handleSelectConversation = (convId: string) => {
    const canonicalId = dataService.resolveCanonicalConvId(convId);
    setSelectedConvId(canonicalId);
    setSendError(null);
    setUploadError(null);
    setFailedPendingMsgId(null);
    setShowEmojiPicker(false);
    setShowStatusMenu(false);
    setShowHeaderMenu(false);
    setMessages(dataService.getMessages(canonicalId));
    dataService.markConversationRead(canonicalId, 'staff');
    dataService.fetchMessagesForConversation(canonicalId, { limit: 50 }).then((fresh) => {
      if (fresh && fresh.length > 0) {
        setMessages(fresh);
      }
    });
    const conv = dataService.getConversations().find((c) => c.id === canonicalId);
    if (conv?.customerId) {
      dataService.syncCustomerRequests(conv.customerId).catch(() => {});
    }
  };

  const handleBackToCustomerList = () => {
    initialDesktopMountRef.current = true;
    setSelectedConvId('');
    setShowStatusMenu(false);
    setShowHeaderMenu(false);
  };

  const handleExitChat = () => {
    if (onGoBack) {
      onGoBack();
    } else if (onNavigateTab) {
      onNavigateTab('ops_dashboard');
    } else {
      setSelectedConvId('');
    }
  };

  const handleUpdateTicketStatus = async (nextStatus: TicketStatusValue) => {
    if (!activeConv || updatingStatus) return;
    setShowStatusMenu(false);
    setUpdatingStatus(true);
    const res = await dataService.updateConversationStatusAsync(activeConv.id, nextStatus);
    setUpdatingStatus(false);

    if (res.success) {
      syncFromMemory();
      setFeedbackToast({
        text: `Ticket ${formatTicketTag(activeConv)} marked as ${getTicketStatusMeta(nextStatus).label}.`,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 3500);
    } else {
      setFeedbackToast({
        text: res.message || 'Unable to update ticket status.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4500);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;

    setUploadError(null);
    setIsUploadingAttachment(true);
    try {
      const result = await storageService.uploadChatAttachment(file, activeConv.id);
      if (result.success && result.url) {
        setAttachmentUrl(result.url);
        setAttachmentName(result.name || file.name);
      } else {
        setUploadError(result.error || 'Failed to upload attachment. Your draft is preserved.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Attachment upload failed. Your draft is preserved.');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending || !activeConv) return;
    if (!inputText.trim() && !attachmentUrl) return;

    const pendingText = inputText.trim();
    const pendingAttachmentUrl = attachmentUrl || undefined;
    const pendingAttachmentName = attachmentName || undefined;
    const pendingInternalNote = isInternalNote;

    setIsSending(true);
    setSendError(null);
    setShowEmojiPicker(false);

    try {
      let confirmed: ChatMessage | null = null;
      if (failedPendingMsgId) {
        confirmed = await dataService.retryChatMessage(activeConv.id, failedPendingMsgId);
      }
      if (!confirmed) {
        confirmed = await dataService.sendChatMessageConfirmed({
          conversationId: activeConv.id,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          senderRole: currentUser.role,
          text: pendingText,
          attachmentUrl: pendingAttachmentUrl,
          attachmentName: pendingAttachmentName,
          isInternalNote: pendingInternalNote,
        });
      }

      setMessages((prev) => sortAndDeduplicateMessages([...prev, confirmed!], true));

      if (confirmed.deliveryStatus === 'failed') {
        setFailedPendingMsgId(confirmed.id);
        setSendError(confirmed.deliveryError || 'Message failed to save. Your draft is preserved.');
      } else {
        setInputText('');
        setAttachmentUrl(null);
        setAttachmentName(null);
        setUploadError(null);
        setFailedPendingMsgId(null);
      }
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message. Your draft is preserved.');
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

  // Quick Action 1: Provision Game ID directly from chat
  const handleOpenGameIdModal = () => {
    setGameIdFormError(null);
    if (gameCatalog.length > 0) {
      setSelectedGameId(gameCatalog[0].id);
    }
    if (customerProfile) {
      const cleanHandle = customerProfile.displayName.replace(/\s+/g, '').toLowerCase();
      setAssignedUsername(`${cleanHandle}_${Math.floor(100 + Math.random() * 900)}`);
    } else {
      setAssignedUsername(`player_${Math.floor(100 + Math.random() * 900)}`);
    }
    handleGeneratePassword();
    setGameIdNote('');
    setShowHeaderMenu(false);
    setShowGameIdModal(true);
  };

  const handleGeneratePassword = () => {
    const prefixes = ['Pro', 'Apex', 'Cyber', 'Viper', 'Ghost', 'Titan', 'Matrix'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    setAssignedPassword(`${prefix}#${num}`);
  };

  const handleConfirmProvisionGameId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !selectedGameId || !assignedUsername.trim() || !assignedPassword.trim()) {
      setGameIdFormError('Please fill out all required fields.');
      return;
    }

    const game = gameCatalog.find((g) => g.id === selectedGameId);
    if (!game) return;

    const res = dataService.provisionGameAccount({
      customerId: activeConv.customerId,
      customerName: activeConv.customerName,
      gameCatalogId: game.id,
      gameName: game.title,
      platformName: game.platform,
      username: assignedUsername.trim(),
      password: assignedPassword.trim(),
      notes: gameIdNote.trim() || 'Provisioned directly via Customer Support Chat',
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
      status: 'active',
    });

    if (res.success) {
      setGameIdFormError(null);
      setRequestsVersion((v) => v + 1);
      setShowGameIdModal(false);
      setFeedbackToast({
        text: res.message,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } else {
      setGameIdFormError(res.message);
      setFeedbackToast({
        text: res.message,
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4500);
    }
  };

  const handleOpenTopUpModal = () => {
    setShowHeaderMenu(false);
    setShowTopUpModal(true);
  };

  const handleOpenCashoutModal = () => {
    setShowHeaderMenu(false);
    setShowCashoutModal(true);
  };

  const handleModalTransactionSuccess = (toastText: string) => {
    setRequestsVersion((v) => v + 1);
    if (activeConv) {
      setMessages(dataService.getMessages(activeConv.id));
    }
    setShowTopUpModal(false);
    setShowCashoutModal(false);
    setFeedbackToast({ text: toastText, type: 'success' });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleStartChatWithCustomer = (cust: UserProfile) => {
    const conv = dataService.getOrCreateConversationForCustomer(cust.id, cust.displayName);
    setShowNewChatModal(false);
    handleSelectConversation(conv.id);
  };

  return (
    <div
      className={
        selectedConvId
          ? 'fixed inset-0 z-50 bg-[#070D20] flex flex-col md:static md:z-auto md:max-w-7xl md:mx-auto md:pb-6 md:h-[calc(100dvh-130px)] md:min-h-[560px]'
          : 'max-w-7xl mx-auto pb-4 md:pb-6 h-[calc(100dvh-12rem)] md:h-[calc(100dvh-130px)] min-h-[480px] flex flex-col'
      }
    >
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`mb-2 p-3 rounded-xl text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200 border shrink-0 ${
            feedbackToast.type === 'error'
              ? 'bg-rose-950/90 border-rose-700 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedbackToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span className="truncate">{feedbackToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-[11px] underline ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Support Workspace Container */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 rounded-none md:rounded-2xl border-0 md:border md:border-slate-800/80 bg-[#070D20] overflow-hidden shadow-2xl h-full">
        {/* ======================================================== */}
        {/* LEFT INBOX COLUMN: Customer Conversations */}
        {/* ======================================================== */}
        <aside
          className={`md:col-span-4 lg:col-span-4 border-r border-slate-800/80 flex flex-col bg-[#0B1224] h-full min-h-0 ${
            selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Inbox Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800/80 space-y-3 bg-[#10182D]/60 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC] tracking-tight truncate">
                  Conversations
                </h2>
                <span className="text-[11px] font-mono text-[#77839F] bg-[#070D20] px-2 py-0.5 rounded-full border border-slate-800/80 shrink-0">
                  {conversations.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  title="Start New Customer Chat"
                  aria-label="Start new customer chat"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleExitChat}
                  className="px-2.5 py-2 rounded-xl bg-[#070D20] border border-slate-800 hover:border-slate-700 text-[#77839F] hover:text-white transition-colors text-xs flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                  title="Exit to Dashboard"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#77839F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#10182D] border border-slate-800/90 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F8FAFC] placeholder-[#77839F] focus:outline-none focus:border-[#5036F5] transition-colors"
              />
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#070D20] rounded-xl border border-slate-800/70 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors font-medium ${
                  statusFilter === 'all'
                    ? 'bg-[#5036F5] text-white shadow-sm'
                    : 'text-[#77839F] hover:text-[#F8FAFC]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unread')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors font-medium ${
                  statusFilter === 'unread'
                    ? 'bg-[#5036F5] text-white shadow-sm'
                    : 'text-[#77839F] hover:text-[#F8FAFC]'
                }`}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors font-medium ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-[#77839F] hover:text-[#F8FAFC]'
                }`}
              >
                Has Requests
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y touch-scroll divide-y divide-slate-800/45">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#77839F] space-y-3">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No conversations match your filter.</p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white text-xs font-semibold transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                const hasPending =
                  dataService
                    .getGameAccounts(conv.customerId)
                    .some((g) => g.status === 'pending_assignment' || g.status === 'pending_reset') ||
                  dataService
                    .getWithdrawalRequests(conv.customerId)
                    .some((w) => w.status === 'submitted' || w.status === 'processing');
                const convStatusMeta = getTicketStatusMeta(conv.status);
                const initials = getInitials(conv.customerName);

                return (
                  <button
                    type="button"
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-3.5 py-3 cursor-pointer text-xs transition-colors flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5036F5] ${
                      isSelected
                        ? 'bg-[#182042]/90 border-l-2 border-[#5036F5]'
                        : 'hover:bg-[#10182D]/70 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#5036F5] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                        {initials}
                      </div>
                      {conv.unreadCountStaff > 0 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B1224]" />
                      )}
                    </div>

                    {/* Customer Name, Timestamp & Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-[#F8FAFC] text-[13px] truncate">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-[#77839F] font-mono shrink-0">
                          {formatConversationTimestamp(conv.lastMessageTimestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-[#77839F] truncate leading-snug">
                          {conv.lastMessageText || 'No messages yet'}
                        </p>

                        <div className="flex items-center gap-1 shrink-0">
                          {convStatusMeta.value !== 'open' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#10182D] text-[#77839F] border border-slate-800 font-medium">
                              {convStatusMeta.label}
                            </span>
                          )}
                          {hasPending && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/35 font-semibold font-mono">
                              Req
                            </span>
                          )}
                          {conv.unreadCountStaff > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#5036F5] text-white text-[10px] font-bold flex items-center justify-center">
                              {conv.unreadCountStaff}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Active Support Conversation */}
        {/* ======================================================== */}
        <section
          className={`md:col-span-8 lg:col-span-8 flex flex-col bg-[#070D20] relative h-full min-h-0 ${
            selectedConvId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* CONVERSATION HEADER */}
              <header className="bg-[#10182D] border-b border-slate-800/80 pt-safe shrink-0 z-20">
                <div className="px-3 sm:px-5 py-3 flex items-center justify-between gap-2">
                  {/* Left: Back, Customer Avatar, Full Name, Sync/Ticket Tag */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={handleBackToCustomerList}
                      className="p-2 rounded-xl bg-[#0B1224] border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                      title="Back to Conversations"
                      aria-label="Back to customer list"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#5036F5] text-white font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-sm">
                      {getInitials(activeConv.customerName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                          {activeConv.customerName}
                        </h3>
                        {customerWallet && (
                          <span className="hidden md:inline-flex items-center text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                            ${customerWallet.availableBalance.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#77839F] truncate">
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus.dotColorClass}`} />
                          <span>{connectionStatus.isOnline ? 'Live Sync' : connectionStatus.label}</span>
                        </span>
                        <span className="hidden sm:inline text-slate-600">·</span>
                        <span className="hidden sm:inline font-mono truncate">{activeConv.customerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Ticket Tag, Status Dropdown, Grouped Quick Actions & Overflow Menu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Ticket Tag + Status Pill (Desktop / Tablet inline) */}
                    <div className="hidden sm:flex items-center gap-2 mr-1 pl-3 border-l border-slate-800/90">
                      <span className="text-xs font-mono text-[#77839F]">
                        {formatTicketTag(activeConv)}
                      </span>

                      <div ref={statusMenuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setShowStatusMenu((prev) => !prev)}
                          disabled={updatingStatus}
                          className={`px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5] ${activeTicketMeta.pillClass}`}
                          aria-label="Change ticket status"
                          aria-expanded={showStatusMenu}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${activeTicketMeta.dotClass}`} />
                          <span>{activeTicketMeta.label}</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                        </button>

                        {showStatusMenu && (
                          <div className="absolute right-0 mt-2 w-40 rounded-xl bg-[#10182D] border border-slate-700/80 shadow-2xl p-1 z-40 space-y-0.5 text-xs">
                            {TICKET_STATUS_OPTIONS.map((statusOption) => {
                              const meta = getTicketStatusMeta(statusOption);
                              const isCurrent = activeTicketMeta.value === statusOption;
                              return (
                                <button
                                  type="button"
                                  key={statusOption}
                                  onClick={() => void handleUpdateTicketStatus(statusOption)}
                                  className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                                    isCurrent
                                      ? 'bg-[#182042] text-white font-semibold'
                                      : 'text-slate-300 hover:bg-[#111B30]'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                                    <span>{meta.label}</span>
                                  </span>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-[#5538F8]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Frequent Agent Actions (Wide Desktop xl+) */}
                    <div className="hidden xl:flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleOpenGameIdModal}
                        className="px-2.5 py-1.5 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Provision / Update Game ID & Password"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Game ID</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenTopUpModal}
                        className="px-2.5 py-1.5 rounded-xl bg-[#0B1224] hover:bg-[#111B30] text-emerald-300 border border-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        title="Credit or Assist Balance Top-Up"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Top-Up</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCashoutModal}
                        className="px-2.5 py-1.5 rounded-xl bg-[#0B1224] hover:bg-[#111B30] text-amber-300 border border-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        title="Review or Process Cashout"
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cashout</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCustomerDetails((prev) => !prev)}
                        className={`p-2 rounded-xl border transition-colors ${
                          showCustomerDetails
                            ? 'bg-[#5036F5]/20 text-indigo-200 border-[#5036F5]/50'
                            : 'bg-[#0B1224] text-[#77839F] border-slate-800 hover:text-white'
                        }`}
                        title="Customer Intelligence & History"
                        aria-label="Toggle customer details drawer"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Contextual Menu (Secondary actions + mobile/tablet agent actions) */}
                    <div ref={headerMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowHeaderMenu((prev) => !prev)}
                        className="p-2 rounded-xl bg-[#0B1224] border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                        title="More conversation actions"
                        aria-label="Conversation actions menu"
                        aria-expanded={showHeaderMenu}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showHeaderMenu && (
                        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#10182D] border border-slate-700/80 shadow-2xl p-1.5 z-40 space-y-1 text-xs">
                          {/* Ticket Info Header inside Menu on Mobile */}
                          <div className="sm:hidden px-3 py-1.5 text-[11px] font-mono text-[#77839F] border-b border-slate-800/80 flex items-center justify-between">
                            <span>Ticket {formatTicketTag(activeConv)}</span>
                            {customerWallet && (
                              <span className="text-emerald-300">
                                ${customerWallet.availableBalance.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Agent Actions (visible in menu below xl) */}
                          <div className="xl:hidden space-y-0.5 pb-1 border-b border-slate-800/80">
                            <button
                              type="button"
                              onClick={handleOpenGameIdModal}
                              className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center gap-2.5 text-[#F8FAFC] font-medium"
                            >
                              <Gamepad2 className="w-3.5 h-3.5 text-[#5538F8]" />
                              <span>Provision Game ID</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenTopUpModal}
                              className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center gap-2.5 text-emerald-300 font-medium"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Top-Up Assist</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenCashoutModal}
                              className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center gap-2.5 text-amber-300 font-medium"
                            >
                              <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cashout Desk</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowHeaderMenu(false);
                                setShowCustomerDetails((prev) => !prev);
                              }}
                              className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center gap-2.5 text-slate-200 font-medium"
                            >
                              <Info className="w-3.5 h-3.5 text-indigo-300" />
                              <span>{showCustomerDetails ? 'Hide Customer Info' : 'Customer Intelligence'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleToggleSound();
                              setShowHeaderMenu(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center justify-between text-slate-200"
                          >
                            <span className="flex items-center gap-2.5">
                              {soundEnabled ? (
                                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <VolumeX className="w-3.5 h-3.5 text-[#77839F]" />
                              )}
                              <span>Sound Chime</span>
                            </span>
                            <span className="text-[11px] text-[#77839F]">{soundEnabled ? 'On' : 'Off'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void handleToggleDesktopNotifs();
                              setShowHeaderMenu(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center justify-between text-slate-200"
                          >
                            <span className="flex items-center gap-2.5">
                              {desktopEnabled ? (
                                <Bell className="w-3.5 h-3.5 text-indigo-300" />
                              ) : (
                                <BellOff className="w-3.5 h-3.5 text-[#77839F]" />
                              )}
                              <span>Desktop Alerts</span>
                            </span>
                            <span className="text-[11px] text-[#77839F]">{desktopEnabled ? 'On' : 'Off'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowHeaderMenu(false);
                              setShowNewChatModal(true);
                            }}
                            className="w-full px-3 py-2 rounded-xl hover:bg-[#111B30] text-left flex items-center gap-2.5 text-slate-200"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#5538F8]" />
                            <span>Start New Customer Chat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowHeaderMenu(false);
                              handleExitChat();
                            }}
                            className="w-full px-3 py-2 rounded-xl hover:bg-rose-950/40 text-left flex items-center gap-2.5 text-rose-300"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Exit to Dashboard</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Clean Close Conversation / Exit Desktop Button */}
                    <button
                      type="button"
                      onClick={handleExitChat}
                      className="hidden sm:inline-flex p-2 rounded-xl bg-[#0B1224] border border-slate-800/80 hover:border-slate-700 text-[#77839F] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                      title="Close support inbox"
                      aria-label="Close support inbox"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile Sub-Header Status Selector (Cleanly avoids name truncation below 640px) */}
                <div className="sm:hidden px-3 pb-2.5 flex items-center justify-between gap-2 border-t border-slate-800/50 pt-2">
                  <span className="text-[11px] font-mono text-[#77839F]">
                    Ticket {formatTicketTag(activeConv)}
                  </span>

                  <div className="relative" ref={statusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowStatusMenu((prev) => !prev)}
                      disabled={updatingStatus}
                      className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 ${activeTicketMeta.pillClass}`}
                      aria-label="Change ticket status"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeTicketMeta.dotClass}`} />
                      <span>{activeTicketMeta.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </button>

                    {showStatusMenu && (
                      <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-[#10182D] border border-slate-700/80 shadow-2xl p-1 z-40 space-y-0.5 text-xs">
                        {TICKET_STATUS_OPTIONS.map((statusOption) => {
                          const meta = getTicketStatusMeta(statusOption);
                          const isCurrent = activeTicketMeta.value === statusOption;
                          return (
                            <button
                              type="button"
                              key={statusOption}
                              onClick={() => void handleUpdateTicketStatus(statusOption)}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between ${
                                isCurrent ? 'bg-[#182042] text-white font-semibold' : 'text-slate-300 hover:bg-[#111B30]'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                                <span>{meta.label}</span>
                              </span>
                              {isCurrent && <Check className="w-3 h-3 text-[#5538F8]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* PENDING CUSTOMER ACTION CALLOUT BANNER */}
              {(pendingGameRequestsForCustomer.length > 0 || pendingWithdrawalForCustomer) && (
                <div className="bg-amber-950/45 border-b border-amber-500/35 px-4 py-2 flex items-center justify-between gap-2 text-xs text-amber-200 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {pendingGameRequestsForCustomer.length > 0
                        ? `Player requested Game ID for ${pendingGameRequestsForCustomer[0].gameName}`
                        : `Pending cashout wire of $${pendingWithdrawalForCustomer?.amount.toFixed(2)}`}
                    </span>
                  </div>

                  {pendingGameRequestsForCustomer.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleOpenGameIdModal}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition-colors"
                    >
                      Assign Credentials
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenCashoutModal}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition-colors"
                    >
                      Process Cashout
                    </button>
                  )}
                </div>
              )}

              {/* MESSAGES FEED AREA */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y touch-scroll px-3 sm:px-5 py-4 bg-[#070D20]">
                {messages.length >= 25 && hasMoreOlder && (
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
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-4 text-xs text-[#77839F]">
                    No messages in this channel yet. Say hello or use the quick actions above.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {groupedMessages.map(({ message: msg, showDateDivider, dateLabel, isFirstInGroup, isLastInGroup }) => {
                      const isNote = isMessageInternalNote(msg);
                      const isStaff = msg.senderRole === 'agent' || msg.senderRole === 'admin';
                      const isSystem = msg.senderRole === 'system';
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

                          {isNote ? (
                            /* INTERNAL TEAM NOTE CARD (Distinct amber surface + Lock badge, never customer visible) */
                            <div className="my-3 rounded-2xl bg-[#2B1F09]/95 border border-amber-500/45 px-3.5 py-3 shadow-sm">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
                                    <Lock className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="text-[11px] font-semibold text-amber-300 truncate">
                                    Internal note · Only visible to your team
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-300/75 font-mono shrink-0">
                                  {msg.senderName} · {timeStr}
                                </span>
                              </div>

                              {msg.text && (
                                <p className="text-[13px] text-amber-100 leading-relaxed whitespace-pre-wrap break-words pl-8">
                                  {msg.text}
                                </p>
                              )}

                              {msg.attachmentUrl && (
                                <div className="mt-2 pl-8">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: toProxyStorageUrl(msg.attachmentUrl!) || msg.attachmentUrl!,
                                        name: msg.attachmentName || 'Internal attachment',
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/35 text-[11px] text-amber-200 hover:bg-amber-900/60"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>{msg.attachmentName || 'View internal attachment'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`flex flex-col ${
                                isStaff ? 'items-end' : isSystem ? 'items-center' : 'items-start'
                              } ${isFirstInGroup ? 'mt-3' : 'mt-1'}`}
                            >
                              {isFirstInGroup && !isSystem && (
                                <div className="flex items-center gap-1.5 text-[11px] text-[#77839F] mb-1 px-0.5">
                                  <span className="font-medium text-slate-300">{msg.senderName}</span>
                                  <span>·</span>
                                  <span>{timeStr}</span>
                                </div>
                              )}

                              <div
                                className={`max-w-[90%] sm:max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                  isStaff
                                    ? `bg-[#5036F5] text-[#F8FAFC] ${
                                        isFirstInGroup ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl'
                                      }`
                                    : isSystem
                                    ? 'bg-[#10182D] border border-slate-800/80 text-[#77839F] rounded-xl text-center text-xs font-mono'
                                    : `bg-[#111B30] border border-slate-800/80 text-[#F8FAFC] ${
                                        isFirstInGroup ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl'
                                      }`
                                }`}
                              >
                                {msg.text && <p>{msg.text}</p>}

                                {/* Forwarded Transaction Card with Direct Approval Actions */}
                                {msg.transactionData && msg.transactionData.transactionType && (
                                  <ChatTransactionCard
                                    transaction={msg.transactionData}
                                    currentUserRole={currentUser.role}
                                    currentUserId={currentUser.id}
                                    currentUserName={currentUser.displayName}
                                    onStatusChanged={() => {
                                      if (activeConv) {
                                        setMessages(dataService.getMessages(activeConv.id));
                                        setConversations(dataService.getConversations());
                                      }
                                    }}
                                  />
                                )}

                                {(() => {
                                  const rawImgUrl =
                                    msg.attachmentUrl ||
                                    (msg.transactionData as any)?.attachmentUrl ||
                                    (msg.transactionData as any)?.proofUrl ||
                                    (msg.transactionData as any)?.receiptUrl;
                                  const effectiveImgUrl = rawImgUrl
                                    ? toProxyStorageUrl(rawImgUrl) || rawImgUrl
                                    : undefined;
                                  const fallbackDirectUrl = rawImgUrl
                                    ? toDirectSupabaseStorageUrl(rawImgUrl, supabaseUrl)
                                    : undefined;
                                  const effectiveImgName =
                                    msg.attachmentName ||
                                    (msg.transactionData as any)?.attachmentName ||
                                    (msg.transactionData as any)?.proofName ||
                                    'Attached receipt';

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
                                          <span className="text-[11px] font-medium">
                                            Image failed to load · Tap to retry
                                          </span>
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
                              </div>

                              {isStaff && msg.deliveryStatus === 'sending' && (
                                <span className="text-[10px] text-[#77839F] mt-1">Sending...</span>
                              )}
                              {isStaff && isLastInGroup && msg.deliveryStatus === 'sent' && (
                                <span className="text-[10px] text-[#77839F] mt-0.5 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-indigo-400" />
                                  <span>Sent</span>
                                </span>
                              )}
                              {isStaff && msg.deliveryStatus === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => void dataService.retryChatMessage(activeConv.id, msg.id)}
                                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 mt-1"
                                  title={msg.deliveryError || 'Message failed to save'}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Failed to send · Tap to Retry</span>
                                </button>
                              )}
                            </div>
                          )}
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

              {/* COMPOSER BAR WITH EXPLICIT MODE TABS */}
              <form
                onSubmit={handleSendMessage}
                className="bg-[#10182D] border-t border-slate-800/80 shrink-0 pb-safe"
              >
                {/* Mode Selector Tabs: Reply to customer vs Internal note */}
                <div className="px-3 sm:px-4 pt-2 flex items-center justify-between gap-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-1" role="tablist" aria-label="Composer mode">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!isInternalNote}
                      onClick={() => setIsInternalNote(false)}
                      className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                        !isInternalNote
                          ? 'border-[#5036F5] text-[#F8FAFC]'
                          : 'border-transparent text-[#77839F] hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#5538F8]" />
                      <span>Reply to customer</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={isInternalNote}
                      onClick={() => setIsInternalNote(true)}
                      className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                        isInternalNote
                          ? 'border-amber-400 text-amber-300'
                          : 'border-transparent text-[#77839F] hover:text-slate-200'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Internal note</span>
                    </button>
                  </div>

                  <span className="hidden md:inline text-[11px] text-[#77839F]">
                    Enter to {isInternalNote ? 'save note' : 'send'} · Shift+Enter for new line
                  </span>
                </div>

                {/* Persistent Team-Only Warning When Internal Note Mode Active */}
                {isInternalNote && (
                  <div className="mx-3 sm:mx-4 mt-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center gap-2 text-[11px] font-medium text-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Only visible to your team — hidden from the customer and push notifications.</span>
                  </div>
                )}

                <div className="px-3 sm:px-4 py-3 flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div
                    className={`flex-1 min-w-0 flex items-end gap-1.5 rounded-2xl border transition-colors px-2 py-1.5 ${
                      isInternalNote
                        ? 'bg-[#1F1709]/85 border-amber-500/50 focus-within:border-amber-400'
                        : 'bg-[#0B1224] border-slate-800/90 focus-within:border-[#5036F5]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment || isSending}
                      className="p-2 rounded-xl text-[#77839F] hover:text-white hover:bg-[#10182D] transition-colors disabled:opacity-50 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5036F5]"
                      title="Attach receipt / screenshot"
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
                      placeholder={
                        isInternalNote
                          ? 'Write an internal note for your team...'
                          : 'Type a message...'
                      }
                      className={`flex-1 min-w-0 bg-transparent border-0 py-2 px-1 text-xs sm:text-[13px] resize-none max-h-[120px] focus:outline-none leading-relaxed ${
                        isInternalNote
                          ? 'text-amber-100 placeholder-amber-300/45'
                          : 'text-[#F8FAFC] placeholder-[#77839F]'
                      }`}
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
                    className={`p-3 rounded-2xl font-medium text-xs transition-colors disabled:opacity-45 shrink-0 focus:outline-none focus-visible:ring-2 ${
                      isInternalNote
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold focus-visible:ring-amber-300'
                        : 'bg-[#5036F5] hover:bg-[#5538F8] text-white shadow-sm focus-visible:ring-indigo-300'
                    }`}
                    aria-label={isInternalNote ? 'Save internal note' : 'Send reply'}
                    title={isInternalNote ? 'Save internal note' : 'Send reply to customer'}
                  >
                    {isSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>

              {/* CUSTOMER INTELLIGENCE DRAWER */}
              {showCustomerDetails && customerProfile && customerWallet && (
                <div className="absolute top-16 right-3 bottom-24 w-80 max-w-[calc(100%-1.5rem)] bg-[#10182D] border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-30 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-[#F8FAFC] text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#5538F8]" />
                      <span>Customer Intelligence</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDetails(false)}
                      className="text-[#77839F] hover:text-white"
                      aria-label="Close customer details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Balances */}
                  <div className="p-3 rounded-xl bg-[#0B1224] border border-slate-800 space-y-1.5 text-xs">
                    <div className="text-[10px] text-[#77839F] uppercase">Available Balance</div>
                    <div className="text-xl font-bold text-[#F8FAFC] font-mono">
                      ${customerWallet.availableBalance.toFixed(2)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                      <div>
                        <span className="text-[#77839F]">Reserved:</span>{' '}
                        <span className="font-mono text-amber-400 font-bold">
                          ${customerWallet.reservedBalance.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#77839F]">Pending:</span>{' '}
                        <span className="font-mono text-indigo-300 font-bold">
                          ${customerWallet.pendingDepositBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Game IDs */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[#F8FAFC]">
                      <span>Gaming IDs ({customerGameAccounts.length})</span>
                      <button
                        type="button"
                        onClick={handleOpenGameIdModal}
                        className="text-[11px] text-[#5538F8] hover:text-indigo-300 font-semibold"
                      >
                        + Assign
                      </button>
                    </div>

                    {customerGameAccounts.map((ga) => (
                      <div
                        key={ga.id}
                        className="p-2.5 rounded-xl bg-[#0B1224] border border-slate-800 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                          <span>{ga.gameName}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                              ga.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {ga.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-indigo-300 text-[10px]">
                          <span>User: {ga.username}</span>
                          <span>Pass: {ga.password ? '••••••' : 'None'}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions shortcut in Drawer */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={handleOpenGameIdModal}
                      className="w-full py-2 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Provision / Rotate Game ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenTopUpModal}
                      className="w-full py-2 rounded-xl bg-[#0B1224] hover:bg-[#111B30] border border-slate-800 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Credit Verified Top-Up</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state when no chat selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#070D20]">
              <div className="w-16 h-16 rounded-3xl bg-[#10182D] border border-slate-800/80 flex items-center justify-center text-[#5538F8] shadow-xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-[#F8FAFC]">Customer Support Inbox</h3>
                <p className="text-xs text-[#77839F]">
                  Select a customer conversation on the left to view ticket history, reply, or add private team notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Customer Chat</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: PROVISION GAME ID DIRECTLY FROM CHAT */}
      {/* ======================================================== */}
      {showGameIdModal && activeConv && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGameIdModal(false);
          }}
        >
          <form
            onSubmit={handleConfirmProvisionGameId}
            className="relative w-full max-w-md bg-[#10182D] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto overscroll-contain space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-[#5538F8]" />
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">Provision Game Credentials</h3>
                  <div className="text-[11px] text-[#77839F]">Player: {activeConv.customerName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGameIdModal(false)}
                className="p-1 rounded-lg text-[#77839F] hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gameIdFormError && (
              <div className="p-2.5 rounded-xl bg-rose-950/75 border border-rose-700/70 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{gameIdFormError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Select Catalog Game</label>
                <select
                  value={selectedGameId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedGameId(newId);
                    const sel = gameCatalog.find((g) => g.id === newId);
                    const existingAcc = customerGameAccounts.find(
                      (a) =>
                        a.gameCatalogId === newId ||
                        (sel && a.gameName.toLowerCase().trim() === sel.title.toLowerCase().trim())
                    );
                    if (existingAcc) {
                      setAssignedUsername(existingAcc.username);
                      setAssignedPassword(existingAcc.password || '');
                      setGameIdNote(existingAcc.notes || '');
                    }
                  }}
                  className="w-full bg-[#070D20] border border-slate-800 rounded-xl px-3 py-2 text-[#F8FAFC] focus:outline-none focus:border-[#5036F5]"
                  required
                >
                  {gameCatalog.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.platform})
                    </option>
                  ))}
                </select>
                {(() => {
                  const sel = gameCatalog.find((g) => g.id === selectedGameId);
                  const existingAcc = customerGameAccounts.find(
                    (a) =>
                      a.gameCatalogId === selectedGameId ||
                      (sel && a.gameName.toLowerCase().trim() === sel.title.toLowerCase().trim())
                  );
                  if (existingAcc) {
                    return (
                      <div className="mt-1.5 p-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300">
                        ⚡ <strong>Existing Account:</strong> Current ID is{' '}
                        <span className="font-mono font-bold text-white">{existingAcc.username}</span>.
                        Submitting updates this single account (1 ID per game rule enforced).
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Player Game Username</label>
                <input
                  type="text"
                  value={assignedUsername}
                  onChange={(e) => setAssignedUsername(e.target.value)}
                  placeholder="e.g. viper_07"
                  className="w-full bg-[#070D20] border border-slate-800 rounded-xl px-3 py-2 text-[#F8FAFC] font-mono focus:outline-none focus:border-[#5036F5]"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Game Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={assignedPassword}
                  onChange={(e) => setAssignedPassword(e.target.value)}
                  placeholder="e.g. Apex#9921"
                  className="w-full bg-[#070D20] border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-[#5036F5]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Staff Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={gameIdNote}
                  onChange={(e) => setGameIdNote(e.target.value)}
                  placeholder="Internal notes or tournament lobby guidelines..."
                  className="w-full bg-[#070D20] border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-[#5036F5]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#5036F5]/10 border border-[#5036F5]/30 text-[11px] text-indigo-200 leading-relaxed">
              Saving will automatically update the customer&apos;s <strong>Gaming IDs</strong> page and post the credentials card directly into this chat!
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGameIdModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#5036F5] hover:bg-[#5538F8] text-white font-bold text-xs transition-colors"
              >
                Provision &amp; Send to Chat
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TOP-UP RECORD & ASSIST DIRECTLY FROM CHAT */}
      {/* ======================================================== */}
      {showTopUpModal && activeConv && (
        <AdminChatTopUpModal
          customerId={canonicalCustomerId}
          customerName={activeConv.customerName}
          conversationId={activeConv.id}
          currentUser={currentUser}
          customerWallet={customerWallet}
          customerGameAccounts={customerGameAccounts}
          gameCatalog={gameCatalog}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={handleModalTransactionSuccess}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CASHOUT DESK & EMERGENCY RECORD FROM CHAT */}
      {/* ======================================================== */}
      {showCashoutModal && activeConv && (
        <AdminChatCashoutModal
          customerId={canonicalCustomerId}
          customerName={activeConv.customerName}
          customerProfile={customerProfile}
          conversationId={activeConv.id}
          currentUser={currentUser}
          customerWallet={customerWallet}
          customerGameAccounts={customerGameAccounts}
          gameCatalog={gameCatalog}
          customerWithdrawals={customerWithdrawals}
          onClose={() => setShowCashoutModal(false)}
          onSuccess={handleModalTransactionSuccess}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 4: START NEW CHAT WITH ANY REGISTERED CUSTOMER */}
      {/* ======================================================== */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewChatModal(false);
          }}
        >
          <div className="relative w-full max-w-md bg-[#10182D] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto overscroll-contain space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#5538F8]" />
                <span>Start New Customer Chat</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg text-[#77839F] hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select any registered player below to open an immediate support channel:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
              {allUsers.map((cust) => (
                <button
                  type="button"
                  key={cust.id}
                  onClick={() => handleStartChatWithCustomer(cust)}
                  className="w-full text-left p-3 rounded-xl bg-[#070D20] border border-slate-800 hover:border-[#5036F5] hover:bg-[#111B30] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#5036F5] text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {getInitials(cust.displayName)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#F8FAFC] truncate">{cust.displayName}</div>
                      <div className="text-[11px] text-[#77839F] font-mono truncate">{cust.email}</div>
                    </div>
                  </div>

                  <span className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1 shrink-0 ml-2">
                    <span>Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowNewChatModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
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
