import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  SupportConversation,
  ChatMessage,
  GameCatalogItem,
  GameAccount,
  TopUpRequest,
  WithdrawalRequest,
} from '../../types';
import { dataService } from '../../services/dataService';
import { supabase } from '../../services/supabaseClient';
import { ChatTransactionCard } from '../../components/chat/ChatTransactionCard';
import {
  Search,
  MessageSquare,
  Send,
  User,
  Wallet,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronUp,
  RefreshCw,
  X,
  Gamepad2,
  KeyRound,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sparkles,
  ExternalLink,
  Plus,
  LogOut,
  Info,
  Check,
  Copy,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { notificationSoundService } from '../../services/notificationSoundService';

interface AdminChatProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: string, meta?: any) => void;
  highlightConvId?: string;
  onActiveChatChange?: (isOpen: boolean) => void;
}

export const AdminChat: React.FC<AdminChatProps> = ({
  currentUser,
  onNavigateTab,
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  // Form states for Top-Up Assist inside chat
  const [topUpAmount, setTopUpAmount] = useState('100');
  const [topUpMethodName, setTopUpMethodName] = useState('Instant Gateway Credit');
  const [topUpActionType, setTopUpActionType] = useState<'prompt' | 'credit'>('credit');

  // Form states for Cashout Assist inside chat
  const [cashoutActionNote, setCashoutActionNote] = useState('');

  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const allUsers = dataService.getUsers().filter((u) => u.role === 'customer');
  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);

  // Sync conversations and messages from in-memory cache without REST overhead
  const syncFromMemory = () => {
    const list = dataService.getConversations();
    setConversations(list);

    if (selectedConvId) {
      let active = list.find((c) => c.id === selectedConvId);
      if (!active) {
        const canonicalId = dataService.resolveCanonicalConvId(selectedConvId);
        active = list.find((c) => c.id === canonicalId);
        if (active && active.id !== selectedConvId) {
          setSelectedConvId(active.id);
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
    const res = await dataService.fetchOlderMessages(selectedConvId, oldestTimestamp, 50);
    setLoadingOlder(false);
    if (!res.hasMore) {
      setHasMoreOlder(false);
    }
  };

  useEffect(() => {
    setHasMoreOlder(true);
    // 1. Initial in-memory render
    syncFromMemory();

    // 2. Fetch latest messages from Supabase ONCE when conversation selection changes
    if (selectedConvId) {
      dataService.fetchMessagesForConversation(selectedConvId, { limit: 40 }).then((fresh) => {
        if (fresh && fresh.length > 0) {
          setMessages(fresh);
        }
      });
    }

    // 3. Reactive updates from Realtime events: purely read from memory cache, ZERO REST calls!
    const handleSync = () => syncFromMemory();
    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [selectedConvId]);

  const channelRef = useRef<any>(null);
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

  // Realtime subscription via Supabase Channel
  useEffect(() => {
    if (!selectedConvId) return;
    const channel = supabase.channel(`room_${selectedConvId}`)
      .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
        if (payload && payload.id) {
          dataService.appendIncomingMessage(payload);
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          if (payload.senderRole === 'customer') {
            notificationSoundService.playIncomingMessageSound();
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvId]);

  // Global staff broadcast channel to hear incoming messages across all conversations in real time
  useEffect(() => {
    const staffChannel = supabase.channel('room_admin_support')
      .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
        if (payload && payload.id) {
          dataService.appendIncomingMessage(payload);
          syncFromMemory();
          if (payload.conversationId === selectedConvId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
          }
          if (payload.senderRole === 'customer') {
            notificationSoundService.playIncomingMessageSound();
          }
        }
      })
      .subscribe();

    // Persistent Supabase Database Changes stream across all player messages
    const dbAllMessagesChannel = supabase.channel('db_admin_live_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row: any = payload.new;
          if (row && row.id) {
            const incoming: ChatMessage = {
              id: row.id,
              conversationId: row.conversation_id,
              senderId: row.sender_id,
              senderName: row.sender_name,
              senderRole: row.sender_role,
              text: row.content || '',
              attachmentUrl: row.attachment_url,
              attachmentName: row.attachment_name,
              isInternalNote: false,
              transactionData: row.transaction_data,
              createdAt: row.created_at,
              isRead: true,
            };

            dataService.appendIncomingMessage(incoming);
            syncFromMemory();

            if (incoming.conversationId === selectedConvId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, incoming];
              });
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(dbAllMessagesChannel);
    };
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);
  const customerProfile = activeConv
    ? dataService.getUserById(activeConv.customerId) ||
      (activeConv.customerEmail
        ? dataService.getUsers().find((u) => u.email.toLowerCase() === activeConv.customerEmail?.toLowerCase())
        : undefined)
    : undefined;
  const canonicalCustomerId = customerProfile?.id || activeConv?.customerId || '';
  const customerWallet = canonicalCustomerId ? dataService.getWallet(canonicalCustomerId) : undefined;
  const customerGameAccounts = canonicalCustomerId ? dataService.getGameAccounts(canonicalCustomerId) : [];
  const customerTopUps = canonicalCustomerId ? dataService.getTopUpRequests(canonicalCustomerId) : [];
  const customerWithdrawals = canonicalCustomerId ? dataService.getWithdrawalRequests(canonicalCustomerId) : [];

  const pendingWithdrawalForCustomer = customerWithdrawals.find(
    (w) => w.status === 'submitted' || w.status === 'processing'
  );

  const pendingGameRequestsForCustomer = customerGameAccounts.filter(
    (g) => g.status === 'pending_assignment' || g.status === 'pending_reset'
  );

  // Filter conversations Messenger-style
  const filteredConversations = conversations.filter((c) => {
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

  const handleSelectConversation = (convId: string) => {
    const canonicalId = dataService.resolveCanonicalConvId(convId);
    setSelectedConvId(canonicalId);
    setMessages(dataService.getMessages(canonicalId));
    dataService.markConversationRead(canonicalId, 'staff');
  };

  const handleBackToCustomerList = () => {
    setSelectedConvId('');
  };

  const handleExitChat = () => {
    if (onNavigateTab) {
      onNavigateTab('ops_dashboard');
    } else {
      setSelectedConvId('');
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConv) return;

    const newMsg = dataService.sendChatMessage({
      conversationId: activeConv.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      text: inputText.trim(),
      isInternalNote,
    });

    if (channelRef.current) {
      channelRef.current
        .send({
          type: 'broadcast',
          event: 'new_chat_message',
          payload: newMsg,
        })
        .catch(() => {});
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    setInputText('');
    setIsInternalNote(false);
  };

  // Quick Action 1: Provision Game ID directly from chat
  const handleOpenGameIdModal = () => {
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
      alert('Please fill out all required fields.');
      return;
    }

    const game = gameCatalog.find((g) => g.id === selectedGameId);
    if (!game) return;

    // Use authoritative single-account provisioning
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
      setShowGameIdModal(false);
      setFeedbackToast({
        text: res.message,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } else {
      alert(res.message);
    }
  };

  // Quick Action 2: Top-Up Assist directly from chat
  const handleOpenTopUpModal = () => {
    setTopUpAmount('100');
    setTopUpActionType('credit');
    setShowTopUpModal(true);
  };

  const handleConfirmTopUpAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv) return;
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (topUpActionType === 'prompt') {
      // Send an interactive prompt to the customer
      dataService.sendChatMessage({
        conversationId: activeConv.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: 'agent',
        text: `Here is the expedited Top-Up link for $${amountNum.toFixed(2)}. Please click below to complete your deposit.`,
        isInternalNote: false,
      });
    } else {
      // Direct credit adjustment
      const newReq = dataService.submitTopUp({
        customerId: activeConv.customerId,
        customerName: activeConv.customerName,
        amount: amountNum,
        method: 'manual_receipt',
        methodName: 'Direct Support Desk Deposit',
      });

      if (newReq && newReq.id) {
        dataService.approveTopUp({
          requestId: newReq.id,
          reviewerId: currentUser.id,
          reviewerName: currentUser.displayName,
          notes: 'Direct credited by customer care specialist in live support chat.',
        });

        dataService.sendChatMessage({
          conversationId: activeConv.id,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          senderRole: 'agent',
          text: `💳 Verified Deposit Complete: $${amountNum.toFixed(2)} has been credited directly to your gaming wallet. Your updated balance is ready to use!`,
          isInternalNote: false,
        });
      }
    }

    setShowTopUpModal(false);
    setFeedbackToast({
      text: `Top-Up action of $${amountNum.toFixed(2)} executed successfully!`,
      type: 'success',
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Quick Action 3: Cashout Assist directly from chat
  const handleOpenCashoutModal = () => {
    setCashoutActionNote('');
    setShowCashoutModal(true);
  };

  const handleApprovePendingCashoutInChat = (req: WithdrawalRequest) => {
    const res = dataService.updateWithdrawalStatus({
      requestId: req.id,
      newStatus: 'completed',
      reviewerId: currentUser.id,
      reviewerName: currentUser.displayName,
      note: cashoutActionNote.trim() || 'Approved directly via Customer Care live chat',
      payoutReference: `WIRE_${Date.now().toString().slice(-6)}`,
    });

    if (res.success) {
      dataService.sendChatMessage({
        conversationId: activeConv!.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: 'agent',
        text: `💸 Cashout Approved! Your withdrawal request #${req.id} for $${req.amount.toFixed(2)} (${req.methodName}) has been processed and marked completed.`,
        isInternalNote: false,
      });

      setShowCashoutModal(false);
      setFeedbackToast({
        text: `Withdrawal #${req.id} for $${req.amount.toFixed(2)} approved & completed!`,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } else {
      alert(res.message);
    }
  };

  // Quick Action 4: Start New Chat with any customer
  const handleStartChatWithCustomer = (cust: UserProfile) => {
    const conv = dataService.getOrCreateConversationForCustomer(cust.id, cust.displayName);
    setShowNewChatModal(false);
    setSelectedConvId(conv.id);
    setMessages(dataService.getMessages(conv.id));
  };

  return (
    <div
      className={
        selectedConvId
          ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col md:static md:z-auto md:max-w-7xl md:mx-auto md:pb-8 md:h-[calc(100dvh-130px)] md:min-h-[560px]'
          : 'max-w-7xl mx-auto pb-4 md:pb-8 h-[calc(100dvh-12rem)] md:h-[calc(100dvh-130px)] min-h-[480px] flex flex-col'
      }
    >
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="mb-2 p-3 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackToast.text}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="text-[11px] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 rounded-none md:rounded-2xl border-0 md:border md:border-slate-800 bg-slate-900 overflow-hidden shadow-2xl h-full">
        {/* ======================================================== */}
        {/* MESSENGER COLUMN: Customer List (Always visible on desktop, shown when no chat selected on mobile) */}
        {/* ======================================================== */}
        <div
          className={`md:col-span-4 lg:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950/90 h-full min-h-0 ${
            selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white tracking-tight">Chats</h2>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {conversations.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  title="Start Chat with Customer"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  onClick={handleExitChat}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                  title="Exit to Dashboard"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>

            {/* Messenger Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customers or messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl text-[11px]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1 rounded-lg text-center transition-colors font-medium ${
                  statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('unread')}
                className={`flex-1 py-1 rounded-lg text-center transition-colors font-medium ${
                  statusFilter === 'unread' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 py-1 rounded-lg text-center transition-colors font-medium ${
                  statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Has Requests
              </button>
            </div>
          </div>

          {/* List of Customers */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y touch-scroll divide-y divide-slate-800/40">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No conversations found.</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                const cust = allUsers.find((u) => u.id === conv.customerId);
                const hasPending =
                  dataService
                    .getGameAccounts(conv.customerId)
                    .some((g) => g.status === 'pending_assignment' || g.status === 'pending_reset') ||
                  dataService
                    .getWithdrawalRequests(conv.customerId)
                    .some((w) => w.status === 'submitted' || w.status === 'processing');

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3.5 cursor-pointer text-xs transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Customer Avatar with active indicator */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-900 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                        {conv.customerName.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    </div>

                    {/* Customer Info & Message Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-white text-xs truncate">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {new Date(conv.lastMessageTimestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-400 truncate leading-snug">
                          {conv.lastMessageText || 'No messages yet'}
                        </p>

                        <div className="flex items-center gap-1 shrink-0">
                          {hasPending && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-semibold font-mono">
                              Req
                            </span>
                          )}

                          {conv.unreadCountStaff > 0 && (
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                              {conv.unreadCountStaff}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ACTIVE CHAT CONVERSATION VIEW (Full screen on mobile when selected, 8 cols on desktop) */}
        {/* ======================================================== */}
        <div
          className={`md:col-span-8 lg:col-span-8 flex flex-col bg-slate-900 relative h-full min-h-0 ${
            selectedConvId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* TOP HEADER: Back button, Customer lockup, Action buttons & Exit */}
              <div className="p-3 sm:p-3.5 pt-safe border-b border-slate-800 flex items-center justify-between bg-slate-950/90 gap-2 shrink-0">
                {/* Left: Back button (Messenger style) & Player Profile */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Back button to customer list */}
                  <button
                    onClick={handleBackToCustomerList}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs shrink-0"
                    title="Back to Customer List"
                  >
                    <ChevronLeft className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-xs hidden sm:inline">Chats</span>
                  </button>

                  <div className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                    {activeConv.customerName.charAt(0)}
                  </div>

                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span>{activeConv.customerName}</span>
                      {customerWallet && (
                        <span className="hidden lg:inline text-[10px] font-mono font-normal text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          ${customerWallet.availableBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {activeConv.customerEmail}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Buttons & Notification Toggles */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 ${
                      soundEnabled
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title={soundEnabled ? 'Chime sound active: click to mute' : 'Chime muted: click to enable incoming message tone'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {/* Desktop Push Alert Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleDesktopNotifs}
                    className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 ${
                      desktopEnabled
                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title={
                      desktopEnabled
                        ? 'Desktop alerts active: you receive OS popups when tab is backgrounded'
                        : 'Click to enable browser desktop notifications for incoming messages'
                    }
                  >
                    {desktopEnabled ? (
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {/* Quick Action: Provision Game ID */}
                  <button
                    onClick={handleOpenGameIdModal}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-sm shadow-indigo-600/20"
                    title="Provision / Update Game ID & Password"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Game ID</span>
                  </button>

                  {/* Quick Action: Top-Up Assist */}
                  <button
                    onClick={handleOpenTopUpModal}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/50 font-semibold text-xs flex items-center gap-1 transition-colors"
                    title="Credit or Assist Balance Top-Up"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Top-Up</span>
                  </button>

                  {/* Quick Action: Cashout Assist */}
                  <button
                    onClick={handleOpenCashoutModal}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700/50 font-semibold text-xs flex items-center gap-1 transition-colors"
                    title="Review or Process Cashout"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Cashout</span>
                  </button>

                  {/* Toggle Customer Info sidebar */}
                  <button
                    onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      showCustomerDetails
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Customer Info & History"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {/* Exit Chat button */}
                  <button
                    onClick={handleExitChat}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors"
                    title="Exit Chat to Dashboard"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ACTION CALLOUT BANNER IF PLAYER HAS PENDING REQUESTS */}
              {(pendingGameRequestsForCustomer.length > 0 || pendingWithdrawalForCustomer) && (
                <div className="bg-amber-950/60 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {pendingGameRequestsForCustomer.length > 0
                        ? `Player requested Game ID for ${pendingGameRequestsForCustomer[0].gameName}`
                        : `Pending cashout wire of $${pendingWithdrawalForCustomer?.amount.toFixed(2)}`}
                    </span>
                  </div>

                  {pendingGameRequestsForCustomer.length > 0 ? (
                    <button
                      onClick={handleOpenGameIdModal}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                    >
                      Assign Credentials Now
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenCashoutModal}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                    >
                      Process Cashout
                    </button>
                  )}
                </div>
              )}

              {/* MESSAGES FEED AREA */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y touch-scroll p-4 space-y-3 bg-slate-950/70">
                {messages.length >= 25 && hasMoreOlder && (
                  <div className="flex justify-center pb-2">
                    <button
                      onClick={handleLoadOlderMessages}
                      disabled={loadingOlder}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {loadingOlder ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>Loading older messages...</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                          <span>Load Older Messages</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    No messages in this channel yet. Say hello or use the action buttons above.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.senderRole === 'agent' || msg.senderRole === 'admin';
                    const isSystem = msg.senderRole === 'system';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isStaff ? 'items-end' : isSystem ? 'items-center' : 'items-start'
                        } space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <span>{msg.senderName}</span>
                          {msg.isInternalNote && (
                            <span className="text-amber-400 font-bold">· INTERNAL NOTE</span>
                          )}
                          <span>·</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-md sm:max-w-lg rounded-2xl p-3.5 text-xs shadow-md leading-relaxed whitespace-pre-wrap ${
                            msg.isInternalNote
                              ? 'bg-amber-950/80 border border-amber-600/70 text-amber-200'
                              : isStaff
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : isSystem
                              ? 'bg-slate-900 border border-slate-800 text-slate-400 text-center font-mono'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          <p>{msg.text}</p>

                          {/* Forwarded Transaction Card with Direct Approval Actions */}
                          {msg.transactionData && (
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

                          {msg.attachmentUrl && !msg.transactionData && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-slate-700/60 bg-black/40">
                              <img
                                src={msg.attachmentUrl}
                                alt="Receipt"
                                className="w-full h-28 object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="p-1 text-[10px] text-slate-300 font-mono truncate">
                                {msg.attachmentName || 'Attached receipt'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* QUICK REPLY CHIPS STRIP */}
              <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-slate-500 shrink-0 font-medium">Quick Replies:</span>
                {[
                  'Your deposit is verified and credited!',
                  'Your cashout wire has been processed.',
                  'Your game credentials are now active in your Gaming IDs portal.',
                  'Please provide your deposit transaction reference.',
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(tmpl)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap border border-slate-800 text-xs transition-colors"
                  >
                    {tmpl.substring(0, 28)}...
                  </button>
                ))}
              </div>

              {/* COMPOSER BAR */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-slate-900 border-t border-slate-800 space-y-2 shrink-0 pb-safe"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500"
                    />
                    <span className={isInternalNote ? 'text-amber-400 font-bold' : ''}>
                      Staff Internal Note (Hidden from Customer)
                    </span>
                  </label>

                  <div className="text-[10px] text-slate-500">Press Enter to send</div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Type internal note for care records...'
                        : 'Reply to customer...'
                    }
                    className={`flex-1 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors ${
                      isInternalNote
                        ? 'bg-amber-950/30 border border-amber-600/50 placeholder-amber-400/50'
                        : 'bg-slate-950 border border-slate-800 placeholder-slate-500 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className={`p-2.5 rounded-xl font-medium text-xs transition-colors disabled:opacity-50 ${
                      isInternalNote
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* CUSTOMER INTELLIGENCE DRAWER (When toggled on) */}
              {showCustomerDetails && customerProfile && customerWallet && (
                <div className="absolute top-14 right-2 bottom-20 w-80 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-20 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Customer Intelligence</span>
                    </h3>
                    <button
                      onClick={() => setShowCustomerDetails(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Balances */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    <div className="text-[10px] text-slate-400 uppercase">Available Balance</div>
                    <div className="text-xl font-bold text-white font-mono">
                      ${customerWallet.availableBalance.toFixed(2)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-500">Reserved:</span>{' '}
                        <span className="font-mono text-amber-400 font-bold">
                          ${customerWallet.reservedBalance.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pending:</span>{' '}
                        <span className="font-mono text-indigo-300 font-bold">
                          ${customerWallet.pendingDepositBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Game IDs */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span>Gaming IDs ({customerGameAccounts.length})</span>
                      <button
                        onClick={handleOpenGameIdModal}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
                      >
                        + Assign
                      </button>
                    </div>

                    {customerGameAccounts.map((ga) => (
                      <div
                        key={ga.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>{ga.gameName}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                              ga.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-amber-950 text-amber-400'
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
                      onClick={handleOpenGameIdModal}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>Provision / Rotate Game ID</span>
                    </button>
                    <button
                      onClick={handleOpenTopUpModal}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5"
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-white">Customer Support Messaging</h3>
                <p className="text-xs text-slate-400">
                  Select a customer from the left list to open their dedicated channel, or click the button below to start a new chat.
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Customer Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: PROVISION GAME ID DIRECTLY FROM CHAT */}
      {/* ======================================================== */}
      {showGameIdModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowGameIdModal(false)}
          />
          <form
            onSubmit={handleConfirmProvisionGameId}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Provision Game Credentials</h3>
                  <div className="text-[11px] text-slate-400">Player: {activeConv.customerName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGameIdModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                      (a) => a.gameCatalogId === newId || (sel && a.gameName.toLowerCase().trim() === sel.title.toLowerCase().trim())
                    );
                    if (existingAcc) {
                      setAssignedUsername(existingAcc.username);
                      setAssignedPassword(existingAcc.password || '');
                      setGameIdNote(existingAcc.notes || '');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
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
                    (a) => a.gameCatalogId === selectedGameId || (sel && a.gameName.toLowerCase().trim() === sel.title.toLowerCase().trim())
                  );
                  if (existingAcc) {
                    return (
                      <div className="mt-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300">
                        ⚡ <strong>Existing Account:</strong> Current ID is <span className="font-mono font-bold text-white">{existingAcc.username}</span>. Submitting updates this single account (1 ID per game rule enforced).
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Game Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-[11px] text-indigo-300 leading-relaxed">
              Saving will automatically update the customer's <strong>Gaming IDs</strong> page and post the credentials card directly into this chat!
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
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                Provision &amp; Send to Chat
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TOP-UP ASSIST DIRECTLY FROM CHAT */}
      {/* ======================================================== */}
      {showTopUpModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTopUpModal(false)}
          />
          <form
            onSubmit={handleConfirmTopUpAction}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Top-Up Assistance</h3>
                  <div className="text-[11px] text-slate-400">Player: {activeConv.customerName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Deposit Amount ($ USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-slate-300 font-semibold">Action Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTopUpActionType('credit')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      topUpActionType === 'credit'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Instant Credit</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Directly add funds to player's wallet &amp; ledger
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTopUpActionType('prompt')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      topUpActionType === 'prompt'
                        ? 'bg-indigo-950/60 border-indigo-600 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Send Deposit Prompt</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Send clickable deposit form card to customer
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20"
              >
                {topUpActionType === 'credit' ? 'Authorize & Credit Now' : 'Send Link to Chat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CASHOUT ASSIST DIRECTLY FROM CHAT */}
      {/* ======================================================== */}
      {showCashoutModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCashoutModal(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Cashout Verification Desk</h3>
                  <div className="text-[11px] text-slate-400">Player: {activeConv.customerName}</div>
                </div>
              </div>
              <button
                onClick={() => setShowCashoutModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Balances */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Available Balance</span>
                <div className="text-base font-bold text-white font-mono">
                  ${customerWallet?.availableBalance.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase">Reserved In Vault</span>
                <div className="text-base font-bold text-amber-400 font-mono">
                  ${customerWallet?.reservedBalance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Check for pending cashout */}
            {pendingWithdrawalForCustomer ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">
                      Pending Cashout #{pendingWithdrawalForCustomer.id.slice(-6)}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      ${pendingWithdrawalForCustomer.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Method: {pendingWithdrawalForCustomer.methodName}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold text-xs">Approval Wire Note</label>
                  <input
                    type="text"
                    value={cashoutActionNote}
                    onChange={(e) => setCashoutActionNote(e.target.value)}
                    placeholder="e.g. Wire verified via bank portal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCashoutModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovePendingCashoutInChat(pendingWithdrawalForCustomer)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
                  >
                    Authorize &amp; Complete Payout
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1">
                  <div className="font-medium text-white">No pending cashouts for this player.</div>
                  <p className="text-[11px] text-slate-500">
                    You can send a cashout invitation to the player so they can submit a withdrawal request.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    dataService.sendChatMessage({
                      conversationId: activeConv.id,
                      senderId: currentUser.id,
                      senderName: currentUser.displayName,
                      senderRole: 'agent',
                      text: `You have $${customerWallet?.availableBalance.toFixed(2)} available for cashout. Would you like to initiate a bank wire, crypto payout, or e-wallet cashout?`,
                      isInternalNote: false,
                    });
                    setShowCashoutModal(false);
                    setFeedbackToast({ text: 'Cashout inquiry sent to player.', type: 'info' });
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
                >
                  Send Cashout Link to Player
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: START NEW CHAT WITH ANY REGISTERED CUSTOMER */}
      {/* ======================================================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNewChatModal(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>Start New Customer Chat</span>
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select any registered player below to open an immediate support channel:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
              {allUsers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => handleStartChatWithCustomer(cust)}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-600 hover:bg-slate-800/60 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-300 font-bold flex items-center justify-center text-xs">
                      {cust.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white">{cust.displayName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{cust.email}</div>
                    </div>
                  </div>

                  <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                    <span>Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowNewChatModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
