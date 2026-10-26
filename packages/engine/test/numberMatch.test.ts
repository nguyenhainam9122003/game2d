import { describe, expect, it } from "vitest";
import {
  WIDTH,
  canMatch,
  liveNeighbors,
  isValidPair,
  hasAnyValidPair,
  crossOutPair,
  copyRemaining,
  isNumberMatchSolved,
  isStuck,
  initNumberMatch,
  numberMatchMatch,
  numberMatchPassMove,
  type NumberMatchCell,
  type NumberMatchState,
  type NumberMatchMatchState,
} from "../src/games/numberMatch.js";
import { getNumberMatchBotMove } from "../src/bots/numberMatchBot.js";

function cell(value: number, crossed = false): NumberMatchCell {
  return { value, crossed };
}

describe("canMatch", () => {
  it("matches equal values", () => {
    expect(canMatch(7, 7)).toBe(true);
  });
  it("matches values summing to ten", () => {
    expect(canMatch(3, 7)).toBe(true);
  });
  it("rejects anything else", () => {
    expect(canMatch(3, 4)).toBe(false);
  });
});

describe("adjacency", () => {
  it("finds the 8 grid neighbors on a simple sheet", () => {
    // 3 rows of WIDTH=9: index 10 is row1,col1 — a fully interior cell with 8 live neighbors.
    const cells = Array.from({ length: WIDTH * 3 }, () => cell(1));
    const neighbors = liveNeighbors(cells, 10);
    expect(neighbors.sort((a, b) => a - b)).toEqual([0, 1, 2, 9, 11, 18, 19, 20]);
  });

  it("skips over crossed-out cells to find the next live one", () => {
    const cells = Array.from({ length: WIDTH }, () => cell(1));
    cells[1] = cell(1, true); // cross out the immediate right neighbor of index 0
    const neighbors = liveNeighbors(cells, 0);
    expect(neighbors).toContain(2); // skips past index 1 to find index 2
    expect(neighbors).not.toContain(1);
  });

  it("wraps horizontal adjacency from the end of one row to the start of the next", () => {
    const cells = Array.from({ length: WIDTH * 2 }, () => cell(1));
    const lastOfRow0 = WIDTH - 1;
    const firstOfRow1 = WIDTH;
    expect(liveNeighbors(cells, lastOfRow0)).toContain(firstOfRow1);
  });

  it("does not treat column-0-of-next-row as a diagonal neighbor of the last column", () => {
    // The last cell of row 0 (col WIDTH-1) has no "down-right" diagonal neighbor — col WIDTH doesn't
    // exist — even though flat-index horizontal adjacency correctly links it to row 1's first cell.
    const cells = Array.from({ length: WIDTH * 2 }, () => cell(1));
    const lastOfRow0 = WIDTH - 1;
    const neighbors = liveNeighbors(cells, lastOfRow0);
    expect(neighbors).toContain(2 * WIDTH - 1); // straight down (col WIDTH-1, row 1)
    expect(neighbors).not.toContain(WIDTH + 1); // would-be down-right diagonal — out of bounds, must be excluded
  });
});

describe("pairing and copying", () => {
  it("validates and crosses out a real adjacent matching pair", () => {
    const cells = [cell(3), cell(7), cell(5)];
    expect(isValidPair(cells, 0, 1)).toBe(true); // 3+7=10, adjacent
    const state: NumberMatchState = { cells, copiesLeft: 1 };
    const next = crossOutPair(state, 0, 1);
    expect(next.cells[0].crossed).toBe(true);
    expect(next.cells[1].crossed).toBe(true);
    expect(next.cells[2].crossed).toBe(false);
  });

  it("rejects a pair that doesn't match in value", () => {
    const cells = [cell(3), cell(4)];
    expect(isValidPair(cells, 0, 1)).toBe(false);
  });

  it("rejects a pair that isn't adjacent", () => {
    const cells = Array.from({ length: WIDTH * 2 }, () => cell(5));
    // index 0 and index WIDTH*2-1 (far corner) are not adjacent.
    expect(isValidPair(cells, 0, cells.length - 1)).toBe(false);
  });

  it("appends all remaining numbers and consumes one copy", () => {
    const cells = [cell(3), cell(3, true), cell(5)];
    const state: NumberMatchState = { cells, copiesLeft: 2 };
    const next = copyRemaining(state);
    expect(next.copiesLeft).toBe(1);
    expect(next.cells).toHaveLength(5); // 3 original + 2 non-crossed re-appended
    expect(next.cells[3].value).toBe(3);
    expect(next.cells[4].value).toBe(5);
  });

  it("throws when copying with no copies left", () => {
    const state: NumberMatchState = { cells: [cell(1)], copiesLeft: 0 };
    expect(() => copyRemaining(state)).toThrow();
  });
});

describe("game end", () => {
  it("is solved once every cell is crossed out", () => {
    const state: NumberMatchState = { cells: [cell(1, true), cell(1, true)], copiesLeft: 1 };
    expect(isNumberMatchSolved(state)).toBe(true);
  });

  it("is stuck only when no copies remain and no valid pair exists", () => {
    const cells = [cell(3), cell(4)]; // no valid pair (3+4 != 10, not equal)
    expect(hasAnyValidPair(cells)).toBe(false);
    expect(isStuck({ cells, copiesLeft: 0 })).toBe(true);
    expect(isStuck({ cells, copiesLeft: 1 })).toBe(false); // could still copy
  });

  it("is not stuck when a valid pair exists even with no copies left", () => {
    const cells = [cell(3), cell(7)];
    expect(isStuck({ cells, copiesLeft: 0 })).toBe(false);
  });
});

describe("initNumberMatch", () => {
  it("creates a sheet whose length is a multiple of the row width", () => {
    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      const state = initNumberMatch(difficulty);
      expect(state.cells.length % WIDTH).toBe(0);
      expect(state.cells.every((c) => c.value >= 1 && c.value <= 9 && !c.crossed)).toBe(true);
    }
  });
});

describe("numberMatchMatch (2-player competitive)", () => {
  function matchState(cells: NumberMatchCell[], overrides: Partial<NumberMatchMatchState> = {}): NumberMatchMatchState {
    return { cells, toMove: 1, captured: [0, 0], passCount: 0, ...overrides };
  }

  it("lists every valid pair plus a pass move", () => {
    const cells = [cell(3), cell(7), cell(5), cell(5)]; // 0-1 sum to 10, 2-3 equal
    const state = matchState(cells);
    const legal = numberMatchMatch.legalMoves(state);
    expect(legal).toContain(0 * cells.length + 1);
    expect(legal).toContain(2 * cells.length + 3);
    expect(legal).toContain(numberMatchPassMove(cells.length));
  });

  it("crossing out a pair scores the mover and flips the turn", () => {
    const cells = [cell(3), cell(7), cell(1), cell(9)];
    const state = matchState(cells, { toMove: 1 });
    const next = numberMatchMatch.applyMove(state, 0 * cells.length + 1);
    expect(next.cells[0].crossed).toBe(true);
    expect(next.cells[1].crossed).toBe(true);
    expect(next.captured).toEqual([1, 0]);
    expect(next.toMove).toBe(2);
    expect(next.passCount).toBe(0);
  });

  it("credits player 2 when it's their turn", () => {
    const cells = [cell(3), cell(7)];
    const state = matchState(cells, { toMove: 2 });
    const next = numberMatchMatch.applyMove(state, 0 * cells.length + 1);
    expect(next.captured).toEqual([0, 1]);
  });

  it("rejects an invalid pair", () => {
    const cells = [cell(3), cell(4)];
    const state = matchState(cells);
    expect(() => numberMatchMatch.applyMove(state, 0 * cells.length + 1)).toThrow();
  });

  it("passing flips the turn and counts toward ending the match, without affecting score", () => {
    const cells = [cell(3), cell(7)];
    const state = matchState(cells);
    const next = numberMatchMatch.applyMove(state, numberMatchPassMove(cells.length));
    expect(next.toMove).toBe(2);
    expect(next.passCount).toBe(1);
    expect(next.captured).toEqual([0, 0]);
  });

  it("ends the match after two consecutive passes, winner decided by pair count", () => {
    const cells = [cell(3), cell(4)]; // no valid pair at all, so passing is the only option
    const pass = numberMatchPassMove(cells.length);
    let state = matchState(cells, { captured: [2, 1] });
    state = numberMatchMatch.applyMove(state, pass);
    expect(numberMatchMatch.result(state).status).toBe("ongoing");
    state = numberMatchMatch.applyMove(state, pass);
    expect(numberMatchMatch.legalMoves(state)).toEqual([]);
    expect(numberMatchMatch.result(state)).toEqual({ status: "win", winner: 1 });
  });

  it("declares a draw when pair counts are tied at match end", () => {
    const cells = [cell(3), cell(4)];
    const pass = numberMatchPassMove(cells.length);
    let state = matchState(cells, { captured: [2, 2] });
    state = numberMatchMatch.applyMove(state, pass);
    state = numberMatchMatch.applyMove(state, pass);
    expect(numberMatchMatch.result(state)).toEqual({ status: "draw" });
  });
});

describe("number match bot", () => {
  function matchState(cells: NumberMatchCell[]): NumberMatchMatchState {
    return { cells, toMove: 1, captured: [0, 0], passCount: 0 };
  }

  it("always takes an available pair rather than passing", () => {
    const cells = [cell(3), cell(7), cell(2), cell(9)];
    const state = matchState(cells);
    const pass = numberMatchPassMove(cells.length);
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = getNumberMatchBotMove(state, difficulty);
      expect(move).not.toBe(pass);
      expect(numberMatchMatch.legalMoves(state)).toContain(move);
    }
  });

  it("passes when no valid pair exists", () => {
    const cells = [cell(3), cell(4)];
    const state = matchState(cells);
    expect(getNumberMatchBotMove(state, "easy")).toBe(numberMatchPassMove(cells.length));
  });
});
