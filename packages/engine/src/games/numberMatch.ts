import type { Difficulty } from "../bots/common.js";
import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

/**
 * Ghép số ("Number Match"): cross out adjacent pairs of numbers that are
 * equal or sum to 10. The solo puzzle below (`NumberMatchState`) has no
 * opponent so it doesn't implement `Game<S, M>` — but rachoi.app's "Chơi
 * với máy"/"Chơi với bạn mình" modes are a turn-based 2-player variant of
 * the SAME board (confirmed via rachoi.app: a "Bỏ lượt" + move-history
 * chrome identical to this project's other turn-based games — no board
 * growth via "chép" there, unlike solo). `NumberMatchMatchState` below
 * implements `Game<S, M>` for that, reusing every pure helper function
 * from the solo puzzle (`liveNeighbors`/`canMatch`/`isValidPair`) so the
 * two modes can never disagree on what counts as a valid pair.
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

export interface NumberMatchMatchState {
  cells: NumberMatchCell[];
  toMove: Player;
  captured: [number, number]; // pairs found so far, by player index (0 = player 1)
  passCount: number; // 2 in a row ends the match, same convention as Go's double-pass
}

/** A move is `a * cells.length + b` (a<b) to cross out that pair, or `cells.length ** 2` to pass. */
export type NumberMatchMove = number;

export function numberMatchPassMove(cellCount: number): NumberMatchMove {
  return cellCount * cellCount;
}

export function initNumberMatchMatch(difficulty: Difficulty = "medium"): NumberMatchMatchState {
  const rows = ROWS_BY_DIFFICULTY[difficulty];
  return { cells: randomSheet(rows * WIDTH), toMove: 1, captured: [0, 0], passCount: 0 };
}

function computeMatchResult(state: NumberMatchMatchState): GameResult {
  if (state.passCount < 2) return { status: "ongoing" };
  const [a, b] = state.captured;
  if (a === b) return { status: "draw" };
  return { status: "win", winner: a > b ? 1 : 2 };
}

export const numberMatchMatch: Game<NumberMatchMatchState, NumberMatchMove> = {
  id: "number-match",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (computeMatchResult(state).status !== "ongoing") return [];
    const moves: NumberMatchMove[] = [];
    for (let i = 0; i < state.cells.length; i++) {
      if (state.cells[i].crossed) continue;
      for (const n of liveNeighbors(state.cells, i)) {
        if (n > i && canMatch(state.cells[i].value, state.cells[n].value)) {
          moves.push(i * state.cells.length + n);
        }
      }
    }
    moves.push(numberMatchPassMove(state.cells.length));
    return moves;
  },

  applyMove(state, move) {
    if (move === numberMatchPassMove(state.cells.length)) {
      return { ...state, toMove: otherPlayer(state.toMove), passCount: state.passCount + 1 };
    }
    const a = Math.floor(move / state.cells.length);
    const b = move % state.cells.length;
    if (!isValidPair(state.cells, a, b)) throw new Error(`Illegal move: ${move}`);
    const cells = state.cells.map((c, i) => (i === a || i === b ? { ...c, crossed: true } : c));
    const captured: [number, number] = [...state.captured];
    captured[state.toMove - 1] += 1;
    return { ...state, cells, captured, toMove: otherPlayer(state.toMove), passCount: 0 };
  },

  result(state) {
    return computeMatchResult(state);
  },
};
