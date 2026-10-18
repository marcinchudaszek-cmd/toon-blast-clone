import React from 'react';
import { EventState, WeeklyEventDef, EVENT_REWARD, daysLeft } from '../game/events';

interface Props {
  state: EventState;
  def: WeeklyEventDef;
  onClaim: () => boolean;
}

/** This week's event in the menu: goal, progress bar, days left, claim button. */
export const WeeklyEventCard: React.FC<Props> = ({ state, def, onClaim }) => {
  const done = state.progress >= def.goal;
  const pct = Math.min(100, (state.progress / def.goal) * 100);
  const left = daysLeft();
  return (
    <div className={`w-full rounded-xl border px-4 py-2.5 ${done && !state.claimed
      ? 'bg-gradient-to-b from-fuchsia-400 to-purple-600 border-purple-800 animate-glow'
      : 'bg-white/15 border-white/30 backdrop-blur-sm'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xs">
            Wydarzenie: {def.title}
            <span className="text-white/60 font-normal"> · {left === 1 ? 'ostatni dzień' : `jeszcze ${left} dni`}</span>
          </p>
          <p className="text-white/75 text-[11px]">{def.description}</p>
          <div className="mt-1 h-1.5 rounded-full bg-black/25 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-fuchsia-300 to-pink-400 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {state.claimed ? (
          <span className="text-emerald-200 text-xs font-black">✓ Odebrane</span>
        ) : done ? (
          <button onClick={onClaim} className="bg-white text-purple-700 font-black text-xs px-3 py-1.5 rounded-lg active:scale-95">
            Odbierz
          </button>
        ) : (
          <span className="text-white/70 text-xs font-black">{Math.min(state.progress, def.goal)}/{def.goal}</span>
        )}
      </div>
      {!state.claimed && (
        <p className="text-white/50 text-[10px] mt-1">
          Nagroda: 🔨⌛💥 ×{EVENT_REWARD.hammer}, 🚀💣 ×{EVENT_REWARD.rocket}, 🪩 ×{EVENT_REWARD.disco}, ⭐ +{EVENT_REWARD.townStars} do miasteczka
        </p>
      )}
    </div>
  );
};
