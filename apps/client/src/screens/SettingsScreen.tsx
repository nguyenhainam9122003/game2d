import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import {
  ACCENT_IDS,
  ACCENTS,
  useSettingsStore,
  type AccentId,
  type BgPattern,
  type ColorScheme,
} from "../settingsStore";

const SCHEMES: { id: ColorScheme; labelKey: string; icon: string }[] = [
  { id: "light", labelKey: "settings.light", icon: "☀️" },
  { id: "dark", labelKey: "settings.dark", icon: "🌙" },
  { id: "auto", labelKey: "settings.auto", icon: "🔄" },
];

const PATTERNS: { id: BgPattern; labelKey: string }[] = [
  { id: "plain", labelKey: "settings.patternPlain" },
  { id: "dots", labelKey: "settings.patternDots" },
  { id: "stripes", labelKey: "settings.patternStripes" },
  { id: "grid", labelKey: "settings.patternGrid" },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { goHome } = useAppStore();
  const { colorScheme, accent, bgPattern, setColorScheme, setAccent, setBgPattern, reset } =
    useSettingsStore();

  return (
    <div className="game-screen" style={{ alignItems: "stretch", width: "100%" }}>
      <div className="game-toolbar">
        <button className="secondary-button" onClick={goHome}>
          {t("game.back")}
        </button>
        <h2 className="settings-heading">{t("settings.title")}</h2>
        <span style={{ width: 1 }} />
      </div>

      <p className="group-label">{t("settings.displayGroup")}</p>
      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#f6dfc4" }}>
            🌓
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.background")}</span>
          </div>
          <div className="settings-row-control">
            <div className="segmented">
              {SCHEMES.map((s) => (
                <button
                  key={s.id}
                  className={colorScheme === s.id ? "selected" : ""}
                  onClick={() => setColorScheme(s.id)}
                >
                  {s.icon} {t(s.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#f6cdd9" }}>
            🎨
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.accent")}</span>
          </div>
          <div className="settings-row-control">
            {ACCENT_IDS.map((id: AccentId) => (
              <button
                key={id}
                className={`accent-swatch accent-swatch--sm ${accent === id ? "selected" : ""}`}
                style={{ background: ACCENTS[id] }}
                onClick={() => setAccent(id)}
                aria-label={id}
              />
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-row-icon" style={{ background: "#cfe3f7" }}>
            🔲
          </span>
          <div className="settings-row-text">
            <span className="settings-row-label">{t("settings.bgPattern")}</span>
          </div>
          <div className="settings-row-control">
            <div className="segmented">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  className={bgPattern === p.id ? "selected" : ""}
                  onClick={() => setBgPattern(p.id)}
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button className="secondary-button" onClick={reset}>
        {t("settings.reset")}
      </button>
    </div>
  );
}
