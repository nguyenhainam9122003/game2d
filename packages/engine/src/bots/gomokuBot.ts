import { gomoku, type GomokuState, type GomokuMove } from "../games/gomoku.js";
import type { Cell } from "../boardUtils.js";
import type { Player } from "../types.js";
import { otherPlayer } from "../types.js";
import { type Difficulty, randomChoice } from "./common.js";

const WIN_SCORE = 1_000_000;

// Pattern scores, keyed by (run length, open ends). A "live" pattern has
// both ends open (room to extend into five); a "blocked" one has only
// one open end. These values are tuned by feel, not solved — good enough
// for a casual bot, not a tournament-strength one.
function patternScore(runLength: number, openEnds: 0 | 1 | 2): number {
  if (runLength >= 5) return WIN_SCORE;
  if (openEnds === 0) return runLength >= 4 ? 200 : 0; // dead run, little value
  if (runLength === 4) return openEnds === 2 ? WIN_SCORE / 2 : 10_000;
  if (runLength === 3) return openEnds === 2 ? 5_000 : 500;
  if (runLength === 2) return openEnds === 2 ? 200 : 50;
  if (runLength === 1) return openEnds === 2 ? 10 : 5;
  return 0;
}

const DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function at(board: Cell[], size: number, row: number, col: number): Cell | "oob" {
  if (row < 0 || row >= size || col < 0 || col >= size) return "oob";
  return board[row * size + col];
}

/** Sums pattern scores for every run on the board, for one player. */
function scoreForPlayer(state: GomokuState, player: Player): number {
  const { board, size } = state;
  let total = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row * size + col] !== player) continue;

      for (const [dr, dc] of DIRECTIONS) {
        // Only count each run once: skip if the previous cell in this
        // direction is the same player (that run was already counted
        // starting from its true beginning).
        const prev = at(board, size, row - dr, col - dc);
        if (prev === player) continue;

        let runLength = 0;
        let r = row;
        let c = col;
        while (at(board, size, r, c) === player) {
          runLength++;
          r += dr;
          c += dc;
        }
        const afterEnd = at(board, size, r, c);
        const beforeStart = prev;
        let openEnds: 0 | 1 | 2 = 0;
        if (afterEnd === null) openEnds++;
        if (beforeStart === null) openEnds++;

        total += patternScore(runLength, openEnds as 0 | 1 | 2);
      }
    }
  }

  return total;
}

function evaluate(state: GomokuState, forPlayer: Player): number {
  return (
    scoreForPlayer(state, forPlayer) -
    scoreForPlayer(state, otherPlayer(forPlayer))
  );
}

/** Empty cells within `radius` of an existing stone — keeps branching factor sane on a 15x15 board. */
function candidateMoves(state: GomokuState, radius = 2): GomokuMove[] {
  const { board, size } = state;
  if (state.moveCount === 0) {
    return [Math.floor(size / 2) * size + Math.floor(size / 2)];
  }

  const candidates = new Set<number>();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row * size + col] === null) continue;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          if (board[r * size + c] === null) candidates.add(r * size + c);
        }
      }
    }
  }
  return Array.from(candidates);
}

/** Orders candidates by their immediate heuristic value so alpha-beta prunes more. */
function orderedCandidates(
  state: GomokuState,
  player: Player,
  limit: number,
): GomokuMove[] {
  const moves = candidateMoves(state);
  const scored = moves.map((move) => {
    const next = gomoku.applyMove(state, move);
    return { move, score: evaluate(next, player) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.move);
}

function alphaBeta(
  state: GomokuState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: Player,
  branchLimit: number,
): number {
  const result = gomoku.result(state);
  if (result.status === "win") {
    return result.winner === player ? WIN_SCORE + depth : -(WIN_SCORE + depth);
  }
  if (result.status === "draw") return 0;
  if (depth === 0) return evaluate(state, player);

  const toMove = gomoku.currentPlayer(state);
  const moves = orderedCandidates(state, toMove, branchLimit);

  if (maximizing) {
    let value = -Infinity;
    for (const move of moves) {
      const next = gomoku.applyMove(state, move);
      value = Math.max(
        value,
        alphaBeta(next, depth - 1, alpha, beta, false, player, branchLimit),
      );
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of moves) {
    const next = gomoku.applyMove(state, move);
    value = Math.min(
      value,
      alphaBeta(next, depth - 1, alpha, beta, true, player, branchLimit),
    );
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

function bestMove(state: GomokuState, depth: number, branchLimit: number): GomokuMove {
  const player = gomoku.currentPlayer(state);
  const moves = orderedCandidates(state, player, branchLimit);
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = gomoku.applyMove(state, move);
    const score = alphaBeta(
      next,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      player,
      branchLimit,
    );
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export function getGomokuBotMove(
  state: GomokuState,
  difficulty: Difficulty = "medium",
): GomokuMove {
  const legal = gomoku.legalMoves(state);

  if (difficulty === "easy") {
    // Still bias toward the action instead of playing in a far corner.
    const nearby = candidateMoves(state);
    return randomChoice(nearby.length > 0 ? nearby : legal);
  }
  if (difficulty === "medium") return bestMove(state, 2, 10);
  return bestMove(state, 3, 12); // hard
}
