import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initOAnQuan, oAnQuan, getOAnQuanBotMove, ownPits, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { useMoveHistory } from "../useMoveHistory";
import { OAnQuanBoard } from "../components/OAnQuanBoard";
import { oaQuanSowDurationMs } from "../oAnQuanAnim";
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
  // How long the sowing-travel animation of the move that just happened takes
  // to finish — the bot's "thinking" timer below waits this long first so it
  // doesn't start a new stone traveling before the previous one lands.
  const lastSowDurationRef = useRef(0);

  const rawResult = oAnQuan.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = oAnQuan.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      if (oAnQuan.result(state).status !== "ongoing") return;
      const move = getOAnQuanBotMove(state, "easy");
      lastSowDurationRef.current = oaQuanSowDurationMs(state.pits, move);
      history.record(move);
      setState((s) => oAnQuan.applyMove(s, move));
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    // Wait for the previous move's stone to actually finish traveling across
    // the board, then add a visible "thinking" beat (the status banner shows
    // "Bot đang nghĩ…" throughout) before the bot moves — so its own stone
    // never starts hopping before the last one has landed.
    const timer = setTimeout(() => {
      if (oAnQuan.result(state).status !== "ongoing") return;
      const move = getOAnQuanBotMove(state, difficulty);
      lastSowDurationRef.current = oaQuanSowDurationMs(state.pits, move);
      history.record(move);
      setState((s) => oAnQuan.applyMove(s, move));
    }, lastSowDurationRef.current + 650);
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
    lastSowDurationRef.current = oaQuanSowDurationMs(state.pits, index);
    history.record(index);
    setState((s) => oAnQuan.applyMove(s, index));
  }

  function startNewRound() {
    setState(initOAnQuan());
    setTimeoutLoser(null);
    lastSowDurationRef.current = 0;
    clock.reset();
    history.reset();
  }

  function handleUndo() {
    if (history.isViewingHistory || isBotTurn) return;
    const restored = mode === "vs-bot" ? history.undoToTurn(1) : history.undo();
    if (restored) {
      setState(restored);
      setTimeoutLoser(null);
    }
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
        <button
          className="secondary-button"
          onClick={handleUndo}
          disabled={history.moveLog.length === 0 || isBotTurn || history.isViewingHistory}
        >
          {t("game.undo")}
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

      <div className="oaq-scoreboard oaq-score-cards">
        <div className={`oaq-score-card ${result.status === "ongoing" && currentPlayer === 1 ? "active" : ""}`}>
          <span className="oaq-score-name">{playerLabel(1)}</span>
          <span className="oaq-score-value" key={viewed.captured[0]}>
            {viewed.captured[0]}
          </span>
        </div>
        <div className={`oaq-score-card ${result.status === "ongoing" && currentPlayer === 2 ? "active" : ""}`}>
          <span className="oaq-score-name">{playerLabel(2)}</span>
          <span className="oaq-score-value" key={viewed.captured[1]}>
            {viewed.captured[1]}
          </span>
        </div>
      </div>

      <OAnQuanBoard
        state={viewed}
        selectablePits={selectablePits}
        onPitClick={handlePitClick}
        lastMove={history.isViewingHistory ? null : (history.moveLog[history.moveLog.length - 1] ?? null)}
      />

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
