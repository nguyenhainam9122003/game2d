import { useState } from "react";
import type { Game } from "@game/engine";

/**
 * Tracks the move log for a turn-based game so the player can step back
 * through past positions ("Nước trước" / "Nước sau" in rachoi.app) without
 * affecting the live game — replays from the initial position rather than
 * storing a full state snapshot per move, which is cheap enough for every
 * game in this engine and avoids duplicating state-shape logic per game.
 */
export function useMoveHistory<S>(game: Game<S, number>, initState: () => S) {
  const [moveLog, setMoveLog] = useState<number[]>([]);
  const [viewOffset, setViewOffset] = useState(0); // 0 = live position; N = N moves back

  function record(move: number) {
    setMoveLog((log) => [...log, move]);
    setViewOffset(0);
  }

  function reset() {
    setMoveLog([]);
    setViewOffset(0);
  }

  function viewedState(liveState: S): S {
    if (viewOffset === 0) return liveState;
    let s = initState();
    const upTo = moveLog.length - viewOffset;
    for (let i = 0; i < upTo; i++) s = game.applyMove(s, moveLog[i]);
    return s;
  }

  return {
    moveLog,
    isViewingHistory: viewOffset > 0,
    viewedState,
    canStepBack: moveLog.length - viewOffset > 0,
    canStepForward: viewOffset > 0,
    stepBack: () => setViewOffset((v) => Math.min(v + 1, moveLog.length)),
    stepForward: () => setViewOffset((v) => Math.max(v - 1, 0)),
    record,
    reset,
  };
}
