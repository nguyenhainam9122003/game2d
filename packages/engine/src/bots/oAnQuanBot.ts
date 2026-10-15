import { oAnQuan, type OAnQuanState, type OAnQuanMove } from "../games/oAnQuan.js";
import { otherPlayer, type Player } from "../types.js";
import { type Difficulty, randomChoice } from "./common.js";

function evaluate(state: OAnQuanState, forPlayer: Player): number {
  return state.captured[forPlayer - 1] - state.captured[otherPlayer(forPlayer) - 1];
}

function alphaBeta(
  state: OAnQuanState,
  depth: number,
  alpha: number,
  beta: number,
  forPlayer: Player,
): number {
  const result = oAnQuan.result(state);
  if (result.status === "win") return result.winner === forPlayer ? 10_000 : -10_000;
  if (result.status === "draw") return 0;
  if (depth === 0) return evaluate(state, forPlayer);

  const toMove = oAnQuan.currentPlayer(state);
  const maximizing = toMove === forPlayer;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of oAnQuan.legalMoves(state)) {
    const next = oAnQuan.applyMove(state, move);
    const score = alphaBeta(next, depth - 1, alpha, beta, forPlayer);
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

function bestMove(state: OAnQuanState, depth: number): OAnQuanMove {
  const player = oAnQuan.currentPlayer(state);
  const moves = oAnQuan.legalMoves(state);
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = oAnQuan.applyMove(state, move);
    const score = alphaBeta(next, depth - 1, -Infinity, Infinity, player);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function getOAnQuanBotMove(
  state: OAnQuanState,
  difficulty: Difficulty = "medium",
): OAnQuanMove {
  const moves = oAnQuan.legalMoves(state);
  if (difficulty === "easy") return randomChoice(moves);
  return bestMove(state, difficulty === "hard" ? 6 : 4);
}
