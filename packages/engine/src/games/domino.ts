import type { Game, GameResult, Player } from "../types.js";
import { otherPlayer } from "../types.js";

/**
 * Đô-mi-nô: the standard double-six block game. 28 tiles, 7 dealt to each
 * player, the rest form a boneyard. When a player can't play, the `drawRule`
 * decides what happens: "one" draws exactly one tile then passes if it still
 * doesn't connect; "until-playable" keeps drawing until a playable tile turns
 * up or the boneyard runs dry; "none" skips drawing and passes immediately.
 */
export type Tile = [number, number];
export type DrawRule = "one" | "until-playable" | "none";

export const TILES: Tile[] = (() => {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) tiles.push([a, b]);
  }
  return tiles;
})();

interface LineEntry {
  tileId: number;
  /** [pip touching the previous/left side, pip touching the next/right side]. */
  orientation: [number, number];
}

export interface DominoState {
  hands: [number[], number[]]; // tile IDs
  boneyard: number[]; // tile IDs left to draw
  line: LineEntry[];
  toMove: Player;
  passStreak: number;
  drawnThisTurn: boolean;
  drawRule: DrawRule;
}

const PLAY_RANGE = TILES.length * 2; // 0..55
export const DRAW_MOVE = 1000;
export const PASS_MOVE = 1001;

export type DominoMove = number;

export function encodePlay(tileId: number, end: "left" | "right"): DominoMove {
  return tileId * 2 + (end === "left" ? 0 : 1);
}

function decodePlay(move: DominoMove): { tileId: number; end: "left" | "right" } {
  return { tileId: Math.floor(move / 2), end: move % 2 === 0 ? "left" : "right" };
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function initDomino(drawRule: DrawRule = "one"): DominoState {
  const deck = shuffled(TILES.map((_, i) => i));
  return {
    hands: [deck.slice(0, 7), deck.slice(7, 14)],
    boneyard: deck.slice(14),
    line: [],
    toMove: 1,
    passStreak: 0,
    drawnThisTurn: false,
    drawRule,
  };
}

/** Returns the new open-end value if `tile` can attach to `endValue`, or null if it doesn't match. */
function attachResult(tile: Tile, endValue: number): number | null {
  const [a, b] = tile;
  if (a === endValue) return b;
  if (b === endValue) return a;
  return null;
}

function openEnds(line: LineEntry[]): { left: number; right: number } | null {
  if (line.length === 0) return null;
  return { left: line[0].orientation[0], right: line[line.length - 1].orientation[1] };
}

function playableMoves(hand: number[], line: LineEntry[]): DominoMove[] {
  if (line.length === 0) return hand.map((tileId) => encodePlay(tileId, "left"));
  const ends = openEnds(line)!;
  const moves: DominoMove[] = [];
  for (const tileId of hand) {
    const tile = TILES[tileId];
    if (attachResult(tile, ends.left) !== null) moves.push(encodePlay(tileId, "left"));
    if (ends.right !== ends.left && attachResult(tile, ends.right) !== null) moves.push(encodePlay(tileId, "right"));
  }
  return moves;
}

function pipTotal(hand: number[]): number {
  return hand.reduce((sum, tileId) => sum + TILES[tileId][0] + TILES[tileId][1], 0);
}

function computeResult(state: DominoState): GameResult {
  if (state.hands[0].length === 0) return { status: "win", winner: 1 };
  if (state.hands[1].length === 0) return { status: "win", winner: 2 };
  if (state.boneyard.length === 0 && state.passStreak >= 2) {
    const [p1, p2] = [pipTotal(state.hands[0]), pipTotal(state.hands[1])];
    if (p1 === p2) return { status: "draw" };
    return { status: "win", winner: p1 < p2 ? 1 : 2 };
  }
  return { status: "ongoing" };
}

export const domino: Game<DominoState, DominoMove> = {
  id: "domino",

  currentPlayer(state) {
    return state.toMove;
  },

  legalMoves(state) {
    if (computeResult(state).status !== "ongoing") return [];
    const hand = state.hands[state.toMove - 1];
    const plays = playableMoves(hand, state.line);
    if (plays.length > 0) return plays;
    if (state.drawRule === "none") return [PASS_MOVE];
    const canStillDraw = state.drawRule === "until-playable" || !state.drawnThisTurn;
    if (state.boneyard.length > 0 && canStillDraw) return [DRAW_MOVE];
    return [PASS_MOVE];
  },

  applyMove(state, move) {
    const playerIdx = state.toMove - 1;

    if (move === DRAW_MOVE) {
      const alreadyDrewMax = state.drawRule === "one" && state.drawnThisTurn;
      if (state.boneyard.length === 0 || state.drawRule === "none" || alreadyDrewMax) {
        throw new Error("Illegal move: can't draw");
      }
      const boneyard = [...state.boneyard];
      const drawn = boneyard.pop()!;
      const hands: [number[], number[]] = [[...state.hands[0]], [...state.hands[1]]];
      hands[playerIdx] = [...hands[playerIdx], drawn];
      return { ...state, hands, boneyard, drawnThisTurn: true };
    }

    if (move === PASS_MOVE) {
      const hand = state.hands[playerIdx];
      const canPlay = playableMoves(hand, state.line).length > 0;
      const canStillDraw = state.drawRule === "until-playable" || !state.drawnThisTurn;
      const mustDrawFirst = state.drawRule !== "none" && canStillDraw && state.boneyard.length > 0;
      if (canPlay || mustDrawFirst) throw new Error("Illegal move: must play or draw first");
      return { ...state, toMove: otherPlayer(state.toMove), passStreak: state.passStreak + 1, drawnThisTurn: false };
    }

    // Play a tile.
    const { tileId, end } = decodePlay(move);
    const hand = state.hands[playerIdx];
    if (!hand.includes(tileId)) throw new Error("Illegal move: tile not in hand");
    const tile = TILES[tileId];
    const line = [...state.line];

    if (line.length === 0) {
      line.push({ tileId, orientation: [tile[0], tile[1]] });
    } else {
      const ends = openEnds(state.line)!;
      const target = end === "left" ? ends.left : ends.right;
      const newEnd = attachResult(tile, target);
      if (newEnd === null) throw new Error("Illegal move: tile doesn't match that end");
      if (end === "left") line.unshift({ tileId, orientation: [newEnd, target] });
      else line.push({ tileId, orientation: [target, newEnd] });
    }

    const hands: [number[], number[]] = [[...state.hands[0]], [...state.hands[1]]];
    hands[playerIdx] = hand.filter((id) => id !== tileId);

    return {
      ...state,
      hands,
      line,
      toMove: otherPlayer(state.toMove),
      passStreak: 0,
      drawnThisTurn: false,
    };
  },

  result(state) {
    return computeResult(state);
  },
};
