import React, { useState } from 'react';
import { Cell } from '../game/types';
import { GameCell } from './GameCell';
import { findGroup, DUCK_WATER_ROWS } from '../game/logic';

interface GameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  animating?: boolean;
  /** Cells to pulse as a hint after the player has been idle ("r,c" keys). */
  hintCells?: Set<string>;
}

const GAP = 4;
const CELL_MAX = 50;
const CELL_MIN = 26;

function calcCellSize(rows: number, cols: number): number {
  // Available width: viewport (capped at 448px = max-w-md) minus outer padding (p-3 = 12px × 2)
  // minus board inner padding (p-2 = 8px × 2)
  const vw = Math.min(window.innerWidth, 448);
  const availW = vw - 24 - 16;
  const byWidth = Math.floor((availW - (cols - 1) * GAP) / cols);

  // Available height: viewport minus fixed UI overhead
  // (header ~60px + boosters ~64px + targets ~80px + moves bar ~64px + misc padding ~60px = ~328px)
  const availH = window.innerHeight - 328;
  const byHeight = Math.floor((availH - (rows - 1) * GAP) / rows);

  return Math.max(CELL_MIN, Math.min(CELL_MAX, byWidth, byHeight));
}

export const GameBoard: React.FC<GameBoardProps> = ({ board, onCellClick, animating = false, hintCells }) => {
  const [hoveredGroup, setHoveredGroup] = useState<Set<string>>(new Set());

  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  const CELL_SIZE = calcCellSize(rows, cols);

  const boardWidth = cols * CELL_SIZE + (cols - 1) * GAP;
  const boardHeight = rows * CELL_SIZE + (rows - 1) * GAP;

  const handleMouseEnter = (r: number, c: number) => {
    if (animating) return;
    const cell = board[r]?.[c];
    if (!cell || !cell.color || cell.type !== 'normal') {
      setHoveredGroup(new Set());
      return;
    }
    const group = findGroup(board, r, c);
    if (group.length >= 2) {
      setHoveredGroup(new Set(group.map(([gr, gc]) => `${gr},${gc}`)));
    } else {
      setHoveredGroup(new Set());
    }
  };

  const handleMouseLeave = () => {
    setHoveredGroup(new Set());
  };

  return (
    <div
      className="relative rounded-2xl p-2"
      style={{
        width: boardWidth + 16,
        height: boardHeight + 16,
        background: 'linear-gradient(to bottom, rgba(10, 30, 80, 0.7), rgba(5, 15, 50, 0.8))',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Water where ducks get rescued — only on boards that have ducks */}
      {board.some(row => row.some(c => c.type === 'duck')) && (
        <div
          className="absolute left-0 right-0 bottom-0 rounded-b-2xl pointer-events-none"
          style={{
            height: DUCK_WATER_ROWS * (CELL_SIZE + GAP) + 8,
            background: 'linear-gradient(to bottom, rgba(56,189,248,0.15), rgba(14,165,233,0.45))',
            borderTop: '2px dashed rgba(125,211,252,0.7)',
          }}
        />
      )}

      {/* Background grid */}
      <div
        className="absolute inset-0 rounded-xl opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: `${CELL_SIZE + GAP}px ${CELL_SIZE + GAP}px`,
          backgroundPosition: '8px 8px',
        }}
      />

      <div
        className="relative"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
          gap: GAP,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isInGroup = hoveredGroup.has(key);
            return (
              <div
                key={cell.id}
                data-cell={key}
                className={`transition-all duration-100 ${isInGroup ? 'brightness-125 scale-105' : ''} ${hintCells?.has(key) ? 'animate-hint' : ''}`}
                onMouseEnter={() => handleMouseEnter(r, c)}
                onMouseLeave={handleMouseLeave}
              >
                <GameCell
                  cell={cell}
                  size={CELL_SIZE}
                  onClick={() => !animating && onCellClick(r, c)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
