import type { CSSProperties } from "react";
import type { TicTacToeState } from "@game/engine";

interface Props {
  state: TicTacToeState;
  winningLine?: number[];
  disabled: boolean;
  onCellClick(index: number): void;
  /** Plays the board-wide "shake" (draw) or "bump" (win) flourish once the round ends. */
  resultStatus?: "win" | "draw";
}

function Mark({ isX }: { isX: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width="58%" height="58%" aria-hidden="true">
      {isX ? (
        <path d="M25 25L75 75M75 25L25 75" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
      ) : (
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="11" />
      )}
    </svg>
  );
}

/** Center-to-center bar across a winning line's first and last cell, in the same 0–1 board-fraction
 *  coordinates used by rachoi.app's own tic-tac-toe board (matched 1:1 for the same reveal line). */
function winningLineStyle(line: number[], winner: 1 | 2): CSSProperties {
  const point = (i: number) => ({ x: ((i % 3) + 0.5) / 3, y: (Math.floor(i / 3) + 0.5) / 3 });
  const a = point(line[0]);
  const b = point(line[2]);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const overshoot = 0.055;
  return {
    position: "absolute",
    left: `${(a.x - ux * overshoot) * 100}%`,
    top: `${(a.y - uy * overshoot) * 100}%`,
    width: `${(length + overshoot * 2) * 100}%`,
    height: 4,
    borderRadius: 3,
    background: winner === 1 ? "var(--ttt-x)" : "var(--ttt-o)",
    transformOrigin: "0 50%",
    transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg) translateY(-50%)`,
    animation: "ttt-line-draw 0.6s cubic-bezier(0.3, 1, 0.4, 1) both",
  };
}

export function TicTacToeBoard({ state, winningLine, disabled, onCellClick, resultStatus }: Props) {
  return (
    <div
      className="ttt-board"
      style={{
        animation:
          resultStatus === "draw"
            ? "ttt-board-shake 0.4s ease"
            : winningLine
              ? "ttt-board-bump 0.32s ease-out 0.6s both"
              : "none",
      }}
    >
      {state.board.map((cell, index) => {
        const isWinningCell = winningLine?.includes(index) ?? false;
        return (
          <button
            key={index}
            className="ttt-cell"
            data-player={cell ?? undefined}
            disabled={disabled || cell !== null}
            onClick={() => onCellClick(index)}
          >
            {cell !== null && (
              <span
                className="ttt-mark"
                style={{
                  animation: isWinningCell
                    ? `ttt-mark-pop 0.28s ease both, ttt-mark-hop 0.3s ease-out ${0.6 + winningLine!.indexOf(index) * 0.09}s`
                    : "ttt-mark-pop 0.28s ease both",
                }}
              >
                <Mark isX={cell === 1} />
              </span>
            )}
          </button>
        );
      })}
      {winningLine && (
        // Percentages on an absolutely positioned child resolve against the board's full padding
        // box, not just the cell grid — this wrapper insets by the board's own padding so the
        // 0–1 fractions in winningLineStyle line up with actual cell centers.
        <div className="ttt-win-line-area">
          <div
            className="ttt-win-line"
            style={winningLineStyle(winningLine, state.board[winningLine[0]] as 1 | 2)}
          />
        </div>
      )}
    </div>
  );
}
