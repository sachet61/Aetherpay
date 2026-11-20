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
      className="rounded-[12px] border-[0.5px] border-slate-800 hover:border-amber-500/50 bg-[#0E1726]/90 p-[8px] flex flex-col gap-[8px] transition-colors"
    >
      {/* 1. 1:1 Square full-width logo (10px radius) + 26px bottom name bar + 55% overlay above bar */}
      <div
        data-game-overlay-id={game.id}
        data-overlay-open={isOverlayOpen ? 'true' : 'false'}
        onMouseLeave={() => {
          if (isOverlayOpen) {
            onCloseOverlay(game.id);
          }
        }}
        className="game-card-logo relative w-full aspect-square rounded-[10px] overflow-hidden bg-[#0A0F1D] select-none"
      >
        <img
          src={resolveGameImageUrl(game.iconUrl || game.imageUrl)}
          alt={game.title}
          width={190}
          height={190}
          loading={prioritizeImage ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = '1';
            img.src = DEFAULT_GAME_ICON;
          }}
          className="w-full h-full object-cover"
        />

        {/* Tap / keyboard focus trigger covering logo */}
        <button
          type="button"
          onClick={() => onToggleOverlay(game.id)}
          aria-label={`${isOverlayOpen ? 'Hide' : 'Show'} play and download links for ${game.title}`}
          aria-expanded={isOverlayOpen}
          className="absolute inset-0 z-10 w-full h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
        />

        {/* 55% black overlay above the 26px name bar */}
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && isOverlayOpen) {
              onToggleOverlay(game.id);
            }
          }}
          className="game-card-overlay absolute top-0 left-0 right-0 bottom-[26px] z-20 bg-black/55 flex flex-col items-center justify-center gap-1.5 px-2"
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
            className="game-card-pill inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/80 bg-black/45 hover:bg-white/20 text-white text-[11px] font-medium leading-none whitespace-nowrap transition-colors">
              <Play className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Web play</span>
            </span>
          </a>

          <a
            href={getAppUrl}
            target={hasGetAppUrl ? '_blank' : undefined}
            rel={hasGetAppUrl ? 'noopener noreferrer' : undefined}
            aria-label={`Download ${game.title}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasGetAppUrl) e.preventDefault();
            }}
            className="game-card-pill inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/80 bg-black/45 hover:bg-white/20 text-white text-[11px] font-medium leading-none whitespace-nowrap transition-colors">
              <Download className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Download</span>
            </span>
          </a>
        </div>

        {/* Always-visible 26px bottom bar with left-aligned 12px medium title */}
        <div className="absolute inset-x-0 bottom-0 z-30 h-[26px] bg-black/60 px-2 flex items-center pointer-events-none">
          <h3
            className="w-full text-left text-[12px] font-medium text-white truncate leading-none"
            title={game.title}
          >
            {game.title}
          </h3>
        </div>
      </div>

      {/* 2. Bottom action row: filled amber "Top up" (flex-1, 30px) + 30x30 Cashout icon button (6px gap) */}
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={() => onTopUp(game.id)}
          aria-label={`Top up ${game.title}`}
          className="relative z-10 flex-1 min-w-0 h-[30px] px-2 rounded-[8px] bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Top up</span>
        </button>

        <button
          type="button"
          onClick={() => onCashout(game.id)}
          aria-label="Cashout"
          title={`Cashout ${game.title}`}
          className="touch-hitbox-44 relative w-[30px] h-[30px] shrink-0 rounded-[8px] bg-transparent hover:bg-amber-500/10 active:scale-[0.98] border border-slate-700 hover:border-amber-500/60 text-amber-300 hover:text-amber-200 flex items-center justify-center transition-colors"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
