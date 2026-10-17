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
} from 'lucide-react';

export const TelegramBotConfigCard: React.FC = () => {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const refreshStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const s = await telegramService.getStatus();
      setStatus(s);
      if (s.channelId && !channelId) {
        setChannelId(s.channelId);
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your Telegram Bot API Token.' });
      return;
    }
    if (!channelId.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your Target Channel or Group Chat ID.' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: 'info', text: 'Connecting bot to 24/7 server polling engine...' });

    try {
      const res = await telegramService.saveConfig(botToken.trim(), channelId.trim(), isEnabled);
      if (res.success) {
        setStatus(res.status || null);
        setFeedback({
          type: 'success',
          text: 'Telegram Bot engine updated and polling indefinitely 24/7 alongside the web application!',
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
    if (!botToken.trim() || !channelId.trim()) {
      setFeedback({ type: 'error', text: 'Please enter both Bot Token and Channel ID before testing.' });
      return;
    }

    setIsTesting(true);
    setFeedback({ type: 'info', text: 'Sending test dispatch through Telegram API...' });

    try {
      const res = await telegramService.testConnection(botToken.trim(), channelId.trim());
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const isConnected = status?.running && status?.botUsername;

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
              <h2 className="text-base font-bold text-white">24/7 Telegram Support Bot Engine</h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE &amp; POLLING 24/7
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  OFFLINE / CONFIG PENDING
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Runs indefinitely server-side inside this web app. Two-way messaging: notifies your channel on player messages, and staff replies in Telegram post directly to player chat.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showGuide ? 'Hide Instructions' : 'Bot Setup Guide'}</span>
        </button>
      </div>

      {/* Guide Box */}
      {showGuide && (
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs space-y-2.5 text-slate-300">
          <div className="font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>3-Step Quick Telegram Bot Setup:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed text-slate-300">
            <li>
              Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline font-semibold">@BotFather</a>. Send <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">/newbot</code>, choose a name and username, then copy your HTTP API token.
            </li>
            <li>
              Create a private group or channel for your support staff. Add your bot into the group and grant it <strong>Administrator</strong> privileges.
            </li>
            <li>
              Send a message in that group or channel. Get the Chat ID (e.g. <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">-100XXXXXXXXXX</code> or <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">@mychannel</code>) and paste below.
            </li>
          </ol>
          <div className="text-[11px] text-sky-300/80 bg-sky-950/40 p-2.5 rounded-lg border border-sky-800/40">
            💡 <strong>Two-Way Magic:</strong> Whenever a player sends a message or submits top-up proof, an alert arrives in your Telegram group. Simply <em>reply</em> to that Telegram notification message, and your reply appears right on the player's screen!
          </div>
        </div>
      )}

      {/* Real-time Engine Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Bot Handle</span>
          <div className="text-sm font-mono font-bold text-sky-400 mt-1 truncate">
            {status?.botUsername ? `@${status.botUsername}` : 'Not Connected'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Target Chat / Channel</span>
          <div className="text-sm font-mono font-bold text-white mt-1 truncate">
            {status?.channelId || channelId || 'None'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Updates Processed</span>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
            {status?.updatesReceived ?? 0}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[11px] text-slate-400">Engine Heartbeat</span>
          <div className="text-xs font-bold text-slate-300 mt-1 flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${status?.running ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
            <span>{status?.running ? 'Listening' : 'Idle'}</span>
          </div>
        </div>
      </div>

      {/* Form Controls */}
      <form onSubmit={handleSave} className="space-y-4">
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
                placeholder="e.g. 7123456789:AAHk..."
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
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Support Channel / Chat ID</span>
              <span className="text-[10px] text-slate-500 font-mono">Channel ID or @handle</span>
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="e.g. -1002345678901 or @swiftsweepssupport"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-white text-xs placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-950/80 border border-rose-700 text-rose-200'
                : 'bg-sky-950/80 border border-sky-700 text-sky-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 text-sky-400 animate-spin" />
            )}
            <span>{feedback.text}</span>
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
              <span>Enable Server Polling Loop</span>
            </label>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTest}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Test Bot Connection</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save &amp; Start 24/7 Engine</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
