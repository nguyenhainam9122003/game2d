import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";
import { type Cell, emptyBoard } from "../boardUtils.js";

/** Bonus added to White's (player 2) score for moving second — guarantees the game never draws. */
export const GO_KOMI = 7.5;

/**
 * Who marks dead stones once both players pass: "auto" ends the game
 * immediately using the board as-is (rachoi.app's "Máy đánh dấu" — matches
 * this engine's original behavior, so finishing cleanly means actually
 * capturing dead groups before double-passing), or "manual" ("Tự đánh dấu")
 * enters a `marking` phase first — see below.
 */
export type GoDeadStoneMode = "auto" | "manual";

export interface GoState {
  board: Cell[];
  size: number;
  toMove: Player;
  passCount: number; // 2 in a row ends the game (or enters `marking`, see deadStoneMode)
  previousBoard: Cell[] | null; // board immediately before the last stone placement — simple-ko guard
  deadStoneMode: GoDeadStoneMode;
  phase: "playing" | "marking";
  markedDead: number[]; // board indices toggled dead during the `marking` phase
  confirmCount: number; // consecutive "done marking" moves with no toggle in between; 2 ends the game
}

/**
 * A move during `phase: "playing"` is a board index 0..size*size-1 to place
 * a stone, or `size*size` ("pass"). During `phase: "marking"` the same
 * index range instead toggles whether the stone at that (occupied) index is
 * marked dead, and `size*size + 1` ("confirm") signals this player agrees
 * with the current marking.
 */
export type GoMove = number;

export function passMove(size: number): GoMove {
  return size * size;
}

export function confirmMarkingMove(size: number): GoMove {
  return size * size + 1;
}

export function initGo(size = 9, deadStoneMode: GoDeadStoneMode = "auto"): GoState {
  return {
    board: emptyBoard(size),
    size,
    toMove: 1,
    passCount: 0,
    previousBoard: null,
    deadStoneMode,
    phase: "playing",
    markedDead: [],
    confirmCount: 0,
  };
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
 * only one color) plus komi. In "auto" dead-stone mode every stone on the
 * board counts as alive — finishing cleanly means actually capturing dead
 * groups before double-passing, not just surrounding them. During a
 * "manual" game's `marking` phase, stones currently in `markedDead` are
 * scored as removed so the live preview updates as players toggle them.
 */
export function getGoScore(state: GoState): { black: number; white: number } {
  const { size } = state;
  const board =
    state.phase === "marking" && state.markedDead.length > 0
      ? state.board.map((cell, i) => (state.markedDead.includes(i) ? null : cell))
      : state.board;
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
  if (state.phase === "marking") {
    if (state.confirmCount < 2) return { status: "ongoing" };
    const { black, white } = getGoScore(state);
    return { status: "win", winner: black > white ? 1 : 2 };
  }
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
    if (state.phase === "marking") {
      const moves: GoMove[] = [];
      for (let i = 0; i < state.board.length; i++) {
        if (state.board[i] !== null) moves.push(i);
      }
      moves.push(confirmMarkingMove(state.size));
      return moves;
    }
    const moves: GoMove[] = [];
    for (let i = 0; i < state.board.length; i++) {
      if (tryPlace(state, i)) moves.push(i);
    }
    moves.push(passMove(state.size));
    return moves;
  },

  applyMove(state, move) {
    if (state.phase === "marking") {
      if (move === confirmMarkingMove(state.size)) {
        return { ...state, toMove: otherPlayer(state.toMove), confirmCount: state.confirmCount + 1 };
      }
      const alreadyDead = state.markedDead.includes(move);
      const markedDead = alreadyDead ? state.markedDead.filter((i) => i !== move) : [...state.markedDead, move];
      // Toggling invalidates any prior confirm — both players must agree again.
      return { ...state, toMove: otherPlayer(state.toMove), markedDead, confirmCount: 0 };
    }

    if (move === passMove(state.size)) {
      const passCount = state.passCount + 1;
      const enterMarking = passCount >= 2 && state.deadStoneMode === "manual";
      return {
        ...state,
        toMove: otherPlayer(state.toMove),
        passCount,
        previousBoard: state.board,
        phase: enterMarking ? "marking" : state.phase,
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
