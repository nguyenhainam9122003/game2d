import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

/**
 * Ô Ăn Quan — a traditional Vietnamese mancala-style game.
 *
 * Board: 12 pits in a ring. Index 0 and 6 are the big "quan" pits (one per
 * end of the board); indices 1-5 are player 1's five small "dân" pits,
 * indices 7-11 are player 2's. Sowing always moves in the +1 (mod 12)
 * direction, e.g. 1→2→...→5→6(quan)→7→...→11→0(quan)→1.
 *
 * This implements a simplified, self-consistent ruleset (regional rules
 * vary a lot): no "vay quan" (borrowing when a side runs out of stones),
 * and a captured quan pit just becomes an ordinary empty pit afterwards
 * rather than being permanently removed from play.
 */

export const TOTAL_PITS = 12;
export const QUAN_INDICES = [0, 6] as const;
export const PLAYER1_PITS = [1, 2, 3, 4, 5] as const;
export const PLAYER2_PITS = [7, 8, 9, 10, 11] as const;

export interface OAnQuanState {
  pits: number[]; // length 12
  toMove: Player;
  captured: [number, number]; // [player1 total, player2 total]
  gameOver: boolean;
}

export type OAnQuanMove = number; // pit index to sow from

export function initOAnQuan(): OAnQuanState {
  const pits = new Array(TOTAL_PITS).fill(0);
  for (const i of PLAYER1_PITS) pits[i] = 5;
  for (const i of PLAYER2_PITS) pits[i] = 5;
  for (const i of QUAN_INDICES) pits[i] = 10;
  return { pits, toMove: 1, captured: [0, 0], gameOver: false };
}

export function ownPits(player: Player): readonly number[] {
  return player === 1 ? PLAYER1_PITS : PLAYER2_PITS;
}

/** Sows from `start`, chain-sowing through non-empty landing pits, then
 * resolves (possibly chained) captures. Returns the resulting pits and
 * the total stones captured by the mover. */
function simulateMove(pits: number[], start: number): { pits: number[]; captured: number } {
  const next = pits.slice();
  let idx = start;
  let hand = next[idx];
  next[idx] = 0;

  // Sowing phase: drop one stone per pit; if the final stone lands in a
  // pit that already has stones in it, pick those up and keep sowing.
  for (;;) {
    while (hand > 0) {
      idx = (idx + 1) % TOTAL_PITS;
      next[idx]++;
      hand--;
    }
    const after = (idx + 1) % TOTAL_PITS;
    if (next[after] === 0) break;
    hand = next[after];
    next[after] = 0;
    idx = after;
  }

  // Capture phase: the pit right after the last stone is empty (that's
  // why the sowing phase stopped) — if the pit beyond THAT has stones,
  // capture them, then repeat the same check from the captured position
  // to allow chain captures.
  let captured = 0;
  for (;;) {
    const empty = (idx + 1) % TOTAL_PITS;
    if (next[empty] !== 0) break;
    const prize = (idx + 2) % TOTAL_PITS;
    if (next[prize] === 0) break;
    captured += next[prize];
    next[prize] = 0;
    idx = prize;
  }

  return { pits: next, captured };
}

export const oAnQuan: Game<OAnQuanState, OAnQuanMove> = {
  id: "o-an-quan",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (state.gameOver) return [];
    return ownPits(state.toMove).filter((i) => state.pits[i] > 0);
  },

  applyMove(state, move) {
    if (!ownPits(state.toMove).includes(move) || state.pits[move] === 0) {
      throw new Error(`Illegal move: pit ${move} is not a playable pit for player ${state.toMove}`);
    }

    const { pits, captured: gained } = simulateMove(state.pits, move);
    const captured: [number, number] = [...state.captured];
    captured[state.toMove - 1] += gained;

    const next = otherPlayer(state.toMove);
    const nextCanMove = ownPits(next).some((i) => pits[i] > 0);

    if (!nextCanMove) {
      // `next` has no stones to play with — the game ends immediately and
      // whoever just moved sweeps everything left on the board.
      const remaining = pits.reduce((sum, n) => sum + n, 0);
      captured[state.toMove - 1] += remaining;
      return { pits: new Array(TOTAL_PITS).fill(0), toMove: next, captured, gameOver: true };
    }

    return { pits, toMove: next, captured, gameOver: false };
  },

  result(state): GameResult {
    if (!state.gameOver) return { status: "ongoing" };
    const [p1, p2] = state.captured;
    if (p1 === p2) return { status: "draw" };
    return { status: "win", winner: p1 > p2 ? 1 : (2 as Player) };
  },
};
