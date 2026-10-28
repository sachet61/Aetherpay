import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, ChatMessage } from '../../types';
import { dataService } from '../../services/dataService';
import { notificationSoundService } from '../../services/notificationSoundService';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
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
    if (msg.senderId === currentUser.id) return;

    // Check if relevant for this user
    if (isCustomer && msg.senderRole === 'customer') return;
    if (!isCustomer && msg.senderRole !== 'customer') return;

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
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        text: msg.text,
        conversationId: msg.conversationId,
      });

      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7500);
    }
  };

  // Global Realtime Listeners (Supabase Realtime + local event dispatch)
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

    // 2. Supabase Realtime Channels
    if (!supabase || !isSupabaseConfigured()) {
      return () => {
        window.removeEventListener('aetherpay_state_changed', handleLocalState);
      };
    }

    let roomChannel: any = null;
    let dbChannel: any = null;

    if (isCustomer && currentUser.role === 'customer') {
      // Customer: listen to their personal support room and message updates
      const conv = dataService.getOrCreateConversationForCustomer(currentUser.id, currentUser.displayName);
      if (conv && conv.status !== 'closed') {
        const roomName = `room_${conv.id}`;

        roomChannel = supabase
          .channel(`global_bg_${roomName}`)
          .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
            if (payload && payload.id) {
              dataService.appendIncomingMessage(payload);
              handleIncomingMessage(payload);
            }
          })
          .subscribe();
      }

      dbChannel = supabase
        .channel(`global_db_${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conv.id}`,
          },
          (payload: any) => {
            const raw = payload.new;
            if (raw && raw.id && raw.sender_id !== currentUser.id) {
              const formattedMsg: ChatMessage = {
                id: raw.id,
                conversationId: raw.conversation_id,
                senderId: raw.sender_id,
                senderName: raw.sender_name || 'Support Agent',
                senderRole: raw.sender_role || 'agent',
                text: raw.content || '',
                transactionData: raw.transaction_data,
                createdAt: raw.created_at || new Date().toISOString(),
                isRead: false,
              };
              dataService.appendIncomingMessage(formattedMsg);
              handleIncomingMessage(formattedMsg);
            }
          }
        )
        .subscribe();
    } else {
      // Staff / Admin: listen to the global admin support feed
      roomChannel = supabase
        .channel('global_bg_room_admin_support')
        .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
          if (payload && payload.id) {
            dataService.appendIncomingMessage(payload);
            handleIncomingMessage(payload);
          }
        })
        .subscribe();

      dbChannel = supabase
        .channel('global_bg_all_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload: any) => {
            const raw = payload.new;
            if (raw && raw.id && raw.sender_role === 'customer' && raw.sender_id !== currentUser.id) {
              const formattedMsg: ChatMessage = {
                id: raw.id,
                conversationId: raw.conversation_id,
                senderId: raw.sender_id,
                senderName: raw.sender_name || 'Customer',
                senderRole: 'customer',
                text: raw.content || '',
                transactionData: raw.transaction_data,
                createdAt: raw.created_at || new Date().toISOString(),
                isRead: false,
              };
              dataService.appendIncomingMessage(formattedMsg);
              handleIncomingMessage(formattedMsg);
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleLocalState);
      if (roomChannel) supabase.removeChannel(roomChannel);
      if (dbChannel) supabase.removeChannel(dbChannel);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [currentUser.id, currentUser.role, activeTab]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-18 sm:top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="p-4 rounded-2xl bg-[#0E1726]/98 border border-amber-500/40 shadow-2xl shadow-black/80 backdrop-blur-xl flex items-start gap-3.5 ring-1 ring-amber-500/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
          <Headphones className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-xs font-bold text-white truncate">
              {activeToast.senderName}
            </h4>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
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
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-sm"
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
