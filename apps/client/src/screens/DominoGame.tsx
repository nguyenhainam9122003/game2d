import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initDomino, domino, getDominoBotMove, DRAW_MOVE, PASS_MOVE, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { DominoBoard } from "../components/DominoBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";

export function DominoGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const [state, setState] = useState(initDomino);
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const series = useMatchSeries(playOptions.matchLength);
  const recordedRef = useRef(false);

  const rawResult = domino.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = domino.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  const legalMoves = result.status === "ongoing" && !isBotTurn ? domino.legalMoves(state) : [];

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      setState((s) => {
        if (domino.result(s).status !== "ongoing") return s;
        return domino.applyMove(s, getDominoBotMove(s, "easy"));
      });
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, result.status === "ongoing", handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (domino.result(s).status !== "ongoing") return s;
        if (domino.currentPlayer(s) !== 2) return s;
        const move = getDominoBotMove(s, difficulty);
        return domino.applyMove(s, move);
      });
    }, 500);
    return () => clearTimeout(timer);
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
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => domino.applyMove(s, move));
  }

  function startNewRound() {
    setState(initDomino());
    setTimeoutLoser(null);
    clock.reset();
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

  const viewerIdx = mode === "vs-bot" ? 0 : currentPlayer - 1;
  const opponentIdx = viewerIdx === 0 ? 1 : 0;
  const onlyDraw = legalMoves.length === 1 && legalMoves[0] === DRAW_MOVE;
  const onlyPass = legalMoves.length === 1 && legalMoves[0] === PASS_MOVE;

  return (
    <div className="game-screen">
      <div className="game-toolbar">
        <button className="secondary-button" onClick={goToGameDetail}>
          {t("game.back")}
        </button>
        <button className="secondary-button" onClick={restart}>
          {t("game.restart")}
        </button>
      </div>

      <ClockDisplay
        remainingMs={clock.remainingMs}
        perMoveMsLeft={clock.perMoveMsLeft}
        currentPlayer={currentPlayer}
        player1Label={playerLabel(1)}
        player2Label={playerLabel(2)}
      />

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>
      <p className="domino-meta">
        {t("domino.boneyard", { count: state.boneyard.length })} ·{" "}
        {t("domino.opponentTiles", { player: playerLabel((opponentIdx + 1) as Player), count: state.hands[opponentIdx].length })}
      </p>

      <DominoBoard
        state={state}
        hand={state.hands[viewerIdx]}
        legalMoves={legalMoves}
        disabled={result.status !== "ongoing" || isBotTurn}
        onPlay={handlePlay}
      />

      {onlyDraw && (
        <button className="primary-button" onClick={() => handlePlay(DRAW_MOVE)}>
          {t("domino.draw")}
        </button>
      )}
      {onlyPass && (
        <button className="primary-button" onClick={() => handlePlay(PASS_MOVE)}>
          {t("domino.pass")}
        </button>
      )}

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
    </div>
  );
}
