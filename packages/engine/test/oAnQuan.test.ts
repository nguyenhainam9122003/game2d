import { describe, expect, it } from "vitest";
import {
  initOAnQuan,
  oAnQuan,
  type OAnQuanState,
  PLAYER1_PITS,
  PLAYER2_PITS,
} from "../src/games/oAnQuan.js";
import { getOAnQuanBotMove } from "../src/bots/oAnQuanBot.js";

function totalStonesOnBoard(state: OAnQuanState): number {
  return state.pits.reduce((a, b) => a + b, 0);
}

describe("oAnQuan engine", () => {
  it("starts with 12 pits, 5 dân each, 10 quan each, 70 stones total", () => {
    const state = initOAnQuan();
    expect(state.pits).toHaveLength(12);
    expect(PLAYER1_PITS.every((i) => state.pits[i] === 5)).toBe(true);
    expect(PLAYER2_PITS.every((i) => state.pits[i] === 5)).toBe(true);
    expect(state.pits[0]).toBe(10);
    expect(state.pits[6]).toBe(10);
    expect(totalStonesOnBoard(state)).toBe(70);
    expect(oAnQuan.currentPlayer(state)).toBe(1);
  });

  it("rejects picking an empty or opponent-owned pit", () => {
    const state = initOAnQuan();
    expect(() => oAnQuan.applyMove(state, 7)).toThrow(); // player 2's pit, not player 1's

    const emptyPit: OAnQuanState = { ...state, pits: [...state.pits] };
    emptyPit.pits[1] = 0;
    expect(() => oAnQuan.applyMove(emptyPit, 1)).toThrow();
  });

  it("sows one stone per pit, chain-sows through non-empty landings, and captures correctly", () => {
    const state = initOAnQuan();
    const next = oAnQuan.applyMove(state, 1);

    // Hand-computed expected result for this exact opening move (see
    // comment in oAnQuan.ts for the sowing/capture algorithm):
    // pit1(5) sows into 2..6, chain-sows pit7(5) into 8..11,0,
    // lands with pit1 empty next -> captures pit2 (6 stones).
    expect(next.pits).toEqual([11, 0, 0, 6, 6, 6, 11, 0, 6, 6, 6, 6]);
    expect(next.captured).toEqual([6, 0]);
    expect(next.toMove).toBe(2);
    expect(next.gameOver).toBe(false);
    expect(totalStonesOnBoard(next) + next.captured[0] + next.captured[1]).toBe(70);
  });

  it("ends the game and sweeps the board when the next player has no stones left", () => {
    const state: OAnQuanState = {
      pits: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0], // only player 1's pit 5 has a stone
      toMove: 1,
      captured: [0, 0],
      gameOver: false,
    };
    const next = oAnQuan.applyMove(state, 5);
    expect(next.gameOver).toBe(true);
    expect(next.captured).toEqual([1, 0]); // the lone stone, swept to player 1
    expect(totalStonesOnBoard(next)).toBe(0);
    expect(oAnQuan.result(next)).toEqual({ status: "win", winner: 1 });
    expect(oAnQuan.legalMoves(next)).toEqual([]);
  });

  it("reports a draw when captured totals are equal", () => {
    const state: OAnQuanState = {
      pits: new Array(12).fill(0),
      toMove: 1,
      captured: [35, 35],
      gameOver: true,
    };
    expect(oAnQuan.result(state)).toEqual({ status: "draw" });
  });
});

describe("oAnQuan bot", () => {
  it("always returns one of the legal moves and finishes quickly", () => {
    const state = initOAnQuan();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const start = Date.now();
      const move = getOAnQuanBotMove(state, difficulty);
      expect(oAnQuan.legalMoves(state)).toContain(move);
      expect(Date.now() - start).toBeLessThan(2000);
    }
  });
});
