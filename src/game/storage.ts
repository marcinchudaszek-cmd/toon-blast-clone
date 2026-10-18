const STORAGE_KEY = 'toon-blast-progress';

export interface PlayerStats {
  totalScore: number;        // lifetime score earned across all plays
  totalCellsCleared: number; // total cells removed from boards
  powerUpsActivated: number; // total rocket/bomb/disco activations
  combosTriggered: number;   // total power-up "mega combo" triggers
  cratesDestroyed: number;
  iceBroken: number;
  bestCombo: number;         // highest combo streak ever reached
  levelsCompleted: number;   // total level-win events (replays count)
}

export interface DailyRewardState {
  lastClaimedDate: string | null; // "YYYY-MM-DD", local date of last claim
  streak: number;                 // consecutive days claimed (resets on a missed day)
}

export interface GameProgress {
  unlockedLevel: number;
  bestScores: Record<number, number>;
  levelStars: Record<number, number>; // level -> best stars (1–3)
  boosters: {
    hammer: number;
    extraMoves: number;
    colorBomb: number;
  };
  stats: PlayerStats;
  achievements: string[]; // unlocked achievement ids
  dailyReward: DailyRewardState;
  tutorialSeen: boolean; // first-run coach marks have been shown
  startBoosters: { rocket: number; bomb: number; disco: number }; // pre-level power-ups
  winStreak: number;   // levels won in a row (gift power-ups on the next level)
  starChest: number;   // stars collected towards the next star chest
  chestsOpened: number;
}

const DEFAULT_STATS: PlayerStats = {
  totalScore: 0,
  totalCellsCleared: 0,
  powerUpsActivated: 0,
  combosTriggered: 0,
  cratesDestroyed: 0,
  iceBroken: 0,
  bestCombo: 0,
  levelsCompleted: 0,
};

const DEFAULT_DAILY_REWARD: DailyRewardState = {
  lastClaimedDate: null,
  streak: 0,
};

const DEFAULT: GameProgress = {
  unlockedLevel: 1,
  bestScores: {},
  levelStars: {},
  boosters: { hammer: 3, extraMoves: 3, colorBomb: 3 },
  stats: { ...DEFAULT_STATS },
  achievements: [],
  dailyReward: { ...DEFAULT_DAILY_REWARD },
  tutorialSeen: false,
  startBoosters: { rocket: 2, bomb: 2, disco: 1 },
  winStreak: 0,
  starChest: 0,
  chestsOpened: 0,
};

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredCloneProgress(DEFAULT);
    const p = JSON.parse(raw);
    return {
      unlockedLevel: typeof p.unlockedLevel === 'number' ? p.unlockedLevel : 1,
      bestScores: typeof p.bestScores === 'object' && p.bestScores ? p.bestScores : {},
      levelStars: typeof p.levelStars === 'object' && p.levelStars ? p.levelStars : {},
      boosters: {
        hammer:     typeof p.boosters?.hammer     === 'number' ? p.boosters.hammer     : DEFAULT.boosters.hammer,
        extraMoves: typeof p.boosters?.extraMoves === 'number' ? p.boosters.extraMoves : DEFAULT.boosters.extraMoves,
        colorBomb:  typeof p.boosters?.colorBomb  === 'number' ? p.boosters.colorBomb  : DEFAULT.boosters.colorBomb,
      },
      stats: {
        totalScore:        typeof p.stats?.totalScore        === 'number' ? p.stats.totalScore        : DEFAULT_STATS.totalScore,
        totalCellsCleared: typeof p.stats?.totalCellsCleared === 'number' ? p.stats.totalCellsCleared : DEFAULT_STATS.totalCellsCleared,
        powerUpsActivated: typeof p.stats?.powerUpsActivated === 'number' ? p.stats.powerUpsActivated : DEFAULT_STATS.powerUpsActivated,
        combosTriggered:   typeof p.stats?.combosTriggered   === 'number' ? p.stats.combosTriggered   : DEFAULT_STATS.combosTriggered,
        cratesDestroyed:   typeof p.stats?.cratesDestroyed   === 'number' ? p.stats.cratesDestroyed   : DEFAULT_STATS.cratesDestroyed,
        iceBroken:         typeof p.stats?.iceBroken         === 'number' ? p.stats.iceBroken         : DEFAULT_STATS.iceBroken,
        bestCombo:         typeof p.stats?.bestCombo         === 'number' ? p.stats.bestCombo         : DEFAULT_STATS.bestCombo,
        levelsCompleted:   typeof p.stats?.levelsCompleted   === 'number' ? p.stats.levelsCompleted   : DEFAULT_STATS.levelsCompleted,
      },
      achievements: Array.isArray(p.achievements) ? p.achievements.filter((a: unknown) => typeof a === 'string') : [],
      dailyReward: {
        lastClaimedDate: typeof p.dailyReward?.lastClaimedDate === 'string' ? p.dailyReward.lastClaimedDate : null,
        streak: typeof p.dailyReward?.streak === 'number' ? p.dailyReward.streak : 0,
      },
      // Existing players have already learned the game — don't coach them again.
      tutorialSeen: typeof p.tutorialSeen === 'boolean' ? p.tutorialSeen : true,
      startBoosters: {
        rocket: typeof p.startBoosters?.rocket === 'number' ? p.startBoosters.rocket : DEFAULT.startBoosters.rocket,
        bomb:   typeof p.startBoosters?.bomb   === 'number' ? p.startBoosters.bomb   : DEFAULT.startBoosters.bomb,
        disco:  typeof p.startBoosters?.disco  === 'number' ? p.startBoosters.disco  : DEFAULT.startBoosters.disco,
      },
      winStreak: typeof p.winStreak === 'number' ? p.winStreak : 0,
      starChest: typeof p.starChest === 'number' ? p.starChest : 0,
      chestsOpened: typeof p.chestsOpened === 'number' ? p.chestsOpened : 0,
    };
  } catch {
    return structuredCloneProgress(DEFAULT);
  }
}

export function saveProgress(progress: GameProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function structuredCloneProgress(p: GameProgress): GameProgress {
  return {
    ...p,
    bestScores: { ...p.bestScores },
    levelStars: { ...p.levelStars },
    boosters: { ...p.boosters },
    stats: { ...p.stats },
    achievements: [...p.achievements],
    dailyReward: { ...p.dailyReward },
    startBoosters: { ...p.startBoosters },
  };
}

/** Today's local date as "YYYY-MM-DD", used for daily-reward bookkeeping. */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Number of whole days between two "YYYY-MM-DD" date keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}
