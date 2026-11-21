import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Headphones,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { OfficialPartner, PartnerPlatform, UserProfile } from '../../types';
import { dataService } from '../../services/dataService';
import {
  getMessageLink,
  getPartnerDisplayDomain,
  sortOfficialPartners,
} from '../../utils/officialPartnersUtils';
import {
  PartnerIcon,
  PlatformBadge,
  VerifiedPartnerTick,
  getPlatformDisplayName,
} from '../../components/common/PartnerVisuals';

interface CustomerOfficialPartnersProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: string, meta?: any) => void;
}

type PlatformFilter = 'all' | PartnerPlatform;

const FILTER_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram', label: 'Telegram' },
];

export const CustomerOfficialPartners: React.FC<CustomerOfficialPartnersProps> = ({
  onNavigateTab,
}) => {
  const [partners, setPartners] = useState<OfficialPartner[]>(() =>
    sortOfficialPartners(dataService.getCachedOfficialPartners().filter((p) => p.isVisible))
  );
  const [isLoading, setIsLoading] = useState<boolean>(partners.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const catalog = useMemo(() => dataService.getGameCatalog(), []);

  const loadPartners = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }
    setError(null);
    const res = await dataService.fetchOfficialPartners();
    if (res.success) {
      setPartners(sortOfficialPartners(res.partners.filter((p) => p.isVisible)));
    } else {
      setError(res.error || 'Unable to load official partners right now.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadPartners(false);

    const handleStateChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const tables: string[] = Array.isArray(detail?.tables) ? detail.tables : [];
      if (
        detail?.key === 'official_partners_updated' ||
        detail?.key === 'delta_sync' ||
        tables.includes('official_partners')
      ) {
        void loadPartners(true);
      }
    };

    window.addEventListener('aetherpay_state_changed', handleStateChanged);
    return () => {
      window.removeEventListener('aetherpay_state_changed', handleStateChanged);
    };
  }, [loadPartners]);

  const filteredPartners = useMemo(() => {
    if (platformFilter === 'all') return partners;
    return partners.filter((p) => p.platform === platformFilter);
  }, [partners, platformFilter]);

  const platformCounts = useMemo(() => {
    const counts: Record<PlatformFilter, number> = {
      all: partners.length,
      facebook: 0,
      instagram: 0,
      telegram: 0,
    };
    for (const partner of partners) {
      counts[partner.platform] += 1;
    }
    return counts;
  }, [partners]);

  const handleCopyLink = async (partner: OfficialPartner) => {
    const link = getMessageLink(partner);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        throw new Error('Clipboard unavailable');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        return;
      }
    }
    setCopiedId(partner.id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === partner.id ? null : prev));
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Official Partners</h1>
        <p className="text-sm text-slate-200 leading-relaxed">
          Message our official partners anytime.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0E1726] border border-amber-500/25 text-xs text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Never share your password or game login in any message.</span>
        </div>
      </div>

      {/* Platform Filter Chips */}
      <div
        role="tablist"
        aria-label="Filter official partners by platform"
        className="flex flex-wrap items-center gap-2"
      >
        {FILTER_OPTIONS.map((opt) => {
          const isActive = platformFilter === opt.value;
          const count = platformCounts[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPlatformFilter(opt.value)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold border transition-colors inline-flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-[#0E1726] text-slate-200 border-slate-800 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-900 text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl border border-rose-800/70 bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">Unable to load partners</div>
              <p className="text-sm text-rose-200/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadPartners(false)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          aria-busy="true"
          aria-label="Loading official partners"
        >
          {[0, 1, 2].map((skeletonIdx) => (
            <div
              key={skeletonIdx}
              className="p-5 rounded-2xl bg-[#0E1726] border border-slate-800 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-800" />
                </div>
              </div>
              <div className="h-4 w-full rounded bg-slate-800/80" />
              <div className="h-11 w-full rounded-xl bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPartners.length === 0 && (
        <div className="p-8 rounded-2xl bg-[#0E1726] border border-slate-800 text-center">
          <p className="text-sm text-slate-300">
            {platformFilter === 'all'
              ? 'No official partners are listed right now.'
              : `No ${getPlatformDisplayName(platformFilter)} partners are listed right now.`}
          </p>
        </div>
      )}

      {/* Partner Grid */}
      {!isLoading && filteredPartners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => {
            const msgLink = getMessageLink(partner);
            const domain = getPartnerDisplayDomain(partner.pageUrl);
            const platformLabel = getPlatformDisplayName(partner.platform);
            const linkedGame = partner.gameId
              ? catalog.find((g) => g.id === partner.gameId)
              : undefined;
            const isCopied = copiedId === partner.id;

            return (
              <article
                key={partner.id}
                className="p-5 rounded-2xl bg-[#0E1726] border border-slate-800 hover:border-slate-700 shadow-lg flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <PartnerIcon
                      name={partner.name}
                      iconUrl={partner.iconUrl}
                      platform={partner.platform}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h2 className="text-base font-bold text-white leading-snug line-clamp-2 break-words">
                          {partner.name}
                        </h2>
                        <VerifiedPartnerTick />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={partner.platform} />
                        {domain && (
                          <span className="text-xs text-slate-400 truncate">{domain}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {linkedGame && (
                    <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/20 rounded-lg px-2.5 py-1 inline-block">
                      Game: {linkedGame.title}
                    </div>
                  )}

                  {partner.note && (
                    <p className="text-sm text-slate-300 leading-relaxed">{partner.note}</p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <a
                    href={msgLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Message on {platformLabel}</span>
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={partner.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Visit page</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>

                    <button
                      type="button"
                      onClick={() => void handleCopyLink(partner)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Bottom Direct Support CTA */}
      <div className="p-5 rounded-2xl bg-[#0E1726] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/70 text-cyan-300 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Direct Player Support</h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Prefer messaging in-app? Reach our 24/7 support desk directly.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('chat')}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shrink-0 transition-colors"
        >
          <span>Contact Swift Sweeps Support</span>
        </button>
      </div>
    </div>
  );
};
