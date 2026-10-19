import { describe, expect, it } from "vitest";
import {
  battleship,
  initBattleship,
  encodeFleet,
  buildFleet,
  FIRE_OFFSET,
  SHIP_LENGTHS,
  type ShipPlacement,
} from "../src/games/battleship.js";
import { getBattleshipBotMove } from "../src/bots/battleshipBot.js";

const SIZE = 10;

// A simple non-overlapping layout: every ship horizontal, stacked on its own row.
const SIMPLE_PLACEMENTS: ShipPlacement[] = SHIP_LENGTHS.map((_, i) => ({ row: i, col: 0, orientation: 0 }));

function placeBothFleets(state = initBattleship(SIZE)) {
  let s = battleship.applyMove(state, encodeFleet(SIMPLE_PLACEMENTS));
  s = battleship.applyMove(s, encodeFleet(SIMPLE_PLACEMENTS));
  return s;
}

describe("battleship placement", () => {
  it("rejects overlapping ships", () => {
    const overlapping: ShipPlacement[] = SHIP_LENGTHS.map(() => ({ row: 0, col: 0, orientation: 0 }));
    expect(buildFleet(SIZE, overlapping)).toBeNull();
  });

  it("rejects ships that run off the board", () => {
    const offBoard: ShipPlacement[] = [...SIMPLE_PLACEMENTS];
    offBoard[0] = { row: 0, col: SIZE - 2, orientation: 0 }; // length-5 ship, only 2 cols of room
    expect(buildFleet(SIZE, offBoard)).toBeNull();
  });

  it("allows ships to sit edge-to-edge without overlapping", () => {
    const adjacent: ShipPlacement[] = [
      { row: 0, col: 0, orientation: 0 }, // occupies row 0, cols 0-4
      { row: 1, col: 0, orientation: 0 }, // occupies row 1, cols 0-3 — adjacent, not overlapping
      { row: 2, col: 0, orientation: 0 },
      { row: 3, col: 0, orientation: 0 },
      { row: 4, col: 0, orientation: 0 },
    ];
    expect(buildFleet(SIZE, adjacent)).not.toBeNull();
  });

  it("moves to the battle phase once both players have placed", () => {
    let state = initBattleship(SIZE);
    expect(battleship.currentPlayer(state)).toBe(1);
    state = battleship.applyMove(state, encodeFleet(SIMPLE_PLACEMENTS));
    expect(state.phase).toBe("placement");
    expect(battleship.currentPlayer(state)).toBe(2);
    state = battleship.applyMove(state, encodeFleet(SIMPLE_PLACEMENTS));
    expect(state.phase).toBe("battle");
    expect(battleship.currentPlayer(state)).toBe(1);
  });
});

describe("battleship battle phase", () => {
  it("lets the shooter fire again on a hit, and passes the turn on a miss", () => {
    let state = placeBothFleets();
    // Player 1's ship 0 occupies row 0, cols 0-4 => board indices 0-4.
    const hit = battleship.applyMove(state, FIRE_OFFSET + 0);
    expect(hit.toMove).toBe(1); // hit — same player goes again

    const miss = battleship.applyMove(hit, FIRE_OFFSET + 99); // row9 col9, not a ship cell
    expect(miss.toMove).toBe(2); // miss — turn passes
  });

  it("forbids firing at an already-targeted cell", () => {
    const state = placeBothFleets();
    // Cell 0 is a hit, so player 1 keeps the turn — re-targeting the same cell must still be rejected.
    const next = battleship.applyMove(state, FIRE_OFFSET + 0);
    expect(next.toMove).toBe(1);
    expect(() => battleship.applyMove(next, FIRE_OFFSET + 0)).toThrow();
  });

  it("declares a winner once every enemy ship cell has been hit", () => {
    let state = placeBothFleets();
    const allEnemyCells = SIMPLE_PLACEMENTS.flatMap((p, i) =>
      Array.from({ length: SHIP_LENGTHS[i] }, (_, k) => p.row * SIZE + p.col + k),
    );
    for (const cell of allEnemyCells) {
      if (battleship.result(state).status !== "ongoing") break;
      state = battleship.applyMove(state, FIRE_OFFSET + cell);
    }
    expect(battleship.result(state)).toEqual({ status: "win", winner: 1 });
    expect(battleship.legalMoves(state)).toEqual([]);
  });
});

describe("battleship bot", () => {
  it("places a valid fleet and, once battle starts, always fires a legal shot", () => {
    let state = initBattleship(SIZE);
    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      let s = initBattleship(SIZE);
      const placement1 = getBattleshipBotMove(s, difficulty);
      s = battleship.applyMove(s, placement1);
      const placement2 = getBattleshipBotMove(s, difficulty);
      s = battleship.applyMove(s, placement2);
      expect(s.phase).toBe("battle");

      for (let i = 0; i < 5; i++) {
        if (battleship.result(s).status !== "ongoing") break;
        const move = getBattleshipBotMove(s, difficulty);
        expect(battleship.legalMoves(s)).toContain(move);
        s = battleship.applyMove(s, move);
      }
    }
    expect(battleship.currentPlayer(state)).toBe(1); // sanity: untouched baseline state still fresh
  });
});
