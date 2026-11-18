import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, ChatMessage } from '../../types';
import { dataService } from '../../services/dataService';
import { notificationSoundService } from '../../services/notificationSoundService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { realtimeChatHub } from '../../services/chatRealtime';
import { mapDbMessageRowToChatMessage } from '../../services/chatOrderUtils';
import { isMessageInternalNote } from '../../utils/chatPresentationUtils';
import { shouldAcceptIncomingChatMessage } from '../../services/notificationScoping';
import { Headphones, MessageSquare, X, ArrowRight, Bell } from 'lucide-react';

interface GlobalChatNotificationManagerProps {
  currentUser: UserProfile;
  activeTab: string;
  onNavigateTab: (tab: string, meta?: any) => void;
}

export const GlobalChatNotificationManager: React.FC<GlobalChatNotificationManagerProps> = ({
  currentUser,
  activeTab,
  onNavigateTab,
}) => {
  const [activeToast, setActiveToast] = useState<{
    id: string;
    senderName: string;
    senderRole: string;
    text: string;
    conversationId: string;
  } | null>(null);

  const [hasPromptedPermission, setHasPromptedPermission] = useState(false);
  const toastTimeoutRef = useRef<any>(null);
  const isCustomer = currentUser.role === 'customer';

  // Request browser desktop notification permission on user engagement
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default' && !hasPromptedPermission) {
        setHasPromptedPermission(true);
        // Prompt after a brief 1.5s delay so page finishes loading
        const timer = setTimeout(() => {
          notificationSoundService.requestDesktopPermission().catch(() => {});
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [hasPromptedPermission]);

  // Handle new incoming chat message
  const handleIncomingMessage = (msg: ChatMessage) => {
    if (!msg || !msg.id) return;
    const activeUser = dataService.getCurrentUser();
    if (!activeUser || activeUser.id !== currentUser?.id) return;

    const normalizedMsg: ChatMessage = {
      ...msg,
      isInternalNote: isMessageInternalNote(msg),
    };
    if (!shouldAcceptIncomingChatMessage(normalizedMsg, activeUser, { forNotificationAlert: true })) {
      return;
    }

    // 1. Play real-time synthesized Web Audio API notification chime
    notificationSoundService.playIncomingMessageSound();

    // 2. Trigger native desktop browser notification (alerts even when user is on background tab or minimized)
    const notificationTitle = isCustomer
      ? `Swift Sweeps Support (${msg.senderName})`
      : `New Player Message (${msg.senderName})`;

    notificationSoundService.showDesktopNotification(notificationTitle, {
      body: msg.text || 'You have received a new message.',
      tag: `msg_${msg.id}`,
    });

    // 3. Show in-app floating toast if user is not currently in the chat view
    const isCurrentlyInChat = isCustomer ? activeTab === 'chat' : activeTab === 'ops_chat';
    if (!isCurrentlyInChat || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

      setActiveToast({
        id: msg.id,
        senderName: msg.senderName || 'Support',
        senderRole: String(msg.senderRole || ''),
        text: msg.text || (msg.attachmentUrl ? '[Photo Attachment]' : ''),
        conversationId: msg.conversationId || '',
      });

      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7500);
    }
  };

  // Global Realtime Listeners (Shared Ref-Counted Hub + local event dispatch)
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen for local state events (cross-component communication)
    const handleLocalState = (e: any) => {
      const detail = e.detail;
      if (detail?.key === 'chat_incoming' && detail?.message) {
        handleIncomingMessage(detail.message);
      }
    };

    window.addEventListener('aetherpay_state_changed', handleLocalState);

    if (!isSupabaseConfigured()) {
      return () => {
        window.removeEventListener('aetherpay_state_changed', handleLocalState);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      };
    }

    const unsubs: Array<() => void> = [];

    if (isCustomer && currentUser.role === 'customer') {
      const canonicalConvId = `conv_${currentUser.id}`;
      const conv = dataService
        .getConversations()
        .find((c) => c.id === canonicalConvId || c.customerId === currentUser.id);
      if (!conv || conv.status !== 'closed') {
        unsubs.push(
          realtimeChatHub.subscribeChatRoom(
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
              onBroadcast: (payload) => {
                if (payload && payload.id) {
                  if (isMessageInternalNote(payload)) return;
                  dataService.appendIncomingMessage(payload);
                  handleIncomingMessage(payload);
                }
              },
              onPostgresChange: (payload) => {
                const raw = payload?.new;
                if (raw && raw.id && raw.sender_id !== currentUser.id) {
                  const formattedMsg = mapDbMessageRowToChatMessage(raw, canonicalConvId);
                  if (isMessageInternalNote(formattedMsg)) return;
                  dataService.appendIncomingMessage(formattedMsg);
                  handleIncomingMessage(formattedMsg);
                }
              },
            }
          )
        );
      }
    } else {
      unsubs.push(
        realtimeChatHub.subscribeChatRoom(
          'room_admin_support',
          {},
          {
            onBroadcast: (payload) => {
              if (payload && payload.id) {
                dataService.appendIncomingMessage(payload);
                handleIncomingMessage(payload);
              }
            },
          }
        )
      );

      unsubs.push(
        realtimeChatHub.subscribeChatRoom(
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
              const raw = payload?.new;
              if (raw && raw.id && raw.sender_role === 'customer' && raw.sender_id !== currentUser.id) {
                const formattedMsg = mapDbMessageRowToChatMessage(raw);
                dataService.appendIncomingMessage(formattedMsg);
                handleIncomingMessage(formattedMsg);
              }
            },
          }
        )
      );
    }

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleLocalState);
      for (const unsub of unsubs) unsub();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setActiveToast(null);
    };
  }, [currentUser.id, currentUser.role, activeTab]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-18 sm:top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="p-4 rounded-2xl bg-[#10182D]/98 border border-[#5036F5]/45 shadow-2xl shadow-black/80 backdrop-blur-xl flex items-start gap-3.5 ring-1 ring-[#5036F5]/20">
        <div className="w-10 h-10 rounded-xl bg-[#5036F5] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#5036F5]/30">
          <Headphones className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-xs font-bold text-[#F8FAFC] truncate">
              {activeToast.senderName}
            </h4>
            <span className="text-[10px] font-mono text-indigo-300 bg-[#5036F5]/15 px-1.5 py-0.2 rounded border border-[#5036F5]/30 shrink-0">
              New Message
            </span>
          </div>

          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2.5">
            {activeToast.text}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveToast(null);
                if (isCustomer) {
                  onNavigateTab('chat');
                } else {
                  onNavigateTab('ops_chat', { highlightConvId: activeToast.conversationId });
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#5036F5] hover:bg-[#5538F8] text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
            >
              <span>Open Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveToast(null)}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800/60 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={() => setActiveToast(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0 -mr-1 -mt-1"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
