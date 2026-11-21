import React, { useState } from 'react';
import { dataService } from '../../services/dataService';
import {
  FileText,
  CheckCircle2,
  Save,
  Eye,
  Edit3,
} from 'lucide-react';
import { htmlToPlainEditorText, plainEditorTextToHtml } from '../../utils/uiCopyUtils';

export const PolicyAndPartnerCmsCard: React.FC = () => {
  const initial = dataService.getCmsPolicies();

  const [activeTab, setActiveTab] = useState<'cashout' | 'privacy' | 'terms'>('cashout');
  const [cashoutPolicyText, setCashoutPolicyText] = useState(() =>
    htmlToPlainEditorText(initial.cashoutPolicyHtml)
  );
  const [privacyPolicyText, setPrivacyPolicyText] = useState(() =>
    htmlToPlainEditorText(initial.privacyPolicyHtml)
  );
  const [termsPolicyText, setTermsPolicyText] = useState(() =>
    htmlToPlainEditorText(initial.termsPolicyHtml)
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveAll = () => {
    const res = dataService.updateCmsPolicies({
      cashoutPolicyHtml: plainEditorTextToHtml(cashoutPolicyText),
      privacyPolicyHtml: plainEditorTextToHtml(privacyPolicyText),
      termsPolicyHtml: plainEditorTextToHtml(termsPolicyText),
    });
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shadow-inner">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Platform Policies CMS</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize Cashout Policy, Privacy Disclosures, and Terms of Service.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Policies CMS</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('cashout')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'cashout' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cashout Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'privacy' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'terms' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Terms &amp; Rules
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-950 border border-slate-800"
        >
          {previewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{previewMode ? 'Edit Content' : 'Preview'}</span>
        </button>
      </div>

      {/* Cashout Policy Tab */}
      {activeTab === 'cashout' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cashout &amp; Withdrawal Policy Content</span>
            <span className="text-[11px] text-slate-500">Supports **bold** and - bullet lists</span>
          </div>

          {previewMode ? (
            <div
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2 leading-relaxed min-h-[160px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: plainEditorTextToHtml(cashoutPolicyText) }}
            />
          ) : (
            <textarea
              rows={8}
              value={cashoutPolicyText}
              onChange={(e) => setCashoutPolicyText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500"
              placeholder="Enter cashout policy details..."
            />
          )}
        </div>
      )}

      {/* Privacy Policy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Privacy Policy &amp; Player Disclosures</span>
            <span className="text-[11px] text-slate-500">Supports **bold** and - bullet lists</span>
          </div>

          {previewMode ? (
            <div
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2 leading-relaxed min-h-[160px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: plainEditorTextToHtml(privacyPolicyText) }}
            />
          ) : (
            <textarea
              rows={8}
              value={privacyPolicyText}
              onChange={(e) => setPrivacyPolicyText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500"
              placeholder="Enter privacy policy details..."
            />
          )}
        </div>
      )}

      {/* Terms & Rules Tab */}
      {activeTab === 'terms' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Terms of Service &amp; Fair Gaming Rules</span>
            <span className="text-[11px] text-slate-500">Supports **bold** and - bullet lists</span>
          </div>

          {previewMode ? (
            <div
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2 leading-relaxed min-h-[160px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: plainEditorTextToHtml(termsPolicyText) }}
            />
          ) : (
            <textarea
              rows={8}
              value={termsPolicyText}
              onChange={(e) => setTermsPolicyText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500"
              placeholder="Enter terms and rules details..."
            />
          )}
        </div>
      )}
    </div>
  );
};
