import type { Difficulty } from "../bots/common.js";

/**
 * Pinggo is a Bingo-style number-calling game — like Sudoku and Number Hunt, it's NOT a
 * turn-based `Game<S, M>`: there's no opponent move to apply, just a shared sequence of
 * called numbers that both the card owner (solo) and each racer (online) reveal over time
 * and mark against their own card. This module is the pure card/call-order generator plus
 * a couple of validation helpers; the client owns the actual timer and marking state.
 */
export const PINGGO_SIZE = 5;
export const PINGGO_CELL_COUNT = PINGGO_SIZE * PINGGO_SIZE;
export const PINGGO_FREE_INDEX = 12; // center cell, row 2 col 2 (0-indexed) of the 5x5 card
/** Column letters — a 5-letter play on "Pinggo" standing in for Bingo's classic B-I-N-G-O. */
export const PINGGO_COLUMNS = ["P", "I", "N", "G", "O"] as const;
/** Each column draws its 5 numbers from its own 15-number range, same split as real Bingo. */
const COLUMN_RANGE_SIZE = 15;
export const PINGGO_MAX_NUMBER = PINGGO_COLUMNS.length * COLUMN_RANGE_SIZE; // 75

export type PinggoCard = (number | null)[]; // length 25, row-major, index 12 (center) = null (free space)

function shuffledRange(from: number, count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i + from);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** A fresh 5x5 card: each column gets 5 unique numbers from its own 1-15/16-30/.../61-75
 *  range, placed in random row order; the center cell is the free space (always marked). */
export function generatePinggoCard(): PinggoCard {
  const card: PinggoCard = new Array(PINGGO_CELL_COUNT).fill(null);
  for (let col = 0; col < PINGGO_COLUMNS.length; col++) {
    const picks = shuffledRange(col * COLUMN_RANGE_SIZE + 1, COLUMN_RANGE_SIZE).slice(0, PINGGO_SIZE);
    for (let row = 0; row < PINGGO_SIZE; row++) {
      const index = row * PINGGO_SIZE + col;
      if (index === PINGGO_FREE_INDEX) continue;
      card[index] = picks[row];
    }
  }
  return card;
}

/** The caller's draw order for this round — every number 1-75 exactly once, shuffled. Shared
 *  between both sides of an online race (same draws, same cadence) even though each side's
 *  own card is private, same as real Bingo. */
export function generatePinggoCallOrder(): number[] {
  return shuffledRange(1, PINGGO_MAX_NUMBER);
}

/** How long each drawn number stays up before the next one is called, by difficulty — faster
 *  at higher difficulty, same "difficulty = pace" idea Tìm số uses for its reveal timing. */
export const PINGGO_CALL_INTERVAL_MS: Record<Difficulty, number> = {
  easy: 5000,
  medium: 3500,
  hard: 2500,
  expert: 1800,
};

/** Every row, column, and the two diagonals — a completed line (free space counts as already
 *  marked) wins. */
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

/** First completed line (row/column/diagonal) given which cells the player has marked, or
 *  null if none yet. Marking is manual (the client only lets a cell be marked once its number
 *  has actually been called), so this doesn't need `calledNumbers` itself — `marked` already
 *  implies it. */
export function findPinggoWinLine(marked: ReadonlySet<number>): number[] | null {
  for (const line of PINGGO_WIN_LINES) {
    if (line.every((i) => i === PINGGO_FREE_INDEX || marked.has(i))) return line;
  }
  return null;
}

/**
 * The "2 người" variant: instead of an auto-generated card and an auto-revealed call order
 * (above), each player arranges their OWN 25 numbers onto their own 5x5 card — same size as the
 * solo card, just no free space and no column letters, since every cell holds a real number the
 * player placed themselves — then the two take turns calling a number out loud to each other
 * (whoever's turn it is picks any not-yet-called number 1-25), the classic in-person lô tô way
 * of playing, no randomness in the calling itself.
 */

/** A fresh shuffled arrangement of every number 1..25 — a starting point the player then freely
 *  rearranges (swapping cells) before locking it in with "Sẵn sàng". */
export function generatePinggoMatchCard(): number[] {
  return shuffledRange(1, PINGGO_CELL_COUNT);
}

/** First completed line on this particular card given which numbers have been called, or null.
 *  Every cell holds a real number (no free space in this variant), so a line needs every one of
 *  its numbers actually called. Reuses `PINGGO_WIN_LINES` — same 5x5 grid shape as the solo
 *  card above. */
export function findPinggoMatchWinLine(card: number[], called: ReadonlySet<number>): number[] | null {
  for (const line of PINGGO_WIN_LINES) {
    if (line.every((i) => called.has(card[i]))) return line;
  }
  return null;
}
