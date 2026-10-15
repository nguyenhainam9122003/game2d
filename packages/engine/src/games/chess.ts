import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PromotionPiece = "q" | "r" | "b" | "n";

export interface Piece {
  type: PieceType;
  player: Player;
}

export type Square = Piece | null;

export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

export interface ChessState {
  board: Square[]; // length 64, index = rank*8 + file, rank 0 = white's back rank
  toMove: Player; // 1 = white, 2 = black
  castling: CastlingRights;
  enPassantTarget: number | null; // square a pawn could capture onto en passant, else null
  halfmoveClock: number; // half-moves since last capture or pawn move (50-move rule = 100)
}

/**
 * A chess move is encoded as a single number so it fits the same `number`
 * move type (and network payload) every other game in this engine uses:
 * `(from * 100 + to) * 100 + promotionCode`. from/to are 0-63 board
 * indices; promotionCode is 0 (none) or 1-4 for q/r/b/n.
 */
export type ChessMove = number;

const PROMOTION_CODES: Record<PromotionPiece, number> = { q: 1, r: 2, b: 3, n: 4 };
const PROMOTION_FROM_CODE: Record<number, PromotionPiece> = { 1: "q", 2: "r", 3: "b", 4: "n" };

export function encodeChessMove(from: number, to: number, promotion?: PromotionPiece): ChessMove {
  const code = promotion ? PROMOTION_CODES[promotion] : 0;
  return (from * 100 + to) * 100 + code;
}

export function decodeChessMove(move: ChessMove): { from: number; to: number; promotion?: PromotionPiece } {
  const code = move % 100;
  const rest = Math.floor(move / 100);
  const to = rest % 100;
  const from = Math.floor(rest / 100);
  return { from, to, promotion: code ? PROMOTION_FROM_CODE[code] : undefined };
}

function fileOf(idx: number): number {
  return idx % 8;
}
function rankOf(idx: number): number {
  return Math.floor(idx / 8);
}
function inBounds(rank: number, file: number): boolean {
  return rank >= 0 && rank < 8 && file >= 0 && file < 8;
}
function idxOf(rank: number, file: number): number {
  return rank * 8 + file;
}
function forwardDir(player: Player): number {
  return player === 1 ? 1 : -1;
}

export function initChess(): ChessState {
  const board: Square[] = new Array(64).fill(null);
  const backRank: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let file = 0; file < 8; file++) {
    board[idxOf(0, file)] = { type: backRank[file], player: 1 };
    board[idxOf(1, file)] = { type: "p", player: 1 };
    board[idxOf(6, file)] = { type: "p", player: 2 };
    board[idxOf(7, file)] = { type: backRank[file], player: 2 };
  }
  return {
    board,
    toMove: 1,
    castling: { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true },
    enPassantTarget: null,
    halfmoveClock: 0,
  };
}

interface RawMove {
  from: number;
  to: number;
  promotion?: PromotionPiece;
}

const KNIGHT_DELTAS: Array<[number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS: Array<[number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const BISHOP_DIRS: Array<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];
const PROMOTION_PIECES: PromotionPiece[] = ["q", "r", "b", "n"];

function isSquareAttacked(board: Square[], square: number, byPlayer: Player): boolean {
  const rank = rankOf(square);
  const file = fileOf(square);
  const dir = forwardDir(byPlayer);

  for (const df of [-1, 1]) {
    const r = rank - dir;
    const f = file + df;
    if (inBounds(r, f)) {
      const p = board[idxOf(r, f)];
      if (p && p.player === byPlayer && p.type === "p") return true;
    }
  }

  for (const [dr, df] of KNIGHT_DELTAS) {
    const r = rank + dr;
    const f = file + df;
    if (inBounds(r, f)) {
      const p = board[idxOf(r, f)];
      if (p && p.player === byPlayer && p.type === "n") return true;
    }
  }

  for (const [dr, df] of KING_DELTAS) {
    const r = rank + dr;
    const f = file + df;
    if (inBounds(r, f)) {
      const p = board[idxOf(r, f)];
      if (p && p.player === byPlayer && p.type === "k") return true;
    }
  }

  for (const [dr, df] of BISHOP_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (inBounds(r, f)) {
      const p = board[idxOf(r, f)];
      if (p) {
        if (p.player === byPlayer && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      r += dr;
      f += df;
    }
  }

  for (const [dr, df] of ROOK_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (inBounds(r, f)) {
      const p = board[idxOf(r, f)];
      if (p) {
        if (p.player === byPlayer && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      r += dr;
      f += df;
    }
  }

  return false;
}

function generateStepMoves(
  board: Square[],
  from: number,
  rank: number,
  file: number,
  player: Player,
  deltas: Array<[number, number]>,
  moves: RawMove[],
) {
  for (const [dr, df] of deltas) {
    const r = rank + dr;
    const f = file + df;
    if (!inBounds(r, f)) continue;
    const to = idxOf(r, f);
    const target = board[to];
    if (!target || target.player !== player) moves.push({ from, to });
  }
}

function generateSlideMoves(
  board: Square[],
  from: number,
  rank: number,
  file: number,
  player: Player,
  dirs: Array<[number, number]>,
  moves: RawMove[],
) {
  for (const [dr, df] of dirs) {
    let r = rank + dr;
    let f = file + df;
    while (inBounds(r, f)) {
      const to = idxOf(r, f);
      const target = board[to];
      if (!target) {
        moves.push({ from, to });
      } else {
        if (target.player !== player) moves.push({ from, to });
        break;
      }
      r += dr;
      f += df;
    }
  }
}

function generatePawnMoves(
  state: ChessState,
  from: number,
  rank: number,
  file: number,
  player: Player,
  moves: RawMove[],
) {
  const { board, enPassantTarget } = state;
  const dir = forwardDir(player);
  const startRank = player === 1 ? 1 : 6;
  const promotionRank = player === 1 ? 7 : 0;

  function pushMove(to: number) {
    if (rankOf(to) === promotionRank) {
      for (const promo of PROMOTION_PIECES) moves.push({ from, to, promotion: promo });
    } else {
      moves.push({ from, to });
    }
  }

  const oneRank = rank + dir;
  if (inBounds(oneRank, file)) {
    const oneIdx = idxOf(oneRank, file);
    if (!board[oneIdx]) {
      pushMove(oneIdx);
      if (rank === startRank) {
        const twoIdx = idxOf(rank + dir * 2, file);
        if (!board[twoIdx]) moves.push({ from, to: twoIdx });
      }
    }
  }

  for (const df of [-1, 1]) {
    const r = rank + dir;
    const f = file + df;
    if (!inBounds(r, f)) continue;
    const to = idxOf(r, f);
    const target = board[to];
    if (target && target.player !== player) {
      pushMove(to);
    } else if (!target && to === enPassantTarget) {
      moves.push({ from, to });
    }
  }
}

function addCastlingMoves(state: ChessState, player: Player, moves: RawMove[]) {
  const { board, castling } = state;
  const rank = player === 1 ? 0 : 7;
  const kingFrom = idxOf(rank, 4);
  const king = board[kingFrom];
  if (!king || king.type !== "k" || king.player !== player) return;
  const opponent = otherPlayer(player);
  if (isSquareAttacked(board, kingFrom, opponent)) return;

  const kingSideRight = player === 1 ? castling.whiteKingSide : castling.blackKingSide;
  const queenSideRight = player === 1 ? castling.whiteQueenSide : castling.blackQueenSide;

  if (kingSideRight) {
    const pass = idxOf(rank, 5);
    const land = idxOf(rank, 6);
    const rookSq = idxOf(rank, 7);
    const rook = board[rookSq];
    if (
      !board[pass] &&
      !board[land] &&
      rook &&
      rook.type === "r" &&
      rook.player === player &&
      !isSquareAttacked(board, pass, opponent) &&
      !isSquareAttacked(board, land, opponent)
    ) {
      moves.push({ from: kingFrom, to: land });
    }
  }

  if (queenSideRight) {
    const pass = idxOf(rank, 3);
    const land = idxOf(rank, 2);
    const knightSq = idxOf(rank, 1);
    const rookSq = idxOf(rank, 0);
    const rook = board[rookSq];
    if (
      !board[pass] &&
      !board[land] &&
      !board[knightSq] &&
      rook &&
      rook.type === "r" &&
      rook.player === player &&
      !isSquareAttacked(board, pass, opponent) &&
      !isSquareAttacked(board, land, opponent)
    ) {
      moves.push({ from: kingFrom, to: land });
    }
  }
}

function generatePseudoLegalMoves(state: ChessState, player: Player): RawMove[] {
  const { board } = state;
  const moves: RawMove[] = [];

  for (let idx = 0; idx < 64; idx++) {
    const piece = board[idx];
    if (!piece || piece.player !== player) continue;
    const rank = rankOf(idx);
    const file = fileOf(idx);

    switch (piece.type) {
      case "p":
        generatePawnMoves(state, idx, rank, file, player, moves);
        break;
      case "n":
        generateStepMoves(board, idx, rank, file, player, KNIGHT_DELTAS, moves);
        break;
      case "k":
        generateStepMoves(board, idx, rank, file, player, KING_DELTAS, moves);
        break;
      case "b":
        generateSlideMoves(board, idx, rank, file, player, BISHOP_DIRS, moves);
        break;
      case "r":
        generateSlideMoves(board, idx, rank, file, player, ROOK_DIRS, moves);
        break;
      case "q":
        generateSlideMoves(board, idx, rank, file, player, QUEEN_DIRS, moves);
        break;
    }
  }

  addCastlingMoves(state, player, moves);
  return moves;
}

function applyRawMove(state: ChessState, move: RawMove): ChessState {
  const board = state.board.slice();
  const mover = board[move.from]!;
  const player = mover.player;
  const captured = board[move.to];

  const isEnPassantCapture =
    mover.type === "p" &&
    move.to === state.enPassantTarget &&
    !captured &&
    fileOf(move.from) !== fileOf(move.to);

  let halfmoveClock = mover.type === "p" || captured ? 0 : state.halfmoveClock + 1;

  board[move.from] = null;
  board[move.to] = move.promotion ? { type: move.promotion, player } : mover;

  if (isEnPassantCapture) {
    board[idxOf(rankOf(move.from), fileOf(move.to))] = null;
    halfmoveClock = 0;
  }

  let enPassantTarget: number | null = null;
  if (mover.type === "p" && Math.abs(rankOf(move.to) - rankOf(move.from)) === 2) {
    enPassantTarget = idxOf((rankOf(move.from) + rankOf(move.to)) / 2, fileOf(move.from));
  }

  if (mover.type === "k" && Math.abs(fileOf(move.to) - fileOf(move.from)) === 2) {
    const rank = rankOf(move.from);
    if (fileOf(move.to) === 6) {
      board[idxOf(rank, 5)] = board[idxOf(rank, 7)];
      board[idxOf(rank, 7)] = null;
    } else {
      board[idxOf(rank, 3)] = board[idxOf(rank, 0)];
      board[idxOf(rank, 0)] = null;
    }
  }

  const castling = { ...state.castling };
  if (mover.type === "k") {
    if (player === 1) {
      castling.whiteKingSide = false;
      castling.whiteQueenSide = false;
    } else {
      castling.blackKingSide = false;
      castling.blackQueenSide = false;
    }
  }
  const revoke = (square: number) => {
    if (square === idxOf(0, 0)) castling.whiteQueenSide = false;
    if (square === idxOf(0, 7)) castling.whiteKingSide = false;
    if (square === idxOf(7, 0)) castling.blackQueenSide = false;
    if (square === idxOf(7, 7)) castling.blackKingSide = false;
  };
  revoke(move.from);
  revoke(move.to);

  return { board, toMove: otherPlayer(player), castling, enPassantTarget, halfmoveClock };
}

function isKingInCheck(board: Square[], player: Player): boolean {
  const kingIdx = board.findIndex((p) => p !== null && p.type === "k" && p.player === player);
  if (kingIdx === -1) return false;
  return isSquareAttacked(board, kingIdx, otherPlayer(player));
}

function generateLegalRawMoves(state: ChessState, player: Player): RawMove[] {
  return generatePseudoLegalMoves(state, player).filter((m) => {
    const next = applyRawMove(state, m);
    return !isKingInCheck(next.board, player);
  });
}

/**
 * Simplified insufficient-material check: bails out for anything beyond
 * king + one minor piece per side (real chess has edge cases involving
 * same-/opposite-colour bishops that this intentionally ignores).
 */
function isInsufficientMaterial(board: Square[]): boolean {
  const pieces = board.filter((p): p is Piece => p !== null);
  if (pieces.length > 4) return false;
  const nonKings = pieces.filter((p) => p.type !== "k");
  if (nonKings.length === 0) return true;
  if (nonKings.length === 1 && (nonKings[0].type === "b" || nonKings[0].type === "n")) return true;
  if (nonKings.length === 2 && nonKings.every((p) => p.type === "b" || p.type === "n")) return true;
  return false;
}

function computeResult(state: ChessState): GameResult {
  const player = state.toMove;
  const legal = generateLegalRawMoves(state, player);
  if (legal.length === 0) {
    if (isKingInCheck(state.board, player)) return { status: "win", winner: otherPlayer(player) };
    return { status: "draw" };
  }
  if (state.halfmoveClock >= 100) return { status: "draw" };
  if (isInsufficientMaterial(state.board)) return { status: "draw" };
  return { status: "ongoing" };
}

export const chess: Game<ChessState, ChessMove> = {
  id: "chess",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (computeResult(state).status !== "ongoing") return [];
    return generateLegalRawMoves(state, state.toMove).map((m) =>
      encodeChessMove(m.from, m.to, m.promotion),
    );
  },

  applyMove(state, move) {
    const { from, to, promotion } = decodeChessMove(move);
    const legal = generateLegalRawMoves(state, state.toMove);
    const match = legal.find((m) => m.from === from && m.to === to && m.promotion === promotion);
    if (!match) throw new Error(`Illegal move: ${from} -> ${to}`);
    return applyRawMove(state, match);
  },

  result(state) {
    return computeResult(state);
  },
};
