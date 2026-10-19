import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TILES, encodePlay, type DominoState } from "@game/engine";

interface Props {
  state: DominoState;
  hand: number[];
  legalMoves: number[];
  disabled: boolean;
  onPlay(move: number): void;
}

function PlacedLine({ line }: { line: DominoState["line"] }) {
  if (line.length === 0) return <p className="domino-empty-line">·</p>;
  return (
    <div className="domino-line">
      {line.map((entry, i) => (
        <div key={i} className="domino-tile placed">
          <span>{entry.orientation[0]}</span>
          <span className="domino-divider" />
          <span>{entry.orientation[1]}</span>
        </div>
      ))}
    </div>
  );
}

export function DominoBoard({ state, hand, legalMoves, disabled, onPlay }: Props) {
  const { t } = useTranslation();
  const [pendingTile, setPendingTile] = useState<number | null>(null);

  const legalByTile = new Map<number, Array<"left" | "right">>();
  for (const move of legalMoves) {
    const tileId = Math.floor(move / 2);
    const end: "left" | "right" = move % 2 === 0 ? "left" : "right";
    const existing = legalByTile.get(tileId) ?? [];
    existing.push(end);
    legalByTile.set(tileId, existing);
  }

  function handleTileClick(tileId: number) {
    if (disabled) return;
    const ends = legalByTile.get(tileId);
    if (!ends || ends.length === 0) return;
    if (ends.length === 1) {
      onPlay(encodePlay(tileId, ends[0]));
      return;
    }
    setPendingTile(tileId);
  }

  function choose(end: "left" | "right") {
    if (pendingTile === null) return;
    onPlay(encodePlay(pendingTile, end));
    setPendingTile(null);
  }

  return (
    <div className="domino-wrapper">
      <div className="domino-line-scroll">
        <PlacedLine line={state.line} />
      </div>

      <div className="domino-hand">
        {hand.map((tileId) => {
          const tile = TILES[tileId];
          const playable = (legalByTile.get(tileId)?.length ?? 0) > 0;
          return (
            <button
              key={tileId}
              className={["domino-tile", playable && !disabled ? "playable" : ""].filter(Boolean).join(" ")}
              disabled={disabled || !playable}
              onClick={() => handleTileClick(tileId)}
            >
              <span>{tile[0]}</span>
              <span className="domino-divider" />
              <span>{tile[1]}</span>
            </button>
          );
        })}
      </div>

      {pendingTile !== null && (
        <div className="domino-end-picker">
          <button className="secondary-button" onClick={() => choose("left")}>
            ← {t("domino.left")}
          </button>
          <button className="secondary-button" onClick={() => choose("right")}>
            {t("domino.right")} →
          </button>
        </div>
      )}
    </div>
  );
}
