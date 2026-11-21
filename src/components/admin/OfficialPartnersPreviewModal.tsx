import React, { useEffect } from 'react';
import { ExternalLink, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { OfficialPartner } from '../../types';
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
} from '../common/PartnerVisuals';

interface OfficialPartnersPreviewModalProps {
  isOpen: boolean;
  partners: OfficialPartner[];
  onClose: () => void;
}

export const OfficialPartnersPreviewModal: React.FC<OfficialPartnersPreviewModalProps> = ({
  isOpen,
  partners,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visiblePartners = sortOfficialPartners(partners.filter((p) => p.isVisible));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-partners-title"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl max-h-[88vh] bg-[#0A0F1D] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0E1726] flex items-center justify-between gap-3">
          <div>
            <h2 id="preview-partners-title" className="text-lg font-bold text-white">
              Customer View Preview
            </h2>
            <p className="text-xs text-slate-400">
              Showing {visiblePartners.length} visible{' '}
              {visiblePartners.length === 1 ? 'partner' : 'partners'} in display order.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer preview"
            className="min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-white">Official Partners</h3>
            <p className="text-sm text-slate-200">Message our official partners anytime.</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E1726] border border-amber-500/25 text-xs text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Never share your password or game login in any message.</span>
            </div>
          </div>

          {visiblePartners.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0E1726] border border-slate-800 text-center">
              <p className="text-sm text-slate-300">No official partners are listed right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiblePartners.map((partner) => {
                const msgLink = getMessageLink(partner);
                const domain = getPartnerDisplayDomain(partner.pageUrl);
                return (
                  <div
                    key={partner.id}
                    className="p-4 rounded-2xl bg-[#0E1726] border border-slate-800 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        <PartnerIcon
                          name={partner.name}
                          iconUrl={partner.iconUrl}
                          platform={partner.platform}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white leading-snug line-clamp-2 break-words">
                              {partner.name}
                            </span>
                            <VerifiedPartnerTick />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <PlatformBadge platform={partner.platform} />
                            {domain && <span className="text-xs text-slate-400">{domain}</span>}
                          </div>
                        </div>
                      </div>
                      {partner.note && (
                        <p className="text-sm text-slate-300">{partner.note}</p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <a
                        href={msgLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>Message on {getPlatformDisplayName(partner.platform)}</span>
                      </a>
                      <a
                        href={partner.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium inline-flex items-center justify-center gap-1.5"
                      >
                        <span>Visit page</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
