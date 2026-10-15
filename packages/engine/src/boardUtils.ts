import type { Player } from "./types.js";

export type Cell = Player | null;

/**
 * Scans a square NxN board for `winLength` consecutive same-player cells
 * in a row, column, or either diagonal direction. Shared by TicTacToe
 * (size=3, winLength=3) and Gomoku (size=15, winLength=5).
 */
export function findWinningLine(
  board: Cell[],
  size: number,
  winLength: number,
): { winner: Player; line: number[] } | null {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  const at = (row: number, col: number): Cell => {
    if (row < 0 || row >= size || col < 0 || col >= size) return null;
    return board[row * size + col];
  };

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const start = at(row, col);
      if (!start) continue;

      for (const [dr, dc] of directions) {
        const line: number[] = [row * size + col];
        let r = row;
        let c = col;
        for (let step = 1; step < winLength; step++) {
          r += dr;
          c += dc;
          if (at(r, c) !== start) break;
          line.push(r * size + c);
        }
        if (line.length === winLength) {
          return { winner: start, line };
        }
      }
    }
  }

  return null;
}

export function emptyBoard(size: number): Cell[] {
  return new Array(size * size).fill(null);
}
