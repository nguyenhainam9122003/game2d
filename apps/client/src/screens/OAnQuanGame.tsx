import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  initOAnQuan,
  oAnQuan,
  getOAnQuanBotMove,
  ownPits,
  type Player,
} from "@game/engine";
import { useAppStore } from "../store";
import { OAnQuanBoard } from "../components/OAnQuanBoard";

export function OAnQuanGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goHome } = useAppStore();
  const [state, setState] = useState(initOAnQuan);

  const result = oAnQuan.result(state);
  const currentPlayer = oAnQuan.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (oAnQuan.result(s).status !== "ongoing") return s;
        const move = getOAnQuanBotMove(s, difficulty);
        return oAnQuan.applyMove(s, move);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [isBotTurn, state, difficulty]);

  function playerLabel(player: Player): string {
    if (mode === "vs-bot") return player === 1 ? t("game.you") : t("game.bot");
    return player === 1 ? t("game.player1") : t("game.player2");
  }

  function handlePitClick(index: number) {
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => oAnQuan.applyMove(s, index));
  }

  const selectablePits =
    result.status === "ongoing" && !isBotTurn ? ownPits(currentPlayer) : [];

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
        <button className="secondary-button" onClick={() => setState(initOAnQuan())}>
          {t("game.restart")}
        </button>
      </div>

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>

      <div className="oaq-scoreboard">
        <span>
          {playerLabel(1)}: {state.captured[0]}
        </span>
        <span>
          {playerLabel(2)}: {state.captured[1]}
        </span>
      </div>

      <OAnQuanBoard state={state} selectablePits={selectablePits} onPitClick={handlePitClick} />
    </div>
  );
}
