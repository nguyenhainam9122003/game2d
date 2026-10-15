import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  initGomoku,
  gomoku,
  getGomokuBotMove,
  type Player,
} from "@game/engine";
import { useAppStore } from "../store";
import { GomokuBoard } from "../components/GomokuBoard";

export function GomokuGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const [state, setState] = useState(() => initGomoku());

  const result = gomoku.result(state);
  const currentPlayer = gomoku.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (gomoku.result(s).status !== "ongoing") return s;
        const move = getGomokuBotMove(s, difficulty);
        return gomoku.applyMove(s, move);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [isBotTurn, state, difficulty]);

  function playerLabel(player: Player): string {
    if (mode === "vs-bot") return player === 1 ? t("game.you") : t("game.bot");
    return player === 1 ? t("game.player1") : t("game.player2");
  }

  function handleCellClick(index: number) {
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => gomoku.applyMove(s, index));
  }

  let status: string;
  if (result.status === "win") status = t("game.win", { player: playerLabel(result.winner) });
  else if (result.status === "draw") status = t("game.draw");
  else if (isBotTurn) status = t("game.thinking", { player: t("game.bot") });
  else status = t("game.turnOf", { player: playerLabel(currentPlayer) });

  return (
    <div className="game-screen">
      <div className="game-toolbar">
        <button className="secondary-button" onClick={goToGameDetail}>
          {t("game.back")}
        </button>
        <button className="secondary-button" onClick={() => setState(initGomoku())}>
          {t("game.restart")}
        </button>
      </div>

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>

      <GomokuBoard
        state={state}
        winningLine={result.status === "win" ? result.line : undefined}
        disabled={result.status !== "ongoing" || isBotTurn}
        onCellClick={handleCellClick}
      />
    </div>
  );
}
