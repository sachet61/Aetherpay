import React from 'react';

interface SwiftSweepsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
}

export const SwiftSweepsLogo: React.FC<SwiftSweepsLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textClassName = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[size];

  const subtextSizeClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Vortex "S" Monogram Badge faithfully representing the Swift Sweeps Brand Mark */}
      <div className={`relative ${iconDimensions} shrink-0 flex items-center justify-center rounded-xl bg-[#0e1628] border border-amber-500/20 shadow-md shadow-amber-500/5 p-1`}>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Outer sweeping vortex background aura */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5D061" />
              <stop offset="50%" stopColor="#DFB758" />
              <stop offset="100%" stopColor="#C8A14D" />
            </linearGradient>
            <linearGradient id="whiteSilverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="goldSweepsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E5C065" />
              <stop offset="100%" stopColor="#C8A14D" />
            </linearGradient>
          </defs>

          {/* Golden Upper Vortex Swirl of the 'S' */}
          <path
            d="M 68 18 C 84 20, 96 32, 94 48 C 92 60, 78 68, 62 70 C 46 72, 36 78, 38 88 C 40 98, 54 104, 72 102 C 60 106, 44 104, 34 94 C 24 82, 30 68, 46 64 C 62 60, 78 54, 78 42 C 78 30, 66 22, 50 24 C 58 20, 68 18, 68 18 Z"
            fill="url(#goldGradient)"
          />

          {/* Crisp White Dynamic Inner Velocity Arc completing the Monogram 'S' */}
          <path
            d="M 48 26 C 62 24, 76 30, 76 42 C 76 52, 60 58, 46 62 C 30 66, 22 78, 24 90 C 26 100, 38 106, 52 106 C 36 106, 22 98, 20 86 C 18 72, 32 62, 48 58 C 64 54, 72 46, 72 38 C 72 30, 60 26, 48 26 Z"
            fill="url(#whiteSilverGradient)"
          />

          {/* Sharp Motion Sweep Flares */}
          <path
            d="M 88 28 C 96 34, 100 42, 96 48 C 92 42, 86 36, 80 32 Z"
            fill="url(#goldGradient)"
            opacity="0.9"
          />
          <path
            d="M 32 92 C 24 86, 20 78, 24 72 C 28 78, 34 84, 40 88 Z"
            fill="url(#whiteSilverGradient)"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Typography: Crisp White "SWIFT" and Warm Metallic Gold "SWEEPS" */}
      {showText && (
        <div className={`flex flex-col leading-none ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white ${textSizeClasses}`}>
              SWIFT
            </span>
            <span className={`font-black tracking-tight bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent ${textSizeClasses}`}>
              SWEEPS
            </span>
          </div>
          <span className={`font-mono tracking-wider uppercase text-amber-400/80 mt-0.5 ${subtextSizeClasses}`}>
            Social Casino &amp; Wallet
          </span>
        </div>
      )}
    </div>
  );
};
