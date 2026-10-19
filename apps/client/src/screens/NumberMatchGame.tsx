import { useMemo, useState } from "react";
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
import { NumberMatchBoard } from "../components/NumberMatchBoard";
import { PauseMenu } from "../components/PauseMenu";

export function NumberMatchGame() {
  const { t } = useTranslation();
  const { difficulty, goToGameDetail } = useAppStore();
  const [state, setState] = useState(() => initNumberMatch(difficulty));
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const solved = isNumberMatchSolved(state);
  const stuck = isStuck(state);
  const gameOver = solved || stuck;

  const partners = useMemo(() => {
    if (selected === null) return [];
    return liveNeighbors(state.cells, selected).filter((n) => canMatch(state.cells[selected].value, state.cells[n].value));
  }, [selected, state.cells]);

  function restart() {
    setState(initNumberMatch(difficulty));
    setSelected(null);
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
    } else {
      setSelected(index);
    }
  }

  function handleCopy() {
    if (gameOver || state.copiesLeft <= 0) return;
    setState((s) => copyRemaining(s));
    setSelected(null);
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

      <p className={`status-banner ${solved ? "win" : ""}`}>{status}</p>

      <NumberMatchBoard cells={state.cells} selected={selected} partners={partners} onCellClick={handleCellClick} />

      <button className="primary-button" onClick={handleCopy} disabled={gameOver || state.copiesLeft <= 0}>
        {t("numberMatch.copy")}
      </button>
      {paused && <PauseMenu gameId="number-match" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
