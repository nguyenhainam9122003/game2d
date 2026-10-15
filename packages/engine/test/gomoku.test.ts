import { describe, expect, it } from "vitest";
import { gomoku, initGomoku } from "../src/games/gomoku.js";
import { getGomokuBotMove } from "../src/bots/gomokuBot.js";

function idx(size: number, row: number, col: number): number {
  return row * size + col;
}

describe("gomoku engine", () => {
  it("starts empty, 15x15 by default, player 1 to move", () => {
    const state = initGomoku();
    expect(state.size).toBe(15);
    expect(state.board).toHaveLength(225);
    expect(gomoku.currentPlayer(state)).toBe(1);
  });

  it("detects a five-in-a-row win horizontally", () => {
    let state = initGomoku(9, 5);
    // Player 1 plays row 0 cols 0-4, player 2 plays row 1 cols 0-3 (no win).
    const p1Moves = [0, 1, 2, 3, 4].map((c) => idx(9, 0, c));
    const p2Moves = [0, 1, 2, 3].map((c) => idx(9, 1, c));
    for (let i = 0; i < p1Moves.length; i++) {
      state = gomoku.applyMove(state, p1Moves[i]);
      if (i < p2Moves.length) state = gomoku.applyMove(state, p2Moves[i]);
    }
    const result = gomoku.result(state);
    expect(result).toMatchObject({ status: "win", winner: 1 });
  });

  it("detects a diagonal win", () => {
    let state = initGomoku(9, 5);
    const p1Moves = [0, 1, 2, 3, 4].map((i) => idx(9, i, i));
    const p2Moves = [0, 1, 2, 3].map((c) => idx(9, 8, c));
    for (let i = 0; i < p1Moves.length; i++) {
      state = gomoku.applyMove(state, p1Moves[i]);
      if (i < p2Moves.length) state = gomoku.applyMove(state, p2Moves[i]);
    }
    expect(gomoku.result(state)).toMatchObject({ status: "win", winner: 1 });
  });

  it("rejects moves on occupied cells", () => {
    let state = initGomoku(9, 5);
    state = gomoku.applyMove(state, 0);
    expect(() => gomoku.applyMove(state, 0)).toThrow();
  });
});

describe("gomoku bot", () => {
  it("blocks an open four immediately (small board)", () => {
    // Player 2 (opponent) has an open four on row 4: cols 2-5 on a 9x9 board.
    // Player 1 (bot) to move must block at col 1 or col 6.
    let state = initGomoku(9, 5);
    // Alternate dummy player-1 moves far away so it stays player 1's turn after setup.
    // p1 filler moves sit on the four corners so they never line up into
    // a threat of their own — otherwise the bot would (correctly) prefer
    // completing its own five over blocking.
    const setup: Array<[number, number]> = [
      [0, 0], // p1 filler
      [4, 2], // p2
      [8, 0], // p1 filler
      [4, 3], // p2
      [0, 8], // p1 filler
      [4, 4], // p2
      [8, 8], // p1 filler
      [4, 5], // p2
    ];
    for (const [row, col] of setup) {
      state = gomoku.applyMove(state, idx(9, row, col));
    }
    expect(gomoku.currentPlayer(state)).toBe(1);
    const move = getGomokuBotMove(state, "medium");
    const blockingCells = [idx(9, 4, 1), idx(9, 4, 6)];
    expect(blockingCells).toContain(move);
  });

  it("returns a legal move and completes quickly on an empty board", () => {
    const state = initGomoku();
    const start = Date.now();
    const move = getGomokuBotMove(state, "hard");
    const elapsed = Date.now() - start;
    expect(gomoku.legalMoves(state)).toContain(move);
    expect(elapsed).toBeLessThan(2000);
  });
});
