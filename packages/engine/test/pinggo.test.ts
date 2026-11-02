import { describe, expect, it } from "vitest";
import {
  generatePinggoCard,
  generatePinggoCallOrder,
  findPinggoWinLine,
  PINGGO_CELL_COUNT,
  PINGGO_FREE_INDEX,
  PINGGO_MAX_NUMBER,
  PINGGO_WIN_LINES,
  PINGGO_CALL_INTERVAL_MS,
} from "../src/games/pinggo.js";

describe("generatePinggoCard", () => {
  it("creates a 25-cell card with a free center and column-ranged numbers", () => {
    const card = generatePinggoCard();
    expect(card).toHaveLength(PINGGO_CELL_COUNT);
    expect(card[PINGGO_FREE_INDEX]).toBeNull();

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const index = row * 5 + col;
        if (index === PINGGO_FREE_INDEX) continue;
        const value = card[index];
        expect(value).not.toBeNull();
        expect(value as number).toBeGreaterThanOrEqual(col * 15 + 1);
        expect(value as number).toBeLessThanOrEqual(col * 15 + 15);
      }
    }
  });

  it("never repeats a number within the same column", () => {
    const card = generatePinggoCard();
    for (let col = 0; col < 5; col++) {
      const colValues = [0, 1, 2, 3, 4].map((row) => card[row * 5 + col]).filter((v) => v !== null);
      expect(new Set(colValues).size).toBe(colValues.length);
    }
  });
});

describe("generatePinggoCallOrder", () => {
  it("produces every number 1-75 exactly once, in some order", () => {
    const order = generatePinggoCallOrder();
    expect(order).toHaveLength(PINGGO_MAX_NUMBER);
    expect(new Set(order).size).toBe(PINGGO_MAX_NUMBER);
    for (let n = 1; n <= PINGGO_MAX_NUMBER; n++) expect(order).toContain(n);
  });
});

describe("findPinggoWinLine", () => {
  it("returns null when nothing is marked", () => {
    expect(findPinggoWinLine(new Set())).toBeNull();
  });

  it("finds a completed row, treating the free center as always marked", () => {
    // Row 2 is indices 10-14; index 12 is the free center and doesn't need to be in `marked`.
    const marked = new Set([10, 11, 13, 14]);
    const line = findPinggoWinLine(marked);
    expect(line).toEqual([10, 11, 12, 13, 14]);
  });

  it("finds a completed column", () => {
    const col1 = [1, 6, 11, 16, 21];
    const line = findPinggoWinLine(new Set(col1));
    expect(line).toEqual(col1);
  });

  it("finds a completed diagonal", () => {
    const diagonal = [0, 6, 12, 18, 24]; // top-left to bottom-right, through the free center
    const line = findPinggoWinLine(new Set([0, 6, 18, 24]));
    expect(line).toEqual(diagonal);
  });

  it("does not report a win for a merely partial line", () => {
    expect(findPinggoWinLine(new Set([10, 11, 13]))).toBeNull();
  });

  it("exposes exactly 12 win lines (5 rows + 5 columns + 2 diagonals)", () => {
    expect(PINGGO_WIN_LINES).toHaveLength(12);
  });
});

describe("PINGGO_CALL_INTERVAL_MS", () => {
  it("gets faster at higher difficulty", () => {
    expect(PINGGO_CALL_INTERVAL_MS.easy).toBeGreaterThan(PINGGO_CALL_INTERVAL_MS.medium);
    expect(PINGGO_CALL_INTERVAL_MS.medium).toBeGreaterThan(PINGGO_CALL_INTERVAL_MS.hard);
    expect(PINGGO_CALL_INTERVAL_MS.hard).toBeGreaterThan(PINGGO_CALL_INTERVAL_MS.expert);
  });
});
