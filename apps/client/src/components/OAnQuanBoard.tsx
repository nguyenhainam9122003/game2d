import type { OAnQuanState } from "@game/engine";

interface Props {
  state: OAnQuanState;
  selectablePits: readonly number[];
  onPitClick(index: number): void;
}

const TOP_ROW = [11, 10, 9, 8, 7];
const BOTTOM_ROW = [1, 2, 3, 4, 5];

export function OAnQuanBoard({ state, selectablePits, onPitClick }: Props) {
  function pit(index: number, isQuan: boolean, gridRow: string, gridColumn: string) {
    const count = state.pits[index];
    const selectable = selectablePits.includes(index) && count > 0;
    return (
      <button
        key={index}
        className={`oaq-pit ${isQuan ? "oaq-quan" : "oaq-dan"} ${selectable ? "selectable" : ""}`}
        style={{ gridRow, gridColumn }}
        disabled={!selectable}
        onClick={() => onPitClick(index)}
      >
        {count}
      </button>
    );
  }

  return (
    <div className="oaq-board">
      {pit(0, true, "1 / span 2", "1")}
      {TOP_ROW.map((i, col) => pit(i, false, "1", String(col + 2)))}
      {BOTTOM_ROW.map((i, col) => pit(i, false, "2", String(col + 2)))}
      {pit(6, true, "1 / span 2", "7")}
    </div>
  );
}
