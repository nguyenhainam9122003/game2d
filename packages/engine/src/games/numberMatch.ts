import type { Difficulty } from "../bots/common.js";

/**
 * Ghép số ("Number Match"): cross out adjacent pairs of numbers that are
 * equal or sum to 10. Like Sudoku, this is a single-player puzzle with no
 * opponent, so it does NOT implement the shared `Game<S, M>` interface —
 * see PLAN.md for the deferred 2-player "race"/"co-solve" modes.
 */
export const WIDTH = 9;
const DEFAULT_COPY_BUDGET = 5;
const ROWS_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5, expert: 6 };

export interface NumberMatchCell {
  value: number;
  crossed: boolean;
}

export interface NumberMatchState {
  cells: NumberMatchCell[];
  copiesLeft: number;
}

function randomSheet(count: number): NumberMatchCell[] {
  return Array.from({ length: count }, () => ({ value: 1 + Math.floor(Math.random() * 9), crossed: false }));
}

export function initNumberMatch(difficulty: Difficulty = "medium", copyBudget = DEFAULT_COPY_BUDGET): NumberMatchState {
  const rows = ROWS_BY_DIFFICULTY[difficulty];
  return { cells: randomSheet(rows * WIDTH), copiesLeft: copyBudget };
}

export function canMatch(a: number, b: number): boolean {
  return a === b || a + b === 10;
}

/** Walks the flat index by `step` (±1), skipping crossed cells — this is how "horizontal" wraps end-of-row to next-row. */
function nextLiveFlat(cells: NumberMatchCell[], start: number, step: 1 | -1): number | null {
  let i = start + step;
  while (i >= 0 && i < cells.length) {
    if (!cells[i].crossed) return i;
    i += step;
  }
  return null;
}

/** Walks the grid by (dRow, dCol), skipping crossed cells, stopping at a row/column boundary. */
function nextLiveGrid(cells: NumberMatchCell[], start: number, dRow: -1 | 1, dCol: -1 | 0 | 1): number | null {
  let row = Math.floor(start / WIDTH);
  let col = start % WIDTH;
  for (;;) {
    row += dRow;
    col += dCol;
    if (row < 0 || col < 0 || col >= WIDTH) return null;
    const idx = row * WIDTH + col;
    if (idx < 0 || idx >= cells.length) return null;
    if (!cells[idx].crossed) return idx;
  }
}

/** The (up to) 8 cells "kề nhau" (adjacent) to `index`, skipping over crossed-out cells to find the live neighbor. */
export function liveNeighbors(cells: NumberMatchCell[], index: number): number[] {
  const candidates = [
    nextLiveFlat(cells, index, 1),
    nextLiveFlat(cells, index, -1),
    nextLiveGrid(cells, index, -1, 0),
    nextLiveGrid(cells, index, 1, 0),
    nextLiveGrid(cells, index, -1, -1),
    nextLiveGrid(cells, index, -1, 1),
    nextLiveGrid(cells, index, 1, -1),
    nextLiveGrid(cells, index, 1, 1),
  ];
  return [...new Set(candidates.filter((c): c is number => c !== null))];
}

export function isValidPair(cells: NumberMatchCell[], a: number, b: number): boolean {
  if (a === b || cells[a].crossed || cells[b].crossed) return false;
  if (!canMatch(cells[a].value, cells[b].value)) return false;
  return liveNeighbors(cells, a).includes(b);
}

export function hasAnyValidPair(cells: NumberMatchCell[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].crossed) continue;
    for (const n of liveNeighbors(cells, i)) {
      if (n > i && canMatch(cells[i].value, cells[n].value)) return true;
    }
  }
  return false;
}

export function crossOutPair(state: NumberMatchState, a: number, b: number): NumberMatchState {
  if (!isValidPair(state.cells, a, b)) throw new Error("Illegal move: not a valid pair");
  const cells = state.cells.map((c, i) => (i === a || i === b ? { ...c, crossed: true } : c));
  return { ...state, cells };
}

export function copyRemaining(state: NumberMatchState): NumberMatchState {
  if (state.copiesLeft <= 0) throw new Error("Illegal move: no copies left");
  const remaining = state.cells.filter((c) => !c.crossed).map((c) => ({ ...c }));
  return { cells: [...state.cells, ...remaining], copiesLeft: state.copiesLeft - 1 };
}

export function isNumberMatchSolved(state: NumberMatchState): boolean {
  return state.cells.every((c) => c.crossed);
}

export function isStuck(state: NumberMatchState): boolean {
  return state.copiesLeft <= 0 && !hasAnyValidPair(state.cells);
}
