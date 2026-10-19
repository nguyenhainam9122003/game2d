import {
  chess,
  decodeChessMove,
  type ChessMove,
  type ChessState,
  type Piece,
  type PieceType,
} from "../games/chess.js";
import type { Player } from "../types.js";
import { type Difficulty, randomChoice } from "./common.js";

const MATERIAL: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/**
 * Rough, hand-tuned positional nudge rather than real piece-square tables:
 * knights/bishops/queens like the centre, pawns are worth a little more
 * the further they've advanced. Rooks and kings get no bonus — keeping
 * this simple on purpose rather than modelling full positional chess.
 */
function centreBonus(rank: number, file: number): number {
  const dr = Math.abs(rank - 3.5);
  const df = Math.abs(file - 3.5);
  return (4 - (dr + df) / 2) * 4;
}

function pieceValue(piece: Piece, index: number): number {
  const rank = Math.floor(index / 8);
  const file = index % 8;
  let value = MATERIAL[piece.type];
  if (piece.type === "n" || piece.type === "b" || piece.type === "q") {
    value += centreBonus(rank, file);
  } else if (piece.type === "p") {
    const advance = piece.player === 1 ? rank : 7 - rank;
    value += advance * 4;
  }
  return value;
}

function evaluate(state: ChessState, forPlayer: Player): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const piece = state.board[i];
    if (!piece) continue;
    const value = pieceValue(piece, i);
    score += piece.player === forPlayer ? value : -value;
  }
  return score;
}

/** Captures first — cheap move ordering that meaningfully improves alpha-beta pruning. */
function orderMoves(state: ChessState, moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => {
    const capA = state.board[decodeChessMove(a).to] ? 1 : 0;
    const capB = state.board[decodeChessMove(b).to] ? 1 : 0;
    return capB - capA;
  });
}

function alphaBeta(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  forPlayer: Player,
): number {
  const result = chess.result(state);
  if (result.status === "win") return result.winner === forPlayer ? 100_000 : -100_000;
  if (result.status === "draw") return 0;
  if (depth === 0) return evaluate(state, forPlayer);

  const toMove = chess.currentPlayer(state);
  const maximizing = toMove === forPlayer;
  const moves = orderMoves(state, chess.legalMoves(state));
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = chess.applyMove(state, move);
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

function bestMove(state: ChessState, depth: number): ChessMove {
  const player = chess.currentPlayer(state);
  const moves = orderMoves(state, chess.legalMoves(state));
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = chess.applyMove(state, move);
    const score = alphaBeta(next, depth - 1, -Infinity, Infinity, player);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function getChessBotMove(state: ChessState, difficulty: Difficulty = "medium"): ChessMove {
  const moves = chess.legalMoves(state);
  if (difficulty === "easy") return randomChoice(moves);
  if (difficulty === "medium") return bestMove(state, 2);
  if (difficulty === "hard") return bestMove(state, 3);
  return bestMove(state, 4); // expert
}
