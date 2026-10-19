import {
  PLANE_FIRE_OFFSET,
  buildPlaneFleet,
  encodePlaneFleet,
  type PlaneBattleMove,
  type PlaneBattleState,
  type PlaneOrientation,
  type PlanePlacement,
} from "../games/planeBattle.js";
import { type Difficulty, randomChoice } from "./common.js";

function randomFleetMove(size: number, planeCount: number): PlaneBattleMove {
  for (;;) {
    const placements: PlanePlacement[] = Array.from({ length: planeCount }, () => ({
      row: Math.floor(Math.random() * size),
      col: Math.floor(Math.random() * size),
      orientation: Math.floor(Math.random() * 4) as PlaneOrientation,
    }));
    if (buildPlaneFleet(size, planeCount, placements)) return encodePlaneFleet(size, placements);
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

/** Same hunt/parity strategy as the Battleship bot — only ever uses the shooter's own shot history. */
function pickShot(state: PlaneBattleState, difficulty: Difficulty): number {
  const shooterIdx = state.toMove - 1;
  const opponentIdx = shooterIdx === 0 ? 1 : 0;
  const opponentFleet = state.fleets[opponentIdx]!;
  const fired = new Set(state.shots[shooterIdx]);
  const allCells = Array.from({ length: state.size * state.size }, (_, i) => i).filter((c) => !fired.has(c));

  if (difficulty === "easy") return randomChoice(allCells);

  const hits = state.shots[shooterIdx].filter((c) => opponentFleet.some((plane) => plane.includes(c)));
  const destroyedHeads = new Set(opponentFleet.filter((plane) => fired.has(plane[0])).map((plane) => plane[0]));
  const activeHits = hits.filter((c) => !destroyedHeads.has(c));

  if (activeHits.length > 0) {
    if (difficulty !== "medium" && activeHits.length >= 2) {
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

  const parityCells = allCells.filter((c) => (Math.floor(c / state.size) + (c % state.size)) % 2 === 0);
  return randomChoice(parityCells.length > 0 ? parityCells : allCells);
}

export function getPlaneBattleBotMove(state: PlaneBattleState, difficulty: Difficulty = "medium"): PlaneBattleMove {
  if (state.phase === "placement") return randomFleetMove(state.size, state.planeCount);
  return PLANE_FIRE_OFFSET + pickShot(state, difficulty);
}
