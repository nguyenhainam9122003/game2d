import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initTicTacToe, ticTacToe, getTicTacToeBotMove, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { useMoveHistory } from "../useMoveHistory";
import { TicTacToeBoard } from "../components/TicTacToeBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { GameResultModal } from "../components/GameResultModal";
import { RoundStartBanner } from "../components/RoundStartBanner";
import { PauseMenu } from "../components/PauseMenu";
import { HistoryNav } from "../components/HistoryNav";

export function TicTacToeGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const [state, setState] = useState(initTicTacToe);
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const [paused, setPaused] = useState(false);
  const [resultModalDismissed, setResultModalDismissed] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const series = useMatchSeries(playOptions.matchLength);
  const history = useMoveHistory(ticTacToe, initTicTacToe);
  const recordedRef = useRef(false);

  const rawResult = ticTacToe.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = ticTacToe.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      if (ticTacToe.result(state).status !== "ongoing") return;
      const move = getTicTacToeBotMove(state, "easy");
      history.record(move);
      setState((s) => ticTacToe.applyMove(s, move));
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      if (ticTacToe.result(state).status !== "ongoing") return;
      const move = getTicTacToeBotMove(state, difficulty);
      history.record(move);
      setState((s) => ticTacToe.applyMove(s, move));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, state, difficulty]);

  useEffect(() => {
    if (result.status === "ongoing") {
      recordedRef.current = false;
      setResultModalDismissed(false);
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
    setState((s) => ticTacToe.applyMove(s, index));
  }

  function startNewRound() {
    setState(initTicTacToe());
    setTimeoutLoser(null);
    clock.reset();
    history.reset();
    setRoundKey((k) => k + 1);
  }

  function playerEmoji(player: Player): string {
    if (mode === "vs-bot") return player === 1 ? "🧑" : "🤖";
    return player === 1 ? "🔵" : "🔴";
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
  else if (result.status === "draw") status = t("game.draw");
  else if (isBotTurn) status = t("game.thinking", { player: t("game.bot") });
  else status = t("game.turnOf", { player: playerLabel(currentPlayer) });

  const showResultModal = result.status !== "ongoing" && !history.isViewingHistory && !resultModalDismissed;
  const hasMoreRounds = playOptions.matchLength > 1 && !series.seriesOver;
  const scoreLine = playOptions.matchLength > 1
    ? series.seriesOver
      ? t("playOptions.matchOver", { p1: series.wins[0], p2: series.wins[1] })
      : t("playOptions.roundOf", { round: series.round, total: series.matchLength, p1: series.wins[0], p2: series.wins[1] })
    : undefined;
  /* Against a bot the reveal is about *you*, so a win by player 2 reads as a loss; in 2-player mode
     nobody "loses" from the screen's point of view — it just announces who won. */
  const outcome =
    result.status === "win" ? (mode === "vs-bot" && result.winner === 2 ? "lose" : "win") : "draw";

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

      <div className="ttt-board-wrap">
        <TicTacToeBoard
          state={history.viewedState(state)}
          winningLine={!history.isViewingHistory && result.status === "win" ? result.line : undefined}
          resultStatus={!history.isViewingHistory && result.status !== "ongoing" ? result.status : undefined}
          disabled={history.isViewingHistory || result.status !== "ongoing" || isBotTurn}
          onCellClick={handleCellClick}
        />
        {!history.isViewingHistory && <RoundStartBanner key={roundKey} firstPlayerLabel={playerLabel(1)} />}
      </div>

      <HistoryNav
        canStepBack={history.canStepBack}
        canStepForward={history.canStepForward}
        onStepBack={history.stepBack}
        onStepForward={history.stepForward}
      />

      {showResultModal && (
        <GameResultModal
          message={status}
          outcome={outcome}
          players={[
            { emoji: playerEmoji(1), label: playerLabel(1), score: series.wins[0] },
            { emoji: playerEmoji(2), label: playerLabel(2), score: series.wins[1] },
          ]}
          scoreLine={scoreLine}
          primaryLabel={hasMoreRounds ? t("playOptions.nextRound") : t("game.restart")}
          onPrimary={hasMoreRounds ? startNewRound : restart}
          onReview={() => setResultModalDismissed(true)}
          onLeave={goToGameDetail}
        />
      )}
      {paused && <PauseMenu gameId="tic-tac-toe" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
