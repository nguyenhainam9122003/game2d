import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateNumberHunt, type NumberHuntTarget } from "@game/engine";
import { useAppStore } from "../store";
import { PauseMenu } from "../components/PauseMenu";

export function NumberHuntGame() {
  const { t } = useTranslation();
  const { difficulty, goToGameDetail } = useAppStore();
  const [targets, setTargets] = useState<NumberHuntTarget[]>(() => generateNumberHunt(difficulty));
  const [found, setFound] = useState<Set<number>>(new Set());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const accumulatedRef = useRef(0);

  const total = targets.length;
  const nextValue = found.size + 1;
  const finished = found.size === total;

  useEffect(() => {
    if (finished || paused) return;
    const timer = setInterval(() => setElapsedMs(accumulatedRef.current + Date.now() - startRef.current), 100);
    return () => clearInterval(timer);
  }, [finished, paused]);

  function handlePause() {
    accumulatedRef.current = elapsedMs;
    setPaused(true);
  }

  function handleResume() {
    startRef.current = Date.now();
    setPaused(false);
  }

  function restart() {
    setTargets(generateNumberHunt(difficulty));
    setFound(new Set());
    setElapsedMs(0);
    accumulatedRef.current = 0;
    startRef.current = Date.now();
  }

  function handleTap(target: NumberHuntTarget) {
    if (finished || target.value !== nextValue) return;
    setFound((f) => new Set(f).add(target.value));
  }

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="game-screen">
      <div className="game-toolbar">
        <button className="secondary-button" onClick={goToGameDetail}>
          {t("game.back")}
        </button>
        <button className="secondary-button" onClick={restart}>
          {t("game.restart")}
        </button>
        <button className="secondary-button" onClick={handlePause}>
          ⏸ {t("game.pause")}
        </button>
      </div>

      <p className={`status-banner ${finished ? "win" : ""}`}>
        {finished ? t("numberHunt.finished", { seconds }) : t("numberHunt.findNext", { value: nextValue })}
      </p>
      {!finished && <p className="nh-timer">{seconds}s</p>}

      <div className="nh-field">
        {targets.map((target) => {
          const isFound = found.has(target.value);
          return (
            <button
              key={target.value}
              className={["nh-target", isFound ? "found" : ""].filter(Boolean).join(" ")}
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
              disabled={isFound}
              onClick={() => handleTap(target)}
            >
              {target.value}
            </button>
          );
        })}
      </div>
      {paused && <PauseMenu gameId="number-hunt" onResume={handleResume} onRestart={restart} />}
    </div>
  );
}
