import type { SudokuGrid } from "@game/engine";

interface Props {
  givens: SudokuGrid;
  values: SudokuGrid;
  notes: Set<number>[];
  conflicts: Set<number>;
  selected: number | null;
  onSelect(index: number): void;
}

const SIZE = 9;

export function SudokuBoard({ givens, values, notes, conflicts, selected, onSelect }: Props) {
  const selectedValue = selected !== null ? values[selected] : null;
  const selRow = selected !== null ? Math.floor(selected / SIZE) : -1;
  const selCol = selected !== null ? selected % SIZE : -1;
  const selBoxRow = Math.floor(selRow / 3);
  const selBoxCol = Math.floor(selCol / 3);

  return (
    <div className="sudoku-board">
      {values.map((value, i) => {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const isGiven = givens[i] !== null;
        const related =
          selected !== null &&
          (row === selRow || col === selCol || (Math.floor(row / 3) === selBoxRow && Math.floor(col / 3) === selBoxCol));
        const sameValue = selectedValue !== null && value === selectedValue;

        return (
          <button
            key={i}
            className={[
              "sudoku-cell",
              isGiven ? "given" : "",
              selected === i ? "selected" : "",
              related && selected !== i ? "related" : "",
              sameValue && selected !== i ? "same-value" : "",
              conflicts.has(i) ? "conflict" : "",
              col % 3 === 0 ? "box-left" : "",
              row % 3 === 0 ? "box-top" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelect(i)}
          >
            {value !== null ? (
              value
            ) : notes[i]?.size > 0 ? (
              <span className="sudoku-notes">
                {Array.from({ length: 9 }, (_, n) => n + 1).map((n) => (
                  <span key={n} className="sudoku-note">
                    {notes[i].has(n) ? n : ""}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
