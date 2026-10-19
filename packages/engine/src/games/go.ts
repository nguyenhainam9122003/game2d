import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";
import { type Cell, emptyBoard } from "../boardUtils.js";

/** Bonus added to White's (player 2) score for moving second — guarantees the game never draws. */
export const GO_KOMI = 7.5;

export interface GoState {
  board: Cell[];
  size: number;
  toMove: Player;
  passCount: number; // 2 in a row ends the game
  previousBoard: Cell[] | null; // board immediately before the last stone placement — simple-ko guard
}

/** A move is a board index 0..size*size-1 to place a stone; `size*size` is the "pass" sentinel. */
export type GoMove = number;

export function passMove(size: number): GoMove {
  return size * size;
}

export function initGo(size = 9): GoState {
  return { board: emptyBoard(size), size, toMove: 1, passCount: 0, previousBoard: null };
}

function neighborsOf(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const result: number[] = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

/** Flood-fills the group containing `start` and reports its liberties (adjacent empty points). */
function groupAndLiberties(board: Cell[], size: number, start: number): { group: number[]; liberties: Set<number> } {
  const color = board[start];
  const group: number[] = [];
  const liberties = new Set<number>();
  const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop()!;
    group.push(current);
    for (const n of neighborsOf(current, size)) {
      if (board[n] === null) {
        liberties.add(n);
      } else if (board[n] === color && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return { group, liberties };
}

/** Number of liberties the group at `index` would have — exported for the bot's move scoring. */
export function libertyCountAt(board: Cell[], size: number, index: number): number {
  return groupAndLiberties(board, size, index).liberties.size;
}

/** Places `color` at `index` and removes any now-liberty-less enemy groups. */
function placeAndCapture(board: Cell[], size: number, index: number, color: Player): Cell[] {
  const next = board.slice();
  next[index] = color;
  const enemy = otherPlayer(color);
  const removed = new Set<number>();
  for (const n of neighborsOf(index, size)) {
    if (next[n] !== enemy || removed.has(n)) continue;
    const { group, liberties } = groupAndLiberties(next, size, n);
    if (liberties.size === 0) {
      for (const g of group) {
        next[g] = null;
        removed.add(g);
      }
    }
  }
  return next;
}

function boardsEqual(a: Cell[], b: Cell[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Resulting board for placing a stone at `index`, or null if illegal (occupied, suicide, or ko). */
function tryPlace(state: GoState, index: number): Cell[] | null {
  if (state.board[index] !== null) return null;
  const placed = placeAndCapture(state.board, state.size, index, state.toMove);
  if (groupAndLiberties(placed, state.size, index).liberties.size === 0) return null; // suicide
  if (state.previousBoard && boardsEqual(placed, state.previousBoard)) return null; // ko
  return placed;
}

/**
 * Chinese-style area scoring (stones on the board + empty territory bordering
 * only one color) plus komi. This intentionally skips the interactive "mark
 * dead stones" phase rachoi.app has — a group left on the board at game end
 * always counts as alive here, so finishing a game cleanly means actually
 * capturing dead groups before double-passing, not just surrounding them.
 */
export function getGoScore(state: GoState): { black: number; white: number } {
  const { size, board } = state;
  let black = 0;
  let white = 0;
  for (const cell of board) {
    if (cell === 1) black++;
    else if (cell === 2) white++;
  }

  const visited = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null || visited.has(i)) continue;
    const region: number[] = [];
    const borders = new Set<Player>();
    const stack = [i];
    visited.add(i);
    while (stack.length > 0) {
      const current = stack.pop()!;
      region.push(current);
      for (const n of neighborsOf(current, size)) {
        const cell = board[n];
        if (cell === null) {
          if (!visited.has(n)) {
            visited.add(n);
            stack.push(n);
          }
        } else {
          borders.add(cell);
        }
      }
    }
    if (borders.size === 1) {
      const owner = [...borders][0];
      if (owner === 1) black += region.length;
      else white += region.length;
    }
  }

  return { black, white: white + GO_KOMI };
}

function computeResult(state: GoState): GameResult {
  if (state.passCount < 2) return { status: "ongoing" };
  const { black, white } = getGoScore(state);
  return { status: "win", winner: black > white ? 1 : 2 }; // komi's .5 means a tie is impossible
}

export const go: Game<GoState, GoMove> = {
  id: "go",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (computeResult(state).status !== "ongoing") return [];
    const moves: GoMove[] = [];
    for (let i = 0; i < state.board.length; i++) {
      if (tryPlace(state, i)) moves.push(i);
    }
    moves.push(passMove(state.size));
    return moves;
  },

  applyMove(state, move) {
    if (move === passMove(state.size)) {
      return {
        ...state,
        toMove: otherPlayer(state.toMove),
        passCount: state.passCount + 1,
        previousBoard: state.board,
      };
    }
    const placed = tryPlace(state, move);
    if (!placed) throw new Error(`Illegal move: ${move}`);
    return {
      ...state,
      board: placed,
      toMove: otherPlayer(state.toMove),
      passCount: 0,
      previousBoard: state.board,
    };
  },

  result(state) {
    return computeResult(state);
  },
};
