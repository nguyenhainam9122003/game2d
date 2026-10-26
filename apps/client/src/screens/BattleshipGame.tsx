import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initBattleship, battleship, getBattleshipBotMove, FIRE_OFFSET, otherPlayer, type Player } from "@game/engine";
import { useAppStore } from "../store";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameOptionsStore } from "../gameOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { BattleshipBoard } from "../components/BattleshipBoard";
import { BattleshipPlacement } from "../components/BattleshipPlacement";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PauseMenu } from "../components/PauseMenu";

export function BattleshipGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const { battleshipHuntRule } = useGameOptionsStore();
  const [state, setState] = useState(() => initBattleship(undefined, battleshipHuntRule));
  const [revealed, setRevealed] = useState(mode !== "two-players");
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null);
  const [paused, setPaused] = useState(false);
  const [notedCells, setNotedCells] = useState<Set<number>>(new Set());
  const [noteMode, setNoteMode] = useState(false);
  const lastPlayerRef = useRef<Player>(battleship.currentPlayer(state));
  const series = useMatchSeries(playOptions.matchLength);
  const recordedRef = useRef(false);

  const rawResult = battleship.result(state);
  const result = timeoutLoser ? ({ status: "win" as const, winner: otherPlayer(timeoutLoser) }) : rawResult;
  const currentPlayer = battleship.currentPlayer(state);
  const isBotTurn = mode === "vs-bot" && result.status === "ongoing" && currentPlayer === 2;
  // Only the battle phase is timed — placement is an untimed setup step.
  const clockOngoing = result.status === "ongoing" && state.phase === "battle";

  useEffect(() => {
    if (mode === "two-players" && lastPlayerRef.current !== currentPlayer) setRevealed(false);
    lastPlayerRef.current = currentPlayer;
  }, [currentPlayer, mode]);

  function handleTimeout(player: Player) {
    if (playOptions.clockMode === "per-move") {
      setState((s) => {
        if (battleship.result(s).status !== "ongoing" || s.phase !== "battle") return s;
        return battleship.applyMove(s, getBattleshipBotMove(s, "easy"));
      });
    } else {
      setTimeoutLoser(player);
    }
  }

  const clock = useGameClock(playOptions, currentPlayer, clockOngoing, handleTimeout);

  // Bot auto-places its fleet, then auto-fires on its turn — both on the same short delay pattern as every other bot.
  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      setState((s) => {
        if (battleship.result(s).status !== "ongoing") return s;
        if (battleship.currentPlayer(s) !== 2) return s;
        const move = getBattleshipBotMove(s, difficulty);
        return battleship.applyMove(s, move);
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
    setState((s) => battleship.applyMove(s, move));
  }

  function handleFire(cell: number) {
    if (result.status !== "ongoing" || isBotTurn) return;
    setState((s) => battleship.applyMove(s, FIRE_OFFSET + cell));
  }

  function toggleNote(cell: number) {
    setNotedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cell)) next.delete(cell);
      else next.add(cell);
      return next;
    });
  }

  function startNewRound() {
    setState(initBattleship(undefined, battleshipHuntRule));
    setTimeoutLoser(null);
    setNotedCells(new Set());
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

  // In vs-bot mode the human always watches from player 1's seat, no matter whose turn it is —
  // only "two-players" pass-and-play actually changes whose view is on screen (guarded by the gate above).
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
          <BattleshipPlacement key={currentPlayer} size={state.size} onReady={handlePlacement} />
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
          <div className="game-toolbar">
            <p className="section-title" style={{ margin: 0 }}>
              {t("battleship.enemyBoard")}
            </p>
            <button className={`secondary-button ${noteMode ? "active" : ""}`} onClick={() => setNoteMode((v) => !v)}>
              {noteMode ? t("battleship.notesOn") : t("battleship.notesOff")}
            </button>
          </div>
          <BattleshipBoard
            size={state.size}
            ships={state.fleets[opponentIdx] ?? []}
            shotsAtThisBoard={state.shots[viewerIdx]}
            revealShips={false}
            notedCells={notedCells}
            clickable={noteMode || (result.status === "ongoing" && !isBotTurn && currentPlayer - 1 === viewerIdx)}
            onCellClick={noteMode ? toggleNote : handleFire}
          />
        </>
      )}

      {result.status !== "ongoing" && <MatchSeriesBanner series={series} onNextRound={startNewRound} />}
      {paused && <PauseMenu gameId="battleship" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
