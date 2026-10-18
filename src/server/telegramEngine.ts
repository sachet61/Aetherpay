import { SupabaseClient } from '@supabase/supabase-js';

interface TelegramConfig {
  botToken: string;
  channelId: string;
  enabled: boolean;
}

interface TelegramEngineStatus {
  running: boolean;
  botUsername?: string;
  channelId?: string;
  lastPollTime?: string;
  updatesReceived: number;
  lastError?: string;
  tokenConfigured?: boolean;
  maskedToken?: string;
}

class TelegramEngine {
  private config: TelegramConfig = {
    botToken: '',
    channelId: '',
    enabled: true,
  };
  private isRunning = false;
  private shouldStop = false;
  private lastUpdateId = 0;
  private updatesReceived = 0;
  private lastPollTime?: string;
  private lastError?: string;
  private botUsername?: string;
  private supabaseAdmin: SupabaseClient | null = null;
  private pollPromise: Promise<void> | null = null;

  public async init(supabaseAdmin: SupabaseClient) {
    this.supabaseAdmin = supabaseAdmin;
    console.log('[TelegramEngine] Initializing server-side Telegram bot engine...');
    await this.loadConfigFromDatabase();
    if (this.config.botToken && this.config.enabled) {
      this.startPolling();
    } else {
      console.log('[TelegramEngine] No Telegram bot token configured yet. Awaiting admin settings.');
    }
  }

  public async loadConfigFromDatabase() {
    if (!this.supabaseAdmin) return;
    try {
      const { data, error } = await this.supabaseAdmin
        .from('app_config')
        .select('data')
        .eq('id', 'main')
        .maybeSingle();

      if (!error && data?.data?.telegram) {
        const tg = data.data.telegram;
        this.config = {
          botToken: (tg.botToken || '').trim(),
          channelId: (tg.channelId || '').trim(),
          enabled: tg.enabled !== false,
        };
        console.log(`[TelegramEngine] Loaded config: botToken present? ${Boolean(this.config.botToken)}, channelId: ${this.config.channelId}`);
      }
    } catch (err: any) {
      console.warn('[TelegramEngine] Notice loading config from DB:', err?.message || err);
    }
  }

  public async reloadConfig(botToken: string, channelId: string, enabled: boolean = true) {
    console.log('[TelegramEngine] Reloading bot configuration...');
    const finalToken = botToken.trim() || this.config.botToken;
    const finalChannel = channelId.trim() || this.config.channelId;
    this.config = {
      botToken: finalToken,
      channelId: finalChannel,
      enabled,
    };

    this.stopPolling();

    // Persist to Supabase app_config
    if (this.supabaseAdmin) {
      try {
        const { data } = await this.supabaseAdmin
          .from('app_config')
          .select('data')
          .eq('id', 'main')
          .maybeSingle();

        const currentData = data?.data || {};
        currentData.telegram = {
          botToken: this.config.botToken,
          channelId: this.config.channelId,
          enabled: this.config.enabled,
          updatedAt: new Date().toISOString(),
        };

        await this.supabaseAdmin.from('app_config').upsert({
          id: 'main',
          data: currentData,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[TelegramEngine] DB update warning:', e);
      }
    }

    if (this.config.botToken && this.config.enabled) {
      await this.startPolling();
    }
    return this.getStatus();
  }

  public getStatus(): TelegramEngineStatus {
    return {
      running: this.isRunning,
      botUsername: this.botUsername,
      channelId: this.config.channelId,
      lastPollTime: this.lastPollTime,
      updatesReceived: this.updatesReceived,
      lastError: this.lastError,
      tokenConfigured: Boolean(this.config.botToken),
      maskedToken: this.config.botToken
        ? `${this.config.botToken.slice(0, 5)}...${this.config.botToken.slice(-6)}`
        : undefined,
    };
  }

  public stopPolling() {
    this.shouldStop = true;
    this.isRunning = false;
  }

  public async startPolling() {
    if (!this.config.botToken) {
      this.lastError = 'No bot token configured.';
      return;
    }

    this.shouldStop = false;
    this.lastError = undefined;

    // Verify token with getMe
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${this.config.botToken}/getMe`);
      const meData = await meRes.json();
      if (!meData.ok) {
        this.lastError = `Telegram authentication failed: ${meData.description || 'Invalid token'}`;
        console.error('[TelegramEngine] getMe error:', this.lastError);
        return;
      }
      this.botUsername = meData.result?.username;
      console.log(`[TelegramEngine] Authenticated successfully as @${this.botUsername}`);
    } catch (err: any) {
      this.lastError = `Network connection error: ${err.message}`;
      console.error('[TelegramEngine] Connection error:', err);
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;
    this.pollPromise = this.runPollLoop();
  }

  private async runPollLoop() {
    console.log('[TelegramEngine] Indefinite server-side polling loop started.');
    while (!this.shouldStop && this.isRunning) {
      try {
        this.lastPollTime = new Date().toISOString();
        const url = `https://api.telegram.org/bot${this.config.botToken}/getUpdates?offset=${this.lastUpdateId}&timeout=20`;
        const resp = await fetch(url);
        if (!resp.ok) {
          const errText = await resp.text();
          this.lastError = `Polling HTTP ${resp.status}: ${errText}`;
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = await resp.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id + 1);
            this.updatesReceived++;
            await this.handleIncomingUpdate(update);
          }
        }
      } catch (err: any) {
        this.lastError = `Polling error: ${err.message}`;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    console.log('[TelegramEngine] Polling loop terminated.');
    this.isRunning = false;
  }

  private async handleIncomingUpdate(update: any) {
    try {
      const msg = update.message || update.channel_post;
      if (!msg || !msg.text) return;

      const text: string = msg.text.trim();
      const replyToMsg = msg.reply_to_message;
      let targetConvId: string | null = null;

      // 1. Check if the message is a reply to an existing notification
      if (replyToMsg && replyToMsg.text) {
        const match = replyToMsg.text.match(/(?:Conv|Ticket|Chat ID|#conv_):?\s*([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          targetConvId = match[1].startsWith('conv_') ? match[1] : `conv_${match[1]}`;
        }
      }

      // 2. Check if text explicitly starts with #conv_ or /reply #conv_
      if (!targetConvId) {
        const directMatch = text.match(/#(conv_[a-zA-Z0-9_-]+)/i);
        if (directMatch && directMatch[1]) {
          targetConvId = directMatch[1];
        }
      }

      if (targetConvId && this.supabaseAdmin) {
        // Strip out the ticket tag from the response text
        const cleanReply = text.replace(/#(conv_[a-zA-Z0-9_-]+)/gi, '').trim();
        if (!cleanReply) return;

        const senderName = msg.from?.first_name
          ? `${msg.from.first_name} (Telegram Support)`
          : 'Customer Support (Telegram)';

        const newMsgId = `msg_tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const nowIso = new Date().toISOString();

        // Save reply into Supabase messages table
        const { error: msgErr } = await this.supabaseAdmin.from('messages').insert({
          id: newMsgId,
          conversation_id: targetConvId,
          sender_id: 'telegram_staff',
          sender_name: senderName,
          sender_role: 'agent',
          content: cleanReply,
          created_at: nowIso,
        });

        if (msgErr) {
          console.warn('[TelegramEngine] Message insert note:', msgErr.message);
        }

        // Update conversation last_message
        await this.supabaseAdmin
          .from('conversations')
          .update({
            last_message: cleanReply,
            last_message_at: nowIso,
            status: 'open',
          })
          .eq('id', targetConvId);

        // Acknowledge back in Telegram
        if (msg.chat?.id) {
          await this.sendDirectMessage(
            msg.chat.id,
            `✅ Reply delivered to player web chat (Conv: ${targetConvId})!`,
            msg.message_id
          );
        }
      }
    } catch (e: any) {
      console.warn('[TelegramEngine] Error processing update:', e);
    }
  }

  public async sendNotification(params: {
    title: string;
    text: string;
    customerName?: string;
    customerEmail?: string;
    conversationId?: string;
    actionType?: 'chat' | 'topup' | 'cashout' | 'game_id_request';
    amount?: number;
    gameName?: string;
    proofUrl?: string;
  }): Promise<{ success: boolean; message?: string }> {
    if (!this.config.botToken || !this.config.channelId) {
      return { success: false, message: 'Telegram bot token or channel ID not configured.' };
    }

    const emojiMap: Record<string, string> = {
      chat: '💬',
      topup: '💳',
      cashout: '💸',
      game_id_request: '🎮',
    };
    const icon = emojiMap[params.actionType || 'chat'] || '🔔';

    let formattedText = `${icon} *${params.title}*\n\n`;
    if (params.customerName) {
      formattedText += `👤 *Player:* ${params.customerName} (${params.customerEmail || 'Verified Player'})\n`;
    }
    if (params.gameName) {
      formattedText += `🎯 *Game:* ${params.gameName}\n`;
    }
    if (params.amount !== undefined && params.amount > 0) {
      formattedText += `💵 *Amount:* $${params.amount.toFixed(2)}\n`;
    }
    if (params.conversationId) {
      formattedText += `🆔 *Ticket ID:* #${params.conversationId}\n`;
    }
    formattedText += `\n📝 *Message / Details:*\n${params.text}\n\n`;
    formattedText += `👉 *Reply directly to this Telegram message to answer the player in web chat!*`;

    return this.sendDirectMessage(this.config.channelId, formattedText);
  }

  public async sendDirectMessage(chatId: string | number, text: string, replyToMessageId?: number) {
    if (!this.config.botToken) {
      return { success: false, message: 'Bot token not set' };
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      };
      if (replyToMessageId) {
        payload.reply_to_message_id = replyToMessageId;
      }

      const resp = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!data.ok) {
        // Fallback without Markdown if markdown parsing failed
        payload.parse_mode = undefined;
        const retry = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const retryData = await retry.json();
        return { success: retryData.ok, message: retryData.description };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  public async testConnection(token: string, chatId: string): Promise<{ success: boolean; message: string }> {
    const cleanToken = token.trim() || this.config.botToken;
    const cleanChatId = chatId.trim() || this.config.channelId;

    if (!cleanToken) return { success: false, message: 'Please provide a Telegram Bot Token or configure one first.' };
    if (!cleanChatId) return { success: false, message: 'Please provide a Target Chat / Channel ID or configure one first.' };

    try {
      // 1. Validate token with getMe
      const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const meData = await meRes.json();
      if (!meData.ok) {
        return { success: false, message: `Invalid Bot Token: ${meData.description}` };
      }

      const botUser = meData.result?.username;

      // 2. Send test message
      const testMsg = `🚀 *Swift Sweeps Telegram Bot Connected!*\n\nBot: @${botUser}\nServer Polling Engine: Online & Indefinitely Listening\nStatus: 24/7 Operations Ready!`;
      const sendRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: testMsg,
          parse_mode: 'Markdown',
        }),
      });

      const sendData = await sendRes.json();
      if (!sendData.ok) {
        return {
          success: false,
          message: `Bot @${botUser} verified, but cannot post to Chat ID (${cleanChatId}): ${sendData.description}. Ensure bot is added as Administrator!`,
        };
      }

      return {
        success: true,
        message: `Connection successful! Test message sent to ${cleanChatId} from @${botUser}.`,
      };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }
}

export const telegramEngine = new TelegramEngine();
