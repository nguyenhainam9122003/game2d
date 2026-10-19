import { describe, expect, it } from "vitest";
import {
  xiangqi,
  initXiangqi,
  encodeXiangqiMove,
  type XiangqiState,
  type XiangqiSquare,
} from "../src/games/xiangqi.js";
import { getXiangqiBotMove } from "../src/bots/xiangqiBot.js";

function idx(rank: number, file: number): number {
  return rank * 9 + file;
}

function emptyBoardState(overrides: Partial<XiangqiState> = {}): XiangqiState {
  return {
    board: new Array(90).fill(null) as XiangqiSquare[],
    toMove: 1,
    halfmoveClock: 0,
    ...overrides,
  };
}

function perft(state: XiangqiState, depth: number): number {
  if (depth === 0) return 1;
  const moves = xiangqi.legalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) nodes += perft(xiangqi.applyMove(state, move), depth - 1);
  return nodes;
}

describe("xiangqi move generation (perft)", () => {
  // 44 and 1920 are the well-known reference perft values for the xiangqi
  // starting position (analogous to chess's 20/400/8902).
  it("perft(1) from the start position is 44", () => {
    expect(perft(initXiangqi(), 1)).toBe(44);
  });

  it("perft(2) from the start position is 1920", () => {
    expect(perft(initXiangqi(), 2)).toBe(1920);
  });
});

describe("xiangqi special rules", () => {
  it("blocks the horse when its leg is occupied", () => {
    const board: XiangqiSquare[] = new Array(90).fill(null);
    board[idx(4, 1)] = { type: "h", player: 1 };
    board[idx(4, 2)] = { type: "s", player: 1 }; // sits on the leg for the (+1,+2) jump
    board[idx(0, 4)] = { type: "g", player: 1 };
    board[idx(9, 0)] = { type: "g", player: 2 }; // off file 4 so it never faces the red general
    const state = emptyBoardState({ board, toMove: 1 });

    const blockedMove = encodeXiangqiMove(idx(4, 1), idx(5, 3));
    const openMove = encodeXiangqiMove(idx(4, 1), idx(6, 0)); // leg at (5,1) is empty
    const moves = xiangqi.legalMoves(state);
    expect(moves).not.toContain(blockedMove);
    expect(moves).toContain(openMove);
  });

  it("blocks the elephant at its eye and keeps it on its own side of the river", () => {
    const board: XiangqiSquare[] = new Array(90).fill(null);
    board[idx(3, 2)] = { type: "e", player: 1 }; // one row short of the river (river is between rank 4 and 5)
    board[idx(2, 1)] = { type: "s", player: 1 }; // sits on the eye for the (-2,-2) jump
    board[idx(0, 4)] = { type: "g", player: 1 };
    board[idx(9, 0)] = { type: "g", player: 2 }; // off file 4 so it never faces the red general
    const state = emptyBoardState({ board, toMove: 1 });

    const moves = xiangqi.legalMoves(state);
    expect(moves).not.toContain(encodeXiangqiMove(idx(3, 2), idx(5, 4))); // would cross the river
    expect(moves).not.toContain(encodeXiangqiMove(idx(3, 2), idx(5, 0))); // would cross the river
    expect(moves).not.toContain(encodeXiangqiMove(idx(3, 2), idx(1, 0))); // eye blocked
    expect(moves).toContain(encodeXiangqiMove(idx(3, 2), idx(1, 4))); // clear and still on home side
  });

  it("lets the cannon capture only the first piece beyond exactly one screen", () => {
    const board: XiangqiSquare[] = new Array(90).fill(null);
    board[idx(0, 0)] = { type: "c", player: 1 };
    board[idx(3, 0)] = { type: "s", player: 1 }; // screen
    board[idx(6, 0)] = { type: "s", player: 2 }; // first piece beyond the screen — capturable
    board[idx(8, 0)] = { type: "r", player: 2 }; // beyond that — not reachable in one jump
    board[idx(0, 4)] = { type: "g", player: 1 };
    board[idx(9, 1)] = { type: "g", player: 2 }; // off file 4 so it never faces the red general
    const state = emptyBoardState({ board, toMove: 1 });

    const moves = xiangqi.legalMoves(state);
    expect(moves).toContain(encodeXiangqiMove(idx(0, 0), idx(6, 0)));
    expect(moves).not.toContain(encodeXiangqiMove(idx(0, 0), idx(8, 0)));
    expect(moves).not.toContain(encodeXiangqiMove(idx(0, 0), idx(3, 0))); // can't land on the screen itself
  });

  it("only lets the soldier step sideways after crossing the river", () => {
    const board: XiangqiSquare[] = new Array(90).fill(null);
    board[idx(3, 4)] = { type: "s", player: 1 }; // not yet crossed (player 1 crosses at rank >= 5)
    board[idx(0, 4)] = { type: "g", player: 1 };
    board[idx(9, 0)] = { type: "g", player: 2 }; // off file 4 so it never faces the red general
    const state = emptyBoardState({ board, toMove: 1 });

    let moves = xiangqi.legalMoves(state).filter((m) => Math.floor(m / 100) === idx(3, 4));
    expect(moves).toEqual([encodeXiangqiMove(idx(3, 4), idx(4, 4))]);

    board[idx(3, 4)] = null;
    board[idx(5, 4)] = { type: "s", player: 1 }; // crossed
    const state2 = emptyBoardState({ board, toMove: 1 });
    moves = xiangqi.legalMoves(state2).filter((m) => Math.floor(m / 100) === idx(5, 4));
    expect(moves.sort()).toEqual(
      [
        encodeXiangqiMove(idx(5, 4), idx(6, 4)),
        encodeXiangqiMove(idx(5, 4), idx(5, 3)),
        encodeXiangqiMove(idx(5, 4), idx(5, 5)),
      ].sort(),
    );
  });

  it("checkmates when the general is pinned to an open file and flying-general blocks the only escape", () => {
    const board: XiangqiSquare[] = new Array(90).fill(null);
    board[idx(0, 3)] = { type: "r", player: 1 }; // chariot pins file 3
    board[idx(0, 4)] = { type: "g", player: 1 };
    board[idx(9, 3)] = { type: "g", player: 2 }; // black general in check along file 3
    const state = emptyBoardState({ board, toMove: 2 });

    // (9,2) is off the palace, so the general's only geometric escapes are (8,3) [still on the
    // pinned file] and (9,4) [would face the red general head-on with a clear file] — both illegal.
    expect(xiangqi.legalMoves(state)).toEqual([]);
    expect(xiangqi.result(state)).toEqual({ status: "win", winner: 1 });
  });
});

describe("xiangqi bot", () => {
  it("returns a legal move from the start position within a reasonable time", () => {
    const state = initXiangqi();
    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      const start = Date.now();
      const move = getXiangqiBotMove(state, difficulty);
      const elapsed = Date.now() - start;
      expect(xiangqi.legalMoves(state)).toContain(move);
      // Generous bound — this runs alongside the rest of the suite under CI/parallel load,
      // and expert-depth search from the (worst-case, wide-open) start position is the slowest case.
      expect(elapsed).toBeLessThan(20_000);
    }
  });
});
