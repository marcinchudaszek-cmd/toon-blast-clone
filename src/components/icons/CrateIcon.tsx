import React, { useId } from 'react';

/**
 * Wooden crate obstacle, drawn rather than emoji so its two damage states read
 * as the same object taking a beating — 📦 vs 🪵 looked like two unrelated
 * things swapping in.
 */
export const CrateIcon: React.FC<{ size: number; cracked: boolean; className?: string }> = ({
  size,
  cracked,
  className,
}) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cracked ? '#d97706' : '#fbbf24'} />
          <stop offset="55%" stopColor={cracked ? '#b45309' : '#f59e0b'} />
          <stop offset="100%" stopColor={cracked ? '#78350f' : '#b45309'} />
        </linearGradient>
      </defs>

      <rect x="5" y="5" width="54" height="54" rx="6" fill={`url(#${id}-wood)`} stroke="#78350f" strokeWidth="3" />

      {/* plank seams */}
      <g stroke="#78350f" strokeWidth="2.5" strokeOpacity="0.55">
        <path d="M5 22h54M5 42h54" />
      </g>

      {/* corner braces */}
      <g stroke="#92400e" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8">
        <path d="M12 12l40 40M52 12L12 52" />
      </g>

      {/* damage: splits that only show once the crate has taken a hit */}
      {cracked && (
        <g stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M20 10l6 12-5 9 8 10-4 12" />
          <path d="M44 14l-5 10 6 8-7 8" />
        </g>
      )}

      {/* top highlight keeps it from looking flat */}
      <rect x="10" y="9" width="44" height="5" rx="2.5" fill="#ffffff" opacity={cracked ? 0.15 : 0.3} />
    </svg>
  );
};
