import { useState } from "react";
import type { Game, Player } from "@game/engine";

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

  /** Drops the last move and returns the resulting state, or null if the log is empty. */
  function undo(): S | null {
    if (moveLog.length === 0) return null;
    const newLog = moveLog.slice(0, -1);
    setMoveLog(newLog);
    setViewOffset(0);
    let s = initState();
    for (const move of newLog) s = game.applyMove(s, move);
    return s;
  }

  /**
   * Drops moves back to the most recent point it was `player`'s turn —
   * i.e. undoes the player's last move plus whatever the opponent did in
   * reply. Some games (e.g. domino's forced draw-then-play) let a single
   * "reply" span more than one logged move, so a fixed undo count isn't
   * safe; this walks the log to find the right cut point instead.
   */
  function undoToTurn(player: Player): S | null {
    if (moveLog.length === 0) return null;
    let s = initState();
    const turnBeforeMove: Player[] = [];
    for (const move of moveLog) {
      turnBeforeMove.push(game.currentPlayer(s));
      s = game.applyMove(s, move);
    }
    let cut = -1;
    for (let i = moveLog.length - 1; i >= 0; i--) {
      if (turnBeforeMove[i] === player) {
        cut = i;
        break;
      }
    }
    if (cut === -1) return null;
    const newLog = moveLog.slice(0, cut);
    setMoveLog(newLog);
    setViewOffset(0);
    let result = initState();
    for (const move of newLog) result = game.applyMove(result, move);
    return result;
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
    undo,
    undoToTurn,
  };
}
