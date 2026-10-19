import { useState } from "react";
import type { Player } from "@game/engine";

export interface MatchSeriesState {
  wins: [number, number];
  round: number;
  matchLength: number;
  seriesOver: boolean;
  /** Call once per finished game with the winner (or null for a draw). */
  recordRoundResult(winner: Player | null): void;
  resetSeries(): void;
}

/** Tracks running wins across a best-effort-of-N series ("Số ván" in rachoi.app's play options). */
export function useMatchSeries(matchLength: number): MatchSeriesState {
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [round, setRound] = useState(1);
  const [seriesOver, setSeriesOver] = useState(false);

  function recordRoundResult(winner: Player | null) {
    setWins((w) => {
      if (winner === null) return w;
      const next: [number, number] = [...w];
      next[winner - 1] += 1;
      return next;
    });
    if (round >= matchLength) setSeriesOver(true);
    else setRound((r) => r + 1);
  }

  function resetSeries() {
    setWins([0, 0]);
    setRound(1);
    setSeriesOver(false);
  }

  return { wins, round, matchLength, seriesOver, recordRoundResult, resetSeries };
}
