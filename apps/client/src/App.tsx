import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidRoomCode, normalizeRoomCode } from "@game/protocol";
import { useAppStore } from "./store";
import { ThemeEffect } from "./ThemeEffect";
import { BottomNav } from "./components/BottomNav";
import { LandingScreen } from "./screens/LandingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GameDetailScreen } from "./screens/GameDetailScreen";
import { GameScreen } from "./screens/GameScreen";
import { OnlineScreen } from "./screens/OnlineScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { MessagesScreen } from "./screens/MessagesScreen";

export default function App() {
  const { t, i18n } = useTranslation();
  const { screen, joinRoomByCode } = useAppStore();
  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [quickJoinInput, setQuickJoinInput] = useState("");

  const showBottomNav =
    screen === "home" || screen === "gameDetail" || screen === "settings" || screen === "messages";

  function handleQuickJoin() {
    const normalized = normalizeRoomCode(quickJoinInput);
    if (!isValidRoomCode(normalized)) return;
    joinRoomByCode(normalized);
    setShowQuickJoin(false);
    setQuickJoinInput("");
  }

  return (
    <div className="app">
      <ThemeEffect />
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo">🎲</span>
          <h1 className="app-title">{t("app.title")}</h1>
        </div>
        <div className="app-header-actions">
          {showBottomNav && (
            <button className="secondary-button" onClick={() => setShowQuickJoin(true)}>
              🔗 {t("home.quickJoin")}
            </button>
          )}
          <div className="lang-switch">
            <button
              className={i18n.language === "vi" ? "active" : ""}
              onClick={() => i18n.changeLanguage("vi")}
            >
              VI
            </button>
            <button
              className={i18n.language === "en" ? "active" : ""}
              onClick={() => i18n.changeLanguage("en")}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {showQuickJoin && (
        <div className="modal-overlay" onClick={() => setShowQuickJoin(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="section-title" style={{ margin: 0 }}>
              {t("home.quickJoinTitle")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="text-input"
                autoFocus
                value={quickJoinInput}
                onChange={(e) => setQuickJoinInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                placeholder={t("home.quickJoinPlaceholder")}
                maxLength={8}
                style={{ flex: 1, fontSize: "1.1rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="secondary-button" onClick={() => setShowQuickJoin(false)}>
                {t("home.cancel")}
              </button>
              <button
                className="primary-button"
                onClick={handleQuickJoin}
                disabled={!isValidRoomCode(normalizeRoomCode(quickJoinInput))}
              >
                {t("home.quickJoinSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "landing" && <LandingScreen />}
      {screen === "home" && <HomeScreen />}
      {screen === "gameDetail" && <GameDetailScreen />}
      {screen === "game" && <GameScreen />}
      {screen === "online" && <OnlineScreen />}
      {screen === "settings" && <SettingsScreen />}
      {screen === "messages" && <MessagesScreen />}

      {showBottomNav && <BottomNav />}
    </div>
  );
}
