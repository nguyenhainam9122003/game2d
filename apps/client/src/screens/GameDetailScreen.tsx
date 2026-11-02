import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Difficulty } from "@game/engine";
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
import { useFavoritesStore } from "../favoritesStore";
import { PlayOptionsModal } from "../components/PlayOptionsModal";
import { GameIcon } from "../components/GameIcon";

const DIFFICULTIES: { id: Difficulty; icon: string }[] = [
  { id: "easy", icon: "🐥" },
  { id: "medium", icon: "🦊" },
  { id: "hard", icon: "🐯" },
  { id: "expert", icon: "🐲" },
];

export function GameDetailScreen() {
  const { t } = useTranslation();
  const { gameId, goHome, startVsBot, startTwoPlayers, startOnline, startSolo } = useAppStore();
  const playOptions = usePlayOptionsStore();
  const gameOptions = useGameOptionsStore();
  const { toggle, isFavorite } = useFavoritesStore();
  const [showPlayOptions, setShowPlayOptions] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const meta = GAME_META[gameId];
  const soloOnly = SOLO_ONLY_GAMES.includes(gameId);
  const hasSoloMode = GAMES_WITH_SOLO_MODE.includes(gameId);
  const difficultyIsSolo = GAMES_WHERE_DIFFICULTY_IS_SOLO.includes(gameId);
  const showTwoPlayerLocal = !soloOnly && !GAMES_WITHOUT_TWO_PLAYER_LOCAL.includes(gameId);
  const showOnline = !soloOnly && !GAMES_WITHOUT_ONLINE.includes(gameId);
  const showFriendCard = showTwoPlayerLocal || showOnline;

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
        <div className="game-detail-hero-actions">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="game-detail-back" onClick={goHome} aria-label={t("game.back")}>
              ←
            </button>
            <button className="game-detail-hero-chip" onClick={() => setShowRules(true)}>
              📖 {t("gameDetail.howToPlay")}
            </button>
          </div>
          <button
            className="game-detail-back"
            onClick={() => toggle(gameId)}
            aria-label={t("home.favorite")}
          >
            {isFavorite(gameId) ? "★" : "☆"}
          </button>
        </div>

        <div className="game-detail-hero-icon-card">
          <GameIcon gameId={gameId} className="game-detail-icon" />
        </div>

        <span className="game-option-players game-detail-players">👤{soloOnly ? "1" : hasSoloMode ? "1–2" : "2"}</span>
      </div>

      <div className="game-detail-panel">
        <div className="card">
          <h2 className="game-detail-title">{t(meta.titleKey)}</h2>
          <p className="game-detail-desc">{t(meta.descKey)}</p>
        </div>

        {showFriendCard && (
          <div className="card game-detail-section">
            <div className="game-detail-section-header">
              <span className="game-detail-section-icon">👥</span>
              <div className="game-detail-section-text">
                <span className="game-detail-section-title">{t("gameDetail.friendTitle")}</span>
                <span className="game-detail-section-desc">{t("gameDetail.friendDesc")}</span>
              </div>
            </div>
            <div className="game-detail-friend-actions">
              {showTwoPlayerLocal && (
                <button className="secondary-button" onClick={startTwoPlayers}>
                  👥 {t("mode.twoPlayers")}
                </button>
              )}
              {showOnline && (
                <button className="secondary-button" onClick={startOnline}>
                  🌐 {t("mode.online")}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card game-detail-section">
          <div className="game-detail-section-header">
            <span className="game-detail-section-icon">{difficultyIsSolo ? "🧍" : "🤖"}</span>
            <div className="game-detail-section-text">
              <span className="game-detail-section-title">{difficultyIsSolo ? t("mode.solo") : t("mode.vsBot")}</span>
              <span className="game-detail-section-desc">
                {difficultyIsSolo ? t("gameDetail.soloDesc") : t("gameDetail.vsBotDesc")}
              </span>
            </div>
          </div>
          <div className="difficulty-chip-row">
            {DIFFICULTIES.map(({ id, icon }) => (
              <button
                key={id}
                className={`difficulty-chip ${difficulty === id ? "selected" : ""}`}
                onClick={() => setDifficulty(id)}
              >
                <span className="difficulty-chip-icon">{icon}</span>
                {t(`difficulty.${id}`)}
              </button>
            ))}
          </div>
          <button className="primary-button" onClick={() => startVsBot(difficulty)}>
            ▶ {t("gameDetail.start")}
          </button>
        </div>

        {hasSoloMode && !difficultyIsSolo && (
          <button className="option-row" onClick={startSolo}>
            <span className="option-row-icon">🧍</span>
            <span className="option-row-label">{t("mode.solo")}</span>
            <span className="option-row-arrow">▶</span>
          </button>
        )}

        <div className="card game-detail-section">
          <div className="game-detail-playoptions-header">
            <div className="game-detail-section-header">
              <span className="game-detail-section-icon">🛠️</span>
              <span className="game-detail-section-title">{t("playOptions.title")}</span>
            </div>
            <button className="secondary-button game-detail-chip-button" onClick={() => setShowPlayOptions(true)}>
              ✏️ {t("playOptions.change")}
            </button>
          </div>
          <div className="game-detail-playoptions-chips">
            {summaryParts.map((part) => (
              <span key={part} className="game-detail-chip">
                {part}
              </span>
            ))}
          </div>
        </div>
      </div>

      {showPlayOptions && <PlayOptionsModal gameId={gameId} onClose={() => setShowPlayOptions(false)} />}

      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="section-title" style={{ margin: 0 }}>
                {t(meta.titleKey)}
              </p>
              <button className="secondary-button" onClick={() => setShowRules(false)}>
                {t("pauseMenu.closeRules")}
              </button>
            </div>
            <p>{t(meta.descKey)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
