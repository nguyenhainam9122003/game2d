import type { GoState } from "@game/engine";

interface Props {
  state: GoState;
  legalMoves: number[];
  disabled: boolean;
  onCellClick(index: number): void;
}

export function GoBoard({ state, legalMoves, disabled, onCellClick }: Props) {
  const legalSet = new Set(legalMoves);
  return (
    <div className="gomoku-scroll">
      <div className="go-board" style={{ gridTemplateColumns: `repeat(${state.size}, 28px)` }}>
        {state.board.map((cell, index) => (
          <button
            key={index}
            className="go-cell"
            disabled={disabled || cell !== null || !legalSet.has(index)}
            onClick={() => onCellClick(index)}
          >
            {cell === 1 ? <span className="go-stone player-1" /> : cell === 2 ? <span className="go-stone player-2" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
