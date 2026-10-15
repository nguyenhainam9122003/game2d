import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";
import { type Cell, emptyBoard, findWinningLine } from "../boardUtils.js";

export const DEFAULT_SIZE = 15;
export const DEFAULT_WIN_LENGTH = 5;

export interface GomokuState {
  board: Cell[];
  toMove: Player;
  moveCount: number;
  size: number;
  winLength: number;
  lastMove: number | null;
}

export type GomokuMove = number; // board index 0..size*size-1

export function initGomoku(
  size = DEFAULT_SIZE,
  winLength = DEFAULT_WIN_LENGTH,
): GomokuState {
  return {
    board: emptyBoard(size),
    toMove: 1,
    moveCount: 0,
    size,
    winLength,
    lastMove: null,
  };
}

export const gomoku: Game<GomokuState, GomokuMove> = {
  id: "gomoku",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (gomoku.result(state).status !== "ongoing") return [];
    const moves: GomokuMove[] = [];
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === null) moves.push(i);
    }
    return moves;
  },

  applyMove(state, move) {
    if (state.board[move] !== null) {
      throw new Error(`Illegal move: cell ${move} is occupied`);
    }
    const board = state.board.slice();
    board[move] = state.toMove;
    return {
      ...state,
      board,
      toMove: otherPlayer(state.toMove),
      moveCount: state.moveCount + 1,
      lastMove: move,
    };
  },

  result(state): GameResult {
    const win = findWinningLine(state.board, state.size, state.winLength);
    if (win) return { status: "win", winner: win.winner, line: win.line };
    if (state.moveCount >= state.size * state.size) return { status: "draw" };
    return { status: "ongoing" };
  },
};
