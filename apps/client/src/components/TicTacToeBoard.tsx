import type { TicTacToeState } from "@game/engine";

interface Props {
  state: TicTacToeState;
  winningLine?: number[];
  disabled: boolean;
  onCellClick(index: number): void;
}

export function TicTacToeBoard({ state, winningLine, disabled, onCellClick }: Props) {
  return (
    <div className="ttt-board">
      {state.board.map((cell, index) => (
        <button
          key={index}
          className={`ttt-cell ${winningLine?.includes(index) ? "winning" : ""}`}
          data-player={cell ?? undefined}
          disabled={disabled || cell !== null}
          onClick={() => onCellClick(index)}
        >
          {cell === 1 ? "X" : cell === 2 ? "O" : ""}
        </button>
      ))}
    </div>
  );
}
