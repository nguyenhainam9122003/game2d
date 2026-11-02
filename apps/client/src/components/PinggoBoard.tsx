import { PINGGO_COLUMNS, PINGGO_FREE_INDEX, type PinggoCard } from "@game/engine";

interface Props {
  card: PinggoCard;
  calledSet: ReadonlySet<number>;
  marked: ReadonlySet<number>;
  winLine: number[] | null;
  disabled?: boolean;
  onMark(index: number): void;
}

export function PinggoBoard({ card, calledSet, marked, winLine, disabled, onMark }: Props) {
  const winSet = winLine ? new Set(winLine) : null;

  return (
    <div className="pinggo-board">
      <div className="pinggo-header">
        {PINGGO_COLUMNS.map((letter) => (
          <span key={letter} className="pinggo-header-cell">
            {letter}
          </span>
        ))}
      </div>
      <div className="pinggo-grid">
        {card.map((value, i) => {
          const isFree = i === PINGGO_FREE_INDEX;
          const isMarked = isFree || marked.has(i);
          const isCalled = value !== null && calledSet.has(value);

          return (
            <button
              key={i}
              className={[
                "pinggo-cell",
                isFree ? "free" : "",
                isMarked ? "marked" : "",
                !isMarked && isCalled ? "called" : "",
                winSet?.has(i) ? "win-line" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled || isFree || !isCalled}
              onClick={() => onMark(i)}
            >
              {isFree ? "★" : value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
