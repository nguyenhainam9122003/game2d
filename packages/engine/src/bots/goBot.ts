import { go, passMove, confirmMarkingMove, libertyCountAt, type GoMove, type GoState } from "../games/go.js";
import type { Cell } from "../boardUtils.js";
import { otherPlayer, type Player } from "../types.js";
import { type Difficulty, randomChoice } from "./common.js";

function countStones(board: Cell[], player: Player): number {
  let count = 0;
  for (const cell of board) if (cell === player) count++;
  return count;
}

/**
 * Restricts the search to empty points near existing stones (plus a handful
 * of sensible opening points on an empty board) — Go's branching factor is
 * far too large to score every empty intersection on each move.
 */
function candidateMoves(state: GoState, legalNonPass: GoMove[]): GoMove[] {
  const { board, size } = state;
  if (board.every((c) => c === null)) {
    const third = Math.max(1, Math.floor(size / 3));
    const points = new Set<number>();
    for (const r of [third, size - 1 - third, Math.floor(size / 2)]) {
      for (const c of [third, size - 1 - third, Math.floor(size / 2)]) {
        points.add(r * size + c);
      }
    }
    const candidates = [...points].filter((p) => legalNonPass.includes(p));
    return candidates.length > 0 ? candidates : legalNonPass;
  }

  const near = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) continue;
    const row = Math.floor(i / size);
    const col = i % size;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const idx = r * size + c;
        if (board[idx] === null) near.add(idx);
      }
    }
  }
  const candidates = legalNonPass.filter((m) => near.has(m));
  return candidates.length > 0 ? candidates : legalNonPass;
}

function scoreMove(state: GoState, move: GoMove, player: Player): number {
  const opponent = otherPlayer(player);
  const stonesBefore = countStones(state.board, opponent);
  const next = go.applyMove(state, move);
  const stonesAfter = countStones(next.board, opponent);
  const captures = stonesBefore - stonesAfter;
  const ownLiberties = libertyCountAt(next.board, next.size, move);
  return captures * 50 + ownLiberties;
}

/** Looks one extra ply ahead: how good is the opponent's best reply to this move? Lower is better for us. */
function scoreMoveWithReply(state: GoState, move: GoMove, player: Player, candidatePool: GoMove[]): number {
  const base = scoreMove(state, move, player);
  const next = go.applyMove(state, move);
  const opponent = otherPlayer(player);
  const replyPool = candidatePool.filter((m) => m !== move && next.board[m] === null);
  if (replyPool.length === 0) return base;
  let bestReply = -Infinity;
  for (const reply of replyPool) {
    try {
      bestReply = Math.max(bestReply, scoreMove(next, reply, opponent));
    } catch {
      // illegal for the opponent in this new position (e.g. became a ko/suicide) — ignore
    }
  }
  return base - bestReply * 0.5;
}

export function getGoBotMove(state: GoState, difficulty: Difficulty = "medium"): GoMove {
  // The dead-stone-marking phase needs real group-life analysis to mark anything
  // itself; simplest honest behavior is to just accept whatever's marked so far.
  if (state.phase === "marking") return confirmMarkingMove(state.size);

  const legal = go.legalMoves(state);
  const pass = passMove(state.size);
  const legalNonPass = legal.filter((m) => m !== pass);

  if (legalNonPass.length === 0) return pass;
  if (difficulty === "easy") return randomChoice(legal);

  const candidates = candidateMoves(state, legalNonPass);
  const lookahead = difficulty === "expert" || difficulty === "hard";
  const scored = candidates.map((move) => ({
    move,
    score: lookahead
      ? scoreMoveWithReply(state, move, state.toMove, candidates)
      : scoreMove(state, move, state.toMove),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  // No captures available and the best move barely helps on a mostly-full board — time to pass.
  const emptyCount = state.board.filter((c) => c === null).length;
  if (best.score <= 0 && emptyCount < state.board.length * 0.2) return pass;

  return best.move;
}
