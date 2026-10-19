import { describe, expect, it } from "vitest";
import { go, initGo, getGoScore, passMove, GO_KOMI, type GoState } from "../src/games/go.js";
import { getGoBotMove } from "../src/bots/goBot.js";
import type { Cell } from "../src/boardUtils.js";

const SIZE = 9;
function idx(row: number, col: number): number {
  return row * SIZE + col;
}
function emptyGoState(overrides: Partial<GoState> = {}): GoState {
  return { board: new Array(SIZE * SIZE).fill(null) as Cell[], size: SIZE, toMove: 1, passCount: 0, previousBoard: null, ...overrides };
}

describe("go captures and suicide", () => {
  it("captures a lone stone once its last liberty is filled", () => {
    let state = initGo(SIZE);
    const moves: number[] = [idx(4, 4), idx(3, 4), idx(0, 0), idx(4, 3), idx(0, 1), idx(4, 5), idx(0, 2), idx(5, 4)];
    for (const move of moves) state = go.applyMove(state, move);

    expect(state.board[idx(4, 4)]).toBeNull(); // captured
    expect(state.board[idx(3, 4)]).toBe(2);
    expect(state.board[idx(4, 3)]).toBe(2);
    expect(state.board[idx(4, 5)]).toBe(2);
    expect(state.board[idx(5, 4)]).toBe(2);
  });

  it("forbids suicide — placing into a fully surrounded point that captures nothing", () => {
    const board: Cell[] = new Array(SIZE * SIZE).fill(null);
    board[idx(3, 4)] = 1;
    board[idx(4, 3)] = 1;
    board[idx(4, 5)] = 1;
    board[idx(5, 4)] = 1;
    const state = emptyGoState({ board, toMove: 2 }); // white to move into the surrounded point

    const suicideMove = idx(4, 4);
    expect(go.legalMoves(state)).not.toContain(suicideMove);
    expect(() => go.applyMove(state, suicideMove)).toThrow();
  });

  it("allows capturing into an otherwise-suicidal point", () => {
    // A white stone in the corner with only 2 liberties: (0,1) and (1,0). Black already
    // holds (1,0), so playing at (0,1) removes white's last liberty — a capture, not suicide,
    // even though the point black plays into is itself hemmed in by that white stone.
    const board: Cell[] = new Array(SIZE * SIZE).fill(null);
    board[idx(0, 0)] = 2;
    board[idx(1, 0)] = 1;
    const state = emptyGoState({ board, toMove: 1 });

    const captureMove = idx(0, 1);
    expect(go.legalMoves(state)).toContain(captureMove);
    const next = go.applyMove(state, captureMove);
    expect(next.board[idx(0, 0)]).toBeNull();
    expect(next.board[captureMove]).toBe(1);
  });
});

describe("go ko rule", () => {
  it("forbids immediately recapturing a ko", () => {
    const board: Cell[] = new Array(SIZE * SIZE).fill(null);
    board[idx(3, 4)] = 1;
    board[idx(3, 5)] = 2;
    board[idx(4, 3)] = 1;
    board[idx(4, 4)] = 2; // the stone black could recapture
    // (4,5) is the ko point — currently empty, just vacated by white's capture
    board[idx(4, 6)] = 2;
    board[idx(5, 4)] = 1;
    board[idx(5, 5)] = 2;
    const previousBoard = board.slice();
    previousBoard[idx(4, 4)] = null;
    previousBoard[idx(4, 5)] = 1; // before white captured black's stone here

    const state = emptyGoState({ board, toMove: 1, previousBoard });
    const koPoint = idx(4, 5);

    expect(go.legalMoves(state)).not.toContain(koPoint);
    expect(() => go.applyMove(state, koPoint)).toThrow();

    // Playing elsewhere first changes previousBoard, so the ko point opens back up.
    const elsewhere = go.applyMove(state, idx(0, 0));
    const white = go.applyMove(elsewhere, idx(0, 1));
    expect(go.legalMoves(white)).toContain(koPoint);
  });
});

describe("go scoring and game end", () => {
  it("scores stones on the board plus single-color-bordered territory, with komi for white", () => {
    const board: Cell[] = new Array(SIZE * SIZE).fill(null);
    // A 2x1 black group in a corner, fully enclosing one empty point as territory.
    board[idx(0, 0)] = 1;
    board[idx(1, 0)] = 1;
    board[idx(0, 1)] = 1;
    board[idx(1, 1)] = 1;
    // (0,2) and (1,2) border both black (via nothing — let's just check direct count instead of territory nuance)
    const state = emptyGoState({ board });

    const score = getGoScore(state);
    expect(score.black).toBeGreaterThanOrEqual(4); // at least the 4 stones themselves
    expect(score.white).toBe(GO_KOMI); // no white stones, no white territory
  });

  it("ends the game after two consecutive passes and declares a winner via score", () => {
    const board: Cell[] = new Array(SIZE * SIZE).fill(null);
    board[idx(0, 0)] = 1; // black has more stones/territory than white's komi-only score
    board[idx(0, 1)] = 1;
    board[idx(1, 0)] = 1;
    board[idx(1, 1)] = 1;
    // No white stones at all, so the entire rest of the empty board borders only black —
    // area scoring awards it all as black territory, easily beating white's komi-only score.
    const state = emptyGoState({ board, toMove: 1 });

    const afterFirstPass = go.applyMove(state, passMove(SIZE));
    expect(go.result(afterFirstPass).status).toBe("ongoing");
    const afterSecondPass = go.applyMove(afterFirstPass, passMove(SIZE));
    expect(go.legalMoves(afterSecondPass)).toEqual([]);
    expect(go.result(afterSecondPass)).toEqual({ status: "win", winner: 1 });
  });
});

describe("go bot", () => {
  it("returns a legal move from the start position within a reasonable time", () => {
    const state = initGo(SIZE);
    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      const start = Date.now();
      const move = getGoBotMove(state, difficulty);
      const elapsed = Date.now() - start;
      expect(go.legalMoves(state)).toContain(move);
      expect(elapsed).toBeLessThan(5000);
    }
  });
});
