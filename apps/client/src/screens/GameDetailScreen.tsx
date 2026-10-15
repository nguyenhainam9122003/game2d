import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { GAME_META } from "../gameMeta";

export function GameDetailScreen() {
  const { t } = useTranslation();
  const { gameId, goHome, startVsBot, startTwoPlayers, startOnline } = useAppStore();
  const meta = GAME_META[gameId];

  return (
    <div className="game-detail">
      <div className="game-detail-hero" style={{ background: meta.color }}>
        <button className="game-detail-back" onClick={goHome} aria-label={t("game.back")}>
          ←
        </button>
        <span className="game-detail-icon">{meta.icon}</span>
        <span className="game-option-players game-detail-players">👤2</span>
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
        <button className="option-row" onClick={startTwoPlayers}>
          <span className="option-row-icon">👥</span>
          <span className="option-row-label">{t("mode.twoPlayers")}</span>
          <span className="option-row-arrow">▶</span>
        </button>
        <button className="option-row" onClick={startOnline}>
          <span className="option-row-icon">🌐</span>
          <span className="option-row-label">{t("mode.online")}</span>
          <span className="option-row-arrow">▶</span>
        </button>
      </div>
    </div>
  );
}
