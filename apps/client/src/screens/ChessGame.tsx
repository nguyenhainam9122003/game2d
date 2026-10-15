import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { initChess, chess, getChessBotMove, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { ChessBoard } from "../components/ChessBoard";

export function ChessGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goHome } = useAppStore();
  const [state, setState] = useState(initChess);

  const result = chess.result(state);
  const currentPlayer = chess.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  const legalMoves = result.status === "ongoing" && !isBotTurn ? chess.legalMoves(state) : [];

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (chess.result(s).status !== "ongoing") return s;
        const move = getChessBotMove(s, difficulty);
        return chess.applyMove(s, move);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [isBotTurn, state, difficulty]);

  function playerLabel(player: Player): string {
    if (mode === "vs-bot") return player === 1 ? t("game.you") : t("game.bot");
    return player === 1 ? t("game.player1") : t("game.player2");
  }

  function handleMove(move: number) {
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => chess.applyMove(s, move));
  }

  let status: string;
  if (result.status === "win") status = t("game.win", { player: playerLabel(result.winner) });
  else if (result.status === "draw") status = t("game.draw");
  else if (isBotTurn) status = t("game.thinking", { player: t("game.bot") });
  else status = t("game.turnOf", { player: playerLabel(currentPlayer) });

  return (
    <div className="game-screen">
      <div className="game-toolbar">
        <button className="secondary-button" onClick={goHome}>
          {t("game.back")}
        </button>
        <button className="secondary-button" onClick={() => setState(initChess())}>
          {t("game.restart")}
        </button>
      </div>

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>

      <ChessBoard
        state={state}
        legalMoves={legalMoves}
        disabled={result.status !== "ongoing" || isBotTurn}
        onMove={handleMove}
      />
    </div>
  );
}
