import type { Difficulty } from "../bots/common.js";

/**
 * Pinggo — a lô tô-style number-calling game. Not a turn-based `Game<S, M>` move-log like most
 * other games here: each side arranges its OWN private card (never transmitted, not even to a
 * bot opponent on the same device), and only the shared call log crosses between sides. This
 * module is the pure card/line-checking logic; the client owns the actual turn/call state.
 *
 * Each player arranges their own 25 numbers onto their own 5x5 card, then the two take turns
 * calling a number out loud to each other (whoever's turn it is picks any not-yet-called number
 * 1-25) — the classic in-person lô tô way of playing, no randomness in the calling itself.
 */
export const PINGGO_SIZE = 5;
export const PINGGO_CELL_COUNT = PINGGO_SIZE * PINGGO_SIZE;

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Every number 1..25 in order — the starting point the player then arranges into their own
 *  layout (swapping cells, or hitting "Xáo số" to shuffle it in one go) before locking it in
 *  with "Sẵn sàng". */
export function generatePinggoMatchCard(): number[] {
  return Array.from({ length: PINGGO_CELL_COUNT }, (_, i) => i + 1);
}

/** Randomly reshuffles an existing card — the "Xáo số" shortcut for a player who doesn't want
 *  to swap cells by hand one at a time (also used to generate the bot's own card, which it never
 *  gets a chance to manually arrange). */
export function shufflePinggoMatchCard(card: readonly number[]): number[] {
  return shuffleInPlace([...card]);
}

/** How long the bot takes to call its own number, by difficulty — faster at higher difficulty,
 *  same "difficulty = pace" idea Tìm số uses for its bot. */
export const PINGGO_CALL_INTERVAL_MS: Record<Difficulty, number> = {
  easy: 2500,
  medium: 1800,
  hard: 1200,
  expert: 700,
};

/** Every row, column, and the two diagonals of the 5x5 card. */
export const PINGGO_WIN_LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let row = 0; row < PINGGO_SIZE; row++) {
    lines.push(Array.from({ length: PINGGO_SIZE }, (_, col) => row * PINGGO_SIZE + col));
  }
  for (let col = 0; col < PINGGO_SIZE; col++) {
    lines.push(Array.from({ length: PINGGO_SIZE }, (_, row) => row * PINGGO_SIZE + col));
  }
  lines.push(Array.from({ length: PINGGO_SIZE }, (_, i) => i * PINGGO_SIZE + i));
  lines.push(Array.from({ length: PINGGO_SIZE }, (_, i) => i * PINGGO_SIZE + (PINGGO_SIZE - 1 - i)));
  return lines;
})();

/** How many completed lines a card needs before its owner wins the "2 người" match variant —
 *  a single line is too quick (the very first few calls can already complete one), so it takes
 *  several to turn this into a real race. */
export const PINGGO_MATCH_LINES_TO_WIN = 5;

/** Every completed line (row/column/diagonal) on this card given which numbers have been
 *  called. Every cell holds a real number (no free space), so a line needs every one of its
 *  numbers actually called. A card wins once this reaches `PINGGO_MATCH_LINES_TO_WIN`. */
export function findPinggoMatchCompletedLines(card: number[], called: ReadonlySet<number>): number[][] {
  return PINGGO_WIN_LINES.filter((line) => line.every((i) => called.has(card[i])));
}
