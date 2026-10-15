import { useState } from "react";
import type { ChessState, PromotionPiece } from "@game/engine";
import { decodeChessMove, encodeChessMove } from "@game/engine";

interface Props {
  state: ChessState;
  legalMoves: number[];
  disabled: boolean;
  onMove(move: number): void;
}

const PIECE_SYMBOLS: Record<string, string> = {
  "1-k": "♔", "1-q": "♕", "1-r": "♖", "1-b": "♗", "1-n": "♘", "1-p": "♙",
  "2-k": "♚", "2-q": "♛", "2-r": "♜", "2-b": "♝", "2-n": "♞", "2-p": "♟",
};

const PROMOTION_CHOICES: PromotionPiece[] = ["q", "r", "b", "n"];

export function ChessBoard({ state, legalMoves, disabled, onMove }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingTo, setPendingTo] = useState<number | null>(null);

  const decoded = legalMoves.map(decodeChessMove);
  const selectableFrom = new Set(decoded.map((m) => m.from));
  const destinations = selected !== null
    ? decoded.filter((m) => m.from === selected).map((m) => m.to)
    : [];

  function handleSquareClick(square: number) {
    if (disabled || pendingTo !== null) return;

    if (selected !== null && destinations.includes(square)) {
      const matches = decoded.filter((m) => m.from === selected && m.to === square);
      if (matches.length > 1) {
        setPendingTo(square);
        return;
      }
      onMove(encodeChessMove(matches[0].from, matches[0].to));
      setSelected(null);
      return;
    }

    setSelected(selectableFrom.has(square) ? square : null);
  }

  function choosePromotion(promotion: PromotionPiece) {
    if (selected === null || pendingTo === null) return;
    onMove(encodeChessMove(selected, pendingTo, promotion));
    setSelected(null);
    setPendingTo(null);
  }

  const squares = [];
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const index = rank * 8 + file;
      const piece = state.board[index];
      const isDark = (rank + file) % 2 === 0;
      squares.push(
        <button
          key={index}
          className={[
            "chess-square",
            isDark ? "dark" : "light",
            selected === index ? "selected" : "",
            destinations.includes(index) ? "destination" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => handleSquareClick(index)}
        >
          {piece && (
            <span className={`chess-piece player-${piece.player}`}>
              {PIECE_SYMBOLS[`${piece.player}-${piece.type}`]}
            </span>
          )}
        </button>,
      );
    }
  }

  return (
    <div className="chess-wrapper">
      <div className="chess-board">{squares}</div>
      {pendingTo !== null && (
        <div className="chess-promotion-picker">
          {PROMOTION_CHOICES.map((p) => (
            <button key={p} className="secondary-button" onClick={() => choosePromotion(p)}>
              {PIECE_SYMBOLS[`${state.toMove}-${p}`]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
