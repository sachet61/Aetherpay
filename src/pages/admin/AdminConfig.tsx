import React, { useState, useRef } from 'react';
import { UserProfile, AppConfig, PaymentMethodType } from '../../types';
import { dataService } from '../../services/dataService';
import { getSupabaseConfig, testSupabaseConnection } from '../../services/supabaseClient';
import {
  Settings,
  Save,
  CheckCircle2,
  Percent,
  CreditCard,
  Building2,
  Coins,
  Shield,
  FileText,
  AlertCircle,
  Zap,
  Flame,
  Key,
  ExternalLink,
  DollarSign,
  QrCode,
  Link as LinkIcon,
  HelpCircle,
  Calculator,
  RotateCcw,
  Plus,
  Trash2,
  Users,
  Database,
  Cloud,
  Upload,
  Smartphone,
  Monitor,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { TelegramBotConfigCard } from '../../components/admin/TelegramBotConfigCard';
import { PolicyAndPartnerCmsCard } from '../../components/admin/PolicyAndPartnerCmsCard';

interface QrCodeUploadBoxProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (url: string) => void;
  filePrefix?: string;
  helpText?: string;
  onDirectSave?: () => void;
}

const QrCodeUploadBox: React.FC<QrCodeUploadBoxProps> = ({
  label,
  value,
  placeholder,
  onChange,
  filePrefix = 'qr_image',
  helpText,
  onDirectSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const processAndUploadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusMsg({ text: 'Please select an image file (PNG, JPG, WEBP).', type: 'error' });
      return;
    }

    setIsUploading(true);
    setStatusMsg({ text: 'Reading image from device...', type: 'info' });

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        setIsUploading(false);
        setStatusMsg({ text: 'Failed to read image file.', type: 'error' });
        return;
      }

      // Resize/optimize image if larger than 1200px
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
            uploadData(optimized);
          } else {
            uploadData(rawDataUrl);
          }
        } catch {
          uploadData(rawDataUrl);
        }
      };
      img.onerror = () => {
        uploadData(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsUploading(false);
      setStatusMsg({ text: 'Error reading file.', type: 'error' });
    };
    reader.readAsDataURL(file);
  };

  const uploadData = async (dataUrl: string) => {
    setStatusMsg({ text: 'Saving to server storage & Supabase database...', type: 'info' });
    try {
      const res = await fetch('/api/upload-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename: filePrefix }),
      });

      if (res.ok) {
        const json = await res.json();
        const serverUrl = json.url;
        onChange(serverUrl);
        if (onDirectSave) onDirectSave();
        setStatusMsg({
          text: `QR image uploaded! Saved to server storage (${serverUrl}) and Supabase database.`,
          type: 'success',
        });
      } else {
        onChange(dataUrl);
        if (onDirectSave) onDirectSave();
        setStatusMsg({
          text: 'Saved directly to database storage.',
          type: 'success',
        });
      }
    } catch {
      onChange(dataUrl);
      if (onDirectSave) onDirectSave();
      setStatusMsg({
        text: 'Saved directly to database storage.',
        type: 'success',
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
      <div className="flex items-center justify-between">
        <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-teal-400" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] text-slate-500 font-mono">Mobile Camera / PC File</span>
      </div>

      {helpText && <p className="text-[11px] text-slate-400 leading-tight">{helpText}</p>}

      {/* Hidden file input for PC and Mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processAndUploadFile(e.target.files[0]);
          }
        }}
      />

      {/* Status note */}
      {statusMsg && (
        <div
          className={`text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
              : statusMsg.type === 'error'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
          }`}
        >
          {statusMsg.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
          {statusMsg.type === 'info' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
          {statusMsg.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Current Preview or Upload Dropzone */}
      {value ? (
        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
          <div className="relative group shrink-0">
            <img
              src={value}
              alt="QR Code"
              className="w-24 h-24 object-contain rounded-lg bg-white p-1.5 border border-slate-700 shadow-sm"
            />
          </div>

          <div className="flex-1 space-y-1.5 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                Active QR Code
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {value.startsWith('data:') ? 'Stored in Database' : 'Server/Repo Storage'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate max-w-full">
              {value}
            </div>

            <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span>Replace QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange('');
                  if (onDirectSave) setTimeout(onDirectSave, 50);
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer p-4 rounded-xl border-2 border-dashed transition-all text-center space-y-2 ${
            dragActive
              ? 'border-teal-400 bg-teal-950/20'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-teal-400">
            <Upload className="w-5 h-5" />
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <Monitor className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-200">
              {isUploading ? 'Uploading QR Code...' : 'Upload QR Code from PC or Mobile'}
            </p>
            <p className="text-[11px] text-slate-400">
              Tap to capture camera photo, choose from mobile gallery, or browse/drop from PC
            </p>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 text-[10px] text-slate-400 border border-slate-700/60">
            <span>Stores in Server Repo Storage & Supabase Database</span>
          </div>
        </div>
      )}

      {/* Toggle Manual URL / Path Entry */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          <span>{showManualInput ? '▼ Hide manual URL / path' : '▶ Or enter URL / local path manually'}</span>
        </button>

        {showManualInput && (
          <div className="mt-1.5 space-y-1">
            <input
              type="text"
              value={value || ''}
              placeholder={placeholder || 'e.g. /images/qr/my_qr.png or https://...'}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface AdminConfigProps {
  currentUser: UserProfile;
}

export const AdminConfig: React.FC<AdminConfigProps> = ({ currentUser }) => {
  const [config, setConfig] = useState<AppConfig>(dataService.getAppConfig());
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [simulatorNotice, setSimulatorNotice] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [webhookLogs, setWebhookLogs] = useState(dataService.getWebhookLogs());
  const [isResettingDatabase, setIsResettingDatabase] = useState(false);
  const [databaseNotice, setDatabaseNotice] = useState<string | null>(null);

  // Supabase Integration & Migration state
  const [isMigratingSupabase, setIsMigratingSupabase] = useState(false);
  const [supabaseNotice, setSupabaseNotice] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const supabaseConfig = getSupabaseConfig();

  const handleMigrateToSupabase = async () => {
    setIsMigratingSupabase(true);
    setSupabaseNotice({ text: 'Starting migration: uploading all users, wallets, games, transactions, and messages to Supabase...', type: 'info' });
    try {
      const res = await dataService.migrateAllToSupabase();
      if (res.success) {
        setSupabaseNotice({ text: res.message, type: 'success' });
      } else {
        setSupabaseNotice({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setSupabaseNotice({ text: 'Migration error: ' + (err?.message || String(err)), type: 'error' });
    } finally {
      setIsMigratingSupabase(false);
    }
  };

  const handleTestSupabase = async () => {
    setSupabaseTestStatus('Checking Supabase connection...');
    const res = await testSupabaseConnection();
    setSupabaseTestStatus(res.message);
    setTimeout(() => setSupabaseTestStatus(null), 8000);
  };

  const handleCopySqlSchema = async () => {
    try {
      const res = await fetch('/supabase_schema.sql');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      window.open('/supabase_schema.sql', '_blank');
    }
  };

  const handleResetData = () => {
    if (!window.confirm('Reset local cache & storage to fresh demo presets and sync to database?')) return;
    dataService.resetToSeedData();
    setSuccessNote('Demo preset data reset and synchronized successfully.');
    setTimeout(() => setSuccessNote(null), 4000);
  };

  // Interactive Live Bonus Simulator state in Admin UI
  const [testAmount, setTestAmount] = useState<number>(100);
  const [testMethodType, setTestMethodType] = useState<PaymentMethodType>('crypto');

  // New Player Username input for Cashout Pool
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newProbableAmt, setNewProbableAmt] = useState('');

  const handleTogglePaymentMethod = (id: string) => {
    const updated = {
      ...config,
      paymentMethods: config.paymentMethods.map((pm) =>
        pm.id === id ? { ...pm, enabled: !pm.enabled } : pm
      ),
    };
    setConfig(updated);
  };

  const handleUpdatePaymentMethodField = (id: string, field: string, value: any) => {
    const updated = {
      ...config,
      paymentMethods: config.paymentMethods.map((pm) =>
        pm.id === id ? { ...pm, [field]: value } : pm
      ),
    };
    setConfig(updated);
  };

  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    dataService.updateAppConfig(config, currentUser.id, currentUser.displayName);
    setSuccessNote('Dynamic payment methods, bonus percentages, and platform settings saved successfully!');
    setTimeout(() => setSuccessNote(null), 3000);
  };

  // Find methods
  const paymentLinkMethod = config.paymentMethods.find((m) => m.type === 'payment_link');
  const cashAppMethod = config.paymentMethods.find((m) => m.type === 'cashapp');
  const chimeMethod = config.paymentMethods.find((m) => m.type === 'chime');
  const cryptoMethod = config.paymentMethods.find((m) => m.type === 'crypto');

  // Simulator calculation
  const simMethod = config.paymentMethods.find((m) => m.type === testMethodType) || cryptoMethod;
  const simBonusPct = simMethod?.bonusPercentage || 0;
  const simBonusAmt = (testAmount * simBonusPct) / 100;
  const simTotalCredited = testAmount + simBonusAmt;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payment &amp; Bonus Configuration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic promotional deposit bonuses for all 4 top-up channels, manage payment links, manual crypto addresses, and withdrawal rules.
          </p>
        </div>

        <button
          onClick={() => handleSaveConfig()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          <span>Save All Changes</span>
        </button>
      </div>

      {successNote && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successNote}</span>
        </div>
      )}

      {databaseNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{databaseNotice}</span>
          </div>
          <button
            onClick={() => setDatabaseNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 24/7 Telegram Support Bot Engine */}
      <TelegramBotConfigCard />

      {/* Policies & Supported Partners CMS */}
      <PolicyAndPartnerCmsCard />

      {/* 4 Dynamic Payment Methods Configuration Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <span>Top-Up (Cash-In) Channels &amp; Dynamic Bonus Rates</span>
          </h2>
          <span className="text-xs text-slate-400">Exactly 4 Supported Methods</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Payment via Link */}
          {paymentLinkMethod && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Payment via Link</h3>
                    <div className="text-[10px] text-slate-400 font-mono">Channel: payment_link</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Active</span>
                  <input
                    type="checkbox"
                    checked={paymentLinkMethod.enabled}
                    onChange={() => handleTogglePaymentMethod(paymentLinkMethod.id)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Bonus % Field */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Bonus Percentage</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{paymentLinkMethod.bonusPercentage || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={paymentLinkMethod.bonusPercentage || 0}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(
                        paymentLinkMethod.id,
                        'bonusPercentage',
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-emerald-400 font-bold text-sm"
                  />
                  <div className="flex gap-1">
                    {[10, 15, 20, 25].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleUpdatePaymentMethodField(paymentLinkMethod.id, 'bonusPercentage', b)}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                          paymentLinkMethod.bonusPercentage === b
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {b}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Forward URL */}
              <div className="space-y-1 text-xs">
                <label className="text-slate-400 text-[11px]">Forward Checkout Link URL</label>
                <input
                  type="text"
                  value={paymentLinkMethod.forwardUrl || 'http://www.keyhubsolutions.com/c/Jhaukhel'}
                  onChange={(e) =>
                    handleUpdatePaymentMethodField(paymentLinkMethod.id, 'forwardUrl', e.target.value)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-blue-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Min Deposit ($)</label>
                  <input
                    type="number"
                    value={paymentLinkMethod.minAmount || 10}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(paymentLinkMethod.id, 'minAmount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Max Deposit ($)</label>
                  <input
                    type="number"
                    value={paymentLinkMethod.maxAmount || 10000}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(paymentLinkMethod.id, 'maxAmount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Direct CashApp Payment */}
          {cashAppMethod && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Direct CashApp Payment</h3>
                    <div className="text-[10px] text-slate-400 font-mono">Channel: cashapp</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Active</span>
                  <input
                    type="checkbox"
                    checked={cashAppMethod.enabled}
                    onChange={() => handleTogglePaymentMethod(cashAppMethod.id)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Bonus % Field */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Bonus Percentage</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{cashAppMethod.bonusPercentage || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cashAppMethod.bonusPercentage || 0}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(
                        cashAppMethod.id,
                        'bonusPercentage',
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-emerald-400 font-bold text-sm"
                  />
                  <div className="flex gap-1">
                    {[15, 20, 25, 30].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleUpdatePaymentMethodField(cashAppMethod.id, 'bonusPercentage', b)}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                          cashAppMethod.bonusPercentage === b
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {b}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Forward URL */}
              <div className="space-y-1 text-xs">
                <label className="text-slate-400 text-[11px]">Direct CashApp Forward Link URL</label>
                <input
                  type="text"
                  value={cashAppMethod.forwardUrl || 'http://www.keyhubsolutions.com/l/Jhaukhel'}
                  onChange={(e) =>
                    handleUpdatePaymentMethodField(cashAppMethod.id, 'forwardUrl', e.target.value)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* CashApp QR Code Upload */}
              <QrCodeUploadBox
                label="CashApp QR Code Image (optional)"
                value={cashAppMethod.qrCodeUrl || ''}
                placeholder="Leave empty for link-only, or upload CashApp QR from PC/mobile"
                filePrefix="cashapp_qr"
                helpText="Upload CashApp QR code image from your PC or mobile phone. It is stored in server repo storage (/images/qr/...) and saved in the Supabase database."
                onChange={(newUrl) => {
                  const updatedMethods = config.paymentMethods.map((pm) =>
                    pm.id === cashAppMethod.id ? { ...pm, qrCodeUrl: newUrl } : pm
                  );
                  const updatedConfig = { ...config, paymentMethods: updatedMethods };
                  setConfig(updatedConfig);
                  dataService.updateAppConfig(updatedConfig, currentUser.id, currentUser.displayName);
                }}
              />

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Min Deposit ($)</label>
                  <input
                    type="number"
                    value={cashAppMethod.minAmount || 10}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(cashAppMethod.id, 'minAmount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Max Deposit ($)</label>
                  <input
                    type="number"
                    value={cashAppMethod.maxAmount || 5000}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(cashAppMethod.id, 'maxAmount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Chime Direct Payment */}
          {chimeMethod && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Chime Direct Payment</h3>
                    <div className="text-[10px] text-amber-400 font-mono">Enforced Rule: Min $20.00</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Active</span>
                  <input
                    type="checkbox"
                    checked={chimeMethod.enabled}
                    onChange={() => handleTogglePaymentMethod(chimeMethod.id)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Bonus % Field */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Bonus Percentage</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{chimeMethod.bonusPercentage || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={chimeMethod.bonusPercentage || 0}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(
                        chimeMethod.id,
                        'bonusPercentage',
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-emerald-400 font-bold text-sm"
                  />
                  <div className="flex gap-1">
                    {[10, 15, 20, 25].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleUpdatePaymentMethodField(chimeMethod.id, 'bonusPercentage', b)}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                          chimeMethod.bonusPercentage === b
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {b}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chime Tag & QR Code Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Chime Handle / Tag</label>
                  <input
                    type="text"
                    value={chimeMethod.chimeHandle || '$SwiftSweepsVault'}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(chimeMethod.id, 'chimeHandle', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-teal-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Strict Minimum Rule ($)</label>
                  <input
                    type="number"
                    min="20"
                    value={Math.max(20, chimeMethod.minAmount || 20)}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(
                        chimeMethod.id,
                        'minAmount',
                        Math.max(20, parseFloat(e.target.value) || 20)
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-amber-300 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <QrCodeUploadBox
                label="Chime QR Code Image"
                value={chimeMethod.chimeQrCodeUrl || ''}
                placeholder="Leave empty for auto-generated chime:// QR code, or upload from PC/mobile"
                filePrefix="chime_qr"
                helpText="Upload a Chime QR code image from your PC or take a photo/choose from gallery on mobile. It is saved to the server repo storage (/images/qr/...) and synced directly to the Supabase database."
                onChange={(newUrl) => {
                  const updatedMethods = config.paymentMethods.map((pm) =>
                    pm.id === chimeMethod.id ? { ...pm, chimeQrCodeUrl: newUrl } : pm
                  );
                  const updatedConfig = { ...config, paymentMethods: updatedMethods };
                  setConfig(updatedConfig);
                  dataService.updateAppConfig(updatedConfig, currentUser.id, currentUser.displayName);
                }}
              />
            </div>
          )}

          {/* 4. Crypto Payment */}
          {cryptoMethod && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Crypto Payment</h3>
                    <div className="text-[10px] text-slate-400 font-mono">Channel: crypto (BTC, ETH, USDT)</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Active</span>
                  <input
                    type="checkbox"
                    checked={cryptoMethod.enabled}
                    onChange={() => handleTogglePaymentMethod(cryptoMethod.id)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Bonus % Field */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Bonus Percentage</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{cryptoMethod.bonusPercentage || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cryptoMethod.bonusPercentage ?? 30}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(
                        cryptoMethod.id,
                        'bonusPercentage',
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-emerald-400 font-bold text-sm"
                  />
                  <div className="flex gap-1">
                    {[15, 20, 25, 30].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleUpdatePaymentMethodField(cryptoMethod.id, 'bonusPercentage', b)}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                          cryptoMethod.bonusPercentage === b
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {b}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manual Wallet Addresses */}
              <div className="space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Bitcoin (BTC) Address</label>
                  <input
                    type="text"
                    value={cryptoMethod.btcAddress || 'bc1q9v04x73y2fepz5r64h42qj0z8n0n9s3t0vx6m9'}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(cryptoMethod.id, 'btcAddress', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-amber-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Ethereum (ETH) Address</label>
                  <input
                    type="text"
                    value={cryptoMethod.ethAddress || '0x71C8705a2B8841738734007b8b200b39645F33C4'}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(cryptoMethod.id, 'ethAddress', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">USDT (TRC20 / ERC20) Address</label>
                  <input
                    type="text"
                    value={cryptoMethod.usdtAddress || 'TX7nLw6U8R91kpm2XkHqa98yY117SwiftSweeps'}
                    onChange={(e) =>
                      handleUpdatePaymentMethodField(cryptoMethod.id, 'usdtAddress', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-emerald-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Player Cashout Control & Custom Configuration (Admin) */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Live Player Cashout Settings</h2>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  $50 - $250 RANGES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Set custom player username list, cashout amount ranges ($50-$250), most probable amounts, and 2-hour staggered history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-2">
              <span>Ticker Active</span>
              <input
                type="checkbox"
                checked={config.cashoutFeed?.enabled}
                onChange={(e) => {
                  const updated = {
                    ...config,
                    cashoutFeed: {
                      ...config.cashoutFeed,
                      enabled: e.target.checked,
                    },
                  };
                  setConfig(updated);
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-600 focus:ring-0"
              />
            </label>
          </div>
        </div>

        {feedNotice && (
          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedNotice}</span>
          </div>
        )}

        {/* Ranges & Timing Control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold text-[11px]">Min Cashout Range ($)</label>
            <input
              type="number"
              value={config.cashoutFeed?.minAmount ?? 50}
              onChange={(e) => {
                const val = Math.max(10, parseFloat(e.target.value) || 50);
                setConfig({
                  ...config,
                  cashoutFeed: { ...config.cashoutFeed, minAmount: val },
                });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-emerald-400 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold text-[11px]">Max Cashout Range ($)</label>
            <input
              type="number"
              value={config.cashoutFeed?.maxAmount ?? 250}
              onChange={(e) => {
                const val = Math.max(config.cashoutFeed?.minAmount || 50, parseFloat(e.target.value) || 250);
                setConfig({
                  ...config,
                  cashoutFeed: { ...config.cashoutFeed, maxAmount: val },
                });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-emerald-400 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold text-[11px]">Rotation Speed (Seconds)</label>
            <input
              type="number"
              min="2"
              max="60"
              value={config.cashoutFeed?.intervalSeconds ?? 6}
              onChange={(e) => {
                const val = Math.max(2, parseInt(e.target.value, 10) || 6);
                setConfig({
                  ...config,
                  cashoutFeed: { ...config.cashoutFeed, intervalSeconds: val },
                });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold text-[11px]">Time Window History</label>
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs flex items-center justify-between">
              <span>Starts 2 hrs ago</span>
              <span className="text-[10px] text-emerald-400 font-bold">+ Realtime</span>
            </div>
          </div>
        </div>

        {/* Most Probable Amounts (Set in Admin) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Most Probable Cashout Amounts (${config.cashoutFeed?.minAmount || 50} - ${config.cashoutFeed?.maxAmount || 250})</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {(config.cashoutFeed?.probableAmounts || []).length} active probability weights
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(config.cashoutFeed?.probableAmounts || [50, 75, 100, 120, 140, 150, 180, 200, 220, 250]).map((amt, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>${amt}</span>
                <button
                  type="button"
                  onClick={() => {
                    const current = config.cashoutFeed?.probableAmounts || [50, 75, 100, 120, 140, 150, 180, 200, 220, 250];
                    if (current.length <= 1) return;
                    const updated = current.filter((_, i) => i !== idx);
                    setConfig({
                      ...config,
                      cashoutFeed: { ...config.cashoutFeed, probableAmounts: updated },
                    });
                  }}
                  className="hover:text-rose-400 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          {/* Add Amount to Probable List */}
          <div className="flex items-center gap-2 pt-1 max-w-sm">
            <input
              type="number"
              placeholder="e.g. 175"
              value={newProbableAmt}
              onChange={(e) => setNewProbableAmt(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 flex-1"
            />
            <button
              type="button"
              onClick={() => {
                const val = parseFloat(newProbableAmt);
                if (val && !isNaN(val)) {
                  const current = config.cashoutFeed?.probableAmounts || [50, 75, 100, 120, 140, 150, 180, 200, 220, 250];
                  if (!current.includes(val)) {
                    const sorted = [...current, val].sort((a, b) => a - b);
                    setConfig({
                      ...config,
                      cashoutFeed: { ...config.cashoutFeed, probableAmounts: sorted },
                    });
                  }
                  setNewProbableAmt('');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Amount</span>
            </button>
          </div>
        </div>

        {/* Custom List of Usernames (Names Pool) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Custom List of Player Usernames (Live Pool)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {(config.cashoutFeed?.namesPool || []).length} player usernames in pool
            </span>
          </div>

          {/* Add Player Name Input */}
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="Add username (e.g. ApexLegend_99)"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newPlayerName.trim()) {
                    const currentPool = config.cashoutFeed?.namesPool || [];
                    if (!currentPool.includes(newPlayerName.trim())) {
                      setConfig({
                        ...config,
                        cashoutFeed: { ...config.cashoutFeed, namesPool: [...currentPool, newPlayerName.trim()] },
                      });
                    }
                    setNewPlayerName('');
                  }
                }
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 flex-1"
            />
            <button
              type="button"
              onClick={() => {
                if (newPlayerName.trim()) {
                  const currentPool = config.cashoutFeed?.namesPool || [];
                  if (!currentPool.includes(newPlayerName.trim())) {
                    setConfig({
                      ...config,
                      cashoutFeed: { ...config.cashoutFeed, namesPool: [...currentPool, newPlayerName.trim()] },
                    });
                  }
                  setNewPlayerName('');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Player</span>
            </button>
          </div>

          {/* Usernames Chips Grid */}
          <div className="flex flex-wrap items-center gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
            {(config.cashoutFeed?.namesPool || []).map((name, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-medium flex items-center gap-1.5 shadow-sm"
              >
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentPool = config.cashoutFeed?.namesPool || [];
                    if (currentPool.length <= 1) return;
                    const updated = currentPool.filter((_, i) => i !== idx);
                    setConfig({
                      ...config,
                      cashoutFeed: { ...config.cashoutFeed, namesPool: updated },
                    });
                  }}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          <p className="text-[11px] text-slate-500">
            Click &times; to remove any username or type in the box above and click "Add Player" (or press Enter).
          </p>
        </div>

        {/* Live Simulator Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const refreshed = dataService.generateInitialFakeCashouts(config);
                dataService.saveFakedCashouts(refreshed);
                setFeedNotice('Re-generated 2-hour back-dated live player cashout history with current pool and ranges.');
                setTimeout(() => setFeedNotice(null), 3500);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reset &amp; Re-seed 2hr Feed</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const injected = dataService.injectNewFakeCashout();
                if (injected) {
                  setFeedNotice(`Injected instant real-time cashout: ${injected.customerName} cashed out $${injected.amount.toFixed(2)} on ${injected.gameName || 'Game'}!`);
                  setTimeout(() => setFeedNotice(null), 3500);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Real-time Cashout Now</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSaveConfig()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Live Cashout Configuration</span>
          </button>
        </div>
      </div>

      {/* Platform Withdrawal Settings */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Platform Withdrawal Rules &amp; Anti-Fraud Policies</span>
        </h2>
        <p className="text-xs text-slate-400">
          Enforce 1:1 payout channel binding, KYC verification guidelines, and minimum withdrawal limits.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">Standard Withdrawal Processing Window</label>
            <input
              type="text"
              defaultValue="15 minutes to 2 hours (24/7 Operations)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">Minimum Cashout Amount ($ USD)</label>
            <input
              type="number"
              defaultValue={30}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white"
            />
          </div>
        </div>
      </div>

      {/* Platform Legal & Terms Disclosures */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Customer Disclosures &amp; Terms</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">Deposit Policy Disclosure</label>
            <textarea
              value={config.platformRules?.depositTerms}
              onChange={(e) =>
                setConfig({
                  ...config,
                  platformRules: { ...config.platformRules, depositTerms: e.target.value },
                })
              }
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">Promotional Bonus Wagering Terms</label>
            <textarea
              value={config.platformRules?.bonusWageringTerms}
              onChange={(e) =>
                setConfig({
                  ...config,
                  platformRules: { ...config.platformRules, bonusWageringTerms: e.target.value },
                })
              }
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => handleSaveConfig()}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};
