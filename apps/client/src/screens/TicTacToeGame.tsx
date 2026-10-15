import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  initTicTacToe,
  ticTacToe,
  getTicTacToeBotMove,
  type Player,
} from "@game/engine";
import { useAppStore } from "../store";
import { TicTacToeBoard } from "../components/TicTacToeBoard";

export function TicTacToeGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goHome } = useAppStore();
  const [state, setState] = useState(initTicTacToe);

  const result = ticTacToe.result(state);
  const currentPlayer = ticTacToe.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (ticTacToe.result(s).status !== "ongoing") return s;
        const move = getTicTacToeBotMove(s, difficulty);
        return ticTacToe.applyMove(s, move);
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
    setState((s) => ticTacToe.applyMove(s, index));
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
        <button className="secondary-button" onClick={() => setState(initTicTacToe())}>
          {t("game.restart")}
        </button>
      </div>

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>

      <TicTacToeBoard
        state={state}
        winningLine={result.status === "win" ? result.line : undefined}
        disabled={result.status !== "ongoing" || isBotTurn}
        onCellClick={handleCellClick}
      />
    </div>
  );
}
