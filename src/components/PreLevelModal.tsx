import React, { useState } from 'react';
import { CellColor } from '../game/types';
import { StartBooster, START_BOOSTER_INFO } from '../game/rewards';

const COLOR_EMOJIS: Record<CellColor, string> = {
  red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', purple: '🟣', orange: '🟠',
};

interface Props {
  level: number;
  levelName: string;
  moves: number;
  targets: Partial<Record<CellColor, number>>;
  winStreak: number;
  streakGift: StartBooster[];
  boosterTypes: StartBooster[];
  inventory: Record<StartBooster, number>;
  onStart: (picked: StartBooster[]) => void;
  onMenu: () => void;
}

/**
 * Shown before the first move of every level: the goals, the free power-ups
 * from the win streak, and the player's own pre-level boosters to pick from.
 */
export const PreLevelModal: React.FC<Props> = ({
  level, levelName, moves, targets, winStreak, streakGift, boosterTypes, inventory, onStart, onMenu,
}) => {
  const [picked, setPicked] = useState<StartBooster[]>([]);
  const toggle = (b: StartBooster) =>
    setPicked(p => (p.includes(b) ? p.filter(x => x !== b) : inventory[b] > 0 ? [...p, b] : p));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-gradient-to-b from-indigo-600 to-blue-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl text-center border border-white/20 animate-bounce-in">
        <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
          Poziom {level}
        </div>
        <h2 className="text-white font-black text-2xl mt-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.35)' }}>{levelName}</h2>

        <div className="mt-3 bg-white/10 rounded-2xl p-3 border border-white/15">
          <p className="text-white/60 text-[11px] uppercase tracking-widest font-semibold mb-2">Cele · {moves} ruchów</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {Object.entries(targets).map(([color, n]) => (
              <span key={color} className="text-white font-black text-lg">
                {COLOR_EMOJIS[color as CellColor]} {n}
              </span>
            ))}
          </div>
        </div>

        <div className={`mt-3 rounded-2xl p-3 border ${streakGift.length ? 'bg-orange-400/20 border-orange-300/50' : 'bg-white/5 border-white/10'}`}>
          <p className="text-white font-bold text-sm">🔥 Seria zwycięstw: {winStreak}</p>
          {streakGift.length ? (
            <p className="text-orange-100 text-xs mt-1">
              Gratis na start: {streakGift.map(b => START_BOOSTER_INFO[b].icon).join(' ')}
            </p>
          ) : (
            <p className="text-white/60 text-xs mt-1">Wygraj poziom, a następny zaczniesz z darmową rakietą. Im dłuższa seria, tym więcej.</p>
          )}
        </div>

        <p className="text-white/70 text-xs mt-4 mb-2">Dodaj power-upy na start:</p>
        <div className="flex gap-2 justify-center">
          {boosterTypes.map(b => {
            const on = picked.includes(b);
            const empty = inventory[b] <= 0;
            return (
              <button
                key={b}
                onClick={() => toggle(b)}
                disabled={empty}
                aria-pressed={on}
                className={`flex flex-col items-center w-20 py-2 rounded-2xl border-2 transition-all ${
                  on ? 'bg-yellow-400/30 border-yellow-300 scale-105 shadow-[0_0_14px_rgba(250,204,21,0.6)]'
                    : empty ? 'bg-white/5 border-white/10 opacity-40'
                    : 'bg-white/15 border-white/25 active:scale-95'}`}
              >
                <span className="text-2xl leading-none">{START_BOOSTER_INFO[b].icon}</span>
                <span className="text-white text-[11px] font-bold mt-1">{START_BOOSTER_INFO[b].label}</span>
                <span className={`text-[11px] font-black ${on ? 'text-yellow-200' : 'text-white/60'}`}>×{inventory[b]}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onStart(picked)}
          className="mt-5 w-full bg-gradient-to-b from-yellow-400 to-orange-500 text-white font-black text-xl py-3 rounded-2xl shadow-xl border-b-4 border-orange-700 active:scale-95 transition-all"
        >
          ▶ Graj!
        </button>
        <button onClick={onMenu} className="mt-2 text-white/60 text-sm py-1">☰ Menu</button>
      </div>
    </div>
  );
};
