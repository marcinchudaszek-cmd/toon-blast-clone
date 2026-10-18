import React from 'react';
import { Cell } from '../game/types';
import { POWERUP_ICONS, RocketIcon, SparkleIcon } from './icons/PowerUpIcons';
import { CrateIcon } from './icons/CrateIcon';
import { StoneIcon } from './icons/StoneIcon';

interface GameCellProps {
  cell: Cell;
  size: number;
  onClick: () => void;
}

const COLOR_CLASSES: Record<string, {
  main: string;
  light: string;
  border: string;
  shadow: string;
}> = {
  red: {
    main: 'bg-gradient-to-b from-red-400 via-red-500 to-red-700',
    light: 'bg-red-300',
    border: 'border-red-800',
    shadow: 'shadow-red-900/60',
  },
  blue: {
    main: 'bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700',
    light: 'bg-blue-200',
    border: 'border-blue-800',
    shadow: 'shadow-blue-900/60',
  },
  green: {
    main: 'bg-gradient-to-b from-green-400 via-green-500 to-green-700',
    light: 'bg-green-300',
    border: 'border-green-800',
    shadow: 'shadow-green-900/60',
  },
  yellow: {
    main: 'bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600',
    light: 'bg-yellow-200',
    border: 'border-yellow-700',
    shadow: 'shadow-yellow-900/60',
  },
  purple: {
    main: 'bg-gradient-to-b from-purple-400 via-purple-500 to-purple-700',
    light: 'bg-purple-300',
    border: 'border-purple-800',
    shadow: 'shadow-purple-900/60',
  },
  orange: {
    main: 'bg-gradient-to-b from-orange-400 via-orange-500 to-orange-700',
    light: 'bg-orange-300',
    border: 'border-orange-800',
    shadow: 'shadow-orange-900/60',
  },
};

const POWERUP_CONFIG: Record<string, { extraClass: string; glowColor: string }> = {
  rocket: {
    extraClass: 'animate-rock',
    glowColor: 'rgba(255,140,50,0.8)',
  },
  bomb: {
    extraClass: '',
    glowColor: 'rgba(80,80,80,0.8)',
  },
  disco: {
    extraClass: 'animate-spin-slow',
    glowColor: 'rgba(180,100,255,0.8)',
  },
};

export const GameCell: React.FC<GameCellProps> = ({ cell, size, onClick }) => {
  // Empty, non-exploding placeholder
  if (cell.type === 'empty' && !cell.exploding) {
    return (
      <div style={{ width: size, height: size }} className="rounded-xl bg-blue-950/30" />
    );
  }

  // Crate obstacle
  if (cell.type === 'crate') {
    const cracked = (cell.hp ?? 2) <= 1;
    return (
      <div
        onClick={onClick}
        style={{
          width: size,
          height: size,
          boxShadow: '0 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
        className="rounded-xl flex items-center justify-center select-none overflow-hidden"
      >
        <CrateIcon size={size} cracked={cracked} />
      </div>
    );
  }

  // Stone block — immune to adjacent blasts, only a direct power-up hit clears it
  if (cell.type === 'stone') {
    return (
      <div
        onClick={onClick}
        style={{
          width: size,
          height: size,
          boxShadow: '0 3px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
        className="rounded-xl flex items-center justify-center select-none overflow-hidden"
      >
        <StoneIcon size={size} />
      </div>
    );
  }

  // Balloon — pops when anything next to it is cleared
  if (cell.type === 'balloon') {
    return (
      <div
        onClick={onClick}
        style={{ width: size, height: size }}
        className="rounded-xl flex items-center justify-center select-none bg-pink-300/25 border border-pink-200/40"
      >
        <span className="animate-rock" style={{ fontSize: size * 0.72, lineHeight: 1 }}>🎈</span>
      </div>
    );
  }

  // Duck — cannot be blasted; clear the cells under it to bring it down
  if (cell.type === 'duck') {
    return (
      <div
        onClick={onClick}
        style={{ width: size, height: size, boxShadow: '0 0 12px rgba(253,224,71,0.55)' }}
        className="rounded-xl flex items-center justify-center select-none bg-yellow-200/30 border-2 border-yellow-300/70"
      >
        <span style={{ fontSize: size * 0.72, lineHeight: 1 }}>🦆</span>
      </div>
    );
  }

  // Ice cell — colored block frozen under ice overlay
  if (cell.type === 'ice') {
    const colors = COLOR_CLASSES[cell.color!] ?? COLOR_CLASSES['blue'];
    return (
      <div
        onClick={onClick}
        style={{
          width: size,
          height: size,
          boxShadow: '0 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
          cursor: 'default',
        }}
        className={`relative rounded-xl overflow-hidden border-b-4 border-cyan-300 ${colors.main}`}
      >
        {/* Ice overlay */}
        <div className="absolute inset-0 bg-cyan-100/65 rounded-xl" />
        {/* Frost cracks */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: size * 0.5 }}>
          🧊
        </div>
        {/* Shine */}
        <div className="absolute top-1 left-2 right-3 rounded-full bg-white/50"
          style={{ height: Math.max(3, size * 0.1) }} />
      </div>
    );
  }

  // Exploding cell — show explosion animation (handles colorless destroyed crates too)
  if (cell.exploding) {
    const ec = cell.color ? COLOR_CLASSES[cell.color] : null;
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl ${ec ? ec.main : 'bg-amber-500'} animate-explode pointer-events-none`}
      />
    );
  }

  const colors = COLOR_CLASSES[cell.color!] ?? COLOR_CLASSES['red'];
  const isPowerUp = cell.type !== 'normal';
  const powerup = isPowerUp ? POWERUP_CONFIG[cell.type] : null;
  // Always resolvable so it can be used as a JSX component; only rendered when
  // the cell actually is a power-up.
  const PowerUpArt = POWERUP_ICONS[cell.type] ?? RocketIcon;
  const iconSize = size * 0.72;
  const sparkleSize = Math.max(9, size * 0.26);

  // cell step = cell size (50) + gap (4)
  const fallPx = (cell.fallDistance ?? 0) * (size + 4);
  const isFalling = fallPx > 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        boxShadow: isPowerUp
          ? `0 4px 8px ${powerup!.glowColor}, 0 2px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`
          : `0 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)`,
        ...(isFalling ? { '--fall-dist': `${fallPx}px` } as React.CSSProperties : {}),
      }}
      className={`
        relative rounded-xl cursor-pointer select-none
        ${colors.main}
        border-b-4 ${colors.border}
        transition-transform duration-100
        hover:brightness-110 active:scale-95 active:border-b-0 active:translate-y-1
        flex items-center justify-center
        overflow-hidden
        ${isFalling ? 'animate-cell-fall' : cell.new ? 'animate-bounce-in' : ''}
      `}
    >
      {/* Top shine */}
      <div
        className="absolute top-1 left-2 right-3 rounded-full bg-white/40"
        style={{ height: Math.max(3, size * 0.1) }}
      />

      {/* Side shine */}
      <div
        className="absolute top-2 bottom-2 left-1 rounded-full bg-white/15"
        style={{ width: Math.max(2, size * 0.06) }}
      />

      {isPowerUp ? (
        <>
          {/* Pulsing colored ring — makes the power-up pop out from regular blocks */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none animate-powerup-ring"
            style={{ '--pu-glow': powerup!.glowColor } as React.CSSProperties}
          />
          {/* Bright halo behind the icon for contrast against any block color */}
          <div
            className="absolute rounded-full bg-white/35"
            style={{ width: size * 0.78, height: size * 0.78 }}
          />
          <div
            className={`relative z-10 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] ${powerup!.extraClass}`}
          >
            <PowerUpArt size={iconSize} />
          </div>
          {/* Twinkling sparkle badge to flag this as a special cell */}
          <div
            className="absolute top-0.5 right-0.5 z-20 animate-sparkle pointer-events-none"
            style={{ width: sparkleSize, height: sparkleSize }}
          >
            <SparkleIcon size={sparkleSize} />
          </div>
        </>
      ) : (
        <>
          {/* Cube face decoration */}
          <div
            className="absolute inset-2 rounded-lg bg-white/10"
            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
          />
          {/* Eyes/face */}
          <div className="relative z-10 flex gap-1">
            <div className={`w-2 h-2 rounded-full ${colors.light} shadow-inner`} />
            <div className={`w-2 h-2 rounded-full ${colors.light} shadow-inner`} />
          </div>
        </>
      )}
    </button>
  );
};
