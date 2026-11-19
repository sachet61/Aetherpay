import React from 'react';
import { Download, Play, Upload } from 'lucide-react';
import type { GameCatalogItem } from '../../types';
import {
  DEFAULT_GAME_ICON,
  resolveGameImageUrl,
} from '../../utils/imageUtils';
import { resolveGameCardLinks } from '../../utils/gameCardUtils';

interface GamePlatformCardProps {
  game: GameCatalogItem;
  prioritizeImage?: boolean;
  isOverlayOpen: boolean;
  onToggleOverlay: (gameId: string) => void;
  onCloseOverlay: (gameId: string) => void;
  onTopUp: (gameId: string) => void;
  onCashout: (gameId: string) => void;
}

export const GamePlatformCard: React.FC<GamePlatformCardProps> = ({
  game,
  prioritizeImage = false,
  isOverlayOpen,
  onToggleOverlay,
  onCloseOverlay,
  onTopUp,
  onCashout,
}) => {
  const { webPlayUrl, getAppUrl, hasWebPlayUrl, hasGetAppUrl } =
    resolveGameCardLinks(game);

  return (
    <div
      data-testid={`game-card-${game.id}`}
      className="rounded-xl border border-slate-800 bg-[#0E1726]/90 hover:border-amber-500/50 transition-colors p-2 sm:p-2.5 flex flex-col gap-2"
    >
      {/* 1. Game name above logo (14px, medium weight, centered, one line with ellipsis) */}
      <h3
        className="w-full text-center text-[14px] leading-[1.3] font-medium text-white truncate"
        title={game.title}
      >
        {game.title}
      </h3>

      {/* 2. Square game logo frame (96px mobile, 120px desktop, 8px radius, padded dark frame) + 150ms hover/tap overlay */}
      <div
        data-game-overlay-id={game.id}
        onMouseLeave={() => {
          if (isOverlayOpen) {
            onCloseOverlay(game.id);
          }
        }}
        className="group/img relative mx-auto w-[96px] h-[96px] md:w-[120px] md:h-[120px] rounded-[8px] overflow-hidden bg-[#0A0F1D] border border-slate-800/80 p-1.5 sm:p-2 flex items-center justify-center select-none"
      >
        <img
          src={resolveGameImageUrl(game.iconUrl || game.imageUrl)}
          alt={game.title}
          width={120}
          height={120}
          loading={prioritizeImage ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = '1';
            img.src = DEFAULT_GAME_ICON;
          }}
          className="w-full h-full object-contain rounded-[4px]"
        />

        <button
          type="button"
          onClick={() => onToggleOverlay(game.id)}
          aria-label={`${isOverlayOpen ? 'Hide' : 'Show'} play options for ${game.title}`}
          aria-expanded={isOverlayOpen}
          className="absolute inset-0 z-10 w-full h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
        />

        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && isOverlayOpen) {
              onToggleOverlay(game.id);
            }
          }}
          className={`absolute inset-0 z-20 bg-black/55 flex flex-col items-center justify-center gap-0.5 md:gap-1.5 px-1 transition-opacity duration-150 ${
            isOverlayOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none [@media(hover:hover)]:group-hover/img:opacity-100 [@media(hover:hover)]:group-hover/img:pointer-events-auto group-focus-within/img:opacity-100 group-focus-within/img:pointer-events-auto'
          }`}
        >
          <a
            href={webPlayUrl}
            target={hasWebPlayUrl ? '_blank' : undefined}
            rel={hasWebPlayUrl ? 'noopener noreferrer' : undefined}
            aria-label={`Web play ${game.title}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasWebPlayUrl) e.preventDefault();
            }}
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="inline-flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1 rounded-full border border-white/80 bg-black/45 hover:bg-white/20 text-white text-[11px] font-medium leading-none whitespace-nowrap transition-colors">
              <Play className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Web play</span>
            </span>
          </a>

          <a
            href={getAppUrl}
            target={hasGetAppUrl ? '_blank' : undefined}
            rel={hasGetAppUrl ? 'noopener noreferrer' : undefined}
            aria-label={`Get app for ${game.title}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasGetAppUrl) e.preventDefault();
            }}
            className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="inline-flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1 rounded-full border border-white/80 bg-black/45 hover:bg-white/20 text-white text-[11px] font-medium leading-none whitespace-nowrap transition-colors">
              <Download className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Get app</span>
            </span>
          </a>
        </div>
      </div>

      {/* 3. Two equal-width compact buttons (32px tall, 12px text, 6px gap) */}
      <div className="grid grid-cols-2 gap-[6px]">
        <button
          type="button"
          onClick={() => onTopUp(game.id)}
          aria-label={`Top up ${game.title}`}
          className="h-[32px] px-1 sm:px-2 rounded-md bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
        >
          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
          <span>Top up</span>
        </button>

        <button
          type="button"
          onClick={() => onCashout(game.id)}
          aria-label={`Cashout ${game.title}`}
          className="h-[32px] px-1 sm:px-2 rounded-md bg-transparent hover:bg-amber-500/10 active:scale-[0.98] border border-slate-700 hover:border-amber-500/60 text-amber-300 hover:text-amber-200 text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
        >
          <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
          <span>Cashout</span>
        </button>
      </div>
    </div>
  );
};
