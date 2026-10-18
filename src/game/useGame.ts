import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BoosterType, CellColor, CellType, GameState, PendingState, StatsDelta } from './types';
import {
  createBoard,
  findGroup,
  getPowerUpForGroup,
  applyGravity,
  applyRocket,
  applyBomb,
  applyDisco,
  applyCombo,
  removeCells,
  countByColor,
  checkWin,
  createPowerUpCell,
  damageCrates,
  damageIce,
  calculateStars,
  hasValidMoves,
  shuffleBoard,
  countStonesHit,
  placeStartPowerUps,
} from './logic';
import { LEVELS } from './levels';
import { GameProgress, loadProgress, saveProgress, clearProgress, todayKey } from './storage';
import { playPop, playPowerUpCreated, playPowerUpActivate, playCombo, playWin, playLose } from './sound';
import { hapticBlast, hapticCombo, hapticLose, hapticPowerUp, hapticWin } from './haptics';
import { ACHIEVEMENTS, AchievementDef, findNewlyUnlocked } from './achievements';
import { getDailyOffer, isClaimAvailable } from './dailyReward';
import { StartBooster, START_BOOSTERS, streakGift, STAR_CHEST_GOAL, chestReward, ChestReward } from './rewards';

// Booster milestone refill — every Nth completed level rewards the player with
// extra boosters of every type, so they don't run dry on later, harder boards.
export const MILESTONE_INTERVAL = 5;
export const MILESTONE_BOOSTER_AMOUNT = 2;

type Action =
  | { type: 'TAP_CELL'; row: number; col: number }
  | { type: 'APPLY_GRAVITY' }
  | { type: 'NEXT_LEVEL' }
  | { type: 'RESTART_LEVEL' }
  | { type: 'START_GAME' }
  | { type: 'GOTO_MENU' }
  | { type: 'GOTO_LEVEL'; level: number }
  | { type: 'ACTIVATE_BOOSTER'; booster: BoosterType; extraMovesCount?: number }
  | { type: 'CANCEL_BOOSTER' }
  | { type: 'SECOND_CHANCE' }
  | { type: 'BEGIN_LEVEL'; powerUps: CellType[] }
  | { type: 'FINALE_STEP' };

function initLevel(levelIdx: number, prevScore = 0): GameState {
  const config = LEVELS[levelIdx];
  let board = createBoard(
    config.rows, config.cols,
    config.crates ?? 0, config.iceCells ?? 0, config.stones ?? 0
  );
  // A freshly dealt board can be born without a legal move; never hand the
  // player one they cannot touch.
  if (!hasValidMoves(board)) board = shuffleBoard(board);
  return {
    board,
    score: prevScore,
    moves: config.moves,
    level: levelIdx + 1,
    targets: { ...config.targets },
    gameStatus: 'playing',
    combo: 0,
    animating: false,
    pending: null,
    activeBooster: null,
    statsDelta: null,
    shuffleSeq: 0,
    continuesUsed: 0,
    preLevel: true,
    winMoves: null,
  };
}

/**
 * Status after a move. A win with moves to spare goes to the 'finale' first:
 * the leftover moves are fired as rockets (and scored) before the win screen,
 * as in Toon Blast. `winMoves` keeps the count for the star rating.
 */
function endOfMove(won: boolean, finalMoves: number): { gameStatus: GameState['gameStatus']; winMoves: number | null } {
  if (won) return { gameStatus: finalMoves > 0 ? 'finale' : 'won', winMoves: finalMoves };
  return { gameStatus: finalMoves <= 0 ? 'lost' : 'playing', winMoves: null };
}

/** Points per leftover move, and how many are shown as rockets before the rest are cashed in at once. */
export const FINALE_POINTS_PER_MOVE = 100;
const FINALE_MAX_ROCKETS = 10;

/** Moves granted by a "+5 moves" second chance after running dry. */
export const SECOND_CHANCE_MOVES = 5;

let statsSeq = 0;
function nextStatsDelta(partial: Omit<StatsDelta, 'seq'>): StatsDelta {
  statsSeq += 1;
  return { seq: statsSeq, ...partial };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
      return initLevel(0);

    case 'GOTO_LEVEL': {
      const idx = Math.min(action.level - 1, LEVELS.length - 1);
      return initLevel(idx);
    }

    case 'NEXT_LEVEL': {
      const nextIdx = state.level;
      if (nextIdx >= LEVELS.length) {
        return { ...state, gameStatus: 'won', level: LEVELS.length + 1 };
      }
      return initLevel(nextIdx, state.score);
    }

    case 'GOTO_MENU':
      return { ...state, gameStatus: 'idle', animating: false, pending: null, activeBooster: null };

    case 'RESTART_LEVEL':
      return initLevel(state.level - 1);

    case 'APPLY_GRAVITY': {
      if (!state.pending) return { ...state, animating: false };
      const settled: GameState = {
        ...state,
        ...state.pending,
        animating: false,
        pending: null,
      };
      // The board can settle into a position with no legal move left. Redeal it
      // instead of making the player burn their remaining moves on nothing.
      if (settled.gameStatus === 'playing' && !hasValidMoves(settled.board)) {
        return {
          ...settled,
          board: shuffleBoard(settled.board),
          shuffleSeq: settled.shuffleSeq + 1,
        };
      }
      return settled;
    }

    case 'SECOND_CHANCE': {
      if (state.gameStatus !== 'lost' || state.continuesUsed >= 1) return state;
      let board = state.board;
      if (!hasValidMoves(board)) board = shuffleBoard(board);
      return {
        ...state,
        board,
        gameStatus: 'playing',
        moves: SECOND_CHANCE_MOVES,
        continuesUsed: state.continuesUsed + 1,
        animating: false,
        pending: null,
        activeBooster: null,
      };
    }

    case 'ACTIVATE_BOOSTER': {
      if (state.gameStatus !== 'playing' || state.animating || state.preLevel) return state;
      // extraMoves booster applies immediately (no cell tap needed)
      if (action.booster === 'extraMoves') {
        return { ...state, moves: state.moves + (action.extraMovesCount ?? 3), activeBooster: null };
      }
      // hammer & colorBomb need a cell tap — just arm them
      // colorBomb fires immediately without needing a cell tap
      if (action.booster === 'colorBomb') {
        // Apply disco-style: remove all cells of most common color, cost 1 move
        const cleanBoard = state.board.map(r =>
          r.map(c => ({ ...c, exploding: false, new: false, fallDistance: undefined }))
        );
        const positions = applyDisco(cleanBoard, 0, 0);
        if (positions.length === 0) return { ...state, activeBooster: null };

        const removed = countByColor(state.board, positions);
        let explodingBoard = removeCells(cleanBoard, positions);
        const { board: boardAfterCrates, destroyed } = damageCrates(explodingBoard, positions);
        explodingBoard = boardAfterCrates;
        const { board: boardAfterIce, broken: iceBroken } = damageIce(explodingBoard, positions);
        explodingBoard = boardAfterIce;

        const finalBoard = applyGravity(explodingBoard);
        const finalTargets = { ...state.targets };
        Object.entries(removed).forEach(([color, count]) => {
          const c = color as CellColor;
          if (c in finalTargets) finalTargets[c] = Math.max(0, (finalTargets[c] ?? 0) - count);
        });

        const scoreGain = positions.length * 80 + destroyed.length * 100 + iceBroken.length * 50;
        const finalMoves = state.moves - 1;
        const end = endOfMove(checkWin(finalTargets), finalMoves);
        const bonusPoints = 0;

        const pending: PendingState = {
          board: finalBoard,
          score: state.score + scoreGain,
          moves: finalMoves,
          targets: finalTargets,
          gameStatus: end.gameStatus,
          combo: 0,
        };
        const statsDelta = nextStatsDelta({
          cellsCleared: positions.length,
          powerUpsActivated: 0,
          combosTriggered: 0,
          cratesDestroyed: destroyed.length,
          iceBroken: iceBroken.length,
          comboReached: 0,
          scoreGained: scoreGain + bonusPoints,
        });
        return { ...state, board: explodingBoard, animating: true, pending, activeBooster: null, statsDelta, winMoves: end.winMoves };
      }
      // hammer: arm it, wait for TAP_CELL
      return { ...state, activeBooster: action.booster };
    }

    case 'CANCEL_BOOSTER':
      return { ...state, activeBooster: null };

    case 'TAP_CELL': {
      // A tap during the finale skips the rocket show: cash in the rest at once.
      if (state.gameStatus === 'finale') {
        if (state.pending) {
          const p = state.pending;
          return { ...state, pending: { ...p, score: p.score + p.moves * FINALE_POINTS_PER_MOVE, moves: 0, gameStatus: 'won' } };
        }
        return { ...state, score: state.score + state.moves * FINALE_POINTS_PER_MOVE, moves: 0, gameStatus: 'won' };
      }
      if (state.gameStatus !== 'playing' || state.animating || state.preLevel) return state;

      const { row, col } = action;
      const cell = state.board[row]?.[col];
      if (!cell || cell.type === 'empty') return state;

      // ── Hammer booster: remove single cell, no move consumed ──
      if (state.activeBooster === 'hammer') {
        if (cell.color === null && cell.type !== 'crate') return { ...state, activeBooster: null };

        const cleanBoard = state.board.map(r =>
          r.map(c => ({ ...c, exploding: false, new: false, fallDistance: undefined }))
        );
        const positions: [number, number][] = [[row, col]];
        const removed = countByColor(state.board, positions);
        let explodingBoard = removeCells(cleanBoard, positions);
        const { board: boardAfterCrates, destroyed } = damageCrates(explodingBoard, positions);
        explodingBoard = boardAfterCrates;
        const { board: boardAfterIce, broken: iceBroken } = damageIce(explodingBoard, positions);
        explodingBoard = boardAfterIce;
        const finalBoard = applyGravity(explodingBoard);

        const finalTargets = { ...state.targets };
        Object.entries(removed).forEach(([color, count]) => {
          const c = color as CellColor;
          if (c in finalTargets) finalTargets[c] = Math.max(0, (finalTargets[c] ?? 0) - count);
        });

        const scoreGain = 50 + destroyed.length * 100 + iceBroken.length * 50;
        const end = endOfMove(checkWin(finalTargets), state.moves);
        // hammer doesn't consume a move
        const pending: PendingState = {
          board: finalBoard,
          score: state.score + scoreGain,
          moves: state.moves,
          targets: finalTargets,
          gameStatus: end.gameStatus === 'lost' ? 'playing' : end.gameStatus,
          combo: 0,
        };
        const statsDelta = nextStatsDelta({
          cellsCleared: positions.length,
          powerUpsActivated: 0,
          combosTriggered: 0,
          cratesDestroyed: destroyed.length,
          iceBroken: iceBroken.length,
          comboReached: 0,
          scoreGained: scoreGain,
        });
        return { ...state, board: explodingBoard, animating: true, pending, activeBooster: null, statsDelta, winMoves: end.winMoves };
      }

      // ── Normal tap ──
      if (cell.color === null) return state;

      const cleanBoard = state.board.map(r =>
        r.map(c => ({ ...c, exploding: false, new: false, fallDistance: undefined }))
      );

      let positions: [number, number][] = [];
      let scoreGain = 0;
      let combo = 0;
      let powerUpCol = col;
      let powerUpRow = row;
      let powerUpColor: CellColor | null = null;
      let powerUpType = getPowerUpForGroup(0);
      let powerUpsActivatedCount = 0;
      let combosTriggeredCount = 0;

      const isPowerUpType = (t: CellType) => t === 'rocket' || t === 'bomb' || t === 'disco';

      // ── Power-up combo: tapping a special next to another special triggers a mega effect ──
      let comboPartner: { row: number; col: number; type: 'rocket' | 'bomb' | 'disco' } | null = null;
      if (isPowerUpType(cell.type)) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = row + dr;
          const nc = col + dc;
          const neighbor = cleanBoard[nr]?.[nc];
          if (neighbor && isPowerUpType(neighbor.type)) {
            comboPartner = { row: nr, col: nc, type: neighbor.type as 'rocket' | 'bomb' | 'disco' };
            break;
          }
        }
      }

      if (comboPartner) {
        positions = applyCombo(cleanBoard, row, col, cell.type, comboPartner.row, comboPartner.col, comboPartner.type);
        scoreGain = positions.length * 130;
        combo = state.combo + 2;
        powerUpsActivatedCount = 2;
        combosTriggeredCount = 1;
        playPowerUpActivate('disco');
        playCombo(combo);
        hapticCombo();
      } else if (cell.type === 'rocket') {
        positions = applyRocket(cleanBoard, row, col);
        scoreGain = positions.length * 50;
        combo = state.combo + 1;
        powerUpsActivatedCount = 1;
        playPowerUpActivate('rocket');
        hapticPowerUp();
      } else if (cell.type === 'bomb') {
        positions = applyBomb(cleanBoard, row, col);
        scoreGain = positions.length * 75;
        combo = state.combo + 1;
        powerUpsActivatedCount = 1;
        playPowerUpActivate('bomb');
        hapticPowerUp();
      } else if (cell.type === 'disco') {
        positions = applyDisco(cleanBoard, row, col);
        scoreGain = positions.length * 100;
        combo = state.combo + 1;
        powerUpsActivatedCount = 1;
        playPowerUpActivate('disco');
        hapticPowerUp();
      } else {
        const group = findGroup(cleanBoard, row, col);
        if (group.length < 2) return state;

        powerUpType = getPowerUpForGroup(group.length);
        positions = group;
        scoreGain = group.length * (group.length >= 5 ? 40 : 20);
        combo = 0;

        if (powerUpType !== 'normal') {
          powerUpColor = cell.color as CellColor;
          powerUpCol = col;
          powerUpRow = [...group].sort((a, b) => b[0] - a[0])[0][0];
          playPowerUpCreated(powerUpType as 'rocket' | 'bomb' | 'disco');
          hapticPowerUp();
        } else {
          playPop(positions.length);
          hapticBlast(positions.length);
        }
      }

      const removed = countByColor(state.board, positions);
      let explodingBoard = removeCells(cleanBoard, positions);
      const { board: boardAfterCrates, destroyed } = damageCrates(explodingBoard, positions);
      explodingBoard = boardAfterCrates;
      const { board: boardAfterIce, broken: iceBroken } = damageIce(explodingBoard, positions);
      explodingBoard = boardAfterIce;
      // Stones only ever fall to a power-up, so they are worth rewarding well.
      const stonesHit = countStonesHit(cleanBoard, positions);
      scoreGain += destroyed.length * 100 + iceBroken.length * 50 + stonesHit * 120;

      let finalBoard = applyGravity(explodingBoard);
      if (powerUpType !== 'normal' && powerUpColor) {
        const puRow = Math.min(powerUpRow, finalBoard.length - 1);
        finalBoard[puRow][powerUpCol] = createPowerUpCell(puRow, powerUpCol, powerUpColor, powerUpType);
      }

      const finalTargets = { ...state.targets };
      Object.entries(removed).forEach(([color, count]) => {
        const c = color as CellColor;
        if (c in finalTargets) {
          finalTargets[c] = Math.max(0, (finalTargets[c] ?? 0) - count);
        }
      });

      const finalMoves = state.moves - 1;
      const end = endOfMove(checkWin(finalTargets), finalMoves);

      const pending: PendingState = {
        board: finalBoard,
        score: state.score + scoreGain,
        moves: finalMoves,
        targets: finalTargets,
        gameStatus: end.gameStatus,
        combo,
      };

      const statsDelta = nextStatsDelta({
        cellsCleared: positions.length,
        powerUpsActivated: powerUpsActivatedCount,
        combosTriggered: combosTriggeredCount,
        cratesDestroyed: destroyed.length,
        iceBroken: iceBroken.length,
        comboReached: combo,
        scoreGained: scoreGain,
      });

      return { ...state, board: explodingBoard, animating: true, pending, statsDelta, winMoves: end.winMoves };
    }

    case 'BEGIN_LEVEL': {
      if (!state.preLevel) return state;
      const board = action.powerUps.length ? placeStartPowerUps(state.board, action.powerUps) : state.board;
      return { ...state, board, preLevel: false };
    }

    case 'FINALE_STEP': {
      if (state.gameStatus !== 'finale' || state.animating) return state;
      let moves = state.moves;
      let score = state.score;
      // Long tails are cashed in at once so the show never drags on.
      if (moves > FINALE_MAX_ROCKETS) {
        score += (moves - FINALE_MAX_ROCKETS) * FINALE_POINTS_PER_MOVE;
        moves = FINALE_MAX_ROCKETS;
      }
      const cleanBoard = state.board.map(r =>
        r.map(c => ({ ...c, exploding: false, new: false, fallDistance: undefined }))
      );
      const candidates: [number, number][] = [];
      cleanBoard.forEach((row, r) => row.forEach((cell, c) => {
        if (cell.type === 'normal' && cell.color) candidates.push([r, c]);
      }));
      if (moves <= 0 || candidates.length === 0) {
        return { ...state, board: cleanBoard, score: score + moves * FINALE_POINTS_PER_MOVE, moves: 0, gameStatus: 'won' };
      }
      const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
      const positions = applyRocket(cleanBoard, row, col);
      let explodingBoard = removeCells(cleanBoard, positions);
      explodingBoard = damageCrates(explodingBoard, positions).board;
      explodingBoard = damageIce(explodingBoard, positions).board;
      const gain = FINALE_POINTS_PER_MOVE + positions.length * 10;
      playPowerUpActivate('rocket');
      const pending: PendingState = {
        board: applyGravity(explodingBoard),
        score: score + gain,
        moves: moves - 1,
        targets: state.targets,
        gameStatus: moves - 1 > 0 ? 'finale' : 'won',
        combo: 0,
      };
      return { ...state, score, moves, board: explodingBoard, animating: true, pending };
    }

    default:
      return state;
  }
}

const initialState: GameState = {
  board: createBoard(8, 7),
  score: 0,
  moves: 20,
  level: 1,
  targets: { red: 10, blue: 10 },
  gameStatus: 'idle',
  combo: 0,
  animating: false,
  pending: null,
  activeBooster: null,
  statsDelta: null,
  shuffleSeq: 0,
  continuesUsed: 0,
  preLevel: false,
  winMoves: null,
};

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [progress, setProgress] = useState<GameProgress>(() => loadProgress());

  useEffect(() => {
    if (!state.animating) return;
    const t = setTimeout(() => dispatch({ type: 'APPLY_GRAVITY' }), 280);
    return () => clearTimeout(t);
  }, [state.animating]);

  useEffect(() => {
    if (state.gameStatus === 'won') { playWin(); hapticWin(); }
    if (state.gameStatus === 'lost') { playLose(); hapticLose(); }
  }, [state.gameStatus]);

  useEffect(() => {
    if (state.combo >= 2) playCombo(state.combo);
  }, [state.combo]);

  // Save progress when a level is won
  useEffect(() => {
    if (state.gameStatus !== 'won' || state.level > LEVELS.length) return;
    const config = LEVELS[state.level - 1];
    const stars = calculateStars(state.winMoves ?? state.moves, config.moves);
    // Every MILESTONE_INTERVAL completed levels, refill all booster types —
    // keeps players from running dry on bigger/harder boards later in the game.
    const isMilestone = state.level % MILESTONE_INTERVAL === 0;
    const hammerBonus = (stars === 3 ? 1 : 0) + (isMilestone ? MILESTONE_BOOSTER_AMOUNT : 0);
    const extraMovesBonus = isMilestone ? MILESTONE_BOOSTER_AMOUNT : 0;
    const colorBombBonus = isMilestone ? MILESTONE_BOOSTER_AMOUNT : 0;
    setProgress(prev => {
      const next: GameProgress = {
        ...prev,
        unlockedLevel: Math.max(prev.unlockedLevel, Math.min(state.level + 1, LEVELS.length)),
        bestScores: {
          ...prev.bestScores,
          [state.level]:
            prev.bestScores[state.level] !== undefined
              ? Math.max(prev.bestScores[state.level], state.score)
              : state.score,
        },
        levelStars: {
          ...prev.levelStars,
          [state.level]: Math.max(prev.levelStars[state.level] ?? 0, stars),
        },
        boosters: {
          hammer: prev.boosters.hammer + hammerBonus,
          extraMoves: prev.boosters.extraMoves + extraMovesBonus,
          colorBomb: prev.boosters.colorBomb + colorBombBonus,
        },
        stats: {
          ...prev.stats,
          levelsCompleted: prev.stats.levelsCompleted + 1,
        },
        winStreak: prev.winStreak + 1,
        starChest: prev.starChest + stars,
      };
      saveProgress(next);
      return next;
    });
  }, [state.gameStatus, state.level, state.score, state.moves, state.winMoves]);

  // Finale: fire one leftover move as a rocket every ~0.35 s
  useEffect(() => {
    if (state.gameStatus !== 'finale' || state.animating) return;
    const t = setTimeout(() => dispatch({ type: 'FINALE_STEP' }), 350);
    return () => clearTimeout(t);
  }, [state.gameStatus, state.animating, state.moves]);

  // Fold each move's stats event (cells cleared, power-ups fired, combos, etc.)
  // into the lifetime stats used by the achievements system. `seq` guards against
  // re-processing the same delta on extra renders.
  const lastStatsSeqRef = useRef(0);
  useEffect(() => {
    const delta = state.statsDelta;
    if (!delta || delta.seq === lastStatsSeqRef.current) return;
    lastStatsSeqRef.current = delta.seq;
    setProgress(prev => {
      const next: GameProgress = {
        ...prev,
        stats: {
          ...prev.stats,
          totalScore: prev.stats.totalScore + delta.scoreGained,
          totalCellsCleared: prev.stats.totalCellsCleared + delta.cellsCleared,
          powerUpsActivated: prev.stats.powerUpsActivated + delta.powerUpsActivated,
          combosTriggered: prev.stats.combosTriggered + delta.combosTriggered,
          cratesDestroyed: prev.stats.cratesDestroyed + delta.cratesDestroyed,
          iceBroken: prev.stats.iceBroken + delta.iceBroken,
          bestCombo: Math.max(prev.stats.bestCombo, delta.comboReached),
        },
      };
      saveProgress(next);
      return next;
    });
  }, [state.statsDelta]);

  // Achievement queue: whenever the lifetime stats cross a threshold, unlock the
  // achievement, persist it, and queue a toast for the UI to show one at a time.
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([]);
  useEffect(() => {
    const newIds = findNewlyUnlocked(progress);
    if (newIds.length === 0) return;
    setProgress(prev => {
      const stillNew = newIds.filter(id => !prev.achievements.includes(id));
      if (stillNew.length === 0) return prev;
      const next: GameProgress = { ...prev, achievements: [...prev.achievements, ...stillNew] };
      saveProgress(next);
      return next;
    });
    setAchievementQueue(q => {
      const known = new Set(q.map(a => a.id));
      const additions = newIds
        .filter(id => !known.has(id))
        .map(id => ACHIEVEMENTS.find(a => a.id === id))
        .filter((a): a is AchievementDef => !!a);
      return additions.length ? [...q, ...additions] : q;
    });
  }, [progress]);

  const dismissAchievementToast = useCallback(() => {
    setAchievementQueue(q => q.slice(1));
  }, []);

  // ── Daily login reward ──
  const canClaimDaily = isClaimAvailable(progress.dailyReward);
  const dailyOffer = getDailyOffer(progress.dailyReward);
  const claimDailyReward = useCallback(() => {
    setProgress(prev => {
      if (!isClaimAvailable(prev.dailyReward)) return prev;
      const offer = getDailyOffer(prev.dailyReward);
      const next: GameProgress = {
        ...prev,
        boosters: {
          hammer: prev.boosters.hammer + offer.hammer,
          extraMoves: prev.boosters.extraMoves + offer.extraMoves,
          colorBomb: prev.boosters.colorBomb + offer.colorBomb,
        },
        dailyReward: { lastClaimedDate: todayKey(), streak: offer.streak },
      };
      saveProgress(next);
      return next;
    });
  }, []);

  const tapCell = useCallback((row: number, col: number) => {
    dispatch({ type: 'TAP_CELL', row, col });
  }, []);

  /**
   * Leaving a level that was lost, or abandoning one after the first move,
   * ends the win streak (otherwise quitting a bad board would keep it alive).
   */
  const breakStreakIfAbandoned = () => {
    const config = LEVELS[state.level - 1];
    const started = !state.preLevel && !!config && (state.moves < config.moves || state.score > 0 || state.continuesUsed > 0);
    const abandoned = state.gameStatus === 'lost' || (state.gameStatus === 'playing' && started);
    if (!abandoned) return;
    setProgress(prev => {
      if (prev.winStreak === 0) return prev;
      const next = { ...prev, winStreak: 0 };
      saveProgress(next);
      return next;
    });
  };

  const nextLevel = useCallback(() => {
    dispatch({ type: 'NEXT_LEVEL' });
  }, []);

  const restartLevel = () => {
    breakStreakIfAbandoned();
    dispatch({ type: 'RESTART_LEVEL' });
  };

  /** Free power-ups the next level starts with, from the current win streak. */
  const streakPowerUps = streakGift(progress.winStreak);

  /**
   * Closes the pre-level screen: places the streak gift plus the boosters the
   * player picked (each one taken from the inventory).
   */
  const beginLevel = (picked: StartBooster[]) => {
    const usable = picked.filter(b => progress.startBoosters[b] > 0);
    if (usable.length) {
      setProgress(prev => {
        const sb = { ...prev.startBoosters };
        usable.forEach(b => { sb[b] = Math.max(0, sb[b] - 1); });
        const next = { ...prev, startBoosters: sb };
        saveProgress(next);
        return next;
      });
    }
    dispatch({ type: 'BEGIN_LEVEL', powerUps: [...streakPowerUps, ...usable] });
  };

  /** Opens one star chest if enough stars are collected; returns what it gave. */
  const openStarChest = (): ChestReward | null => {
    if (progress.starChest < STAR_CHEST_GOAL) return null;
    const reward = chestReward(progress.chestsOpened + 1);
    setProgress(prev => {
      if (prev.starChest < STAR_CHEST_GOAL) return prev;
      const next: GameProgress = {
        ...prev,
        starChest: prev.starChest - STAR_CHEST_GOAL,
        chestsOpened: prev.chestsOpened + 1,
        boosters: {
          hammer: prev.boosters.hammer + reward.hammer,
          extraMoves: prev.boosters.extraMoves + reward.extraMoves,
          colorBomb: prev.boosters.colorBomb + reward.colorBomb,
        },
        startBoosters: {
          rocket: prev.startBoosters.rocket + reward.rocket,
          bomb: prev.startBoosters.bomb + reward.bomb,
          disco: prev.startBoosters.disco + reward.disco,
        },
      };
      saveProgress(next);
      return next;
    });
    return reward;
  };

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const gotoLevel = (level: number) => {
    if (state.gameStatus !== 'idle') breakStreakIfAbandoned();
    dispatch({ type: 'GOTO_LEVEL', level });
  };

  const resetProgress = useCallback(() => {
    clearProgress();
    setProgress(loadProgress());
  }, []);

  const useBooster = useCallback((booster: BoosterType) => {
    // Read current count directly from progress state (closure) — no setter needed for the guard
    setProgress(prev => {
      if (prev.boosters[booster] <= 0) return prev;
      const next: GameProgress = {
        ...prev,
        boosters: { ...prev.boosters, [booster]: prev.boosters[booster] - 1 },
      };
      saveProgress(next);
      return next;
    });
    // dispatch OUTSIDE the updater (side-effects must not live inside setState callbacks)
    dispatch({ type: 'ACTIVATE_BOOSTER', booster, extraMovesCount: 3 });
  }, []);

  // One "+5 moves" rescue per attempt, paid for with an ⌛ booster. Running out
  // of moves one match short is the moment players quit, so it is worth a lot
  // to let them buy their way back in instead of losing the whole board.
  const canUseSecondChance =
    state.gameStatus === 'lost' &&
    state.continuesUsed < 1 &&
    progress.boosters.extraMoves > 0;

  const useSecondChance = useCallback(() => {
    // Read the count from the rendered state: a setProgress updater does not run
    // synchronously, so it cannot decide whether to dispatch.
    if (progress.boosters.extraMoves <= 0) return;
    setProgress(prev => {
      if (prev.boosters.extraMoves <= 0) return prev;
      const next: GameProgress = {
        ...prev,
        boosters: { ...prev.boosters, extraMoves: prev.boosters.extraMoves - 1 },
      };
      saveProgress(next);
      return next;
    });
    dispatch({ type: 'SECOND_CHANCE' });
  }, [progress.boosters.extraMoves]);

  const markTutorialSeen = useCallback(() => {
    setProgress(prev => {
      if (prev.tutorialSeen) return prev;
      const next: GameProgress = { ...prev, tutorialSeen: true };
      saveProgress(next);
      return next;
    });
  }, []);

  const gotoMenu = () => {
    // Leaving during the finale would lose the win: finish it instead.
    if (state.gameStatus === 'finale') { dispatch({ type: 'TAP_CELL', row: 0, col: 0 }); return; }
    breakStreakIfAbandoned();
    dispatch({ type: 'GOTO_MENU' });
  };

  const cancelBooster = useCallback(() => {
    dispatch({ type: 'CANCEL_BOOSTER' });
  }, []);

  return {
    state,
    tapCell,
    nextLevel,
    restartLevel,
    startGame,
    gotoMenu,
    gotoLevel,
    totalLevels: LEVELS.length,
    progress,
    resetProgress,
    calculateStars,
    useBooster,
    cancelBooster,
    canUseSecondChance,
    useSecondChance,
    markTutorialSeen,
    secondChanceMoves: SECOND_CHANCE_MOVES,
    achievements: ACHIEVEMENTS,
    achievementToast: achievementQueue[0] ?? null,
    dismissAchievementToast,
    canClaimDaily,
    dailyOffer,
    claimDailyReward,
    beginLevel,
    streakPowerUps,
    startBoosterTypes: START_BOOSTERS,
    openStarChest,
    starChestGoal: STAR_CHEST_GOAL,
  };
}
