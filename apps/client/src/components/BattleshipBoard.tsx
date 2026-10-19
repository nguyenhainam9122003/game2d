interface Props {
  size: number;
  ships: number[][];
  shotsAtThisBoard: number[];
  revealShips: boolean;
  clickable: boolean;
  onCellClick?(cell: number): void;
}

export function BattleshipBoard({ size, ships, shotsAtThisBoard, revealShips, clickable, onCellClick }: Props) {
  const shipCells = new Set(ships.flat());
  const shotCells = new Set(shotsAtThisBoard);
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const isShip = shipCells.has(i);
    const isShot = shotCells.has(i);
    const mark = isShot ? (isShip ? "hit" : "miss") : null;
    cells.push(
      <button
        key={i}
        className={["bs-cell", revealShips && isShip ? "ship" : "", mark ? `mark-${mark}` : ""].filter(Boolean).join(" ")}
        disabled={!clickable || isShot}
        onClick={() => onCellClick?.(i)}
      >
        {mark === "hit" ? "💥" : mark === "miss" ? "•" : ""}
      </button>,
    );
  }
  return (
    <div className="bs-scroll">
      <div className="bs-board" style={{ gridTemplateColumns: `repeat(${size}, 28px)` }}>
        {cells}
      </div>
    </div>
  );
}
