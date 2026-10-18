import type { PowerUpType } from './types';

/** Pre-level boosters: power-ups placed on the board before the first move. */
export type StartBooster = PowerUpType; // 'rocket' | 'bomb' | 'disco'
export const START_BOOSTERS: StartBooster[] = ['rocket', 'bomb', 'disco'];

export const START_BOOSTER_INFO: Record<StartBooster, { icon: string; label: string }> = {
  rocket: { icon: '🚀', label: 'Rakieta' },
  bomb: { icon: '💣', label: 'Bomba' },
  disco: { icon: '🪩', label: 'Disco' },
};

/**
 * Win streak gift (as in Royal Match / Toon Blast): the more levels won in a
 * row, the more free power-ups the next level starts with. Losing — or leaving
 * a level after the first move — resets the streak.
 */
export function streakGift(streak: number): StartBooster[] {
  if (streak >= 3) return ['rocket', 'bomb', 'disco'];
  if (streak === 2) return ['rocket', 'bomb'];
  if (streak === 1) return ['rocket'];
  return [];
}

/**
 * Extra reward for beating a marked level: bonus stars towards the star chest
 * (and the town), and on a "very hard" one a booster of each kind as well.
 */
export function hardBonus(difficulty?: 'hard' | 'superhard'): { stars: number; boosters: number } {
  if (difficulty === 'superhard') return { stars: 4, boosters: 1 };
  if (difficulty === 'hard') return { stars: 2, boosters: 0 };
  return { stars: 0, boosters: 0 };
}

/** Every STAR_CHEST_GOAL stars earned open a star chest. */
export const STAR_CHEST_GOAL = 20;

export interface ChestReward {
  hammer: number;
  extraMoves: number;
  colorBomb: number;
  rocket: number;
  bomb: number;
  disco: number;
}

/**
 * Rewards alternate between two packs so consecutive chests feel different,
 * every fifth chest is a jackpot. `chestNumber` is 1-based.
 */
export function chestReward(chestNumber: number): ChestReward {
  if (chestNumber % 5 === 0) return { hammer: 2, extraMoves: 2, colorBomb: 2, rocket: 2, bomb: 2, disco: 2 };
  if (chestNumber % 2 === 0) return { hammer: 1, extraMoves: 1, colorBomb: 0, rocket: 0, bomb: 1, disco: 1 };
  return { hammer: 1, extraMoves: 0, colorBomb: 1, rocket: 2, bomb: 1, disco: 0 };
}
