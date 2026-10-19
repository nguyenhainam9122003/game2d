import { describe, expect, it } from "vitest";
import {
  planeBattle,
  initPlaneBattle,
  planeCells,
  buildPlaneFleet,
  encodePlaneFleet,
  PLANE_FIRE_OFFSET,
  variantConfig,
  type PlanePlacement,
} from "../src/games/planeBattle.js";
import { getPlaneBattleBotMove } from "../src/bots/planeBattleBot.js";

const { size: SIZE, planeCount: PLANE_COUNT } = variantConfig("small");

function idx(row: number, col: number): number {
  return row * SIZE + col;
}

// Three planes, all facing up, spaced well apart so none overlap.
const SIMPLE_PLACEMENTS: PlanePlacement[] = [
  { row: 3, col: 1, orientation: 0 },
  { row: 3, col: 5, orientation: 0 },
  { row: 1, col: 8, orientation: 0 },
];

function placeBothFleets(state = initPlaneBattle("small")) {
  let s = planeBattle.applyMove(state, encodePlaneFleet(SIZE, SIMPLE_PLACEMENTS));
  s = planeBattle.applyMove(s, encodePlaneFleet(SIZE, SIMPLE_PLACEMENTS));
  return s;
}

describe("plane shape", () => {
  it("builds the 8-cell plane silhouette with the head as cells[0], facing up", () => {
    const cells = planeCells(SIZE, { row: 5, col: 5, orientation: 0 });
    expect(cells).not.toBeNull();
    expect(cells).toHaveLength(8);
    expect(cells![0]).toBe(idx(5, 5)); // head
    expect(cells).toEqual(
      expect.arrayContaining([
        idx(5, 5), // head
        idx(6, 5), // body
        idx(7, 4), idx(7, 5), idx(7, 6), // wings
        idx(8, 4), idx(8, 5), idx(8, 6), // tail
      ]),
    );
  });

  it("rotates correctly when facing right", () => {
    const cells = planeCells(SIZE, { row: 5, col: 5, orientation: 1 });
    expect(cells).toEqual(
      expect.arrayContaining([
        idx(5, 5), // head
        idx(5, 4), // body
        idx(4, 3), idx(5, 3), idx(6, 3), // wings
        idx(4, 2), idx(5, 2), idx(6, 2), // tail
      ]),
    );
  });

  it("rejects planes that would run off the board", () => {
    expect(planeCells(SIZE, { row: 0, col: 0, orientation: 0 })).toBeNull(); // tail runs off the top
  });
});

describe("plane battle placement", () => {
  it("rejects overlapping planes", () => {
    const overlapping: PlanePlacement[] = [
      { row: 5, col: 5, orientation: 0 },
      { row: 5, col: 5, orientation: 2 }, // shares the same head cell
      SIMPLE_PLACEMENTS[2],
    ];
    expect(buildPlaneFleet(SIZE, PLANE_COUNT, overlapping)).toBeNull();
  });

  it("moves to the battle phase once both players have placed", () => {
    let state = initPlaneBattle("small");
    expect(state.size).toBe(10);
    expect(state.planeCount).toBe(3);
    state = planeBattle.applyMove(state, encodePlaneFleet(SIZE, SIMPLE_PLACEMENTS));
    expect(state.phase).toBe("placement");
    state = planeBattle.applyMove(state, encodePlaneFleet(SIZE, SIMPLE_PLACEMENTS));
    expect(state.phase).toBe("battle");
  });
});

describe("plane battle combat", () => {
  it("never grants an extra shot, even on a hit", () => {
    const state = placeBothFleets();
    const headCell = SIMPLE_PLACEMENTS[0].row * SIZE + SIMPLE_PLACEMENTS[0].col;
    const next = planeBattle.applyMove(state, PLANE_FIRE_OFFSET + headCell);
    expect(next.toMove).toBe(2); // turn always passes, unlike battleship
  });

  it("only destroys a plane when its head is hit — other hits don't end the game", () => {
    let state = placeBothFleets();
    const plane = planeCells(SIZE, SIMPLE_PLACEMENTS[0])!;
    const bodyCell = plane[1]; // not the head
    state = planeBattle.applyMove(state, PLANE_FIRE_OFFSET + bodyCell);
    expect(planeBattle.result(state).status).toBe("ongoing");
  });

  it("declares a winner once every enemy plane's head has been hit", () => {
    let state = placeBothFleets();
    const headCells = SIMPLE_PLACEMENTS.map((p) => p.row * SIZE + p.col);
    const fillerCells = [0, 1, 2]; // nowhere near any head (31, 35, 88) — harmless no-op shots for player 2
    for (let i = 0; i < headCells.length; i++) {
      if (planeBattle.result(state).status !== "ongoing") break;
      state = planeBattle.applyMove(state, PLANE_FIRE_OFFSET + headCells[i]);
      // Player 2 takes a harmless filler shot so it stays player 1's turn to hit the next head.
      if (planeBattle.result(state).status === "ongoing") {
        state = planeBattle.applyMove(state, PLANE_FIRE_OFFSET + fillerCells[i]);
      }
    }
    expect(planeBattle.result(state)).toEqual({ status: "win", winner: 1 });
  });
});

describe("plane battle bot", () => {
  it("places a valid fleet and always fires a legal shot during battle", () => {
    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      let s = initPlaneBattle("small");
      s = planeBattle.applyMove(s, getPlaneBattleBotMove(s, difficulty));
      s = planeBattle.applyMove(s, getPlaneBattleBotMove(s, difficulty));
      expect(s.phase).toBe("battle");
      for (let i = 0; i < 5; i++) {
        if (planeBattle.result(s).status !== "ongoing") break;
        const move = getPlaneBattleBotMove(s, difficulty);
        expect(planeBattle.legalMoves(s)).toContain(move);
        s = planeBattle.applyMove(s, move);
      }
    }
  });
});
