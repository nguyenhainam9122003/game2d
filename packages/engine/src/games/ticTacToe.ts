import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";
import { type Cell, emptyBoard, findWinningLine } from "../boardUtils.js";

export const SIZE = 3;
export const WIN_LENGTH = 3;

export interface TicTacToeState {
  board: Cell[];
  toMove: Player;
  moveCount: number;
}

export type TicTacToeMove = number; // board index 0..8

export function initTicTacToe(): TicTacToeState {
  return { board: emptyBoard(SIZE), toMove: 1, moveCount: 0 };
}

export const ticTacToe: Game<TicTacToeState, TicTacToeMove> = {
  id: "tic-tac-toe",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (ticTacToe.result(state).status !== "ongoing") return [];
    const moves: TicTacToeMove[] = [];
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
      board,
      toMove: otherPlayer(state.toMove),
      moveCount: state.moveCount + 1,
    };
  },

  result(state): GameResult {
    const win = findWinningLine(state.board, SIZE, WIN_LENGTH);
    if (win) return { status: "win", winner: win.winner, line: win.line };
    if (state.moveCount >= SIZE * SIZE) return { status: "draw" };
    return { status: "ongoing" };
  },
};
