import React from 'react';
import { CellColor, ObjectiveKind, Objectives } from '../game/types';

interface TargetPanelProps {
  targets: Partial<Record<CellColor, number>>;
  objectives?: Objectives;
}

export const COLOR_EMOJIS: Record<CellColor, string> = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
  purple: '🟣',
  orange: '🟠',
};

/** Obstacle goals, shown next to the color goals. */
export const OBJECTIVE_INFO: Record<ObjectiveKind, { icon: string; label: string }> = {
  crate: { icon: '📦', label: 'skrzynie' },
  ice: { icon: '🧊', label: 'lód' },
  balloon: { icon: '🎈', label: 'balony' },
  duck: { icon: '🦆', label: 'kaczki' },
};

const Goal: React.FC<{ icon: string; count: number; title?: string; compact?: boolean }> = ({ icon, count, title, compact }) => {
  const done = count <= 0;
  return (
    <div
      title={title}
      className={`flex flex-col items-center rounded-xl ${compact ? 'gap-0 px-2 py-1' : 'gap-1 px-3 py-2'} bg-white/10 backdrop-blur-sm border-2 transition-all
        ${done ? 'border-green-400 opacity-70' : 'border-white/20'}
      `}
    >
      <div className="relative">
        <span className={compact ? 'text-lg leading-tight' : 'text-2xl'} role="img">{icon}</span>
        {done && (
          <span className="absolute -top-1 -right-1 text-xs bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-white font-bold">✓</span>
        )}
      </div>
      <span className={`text-sm font-bold ${done ? 'text-green-400 line-through' : 'text-white'}`}>
        {Math.max(0, count)}
      </span>
    </div>
  );
};

export const TargetPanel: React.FC<TargetPanelProps> = ({ targets, objectives = {} }) => {
  // Many goals: smaller tiles so they stay on one row and leave room for the board
  const compact = Object.keys(targets).length + Object.keys(objectives).length > 4;
  return (
    <div className={`flex flex-wrap justify-center ${compact ? 'gap-1' : 'gap-2'}`}>
      {Object.entries(targets).map(([color, count]) => (
        <Goal key={color} icon={COLOR_EMOJIS[color as CellColor]} count={count ?? 0} compact={compact} />
      ))}
      {(Object.entries(objectives) as [ObjectiveKind, number | undefined][]).map(([kind, count]) => (
        <Goal key={kind} icon={OBJECTIVE_INFO[kind].icon} count={count ?? 0} title={OBJECTIVE_INFO[kind].label} compact={compact} />
      ))}
    </div>
  );
};
