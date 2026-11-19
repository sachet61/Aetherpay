import React, { useMemo, useState } from 'react';
import { WheelOfLuckConfig, WheelSegment } from '../../types';
import { dataService } from '../../services/dataService';
import {
  DEFAULT_WHEEL_OF_LUCK_CONFIG,
  WHEEL_COLOR_PALETTE,
  computeSegmentProbabilities,
  normalizeWheelConfig,
  validateWheelConfig,
} from '../../utils/wheelOfLuckUtils';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';

interface WheelOfLuckAdminCardProps {
  initialConfig?: WheelOfLuckConfig;
  onConfigSaved?: (cfg: WheelOfLuckConfig) => void;
}

export const WheelOfLuckAdminCard: React.FC<WheelOfLuckAdminCardProps> = ({
  initialConfig,
  onConfigSaved,
}) => {
  const [draft, setDraft] = useState<WheelOfLuckConfig>(() =>
    normalizeWheelConfig(initialConfig || dataService.getAppConfig().wheelOfLuck)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const probabilities = useMemo(() => computeSegmentProbabilities(draft.segments), [draft.segments]);
  const validation = useMemo(() => validateWheelConfig(draft), [draft]);

  const handleSegmentChange = <K extends keyof WheelSegment>(
    index: number,
    field: K,
    value: WheelSegment[K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      segments: prev.segments.map((seg, idx) => (idx === index ? { ...seg, [field]: value } : seg)),
    }));
  };

  const handleAddSegment = () => {
    if (draft.segments.length >= 16) return;
    const nextIdx = draft.segments.length + 1;
    const color = WHEEL_COLOR_PALETTE[(nextIdx - 1) % WHEEL_COLOR_PALETTE.length];
    setDraft((prev) => ({
      ...prev,
      segments: [
        ...prev.segments,
        {
          id: `seg_custom_${Date.now()}_${nextIdx}`,
          label: `$5 Free Play`,
          rewardAmount: 5,
          probabilityWeight: 10,
          color,
          enabled: true,
        },
      ],
    }));
  };

  const handleRemoveSegment = (index: number) => {
    if (draft.segments.length <= 2) return;
    setDraft((prev) => ({
      ...prev,
      segments: prev.segments.filter((_, idx) => idx !== index),
    }));
  };

  const handleResetDefaults = () => {
    setDraft(normalizeWheelConfig(DEFAULT_WHEEL_OF_LUCK_CONFIG));
    setNotice(null);
  };

  const handleSave = async () => {
    setNotice(null);
    if (!validation.valid) {
      setNotice({ type: 'error', text: validation.errors[0] || 'Invalid Wheel configuration.' });
      return;
    }

    setIsSaving(true);
    const res = await dataService.saveWheelOfLuckConfig(draft);
    setIsSaving(false);

    if (res.success && res.wheelOfLuck) {
      setDraft(res.wheelOfLuck);
      onConfigSaved?.(res.wheelOfLuck);
      setNotice({
        type: 'success',
        text: 'Wheel of Luck segments, probabilities, simulated showcase, and status saved to database.',
      });
      setTimeout(() => setNotice(null), 4500);
    } else {
      setNotice({
        type: 'error',
        text: res.error || 'Failed to save Wheel of Luck configuration.',
      });
    }
  };

  return (
    <div
      data-testid="wheel-admin-card"
      className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">Wheel of Luck Free-Play Rewards</h2>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/30">
                24H ROLLING · FREE-PLAY ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure daily wheel segments, weighted odds, promotional simulated win showcase, and availability.
            </p>
          </div>
        </div>

        <label className="text-xs text-slate-200 font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
          />
          <span>Wheel Active</span>
        </label>
      </div>

      {notice && (
        <div
          role="alert"
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            notice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Title, Subtitle & Simulated Win Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px] font-semibold">Wheel Display Title</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px] font-semibold">Wheel Subtitle</label>
          <input
            type="text"
            value={draft.subtitle}
            onChange={(e) => setDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Simulated Win Display Configuration */}
      <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/25 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-amber-200">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Simulated Promotional Win Showcase (Display-Only)</span>
          </div>
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.simulatedWinDisplay.enabled}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  simulatedWinDisplay: { ...prev.simulatedWinDisplay, enabled: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500"
            />
            <span>Show Promotional Showcase</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] font-semibold">Showcase Label</label>
            <input
              type="text"
              value={draft.simulatedWinDisplay.label}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  simulatedWinDisplay: { ...prev.simulatedWinDisplay, label: e.target.value },
                }))
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] font-semibold">
              Simulated Display Amount ($ USD)
            </label>
            <input
              type="number"
              min="0"
              step="5"
              value={draft.simulatedWinDisplay.amount}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  simulatedWinDisplay: {
                    ...prev.simulatedWinDisplay,
                    amount: Math.max(0, parseFloat(e.target.value) || 0),
                  },
                }))
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-amber-300 font-bold"
            />
          </div>
        </div>

        <p className="text-[11px] text-amber-300/80">
          Promotional showcase only — never added to player wallets, game credits, or ledger transactions.
        </p>
      </div>

      {/* Wheel Segments Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white">Wheel Segments &amp; Reward Weights</h3>
            <p className="text-[11px] text-slate-400">
              {draft.segments.filter((s) => s.enabled).length} active segments · Normalized probabilities sum to 100%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Defaults</span>
            </button>
            <button
              type="button"
              disabled={draft.segments.length >= 16}
              onClick={handleAddSegment}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Segment</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-900/60">
                <th className="py-2.5 px-3">Color</th>
                <th className="py-2.5 px-3">Label</th>
                <th className="py-2.5 px-3">Reward ($)</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3 text-right">Odds %</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {draft.segments.map((seg, idx) => {
                const prob = probabilities.find((p) => p.id === seg.id)?.probabilityPercent ?? 0;
                return (
                  <tr key={seg.id || idx} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3">
                      <input
                        type="color"
                        aria-label={`Color for ${seg.label}`}
                        value={seg.color || '#1E293B'}
                        onChange={(e) => handleSegmentChange(idx, 'color', e.target.value)}
                        className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-3 min-w-[140px]">
                      <input
                        type="text"
                        aria-label={`Segment ${idx + 1} label`}
                        value={seg.label}
                        onChange={(e) => handleSegmentChange(idx, 'label', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 w-28">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label={`Segment ${idx + 1} reward amount`}
                        value={seg.rewardAmount}
                        onChange={(e) =>
                          handleSegmentChange(idx, 'rewardAmount', Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-emerald-400 font-bold text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 w-24">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Segment ${idx + 1} probability weight`}
                        value={seg.probabilityWeight}
                        onChange={(e) =>
                          handleSegmentChange(idx, 'probabilityWeight', Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-white text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-300 font-semibold tabular-nums whitespace-nowrap">
                      {seg.enabled ? `${prob.toFixed(1)}%` : '0.0%'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Enable ${seg.label}`}
                        checked={seg.enabled !== false}
                        onChange={(e) => handleSegmentChange(idx, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        disabled={draft.segments.length <= 2}
                        aria-label={`Remove ${seg.label}`}
                        onClick={() => handleRemoveSegment(idx)}
                        className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/70 disabled:opacity-35 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!validation.valid && (
        <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{validation.errors[0]}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving || !validation.valid}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md shadow-amber-500/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving Wheel Settings...' : 'Save Wheel of Luck Settings'}</span>
        </button>
      </div>
    </div>
  );
};
