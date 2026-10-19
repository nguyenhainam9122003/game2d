import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

/**
 * Xiangqi (Chinese chess) on a 9-file x 10-rank point grid (pieces sit on
 * intersections, not inside squares — but a flat 9x10 array works fine for
 * move generation). Player 1 = Red, starts at rank 0; Player 2 = Black,
 * starts at rank 9. The river sits between rank 4 and rank 5.
 */
export type XiangqiPieceType = "g" | "a" | "e" | "h" | "r" | "c" | "s";

export interface XiangqiPiece {
  type: XiangqiPieceType;
  player: Player;
}

export type XiangqiSquare = XiangqiPiece | null;

export interface XiangqiState {
  board: XiangqiSquare[]; // length 90, index = rank*9 + file
  toMove: Player;
  halfmoveClock: number; // half-moves since last capture — used only for a practical no-capture draw cap
}

/** `from * 100 + to`, same scheme as chess but without a promotion digit (xiangqi has no promotion). */
export type XiangqiMove = number;

export function encodeXiangqiMove(from: number, to: number): XiangqiMove {
  return from * 100 + to;
}

export function decodeXiangqiMove(move: XiangqiMove): { from: number; to: number } {
  return { from: Math.floor(move / 100), to: move % 100 };
}

const FILES = 9;
const RANKS = 10;

function fileOf(idx: number): number {
  return idx % FILES;
}
function rankOf(idx: number): number {
  return Math.floor(idx / FILES);
}
function inBounds(rank: number, file: number): boolean {
  return rank >= 0 && rank < RANKS && file >= 0 && file < FILES;
}
function idxOf(rank: number, file: number): number {
  return rank * FILES + file;
}
function isInPalace(rank: number, file: number, player: Player): boolean {
  if (file < 3 || file > 5) return false;
  return player === 1 ? rank >= 0 && rank <= 2 : rank >= 7 && rank <= 9;
}
function isOwnSide(rank: number, player: Player): boolean {
  return player === 1 ? rank <= 4 : rank >= 5;
}
function forwardDir(player: Player): number {
  return player === 1 ? 1 : -1;
}
function hasCrossedRiver(rank: number, player: Player): boolean {
  return player === 1 ? rank >= 5 : rank <= 4;
}

export function initXiangqi(): XiangqiState {
  const board: XiangqiSquare[] = new Array(FILES * RANKS).fill(null);
  const backRank: XiangqiPieceType[] = ["r", "h", "e", "a", "g", "a", "e", "h", "r"];

  for (let file = 0; file < FILES; file++) {
    board[idxOf(0, file)] = { type: backRank[file], player: 1 };
    board[idxOf(9, file)] = { type: backRank[file], player: 2 };
  }
  for (const file of [1, 7]) {
    board[idxOf(2, file)] = { type: "c", player: 1 };
    board[idxOf(7, file)] = { type: "c", player: 2 };
  }
  for (const file of [0, 2, 4, 6, 8]) {
    board[idxOf(3, file)] = { type: "s", player: 1 };
    board[idxOf(6, file)] = { type: "s", player: 2 };
  }

  return { board, toMove: 1, halfmoveClock: 0 };
}

interface RawMove {
  from: number;
  to: number;
}

const ORTHO_DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL_DIRS: Array<[number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const HORSE_DELTAS: Array<[number, number]> = [
  [2, 1], [2, -1], [-2, 1], [-2, -1],
  [1, 2], [1, -2], [-1, 2], [-1, -2],
];

function pushIfTargetOk(
  board: XiangqiSquare[],
  from: number,
  rank: number,
  file: number,
  player: Player,
  moves: RawMove[],
) {
  if (!inBounds(rank, file)) return;
  const target = board[idxOf(rank, file)];
  if (!target || target.player !== player) moves.push({ from, to: idxOf(rank, file) });
}

function generateGeneralMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  for (const [dr, df] of ORTHO_DIRS) {
    const r = rank + dr;
    const f = file + df;
    if (isInPalace(r, f, player)) pushIfTargetOk(board, from, r, f, player, moves);
  }
}

function generateAdvisorMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  for (const [dr, df] of DIAGONAL_DIRS) {
    const r = rank + dr;
    const f = file + df;
    if (isInPalace(r, f, player)) pushIfTargetOk(board, from, r, f, player, moves);
  }
}

function generateElephantMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  for (const [dr, df] of DIAGONAL_DIRS) {
    const r = rank + dr * 2;
    const f = file + df * 2;
    if (!inBounds(r, f) || !isOwnSide(r, player)) continue;
    const eye = board[idxOf(rank + dr, file + df)];
    if (eye) continue; // blocked at the "elephant eye"
    pushIfTargetOk(board, from, r, f, player, moves);
  }
}

function generateHorseMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  for (const [dr, df] of HORSE_DELTAS) {
    const legRank = Math.abs(dr) === 2 ? rank + dr / 2 : rank;
    const legFile = Math.abs(df) === 2 ? file + df / 2 : file;
    if (board[idxOf(legRank, legFile)]) continue; // blocked at the "horse leg"
    pushIfTargetOk(board, from, rank + dr, file + df, player, moves);
  }
}

function generateChariotMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  for (const [dr, df] of ORTHO_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (inBounds(r, f)) {
      const target = board[idxOf(r, f)];
      if (!target) {
        moves.push({ from, to: idxOf(r, f) });
      } else {
        if (target.player !== player) moves.push({ from, to: idxOf(r, f) });
        break;
      }
      r += dr;
      f += df;
    }
  }
}

function generateCannonMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  for (const [dr, df] of ORTHO_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (inBounds(r, f) && !board[idxOf(r, f)]) {
      moves.push({ from, to: idxOf(r, f) });
      r += dr;
      f += df;
    }
    if (!inBounds(r, f)) continue; // ran off the board without a screen
    // board[idxOf(r, f)] is the screen — jump it, then the *first* piece found beyond is the only capturable square.
    r += dr;
    f += df;
    while (inBounds(r, f) && !board[idxOf(r, f)]) {
      r += dr;
      f += df;
    }
    if (inBounds(r, f)) {
      const target = board[idxOf(r, f)];
      if (target && target.player !== player) moves.push({ from, to: idxOf(r, f) });
    }
  }
}

function generateSoldierMoves(board: XiangqiSquare[], from: number, rank: number, file: number, player: Player, moves: RawMove[]) {
  const dir = forwardDir(player);
  pushIfTargetOk(board, from, rank + dir, file, player, moves);
  if (hasCrossedRiver(rank, player)) {
    pushIfTargetOk(board, from, rank, file + 1, player, moves);
    pushIfTargetOk(board, from, rank, file - 1, player, moves);
  }
}

function generatePseudoLegalMoves(board: XiangqiSquare[], player: Player): RawMove[] {
  const moves: RawMove[] = [];
  for (let idx = 0; idx < board.length; idx++) {
    const piece = board[idx];
    if (!piece || piece.player !== player) continue;
    const rank = rankOf(idx);
    const file = fileOf(idx);
    switch (piece.type) {
      case "g": generateGeneralMoves(board, idx, rank, file, player, moves); break;
      case "a": generateAdvisorMoves(board, idx, rank, file, player, moves); break;
      case "e": generateElephantMoves(board, idx, rank, file, player, moves); break;
      case "h": generateHorseMoves(board, idx, rank, file, player, moves); break;
      case "r": generateChariotMoves(board, idx, rank, file, player, moves); break;
      case "c": generateCannonMoves(board, idx, rank, file, player, moves); break;
      case "s": generateSoldierMoves(board, idx, rank, file, player, moves); break;
    }
  }
  return moves;
}

function pieceAt(board: XiangqiSquare[], rank: number, file: number): XiangqiSquare | undefined {
  return inBounds(rank, file) ? board[idxOf(rank, file)] : undefined;
}

/**
 * Checks each attacker type directly against `square` rather than generating
 * every pseudo-legal move for `byPlayer` and scanning for a match — this is
 * called once per candidate move during legality filtering, so keeping it
 * O(1)-ish per piece type (instead of O(byPlayer's move count)) is what keeps
 * move generation fast enough for a reasonable search depth.
 */
function isSquareAttacked(board: XiangqiSquare[], square: number, byPlayer: Player): boolean {
  const rank = rankOf(square);
  const file = fileOf(square);
  const dir = forwardDir(byPlayer);

  const fwdSource = pieceAt(board, rank - dir, file);
  if (fwdSource && fwdSource.player === byPlayer && fwdSource.type === "s") return true;
  if (hasCrossedRiver(rank, byPlayer)) {
    for (const df of [-1, 1]) {
      const source = pieceAt(board, rank, file - df);
      if (source && source.player === byPlayer && source.type === "s") return true;
    }
  }

  for (const [dr, df] of HORSE_DELTAS) {
    const sr = rank - dr;
    const sf = file - df;
    const source = pieceAt(board, sr, sf);
    if (!source || source.player !== byPlayer || source.type !== "h") continue;
    const legRank = Math.abs(dr) === 2 ? sr + dr / 2 : sr;
    const legFile = Math.abs(df) === 2 ? sf + df / 2 : sf;
    if (!board[idxOf(legRank, legFile)]) return true;
  }

  if (isOwnSide(rank, byPlayer)) {
    for (const [dr, df] of DIAGONAL_DIRS) {
      const sr = rank - dr * 2;
      const sf = file - df * 2;
      const source = pieceAt(board, sr, sf);
      if (!source || source.player !== byPlayer || source.type !== "e") continue;
      if (!pieceAt(board, rank - dr, file - df)) return true; // eye clear
    }
  }

  for (const [dr, df] of DIAGONAL_DIRS) {
    const source = pieceAt(board, rank - dr, file - df);
    if (source && source.player === byPlayer && source.type === "a") return true;
  }

  for (const [dr, df] of ORTHO_DIRS) {
    const source = pieceAt(board, rank - dr, file - df);
    if (source && source.player === byPlayer && source.type === "g") return true;
  }

  for (const [dr, df] of ORTHO_DIRS) {
    let r = rank + dr;
    let f = file + df;
    let screenSeen = false;
    while (inBounds(r, f)) {
      const p = board[idxOf(r, f)];
      if (p) {
        if (!screenSeen) {
          if (p.player === byPlayer && p.type === "r") return true;
          screenSeen = true;
        } else {
          if (p.player === byPlayer && p.type === "c") return true;
          break;
        }
      }
      r += dr;
      f += df;
    }
  }

  return false;
}

function generalsFaceEachOther(board: XiangqiSquare[]): boolean {
  const redIdx = board.findIndex((p) => p !== null && p.type === "g" && p.player === 1);
  const blackIdx = board.findIndex((p) => p !== null && p.type === "g" && p.player === 2);
  if (redIdx === -1 || blackIdx === -1) return false;
  const file = fileOf(redIdx);
  if (fileOf(blackIdx) !== file) return false;
  const lo = Math.min(rankOf(redIdx), rankOf(blackIdx));
  const hi = Math.max(rankOf(redIdx), rankOf(blackIdx));
  for (let rank = lo + 1; rank < hi; rank++) {
    if (board[idxOf(rank, file)]) return false;
  }
  return true;
}

function isGeneralExposed(board: XiangqiSquare[], player: Player): boolean {
  const generalIdx = board.findIndex((p) => p !== null && p.type === "g" && p.player === player);
  if (generalIdx === -1) return true;
  return isSquareAttacked(board, generalIdx, otherPlayer(player)) || generalsFaceEachOther(board);
}

function applyRawMove(state: XiangqiState, move: RawMove): XiangqiState {
  const board = state.board.slice();
  const mover = board[move.from]!;
  const captured = board[move.to];
  board[move.from] = null;
  board[move.to] = mover;
  const halfmoveClock = captured ? 0 : state.halfmoveClock + 1;
  return { board, toMove: otherPlayer(mover.player), halfmoveClock };
}

function generateLegalRawMoves(state: XiangqiState, player: Player): RawMove[] {
  return generatePseudoLegalMoves(state.board, player).filter((m) => {
    const next = applyRawMove(state, m);
    return !isGeneralExposed(next.board, player);
  });
}

const NO_CAPTURE_DRAW_LIMIT = 120;

function computeResult(state: XiangqiState): GameResult {
  const player = state.toMove;
  const legal = generateLegalRawMoves(state, player);
  if (legal.length === 0) return { status: "win", winner: otherPlayer(player) };
  if (state.halfmoveClock >= NO_CAPTURE_DRAW_LIMIT) return { status: "draw" };
  return { status: "ongoing" };
}

export const xiangqi: Game<XiangqiState, XiangqiMove> = {
  id: "xiangqi",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (computeResult(state).status !== "ongoing") return [];
    return generateLegalRawMoves(state, state.toMove).map((m) => encodeXiangqiMove(m.from, m.to));
  },

  applyMove(state, move) {
    const { from, to } = decodeXiangqiMove(move);
    const player = state.toMove;
    const piece = state.board[from];
    if (!piece || piece.player !== player) throw new Error(`Illegal move: ${from} -> ${to}`);
    const pseudo = generatePseudoLegalMoves(state.board, player);
    const match = pseudo.find((m) => m.from === from && m.to === to);
    if (!match) throw new Error(`Illegal move: ${from} -> ${to}`);
    const next = applyRawMove(state, match);
    if (isGeneralExposed(next.board, player)) throw new Error(`Illegal move: ${from} -> ${to}`);
    return next;
  },

  result(state) {
    return computeResult(state);
  },
};
