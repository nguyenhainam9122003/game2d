import type { Difficulty } from "../bots/common.js";

/**
 * Tìm số ("Number Hunt"): numbers scattered over a sheet — tap 1, 2, 3...
 * in order, as fast as possible. Like Sudoku and Ghép số this is solo-only
 * in this pass (rachoi.app's "shared sheet" race and "separate sheets" race
 * multiplayer modes are deferred — see PLAN.md), so there's no `Game<S, M>`
 * interface here either, just the scatter generator.
 */
export interface NumberHuntTarget {
  value: number;
  x: number; // percent, 0-100
  y: number; // percent, 0-100
}

const COUNT_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 15, medium: 25, hard: 40, expert: 60 };
const MIN_DISTANCE = 9; // percent — keeps numbers from overlapping too much
const MAX_ATTEMPTS_PER_POINT = 60;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function generateNumberHunt(difficulty: Difficulty = "medium", countOverride?: number): NumberHuntTarget[] {
  const count = countOverride ?? COUNT_BY_DIFFICULTY[difficulty];
  const targets: NumberHuntTarget[] = [];

  for (let value = 1; value <= count; value++) {
    let best: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_POINT; attempt++) {
      const candidate = { x: 5 + Math.random() * 90, y: 5 + Math.random() * 90 };
      if (targets.every((t) => distance(t, candidate) >= MIN_DISTANCE)) {
        best = candidate;
        break;
      }
      best = candidate; // fall back to the last attempt if nothing clears the spacing check
    }
    targets.push({ value, x: best!.x, y: best!.y });
  }

  return targets;
}
