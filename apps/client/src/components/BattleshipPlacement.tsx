import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SHIP_LENGTHS, shipCells, encodeFleet, type ShipPlacement } from "@game/engine";

interface Props {
  size: number;
  onReady(move: number): void;
}

function randomPlacements(size: number): ShipPlacement[] {
  for (;;) {
    const placements: ShipPlacement[] = SHIP_LENGTHS.map(() => ({
      row: Math.floor(Math.random() * size),
      col: Math.floor(Math.random() * size),
      orientation: Math.random() < 0.5 ? 0 : 1,
    }));
    if (fitsWithoutOverlap(size, placements)) return placements;
  }
}

function fitsWithoutOverlap(size: number, placements: (ShipPlacement | null)[]): boolean {
  const occupied = new Set<number>();
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    if (!placement) continue;
    const cells = shipCells(size, SHIP_LENGTHS[i], placement);
    if (!cells) return false;
    for (const c of cells) {
      if (occupied.has(c)) return false;
      occupied.add(c);
    }
  }
  return true;
}

export function BattleshipPlacement({ size, onReady }: Props) {
  const { t } = useTranslation();
  const [placements, setPlacements] = useState<(ShipPlacement | null)[]>(() => SHIP_LENGTHS.map(() => null));
  const [orientation, setOrientation] = useState<0 | 1>(0);

  const currentIndex = placements.findIndex((p) => p === null);
  const allPlaced = currentIndex === -1;

  const shipGroups: number[][] = placements.map((p, i) => (p ? shipCells(size, SHIP_LENGTHS[i], p) ?? [] : []));
  const occupiedCells = new Set(shipGroups.flat());

  function handleCellClick(cell: number) {
    if (allPlaced) return;
    const row = Math.floor(cell / size);
    const col = cell % size;
    const candidate: ShipPlacement = { row, col, orientation };
    const next = [...placements];
    next[currentIndex] = candidate;
    if (!fitsWithoutOverlap(size, next)) return; // invalid spot — ignore the click
    setPlacements(next);
  }

  function handleRandomize() {
    setPlacements(randomPlacements(size));
  }

  function handleReset() {
    setPlacements(SHIP_LENGTHS.map(() => null));
  }

  function handleReady() {
    if (!allPlaced) return;
    onReady(encodeFleet(placements as ShipPlacement[]));
  }

  return (
    <div className="bs-placement">
      <p className="section-title">
        {allPlaced ? t("battleship.placeShips") : t("battleship.shipsRemaining", { count: SHIP_LENGTHS.length - currentIndex })}
      </p>
      <div className="bs-scroll">
        <div className="bs-board" style={{ gridTemplateColumns: `repeat(${size}, 28px)` }}>
          {Array.from({ length: size * size }, (_, i) => (
            <button
              key={i}
              className={["bs-cell", occupiedCells.has(i) ? "ship" : ""].filter(Boolean).join(" ")}
              disabled={allPlaced}
              onClick={() => handleCellClick(i)}
            />
          ))}
        </div>
      </div>
      <div className="bs-placement-controls">
        <button className="secondary-button" onClick={() => setOrientation((o) => (o === 0 ? 1 : 0))} disabled={allPlaced}>
          {t("battleship.rotate")} ({orientation === 0 ? "→" : "↓"})
        </button>
        <button className="secondary-button" onClick={handleRandomize}>
          {t("battleship.randomize")}
        </button>
        <button className="secondary-button" onClick={handleReset} disabled={placements.every((p) => p === null)}>
          {t("battleship.resetPlacement")}
        </button>
        <button className="primary-button" onClick={handleReady} disabled={!allPlaced}>
          {t("battleship.ready")}
        </button>
      </div>
    </div>
  );
}
