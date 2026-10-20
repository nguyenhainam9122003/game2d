import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateSudoku, findConflicts, isSudokuSolved, type SudokuGrid } from "@game/engine";
import { useAppStore } from "../store";
import { useStatsStore } from "../statsStore";
import { useSettingsStore } from "../settingsStore";
import { SudokuBoard } from "../components/SudokuBoard";
import { PauseMenu } from "../components/PauseMenu";

const MISTAKE_LIMIT = 3;
const HINT_BUDGET = 3;

function newGameState(difficulty: Parameters<typeof generateSudoku>[0]) {
  const puzzle = generateSudoku(difficulty);
  return {
    puzzle,
    values: [...puzzle.givens] as SudokuGrid,
    notes: Array.from({ length: 81 }, () => new Set<number>()),
    mistakes: 0,
    hintsLeft: HINT_BUDGET,
  };
}

export function SudokuGame() {
  const { t } = useTranslation();
  const { difficulty, goToGameDetail } = useAppStore();
  const { hintsEnabled } = useSettingsStore();
  const [game, setGame] = useState(() => newGameState(difficulty));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [paused, setPaused] = useState(false);

  const conflicts = useMemo(() => findConflicts(game.values), [game.values]);
  const solved = useMemo(() => isSudokuSolved(game.values, game.puzzle.solution), [game.values, game.puzzle.solution]);
  const lost = game.mistakes >= MISTAKE_LIMIT;
  const gameOver = solved || lost;
  const statsRecordedRef = useRef(false);

  useEffect(() => {
    if (!gameOver) {
      statsRecordedRef.current = false;
      return;
    }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    useStatsStore.getState().incrementGamesPlayed();
  }, [gameOver]);

  function restart() {
    setGame(newGameState(difficulty));
    setSelected(null);
  }

  function handleSelect(index: number) {
    if (gameOver) return;
    setSelected(index);
  }

  function handleDigit(digit: number) {
    if (gameOver || selected === null || game.puzzle.givens[selected] !== null) return;

    if (notesMode) {
      setGame((g) => {
        const notes = g.notes.map((s) => new Set(s));
        if (notes[selected].has(digit)) notes[selected].delete(digit);
        else notes[selected].add(digit);
        return { ...g, notes };
      });
      return;
    }

    setGame((g) => {
      const current = g.values[selected];
      const values = [...g.values];
      values[selected] = current === digit ? null : digit;
      const notes = g.notes.map((s, i) => (i === selected ? new Set<number>() : s));
      const wasWrong = values[selected] !== null && values[selected] !== g.puzzle.solution[selected];
      return { ...g, values, notes, mistakes: wasWrong ? g.mistakes + 1 : g.mistakes };
    });
  }

  function handleErase() {
    if (gameOver || selected === null || game.puzzle.givens[selected] !== null) return;
    setGame((g) => {
      const values = [...g.values];
      values[selected] = null;
      const notes = g.notes.map((s, i) => (i === selected ? new Set<number>() : s));
      return { ...g, values, notes };
    });
  }

  function handleHint() {
    if (gameOver || selected === null || game.hintsLeft <= 0) return;
    if (game.puzzle.givens[selected] !== null) return;
    if (game.values[selected] === game.puzzle.solution[selected]) return;
    setGame((g) => {
      const values = [...g.values];
      values[selected] = g.puzzle.solution[selected];
      const notes = g.notes.map((s, i) => (i === selected ? new Set<number>() : s));
      return { ...g, values, notes, hintsLeft: g.hintsLeft - 1 };
    });
  }

  let status: string;
  if (solved) status = t("sudoku.solved");
  else if (lost) status = t("sudoku.lost");
  else status = t("sudoku.mistakes", { count: game.mistakes, limit: MISTAKE_LIMIT });

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

      <SudokuBoard
        givens={game.puzzle.givens}
        values={game.values}
        notes={game.notes}
        conflicts={conflicts}
        selected={selected}
        onSelect={handleSelect}
      />

      <div className="sudoku-controls">
        <div className="sudoku-numpad">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
            <button key={digit} className="sudoku-digit" onClick={() => handleDigit(digit)} disabled={gameOver}>
              {digit}
            </button>
          ))}
        </div>
        <div className="sudoku-actions">
          <button className={`secondary-button ${notesMode ? "active" : ""}`} onClick={() => setNotesMode((n) => !n)}>
            ✏️ {t("sudoku.notes")}
          </button>
          <button className="secondary-button" onClick={handleErase} disabled={gameOver}>
            {t("sudoku.erase")}
          </button>
          {hintsEnabled && (
            <button className="secondary-button" onClick={handleHint} disabled={gameOver || game.hintsLeft <= 0}>
              💡 {t("sudoku.hint")} ({game.hintsLeft})
            </button>
          )}
        </div>
      </div>
      {paused && <PauseMenu gameId="sudoku" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
