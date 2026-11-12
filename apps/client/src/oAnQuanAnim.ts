import { computeOAnQuanSowPath } from "@game/engine";

/** How long one full hop (glide + the pause while a stone drops) takes —
 * shared with OAnQuanGame so a scripted next move (the bot's) can wait for
 * the previous sowing animation to actually finish instead of cutting it off
 * mid-flight. */
export const OAQ_HOP_MS = 320;
/** How much of a hop is the actual glide between pits — kept shorter than
 * OAQ_HOP_MS so the handful visibly settles at each pit for a beat before
 * moving on, instead of gliding through without stopping. */
export const OAQ_TRAVEL_MS = 150;
const OAQ_FADE_MS = 250;

/** Total time (ms) the sowing-travel animation takes to play out for a move
 * from `pitsBefore` at pit `move`: one hop per stone dropped (including
 * chain-sow pickups), plus the traveling dot's start and its fade-out. */
export function oaQuanSowDurationMs(pitsBefore: readonly number[], move: number): number {
  const path = computeOAnQuanSowPath(pitsBefore, move);
  return (path.length + 1) * OAQ_HOP_MS + OAQ_FADE_MS;
}
