import {
  BOARD_SIZE,
  SHIP_LENGTHS,
  FIRE_OFFSET,
  buildFleet,
  encodeFleet,
  type BattleshipMove,
  type BattleshipState,
  type ShipPlacement,
} from "../games/battleship.js";
import { type Difficulty, randomChoice } from "./common.js";

/** Tries random non-overlapping layouts until one fits — the search space is dense enough that this is always fast. */
function randomFleetMove(size: number): BattleshipMove {
  for (;;) {
    const placements: ShipPlacement[] = SHIP_LENGTHS.map(() => ({
      row: Math.floor(Math.random() * size),
      col: Math.floor(Math.random() * size),
      orientation: Math.random() < 0.5 ? 0 : 1,
    }));
    if (buildFleet(size, placements)) return encodeFleet(placements);
  }
}

function neighborsOf(cell: number, size: number): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const result: number[] = [];
  if (row > 0) result.push(cell - size);
  if (row < size - 1) result.push(cell + size);
  if (col > 0) result.push(cell - 1);
  if (col < size - 1) result.push(cell + 1);
  return result;
}

/**
 * Picks the bot's next shot using only information it has legitimately seen
 * (its own past shots and their hit/miss outcome, derivable from the
 * opponent's fleet since those specific cells were already fired at) — never
 * the opponent's unrevealed ship positions.
 */
function pickShot(state: BattleshipState, difficulty: Difficulty): number {
  const shooterIdx = state.toMove - 1;
  const opponentIdx = shooterIdx === 0 ? 1 : 0;
  const opponentFleet = state.fleets[opponentIdx]!;
  const fired = new Set(state.shots[shooterIdx]);
  const allCells = Array.from({ length: state.size * state.size }, (_, i) => i).filter((c) => !fired.has(c));

  if (difficulty === "easy") return randomChoice(allCells);

  const hits = state.shots[shooterIdx].filter((c) => opponentFleet.some((ship) => ship.includes(c)));
  const sunkCells = new Set(opponentFleet.filter((ship) => ship.every((c) => fired.has(c))).flat());
  const activeHits = hits.filter((c) => !sunkCells.has(c));

  if (activeHits.length > 0) {
    // Hunt mode: finish off a ship we've already found.
    if (difficulty !== "medium" && activeHits.length >= 2) {
      // Expert/hard: if two active hits share a row or column, keep firing along that line first.
      const [a, b] = activeHits;
      const size = state.size;
      const sameRow = Math.floor(a / size) === Math.floor(b / size);
      const step = sameRow ? 1 : size;
      const sorted = [...activeHits].sort((x, y) => x - y);
      const lineCandidates = [sorted[0] - step, sorted[sorted.length - 1] + step].filter(
        (c) => c >= 0 && c < size * size && !fired.has(c) && (!sameRow || Math.floor(c / size) === Math.floor(a / size)),
      );
      if (lineCandidates.length > 0) return randomChoice(lineCandidates);
    }
    const candidates = activeHits.flatMap((c) => neighborsOf(c, state.size)).filter((c) => !fired.has(c));
    if (candidates.length > 0) return randomChoice(candidates);
  }

  if (difficulty === "medium") return randomChoice(allCells);

  // Hard/expert with no active hunt: checkerboard parity search — every ship (min length 2)
  // must occupy at least one parity-matching cell, so this finds ships faster than pure random.
  const parityCells = allCells.filter((c) => (Math.floor(c / state.size) + (c % state.size)) % 2 === 0);
  return randomChoice(parityCells.length > 0 ? parityCells : allCells);
}

export function getBattleshipBotMove(state: BattleshipState, difficulty: Difficulty = "medium"): BattleshipMove {
  if (state.phase === "placement") return randomFleetMove(state.size || BOARD_SIZE);
  return FIRE_OFFSET + pickShot(state, difficulty);
}
