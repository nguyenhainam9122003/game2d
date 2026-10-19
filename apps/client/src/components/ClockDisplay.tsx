import { formatClockTime } from "../useGameClock";

interface Props {
  remainingMs: [number, number] | null;
  perMoveMsLeft: number | null;
  currentPlayer: 1 | 2;
  player1Label: string;
  player2Label: string;
}

export function ClockDisplay({ remainingMs, perMoveMsLeft, currentPlayer, player1Label, player2Label }: Props) {
  if (remainingMs) {
    return (
      <div className="clock-display">
        <span className={`clock-chip ${currentPlayer === 1 ? "active" : ""} ${remainingMs[0] === 0 ? "expired" : ""}`}>
          {player1Label}: {formatClockTime(remainingMs[0])}
        </span>
        <span className={`clock-chip ${currentPlayer === 2 ? "active" : ""} ${remainingMs[1] === 0 ? "expired" : ""}`}>
          {player2Label}: {formatClockTime(remainingMs[1])}
        </span>
      </div>
    );
  }

  if (perMoveMsLeft !== null) {
    return (
      <div className="clock-display">
        <span className={`clock-chip active ${perMoveMsLeft === 0 ? "expired" : ""}`}>{formatClockTime(perMoveMsLeft)}</span>
      </div>
    );
  }

  return null;
}
