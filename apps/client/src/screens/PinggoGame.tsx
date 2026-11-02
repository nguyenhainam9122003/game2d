import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  generatePinggoCard,
  generatePinggoCallOrder,
  findPinggoWinLine,
  PINGGO_COLUMNS,
  PINGGO_MAX_NUMBER,
  PINGGO_CALL_INTERVAL_MS,
  type PinggoCard,
} from "@game/engine";
import { useAppStore } from "../store";
import { useStatsStore } from "../statsStore";
import { PinggoBoard } from "../components/PinggoBoard";
import { PauseMenu } from "../components/PauseMenu";

const TICK_MS = 200;

function newGameState() {
  return {
    card: generatePinggoCard() as PinggoCard,
    callOrder: generatePinggoCallOrder(),
    calledCount: 1,
    marked: new Set<number>(),
  };
}

export function PinggoGame() {
  const { t } = useTranslation();
  const { difficulty, goToGameDetail } = useAppStore();
  const [game, setGame] = useState(newGameState);
  const [paused, setPaused] = useState(false);
  const statsRecordedRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  const intervalMs = PINGGO_CALL_INTERVAL_MS[difficulty];
  const calledSet = useMemo(() => new Set(game.callOrder.slice(0, game.calledCount)), [game.callOrder, game.calledCount]);
  const winLine = useMemo(() => findPinggoWinLine(game.marked), [game.marked]);
  const win = winLine !== null;
  const lost = !win && game.calledCount >= PINGGO_MAX_NUMBER;
  const gameOver = win || lost;

  useEffect(() => {
    if (!gameOver) {
      statsRecordedRef.current = false;
      return;
    }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    useStatsStore.getState().incrementGamesPlayed();
  }, [gameOver]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (paused || gameOver) {
        lastTickRef.current = now;
        return;
      }
      elapsedRef.current += now - lastTickRef.current;
      lastTickRef.current = now;
      const next = Math.min(PINGGO_MAX_NUMBER, Math.floor(elapsedRef.current / intervalMs) + 1);
      setGame((g) => (next === g.calledCount ? g : { ...g, calledCount: next }));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, gameOver, intervalMs]);

  function restart() {
    elapsedRef.current = 0;
    lastTickRef.current = Date.now();
    setGame(newGameState());
  }

  function handleMark(index: number) {
    if (gameOver) return;
    const value = game.card[index];
    if (value === null || !calledSet.has(value)) return;
    setGame((g) => ({ ...g, marked: new Set(g.marked).add(index) }));
  }

  const lastCalled = game.callOrder[game.calledCount - 1];
  const lastCalledColumn = PINGGO_COLUMNS[Math.floor((lastCalled - 1) / 15)];

  let status: string;
  if (win) status = t("pinggo.win");
  else if (lost) status = t("pinggo.lost");
  else status = t("pinggo.calling");

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

      <p className={`status-banner ${win ? "win" : ""}`}>{status}</p>

      {!gameOver && (
        <div className="pinggo-last-called">
          <span className="pinggo-last-called-letter">{lastCalledColumn}</span>
          <span className="pinggo-last-called-number">{lastCalled}</span>
        </div>
      )}

      <div className="pinggo-history">
        {game.callOrder.slice(0, game.calledCount).map((n) => (
          <span key={n} className="pinggo-history-chip">
            {n}
          </span>
        ))}
      </div>

      <PinggoBoard
        card={game.card}
        calledSet={calledSet}
        marked={game.marked}
        winLine={winLine}
        disabled={gameOver}
        onMark={handleMark}
      />

      {paused && <PauseMenu gameId="pinggo" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
