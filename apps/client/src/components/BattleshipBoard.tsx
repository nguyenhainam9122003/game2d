interface Props {
  size: number;
  ships: number[][];
  shotsAtThisBoard: number[];
  revealShips: boolean;
  clickable: boolean;
  onCellClick?(cell: number): void;
  /** Player-only scratch marks (e.g. "suspect a ship here") — purely visual, no effect on the game. */
  notedCells?: Set<number>;
}

export function BattleshipBoard({ size, ships, shotsAtThisBoard, revealShips, clickable, onCellClick, notedCells }: Props) {
  const shipCells = new Set(ships.flat());
  const shotCells = new Set(shotsAtThisBoard);
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const isShip = shipCells.has(i);
    const isShot = shotCells.has(i);
    const mark = isShot ? (isShip ? "hit" : "miss") : null;
    const isNoted = !isShot && !!notedCells?.has(i);
    cells.push(
      <button
        key={i}
        className={[
          "bs-cell",
          revealShips && isShip ? "ship" : "",
          mark ? `mark-${mark}` : "",
          isNoted ? "noted" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={!clickable || isShot}
        onClick={() => onCellClick?.(i)}
      >
        {mark === "hit" ? "💥" : mark === "miss" ? "•" : isNoted ? "·" : ""}
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
