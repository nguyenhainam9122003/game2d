import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateNumberHunt, getNumberHuntBotDelayMs, type NumberHuntTarget } from "@game/engine";
import { useAppStore } from "../store";
import { useGameOptionsStore } from "../gameOptionsStore";
import { useStatsStore } from "../statsStore";
import { PauseMenu } from "../components/PauseMenu";
import { NumberHuntField } from "../components/NumberHuntField";

type RaceStatus = "ongoing" | "win-me" | "win-bot";

/**
 * "Chơi với máy" for Tìm số — confirmed on rachoi.app to be a real-time race (no turns, no
 * pass/undo), unlike this project's other turn-based games: both sides tap their own next
 * number on the SAME sheet independently, and whoever finishes first wins. The bot doesn't
 * pick "moves" — it just advances its own progress on a difficulty-paced timer
 * (`getNumberHuntBotDelayMs`). "2 người chung máy" and online aren't offered for this game yet
 * (split-screen UX and a simultaneous-move server protocol are both open design questions) —
 * see lm dở.md. The solo puzzle (`NumberHuntGame.tsx`, reached via "Chơi một mình") is untouched.
 */
export function NumberHuntMatchGame() {
  const { t } = useTranslation();
  const { difficulty, goToGameDetail } = useAppStore();
  const { numberHuntSheetSize } = useGameOptionsStore();
  const [targets, setTargets] = useState<NumberHuntTarget[]>(() => generateNumberHunt(difficulty, numberHuntSheetSize));
  const [myFound, setMyFound] = useState<Set<number>>(new Set());
  const [botFoundCount, setBotFoundCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const statsRecordedRef = useRef(false);

  const total = targets.length;
  const myNext = myFound.size + 1;
  const status: RaceStatus = myFound.size >= total ? "win-me" : botFoundCount >= total ? "win-bot" : "ongoing";

  useEffect(() => {
    if (status !== "ongoing" || paused) return;
    const timer = setTimeout(() => setBotFoundCount((c) => c + 1), getNumberHuntBotDelayMs(difficulty));
    return () => clearTimeout(timer);
  }, [status, paused, botFoundCount, difficulty]);

  useEffect(() => {
    if (status === "ongoing") {
      statsRecordedRef.current = false;
      return;
    }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    useStatsStore.getState().incrementGamesPlayed();
  }, [status]);

  function restart() {
    setTargets(generateNumberHunt(difficulty, numberHuntSheetSize));
    setMyFound(new Set());
    setBotFoundCount(0);
  }

  function handleTap(target: NumberHuntTarget) {
    if (status !== "ongoing" || target.value !== myNext) return;
    setMyFound((f) => new Set(f).add(target.value));
  }

  let statusText: string;
  if (status === "win-me") statusText = t("game.win", { player: t("game.you") });
  else if (status === "win-bot") statusText = t("game.win", { player: t("game.bot") });
  else statusText = t("numberHunt.findNext", { value: myNext });

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

      <p className={`status-banner ${status !== "ongoing" ? "win" : ""}`}>{statusText}</p>

      <div className="oaq-scoreboard">
        <span>{t("numberHunt.progressCount", { player: t("game.you"), count: myFound.size, total })}</span>
        <span>{t("numberHunt.progressCount", { player: t("game.bot"), count: Math.min(botFoundCount, total), total })}</span>
      </div>

      <NumberHuntField targets={targets} found={myFound} onTap={handleTap} disabled={status !== "ongoing"} />
      {paused && <PauseMenu gameId="number-hunt" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
