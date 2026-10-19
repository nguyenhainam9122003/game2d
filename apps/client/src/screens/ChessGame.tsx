import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initChess, chess, getChessBotMove, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { ChessBoard } from "../components/ChessBoard";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";

export function ChessGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const [state, setState] = useState(initChess);
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const series = useMatchSeries(playOptions.matchLength);
  const recordedRef = useRef(false);

  const rawResult = chess.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = chess.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  const legalMoves = result.status === "ongoing" && !isBotTurn ? chess.legalMoves(state) : [];

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      setState((s) => {
        if (chess.result(s).status !== "ongoing") return s;
        return chess.applyMove(s, getChessBotMove(s, "easy"));
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
        if (chess.result(s).status !== "ongoing") return s;
        const move = getChessBotMove(s, difficulty);
        return chess.applyMove(s, move);
      });
    }, 300);
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

  function handleMove(move: number) {
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => chess.applyMove(s, move));
  }

  function startNewRound() {
    setState(initChess());
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

      <ChessBoard
        state={state}
        legalMoves={legalMoves}
        disabled={result.status !== "ongoing" || isBotTurn}
        onMove={handleMove}
      />

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
    </div>
  );
}
