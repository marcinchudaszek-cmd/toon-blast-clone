/**
 * Headless play engine used by the level-balancing scripts.
 *
 * It drives the *real* rules from src/game/logic.ts (same board generation,
 * same power-ups, same gravity, same crate/ice damage), so difficulty numbers
 * are measured against the shipping game rather than an approximation of it.
 *
 * The bot plays a strong greedy strategy: it considers every matchable group,
 * every power-up sitting on the board and every adjacent power-up pair (combo),
 * then picks whatever advances the level goals most. It does not use boosters,
 * so a human with boosters should comfortably beat the numbers it reports.
 */
import {
  createBoard,
  findGroup,
  getPowerUpForGroup,
  applyRocket,
  applyBomb,
  applyDisco,
  applyCombo,
  countByColor,
  createPowerUpCell,
  hasValidMoves,
  resolveBlast,
  applyObjectives,
} from '../../src/game/logic';
import type { Cell, CellColor, CellType, LevelConfig, Objectives } from '../../src/game/types';

export type Targets = Partial<Record<CellColor, number>>;
export type ColorWeights = Partial<Record<CellColor, number>>;

/** Swap in a deterministic RNG so every balance run is reproducible. */
export function setSeed(seed: number): void {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POWER_UPS: CellType[] = ['rocket', 'bomb', 'disco'];
const isPowerUp = (t: CellType) => POWER_UPS.includes(t);

interface Candidate {
  positions: [number, number][];
  /** Power-up to spawn after the blast, when the move matched 4+ cells. */
  spawn?: { row: number; col: number; color: CellColor; type: CellType };
  value: number;
}

/** Every distinct matchable group of 2+ cells currently on the board. */
function allGroups(board: Cell[][]): [number, number][][] {
  const seen = new Set<number>();
  const cols = board[0].length;
  const out: [number, number][][] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < cols; c++) {
      if (seen.has(r * cols + c)) continue;
      const cell = board[r][c];
      if (!cell.color || cell.type !== 'normal') continue;
      const g = findGroup(board, r, c);
      for (const [gr, gc] of g) seen.add(gr * cols + gc);
      if (g.length >= 2) out.push(g);
    }
  }
  return out;
}

/**
 * Counts crates/ice that a blast would hit, without cloning the board.
 * Mirrors the adjacency rule in damageCrates/damageIce closely enough for
 * move scoring; the real functions still run for the move that gets played.
 */
function countObstacleHits(board: Cell[][], positions: [number, number][]): { crates: number; ice: number; balloons: number } {
  const rows = board.length;
  const cols = board[0].length;
  const cleared = new Set<number>();
  for (const [r, c] of positions) cleared.add(r * cols + c);
  const touched = new Set<number>();
  let crates = 0;
  let ice = 0;
  let balloons = 0;
  for (const key of cleared) {
    const t = board[Math.floor(key / cols)][key % cols].type;
    if (t === 'crate') crates++;
    else if (t === 'ice') ice++;
    else if (t === 'balloon') balloons++;
  }
  for (const [r, c] of positions) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const key = nr * cols + nc;
      if (cleared.has(key) || touched.has(key)) continue;
      touched.add(key);
      const t = board[nr][nc].type;
      if (t === 'crate') crates++;
      else if (t === 'ice') ice++;
      else if (t === 'balloon') balloons++;
    }
  }
  return { crates, ice, balloons };
}

/**
 * How much a move helps the ducks down: every cleared cell below a duck in its
 * column lets it fall one row.
 */
function duckProgress(board: Cell[][], positions: [number, number][]): number {
  const ducks: [number, number][] = [];
  board.forEach((row, r) => row.forEach((cell, c) => { if (cell.type === 'duck') ducks.push([r, c]); }));
  if (!ducks.length) return 0;
  const seen = new Set<string>();
  let n = 0;
  for (const [r, c] of positions) {
    const key = r + ',' + c;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const [dr, dc] of ducks) if (dc === c && r > dr) n++;
  }
  return n;
}

interface ScoreCtx {
  /** Colors the level actually asks for. */
  colors: CellColor[];
  /** Relative size of each color goal, used to find the lagging color. */
  weights: ColorWeights;
  /** Remaining goal per color, or null in "harvest" mode (play for max yield). */
  remaining: Targets | null;
  /** Cells cleared per color so far, used by harvest mode. */
  cleared: Record<string, number>;
  /** Remaining obstacle goals (crates, ice, balloons, ducks). */
  objectives: Objectives;
}

/**
 * Rates a candidate move. Progress on the color that is furthest from its goal
 * counts double — clearing a color you have already finished is worthless, and
 * that is exactly the trap a naive "biggest group wins" bot falls into.
 */
function moveValue(board: Cell[][], positions: [number, number][], ctx: ScoreCtx): number {
  const removed = countByColor(board, positions);
  let laggard: CellColor | null = null;
  let worst = Infinity;
  for (const color of ctx.colors) {
    const w = ctx.weights[color] ?? 1;
    const progress = ctx.remaining
      ? 1 - Math.max(0, ctx.remaining[color] ?? 0) / Math.max(1, w)
      : (ctx.cleared[color] ?? 0) / Math.max(0.001, w);
    if (progress < worst) {
      worst = progress;
      laggard = color;
    }
  }

  let value = 0;
  for (const color of ctx.colors) {
    let gain = removed[color] ?? 0;
    if (ctx.remaining) gain = Math.min(gain, Math.max(0, ctx.remaining[color] ?? 0));
    value += gain * (color === laggard ? 2 : 1);
  }

  const { crates, ice, balloons } = countObstacleHits(board, positions);
  // Obstacles unblock the board; when the level asks for them, they are goals
  // and weigh as much as a goal color.
  const o = ctx.objectives;
  value += crates * ((o.crate ?? 0) > 0 ? 1.4 : 0.6);
  value += ice * ((o.ice ?? 0) > 0 ? 1.2 : 0.4);
  value += balloons * ((o.balloon ?? 0) > 0 ? 1.3 : 0.3);
  if ((o.duck ?? 0) > 0) value += duckProgress(board, positions) * 1.8;
  value += positions.length * 0.05;
  return value;
}

export interface PlayResult {
  won: boolean;
  movesUsed: number;
  /** Total cells cleared per color across the whole attempt. */
  cleared: Record<string, number>;
  /** True when the board ran out of legal moves before the move budget did. */
  stuck: boolean;
}

export interface PlayOptions {
  /** Goals to chase. Omit to play "harvest" mode: maximise the weakest color. */
  targets?: Targets;
  /** Colors that matter, with relative goal sizes (harvest mode). */
  colors?: CellColor[];
  weights?: ColorWeights;
}

/** Plays one full attempt at a level and reports what the bot achieved. */
export function playLevel(config: LevelConfig, opts: PlayOptions = {}): PlayResult {
  let board = createBoard(
    config.rows, config.cols,
    config.crates ?? 0, config.iceCells ?? 0, config.stones ?? 0,
    config.balloons ?? 0, config.ducks ?? 0,
  );
  let objectives: Objectives = { ...(config.goals ?? {}) };
  const objectivesDone = () => Object.values(objectives).every(v => (v ?? 0) <= 0);

  const remaining: Targets | null = opts.targets ? { ...opts.targets } : null;
  const colors = (opts.colors ?? (opts.targets ? (Object.keys(opts.targets) as CellColor[]) : [])) as CellColor[];
  const weights: ColorWeights = opts.weights ?? Object.fromEntries(colors.map(c => [c, remaining?.[c] ?? 1]));
  const cleared: Record<string, number> = {};

  const isWon = () => remaining !== null && colors.every(c => (remaining[c] ?? 0) <= 0) && objectivesDone();

  let moves = config.moves;
  let stuck = false;

  while (moves > 0) {
    if (isWon()) break;
    if (!hasValidMoves(board)) {
      stuck = true;
      break;
    }

    const ctx: ScoreCtx = { colors, weights, remaining, cleared, objectives };
    const cands: Candidate[] = [];
    const cols = board[0].length;

    // Power-ups already on the board, plus any adjacent power-up pair (combo).
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < cols; c++) {
        const type = board[r][c].type;
        if (!isPowerUp(type)) continue;

        let comboed = false;
        for (const [dr, dc] of [[1, 0], [0, 1]] as const) {
          const nr = r + dr;
          const nc = c + dc;
          const neighbor = board[nr]?.[nc];
          if (!neighbor || !isPowerUp(neighbor.type)) continue;
          cands.push({ positions: applyCombo(board, r, c, type, nr, nc, neighbor.type), value: 0 });
          comboed = true;
        }
        if (comboed) continue;

        const positions =
          type === 'rocket' ? applyRocket(board, r, c)
          : type === 'bomb' ? applyBomb(board, r, c)
          : applyDisco(board, r, c);
        cands.push({ positions, value: 0 });
      }
    }

    for (const group of allGroups(board)) {
      const spawnType = getPowerUpForGroup(group.length);
      const head = board[group[0][0]][group[0][1]];
      cands.push({
        positions: group,
        value: 0,
        spawn: spawnType !== 'normal'
          ? {
              // The game spawns the power-up on the lowest row of the group.
              row: [...group].sort((a, b) => b[0] - a[0])[0][0],
              col: group[0][1],
              color: head.color as CellColor,
              type: spawnType,
            }
          : undefined,
      });
    }

    if (cands.length === 0) {
      stuck = true;
      break;
    }

    let best = cands[0];
    best.value = moveValue(board, best.positions, ctx);
    for (let i = 1; i < cands.length; i++) {
      cands[i].value = moveValue(board, cands[i].positions, ctx);
      if (cands[i].value > best.value) best = cands[i];
    }

    const removed = countByColor(board, best.positions);
    const blast = resolveBlast(board, best.positions);
    const next = blast.final;
    objectives = applyObjectives(objectives, blast.hits);
    if (best.spawn) {
      const row = Math.min(best.spawn.row, next.length - 1);
      if (next[row][best.spawn.col].type === 'normal') {
        next[row][best.spawn.col] = createPowerUpCell(row, best.spawn.col, best.spawn.color, best.spawn.type);
      }
    }
    board = next;

    for (const [color, n] of Object.entries(removed)) {
      cleared[color] = (cleared[color] ?? 0) + (n as number);
      if (remaining && color in remaining) {
        remaining[color as CellColor] = Math.max(0, (remaining[color as CellColor] ?? 0) - (n as number));
      }
    }
    moves--;
  }

  return { won: isWon(), movesUsed: config.moves - moves, cleared, stuck };
}

/** Runs a level `trials` times and returns the fraction the bot won. */
export function winRate(config: LevelConfig, trials: number): { rate: number; stuckRate: number } {
  let wins = 0;
  let stucks = 0;
  for (let i = 0; i < trials; i++) {
    const r = playLevel(config, { targets: config.targets });
    if (r.won) wins++;
    if (r.stuck) stucks++;
  }
  return { rate: wins / trials, stuckRate: stucks / trials };
}
