import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initOAnQuan, oAnQuan, getOAnQuanBotMove, ownPits, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { useMoveHistory } from "../useMoveHistory";
import { OAnQuanBoard } from "../components/OAnQuanBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PauseMenu } from "../components/PauseMenu";
import { HistoryNav } from "../components/HistoryNav";

export function OAnQuanGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const [state, setState] = useState(initOAnQuan);
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const [paused, setPaused] = useState(false);
  const series = useMatchSeries(playOptions.matchLength);
  const history = useMoveHistory(oAnQuan, initOAnQuan);
  const recordedRef = useRef(false);

  const rawResult = oAnQuan.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = oAnQuan.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      if (oAnQuan.result(state).status !== "ongoing") return;
      const move = getOAnQuanBotMove(state, "easy");
      history.record(move);
      setState((s) => oAnQuan.applyMove(s, move));
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      if (oAnQuan.result(state).status !== "ongoing") return;
      const move = getOAnQuanBotMove(state, difficulty);
      history.record(move);
      setState((s) => oAnQuan.applyMove(s, move));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, state, difficulty]);

  useEffect(() => {
    if (result.status === "ongoing") {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;
    series.recordRoundResult(result.status === "win" ? result.winner : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.status]);

  function playerLabel(player: Player): string {
    if (mode === "vs-bot") return player === 1 ? t("game.you") : t("game.bot");
    return player === 1 ? t("game.player1") : t("game.player2");
  }

  function handlePitClick(index: number) {
    if (result.status !== "ongoing" || isBotTurn || history.isViewingHistory) return;
    history.record(index);
    setState((s) => oAnQuan.applyMove(s, index));
  }

  function startNewRound() {
    setState(initOAnQuan());
    setTimeoutLoser(null);
    clock.reset();
    history.reset();
  }

  function restart() {
    startNewRound();
    series.resetSeries();
  }

  const selectablePits =
    result.status === "ongoing" && !isBotTurn && !history.isViewingHistory ? ownPits(currentPlayer) : [];
  const viewed = history.viewedState(state);

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
        <button className="secondary-button" onClick={restart}>
          {t("game.restart")}
        </button>
        <button className="secondary-button" onClick={() => setPaused(true)}>
          ⏸ {t("game.pause")}
        </button>
      </div>

      <ClockDisplay
        remainingMs={clock.remainingMs}
        perMoveMsLeft={clock.perMoveMsLeft}
        currentPlayer={currentPlayer}
        player1Label={playerLabel(1)}
        player2Label={playerLabel(2)}
      />

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>
        {history.isViewingHistory ? t("history.viewing") : status}
      </p>

      <div className="oaq-scoreboard">
        <span>
          {playerLabel(1)}: {viewed.captured[0]}
        </span>
        <span>
          {playerLabel(2)}: {viewed.captured[1]}
        </span>
      </div>

      <OAnQuanBoard state={viewed} selectablePits={selectablePits} onPitClick={handlePitClick} />

      <HistoryNav
        canStepBack={history.canStepBack}
        canStepForward={history.canStepForward}
        onStepBack={history.stepBack}
        onStepForward={history.stepForward}
      />

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
      {paused && <PauseMenu gameId="o-an-quan" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
