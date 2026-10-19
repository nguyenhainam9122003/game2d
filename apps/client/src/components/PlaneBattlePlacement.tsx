import { useState } from "react";
import { useTranslation } from "react-i18next";
import { planeCells, encodePlaneFleet, type PlaneOrientation, type PlanePlacement } from "@game/engine";

interface Props {
  size: number;
  planeCount: number;
  onReady(move: number): void;
}

const ROTATE_ARROWS: Record<PlaneOrientation, string> = { 0: "↑", 1: "→", 2: "↓", 3: "←" };

function fitsWithoutOverlap(size: number, placements: (PlanePlacement | null)[]): boolean {
  const occupied = new Set<number>();
  for (const placement of placements) {
    if (!placement) continue;
    const cells = planeCells(size, placement);
    if (!cells) return false;
    for (const c of cells) {
      if (occupied.has(c)) return false;
      occupied.add(c);
    }
  }
  return true;
}

function randomPlacements(size: number, planeCount: number): PlanePlacement[] {
  for (;;) {
    const placements: PlanePlacement[] = Array.from({ length: planeCount }, () => ({
      row: Math.floor(Math.random() * size),
      col: Math.floor(Math.random() * size),
      orientation: Math.floor(Math.random() * 4) as PlaneOrientation,
    }));
    if (fitsWithoutOverlap(size, placements)) return placements;
  }
}

export function PlaneBattlePlacement({ size, planeCount, onReady }: Props) {
  const { t } = useTranslation();
  const [placements, setPlacements] = useState<(PlanePlacement | null)[]>(() => Array.from({ length: planeCount }, () => null));
  const [orientation, setOrientation] = useState<PlaneOrientation>(0);

  const currentIndex = placements.findIndex((p) => p === null);
  const allPlaced = currentIndex === -1;
  const occupiedCells = new Set(
    placements.flatMap((p) => (p ? planeCells(size, p) ?? [] : [])),
  );

  function handleCellClick(cell: number) {
    if (allPlaced) return;
    const row = Math.floor(cell / size);
    const col = cell % size;
    const candidate: PlanePlacement = { row, col, orientation };
    const next = [...placements];
    next[currentIndex] = candidate;
    if (!fitsWithoutOverlap(size, next)) return;
    setPlacements(next);
  }

  function handleRandomize() {
    setPlacements(randomPlacements(size, planeCount));
  }

  function handleReset() {
    setPlacements(Array.from({ length: planeCount }, () => null));
  }

  function handleReady() {
    if (!allPlaced) return;
    onReady(encodePlaneFleet(size, placements as PlanePlacement[]));
  }

  return (
    <div className="bs-placement">
      <p className="section-title">
        {allPlaced ? t("battleship.placeShips") : t("battleship.shipsRemaining", { count: planeCount - currentIndex })}
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
        <button
          className="secondary-button"
          onClick={() => setOrientation((o) => ((o + 1) % 4) as PlaneOrientation)}
          disabled={allPlaced}
        >
          {t("battleship.rotate")} ({ROTATE_ARROWS[orientation]})
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
