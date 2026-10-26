import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  initNumberMatchMatch,
  numberMatchMatch,
  numberMatchPassMove,
  getNumberMatchBotMove,
  liveNeighbors,
  canMatch,
  otherPlayer,
  type Player,
} from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameOptionsStore } from "../gameOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { useMoveHistory } from "../useMoveHistory";
import { NumberMatchBoard } from "../components/NumberMatchBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PauseMenu } from "../components/PauseMenu";
import { HistoryNav } from "../components/HistoryNav";

/**
 * "Chơi với máy" / "2 người chung máy" for Ghép số — turn-based, see
 * `numberMatchMatch` in the engine. The solo puzzle (`NumberMatchGame.tsx`,
 * reached via the separate "Chơi một mình" row) is untouched by this.
 */
export function NumberMatchMatchGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const { numberMatchHintsVisible } = useGameOptionsStore();
  const [state, setState] = useState(() => initNumberMatchMatch(difficulty));
  const [selected, setSelected] = useState<number | null>(null);
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const [paused, setPaused] = useState(false);
  // rachoi.app's Ghép số options have no "Số ván" selector — always a single round, so this is
  // fixed at 1 rather than reading the shared global `matchLength`, which a multi-round series
  // picked for some other game could otherwise leak in here.
  const series = useMatchSeries(1);
  const history = useMoveHistory(numberMatchMatch, () => initNumberMatchMatch(difficulty));
  const recordedRef = useRef(false);

  const rawResult = numberMatchMatch.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = numberMatchMatch.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      if (numberMatchMatch.result(state).status !== "ongoing") return;
      const move = getNumberMatchBotMove(state, "easy");
      history.record(move);
      setState((s) => numberMatchMatch.applyMove(s, move));
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      if (numberMatchMatch.result(state).status !== "ongoing") return;
      const move = getNumberMatchBotMove(state, difficulty);
      history.record(move);
      setState((s) => numberMatchMatch.applyMove(s, move));
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

  const viewed = history.viewedState(state);
  const canAct = result.status === "ongoing" && !isBotTurn && !history.isViewingHistory;

  const partners = useMemo(() => {
    if (selected === null || !numberMatchHintsVisible) return [];
    return liveNeighbors(viewed.cells, selected).filter((n) => canMatch(viewed.cells[selected].value, viewed.cells[n].value));
  }, [selected, viewed.cells, numberMatchHintsVisible]);

  function handleCellClick(index: number) {
    if (!canAct || viewed.cells[index].crossed) return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    const a = Math.min(selected, index);
    const b = Math.max(selected, index);
    const move = a * state.cells.length + b;
    if (!numberMatchMatch.legalMoves(state).includes(move)) {
      setSelected(index); // not a valid pair with the previous pick — start a new selection from here
      return;
    }
    history.record(move);
    setState((s) => numberMatchMatch.applyMove(s, move));
    setSelected(null);
  }

  function handlePass() {
    if (!canAct) return;
    const move = numberMatchPassMove(state.cells.length);
    history.record(move);
    setState((s) => numberMatchMatch.applyMove(s, move));
    setSelected(null);
  }

  function startNewRound() {
    setState(initNumberMatchMatch(difficulty));
    setSelected(null);
    setTimeoutLoser(null);
    clock.reset();
    history.reset();
  }

  function handleUndo() {
    if (history.isViewingHistory || isBotTurn) return;
    const restored = mode === "vs-bot" ? history.undoToTurn(1) : history.undo();
    if (restored) {
      setState(restored);
      setSelected(null);
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

      <div className="oaq-scoreboard">
        <span>{t("numberMatch.pairsCount", { player: playerLabel(1), count: viewed.captured[0] })}</span>
        <span>{t("numberMatch.pairsCount", { player: playerLabel(2), count: viewed.captured[1] })}</span>
      </div>

      <NumberMatchBoard cells={viewed.cells} selected={selected} partners={partners} onCellClick={handleCellClick} />

      {canAct && (
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
      {paused && <PauseMenu gameId="number-match" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
