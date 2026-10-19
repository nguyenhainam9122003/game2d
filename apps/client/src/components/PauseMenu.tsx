import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameId } from "@game/protocol";
import { useAppStore } from "../store";
import { useSettingsStore } from "../settingsStore";
import { GAME_META } from "../gameMeta";

interface Props {
  gameId: GameId;
  onResume(): void;
  onRestart(): void;
}

export function PauseMenu({ gameId, onResume, onRestart }: Props) {
  const { t } = useTranslation();
  const { goToSettings, goToGameDetail } = useAppStore();
  const { soundEnabled, setSoundEnabled } = useSettingsStore();
  const [showRules, setShowRules] = useState(false);
  const meta = GAME_META[gameId];

  if (showRules) {
    return (
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
    );
  }

  return (
    <div className="modal-overlay" onClick={onResume}>
      <div className="modal-card pause-menu" onClick={(e) => e.stopPropagation()}>
        <button className="primary-button" onClick={onResume}>
          {t("pauseMenu.resume")}
        </button>
        <button className="secondary-button" onClick={() => setSoundEnabled(!soundEnabled)}>
          🔊 {t("pauseMenu.sound")}: {soundEnabled ? "✓" : "✕"}
        </button>
        <button className="secondary-button" onClick={() => setShowRules(true)}>
          📖 {t("pauseMenu.rules")}
        </button>
        <button
          className="secondary-button"
          onClick={() => {
            onRestart();
            onResume();
          }}
        >
          🔄 {t("game.restart")}
        </button>
        <button className="secondary-button" onClick={goToSettings}>
          ⚙️ {t("pauseMenu.settings")}
        </button>
        <button className="secondary-button" onClick={goToGameDetail}>
          🚪 {t("pauseMenu.leave")}
        </button>
      </div>
    </div>
  );
}
