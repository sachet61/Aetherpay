import { SupabaseClient } from '@supabase/supabase-js';

interface TelegramConfig {
  botToken: string;
  channelId: string;
  enabled: boolean;
}

export interface TelegramEngineStatus {
  running: boolean;
  botUsername?: string;
  channelId?: string;
  lastPollTime?: string;
  updatesReceived: number;
  lastError?: string;
  tokenConfigured?: boolean;
  maskedToken?: string;
  mode: 'zero-egress-notification';
}

class TelegramEngine {
  private config: TelegramConfig = {
    botToken: '',
    channelId: '',
    enabled: true,
  };
  private botUsername?: string;
  private lastError?: string;
  private supabaseAdmin: SupabaseClient | null = null;

  public async init(supabaseAdmin: SupabaseClient) {
    this.supabaseAdmin = supabaseAdmin;
    console.log('[TelegramEngine] Initializing zero-egress notification engine (continuous polling disabled)...');
    await this.loadConfigFromDatabase();
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

        if (this.config.botToken) {
          this.verifyBotCredentials();
        }
      }
    } catch (err: any) {
      console.warn('[TelegramEngine] Notice loading config from DB:', err?.message || err);
    }
  }

  private async verifyBotCredentials() {
    if (!this.config.botToken) return;
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${this.config.botToken}/getMe`);
      const meData = await meRes.json();
      if (meData.ok) {
        this.botUsername = meData.result?.username;
        this.lastError = undefined;
        console.log(`[TelegramEngine] Verified @${this.botUsername} in zero-egress notification mode.`);
      } else {
        this.lastError = meData.description || 'Invalid token';
      }
    } catch (err: any) {
      this.lastError = err.message;
    }
  }

  public async reloadConfig(botToken: string, channelId: string, enabled: boolean = true) {
    const finalToken = botToken.trim() || this.config.botToken;
    const finalChannel = channelId.trim() || this.config.channelId;
    this.config = {
      botToken: finalToken,
      channelId: finalChannel,
      enabled,
    };

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
          mode: 'zero-egress-notification',
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

    if (this.config.botToken) {
      await this.verifyBotCredentials();
    }

    return this.getStatus();
  }

  public getStatus(): TelegramEngineStatus {
    return {
      running: false, // Polling disabled by design to eliminate egress
      botUsername: this.botUsername,
      channelId: this.config.channelId,
      updatesReceived: 0,
      lastError: this.lastError,
      tokenConfigured: Boolean(this.config.botToken),
      maskedToken: this.config.botToken
        ? `${this.config.botToken.slice(0, 5)}...${this.config.botToken.slice(-6)}`
        : undefined,
      mode: 'zero-egress-notification',
    };
  }

  /**
   * Minimal customer message alert: sends ONLY the customer's name when a message is posted
   */
  public async notifyCustomerMessage(customerName: string): Promise<{ success: boolean; message?: string }> {
    if (!this.config.botToken || !this.config.channelId || !this.config.enabled) {
      return { success: false, message: 'Telegram bot not configured or disabled' };
    }

    const cleanName = (customerName || 'Customer').trim();
    const minimalText = `💬 New message from ${cleanName}`;

    return this.sendDirectMessage(this.config.channelId, minimalText);
  }

  public async sendDirectMessage(chatId: string | number, text: string) {
    if (!this.config.botToken) {
      return { success: false, message: 'Bot token not set' };
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text,
      };

      let resp = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = await resp.json();

      // Smart fallback: If chat not found and ID starts with single minus, retry with supergroup -100 prefix
      const strId = String(chatId).trim();
      if (!data.ok && data.description?.includes('chat not found') && strId.startsWith('-') && !strId.startsWith('-100')) {
        payload.chat_id = `-100${strId.replace(/^-/, '')}`;
        resp = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await resp.json();
      }

      if (!data.ok) {
        return { success: false, message: data.description };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  public async testConnection(token: string, chatId: string): Promise<{ success: boolean; message: string; suggestedChannelId?: string }> {
    const cleanToken = token.trim() || this.config.botToken;
    const cleanChatId = chatId.trim() || this.config.channelId;

    if (!cleanToken) return { success: false, message: 'Please provide a Telegram Bot Token.' };
    if (!cleanChatId) return { success: false, message: 'Please provide a Target Chat / Channel ID.' };

    try {
      const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const meData = await meRes.json();
      if (!meData.ok) {
        return { success: false, message: `Invalid Bot Token: ${meData.description}` };
      }

      const botUser = meData.result?.username;
      const testMsg = `🚀 Swift Sweeps Notification Bot Connected!\n\nBot: @${botUser}\nMode: Zero-Egress Notifications Active\nReady to dispatch customer message alerts.`;

      const sendRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: testMsg,
        }),
      });

      let sendData = await sendRes.json();

      if (!sendData.ok && sendData.description?.includes('chat not found') && cleanChatId.startsWith('-') && !cleanChatId.startsWith('-100')) {
        const supergroupId = `-100${cleanChatId.replace(/^-/, '')}`;
        const retryRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: supergroupId,
            text: testMsg,
          }),
        });
        const retryData = await retryRes.json();
        if (retryData.ok) {
          return {
            success: true,
            suggestedChannelId: supergroupId,
            message: `Connection successful! Auto-detected supergroup ID: ${supergroupId}. Test notification delivered to @${botUser}.`,
          };
        }
      }

      if (!sendData.ok) {
        const hint = cleanChatId.startsWith('-') && !cleanChatId.startsWith('-100')
          ? ` (Hint: Telegram supergroups and channels require '-100' prefix, e.g. -100${cleanChatId.replace(/^-/, '')})`
          : '';

        return {
          success: false,
          suggestedChannelId: cleanChatId.startsWith('-') && !cleanChatId.startsWith('-100') ? `-100${cleanChatId.replace(/^-/, '')}` : undefined,
          message: `Bot @${botUser} verified, but cannot send message to ${cleanChatId}: ${sendData.description}.${hint} Ensure bot is added as Administrator!`,
        };
      }

      return {
        success: true,
        message: `Connection successful! Test notification delivered to ${cleanChatId} from @${botUser}.`,
      };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }
}

export const telegramEngine = new TelegramEngine();
