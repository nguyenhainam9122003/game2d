import type { Difficulty } from "./common.js";

/**
 * rachoi.app's "Chơi với máy" for Tìm số is a real-time race (no turns at all — both sides tap
 * independently on the same shared sheet), unlike every other bot in this project which picks a
 * discrete move. There's no `Game<S,M>` here: the bot just advances its own progress on a timer
 * whose pace is randomized within a difficulty-scaled range, simulating "time to spot the next
 * number" rather than a decision.
 */
const INTERVAL_RANGE_MS: Record<Difficulty, [number, number]> = {
  easy: [1100, 1800],
  medium: [700, 1200],
  hard: [450, 800],
  expert: [250, 500],
};

export function getNumberHuntBotDelayMs(difficulty: Difficulty = "medium"): number {
  const [min, max] = INTERVAL_RANGE_MS[difficulty];
  return min + Math.random() * (max - min);
}
