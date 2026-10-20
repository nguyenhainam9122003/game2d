import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  initNumberMatch,
  crossOutPair,
  copyRemaining,
  isValidPair,
  liveNeighbors,
  canMatch,
  isNumberMatchSolved,
  isStuck,
} from "@game/engine";
import { useAppStore } from "../store";
import { useStatsStore } from "../statsStore";
import { useGameOptionsStore } from "../gameOptionsStore";
import { useGameClock } from "../useGameClock";
import { ClockDisplay } from "../components/ClockDisplay";
import { NumberMatchBoard } from "../components/NumberMatchBoard";
import { PauseMenu } from "../components/PauseMenu";

export function NumberMatchGame() {
  const { t } = useTranslation();
  const { difficulty, goToGameDetail } = useAppStore();
  const { numberMatchHintsVisible, numberMatchCopyLimit, numberMatchPerTurnSeconds } = useGameOptionsStore();
  const [state, setState] = useState(() => initNumberMatch(difficulty, numberMatchCopyLimit));
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const solved = isNumberMatchSolved(state);
  const stuck = isStuck(state);
  const gameOver = solved || stuck;
  const statsRecordedRef = useRef(false);

  const clockConfig = {
    clockMode: numberMatchPerTurnSeconds > 0 ? ("per-move" as const) : ("none" as const),
    clockInitialSeconds: 0,
    clockIncrementSeconds: 0,
    perMoveSeconds: numberMatchPerTurnSeconds,
  };
  // Solo play has no second player to hand the clock to, so "currentPlayer" never changes here —
  // handlers call clock.reset() after every move instead, the same way a turn-switch would.
  const clock = useGameClock(clockConfig, 1, !gameOver && !paused, () => {
    if (state.copiesLeft > 0) setState((s) => copyRemaining(s));
  });

  useEffect(() => {
    if (!gameOver) {
      statsRecordedRef.current = false;
      return;
    }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    useStatsStore.getState().incrementGamesPlayed();
  }, [gameOver]);

  const partners = useMemo(() => {
    if (selected === null || !numberMatchHintsVisible) return [];
    return liveNeighbors(state.cells, selected).filter((n) => canMatch(state.cells[selected].value, state.cells[n].value));
  }, [selected, state.cells, numberMatchHintsVisible]);

  function restart() {
    setState(initNumberMatch(difficulty, numberMatchCopyLimit));
    setSelected(null);
    clock.reset();
  }

  function handleCellClick(index: number) {
    if (gameOver || state.cells[index].crossed) return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (isValidPair(state.cells, selected, index)) {
      setState((s) => crossOutPair(s, selected, index));
      setSelected(null);
      clock.reset();
    } else {
      setSelected(index);
    }
  }

  function handleCopy() {
    if (gameOver || state.copiesLeft <= 0) return;
    setState((s) => copyRemaining(s));
    setSelected(null);
    clock.reset();
  }

  let status: string;
  if (solved) status = t("numberMatch.solved");
  else if (stuck) status = t("numberMatch.stuck");
  else status = t("numberMatch.copiesLeft", { count: state.copiesLeft });

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

      <ClockDisplay remainingMs={clock.remainingMs} perMoveMsLeft={clock.perMoveMsLeft} currentPlayer={1} player1Label="" player2Label="" />

      <p className={`status-banner ${solved ? "win" : ""}`}>{status}</p>

      <NumberMatchBoard cells={state.cells} selected={selected} partners={partners} onCellClick={handleCellClick} />

      <button className="primary-button" onClick={handleCopy} disabled={gameOver || state.copiesLeft <= 0}>
        {t("numberMatch.copy")}
      </button>
      {paused && <PauseMenu gameId="number-match" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
