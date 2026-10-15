import { describe, expect, it } from "vitest";
import { initTicTacToe, ticTacToe } from "../src/games/ticTacToe.js";
import { getTicTacToeBotMove } from "../src/bots/ticTacToeBot.js";

describe("ticTacToe engine", () => {
  it("starts empty with player 1 to move", () => {
    const state = initTicTacToe();
    expect(state.board.every((c) => c === null)).toBe(true);
    expect(ticTacToe.currentPlayer(state)).toBe(1);
    expect(ticTacToe.result(state)).toEqual({ status: "ongoing" });
  });

  it("alternates players and rejects occupied cells", () => {
    let state = initTicTacToe();
    state = ticTacToe.applyMove(state, 0);
    expect(ticTacToe.currentPlayer(state)).toBe(2);
    expect(() => ticTacToe.applyMove(state, 0)).toThrow();
  });

  it("detects a horizontal win", () => {
    let state = initTicTacToe();
    // X: 0,1,2  O: 3,4
    for (const move of [0, 3, 1, 4, 2]) {
      state = ticTacToe.applyMove(state, move);
    }
    const result = ticTacToe.result(state);
    expect(result).toMatchObject({ status: "win", winner: 1 });
  });

  it("detects a draw", () => {
    // X O X / X O O / O X X -> no winner, board full
    const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    let state = initTicTacToe();
    for (const move of moves) {
      if (ticTacToe.result(state).status !== "ongoing") break;
      state = ticTacToe.applyMove(state, move);
    }
    expect(ticTacToe.result(state).status).toBe("draw");
  });

  it("legalMoves is empty once the game is over", () => {
    let state = initTicTacToe();
    for (const move of [0, 3, 1, 4, 2]) {
      state = ticTacToe.applyMove(state, move);
    }
    expect(ticTacToe.legalMoves(state)).toEqual([]);
  });
});

describe("ticTacToe bot (hard = perfect play)", () => {
  it("never loses to a random opponent across many games", () => {
    for (let game = 0; game < 30; game++) {
      let state = initTicTacToe();
      while (ticTacToe.result(state).status === "ongoing") {
        const player = ticTacToe.currentPlayer(state);
        const move =
          player === 1
            ? getTicTacToeBotMove(state, "hard")
            : ticTacToe.legalMoves(state)[0];
        state = ticTacToe.applyMove(state, move);
      }
      const result = ticTacToe.result(state);
      expect(result.status === "win" ? result.winner : "draw").not.toBe(2);
    }
  });

  it("blocks an immediate opponent win", () => {
    // X has corners 0,8 (no threat of its own). O has two in a row (3,4)
    // and threatens to win at 5, so X must block there.
    let state = initTicTacToe();
    for (const move of [0, 3, 8, 4]) {
      state = ticTacToe.applyMove(state, move);
    }
    const move = getTicTacToeBotMove(state, "hard");
    expect(move).toBe(5);
  });
});
