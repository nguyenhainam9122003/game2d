import { useState } from "react";
import type { XiangqiState } from "@game/engine";
import { decodeXiangqiMove, encodeXiangqiMove } from "@game/engine";

interface Props {
  state: XiangqiState;
  legalMoves: number[];
  disabled: boolean;
  onMove(move: number): void;
}

const PIECE_SYMBOLS: Record<string, string> = {
  "1-g": "帥", "1-a": "仕", "1-e": "相", "1-h": "馬", "1-r": "車", "1-c": "炮", "1-s": "兵",
  "2-g": "將", "2-a": "士", "2-e": "象", "2-h": "馬", "2-r": "車", "2-c": "砲", "2-s": "卒",
};

const FILES = 9;
const RANKS = 10;

export function XiangqiBoard({ state, legalMoves, disabled, onMove }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const decoded = legalMoves.map(decodeXiangqiMove);
  const selectableFrom = new Set(decoded.map((m) => m.from));
  const destinations = selected !== null ? decoded.filter((m) => m.from === selected).map((m) => m.to) : [];

  function handleClick(square: number) {
    if (disabled) return;
    if (selected !== null && destinations.includes(square)) {
      onMove(encodeXiangqiMove(selected, square));
      setSelected(null);
      return;
    }
    setSelected(selectableFrom.has(square) ? square : null);
  }

  const squares = [];
  for (let rank = RANKS - 1; rank >= 0; rank--) {
    for (let file = 0; file < FILES; file++) {
      const index = rank * FILES + file;
      const piece = state.board[index];
      squares.push(
        <button
          key={index}
          className={[
            "xiangqi-square",
            rank === 4 ? "river-edge" : "",
            selected === index ? "selected" : "",
            destinations.includes(index) ? "destination" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => handleClick(index)}
        >
          {piece && (
            <span className={`xiangqi-piece player-${piece.player}`}>
              {PIECE_SYMBOLS[`${piece.player}-${piece.type}`]}
            </span>
          )}
        </button>,
      );
    }
  }

  return <div className="xiangqi-board">{squares}</div>;
}
