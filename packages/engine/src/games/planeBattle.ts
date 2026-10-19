import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

/**
 * "Bắn máy bay" — a Battleship variant where each hidden piece is an
 * 8-cell plane silhouette (head, one body cell, a 3-wide wing row, a 3-wide
 * tail) that can face any of 4 directions, and — unlike Battleship — only
 * hitting the *head* destroys it; hitting any other cell just reveals a
 * miss-free "hit" with no further consequence. Also unlike Battleship, a
 * hit never grants an extra shot — every shot passes the turn.
 */
export type PlaneVariant = "small" | "large";

export function variantConfig(variant: PlaneVariant): { size: number; planeCount: number } {
  return variant === "large" ? { size: 15, planeCount: 5 } : { size: 10, planeCount: 3 };
}

export type PlaneOrientation = 0 | 1 | 2 | 3; // 0=up, 1=right, 2=down, 3=left (direction the nose points)
const FACINGS: Record<PlaneOrientation, [number, number]> = {
  0: [-1, 0],
  1: [0, 1],
  2: [1, 0],
  3: [0, -1],
};
const PLANE_SHAPE = [
  { along: 0, across: 0 }, // head
  { along: 1, across: 0 }, // body
  { along: 2, across: -1 },
  { along: 2, across: 0 },
  { along: 2, across: 1 }, // wings
  { along: 3, across: -1 },
  { along: 3, across: 0 },
  { along: 3, across: 1 }, // tail
];

export interface PlanePlacement {
  row: number;
  col: number;
  orientation: PlaneOrientation;
}

/** Builds the 8 board-index cells for one plane, with cells[0] always the head — or null if any cell is off-board. */
export function planeCells(size: number, placement: PlanePlacement): number[] | null {
  const [fr, fc] = FACINGS[placement.orientation];
  const [pr, pc] = [fc, -fr];
  const cells: number[] = [];
  for (const { along, across } of PLANE_SHAPE) {
    const r = placement.row - along * fr + across * pr;
    const c = placement.col - along * fc + across * pc;
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    cells.push(r * size + c);
  }
  return cells;
}

export interface PlaneFleetState {
  size: number;
  planeCount: number;
  phase: "placement" | "battle" | "done";
  /** Index 0 = player 1's planes, index 1 = player 2's — each plane's cells, cells[0] = head. */
  fleets: [number[][] | null, number[][] | null];
  shots: [number[], number[]];
  toMove: Player;
  winner: Player | null;
}

export type PlaneBattleState = PlaneFleetState;
export type PlaneBattleMove = number;

export const PLANE_FIRE_OFFSET = 1_000_000_000_000_000;

export function initPlaneBattle(variant: PlaneVariant = "small"): PlaneBattleState {
  const { size, planeCount } = variantConfig(variant);
  return { size, planeCount, phase: "placement", fleets: [null, null], shots: [[], []], toMove: 1, winner: null };
}

function placementRadix(size: number): number {
  return size * size * 4;
}

export function encodePlaneFleet(size: number, placements: PlanePlacement[]): PlaneBattleMove {
  const radix = placementRadix(size);
  let code = 0;
  for (let i = placements.length - 1; i >= 0; i--) {
    const { row, col, orientation } = placements[i];
    code = code * radix + (row * size * 4 + col * 4 + orientation);
  }
  return code;
}

function decodePlaneFleet(size: number, planeCount: number, move: PlaneBattleMove): PlanePlacement[] {
  const radix = placementRadix(size);
  let remaining = move;
  const placements: PlanePlacement[] = [];
  for (let i = 0; i < planeCount; i++) {
    const digit = remaining % radix;
    remaining = Math.floor(remaining / radix);
    const orientation = (digit % 4) as PlaneOrientation;
    const rest = Math.floor(digit / 4);
    placements.push({ row: Math.floor(rest / size), col: rest % size, orientation });
  }
  return placements;
}

/** Validates and builds non-overlapping plane cell groups, or null if any plane is off-board or overlapping. */
export function buildPlaneFleet(size: number, planeCount: number, placements: PlanePlacement[]): number[][] | null {
  if (placements.length !== planeCount) return null;
  const planes: number[][] = [];
  const occupied = new Set<number>();
  for (const placement of placements) {
    const cells = planeCells(size, placement);
    if (!cells) return null;
    for (const c of cells) {
      if (occupied.has(c)) return null;
      occupied.add(c);
    }
    planes.push(cells);
  }
  return planes;
}

export const planeBattle: Game<PlaneBattleState, PlaneBattleMove> = {
  id: "plane-battle",

  currentPlayer(state) {
    if (state.fleets[0] === null) return 1;
    if (state.fleets[1] === null) return 2;
    return state.toMove;
  },

  legalMoves(state) {
    if (state.phase !== "battle") return [];
    const shooterIdx = state.toMove - 1;
    const fired = new Set(state.shots[shooterIdx]);
    const moves: PlaneBattleMove[] = [];
    for (let i = 0; i < state.size * state.size; i++) {
      if (!fired.has(i)) moves.push(PLANE_FIRE_OFFSET + i);
    }
    return moves;
  },

  applyMove(state, move) {
    if (state.phase === "placement") {
      if (move >= PLANE_FIRE_OFFSET) throw new Error("Illegal move: expected a fleet placement");
      if (state.fleets[0] !== null && state.fleets[1] !== null) throw new Error("Illegal move: both fleets already placed");
      const slot: 0 | 1 = state.fleets[0] === null ? 0 : 1;
      const fleet = buildPlaneFleet(state.size, state.planeCount, decodePlaneFleet(state.size, state.planeCount, move));
      if (!fleet) throw new Error("Illegal move: invalid fleet placement");
      const fleets: [number[][] | null, number[][] | null] = [...state.fleets];
      fleets[slot] = fleet;
      const bothPlaced = fleets[0] !== null && fleets[1] !== null;
      return { ...state, fleets, phase: bothPlaced ? "battle" : "placement", toMove: 1 };
    }

    if (state.phase !== "battle") throw new Error("Illegal move: game is over");
    if (move < PLANE_FIRE_OFFSET) throw new Error("Illegal move: expected a shot");
    const cell = move - PLANE_FIRE_OFFSET;
    const shooter = state.toMove;
    const shooterIdx = shooter - 1;
    const opponentIdx = otherPlayer(shooter) - 1;
    if (state.shots[shooterIdx].includes(cell)) throw new Error("Illegal move: already fired at that cell");

    const shots: [number[], number[]] = [[...state.shots[0]], [...state.shots[1]]];
    shots[shooterIdx] = [...shots[shooterIdx], cell];

    const opponentFleet = state.fleets[opponentIdx]!;
    const allHeadsDown = opponentFleet.every((plane) => shots[shooterIdx].includes(plane[0]));

    return {
      ...state,
      shots,
      phase: allHeadsDown ? "done" : "battle",
      winner: allHeadsDown ? shooter : null,
      // Unlike battleship, a hit never grants another shot — the turn always passes.
      toMove: allHeadsDown ? state.toMove : otherPlayer(shooter),
    };
  },

  result(state): GameResult {
    if (state.phase === "done" && state.winner) return { status: "win", winner: state.winner };
    return { status: "ongoing" };
  },
};
