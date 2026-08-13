import React, { useId } from 'react';

/**
 * Stone blocker. Drawn deliberately cold and grey so it reads as "not a colour
 * you can match" at a glance — the player should never mistake it for a block
 * that a normal match could clear.
 */
export const StoneIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-rock`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="8" fill={`url(#${id}-rock)`} stroke="#334155" strokeWidth="3" />

      {/* chiselled facets */}
      <g stroke="#64748b" strokeWidth="2" fill="none" strokeLinejoin="round" opacity="0.9">
        <path d="M14 20l10-6 12 5-6 11-11 2z" />
        <path d="M36 19l14 4-3 14-11-3z" />
        <path d="M19 32l10 2 5 12-12 6-6-12z" />
        <path d="M34 46l3-12 10 3 2 12z" />
      </g>

      {/* top-left catch light keeps it from reading as flat grey */}
      <path d="M14 20l10-6 6 2-9 5z" fill="#f8fafc" opacity="0.55" />
      {/* bottom shadow for weight */}
      <path d="M10 50h44v4a6 6 0 01-6 6H16a6 6 0 01-6-6z" fill="#334155" opacity="0.35" />
    </svg>
  );
};
