import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, SupportConversation, GameCatalogItem } from '../../types';
import { dataService } from '../../services/dataService';
import { supabase } from '../../services/supabaseClient';
import { ChatTransactionCard } from '../../components/chat/ChatTransactionCard';
import {
  Send,
  Paperclip,
  Headphones,
  CheckCheck,
  Check,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  User,
  Clock,
  Image,
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
} from 'lucide-react';
import { notificationSoundService } from '../../services/notificationSoundService';

interface CustomerChatProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const CustomerChat: React.FC<CustomerChatProps> = ({
  currentUser,
  onNavigateTab,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleLoadOlderMessages = async () => {
    if (!conversation?.id || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestTimestamp = messages[0].createdAt;
    const res = await dataService.fetchOlderMessages(conversation.id, oldestTimestamp, 50);
    setLoadingOlder(false);
    if (!res.hasMore) {
      setHasMoreOlder(false);
    }
  };

  const gameCatalog = dataService.getGameCatalog().filter((g) => g.enabled);

  const channelRef = useRef<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => notificationSoundService.isSoundEnabled());
  const [desktopEnabled, setDesktopEnabled] = useState(() => notificationSoundService.isDesktopEnabled());
  const [notifPermission, setNotifPermission] = useState(() => notificationSoundService.getPermissionStatus());
  const [showNotifFeedback, setShowNotifFeedback] = useState(false);

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
    setShowNotifFeedback(true);
    setTimeout(() => setShowNotifFeedback(false), 3000);
  };

  // Initialize or load conversation
  useEffect(() => {
    const conv = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
    setConversation(conv);
    setMessages(dataService.getMessages(conv.id));
    dataService.markConversationRead(conv.id, 'customer');

    // Asynchronously hydrate messages directly from PostgreSQL to ensure no messages are missed
    dataService.fetchMessagesForConversation(conv.id).then((freshMsgs) => {
      if (freshMsgs && freshMsgs.length > 0) {
        setMessages(freshMsgs);
      }
    });

    const handleSync = () => {
      if (conv) {
        setMessages(dataService.getMessages(conv.id));
        setConversation(dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName));
      }
    };

    window.addEventListener('aetherpay_state_changed', handleSync);
    window.addEventListener('storage', handleSync);

    // 1. Supabase Realtime channel subscription for instant cross-tab/device messaging
    const broadcastChannel = supabase.channel(`room_${conv.id}`)
      .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
        if (payload && payload.id) {
          dataService.appendIncomingMessage(payload);
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          if (payload.senderRole === 'agent' || payload.senderRole === 'admin') {
            notificationSoundService.playIncomingMessageSound();
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = broadcastChannel;
        }
      });

    channelRef.current = broadcastChannel;

    // 2. Persistent Supabase Database Changes stream directly on the messages table
    const dbChannel = supabase.channel(`db_chat_${conv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conv.id}`,
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
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });

            if (incoming.senderRole === 'agent' || incoming.senderRole === 'admin') {
              notificationSoundService.playIncomingMessageSound();
              if (document.hidden) {
                notificationSoundService.showDesktopNotification(
                  `Support: ${incoming.senderName}`,
                  { body: incoming.text }
                );
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleSync);
      window.removeEventListener('storage', handleSync);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachmentUrl) return;
    if (!conversation) return;

    const newMsg = dataService.sendChatMessage({
      conversationId: conversation.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: 'customer',
      text: inputText.trim(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      isInternalNote: false,
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
    setAttachmentName(null);
    setAttachmentUrl(null);
  };

  const handleAttachDemoReceipt = () => {
    setAttachmentName('payment_receipt_proof.jpg');
    setAttachmentUrl('/src/assets/images/gaming_wallet_hero_1791685883611.jpg');
  };

  const handleConfirmGameRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId || !conversation) return;
    const game = gameCatalog.find((g) => g.id === selectedGameId);
    if (!game) return;

    // Send request via dataService
    dataService.requestGameCredentials({
      customerId: currentUser.id,
      customerName: currentUser.displayName,
      gameCatalogId: game.id,
    });

    setShowGameRequestModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-4 flex flex-col h-[calc(100dvh-12rem)] md:h-[calc(100dvh-10rem)] min-h-[460px]">
      {/* Chat Header with Exit Chat / Back Button */}
      <div className="p-3 sm:p-4 rounded-t-2xl border border-b-0 border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Back out of chat */}
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
            title="Exit chat and return to dashboard"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-xs hidden sm:inline">Dashboard</span>
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#131C2E] border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white">Swift Sweeps Customer Care</h2>
              <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">Operator Live</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400">
              Specialist: {conversation?.assignedAgentName || 'Sarah Lin (Treasury Desk)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={soundEnabled ? 'Chime sound active: click to mute' : 'Chime muted: click to enable incoming message tone'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Desktop Push Alert Toggle */}
          <button
            type="button"
            onClick={handleToggleDesktopNotifs}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              desktopEnabled
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-sm shadow-amber-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
            <span className="hidden sm:inline">{desktopEnabled ? 'Desktop ON' : 'Desktop OFF'}</span>
          </button>

          <div className="text-right text-[11px] text-slate-400 font-mono hidden md:block">
            Ticket #{conversation?.id.substring(conversation.id.length - 6) || 'CONV'}
          </div>

          <button
            onClick={() => onNavigateTab('dashboard')}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-colors text-xs flex items-center gap-1"
            title="Exit Chat"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* In-Chat Request Actions Bar (Top-Up, Cashout, Game IDs) */}
      <div className="px-3 sm:px-4 py-2 border-x border-slate-800 bg-slate-950/90 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">Quick Requests:</span>

        {/* Request Top-Up */}
        <button
          onClick={() => {
            setInputText('Hello Support, I would like to request a balance Top-Up.');
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300 flex items-center gap-1.5 whitespace-nowrap transition-colors"
        >
          <ArrowDownToLine className="w-3 h-3 text-emerald-400" />
          <span>Request Top-Up</span>
        </button>

        {/* Request Cashout */}
        <button
          onClick={() => {
            setInputText('Hello Support, I would like to request a Cashout withdrawal.');
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 flex items-center gap-1.5 whitespace-nowrap transition-colors"
        >
          <ArrowUpFromLine className="w-3 h-3 text-amber-400" />
          <span>Request Cashout</span>
        </button>

        {/* Request Game ID & Password */}
        <button
          onClick={() => {
            if (gameCatalog.length > 0) setSelectedGameId(gameCatalog[0].id);
            setShowGameRequestModal(true);
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 flex items-center gap-1.5 whitespace-nowrap transition-colors"
        >
          <Gamepad2 className="w-3 h-3 text-amber-400" />
          <span>Request Game ID &amp; Password</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y touch-scroll p-4 border-x border-slate-800 bg-slate-950/70 space-y-4">
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
            Start a message to connect with customer care.
          </div>
        ) : (
          messages
            // Never show staff internal notes to the customer!
            .filter((m) => !m.isInternalNote)
            .map((msg) => {
              const isMe = msg.senderRole === 'customer';
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <span>{msg.senderName}</span>
                    <span>·</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-md rounded-2xl p-3.5 text-xs shadow-md leading-relaxed whitespace-pre-wrap ${
                      isMe
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-none shadow-amber-500/10'
                        : 'bg-[#0E1726] border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Forwarded Transaction Card with Dynamic Approval Status */}
                    {msg.transactionData && (
                      <ChatTransactionCard
                        transaction={msg.transactionData}
                        currentUserRole={currentUser.role}
                        currentUserId={currentUser.id}
                        currentUserName={currentUser.displayName}
                        onStatusChanged={() => {
                          if (conversation) {
                            setMessages(dataService.getMessages(conversation.id));
                          }
                        }}
                      />
                    )}

                    {/* Image Attachment preview */}
                    {msg.attachmentUrl && !msg.transactionData && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-700/60 bg-black/40">
                        <img
                          src={msg.attachmentUrl}
                          alt="Attachment"
                          className="w-full h-32 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-1.5 text-[10px] text-slate-300 font-mono truncate">
                          {msg.attachmentName || 'Attachment image'}
                        </div>
                      </div>
                    )}

                    {/* Deterministic Smart Chat Intent Action */}
                    {msg.intentAction && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#0A0F1D]/80 border border-amber-500/30 text-slate-100 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          <span>Quick Action Shortcut</span>
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
                          onClick={() => {
                            if (msg.intentAction?.type === 'open_withdrawal') {
                              onNavigateTab('withdrawal', { prefilledAmount: msg.intentAction.prefilledAmount });
                            } else if (msg.intentAction?.type === 'open_topup') {
                              onNavigateTab('topup', { prefilledAmount: msg.intentAction.prefilledAmount });
                            } else if (msg.intentAction?.type === 'open_game_account') {
                              onNavigateTab('game_accounts');
                            } else {
                              onNavigateTab('rules');
                            }
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                        >
                          <span>{msg.intentAction.title || 'Proceed to Form'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Chip */}
      {attachmentName && (
        <div className="px-4 py-2 bg-[#0E1726] border-x border-slate-800 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono">{attachmentName}</span>
          </div>
          <button
            onClick={() => {
              setAttachmentName(null);
              setAttachmentUrl(null);
            }}
            className="text-slate-400 hover:text-white"
          >
            Remove
          </button>
        </div>
      )}

      {/* Composer Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-3.5 rounded-b-2xl border border-t-0 border-slate-800 bg-[#0E1726] flex items-center gap-2"
      >
        <button
          type="button"
          onClick={handleAttachDemoReceipt}
          className="p-2.5 rounded-xl bg-[#0A0F1D] border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-white transition-colors"
          title="Attach payment receipt / image"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message or request..."
          className="flex-1 bg-[#0A0F1D] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />

        <button
          type="submit"
          disabled={!inputText.trim() && !attachmentUrl}
          className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* MODAL: Request Game ID from inside chat */}
      {showGameRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowGameRequestModal(false)}
          />
          <form
            onSubmit={handleConfirmGameRequest}
            className="relative w-full max-w-md bg-[#0E1726] border border-amber-500/20 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <span>Request Game ID &amp; Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGameRequestModal(false)}
                className="text-xs text-slate-400 hover:text-white"
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
                className="w-full bg-[#0A0F1D] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              >
                {gameCatalog.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.platform})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 leading-relaxed">
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
