import { WIDTH, type NumberMatchCell } from "@game/engine";

interface Props {
  cells: NumberMatchCell[];
  selected: number | null;
  partners: number[];
  onCellClick(index: number): void;
}

export function NumberMatchBoard({ cells, selected, partners, onCellClick }: Props) {
  return (
    <div className="nm-scroll">
      <div className="nm-board" style={{ gridTemplateColumns: `repeat(${WIDTH}, 36px)` }}>
        {cells.map((cell, i) => (
          <button
            key={i}
            className={[
              "nm-cell",
              cell.crossed ? "crossed" : "",
              selected === i ? "selected" : "",
              partners.includes(i) ? "partner" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={cell.crossed}
            onClick={() => onCellClick(i)}
          >
            {cell.crossed ? "" : cell.value}
          </button>
        ))}
      </div>
    </div>
  );
}
