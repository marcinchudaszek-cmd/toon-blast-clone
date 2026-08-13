import { DailyRewardState, daysBetween, todayKey } from './storage';

export interface DailyRewardOffer {
  streak: number; // the streak this claim would represent (1-based)
  hammer: number;
  extraMoves: number;
  colorBomb: number;
}

const CYCLE_LENGTH = 7;

// Escalating 7-day reward cycle that loops, capped by a jackpot on day 7 —
// gives players a reason to open the game daily without being mandatory.
const REWARD_SCHEDULE: Omit<DailyRewardOffer, 'streak'>[] = [
  { hammer: 1, extraMoves: 0, colorBomb: 0 },
  { hammer: 0, extraMoves: 1, colorBomb: 0 },
  { hammer: 1, extraMoves: 0, colorBomb: 1 },
  { hammer: 0, extraMoves: 1, colorBomb: 0 },
  { hammer: 1, extraMoves: 1, colorBomb: 0 },
  { hammer: 1, extraMoves: 0, colorBomb: 1 },
  { hammer: 2, extraMoves: 2, colorBomb: 2 }, // day-7 jackpot
];

/** True when the player hasn't claimed their reward yet today. */
export function isClaimAvailable(state: DailyRewardState): boolean {
  if (!state.lastClaimedDate) return true;
  return state.lastClaimedDate !== todayKey();
}

/** Computes what the player would receive if they claimed right now (without mutating anything). */
export function getDailyOffer(state: DailyRewardState): DailyRewardOffer {
  let nextStreak = 1;
  if (state.lastClaimedDate) {
    const gap = daysBetween(state.lastClaimedDate, todayKey());
    // Claimed yesterday -> streak continues; any bigger gap -> streak resets to day 1
    nextStreak = gap === 1 ? state.streak + 1 : 1;
  }
  const reward = REWARD_SCHEDULE[(nextStreak - 1) % CYCLE_LENGTH];
  return { streak: nextStreak, ...reward };
}
