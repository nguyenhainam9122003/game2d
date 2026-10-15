import { useTranslation } from "react-i18next";
import { useAppStore } from "./store";
import { HomeScreen } from "./screens/HomeScreen";
import { GameScreen } from "./screens/GameScreen";
import { OnlineScreen } from "./screens/OnlineScreen";

export default function App() {
  const { t, i18n } = useTranslation();
  const screen = useAppStore((s) => s.screen);

  return (
    <div className="app">
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
      {screen === "game" && <GameScreen />}
      {screen === "online" && <OnlineScreen />}
    </div>
  );
}
