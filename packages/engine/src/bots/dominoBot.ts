import { domino, DRAW_MOVE, PASS_MOVE, TILES, type DominoMove, type DominoState } from "../games/domino.js";
import { type Difficulty, randomChoice } from "./common.js";

function tilePips(tileId: number): number {
  return TILES[tileId][0] + TILES[tileId][1];
}
function isDouble(tileId: number): boolean {
  return TILES[tileId][0] === TILES[tileId][1];
}

/** How many tiles with this pip value are still unseen (not in our hand, not already on the line) — legitimate public info. */
function unseenCountForValue(state: DominoState, value: number, myHand: number[]): number {
  const onLine = new Set(state.line.map((e) => e.tileId));
  const myHandSet = new Set(myHand);
  let count = 0;
  for (let id = 0; id < TILES.length; id++) {
    if (onLine.has(id) || myHandSet.has(id)) continue;
    if (TILES[id][0] === value || TILES[id][1] === value) count++;
  }
  return count;
}

function scoreCandidate(state: DominoState, move: DominoMove, myHand: number[]): number {
  const tileId = Math.floor(move / 2);
  const end = move % 2 === 0 ? "left" : "right";
  let score = tilePips(tileId); // shed heavier tiles first
  if (isDouble(tileId)) score += 15; // doubles are awkward to play later — get them out early
  const next = domino.applyMove(state, move);
  const ends =
    next.line.length > 0
      ? end === "left"
        ? next.line[0].orientation[0]
        : next.line[next.line.length - 1].orientation[1]
      : null;
  if (ends !== null) score -= unseenCountForValue(state, ends, myHand) * 2; // leave a scarcer end for the opponent
  return score;
}

export function getDominoBotMove(state: DominoState, difficulty: Difficulty = "medium"): DominoMove {
  const moves = domino.legalMoves(state);
  if (moves.includes(DRAW_MOVE) || moves.includes(PASS_MOVE)) return moves[0];
  if (difficulty === "easy") return randomChoice(moves);

  const myHand = state.hands[state.toMove - 1];
  const scored = moves.map((move) => ({ move, score: scoreCandidate(state, move, myHand) }));
  scored.sort((a, b) => b.score - a.score);

  if (difficulty === "medium" && scored.length > 1 && Math.random() < 0.3) {
    return randomChoice(scored.slice(0, Math.ceil(scored.length / 2)).map((s) => s.move));
  }
  return scored[0].move;
}
