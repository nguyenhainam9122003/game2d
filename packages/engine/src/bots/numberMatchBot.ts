import { numberMatchMatch, numberMatchPassMove, type NumberMatchMatchState, type NumberMatchMove } from "../games/numberMatch.js";
import { type Difficulty, randomChoice } from "./common.js";

/** Fewer legal pairs left for whoever moves next (the opponent) is better for us. */
function scoreMove(state: NumberMatchMatchState, move: NumberMatchMove): number {
  const next = numberMatchMatch.applyMove(state, move);
  const pass = numberMatchPassMove(next.cells.length);
  return -numberMatchMatch.legalMoves(next).filter((m) => m !== pass).length;
}

export function getNumberMatchBotMove(state: NumberMatchMatchState, difficulty: Difficulty = "medium"): NumberMatchMove {
  const legal = numberMatchMatch.legalMoves(state);
  const pass = numberMatchPassMove(state.cells.length);
  const nonPass = legal.filter((m) => m !== pass);
  if (nonPass.length === 0) return pass; // forced pass — nothing left to take

  if (difficulty === "easy") return randomChoice(nonPass);

  const scored = nonPass.map((move) => ({ move, score: scoreMove(state, move) }));
  scored.sort((a, b) => b.score - a.score);
  if (difficulty === "medium" && Math.random() < 0.3) return randomChoice(nonPass);
  return scored[0].move; // hard/expert always takes the move that leaves the fewest replies
}
