import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidRoomCode, normalizeRoomCode, type GameId } from "@game/protocol";
import { useAppStore, type Screen } from "./store";
import { GAME_IDS } from "./gameMeta";
import { ThemeEffect } from "./ThemeEffect";
import { BottomNav } from "./components/BottomNav";
import { LandingScreen } from "./screens/LandingScreen";
import { RulesScreen } from "./screens/RulesScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GameDetailScreen } from "./screens/GameDetailScreen";
import { GameScreen } from "./screens/GameScreen";
import { OnlineScreen } from "./screens/OnlineScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { MessagesScreen } from "./screens/MessagesScreen";

function rulesGameIdFromPath(pathname: string): GameId | null {
  const match = pathname.match(/^\/rules\/([a-z0-9-]+)\/?$/);
  if (!match) return null;
  const id = match[1] as GameId;
  return (GAME_IDS as string[]).includes(id) ? id : null;
}

/** Keeps the address bar in sync with "landing"/"rules" vs. everything else — rachoi.app itself
 *  only splits "/" (marketing) from "/play" (app), but "/rules/<gameId>" is a third public route
 *  of our own (shareable rules pages, linked from the landing page's game grid). Browser
 *  back/forward moves `screen` the same way a click would, via `popstate`. */
function useRouteSync(screen: Screen, rulesGameId: GameId | null) {
  useEffect(() => {
    const path = window.location.pathname;
    const onLanding = path === "/" || path === "";
    const onRulesPath = path.startsWith("/rules/");
    if (screen === "landing" && !onLanding) {
      window.history.pushState(null, "", "/");
    } else if (screen === "rules" && rulesGameId) {
      const target = `/rules/${rulesGameId}`;
      if (path !== target) window.history.pushState(null, "", target);
    } else if (screen !== "landing" && screen !== "rules" && (onLanding || onRulesPath)) {
      window.history.pushState(null, "", "/play" + window.location.search);
    }
  }, [screen, rulesGameId]);

  useEffect(() => {
    function onPopState() {
      const path = window.location.pathname;
      if (path === "/" || path === "") {
        useAppStore.setState({ screen: "landing" });
        return;
      }
      const rulesId = rulesGameIdFromPath(path);
      if (rulesId) {
        useAppStore.setState({ screen: "rules", rulesGameId: rulesId });
        return;
      }
      useAppStore.setState({ screen: "home" });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}

export default function App() {
  const { t, i18n } = useTranslation();
  const { screen, joinRoomByCode, rulesGameId } = useAppStore();
  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [quickJoinInput, setQuickJoinInput] = useState("");

  useRouteSync(screen, rulesGameId);

  const showBottomNav =
    screen === "home" || screen === "gameDetail" || screen === "settings" || screen === "messages";

  function handleQuickJoin() {
    const normalized = normalizeRoomCode(quickJoinInput);
    if (!isValidRoomCode(normalized)) return;
    joinRoomByCode(normalized);
    setShowQuickJoin(false);
    setQuickJoinInput("");
  }

  if (screen === "landing") {
    return (
      <>
        <ThemeEffect />
        <LandingScreen />
      </>
    );
  }

  if (screen === "rules" && rulesGameId) {
    return (
      <>
        <ThemeEffect />
        <RulesScreen gameId={rulesGameId} />
      </>
    );
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
