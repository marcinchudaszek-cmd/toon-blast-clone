import React, { useEffect, useMemo, useRef } from 'react';
import { LEVELS } from '../game/levels';

interface LevelMapProps {
  totalLevels: number;
  unlockedLevel: number;
  levelStars: Record<number, number>;
  bestScores: Record<number, number>;
  onSelect: (level: number) => void;
}

const SPACING = 92;      // vertical distance between level nodes
const TOP_PAD = 40;
const BOTTOM_PAD = 60;
const NODE = 52;
const TRACK_WIDTH = 320;
const AMPLITUDE = 92;    // how far the path swings left/right

/** Boss levels get a bigger, crowned node so the campaign has visible landmarks. */
const isBoss = (lvl: number, total: number) => lvl % 25 === 0 || lvl === total;

function nodePosition(index: number): { x: number; y: number } {
  return {
    x: TRACK_WIDTH / 2 + Math.sin(index * 0.62) * AMPLITUDE,
    y: TOP_PAD + index * SPACING,
  };
}

const StarRow: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex gap-[1px] justify-center">
    {[0, 1, 2].map(i => (
      <svg key={i} width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2l-5-4.9 6.9-1z"
          fill={i < count ? '#fde047' : 'rgba(255,255,255,0.22)'}
          stroke={i < count ? '#a16207' : 'transparent'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ))}
  </div>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="2.5" fill="rgba(255,255,255,0.35)" />
    <path d="M8 10V7a4 4 0 118 0v3" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const CrownIcon = () => (
  <svg width="20" height="14" viewBox="0 0 24 16" aria-hidden="true">
    <path d="M2 14L1 3l6 4 5-6 5 6 6-4-1 11z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/**
 * The campaign as a winding trail instead of a grid of numbered buttons.
 *
 * The traveled part of the path is drawn in gold up to the furthest level the
 * player has unlocked, so progress is visible at a glance, and the view scrolls
 * itself to wherever they are when it opens.
 */
export const LevelMap: React.FC<LevelMapProps> = ({
  totalLevels,
  unlockedLevel,
  levelStars,
  bestScores,
  onSelect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const clampedUnlocked = Math.min(unlockedLevel, totalLevels);

  const points = useMemo(
    () => Array.from({ length: totalLevels }, (_, i) => nodePosition(i)),
    [totalLevels]
  );

  const height = TOP_PAD + (totalLevels - 1) * SPACING + BOTTOM_PAD;
  const fullPath = useMemo(() => points.map(p => `${p.x},${p.y}`).join(' '), [points]);
  const travelledPath = useMemo(
    () => points.slice(0, clampedUnlocked).map(p => `${p.x},${p.y}`).join(' '),
    [points, clampedUnlocked]
  );

  // Drop the player at their current level rather than at level 1.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = nodePosition(clampedUnlocked - 1).y - el.clientHeight / 2;
    el.scrollTop = Math.max(0, target);
  }, [clampedUnlocked]);

  return (
    <div ref={scrollRef} className="overflow-y-auto flex-1 px-2 py-2">
      <div className="relative mx-auto" style={{ width: TRACK_WIDTH, height }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={TRACK_WIDTH}
          height={height}
          aria-hidden="true"
        >
          {/* the road ahead */}
          <polyline
            points={fullPath}
            fill="none"
            stroke="rgba(255,255,255,0.13)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={fullPath}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="4"
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          {/* the road already walked */}
          {clampedUnlocked > 1 && (
            <polyline
              points={travelledPath}
              fill="none"
              stroke="url(#trail)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <defs>
            <linearGradient id="trail" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>

        {points.map((p, i) => {
          const lvl = i + 1;
          const locked = lvl > unlockedLevel;
          const isCurrent = lvl === clampedUnlocked;
          const stars = levelStars[lvl] ?? 0;
          const played = bestScores[lvl] !== undefined;
          const boss = isBoss(lvl, totalLevels);
          const hard = LEVELS[lvl - 1]?.difficulty === 'hard';
          const size = boss ? NODE + 10 : NODE;

          return (
            <div
              key={lvl}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: p.x - size / 2, top: p.y - size / 2, width: size }}
            >
              {hard && !locked && (
                <div className="absolute -top-3 text-sm" title="Trudny poziom">💀</div>
              )}
              {boss && !locked && (
                <div className="absolute -top-4">
                  <CrownIcon />
                </div>
              )}
              <button
                onClick={() => !locked && onSelect(lvl)}
                disabled={locked}
                aria-label={`Poziom ${lvl}${locked ? ' (zablokowany)' : ''}`}
                style={{ width: size, height: size }}
                className={`
                  rounded-full flex items-center justify-center font-black border-b-4 transition-all
                  ${locked
                    ? 'bg-white/10 border-white/10 text-white/30 cursor-not-allowed'
                    : played
                    ? 'bg-gradient-to-b from-amber-300 to-orange-500 border-orange-700 text-amber-950 active:scale-95'
                    : 'bg-gradient-to-b from-sky-300 to-blue-500 border-blue-800 text-white active:scale-95'}
                  ${isCurrent ? 'ring-4 ring-white/70 animate-glow scale-110' : ''}
                  ${boss && !locked ? 'shadow-[0_0_18px_rgba(251,191,36,0.6)]' : ''}
                  ${hard && !locked ? 'ring-2 ring-red-500/80' : ''}
                `}
              >
                {locked ? <LockIcon /> : <span className={boss ? 'text-base' : 'text-sm'}>{lvl}</span>}
              </button>
              {!locked && played && <StarRow count={stars} />}
              {isCurrent && (
                <span className="text-white text-[10px] font-black uppercase tracking-wider drop-shadow">
                  tu jesteś
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
