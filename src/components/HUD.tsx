import React from 'react';

interface HUDProps {
  score: number;
  moves: number;
  level: number;
  levelName: string;
}

export const HUD: React.FC<HUDProps> = ({ score, moves, level, levelName }) => {
  const movesColor = moves <= 5 ? 'text-red-400' : moves <= 10 ? 'text-yellow-400' : 'text-white';

  return (
    <div className="w-full flex items-center justify-between px-2">
      {/* Score */}
      <div className="flex flex-col items-center bg-white/10 rounded-2xl px-4 py-2 backdrop-blur-sm border border-white/20 min-w-[80px]">
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wide">Score</span>
        <span className="text-white text-xl font-black">{score.toLocaleString()}</span>
      </div>

      {/* Level info */}
      <div className="flex flex-col items-center">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg mb-1">
          Level {level}
        </div>
        <span className="text-white/80 text-sm font-semibold">{levelName}</span>
      </div>

      {/* Moves */}
      <div className="flex flex-col items-center bg-white/10 rounded-2xl px-4 py-2 backdrop-blur-sm border border-white/20 min-w-[80px]">
        <span className="text-white/70 text-xs font-semibold uppercase tracking-wide">Moves</span>
        <span className={`text-xl font-black ${movesColor}`}>{moves}</span>
      </div>
    </div>
  );
};
