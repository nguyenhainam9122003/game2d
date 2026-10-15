import { describe, expect, it } from "vitest";
import {
  chess,
  initChess,
  encodeChessMove,
  type ChessState,
  type Square,
} from "../src/games/chess.js";
import { getChessBotMove } from "../src/bots/chessBot.js";

function idx(rank: number, file: number): number {
  return rank * 8 + file;
}

function emptyBoardState(overrides: Partial<ChessState> = {}): ChessState {
  return {
    board: new Array(64).fill(null) as Square[],
    toMove: 1,
    castling: {
      whiteKingSide: false,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: false,
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    ...overrides,
  };
}

function perft(state: ChessState, depth: number): number {
  if (depth === 0) return 1;
  const moves = chess.legalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) nodes += perft(chess.applyMove(state, move), depth - 1);
  return nodes;
}

describe("chess move generation (perft)", () => {
  // Standard reference values for the starting position — the classic
  // sanity check for any chess move generator.
  it("perft(1) from the start position is 20", () => {
    expect(perft(initChess(), 1)).toBe(20);
  });

  it("perft(2) from the start position is 400", () => {
    expect(perft(initChess(), 2)).toBe(400);
  });

  it("perft(3) from the start position is 8902", () => {
    expect(perft(initChess(), 3)).toBe(8902);
  });
});

describe("chess special rules", () => {
  it("detects fool's mate (fastest possible checkmate)", () => {
    let state = initChess();
    const moves: Array<[number, number]> = [
      [idx(1, 5), idx(2, 5)], // 1. f3
      [idx(6, 4), idx(4, 4)], // ...e5
      [idx(1, 6), idx(3, 6)], // 2. g4
      [idx(7, 3), idx(3, 7)], // ...Qh4#
    ];
    for (const [from, to] of moves) {
      state = chess.applyMove(state, encodeChessMove(from, to));
    }
    expect(chess.result(state)).toEqual({ status: "win", winner: 2 });
    expect(chess.legalMoves(state)).toEqual([]);
  });

  it("detects the classic king+queen vs king stalemate", () => {
    const board: Square[] = new Array(64).fill(null);
    board[idx(5, 1)] = { type: "q", player: 1 }; // Qb6
    board[idx(5, 0)] = { type: "k", player: 1 }; // Ka6
    board[idx(7, 0)] = { type: "k", player: 2 }; // Ka8, black to move
    const state = emptyBoardState({ board, toMove: 2 });

    expect(chess.legalMoves(state)).toEqual([]);
    expect(chess.result(state)).toEqual({ status: "draw" });
  });

  it("allows capturing en passant and removes the captured pawn correctly", () => {
    const board: Square[] = new Array(64).fill(null);
    board[idx(4, 4)] = { type: "p", player: 1 }; // white pawn e5
    board[idx(4, 3)] = { type: "p", player: 2 }; // black pawn d5 (just double-pushed)
    board[idx(0, 4)] = { type: "k", player: 1 };
    board[idx(7, 4)] = { type: "k", player: 2 };
    const state = emptyBoardState({ board, toMove: 1, enPassantTarget: idx(5, 3) });

    const move = encodeChessMove(idx(4, 4), idx(5, 3));
    expect(chess.legalMoves(state)).toContain(move);

    const next = chess.applyMove(state, move);
    expect(next.board[idx(5, 3)]).toEqual({ type: "p", player: 1 });
    expect(next.board[idx(4, 3)]).toBeNull(); // captured black pawn removed
    expect(next.board[idx(4, 4)]).toBeNull();
  });

  it("promotes a pawn reaching the last rank and offers all 4 choices", () => {
    const board: Square[] = new Array(64).fill(null);
    board[idx(6, 0)] = { type: "p", player: 1 }; // a7
    board[idx(0, 4)] = { type: "k", player: 1 };
    board[idx(7, 4)] = { type: "k", player: 2 };
    const state = emptyBoardState({ board, toMove: 1 });

    const from = idx(6, 0);
    const to = idx(7, 0);
    const moves = chess.legalMoves(state);
    for (const promo of ["q", "r", "b", "n"] as const) {
      expect(moves).toContain(encodeChessMove(from, to, promo));
    }

    const next = chess.applyMove(state, encodeChessMove(from, to, "q"));
    expect(next.board[to]).toEqual({ type: "q", player: 1 });
    expect(next.board[from]).toBeNull();
  });

  it("allows king-side castling when squares are empty and unattacked", () => {
    const board: Square[] = new Array(64).fill(null);
    board[idx(0, 4)] = { type: "k", player: 1 }; // e1
    board[idx(0, 7)] = { type: "r", player: 1 }; // h1
    board[idx(7, 4)] = { type: "k", player: 2 }; // e8
    const state = emptyBoardState({
      board,
      toMove: 1,
      castling: { whiteKingSide: true, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false },
    });

    const castle = encodeChessMove(idx(0, 4), idx(0, 6));
    expect(chess.legalMoves(state)).toContain(castle);

    const next = chess.applyMove(state, castle);
    expect(next.board[idx(0, 6)]).toEqual({ type: "k", player: 1 });
    expect(next.board[idx(0, 5)]).toEqual({ type: "r", player: 1 }); // rook hopped over
    expect(next.board[idx(0, 7)]).toBeNull();
  });

  it("blocks castling when the king would pass through an attacked square", () => {
    const board: Square[] = new Array(64).fill(null);
    board[idx(0, 4)] = { type: "k", player: 1 }; // e1
    board[idx(0, 7)] = { type: "r", player: 1 }; // h1
    board[idx(7, 4)] = { type: "k", player: 2 };
    board[idx(5, 5)] = { type: "r", player: 2 }; // f3 — attacks f1, the square the king passes through
    const state = emptyBoardState({
      board,
      toMove: 1,
      castling: { whiteKingSide: true, whiteQueenSide: false, blackKingSide: false, blackQueenSide: false },
    });

    const castle = encodeChessMove(idx(0, 4), idx(0, 6));
    expect(chess.legalMoves(state)).not.toContain(castle);
  });
});

describe("chess bot", () => {
  it("returns a legal move from the start position within a reasonable time", () => {
    const state = initChess();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const start = Date.now();
      const move = getChessBotMove(state, difficulty);
      const elapsed = Date.now() - start;
      expect(chess.legalMoves(state)).toContain(move);
      expect(elapsed).toBeLessThan(5000);
    }
  });
});
