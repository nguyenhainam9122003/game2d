import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initGo, go, getGoBotMove, getGoScore, passMove, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameOptionsStore } from "../gameOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { useMoveHistory } from "../useMoveHistory";
import { GoBoard } from "../components/GoBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PauseMenu } from "../components/PauseMenu";
import { HistoryNav } from "../components/HistoryNav";

export function GoGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const { goBoardSize } = useGameOptionsStore();
  const [state, setState] = useState(() => initGo(goBoardSize));
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const [paused, setPaused] = useState(false);
  const series = useMatchSeries(playOptions.matchLength);
  const history = useMoveHistory(go, () => initGo(goBoardSize));
  const recordedRef = useRef(false);

  const rawResult = go.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = go.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  const legalMoves = result.status === "ongoing" && !isBotTurn ? go.legalMoves(state) : [];
  const viewed = history.viewedState(state);
  const score = getGoScore(viewed);

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      if (go.result(state).status !== "ongoing") return;
      const move = getGoBotMove(state, "easy");
      history.record(move);
      setState((s) => go.applyMove(s, move));
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      if (go.result(state).status !== "ongoing") return;
      const move = getGoBotMove(state, difficulty);
      history.record(move);
      setState((s) => go.applyMove(s, move));
    }, 300);
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

  function handleCellClick(index: number) {
    if (result.status !== "ongoing" || isBotTurn || history.isViewingHistory) return;
    history.record(index);
    setState((s) => go.applyMove(s, index));
  }

  function handlePass() {
    if (result.status !== "ongoing" || isBotTurn || history.isViewingHistory) return;
    const move = passMove(state.size);
    history.record(move);
    setState((s) => go.applyMove(s, move));
  }

  function startNewRound() {
    setState(initGo(goBoardSize));
    setTimeoutLoser(null);
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

  let status: string;
  if (result.status === "win") status = t("game.win", { player: playerLabel(result.winner) });
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
      <p className="go-score-line">
        {t("game.goScore", { black: score.black, white: score.white })}
      </p>

      <GoBoard
        state={viewed}
        legalMoves={history.isViewingHistory ? [] : legalMoves}
        disabled={history.isViewingHistory || result.status !== "ongoing" || isBotTurn}
        onCellClick={handleCellClick}
      />

      {result.status === "ongoing" && !isBotTurn && !history.isViewingHistory && (
        <button className="secondary-button" onClick={handlePass}>
          {t("game.pass")}
        </button>
      )}

      <HistoryNav
        canStepBack={history.canStepBack}
        canStepForward={history.canStepForward}
        onStepBack={history.stepBack}
        onStepForward={history.stepForward}
      />

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
      {paused && <PauseMenu gameId="go" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
