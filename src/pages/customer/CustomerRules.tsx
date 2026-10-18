import React from 'react';
import { dataService } from '../../services/dataService';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Coins,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

interface CustomerRulesProps {
  onNavigateTab: (tab: string) => void;
}

export const CustomerRules: React.FC<CustomerRulesProps> = ({ onNavigateTab }) => {
  const config = dataService.getAppConfig();
  const rules = config.platformRules;

  const sections = [
    {
      title: 'Deposit Guidelines & Source Verification',
      icon: ShieldCheck,
      text: rules.depositTerms,
    },
    {
      title: 'Promotional Bonuses & Wagering Qualifications',
      icon: RefreshCw,
      text: rules.bonusWageringTerms,
    },
    {
      title: 'Cashout Policy & Settlement Reserve Stages',
      icon: FileText,
      text: rules.withdrawalPolicy,
    },
    {
      title: 'Refund Eligibility & Reversal Procedures',
      icon: HelpCircle,
      text: rules.refundPolicy,
    },
    {
      title: 'Cryptocurrency Confirmations & Network Caution',
      icon: AlertTriangle,
      text: rules.cryptoRiskWarning,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Rules, Cashout &amp; Refund Policy</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review legal disclosures, financial settlement timelines, and player security mandates.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          const isHtml = sec.text && (sec.text.includes('<p>') || sec.text.includes('<h3>') || sec.text.includes('<ul>') || sec.text.includes('<strong>'));
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-md space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-sm font-bold text-white">
                <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                <h3>{sec.title}</h3>
              </div>
              {isHtml ? (
                <div
                  className="text-xs text-slate-300 leading-relaxed pl-6 space-y-2 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sec.text }}
                />
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed pl-6 whitespace-pre-line">
                  {sec.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Official Community & Partner Channels */}
      {(() => {
        const anyConfig = config as any;
        const partnerLinks = anyConfig.partnerLinks || anyConfig.partner_links || [];
        const telegramChannel = anyConfig.telegramChannel || anyConfig.telegram_channel;

        if (partnerLinks.length === 0 && !telegramChannel) return null;

        return (
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Community &amp; Verified Partner Channels</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {telegramChannel && (
                <a
                  href={`https://t.me/${telegramChannel.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-cyan-800/60 hover:border-cyan-500 text-xs text-cyan-300 flex items-center justify-between transition-colors shadow-xs"
                >
                  <div className="font-semibold text-white">Telegram Channel</div>
                  <span className="text-[11px] text-cyan-400 font-mono">@{telegramChannel.replace('@', '')} &rarr;</span>
                </a>
              )}
              {partnerLinks.filter((p: any) => p.active !== false).map((p: any, i: number) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="font-semibold text-white capitalize">{p.label || p.platform}</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Visit &rarr;</span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-bold text-white text-sm">Privacy Policy Statement</h3>
            <p className="text-xs text-slate-400 mt-1">Review data collection, usage, and third-party security disclosures.</p>
          </div>
          <button
            onClick={() => onNavigateTab('privacy')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors self-start"
          >
            View Privacy Policy URL
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-bold text-white text-sm">User Data Deletion</h3>
            <p className="text-xs text-slate-400 mt-1">Request erasure of account data and Facebook login tokens.</p>
          </div>
          <button
            onClick={() => onNavigateTab('data_deletion')}
            className="px-4 py-2 rounded-xl bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-rose-200 font-semibold text-xs transition-colors self-start"
          >
            Data Deletion Instructions
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <div className="font-semibold text-white">Have a specific dispute or inquiry?</div>
          <div className="text-slate-300 mt-0.5">
            Our 24/7 certified compliance and customer care desk can assist with any transaction dispute.
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('chat')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs whitespace-nowrap transition-colors"
        >
          Contact Customer Care Desk
        </button>
      </div>
    </div>
  );
};
