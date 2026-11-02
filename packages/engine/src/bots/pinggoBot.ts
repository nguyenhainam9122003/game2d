import { PINGGO_CELL_COUNT } from "../games/pinggo.js";
import { type Difficulty, randomChoice } from "./common.js";

/**
 * Picks which number the bot calls on its turn. Every number 1..25 sits on BOTH players'
 * cards eventually (each card is a full permutation of 1-25, nothing hidden from the pool), so
 * there's no way to "deny" the opponent a number — the only real lever is making faster
 * progress on the bot's OWN card. "easy"/"medium" call a uniformly random not-yet-called
 * number; "hard"/"expert" prefer one still unmarked on the bot's own card, so (nearly) every
 * turn advances one of its own lines instead of a coin flip.
 */
export function getPinggoBotCall(myCard: readonly number[], called: ReadonlySet<number>, difficulty: Difficulty): number {
  const available: number[] = [];
  for (let n = 1; n <= PINGGO_CELL_COUNT; n++) if (!called.has(n)) available.push(n);

  if (difficulty === "hard" || difficulty === "expert") {
    const onOwnCard = available.filter((n) => myCard.includes(n));
    if (onOwnCard.length > 0) return randomChoice(onOwnCard);
  }
  return randomChoice(available);
}
