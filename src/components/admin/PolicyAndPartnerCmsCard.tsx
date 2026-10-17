import React, { useState } from 'react';
import { dataService } from '../../services/dataService';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  Code,
  Share2,
} from 'lucide-react';

export const PolicyAndPartnerCmsCard: React.FC = () => {
  const initial = dataService.getCmsPolicies();

  const [activeTab, setActiveTab] = useState<'cashout' | 'privacy' | 'terms' | 'partners'>('cashout');
  const [cashoutPolicyHtml, setCashoutPolicyHtml] = useState(initial.cashoutPolicyHtml);
  const [privacyPolicyHtml, setPrivacyPolicyHtml] = useState(initial.privacyPolicyHtml);
  const [termsPolicyHtml, setTermsPolicyHtml] = useState(initial.termsPolicyHtml);
  const [supportedPartners, setSupportedPartners] = useState(initial.supportedPartners);
  const [previewMode, setPreviewMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New partner draft
  const [newPlatform, setNewPlatform] = useState<'facebook' | 'instagram' | 'telegram' | 'whatsapp' | 'other'>('telegram');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleSaveAll = () => {
    const res = dataService.updateCmsPolicies({
      cashoutPolicyHtml,
      privacyPolicyHtml,
      termsPolicyHtml,
      supportedPartners,
    });
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;

    const partner = {
      id: `partner_${Date.now()}`,
      platform: newPlatform,
      label: newLabel.trim(),
      url: newUrl.trim(),
      active: true,
    };
    setSupportedPartners([...supportedPartners, partner]);
    setNewLabel('');
    setNewUrl('');
  };

  const handleRemovePartner = (id: string) => {
    setSupportedPartners(supportedPartners.filter((p) => p.id !== id));
  };

  const handleTogglePartner = (id: string) => {
    setSupportedPartners(
      supportedPartners.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
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
            <h2 className="text-base font-bold text-white">Policies &amp; Supported Partners CMS</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize Cashout Policy, Privacy Disclosures, and Social Community Links (Facebook, Instagram, Telegram). Supports rich HTML tags like <code className="text-amber-300 font-mono text-[10px]">&lt;p&gt;</code>, <code className="text-amber-300 font-mono text-[10px]">&lt;strong&gt;</code>, and <code className="text-amber-300 font-mono text-[10px]">&lt;ul&gt;</code>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Policy &amp; Links CMS</span>
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
          <button
            type="button"
            onClick={() => setActiveTab('partners')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'partners' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Supported Partners ({supportedPartners.length})</span>
          </button>
        </div>

        {activeTab !== 'partners' && (
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-950 border border-slate-800"
          >
            {previewMode ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{previewMode ? 'Edit HTML Markup' : 'Preview Visual'}</span>
          </button>
        )}
      </div>

      {/* Cashout Policy Tab */}
      {activeTab === 'cashout' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cashout &amp; Withdrawal Policy Content:</span>
            <span className="font-mono text-[11px] text-amber-400">HTML Supported</span>
          </div>

          {previewMode ? (
            <div
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2 leading-relaxed min-h-[160px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: cashoutPolicyHtml }}
            />
          ) : (
            <textarea
              rows={8}
              value={cashoutPolicyHtml}
              onChange={(e) => setCashoutPolicyHtml(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="<p>Enter cashout policy markup...</p>"
            />
          )}
        </div>
      )}

      {/* Privacy Policy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Privacy Policy &amp; Player Disclosures:</span>
            <span className="font-mono text-[11px] text-amber-400">HTML Supported</span>
          </div>

          {previewMode ? (
            <div
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2 leading-relaxed min-h-[160px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: privacyPolicyHtml }}
            />
          ) : (
            <textarea
              rows={8}
              value={privacyPolicyHtml}
              onChange={(e) => setPrivacyPolicyHtml(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="<p>Enter privacy policy markup...</p>"
            />
          )}
        </div>
      )}

      {/* Terms & Rules Tab */}
      {activeTab === 'terms' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Terms of Service &amp; Fair Gaming Rules:</span>
            <span className="font-mono text-[11px] text-amber-400">HTML Supported</span>
          </div>

          {previewMode ? (
            <div
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2 leading-relaxed min-h-[160px] prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: termsPolicyHtml }}
            />
          ) : (
            <textarea
              rows={8}
              value={termsPolicyHtml}
              onChange={(e) => setTermsPolicyHtml(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="<p>Enter terms markup...</p>"
            />
          )}
        </div>
      )}

      {/* Supported Partners Manager Tab */}
      {activeTab === 'partners' && (
        <div className="space-y-4 text-xs">
          {/* Active Partners List */}
          <div className="space-y-2.5">
            <h3 className="font-semibold text-slate-300">Live Partner Links &amp; Communities</h3>
            {supportedPartners.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-500">
                No partner links configured yet. Add your first community below!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {supportedPartners.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      p.active
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-950/50 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{p.label}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {p.platform}
                        </span>
                      </div>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:underline truncate block mt-0.5"
                      >
                        {p.url}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePartner(p.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                          p.active
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {p.active ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemovePartner(p.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                        title="Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Partner Form */}
          <form onSubmit={handleAddPartner} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add New Partner or Community Link</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="telegram">Telegram Community</option>
                  <option value="facebook">Facebook Page / Group</option>
                  <option value="instagram">Instagram Account</option>
                  <option value="whatsapp">WhatsApp VIP Care</option>
                  <option value="other">Official Website / Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Display Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. VIP Telegram Channel"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Destination URL</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://t.me/yourgroup"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Partner Link</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
