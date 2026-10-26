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
  /** Percent of the sheet, 0-100 at the default sizes — can exceed 100 once `numberHuntCanvasScale`
   *  grows past 1 (large "Cỡ tờ số"), since the sheet itself is bigger than one screen then.
   *  Divide by `numberHuntCanvasScale(targets.length)` to normalize back to a plain 0-100 percent
   *  of the (now bigger) sheet for rendering. */
  x: number;
  y: number;
}

const COUNT_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 15, medium: 25, hard: 40, expert: 60 };
const MIN_DISTANCE = 9; // percent — keeps numbers from overlapping too much
const MAX_ATTEMPTS_PER_POINT = 60;
/** How many non-overlapping dots fit in the base 90×90 usable area at `MIN_DISTANCE` spacing —
 *  past this, no amount of rejection-sampling attempts helps (the space is just too small), so
 *  the sheet itself must grow. Tuned a bit under the ~127 theoretical packing limit. */
const BASE_CAPACITY = 80;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * How many times bigger than the base 100×100 sheet the canvas needs to be to fit `count` dots
 * at `MIN_DISTANCE` spacing without most of them falling back to overlapping placements. 1 for
 * every difficulty's default count (≤60) and any `countOverride` up to `BASE_CAPACITY` — those
 * render exactly as before. Only the large "Cỡ tờ số" overrides (200/500/1000) scale up, which is
 * what makes the sheet bigger than one screen and worth zooming/panning into (see `ZoomPanField`).
 */
export function numberHuntCanvasScale(count: number): number {
  return Math.max(1, Math.sqrt(count / BASE_CAPACITY));
}

export function generateNumberHunt(difficulty: Difficulty = "medium", countOverride?: number): NumberHuntTarget[] {
  const count = countOverride ?? COUNT_BY_DIFFICULTY[difficulty];
  const scale = numberHuntCanvasScale(count);
  const margin = 5 * scale;
  const span = 90 * scale;
  const targets: NumberHuntTarget[] = [];

  for (let value = 1; value <= count; value++) {
    let best: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_POINT; attempt++) {
      const candidate = { x: margin + Math.random() * span, y: margin + Math.random() * span };
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
