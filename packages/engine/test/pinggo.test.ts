import { describe, expect, it } from "vitest";
import {
  PINGGO_CELL_COUNT,
  PINGGO_WIN_LINES,
  PINGGO_CALL_INTERVAL_MS,
  PINGGO_MATCH_LINES_TO_WIN,
  generatePinggoMatchCard,
  shufflePinggoMatchCard,
  findPinggoMatchCompletedLines,
} from "../src/games/pinggo.js";
import { getPinggoBotCall } from "../src/bots/pinggoBot.js";

describe("generatePinggoMatchCard", () => {
  it("produces every number 1-25 exactly once, in order — the player arranges it from there", () => {
    const card = generatePinggoMatchCard();
    expect(card).toEqual(Array.from({ length: PINGGO_CELL_COUNT }, (_, i) => i + 1));
  });
});

describe("shufflePinggoMatchCard", () => {
  it("keeps the same 25 numbers, just reordered, without mutating the input", () => {
    const card = generatePinggoMatchCard();
    const shuffled = shufflePinggoMatchCard(card);
    expect(card).toEqual(Array.from({ length: PINGGO_CELL_COUNT }, (_, i) => i + 1)); // unchanged
    expect(shuffled).toHaveLength(PINGGO_CELL_COUNT);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(card);
  });
});

describe("findPinggoMatchCompletedLines", () => {
  it("returns no lines when nothing is called", () => {
    const card = generatePinggoMatchCard();
    expect(findPinggoMatchCompletedLines(card, new Set())).toHaveLength(0);
  });

  it("finds a completed row once every one of its numbers has been called", () => {
    const card = Array.from({ length: 25 }, (_, i) => i + 1); // row 2 = indices 10-14 = values 11-15
    expect(findPinggoMatchCompletedLines(card, new Set([11, 12, 13, 14]))).toHaveLength(0);
    expect(findPinggoMatchCompletedLines(card, new Set([11, 12, 13, 14, 15]))).toEqual([[10, 11, 12, 13, 14]]);
  });

  it("counts multiple completed lines at once, needed for the win threshold", () => {
    const card = Array.from({ length: 25 }, (_, i) => i + 1); // identity card: row i == column i's first 5, etc.
    // Complete row 0 (values 1-5) and row 1 (values 6-10).
    const called = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(findPinggoMatchCompletedLines(card, called)).toHaveLength(2);
  });

  it("exposes exactly 12 win lines (5 rows + 5 columns + 2 diagonals)", () => {
    expect(PINGGO_WIN_LINES).toHaveLength(12);
  });

  it("requires 5 completed lines to win", () => {
    expect(PINGGO_MATCH_LINES_TO_WIN).toBe(5);
  });
});

describe("PINGGO_CALL_INTERVAL_MS", () => {
  it("gets faster at higher difficulty", () => {
    expect(PINGGO_CALL_INTERVAL_MS.easy).toBeGreaterThan(PINGGO_CALL_INTERVAL_MS.medium);
    expect(PINGGO_CALL_INTERVAL_MS.medium).toBeGreaterThan(PINGGO_CALL_INTERVAL_MS.hard);
    expect(PINGGO_CALL_INTERVAL_MS.hard).toBeGreaterThan(PINGGO_CALL_INTERVAL_MS.expert);
  });
});

describe("getPinggoBotCall", () => {
  it("only ever calls a not-yet-called number 1-25", () => {
    const card = generatePinggoMatchCard();
    const called = new Set([1, 2, 3]);
    for (let i = 0; i < 20; i++) {
      const n = getPinggoBotCall(card, called, "easy");
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(PINGGO_CELL_COUNT);
      expect(called.has(n)).toBe(false);
    }
  });

  it("on hard/expert, prefers a number still on its own card when one is available", () => {
    const card = [5, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    // Every number except 5 is already called — only 5 (on the bot's own card) remains.
    const called = new Set(Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => n !== 5));
    expect(getPinggoBotCall(card, called, "hard")).toBe(5);
  });
});
