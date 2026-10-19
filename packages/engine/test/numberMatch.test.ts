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
  type NumberMatchCell,
  type NumberMatchState,
} from "../src/games/numberMatch.js";

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
