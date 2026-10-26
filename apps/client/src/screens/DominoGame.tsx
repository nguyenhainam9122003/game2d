import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initDomino, domino, getDominoBotMove, DRAW_MOVE, PASS_MOVE, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameOptionsStore } from "../gameOptionsStore";
import { useSettingsStore } from "../settingsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { useMoveHistory } from "../useMoveHistory";
import { DominoBoard } from "../components/DominoBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PauseMenu } from "../components/PauseMenu";
import { HistoryNav } from "../components/HistoryNav";

export function DominoGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const { dominoDrawRule, dominoPerTurnSeconds, dominoHintsEnabled } = useGameOptionsStore();
  const { hintsEnabled } = useSettingsStore();
  const [hintedMove, setHintedMove] = useState<number | null>(null);
  const clockConfig = {
    clockMode: dominoPerTurnSeconds > 0 ? ("per-move" as const) : ("none" as const),
    clockInitialSeconds: 0,
    clockIncrementSeconds: 0,
    perMoveSeconds: dominoPerTurnSeconds,
  };
  const [state, setState] = useState(() => initDomino(dominoDrawRule));
  const [paused, setPaused] = useState(false);
  const series = useMatchSeries(playOptions.matchLength);
  // initDomino() deals tiles randomly each call, so history replay must
  // reuse the exact deal this round started with, not a fresh re-shuffle.
  const dealRef = useRef(state);
  const history = useMoveHistory(domino, () => dealRef.current);
  const recordedRef = useRef(false);

  const result = domino.result(state);
  const currentPlayer = domino.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  const legalMoves = result.status === "ongoing" && !isBotTurn ? domino.legalMoves(state) : [];

  function handleTimeout() {
    // A per-turn timeout always auto-plays an easy move (there's no "clock" mode for Domino to lose the game on).
    if (domino.result(state).status !== "ongoing") return;
    const move = getDominoBotMove(state, "easy");
    history.record(move);
    setState((s) => domino.applyMove(s, move));
    setHintedMove(null);
  }

  const clock = useGameClock(clockConfig, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      if (domino.result(state).status !== "ongoing") return;
      if (domino.currentPlayer(state) !== 2) return;
      const move = getDominoBotMove(state, difficulty);
      history.record(move);
      setState((s) => domino.applyMove(s, move));
      setHintedMove(null);
    }, 500);
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

  function handlePlay(move: number) {
    if (result.status !== "ongoing" || isBotTurn || history.isViewingHistory) return;
    history.record(move);
    setState((s) => domino.applyMove(s, move));
    setHintedMove(null);
  }

  function handleHint() {
    if (legalMoves.length === 0) return;
    setHintedMove(getDominoBotMove(state, "hard"));
  }

  function startNewRound() {
    const fresh = initDomino(dominoDrawRule);
    dealRef.current = fresh;
    setState(fresh);
    clock.reset();
    history.reset();
    setHintedMove(null);
  }

  function restart() {
    startNewRound();
    series.resetSeries();
  }

  function handleUndo() {
    if (history.isViewingHistory || isBotTurn) return;
    const restored = mode === "vs-bot" ? history.undoToTurn(1) : history.undo();
    if (restored) setState(restored);
    setHintedMove(null);
  }

  let status: string;
  if (result.status === "win") status = t("game.win", { player: playerLabel(result.winner) });
  else if (result.status === "draw") status = t("game.draw");
  else if (isBotTurn) status = t("game.thinking", { player: t("game.bot") });
  else status = t("game.turnOf", { player: playerLabel(currentPlayer) });

  const viewerIdx = mode === "vs-bot" ? 0 : currentPlayer - 1;
  const opponentIdx = viewerIdx === 0 ? 1 : 0;
  const onlyDraw = legalMoves.length === 1 && legalMoves[0] === DRAW_MOVE;
  const onlyPass = legalMoves.length === 1 && legalMoves[0] === PASS_MOVE;
  const viewed = history.viewedState(state);

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
      <p className="domino-meta">
        {t("domino.boneyard", { count: viewed.boneyard.length })} ·{" "}
        {t("domino.opponentTiles", { player: playerLabel((opponentIdx + 1) as Player), count: viewed.hands[opponentIdx].length })}
      </p>

      <DominoBoard
        state={viewed}
        hand={viewed.hands[viewerIdx]}
        legalMoves={history.isViewingHistory ? [] : legalMoves}
        disabled={history.isViewingHistory || result.status !== "ongoing" || isBotTurn}
        onPlay={handlePlay}
        hintedTile={hintedMove !== null ? Math.floor(hintedMove / 2) : null}
      />

      {hintsEnabled && dominoHintsEnabled && !isBotTurn && !history.isViewingHistory && legalMoves.length > 0 && (
        <button className="secondary-button" onClick={handleHint}>
          💡 {t("domino.hint")}
        </button>
      )}

      {onlyDraw && !history.isViewingHistory && (
        <button className="primary-button" onClick={() => handlePlay(DRAW_MOVE)}>
          {t("domino.draw")}
        </button>
      )}
      {onlyPass && !history.isViewingHistory && (
        <button className="primary-button" onClick={() => handlePlay(PASS_MOVE)}>
          {t("domino.pass")}
        </button>
      )}

      <HistoryNav
        canStepBack={history.canStepBack}
        canStepForward={history.canStepForward}
        onStepBack={history.stepBack}
        onStepForward={history.stepForward}
      />

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
      {paused && <PauseMenu gameId="domino" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
