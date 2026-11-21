import React, { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { PartnerPlatform } from '../../types';
import { getPartnerInitials } from '../../utils/officialPartnersUtils';

export function getPlatformDisplayName(platform: PartnerPlatform): string {
  switch (platform) {
    case 'facebook':
      return 'Facebook';
    case 'instagram':
      return 'Instagram';
    case 'telegram':
      return 'Telegram';
  }
}

export const PlatformGlyph: React.FC<{
  platform: PartnerPlatform;
  className?: string;
}> = ({ platform, className = 'w-4 h-4' }) => {
  if (platform === 'facebook') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={`${className} text-[#1877F2]`}
      >
        <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
      </svg>
    );
  }
  if (platform === 'instagram') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`${className} text-pink-400`}
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={`${className} text-sky-400`}
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
};

export const PlatformBadge: React.FC<{ platform: PartnerPlatform }> = ({ platform }) => {
  const pillStyle =
    platform === 'facebook'
      ? 'bg-blue-950/70 text-blue-200 border-blue-800/70'
      : platform === 'instagram'
      ? 'bg-pink-950/60 text-pink-200 border-pink-800/70'
      : 'bg-sky-950/70 text-sky-200 border-sky-800/70';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${pillStyle}`}
    >
      <PlatformGlyph platform={platform} className="w-3.5 h-3.5 shrink-0" />
      <span>{getPlatformDisplayName(platform)}</span>
    </span>
  );
};

export const VerifiedPartnerTick: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <span
    title="Verified Official Partner"
    aria-label="Verified"
    className="inline-flex items-center shrink-0 text-emerald-400"
  >
    <BadgeCheck className={className} />
  </span>
);

export const PartnerIcon: React.FC<{
  name: string;
  iconUrl?: string | null;
  platform: PartnerPlatform;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, iconUrl, platform, size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [iconUrl]);

  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9 rounded-lg text-xs'
      : size === 'lg'
      ? 'w-12 h-12 rounded-xl text-base'
      : 'w-11 h-11 rounded-xl text-sm';

  const fallbackBg =
    platform === 'facebook'
      ? 'bg-blue-950/80 border-blue-700/60 text-blue-200'
      : platform === 'instagram'
      ? 'bg-pink-950/70 border-pink-700/60 text-pink-200'
      : 'bg-sky-950/80 border-sky-700/60 text-sky-200';

  if (iconUrl && !imgFailed) {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center`}
      >
        <img
          src={iconUrl}
          alt={`${name} icon`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 border ${fallbackBg} flex items-center justify-center font-bold tracking-tight select-none`}
      aria-hidden="true"
    >
      {getPartnerInitials(name)}
    </div>
  );
};
