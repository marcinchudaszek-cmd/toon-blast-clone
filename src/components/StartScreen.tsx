import React, { useState } from 'react';
import { AchievementDef } from '../game/achievements';
import { DailyRewardOffer } from '../game/dailyReward';
import { PlayerStats } from '../game/storage';
import { LevelMap } from './LevelMap';

interface StartScreenProps {
  onStart: () => void;
  onGotoLevel: (level: number) => void;
  totalLevels: number;
  unlockedLevel: number;
  bestScores: Record<number, number>;
  levelStars: Record<number, number>;
  onResetProgress: () => void;
  achievements: AchievementDef[];
  unlockedAchievements: string[];
  stats: PlayerStats;
  canClaimDaily: boolean;
  dailyOffer: DailyRewardOffer;
  dailyStreak: number;
  onClaimDaily: () => void;
  onOpenSettings: () => void;
}

const TIERS = [
  { range: [1, 10],  label: 'Basic',        color: 'border-emerald-500/40 bg-emerald-500/10' },
  { range: [11, 20], label: 'Advanced',     color: 'border-sky-500/40 bg-sky-500/10' },
  { range: [21, 25], label: 'Expert',       color: 'border-violet-500/40 bg-violet-500/10' },
  { range: [26, 30], label: 'Master',       color: 'border-orange-500/40 bg-orange-500/10' },
  { range: [31, 35], label: 'Legend',       color: 'border-rose-500/40 bg-rose-500/10' },
  { range: [36, 40], label: 'Ultimate',     color: 'border-red-600/40 bg-red-600/10' },
  { range: [41, 45], label: 'Legendary+',  color: 'border-amber-500/40 bg-amber-500/10' },
  { range: [46, 50], label: 'Mythic',       color: 'border-fuchsia-500/40 bg-fuchsia-500/10' },
  { range: [51, 55], label: 'Transcendent', color: 'border-cyan-400/40 bg-cyan-400/10' },
  { range: [56, 60], label: 'Godlike',      color: 'border-yellow-400/40 bg-yellow-400/10' },
  { range: [61, 65],  label: 'Celestial',   color: 'border-sky-300/40 bg-sky-300/10' },
  { range: [66, 70],  label: 'Eternal',     color: 'border-indigo-400/40 bg-indigo-400/10' },
  { range: [71, 75],  label: 'Infinite',    color: 'border-violet-300/40 bg-violet-300/10' },
  { range: [76, 80],  label: 'Beyond',      color: 'border-pink-400/40 bg-pink-400/10' },
  { range: [81, 85],  label: 'Void',        color: 'border-slate-400/40 bg-slate-400/10' },
  { range: [86, 90],  label: 'Abyss',       color: 'border-stone-500/40 bg-stone-500/10' },
  { range: [91, 95],  label: 'Chaos',       color: 'border-orange-600/40 bg-orange-600/10' },
  { range: [96, 100], label: 'Nexus',       color: 'border-teal-400/40 bg-teal-400/10' },
  { range: [101, 105], label: 'Eclipse',    color: 'border-purple-600/40 bg-purple-600/10' },
  { range: [106, 110], label: 'Genesis',    color: 'border-lime-400/40 bg-lime-400/10' },
  { range: [111, 115], label: 'Omega',      color: 'border-red-500/40 bg-red-500/10' },
  { range: [116, 120], label: 'Apocalypse', color: 'border-rose-700/40 bg-rose-700/10' },
  { range: [121, 125], label: 'Purgatory',  color: 'border-zinc-400/40 bg-zinc-400/10' },
  { range: [126, 130], label: 'Hellfire',   color: 'border-orange-700/40 bg-orange-700/10' },
  { range: [131, 135], label: 'Limbo',      color: 'border-neutral-500/40 bg-neutral-500/10' },
  { range: [136, 140], label: 'Pantheon',   color: 'border-yellow-600/40 bg-yellow-600/10' },
  { range: [141, 145], label: 'Ascension',  color: 'border-sky-200/40 bg-sky-200/10' },
  { range: [146, 150], label: 'Divine',     color: 'border-amber-300/40 bg-amber-300/10' },
  { range: [151, 155], label: 'Cosmic',     color: 'border-blue-300/40 bg-blue-300/10' },
  { range: [156, 160], label: 'The End',    color: 'border-white/40 bg-white/10' },
] as const;

function currentTierLabel(lvl: number) {
  for (const t of TIERS) {
    if (lvl >= t.range[0] && lvl <= t.range[1]) return t.label;
  }
  return 'The End';
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onGotoLevel,
  totalLevels,
  unlockedLevel,
  bestScores,
  levelStars,
  onResetProgress,
  achievements,
  unlockedAchievements,
  stats,
  canClaimDaily,
  dailyOffer,
  dailyStreak,
  onClaimDaily,
  onOpenSettings,
}) => {
  const [showLevels, setShowLevels] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showDaily, setShowDaily] = useState(false);

  const clampedUnlocked = Math.min(unlockedLevel, totalLevels);
  const unlockedSet = new Set(unlockedAchievements);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-700 flex flex-col items-center justify-center safe-menu relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-10 left-5 w-20 h-10 bg-white/30 rounded-full blur-sm animate-pulse" />
      <div className="absolute top-20 right-10 w-16 h-8 bg-white/20 rounded-full blur-sm animate-pulse" style={{ animationDelay: '300ms' }} />
      <div className="absolute top-5 right-1/3 w-24 h-10 bg-white/25 rounded-full blur-sm animate-pulse" style={{ animationDelay: '700ms' }} />
      <div className="absolute bottom-16 left-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-8 right-1/4 w-36 h-36 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/15 border border-white/25 text-white/80 hover:bg-white/25 hover:text-white transition-all flex items-center justify-center z-10"
        title="Ustawienia"
        aria-label="Ustawienia"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2.5l1.4 2.6 2.9-.5.6 2.9 2.6 1.4-1.5 2.6 1.5 2.6-2.6 1.4-.6 2.9-2.9-.5L12 21.5l-1.4-2.6-2.9.5-.6-2.9-2.6-1.4L6 12.5 4.5 9.9l2.6-1.4.6-2.9 2.9.5L12 2.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Reset */}
      <button
        onClick={onResetProgress}
        className="absolute top-4 right-4 text-white/40 hover:text-white/70 text-xs transition-colors z-10"
        title="Reset progress"
      >
        ↺ reset
      </button>

      {/* Logo */}
      <div className="text-center mb-5">
        <div className="text-7xl mb-3 animate-bounce">🎮</div>
        <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-tight">
          Toon<span className="text-yellow-400">Blast</span>
        </h1>
        <p className="text-white/80 text-base mt-1 font-medium">The Colorful Puzzle Adventure!</p>
      </div>

      {/* Characters */}
      <div className="flex gap-4 mb-5 text-5xl">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>🐱</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>🐺</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>🐻</span>
      </div>

      {/* Progress pill */}
      <div className="mb-5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-6 py-3 text-center min-w-[200px]">
        <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Your Progress</p>
        <p className="text-white font-black text-xl">
          Level <span className="text-yellow-300">{clampedUnlocked}</span>
          <span className="text-white/40 font-normal text-sm"> / {totalLevels}</span>
        </p>
        <div className="mt-2 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(((clampedUnlocked - 1) / totalLevels) * 100, 100)}%` }}
          />
        </div>
        <p className="text-white/50 text-xs mt-1.5">{currentTierLabel(clampedUnlocked)} tier</p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs mb-6">
        <button
          onClick={onStart}
          className="w-full bg-gradient-to-b from-yellow-400 to-orange-500 text-white font-black text-2xl px-8 py-4 rounded-2xl shadow-2xl hover:brightness-110 active:scale-95 transition-all border-b-4 border-orange-700"
        >
          ▶ PLAY!
        </button>
        <button
          onClick={() => setShowLevels(true)}
          className="w-full bg-white/15 backdrop-blur-sm text-white font-bold text-sm px-8 py-3 rounded-xl border border-white/30 hover:bg-white/25 active:scale-95 transition-all"
        >
          🗺️ Choose Level
        </button>
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setShowAchievements(true)}
            className="flex-1 bg-white/15 backdrop-blur-sm text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/30 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            🏆 Achievements
            <span className="text-white/50 font-normal">{unlockedAchievements.length}/{achievements.length}</span>
          </button>
          <button
            onClick={() => setShowDaily(true)}
            className={`flex-1 relative font-bold text-xs px-4 py-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
              canClaimDaily
                ? 'bg-gradient-to-b from-yellow-400 to-orange-500 border-orange-700 text-white animate-glow'
                : 'bg-white/15 backdrop-blur-sm border-white/30 text-white hover:bg-white/25'
            }`}
          >
            🎁 Daily Reward
            {canClaimDaily && (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white/80 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Power-ups strip */}
      <div className="flex gap-3 mb-5">
        {[
          { icon: '🚀', label: 'Rocket', desc: '4 blocks' },
          { icon: '💣', label: 'Bomb', desc: '5 blocks' },
          { icon: '🪩', label: 'Disco', desc: '7+ blocks' },
        ].map(pu => (
          <div key={pu.label} className="flex flex-col items-center bg-white/15 rounded-xl p-3 backdrop-blur-sm border border-white/20">
            <span className="text-xl mb-1">{pu.icon}</span>
            <span className="text-white text-xs font-bold">{pu.label}</span>
            <span className="text-white/60 text-xs">{pu.desc}</span>
          </div>
        ))}
      </div>

      {/* How to play — compact */}
      <div className="bg-white/10 rounded-2xl px-4 py-3 max-w-xs w-full backdrop-blur-sm border border-white/20">
        <h3 className="text-white font-bold text-center mb-2 text-sm">How to Play</h3>
        <ul className="text-white/70 text-xs space-y-1.5">
          <li>🎯 Tap groups of 2+ same-color blocks to blast them!</li>
          <li>🚀 4 blocks → Rocket &nbsp;💣 5 blocks → Bomb &nbsp;🪩 7+ → Disco</li>
          <li>🏆 Complete the targets before moves run out!</li>
        </ul>
      </div>

      {/* ===== Level Picker Modal ===== */}
      {showLevels && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLevels(false)}
        >
          <div
            className="bg-gradient-to-b from-indigo-900 to-blue-950 rounded-t-3xl sm:rounded-3xl w-full max-w-sm flex flex-col border border-white/20 shadow-2xl"
            style={{ maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-lg">Mapa poziomów</h2>
                <p className="text-white/50 text-xs mt-0.5">{clampedUnlocked} z {totalLevels} odblokowanych</p>
              </div>
              <button
                onClick={() => setShowLevels(false)}
                className="text-white/50 hover:text-white text-3xl leading-none transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <LevelMap
              totalLevels={totalLevels}
              unlockedLevel={unlockedLevel}
              levelStars={levelStars}
              bestScores={bestScores}
              onSelect={lvl => { onGotoLevel(lvl); setShowLevels(false); }}
            />
          </div>
        </div>
      )}

      {/* ===== Achievements Modal ===== */}
      {showAchievements && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAchievements(false)}
        >
          <div
            className="bg-gradient-to-b from-indigo-900 to-blue-950 rounded-t-3xl sm:rounded-3xl w-full max-w-sm flex flex-col border border-white/20 shadow-2xl"
            style={{ maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-lg">🏆 Achievements</h2>
                <p className="text-white/50 text-xs mt-0.5">{unlockedAchievements.length} / {achievements.length} unlocked</p>
              </div>
              <button
                onClick={() => setShowAchievements(false)}
                className="text-white/50 hover:text-white text-3xl leading-none transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ×
              </button>
            </div>

            {/* Lifetime stats strip */}
            <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-white/10 flex-shrink-0">
              {[
                { label: 'Score', value: stats.totalScore.toLocaleString(), icon: '💎' },
                { label: 'Levels', value: stats.levelsCompleted, icon: '🏁' },
                { label: 'Best Combo', value: stats.bestCombo, icon: '🔥' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl px-2 py-2 text-center border border-white/10">
                  <div className="text-base leading-none mb-0.5">{s.icon}</div>
                  <div className="text-white font-black text-sm leading-none">{s.value}</div>
                  <div className="text-white/40 text-[9px] uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2">
              {achievements.map(a => {
                const unlocked = unlockedSet.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all ${
                      unlocked
                        ? 'bg-amber-400/15 border-amber-400/40'
                        : 'bg-white/5 border-white/10 opacity-50'
                    }`}
                  >
                    <div className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{unlocked ? a.emoji : '🔒'}</div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm leading-tight ${unlocked ? 'text-amber-200' : 'text-white/70'}`}>{a.title}</p>
                      <p className="text-white/50 text-xs leading-tight">{a.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== Daily Reward Modal ===== */}
      {showDaily && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDaily(false)}
        >
          <div
            className="bg-gradient-to-b from-yellow-500 to-orange-600 rounded-3xl p-6 mx-4 max-w-sm w-full shadow-2xl text-center border border-white/20"
            style={{ boxShadow: '0 0 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-6xl mb-2 animate-bounce">🎁</div>
            <h2 className="text-2xl font-black text-white mb-1 drop-shadow-lg">Daily Reward</h2>
            <p className="text-white/80 text-xs mb-4">
              {canClaimDaily
                ? `Day ${dailyOffer.streak} streak — come back tomorrow for more!`
                : `You've already claimed today. Current streak: ${dailyStreak} day${dailyStreak === 1 ? '' : 's'}. Come back tomorrow!`}
            </p>

            <div className="bg-white/15 rounded-2xl p-4 mb-4 flex justify-center gap-4">
              {[
                { key: 'hammer', icon: '🔨', amount: dailyOffer.hammer },
                { key: 'extraMoves', icon: '⌛', amount: dailyOffer.extraMoves },
                { key: 'colorBomb', icon: '💥', amount: dailyOffer.colorBomb },
              ].filter(r => r.amount > 0).map(r => (
                <div key={r.key} className="flex flex-col items-center">
                  <span className="text-3xl">{r.icon}</span>
                  <span className="text-white font-black text-lg">+{r.amount}</span>
                </div>
              ))}
              {dailyOffer.hammer + dailyOffer.extraMoves + dailyOffer.colorBomb === 0 && (
                <p className="text-white/70 text-sm py-2">Nothing to claim right now.</p>
              )}
            </div>

            {canClaimDaily ? (
              <button
                onClick={() => { onClaimDaily(); setShowDaily(false); }}
                className="w-full bg-gradient-to-b from-white to-yellow-100 text-orange-700 font-black text-lg py-3 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all border-b-4 border-yellow-300"
              >
                Claim Reward!
              </button>
            ) : (
              <button
                onClick={() => setShowDaily(false)}
                className="w-full bg-white/20 text-white font-bold text-base py-3 rounded-2xl hover:bg-white/30 active:scale-95 transition-all border border-white/30"
              >
                Come back tomorrow
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
