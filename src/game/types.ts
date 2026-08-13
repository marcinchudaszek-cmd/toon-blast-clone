export type CellColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type PowerUpType = 'rocket' | 'bomb' | 'disco';

export type CellType = 'normal' | 'rocket' | 'bomb' | 'disco' | 'empty' | 'crate' | 'ice' | 'stone';

export type BoosterType = 'hammer' | 'extraMoves' | 'colorBomb';

export interface Cell {
  id: string;
  color: CellColor | null;
  type: CellType;
  row: number;
  col: number;
  fallDistance?: number;
  new?: boolean;
  exploding?: boolean;
  hp?: number; // for crates: hits remaining (2 = intact, 1 = cracked)
}

export interface LevelConfig {
  level: number;
  rows: number;
  cols: number;
  moves: number;
  targets: Partial<Record<CellColor, number>>;
  name: string;
  crates?: number; // how many crates to place randomly
  iceCells?: number; // how many ice-frozen cells to place randomly
  stones?: number; // how many stone blocks to place randomly (power-ups only)
}

// Lightweight, fire-once-per-action bookkeeping event consumed by useGame to
// accumulate lifetime player stats (used for achievements). `seq` lets the
// effect distinguish a genuinely new event from a re-render with the same data.
export interface StatsDelta {
  seq: number;
  cellsCleared: number;
  powerUpsActivated: number;
  combosTriggered: number;
  cratesDestroyed: number;
  iceBroken: number;
  comboReached: number;
  scoreGained: number;
}

export interface PendingState {
  board: Cell[][];
  score: number;
  moves: number;
  targets: Partial<Record<CellColor, number>>;
  gameStatus: 'playing' | 'won' | 'lost' | 'idle';
  combo: number;
}

export interface GameState {
  board: Cell[][];
  score: number;
  moves: number;
  level: number;
  targets: Partial<Record<CellColor, number>>;
  gameStatus: 'playing' | 'won' | 'lost' | 'idle';
  combo: number;
  animating: boolean;
  pending: PendingState | null;
  activeBooster: BoosterType | null; // booster waiting for cell tap (hammer)
  statsDelta: StatsDelta | null; // most recent stats event for the lifetime-stats accumulator
  shuffleSeq: number; // bumped whenever a dead board is reshuffled, so the UI can announce it
  continuesUsed: number; // "+5 moves" second chances spent on the current attempt
}
