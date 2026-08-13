import { Cell, CellColor, CellType } from './types';

const COLORS: CellColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

let idCounter = 0;
const genId = () => `cell-${++idCounter}-${Math.random().toString(36).slice(2, 6)}`;

export function createCell(row: number, col: number, color?: CellColor): Cell {
  return {
    id: genId(),
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    type: 'normal',
    row,
    col,
  };
}

export function createCrate(row: number, col: number): Cell {
  return {
    id: genId(),
    color: null,
    type: 'crate',
    row,
    col,
    hp: 2,
  };
}

export function createIceCell(row: number, col: number): Cell {
  return {
    id: genId(),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    type: 'ice',
    row,
    col,
    hp: 1,
  };
}

/**
 * Stone block. Unlike a crate (chips away when you clear next to it) or ice
 * (thaws from a neighbouring blast), a stone ignores adjacency entirely — the
 * only thing that removes it is a power-up blast landing on the stone itself.
 * It has no color, so it never counts toward a level goal; it is pure blocker,
 * and the reason to build rockets and bombs instead of grinding small matches.
 */
export function createStone(row: number, col: number): Cell {
  return {
    id: genId(),
    color: null,
    type: 'stone',
    row,
    col,
  };
}

export function createBoard(rows: number, cols: number, crateCount = 0, iceCount = 0, stoneCount = 0): Cell[][] {
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => createCell(r, c))
  );

  if (crateCount > 0) {
    // Place crates in random positions in the bottom two-thirds of the board
    const candidates: [number, number][] = [];
    for (let r = Math.floor(rows / 3); r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        candidates.push([r, c]);
      }
    }
    // Fisher-Yates shuffle then take first crateCount
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, crateCount).forEach(([r, c]) => {
      board[r][c] = createCrate(r, c);
    });
  }

  if (iceCount > 0) {
    // Place ice in random normal cells in the upper two-thirds of the board
    const iceCandidates: [number, number][] = [];
    for (let r = 0; r < Math.ceil(rows * 2 / 3); r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].type === 'normal') iceCandidates.push([r, c]);
      }
    }
    for (let i = iceCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [iceCandidates[i], iceCandidates[j]] = [iceCandidates[j], iceCandidates[i]];
    }
    iceCandidates.slice(0, iceCount).forEach(([r, c]) => {
      board[r][c] = createIceCell(r, c);
    });
  }

  if (stoneCount > 0) {
    // Stones sit in the middle band: high enough to break up the board, low
    // enough that they cannot wall off the top where new cells drop in.
    const stoneCandidates: [number, number][] = [];
    for (let r = Math.floor(rows / 4); r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].type === 'normal') stoneCandidates.push([r, c]);
      }
    }
    for (let i = stoneCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stoneCandidates[i], stoneCandidates[j]] = [stoneCandidates[j], stoneCandidates[i]];
    }
    stoneCandidates.slice(0, stoneCount).forEach(([r, c]) => {
      board[r][c] = createStone(r, c);
    });
  }

  return board;
}

// BFS flood fill to find connected cells of same color
export function findGroup(board: Cell[][], startRow: number, startCol: number): [number, number][] {
  const cell = board[startRow][startCol];
  if (!cell || !cell.color || cell.type !== 'normal') return [];

  const color = cell.color;
  const rows = board.length;
  const cols = board[0].length;
  const visited = new Set<string>();
  const group: [number, number][] = [];
  const queue: [number, number][] = [[startRow, startCol]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const curr = board[r]?.[c];
    if (!curr || curr.color !== color || curr.type !== 'normal') continue;

    group.push([r, c]);

    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        queue.push([nr, nc]);
      }
    }
  }

  return group;
}

// Determine what power-up to create based on group size
export function getPowerUpForGroup(size: number): CellType {
  if (size >= 7) return 'disco';
  if (size >= 5) return 'bomb';
  if (size >= 4) return 'rocket';
  return 'normal';
}

// Apply gravity - cells fall down to fill empty spots
export function applyGravity(board: Cell[][]): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => [...row]);

  for (let c = 0; c < cols; c++) {
    // Collect non-empty cells in column (bottom to top)
    const stack: Cell[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const cell = newBoard[r][c];
      if (cell.type !== 'empty' && !(cell.type === 'crate' && (cell.hp ?? 0) <= 0)) {
        stack.push({ ...cell });
      }
    }

    // Fill from bottom, tracking how far each cell fell
    for (let r = rows - 1; r >= 0; r--) {
      if (stack.length > 0) {
        const cell = stack.shift()!;
        const fallDist = r - cell.row;
        newBoard[r][c] = {
          ...cell,
          row: r,
          col: c,
          fallDistance: fallDist > 0 ? fallDist : undefined,
        };
      } else {
        // New cell dropping in from above the board
        newBoard[r][c] = { ...createCell(r, c), new: true, fallDistance: r + 1 };
      }
    }
  }

  return newBoard;
}

// Get all cells in a row
export function getRow(board: Cell[][], row: number): [number, number][] {
  return board[row].map((_, c) => [row, c] as [number, number]);
}

// Get all cells in a column
export function getCol(board: Cell[][], col: number): [number, number][] {
  return board.map((_, r) => [r, col] as [number, number]);
}

// Get cells in 3x3 area around a point
export function getArea(board: Cell[][], row: number, col: number, radius = 1): [number, number][] {
  const result: [number, number][] = [];
  const rows = board.length;
  const cols = board[0].length;
  for (let r = row - radius; r <= row + radius; r++) {
    for (let c = col - radius; c <= col + radius; c++) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        result.push([r, c]);
      }
    }
  }
  return result;
}

// Get all cells of a specific color
export function getCellsByColor(board: Cell[][], color: CellColor): [number, number][] {
  const result: [number, number][] = [];
  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.color === color) result.push([r, c]);
    });
  });
  return result;
}

// Apply rocket power-up effect
export function applyRocket(board: Cell[][], row: number, col: number): [number, number][] {
  const rowCells = getRow(board, row);
  const colCells = getCol(board, col);
  return [...rowCells, ...colCells];
}

// Apply bomb power-up effect
export function applyBomb(board: Cell[][], row: number, col: number): [number, number][] {
  return getArea(board, row, col, 2);
}

function uniquePositions(positions: [number, number][]): [number, number][] {
  const seen = new Set<string>();
  const result: [number, number][] = [];
  for (const [r, c] of positions) {
    const key = `${r},${c}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push([r, c]);
    }
  }
  return result;
}

// Combine two adjacent power-ups into one giant "mega" effect — the classic
// blast-game payoff for setting up two specials next to each other.
//   rocket + rocket -> clears both rows AND both columns (huge cross)
//   rocket + bomb   -> "laser net": 3 rows + 3 columns wiped around both cells
//   bomb + bomb     -> double-radius explosion spanning both centers
//   disco + rocket  -> every cell of the most common color becomes a rocket and fires
//   disco + bomb    -> every cell of the most common color becomes a bomb and detonates
//   disco + disco   -> clears the entire board
export function applyCombo(
  board: Cell[][],
  r1: number, c1: number, type1: CellType,
  r2: number, c2: number, type2: CellType
): [number, number][] {
  const base: [number, number][] = [[r1, c1], [r2, c2]];
  const posOf = (t: CellType): [number, number] => (type1 === t ? [r1, c1] : [r2, c2]);

  if (type1 === 'disco' && type2 === 'disco') {
    const all: [number, number][] = [];
    board.forEach((row, r) => row.forEach((_, c) => all.push([r, c])));
    return all;
  }

  if (type1 === 'disco' || type2 === 'disco') {
    const otherType = type1 === 'disco' ? type2 : type1;
    const colorCount: Record<string, number> = {};
    board.forEach(row => row.forEach(cell => {
      if (cell.color && cell.type === 'normal') colorCount[cell.color] = (colorCount[cell.color] || 0) + 1;
    }));
    const mostCommon = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0]?.[0] as CellColor | undefined;
    const targets = mostCommon ? getCellsByColor(board, mostCommon) : [];
    const positions: [number, number][] = [...base, ...targets];
    targets.forEach(([r, c]) => {
      if (otherType === 'rocket') positions.push(...getRow(board, r), ...getCol(board, c));
      else positions.push(...getArea(board, r, c, 2));
    });
    return uniquePositions(positions);
  }

  if (type1 === 'rocket' && type2 === 'rocket') {
    return uniquePositions([
      ...base,
      ...getRow(board, r1), ...getRow(board, r2),
      ...getCol(board, c1), ...getCol(board, c2),
    ]);
  }

  if ((type1 === 'rocket' && type2 === 'bomb') || (type1 === 'bomb' && type2 === 'rocket')) {
    const [rr, rc] = posOf('rocket');
    const [br, bc] = posOf('bomb');
    void rc;
    const rows = [rr - 1, rr, rr + 1].filter(r => r >= 0 && r < board.length);
    const cols = [bc - 1, bc, bc + 1].filter(c => c >= 0 && c < board[0].length);
    const positions: [number, number][] = [...base];
    rows.forEach(r => positions.push(...getRow(board, r)));
    cols.forEach(c => positions.push(...getCol(board, c)));
    positions.push(...getArea(board, br, bc, 1));
    return uniquePositions(positions);
  }

  // bomb + bomb
  return uniquePositions([
    ...base,
    ...getArea(board, r1, c1, 3),
    ...getArea(board, r2, c2, 3),
  ]);
}

// Apply disco ball effect
export function applyDisco(board: Cell[][], _row: number, _col: number): [number, number][] {
  // Find most common color
  const colorCount: Record<string, number> = {};
  board.forEach(r => r.forEach(cell => {
    if (cell.color && cell.type === 'normal') {
      colorCount[cell.color] = (colorCount[cell.color] || 0) + 1;
    }
  }));
  const mostCommon = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0]?.[0] as CellColor;
  if (!mostCommon) return [];
  return getCellsByColor(board, mostCommon);
}

// Damage crates adjacent to cleared positions; returns updated board + list of destroyed crate positions
export function damageCrates(
  board: Cell[][],
  clearedPositions: [number, number][]
): { board: Cell[][]; destroyed: [number, number][] } {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const clearedSet = new Set(clearedPositions.map(([r, c]) => `${r},${c}`));
  const destroyed: [number, number][] = [];
  const damaged = new Set<string>();

  for (const [r, c] of clearedPositions) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (
        nr < 0 || nr >= board.length || nc < 0 || nc >= board[0].length ||
        clearedSet.has(key) || damaged.has(key)
      ) continue;

      const neighbor = newBoard[nr][nc];
      if (neighbor.type !== 'crate') continue;

      damaged.add(key);
      const newHp = (neighbor.hp ?? 2) - 1;
      if (newHp <= 0) {
        newBoard[nr][nc] = { ...neighbor, type: 'empty', color: null, hp: 0, exploding: true };
        destroyed.push([nr, nc]);
      } else {
        newBoard[nr][nc] = { ...neighbor, hp: newHp };
      }
    }
  }

  return { board: newBoard, destroyed };
}

// Thaw ice cells adjacent to cleared positions; returns updated board + list of broken positions
export function damageIce(
  board: Cell[][],
  clearedPositions: [number, number][]
): { board: Cell[][]; broken: [number, number][] } {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const clearedSet = new Set(clearedPositions.map(([r, c]) => `${r},${c}`));
  const broken: [number, number][] = [];
  const damaged = new Set<string>();

  for (const [r, c] of clearedPositions) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (
        nr < 0 || nr >= board.length || nc < 0 || nc >= board[0].length ||
        clearedSet.has(key) || damaged.has(key)
      ) continue;

      const neighbor = newBoard[nr][nc];
      if (neighbor.type !== 'ice') continue;

      damaged.add(key);
      // Ice has 1 hp — convert to normal cell (same color), ready to be matched
      newBoard[nr][nc] = { ...neighbor, type: 'normal', hp: undefined };
      broken.push([nr, nc]);
    }
  }

  return { board: newBoard, broken };
}

/**
 * Counts stones caught in a blast. Stones are cleared by `removeCells` like any
 * other targeted cell, so this exists purely to score and report them.
 *
 * Note that a disco ball never hits one: it selects cells by color, and stones
 * have none. Rockets, bombs and combos clear by geometry, so those do.
 */
export function countStonesHit(board: Cell[][], positions: [number, number][]): number {
  // Positions can repeat — a rocket returns its row and its column, which share
  // the origin cell — so count distinct coordinates or the score double-dips.
  const seen = new Set<string>();
  let hits = 0;
  for (const [r, c] of positions) {
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (board[r]?.[c]?.type === 'stone') hits++;
  }
  return hits;
}

// Remove cells from board (set to null) and return new board
export function removeCells(board: Cell[][], positions: [number, number][]): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const posSet = new Set(positions.map(([r, c]) => `${r},${c}`));
  
  for (let r = 0; r < newBoard.length; r++) {
    for (let c = 0; c < newBoard[r].length; c++) {
      if (posSet.has(`${r},${c}`)) {
        newBoard[r][c] = {
          ...newBoard[r][c],
          type: 'empty',
          exploding: true,
        };
      }
    }
  }
  return newBoard;
}

// Count removed cells by color
export function countByColor(board: Cell[][], positions: [number, number][]): Partial<Record<CellColor, number>> {
  const counts: Partial<Record<CellColor, number>> = {};
  positions.forEach(([r, c]) => {
    const cell = board[r]?.[c];
    if (cell?.color && cell.type !== 'empty') {
      counts[cell.color] = (counts[cell.color] || 0) + 1;
    }
  });
  return counts;
}

// Check if level targets are met
export function checkWin(targets: Partial<Record<CellColor, number>>): boolean {
  return Object.values(targets).every(v => (v ?? 0) <= 0);
}

// Check if there are any valid moves
export function hasValidMoves(board: Cell[][]): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const group = findGroup(board, r, c);
      if (group.length >= 2) return true;
    }
  }
  // A power-up is always playable on its own. Obstacles are NOT: crates, ice and
  // stones cannot be tapped, so counting them here would report a board full of
  // blockers as playable and suppress the reshuffle that rescues it.
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const t = board[r][c].type;
      if (t === 'rocket' || t === 'bomb' || t === 'disco') return true;
    }
  }
  return false;
}

/**
 * Redeals the colors of the loose cells until the board has a legal move again.
 *
 * Crates, ice and power-ups keep their exact positions — only the matchable
 * colors are redistributed — so a reshuffle never quietly rearranges the
 * obstacles the player has been working around.
 */
export function shuffleBoard(board: Cell[][]): Cell[][] {
  const pool: CellColor[] = [];
  board.forEach(row => row.forEach(cell => {
    if (cell.type === 'normal' && cell.color) pool.push(cell.color);
  }));
  if (pool.length === 0) return board;

  for (let attempt = 0; attempt < 30; attempt++) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let k = 0;
    const next = board.map(row => row.map(cell =>
      cell.type === 'normal' && cell.color
        ? { ...cell, color: shuffled[k++], new: true, exploding: false, fallDistance: undefined }
        : { ...cell, exploding: false, fallDistance: undefined }
    ));
    if (hasValidMoves(next)) return next;
  }

  // Pathological board (too few loose cells to ever pair up) — deal fresh
  // colors rather than leaving the player staring at a dead board.
  return board.map(row => row.map(cell =>
    cell.type === 'normal' ? { ...createCell(cell.row, cell.col), new: true } : cell
  ));
}

export function calculateStars(movesRemaining: number, totalMoves: number): number {
  const ratio = movesRemaining / totalMoves;
  if (ratio > 0.5) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

export function createPowerUpCell(row: number, col: number, color: CellColor, type: CellType): Cell {
  return {
    id: genId(),
    color,
    type,
    row,
    col,
    new: true,
  };
}
