import React, { useId } from 'react';

/**
 * Hand-drawn power-up art.
 *
 * These used to be emoji (🚀 💣 🪩), which every Android version renders in its
 * own style — the single loudest "this is a web page" tell in the game. Drawing
 * them as SVG makes the board look identical on every device and lets the art
 * match the game's chunky, high-contrast look.
 */

interface IconProps {
  size: number;
  className?: string;
}

export const RocketIcon: React.FC<IconProps> = ({ size, className }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      {/* exhaust flame */}
      <path d="M32 62c-6-5-9-9-9-13 0-3 2-5 4-5 1 0 2 1 2 2 0-4 1-7 3-9 2 2 3 5 3 9 0-1 1-2 2-2 2 0 4 2 4 5 0 4-3 8-9 13z"
        fill={`url(#${id}-flame)`} />

      {/* fins */}
      <path d="M20 44c-3-6-2-12 1-16l6 6-3 12z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 44c3-6 2-12-1-16l-6 6 3 12z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" strokeLinejoin="round" />

      {/* fuselage */}
      <path d="M32 2c7 7 11 17 11 27 0 6-1 11-3 15H24c-2-4-3-9-3-15C21 19 25 9 32 2z"
        fill={`url(#${id}-body)`} stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" />

      {/* nose cone */}
      <path d="M32 2c3 3 5 7 7 11H25c2-4 4-8 7-11z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" strokeLinejoin="round" />

      {/* window */}
      <circle cx="32" cy="26" r="7" fill="#38bdf8" stroke="#0369a1" strokeWidth="2.5" />
      <circle cx="29.5" cy="23.5" r="2.5" fill="#e0f2fe" opacity="0.9" />
    </svg>
  );
};

export const BombIcon: React.FC<IconProps> = ({ size, className }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ball`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="45%" stopColor="#374151" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id={`${id}-spark`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* fuse */}
      <path d="M40 18c3-5 8-6 10-3" fill="none" stroke="#a16207" strokeWidth="4" strokeLinecap="round" />
      {/* spark */}
      <circle cx="52" cy="13" r="9" fill={`url(#${id}-spark)`} />
      <circle cx="52" cy="13" r="3.5" fill="#fef3c7" />

      {/* cap */}
      <rect x="28" y="14" width="11" height="8" rx="2" fill="#4b5563" stroke="#111827" strokeWidth="2" />

      {/* body */}
      <circle cx="30" cy="40" r="21" fill={`url(#${id}-ball)`} stroke="#020617" strokeWidth="2.5" />
      {/* highlight */}
      <ellipse cx="22" cy="31" rx="7" ry="5" fill="#ffffff" opacity="0.35" transform="rotate(-30 22 31)" />
    </svg>
  );
};

export const DiscoIcon: React.FC<IconProps> = ({ size, className }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ball`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f5d0fe" />
          <stop offset="40%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#6b21a8" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="34" r="23" />
        </clipPath>
      </defs>

      {/* hanger */}
      <path d="M32 12V4" stroke="#a1a1aa" strokeWidth="3" strokeLinecap="round" />
      <rect x="27" y="7" width="10" height="6" rx="2" fill="#71717a" />

      <circle cx="32" cy="34" r="23" fill={`url(#${id}-ball)`} stroke="#4c1d95" strokeWidth="2.5" />

      {/* mirror facets */}
      <g clipPath={`url(#${id}-clip)`} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" fill="none">
        <path d="M9 26h46M9 34h46M9 42h46M9 50h46" />
        <path d="M20 8v52M32 8v52M44 8v52" />
      </g>
      <g clipPath={`url(#${id}-clip)`} fill="#ffffff">
        <rect x="22" y="19" width="9" height="6" opacity="0.75" />
        <rect x="35" y="35" width="9" height="6" opacity="0.55" />
        <rect x="13" y="43" width="8" height="6" opacity="0.4" />
      </g>

      {/* shine */}
      <ellipse cx="23" cy="24" rx="6" ry="4" fill="#ffffff" opacity="0.5" transform="rotate(-30 23 24)" />
    </svg>
  );
};

/** Four-point twinkle used as the "this cell is special" badge. */
export const SparkleIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 0l2.4 7.8L22 10.2l-7.6 2.4L12 24l-2.4-11.4L2 10.2l7.6-2.4z"
      fill="#fef9c3"
      stroke="#f59e0b"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const POWERUP_ICONS: Record<string, React.FC<IconProps>> = {
  rocket: RocketIcon,
  bomb: BombIcon,
  disco: DiscoIcon,
};
