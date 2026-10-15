import { useTranslation } from "react-i18next";
import { useAppStore } from "./store";
import { ThemeEffect } from "./ThemeEffect";
import { BottomNav } from "./components/BottomNav";
import { HomeScreen } from "./screens/HomeScreen";
import { GameDetailScreen } from "./screens/GameDetailScreen";
import { GameScreen } from "./screens/GameScreen";
import { OnlineScreen } from "./screens/OnlineScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { MessagesScreen } from "./screens/MessagesScreen";

export default function App() {
  const { t, i18n } = useTranslation();
  const { screen } = useAppStore();

  const showBottomNav =
    screen === "home" || screen === "gameDetail" || screen === "settings" || screen === "messages";

  return (
    <div className="app">
      <ThemeEffect />
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo">🎲</span>
          <h1 className="app-title">{t("app.title")}</h1>
        </div>
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
      </header>

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
