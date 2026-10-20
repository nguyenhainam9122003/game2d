import { describe, expect, it } from "vitest";
import { domino, initDomino, TILES, encodePlay, DRAW_MOVE, PASS_MOVE, type DominoState } from "../src/games/domino.js";
import { getDominoBotMove } from "../src/bots/dominoBot.js";

function tileId(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return TILES.findIndex(([x, y]) => x === lo && y === hi);
}

function emptyState(overrides: Partial<DominoState> = {}): DominoState {
  return {
    hands: [[], []],
    boneyard: [],
    line: [],
    toMove: 1,
    passStreak: 0,
    drawnThisTurn: false,
    drawRule: "one",
    ...overrides,
  };
}

describe("domino setup", () => {
  it("deals 7 tiles to each player and 14 to the boneyard from the 28-tile set", () => {
    const state = initDomino();
    expect(state.hands[0]).toHaveLength(7);
    expect(state.hands[1]).toHaveLength(7);
    expect(state.boneyard).toHaveLength(14);
    const allIds = [...state.hands[0], ...state.hands[1], ...state.boneyard];
    expect(new Set(allIds).size).toBe(28); // no duplicates, every tile dealt exactly once
  });

  it("has exactly 28 unique tiles", () => {
    expect(TILES).toHaveLength(28);
    const seen = new Set(TILES.map(([a, b]) => `${a}-${b}`));
    expect(seen.size).toBe(28);
  });
});

describe("domino play", () => {
  it("lets any tile start an empty line", () => {
    const state = emptyState({ hands: [[tileId(3, 5)], [tileId(6, 6)]] });
    const moves = domino.legalMoves(state);
    expect(moves).toContain(encodePlay(tileId(3, 5), "left"));
  });

  it("only allows tiles matching an open end, and tracks the new end after playing", () => {
    // Line: 3 -- 5 (left end 3, right end 5).
    const state = emptyState({
      hands: [[tileId(6, 6)], [tileId(2, 5), tileId(1, 6)]],
      line: [{ tileId: tileId(3, 5), orientation: [3, 5] }],
      toMove: 2,
    });

    const moves = domino.legalMoves(state);
    expect(moves).toContain(encodePlay(tileId(2, 5), "right")); // matches the right end (5)
    expect(moves).not.toContain(encodePlay(tileId(2, 5), "left")); // doesn't match the left end (3)
    expect(moves).not.toContain(encodePlay(tileId(1, 6), "left"));
    expect(moves).not.toContain(encodePlay(tileId(1, 6), "right")); // matches neither end

    const after = domino.applyMove(state, encodePlay(tileId(2, 5), "right"));
    expect(after.line).toHaveLength(2);
    expect(after.line[1].orientation).toEqual([5, 2]); // touches the old right end (5), new right end is 2
  });

  it("offers both ends as distinct choices when a tile matches each end differently", () => {
    // Line: 3 -- 5. Tile (3,5) matches the left end via its 3-pip (new left end would become 5)
    // and the right end via its 5-pip (new right end would become 3) — two genuinely different outcomes.
    const state = emptyState({
      hands: [[tileId(3, 5)], [tileId(6, 6)]],
      line: [{ tileId: tileId(1, 3), orientation: [3, 1] }, { tileId: tileId(1, 5), orientation: [1, 5] }],
      toMove: 1,
    });
    const moves = domino.legalMoves(state);
    expect(moves).toContain(encodePlay(tileId(3, 5), "left"));
    expect(moves).toContain(encodePlay(tileId(3, 5), "right"));

    const left = domino.applyMove(state, encodePlay(tileId(3, 5), "left"));
    expect(left.line[0].orientation[0]).toBe(5); // new left end

    const right = domino.applyMove(state, encodePlay(tileId(3, 5), "right"));
    expect(right.line[right.line.length - 1].orientation[1]).toBe(3); // new right end
  });

  it("collapses to a single option when both open ends already show the same value", () => {
    const state = emptyState({
      hands: [[tileId(3, 4)], [tileId(6, 6)]],
      line: [{ tileId: tileId(3, 3), orientation: [3, 3] }],
      toMove: 1,
    });
    const moves = domino.legalMoves(state).filter((m) => Math.floor(m / 2) === tileId(3, 4));
    expect(moves).toHaveLength(1);
  });

  it("forces a draw when no hand tile is playable and the boneyard has tiles", () => {
    const state = emptyState({
      hands: [[tileId(0, 0)], [tileId(6, 6)]],
      line: [{ tileId: tileId(3, 5), orientation: [3, 5] }],
      boneyard: [tileId(1, 1)],
      toMove: 1,
    });
    expect(domino.legalMoves(state)).toEqual([DRAW_MOVE]);
  });

  it("forces a pass when the boneyard is empty and no tile is playable", () => {
    const state = emptyState({
      hands: [[tileId(0, 0)], [tileId(6, 6)]],
      line: [{ tileId: tileId(3, 5), orientation: [3, 5] }],
      boneyard: [],
      toMove: 1,
    });
    expect(domino.legalMoves(state)).toEqual([PASS_MOVE]);
  });

  it("forces a pass after drawing once if the drawn tile still doesn't fit", () => {
    const state = emptyState({
      hands: [[tileId(0, 0)], [tileId(6, 6)]],
      line: [{ tileId: tileId(3, 5), orientation: [3, 5] }],
      boneyard: [tileId(1, 1)],
      toMove: 1,
      drawnThisTurn: true,
    });
    expect(domino.legalMoves(state)).toEqual([PASS_MOVE]);
  });

  it("'none' draw rule skips drawing entirely and passes straight away", () => {
    const state = emptyState({
      hands: [[tileId(0, 0)], [tileId(6, 6)]],
      line: [{ tileId: tileId(3, 5), orientation: [3, 5] }],
      boneyard: [tileId(1, 1)],
      toMove: 1,
      drawRule: "none",
    });
    expect(domino.legalMoves(state)).toEqual([PASS_MOVE]);
    const next = domino.applyMove(state, PASS_MOVE);
    expect(next.toMove).toBe(2);
  });

  it("'until-playable' draw rule keeps offering draws even after already drawing once this turn", () => {
    const state = emptyState({
      hands: [[tileId(0, 0)], [tileId(6, 6)]],
      line: [{ tileId: tileId(3, 5), orientation: [3, 5] }],
      boneyard: [tileId(1, 1), tileId(2, 2)],
      toMove: 1,
      drawnThisTurn: true,
      drawRule: "until-playable",
    });
    expect(domino.legalMoves(state)).toEqual([DRAW_MOVE]);
    const next = domino.applyMove(state, DRAW_MOVE);
    expect(next.boneyard).toEqual([tileId(1, 1)]);
    expect(next.hands[0]).toContain(tileId(2, 2));
  });
});

describe("domino game end", () => {
  it("declares a win for whoever empties their hand", () => {
    const state = emptyState({
      hands: [[tileId(3, 5)], [tileId(1, 1), tileId(2, 2)]],
      line: [],
      toMove: 1,
    });
    const next = domino.applyMove(state, encodePlay(tileId(3, 5), "left"));
    expect(domino.result(next)).toEqual({ status: "win", winner: 1 });
  });

  it("scores a blocked game by pip count once the boneyard is empty and both pass", () => {
    const state = emptyState({
      hands: [[tileId(6, 6)], [tileId(0, 0), tileId(1, 1)]], // player 1: 12 pips, player 2: 4 pips
      line: [{ tileId: tileId(3, 4), orientation: [3, 4] }],
      boneyard: [],
      toMove: 1,
      passStreak: 1, // one pass already happened; this one makes two in a row
    });
    const next = domino.applyMove(state, PASS_MOVE);
    expect(domino.result(next)).toEqual({ status: "win", winner: 2 }); // fewer pips wins
  });
});

describe("domino bot", () => {
  it("always returns a legal move", () => {
    const state = emptyState({
      hands: [[tileId(3, 5), tileId(5, 5), tileId(0, 1)], [tileId(2, 2)]],
      line: [],
      toMove: 1,
    });
    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      const move = getDominoBotMove(state, difficulty);
      expect(domino.legalMoves(state)).toContain(move);
    }
  });
});
