import {
  ticTacToe,
  type TicTacToeState,
  type TicTacToeMove,
} from "../games/ticTacToe.js";
import type { Player } from "../types.js";
import { type Difficulty, randomChoice } from "./common.js";

/** Exhaustive minimax with alpha-beta pruning — the board is tiny, so this plays perfectly. */
function minimaxScore(
  state: TicTacToeState,
  player: Player,
  alpha: number,
  beta: number,
): number {
  const result = ticTacToe.result(state);
  if (result.status === "win") return result.winner === player ? 1 : -1;
  if (result.status === "draw") return 0;

  const toMove = ticTacToe.currentPlayer(state);
  const maximizing = toMove === player;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of ticTacToe.legalMoves(state)) {
    const score = minimaxScore(ticTacToe.applyMove(state, move), player, alpha, beta);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}

function bestMove(state: TicTacToeState): TicTacToeMove {
  const player = ticTacToe.currentPlayer(state);
  const moves = ticTacToe.legalMoves(state);
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = minimaxScore(ticTacToe.applyMove(state, move), player, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function getTicTacToeBotMove(
  state: TicTacToeState,
  difficulty: Difficulty = "hard",
): TicTacToeMove {
  const moves = ticTacToe.legalMoves(state);
  if (difficulty === "easy") return randomChoice(moves);
  if (difficulty === "medium" && Math.random() < 0.4) return randomChoice(moves);
  return bestMove(state);
}
