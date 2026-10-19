import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initPlaneBattle, planeBattle, getPlaneBattleBotMove, PLANE_FIRE_OFFSET, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { BattleshipBoard } from "../components/BattleshipBoard";
import { PlaneBattlePlacement } from "../components/PlaneBattlePlacement";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PauseMenu } from "../components/PauseMenu";

export function PlaneBattleGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const [state, setState] = useState(() => initPlaneBattle());
  const [revealed, setRevealed] = useState(mode !== "two-players");
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const [paused, setPaused] = useState(false);
  const lastPlayerRef = useRef<Player>(planeBattle.currentPlayer(state));
  const series = useMatchSeries(playOptions.matchLength);
  const recordedRef = useRef(false);

  const rawResult = planeBattle.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = planeBattle.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  const clockOngoing = result.status === "ongoing" && state.phase === "battle";

  useEffect(() => {
    if (mode === "two-players" && lastPlayerRef.current !== currentPlayer) setRevealed(false);
    lastPlayerRef.current = currentPlayer;
  }, [currentPlayer, mode]);

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      setState((s) => {
        if (planeBattle.result(s).status !== "ongoing" || s.phase !== "battle") return s;
        return planeBattle.applyMove(s, getPlaneBattleBotMove(s, "easy"));
      });
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, clockOngoing, handleTimeout);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (planeBattle.result(s).status !== "ongoing") return s;
        if (planeBattle.currentPlayer(s) !== 2) return s;
        const move = getPlaneBattleBotMove(s, difficulty);
        return planeBattle.applyMove(s, move);
      });
    }, 400);
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

  function handlePlacement(move: number) {
    setState((s) => planeBattle.applyMove(s, move));
  }

  function handleFire(cell: number) {
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => planeBattle.applyMove(s, PLANE_FIRE_OFFSET + cell));
  }

  function startNewRound() {
    setState(initPlaneBattle());
    setTimeoutLoser(null);
    clock.reset();
  }

  function restart() {
    startNewRound();
    series.resetSeries();
  }

  let status: string;
  if (result.status === "win") status = t("game.win", { player: playerLabel(result.winner) });
  else if (isBotTurn) status = t("game.thinking", { player: t("game.bot") });
  else if (state.phase === "placement") status = t("battleship.placeShips");
  else status = t("game.turnOf", { player: playerLabel(currentPlayer) });

  const toolbar = (
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
  );

  if (mode === "two-players" && !revealed && result.status === "ongoing") {
    return (
      <div className="game-screen">
        {toolbar}
        <div className="bs-pass-gate">
          <p className="status-banner">{t("game.turnOf", { player: playerLabel(currentPlayer) })}</p>
          <button className="primary-button" onClick={() => setRevealed(true)}>
            {t("battleship.ready")}
          </button>
        </div>
      </div>
    );
  }

  const viewerIdx = mode === "vs-bot" ? 0 : currentPlayer - 1;
  const opponentIdx = viewerIdx === 0 ? 1 : 0;
  const isBotPlacing = mode === "vs-bot" && currentPlayer === 2 && state.phase === "placement";

  return (
    <div className="game-screen">
      {toolbar}

      <ClockDisplay
        remainingMs={clock.remainingMs}
        perMoveMsLeft={clock.perMoveMsLeft}
        currentPlayer={currentPlayer}
        player1Label={playerLabel(1)}
        player2Label={playerLabel(2)}
      />

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>

      {state.phase === "placement" ? (
        isBotPlacing ? (
          <p className="status-banner">{t("battleship.waitingOpponent")}</p>
        ) : (
          <PlaneBattlePlacement key={currentPlayer} size={state.size} planeCount={state.planeCount} onReady={handlePlacement} />
        )
      ) : (
        <>
          <p className="section-title">{t("battleship.yourBoard")}</p>
          <BattleshipBoard
            size={state.size}
            ships={state.fleets[viewerIdx] ?? []}
            shotsAtThisBoard={state.shots[opponentIdx]}
            revealShips
            clickable={false}
          />
          <p className="section-title">{t("battleship.enemyBoard")}</p>
          <BattleshipBoard
            size={state.size}
            ships={state.fleets[opponentIdx] ?? []}
            shotsAtThisBoard={state.shots[viewerIdx]}
            revealShips={false}
            clickable={result.status === "ongoing" && !isBotTurn && currentPlayer - 1 === viewerIdx}
            onCellClick={handleFire}
          />
        </>
      )}

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
      {paused && <PauseMenu gameId="plane-battle" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
