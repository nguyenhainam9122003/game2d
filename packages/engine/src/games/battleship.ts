import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

/**
 * Battleship ("Bắn tàu"): standard 10x10 grid, 5 ships of length 5/4/3/3/2.
 * Ships may sit edge-to-edge but not overlap — matching rachoi.app's rule,
 * which (unlike many house rules) does not forbid diagonal adjacency.
 *
 * A move is one of two shapes packed into a single number so it fits the
 * same `number` move type every other game in this engine uses:
 *  - a *fleet placement* (< FIRE_OFFSET): submitted once per player during
 *    the placement phase, encoding all 5 ships at once (see encodeFleet).
 *  - a *shot* (>= FIRE_OFFSET): `FIRE_OFFSET + targetCell` during battle.
 */
export const BOARD_SIZE = 10;
export const SHIP_LENGTHS = [5, 4, 3, 3, 2];
export const FIRE_OFFSET = 1_000_000_000_000;

export type BattleshipPhase = "placement" | "battle" | "done";

/** "again-on-hit" (rachoi's default): a hit keeps your turn. "one-per-turn": every shot passes the turn regardless. */
export type HuntRule = "again-on-hit" | "one-per-turn";

export interface BattleshipState {
  size: number;
  phase: BattleshipPhase;
  /** Index 0 = player 1's ships, index 1 = player 2's — each ship is a list of board-index cells. */
  fleets: [number[][] | null, number[][] | null];
  /** shots[0] = cells player 1 has fired at player 2; shots[1] = the reverse. */
  shots: [number[], number[]];
  toMove: Player;
  winner: Player | null;
  huntRule: HuntRule;
}

export type BattleshipMove = number;

export function initBattleship(size = BOARD_SIZE, huntRule: HuntRule = "again-on-hit"): BattleshipState {
  return { size, phase: "placement", fleets: [null, null], shots: [[], []], toMove: 1, winner: null, huntRule };
}

export interface ShipPlacement {
  row: number;
  col: number;
  orientation: 0 | 1; // 0 = horizontal (grows along columns), 1 = vertical (grows along rows)
}

/** Exported for the placement UI, which validates one ship at a time as the player clicks. */
export function shipCells(size: number, length: number, placement: ShipPlacement): number[] | null {
  const { row, col, orientation } = placement;
  const cells: number[] = [];
  for (let i = 0; i < length; i++) {
    const r = orientation === 1 ? row + i : row;
    const c = orientation === 0 ? col + i : col;
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    cells.push(r * size + c);
  }
  return cells;
}

/** Packs 5 ship placements into one number: each ship -> `row*20 + col*2 + orientation` (0-199), base-200 digits. */
export function encodeFleet(placements: ShipPlacement[]): BattleshipMove {
  let code = 0;
  for (let i = placements.length - 1; i >= 0; i--) {
    const { row, col, orientation } = placements[i];
    code = code * 200 + (row * 20 + col * 2 + orientation);
  }
  return code;
}

function decodeFleet(move: BattleshipMove): ShipPlacement[] {
  let remaining = move;
  const placements: ShipPlacement[] = [];
  for (let i = 0; i < SHIP_LENGTHS.length; i++) {
    const digit = remaining % 200;
    remaining = Math.floor(remaining / 200);
    placements.push({ row: Math.floor(digit / 20), col: Math.floor((digit % 20) / 2), orientation: (digit % 2) as 0 | 1 });
  }
  return placements;
}

/** Validates and builds the per-ship cell lists for a fleet placement, or null if any ship is out of bounds / overlapping. */
export function buildFleet(size: number, placements: ShipPlacement[]): number[][] | null {
  if (placements.length !== SHIP_LENGTHS.length) return null;
  const ships: number[][] = [];
  const occupied = new Set<number>();
  for (let i = 0; i < SHIP_LENGTHS.length; i++) {
    const cells = shipCells(size, SHIP_LENGTHS[i], placements[i]);
    if (!cells) return null;
    for (const c of cells) {
      if (occupied.has(c)) return null; // overlap
      occupied.add(c);
    }
    ships.push(cells);
  }
  return ships;
}

export const battleship: Game<BattleshipState, BattleshipMove> = {
  id: "battleship",

  currentPlayer(state) {
    if (state.fleets[0] === null) return 1;
    if (state.fleets[1] === null) return 2;
    return state.toMove;
  },

  legalMoves(state) {
    if (state.phase !== "battle") return [];
    const shooterIdx = state.toMove - 1;
    const fired = new Set(state.shots[shooterIdx]);
    const moves: BattleshipMove[] = [];
    for (let i = 0; i < state.size * state.size; i++) {
      if (!fired.has(i)) moves.push(FIRE_OFFSET + i);
    }
    return moves;
  },

  applyMove(state, move) {
    if (state.phase === "placement") {
      if (move >= FIRE_OFFSET) throw new Error("Illegal move: expected a fleet placement");
      if (state.fleets[0] !== null && state.fleets[1] !== null) throw new Error("Illegal move: both fleets already placed");
      const slot: 0 | 1 = state.fleets[0] === null ? 0 : 1;
      const fleet = buildFleet(state.size, decodeFleet(move));
      if (!fleet) throw new Error("Illegal move: invalid fleet placement");
      const fleets: [number[][] | null, number[][] | null] = [...state.fleets];
      fleets[slot] = fleet;
      const bothPlaced = fleets[0] !== null && fleets[1] !== null;
      return { ...state, fleets, phase: bothPlaced ? "battle" : "placement", toMove: 1 };
    }

    if (state.phase !== "battle") throw new Error("Illegal move: game is over");
    if (move < FIRE_OFFSET) throw new Error("Illegal move: expected a shot");
    const cell = move - FIRE_OFFSET;
    const shooter = state.toMove;
    const shooterIdx = shooter - 1;
    const opponentIdx = otherPlayer(shooter) - 1;
    if (state.shots[shooterIdx].includes(cell)) throw new Error("Illegal move: already fired at that cell");

    const shots: [number[], number[]] = [[...state.shots[0]], [...state.shots[1]]];
    shots[shooterIdx] = [...shots[shooterIdx], cell];

    const opponentFleet = state.fleets[opponentIdx]!;
    const isHit = opponentFleet.some((ship) => ship.includes(cell));
    const allSunk = opponentFleet.every((ship) => ship.every((c) => shots[shooterIdx].includes(c)));

    return {
      ...state,
      shots,
      phase: allSunk ? "done" : "battle",
      winner: allSunk ? shooter : null,
      toMove: allSunk ? state.toMove : isHit && state.huntRule === "again-on-hit" ? shooter : otherPlayer(shooter),
    };
  },

  result(state): GameResult {
    if (state.phase === "done" && state.winner) return { status: "win", winner: state.winner };
    return { status: "ongoing" };
  },
};
