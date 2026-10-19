import {
  xiangqi,
  decodeXiangqiMove,
  type XiangqiMove,
  type XiangqiPiece,
  type XiangqiPieceType,
  type XiangqiState,
} from "../games/xiangqi.js";
import type { Player } from "../types.js";
import { type Difficulty, randomChoice } from "./common.js";

const MATERIAL: Record<XiangqiPieceType, number> = {
  g: 0, // never actually captured — the game ends when a side has no legal moves
  a: 200,
  e: 200,
  h: 400,
  c: 450,
  r: 900,
  s: 100,
};

function pieceValue(piece: XiangqiPiece, rank: number): number {
  let value = MATERIAL[piece.type];
  if (piece.type === "s") {
    const crossed = piece.player === 1 ? rank >= 5 : rank <= 4;
    if (crossed) value += 100; // soldiers are much more dangerous once across the river
  }
  return value;
}

function evaluate(state: XiangqiState, forPlayer: Player): number {
  let score = 0;
  for (let i = 0; i < state.board.length; i++) {
    const piece = state.board[i];
    if (!piece) continue;
    const value = pieceValue(piece, Math.floor(i / 9));
    score += piece.player === forPlayer ? value : -value;
  }
  return score;
}

/** Captures first — cheap move ordering that meaningfully improves alpha-beta pruning. */
function orderMoves(state: XiangqiState, moves: XiangqiMove[]): XiangqiMove[] {
  return [...moves].sort((a, b) => {
    const capA = state.board[decodeXiangqiMove(a).to] ? 1 : 0;
    const capB = state.board[decodeXiangqiMove(b).to] ? 1 : 0;
    return capB - capA;
  });
}

function alphaBeta(
  state: XiangqiState,
  depth: number,
  alpha: number,
  beta: number,
  forPlayer: Player,
): number {
  const result = xiangqi.result(state);
  if (result.status === "win") return result.winner === forPlayer ? 100_000 : -100_000;
  if (result.status === "draw") return 0;
  if (depth === 0) return evaluate(state, forPlayer);

  const toMove = xiangqi.currentPlayer(state);
  const maximizing = toMove === forPlayer;
  const moves = orderMoves(state, xiangqi.legalMoves(state));
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = xiangqi.applyMove(state, move);
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

function bestMove(state: XiangqiState, depth: number): XiangqiMove {
  const player = xiangqi.currentPlayer(state);
  const moves = orderMoves(state, xiangqi.legalMoves(state));
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = xiangqi.applyMove(state, move);
    const score = alphaBeta(next, depth - 1, -Infinity, Infinity, player);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function getXiangqiBotMove(state: XiangqiState, difficulty: Difficulty = "medium"): XiangqiMove {
  const moves = xiangqi.legalMoves(state);
  if (difficulty === "easy") return randomChoice(moves);
  if (difficulty === "medium") return bestMove(state, 2);
  if (difficulty === "hard") return bestMove(state, 3);
  return bestMove(state, 4); // expert
}
