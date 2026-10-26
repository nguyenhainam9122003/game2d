import type { GoState } from "@game/engine";

interface Props {
  state: GoState;
  legalMoves: number[];
  disabled: boolean;
  onCellClick(index: number): void;
}

export function GoBoard({ state, legalMoves, disabled, onCellClick }: Props) {
  const legalSet = new Set(legalMoves);
  const deadSet = new Set(state.markedDead);
  const marking = state.phase === "marking";
  return (
    <div className="gomoku-scroll">
      <div className="go-board" style={{ gridTemplateColumns: `repeat(${state.size}, 28px)` }}>
        {state.board.map((cell, index) => {
          // Placing a stone needs an empty point; toggling a dead-stone mark needs an occupied one.
          const clickable = legalSet.has(index) && (marking ? cell !== null : cell === null);
          const dead = marking && deadSet.has(index);
          return (
            <button key={index} className="go-cell" disabled={disabled || !clickable} onClick={() => onCellClick(index)}>
              {cell === 1 ? (
                <span className={`go-stone player-1${dead ? " go-stone-dead" : ""}`} />
              ) : cell === 2 ? (
                <span className={`go-stone player-2${dead ? " go-stone-dead" : ""}`} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
