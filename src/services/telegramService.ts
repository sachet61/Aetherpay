export interface TelegramStatus {
  running: boolean;
  botUsername?: string;
  channelId?: string;
  lastPollTime?: string;
  updatesReceived: number;
  lastError?: string;
}

class TelegramService {
  public async getStatus(): Promise<TelegramStatus> {
    try {
      const resp = await fetch('/api/telegram/status');
      if (resp.ok) {
        return await resp.json();
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

  public async saveConfig(
    botToken: string,
    channelId: string,
    enabled: boolean = true
  ): Promise<{ success: boolean; status?: TelegramStatus; error?: string }> {
    try {
      const resp = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, channelId, enabled }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        return { success: true, status: data.status };
      }
      return { success: false, error: data.error || 'Failed to update configuration' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async testConnection(
    botToken: string,
    channelId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const resp = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, channelId }),
      });
      return await resp.json();
    } catch (err: any) {
      return { success: false, message: err.message };
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
      return await resp.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const telegramService = new TelegramService();
