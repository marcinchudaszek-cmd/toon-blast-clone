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
    title: 'Pierwszy wybuch!',
    description: 'Uruchom pierwszy power-up.',
    isUnlocked: p => p.stats.powerUpsActivated >= 1,
  },
  {
    id: 'mega_combo',
    emoji: '💥',
    title: 'Mega combo!',
    description: 'Wywołaj combo, stukając dwa power-upy leżące obok siebie.',
    isUnlocked: p => p.stats.combosTriggered >= 1,
  },
  {
    id: 'combo_streak',
    emoji: '🔥',
    title: 'W ogniu',
    description: 'Zrób serię combo 5 lub więcej w jednym poziomie.',
    isUnlocked: p => p.stats.bestCombo >= 5,
  },
  {
    id: 'crate_crusher',
    emoji: '📦',
    title: 'Pogromca skrzyń',
    description: 'Zniszcz 25 skrzyń.',
    isUnlocked: p => p.stats.cratesDestroyed >= 25,
  },
  {
    id: 'ice_breaker',
    emoji: '🧊',
    title: 'Lodołamacz',
    description: 'Rozmroź 25 zamrożonych pól.',
    isUnlocked: p => p.stats.iceBroken >= 25,
  },
  {
    id: 'big_cleaner',
    emoji: '🧹',
    title: 'Wielkie sprzątanie',
    description: 'Wyczyść łącznie 1000 pól planszy.',
    isUnlocked: p => p.stats.totalCellsCleared >= 1000,
  },
  {
    id: 'star_collector',
    emoji: '⭐',
    title: 'Zbieracz gwiazd',
    description: 'Zdobądź 3 gwiazdki na 5 różnych poziomach.',
    isUnlocked: p => countThreeStarLevels(p) >= 5,
  },
  {
    id: 'star_perfectionist',
    emoji: '🌟',
    title: 'Perfekcja',
    description: 'Zdobądź 3 gwiazdki na 10 różnych poziomach.',
    isUnlocked: p => countThreeStarLevels(p) >= 10,
  },
  {
    id: 'level_5',
    emoji: '🏁',
    title: 'Na rozgrzewkę',
    description: 'Ukończ 5 poziomów.',
    isUnlocked: p => p.stats.levelsCompleted >= 5,
  },
  {
    id: 'level_grinder',
    emoji: '🏆',
    title: 'Wytrwałość',
    description: 'Ukończ 20 poziomów (powtórki też się liczą!).',
    isUnlocked: p => p.stats.levelsCompleted >= 20,
  },
  {
    id: 'high_scorer',
    emoji: '💎',
    title: 'Mistrz punktów',
    description: 'Zdobądź łącznie 50 000 punktów.',
    isUnlocked: p => p.stats.totalScore >= 50000,
  },
  {
    id: 'balloon_party',
    emoji: '🎈',
    title: 'Balonowy szał',
    description: 'Pęknij łącznie 50 balonów.',
    isUnlocked: p => p.stats.balloonsPopped >= 50,
  },
  {
    id: 'duck_hero',
    emoji: '🦆',
    title: 'Ratownik kaczek',
    description: 'Uratuj łącznie 20 kaczek.',
    isUnlocked: p => p.stats.ducksRescued >= 20,
  },
  {
    id: 'dedicated',
    emoji: '📅',
    title: 'Stały bywalec',
    description: 'Odbierz codzienną nagrodę 3 dni z rzędu.',
    isUnlocked: p => p.dailyReward.streak >= 3,
  },
];

/** Returns the ids of achievements that are unlocked by `progress` but aren't in `progress.achievements` yet. */
export function findNewlyUnlocked(progress: GameProgress): string[] {
  const owned = new Set(progress.achievements);
  return ACHIEVEMENTS.filter(a => !owned.has(a.id) && a.isUnlocked(progress)).map(a => a.id);
}
