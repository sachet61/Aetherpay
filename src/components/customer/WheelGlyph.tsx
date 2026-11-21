import React from 'react';

interface WheelGlyphProps {
  active?: boolean;
  className?: string;
}

export const WheelGlyph: React.FC<WheelGlyphProps> = ({ active = true, className = 'w-5 h-5' }) => {
  return (
    <svg
      viewBox="0 0 44 44"
      className={`${className} ${active ? 'opacity-100' : 'opacity-70 saturate-50'}`}
      aria-hidden="true"
    >
      <circle
        cx="22"
        cy="22"
        r="20"
        fill="#0B1221"
        stroke={active ? '#F59E0B' : '#94A3B8'}
        strokeWidth="1.6"
      />
      <g stroke="#0B1221" strokeWidth="0.9">
        <path d="M22,22 L22,4 A18,18 0 0,1 34.73,9.27 Z" fill="#F59E0B" />
        <path d="M22,22 L34.73,9.27 A18,18 0 0,1 40,22 Z" fill="#4F46E5" />
        <path d="M22,22 L40,22 A18,18 0 0,1 34.73,34.73 Z" fill="#10B981" />
        <path d="M22,22 L34.73,34.73 A18,18 0 0,1 22,40 Z" fill="#D97706" />
        <path d="M22,22 L22,40 A18,18 0 0,1 9.27,34.73 Z" fill="#0EA5E9" />
        <path d="M22,22 L9.27,34.73 A18,18 0 0,1 4,22 Z" fill="#7C3AED" />
        <path d="M22,22 L4,22 A18,18 0 0,1 9.27,9.27 Z" fill="#14B8A6" />
        <path d="M22,22 L9.27,9.27 A18,18 0 0,1 22,4 Z" fill="#E11D48" />
      </g>
      <circle
        cx="22"
        cy="22"
        r="17.5"
        fill="none"
        stroke={active ? '#FDE68A' : '#CBD5E1'}
        strokeOpacity="0.45"
        strokeWidth="0.7"
      />
      <circle
        cx="22"
        cy="22"
        r="5"
        fill={active ? '#FBBF24' : '#94A3B8'}
        stroke="#0B1221"
        strokeWidth="1.3"
      />
      <circle cx="22" cy="22" r="2" fill="#0B1221" />
      <polygon
        points="22,6 19.2,1 24.8,1"
        fill={active ? '#FDE047' : '#CBD5E1'}
        stroke="#0B1221"
        strokeWidth="0.65"
      />
    </svg>
  );
};
