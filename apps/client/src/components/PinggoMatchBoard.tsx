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
}

export function PinggoMatchBoard({ card, calledSet, selected, winLine, onCellClick }: Props) {
  const winSet = winLine ? new Set(winLine) : null;

  return (
    <div className="pinggo-match-board" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
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
          onClick={() => onCellClick?.(i)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
