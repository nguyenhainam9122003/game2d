import type { GomokuState } from "@game/engine";

interface Props {
  state: GomokuState;
  winningLine?: number[];
  disabled: boolean;
  onCellClick(index: number): void;
}

export function GomokuBoard({ state, winningLine, disabled, onCellClick }: Props) {
  return (
    <div className="gomoku-scroll">
      <div
        className="gomoku-board"
        style={{ gridTemplateColumns: `repeat(${state.size}, 26px)` }}
      >
        {state.board.map((cell, index) => (
          <button
            key={index}
            className={[
              "gomoku-cell",
              winningLine?.includes(index) ? "winning" : "",
              state.lastMove === index ? "last-move" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-player={cell ?? undefined}
            disabled={disabled || cell !== null}
            onClick={() => onCellClick(index)}
          >
            {cell === 1 ? "●" : cell === 2 ? "○" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
