import { useEffect, useRef, useState } from "react";
import type { Player } from "@game/engine";
import type { ClockMode } from "./playOptionsStore";

export interface ClockConfig {
  clockMode: ClockMode;
  clockInitialSeconds: number;
  clockIncrementSeconds: number;
  perMoveSeconds: number;
}

export interface GameClockState {
  /** ms remaining per player — only set when clockMode === 'clock'. */
  remainingMs: [number, number] | null;
  /** ms left on the current move — only set when clockMode === 'per-move'. */
  perMoveMsLeft: number | null;
}

const TICK_MS = 100;

/**
 * Drives a chess-clock or per-move countdown for the current player, calling
 * `onTimeout` at most once per expiry. The caller decides what a timeout
 * means (end the game for 'clock' mode, auto-play a move for 'per-move' —
 * rachoi.app treats these differently, see PLAN.md).
 */
export function useGameClock(
  config: ClockConfig,
  currentPlayer: Player,
  isOngoing: boolean,
  onTimeout: (player: Player) => void,
): GameClockState & { reset(): void } {
  const [remainingMs, setRemainingMs] = useState<[number, number]>([
    config.clockInitialSeconds * 1000,
    config.clockInitialSeconds * 1000,
  ]);
  const [perMoveMsLeft, setPerMoveMsLeft] = useState(config.perMoveSeconds * 1000);
  const firedRef = useRef(false);
  const lastPlayerRef = useRef(currentPlayer);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  function reset() {
    setRemainingMs([config.clockInitialSeconds * 1000, config.clockInitialSeconds * 1000]);
    setPerMoveMsLeft(config.perMoveSeconds * 1000);
    firedRef.current = false;
    lastPlayerRef.current = currentPlayer;
  }

  // Player switched: credit the increment to whoever just moved, and restart the per-move clock.
  useEffect(() => {
    if (lastPlayerRef.current === currentPlayer) return;
    const mover = lastPlayerRef.current;
    lastPlayerRef.current = currentPlayer;
    firedRef.current = false;
    if (config.clockMode === "clock" && config.clockIncrementSeconds > 0) {
      setRemainingMs((prev) => {
        const next: [number, number] = [...prev];
        next[mover - 1] += config.clockIncrementSeconds * 1000;
        return next;
      });
    }
    if (config.clockMode === "per-move") {
      setPerMoveMsLeft(config.perMoveSeconds * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer]);

  // Ticks the clock. State updaters must stay pure, so this only computes the next value —
  // detecting "just hit zero" and firing the timeout side effect happens in the effect below,
  // which reacts to the committed state instead of calling setState-from-inside-setState.
  useEffect(() => {
    if (!isOngoing || config.clockMode === "none") return;
    const interval = setInterval(() => {
      if (config.clockMode === "clock") {
        setRemainingMs((prev) => {
          const idx = currentPlayer - 1;
          const next: [number, number] = [...prev];
          next[idx] = Math.max(0, next[idx] - TICK_MS);
          return next;
        });
      } else if (config.clockMode === "per-move") {
        setPerMoveMsLeft((prev) => Math.max(0, prev - TICK_MS));
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isOngoing, currentPlayer, config.clockMode]);

  useEffect(() => {
    if (!isOngoing || firedRef.current) return;
    const expired =
      (config.clockMode === "clock" && remainingMs[currentPlayer - 1] === 0) ||
      (config.clockMode === "per-move" && perMoveMsLeft === 0);
    if (expired) {
      firedRef.current = true;
      onTimeoutRef.current(currentPlayer);
    }
  }, [isOngoing, remainingMs, perMoveMsLeft, currentPlayer, config.clockMode]);

  return {
    remainingMs: config.clockMode === "clock" ? remainingMs : null,
    perMoveMsLeft: config.clockMode === "per-move" ? perMoveMsLeft : null,
    reset,
  };
}

export function formatClockTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
