import { GameProgress } from './storage';

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Returns true once the progress snapshot satisfies the unlock condition. */
  isUnlocked: (p: GameProgress) => boolean;
}

function countThreeStarLevels(p: GameProgress): number {
  return Object.values(p.levelStars).filter(s => s >= 3).length;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blast',
    emoji: '🚀',
    title: 'First Blast!',
    description: 'Activate your first power-up.',
    isUnlocked: p => p.stats.powerUpsActivated >= 1,
  },
  {
    id: 'mega_combo',
    emoji: '💥',
    title: 'Mega Combo!',
    description: 'Trigger a power-up combo by tapping two specials together.',
    isUnlocked: p => p.stats.combosTriggered >= 1,
  },
  {
    id: 'combo_streak',
    emoji: '🔥',
    title: 'On Fire',
    description: 'Reach a combo streak of 5 or more in a single level.',
    isUnlocked: p => p.stats.bestCombo >= 5,
  },
  {
    id: 'crate_crusher',
    emoji: '📦',
    title: 'Crate Crusher',
    description: 'Destroy 25 crates.',
    isUnlocked: p => p.stats.cratesDestroyed >= 25,
  },
  {
    id: 'ice_breaker',
    emoji: '🧊',
    title: 'Ice Breaker',
    description: 'Thaw 25 frozen cells.',
    isUnlocked: p => p.stats.iceBroken >= 25,
  },
  {
    id: 'big_cleaner',
    emoji: '🧹',
    title: 'Big Cleaner',
    description: 'Clear 1,000 cells from the board over your lifetime.',
    isUnlocked: p => p.stats.totalCellsCleared >= 1000,
  },
  {
    id: 'star_collector',
    emoji: '⭐',
    title: 'Star Collector',
    description: 'Earn 3 stars on 5 different levels.',
    isUnlocked: p => countThreeStarLevels(p) >= 5,
  },
  {
    id: 'star_perfectionist',
    emoji: '🌟',
    title: 'Perfectionist',
    description: 'Earn 3 stars on 10 different levels.',
    isUnlocked: p => countThreeStarLevels(p) >= 10,
  },
  {
    id: 'level_5',
    emoji: '🏁',
    title: 'Getting Started',
    description: 'Complete 5 levels.',
    isUnlocked: p => p.stats.levelsCompleted >= 5,
  },
  {
    id: 'level_grinder',
    emoji: '🏆',
    title: 'Level Grinder',
    description: 'Complete 20 levels (replays count!).',
    isUnlocked: p => p.stats.levelsCompleted >= 20,
  },
  {
    id: 'high_scorer',
    emoji: '💎',
    title: 'High Scorer',
    description: 'Earn a lifetime total of 50,000 points.',
    isUnlocked: p => p.stats.totalScore >= 50000,
  },
  {
    id: 'dedicated',
    emoji: '📅',
    title: 'Dedicated Player',
    description: 'Reach a 3-day daily login streak.',
    isUnlocked: p => p.dailyReward.streak >= 3,
  },
];

/** Returns the ids of achievements that are unlocked by `progress` but aren't in `progress.achievements` yet. */
export function findNewlyUnlocked(progress: GameProgress): string[] {
  const owned = new Set(progress.achievements);
  return ACHIEVEMENTS.filter(a => !owned.has(a.id) && a.isUnlocked(progress)).map(a => a.id);
}
