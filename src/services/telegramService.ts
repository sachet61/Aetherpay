export interface TelegramStatus {
  running: boolean;
  botUsername?: string;
  channelId?: string;
  lastPollTime?: string;
  updatesReceived: number;
  lastError?: string;
  tokenConfigured?: boolean;
  maskedToken?: string;
}

class TelegramService {
  public async getStatus(): Promise<TelegramStatus> {
    try {
      const resp = await fetch('/api/telegram/status');
      if (resp.ok) {
        const text = await resp.text();
        try {
          return JSON.parse(text);
        } catch {
          // not valid json
        }
      }
    } catch (e) {
      console.warn('[TelegramService] getStatus error:', e);
    }
    return {
      running: false,
      updatesReceived: 0,
      lastError: 'Unable to connect to Telegram engine status endpoint',
    };
  }

  public async getConfig(): Promise<{
    success?: boolean;
    botToken?: string;
    channelId?: string;
    enabled?: boolean;
    botUsername?: string;
    tokenConfigured?: boolean;
    maskedToken?: string;
    updatedAt?: string;
  }> {
    try {
      const resp = await fetch('/api/telegram/config');
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('[TelegramService] getConfig error:', e);
    }
    return {};
  }

  public async saveConfig(
    botToken: string,
    channelId: string,
    enabled: boolean = true
  ): Promise<{ success: boolean; status?: TelegramStatus; config?: any; error?: string }> {
    const cleanToken = botToken.trim();
    const cleanChatId = channelId.trim();

    try {
      const resp = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: cleanToken, channelId: cleanChatId, enabled }),
      });

      const text = await resp.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, error: 'Server returned non-JSON response. Please verify server connection.' };
      }

      if (resp.ok && data.success) {
        return { success: true, status: data.status, config: data.config };
      }
      return { success: false, error: data.error || 'Failed to update configuration' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error updating Telegram configuration.' };
    }
  }

  public async testConnection(
    botToken: string,
    channelId: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanToken = botToken.trim();
    const cleanChatId = channelId.trim();

    if (!cleanToken) return { success: false, message: 'Please provide a Telegram Bot Token.' };
    if (!cleanChatId) return { success: false, message: 'Please provide a Target Chat / Channel ID.' };

    // 1. Try server backend endpoint first
    try {
      const resp = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: cleanToken, channelId: cleanChatId }),
      });

      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          if (data && typeof data.success === 'boolean') {
            return data;
          }
        } catch {
          // Fallback to direct client call below
        }
      }
    } catch {
      // Fallback to direct client call below
    }

    // 2. Direct browser fallback: Telegram Bot API supports CORS directly
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const meData = await meRes.json();
      if (!meData.ok) {
        return { success: false, message: `Invalid Bot Token: ${meData.description || 'Token verification failed.'}` };
      }

      const botUser = meData.result?.username;
      const testMsg = `🚀 *Swift Sweeps Telegram Bot Connected!*\n\nBot: @${botUser}\nChat ID: ${cleanChatId}\nStatus: 24/7 Operations Ready!`;
      
      const sendRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: testMsg,
          parse_mode: 'Markdown',
        }),
      });

      let sendData = await sendRes.json();

      // Smart Supergroup Auto-Retry: if chat not found and ID starts with single minus, retry with -100
      if (!sendData.ok && sendData.description?.includes('chat not found') && cleanChatId.startsWith('-') && !cleanChatId.startsWith('-100')) {
        const supergroupId = `-100${cleanChatId.replace(/^-/, '')}`;
        const retryRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: supergroupId,
            text: testMsg,
            parse_mode: 'Markdown',
          }),
        });
        const retryData = await retryRes.json();
        if (retryData.ok) {
          return {
            success: true,
            suggestedChannelId: supergroupId,
            message: `Connection successful! Auto-detected supergroup ID format: ${supergroupId}. Test message delivered to @${botUser}.`,
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
        message: `Connection successful! Test message sent to ${cleanChatId} from @${botUser}.`,
      };
    } catch (clientErr: any) {
      return { success: false, message: `Telegram API test error: ${clientErr.message}` };
    }
  }

  public async notify(params: {
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
    try {
      const resp = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const text = await resp.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, message: 'Server response not JSON' };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async notifyCustomerMessage(
    customerName: string,
    conversationId?: string
  ): Promise<{ success: boolean; message?: string; debounced?: boolean }> {
    try {
      const resp = await fetch('/api/telegram/notify-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, conversationId }),
      });
      const data = await resp.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const telegramService = new TelegramService();
