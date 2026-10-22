import React, { useState, useEffect } from 'react';
import { telegramService, TelegramStatus } from '../../services/telegramService';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  HelpCircle,
  Radio,
  ExternalLink,
  Wrench,
  Check,
  X,
  Copy,
  Info,
} from 'lucide-react';

export const TelegramBotConfigCard: React.FC = () => {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    suggestedFix?: string;
  } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Authoritatively load persistent configuration from database on component mount
  useEffect(() => {
    let isMounted = true;

    const loadAuthoritativeConfig = async () => {
      setIsLoadingStatus(true);
      try {
        const [s, cfg] = await Promise.all([
          telegramService.getStatus(),
          telegramService.getConfig(),
        ]);
        if (!isMounted) return;
        setStatus(s);
        if (cfg) {
          if (cfg.botToken) setBotToken(cfg.botToken);
          if (cfg.channelId) setChannelId(cfg.channelId);
          if (cfg.enabled !== undefined) setIsEnabled(cfg.enabled);
          if (cfg.updatedAt) setLastSavedTime(cfg.updatedAt);
        } else if (s.channelId) {
          setChannelId(s.channelId);
        }
      } catch (err) {
        console.warn('Error loading Telegram configuration:', err);
      } finally {
        if (isMounted) setIsLoadingStatus(false);
      }
    };

    loadAuthoritativeConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshAll = async () => {
    setIsLoadingStatus(true);
    try {
      const [s, cfg] = await Promise.all([
        telegramService.getStatus(),
        telegramService.getConfig(),
      ]);
      setStatus(s);
      if (cfg) {
        if (cfg.botToken && !botToken) setBotToken(cfg.botToken);
        if (cfg.channelId && !channelId) setChannelId(cfg.channelId);
        if (cfg.enabled !== undefined) setIsEnabled(cfg.enabled);
        if (cfg.updatedAt) setLastSavedTime(cfg.updatedAt);
      } else if (s.channelId && !channelId) {
        setChannelId(s.channelId);
      }
    } catch (err) {
      console.warn('Error reloading Telegram configuration:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Check if current channel ID is missing the -100 prefix for supergroups
  const cleanId = channelId.trim();
  const isMissingSupergroupPrefix = cleanId.startsWith('-') && !cleanId.startsWith('-100');
  const suggestedSupergroupId = isMissingSupergroupPrefix ? `-100${cleanId.replace(/^-/, '')}` : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveToken = botToken.trim();
    if (!effectiveToken && !status?.tokenConfigured) {
      setFeedback({ type: 'error', text: 'Please enter your Telegram Bot API Token.' });
      return;
    }
    const effectiveChannel = channelId.trim() || status?.channelId || '';
    if (!effectiveChannel) {
      setFeedback({ type: 'error', text: 'Please enter your Target Channel or Group Chat ID.' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: 'info', text: 'Saving configuration to Supabase database (table: app_config)...' });

    try {
      const res = await telegramService.saveConfig(effectiveToken, effectiveChannel, isEnabled);
      if (res.success) {
        setStatus(res.status || null);
        if (res.config) {
          if (res.config.botToken) setBotToken(res.config.botToken);
          if (res.config.channelId) setChannelId(res.config.channelId);
          if (res.config.updatedAt) setLastSavedTime(res.config.updatedAt);
        }
        setFeedback({
          type: 'success',
          text: 'Configuration successfully persisted to PostgreSQL database (app_config) and server storage!',
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to update Telegram Bot configuration.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error updating configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    const effectiveToken = botToken.trim();
    if (!effectiveToken && !status?.tokenConfigured) {
      setFeedback({ type: 'error', text: 'Please enter your Telegram Bot Token.' });
      return;
    }
    const effectiveChannel = channelId.trim() || status?.channelId || '';
    if (!effectiveChannel) {
      setFeedback({ type: 'error', text: 'Please enter your Target Channel or Group Chat ID.' });
      return;
    }

    setIsTesting(true);
    setFeedback({ type: 'info', text: 'Sending test dispatch through Telegram API...' });

    try {
      const res = await telegramService.testConnection(effectiveToken, effectiveChannel);
      if (res.success) {
        if ((res as any).suggestedChannelId) {
          setChannelId((res as any).suggestedChannelId);
        }
        setFeedback({ type: 'success', text: res.message });
      } else {
        const suggestedFix = (res as any).suggestedChannelId || (isMissingSupergroupPrefix ? suggestedSupergroupId : undefined);
        setFeedback({
          type: 'error',
          text: res.message,
          suggestedFix: suggestedFix || undefined,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const isConnected = Boolean(status?.tokenConfigured && (status?.channelId || channelId));

  return (
    <div className="p-6 rounded-2xl border border-sky-900/50 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0A1628] shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold shadow-inner">
            <Send className="w-5 h-5 -rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Telegram Customer Alerts (Zero-Egress Mode)</h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE • ZERO EGRESS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  CONFIG PENDING
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Event-driven notifications only. Server polling loop is disabled to eliminate 100% of background data egress. Whenever a customer posts a message in chat, an instant alert with their name is sent directly to your Telegram channel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoadingStatus}
            className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm cursor-pointer disabled:opacity-50"
            title="Reload configuration from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-sky-400' : ''}`} />
            <span>Sync DB</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 transition-colors bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg border border-sky-500/30 shadow-sm cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Bot Setup Guide</span>
          </button>
        </div>
      </div>

      {/* Real-time Engine Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Bot Handle</span>
          <div className="text-sm font-mono font-bold text-sky-400 mt-1 truncate">
            {status?.botUsername ? `@${status.botUsername}` : status?.tokenConfigured ? 'Connected' : 'Not Configured'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Target Chat / Channel</span>
          <div className="text-sm font-mono font-bold text-white mt-1 truncate">
            {status?.channelId || channelId || 'None'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Delivery Architecture</span>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
            Zero-Egress Push
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Polling Loop</span>
          <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Disabled (0 Egress)</span>
          </div>
        </div>
      </div>

      {/* Form Controls */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Database Persistence Verified Banner */}
        {status?.tokenConfigured && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/90 border border-emerald-900/50 text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Database Stored:</span> Persistent in PostgreSQL table <code className="text-emerald-400 font-mono">app_config</code>.
                {lastSavedTime && (
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    Database timestamp: {new Date(lastSavedTime).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
              PERSISTED IN DB
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Bot API Token */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Telegram Bot API Token</span>
              <span className="text-[10px] text-slate-500 font-mono">From @BotFather</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={
                  status?.tokenConfigured
                    ? `Configured (${status.maskedToken || 'Protected Token'})`
                    : 'e.g. 7123456789:AAHk...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-white text-xs placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Target Channel ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <span>Support Channel / Chat ID</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Channel ID or @handle</span>
            </div>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="e.g. -1004339845768 or @swiftsweeps_support"
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 font-mono text-white text-xs placeholder-slate-600 focus:outline-none ${
                isMissingSupergroupPrefix ? 'border-amber-500/80 focus:border-amber-400' : 'border-slate-800 focus:border-sky-500'
              }`}
            />

            {/* Quick-Fix Supergroup Prefix Helper */}
            {suggestedSupergroupId && (
              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>Channel format hint: Telegram groups/channels require <strong>-100</strong> prefix.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChannelId(suggestedSupergroupId)}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 text-[10px] font-bold font-mono transition"
                >
                  Auto-Fix to {suggestedSupergroupId}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback message & Troubleshooting Box */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs space-y-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-950/80 border border-rose-700 text-rose-200'
                : 'bg-sky-950/80 border border-sky-700 text-sky-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 text-sky-400 animate-spin mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <span className="font-medium leading-relaxed block">{feedback.text}</span>

                {/* If test returned a suggested auto-fix */}
                {feedback.suggestedFix && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] text-amber-300">Recommended correction:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChannelId(feedback.suggestedFix!);
                        setFeedback(null);
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-bold font-mono"
                    >
                      Update to {feedback.suggestedFix}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actionable Troubleshooting Guide when chat not found occurs */}
            {feedback.type === 'error' && feedback.text.includes('chat not found') && (
              <div className="mt-2 pt-2 border-t border-rose-900/60 text-[11px] text-rose-200/90 space-y-1.5 pl-6">
                <div className="font-bold text-white flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>How to fix "chat not found":</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                  <li>
                    <strong>Add the bot as an Administrator:</strong> Open your Telegram group or channel, tap Group Settings &gt; Administrators &gt; Add Administrator, and select your bot.
                  </li>
                  <li>
                    <strong>Check the Supergroup / Channel prefix:</strong> If your chat ID looks like <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">-4339845768</code>, it must be entered with <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">-100</code> prefix: <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">-1004339845768</code>.
                  </li>
                  <li>
                    <strong>Send a test message:</strong> Post at least one message inside the group so Telegram registers the chat before clicking Test Connection.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-sky-500"
              />
              <span>Enable Customer Message Alerts</span>
            </label>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTest}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Test Bot Connection</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/25 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save &amp; Enable Alerts</span>
            </button>
          </div>
        </div>
      </form>

      {/* Step-by-Step Telegram Channel Setup Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowGuideModal(false)}
          />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs text-slate-300 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4 -rotate-12" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Telegram Support Bot Setup Guide</h3>
                  <p className="text-[11px] text-slate-400">Step-by-step instructions to connect your bot &amp; channel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps Container */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">1</span>
                  <span>Create Bot with @BotFather</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px] pl-7">
                  Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline font-semibold">@BotFather</a>. Send <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">/newbot</code>, choose a display name and username ending in 'bot' (e.g. <code>swiftsweeps_support_bot</code>).
                </p>
                <p className="text-slate-400 leading-relaxed text-[11px] pl-7">
                  BotFather will reply with your HTTP API Token. Copy and paste it into the <strong>Telegram Bot API Token</strong> field.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">2</span>
                  <span>Create Support Group &amp; Add Bot as Administrator</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px] pl-7">
                  Create a new private Telegram Group or Channel where your support agents will work.
                </p>
                <div className="pl-7 pt-1 text-[11px] text-amber-200/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40">
                  ⚠️ <strong>Critical Step:</strong> Add your bot to the group and promote it to <strong>Administrator</strong> with permissions to <em>Send Messages</em>. If the bot is not an administrator, Telegram blocks automated notifications!
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">3</span>
                  <span>Get the Exact Chat / Channel ID</span>
                </div>
                <div className="pl-7 space-y-2 text-[11px] text-slate-400">
                  <p>
                    • <strong>Public Channel/Group:</strong> You can simply use its public username, e.g. <code className="text-amber-300 font-mono">@yourchannelname</code>.
                  </p>
                  <p>
                    • <strong>Private Channel/Group:</strong> Add <a href="https://t.me/RawDataBot" target="_blank" rel="noreferrer" className="text-sky-400 underline">@RawDataBot</a> or <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-400 underline">@userinfobot</a> to the group to inspect the chat ID.
                  </p>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="text-amber-300 font-bold">Important:</span> Telegram supergroups and channels always have a 13-14 digit ID starting with <strong>-100</strong>, e.g. <span className="text-emerald-400">-1004339845768</span>.
                  </div>
                </div>
              </div>

              {/* Step 4: Zero-Egress Notifications */}
              <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-1 text-slate-300">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Zero-Egress Customer Notifications:</span>
                </div>
                <p className="text-[11px] text-slate-300/90 leading-relaxed pl-5">
                  Continuous polling has been removed to conserve server bandwidth. Whenever a customer sends a message in support chat, a minimal alert with their name (<code>💬 New message from [Customer Name]</code>) is immediately dispatched to your Telegram channel.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
