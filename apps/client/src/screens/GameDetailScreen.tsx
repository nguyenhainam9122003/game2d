import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import {
  GAME_META,
  SOLO_ONLY_GAMES,
  GAMES_WITH_SOLO_MODE,
  GAMES_WHERE_DIFFICULTY_IS_SOLO,
  GAMES_WITHOUT_ONLINE,
  GAMES_WITHOUT_TWO_PLAYER_LOCAL,
} from "../gameMeta";
import { usePlayOptionsStore, formatClockSummary, GAMES_WITH_CLOCK, GAMES_WITH_MATCH_LENGTH } from "../playOptionsStore";
import { useGameOptionsStore, formatGameOptionSummary } from "../gameOptionsStore";
import { PlayOptionsModal } from "../components/PlayOptionsModal";
import { GameIcon } from "../components/GameIcon";

export function GameDetailScreen() {
  const { t } = useTranslation();
  const { gameId, goHome, startVsBot, startTwoPlayers, startOnline, startSolo } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const gameOptions = useGameOptionsStore();
  const [showPlayOptions, setShowPlayOptions] = useState(false);
  const meta = GAME_META[gameId];
  const soloOnly = SOLO_ONLY_GAMES.includes(gameId);
  const hasSoloMode = GAMES_WITH_SOLO_MODE.includes(gameId);
  const showTwoPlayerLocal = !soloOnly && !GAMES_WITHOUT_TWO_PLAYER_LOCAL.includes(gameId);
  const showOnline = !soloOnly && !GAMES_WITHOUT_ONLINE.includes(gameId);

  const summaryParts: string[] = [];
  if (GAMES_WITH_CLOCK.includes(gameId)) summaryParts.push(formatClockSummary(playOptions, t));
  const gameSpecific = formatGameOptionSummary(gameId, gameOptions, t);
  if (gameSpecific) summaryParts.push(gameSpecific);
  if (GAMES_WITH_MATCH_LENGTH.includes(gameId)) {
    summaryParts.push(t("playOptions.matchLength", { count: playOptions.matchLength }));
  }

  return (
    <div className="game-detail">
      <div className="game-detail-hero" style={{ background: meta.color }}>
        <button className="game-detail-back" onClick={goHome} aria-label={t("game.back")}>
          ←
        </button>
        <GameIcon gameId={gameId} className="game-detail-icon" />
        <span className="game-option-players game-detail-players">👤{soloOnly ? "1" : hasSoloMode ? "1–2" : "2"}</span>
      </div>

      <h2 className="game-detail-title">{t(meta.titleKey)}</h2>
      <p className="game-detail-desc">{t(meta.descKey)}</p>

      <div className="option-list">
        <button className="option-row" onClick={() => startVsBot("easy")}>
          <span className="option-row-icon">🐥</span>
          <span className="option-row-label">{t("difficulty.easy")}</span>
          <span className="option-row-arrow">▶</span>
        </button>
        <button className="option-row" onClick={() => startVsBot("medium")}>
          <span className="option-row-icon">🦊</span>
          <span className="option-row-label">{t("difficulty.medium")}</span>
          <span className="option-row-arrow">▶</span>
        </button>
        <button className="option-row" onClick={() => startVsBot("hard")}>
          <span className="option-row-icon">🐯</span>
          <span className="option-row-label">{t("difficulty.hard")}</span>
          <span className="option-row-arrow">▶</span>
        </button>
        <button className="option-row" onClick={() => startVsBot("expert")}>
          <span className="option-row-icon">🐲</span>
          <span className="option-row-label">{t("difficulty.expert")}</span>
          <span className="option-row-arrow">▶</span>
        </button>
        {showTwoPlayerLocal && (
          <button className="option-row" onClick={startTwoPlayers}>
            <span className="option-row-icon">👥</span>
            <span className="option-row-label">{t("mode.twoPlayers")}</span>
            <span className="option-row-arrow">▶</span>
          </button>
        )}
        {showOnline && (
          <button className="option-row" onClick={startOnline}>
            <span className="option-row-icon">🌐</span>
            <span className="option-row-label">{t("mode.online")}</span>
            <span className="option-row-arrow">▶</span>
          </button>
        )}
        {hasSoloMode && !GAMES_WHERE_DIFFICULTY_IS_SOLO.includes(gameId) && (
          <button className="option-row" onClick={startSolo}>
            <span className="option-row-icon">🧍</span>
            <span className="option-row-label">{t("mode.solo")}</span>
            <span className="option-row-arrow">▶</span>
          </button>
        )}
      </div>

      <button className="play-options-row" onClick={() => setShowPlayOptions(true)}>
        <span className="play-options-title">
          {t("playOptions.title")}
          <span className="play-options-change">{t("playOptions.change")}</span>
        </span>
        <span className="play-options-summary">{summaryParts.join(", ")}</span>
      </button>

      {showPlayOptions && <PlayOptionsModal gameId={gameId} onClose={() => setShowPlayOptions(false)} />}
    </div>
  );
}
