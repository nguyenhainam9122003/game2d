interface Props {
  card: number[];
  /** Provided once the calling phase has started — highlights which of this card's numbers
   *  have already been called. Omitted during arranging (nothing is "called" yet). */
  calledSet?: ReadonlySet<number>;
  /** Arranging mode only — the first of a pending tap-to-swap pair. */
  selected?: number | null;
  winLine?: number[] | null;
  /** Provided only in arranging mode (tap two cells to swap their numbers); omitted once the
   *  calling phase starts, since a card never changes after that. */
  onCellClick?(index: number): void;
  /** Arranging mode only — dragging one cell onto another swaps their numbers directly, an
   *  alternative to the tap-tap-swap `onCellClick` flow above for mouse/desktop use. */
  onSwap?(from: number, to: number): void;
}

export function PinggoMatchBoard({ card, calledSet, selected, winLine, onCellClick, onSwap }: Props) {
  const winSet = winLine ? new Set(winLine) : null;
  const draggable = !!onSwap;

  return (
    <div className="pinggo-match-board">
      {card.map((value, i) => (
        <button
          key={i}
          className={[
            "pinggo-match-cell",
            selected === i ? "selected" : "",
            calledSet?.has(value) ? "called" : "",
            winSet?.has(i) ? "win-line" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!onCellClick}
          draggable={draggable}
          onClick={() => onCellClick?.(i)}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
          onDragOver={(e) => draggable && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (!Number.isNaN(from) && from !== i) onSwap?.(from, i);
          }}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
