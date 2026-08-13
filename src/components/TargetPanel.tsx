import React from 'react';
import { CellColor } from '../game/types';

interface TargetPanelProps {
  targets: Partial<Record<CellColor, number>>;
}

const COLOR_EMOJIS: Record<CellColor, string> = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
  purple: '🟣',
  orange: '🟠',
};



export const TargetPanel: React.FC<TargetPanelProps> = ({ targets }) => {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {Object.entries(targets).map(([color, count]) => {
        const c = color as CellColor;
        const done = (count ?? 0) <= 0;
        return (
          <div
            key={color}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border-2 transition-all
              ${done ? 'border-green-400 opacity-70' : 'border-white/20'}
            `}
          >
            <div className="relative">
              <span className="text-2xl" role="img">{COLOR_EMOJIS[c]}</span>
              {done && (
                <span className="absolute -top-1 -right-1 text-xs bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-white font-bold">✓</span>
              )}
            </div>
            <span className={`text-sm font-bold ${done ? 'text-green-400 line-through' : 'text-white'}`}>
              {Math.max(0, count ?? 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
